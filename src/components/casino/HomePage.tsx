import BalanceBar from './BalanceBar';
import { useStore } from '@/lib/store';
import Icon from '@/components/ui/icon';

interface Props { onPlay: () => void }

const games = [
  { name: 'Минёр', emoji: '💣', desc: 'Открывай клетки, избегай мин', color: 'from-red-900/30 to-red-800/10' },
  { name: 'Краш', emoji: '🚀', desc: 'Забирай выигрыш до краша', color: 'from-blue-900/30 to-blue-800/10' },
  { name: 'Слот', emoji: '🎰', desc: 'Классические барабаны', color: 'from-purple-900/30 to-purple-800/10' },
  { name: 'Бонус Слот', emoji: '🎁', desc: 'Лови бонусные игры', color: 'from-amber-900/30 to-amber-800/10' },
];

export default function HomePage({ onPlay }: Props) {
  const { user } = useStore();

  return (
    <div className="animate-fade-in">
      <BalanceBar />

      {/* Hero */}
      <div className="px-4 pt-6 pb-4">
        <h2 className="font-oswald text-2xl font-bold text-foreground">
          Привет, <span className="gold-text">{user?.username}</span> 👋
        </h2>
        <p className="text-muted-foreground text-sm mt-0.5">Удачи в игре сегодня!</p>
      </div>

      {/* Balance card */}
      <div className="mx-4 mb-6 p-5 rounded-2xl bg-gradient-to-br from-amber-900/20 to-card border border-amber-700/20 animate-pulse-gold">
        <p className="text-xs text-muted-foreground mb-1">Ваш баланс</p>
        <div className="flex items-end gap-2">
          <span className="font-oswald text-4xl font-bold gold-text">
            {user?.balance.toLocaleString('ru', { maximumFractionDigits: 0 })}
          </span>
          <span className="text-lg gold-text font-bold mb-0.5">К</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Казах Коины</p>
      </div>

      {/* Quick access */}
      <div className="px-4 mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Игры</h3>
      </div>
      <div className="px-4 grid grid-cols-2 gap-3 mb-6">
        {games.map((g, i) => (
          <button
            key={i}
            onClick={onPlay}
            className={`text-left p-4 rounded-2xl bg-gradient-to-br ${g.color} border border-border hover:border-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98]`}
          >
            <div className="text-3xl mb-2">{g.emoji}</div>
            <div className="font-semibold text-sm text-foreground">{g.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{g.desc}</div>
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Мин. ставка', value: '1 К', icon: 'TrendingDown' },
          { label: 'Макс. выигрыш', value: '×50', icon: 'Zap' },
          { label: 'Бонус при рег.', value: '1000 К', icon: 'Gift' },
        ].map((s, i) => (
          <div key={i} className="card-casino p-3 text-center">
            <Icon name={s.icon} size={16} className="mx-auto mb-1 text-primary" />
            <div className="font-bold text-xs gold-text">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
