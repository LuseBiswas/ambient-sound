import { useRef, useState, useCallback, useEffect } from 'react';
import { MediaStream } from 'react-native-webrtc';
import { SignalingClient } from '../lib/signaling';
import { AudioMonitorPeer } from '../lib/webrtc';
import { getAccessToken, getReceiverToken, getIceConfig } from '../lib/auth';
import type { ConnectionStatus } from '../lib/types';

export function useTransmitter() {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const peerRef = useRef<AudioMonitorPeer | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);

  const start = useCallback(async () => {
    setStatus('connecting');
    try {
      const [token, iceConfig] = await Promise.all([getAccessToken(), getIceConfig()]);
      if (!token) throw new Error('Not authenticated');
      const signaling = new SignalingClient(token);
      await signaling.connect();
      signalingRef.current = signaling;
      const peer = new AudioMonitorPeer(signaling, iceConfig);
      await peer.startTransmitting();
      peerRef.current = peer;
      setStatus('connected');
    } catch (err) {
      console.error('[transmitter]', err);
      setStatus('error');
      stop();
    }
  }, []);

  const stop = useCallback(() => {
    peerRef.current?.destroy();
    signalingRef.current?.destroy();
    peerRef.current = null;
    signalingRef.current = null;
    setStatus('idle');
  }, []);

  useEffect(() => () => stop(), []);
  return { status, start, stop };
}

export function useReceiver() {
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerRef = useRef<AudioMonitorPeer | null>(null);
  const signalingRef = useRef<SignalingClient | null>(null);

  const start = useCallback(async () => {
    setStatus('connecting');
    try {
      const [token, iceConfig] = await Promise.all([getReceiverToken(), getIceConfig()]);
      if (!token) throw new Error('Not authenticated');
      const signaling = new SignalingClient(token);
      await signaling.connect();
      signalingRef.current = signaling;
      const peer = new AudioMonitorPeer(signaling, iceConfig);
      peer.startReceiving((stream) => {
        setRemoteStream(stream);
        setStatus('connected');
      });
      peerRef.current = peer;
      signaling.on('leave', () => {
        setStatus('disconnected');
        setRemoteStream(null);
      });
    } catch (err) {
      console.error('[receiver]', err);
      setStatus('error');
    }
  }, []);

  const stop = useCallback(() => {
    peerRef.current?.destroy();
    signalingRef.current?.destroy();
    peerRef.current = null;
    signalingRef.current = null;
    setRemoteStream(null);
    setStatus('idle');
  }, []);

  useEffect(() => () => stop(), []);
  return { status, remoteStream, start, stop };
}
