import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, CheckCircle2, Circle } from 'lucide-react';
import { Medicine, DoseLog } from '../types.ts';
import { getISTDate, getISTDateString } from '../lib/dateUtils.ts';

interface DosageCalendarProps {
  medicines: Medicine[];
  logs: DoseLog[];
}

export const DosageCalendar = ({ medicines, logs }: DosageCalendarProps) => {
  const activeMedicines = medicines.filter(m => m.status === 'active' || m.status === 'low-stock');
  const activeMedIds = new Set(activeMedicines.map(m => m.id));
  
  // Last 7 days in IST
  const days = useMemo(() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const istString = getISTDateString(d);
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
      
      const scheduledOnDay = activeMedicines.reduce((acc, m) => {
        const dDayIdx = d.getDay();
        const isScheduled = !m.repeatPattern || m.repeatPattern === 'Daily' || 
          (m.repeatPattern === 'Specific Days' && m.selectedDays?.includes(dDayIdx));
        
        if (!isScheduled) return acc;
        return acc + (m.timingSlots?.length || 0) + (m.exactTimes?.length || 0);
      }, 0);

      const taken = logs.filter(l => 
        l.status === 'taken' && 
        activeMedIds.has(l.medicineId) &&
        getISTDateString(new Date(l.timestamp?.seconds * 1000 || l.timestamp)) === istString
      ).length;

      result.push({
        date: d,
        istString,
        taken,
        total: scheduledOnDay,
        percentage: scheduledOnDay > 0 ? (Math.min(taken, scheduledOnDay) / scheduledOnDay) * 100 : (taken > 0 ? 100 : 0)
      });
    }
    return result;
  }, [logs, activeMedicines]);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <CalendarIcon size={20} className="text-blue-600" />
          Medicine Goal Ledger
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Goal Met</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Partial</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-4">
        {days.map((day, idx) => (
          <motion.div 
            key={day.istString}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                {day.date.toLocaleDateString('en-IN', { weekday: 'short' })}
              </p>
              <p className="text-sm font-black text-slate-700">{day.date.getDate()}</p>
            </div>
            
            <div className="relative w-full aspect-square">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="40%"
                  className="fill-none stroke-slate-100 stroke-[4]"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="40%"
                  className={`fill-none stroke-[4] transition-all duration-1000 ${
                    day.percentage >= 100 ? 'stroke-emerald-500' : 'stroke-blue-500'
                  }`}
                  strokeDasharray="100 100"
                  strokeDashoffset={100 - day.percentage}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {day.percentage >= 100 ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <span className="text-[10px] font-black text-slate-400">
                    {day.taken}/{day.total}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
