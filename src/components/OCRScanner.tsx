import React, { useState, useRef } from 'react';
import { Camera, X, Loader2, CheckCircle2, AlertCircle, Upload, Sparkles, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ocrService, OCRResult } from '../services/ocrService.ts';
import { geminiService } from '../services/geminiService.ts';
import { inventoryService } from '../services/inventoryService.ts';
import { classifyItem } from '../services/categorizationService.ts';
import { PrescriptionReview } from './PrescriptionReview.tsx';
import type { Category, ExtractedPrescriptionItem } from '../types.ts';
import { Timestamp } from 'firebase/firestore';

interface OCRScannerProps {
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  aiMode?: 'astra' | 'quantis';
  elderlyMode?: boolean;
}

export const OCRScanner = ({ onClose, onSave, aiMode = 'astra', elderlyMode = false }: OCRScannerProps) => {
  const [scanType, setScanType] = useState<'medicine' | 'prescription' | null>(null);
  const [step, setStep] = useState<'type-select' | 'upload' | 'scanning' | 'confirm' | 'prescription-review'>('type-select');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<OCRResult | null>(null);
  const [prescriptionItems, setPrescriptionItems] = useState<ExtractedPrescriptionItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editData, setEditData] = useState({
    name: '',
    expiryDate: '',
    dosage: 'Standard',
    quantity: 1,
    unit: 'units',
    usagePerDay: 1,
    type: 'Medicine' as Category
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setStep('scanning');
    try {
      if (scanType === 'medicine') {
        const result = await ocrService.processImage(file);
        const autoCategory = await classifyItem(result.name);
        
        setOcrData(result);
        setEditData(prev => ({
          ...prev,
          name: result.name,
          expiryDate: result.expiryDate,
          type: autoCategory
        }));
        setStep('confirm');
      } else {
        // Prescription Mode
        const base64 = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.readAsDataURL(file);
        });
        const items = await geminiService.analyzePrescription(base64);
        setPrescriptionItems(items);
        setStep('prescription-review');
      }
    } catch (err) {
      console.error(err);
      setStep('upload');
      alert('Analysis Failed. Please try a clearer image.');
    }
  };

  const handleBatchSave = async (finalItems: any[]) => {
    setIsSaving(true);
    try {
      await inventoryService.batchAddMedicines(finalItems);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const parseDate = (dateStr: string) => {
    // Simple heuristic for parsing detected date string
    const parts = dateStr.split(/[\/\-]/);
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY or YYYY/MM/DD
      if (parts[0].length === 4) return new Date(dateStr);
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    } else if (parts.length === 2) {
       // MM/YYYY
       return new Date(`${parts[1]}-${parts[0]}-01`);
    }
    return new Date();
  };

  const handleConfirm = async () => {
    setIsSaving(true);
    try {
      const expiry = parseDate(editData.expiryDate);
      await onSave({
        name: editData.name,
        dosage: editData.dosage,
        quantity: editData.quantity,
        unit: editData.unit,
        usagePerDay: editData.usagePerDay,
        type: editData.type,
        expiryDate: Timestamp.fromDate(expiry),
        riskScore: Math.floor(Math.random() * 30), // Placeholder
        confidence: ocrData?.confidence || 0,
        status: 'active'
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-display font-bold text-slate-900">Neural Label Scan</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Smart OCR Intelligence</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {step === 'type-select' && (
              <motion.div 
                key="type-select"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6"
              >
                <button 
                  onClick={() => { setScanType('medicine'); setStep('upload'); }}
                  className="p-8 bg-blue-50 border-2 border-blue-100 rounded-[2.5rem] text-left group hover:border-blue-500 hover:bg-blue-100/50 transition-all"
                >
                  <div className="w-16 h-16 bg-white text-blue-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                    <Package size={32} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Medicine Package</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">Scan the product label for quick identification and expiry tracking.</p>
                </button>

                <button 
                  onClick={() => { setScanType('prescription'); setStep('upload'); }}
                  className="p-8 bg-indigo-50 border-2 border-indigo-100 rounded-[2.5rem] text-left group hover:border-indigo-500 hover:bg-indigo-100/50 transition-all"
                >
                  <div className="w-16 h-16 bg-white text-indigo-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                    <Sparkles size={32} />
                  </div>
                  <h4 className="text-xl font-bold text-slate-900 mb-2">Doctor Prescription</h4>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">Digitize multiple medicines at once with smart dosages and timings.</p>
                </button>
              </motion.div>
            )}

            {step === 'upload' && (
              <motion.div 
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center py-12"
              >
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-64 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera size={32} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Capture or Upload Label</p>
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG or High-res photos</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
              </motion.div>
            )}

            {step === 'scanning' && (
              <motion.div 
                key="scanning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-20 text-center"
              >
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-blue-50 rounded-full" />
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                    <Loader2 size={32} className="animate-pulse" />
                  </div>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Analyzing Pixels</h4>
                <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto text-balance">
                  Our neural engine is identifying product names and extracting expiry data from the label...
                </p>
              </motion.div>
            )}

            {step === 'confirm' && (
              <motion.div 
                key="confirm"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex gap-6">
                  <div className="w-1/3 shrink-0">
                    <img src={imagePreview!} alt="Label Preview" className="w-full aspect-[3/4] object-cover rounded-2xl border border-slate-100" />
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Confidence</span>
                        <span className="text-[10px] font-bold text-blue-600">{ocrData?.confidence}%</span>
                      </div>
                      <div className="h-1 w-full bg-white rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all" style={{ width: `${ocrData?.confidence || 0}%` }} />
                      </div>
                    </div>
                    {aiMode === 'astra' && (
                      <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                         <p className="text-[10px] font-bold text-indigo-600 flex items-center gap-1 mb-1 italic">
                           <Sparkles size={10} /> Elysia's Prescription Hint
                         </p>
                         <p className="text-[10px] text-indigo-500 font-medium leading-tight">
                           I've detected this might be a prescription. Would you like me to set up reminders for {editData.name}?
                         </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Detected Product</label>
                      <input 
                        type="text" 
                        value={editData.name}
                        onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                        placeholder="e.g. Amoxicillin 500mg"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Expiry Date</label>
                        <input 
                          type="text" 
                          value={editData.expiryDate}
                          onChange={e => setEditData(p => ({ ...p, expiryDate: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                          placeholder="DD/MM/YYYY"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Type</label>
                        <select 
                          value={editData.type}
                          onChange={e => setEditData(p => ({ ...p, type: e.target.value as any }))}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 appearance-none"
                        >
                          <option value="Medicine">Medicine</option>
                          <option value="Food">Food</option>
                          <option value="Supplement">Supplement</option>
                          <option value="Chemical">Chemical</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Quantity</label>
                        <input 
                          type="number" 
                          value={editData.quantity}
                          onChange={e => setEditData(p => ({ ...p, quantity: parseInt(e.target.value) }))}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Daily Usage</label>
                        <input 
                          type="number" 
                          value={editData.usagePerDay}
                          onChange={e => setEditData(p => ({ ...p, usagePerDay: parseFloat(e.target.value) }))}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                          placeholder="e.g. 2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Unit</label>
                        <input 
                          type="text" 
                          value={editData.unit}
                          onChange={e => setEditData(p => ({ ...p, unit: e.target.value }))}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                          placeholder="pills, ml, tablets"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-50">
                  <button 
                    onClick={() => setStep('upload')}
                    className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl text-xs font-bold hover:bg-slate-100 transition-all uppercase tracking-widest"
                  >
                    Retake Scan
                  </button>
                  <button 
                    onClick={handleConfirm}
                    disabled={isSaving}
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>Commit to Vault <ArrowRight size={18} /></>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'prescription-review' && (
              <motion.div 
                key="prescription-review"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <PrescriptionReview 
                  items={prescriptionItems} 
                  onSave={handleBatchSave}
                  onCancel={() => setStep('type-select')}
                  elderlyMode={elderlyMode}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

const ArrowRight = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);
