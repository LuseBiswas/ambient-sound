export interface JWTPayload {
  userId: string;
  email: string;
  roomId: string;
  role: 'transmitter' | 'receiver';
  iat?: number;
  exp?: number;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice' | 'leave' | 'ping' | 'pong' | 'error';
  sdp?: { type: string; sdp: string };
  candidate?: { candidate: string; sdpMLineIndex: number | null; sdpMid: string | null };
  from?: string;
  error?: string;
}

export interface Room {
  transmitter: RoomPeer | null;
  receivers: Map<string, RoomPeer>;
  ownerId: string;
  createdAt: Date;
}

export interface RoomPeer {
  ws: import('ws').WebSocket;
  userId: string;
  connectedAt: Date;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  roomId: string;
  createdAt: Date;
}
