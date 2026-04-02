import { useState } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';

type State = 'idle' | 'playing' | 'win' | 'lose';

export default function MinerGame() {
  const { user, updateBalance } = useStore();
  const [bet, setBet] = useState(10);
  const [mines, setMines] = useState(3);
  const [state, setState] = useState<State>('idle');
  const [sessionId, setSessionId] = useState<number>(0);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [potentialWin, setPotentialWin] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function startGame() {
    if (!user) return;
    setLoading(true);
    setMsg('');
    try {
      const data = await api.minerStart(user.user_id, bet, mines);
      if (data.error) { setMsg(data.error); return; }
      setSessionId(data.session_id);
      setState('playing');
      setRevealed([]);
      setMinePositions([]);
      setMultiplier(1);
      setPotentialWin(bet);
      updateBalance(data.balance);
    } finally {
      setLoading(false);
    }
  }

  async function revealCell(cell: number) {
    if (!user || state !== 'playing' || revealed.includes(cell) || loading) return;
    setLoading(true);
    try {
      const data = await api.minerReveal(user.user_id, sessionId, cell);
      if (data.result === 'mine') {
        setMinePositions(data.mines);
        setRevealed(prev => [...prev, cell]);
        setState('lose');
        setMsg('💥 Мина! Вы проиграли.');
      } else {
        setRevealed(data.revealed);
        setMultiplier(data.multiplier);
        setPotentialWin(data.potential_win);
      }
    } finally {
      setLoading(false);
    }
  }

  async function cashout() {
    if (!user || state !== 'playing' || revealed.length === 0) return;
    setLoading(true);
    try {
      const data = await api.minerCashout(user.user_id, sessionId);
      if (data.error) { setMsg(data.error); return; }
      setState('win');
      setMsg(`✅ Выигрыш: +${data.win.toFixed(2)} К (×${data.multiplier})`);
      updateBalance(data.balance);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setState('idle');
    setRevealed([]);
    setMinePositions([]);
    setMsg('');
  }

  const getCellIcon = (i: number) => {
    if (minePositions.includes(i)) return '💣';
    if (revealed.includes(i)) return '💎';
    return '';
  };

  const getCellClass = (i: number) => {
    if (minePositions.includes(i)) return 'game-cell mine';
    if (revealed.includes(i)) return 'game-cell safe';
    return 'game-cell';
  };

  return (
    <div className="space-y-4">
      <div className="card-casino p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-oswald text-lg font-bold">💣 Минёр</h3>
          {state === 'playing' && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Потенциальный выигрыш</div>
              <div className="font-oswald font-bold gold-text text-lg">{potentialWin.toFixed(2)} К</div>
              <div className="text-xs text-muted-foreground">×{multiplier}</div>
            </div>
          )}
        </div>

        {state === 'idle' && (
          <div className="space-y-3 mt-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Ставка</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={bet}
                  min={1}
                  onChange={e => setBet(Math.max(1, +e.target.value))}
                  className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground"
                />
                {[10, 50, 100, 500].map(v => (
                  <button key={v} onClick={() => setBet(v)} className="px-3 py-2 bg-muted border border-border rounded-xl text-xs font-semibold hover:border-primary/50 transition-all">{v}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Мины: {mines}</label>
              <input type="range" min={1} max={20} value={mines} onChange={e => setMines(+e.target.value)} className="w-full accent-yellow-400" />
              <div className="flex justify-between text-xs text-muted-foreground mt-0.5"><span>1</span><span>20</span></div>
            </div>
            <button onClick={startGame} disabled={loading} className="w-full btn-gold py-3 font-bold disabled:opacity-50">
              {loading ? 'Загрузка...' : `Играть (${bet} К)`}
            </button>
          </div>
        )}

        {(state === 'playing' || state === 'lose' || state === 'win') && (
          <div className="mt-3">
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {Array.from({ length: 25 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => revealCell(i)}
                  disabled={state !== 'playing' || revealed.includes(i) || minePositions.includes(i)}
                  className={getCellClass(i)}
                >
                  {getCellIcon(i)}
                </button>
              ))}
            </div>

            {state === 'playing' && (
              <button
                onClick={cashout}
                disabled={revealed.length === 0 || loading}
                className="w-full btn-gold py-2.5 font-bold disabled:opacity-40"
              >
                Забрать {potentialWin.toFixed(2)} К
              </button>
            )}
          </div>
        )}

        {msg && (
          <div className={`mt-3 text-center text-sm font-semibold p-3 rounded-xl ${state === 'win' ? 'bg-green-900/20 text-green-400' : state === 'lose' ? 'bg-red-900/20 text-red-400' : 'text-foreground'}`}>
            {msg}
          </div>
        )}

        {(state === 'win' || state === 'lose') && (
          <button onClick={reset} className="w-full mt-2 py-2.5 bg-muted border border-border rounded-xl text-sm font-semibold hover:border-primary/40 transition-all">
            Новая игра
          </button>
        )}
      </div>
    </div>
  );
}
