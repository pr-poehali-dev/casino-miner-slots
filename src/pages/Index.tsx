import { useState } from 'react';
import { useStore } from '@/lib/store';
import AuthPage from '@/components/casino/AuthPage';
import HomePage from '@/components/casino/HomePage';
import GamesPage from '@/components/casino/GamesPage';
import BonusPage from '@/components/casino/BonusPage';
import ProfilePage from '@/components/casino/ProfilePage';
import AdminPage from '@/components/casino/AdminPage';
import BottomNav from '@/components/casino/BottomNav';

export type Tab = 'home' | 'games' | 'bonus' | 'profile' | 'admin';

export default function Index() {
  const { user } = useStore();
  const [tab, setTab] = useState<Tab>('home');

  if (!user) return <AuthPage />;

  return (
    <div className="min-h-screen flex flex-col bg-background max-w-md mx-auto relative">
      <div className="flex-1 overflow-y-auto pb-20">
        {tab === 'home' && <HomePage onPlay={() => setTab('games')} />}
        {tab === 'games' && <GamesPage />}
        {tab === 'bonus' && <BonusPage />}
        {tab === 'profile' && <ProfilePage />}
        {tab === 'admin' && user.is_admin && <AdminPage />}
      </div>
      <BottomNav tab={tab} setTab={setTab} isAdmin={user.is_admin} />
    </div>
  );
}
