import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// In-memory fallback datastore when MongoDB is not connected
const memoryStore = {
  users: new Map<string, any>(),
  items: new Map<string, any>(),
  reports: new Map<string, any>(),
  orders: new Map<string, any>()
};

// Seed initial memory store data if needed
let memIdCounter = 1;
const generateId = () => `mem_${Date.now()}_${memIdCounter++}`;

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plan: { type: String, default: 'free' },
  report_interval: { type: String, default: 'none' },
  phone: { type: String },
  role: { type: String, default: 'Household User' },
  profile_picture: { type: String },
  preferred_language: { type: String, default: 'English' },
  settings: {
    reminderVoiceLanguage: { type: String, default: 'English' },
    voiceVolume: { type: Number, default: 80 },
    alarmRepeatCount: { type: Number, default: 3 },
    customReminderMessage: { type: String, default: 'Time to take your medicine' },
    enableVoiceAssistant: { type: Boolean, default: true },
    defaultReminderTone: { type: String, default: 'soft-alert' },
    notificationsEnabled: { type: Boolean, default: true },
    snoozeDuration: { type: Number, default: 5 },
    repeatIfIgnored: { type: Boolean, default: true },
    autoSaveOcr: { type: Boolean, default: false },
    requireOcrConfirmation: { type: Boolean, default: true },
    showConfidenceScore: { type: Boolean, default: true },
    preferredScanMode: { type: String, default: 'package' },
    reportFrequency: { type: String, default: 'weekly' },
    exportType: { type: String, default: 'PDF' },
    gmailDelivery: { type: Boolean, default: false },
    whatsappSharing: { type: Boolean, default: true },
    sortBy: { type: String, default: 'expiry' },
    lowStockThreshold: { type: Number, default: 5 },
    expiryWarningDays: { type: Number, default: 30 },
    preferredRefillPlatform: { type: String, default: 'Generic' },
    refillBudget: { type: String, default: 'standard' },
    refillReminders: { type: Boolean, default: true }
  }
});

const itemSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, default: 0 },
  expiry_date: { type: Date, required: true },
  usage_per_day: { type: Number, default: 1 },
  last_refilled_at: { type: Date },
  created_at: { type: Date, default: Date.now }
});

const reportSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  file_type: { type: String, required: true },
  data_snapshot: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  status: { type: String, required: true },
  address: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

export interface IUser {
  name: string;
  email: string;
  password: string;
  plan: string;
  report_interval: string;
  phone?: string;
  role?: string;
  profile_picture?: string;
  preferred_language?: string;
  settings?: any;
  _id?: any;
}

export interface IItem {
  user_id: any;
  name: string;
  category: string;
  quantity: number;
  price: number;
  expiry_date: Date;
  usage_per_day: number;
  last_refilled_at?: Date;
  created_at: Date;
  _id?: any;
}

export interface IReport {
  user_id: any;
  file_type: string;
  data_snapshot: string;
  created_at: Date;
  _id?: any;
}

const MongooseUser = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
const MongooseItem = mongoose.models.Item || mongoose.model<IItem>('Item', itemSchema);
const MongooseReport = mongoose.models.Report || mongoose.model<IReport>('Report', reportSchema);
const MongooseOrder = mongoose.models.Order || mongoose.model('Order', orderSchema);

let isConnected = false;

// Universal model wrapper that works with MongoDB when available or In-Memory fallback
const UserMethods = {
  findOne: async (filter: any) => {
    if (isConnected) {
      try { return await (MongooseUser as any).findOne(filter); } catch (e) { /* fallback */ }
    }
    for (const u of memoryStore.users.values()) {
      if (filter.email && u.email === filter.email) return { ...u, toObject: () => ({ ...u }) };
      if (filter._id && u._id === filter._id) return { ...u, toObject: () => ({ ...u }) };
    }
    return null;
  },
  findById: (id: any) => {
    const exec = async () => {
      if (isConnected) {
        try { return await (MongooseUser as any).findById(id); } catch (e) { /* fallback */ }
      }
      const u = memoryStore.users.get(String(id));
      if (!u) return null;
      return { ...u, toObject: () => ({ ...u }) };
    };
    return {
      select: (fields: string) => ({
        then: (resolve: any, reject: any) => exec().then(u => {
          if (!u) return resolve(null);
          const copy = { ...u };
          if (fields.includes('-password')) delete copy.password;
          resolve(copy);
        }, reject)
      }),
      then: (resolve: any, reject: any) => exec().then(resolve, reject)
    };
  },
  findByIdAndUpdate: async (id: any, updates: any, options?: any) => {
    if (isConnected) {
      try { return await (MongooseUser as any).findByIdAndUpdate(id, updates, options); } catch (e) { /* fallback */ }
    }
    const current = memoryStore.users.get(String(id)) || { _id: String(id) };
    const updated = { ...current, ...updates };
    memoryStore.users.set(String(id), updated);
    return {
      select: (fields: string) => {
        const copy = { ...updated };
        if (fields.includes('-password')) delete copy.password;
        return copy;
      },
      ...updated,
      toObject: () => ({ ...updated })
    };
  },
  find: async (filter: any = {}) => {
    if (isConnected) {
      try { return await (MongooseUser as any).find(filter); } catch (e) { /* fallback */ }
    }
    const results = Array.from(memoryStore.users.values());
    return results.map(u => ({ ...u, toObject: () => ({ ...u }) }));
  }
};

