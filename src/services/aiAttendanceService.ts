import { GoogleGenAI } from '@google/genai';
import { AttendanceInsightsData, MemberAttendanceLookupResult } from './attendanceInsightsService';
import { auditService } from './auditService';

export interface AiAttendanceResponse {
  answer: string;
  isTamil?: boolean;
  generatedAt: string;
  source: 'gemini' | 'local_synthesizer';
}

const isTamilText = (text: string): boolean => {
  const tamilRegex = /[\u0B80-\u0BFF]/;
  return tamilRegex.test(text);
};

/**
 * 1. Generate AI Summary of Calculated Attendance Metrics
 */
export async function generateAiAttendanceSummary(
  insightsData: AttendanceInsightsData,
  languagePreference: 'en' | 'ta' | 'auto' = 'auto'
): Promise<AiAttendanceResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const now = new Date().toISOString();
  const metrics = insightsData.metrics;
  const rangeText = insightsData.dateRange.formattedRangeText;
  const comp = insightsData.comparison;

  const promptText = `
Given the following aggregated church attendance metrics for ${rangeText}:
- Total Services Logged: ${metrics.totalServices}
- Total Headcount: ${metrics.totalHeadcount}
- Average Attendance per Service: ${metrics.averageAttendance}
- Highest Single Service Attendance: ${metrics.highestRecord ? `${metrics.highestRecord.count} on ${metrics.highestRecord.date} (${metrics.highestRecord.serviceName})` : 'N/A'}
- Lowest Single Service Attendance: ${metrics.lowestRecord ? `${metrics.lowestRecord.count} on ${metrics.lowestRecord.date} (${metrics.lowestRecord.serviceName})` : 'N/A'}
- Sunday School Average: ${metrics.sundaySchoolAvg}
- Ministry Activity Average: ${metrics.ministryAttendanceAvg}
- Events Average: ${metrics.eventsAvg}
- Comparison vs Previous Period: ${comp.factualComparisonText}

Provide a concise, factual 2-3 sentence executive summary for church leadership.
STRICT RULE: Only use the exact numbers provided above. Do not invent or estimate numbers or make subjective judgments about members.
`;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are the AI Church Attendance Analyst for Google Antigravity Church Management System. Provide strictly factual, objective summaries based ONLY on calculated numerical attendance data. Never judge commitment or make unsupported assumptions. Respond in clear English unless requested in Tamil.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 300,
        },
      });

      const answer = response.text?.trim() || 'Summary unavailable.';

      auditService.logAction('church-1', {
        action: 'ai.attendance_summary_generated',
        resource_type: 'attendance_insights',
        details: { dateRange: rangeText, model: 'gemini-2.5-flash' },
      });

      return {
        answer,
        generatedAt: now,
        source: 'gemini',
      };
    } catch (err) {
      console.warn('[AiAttendanceService] Gemini API call failed, using fallback synthesizer:', err);
    }
  }

  // Fallback Local Synthesizer
  const fallbackAnswer = metrics.totalServices > 0
    ? `During ${rangeText}, the church recorded ${metrics.totalServices} service session(s) with an average attendance of ${metrics.averageAttendance} attendees. ${metrics.highestRecord ? `The highest recorded attendance was ${metrics.highestRecord.count} on ${metrics.highestRecord.date}.` : ''} ${comp.previousAvg > 0 ? comp.factualComparisonText : ''}`
    : `No attendance records are available for the selected period (${rangeText}).`;

  return {
    answer: fallbackAnswer.trim(),
    generatedAt: now,
    source: 'local_synthesizer',
  };
}

/**
 * 2. Answer Authorized Natural Language Questions About Attendance
 */
