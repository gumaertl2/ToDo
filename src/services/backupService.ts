// [2026-10-24] - FEATURE: 'arcade_scores' und 'settings' in BACKUP_COLLECTIONS aufgenommen, damit auch Pausen-Spiele-Rekorde und Turniertitel im 1-Klick-Backup gesichert werden.
// [2026-10-15] - FEATURE: Zentraler Backup & Restore Service für alle Firestore-Collections erstellt (inkl. Chunked Batch-Writes, Wipe-Modus für Test-DB und 12:00-Uhr-Reminder-Tracking).
// src/services/backupService.ts
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const BACKUP_COLLECTIONS = [
  'users',
  'helpers',
  'groups',
  'teams',
  'role_profiles',
  'events',
  'calendar_events',
  'calendar_subscriptions',
  'match_lineups',
  'event_poll_responses',
  'agenda_items',
  'team_pins',
  'arcade_scores',
  'settings'
] as const;

export type BackupCollectionName = typeof BACKUP_COLLECTIONS[number];

export interface BackupMetadata {
  version: string;
  exportedAt: string;
  exportedTimestamp: number;
  projectId: string;
  exportedBy?: string;
  counts: Record<string, number>;
}

export interface BackupPayload {
  meta: BackupMetadata;
  collections: Record<string, Record<string, any>[]>;
}

