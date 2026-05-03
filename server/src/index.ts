import 'dotenv/config';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupSignaling, getActiveTransmitters } from './signaling';
import { createUser, findUserByEmail, findUserById, verifyPassword } from './store';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './auth';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7) : null;
  const payload = token ? verifyAccessToken(token) : null;
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  (req as any).user = payload;
  next();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password || password.length < 8)
      return res.status(400).json({ error: 'Email and password (min 8 chars) required' });
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
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = await findUserByEmail(email.toLowerCase().trim());
  if (!user || !(await verifyPassword(user, password)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const accessToken = signAccessToken({ userId: user.id, email: user.email, roomId: user.roomId, role: 'transmitter' });
  const refreshToken = signRefreshToken(user.id);
  res.json({ accessToken, refreshToken, roomId: user.roomId });
});

app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired refresh token' });
  const user = findUserById(payload.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  const newAccessToken = signAccessToken({ userId: user.id, email: user.email, roomId: user.roomId, role: 'transmitter' });
  res.json({ accessToken: newAccessToken });
});

// ── Admin token (web dashboard uses this role) ────────────────────────────────

app.post('/auth/admin-token', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const adminToken = signAccessToken({ userId: user.userId, email: user.email, roomId: user.roomId, role: 'admin' });
  res.json({ adminToken });
});

// ── Receiver token (mobile listen / web per-device stream) ───────────────────

app.post('/auth/receiver-token', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { targetDeviceId } = req.body as { targetDeviceId?: string };
  const receiverToken = signAccessToken({
    userId: user.userId, email: user.email, roomId: user.roomId, role: 'receiver',
  });
  res.json({ receiverToken, targetDeviceId });
});

// ── ICE config ────────────────────────────────────────────────────────────────

app.get('/ice-config', authMiddleware, (_req, res) => {
  const iceServers: Array<{ urls: string | string[]; username?: string; credential?: string }> = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  if (process.env.TURN_URL) {
    iceServers.push({ urls: process.env.TURN_URL, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL });
  }
  res.json({ iceServers });
});

// ── Room devices (admin dashboard) ───────────────────────────────────────────

app.get('/room/devices', authMiddleware, (req, res) => {
  const { roomId } = (req as any).user;
  res.json({ devices: getActiveTransmitters(roomId) });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── HTTP + WebSocket ──────────────────────────────────────────────────────────

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
setupSignaling(wss);

const PORT = Number(process.env.PORT ?? 3001);
httpServer.listen(PORT, () => {
  console.log(`Ambient Monitor server running on http://localhost:${PORT}`);
  console.log(`WebSocket signaling on ws://localhost:${PORT}/ws`);
});
