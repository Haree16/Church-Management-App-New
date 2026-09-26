import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Member, MembershipStatus, ChurchMinistry, SaaSUser, SaaSUserRole } from '../types';
import { sanitizePhone } from '../utils/notificationUtils';
import { 
  Upload, Download, FileSpreadsheet, FileText, CheckCircle2, 
  AlertTriangle, XCircle, Users, ArrowRight, X, UserPlus, 
  RefreshCw, ShieldCheck, ChevronRight, HelpCircle, Check, AlertCircle, Trash2
} from 'lucide-react';

interface ImportMembersModalProps {
  isOpen: boolean;
  currentChurchId: string;
  currentChurchName?: string;
  existingMembers?: Member[];
  ministries?: ChurchMinistry[];
  onClose: () => void;
  onImportComplete: (importedMembers: Member[], updatedMembers: Member[], createdUsers?: SaaSUser[]) => void;
}

export type DuplicateAction = 'skip' | 'import_new' | 'update_existing';

export interface ParsedImportRow {
  rowIndex: number;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  phone: string;
  email: string;
  address: string;
  memberType: MembershipStatus;
  ministry: string; // Raw input string
  matchedMinistry?: ChurchMinistry;
  ministryWarning?: string;
  status: string; // Raw input status
  
  isValid: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
  matchedExistingMember?: Member;
  duplicateAction: DuplicateAction;
  validationErrors: string[];
}

export type ImportStep = 'upload' | 'preview' | 'results' | 'create_accounts';

const SUPPORTED_MEMBER_TYPES: MembershipStatus[] = [
  'Pastor', 'Assistant Pastor', 'Leader', 'Clergy/Staff', 'Member', 'Regular Attender', 'Visitor', 'Youth'
];

