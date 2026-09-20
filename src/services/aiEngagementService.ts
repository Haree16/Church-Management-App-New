import { GoogleGenAI } from '@google/genai';
import { MemberEngagementData, MemberActivityRow } from './memberEngagementService';
import { auditService } from './auditService';

export interface AiEngagementResponse {
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
 * 1. Generate Executive AI Summary based ONLY on calculated aggregate metrics
 */
export async function generateAiEngagementSummary(
  engagementData: MemberEngagementData
): Promise<AiEngagementResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const now = new Date().toISOString();
  const metrics = engagementData.metrics;
  const rangeText = engagementData.dateRange.formattedRangeText;
  const comp = engagementData.comparison;

  const promptText = `
Given the following aggregated member activity metrics for ${rangeText}:
- Total Members Evaluated: ${metrics.totalMembers}
- Members With Recent Recorded Activity: ${metrics.membersWithRecentActivity} (${metrics.participationRatePercentage}%)
- Members With No Recent Recorded Activity: ${metrics.membersWithNoRecentActivity}
- Members With Recorded Attendance: ${metrics.attendanceParticipants}
- Ministry Activity Participants: ${metrics.ministryParticipants}
- Event Participants: ${metrics.eventParticipants}
- Sunday School Participants: ${metrics.sundaySchoolParticipants}
- Duty Roster Assignment Participants: ${metrics.assignmentParticipants}
- Period Comparison: ${comp.factualComparisonText}

Provide a concise, factual 2-3 sentence executive summary for church leadership.
STRICT RULES:
1. Only use the exact calculated numbers above.
2. NEVER use judgmental terms like "uncommitted", "backsliding", "spiritually weak", or "bad attendance".
3. State neutrally that these insights are based strictly on recorded application participation.
`;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are the AI Member Engagement Analyst for Antigravity Church Management System. Provide strictly objective, factual summaries based ONLY on calculated application activity logs. Never make subjective judgments or assume reasons for absence.`;

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
        action: 'ai.engagement_summary_generated',
        resource_type: 'member_engagement_insights',
        details: { dateRange: rangeText, model: 'gemini-2.5-flash' },
      });

      return {
        answer,
        generatedAt: now,
        source: 'gemini',
      };
    } catch (err) {
      console.warn('[AiEngagementService] Gemini API call failed, using fallback synthesizer:', err);
    }
  }

  // Fallback Rule Synthesizer
  const fallbackAnswer = `During ${rangeText}, ${metrics.membersWithRecentActivity} of ${metrics.totalMembers} members (${metrics.participationRatePercentage}%) had at least one recorded activity in the application. ${metrics.attendanceParticipants} members had recorded attendance, ${metrics.ministryParticipants} participated in ministries, and ${metrics.eventParticipants} participated in events. ${comp.previousEngagedCount > 0 ? comp.factualComparisonText : ''}`.trim();

  return {
    answer: fallbackAnswer,
    generatedAt: now,
    source: 'local_synthesizer',
  };
}

/**
 * 2. Answer Natural Language Questions About Member Activity
 */
export async function answerEngagementQuestion(params: {
  questionText: string;
  engagementData: MemberEngagementData;
  userName?: string;
}): Promise<AiEngagementResponse> {
  const { questionText, engagementData, userName = 'Leader' } = params;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  const now = new Date().toISOString();
  const isTa = isTamilText(questionText);

  const metrics = engagementData.metrics;
  const rangeText = engagementData.dateRange.formattedRangeText;
  const comp = engagementData.comparison;
  const qLower = questionText.toLowerCase();

  // Aggregate Data Payload sent to AI (No raw full PII database arrays)
  const contextPayload = {
    dateRange: rangeText,
    summaryMetrics: engagementData.metrics,
    periodComparison: engagementData.comparison,
    ministryStats: engagementData.ministryStats,
    factualBullets: engagementData.factualInsightsBullets,
    // Minimal unengaged sample names only if asked specifically, preserving privacy
    sampleUnengagedNamesCount: engagementData.membersWithoutActivity.length,
    sampleUnengagedNamesList: qLower.includes('who') || qLower.includes('names') || qLower.includes('யார்')
      ? engagementData.membersWithoutActivity.slice(0, 10).map(m => m.memberName)
      : undefined
  };

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const systemInstruction = `You are the AI Engagement Analyst for church leaders in Antigravity CMS.
Answer questions based ONLY on the provided calculated aggregate metrics context payload.
RULES:
1. Always state factual participation numbers directly.
2. NEVER use judgmental words like "uncommitted", "spiritually weak", "backsliding", or "bad attendance".
3. If asked in Tamil or mixed Tamil-English (e.g., "இந்த மாதம் எத்தனை உறுப்பினர்கள் activity செய்துள்ளனர்?"), respond naturally in Tamil script. Always preserve member names in original Latin/Tamil script as provided.
4. If data is not present in the payload, politely reply: "I do not have recorded activity data available for that query."`;

      const prompt = `User (${userName}) asks: "${questionText}"\n\nCalculated Activity Context Payload:\n${JSON.stringify(contextPayload, null, 2)}`;

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
        action: 'ai.engagement_question_answered',
        resource_type: 'member_engagement_insights',
        details: { question: questionText, isTamil: isTa, model: 'gemini-2.5-flash' },
      });

      return {
        answer,
        isTamil: isTa,
        generatedAt: now,
        source: 'gemini',
      };
    } catch (err) {
      console.warn('[AiEngagementService] Gemini API call failed, using fallback synthesizer:', err);
    }
  }

  // Fallback Rule Synthesizer (Tamil & English)
  let answer = '';

  if (isTa) {
    if (qLower.includes('எத்தனை') || qLower.includes('how many')) {
      if (qLower.includes('attendance') || qLower.includes('ஆராதனை')) {
        answer = `${rangeText} காலகட்டத்தில் ${metrics.attendanceParticipants} உறுப்பினர்கள் ஆராதனையில் கலந்து கொண்டுள்ளனர்.`;
      } else if (qLower.includes('ministry') || qLower.includes('ஊழியம்')) {
        answer = `${rangeText} காலகட்டத்தில் ${metrics.ministryParticipants} உறுப்பினர்கள் ஊழிய நிகழ்வுகளில் கலந்து கொண்டுள்ளனர்.`;
      } else {
        answer = `${rangeText} காலகட்டத்தில் மொத்தம் உள்ள ${metrics.totalMembers} உறுப்பினர்களில் ${metrics.membersWithRecentActivity} உறுப்பினர்கள் ஏதேனும் ஒரு church activity பதிவு செய்துள்ளனர் (${metrics.participationRatePercentage}%).`;
      }
    } else if (qLower.includes('பதிவு இல்லாதவர்கள்') || qLower.includes('no activity')) {
      const sampleNames = engagementData.membersWithoutActivity.slice(0, 5).map(m => m.memberName).join(', ');
      answer = `கடந்த ${rangeText}-ல் ${metrics.membersWithNoRecentActivity} உறுப்பினர்களுக்கு பதிவு செய்யப்பட்ட செயல்பாடு இல்லை. (உதாரணம்: ${sampleNames || 'எதுவுமில்லை'}).`;
    } else if (qLower.includes('ஒப்பிடு') || qLower.includes('compare')) {
      answer = comp.factualComparisonText;
    } else {
      answer = `${rangeText} காலகட்டத்தில் ${metrics.membersWithRecentActivity} உறுப்பினர்கள் பதிவு செய்துள்ளனர். ஆராதனை: ${metrics.attendanceParticipants}, ஊழியம்: ${metrics.ministryParticipants}, நிகழ்வுகள்: ${metrics.eventParticipants}.`;
    }
  } else {
    if (qLower.includes('no activity') || qLower.includes('no recent') || qLower.includes('without activity')) {
      const sampleNames = engagementData.membersWithoutActivity.slice(0, 5).map(m => m.memberName).join(', ');
      answer = `During ${rangeText}, ${metrics.membersWithNoRecentActivity} members had no recorded activity in the application. ${sampleNames ? `Examples include: ${sampleNames}.` : ''}`;
    } else if (qLower.includes('compare') || qLower.includes('previous') || qLower.includes('last month')) {
      answer = comp.factualComparisonText;
    } else if (qLower.includes('attendance')) {
      answer = `During ${rangeText}, ${metrics.attendanceParticipants} of ${metrics.totalMembers} members had at least one recorded church attendance session.`;
    } else if (qLower.includes('ministry')) {
      const topMin = engagementData.ministryStats[0];
      answer = topMin 
        ? `${metrics.ministryParticipants} members participated in ministry activities. For ${topMin.ministryName}: ${topMin.membersWithRecentActivity} of ${topMin.totalMembers} members had recorded activity (${topMin.activityRatePercentage}%).`
        : `${metrics.ministryParticipants} members participated in ministry activities.`;
    } else {
      answer = `During ${rangeText}, ${metrics.membersWithRecentActivity} of ${metrics.totalMembers} members (${metrics.participationRatePercentage}%) had recorded activity in the app. Attendance: ${metrics.attendanceParticipants}, Ministry: ${metrics.ministryParticipants}, Events: ${metrics.eventParticipants}.`;
    }
  }

  return {
    answer,
    isTamil: isTa,
    generatedAt: now,
    source: 'local_synthesizer',
  };
}
