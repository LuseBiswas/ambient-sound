import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupSignaling } from './signaling';
import { createUser, findUserByEmail, verifyPassword } from './store';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from './auth';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ── Auth endpoints ────────────────────────────────────────────────────────────

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ error: 'Email and password (min 8 chars) required' });
    }
    const user = await createUser(email.toLowerCase().trim(), password);
    const accessToken = signAccessToken({ userId: user.id, email: user.email, roomId: user.roomId, role: 'transmitter' });
    const refreshToken = signRefreshToken(user.id);
    res.status(201).json({ accessToken, refreshToken, roomId: user.roomId });
  } catch (err: any) {
    res.status(409).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  const user = await findUserByEmail(email.toLowerCase().trim());
  if (!user || !(await verifyPassword(user, password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const accessToken = signAccessToken({ userId: user.id, email: user.email, roomId: user.roomId, role: 'transmitter' });
  const refreshToken = signRefreshToken(user.id);
  res.json({ accessToken, refreshToken, roomId: user.roomId });
});

app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired refresh token' });

  // Lookup user to get current roomId
  const { findUserById } = await import('./store');
  const user = findUserById(payload.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });

  const newAccessToken = signAccessToken({ userId: user.id, email: user.email, roomId: user.roomId, role: 'transmitter' });
  res.json({ accessToken: newAccessToken });
});

// ── ICE config endpoint (serves TURN credentials to authenticated clients) ───

app.get('/ice-config', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const { verifyAccessToken } = require('./auth');
  if (!token || !verifyAccessToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }

  res.json({ iceServers });
});

// ── Token endpoint for receiver role (owner generates a receiver token) ──────

app.post('/auth/receiver-token', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const { verifyAccessToken, signAccessToken } = require('./auth');
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  // Issue a receiver-scoped token for the same room
  const receiverToken = signAccessToken({
    userId: payload.userId,
    email: payload.email,
    roomId: payload.roomId,
    role: 'receiver',
  });
  res.json({ receiverToken });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── HTTP + WebSocket server ───────────────────────────────────────────────────

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
setupSignaling(wss);

const PORT = Number(process.env.PORT ?? 3001);
httpServer.listen(PORT, () => {
  console.log(`Ambient Monitor server running on http://localhost:${PORT}`);
  console.log(`WebSocket signaling available on ws://localhost:${PORT}/ws`);
});
