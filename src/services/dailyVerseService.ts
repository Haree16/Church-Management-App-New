import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DailyVerseRecord, SavedVerseRecord } from '../types/bible';
import { getDeterministicDailyVerse } from '../data/dailyVersesData';

const DAILY_VERSES_COL = 'daily_verses';
const SAVED_VERSES_COL = 'member_saved_verses';

const LOCAL_STORAGE_PREFIX = 'cms_daily_verse_';
const LOCAL_SAVED_VERSES_KEY = 'cms_saved_verses_list';

/**
 * Computes calendar date string YYYY-MM-DD for the given timezone
 */
export function getDateStringForTimezone(timezone: string = 'Asia/Kolkata', targetDate: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(targetDate);
  } catch (e) {
    // Fallback if timezone string is invalid
    return targetDate.toISOString().split('T')[0];
  }
}

function getCachedVerse(dateStr: string): DailyVerseRecord | null {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${dateStr}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore storage parse errors
  }
  return null;
}

function setCachedVerse(dateStr: string, verse: DailyVerseRecord): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${dateStr}`, JSON.stringify(verse));
  } catch {
    // Ignore quota errors
  }
}

function getCachedSavedVerses(userId: string): SavedVerseRecord[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_SAVED_VERSES_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore storage parse errors
  }
  return [];
}

function setCachedSavedVerses(userId: string, list: SavedVerseRecord[]): void {
  try {
    localStorage.setItem(`${LOCAL_SAVED_VERSES_KEY}_${userId}`, JSON.stringify(list));
  } catch {
    // Ignore quota errors
  }
}

export const dailyVerseService = {
  /**
   * Retrieves today's verse for the church and timezone.
   * Resilient against network failure, Firestore errors, and offline modes.
   */
  async getTodaysVerse(
    churchId: string, 
    timezone: string = 'Asia/Kolkata',
    specificDateStr?: string
  ): Promise<DailyVerseRecord> {
    const dateStr = specificDateStr || getDateStringForTimezone(timezone);

    // 1. Try local cache first for fast display
    const cached = getCachedVerse(dateStr);

    try {
      // 2. Check church-specific scheduled verse in Firestore
      const churchDocRef = doc(db, DAILY_VERSES_COL, `${churchId}_${dateStr}`);
      const churchSnap = await getDoc(churchDocRef).catch(() => null);

      if (churchSnap && churchSnap.exists()) {
        const data = churchSnap.data() as DailyVerseRecord;
        if (data.isPublished !== false) {
          setCachedVerse(dateStr, data);
          return data;
        }
      }

      // 3. Check global date scheduled verse in Firestore
      const globalDocRef = doc(db, DAILY_VERSES_COL, dateStr);
      const globalSnap = await getDoc(globalDocRef).catch(() => null);

      if (globalSnap && globalSnap.exists()) {
        const data = globalSnap.data() as DailyVerseRecord;
        if (data.isPublished !== false) {
          setCachedVerse(dateStr, data);
          return data;
        }
      }
    } catch (firestoreError) {
      console.warn('dailyVerseService: Firestore query failed, falling back to cache/curated', firestoreError);
    }

    // 4. Return cached record if available
    if (cached) {
      return cached;
    }

    // 5. Deterministic fallback so a consistent, inspiring verse always displays
    const fallbackVerse = getDeterministicDailyVerse(dateStr);
    setCachedVerse(dateStr, fallbackVerse);
    return fallbackVerse;
  },

  /**
   * Admin: Save or update a daily scripture record in Firestore
   */
  async saveDailyVerse(verse: DailyVerseRecord): Promise<void> {
    const docId = verse.church_id && verse.church_id !== 'global'
      ? `${verse.church_id}_${verse.date}`
      : verse.date;

    const recordToSave: DailyVerseRecord = {
      ...verse,
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, DAILY_VERSES_COL, docId);
      await setDoc(docRef, recordToSave);
      setCachedVerse(verse.date, recordToSave);
    } catch (err) {
      console.warn('Failed to save verse to Firestore, saving to local cache:', err);
      setCachedVerse(verse.date, recordToSave);
    }
  },

  /**
   * Bookmark a verse for a member
   */
  async bookmarkVerse(churchId: string, userId: string, verse: DailyVerseRecord, notes?: string): Promise<SavedVerseRecord> {
    const savedRecord: SavedVerseRecord = {
      id: `saved_${userId}_${verse.id}`,
      church_id: churchId,
      userId,
      verseId: verse.id,
      reference: verse.reference,
      tamilReference: verse.tamilReference,
      text: verse.text,
      tamilText: verse.tamilText,
      translation: verse.translation,
      dateSaved: new Date().toISOString(),
      notes: notes || ''
    };

    // Update local cache optimistically
    const existing = getCachedSavedVerses(userId);
    const updated = [savedRecord, ...existing.filter(item => item.verseId !== verse.id)];
    setCachedSavedVerses(userId, updated);

    // Save to Firestore
    try {
      const docRef = doc(db, SAVED_VERSES_COL, savedRecord.id);
      await setDoc(docRef, savedRecord);
    } catch (err) {
      console.warn('Could not persist bookmark to Firestore, kept locally:', err);
    }

    return savedRecord;
  },

  /**
   * Remove a bookmark for a member
   */
  async unbookmarkVerse(userId: string, verseId: string): Promise<void> {
    const existing = getCachedSavedVerses(userId);
    const updated = existing.filter(item => item.verseId !== verseId);
    setCachedSavedVerses(userId, updated);

    try {
      const docId = `saved_${userId}_${verseId}`;
      const docRef = doc(db, SAVED_VERSES_COL, docId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Could not delete bookmark from Firestore, removed locally:', err);
    }
  },

  /**
   * Check if a verse is bookmarked by a user
   */
  isVerseBookmarked(userId: string, verseId: string): boolean {
    if (!userId) return false;
    const existing = getCachedSavedVerses(userId);
    return existing.some(item => item.verseId === verseId);
  },

  /**
   * Fetch all saved verses for a member
   */
  async getSavedVerses(churchId: string, userId: string): Promise<SavedVerseRecord[]> {
    if (!userId) return [];
    const local = getCachedSavedVerses(userId);

    try {
      const q = query(
        collection(db, SAVED_VERSES_COL),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const remote = snapshot.docs.map(d => d.data() as SavedVerseRecord);
        setCachedSavedVerses(userId, remote);
        return remote;
      }
    } catch (err) {
      // Offline fallback
    }

    return local;
  }
};
