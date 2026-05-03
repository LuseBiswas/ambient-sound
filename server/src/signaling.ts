import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { verifyAccessToken } from './auth';
import type { Room, RoomPeer, SignalingMessage } from './types';

const rooms = new Map<string, Room>();

const PING_INTERVAL_MS = 30_000;

export function setupSignaling(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? '/', 'ws://x');
    const token = url.searchParams.get('token');

    const payload = token ? verifyAccessToken(token) : null;
    if (!payload) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    const { userId, roomId, role } = payload;

    let room = rooms.get(roomId);
    if (!room) {
      room = { transmitter: null, receivers: new Map(), ownerId: userId, createdAt: new Date() };
      rooms.set(roomId, room);
    }

    // Only the room owner can be the transmitter
    if (role === 'transmitter' && room.ownerId !== userId) {
      ws.close(1008, 'Forbidden: only the room owner can transmit');
      return;
    }

    const peer: RoomPeer = { ws, userId, connectedAt: new Date() };

    if (role === 'transmitter') {
      room.transmitter?.ws.close(1000, 'Replaced by new transmitter session');
      room.transmitter = peer;
      console.log(`[room:${roomId}] transmitter connected: ${userId}`);
    } else {
      room.receivers.set(userId, peer);
      console.log(`[room:${roomId}] receiver connected: ${userId} (${room.receivers.size} total)`);
      // Tell existing transmitter a new receiver joined so it can send an offer
      if (room.transmitter) {
        send(room.transmitter.ws, { type: 'offer', from: userId });
      }
    }

    const pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, PING_INTERVAL_MS);

    ws.on('message', (data) => {
      try {
        const msg: SignalingMessage = JSON.parse(data.toString());
        relay(msg, role, room!, userId);
      } catch {
        send(ws, { type: 'error', error: 'Invalid message format' });
      }
    });

    ws.on('close', () => {
      clearInterval(pingTimer);
      cleanup(role, room!, userId, roomId);
    });

    ws.on('error', (err) => {
      console.error(`[room:${roomId}] WebSocket error for ${userId}:`, err.message);
    });
  });
}

function relay(msg: SignalingMessage, senderRole: string, room: Room, senderId: string) {
  // Signaling messages only — SDP and ICE candidates. Audio never touches this server.
  const allowed: SignalingMessage['type'][] = ['offer', 'answer', 'ice'];
  if (!allowed.includes(msg.type)) return;

  if (senderRole === 'transmitter') {
    // Broadcast to all receivers (or targeted receiver via msg.from used as target)
    const target = msg.from ? room.receivers.get(msg.from) : null;
    if (target) {
      send(target.ws, { ...msg, from: senderId });
    } else {
      room.receivers.forEach(r => send(r.ws, { ...msg, from: senderId }));
    }
  } else {
    // Receiver sends answer/ICE back to transmitter
    if (room.transmitter) {
      send(room.transmitter.ws, { ...msg, from: senderId });
    }
  }
}

function send(ws: WebSocket, msg: SignalingMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function cleanup(role: string, room: Room, userId: string, roomId: string) {
  if (role === 'transmitter') {
    room.transmitter = null;
    // Notify all receivers the transmitter disconnected
    room.receivers.forEach(r => send(r.ws, { type: 'leave' }));
    console.log(`[room:${roomId}] transmitter disconnected`);
  } else {
    room.receivers.delete(userId);
    console.log(`[room:${roomId}] receiver disconnected: ${userId}`);
  }
  // Garbage-collect empty rooms
  if (!room.transmitter && room.receivers.size === 0) {
    rooms.delete(roomId);
    console.log(`[room:${roomId}] room cleaned up`);
  }
}
