import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs,
  doc, 
  query, 
  where, 
  orderBy,
  limit,
  onSnapshot, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase.ts';
import type { Category, Medicine, DoseLog } from '../types.ts';

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
      const data = { ...medicine } as any;
      
      // Convert string dates to Timestamps or null if empty
      ['expiryDate', 'lastRefilledAt', 'courseDeadline', 'startDate', 'endDate'].forEach(field => {
        if (typeof data[field] === 'string') {
          if (data[field].trim() !== '') {
            data[field] = Timestamp.fromDate(new Date(data[field]));
          } else {
            data[field] = null;
          }
        }
      });

      await addDoc(collection(db, MEDICINES_COLLECTION), {
        ...data,
        userId: user.uid,
        name: medicine.name || 'Unknown',
        type: medicine.type || 'Medicine',
        unit: medicine.unit || 'Tablets',
        status: medicine.status || 'active',
        dosage: medicine.dosage || '',
        quantity: medicine.quantity || 0,
        totalQuantity: medicine.totalQuantity || medicine.quantity || 0,
        purchasePrice: medicine.purchasePrice || 0,
        estimatedValue: medicine.estimatedValue || 0,
        riskScore: medicine.riskScore || 0,
        confidence: medicine.confidence || 0,
        expiryDate: data.expiryDate || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, MEDICINES_COLLECTION);
    }
  },

  batchAddMedicines: async (medicines: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[]) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      const promises = medicines.map(medicine => {
        const data = { ...medicine } as any;
        ['expiryDate', 'lastRefilledAt', 'courseDeadline', 'startDate', 'endDate'].forEach(field => {
          if (typeof data[field] === 'string') {
            if (data[field].trim() !== '') {
              data[field] = Timestamp.fromDate(new Date(data[field]));
            } else {
              data[field] = null;
            }
          }
        });

        return addDoc(collection(db, MEDICINES_COLLECTION), {
          ...data,
          userId: user.uid,
          name: medicine.name || 'Unknown',
          type: medicine.type || 'Medicine',
          quantity: medicine.quantity || 0,
          totalQuantity: medicine.totalQuantity || medicine.quantity || 0,
          unit: medicine.unit || 'Tablets',
          status: medicine.status || 'active',
          dosage: medicine.dosage || '',
          expiryDate: data.expiryDate || null,
          purchasePrice: medicine.purchasePrice || 0,
          estimatedValue: medicine.estimatedValue || 0,
          riskScore: medicine.riskScore || 0,
          confidence: medicine.confidence || 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, MEDICINES_COLLECTION);
    }
  },

  getMedicines: async (): Promise<Medicine[]> => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      const q = query(collection(db, MEDICINES_COLLECTION), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medicine[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, MEDICINES_COLLECTION);
      return [];
    }
  },

  logDose: async (medicineId: string, medicineName: string, status: 'taken' | 'skipped' | 'missed', scheduledTime: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      await addDoc(collection(db, 'dose_logs'), {
        medicineId,
        medicineName,
        status,
        scheduledTime,
        timestamp: serverTimestamp(),
        userId: user.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'dose_logs');
    }
  },

  getDoseLogs: async (days: number = 7) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      const q = query(
        collection(db, 'dose_logs'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DoseLog));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'dose_logs');
      return [];
    }
  },

  updateMedicine: async (id: string, updates: Partial<Medicine>) => {
    try {
      const ref = doc(db, MEDICINES_COLLECTION, id);
      // Remove restricted fields that shouldn't be updated or aren't fields in the doc
      const { id: _, userId, createdAt, ...validUpdates } = updates as any;
      
      // Convert string dates to Timestamps or null if empty
      ['expiryDate', 'lastRefilledAt', 'courseDeadline', 'startDate', 'endDate'].forEach(field => {
        if (typeof validUpdates[field] === 'string') {
          if (validUpdates[field].trim() !== '') {
            validUpdates[field] = Timestamp.fromDate(new Date(validUpdates[field]));
          } else {
            validUpdates[field] = null;
          }
        }
      });

      await updateDoc(ref, {
        ...validUpdates,
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
