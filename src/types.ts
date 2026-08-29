export type Category = 'Medicine' | 'Supplement' | 'Food' | 'Chemical' | 'Fertilizer' | 'Personal Care' | 'Household' | 'Other';
export type AuthRole = 'Household User' | 'Student' | 'Elderly User' | 'Caregiver' | 'Pharmacy Staff' | 'Retail Seller' | 'Admin';
export type Language = 'English' | 'Hindi' | 'Telugu' | 'Kannada';
export type AuthProviderType = 'google' | 'apple' | 'facebook' | 'email';
export type TimingSlot = 'Morning' | 'Afternoon' | 'Evening' | 'Night';
export type MealRelation = 'Before Food' | 'After Food' | 'Empty Stomach' | 'None';
export type RepeatPattern = 'Daily' | 'Specific Days' | 'Custom';

export interface DoseLog {
  id: string;
  medicineId: string;
  medicineName: string;
  userId: string;
  status: 'taken' | 'skipped' | 'missed';
  scheduledTime: any;
  actualTime?: any;
  timestamp: any;
}

export interface UserSettings {
  reminderVoiceLanguage: Language;
  voiceVolume: number;
  alarmRepeatCount: number;
  customReminderMessage: string;
  enableVoiceAssistant: boolean;
  defaultReminderTone: string;
  notificationsEnabled: boolean;
  snoozeDuration: number;
  repeatIfIgnored: boolean;
  autoSaveOcr: boolean;
  requireOcrConfirmation: boolean;
  showConfidenceScore: boolean;
  preferredScanMode: 'package' | 'prescription';
  reportFrequency: 'weekly' | 'monthly' | 'none';
  exportType: 'PDF' | 'Excel';
  gmailDelivery: boolean;
  whatsappSharing: boolean;
  sortBy: 'expiry' | 'confidence' | 'category';
  lowStockThreshold: number;
  expiryWarningDays: number;
  preferredRefillPlatform: string;
  refillBudget: 'economy' | 'standard' | 'premium';
  refillReminders: boolean;
}

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
  profilePicture?: string;
  settings?: UserSettings;
  reminderTimes?: {
    Morning: string;
    Afternoon: string;
    Evening: string;
    Night: string;
  };
}

export interface Medicine {
  id?: string;
  userId: string;
  name: string;
  brand?: string;
  type: Category;
  dosage: string;
  expiryDate: Date | any;
  quantity: number;
  totalQuantity?: number;
  purchasePrice?: number;
  estimatedValue?: number;
  unit: string;
  usagePerDay: number;
  lastRefilledAt?: Date | any;
  status: 'active' | 'expiring' | 'expired' | 'low-stock' | 'safe';
  riskScore: number;
  confidence: number;
  createdAt: any;
  updatedAt: any;
  batchNumber?: string;
  manufacturer?: string;
  batchRecallAlert?: boolean;
  storageNotes?: string;
  
  // Smart Prescription Features
  timingSlots?: TimingSlot[];
  exactTimes?: string[]; // e.g., ["09:00", "21:00"]
  mealRelation?: MealRelation;
  startDate?: any;
  endDate?: any;
  repeatPattern?: RepeatPattern;
  selectedDays?: number[]; // [0-6] for Sun-Sat
  reminderEnabled?: boolean;
  voiceAlarmType?: 'default' | 'custom';
  voiceCustomMessage?: string;
  voiceLanguage?: Language;
  alarmVolume?: number;
  alarmRepeatInterval?: number;
  prescribedBy?: string;
  notes?: string;
  tags?: string[];
  refillLink?: string;
}

export interface RiskAnalysis {
  score: number;
  status: string;
  alerts: string[];
}

export interface RefillSuggestion {
  name: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  medicineId?: string;
  currentQuantity?: number;
  remainingDays?: number;
  suggestedQuantity?: number;
}

export interface ExtractedPrescriptionItem {
  name: string;
  dosage?: string;
  timings: TimingSlot[];
  meal: MealRelation;
  duration?: string;
  notes?: string;
}
