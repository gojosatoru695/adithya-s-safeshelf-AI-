import { Language } from '../types.ts';

export interface ReminderConfig {
  medicineName: string;
  timing: string;
  language: Language;
  customMessage?: string;
  volume?: number;
}

const VOICE_MAP: Record<Language, string[]> = {
  'English': ['en-US', 'en-GB', 'en-IN', 'en-AU'],
  'Hindi': ['hi-IN', 'hi_IN', 'hi'],
  'Telugu': ['te-IN', 'te_IN', 'te'],
  'Kannada': ['kn-IN', 'kn_IN', 'kn']
};

const MESSAGES: Record<Language, (name: string, timing: string) => string> = {
  'English': (name, timing) => `It is time to take your medicine ${name}. Please take your dose for ${timing}.`,
  'Hindi': (name, timing) => `रिमाइंडर: आपके ${timing} के लिए ${name} लेने का समय हो गया है।`,
  'Telugu': (name, timing) => `రిమైండర్: మీ ${timing} కోసం ${name} తీసుకునే సమయం ఆసన్నమైంది.`,
  'Kannada': (name, timing) => `ಜ್ಞಾಪನೆ: ನಿಮ್ಮ ${timing} ಗಾಗಿ ${name} ತೆಗೆದುಕೊಳ್ಳುವ ಸಮಯವಾಗಿದೆ.`
};

export const reminderService = {
  speak: (config: ReminderConfig) => {
    if (!window.speechSynthesis) return;

    // Reset synthesis queue
    window.speechSynthesis.cancel();

    const message = config.customMessage || MESSAGES[config.language](config.medicineName, config.timing);
    const utterance = new SpeechSynthesisUtterance(message);
    
    const getBestVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferredCodes = VOICE_MAP[config.language];
      return voices.find(v => preferredCodes.some(code => v.lang.includes(code))) || voices[0];
    };

    const bestVoice = getBestVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    } else {
      utterance.lang = VOICE_MAP[config.language][0];
    }
    
    utterance.rate = 0.9;
    utterance.volume = config.volume ?? 1.0;
    
    window.speechSynthesis.speak(utterance);
    return utterance;
  },

  notify: (config: ReminderConfig) => {
    if (!("Notification" in window)) return;

    const message = config.customMessage || MESSAGES[config.language](config.medicineName, config.timing);
    
    if (Notification.permission === "granted") {
      new Notification("SafeShelf Voice Reminder", {
        body: message,
        icon: "/vite.svg",
        requireInteraction: true // Keep notification until user interacts
      });
    }
  },

  triggerReminder: (config: ReminderConfig) => {
    reminderService.notify(config);
    return reminderService.speak(config);
  }
};
