import React from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';
import { motion } from 'motion/react';
import { BarChart2, TrendingUp, PieChart as PieChartIcon, Calendar } from 'lucide-react';
import type { Medicine } from '../types.ts';

interface QuantisAnalyticsProps {
  medicines: Medicine[];
}

export const QuantisAnalytics = ({ medicines }: QuantisAnalyticsProps) => {
  // 1. Category Breakdown Data
  const categories = medicines.reduce((acc: any, med) => {
    const cat = med.type || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(categories).map(([name, value]) => ({ name, value }));
  const COLORS = ['#4f46e5', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

  // 2. Expiry Trends Data (Next 6 Months)
  const monthlyExpiry = Array(6).fill(0).map((_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    const monthName = date.toLocaleString('default', { month: 'short' });
    
    const count = medicines.filter(med => {
      if (!med.expiryDate) return false;
      const expDate = new Date(med.expiryDate);
      return expDate.getMonth() === date.getMonth() && expDate.getFullYear() === date.getFullYear();
    }).length;

    return { name: monthName, items: count };
  });

  // 3. Stock Level Distribution
  const stockData = medicines.map(m => ({
    name: m.name.substring(0, 10),
    stock: m.quantity,
    min: 5,
    marketPrice: Math.floor(Math.random() * 500) + 100, // Simulated
    ourPrice: Math.floor(Math.random() * 400) + 80 // Simulated
  }));

  const savingsData = [
    { name: 'Week 1', savings: 450 },
    { name: 'Week 2', savings: 890 },
    { name: 'Week 3', savings: 1200 },
    { name: 'Week 4', savings: 2100 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-2">
      {/* Category Breakdown */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="dashboard-card p-6 bg-white border border-slate-100"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <PieChartIcon size={18} className="text-indigo-500" /> Category Distribution
          </h3>
        </div>
        <div className="h-64 min-h-[256px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Expiry Forecast */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="dashboard-card p-6 bg-white border border-slate-100"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={18} className="text-blue-500" /> Expiry Vulnerability (6M)
          </h3>
        </div>
        <div className="h-64 min-h-[256px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyExpiry}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="items" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Stock Levels Analytics */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="dashboard-card p-6 bg-white border border-slate-100 lg:col-span-2"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 size={18} className="text-indigo-600" /> Stock Quantity Analysis
          </h3>
          <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
            Managed by Quantis
          </div>
        </div>
        <div className="h-80 min-h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stockData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend />
              <Line type="monotone" dataKey="stock" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="min" stroke="#cbd5e1" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Savings Trend */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="dashboard-card p-6 bg-slate-900 border-none text-white lg:col-span-2"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-400" /> Projected Monthly Savings
          </h3>
        </div>
        <div className="h-64 min-h-[256px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={savingsData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis stroke="rgba(255,255,255,0.4)" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
                itemStyle={{ color: '#10b981' }}
              />
              <Line type="stepAfter" dataKey="savings" stroke="#10b981" strokeWidth={4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
};
