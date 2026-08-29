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

const DEFAULT_GUEST_MEDICINES: Medicine[] = [
  {
    id: 'med_demo_1',
    userId: 'guest_user',
    name: 'Amoxicillin 500mg',
    type: 'Medicine',
    dosage: '1 capsule 3x daily',
    quantity: 6,
    totalQuantity: 30,
    unit: 'Capsules',
    status: 'expiring',
    usagePerDay: 3,
    purchasePrice: 18.50,
    estimatedValue: 18.50,
    riskScore: 82,
    confidence: 96,
    batchNumber: 'LOT-98214',
    manufacturer: 'Pfizer Labs',
    storageNotes: 'Store below 25°C in dry place',
    expiryDate: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)), // 5 days from now
    timingSlots: ['Morning', 'Afternoon', 'Night'],
    mealRelation: 'After Food',
    reminderEnabled: true,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date())
  },
  {
    id: 'med_demo_2',
    userId: 'guest_user',
    name: 'Ibuprofen 200mg',
    type: 'Medicine',
    dosage: '1 tablet as needed',
    quantity: 24,
    totalQuantity: 50,
    unit: 'Tablets',
    status: 'active',
    usagePerDay: 1,
    purchasePrice: 9.99,
    estimatedValue: 9.99,
    riskScore: 25,
    confidence: 98,
    batchNumber: 'IBU-4412',
    manufacturer: 'Bayer Healthcare',
    storageNotes: 'Keep away from direct sunlight',
    expiryDate: Timestamp.fromDate(new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)), // 6 months from now
    timingSlots: ['Morning'],
    mealRelation: 'After Food',
    reminderEnabled: true,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date())
  },
  {
    id: 'med_demo_3',
    userId: 'guest_user',
    name: 'Metformin 500mg',
    type: 'Medicine',
    dosage: '1 tablet twice daily',
    quantity: 48,
    totalQuantity: 60,
    unit: 'Tablets',
    status: 'active',
    usagePerDay: 2,
    purchasePrice: 14.25,
    estimatedValue: 14.25,
    riskScore: 35,
    confidence: 94,
    batchNumber: 'MET-8871',
    manufacturer: 'Novartis',
    storageNotes: 'Room temperature',
    expiryDate: Timestamp.fromDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
    timingSlots: ['Morning', 'Night'],
    mealRelation: 'After Food',
    reminderEnabled: true,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date())
  },
  {
    id: 'med_demo_4',
    userId: 'guest_user',
    name: 'Refresh Tears Eye Drops 10ml',
    type: 'Medicine',
    dosage: '1 drop per eye',
    quantity: 1,
    totalQuantity: 1,
    unit: 'Bottles',
    status: 'expired',
    usagePerDay: 1,
    purchasePrice: 12.00,
    estimatedValue: 12.00,
    riskScore: 92,
    confidence: 99,
    batchNumber: 'EYE-1002',
    manufacturer: 'Allergan',
    storageNotes: 'Discard 30 days after opening',
    expiryDate: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // Expired 2 days ago
    timingSlots: ['Morning', 'Night'],
    mealRelation: 'None',
    reminderEnabled: false,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date())
  },
  {
    id: 'med_demo_5',
    userId: 'guest_user',
    name: 'Vitamin D3 1000 IU',
    type: 'Supplement',
    dosage: '1 softgel daily',
    quantity: 85,
    totalQuantity: 100,
    unit: 'Softgels',
    status: 'active',
    usagePerDay: 1,
    purchasePrice: 16.50,
    estimatedValue: 16.50,
    riskScore: 10,
    confidence: 95,
    batchNumber: 'VIT-552',
    manufacturer: 'Nature Made',
    storageNotes: 'Keep tightly sealed in a cool, dry place',
    expiryDate: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)),
    timingSlots: ['Morning'],
    mealRelation: 'After Food',
    reminderEnabled: true,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)),
    updatedAt: Timestamp.fromDate(new Date())
  }
];

const getLocalMedicines = (userId: string): Medicine[] => {
  const data = localStorage.getItem(`safeshelf_medicines_${userId}`);
  if (data) {
    try {
      const parsed = JSON.parse(data);
      return parsed.map((m: any) => ({
        ...m,
        expiryDate: m.expiryDate?.seconds ? new Timestamp(m.expiryDate.seconds, m.expiryDate.nanoseconds || 0) : m.expiryDate
      }));
    } catch { /* ignore */ }
  }
  // If no data saved, initialize with defaults
  localStorage.setItem(`safeshelf_medicines_${userId}`, JSON.stringify(DEFAULT_GUEST_MEDICINES));
  return DEFAULT_GUEST_MEDICINES;
};

const setLocalMedicines = (userId: string, medicines: Medicine[]) => {
  localStorage.setItem(`safeshelf_medicines_${userId}`, JSON.stringify(medicines));
};

