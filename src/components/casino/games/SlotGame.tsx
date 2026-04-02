import { useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';

const SYMBOLS = ['🍋', '🍊', '🍇', '🍒', '⭐', '💎', '7️⃣'];
const PAYOUTS: Record<string, number> = { '7️⃣': 50, '💎': 20, '⭐': 10, '🍒': 5, '🍇': 3, '🍊': 2, '🍋': 1.5 };

export default function SlotGame() {
  const { user, updateBalance } = useStore();
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState([['🍋', '🍊', '🍇'], ['🍒', '⭐', '💎'], ['7️⃣', '🍋', '🍊']]);
  const [spinning, setSpinning] = useState(false);
  const [msg, setMsg] = useState('');
  const [win, setWin] = useState(0);
  const [highlight, setHighlight] = useState(false);

  async function spin() {
    if (!user || spinning) return;
    setSpinning(true);
    setMsg('');
    setWin(0);
    setHighlight(false);
    try {
      const data = await api.slotSpin(user.user_id, bet);
      if (data.error) { setMsg(data.error); return; }

      // Animate spin
      let count = 0;
      const timer = setInterval(() => {
        setReels([
          [SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)]],
          [SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)]],
          [SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)]],
        ]);
        count++;
        if (count >= 12) {
          clearInterval(timer);
          setReels(data.reels);
          updateBalance(data.balance);
          if (data.win > 0) {
            setWin(data.win);
            setHighlight(true);
            setMsg(data.result === 'win' ? `🎉 Джекпот! +${data.win.toFixed(2)} К` : `👍 Небольшой выигрыш +${data.win.toFixed(2)} К`);
          } else {
            setMsg('😔 Не повезло...');
          }
          setSpinning(false);
        }
      }, 80);
    } catch {
      setSpinning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card-casino p-4">
        <h3 className="font-oswald text-lg font-bold mb-3">🎰 Классический слот</h3>

        {/* Slot machine */}
        <div className={`rounded-2xl border-2 ${highlight ? 'border-primary animate-win' : 'border-border'} p-4 mb-4 transition-all`}>
          {/* Reels - 3 rows visible */}
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(reel => (
              <div key={reel} className="flex flex-col gap-1.5">
                {reels[reel].map((sym, row) => (
                  <div
                    key={row}
                    className={`aspect-square flex items-center justify-center text-2xl rounded-xl border transition-all ${
                      row === 1
                        ? highlight && reels[0][1] === reels[1][1] && reels[1][1] === reels[2][1]
                          ? 'border-primary bg-primary/10 scale-105'
                          : 'border-border bg-muted'
                        : 'border-border/50 bg-muted/50 opacity-60'
                    } ${spinning ? 'animate-bounce' : ''}`}
                  >
                    {sym}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {/* Win line indicator */}
          <div className="flex items-center justify-center mt-2 gap-2">
            <div className="h-px flex-1 bg-primary/30" />
            <span className="text-xs text-muted-foreground">линия выигрыша</span>
            <div className="h-px flex-1 bg-primary/30" />
          </div>
        </div>

        {/* Paytable compact */}
        <div className="grid grid-cols-4 gap-1 mb-4">
          {Object.entries(PAYOUTS).map(([sym, mult]) => (
            <div key={sym} className="text-center p-1.5 bg-muted rounded-lg">
              <div className="text-lg">{sym}</div>
              <div className="text-xs gold-text font-bold">×{mult}</div>
            </div>
          ))}
        </div>

        {/* Bet */}
        <div className="flex gap-2 mb-3">
          <input type="number" value={bet} min={1} onChange={e => setBet(Math.max(1, +e.target.value))}
            className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground" />
          {[10, 50, 100, 500].map(v => <button key={v} onClick={() => setBet(v)} className="px-2.5 py-2 bg-muted border border-border rounded-xl text-xs font-semibold hover:border-primary/50 transition-all">{v}</button>)}
        </div>

        <button onClick={spin} disabled={spinning} className="w-full btn-gold py-3 font-bold disabled:opacity-50 text-sm">
          {spinning ? '🎰 Крутим...' : `🎰 Крутить (${bet} К)`}
        </button>

        {msg && (
          <div className={`mt-3 text-center text-sm font-semibold p-3 rounded-xl ${win > 0 ? 'bg-green-900/20 text-green-400' : 'bg-muted'}`}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
