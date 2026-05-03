export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice' | 'leave' | 'ping' | 'pong' | 'error';
  sdp?: { type: string; sdp: string };
  candidate?: {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
  };
  from?: string;
  error?: string;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';
