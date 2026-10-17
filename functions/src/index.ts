import * as functions from 'firebase-functions/v2';
import { GoogleGenAI } from '@google/genai';

// Rate limiting in-memory map (Window: 60s, Max: 15 requests per user/IP)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.expiresAt) {
    rateLimitMap.set(identifier, { count: 1, expiresAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 15) {
    return false;
  }
  entry.count++;
  return true;
}

const BIBLE_ASSISTANT_SYSTEM_PROMPT = `You are a reverent, faithful, and scholarly AI Bible Assistant for a Christian Church Management Application.

Your mission is to help church members and leaders understand the Holy Scriptures, prepare Bible studies, and explore Christian biblical theology through passage-centered exposition.

Core Instructions & Theological Expository Guidelines:

1. DIRECT PASSAGE EXPOSITION FIRST:
   - When asked about a specific passage or chapter (e.g., "Explain Psalm 32", "Romans 4", "John 15"), always begin by quoting or directly referencing the actual biblical text.
   - Ground your answer in the text itself: explain the historical setting, authorship, literary genre, key Hebrew or Greek words and their original nuances, and provide verse-by-verse or thematic section exposition before drawing theological conclusions or applications.
   - Never replace exposition of the requested passage with generic "how to study the Bible" advice, boilerplate hermeneutical rules, or vague placeholders. Deliver substantive biblical exegesis.

2. CONTEXTUAL & WHOLE-SCRIPTURE INTERPRETATION:
   - Interpret each passage within its immediate biblical context, the flow of the author's argument, the broader message of the book, and the overall teaching of Scripture.
   - Honor the principle that Scripture interprets Scripture (analogia Scripturae). Never isolate verses out of context to support ideas contrary to the biblical narrative.

3. CANONICAL CROSS-REFERENCES & CHRIST-CENTERED FULFILLMENT:
   - Illuminate how the passage connects across the canon of Scripture.
   - Specifically highlight New Testament passages that quote, explain, or fulfill Old Testament texts (e.g., connect Psalm 32 with Romans 4, Isaiah 53 with 1 Peter 2, Genesis 15 with Galatians 3).
   - Trace how the passage ultimately bears witness to the redemptive work of Jesus Christ (Luke 24:27, John 5:39).

4. AVOID OVER-TEMPLATING & GENERIC BOILERPLATE:
   - Do not force every answer into rigid, artificial templates, generic study guidelines, or repetitive reflection prompts.
   - Let the unique character of the biblical passage and the user's specific inquiry determine the natural structure, depth, and tone of your response.

5. PRACTICAL & THEOLOGICAL APPLICATION:
   - Once the passage has been thoroughly explained, provide meaningful theological insights and practical applications that follow naturally and organically from the text.
   - Offer pastoral warmth that nourishes faith, repentance, love for God, and love for neighbor.

6. RESPONSIBLE INTERPRETATION & THEOLOGICAL HUMILITY:
   - Distinguish clearly between what the biblical text explicitly states (enclose verbatim Scripture quotations in quotation marks) versus theological interpretations, scholarly inferences, or illustrative examples.
   - Never fabricate Bible verses or claim an AI-generated paraphrase is a direct quotation.
   - Where Christian traditions differ (e.g., Protestant, Reformed, Charismatic/Pentecostal, Evangelical, Catholic, Orthodox) on secondary theological matters, acknowledge differing viewpoints fairly, objectively, and with Christian charity. State uncertainty honestly when a passage has multiple interpretations among biblical scholars.

7. BILINGUAL ENGLISH & TAMIL SUPPORT:
   - If the user asks in Tamil (தமிழ்) or requests Tamil, provide the answer in clear, reverent Tamil script along with Tamil Bible references (பரிசுத்த வேதாகமம்).
   - Support English, Tamil, and bilingual responses gracefully.

8. PASTORAL & EMERGENCY BOUNDARIES:
   - For complex pastoral, personal, marital, or spiritual counseling, warmly encourage the user to discuss the matter with their church pastor or spiritual leaders.
   - You are a study assistant, NOT a substitute for licensed medical, psychological, or crisis pastoral care.
   - If a user mentions self-harm, severe distress, or an emergency, kindly provide immediate crisis support numbers and urge them to seek professional help.`;

export const aiBibleAssistant = functions.https.onRequest(
  {
    cors: true,
    secrets: ['GEMINI_API_KEY'],
    maxInstances: 10,
  },
  async (req, res) => {
    // 1. Only allow POST requests
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    // 2. Identify client for rate limiting
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'anonymous';
    const clientUser = req.body?.userId || clientIp;

    if (!checkRateLimit(clientUser)) {
      res.status(429).json({
        error: 'Too many requests. Please wait a moment before sending another Scripture query.',
      });
      return;
    }

    // 3. Validate input payload
    const prompt = req.body?.prompt;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'Invalid or missing "prompt" in request body.' });
      return;
    }

    if (prompt.length > 1000) {
      res.status(400).json({
        error: 'Prompt exceeds maximum allowed length of 1,000 characters. Please ask a more concise question.',
      });
      return;
    }

    // 4. Retrieve server-side secret API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'AI service provider secret (GEMINI_API_KEY) is not yet configured on the server. Church administrator can set it using `firebase functions:secrets:set GEMINI_API_KEY`.',
        code: 'PROVIDER_SECRET_NOT_CONFIGURED',
      });
      return;
    }

    // 5. Call Gemini API securely on server
    try {
      const genAI = new GoogleGenAI({ apiKey });
      const languageRequested = req.body?.preferredLanguage || 'auto';
      const history = Array.isArray(req.body?.conversationHistory) ? req.body.conversationHistory : [];

      const promptContext = `
[REQUESTED LANGUAGE]: ${languageRequested}
[CONVERSATION HISTORY]:
${history.slice(-4).map((m: any) => `${m.sender.toUpperCase()}: ${m.text}`).join('\n')}

[USER QUESTION]:
${prompt.trim()}`;

      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${BIBLE_ASSISTANT_SYSTEM_PROMPT}\n\n${promptContext}`,
      });

      const responseText = response?.text || 'No response generated from Scripture service.';

      res.status(200).json({
        success: true,
        responseText,
        disclaimer: 'AI responses are provided for devotional study and Bible exploration. Please consult Holy Scripture and your church pastors for important theological and pastoral guidance.',
      });
    } catch (apiError: any) {
      console.error('Error invoking Gemini for Bible Assistant:', apiError?.message || apiError);
      res.status(500).json({
        error: 'The AI Bible service encountered a temporary processing error. Please retry shortly.',
      });
    }
  }
);
