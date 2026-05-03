export const SERVER_URL = __DEV__
  ? 'http://192.168.1.2:3001'
  : 'https://your-production-server.com';

export const WS_URL = SERVER_URL.replace(/^http/, 'ws') + '/ws';
