import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Bus, ShieldCheck, User, Loader2, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';

export default function Login() {
  const [searchParams] = useSearchParams();
  const portalType = searchParams.get('type') || 'citizen';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/login', { email, password });
      login(res.data.token, res.data.user);
      if (res.data.user.role === 'admin') {
        navigate('/government-dashboard');
      } else {
        navigate('/citizen-dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-[-10%] left-[-10%] w-[40%] h-[40%] ${portalType === 'admin' ? 'bg-blue-500/10' : 'bg-emerald-500/10'} rounded-full blur-[120px]`} />
        <div className={`absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] ${portalType === 'admin' ? 'bg-indigo-500/10' : 'bg-blue-500/10'} rounded-full blur-[120px]`} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className={`w-16 h-16 ${portalType === 'admin' ? 'bg-blue-500/20 border-blue-500/30' : 'bg-emerald-500/20 border-emerald-500/30'} rounded-2xl flex items-center justify-center mb-4 border`}>
              {portalType === 'admin' ? <Lock className="w-8 h-8 text-blue-400" /> : <Bus className="w-8 h-8 text-emerald-400" />}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {portalType === 'admin' ? 'Control Center' : 'Citizen Portal'}
            </h1>
            <p className="text-white/50 text-sm mt-1">
              {portalType === 'admin' ? 'Authorized Personnel Only' : 'Real-time Commuter Access'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 ml-1">Email Address</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none ${portalType === 'admin' ? 'focus:border-blue-500/50' : 'focus:border-emerald-500/50'} transition-colors`}
                  placeholder={portalType === 'admin' ? 'admin@fleet.com' : 'commuter@city.com'}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2 ml-1">Password</label>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none ${portalType === 'admin' ? 'focus:border-blue-500/50' : 'focus:border-emerald-500/50'} transition-colors`}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${portalType === 'admin' ? 'bg-blue-500 hover:bg-blue-400' : 'bg-emerald-500 hover:bg-emerald-400'} text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (portalType === 'admin' ? 'Login to Control' : 'Access Portal')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full mt-4 py-2 text-xs text-white/40 hover:text-white transition-colors"
            >
              ← Back to Home
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-white/30 text-xs">
              {portalType === 'admin' ? 'Encryption Active • Neural Link Secure' : 'Public Data Stream • City Verified'}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
