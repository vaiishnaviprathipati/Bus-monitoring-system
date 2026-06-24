import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { 
  Bus, 
  LayoutDashboard, 
  AlertCircle, 
  Settings, 
  LogOut, 
  Users, 
  Activity, 
  Clock, 
  Map as MapIcon,
  Send,
  TrendingUp,
  Shield,
  Zap,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Technical Bus Icon for Government
const AdminBusIcon = (color: string) => L.divIcon({
  className: 'admin-bus-icon',
  html: `<div class="relative">
          <div class="absolute -inset-2 bg-${color}-500/20 rounded-full animate-ping"></div>
          <div class="w-7 h-7 bg-${color}-600 rounded-lg border-2 border-white flex items-center justify-center shadow-2xl relative z-10">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

export default function GovernmentDashboard() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [buses, setBuses] = useState<any[]>([]);
  const [traffic, setTraffic] = useState<any[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    delayed: 0,
    onTime: 0,
    avgDelay: 0,
    activeDrivers: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      const [busRes, trafficRes] = await Promise.all([
        axios.get('/api/buses', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/traffic', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setBuses(busRes.data);
      setTraffic(trafficRes.data);
      updateStats(busRes.data);
    };
    fetchData();

    const socket = io();
    socket.on('bus_update', (data) => {
      setBuses(prev => {
        const updated = prev.map(b => b.id === data.id ? { ...b, currentLatitude: data.lat, currentLongitude: data.lng, speed: data.speed } : b);
        updateStats(updated);
        return updated;
      });
    });

    return () => { socket.disconnect(); };
  }, [token]);

  const updateStats = (data: any[]) => {
    const total = data.length;
    const delayed = data.filter(b => b.status === 'Delayed').length;
    const onTime = total - delayed;
    setStats({
      total,
      delayed,
      onTime,
      avgDelay: delayed > 0 ? 14 : 0,
      activeDrivers: total
    });
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg) return;
    await axios.post('/api/admin/broadcast', { message: broadcastMsg }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setBroadcastMsg('');
    alert('SYSTEM BROADCAST: Message sent to all citizen devices.');
  };

  const updateTrafficLevel = async (routeName: string, level: string) => {
    await axios.post('/api/admin/update-traffic', { routeName, congestionLevel: level }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setTraffic(prev => prev.map(t => t.routeName === routeName ? { ...t, congestionLevel: level } : t));
  };

  const selectedBus = buses.find(b => b.id === selectedBusId);

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-mono text-xs">
      {/* Sidebar: Technical Style */}
      <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col shadow-2xl">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tighter text-white">FLEET-OS</h1>
              <p className="text-[8px] text-blue-500 uppercase tracking-[0.3em] font-bold">Command Center</p>
            </div>
          </div>

          <nav className="space-y-2">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-4">System Nodes</p>
            {[
              { icon: LayoutDashboard, label: 'Overview', active: true },
              { icon: MapIcon, label: 'Network Map', active: false },
              { icon: BarChart3, label: 'Analytics', active: false },
              { icon: Zap, label: 'Live Comms', active: false },
              { icon: Settings, label: 'System Config', active: false },
            ].map((item, i) => (
              <button 
                key={i}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  item.active ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest text-[10px]">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/30">
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-black text-white truncate uppercase">{user?.name}</p>
                <p className="text-[8px] text-blue-500 uppercase tracking-widest font-bold">Root Admin</p>
              </div>
            </div>
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 rounded-lg transition-all border border-red-500/20">
              <LogOut className="w-3 h-3" /> Terminate Session
            </button>
          </div>
          <button 
            onClick={() => navigate('/')} 
            className="w-full py-2 text-[8px] text-slate-600 hover:text-slate-400 uppercase tracking-[0.4em] font-black transition-all text-center"
          >
            Exit to Gateway
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="p-8 bg-[#020617]/80 backdrop-blur-md border-b border-slate-800 flex justify-between items-center z-10">
          <div>
            <h2 className="text-2xl font-black tracking-tighter text-white uppercase">Network Operations Center</h2>
            <p className="text-slate-500 text-[10px] uppercase tracking-widest">Real-time Global Fleet Telemetry</p>
          </div>
          <div className="flex gap-6">
            <div className="bg-slate-900 border border-slate-800 px-5 py-2 rounded-xl flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <span className="text-[10px] font-black tracking-widest uppercase text-blue-400">Uptime: 99.9%</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 px-5 py-2 rounded-xl flex items-center gap-3">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black tracking-widest uppercase text-emerald-500">Live Feed Active</span>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: Map & Stats */}
          <div className="flex-1 flex flex-col p-8 space-y-8 overflow-y-auto">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: 'Fleet Units', value: stats.total, icon: Bus, color: 'blue' },
                { label: 'Anomalies', value: stats.delayed, icon: AlertCircle, color: 'red' },
                { label: 'Efficiency', value: `${Math.round((stats.onTime/stats.total)*100 || 0)}%`, icon: TrendingUp, color: 'emerald' },
                { label: 'Avg Latency', value: `${stats.avgDelay}m`, icon: Clock, color: 'orange' }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all"
                >
                  <div className={`w-10 h-10 bg-${stat.color}-500/10 rounded-lg flex items-center justify-center mb-4 border border-${stat.color}-500/20`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                  </div>
                  <p className="text-slate-500 text-[9px] uppercase tracking-widest font-black mb-1">{stat.label}</p>
                  <p className="text-3xl font-black tracking-tighter text-white">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Map Section */}
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden relative min-h-[400px]">
              <MapContainer center={[51.505, -0.09]} zoom={13} className="h-full w-full" zoomControl={false}>
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                {buses.map(bus => {
                  const busTraffic = traffic.find(t => t.routeName === bus.routeName);
                  let color = bus.status === 'On Time' ? 'emerald' : 'red';
                  if (busTraffic?.congestionLevel === 'High') color = 'orange';
                  
                  return (
                    <Marker 
                      key={bus.id} 
                      position={[bus.currentLatitude, bus.currentLongitude]} 
                      icon={AdminBusIcon(color)}
                      eventHandlers={{ click: () => setSelectedBusId(bus.id) }}
                    >
                      <Popup>
                        <div className="bg-slate-900 text-white p-3 font-mono text-[10px]">
                          <p className="font-black text-blue-400 mb-1">UNIT: {bus.busNumber}</p>
                          <p>ROUTE: {bus.routeName}</p>
                          <p className={`font-bold ${bus.status === 'On Time' ? 'text-emerald-400' : 'text-red-400'}`}>STATUS: {bus.status}</p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                {buses.map(bus => (
                  <Polyline 
                    key={`p-${bus.id}`} 
                    positions={bus.routeCoordinates} 
                    color={selectedBusId === bus.id ? '#3b82f6' : (bus.status === 'On Time' ? '#10b981' : '#ef4444')} 
                    weight={selectedBusId === bus.id ? 4 : 1} 
                    opacity={selectedBusId === bus.id ? 1 : 0.2} 
                  />
                ))}
              </MapContainer>

              {/* Legend Overlay */}
              <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-md p-4 rounded-xl border border-slate-800">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Network Legend</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Nominal</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Delayed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Congested</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Control Center Panels */}
          <aside className="w-96 bg-[#0F172A] border-l border-slate-800 p-8 space-y-8 overflow-y-auto">
            {/* Telemetry Panel (Selected Bus) */}
            <AnimatePresence mode="wait">
              {selectedBusId ? (
                <motion.div
                  key="telemetry"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-2xl space-y-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-black text-blue-400 tracking-tighter">TELEMETRY: {selectedBus?.busNumber}</h3>
                      <p className="text-[8px] text-slate-500 uppercase tracking-widest">Active Unit Monitoring</p>
                    </div>
                    <button onClick={() => setSelectedBusId(null)} className="text-slate-500 hover:text-white">
                      <Zap className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/40 p-3 rounded-xl border border-slate-800">
                      <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Velocity</p>
                      <p className="text-sm font-black text-white">{selectedBus?.speed} KM/H</p>
                    </div>
                    <div className="bg-black/40 p-3 rounded-xl border border-slate-800">
                      <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Status</p>
                      <p className={`text-sm font-black ${selectedBus?.status === 'On Time' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {selectedBus?.status}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Current Vector</p>
                      <p className="text-[10px] font-bold text-slate-300">{selectedBus?.routeName} → {selectedBus?.nextStop}</p>
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-500 uppercase font-bold mb-1">Operator</p>
                      <p className="text-[10px] font-bold text-slate-300">{selectedBus?.driverName}</p>
                    </div>
                  </div>

                  <button className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-[9px] rounded-xl transition-all shadow-lg shadow-blue-500/20">
                    Establish Comms
                  </button>
                </motion.div>
              ) : (
                <div className="bg-slate-900/50 border border-slate-800 border-dashed p-10 rounded-2xl text-center">
                  <Activity className="w-8 h-8 text-slate-700 mx-auto mb-4" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Select Unit for Telemetry</p>
                </div>
              )}
            </AnimatePresence>

            {/* Broadcast Control */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-500" /> Global Broadcast
              </h3>
              <textarea
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
                placeholder="Enter system-wide message..."
                className="w-full bg-black border border-slate-800 rounded-xl p-4 text-[10px] font-mono focus:outline-none focus:border-emerald-500/50 h-24 resize-none"
              />
              <button 
                onClick={handleBroadcast}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-[9px] py-3 rounded-xl transition-all"
              >
                Execute Broadcast
              </button>
            </div>

            {/* Traffic Override */}
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" /> Traffic Override
              </h3>
              <div className="space-y-2">
                {traffic.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-black rounded-xl border border-slate-800">
                    <div className="overflow-hidden">
                      <p className="text-[9px] font-black text-slate-300 truncate">{t.routeName}</p>
                      <p className={`text-[8px] font-bold ${t.congestionLevel === 'High' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {t.congestionLevel} LOAD
                      </p>
                    </div>
                    <select 
                      value={t.congestionLevel}
                      onChange={(e) => updateTrafficLevel(t.routeName, e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-lg text-[8px] p-1 focus:outline-none font-bold text-blue-400"
                    >
                      <option value="Low">LOW</option>
                      <option value="Medium">MED</option>
                      <option value="High">HIGH</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
