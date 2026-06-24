import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { 
  Bus, 
  MapPin, 
  Clock, 
  Navigation, 
  AlertTriangle, 
  ArrowLeft,
  ArrowRight,
  Activity, 
  Bell,
  Search,
  User,
  Gauge,
  Layers,
  Sparkles,
  Award,
  BatteryCharging,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Map Marker styling for dynamic rendering
const CitizenBusIcon = L.divIcon({
  className: 'citizen-bus-icon',
  html: `<div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-emerald-500/30 rounded-full animate-ping"></div>
          <div class="w-10 h-10 bg-emerald-600 rounded-2xl border-4 border-white flex items-center justify-center shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-white"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s1-1 1-2V7s0-1-1-1h-3"/><path d="M3 18h3s1-1 1-2V7s0-1-1-1H3"/><path d="M3 6v12"/><path d="M21 6v12"/></svg>
          </div>
        </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

// Component to dynamically pan and zoom the map to current bus coordinates
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 15, { duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

export default function CitizenDashboard() {
  const navigate = useNavigate();
  // We use standard authentication if available, otherwise fallback gracefully
  const auth = useAuth();
  const token = auth?.token;

  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Transition steps: 1 = Selector, 2 = Live ETA & Tracking, 3 = Bus & Crew Details
  const [activeSlide, setActiveSlide] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const fetchBusesAndTraffic = async () => {
      try {
        setLoading(true);
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get('/api/buses', { headers });
        setBuses(res.data);
        if (res.data.length > 0) {
          setSelectedBusId(res.data[0].id);
        }
        setErrorText('');
      } catch (err: any) {
        console.error('Failure fetching live fleet nodes:', err);
        // Fallback simulated bus records for stable standalone preview
        const mockBuses = [
          {
            id: 1,
            busNumber: 'BUS-101',
            driverName: 'John Doe',
            currentLatitude: 51.505,
            currentLongitude: -0.09,
            routeName: 'Route A',
            routeCoordinates: [[51.505, -0.09], [51.51, -0.1], [51.515, -0.11], [51.52, -0.12]],
            speed: 46,
            nextStop: 'Central Station',
            scheduledArrivalTime: '10:30',
            actualArrivalTime: '10:30',
            status: 'On Time'
          },
          {
            id: 2,
            busNumber: 'BUS-202',
            driverName: 'Jane Smith',
            currentLatitude: 51.505,
            currentLongitude: -0.08,
            routeName: 'Route B',
            routeCoordinates: [[51.505, -0.08], [51.5, -0.07], [51.495, -0.06], [51.49, -0.05]],
            speed: 32,
            nextStop: 'North Park Mall',
            scheduledArrivalTime: '11:00',
            actualArrivalTime: '11:15',
            status: 'Delayed'
          }
        ];
        setBuses(mockBuses);
        setSelectedBusId(mockBuses[0].id);
      } finally {
        setLoading(false);
      }
    };

    fetchBusesAndTraffic();

    // Start live websockets with generic connection
    const socket = io();
    socket.on('bus_update', (data) => {
      setBuses(prev => prev.map(b => b.id === data.id ? { 
        ...b, 
        currentLatitude: data.lat, 
        currentLongitude: data.lng, 
        speed: data.speed,
        status: data.status || b.status
      } : b));
    });

    socket.on('broadcast', (data) => {
      setNotifications(prev => [{ ...data, id: Date.now() }, ...prev].slice(0, 3));
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const selectedBus = buses.find(b => b.id === selectedBusId);
  
  const filteredBuses = buses.filter(b => 
    b.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.routeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateDelay = (sched: string, actual: string) => {
    if (!sched || !actual) return 0;
    try {
      const [sH, sM] = sched.split(':').map(Number);
      const [aH, aM] = actual.split(':').map(Number);
      const diff = (aH * 60 + aM) - (sH * 60 + sM);
      return diff > 0 ? diff : 0;
    } catch {
      return 0;
    }
  };

  const delayValue = selectedBus ? calculateDelay(selectedBus.scheduledArrivalTime, selectedBus.actualArrivalTime) : 0;

  const selectBusAndAdvance = (id: number) => {
    setSelectedBusId(id);
    setActiveSlide(2); // Auto advance to Tracking View on selection
  };

  return (
    <div id="citizen-dashboard-container" className="flex h-screen bg-[#F1F5F9] text-slate-800 overflow-hidden font-sans">
      
      {/* Dynamic Slide-By-Slide Left Sidebar Controller */}
      <aside className="w-[420px] bg-white border-r border-slate-200 flex flex-col shadow-2xl z-20">
        
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-900 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Bus className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-white">CityCommuter</h1>
              <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Public Transit Gateway</p>
            </div>
          </div>
        </div>

        {/* Stepper Wizard Indicator Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-1 w-full">
            {[
              { num: 1, label: 'Search' },
              { num: 2, label: 'ETA Focus' },
              { num: 3, label: 'Metadata' }
            ].map(step => (
              <React.Fragment key={step.num}>
                <button 
                  onClick={() => {
                    if (selectedBusId || step.num === 1) {
                      setActiveSlide(step.num);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all text-xs font-bold ${
                    activeSlide === step.num 
                    ? 'bg-emerald-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    activeSlide === step.num ? 'bg-white text-emerald-600' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step.num}
                  </span>
                  <span>{step.label}</span>
                </button>
                {step.num < 3 && <div className="flex-1 h-0.5 bg-slate-200 mx-1"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Dynamic Multi-Slide Content Frame */}
        <div className="flex-1 overflow-y-auto p-6 relative">
          
          <AnimatePresence mode="wait">
            
            {/* SLIDE 1: Route Selection Panel */}
            {activeSlide === 1 && (
              <motion.div
                key="slide-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Select Transit Route</h2>
                  <p className="text-xs text-slate-500 mt-1">Search the running fleet mesh to find your regular commuter bus.</p>
                </div>

                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Type Bus identifier or Route name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900"
                  />
                </div>

                {loading ? (
                  <div className="text-center py-10 space-y-2">
                    <div className="w-8 h-8 rounded-full border-2 border-t-emerald-600 border-slate-200 animate-spin mx-auto"></div>
                    <p className="text-xs text-slate-400">Pinging node clusters...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBuses.map(bus => (
                      <button
                        key={bus.id}
                        onClick={() => selectBusAndAdvance(bus.id)}
                        className={`w-full p-4 rounded-2xl border transition-all text-left flex items-start justify-between group ${
                          selectedBusId === bus.id 
                          ? 'bg-emerald-50 border-emerald-500 shadow-md shadow-emerald-500/5' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            selectedBusId === bus.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Bus className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                                {bus.busNumber}
                              </span>
                              <span className={`text-[9px] px-2 py-0.5 font-bold rounded-full ${
                                bus.status === 'On Time' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {bus.status}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-700 mt-0.5">{bus.routeName}</p>
                            <p className="text-[10px] text-slate-400 mt-1">Next: {bus.nextStop}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400">ETA</p>
                          <p className="text-sm font-black text-slate-800">{bus.actualArrivalTime}</p>
                        </div>
                      </button>
                    ))}

                    {filteredBuses.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        <p className="text-xs font-bold">No active vehicles found</p>
                        <p className="text-[10px] mt-1">Try resetting the search parameter</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* SLIDE 2: Tracking ETA & Active Timers Panel */}
            {activeSlide === 2 && (
              <motion.div
                key="slide-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setActiveSlide(1)}
                    className="p-1 px-2.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold hover:bg-slate-200 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="text-xs font-bold text-slate-400">Step 2 of 3</span>
                </div>

                {selectedBus ? (
                  <div className="space-y-6">
                    <div className="p-5 bg-emerald-600 rounded-[2rem] text-white space-y-4 shadow-xl shadow-emerald-500/10 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-8 -translate-y-8"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-200">Tracking Node</p>
                          <h3 className="text-2xl font-black tracking-tight">{selectedBus.busNumber}</h3>
                        </div>
                        <span className="bg-white/20 border border-white/22 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-white">
                          Live ETA Timer
                        </span>
                      </div>

                      <div className="pt-2">
                        <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">Projected Arrival</p>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-5xl font-black tracking-tighter">{selectedBus.actualArrivalTime}</span>
                          <span className="text-sm font-bold opacity-80">UTC</span>
                        </div>
                        <p className="text-[10px] text-emerald-200 mt-2">
                          Scheduled Schedule Target: <span className="font-bold underline">{selectedBus.scheduledArrivalTime}</span>
                        </p>
                      </div>
                    </div>

                    {/* Delay Alarm Notification */}
                    {delayValue > 0 ? (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3.5">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-extrabold text-amber-800 uppercase tracking-wide">Transit Lag Warning</h4>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Vehicle is running <span className="font-black text-amber-950">+{delayValue} minutes</span> behind schedule due to upstream load.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3.5">
                        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wide">Optimal Schedule Log</h4>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            This transport unit is performing nominally and is fully on schedule. No delays.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Live Tracker details container */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Sector</p>
                          <p className="text-sm font-bold text-slate-800">{selectedBus.routeName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Navigation className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target Stop</p>
                          <p className="text-sm font-bold text-slate-800">{selectedBus.nextStop}</p>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveSlide(3)}
                      className="w-full py-4 bg-slate-900 hover:bg-slate-850 text-white font-black uppercase text-xs tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                    >
                      Inspect Vessel & Driver <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Please select a transit route on Slide 1 first.</p>
                )}
              </motion.div>
            )}

            {/* SLIDE 3: Vessel Telemetry & Crew Metadata */}
            {activeSlide === 3 && (
              <motion.div
                key="slide-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setActiveSlide(2)}
                    className="p-1 px-2.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold hover:bg-slate-200 flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <span className="text-xs font-bold text-slate-400">Step 3 of 3</span>
                </div>

                {selectedBus ? (
                  <div className="space-y-5">
                    
                    {/* Part A: Crew & Captain Details */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <User className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">Operator Information</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Certified City Captain</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Driver Name</p>
                          <p className="text-xs font-extrabold text-slate-800">{selectedBus.driverName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Duty Rating</p>
                          <p className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-amber-500" /> 5.0 Commuted
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Part B: Physical Vessel / Hardware Info */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-full bg-slate-150 flex items-center justify-center">
                        <BatteryCharging className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900">Vessel Configuration</h4>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">E-BUS Platform EV-400</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hardware Code</p>
                          <p className="text-xs font-extrabold text-slate-800">{selectedBus.busNumber}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Velocity</p>
                          <p className="text-xs font-extrabold text-slate-800">{selectedBus.speed} km/h</p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <span>Route Congestion Factor</span>
                          <span className={selectedBus.status === 'Delayed' ? 'text-red-500' : 'text-emerald-500'}>
                            {selectedBus.status === 'Delayed' ? 'Cramped (High)' : 'Fluent (Low)'}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                          <div className={`h-full transition-all ${
                            selectedBus.status === 'Delayed' ? 'w-4/5 bg-red-500' : 'w-1/4 bg-emerald-500'
                          }`}></div>
                        </div>
                      </div>
                    </div>

                    {/* Safety Verification Footer */}
                    <div className="p-4 bg-slate-50 rounded-2xl text-center border border-slate-100">
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Global Fleet telemetry verified</p>
                      <button 
                        onClick={() => setActiveSlide(1)}
                        className="mt-3 text-xs font-extrabold text-emerald-600 hover:text-emerald-700 underline"
                      >
                        Reset To Route Finder Node
                      </button>
                    </div>

                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Please select a transit route on Slide 1 first.</p>
                )}
              </motion.div>
            )}
            
          </AnimatePresence>

          {/* City Broadcasts Notifications Indicator Overlay */}
          <AnimatePresence>
            {notifications.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 z-30">
                <div className="p-3 bg-slate-900 text-white rounded-2xl border border-slate-800 flex items-center justify-between gap-2 shadow-2xl">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
                    <p className="text-[10px] truncate max-w-[200px] text-slate-300">
                      {notifications[0].message}
                    </p>
                  </div>
                  <button 
                    onClick={() => setNotifications([])} 
                    className="text-[9px] uppercase tracking-wider font-extrabold text-slate-500 hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </AnimatePresence>

        </div>

      </aside>

      {/* Main Map Engine Frame */}
      <main className="flex-1 relative flex flex-col">
        {selectedBus ? (
          <MapContainer 
            center={[selectedBus.currentLatitude, selectedBus.currentLongitude]} 
            zoom={15} 
            className="h-full w-full"
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap'
            />
            
            {/* Custom map pin that stays exactly aligned */}
            <Marker position={[selectedBus.currentLatitude, selectedBus.currentLongitude]} icon={CitizenBusIcon}>
              <Popup>
                <div className="p-2 text-slate-900 font-mono text-xs">
                  <p className="font-extrabold text-emerald-600">UNIT: {selectedBus.busNumber}</p>
                  <p className="text-slate-500 font-bold">ROUTE: {selectedBus.routeName}</p>
                  <p className="text-slate-400 mt-1">Driver: {selectedBus.driverName}</p>
                </div>
              </Popup>
            </Marker>

            {/* Simulated route coordinate connection path */}
            <Polyline 
              positions={selectedBus.routeCoordinates} 
              color="#059669" 
              weight={6} 
              opacity={0.3} 
              lineJoin="round"
            />
            
            <MapUpdater center={[selectedBus.currentLatitude, selectedBus.currentLongitude]} />
          </MapContainer>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-100">
            <div className="text-center space-y-3">
              <Globe className="w-12 h-12 text-slate-300 animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-extrabold">Awaiting initial satellite hookup...</p>
            </div>
          </div>
        )}
      </main>

    </div>
  );
}
