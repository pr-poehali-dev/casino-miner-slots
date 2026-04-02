import { useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';

const SYMBOLS = ['🎰', '🃏', '👑', '🔔', '💰', '🌟', '🎁'];
const PAYOUTS: Record<string, number> = { '👑': 30, '💰': 20, '🌟': 15, '🔔': 8, '🃏': 4, '🎰': 2, '🎁': 5 };

export default function SlotBonusGame() {
  const { user, updateBalance } = useStore();
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState([['🎰', '🃏', '👑'], ['🔔', '💰', '🌟'], ['🎁', '🎰', '🃏']]);
  const [spinning, setSpinning] = useState(false);
  const [msg, setMsg] = useState('');
  const [win, setWin] = useState(0);
  const [bonusSpins, setBonusSpins] = useState(0);
  const [isBonusMode, setIsBonusMode] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const [totalWin, setTotalWin] = useState(0);

  async function spin(buyBonus = false, isBonusSpin = false) {
    if (!user || spinning) return;
    setSpinning(true);
    setMsg('');
    setWin(0);
    setHighlight(false);
    try {
      const data = await api.slotBonusSpin(user.user_id, bet, buyBonus, isBonusSpin);
      if (data.error) { setMsg(data.error); return; }

      let count = 0;
      const timer = setInterval(() => {
        setReels([
          [SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)]],
          [SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)]],
          [SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)], SYMBOLS[Math.floor(Math.random() * 7)]],
        ]);
        count++;
        if (count >= 14) {
          clearInterval(timer);
          setReels(data.reels);
          updateBalance(data.balance);

          if (data.bonus_triggered && !isBonusSpin) {
            setBonusSpins(data.bonus_spins);
            setIsBonusMode(true);
            setTotalWin(0);
            setMsg(`🎁 БОНУСНАЯ ИГРА! ${data.bonus_spins} бесплатных спинов!`);
          }

          if (data.win > 0) {
            setWin(data.win);
            setHighlight(true);
            if (isBonusSpin) {
              setTotalWin(prev => prev + data.win);
              setMsg(`🌟 Бонусный выигрыш +${data.win.toFixed(2)} К`);
            } else if (!data.bonus_triggered) {
              setMsg(data.result === 'win' ? `🎉 Выигрыш! +${data.win.toFixed(2)} К` : `👍 +${data.win.toFixed(2)} К`);
            }
          } else if (!data.bonus_triggered) {
            setMsg('😔 Не повезло...');
          }
          setSpinning(false);
        }
      }, 80);
    } catch {
      setSpinning(false);
    }
  }

  async function spinBonus() {
    if (bonusSpins <= 0) return;
    setBonusSpins(prev => prev - 1);
    await spin(false, true);
    if (bonusSpins - 1 <= 0) {
      setTimeout(() => {
        setIsBonusMode(false);
        setMsg(`🏆 Бонусная игра завершена! Итого: +${totalWin.toFixed(2)} К`);
      }, 1000);
    }
  }

  const bonusCount = reels.flat().filter(s => s === '🎁').length;

  return (
    <div className="space-y-4">
      <div className={`card-casino p-4 ${isBonusMode ? 'border-amber-500/50 bg-amber-900/5' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-oswald text-lg font-bold">🎁 Бонус Слот</h3>
          {isBonusMode && (
            <div className="flex items-center gap-1.5 bg-amber-900/20 border border-amber-600/30 px-3 py-1 rounded-full">
              <span className="text-xs font-bold gold-text">БОНУС</span>
              <span className="text-xs gold-text font-black">{bonusSpins}</span>
            </div>
          )}
        </div>

        {/* Reels */}
        <div className={`rounded-2xl border-2 p-4 mb-4 transition-all ${highlight ? 'border-primary animate-win' : isBonusMode ? 'border-amber-500/40' : 'border-border'}`}>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(reel => (
              <div key={reel} className="flex flex-col gap-1.5">
                {reels[reel].map((sym, row) => (
                  <div
                    key={row}
                    className={`aspect-square flex items-center justify-center text-2xl rounded-xl border transition-all ${
                      sym === '🎁' ? 'border-amber-500/60 bg-amber-900/20' :
                      row === 1 ? 'border-border bg-muted' : 'border-border/50 bg-muted/50 opacity-60'
                    } ${spinning ? 'animate-bounce' : ''}`}
                  >
                    {sym}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center mt-2 gap-2">
            <div className="h-px flex-1 bg-primary/30" />
            <span className="text-xs text-muted-foreground">
              {bonusCount >= 2 ? `🎁 ${bonusCount}/3 бонусов` : 'линия выигрыша'}
            </span>
            <div className="h-px flex-1 bg-primary/30" />
          </div>
        </div>

        {/* Paytable */}
        <div className="grid grid-cols-4 gap-1 mb-4">
          {Object.entries(PAYOUTS).map(([sym, mult]) => (
            <div key={sym} className={`text-center p-1.5 rounded-lg ${sym === '🎁' ? 'bg-amber-900/20 border border-amber-700/30' : 'bg-muted'}`}>
              <div className="text-lg">{sym}</div>
              <div className={`text-xs font-bold ${sym === '🎁' ? 'gold-text' : 'text-muted-foreground'}`}>×{mult}{sym === '🎁' ? '*' : ''}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-3">*🎁 ×3 = Бонусная игра (10 спинов ×3 множитель)</p>

        {!isBonusMode && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input type="number" value={bet} min={1} onChange={e => setBet(Math.max(1, +e.target.value))}
                className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground" />
              {[10, 50, 100].map(v => <button key={v} onClick={() => setBet(v)} className="px-2.5 py-2 bg-muted border border-border rounded-xl text-xs font-semibold hover:border-primary/50 transition-all">{v}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => spin(false)} disabled={spinning} className="btn-gold py-3 font-bold disabled:opacity-50 text-sm">
                {spinning ? '🎰...' : `Крутить (${bet} К)`}
              </button>
              <button
                onClick={() => spin(true)}
                disabled={spinning}
                className="py-3 bg-amber-900/30 border border-amber-700/40 text-amber-400 font-bold rounded-xl hover:bg-amber-900/50 transition-all disabled:opacity-50 text-sm"
              >
                🎁 Купить бонус ({bet * 100} К)
              </button>
            </div>
          </div>
        )}

        {isBonusMode && bonusSpins > 0 && (
          <button onClick={spinBonus} disabled={spinning} className="w-full py-3 bg-amber-900/30 border border-amber-700/40 text-amber-400 font-bold rounded-xl hover:bg-amber-900/50 transition-all disabled:opacity-50">
            {spinning ? '🌟 Крутим...' : `🎁 Бонусный спин (осталось: ${bonusSpins})`}
          </button>
        )}

        {msg && (
          <div className={`mt-3 text-center text-sm font-semibold p-3 rounded-xl ${win > 0 || isBonusMode ? 'bg-amber-900/20 text-amber-400' : 'bg-muted text-muted-foreground'}`}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
