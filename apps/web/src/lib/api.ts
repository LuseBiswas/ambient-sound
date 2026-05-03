const BASE = '';  // proxied by Vite dev server; empty string = same origin

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  roomId: string;
}

export interface Device {
  deviceId: string;
  deviceName: string;
  connectedAt: string;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Login failed');
  return data as AuthTokens;
}

export async function register(email: string, password: string): Promise<AuthTokens> {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Registration failed');
  return data as AuthTokens;
}

export async function getAdminToken(accessToken: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/admin-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to get admin token');
  return data.adminToken as string;
}

export async function getReceiverToken(accessToken: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/receiver-token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to get receiver token');
  return data.receiverToken as string;
}

export async function getDevices(accessToken: string): Promise<Device[]> {
  const res = await fetch(`${BASE}/room/devices`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to fetch devices');
  return data.devices as Device[];
}

export async function getIceServers(accessToken: string): Promise<RTCIceServer[]> {
  const res = await fetch(`${BASE}/ice-config`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return [{ urls: 'stun:stun.l.google.com:19302' }];
  const data = await res.json();
  return data.iceServers as RTCIceServer[];
}
