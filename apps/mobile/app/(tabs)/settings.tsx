import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { logout, getRoomId } from '../../lib/auth';
import { useEffect, useState } from 'react';

export default function SettingsScreen() {
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    getRoomId().then(setRoomId);
  }, []);

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Session</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Your Room ID</Text>
        <Text style={styles.value} numberOfLines={1}>{roomId ?? '—'}</Text>
        <Text style={styles.hint}>
          This is your private room identifier. Only devices authenticated with your account can connect to it.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Security</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Encryption</Text>
        <Text style={styles.value}>DTLS-SRTP (WebRTC standard)</Text>
        <Text style={styles.hint}>Audio is encrypted end-to-end. The signaling server only sees connection metadata, never audio data.</Text>
      </View>

      <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
        <Text style={styles.dangerButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    padding: 20,
  },
  sectionTitle: {
    color: '#555',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 24,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  hint: {
    color: '#555',
    fontSize: 12,
    lineHeight: 18,
  },
  dangerButton: {
    marginTop: 32,
    backgroundColor: '#1c0a0a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  dangerButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
