import { useState, useEffect } from 'react';
import BalanceBar from './BalanceBar';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import Icon from '@/components/ui/icon';

export default function ProfilePage() {
  const { user, setUser } = useStore();
  type Tx = { type: string; amount: number; description: string };
  const [profile, setProfile] = useState<{ transactions: Tx[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminSecret, setAdminSecret] = useState('');
  const [adminMsg, setAdminMsg] = useState('');
  const [showAdminInput, setShowAdminInput] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.profile(user.user_id).then(data => {
      if (!data.error) setProfile(data);
      setLoading(false);
    });
  }, [user]);

  function logout() {
    setUser(null);
  }

  async function claimAdmin() {
    if (!user || !adminSecret) return;
    const data = await api.adminInitAdmin(user.user_id, adminSecret);
    if (data.success) {
      setAdminMsg('✅ Вы стали администратором! Перезайдите.');
      setAdminSecret('');
    } else {
      setAdminMsg(data.error || 'Неверный секрет');
    }
  }

  const txTypeLabel: Record<string, string> = {
    bet: '🎲 Ставка',
    win: '🏆 Выигрыш',
    transfer: '💸 Перевод',
    bonus: '🎁 Бонус',
  };

  return (
    <div className="animate-fade-in">
      <BalanceBar />

      <div className="px-4 pt-4 space-y-4">
        {/* User card */}
        <div className="card-casino p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-700/30 to-amber-900/20 border border-amber-700/30 flex items-center justify-center text-2xl font-bold gold-text font-oswald">
              {user?.username[0].toUpperCase()}
            </div>
            <div>
              <div className="font-oswald text-xl font-bold">{user?.username}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-muted-foreground font-mono">ID: {user?.user_id}</span>
                {user?.is_admin && (
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-semibold">Админ</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-muted rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">Баланс</div>
              <div className="font-oswald text-lg font-bold gold-text">{user?.balance.toLocaleString('ru', { maximumFractionDigits: 0 })} К</div>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1">Игр сыграно</div>
              <div className="font-oswald text-lg font-bold">{profile?.transactions?.length ?? '...'}</div>
            </div>
          </div>
        </div>

        {/* Admin init */}
        <div className="card-casino p-4">
          <button onClick={() => setShowAdminInput(!showAdminInput)} className="flex items-center gap-2 w-full text-left">
            <Icon name="Shield" size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Активировать права администратора</span>
            <Icon name="ChevronDown" size={14} className={`ml-auto text-muted-foreground transition-transform ${showAdminInput ? 'rotate-180' : ''}`} />
          </button>
          {showAdminInput && (
            <div className="mt-3 space-y-2">
              <input
                type="password"
                placeholder="Секретный код"
                value={adminSecret}
                onChange={e => setAdminSecret(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground"
              />
              <button onClick={claimAdmin} className="w-full btn-gold py-2.5 text-sm font-bold">Активировать</button>
              {adminMsg && <p className={`text-xs text-center ${adminMsg.startsWith('✅') ? 'text-green-400' : 'text-destructive'}`}>{adminMsg}</p>}
            </div>
          )}
        </div>

        {/* Transactions */}
        <div>
          <h3 className="font-oswald text-base font-bold mb-3 text-muted-foreground uppercase tracking-wider">История</h3>
          {loading ? (
            <div className="text-center text-muted-foreground text-sm py-8">Загрузка...</div>
          ) : profile?.transactions?.length ? (
            <div className="space-y-2">
              {profile.transactions.map((tx: Tx, i: number) => (
                <div key={i} className="card-casino p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{txTypeLabel[tx.type] || tx.type}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{tx.description}</div>
                  </div>
                  <div className={`font-oswald font-bold text-sm ${tx.type === 'win' || tx.type === 'bonus' ? 'text-green-400' : tx.type === 'bet' ? 'text-red-400' : 'gold-text'}`}>
                    {tx.type === 'win' || tx.type === 'bonus' ? '+' : tx.type === 'bet' ? '-' : ''}{tx.amount.toFixed(0)} К
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8 card-casino">Пока нет истории</div>
          )}
        </div>

        {/* Logout */}
        <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3 border border-destructive/40 rounded-xl text-destructive text-sm font-semibold hover:bg-destructive/10 transition-all mb-4">
          <Icon name="LogOut" size={16} />
          Выйти
        </button>
      </div>
    </div>
  );
}