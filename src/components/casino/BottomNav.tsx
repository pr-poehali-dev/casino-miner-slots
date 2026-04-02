import Icon from '@/components/ui/icon';
import type { Tab } from '@/pages/Index';

interface Props {
  tab: Tab;
  setTab: (t: Tab) => void;
  isAdmin: boolean;
}

const items = [
  { id: 'home', label: 'Главная', icon: 'Home' },
  { id: 'games', label: 'Игры', icon: 'Gamepad2' },
  { id: 'bonus', label: 'Бонусы', icon: 'Gift' },
  { id: 'profile', label: 'Профиль', icon: 'User' },
] as const;

export default function BottomNav({ tab, setTab, isAdmin }: Props) {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card border-t border-border flex items-center justify-around px-2 py-1 z-50">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setTab(item.id as Tab)}
          className={`nav-item ${tab === item.id ? 'active' : ''}`}
        >
          <Icon name={item.icon} size={20} />
          <span>{item.label}</span>
        </button>
      ))}
      {isAdmin && (
        <button
          onClick={() => setTab('admin')}
          className={`nav-item ${tab === 'admin' ? 'active' : ''}`}
        >
          <Icon name="Shield" size={20} />
          <span>Админ</span>
        </button>
      )}
    </nav>
  );
}
