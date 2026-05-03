import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useReceiver } from '../../hooks/useAudioSession';

export default function MonitorScreen() {
  const { status, remoteStream, start, stop } = useReceiver();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'connected') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  return (
    <View style={styles.container}>
      {/* RTCView with audio-only stream — no video surface rendered */}
      {remoteStream && (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.hiddenRtcView}
          objectFit="cover"
        />
      )}

      <Animated.View style={[styles.orb, { transform: [{ scale: pulseAnim }] }, orbColor(status)]}>
        <Text style={styles.orbIcon}>{status === 'connected' ? '🎧' : '📡'}</Text>
      </Animated.View>

      <Text style={styles.statusLabel}>{statusLabel(status)}</Text>

      {status === 'idle' || status === 'error' ? (
        <TouchableOpacity style={styles.button} onPress={start}>
          <Text style={styles.buttonText}>Start Listening</Text>
        </TouchableOpacity>
      ) : status === 'connected' ? (
        <TouchableOpacity style={[styles.button, styles.buttonDanger]} onPress={stop}>
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      ) : null}

      {status === 'disconnected' && (
        <Text style={styles.hint}>Transmitter went offline. Will reconnect when it comes back.</Text>
      )}
      {status === 'connecting' && (
        <Text style={styles.hint}>Waiting for transmitter to come online...</Text>
      )}
    </View>
  );
}

function orbColor(status: string) {
  switch (status) {
    case 'connected': return { backgroundColor: '#052e16', borderColor: '#22c55e', borderWidth: 2 };
    case 'connecting': return { backgroundColor: '#1c1206', borderColor: '#f59e0b', borderWidth: 2 };
    case 'error': return { backgroundColor: '#1c0606', borderColor: '#ef4444', borderWidth: 2 };
    default: return { backgroundColor: '#1a1a1a', borderColor: '#2e2e2e', borderWidth: 2 };
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'idle': return 'Not connected';
    case 'connecting': return 'Connecting...';
    case 'connected': return 'Listening live';
    case 'disconnected': return 'Transmitter offline';
    case 'error': return 'Connection error';
    default: return '';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  hiddenRtcView: {
    width: 0,
    height: 0,
    position: 'absolute',
  },
  orb: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  orbIcon: {
    fontSize: 52,
  },
  statusLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    marginBottom: 16,
  },
  buttonDanger: {
    backgroundColor: '#7f1d1d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
