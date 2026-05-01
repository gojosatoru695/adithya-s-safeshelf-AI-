import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn('MONGODB_URI not found in environment. Database connection will fail.');
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plan: { type: String, default: 'free' },
  report_interval: { type: String, default: 'none' }
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
  _id?: any;
}

export interface IItem {
  user_id: mongoose.Types.ObjectId;
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
  user_id: mongoose.Types.ObjectId;
  file_type: string;
  data_snapshot: string;
  created_at: Date;
  _id?: any;
}

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);
export const Item = mongoose.models.Item || mongoose.model<IItem>('Item', itemSchema);
export const Report = mongoose.models.Report || mongoose.model<IReport>('Report', reportSchema);
export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

let isConnected = false;

export async function connectDb() {
  if (isConnected) return;

  if (!MONGODB_URI) {
    console.warn('CRITICAL: MONGODB_URI not found. Reports and historical data will be disabled.');
    return;
  }

  try {
    const options = {
      serverSelectionTimeoutMS: 5000, // Denoted in milliseconds
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4 to avoid potential DNS/dual-stack issues in some environments
    };
    await mongoose.connect(MONGODB_URI, options);
    isConnected = true;
    console.log('Connected to MongoDB Successfully');
  } catch (error) {
    console.error('CRITICAL: MongoDB Connection Error Breakdown:');
    if (error instanceof Error) {
      console.error(`- Name: ${error.name}`);
      console.error(`- Message: ${error.message}`);
    }
    console.warn('Proceeding without MongoDB. Some features like historical reports may not work.');
    // Non-fatal error to allow the server to keep running/hosting Vite
  }
}