export async function answerAttendanceQuestion(params: {
  questionText: string;
  insightsData: AttendanceInsightsData;
  memberLookupResult?: MemberAttendanceLookupResult | null;
  userName?: string;
}): Promise<AiAttendanceResponse> {
  const { questionText, insightsData, memberLookupResult, userName = 'Leader' } = params;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const now = new Date().toISOString();
  const isTa = isTamilText(questionText);

  const metrics = insightsData.metrics;
  const rangeText = insightsData.dateRange.formattedRangeText;
  const comp = insightsData.comparison;
  const qLower = questionText.toLowerCase();

  const contextPayload = {
    dateRange: rangeText,
    metrics: insightsData.metrics,
    comparison: insightsData.comparison,
    ministryStats: insightsData.ministryStats,
    sundaySchoolStats: insightsData.sundaySchoolStats,
    factualBullets: insightsData.factualInsightsText,
    memberLookup: memberLookupResult ? {
      name: `${memberLookupResult.member.firstName} ${memberLookupResult.member.lastName}`,
      attendedCount: memberLookupResult.attendedCount,
      totalServices: memberLookupResult.totalServicesLogged,
      turnoutRate: memberLookupResult.turnoutPercentage
    } : null
  };

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are the AI Attendance Assistant for authorized church leaders in the Antigravity Church Management System.
Answer questions based ONLY on the provided calculated attendance context payload.
RULES:
1. Always state factual metrics directly (e.g. Average: 54, Highest: 61 on Sep 20).
2. Never make subjective judgments like "members are uncommitted" or "attendance is poor".
3. If asked in Tamil or mixed Tamil-English (e.g., "ஆராதனை வருகை"), respond naturally in Tamil script.
4. If asked about a ministry or Sunday School, quote exact statistics from the payload.
5. If data for the question is not present in the payload, politely reply: "I do not have attendance records available for that query."`;

      const prompt = `User (${userName}) asks: "${questionText}"\n\nCalculated Attendance Context Payload:\n${JSON.stringify(contextPayload, null, 2)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          maxOutputTokens: 400,
        },
      });

      const answer = response.text?.trim() || (isTa ? 'மன்னிக்கவும், தகவல் பெறப்படவில்லை.' : 'Could not generate AI answer.');

      auditService.logAction('church-1', {
        action: 'ai.attendance_question_answered',
        resource_type: 'attendance_insights',
        details: { question: questionText, isTamil: isTa, model: 'gemini-2.5-flash' },
      });

      return {
        answer,
        isTamil: isTa,
        generatedAt: now,
        source: 'gemini',
      };
    } catch (err) {
      console.warn('[AiAttendanceService] Gemini API call failed, using fallback synthesizer:', err);
    }
  }

  // Fallback Rule Synthesizer (Tamil & English)
  let answer = '';

  if (isTa) {
    if (qLower.includes('உயர்') || qLower.includes('அதிக') || qLower.includes('highest')) {
      answer = metrics.highestRecord 
        ? `${rangeText}-ல் அதிகபட்ச வருகை ${metrics.highestRecord.date} அன்று ${metrics.highestRecord.count} பேர் ஆகும் (${metrics.highestRecord.serviceName}).`
        : `${rangeText}-ல் வருகை பதிவுகள் எதுவும் இல்லை.`;
    } else if (qLower.includes('ஒப்பிடு') || qLower.includes('compare')) {
      answer = comp.factualComparisonText !== 'Access denied.'
        ? `${comp.factualComparisonText} (தற்போதைய சராசரி: ${comp.currentAvg}, முந்தைய சராசரி: ${comp.previousAvg}).`
        : `ஒப்பிடுவதற்கு முந்தைய தரவு இல்லை.`;
    } else if (qLower.includes('சண்டே ஸ்கூல்') || qLower.includes('sunday school')) {
      answer = `சண்டே ஸ்கூல் சராசரி வருகை: ${metrics.sundaySchoolAvg} மாணவர்கள். வகுப்புகள் எண்ணிக்கை: ${insightsData.sundaySchoolStats.length}.`;
    } else {
      answer = `${rangeText} காலகட்டத்தில் ${metrics.totalServices} ஆராதனைகள் பதிவு செய்யப்பட்டுள்ளன. சராசரி வருகை: ${metrics.averageAttendance} பேர். அதிகபட்சம்: ${metrics.highestRecord?.count || 0}.`;
    }
  } else {
    if (qLower.includes('highest') || qLower.includes('max') || qLower.includes('peak')) {
      answer = metrics.highestRecord
        ? `The highest recorded attendance for ${rangeText} was ${metrics.highestRecord.count} attendees on ${metrics.highestRecord.date} during "${metrics.highestRecord.serviceName}".`
        : `No attendance records found for ${rangeText}.`;
    } else if (qLower.includes('compare') || qLower.includes('previous') || qLower.includes('last month')) {
      answer = comp.factualComparisonText;
    } else if (qLower.includes('sunday school') || qLower.includes('children')) {
      answer = `Sunday School average attendance is ${metrics.sundaySchoolAvg} students across ${insightsData.sundaySchoolStats.length} configured class(es).`;
    } else if (qLower.includes('ministry') || qLower.includes('department')) {
      const topMin = insightsData.ministryStats[0];
      answer = topMin 
        ? `Ministry attendance across ${insightsData.ministryStats.length} ministry/ministries. For ${topMin.ministryName}: average attendance is ${topMin.averageAttendance} members (${topMin.attendanceRate}% turnout).`
        : `No ministry activity attendance logged for this period.`;
    } else {
      answer = `During ${rangeText}, average attendance was ${metrics.averageAttendance} attendees across ${metrics.totalServices} logged service(s). Highest: ${metrics.highestRecord?.count || 0}, Lowest: ${metrics.lowestRecord?.count || 0}.`;
    }
  }

  return {
    answer,
    isTamil: isTa,
    generatedAt: now,
    source: 'local_synthesizer',
  };
}
