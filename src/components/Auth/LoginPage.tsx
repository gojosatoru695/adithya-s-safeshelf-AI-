import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ChevronRight, 
  Apple, 
  Facebook, 
  AlertCircle,
  Loader2,
  Scan,
  BellRing,
  BrainCircuit,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../../lib/firebase.ts';
import { userService } from '../../services/userService.ts';

interface LoginPageProps {
  onSignUpClick: () => void;
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSignUpClick, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await userService.updateLastLogin(userCredential.user.uid);
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('An error occurred during login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (providerType: 'google' | 'facebook' | 'apple') => {
    setLoading(true);
    setError(null);
    try {
      let provider;
      if (providerType === 'google') {
        provider = new GoogleAuthProvider();
      } else if (providerType === 'facebook') {
        provider = new FacebookAuthProvider();
      } else {
        provider = new OAuthProvider('apple.com');
      }

      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const profile = await userService.getProfile(user.uid);
      if (!profile) {
        // This is a sign up via social, but we'll redirect to a "complete profile" if needed
        // For now, well create a minimal profile if it doesn't exist
        await userService.createProfile({
          uid: user.uid,
          fullName: user.displayName || 'User',
          email: user.email || '',
          role: 'Household User',
          provider: providerType,
          preferredLanguage: 'English',
          onboardingCompleted: false,
          createdAt: new Date(),
          lastLogin: new Date()
        });
      } else {
        await userService.updateLastLogin(user.uid);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(`${providerType.charAt(0).toUpperCase() + providerType.slice(1)} login failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError(null);
    } catch (err: any) {
      setError('Failed to send reset email. Check your email address.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Side: Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-16 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full -mr-40 -mt-40 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-600/10 blur-[100px] rounded-full -ml-20 -mb-20"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <ShieldCheck className="text-white" size={28} />
            </div>
            <h1 className="text-3xl font-display font-bold tracking-tight">SafeShelf AI</h1>
          </div>
          
          <div className="space-y-8 max-w-md">
            <div>
              <h2 className="text-5xl font-display font-bold leading-tight mb-4">
                Smart inventory,<br />
                <span className="text-blue-400">safer living.</span>
              </h2>
              <p className="text-slate-400 text-lg">
                The ultimate AI-powered assistant for managing your family's medications, groceries, and essential supplies.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 pt-8">
              {[
                { icon: <Scan className="text-blue-400" />, title: 'OCR Scanning', desc: 'Scan labels to extract expiry dates instantly.' },
                { icon: <BellRing className="text-emerald-400" />, title: 'Expiry Alerts', desc: 'Get notified before your items go bad.' },
                { icon: <BrainCircuit className="text-purple-400" />, title: 'AI Assistant', desc: 'Personalized health & inventory insights.' },
                { icon: <LayoutDashboard className="text-amber-400" />, title: 'Refill Planning', desc: 'Automated shopping lists & smart refills.' }
              ].map((feature, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 + 0.3 }}
                  key={i} 
                  className="flex gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                    {feature.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 mb-1">{feature.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-slate-500 text-sm font-medium">
          &copy; 2026 SafeShelf AI. Trusted by 20,000+ families.
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-24 bg-white lg:bg-transparent">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">SafeShelf AI</h1>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h3 className="text-3xl font-display font-bold text-slate-900 mb-2">Welcome back</h3>
            <p className="text-slate-500">Sign in to your account to continue</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </motion.div>
            )}

            {resetSent && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3"
              >
                <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-emerald-600 font-medium">Password reset link sent to your email.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2 ml-1">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-12 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2 ml-1">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" 
              />
              <label htmlFor="remember" className="text-xs font-medium text-slate-500 cursor-pointer">Remember me for 30 days</label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  Sign In
                  <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="my-10 flex items-center gap-4 text-slate-300">
            <div className="flex-1 h-[1px] bg-slate-100"></div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Or continue with</span>
            <div className="flex-1 h-[1px] bg-slate-100"></div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <button 
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center py-3 px-4 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            </button>
            <button 
              onClick={() => handleSocialLogin('apple')}
              className="flex items-center justify-center py-3 px-4 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Apple className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleSocialLogin('facebook')}
              className="flex items-center justify-center py-3 px-4 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Facebook className="w-5 h-5 text-[#1877F2]" />
            </button>
          </div>

          <p className="mt-10 text-center text-sm font-medium text-slate-500">
            Don't have an account?{' '}
            <button 
              onClick={onSignUpClick}
              className="text-blue-600 font-bold hover:text-blue-700 underline-offset-4 hover:underline transition-all"
            >
              Sign up for free
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
};
