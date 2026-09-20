import { GoogleGenAI } from '@google/genai';
import { SmartNotificationCategory } from './smartNotificationService';

export async function generateSmartNotificationText(params: {
  churchName: string;
  category: SmartNotificationCategory;
  eventType: string;
  recipientName: string;
  detailsText: string;
  language?: 'en' | 'ta' | 'auto';
}): Promise<{ title: string; message: string }> {
  const { churchName, category, eventType, recipientName, detailsText, language = 'auto' } = params;
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

  const cleanName = recipientName ? recipientName.split(' ')[0] : 'Member';

  // Neutral Fallbacks in English and Tamil
  let fallbackTitle = `Church Notification - ${churchName}`;
  let fallbackMsg = `Hello ${cleanName}, you have an update regarding ${eventType}: ${detailsText}`;

  if (category === 'events') {
    fallbackTitle = `📅 Event Update - ${churchName}`;
    fallbackMsg = `Hello ${cleanName}, reminder regarding upcoming church event: ${detailsText}`;
  } else if (category === 'ministry') {
    fallbackTitle = `🤝 Ministry Assignment - ${churchName}`;
    fallbackMsg = `Hello ${cleanName}, your ministry assignment update: ${detailsText}`;
  } else if (category === 'prayer') {
    fallbackTitle = `🙏 Prayer Update - ${churchName}`;
    fallbackMsg = `Hello ${cleanName}, prayer request update: ${detailsText}`;
  }

  if (language === 'ta') {
    fallbackTitle = `🔔 திருச்சபை அறிவிப்பு - ${churchName}`;
    fallbackMsg = `வணக்கம் ${cleanName}, ${eventType} குறித்த தகவல்: ${detailsText}`;
  }

  if (!apiKey) {
    return { title: fallbackTitle, message: fallbackMsg };
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an administrative smart notification helper for ${churchName}.
Write a concise, warm, non-judgmental push notification title and message for recipient "${cleanName}".

Details:
- Category: ${category}
- Event Type: ${eventType}
- Context Details: ${detailsText}
- Language Required: ${language === 'ta' ? 'Tamil (Tamil script)' : language === 'en' ? 'English' : 'English'}

CRITICAL RULES:
- NEVER use judgmental or assumption-based terms ("uncommitted", "spiritually weak", "backsliding", "lazy").
- Title under 6 words.
- Message under 25 words.
- Respect member privacy.
- Format output as JSON: { "title": "...", "message": "..." }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.title && parsed.message) {
        return { title: parsed.title, message: parsed.message };
      }
    }
  } catch (e) {
    console.warn('AI notification text generation failed, using standard fallback:', e);
  }

  return { title: fallbackTitle, message: fallbackMsg };
}
