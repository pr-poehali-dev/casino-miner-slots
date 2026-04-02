const URLS = {
  auth: 'https://functions.poehali.dev/dc879f4a-9b31-41e2-9f61-292f5a2860c3',
  games: 'https://functions.poehali.dev/b7507abe-3c37-4671-9a9e-d629a8a6c5e4',
  admin: 'https://functions.poehali.dev/b85aabab-7dc5-4092-b463-9c357a025728',
  transfer: 'https://functions.poehali.dev/7dcc5548-6221-4a23-815a-6c4862d967e4',
};

async function req(base: string, path: string, method = 'GET', body?: object) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (typeof data === 'string') return JSON.parse(data);
    return data;
  } catch {
    return { error: text };
  }
}

export const api = {
  register: (username: string, password: string) =>
    req(URLS.auth, '/register', 'POST', { username, password }),
  login: (username: string, password: string) =>
    req(URLS.auth, '/login', 'POST', { username, password }),
  profile: (user_id: string) =>
    req(URLS.auth, `/profile?user_id=${user_id}`),

  minerStart: (user_id: string, bet: number, mines: number) =>
    req(URLS.games, '/miner/start', 'POST', { user_id, bet, mines }),
  minerReveal: (user_id: string, session_id: number, cell: number) =>
    req(URLS.games, '/miner/reveal', 'POST', { user_id, session_id, cell }),
  minerCashout: (user_id: string, session_id: number) =>
    req(URLS.games, '/miner/cashout', 'POST', { user_id, session_id }),

  crashStart: (user_id: string, bet: number) =>
    req(URLS.games, '/crash/start', 'POST', { user_id, bet }),
  crashCashout: (user_id: string, session_id: number, cashout_at: number) =>
    req(URLS.games, '/crash/cashout', 'POST', { user_id, session_id, cashout_at }),

  slotSpin: (user_id: string, bet: number) =>
    req(URLS.games, '/slot/spin', 'POST', { user_id, bet }),
  slotBonusSpin: (user_id: string, bet: number, buy_bonus = false, is_bonus_spin = false) =>
    req(URLS.games, '/slot-bonus/spin', 'POST', { user_id, bet, buy_bonus, is_bonus_spin }),

  adminUsers: (admin_id: string) =>
    req(URLS.admin, `/users?admin_id=${admin_id}`),
  adminStats: (admin_id: string) =>
    req(URLS.admin, `/stats?admin_id=${admin_id}`),
  adminGiveCoins: (admin_id: string, target_user_id: string, amount: number) =>
    req(URLS.admin, '/give-coins', 'POST', { admin_id, target_user_id, amount }),
  adminSetAdmin: (admin_id: string, target_user_id: string, is_admin: boolean) =>
    req(URLS.admin, '/set-admin', 'POST', { admin_id, target_user_id, is_admin }),
  adminBan: (admin_id: string, target_user_id: string, is_banned: boolean) =>
    req(URLS.admin, '/ban', 'POST', { admin_id, target_user_id, is_banned }),
  adminInitAdmin: (user_id: string, secret: string) =>
    req(URLS.admin, '/init-admin', 'POST', { user_id, secret }),

  transferFind: (user_id: string) =>
    req(URLS.transfer, `/find?user_id=${user_id}`),
  transferSend: (from_user_id: string, to_user_id: string, amount: number) =>
    req(URLS.transfer, '/send', 'POST', { from_user_id, to_user_id, amount }),
};

export type User = {
  user_id: string;
  username: string;
  balance: number;
  is_admin: boolean;
};
