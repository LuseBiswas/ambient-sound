import { useState } from 'react';
import { login, register } from '../lib/api';

interface Props {
  onAuth: (accessToken: string) => void;
}

export default function LoginPage({ onAuth }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!email || !password) return setError('Email and password required');
    setLoading(true);
    try {
      const data = isRegister
        ? await register(email.trim().toLowerCase(), password)
        : await login(email.trim().toLowerCase(), password);
      localStorage.setItem('ambient_access_token', data.accessToken);
      onAuth(data.accessToken);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold">Ambient Monitor</h1>
          <p className="text-neutral-500 text-sm mt-1">Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-blue-500 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            onKeyDown={e => e.key === 'Enter' && handleSubmit(e as unknown as React.FormEvent)}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-blue-500 transition-colors"
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl py-3.5 text-sm font-semibold transition-colors"
          >
            {loading ? 'Please wait…' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <p
          className="text-center text-blue-400 text-sm mt-5 cursor-pointer hover:underline"
          onClick={() => { setIsRegister(r => !r); setError(''); }}
        >
          {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
        </p>
      </div>
    </div>
  );
}