const LAST_BACKUP_DATE_KEY = 'papatodo_last_backup_date';
const LAST_BACKUP_TIMESTAMP_KEY = 'papatodo_last_backup_ts';
const DISMISSED_REMINDER_DATE_KEY = 'papatodo_backup_dismissed_date';

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const markBackupDoneToday = (): void => {
  try {
    const todayStr = getTodayDateString();
    localStorage.setItem(LAST_BACKUP_DATE_KEY, todayStr);
    localStorage.setItem(LAST_BACKUP_TIMESTAMP_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
};

export const dismissBackupReminderToday = (): void => {
  try {
    localStorage.setItem(DISMISSED_REMINDER_DATE_KEY, getTodayDateString());
  } catch {
    // Ignore storage errors
  }
};

export const getLastBackupInfo = (): { dateStr: string | null; timestamp: number | null } => {
  try {
    const dateStr = localStorage.getItem(LAST_BACKUP_DATE_KEY);
    const tsRaw = localStorage.getItem(LAST_BACKUP_TIMESTAMP_KEY);
    return {
      dateStr,
      timestamp: tsRaw ? Number(tsRaw) : null
    };
  } catch {
    return { dateStr: null, timestamp: null };
  }
};

export const shouldShowBackupReminder = (userReceiveFlag?: boolean): boolean => {
  if (!userReceiveFlag) return false;
  const now = new Date();
  // Erst ab 12:00 Uhr mittags erinnern
  if (now.getHours() < 12) return false;

  const todayStr = getTodayDateString();
  try {
    const lastBackupDate = localStorage.getItem(LAST_BACKUP_DATE_KEY);
    if (lastBackupDate === todayStr) return false;

    const dismissedDate = localStorage.getItem(DISMISSED_REMINDER_DATE_KEY);
    if (dismissedDate === todayStr) return false;

    return true;
  } catch {
    return false;
  }
};

/**
 * Liest alle registrierten Collections direkt und ungefiltert aus Firestore aus
 * und löst den Browser-Download als .json Datei aus.
 */
export const exportFullDatabaseBackup = async (exportedByUserName?: string): Promise<BackupMetadata> => {
  const collectionsData: Record<string, Record<string, any>[]> = {};
  const counts: Record<string, number> = {};

  for (const colName of BACKUP_COLLECTIONS) {
    const snap = await getDocs(collection(db, colName));
    const docs: Record<string, any>[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      docs.push({
        ...data,
        id: data.id || docSnap.id
      });
    });
    collectionsData[colName] = docs;
    counts[colName] = docs.length;
  }

  const now = new Date();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'unknown-project';

  const meta: BackupMetadata = {
    version: '1.0',
    exportedAt: now.toISOString(),
    exportedTimestamp: now.getTime(),
    projectId,
    exportedBy: exportedByUserName || 'Unbekannt',
    counts
  };

  const payload: BackupPayload = {
    meta,
    collections: collectionsData
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const datePart = getTodayDateString();
  const timePart = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `papatodo_backup_${projectId}_${datePart}_${timePart}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  markBackupDoneToday();
  return meta;
};

/**
 * Hilfsfunktion: Führt Firestore Operationen sicher in Chunks von max. 400 Operationen pro Batch aus
 * (Firestore hat ein hartes Limit von 500 Operationen pro writeBatch).
 */
const commitInChunks = async (
  operations: Array<(batch: ReturnType<typeof writeBatch>) => void>,
  onProgress?: (done: number, total: number) => void
) => {
  const CHUNK_SIZE = 400;
  const total = operations.length;
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = operations.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(op => op(batch));
    await batch.commit();
    if (onProgress) {
      onProgress(Math.min(i + chunk.length, total), total);
    }
  }
};

/**
 * Prüft, ob eine hochgeladene JSON-Datei ein gültiges PapaToDo-Backup ist.
 */
export const parseAndValidateBackupFile = async (file: File): Promise<BackupPayload> => {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Die ausgewählte Datei ist kein gültiges JSON-Dokument.');
  }

  if (!parsed || typeof parsed !== 'object' || !parsed.meta || !parsed.collections) {
    throw new Error('Ungültiges Backup-Format: Metadaten oder Collections fehlen.');
  }

  return parsed as BackupPayload;
};

/**
 * Spielt ein Backup in die aktuell verbundene Firestore-Datenbank ein.
 * @param mode 'merge' = Bestehende überschreiben/ergänzen, nichts löschen.
 *             'wipe'  = Alle registrierten Collections vorher komplett leeren (1:1 Spiegel für Testdatenbank).
 */
export const restoreDatabaseBackup = async (
  payload: BackupPayload,
  mode: 'merge' | 'wipe',
  onStatusUpdate?: (statusText: string) => void
): Promise<void> => {
  // 1. Optionaler Wipe-Schritt (Zieldatenbank komplett leeren)
  if (mode === 'wipe') {
    onStatusUpdate?.('Lese bestehende Datensätze zum Leeren der Zieldatenbank...');
    const deleteOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

    for (const colName of BACKUP_COLLECTIONS) {
      const snap = await getDocs(collection(db, colName));
      snap.forEach((docSnap) => {
        const ref = doc(db, colName, docSnap.id);
        deleteOps.push((batch) => batch.delete(ref));
      });
    }

    if (deleteOps.length > 0) {
      await commitInChunks(deleteOps, (done, total) => {
        onStatusUpdate?.(`Leere Zieldatenbank: ${done} / ${total} Dokumente gelöscht...`);
      });
    }
  }

  // 2. Schreib-Schritt (Alle Dokumente aus dem Backup einspielen)
  onStatusUpdate?.('Bereite Backup-Datensätze zum Einspielen vor...');
  const writeOps: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  for (const colName of BACKUP_COLLECTIONS) {
    const docsArray = payload.collections[colName];
    if (!Array.isArray(docsArray)) continue;

    for (const item of docsArray) {
      if (!item || typeof item !== 'object' || !item.id) continue;
      const docRef = doc(db, colName, String(item.id));
      writeOps.push((batch) => batch.set(docRef, item));
    }
  }

  if (writeOps.length > 0) {
    await commitInChunks(writeOps, (done, total) => {
      onStatusUpdate?.(`Spiele Datensätze ein: ${done} / ${total} geschrieben...`);
    });
  }

  onStatusUpdate?.('Wiederherstellung erfolgreich abgeschlossen!');
};
// --- END OF FILE ---