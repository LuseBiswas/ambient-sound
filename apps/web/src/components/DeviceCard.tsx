import { useDeviceStream, StreamStatus } from '../lib/useDeviceStream';

interface Props {
  deviceId: string;
  deviceName: string;
  connectedAt: string;
  accessToken: string;
}

const STATUS_COLOR: Record<StreamStatus, string> = {
  idle:       'border-neutral-700 bg-neutral-900',
  connecting: 'border-amber-500 bg-amber-950',
  connected:  'border-green-500 bg-green-950',
  error:      'border-red-500 bg-red-950',
};

const STATUS_LABEL: Record<StreamStatus, string> = {
  idle:       'Ready',
  connecting: 'Connecting…',
  connected:  'Listening live',
  error:      'Connection error',
};

const ORB_ICON: Record<StreamStatus, string> = {
  idle: '📱', connecting: '🔄', connected: '🎧', error: '⚠️',
};

export default function DeviceCard({ deviceId, deviceName, connectedAt, accessToken }: Props) {
  const { status, connect, disconnect } = useDeviceStream(accessToken, deviceId);
  const isActive = status === 'connected' || status === 'connecting';

  return (
    <div className={`rounded-2xl border p-5 transition-all duration-300 ${STATUS_COLOR[status]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`text-2xl w-11 h-11 flex items-center justify-center rounded-full border flex-shrink-0
              ${status === 'connected' ? 'border-green-500 animate-pulse' : 'border-neutral-700'}`}
          >
            {ORB_ICON[status]}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{deviceName}</p>
            <p className="text-xs text-neutral-400 truncate">{deviceId}</p>
          </div>
        </div>

        <button
          onClick={isActive ? disconnect : connect}
          className={`flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-xl transition-colors
            ${isActive
              ? 'bg-red-900 hover:bg-red-800 border border-red-700 text-red-200'
              : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
        >
          {isActive ? 'Stop' : 'Listen'}
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-neutral-400">
        <span className={status === 'connected' ? 'text-green-400' : ''}>{STATUS_LABEL[status]}</span>
        <span>Connected {new Date(connectedAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
