import { useState, useEffect } from 'react';
import BalanceBar from './BalanceBar';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import Icon from '@/components/ui/icon';

type CasinoUser = {
  user_id: string;
  username: string;
  balance: number;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
  games_count: number;
  total_bet: number;
};

type Stats = {
  total_users: number;
  total_games: number;
  total_bets: number;
  total_wins: number;
};

export default function AdminPage() {
  const { user } = useStore();
  const [users, setUsers] = useState<CasinoUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [giveAmount, setGiveAmount] = useState(1000);
  const [msg, setMsg] = useState('');
  const [activeUser, setActiveUser] = useState<CasinoUser | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.adminUsers(user.user_id),
      api.adminStats(user.user_id),
    ]).then(([u, s]) => {
      if (!u.error) setUsers(u.users);
      if (!s.error) setStats(s);
      setLoading(false);
    });
  }, [user]);

  async function giveCoins(targetId: string) {
    if (!user) return;
    const data = await api.adminGiveCoins(user.user_id, targetId, giveAmount);
    if (data.error) { setMsg(data.error); return; }
    setMsg(`✅ Выдано ${giveAmount} К игроку`);
    setUsers(prev => prev.map(u => u.user_id === targetId ? { ...u, balance: data.new_balance } : u));
  }

  async function toggleAdmin(target: CasinoUser) {
    if (!user) return;
    const data = await api.adminSetAdmin(user.user_id, target.user_id, !target.is_admin);
    if (data.success) {
      setUsers(prev => prev.map(u => u.user_id === target.user_id ? { ...u, is_admin: !u.is_admin } : u));
      setMsg(`✅ Права администратора ${target.is_admin ? 'сняты' : 'выданы'}`);
    }
  }

  async function toggleBan(target: CasinoUser) {
    if (!user) return;
    const data = await api.adminBan(user.user_id, target.user_id, !target.is_banned);
    if (data.success) {
      setUsers(prev => prev.map(u => u.user_id === target.user_id ? { ...u, is_banned: !u.is_banned } : u));
      setMsg(`✅ Статус бана изменён`);
    }
  }

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.user_id.includes(search)
  );

  return (
    <div className="animate-fade-in">
      <BalanceBar />
      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="Shield" size={20} className="gold-text" />
          <h2 className="font-oswald text-xl font-bold">Панель администратора</h2>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Игроков', value: stats.total_users, icon: 'Users' },
              { label: 'Игр', value: stats.total_games, icon: 'Gamepad2' },
              { label: 'Ставок', value: stats.total_bets.toFixed(0) + ' К', icon: 'TrendingUp' },
              { label: 'Выиграно', value: stats.total_wins.toFixed(0) + ' К', icon: 'Trophy' },
            ].map((s, i) => (
              <div key={i} className="card-casino p-3 flex items-center gap-3">
                <div className="w-9 h-9 bg-muted rounded-xl flex items-center justify-center">
                  <Icon name={s.icon} size={16} className="gold-text" />
                </div>
                <div>
                  <div className="font-oswald font-bold text-sm">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Give coins control */}
        <div className="card-casino p-4">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Icon name="Coins" size={14} className="gold-text" />
            Выдать монеты
          </h4>
          <div className="flex gap-2">
            <input type="number" value={giveAmount} min={1} onChange={e => setGiveAmount(Math.max(1, +e.target.value))}
              className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground" />
            {[100, 1000, 5000].map(v => <button key={v} onClick={() => setGiveAmount(v)} className="px-2.5 py-2 bg-muted border border-border rounded-xl text-xs font-semibold hover:border-primary/50 transition-all">{v}</button>)}
          </div>
          {msg && <p className={`text-xs mt-2 ${msg.startsWith('✅') ? 'text-green-400' : 'text-destructive'}`}>{msg}</p>}
        </div>

        {/* Search */}
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по ID или имени..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground"
          />
        </div>

        {/* Users list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Пользователи ({filtered.length})
            </h3>
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground py-8">Загрузка...</div>
          ) : (
            <div className="space-y-2">
              {filtered.map(u => (
                <div key={u.user_id} className={`card-casino p-3 ${u.is_banned ? 'opacity-60 border-red-900/30' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-xs gold-text font-oswald shrink-0">
                        {u.username[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm truncate">{u.username}</span>
                          {u.is_admin && <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full shrink-0">Адм</span>}
                          {u.is_banned && <span className="text-xs bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded-full shrink-0">Бан</span>}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{u.user_id} · {u.games_count} игр</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="font-oswald font-bold text-sm gold-text">{u.balance.toFixed(0)} К</div>
                      <button onClick={() => setActiveUser(activeUser?.user_id === u.user_id ? null : u)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        {activeUser?.user_id === u.user_id ? 'Скрыть' : 'Действия'}
                      </button>
                    </div>
                  </div>

                  {activeUser?.user_id === u.user_id && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <button onClick={() => giveCoins(u.user_id)} className="flex-1 py-2 bg-amber-900/20 border border-amber-700/30 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-900/40 transition-all">
                        +{giveAmount} К
                      </button>
                      <button onClick={() => toggleAdmin(u)} className="flex-1 py-2 bg-blue-900/20 border border-blue-700/30 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-900/40 transition-all">
                        {u.is_admin ? 'Снять адм.' : 'Дать адм.'}
                      </button>
                      <button onClick={() => toggleBan(u)} className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${u.is_banned ? 'bg-green-900/20 border border-green-700/30 text-green-400 hover:bg-green-900/40' : 'bg-red-900/20 border border-red-700/30 text-red-400 hover:bg-red-900/40'}`}>
                        {u.is_banned ? 'Разбанить' : 'Забанить'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
