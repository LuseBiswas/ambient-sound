import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyAccessToken } from './auth';
import type { Room, RoomPeer, TransmitterPeer, SignalingMessage } from './types';

const rooms = new Map<string, Room>();
const PING_INTERVAL_MS = 30_000;

export function setupSignaling(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? '/', 'ws://x');
    const token = url.searchParams.get('token');
    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) { ws.close(1008, 'Unauthorized'); return; }

    const { userId, roomId, role } = payload;
    const deviceId   = url.searchParams.get('deviceId')   ?? userId;
    const deviceName = url.searchParams.get('deviceName') ?? `Device-${deviceId.slice(-4)}`;
    const targetDeviceId = url.searchParams.get('targetDeviceId') ?? undefined;

    let room = rooms.get(roomId);
    if (!room) {
      room = { transmitters: new Map(), receivers: new Map(), ownerId: userId, createdAt: new Date() };
      rooms.set(roomId, room);
    }

    const peer: RoomPeer = { ws, userId, connectedAt: new Date() };

    if (role === 'transmitter') {
      // Close existing session for this device if any
      room.transmitters.get(deviceId)?.ws.close(1000, 'Replaced');
      const txPeer: TransmitterPeer = { ...peer, deviceId, deviceName };
      room.transmitters.set(deviceId, txPeer);
      console.log(`[room:${roomId}] transmitter connected: ${deviceName} (${deviceId})`);
    } else {
      // receiver or admin
      room.receivers.set(userId + '-' + Date.now(), peer);
      console.log(`[room:${roomId}] receiver connected (${role}), targeting: ${targetDeviceId ?? 'all'}`);

      // Notify target transmitter(s) to send offer
      if (targetDeviceId) {
        const tx = room.transmitters.get(targetDeviceId);
        if (tx) send(tx.ws, { type: 'offer', from: userId });
      } else {
        room.transmitters.forEach(tx => send(tx.ws, { type: 'offer', from: userId }));
      }
    }

    const pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, PING_INTERVAL_MS);

    ws.on('message', (data) => {
      try {
        const msg: SignalingMessage = JSON.parse(data.toString());
        relay(msg, role, room!, userId, targetDeviceId);
      } catch {
        send(ws, { type: 'error', error: 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      clearInterval(pingTimer);
      cleanup(role, room!, userId, deviceId, roomId);
    });

    ws.on('error', (err) => console.error(`[room:${roomId}] error:`, err.message));
  });
}

function relay(msg: SignalingMessage, senderRole: string, room: Room, senderId: string, targetDeviceId?: string) {
  const allowed: SignalingMessage['type'][] = ['offer', 'answer', 'ice'];
  if (!allowed.includes(msg.type)) return;

  if (senderRole === 'transmitter') {
    // Transmitter sends offer/ICE to a specific receiver
    const target = msg.from ? findReceiver(room, msg.from) : null;
    if (target) {
      send(target.ws, { ...msg, from: senderId });
    } else {
      room.receivers.forEach(r => send(r.ws, { ...msg, from: senderId }));
    }
  } else {
    // Receiver sends answer/ICE back to specific transmitter
    const txId = msg.targetDeviceId ?? targetDeviceId;
    if (txId) {
      const tx = room.transmitters.get(txId);
      if (tx) send(tx.ws, { ...msg, from: senderId });
    } else {
      room.transmitters.forEach(tx => send(tx.ws, { ...msg, from: senderId }));
    }
  }
}

function findReceiver(room: Room, userId: string): RoomPeer | undefined {
  for (const [key, peer] of room.receivers) {
    if (key.startsWith(userId)) return peer;
  }
}

function send(ws: WebSocket, msg: SignalingMessage) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function cleanup(role: string, room: Room, userId: string, deviceId: string, roomId: string) {
  if (role === 'transmitter') {
    room.transmitters.delete(deviceId);
    room.receivers.forEach(r => send(r.ws, { type: 'leave', from: deviceId }));
    console.log(`[room:${roomId}] transmitter disconnected: ${deviceId}`);
  } else {
    for (const [key] of room.receivers) {
      if (key.startsWith(userId)) { room.receivers.delete(key); break; }
    }
  }
  if (room.transmitters.size === 0 && room.receivers.size === 0) {
    rooms.delete(roomId);
  }
}

// Export for REST endpoint
export function getActiveTransmitters(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.transmitters.values()).map(t => ({
    deviceId: t.deviceId,
    deviceName: t.deviceName,
    connectedAt: t.connectedAt,
  }));
}
