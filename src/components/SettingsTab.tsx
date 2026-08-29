import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  UserPlus,
  Mail, 
  Phone, 
  Globe, 
  Volume2, 
  Bell, 
  Scan, 
  FileText, 
  Shield, 
  Settings, 
  LogOut, 
  Trash2, 
  Clock, 
  Check,
  ChevronRight,
  Camera,
  Languages,
  Mic,
  Smartphone,
  CreditCard,
  LayoutGrid
} from 'lucide-react';
import { UserProfile, UserSettings, Language } from '../types.ts';

interface SettingsTabProps {
  profile: UserProfile | null;
  onUpdateProfile: (data: Partial<UserProfile>) => Promise<void>;
  onUpdateSettings: (settings: UserSettings) => Promise<void>;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onClearHistory: (type: 'scan' | 'voice') => void;
}

export const SettingsTab = ({ 
  profile, 
  onUpdateProfile, 
  onUpdateSettings,
  onLogout,
  onDeleteAccount,
  onClearHistory
}: SettingsTabProps) => {
  const [activeSection, setActiveSection] = useState<string>('profile');
  const [isSaving, setIsSaving] = useState(false);

  if (!profile) return null;

  const handleSettingChange = async (key: keyof UserSettings, value: any) => {
    const newSettings = { ...profile.settings, [key]: value } as UserSettings;
    await onUpdateSettings(newSettings);
  };

  const sections = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'voice', label: 'Voice & Language', icon: Mic },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    { id: 'ocr', label: 'OCR Scanner', icon: Scan },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'preferences', label: 'Inventory', icon: LayoutGrid },
    { id: 'refill', label: 'Refills', icon: CreditCard },
    { id: 'security', label: 'Privacy', icon: Shield },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Horizontal Navigation for Desktop/Mobile Optimization */}
      <div className="flex flex-wrap items-center gap-2 bg-white rounded-[2.5rem] border border-slate-100 p-2 shadow-sm sticky top-0 z-20 overflow-x-auto no-scrollbar">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest transition-all whitespace-nowrap ${
              activeSection === section.id 
                ? 'bg-slate-900 text-white shadow-lg' 
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <section.icon size={16} />
            {section.label}
          </button>
        ))}
        <div className="ml-auto pointer-events-auto pr-2">
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-6 py-3 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest text-rose-500 hover:bg-rose-50 transition-all whitespace-nowrap"
            >
              <LogOut size={16} />
              Logout
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-8">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-12 shadow-sm min-h-[600px]"
        >
          {/* Section: Profile */}
          {activeSection === 'profile' && (
            <div className="space-y-10">
              <header>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Profile Settings</h3>
                <p className="text-slate-400 text-sm font-medium">Manage your identity and contact information.</p>
              </header>

              <div className="flex flex-col md:flex-row gap-10 items-start">
                 <div className="w-32 h-32 bg-slate-100 rounded-[3rem] overflow-hidden relative group cursor-pointer border-4 border-white shadow-xl">
                    {profile.profilePicture ? (
                      <img src={profile.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                         <User size={48} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                       <Camera size={24} />
                    </div>
                 </div>
                 
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <Field 
                      label="Full Name" 
                      icon={User} 
                      value={profile.fullName} 
                      onChange={(e: any) => onUpdateProfile({ fullName: e.target.value })}
                    />
                    <Field 
                      label="Email Address" 
                      icon={Mail} 
                      value={profile.email} 
                      disabled 
                    />
                    <Field 
                      label="Phone Number" 
                      icon={Phone} 
                      value={profile.mobileNumber || ''} 
                      onChange={(e: any) => onUpdateProfile({ mobileNumber: e.target.value })}
                    />
                    <Field 
                      label="System Role" 
                      icon={UserPlus} 
                      value={profile.role} 
                      disabled 
                    />
                 </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex items-center justify-between">
                 <div>
                    <h4 className="text-sm font-black text-slate-900">Interface Language</h4>
                    <p className="text-xs text-slate-400 font-medium">Select your primary vault language.</p>
                 </div>
                 <div className="flex gap-2">
                    {['English', 'Hindi', 'Telugu', 'Kannada'].map((lang) => (
                      <button
                        key={lang}
                        onClick={() => onUpdateProfile({ preferredLanguage: lang as Language })}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          profile.preferredLanguage === lang ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {/* Section: Voice & Language */}
          {activeSection === 'voice' && (
            <div className="space-y-10">
              <header>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Voice & Language</h3>
                <p className="text-slate-400 text-sm font-medium">Configure Elysia assistant and voice notifications.</p>
              </header>

              <Toggle 
                label="Enable Voice Assistant" 
                description="Allow Elysia to process voice commands and speak reminders."
                checked={profile.settings?.enableVoiceAssistant ?? true}
                onChange={(v) => handleSettingChange('enableVoiceAssistant', v)}
              />

              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Reminder Voice Language</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {['English', 'Hindi', 'Telugu', 'Kannada'].map((lang) => (
                         <button
                           key={lang}
                           onClick={() => handleSettingChange('reminderVoiceLanguage', lang)}
                           className={`p-4 rounded-2xl text-xs font-black transition-all border ${
                             profile.settings?.reminderVoiceLanguage === lang ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                           }`}
                         >
                           {lang}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Slider 
                       label="Voice Volume" 
                       icon={Volume2} 
                       value={profile.settings?.voiceVolume ?? 80} 
                       onChange={(v) => handleSettingChange('voiceVolume', v)}
                    />
                    <Slider 
                       label="Alarm Repeat Count" 
                       icon={Clock} 
                       min={1} 
                       max={10} 
                       value={profile.settings?.alarmRepeatCount ?? 3} 
                       onChange={(v) => handleSettingChange('alarmRepeatCount', v)}
                    />
                 </div>

                 <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Custom Reminder Message</label>
                    <textarea 
                       className="w-full bg-white border border-slate-200 rounded-xl p-4 text-sm font-medium text-slate-700 h-24 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                       placeholder="e.g., Hi, it's time for your heart medicine..."
                       value={profile.settings?.customReminderMessage || ''}
                       onChange={(e) => handleSettingChange('customReminderMessage', e.target.value)}
                    />
                 </div>
              </div>
            </div>
          )}

          {/* Section: Reminders */}
          {activeSection === 'reminders' && (
            <div className="space-y-10">
               <header>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Reminder Preferences</h3>
                <p className="text-slate-400 text-sm font-medium">Customize how you receive alerts and dose schedules.</p>
              </header>

              <div className="space-y-4">
                 <Toggle 
                    label="Push Notifications" 
                    description="Receive alerts on your device for upcoming doses."
                    checked={profile.settings?.notificationsEnabled ?? true}
                    onChange={(v) => handleSettingChange('notificationsEnabled', v)}
                 />
                 <Toggle 
                    label="Repeat if Ignored" 
                    description="Keep reminding if a dose isn't logged as taken."
                    checked={profile.settings?.repeatIfIgnored ?? true}
                    onChange={(v) => handleSettingChange('repeatIfIgnored', v)}
                 />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <Slider 
                   label="Snooze Duration (Minutes)" 
                   icon={Clock} 
                   max={30} 
                   value={profile.settings?.snoozeDuration ?? 5} 
                   onChange={(v) => handleSettingChange('snoozeDuration', v)}
                 />
                 <div className="p-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Default Tone</p>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-blue-500"
                      value={profile.settings?.defaultReminderTone || 'soft-alert'}
                      onChange={(e) => handleSettingChange('defaultReminderTone', e.target.value)}
                    >
                       <option value="soft-alert">Soft Alert</option>
                       <option value="medical-beep">Medical Beep</option>
                       <option value="harsh-siren">Loud Siren</option>
                    </select>
                 </div>
              </div>
            </div>
          )}

          {/* Section: OCR Settings */}
          {activeSection === 'ocr' && (
            <div className="space-y-10">
              <header>
                <h3 className="text-2xl font-black text-slate-900 mb-2">OCR Scanner Config</h3>
                <p className="text-slate-400 text-sm font-medium">Fine-tune the AI vision system.</p>
              </header>

              <div className="space-y-6">
                <Toggle 
                   label="Auto-Save after Scan" 
                   description="Save medicines directly to vault once AI processing completes."
                   checked={profile.settings?.autoSaveOcr ?? false}
                   onChange={(v) => handleSettingChange('autoSaveOcr', v)}
                />
                <Toggle 
                   label="Require Confirmation" 
                   description="Review AI results before they are committed to inventory."
                   checked={profile.settings?.requireOcrConfirmation ?? true}
                   onChange={(v) => handleSettingChange('requireOcrConfirmation', v)}
                />
                <Toggle 
                   label="Show Confidence Scores" 
                   description="Display AI certainty percentages for scanned fields."
                   checked={profile.settings?.showConfidenceScore ?? true}
                   onChange={(v) => handleSettingChange('showConfidenceScore', v)}
                />
                
                 <div className="pt-6 border-t border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Default Scan Mode</p>
                   <div className="grid grid-cols-2 gap-4">
                      {['package', 'prescription'].map(mode => (
                        <button 
                          key={mode}
                          onClick={() => handleSettingChange('preferredScanMode', mode)}
                          className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-2 ${
                            profile.settings?.preferredScanMode === mode ? 'bg-blue-50 border-blue-600 text-blue-600' : 'bg-white border-slate-100 text-slate-400'
                          }`}
                        >
                           <Scan size={20} />
                           <span className="text-[10px] font-black uppercase tracking-widest">{mode}</span>
                        </button>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          )}

          {/* Section: Reports */}
          {activeSection === 'reports' && (
            <div className="space-y-10">
              <header>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Automated Reports</h3>
                <p className="text-slate-400 text-sm font-medium">Configure scheduled inventory auditing.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                 {['none', 'weekly', 'monthly'].map(freq => (
                   <button
                     key={freq}
                     onClick={() => handleSettingChange('reportFrequency', freq)}
                     className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-2 ${
                       profile.settings?.reportFrequency === freq ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 border-slate-100 text-slate-400'
                     }`}
                   >
                     <Clock size={20} />
                     <span className="text-xs font-black uppercase tracking-widest capitalize">{freq}</span>
                   </button>
                 ))}
              </div>

              <div className="space-y-6 pt-6 border-t border-slate-100">
                <Toggle 
                   label="Gmail Archive" 
                   description="Automatically send monthly reports to your registered email."
                   checked={profile.settings?.gmailDelivery ?? false}
                   onChange={(v) => handleSettingChange('gmailDelivery', v)}
                />
                <Toggle 
                   label="WhatsApp Sharing" 
                   description="Enable quick-share shortcuts for mobile status updates."
                   checked={profile.settings?.whatsappSharing ?? true}
                   onChange={(v) => handleSettingChange('whatsappSharing', v)}
                />
              </div>
            </div>
          )}

          {/* Section: Inventory */}
          {activeSection === 'preferences' && (
            <div className="space-y-10">
              <header>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Inventory Logic</h3>
                <p className="text-slate-400 text-sm font-medium">Define how your vault items are processed and sorted.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <Slider 
                   label="Low Stock Warning Threshold" 
                   icon={LayoutGrid} 
                   max={20} 
                   value={profile.settings?.lowStockThreshold ?? 5} 
                   onChange={(v) => handleSettingChange('lowStockThreshold', v)}
                 />
                 <Slider 
                   label="Expiry Warning Days" 
                   icon={Clock} 
                   max={90} 
                   value={profile.settings?.expiryWarningDays ?? 30} 
                   onChange={(v) => handleSettingChange('expiryWarningDays', v)}
                 />
              </div>

              <div className="pt-6 border-t border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Default Sort Order</p>
                 <div className="flex flex-wrap gap-3">
                    {['expiry', 'confidence', 'category'].map(sort => (
                       <button
                         key={sort}
                         onClick={() => handleSettingChange('sortBy', sort)}
                         className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                           profile.settings?.sortBy === sort ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-500'
                         }`}
                       >
                         {sort}
                       </button>
                    ))}
                 </div>
              </div>
            </div>
          )}

           {/* Section: Refills */}
           {activeSection === 'refill' && (
            <div className="space-y-10">
              <header>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Refill Strategy</h3>
                <p className="text-slate-400 text-sm font-medium">Automate your medicine procurement data.</p>
              </header>

              <Toggle 
                 label="Refill Reminders" 
                 description="Get alerted when stock is predicted to run out."
                 checked={profile.settings?.refillReminders ?? true}
                 onChange={(v) => handleSettingChange('refillReminders', v)}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Budget Preference</p>
                   <div className="flex gap-2 bg-slate-50 p-1 rounded-2xl">
                      {['economy', 'standard', 'premium'].map(b => (
                         <button
                           key={b}
                           onClick={() => handleSettingChange('refillBudget', b)}
                           className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                             profile.settings?.refillBudget === b ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'
                           }`}
                         >
                           {b}
                         </button>
                      ))}
                   </div>
                </div>
                <div>
                   <Field 
                      label="Preferred Platform" 
                      icon={Globe} 
                      placeholder="e.g., Generic, 1mg, Apollo"
                      value={profile.settings?.preferredRefillPlatform || ''}
                      onChange={(e: any) => handleSettingChange('preferredRefillPlatform', e.target.value)}
                   />
                </div>
              </div>
            </div>
          )}

          {/* Section: Privacy & Security */}
          {activeSection === 'security' && (
            <div className="space-y-10">
              <header>
                <h3 className="text-2xl font-black text-slate-900 mb-2">Privacy & Security</h3>
                <p className="text-slate-400 text-sm font-medium">Control your data and account visibility.</p>
              </header>

              <div className="space-y-4">
                 <button 
                  onClick={() => onClearHistory('scan')}
                  className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] hover:bg-slate-100 transition-all group"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                          <Scan size={20} />
                       </div>
                       <div className="text-left">
                          <p className="text-sm font-black text-slate-800">Clear Scan History</p>
                          <p className="text-xs text-slate-400">Permanently delete OCR temporary files.</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                 </button>

                 <button 
                  onClick={() => onClearHistory('voice')}
                  className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] hover:bg-slate-100 transition-all group"
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-amber-600 transition-colors">
                          <Mic size={20} />
                       </div>
                       <div className="text-left">
                          <p className="text-sm font-black text-slate-800">Clear Voice History</p>
                          <p className="text-xs text-slate-400">Remove voice interaction transcripts.</p>
                       </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                 </button>

                 <div className="pt-10 mt-10 border-t border-slate-100">
                    <button 
                      onClick={onDeleteAccount}
                      className="w-full flex items-center gap-4 p-6 bg-rose-50 rounded-[2rem] text-rose-600 hover:bg-rose-100 transition-all border border-rose-100"
                    >
                       <Trash2 size={20} />
                       <div className="text-left">
                          <p className="text-sm font-black">Delete Account</p>
                          <p className="text-xs font-medium text-rose-400">All data will be permanently wiped.</p>
                       </div>
                    </button>
                 </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

/* Auxiliary Components */

const Field = ({ label, value, icon: Icon, disabled = false, onChange, placeholder }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
    <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all ${disabled ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 focus-within:border-blue-400'}`}>
       <Icon size={18} className="text-slate-300 shrink-0" />
       <input 
          disabled={disabled}
          type="text" 
          placeholder={placeholder}
          value={value} 
          readOnly={!onChange || disabled}
          onChange={onChange}
          className="bg-transparent border-none p-0 text-sm font-bold text-slate-700 w-full outline-none focus:ring-0" 
       />
    </div>
  </div>
);

const Toggle = ({ label, description, checked, onChange }: any) => (
  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
    <div className="pr-4">
      <p className="text-sm font-black text-slate-800">{label}</p>
      <p className="text-xs text-slate-500 font-medium">{description}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}
    >
      <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${checked ? 'left-7' : 'left-1'}`} />
    </button>
  </div>
);

const Slider = ({ label, icon: Icon, value, min = 0, max = 100, onChange }: any) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
       <div className="flex items-center gap-2">
          <Icon size={14} className="text-slate-400" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
       </div>
       <span className="text-xs font-black text-blue-600">{value}</span>
    </div>
    <input 
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
    />
  </div>
);
