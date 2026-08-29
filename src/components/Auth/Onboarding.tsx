import React, { useState } from 'react';
import { 
  Package, 
  Bell, 
  BrainCircuit, 
  Smartphone, 
  ChevronRight, 
  CheckCircle2,
  Sparkles,
  ArrowRight,
  User,
  Globe,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { userService } from '../../services/userService.ts';
import { Language } from '../../types.ts';

interface OnboardingProps {
  uid: string;
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ uid, onComplete }) => {
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [role, setRole] = useState<'Household User' | 'Elderly User'>('Household User');
  const [language, setLanguage] = useState<Language>('English');
  const [reminderTimes, setReminderTimes] = useState<Record<string, string>>({
    'Morning': '09:00',
    'Afternoon': '14:00',
    'Evening': '18:00',
    'Night': '21:00'
  });

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      await userService.updateProfile(uid, {
        role,
        preferredLanguage: language,
        onboardingCompleted: true,
        // Optional: Save reminder times to profile if you want to persist across devices
        // @ts-ignore
        reminderTimes 
      });
      onComplete();
    }
  };

  const stepsContent = [
    {
      icon: User,
      iconColor: "text-blue-500",
      title: "Who's using SafeShelf?",
      desc: "Tailoring the interface to your needs.",
      button: "Continue"
    },
    {
      icon: Package,
      iconColor: "text-emerald-500",
      title: "Add your first item",
      desc: "Start by scanning a medicine or food label. SafeShelf will automatically track its expiry and usage.",
      button: "Got it"
    },
    {
      icon: Bell,
      iconColor: "text-pink-500",
      title: "Reminder Preferences",
      desc: "Customize how you want to be alerted. We support push notifications, and voice reminders.",
      button: "Configure"
    },
    {
      icon: BrainCircuit,
      iconColor: "text-purple-500",
      title: "Choose AI Mode",
      desc: "Select between 'Standard' for basics or 'Advanced' for multi-factor risk analysis and predictive refills.",
      button: "Set Mode"
    },
    {
      icon: Smartphone,
      iconColor: "text-amber-500",
      title: "Enable Notifications",
      desc: "Allow SafeShelf to keep you safe in real-time. We'll only bug you when it's critical.",
      button: "Finish Setup"
    }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl my-auto"
      >
        <div className="bg-slate-900 p-6 sm:p-8 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full -mr-20 -mt-20"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest text-blue-400">
                <Sparkles size={12} /> New Account Onboarding
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Step {step} / {totalSteps}
              </div>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-black mb-1 sm:mb-2">Welcome to SafeShelf AI</h2>
            <p className="text-[10px] sm:text-xs text-slate-400">Let's get your safe-sync configured.</p>
            
            <div className="flex gap-1.5 mt-4 sm:mt-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div 
                  key={i} 
                  className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-white/10'}`} 
                />
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div 
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                {React.createElement(stepsContent[step - 1].icon, { 
                  size: 28, 
                  className: stepsContent[step - 1].iconColor 
                })}
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-4">{stepsContent[step - 1].title}</h3>
              
              {step === 1 ? (
                <div className="space-y-4 text-left max-w-sm mx-auto mb-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Account Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Household User', 'Elderly User'] as const).map(r => (
                        <button
                          key={r}
                          onClick={() => setRole(r)}
                          className={`p-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-wider ${
                            role === r 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block ml-1">Preferred Language</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['English', 'Hindi', 'Telugu', 'Kannada'] as Language[]).map(l => (
                        <button
                          key={l}
                          onClick={() => setLanguage(l)}
                          className={`p-3 rounded-xl border-2 transition-all text-[10px] font-black uppercase tracking-wider ${
                            language === l 
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                              : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : step === 3 ? (
                <div className="space-y-3 text-left max-w-sm mx-auto mb-6">
                  <p className="text-slate-500 text-xs font-medium mb-3">{stepsContent[step - 1].desc}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(reminderTimes).map(([slot, time]) => (
                      <div key={slot} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <Clock className="text-blue-500" size={16} />
                          <span className="text-xs font-bold text-slate-700">{slot}</span>
                        </div>
                        <input 
                          type="time" 
                          value={time}
                          onChange={(e) => setReminderTimes(prev => ({ ...prev, [slot]: e.target.value }))}
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-sm leading-relaxed mb-6 max-w-sm mx-auto">
                  {stepsContent[step - 1].desc}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="flex-1 py-3 bg-slate-50 text-slate-500 rounded-xl font-bold hover:bg-slate-100 transition-all text-sm"
              >
                Back
              </button>
            )}
            <button 
              onClick={handleNext}
              className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group text-sm"
            >
              {stepsContent[step - 1].button}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
