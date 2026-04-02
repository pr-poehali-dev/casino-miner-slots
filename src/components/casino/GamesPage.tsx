import { useState } from 'react';
import BalanceBar from './BalanceBar';
import MinerGame from './games/MinerGame';
import CrashGame from './games/CrashGame';
import SlotGame from './games/SlotGame';
import SlotBonusGame from './games/SlotBonusGame';
import Icon from '@/components/ui/icon';

const GAMES = [
  { id: 'miner', name: 'Минёр', emoji: '💣', color: 'text-red-400' },
  { id: 'crash', name: 'Краш', emoji: '🚀', color: 'text-blue-400' },
  { id: 'slot', name: 'Слот', emoji: '🎰', color: 'text-purple-400' },
  { id: 'slot_bonus', name: 'Бонус Слот', emoji: '🎁', color: 'text-amber-400' },
];

export default function GamesPage() {
  const [active, setActive] = useState('miner');

  return (
    <div className="animate-fade-in">
      <BalanceBar />

      {/* Game tabs */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {GAMES.map(g => (
            <button
              key={g.id}
              onClick={() => setActive(g.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                active === g.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{g.emoji}</span>
              <span>{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-2 pb-4">
        {active === 'miner' && <MinerGame />}
        {active === 'crash' && <CrashGame />}
        {active === 'slot' && <SlotGame />}
        {active === 'slot_bonus' && <SlotBonusGame />}
      </div>
    </div>
  );
}
