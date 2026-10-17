export interface DailyVerseRecord {
  id: string; // Typically YYYY-MM-DD
  church_id: string; // 'global' or tenant ID
  date: string; // YYYY-MM-DD format
  book: string;
  chapter: number;
  verseRange: string;
  reference: string; // e.g. "Philippians 4:6-7"
  tamilReference: string; // e.g. "பிலிப்பியர் 4:6-7"
  text: string; // English verse text
  tamilText: string; // Tamil BSI verse text
  translation: string; // e.g. "WEB (Public Domain) & BSI Tamil"
  reflection: string; // Short devotional thought (English)
  tamilReflection: string; // Short devotional thought (Tamil)
  prayerPrompt?: string; // Optional short prayer prompt (English)
  tamilPrayerPrompt?: string; // Optional short prayer prompt (Tamil)
  fullPassageText?: string; // Surrounding contextual passage (English)
  tamilFullPassageText?: string; // Surrounding contextual passage (Tamil)
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedVerseRecord {
  id: string;
  church_id: string;
  userId: string;
  verseId: string;
  reference: string;
  tamilReference?: string;
  text: string;
  tamilText?: string;
  translation?: string;
  dateSaved: string;
  notes?: string;
}

export interface AiBibleMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  scriptureReferences?: string[];
  tamilText?: string;
  isError?: boolean;
}

export interface AiBibleConversation {
  id: string;
  userId: string;
  churchId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiBibleMessage[];
}

export interface AiBibleQueryOptions {
  prompt: string;
  churchId: string;
  userId?: string;
  userName?: string;
  preferredLanguage?: 'en' | 'ta' | 'auto';
  conversationHistory?: AiBibleMessage[];
}
