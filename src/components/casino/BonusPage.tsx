import { useState } from 'react';
import BalanceBar from './BalanceBar';
import { useStore } from '@/lib/store';
import { api } from '@/lib/api';
import Icon from '@/components/ui/icon';

export default function BonusPage() {
  const { user, updateBalance } = useStore();
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState(100);
  const [foundUser, setFoundUser] = useState<{ user_id: string; username: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok');

  async function searchUser() {
    if (!toId.trim()) return;
    setSearching(true);
    setFoundUser(null);
    setMsg('');
    const data = await api.transferFind(toId.trim());
    if (data.error) {
      setMsg(data.error);
      setMsgType('err');
    } else {
      setFoundUser(data);
    }
    setSearching(false);
  }

  async function sendTransfer() {
    if (!user || !foundUser) return;
    setSending(true);
    setMsg('');
    const data = await api.transferSend(user.user_id, foundUser.user_id, amount);
    if (data.error) {
      setMsg(data.error);
      setMsgType('err');
    } else {
      setMsg(`✅ Отправлено ${amount} К игроку ${data.to_username}`);
      setMsgType('ok');
      updateBalance(data.balance);
      setFoundUser(null);
      setToId('');
    }
    setSending(false);
  }

  const bonuses = [
    { title: 'Приветственный бонус', desc: '1 000 К при регистрации', icon: 'Gift', status: 'Получен', color: 'text-green-400' },
    { title: 'Ежедневный бонус', desc: '100 К каждый день', icon: 'CalendarCheck', status: 'Скоро', color: 'text-muted-foreground' },
    { title: 'Реферальная программа', desc: 'Приглашай друзей', icon: 'Users', status: 'Скоро', color: 'text-muted-foreground' },
    { title: 'Кэшбэк', desc: '5% от проигрышей', icon: 'RefreshCw', status: 'Скоро', color: 'text-muted-foreground' },
  ];

  return (
    <div className="animate-fade-in">
      <BalanceBar />

      <div className="px-4 pt-4 space-y-4">
        {/* Transfer section */}
        <div className="card-casino p-4">
          <h3 className="font-oswald text-lg font-bold mb-3 flex items-center gap-2">
            <Icon name="Send" size={18} className="gold-text" />
            Перевод по ID
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">ID получателя</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="12345678"
                  value={toId}
                  onChange={e => setToId(e.target.value)}
                  maxLength={8}
                  className="flex-1 bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground font-mono"
                />
                <button onClick={searchUser} disabled={searching || !toId} className="px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-semibold hover:border-primary/40 transition-all disabled:opacity-50">
                  {searching ? '...' : 'Найти'}
                </button>
              </div>
            </div>

            {foundUser && (
              <div className="bg-muted/50 border border-green-700/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Получатель</p>
                  <p className="font-semibold text-sm">{foundUser.username}</p>
                  <p className="text-xs text-muted-foreground font-mono">{foundUser.user_id}</p>
                </div>
                <Icon name="UserCheck" size={20} className="text-green-400" />
              </div>
            )}

            {foundUser && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Сумма</label>
                  <div className="flex gap-2">
                    <input type="number" value={amount} min={1} onChange={e => setAmount(Math.max(1, +e.target.value))}
                      className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground" />
                    {[100, 500, 1000].map(v => <button key={v} onClick={() => setAmount(v)} className="px-2.5 py-2 bg-muted border border-border rounded-xl text-xs font-semibold hover:border-primary/50 transition-all">{v}</button>)}
                  </div>
                </div>
                <button onClick={sendTransfer} disabled={sending} className="w-full btn-gold py-3 font-bold disabled:opacity-50 text-sm">
                  {sending ? 'Отправка...' : `Отправить ${amount} К`}
                </button>
              </>
            )}

            {msg && (
              <div className={`text-center text-xs font-semibold p-2.5 rounded-xl ${msgType === 'ok' ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
                {msg}
              </div>
            )}

            <div className="bg-muted/40 rounded-xl p-3 flex items-center gap-2">
              <Icon name="Info" size={14} className="text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">Ваш ID: <span className="font-mono font-bold text-foreground">{user?.user_id}</span></p>
            </div>
          </div>
        </div>

        {/* Bonuses */}
        <div>
          <h3 className="font-oswald text-base font-bold mb-3 text-muted-foreground uppercase tracking-wider">Бонусная программа</h3>
          <div className="space-y-2">
            {bonuses.map((b, i) => (
              <div key={i} className="card-casino p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center shrink-0">
                  <Icon name={b.icon} size={20} className="gold-text" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{b.title}</div>
                  <div className="text-xs text-muted-foreground">{b.desc}</div>
                </div>
                <span className={`text-xs font-bold ${b.color}`}>{b.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
