import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase.ts';

export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
} as const;

export type OperationType = typeof OperationType[keyof typeof OperationType];

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import { Category } from './categorizationService.ts';

export interface Medicine {
  id?: string;
  name: string;
  type: Category;
  dosage: string;
  expiryDate: Date | Timestamp;
  quantity: number;
  price?: number;
  unit: string;
  usagePerDay: number;
  lastRefilledAt?: Date | Timestamp;
  status: 'active' | 'expiring' | 'expired' | 'low-stock';
  riskScore: number;
  confidence: number;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

const MEDICINES_COLLECTION = 'medicines';

export const inventoryService = {
  subscribeToUserMedicines: (userId: string, callback: (medicines: Medicine[]) => void) => {
    const q = query(collection(db, MEDICINES_COLLECTION), where('userId', '==', userId));
    
    return onSnapshot(q, (snapshot) => {
      const medicines = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medicine[];
      callback(medicines);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, MEDICINES_COLLECTION);
    });
  },

  addMedicine: async (medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      await addDoc(collection(db, MEDICINES_COLLECTION), {
        ...medicine,
        userId: user.uid,
        price: medicine.price || 0,
        lastRefilledAt: medicine.lastRefilledAt || null,
        riskScore: medicine.riskScore || 0,
        confidence: medicine.confidence || 0,
        type: medicine.type || 'medicine',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, MEDICINES_COLLECTION);
    }
  },

  updateMedicine: async (id: string, updates: Partial<Medicine>) => {
    try {
      const ref = doc(db, MEDICINES_COLLECTION, id);
      await updateDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${MEDICINES_COLLECTION}/${id}`);
    }
  },

  deleteMedicine: async (id: string) => {
    try {
      const ref = doc(db, MEDICINES_COLLECTION, id);
      await deleteDoc(ref);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${MEDICINES_COLLECTION}/${id}`);
    }
  }
};
