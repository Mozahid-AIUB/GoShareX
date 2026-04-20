/**
 * Generic Firestore helpers — typed wrappers around firebase/firestore SDK.
 * All functions accept and return strongly-typed generics so callers never
 * have to cast DocumentData manually.
 */

import {
  doc,
  getDoc as firestoreGetDoc,
  setDoc as firestoreSetDoc,
  updateDoc as firestoreUpdateDoc,
  deleteDoc as firestoreDeleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  QueryConstraint,
  DocumentData,
  WithFieldValue,
  PartialWithFieldValue,
  QuerySnapshot,
  DocumentSnapshot,
  Unsubscribe,
  CollectionReference,
} from 'firebase/firestore';
import { db } from '@/services/firebase/config';

// ─── Exported helpers ────────────────────────────────────────────────────────

/**
 * Fetch a single document by collection path + document id.
 * Returns `null` when the document does not exist.
 */
export async function getDoc<T>(
  collectionPath: string,
  docId: string,
): Promise<T | null> {
  const ref = doc(db, collectionPath, docId);
  const snap: DocumentSnapshot<DocumentData> = await firestoreGetDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

/**
 * Write (create or fully overwrite) a document.
 * Pass `{ merge: true }` in options to merge instead of overwrite.
 */
export async function setDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string,
  data: WithFieldValue<T>,
  options?: { merge?: boolean },
): Promise<void> {
  const ref = doc(db, collectionPath, docId);
  if (options?.merge) {
    await firestoreSetDoc(ref, data, { merge: true });
  } else {
    await firestoreSetDoc(ref, data);
  }
}

/**
 * Partially update an existing document.
 * Throws FirestoreError if the document does not exist.
 */
export async function updateDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string,
  data: PartialWithFieldValue<T>,
): Promise<void> {
  const ref = doc(db, collectionPath, docId);
  // updateDoc requires Partial<UpdateData<T>> – cast is safe here
  await firestoreUpdateDoc(ref, data as DocumentData);
}

/**
 * Delete a document. No-op if it does not exist.
 */
export async function deleteDoc(
  collectionPath: string,
  docId: string,
): Promise<void> {
  const ref = doc(db, collectionPath, docId);
  await firestoreDeleteDoc(ref);
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export interface QueryOptions {
  /** Array of [field, operator, value] triples — maps to Firestore `where()` */
  filters?: Array<[string, FirebaseFirestore.WhereFilterOp | string, unknown]>;
  /** Field name to order by */
  orderByField?: string;
  /** Direction for orderBy ('asc' | 'desc'). Defaults to 'asc'. */
  orderDirection?: 'asc' | 'desc';
  /** Max number of documents to return */
  limit?: number;
}

/**
 * Query a collection with optional filters, ordering and limit.
 * Returns an array of typed objects that include the document `id`.
 */
export async function queryDocs<T>(
  collectionPath: string,
  options: QueryOptions = {},
): Promise<T[]> {
  const colRef = collection(db, collectionPath) as CollectionReference<DocumentData>;
  const constraints: QueryConstraint[] = [];

  if (options.filters) {
    for (const [field, op, value] of options.filters) {
      constraints.push(where(field, op as Parameters<typeof where>[1], value));
    }
  }

  if (options.orderByField) {
    constraints.push(orderBy(options.orderByField, options.orderDirection ?? 'asc'));
  }

  if (options.limit) {
    constraints.push(firestoreLimit(options.limit));
  }

  const q = query(colRef, ...constraints);
  const snap: QuerySnapshot<DocumentData> = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

/**
 * Real-time listener for a single document.
 * Returns an `Unsubscribe` function to stop listening.
 */
export function subscribeDoc<T>(
  collectionPath: string,
  docId: string,
  callback: (data: T | null) => void,
): Unsubscribe {
  const ref = doc(db, collectionPath, docId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(null);
    } else {
      callback({ id: snap.id, ...snap.data() } as T);
    }
  });
}

/**
 * Real-time listener for a collection query.
 * Returns an `Unsubscribe` function to stop listening.
 */
export function subscribeDocs<T>(
  collectionPath: string,
  options: QueryOptions,
  callback: (data: T[]) => void,
): Unsubscribe {
  const colRef = collection(db, collectionPath) as CollectionReference<DocumentData>;
  const constraints: QueryConstraint[] = [];

  if (options.filters) {
    for (const [field, op, value] of options.filters) {
      constraints.push(where(field, op as Parameters<typeof where>[1], value));
    }
  }
  if (options.orderByField) {
    constraints.push(orderBy(options.orderByField, options.orderDirection ?? 'asc'));
  }
  if (options.limit) {
    constraints.push(firestoreLimit(options.limit));
  }

  const q = query(colRef, ...constraints);
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
  });
}

/** Convenience re-export so callers can use serverTimestamp without extra imports */
export { serverTimestamp };