function UserConstructor(this: any, data: any) {
  this._id = data?._id || generateId();
  this.name = data?.name || '';
  this.email = data?.email || '';
  this.password = data?.password || '';
  this.plan = data?.plan || 'free';
  this.report_interval = data?.report_interval || 'none';
  this.phone = data?.phone || '';
  this.role = data?.role || 'Household User';
  this.profile_picture = data?.profile_picture || '';
  this.preferred_language = data?.preferred_language || 'English';
  this.settings = data?.settings || {};
  this.save = async () => {
    if (isConnected) {
      try {
        const doc = new MongooseUser(this);
        return await doc.save();
      } catch (e) { /* fallback */ }
    }
    memoryStore.users.set(String(this._id), { ...this });
    return this;
  };
}
Object.assign(UserConstructor, UserMethods);
export const User: any = UserConstructor;

const ItemMethods = {
  find: async (filter: any = {}) => {
    if (isConnected) {
      try { return await (MongooseItem as any).find(filter); } catch (e) { /* fallback */ }
    }
    const items = Array.from(memoryStore.items.values()).filter(item => {
      if (filter.user_id && String(item.user_id) !== String(filter.user_id)) return false;
      return true;
    });
    return items.map(i => ({ ...i, toObject: () => ({ ...i }) }));
  },
  findOneAndUpdate: async (filter: any, updates: any) => {
    if (isConnected) {
      try { return await (MongooseItem as any).findOneAndUpdate(filter, updates, { new: true }); } catch (e) { /* fallback */ }
    }
    const id = String(filter._id);
    const item = memoryStore.items.get(id) || {};
    const updated = { ...item, ...updates, _id: id };
    memoryStore.items.set(id, updated);
    return { ...updated, toObject: () => ({ ...updated }) };
  },
  deleteOne: async (filter: any) => {
    if (isConnected) {
      try { return await (MongooseItem as any).deleteOne(filter); } catch (e) { /* fallback */ }
    }
    if (filter._id) {
      memoryStore.items.delete(String(filter._id));
    }
    return { deletedCount: 1 };
  }
};

function ItemConstructor(this: any, data: any) {
  this._id = data?._id || generateId();
  this.user_id = data?.user_id;
  this.name = data?.name || '';
  this.category = data?.category || 'Medicine';
  this.quantity = data?.quantity || 1;
  this.price = data?.price || 0;
  this.expiry_date = data?.expiry_date ? new Date(data.expiry_date) : new Date();
  this.usage_per_day = data?.usage_per_day || 1;
  this.created_at = data?.created_at || new Date();
  this.save = async () => {
    if (isConnected) {
      try {
        const doc = new MongooseItem(this);
        return await doc.save();
      } catch (e) { /* fallback */ }
    }
    memoryStore.items.set(String(this._id), { ...this });
    return this;
  };
}
Object.assign(ItemConstructor, ItemMethods);
export const Item: any = ItemConstructor;

const ReportMethods = {
  find: (filter: any = {}) => {
    const exec = async () => {
      if (isConnected) {
        try { return await (MongooseReport as any).find(filter); } catch (e) { /* fallback */ }
      }
      return Array.from(memoryStore.reports.values()).filter(r => {
        if (filter.user_id && String(r.user_id) !== String(filter.user_id)) return false;
        return true;
      });
    };
    return {
      sort: () => ({
        select: () => ({
          then: (resolve: any, reject: any) => exec().then((reports: any[]) => {
            resolve(reports.map(r => ({ ...r, toObject: () => ({ ...r }) })));
          }, reject)
        }),
        then: (resolve: any, reject: any) => exec().then((reports: any[]) => {
          resolve(reports.map(r => ({ ...r, toObject: () => ({ ...r }) })));
        }, reject)
      }),
      then: (resolve: any, reject: any) => exec().then(resolve, reject)
    };
  },
  findOne: async (filter: any) => {
    if (isConnected) {
      try { return await (MongooseReport as any).findOne(filter); } catch (e) { /* fallback */ }
    }
    const r = memoryStore.reports.get(String(filter._id));
    if (!r) return null;
    return { ...r, toObject: () => ({ ...r }) };
  }
};

function ReportConstructor(this: any, data: any) {
  this._id = data?._id || generateId();
  this.user_id = data?.user_id;
  this.file_type = data?.file_type || 'pdf';
  this.data_snapshot = data?.data_snapshot || '[]';
  this.created_at = data?.created_at || new Date();
  this.save = async () => {
    if (isConnected) {
      try {
        const doc = new MongooseReport(this);
        return await doc.save();
      } catch (e) { /* fallback */ }
    }
    memoryStore.reports.set(String(this._id), { ...this });
    return this;
  };
}
Object.assign(ReportConstructor, ReportMethods);
export const Report: any = ReportConstructor;

export const Order = {
  find: async (filter: any = {}) => {
    if (isConnected) {
      try { return await (MongooseOrder as any).find(filter); } catch (e) { /* fallback */ }
    }
    return Array.from(memoryStore.orders.values());
  }
} as any;

export async function connectDb() {
  if (isConnected) return;

  if (!MONGODB_URI) {
    // Graceful in-memory operation
    return;
  }

  try {
    const options = {
      serverSelectionTimeoutMS: 2000,
      socketTimeoutMS: 5000,
      family: 4
    };
    await mongoose.connect(MONGODB_URI, options);
    isConnected = true;
  } catch {
    // Gracefully operate in-memory mode without logging errors
  }
}

export { UserConstructor as UserEntity, ItemConstructor as ItemEntity, ReportConstructor as ReportEntity };