export const inventoryService = {
  subscribeToUserMedicines: (userId: string, callback: (medicines: Medicine[]) => void) => {
    if (userId.startsWith('guest_') || !auth.currentUser) {
      const meds = getLocalMedicines(userId);
      callback(meds);
      // Setup window event listener for local updates
      const handleStorage = () => {
        callback(getLocalMedicines(userId));
      };
      window.addEventListener('safeshelf_meds_updated', handleStorage);
      return () => window.removeEventListener('safeshelf_meds_updated', handleStorage);
    }

    const q = query(collection(db, MEDICINES_COLLECTION), where('userId', '==', userId));
    
    return onSnapshot(q, (snapshot) => {
      const medicines = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medicine[];
      callback(medicines);
    }, (error) => {
      console.warn('Firestore subscription fallback to local:', error);
      callback(getLocalMedicines(userId));
    });
  },

  addMedicine: async (medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest_user';

    if (!user || userId.startsWith('guest_')) {
      const list = getLocalMedicines(userId);
      const newMed: Medicine = {
        id: `med_${Date.now()}`,
        userId,
        ...medicine,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      } as any;
      list.unshift(newMed);
      setLocalMedicines(userId, list);
      window.dispatchEvent(new Event('safeshelf_meds_updated'));
      return;
    }

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
      console.warn('Firestore addMedicine fallback to local:', error);
      const list = getLocalMedicines(userId);
      const newMed: Medicine = {
        id: `med_${Date.now()}`,
        userId,
        ...medicine,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      } as any;
      list.unshift(newMed);
      setLocalMedicines(userId, list);
      window.dispatchEvent(new Event('safeshelf_meds_updated'));
    }
  },

  batchAddMedicines: async (medicines: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[]) => {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest_user';

    if (!user || userId.startsWith('guest_')) {
      const list = getLocalMedicines(userId);
      const newMeds: Medicine[] = medicines.map(m => ({
        id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        userId,
        ...m,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      } as any));
      list.unshift(...newMeds);
      setLocalMedicines(userId, list);
      window.dispatchEvent(new Event('safeshelf_meds_updated'));
      return;
    }

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
      console.warn('Firestore batchAddMedicines fallback:', error);
      const list = getLocalMedicines(userId);
      const newMeds: Medicine[] = medicines.map(m => ({
        id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        userId,
        ...m,
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date())
      } as any));
      list.unshift(...newMeds);
      setLocalMedicines(userId, list);
      window.dispatchEvent(new Event('safeshelf_meds_updated'));
    }
  },

  getMedicines: async (): Promise<Medicine[]> => {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest_user';

    if (!user || userId.startsWith('guest_')) {
      return getLocalMedicines(userId);
    }

    try {
      const q = query(collection(db, MEDICINES_COLLECTION), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return getLocalMedicines(userId);
      }
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Medicine[];
    } catch (error) {
      console.warn('Firestore getMedicines fallback to local:', error);
      return getLocalMedicines(userId);
    }
  },

  logDose: async (medicineId: string, medicineName: string, status: 'taken' | 'skipped' | 'missed', scheduledTime: string) => {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest_user';

    if (!user || userId.startsWith('guest_')) {
      const key = `safeshelf_logs_${userId}`;
      const logs = JSON.parse(localStorage.getItem(key) || '[]');
      logs.unshift({
        id: `log_${Date.now()}`,
        medicineId,
        medicineName,
        status,
        scheduledTime,
        timestamp: Timestamp.fromDate(new Date()),
        userId
      });
      localStorage.setItem(key, JSON.stringify(logs));
      return;
    }

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
      console.warn('Firestore logDose fallback to local:', error);
      const key = `safeshelf_logs_${userId}`;
      const logs = JSON.parse(localStorage.getItem(key) || '[]');
      logs.unshift({
        id: `log_${Date.now()}`,
        medicineId,
        medicineName,
        status,
        scheduledTime,
        timestamp: Timestamp.fromDate(new Date()),
        userId
      });
      localStorage.setItem(key, JSON.stringify(logs));
    }
  },

  getDoseLogs: async (days: number = 7): Promise<DoseLog[]> => {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest_user';

    if (!user || userId.startsWith('guest_')) {
      const key = `safeshelf_logs_${userId}`;
      const logs = JSON.parse(localStorage.getItem(key) || '[]');
      return logs;
    }

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
      console.warn('Firestore getDoseLogs fallback to local:', error);
      const key = `safeshelf_logs_${userId}`;
      const logs = JSON.parse(localStorage.getItem(key) || '[]');
      return logs;
    }
  },

  updateMedicine: async (id: string, updates: Partial<Medicine>) => {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest_user';

    if (!user || userId.startsWith('guest_')) {
      const list = getLocalMedicines(userId);
      const index = list.findIndex(m => m.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates, updatedAt: Timestamp.fromDate(new Date()) };
        setLocalMedicines(userId, list);
        window.dispatchEvent(new Event('safeshelf_meds_updated'));
      }
      return;
    }

    try {
      const ref = doc(db, MEDICINES_COLLECTION, id);
      const { id: _, userId: __, createdAt, ...validUpdates } = updates as any;
      
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
      console.warn('Firestore updateMedicine fallback to local:', error);
      const list = getLocalMedicines(userId);
      const index = list.findIndex(m => m.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates, updatedAt: Timestamp.fromDate(new Date()) };
        setLocalMedicines(userId, list);
        window.dispatchEvent(new Event('safeshelf_meds_updated'));
      }
    }
  },

  deleteMedicine: async (id: string) => {
    const user = auth.currentUser;
    const userId = user ? user.uid : 'guest_user';

    if (!user || userId.startsWith('guest_')) {
      const list = getLocalMedicines(userId).filter(m => m.id !== id);
      setLocalMedicines(userId, list);
      window.dispatchEvent(new Event('safeshelf_meds_updated'));
      return;
    }

    try {
      const ref = doc(db, MEDICINES_COLLECTION, id);
      await deleteDoc(ref);
    } catch (error) {
      console.warn('Firestore deleteMedicine fallback to local:', error);
      const list = getLocalMedicines(userId).filter(m => m.id !== id);
      setLocalMedicines(userId, list);
      window.dispatchEvent(new Event('safeshelf_meds_updated'));
    }
  }
};
