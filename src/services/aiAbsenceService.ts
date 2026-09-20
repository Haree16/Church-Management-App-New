import { GoogleGenAI } from '@google/genai';
import { AutomatedAbsenceFollowUpTask, AbsenceFollowUpSettings } from './absenceFollowUpService';

export async function generateAbsenceInsightsSummary(params: {
  churchName: string;
  tasks: AutomatedAbsenceFollowUpTask[];
  settings: AbsenceFollowUpSettings;
  language?: 'en' | 'ta' | 'auto';
}): Promise<string> {
  const { churchName, tasks, language = 'auto' } = params;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

  const totalTasks = tasks.length;
  const awaitingApproval = tasks.filter(t => t.status === 'awaiting_approval').length;
  const sent = tasks.filter(t => t.status === 'sent').length;
  const resolved = tasks.filter(t => t.status === 'resolved_by_attendance').length;
  const skipped = tasks.filter(t => t.status === 'skipped').length;
  const dnc = tasks.filter(t => t.status === 'do_not_contact').length;

  const fallbackEn = `Absence Follow-Up Summary for ${churchName}: A total of ${totalTasks} absence follow-up records are tracked. Currently, ${awaitingApproval} tasks are awaiting approval, ${sent} follow-ups have been sent, and ${resolved} members have had their status automatically resolved upon attending a service.`;
  
  const fallbackTa = `${churchName}-ன் வருகை இல்லாதோர் பின்தொடர்ல் சுருக்கம்: மொத்தம் ${totalTasks} தொடர்புகள் பதிவு செய்யப்பட்டுள்ளன. தற்போது ${awaitingApproval} ஒப்புதலுக்காகக் காத்திருக்கின்றன, ${sent} செய்திகள் அனுப்பப்பட்டுள்ளன, மற்றும் ${resolved} உறுப்பினர்கள் மீண்டும் ஆராதனைக்கு வந்துள்ளதால் தானாகவே நிறைவு செய்யப்பட்டுள்ளனர்.`;

  if (!apiKey) {
    return language === 'ta' ? fallbackTa : fallbackEn;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a factual church administrative AI assistant for ${churchName}.
Generate a concise 3-bullet point executive summary of the automated absence follow-up system status.

Metrics:
- Total Tasks Tracked: ${totalTasks}
- Awaiting Staff Approval: ${awaitingApproval}
- Sent Messages: ${sent}
- Automatically Resolved (Returned to Attendance): ${resolved}
- Skipped: ${skipped}
- Excluded (Do Not Contact): ${dnc}

Language Requested: ${language === 'ta' ? 'Tamil (Tamil script)' : 'English'}

CRITICAL RULES:
- Use strictly factual, non-judgmental language.
- DO NOT use words like "uncommitted", "backsliding", "spiritually weak", "lazy", or "unfaithful".
- Keep it under 100 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim();
    if (text) return text;
  } catch (e) {
    console.warn('AI summary generation for absence metrics failed:', e);
  }

  return language === 'ta' ? fallbackTa : fallbackEn;
}

export async function answerAbsenceQuery(params: {
  churchName: string;
  query: string;
  tasks: AutomatedAbsenceFollowUpTask[];
  language?: 'en' | 'ta' | 'auto';
}): Promise<string> {
  const { churchName, query, tasks, language = 'auto' } = params;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

  if (!apiKey) {
    return `Absence data for ${churchName}: Currently tracking ${tasks.length} total tasks. (${tasks.filter(t => t.status === 'awaiting_approval').length} awaiting approval, ${tasks.filter(t => t.status === 'sent').length} sent, ${tasks.filter(t => t.status === 'resolved_by_attendance').length} returned to attendance).`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const tasksData = tasks.map(t => ({
      member: t.memberName,
      rule: t.ruleCode,
      daysInactive: t.daysSinceLastAttendance,
      lastAttendance: t.lastAttendanceDate,
      status: t.status,
      channel: t.channel
    }));

    const prompt = `You are a church administration assistant answering a pastor/leader's question about attendance absence patterns for ${churchName}.

User Question: "${query}"

Dataset Context (Absence Tasks):
${JSON.stringify(tasksData, null, 2)}

CRITICAL INSTRUCTIONS:
- Ground your answer strictly on the provided factual data.
- Never use judgmental terms like "uncommitted", "backsliding", "spiritually weak", or "unfaithful".
- Reply in ${language === 'ta' ? 'Tamil (Tamil script)' : 'English'}.
- Be helpful, clear, and concise.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text?.trim() || 'No answer generated.';
  } catch (e) {
    console.error('Error answering absence query:', e);
    return 'Unable to process AI query at this time.';
  }
}
