import React, { useState } from 'react';
import { 
  ChurchTenant, SaaSUser, Member, AttendanceRecord, SundaySchoolClass, 
  SundaySchoolStudent, ChurchMinistry, MinistryMember, MinistryActivity, 
  ChurchEvent, RosterAssignment, PrayerRequest 
} from '@/types';
import { 
  parseReportIntent, validateReportPermission, executeReportTool, 
  generateStructuredAiReport, StructuredReportPayload 
} from '@/services/aiReportService';
import { auditService } from '@/services/auditService';
import { 
  Sparkles, FileText, Download, Printer, Share2, Search, Filter, 
  CheckCircle2, AlertCircle, Info, Shield, BarChart3, TrendingUp, 
  Calendar, Users, Heart, Clock, ChevronRight, X, ArrowUpRight, FileSpreadsheet 
} from 'lucide-react';

interface AiReportGeneratorProps {
  currentChurch: ChurchTenant;
  currentUser?: SaaSUser;
  members: Member[];
  attendanceRecords: AttendanceRecord[];
  sundaySchoolClasses?: SundaySchoolClass[];
  sundaySchoolStudents?: SundaySchoolStudent[];
  ministries?: ChurchMinistry[];
  ministryMembers?: MinistryMember[];
  ministryActivities?: MinistryActivity[];
  events?: ChurchEvent[];
  roster?: RosterAssignment[];
  prayers?: PrayerRequest[];
  initialPrompt?: string;
}

