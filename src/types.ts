export type Category = 'Medicine' | 'Food' | 'Supplement' | 'Chemical' | 'Other';
export type AuthRole = 'Household User' | 'Student' | 'Elderly User' | 'Caregiver' | 'Pharmacy Staff' | 'Retail Seller' | 'Admin';
export type Language = 'English' | 'Hindi' | 'Telugu' | 'Kannada';
export type AuthProviderType = 'google' | 'apple' | 'facebook' | 'email';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: AuthRole;
  provider: AuthProviderType;
  mobileNumber?: string;
  preferredLanguage: Language;
  createdAt: any;
  lastLogin: any;
  onboardingCompleted: boolean;
}

export interface Medicine {
  id?: string;
  name: string;
  type: Category;
  dosage: string;
  expiryDate: Date | any; // Using any for Timestamp to avoid firebase import on server
  quantity: number;
  price?: number;
  unit: string;
  usagePerDay: number;
  lastRefilledAt?: Date | any;
  status: 'active' | 'expiring' | 'expired' | 'low-stock';
  riskScore: number;
  confidence: number;
  userId: string;
  createdAt: any;
  updatedAt: any;
  batchNumber?: string;
  manufacturer?: string;
  batchRecallAlert?: boolean;
  storageNotes?: string;
}
