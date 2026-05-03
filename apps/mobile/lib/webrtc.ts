import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import { SignalingClient } from './signaling';

export type TrackHandler = (stream: MediaStream) => void;

export class AudioMonitorPeer {
  private pc: RTCPeerConnection;
  private signaling: SignalingClient;
  private cleanupFns: Array<() => void> = [];
  private localStream: MediaStream | null = null;

  constructor(signaling: SignalingClient, iceConfig: RTCConfiguration) {
    this.signaling = signaling;
    this.pc = new RTCPeerConnection(iceConfig);
    this.wireSignaling();
  }

  // ── Transmitter: capture ambient audio and send ───────────────────────────

  async startTransmitting(): Promise<void> {
    this.localStream = await mediaDevices.getUserMedia({
      audio: {
        // Disable processing — we want raw ambient sound, not a phone call
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 48000,
      },
      video: false,
    });

    this.localStream.getTracks().forEach(track => {
      this.pc.addTrack(track, this.localStream!);
    });

    // Listen for a receiver joining — server sends a synthetic 'offer' event
    // with the receiver's ID so we initiate the real offer toward them
    const off = this.signaling.on('offer', async (msg) => {
      await this.createAndSendOffer(msg.from);
    });
    this.cleanupFns.push(off);
  }

  // ── Receiver: receive and expose the remote audio stream ──────────────────

  startReceiving(onTrack: TrackHandler): void {
    this.pc.ontrack = (event) => {
      if (event.streams?.[0]) onTrack(event.streams[0]);
    };
  }

  // ── Internal signaling wiring ─────────────────────────────────────────────

  private wireSignaling() {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signaling.send({ type: 'ice', candidate: event.candidate.toJSON() });
      }
    };

    const offAnswer = this.signaling.on('answer', async (msg) => {
      if (!msg.sdp) return;
      await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    });

    const offIce = this.signaling.on('ice', async (msg) => {
      if (!msg.candidate) return;
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
      } catch {}
    });

    const offLeave = this.signaling.on('leave', () => {
      this.pc.close();
    });

    // Receiver side: handle incoming offer from transmitter
    const offOffer = this.signaling.on('offer', async (msg) => {
      if (!msg.sdp) return; // synthetic 'offer' without SDP = new receiver notification (transmitter handles)
      await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.signaling.send({ type: 'answer', sdp: { type: answer.type!, sdp: answer.sdp! } });
    });

    this.cleanupFns.push(offAnswer, offIce, offLeave, offOffer);
  }

  private async createAndSendOffer(targetReceiverId?: string) {
    const offer = await this.pc.createOffer({ offerToReceiveAudio: false });
    await this.pc.setLocalDescription(offer);
    this.signaling.send({
      type: 'offer',
      sdp: { type: offer.type!, sdp: offer.sdp! },
      from: targetReceiverId, // server uses this to route to the specific receiver
    });
  }

  destroy() {
    this.cleanupFns.forEach(fn => fn());
    this.localStream?.getTracks().forEach(t => t.stop());
    this.pc.close();
  }
}