export const AiReportGenerator: React.FC<AiReportGeneratorProps> = ({
  currentChurch,
  currentUser,
  members = [],
  attendanceRecords = [],
  sundaySchoolClasses = [],
  sundaySchoolStudents = [],
  ministries = [],
  ministryMembers = [],
  ministryActivities = [],
  events = [],
  roster = [],
  prayers = [],
  initialPrompt = ''
}) => {
  const churchId = currentChurch?.id || 'church-1';
  const churchName = currentChurch?.name || 'Church CMS';

  const [prompt, setPrompt] = useState<string>(initialPrompt || 'Generate this month\'s attendance report');
  const [selectedLanguage, setSelectedLanguage] = useState<'auto' | 'ta' | 'en'>('auto');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [report, setReport] = useState<StructuredReportPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Table Search Filter
  const [tableSearch, setTableSearch] = useState<string>('');

  const quickPrompts = [
    '📊 Monthly Attendance Report',
    '📈 Member Engagement Report',
    '🤝 Ministry Activity & Assignment Report',
    '🎓 Sunday School Attendance Report',
    '👥 Visitor Follow-Up Report',
    '🕒 Absence Follow-Up Summary',
    '🔄 Compare August and September',
    '🇮🇳 இந்த மாதத்திற்கான attendance report'
  ];

  const handleGenerateReport = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim()) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      // 1. Parse intent
      const intent = await parseReportIntent(activePrompt, currentUser?.role);
      if (selectedLanguage !== 'auto') {
        intent.language = selectedLanguage;
      }

      // 2. Validate permissions
      const authResult = validateReportPermission({
        currentUser,
        category: intent.category,
        scope: intent.scope,
        ministries
      });

      if (!authResult.authorized) {
        setErrorMessage(authResult.reason || 'Permission denied.');
        setIsGenerating(false);
        return;
      }

      // 3. Execute tool data query
      const toolData = executeReportTool({
        churchId,
        churchName,
        intent,
        members,
        attendanceRecords,
        sundaySchoolClasses,
        sundaySchoolStudents,
        ministries,
        ministryMembers,
        ministryActivities,
        events,
        roster,
        prayers
      });

      // 4. Generate structured report via AI
      const generatedReport = await generateStructuredAiReport({
        churchName,
        intent,
        toolData,
        currentUser
      });

      setReport(generatedReport);

      auditService.logAction(churchId, {
        action: 'ai_report.generated',
        resource_type: 'report',
        details: { category: intent.category, period: intent.periodLabel },
        actor_id: currentUser?.id
      });
    } catch (err) {
      console.error('AI report generation error:', err);
      setErrorMessage('An error occurred while generating the report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (!report || !report.tableRows || report.tableRows.length === 0) return;
    const headers = report.tableColumns.join(',');
    const rows = report.tableRows.map((r) => 
      report.tableColumns.map((col) => `"${(r[col] || '').toString().replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${report.title.replace(/[^a-z0-9]/gi, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Natural Language Prompt Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-100">AI Natural Language Report Generator</h2>
          </div>
          <span className="text-xs text-slate-400">
            Powered by Gemini 2.5 Flash • Non-Judgmental Factual Analytics
          </span>
        </div>

        <p className="text-sm text-slate-400">
          Request custom analytical reports in natural language (English or Tamil). The AI parses your request, validates permissions, and generates structured reports from database records.
        </p>

        {/* Quick Prompts Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(qp.replace(/^[^\s]+\s/, ''));
                handleGenerateReport(qp.replace(/^[^\s]+\s/, ''));
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-700/80 text-xs font-semibold transition"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Generate this month's attendance report or இந்த மாதத்திற்கான report..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />

          <select
            value={selectedLanguage}
            onChange={(e: any) => setSelectedLanguage(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="auto">Language: Auto / Bilingual</option>
            <option value="ta">Language: Tamil (தமிழ்)</option>
            <option value="en">Language: English</option>
          </select>

          <button
            onClick={() => handleGenerateReport()}
            disabled={isGenerating || !prompt.trim()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Structured Report Viewer Panel */}
      {report && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 animate-in fade-in zoom-in-95">
          {/* Report Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h3 className="text-xl font-bold text-slate-100">{report.title}</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                <span>Period: <strong className="text-indigo-400">{report.periodText}</strong></span>
                <span>•</span>
                <span>Scope: <strong className="text-slate-200">{report.scopeLabel}</strong></span>
                <span>•</span>
                <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" /> Print / PDF
              </button>
            </div>
          </div>

          {/* Executive Summary Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Executive Summary</h4>
            <p className="text-sm text-slate-300 leading-relaxed">{report.executiveSummary}</p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {report.metrics.map((m, idx) => (
              <div key={idx} className="bg-slate-850 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400 block">{m.label}</span>
                <span className="text-2xl font-bold text-slate-100 block mt-1">{m.value}</span>
                {m.subtext && <span className="text-xs text-slate-500 block mt-0.5">{m.subtext}</span>}
              </div>
            ))}
          </div>

          {/* Trend Chart (if chart points exist) */}
          {report.chartPoints && report.chartPoints.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Analytical Trend Points</h4>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {report.chartPoints.map((cp, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                    <span className="text-xs text-slate-400 block truncate">{cp.label}</span>
                    <span className="text-base font-bold text-indigo-400 mt-1 block">{cp.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Table */}
          {report.tableColumns && report.tableColumns.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Structured Data Records</h4>
                <input
                  type="text"
                  placeholder="Filter table rows..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-48"
                />
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                      <tr>
                        {report.tableColumns.map((col, idx) => (
                          <th key={idx} className="p-3">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {report.tableRows.length === 0 ? (
                        <tr>
                          <td colSpan={report.tableColumns.length} className="p-6 text-center text-slate-500">
                            No rows returned.
                          </td>
                        </tr>
                      ) : (
                        report.tableRows
                          .filter((row) => !tableSearch || Object.values(row).some(v => String(v).toLowerCase().includes(tableSearch.toLowerCase())))
                          .slice(0, 15)
                          .map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-900/50 transition">
                              {report.tableColumns.map((col, cIdx) => (
                                <td key={cIdx} className="p-3">{String(row[col] ?? '—')}</td>
                              ))}
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Factual Observations & Data Limitations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Factual Observations</h4>
              <ul className="space-y-1 text-xs text-slate-300 leading-relaxed list-disc list-inside">
                {report.factualObservations.map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Info className="w-4 h-4" /> Data Limitations
              </h4>
              <ul className="space-y-1 text-xs text-amber-300/90 leading-relaxed list-disc list-inside">
                {report.dataLimitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
