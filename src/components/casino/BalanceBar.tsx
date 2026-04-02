import { useStore } from '@/lib/store';
import Icon from '@/components/ui/icon';

export default function BalanceBar() {
  const { user } = useStore();
  if (!user) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">ID: {user.user_id}</span>
      </div>
      <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full">
        <Icon name="Coins" size={14} className="text-primary" />
        <span className="font-oswald font-bold text-sm gold-text">
          {user.balance.toLocaleString('ru', { maximumFractionDigits: 2 })} К
        </span>
      </div>
    </div>
  );
}