export const ImportMembersModal: React.FC<ImportMembersModalProps> = ({
  isOpen,
  currentChurchId,
  currentChurchName = 'Church',
  existingMembers = [],
  ministries = [],
  onClose,
  onImportComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  
  // Parsed Rows & Validation State
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'DUPLICATES' | 'INVALID'>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Results State
  const [importedCount, setImportedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [newlyCreatedMembers, setNewlyCreatedMembers] = useState<Member[]>([]);
  const [errorReportData, setErrorReportData] = useState<{ row: number; name: string; email: string; phone: string; reason: string }[]>([]);

  // User Account Creation State
  const [selectedForAccount, setSelectedForAccount] = useState<Record<string, boolean>>({});
  const [createdAccountsCount, setCreatedAccountsCount] = useState<number | null>(null);

  // Filtered Rows & Summary Metrics
  const summaryStats = useMemo(() => {
    const total = parsedRows.length;
    const valid = parsedRows.filter(r => r.isValid && !r.isDuplicate).length;
    const duplicates = parsedRows.filter(r => r.isDuplicate).length;
    const invalid = parsedRows.filter(r => !r.isValid).length;
    
    const readyToImport = parsedRows.filter(r => {
      if (!r.isValid) return false;
      if (r.isDuplicate && r.duplicateAction === 'skip') return false;
      return true;
    }).length;

    return { total, valid, duplicates, invalid, readyToImport };
  }, [parsedRows]);

  const displayedRows = useMemo(() => {
    return parsedRows.filter(r => {
      if (previewFilter === 'VALID') return r.isValid && !r.isDuplicate;
      if (previewFilter === 'DUPLICATES') return r.isDuplicate;
      if (previewFilter === 'INVALID') return !r.isValid;
      return true;
    });
  }, [parsedRows, previewFilter]);

  // Reset state whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep('upload');
      setSelectedFile(null);
      setFileError(null);
      setParsedRows([]);
      setImportedCount(0);
      setUpdatedCount(0);
      setSkippedCount(0);
      setFailedCount(0);
      setNewlyCreatedMembers([]);
      setErrorReportData([]);
      setSelectedForAccount({});
      setCreatedAccountsCount(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Reset modal state
  const handleReset = () => {
    setCurrentStep('upload');
    setSelectedFile(null);
    setFileError(null);
    setParsedRows([]);
    setImportedCount(0);
    setUpdatedCount(0);
    setSkippedCount(0);
    setFailedCount(0);
    setNewlyCreatedMembers([]);
    setErrorReportData([]);
    setSelectedForAccount({});
    setCreatedAccountsCount(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // -------------------------------------------------------------
  // STEP 1: TEMPLATE GENERATION & DOWNLOAD
  // -------------------------------------------------------------
  const templateHeaders = [
    'First Name',
    'Last Name',
    'Gender',
    'Date of Birth',
    'Phone',
    'Email',
    'Address',
    'Member Type',
    'Ministry',
    'Status'
  ];

  const templateSampleRows = [
    {
      'First Name': 'John',
      'Last Name': 'Doe',
      'Gender': 'Male',
      'Date of Birth': '1985-05-15',
      'Phone': '9876543210',
      'Email': 'john.doe@example.com',
      'Address': '124 Church Street, Chennai',
      'Member Type': 'Member',
      'Ministry': ministries[0]?.name || 'Media',
      'Status': 'Active'
    },
    {
      'First Name': 'Mary',
      'Last Name': 'Doe',
      'Gender': 'Female',
      'Date of Birth': '1988-08-22',
      'Phone': '9876543211',
      'Email': 'mary.doe@example.com',
      'Address': '124 Church Street, Chennai',
      'Member Type': 'Member',
      'Ministry': ministries[1]?.name || 'Worship & Music',
      'Status': 'Active'
    },
    {
      'First Name': 'David',
      'Last Name': 'Doe',
      'Gender': 'Male',
      'Date of Birth': '2015-03-10',
      'Phone': '',
      'Email': '',
      'Address': '124 Church Street, Chennai',
      'Member Type': 'Child',
      'Ministry': '',
      'Status': 'Active'
    }
  ];

  const handleDownloadCsvTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(templateSampleRows, { header: templateHeaders });
    const csvStr = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentChurchName.replace(/\s+/g, '_')}_Import_Members_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateSampleRows, { header: templateHeaders });
    
    // Set column widths for clean readability
    ws['!cols'] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 10 }, // Gender
      { wch: 14 }, // Date of Birth
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 30 }, // Address
      { wch: 15 }, // Member Type
      { wch: 20 }, // Ministry
      { wch: 12 }, // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Members Import Template');
    XLSX.writeFile(wb, `${currentChurchName.replace(/\s+/g, '_')}_Import_Members_Template.xlsx`);
  };

  // -------------------------------------------------------------
  // STEP 2: FILE UPLOAD & PARSING
  // -------------------------------------------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const processFile = async (file: File) => {
    setFileError(null);
    const fileName = file.name;
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

    if (!['.csv', '.xlsx', '.xls'].includes(ext)) {
      setFileError(`Unsupported file format "${ext}". Please upload a valid .csv or .xlsx file.`);
      setSelectedFile(null);
      return;
    }

    if (file.size === 0) {
      setFileError('The selected file is empty. Please select a valid file containing member rows.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setIsProcessingFile(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in workbook.');
      }

      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });

      if (rawRows.length === 0) {
        setFileError('No member data rows found in the uploaded file.');
        setIsProcessingFile(false);
        return;
      }

      parseAndValidateRows(rawRows);
      setCurrentStep('preview');
    } catch (err: any) {
      console.error('File parsing error:', err);
      setFileError(`Failed to parse file: ${err.message || 'Corrupted or unreadable format.'}`);
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Helper to extract field value with multi-header alias support
  const getRowFieldValue = (row: Record<string, any>, aliases: string[]): string => {
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const targetKey = keys.find(k => k.trim().toLowerCase() === alias.toLowerCase());
      if (targetKey && row[targetKey] !== undefined && row[targetKey] !== null) {
        return String(row[targetKey]).trim();
      }
    }
    return '';
  };

  // -------------------------------------------------------------
  // STEP 3: ROW PARSING, VALIDATION & DUPLICATE DETECTION
  // -------------------------------------------------------------
  const parseAndValidateRows = (rawRows: Record<string, any>[]) => {
    const validatedList: ParsedImportRow[] = [];
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();

    rawRows.forEach((row, idx) => {
      const rowIndex = idx + 1;
      
      const firstName = getRowFieldValue(row, ['First Name', 'FirstName', 'Given Name', 'First_Name', 'First']);
      const lastName = getRowFieldValue(row, ['Last Name', 'LastName', 'Surname', 'Family Name', 'Last_Name', 'Last']);
      const genderRaw = getRowFieldValue(row, ['Gender', 'Sex']);
      const dobRaw = getRowFieldValue(row, ['Date of Birth', 'DateOfBirth', 'DOB', 'Birth Date', 'Birthdate']);
      const phoneRaw = getRowFieldValue(row, ['Phone', 'Phone Number', 'PhoneNumber', 'Mobile', 'Contact', 'Cell']);
      const emailRaw = getRowFieldValue(row, ['Email', 'Email Address', 'EmailAddress', 'Mail']);
      const address = getRowFieldValue(row, ['Address', 'Street', 'Location', 'Address Line']);
      const memberTypeRaw = getRowFieldValue(row, ['Member Type', 'MemberType', 'Role', 'Membership Status', 'Membership Type', 'Type']);
      const ministryRaw = getRowFieldValue(row, ['Ministry', 'Ministry Team', 'Department', 'Team']);
      const statusRaw = getRowFieldValue(row, ['Status', 'Member Status', 'State']);

      const validationErrors: string[] = [];

      // 1. Validate Required Fields
      if (!firstName && !lastName) {
        validationErrors.push('First Name or Last Name is required');
      }

      // 2. Validate Email Format
      const email = emailRaw.toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        validationErrors.push(`Invalid email address format: "${emailRaw}"`);
      }

      // 3. Validate Phone Format
      const cleanPhone = sanitizePhone(phoneRaw);
      if (phoneRaw && cleanPhone.length < 7) {
        validationErrors.push(`Invalid phone number format: "${phoneRaw}"`);
      }

      // 4. Validate Gender
      let gender = 'Other';
      const gLower = genderRaw.toLowerCase();
      if (gLower.startsWith('m')) gender = 'Male';
      else if (gLower.startsWith('f')) gender = 'Female';
      else if (genderRaw) gender = genderRaw;

      // 5. Validate Member Type
      let memberType: MembershipStatus = 'Member';
      if (memberTypeRaw) {
        const foundType = SUPPORTED_MEMBER_TYPES.find(
          t => t.toLowerCase() === memberTypeRaw.toLowerCase() || memberTypeRaw.toLowerCase().includes(t.toLowerCase())
        );
        if (foundType) {
          memberType = foundType;
        } else if (memberTypeRaw.toLowerCase().includes('child') || memberTypeRaw.toLowerCase().includes('kid')) {
          memberType = 'Youth';
        }
      }

      // 6. Ministry Assignment & Matching
      let matchedMinistry: ChurchMinistry | undefined = undefined;
      let ministryWarning: string | undefined = undefined;

      if (ministryRaw) {
        const minClean = ministryRaw.trim().toLowerCase();
        const foundMin = ministries.find(
          m => m.name.toLowerCase().trim() === minClean || m.id.toLowerCase() === minClean
        );
        if (foundMin) {
          matchedMinistry = foundMin;
        } else {
          ministryWarning = `Ministry "${ministryRaw}" does not exist in church registry. Row will be imported without ministry assignment.`;
        }
      }

      // 7. Duplicate Detection
      let isDuplicate = false;
      let duplicateReason: string | undefined = undefined;
      let matchedExistingMember: Member | undefined = undefined;

      // Check against existing database members
      if (email) {
        const dbMatch = existingMembers.find(m => m.email && m.email.trim().toLowerCase() === email);
        if (dbMatch) {
          isDuplicate = true;
          duplicateReason = `Email matches existing member "${dbMatch.firstName} ${dbMatch.lastName}" (${dbMatch.email})`;
          matchedExistingMember = dbMatch;
        }
      }

      if (!isDuplicate && cleanPhone) {
        const dbMatch = existingMembers.find(m => m.phone && sanitizePhone(m.phone) === cleanPhone);
        if (dbMatch) {
          isDuplicate = true;
          duplicateReason = `Phone matches existing member "${dbMatch.firstName} ${dbMatch.lastName}" (${dbMatch.phone})`;
          matchedExistingMember = dbMatch;
        }
      }

      // Check against preceding rows in same uploaded file
      if (!isDuplicate && email && seenEmails.has(email)) {
        isDuplicate = true;
        duplicateReason = `Duplicate email "${email}" appears earlier in this import file.`;
      }
      if (!isDuplicate && cleanPhone && seenPhones.has(cleanPhone)) {
        isDuplicate = true;
        duplicateReason = `Duplicate phone "${cleanPhone}" appears earlier in this import file.`;
      }

      if (email) seenEmails.add(email);
      if (cleanPhone) seenPhones.add(cleanPhone);

      const isValid = validationErrors.length === 0;

      validatedList.push({
        rowIndex,
        firstName: firstName || 'Unnamed',
        lastName,
        gender,
        dob: dobRaw,
        phone: phoneRaw,
        email,
        address,
        memberType,
        ministry: ministryRaw,
        matchedMinistry,
        ministryWarning,
        status: statusRaw || 'Active',
        isValid,
        isDuplicate,
        duplicateReason,
        matchedExistingMember,
        duplicateAction: 'skip', // Default safest option: Skip duplicate
        validationErrors,
      });
    });

    setParsedRows(validatedList);
  };

  // Duplicate Action Toggle Handler (per row)
  const handleDuplicateActionChange = (rowIndex: number, action: DuplicateAction) => {
    setParsedRows(prev => prev.map(r => r.rowIndex === rowIndex ? { ...r, duplicateAction: action } : r));
  };

  // Bulk Duplicate Action Handler
  const handleBulkDuplicateActionChange = (action: DuplicateAction) => {
    setParsedRows(prev => prev.map(r => r.isDuplicate ? { ...r, duplicateAction: action } : r));
  };


  // -------------------------------------------------------------
  // STEP 4: IMPORT EXECUTION
  // -------------------------------------------------------------
  const handleExecuteImport = () => {
    let importedCountNum = 0;
    let updatedCountNum = 0;
    let skippedCountNum = 0;
    let failedCountNum = 0;

    const createdMembers: Member[] = [];
    const updatedMembersList: Member[] = [];
    const errorReports: { row: number; name: string; email: string; phone: string; reason: string }[] = [];

    parsedRows.forEach(row => {
      const fullName = `${row.firstName} ${row.lastName}`.trim();

      // 1. Invalid Row -> Skip and log error
      if (!row.isValid) {
        failedCountNum++;
        errorReports.push({
          row: row.rowIndex,
          name: fullName,
          email: row.email,
          phone: row.phone,
          reason: row.validationErrors.join('; ')
        });
        return;
      }

      // 2. Duplicate Row handling
      if (row.isDuplicate) {
        if (row.duplicateAction === 'skip') {
          skippedCountNum++;
          errorReports.push({
            row: row.rowIndex,
            name: fullName,
            email: row.email,
            phone: row.phone,
            reason: row.duplicateReason || 'Skipped duplicate member'
          });
          return;
        }

        if (row.duplicateAction === 'update_existing' && row.matchedExistingMember) {
          // Update existing member record
          const existing = row.matchedExistingMember;
          const updated: Member = {
            ...existing,
            firstName: row.firstName || existing.firstName,
            lastName: row.lastName || existing.lastName,
            email: row.email || existing.email,
            phone: row.phone || existing.phone,
            address: row.address || existing.address,
            gender: row.gender || existing.gender,
            birthdate: row.dob || existing.birthdate,
            status: row.memberType || existing.status,
            ministryTeams: row.matchedMinistry
              ? Array.from(new Set([...existing.ministryTeams, row.matchedMinistry.name]))
              : existing.ministryTeams,
          };
          updatedMembersList.push(updated);
          updatedCountNum++;
          return;
        }
      }

      // 3. Create New Member Record
      const newMemberId = `mem-${Date.now()}-${row.rowIndex}`;
      const newMember: Member = {
        id: newMemberId,
        church_id: currentChurchId,
        churchId: currentChurchId,
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        address: row.address,
        city: '',
        state: '',
        zipCode: '',
        gender: row.gender,
        birthdate: row.dob,
        status: row.memberType,
        joinedDate: new Date().toISOString().split('T')[0],
        familyMembers: [],
        ministryTeams: row.matchedMinistry ? [row.matchedMinistry.name] : [],
        availability: [],
        skills: [],
        isPrivateNotes: false,
        createdAt: new Date().toISOString(),
      };

      createdMembers.push(newMember);
      importedCountNum++;
    });

    setImportedCount(importedCountNum);
    setUpdatedCount(updatedCountNum);
    setSkippedCount(skippedCountNum);
    setFailedCount(failedCountNum);
    setNewlyCreatedMembers(createdMembers);
    setErrorReportData(errorReports);

    // Default select all created members except kids for user account creation
    const initialAccountSelection: Record<string, boolean> = {};
    createdMembers.forEach(m => {
      // Don't auto-check children or records without email
      const isChild = m.status === 'Youth' || (m.birthdate && new Date().getFullYear() - new Date(m.birthdate).getFullYear() < 16);
      initialAccountSelection[m.id] = !!m.email && !isChild;
    });
    setSelectedForAccount(initialAccountSelection);

    // Dispatch completion callback to parent app state
    onImportComplete(createdMembers, updatedMembersList);
    setCurrentStep('results');
  };

  // -------------------------------------------------------------
  // STEP 5: DOWNLOAD ERROR REPORT
  // -------------------------------------------------------------
  const handleDownloadErrorReport = () => {
    if (errorReportData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(errorReportData, {
      header: ['row', 'name', 'email', 'phone', 'reason']
    });
    const csvStr = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${currentChurchName.replace(/\s+/g, '_')}_Import_Errors_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // -------------------------------------------------------------
  // STEP 6: CREATE USER ACCOUNTS FOR SELECTED MEMBERS
  // -------------------------------------------------------------
  const handleCreateSelectedUserAccounts = () => {
    const selectedMemberIds = Object.keys(selectedForAccount).filter(id => selectedForAccount[id]);
    if (selectedMemberIds.length === 0) {
      alert('Please select at least one member to create a user account.');
      return;
    }

    const createdUsersList: SaaSUser[] = [];

    selectedMemberIds.forEach((memberId, idx) => {
      const member = newlyCreatedMembers.find(m => m.id === memberId);
      if (!member) return;

      let mappedRole: SaaSUserRole = 'Member';
      if (member.status === 'Pastor') mappedRole = 'PastorAdmin';
      else if (member.status === 'Assistant Pastor') mappedRole = 'AssistantPastor';
      else if (member.status === 'Leader') mappedRole = 'MinistryLeader';
      else if (member.status === 'Clergy/Staff') mappedRole = 'TreasurerStaff';

      const username = (member.email ? member.email.split('@')[0] : `${member.firstName.toLowerCase()}.${member.lastName.toLowerCase()}`).replace(/[^a-z0-9._-]/g, '');

      const newUser: SaaSUser = {
        id: `user-${Date.now()}-${idx}`,
        church_id: currentChurchId,
        churchId: currentChurchId,
        name: `${member.firstName} ${member.lastName}`.trim(),
        username: username || `user${Date.now()}${idx}`,
        email: member.email || `${username}@church.local`,
        phone: member.phone || '',
        role: mappedRole,
        status: 'Active',
        createdAt: new Date().toISOString(),
      };

      createdUsersList.push(newUser);
    });

    setCreatedAccountsCount(createdUsersList.length);
    onImportComplete([], [], createdUsersList);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-4 sm:p-5 flex items-center justify-between shrink-0 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-500 dark:text-amber-400 font-bold shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Import Church Members</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Bulk upload members from CSV or Excel file</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Progress Bar */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-5 py-2.5 flex items-center justify-between text-xs font-semibold text-slate-400 overflow-x-auto">
          <div className="flex items-center space-x-2 shrink-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 'upload' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>1</span>
            <span className={currentStep === 'upload' ? 'text-amber-400 font-bold' : ''}>Download & Upload</span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />

          <div className="flex items-center space-x-2 shrink-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentStep === 'preview' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>2</span>
            <span className={currentStep === 'preview' ? 'text-amber-400 font-bold' : ''}>Preview & Validate</span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />

          <div className="flex items-center space-x-2 shrink-0">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${['results', 'create_accounts'].includes(currentStep) ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>3</span>
            <span className={['results', 'create_accounts'].includes(currentStep) ? 'text-emerald-400 font-bold' : ''}>Result & Accounts</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-6">

          {/* -------------------------------------------------------------
              STEP 1: UPLOAD FILE & DOWNLOAD TEMPLATES
          ------------------------------------------------------------- */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              
              {/* Template Download Section */}
              <div className="bg-amber-950/30 border border-amber-900/60 p-4 rounded-2xl space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-amber-400" />
                      Step 1 — Download Member Import Template
                    </h3>
                    <p className="text-xs text-amber-200/80 mt-1">
                      Download a template file with pre-formatted column headers for First Name, Last Name, Phone, Email, Member Type, Ministry, etc.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    onClick={handleDownloadCsvTemplate}
                    className="px-3.5 py-2 bg-slate-800 text-emerald-300 border border-emerald-800/80 hover:bg-slate-750 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition"
                  >
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Download CSV Template</span>
                  </button>

                  <button
                    onClick={handleDownloadExcelTemplate}
                    className="px-3.5 py-2 bg-emerald-700 text-white hover:bg-emerald-600 rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download Excel Template (.xlsx)</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-amber-400" />
                  Step 2 — Select & Upload CSV or Excel File
                </h3>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
                    selectedFile
                      ? 'border-emerald-500 bg-emerald-950/30'
                      : 'border-slate-700 hover:border-amber-400 bg-slate-800/50 hover:bg-amber-950/20'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                  />

                  <div className="w-14 h-14 bg-slate-800 rounded-2xl shadow-sm border border-slate-700 flex items-center justify-center text-amber-400">
                    <Upload className="w-7 h-7" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-white">
                      Click to browse or drag and drop your file here
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Supports <span className="font-semibold text-slate-300">.csv</span> and <span className="font-semibold text-slate-300">.xlsx</span> spreadsheet files
                    </p>
                  </div>
                </div>

                {/* Display File Selection Status & Errors */}
                {selectedFile && (
                  <div className="bg-slate-800 border border-slate-700 p-3.5 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center space-x-3 truncate">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-200 truncate">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Ready to parse
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setFileError(null);
                      }}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded-lg transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {fileError && (
                  <div className="bg-rose-950/50 border border-rose-800 text-rose-300 p-3.5 rounded-2xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{fileError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              STEP 2: PREVIEW & VALIDATION TABLE
          ------------------------------------------------------------- */}
          {currentStep === 'preview' && (
            <div className="space-y-4">
              
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800 border border-slate-700 p-3 rounded-2xl">
                  <p className="text-[11px] text-slate-400 font-medium">Total Found</p>
                  <p className="text-xl font-black text-white">{summaryStats.total} <span className="text-xs font-normal text-slate-400">records</span></p>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-800/80 p-3 rounded-2xl">
                  <p className="text-[11px] text-emerald-400 font-medium">Valid Records</p>
                  <p className="text-xl font-black text-emerald-300">{summaryStats.valid}</p>
                </div>

                <div className="bg-amber-950/40 border border-amber-800/80 p-3 rounded-2xl">
                  <p className="text-[11px] text-amber-400 font-medium">Possible Duplicates</p>
                  <p className="text-xl font-black text-amber-300">{summaryStats.duplicates}</p>
                </div>

                <div className="bg-rose-950/40 border border-rose-800/80 p-3 rounded-2xl">
                  <p className="text-[11px] text-rose-400 font-medium">Invalid Records</p>
                  <p className="text-xl font-black text-rose-300">{summaryStats.invalid}</p>
                </div>
              </div>

              {/* Duplicate Handling Global Bar */}
              {summaryStats.duplicates > 0 && (
                <div className="bg-amber-950/40 border border-amber-800/80 p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-semibold">
                      {summaryStats.duplicates} possible duplicates detected. Select default action:
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleBulkDuplicateActionChange('skip')}
                      className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition"
                    >
                      Skip All Duplicates (Safest)
                    </button>
                    <button
                      onClick={() => handleBulkDuplicateActionChange('update_existing')}
                      className="px-2.5 py-1 bg-slate-800 text-slate-200 font-bold rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white transition"
                    >
                      Update Existing
                    </button>
                    <button
                      onClick={() => handleBulkDuplicateActionChange('import_new')}
                      className="px-2.5 py-1 bg-slate-800 text-slate-200 font-bold rounded-lg border border-slate-700 hover:bg-slate-700 hover:text-white transition"
                    >
                      Import as New
                    </button>
                  </div>
                </div>
              )}

              {/* Table Filter Tabs */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2 text-xs font-semibold">
                  <button
                    onClick={() => setPreviewFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl transition ${previewFilter === 'ALL' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                  >
                    All ({summaryStats.total})
                  </button>

                  <button
                    onClick={() => setPreviewFilter('VALID')}
                    className={`px-3 py-1.5 rounded-xl transition ${previewFilter === 'VALID' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                  >
                    Valid ({summaryStats.valid})
                  </button>

                  <button
                    onClick={() => setPreviewFilter('DUPLICATES')}
                    className={`px-3 py-1.5 rounded-xl transition ${previewFilter === 'DUPLICATES' ? 'bg-amber-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                  >
                    Duplicates ({summaryStats.duplicates})
                  </button>

                  <button
                    onClick={() => setPreviewFilter('INVALID')}
                    className={`px-3 py-1.5 rounded-xl transition ${previewFilter === 'INVALID' ? 'bg-rose-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                  >
                    Invalid ({summaryStats.invalid})
                  </button>
                </div>

                <span className="text-xs text-slate-400 hidden sm:inline">
                  Ready to Import: <strong className="text-emerald-400 font-bold">{summaryStats.readyToImport}</strong> records
                </span>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-2xl max-h-72">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead className="bg-slate-800 sticky top-0 font-bold text-slate-200 border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Member Type</th>
                      <th className="py-2.5 px-3">Ministry</th>
                      <th className="py-2.5 px-3">Validation & Duplicate Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500 italic">
                          No records match the selected preview filter.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map((row) => {
                        const fullName = `${row.firstName} ${row.lastName}`.trim();

                        return (
                          <tr
                            key={row.rowIndex}
                            className={`hover:bg-slate-800/60 transition ${
                              !row.isValid
                                ? 'bg-rose-950/20'
                                : row.isDuplicate
                                ? 'bg-amber-950/20'
                                : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-400 font-bold">{row.rowIndex}</td>
                            <td className="py-2.5 px-3 font-bold text-white">{fullName}</td>
                            <td className="py-2.5 px-3 font-mono">{row.phone || '—'}</td>
                            <td className="py-2.5 px-3">{row.email || '—'}</td>
                            <td className="py-2.5 px-3 font-medium">{row.memberType}</td>
                            <td className="py-2.5 px-3">
                              {row.matchedMinistry ? (
                                <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-md font-medium">
                                  {row.matchedMinistry.name}
                                </span>
                              ) : row.ministry ? (
                                <span className="text-amber-300 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-md font-medium" title={row.ministryWarning}>
                                  ⚠️ {row.ministry} (Not in registry)
                                </span>
                              ) : (
                                <span className="text-slate-500 italic">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              {!row.isValid ? (
                                <div className="text-rose-400 font-semibold flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  <span>{row.validationErrors.join(', ')}</span>
                                </div>
                              ) : row.isDuplicate ? (
                                <div className="space-y-1">
                                  <div className="text-amber-400 font-bold flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>Duplicate</span>
                                  </div>
                                  <p className="text-[10px] text-amber-300/80">{row.duplicateReason}</p>

                                  <div className="flex items-center gap-1 mt-1">
                                    <select
                                      value={row.duplicateAction}
                                      onChange={(e) => handleDuplicateActionChange(row.rowIndex, e.target.value as DuplicateAction)}
                                      className="bg-slate-800 border border-amber-500/80 text-white rounded-md px-1.5 py-0.5 text-[11px] font-bold focus:outline-none"
                                    >
                                      <option value="skip" className="bg-slate-900 text-white">Skip Duplicate (Default)</option>
                                      <option value="import_new" className="bg-slate-900 text-white">Import as New Member</option>
                                      {row.matchedExistingMember && (
                                        <option value="update_existing" className="bg-slate-900 text-white">Update Existing Member</option>
                                      )}
                                    </select>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>Valid</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Confirmation Ready Info Banner */}
              <div className="bg-slate-950 border border-slate-800 text-white p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm">Ready to Import</h4>
                  <p className="text-xs text-slate-300">
                    <strong className="text-amber-400 font-bold">{summaryStats.readyToImport} members</strong> are ready to import.{' '}
                    {summaryStats.total - summaryStats.readyToImport > 0 && (
                      <span>{summaryStats.total - summaryStats.readyToImport} records will be skipped because of duplicates or validation errors.</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentStep('upload')}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs transition"
                  >
                    Back to Upload
                  </button>

                  <button
                    onClick={handleExecuteImport}
                    disabled={summaryStats.readyToImport === 0}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                      summaryStats.readyToImport > 0
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    <span>Import {summaryStats.readyToImport} Members</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------
              STEP 3: IMPORT COMPLETED RESULTS & USER ACCOUNTS OPTION
          ------------------------------------------------------------- */}
          {currentStep === 'results' && (
            <div className="space-y-6 text-white">
              
              {/* Success Banner */}
              <div className="bg-emerald-950/40 border border-emerald-800/80 p-5 rounded-3xl text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
                <h3 className="text-lg font-bold text-emerald-300">Import Completed Successfully</h3>
                <p className="text-xs text-emerald-400">
                  Church member records have been processed and added to your cloud database.
                </p>
              </div>

              {/* Statistics Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl text-center">
                  <span className="text-[11px] font-semibold text-emerald-400 block">Successfully Imported</span>
                  <span className="text-2xl font-black text-emerald-300">{importedCount}</span>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl text-center">
                  <span className="text-[11px] font-semibold text-blue-400 block">Updated Existing</span>
                  <span className="text-2xl font-black text-blue-300">{updatedCount}</span>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl text-center">
                  <span className="text-[11px] font-semibold text-amber-400 block">Skipped</span>
                  <span className="text-2xl font-black text-amber-300">{skippedCount}</span>
                </div>

                <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl text-center">
                  <span className="text-[11px] font-semibold text-rose-400 block">Failed / Errors</span>
                  <span className="text-2xl font-black text-rose-300">{failedCount}</span>
                </div>
              </div>

              {/* Error Report Download Button */}
              {errorReportData.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-xs block">Download Error Report</span>
                    <span className="text-[11px] text-slate-400">
                      Download a CSV report detailing reasons for skipped or failed rows.
                    </span>
                  </div>
                  <button
                    onClick={handleDownloadErrorReport}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-750 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition border border-slate-700"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Download Error Report</span>
                  </button>
                </div>
              )}

              {/* User Account Creation Option */}
              {newlyCreatedMembers.length > 0 && (
                <div className="bg-indigo-950/40 border border-indigo-800/80 p-4 rounded-3xl space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-1.5">
                        <UserPlus className="w-4 h-4 text-indigo-400" />
                        Create Application Login Accounts (Optional)
                      </h4>
                      <p className="text-xs text-indigo-200/80 mt-0.5">
                        Select which imported members should receive an application login account. Children or members without email remain directory-only records.
                      </p>
                    </div>

                    <button
                      onClick={() => setCurrentStep('create_accounts')}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0"
                    >
                      Manage User Accounts ({newlyCreatedMembers.length})
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------------
              STEP 4: USER ACCOUNT CREATION SELECTION TABLE
          ------------------------------------------------------------- */}
          {currentStep === 'create_accounts' && (
            <div className="space-y-4 text-white">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Select Members to Create Login Accounts</h3>
                  <p className="text-xs text-slate-400">Only selected members will be granted login access to the Church Management App.</p>
                </div>

                {createdAccountsCount !== null && (
                  <div className="bg-emerald-950/80 text-emerald-300 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-800">
                    ✓ Created {createdAccountsCount} Login Accounts
                  </div>
                )}
              </div>

              {/* Member Selection Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-2xl max-h-64">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead className="bg-slate-800 sticky top-0 font-bold text-slate-200 border-b border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={newlyCreatedMembers.length > 0 && newlyCreatedMembers.every(m => selectedForAccount[m.id])}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const updated: Record<string, boolean> = {};
                            newlyCreatedMembers.forEach(m => { updated[m.id] = checked; });
                            setSelectedForAccount(updated);
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Member Name</th>
                      <th className="py-2.5 px-3">Email</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3">Member Type</th>
                      <th className="py-2.5 px-3">Account Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {newlyCreatedMembers.map((member) => {
                      const fullName = `${member.firstName} ${member.lastName}`.trim();
                      const isChecked = !!selectedForAccount[member.id];

                      return (
                        <tr key={member.id} className="hover:bg-slate-800/60 transition">
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setSelectedForAccount(prev => ({ ...prev, [member.id]: e.target.checked }));
                              }}
                              className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-bold text-white">{fullName}</td>
                          <td className="py-2.5 px-3">{member.email || <span className="text-slate-500 italic">No Email</span>}</td>
                          <td className="py-2.5 px-3 font-mono">{member.phone || '—'}</td>
                          <td className="py-2.5 px-3 font-medium">{member.status}</td>
                          <td className="py-2.5 px-3">
                            {isChecked ? (
                              <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                ☑ Create Account
                              </span>
                            ) : (
                              <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full text-[10px]">
                                ☐ No Account
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setCurrentStep('results')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Back to Summary
                </button>

                <button
                  onClick={handleCreateSelectedUserAccounts}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create User Accounts for Selected</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            {currentStep === 'upload' && 'Step 1 of 3: Download template or upload file.'}
            {currentStep === 'preview' && `Step 2 of 3: Reviewing ${parsedRows.length} rows.`}
            {['results', 'create_accounts'].includes(currentStep) && 'Step 3 of 3: Import complete.'}
          </div>

          <div className="flex items-center space-x-2">
            {currentStep === 'upload' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl text-xs transition"
              >
                Cancel
              </button>
            )}

            {['results', 'create_accounts'].includes(currentStep) && (
              <button
                onClick={handleClose}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5"
              >
                <Users className="w-4 h-4" />
                <span>View Directory Members</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
