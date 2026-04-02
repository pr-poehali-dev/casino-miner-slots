import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';

type State = 'idle' | 'running' | 'cashed' | 'crashed';

export default function CrashGame() {
  const { user, updateBalance } = useStore();
  const [bet, setBet] = useState(10);
  const [autoCashout, setAutoCashout] = useState(2.0);
  const [state, setState] = useState<State>('idle');
  const [sessionId, setSessionId] = useState(0);
  const [crashAt, setCrashAt] = useState(0);
  const [current, setCurrent] = useState(1.0);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const cashedRef = useRef(false);

  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  async function startGame() {
    if (!user) return;
    setLoading(true);
    setMsg('');
    try {
      const data = await api.crashStart(user.user_id, bet);
      if (data.error) { setMsg(data.error); return; }
      setSessionId(data.session_id);
      setCrashAt(data.crash_at);
      setCurrent(1.0);
      setState('running');
      cashedRef.current = false;
      updateBalance(data.balance);

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(async () => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const mult = parseFloat((1 + elapsed * 0.5).toFixed(2));
        setCurrent(mult);

        // Auto cashout
        if (!cashedRef.current && mult >= autoCashout) {
          cashedRef.current = true;
          stopTimer();
          const res = await api.crashCashout(user.user_id, data.session_id, mult);
          if (res.result === 'win') {
            setState('cashed');
            setMsg(`✅ Выигрыш: +${res.win.toFixed(2)} К (×${mult})`);
            updateBalance(res.balance);
          } else {
            setState('crashed');
            setMsg(`💥 Краш на ×${res.crash_at}`);
          }
          return;
        }

        if (mult >= data.crash_at) {
          stopTimer();
          setState('crashed');
          setCurrent(data.crash_at);
          setMsg(`💥 Краш на ×${data.crash_at}`);
          // Record lose
          await api.crashCashout(user.user_id, data.session_id, data.crash_at + 0.01);
        }
      }, 100);
    } finally {
      setLoading(false);
    }
  }

  async function manualCashout() {
    if (state !== 'running' || cashedRef.current || !user) return;
    cashedRef.current = true;
    stopTimer();
    const data = await api.crashCashout(user.user_id, sessionId, current);
    if (data.result === 'win') {
      setState('cashed');
      setMsg(`✅ Выигрыш: +${data.win.toFixed(2)} К (×${current})`);
      updateBalance(data.balance);
    } else {
      setState('crashed');
      setMsg(`💥 Краш на ×${data.crash_at}`);
    }
  }

  useEffect(() => () => stopTimer(), []);

  function reset() { setState('idle'); setCurrent(1.0); setMsg(''); }

  const color = state === 'crashed' ? 'text-red-400' : state === 'cashed' ? 'text-green-400' : current >= 2 ? 'text-green-400' : 'gold-text';

  return (
    <div className="space-y-4">
      <div className="card-casino p-4">
        <h3 className="font-oswald text-lg font-bold mb-3">🚀 Краш</h3>

        {/* Multiplier display */}
        <div className={`text-center py-8 rounded-2xl bg-muted mb-4 transition-colors ${state === 'crashed' ? 'bg-red-900/20' : state === 'cashed' ? 'bg-green-900/20' : ''}`}>
          <div className={`font-oswald text-6xl font-black ${color} transition-colors`}>
            ×{current.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {state === 'running' ? '🚀 Летит...' : state === 'crashed' ? '💥 Краш!' : state === 'cashed' ? '✅ Забрано!' : 'Ожидание'}
          </div>
        </div>

        {state === 'idle' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Ставка</label>
              <div className="flex gap-2">
                <input type="number" value={bet} min={1} onChange={e => setBet(Math.max(1, +e.target.value))}
                  className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground" />
                {[10, 50, 100].map(v => <button key={v} onClick={() => setBet(v)} className="px-3 py-2 bg-muted border border-border rounded-xl text-xs font-semibold hover:border-primary/50 transition-all">{v}</button>)}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Авто-вывод: ×{autoCashout}</label>
              <input type="range" min={1.1} max={10} step={0.1} value={autoCashout} onChange={e => setAutoCashout(+e.target.value)} className="w-full accent-yellow-400" />
            </div>
            <button onClick={startGame} disabled={loading} className="w-full btn-gold py-3 font-bold disabled:opacity-50">
              {loading ? 'Загрузка...' : `Играть (${bet} К)`}
            </button>
          </div>
        )}

        {state === 'running' && (
          <button onClick={manualCashout} className="w-full py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-xl transition-all text-sm">
            Забрать ×{current.toFixed(2)} = {(bet * current).toFixed(2)} К
          </button>
        )}

        {msg && (
          <div className={`mt-3 text-center text-sm font-semibold p-3 rounded-xl ${state === 'cashed' ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
            {msg}
          </div>
        )}

        {(state === 'crashed' || state === 'cashed') && (
          <button onClick={reset} className="w-full mt-2 py-2.5 bg-muted border border-border rounded-xl text-sm font-semibold hover:border-primary/40 transition-all">
            Новая игра
          </button>
        )}
      </div>
    </div>
  );
}
