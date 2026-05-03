import { useState } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('ambient_access_token'),
  );

  function handleAuth(token: string) {
    setAccessToken(token);
  }

  function handleLogout() {
    localStorage.removeItem('ambient_access_token');
    setAccessToken(null);
  }

  if (!accessToken) return <LoginPage onAuth={handleAuth} />;
  return <DashboardPage accessToken={accessToken} onLogout={handleLogout} />;
}
