import { View, Text, Switch, StyleSheet } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useTransmitter } from '../../hooks/useAudioSession';

const STATUS_COLOR: Record<string, string> = { idle: '#555', connecting: '#f59e0b', connected: '#22c55e', disconnected: '#f59e0b', error: '#ef4444' };
const STATUS_LABEL: Record<string, string> = { idle: 'Off', connecting: 'Starting...', connected: 'Live', disconnected: 'Reconnecting...', error: 'Error — tap to retry' };

export default function BroadcastScreen() {
  const { status, start, stop } = useTransmitter();
  const isLive = status === 'connected';
  useKeepAwake();

  return (
    <View style={styles.container}>
      {isLive && (
        <View style={styles.liveBanner}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>MICROPHONE ACTIVE — STREAMING AUDIO</Text>
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Broadcast Mode</Text>
        <Text style={styles.cardSubtitle}>Place this device near the sound source. It will stream ambient audio to your listening device.</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[status] }]} />
          <Text style={[styles.statusText, { color: STATUS_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
        </View>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Stream Audio</Text>
          <Switch value={isLive || status === 'connecting'} onValueChange={(v) => v ? start() : stop()}
            trackColor={{ false: '#2e2e2e', true: '#1d4ed8' }} thumbColor={isLive ? '#3b82f6' : '#555'} />
        </View>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Security</Text>
        <Text style={styles.infoItem}>• Stream is end-to-end encrypted (DTLS-SRTP)</Text>
        <Text style={styles.infoItem}>• Audio never stored on any server</Text>
        <Text style={styles.infoItem}>• Microphone active only when toggled on</Text>
        <Text style={styles.infoItem}>• Only your authenticated account can listen</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 20 },
  liveBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#450a0a', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ef4444' },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginRight: 10 },
  liveText: { color: '#ef4444', fontWeight: '700', fontSize: 13, letterSpacing: 1 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#2e2e2e' },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  cardSubtitle: { color: '#888', fontSize: 14, lineHeight: 20, marginBottom: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { color: '#fff', fontSize: 16, fontWeight: '500' },
  infoCard: { backgroundColor: '#0d1a2d', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1e3a5f' },
  infoTitle: { color: '#3b82f6', fontSize: 14, fontWeight: '700', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' },
  infoItem: { color: '#94a3b8', fontSize: 13, lineHeight: 22 },
});
