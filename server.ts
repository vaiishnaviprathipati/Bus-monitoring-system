import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(process.env.DB_PATH || 'database.sqlite');

// --- DATABASE SETUP ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('citizen', 'admin'))
  );

  CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    busNumber TEXT UNIQUE,
    driverName TEXT,
    currentLatitude REAL,
    currentLongitude REAL,
    routeName TEXT,
    routeCoordinates TEXT, -- JSON string of [lat, lng][]
    speed REAL,
    nextStop TEXT,
    scheduledArrivalTime TEXT,
    actualArrivalTime TEXT,
    status TEXT CHECK(status IN ('On Time', 'Delayed'))
  );

  CREATE TABLE IF NOT EXISTS traffic (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    routeName TEXT UNIQUE,
    congestionLevel TEXT CHECK(congestionLevel IN ('Low', 'Medium', 'High'))
  );
`);

// --- SEED DATA ---
const seed = () => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  if (userCount.count === 0) {
    const adminHash = bcrypt.hashSync('admin123', 10);
    const citizenHash = bcrypt.hashSync('citizen123', 10);
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Admin User', 'admin@bus.com', adminHash, 'admin');
    db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Citizen User', 'citizen@bus.com', citizenHash, 'citizen');

    const route1 = JSON.stringify([
      [51.505, -0.09], [51.51, -0.1], [51.515, -0.11], [51.52, -0.12]
    ]);
    const route2 = JSON.stringify([
      [51.505, -0.08], [51.5, -0.07], [51.495, -0.06], [51.49, -0.05]
    ]);

    db.prepare('INSERT INTO buses (busNumber, driverName, currentLatitude, currentLongitude, routeName, routeCoordinates, speed, nextStop, scheduledArrivalTime, actualArrivalTime, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('BUS-101', 'John Doe', 51.505, -0.09, 'Route A', route1, 45, 'Central Station', '10:30', '10:30', 'On Time');
    db.prepare('INSERT INTO buses (busNumber, driverName, currentLatitude, currentLongitude, routeName, routeCoordinates, speed, nextStop, scheduledArrivalTime, actualArrivalTime, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('BUS-202', 'Jane Smith', 51.505, -0.08, 'Route B', route2, 30, 'North Park', '11:00', '11:15', 'Delayed');

    db.prepare('INSERT INTO traffic (routeName, congestionLevel) VALUES (?, ?)').run('Route A', 'Low');
    db.prepare('INSERT INTO traffic (routeName, congestionLevel) VALUES (?, ?)').run('Route B', 'High');
  }
};
seed();

// --- SERVER SETUP ---
async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  app.use(helmet({
    contentSecurityPolicy: false, // Disable for Leaflet tiles and Vite dev
  }));
  app.use(cors());
  app.use(express.json());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
  });
  app.use('/api/', limiter);

  const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-bus-key';

  // --- AUTH MIDDLEWARE ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      req.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch (e) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  const authorize = (role: string) => (req: any, res: any, next: any) => {
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };

  // --- ROUTES ---
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    
    // If user doesn't exist in DB, create a temporary one for this session
    if (!user) {
      const role = email.toLowerCase().includes('admin') ? 'admin' : 'citizen';
      const name = email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1);
      user = { id: Date.now(), name, role, email };
    }

    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { name: user.name, role: user.role, email: user.email } });
  });

  app.get('/api/buses', (req, res) => {
    const buses = db.prepare('SELECT * FROM buses').all();
    res.json(buses.map((b: any) => ({ ...b, routeCoordinates: JSON.parse(b.routeCoordinates) })));
  });

  app.get('/api/traffic', (req, res) => {
    const traffic = db.prepare('SELECT * FROM traffic').all();
    res.json(traffic);
  });

  app.post('/api/admin/broadcast', authenticate, authorize('admin'), (req, res) => {
    const { message } = req.body;
    io.emit('broadcast', { message, timestamp: new Date() });
    res.json({ success: true });
  });

  app.post('/api/admin/update-traffic', authenticate, authorize('admin'), (req, res) => {
    const { routeName, congestionLevel } = req.body;
    db.prepare('UPDATE traffic SET congestionLevel = ? WHERE routeName = ?').run(congestionLevel, routeName);
    io.emit('traffic_update', { routeName, congestionLevel });
    res.json({ success: true });
  });

  // --- SIMULATION ---
  setInterval(() => {
    const buses = db.prepare('SELECT * FROM buses').all() as any[];
    buses.forEach(bus => {
      const coords = JSON.parse(bus.routeCoordinates);
      // Simple movement simulation: pick a random point near current or move along route
      // For simplicity, let's just jitter the coordinates slightly
      const newLat = bus.currentLatitude + (Math.random() - 0.5) * 0.001;
      const newLng = bus.currentLongitude + (Math.random() - 0.5) * 0.001;
      
      db.prepare('UPDATE buses SET currentLatitude = ?, currentLongitude = ? WHERE id = ?')
        .run(newLat, newLng, bus.id);
      
      io.emit('bus_update', {
        id: bus.id,
        busNumber: bus.busNumber,
        lat: newLat,
        lng: newLng,
        speed: Math.floor(Math.random() * 20) + 30,
        status: bus.status
      });
    });
  }, 3000);

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }

  const PORT = 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
