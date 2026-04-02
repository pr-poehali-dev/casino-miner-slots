import { useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';

export default function AuthPage() {
  const { setUser } = useStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = mode === 'login'
        ? await api.login(username, password)
        : await api.register(username, password);
      if (data.error) { setError(data.error); return; }
      setUser(data);
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎰</div>
          <h1 className="font-oswald text-3xl font-bold gold-text tracking-wide">KAZAKH CASINO</h1>
          <p className="text-muted-foreground text-sm mt-1">Играй на Казах Коины</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-muted rounded-xl p-1 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Вход
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${mode === 'register' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            placeholder="Имя пользователя"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            autoCapitalize="none"
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />

          {error && <p className="text-destructive text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full btn-gold py-3.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '...' : mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        {mode === 'register' && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            При регистрации вы получаете <span className="gold-text font-semibold">1 000 К</span> бесплатно
          </p>
        )}
      </div>
    </div>
  );
}
