import { useCallback, useEffect, useRef, useState } from 'react';
import { getDevices, Device } from '../lib/api';
import DeviceCard from '../components/DeviceCard';

interface Props {
  accessToken: string;
  onLogout: () => void;
}

export default function DashboardPage({ accessToken, onLogout }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      const data = await getDevices(accessToken);
      setDevices(data);
      setLastRefresh(new Date());
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    }
  }, [accessToken]);

  useEffect(() => {
    fetchDevices();
    intervalRef.current = setInterval(fetchDevices, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchDevices]);

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Ambient Monitor</h1>
          <p className="text-neutral-500 text-sm">
            {devices.length} device{devices.length !== 1 ? 's' : ''} online
            &nbsp;·&nbsp;
            updated {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={onLogout}
          className="text-sm text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-4 py-2 rounded-xl transition-colors"
        >
          Sign Out
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Device list */}
      {devices.length === 0 ? (
        <div className="text-center py-20 text-neutral-500">
          <p className="text-4xl mb-4">📡</p>
          <p className="text-lg font-medium">No devices broadcasting</p>
          <p className="text-sm mt-1">Open the mobile app and tap Broadcast to start</p>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map(device => (
            <DeviceCard
              key={device.deviceId}
              deviceId={device.deviceId}
              deviceName={device.deviceName}
              connectedAt={device.connectedAt}
              accessToken={accessToken}
            />
          ))}
        </div>
      )}

      {/* Manual refresh */}
      <div className="mt-8 text-center">
        <button
          onClick={fetchDevices}
          className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          ↻ Refresh now
        </button>
      </div>
    </div>
  );
}
