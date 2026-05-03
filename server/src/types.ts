export interface JWTPayload {
  userId: string;
  email: string;
  roomId: string;
  role: 'transmitter' | 'receiver' | 'admin';
  deviceId?: string;
  deviceName?: string;
  iat?: number;
  exp?: number;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice' | 'leave' | 'ping' | 'pong' | 'error';
  sdp?: { type: string; sdp: string };
  candidate?: { candidate: string; sdpMLineIndex: number | null; sdpMid: string | null };
  from?: string;
  targetDeviceId?: string;
  error?: string;
}

export interface RoomPeer {
  ws: import('ws').WebSocket;
  userId: string;
  connectedAt: Date;
}

export interface TransmitterPeer extends RoomPeer {
  deviceId: string;
  deviceName: string;
}

export interface Room {
  transmitters: Map<string, TransmitterPeer>; // deviceId → peer
  receivers: Map<string, RoomPeer>;
  ownerId: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  roomId: string;
  createdAt: Date;
}
