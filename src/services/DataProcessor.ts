// src/services/DataProcessor.ts
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Result, AsyncResult } from '../core/types/shared';
import { BaseDocument } from '../core/types/models';

export class DataProcessor {
  private static readonly EXPECTED_SCHEMA_VERSION = '1.0';

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

      if (!data.schemaVersion || data.schemaVersion !== DataProcessor.EXPECTED_SCHEMA_VERSION) {
        return {
          success: false,
          error: new Error(`Schema mismatch: expected ${DataProcessor.EXPECTED_SCHEMA_VERSION}, got ${data.schemaVersion}`),
        };
      }

      return { success: true, data };
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      return { success: false, error };
    }
  }

  static async saveDocument<T extends BaseDocument>(
    collectionName: string,
    documentId: string,
    data: T
  ): AsyncResult<void> {
    try {
      const docRef = doc(db, collectionName, documentId);
      await setDoc(docRef, data);
      return { success: true, data: undefined };
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      return { success: false, error };
    }
  }
}

// Exakte Zeilenzahl: 57
