import { useCallback, useRef, useState } from 'react';
import { getIceServers, getReceiverToken } from './api';

export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'error';

export function useDeviceStream(accessToken: string, deviceId: string) {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const connect = useCallback(async () => {
    setStatus('connecting');
    try {
      const receiverToken = await getReceiverToken(accessToken);
      const iceServers = await getIceServers(accessToken);

      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (!e.streams[0]) return;
        let audio = audioRef.current;
        if (!audio) {
          audio = document.createElement('audio');
          audio.style.display = 'none';
          document.body.appendChild(audio);
          audioRef.current = audio;
        }
        audio.srcObject = e.streams[0];
        audio.play().catch(err => console.warn('Audio play blocked:', err));
        setStatus('connected');
      };

      pc.oniceconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
          setStatus('idle');
        }
      };

      const wsUrl =
        window.location.origin.replace(/^http/, 'ws') +
        `/ws?token=${encodeURIComponent(receiverToken)}&targetDeviceId=${encodeURIComponent(deviceId)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = async ({ data }) => {
        const msg = JSON.parse(data as string);

        if (msg.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ type: 'answer', sdp: { type: answer.type, sdp: answer.sdp } }));
        }

        if (msg.type === 'ice' && msg.candidate) {
          try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch { /* ignore stale candidates */ }
        }

        if (msg.type === 'leave') setStatus('idle');
      };

      pc.onicecandidate = ({ candidate }) => {
        if (candidate && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ice', candidate: candidate.toJSON(), targetDeviceId: deviceId }));
        }
      };

      ws.onerror = () => setStatus('error');
      ws.onclose = () => { if (status !== 'idle') setStatus('idle'); };
    } catch {
      setStatus('error');
    }
  }, [accessToken, deviceId, status]);

  const disconnect = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
    setStatus('idle');
  }, []);

  return { status, connect, disconnect };
}
