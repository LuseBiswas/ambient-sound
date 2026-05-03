import * as SecureStore from 'expo-secure-store';
import { SERVER_URL } from '../constants/config';

const ACCESS_TOKEN_KEY = 'ambient_access_token';
const REFRESH_TOKEN_KEY = 'ambient_refresh_token';
const ROOM_ID_KEY = 'ambient_room_id';

export async function register(email: string, password: string) {
  const res = await fetch(`${SERVER_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Registration failed');
  await persistTokens(data.accessToken, data.refreshToken, data.roomId);
  return data;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${SERVER_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Login failed');
  await persistTokens(data.accessToken, data.refreshToken, data.roomId);
  return data;
}

export async function logout() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(ROOM_ID_KEY);
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRoomId(): Promise<string | null> {
  return SecureStore.getItemAsync(ROOM_ID_KEY);
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${SERVER_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const { accessToken } = await res.json();
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    return accessToken;
  } catch {
    return null;
  }
}

export async function getIceConfig(): Promise<RTCConfiguration> {
  const token = await getAccessToken();
  try {
    const res = await fetch(`${SERVER_URL}/ice-config`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return res.json();
  } catch {}
  // Fallback to public STUN servers
  return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
}

export async function getReceiverToken(): Promise<string | null> {
  const token = await getAccessToken();
  try {
    const res = await fetch(`${SERVER_URL}/auth/receiver-token`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const { receiverToken } = await res.json();
      return receiverToken;
    }
  } catch {}
  return null;
}

async function persistTokens(accessToken: string, refreshToken: string, roomId: string) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken),
    SecureStore.setItemAsync(ROOM_ID_KEY, roomId),
  ]);
}
