// [2026-06-11] - ARCHITEKTUR-FIX: Starre schemaVersion-Prüfung durch abwärtskompatible Lazy-Migration (parseFloat) ersetzt. Verhindert Abstürze bei zukünftigen Datenmodell-Upgrades.
// [2026-05-27] - ARCHITEKTUR-FIX: `partialUpdate`-Parameter in `saveDocument` eingeführt. Vollständiger Überschrieb (Standard) verhindert Geister-Daten. `sanitizeForFirestore` ersetzt gefährliches JSON.parse und schützt Firebase-Timestamps.
// --- START OF FILE ---
// src/services/DataProcessor.ts
import { doc, getDoc, setDoc, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import type { AsyncResult } from '../core/types/shared';
import type { BaseDocument } from '../core/types/models';

export class DataProcessor {
  private static readonly EXPECTED_SCHEMA_VERSION = '1.0';

  /**
   * Rekursive Hilfsfunktion: Bereinigt das Objekt vor dem Speichern in Firestore,
   * ohne spezielle Firebase-Objekte (wie Timestamps) zu zerstören (was bei JSON.parse passieren würde).
   * * @param isMerge - Wenn true, werden undefined-Werte in deleteField() übersetzt (für Partial-Updates).
   * Wenn false, werden undefined-Werte komplett aus dem Objekt entfernt (für Voll-Überschrieb).
   */
  private static sanitizeForFirestore(obj: any, isMerge: boolean): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.filter(item => item !== undefined).map(item => this.sanitizeForFirestore(item, isMerge));
    }

    // Schützt spezielle Klassen-Instanzen (wie Firebase Timestamps oder Dates) vor der Zerstörung
    if (Object.getPrototypeOf(obj) !== Object.prototype) {
      return obj;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        if (isMerge) {
          sanitized[key] = deleteField();
        }
        // Bei isMerge === false wird der Key einfach ignoriert (gelöscht)
      } else {
        sanitized[key] = this.sanitizeForFirestore(value, isMerge);
      }
    }
    return sanitized;
  }

  static async getDocument<T extends BaseDocument>(
    collectionName: string,
    documentId: string
  ): AsyncResult<T> {
    try {
      const docRef = doc(db, collectionName, documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          success: false,
          error: new Error(`Document ${documentId} not found in ${collectionName}`),
        };
      }

      const data = docSnap.data() as T;

      // CHIRURGISCHER EINGRIFF: Intelligente Lazy-Migration statt hartem Blocker
      if (!data.schemaVersion) {
        return {
          success: false,
          error: new Error(`Schema version missing in document ${documentId}`),
        };
      }

      const docVersion = parseFloat(data.schemaVersion);
      const appVersion = parseFloat(DataProcessor.EXPECTED_SCHEMA_VERSION);

      if (docVersion > appVersion) {
        // Die PWA-Version im Browser ist zu alt für das geladene Dokument. 
        // Harter Fehler fordert den Nutzer zum Reload/Update auf.
        return {
          success: false,
          error: new Error(`Daten aus der Zukunft: Bitte lade die App neu (F5), um die aktuellste Version zu nutzen. (Doc: ${data.schemaVersion}, App: ${DataProcessor.EXPECTED_SCHEMA_VERSION})`),
        };
      } else if (docVersion < appVersion) {
        // Lazy Migration: Altes Dokument im Speicher hochstufen.
        // Wird beim nächsten saveDocument() automatisch im neuen Format gespeichert.
        console.warn(`[Lazy Migration] Dokument ${documentId} aus ${collectionName} ist auf Version ${data.schemaVersion}. Wird temporär auf ${DataProcessor.EXPECTED_SCHEMA_VERSION} angehoben.`);
        data.schemaVersion = DataProcessor.EXPECTED_SCHEMA_VERSION;
      }

      return { success: true, data };
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      return { success: false, error };
    }
  }

  /**
   * Speichert ein Dokument in Firestore.
   *
   * @param partialUpdate - Steuert die Schreib-Strategie:
   * false (Standard): Vollständiger Überschrieb (kein merge). Felder, die im lokalen 
   * Zustand undefined sind, werden beim Überschreiben in der DB gelöscht.
   * true: Partial-Update via setDoc MIT merge. undefined-Werte werden via 
   * deleteField() gelöscht, der Rest bleibt unberührt.
   */
  static async saveDocument<T extends BaseDocument>(
    collectionName: string,
    documentId: string,
    data: T,
    partialUpdate: boolean = false
  ): AsyncResult<void> {
    try {
      const docRef = doc(db, collectionName, documentId);
      
      // Sichere Bereinigung ohne JSON-Hack, der Timestamps zerstören würde
      const sanitizedData = this.sanitizeForFirestore(data, partialUpdate);

      if (partialUpdate) {
        await setDoc(docRef, sanitizedData, { merge: true });
      } else {
        await setDoc(docRef, sanitizedData);
      }
      
      return { success: true, data: undefined };
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      return { success: false, error };
    }
  }
}
// --- END OF FILE ---