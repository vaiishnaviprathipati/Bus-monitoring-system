import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, ShieldCheck, User, ArrowRight, Globe, Lock } from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16 relative z-10"
      >
        <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
          <Bus className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-5xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
          SMART TRANSIT SYSTEM
        </h1>
        <p className="text-white/40 max-w-lg mx-auto text-lg">
          Next-generation urban mobility monitoring and fleet management platform.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl relative z-10">
        {/* Citizen Portal Card */}
        <motion.div 
          whileHover={{ y: -10 }}
          onClick={() => navigate('/citizen-dashboard')}
          className="group cursor-pointer bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] hover:bg-white/10 transition-all hover:border-emerald-500/30"
        >
          <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <Globe className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Citizen Portal</h2>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            Real-time bus tracking, ETA calculations, and route alerts for everyday commuters.
          </p>
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            Enter Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
          </div>
        </motion.div>

        {/* Government Control Card */}
        <motion.div 
          whileHover={{ y: -10 }}
          onClick={() => navigate('/login?type=admin')}
          className="group cursor-pointer bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] hover:bg-white/10 transition-all hover:border-blue-500/30"
        >
          <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover:scale-110 transition-transform">
            <Lock className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Control Center</h2>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            Advanced fleet management, traffic control, and administrative broadcasting tools.
          </p>
          <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
            Access Control <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
          </div>
        </motion.div>
      </div>

      <div className="mt-20 text-white/20 text-[10px] uppercase tracking-[0.3em] font-bold">
        Secure Infrastructure • Real-Time Data • Urban Intelligence
      </div>
    </div>
  );
}
