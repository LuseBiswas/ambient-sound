export const SERVER_URL = __DEV__
  ? 'http://172.20.10.2:3001'
  : 'https://your-production-server.com';

export const WS_URL = SERVER_URL.replace(/^http/, 'ws') + '/ws';
