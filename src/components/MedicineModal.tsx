import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Save, Bell, Volume2, Globe, MessageSquare, 
  Clock, Calendar, AlertTriangle, ShieldCheck,
  ChevronRight, ChevronLeft, Mic, Repeat
} from 'lucide-react';
import { Medicine, Language, TimingSlot, MealRelation, RepeatPattern } from '../types.ts';
import { inventoryService } from '../services/inventoryService.ts';

interface MedicineModalProps {
  medicine?: Medicine | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  language: Language;
}

export const MedicineModal = ({ medicine, isOpen, onClose, onSave, language = 'English' }: MedicineModalProps) => {
  const [formData, setFormData] = useState<Partial<Medicine>>({
    name: '',
    brand: '',
    type: 'Medicine',
    dosage: '',
    quantity: 1,
    totalQuantity: 10,
    unit: 'Tablets',
    expiryDate: '',
    timingSlots: [],
    exactTimes: [],
    mealRelation: 'None',
    reminderEnabled: true,
    voiceAlarmType: 'default',
    voiceCustomMessage: '',
    voiceLanguage: language,
    alarmVolume: 100,
    alarmRepeatInterval: 1.5,
    status: 'active',
    repeatPattern: 'Daily'
  });

  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (medicine) {
      setFormData({
        ...medicine,
        expiryDate: medicine.expiryDate?.seconds 
          ? new Date(medicine.expiryDate.seconds * 1000).toISOString().split('T')[0]
          : medicine.expiryDate || ''
      });
    } else {
      setFormData({
        name: '',
        brand: '',
        type: 'Medicine',
        dosage: '',
        quantity: 1,
        totalQuantity: 30,
        unit: 'Tablets',
        expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        timingSlots: ['Morning'],
        exactTimes: [],
        mealRelation: 'After Food',
        reminderEnabled: true,
        voiceAlarmType: 'default',
        voiceCustomMessage: '',
        voiceLanguage: language,
        alarmVolume: 100,
        alarmRepeatInterval: 1.5,
        status: 'active',
        repeatPattern: 'Daily'
      });
    }
    setStep(1);
  }, [medicine, isOpen]);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      if (medicine?.id) {
        await inventoryService.updateMedicine(medicine.id, formData);
      } else {
        await inventoryService.addMedicine(formData as Medicine);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error saving medicine. Check your input.');
    } finally {
      setIsSaving(false);
    }
  };

  const timingSlots: TimingSlot[] = ['Morning', 'Afternoon', 'Evening', 'Night'];
  const languages: Language[] = ['English', 'Hindi', 'Telugu', 'Kannada'];

  const formatTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hours = parseInt(h);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${m} ${ampm}`;
  };

  const addExactTime = (time: string) => {
    if (!time) return;
    const current = formData.exactTimes || [];
    if (!current.includes(time)) {
      setFormData({ ...formData, exactTimes: [...current, time].sort() });
    }
  };

  const removeExactTime = (time: string) => {
    setFormData({
      ...formData,
      exactTimes: (formData.exactTimes || []).filter(t => t !== time)
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 pb-4 flex justify-between items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                <Bell size={12} /> {medicine ? 'Modify Record' : 'Vault Entry'}
              </div>
              <h2 className="text-3xl font-black text-slate-900 leading-tight">
                {formData.name || 'New Item'}
              </h2>
            </div>
            <button onClick={onClose} className="p-4 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>

          {/* Progress Tabs */}
          <div className="px-8 flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${step >= i ? 'bg-blue-600' : 'bg-slate-100'}`} />
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Item Name</label>
                    <input 
                      type="text" 
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-blue-500 focus:bg-white transition-all outline-none"
                      placeholder="e.g., Paracetamol"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Brand / Manufacturer</label>
                    <input 
                      type="text" 
                      value={formData.brand || ''}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold text-slate-700 focus:border-blue-500 focus:bg-white transition-all outline-none"
                      placeholder="e.g., GSK"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Stock (Current)</label>
                    <input 
                      type="number" 
                      value={formData.quantity || 0}
                      onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Stock (Refill Point)</label>
                    <input 
                      type="number" 
                      value={formData.totalQuantity || 0}
                      onChange={e => setFormData({...formData, totalQuantity: Number(e.target.value)})}
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Unit</label>
                    <select 
                      value={formData.unit || 'Tablets'}
                      onChange={e => setFormData({...formData, unit: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold appearance-none"
                    >
                      <option>Tablets</option>
                      <option>Capsules</option>
                      <option>ml</option>
                      <option>Units</option>
                      <option>Inhalations</option>
                      <option>Drops</option>
                    </select>
                  </div>
                  <div className="space-y-2 lg:col-span-1 col-span-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Expiry Date</label>
                    <input 
                      type="date" 
                      value={formData.expiryDate || ''}
                      onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Usage Per Day</label>
                    <input 
                      type="number" 
                      value={formData.usagePerDay || 1}
                      onChange={e => setFormData({...formData, usagePerDay: Number(e.target.value)})}
                      className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold"
                    />
                  </div>

                  <div className="lg:col-span-2 space-y-4 pt-4 border-t-2 border-slate-100">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Volume2 size={16} /> Voice Alarm Setup
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Alarm Mode</label>
                        <select 
                          value={formData.voiceAlarmType}
                          onChange={e => setFormData({...formData, voiceAlarmType: e.target.value as any})}
                          className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold appearance-none"
                        >
                          <option value="default">Default AI Alert</option>
                          <option value="custom">Custom Audio Msg</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Alarm Language</label>
                        <select 
                          value={formData.voiceLanguage}
                          onChange={e => setFormData({...formData, voiceLanguage: e.target.value as any})}
                          className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold appearance-none"
                        >
                          {languages.map(l => <option key={l}>{l}</option>)}
                        </select>
                      </div>
                    </div>

                    {formData.voiceAlarmType === 'custom' && (
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Custom Audio Content</label>
                        <textarea 
                          value={formData.voiceCustomMessage || ''}
                          onChange={e => setFormData({...formData, voiceCustomMessage: e.target.value})}
                          placeholder="e.g. Grandma, time for your morning vitmain C!"
                          className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold"
                          rows={2}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Repeat size={12} /> Repeat Interval (Min)
                        </label>
                        <input 
                          type="number" 
                          step="0.5"
                          min="0.5"
                          max="10"
                          value={formData.alarmRepeatInterval || 1.5}
                          onChange={e => setFormData({...formData, alarmRepeatInterval: Number(e.target.value)})}
                          className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <Volume2 size={12} /> Alarm Volume
                        </label>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={formData.alarmVolume || 80}
                          onChange={e => setFormData({...formData, alarmVolume: Number(e.target.value)})}
                          className="w-full mt-4"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} /> Schedule Timing
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {timingSlots.map(slot => (
                      <button
                        key={slot}
                        onClick={() => {
                          const current = formData.timingSlots || [];
                          const updated = current.includes(slot) 
                            ? current.filter(s => s !== slot)
                            : [...current, slot];
                          setFormData({...formData, timingSlots: updated as TimingSlot[]});
                        }}
                        className={`py-4 rounded-2xl border-2 font-black transition-all ${
                          formData.timingSlots?.includes(slot)
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14} /> Specific Alarm Times (Exact)
                  </label>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {formData.exactTimes?.map(time => (
                      <div 
                        key={time} 
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-xs shadow-lg animate-in fade-in zoom-in"
                      >
                        {formatTime(time)}
                        <button 
                          onClick={() => removeExactTime(time)}
                          className="hover:text-red-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {(!formData.exactTimes || formData.exactTimes.length === 0) && (
                      <p className="text-xs text-slate-400 italic">No specific alarms set yet...</p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border-2 border-slate-100 focus-within:border-blue-500 transition-all">
                    <div className="flex-1 flex items-center gap-3">
                      <Clock size={20} className="text-slate-400" />
                      <input 
                        type="time"
                        id="alarm-time-picker"
                        className="bg-transparent border-none font-bold text-slate-700 outline-none w-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            addExactTime((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('alarm-time-picker') as HTMLInputElement;
                        addExactTime(input.value);
                        input.value = '';
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20"
                    >
                      Add Alarm
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={14} /> Meal Relation
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['Before Food', 'After Food', 'Empty Stomach', 'None'] as MealRelation[]).map(relation => (
                      <button
                        key={relation}
                        onClick={() => setFormData({...formData, mealRelation: relation})}
                        className={`py-3 px-2 rounded-xl border-2 text-[10px] font-black transition-all ${
                          formData.mealRelation === relation
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-100 text-slate-400'
                        }`}
                      >
                        {relation}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Daily Dosage Description</label>
                  <input 
                    type="text" 
                    value={formData.dosage || ''}
                    onChange={e => setFormData({...formData, dosage: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold"
                    placeholder="e.g., 1 tablet twice daily"
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                <div className="p-6 bg-blue-50 rounded-[2rem] border-2 border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center">
                      <Bell size={24} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-blue-900">Enable AI Reminders</p>
                      <p className="text-[10px] font-bold text-blue-600/60 uppercase">Voice Alarms included</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setFormData({...formData, reminderEnabled: !formData.reminderEnabled})}
                    className={`w-14 h-8 rounded-full transition-all relative ${formData.reminderEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.reminderEnabled ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <AnimatePresence>
                  {formData.reminderEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-8"
                    >
                      <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <MessageSquare size={14} /> Voice Message Config
                        </label>
                        <div className="flex gap-4">
                          <button 
                            onClick={() => setFormData({...formData, voiceAlarmType: 'default'})}
                            className={`flex-1 py-4 rounded-2xl border-2 font-black transition-all ${
                              formData.voiceAlarmType === 'default' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-50 text-slate-400'
                            }`}
                          >
                            Default AI
                          </button>
                          <button 
                            onClick={() => setFormData({...formData, voiceAlarmType: 'custom'})}
                            className={`flex-1 py-4 rounded-2xl border-2 font-black transition-all ${
                              formData.voiceAlarmType === 'custom' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-slate-50 text-slate-400'
                            }`}
                          >
                            Custom
                          </button>
                        </div>
                        {formData.voiceAlarmType === 'custom' && (
                          <input 
                            type="text"
                            value={formData.voiceCustomMessage || ''}
                            onChange={e => setFormData({...formData, voiceCustomMessage: e.target.value})}
                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-2xl px-6 py-4 font-bold text-slate-700"
                            placeholder='e.g., "Don’t forget your night medicine"'
                          />
                        )}
                      </div>

                      <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Globe size={14} /> Preferred Voice Language
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {languages.map(lang => (
                            <button
                              key={lang}
                              onClick={() => setFormData({...formData, voiceLanguage: lang})}
                              className={`py-3 rounded-xl border-2 text-[10px] font-black tracking-widest transition-all ${
                                formData.voiceLanguage === lang
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-white border-slate-100 text-slate-400'
                              }`}
                            >
                              {lang}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="p-8 pt-4 bg-slate-50/50 flex gap-4">
            {step > 1 && (
              <button 
                onClick={() => setStep(s => s - 1)}
                className="px-8 py-5 bg-white border-2 border-slate-100 text-slate-600 rounded-[1.5rem] font-black hover:bg-slate-100 transition-all flex items-center gap-2"
              >
                <ChevronLeft size={20} /> Back
              </button>
            )}
            {step < 3 ? (
              <button 
                onClick={() => setStep(s => s + 1)}
                className="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Continue <ChevronRight size={20} />
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex-1 py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-emerald-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={20} /> Deploy Update
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
