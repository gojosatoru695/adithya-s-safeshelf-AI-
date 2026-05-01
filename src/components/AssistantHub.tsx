import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageSquare, X, Send, Bot, User, Loader2, Sparkles, AlertCircle, 
  ShoppingCart, BarChart2, Mic, MicOff, Globe, Settings2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { geminiService } from '../services/geminiService.ts';
import { Medicine } from '../services/inventoryService.ts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

type Mode = 'menu' | 'chat' | 'voice' | 'settings';

interface AssistantHubProps {
  medicines: Medicine[];
  onCommand: (command: string, args?: any) => void;
}

type LanguageCode = 'en-IN' | 'hi-IN' | 'te-IN' | 'kn-IN';

const LANGUAGES: { code: LanguageCode, label: string, native: string }[] = [
  { code: 'en-IN', label: 'English', native: 'English' },
  { code: 'hi-IN', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te-IN', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ' }
];

const FEEDBACK_MESSAGES: Record<LanguageCode, {
  processing: string;
  unknown: string;
  error: string;
}> = {
  'en-IN': { processing: 'Processing...', unknown: "I didn't catch that. Try 'Add medicine'.", error: 'Error encountered.' },
  'hi-IN': { processing: 'प्रक्रिया हो रही है...', unknown: "समझ नहीं आया। 'दवा जोड़ें' बोलें।", error: 'त्रुटि हुई।' },
  'te-IN': { processing: 'ప్రాసెస్ అవుతోంది...', unknown: "అర్థం కాలేదు. మళ్ళీ ప్రయత్నించండి.", error: 'లోపం సంభవించింది.' },
  'kn-IN': { processing: 'ಸಂಸ್ಕರಿಸಲಾಗುತ್ತಿದೆ...', unknown: "ಅರ್ಥವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.", error: 'ದೋಷ ಕಂಡುಬಂದಿದೆ.' }
};

export function AssistantHub({ medicines, onCommand }: AssistantHubProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('menu');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', content: 'SafeShelf AI Hub is ready. How can I help?', timestamp: new Date() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentLang, setCurrentLang] = useState<LanguageCode>('en-IN');
  const [showLangs, setShowLangs] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => { if (mode === 'chat') scrollToBottom(); }, [messages, mode]);

  // --- Voice Logic ---
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = currentLang;
      window.speechSynthesis.speak(utterance);
    }
  }, [currentLang]);

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = currentLang;
    recognition.onstart = () => { setIsListening(true); setTranscript('Listening...'); };
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      // Simple logic integration
      if (text.toLowerCase().includes('add')) onCommand('add');
      else if (text.toLowerCase().includes('expired')) onCommand('filter', 'expiring');
      speak(FEEDBACK_MESSAGES[currentLang].processing);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  // --- Chat Logic ---
  const handleSend = async (text: string = input) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    try {
      const response = await geminiService.chatQuery(text, medicines);
      setMessages(prev => [...prev, { id: (Date.now()+1).toString(), role: 'assistant', content: response, timestamp: new Date() }]);
    } catch {
      setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: 'AI Service error.', timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  const menuOptions = [
    { id: 'voice', label: 'Voice Assistant', icon: <Mic className="w-6 h-6" />, color: 'bg-rose-500', desc: 'Control via speech' },
    { id: 'chat', label: 'AI Chat', icon: <MessageSquare className="w-6 h-6" />, color: 'bg-indigo-600', desc: 'Natural conversations' },
    { id: 'summary', label: 'Inventory Summary', icon: <BarChart2 className="w-6 h-6" />, color: 'bg-amber-500', desc: 'Instant status update' },
    { id: 'settings', label: 'AI Settings', icon: <Settings2 className="w-6 h-6" />, color: 'bg-slate-600', desc: 'Languages & Config' }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[200]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-[400px] max-w-[calc(100vw-2rem)] min-h-[400px] max-h-[calc(100vh-8rem)] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className={`p-5 text-white flex items-center justify-between transition-colors bg-slate-900`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                  {mode === 'voice' ? <Mic /> : mode === 'chat' ? <MessageSquare /> : <Zap className="text-amber-400" />}
                </div>
                <div>
                  <h3 className="font-bold tracking-tight">SafeShelf Hub</h3>
                  <p className="text-[10px] opacity-70 uppercase tracking-widest font-semibold">
                    {mode === 'menu' ? 'Select Mode' : `${mode} Mode Active`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mode !== 'menu' && (
                  <button onClick={() => { setMode('menu'); setShowLangs(false); }} className="text-xs font-bold hover:bg-white/10 px-3 py-1 rounded-lg">Back</button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Container for Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
              {mode === 'menu' && (
                <div className="grid grid-cols-1 gap-3">
                  {menuOptions.map((opt) => (
                    <motion.button
                      whileHover={{ x: 5 }}
                      onClick={() => {
                        if (opt.id === 'summary') handleSend('Generate a summary of my current inventory.');
                        setMode(opt.id as any);
                      }}
                      key={opt.id}
                      className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                    >
                      <div className={`w-12 h-12 ${opt.color} text-white rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg`}>
                        {opt.icon}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-gray-900">{opt.label}</p>
                        <p className="text-xs text-gray-500 font-medium">{opt.desc}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {mode === 'chat' && (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white shadow-sm border border-gray-100 rounded-tl-none'}`}>
                        <div className="prose prose-sm prose-gray">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isLoading && <div className="text-xs text-indigo-600 animate-pulse font-bold">SafeShelf AI is composing...</div>}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {mode === 'voice' && (
                <div className="flex flex-col items-center justify-center h-full py-10 space-y-6">
                  <motion.button
                    animate={isListening ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    onClick={toggleListening}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-rose-500 text-white shadow-xl shadow-rose-200' : 'bg-slate-900 text-white'}`}
                  >
                    {isListening ? <Mic className="w-10 h-10" /> : <MicOff className="w-10 h-10" />}
                  </motion.button>
                  <div className="text-center">
                    <p className="font-bold text-gray-900">{isListening ? 'Listening...' : 'Tap Mic to Start'}</p>
                    <p className="text-xs text-gray-500 mt-2 max-w-[200px]">{transcript || 'Try saying "Add medicine" or "Check expiry"'}</p>
                  </div>
                </div>
              )}

              {mode === 'settings' && (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">AI Voice Language</p>
                  <div className="grid grid-cols-1 gap-2">
                    {LANGUAGES.map(lang => (
                      <button 
                        key={lang.code}
                        onClick={() => setCurrentLang(lang.code)}
                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${currentLang === lang.code ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        <span className="font-bold">{lang.native}</span>
                        <span className="text-xs opacity-60">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input Overlay for Chat */}
            {mode === 'chat' && (
              <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type your command..."
                  className="flex-1 px-4 py-3 bg-gray-100 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button type="submit" className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100"><Send size={20}/></button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center relative group cursor-pointer hover:bg-black transition-all"
      >
        <AnimatePresence mode="wait">
          {isOpen ? <X key="x" className="w-8 h-8" /> : <Bot key="bot" className="w-8 h-8" />}
        </AnimatePresence>
        {!isOpen && <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white animate-pulse" />}
      </motion.button>
    </div>
  );
}
