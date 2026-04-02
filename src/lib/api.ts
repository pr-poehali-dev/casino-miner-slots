const URLS = {
  auth: 'https://functions.poehali.dev/dc879f4a-9b31-41e2-9f61-292f5a2860c3',
  games: 'https://functions.poehali.dev/b7507abe-3c37-4671-9a9e-d629a8a6c5e4',
  admin: 'https://functions.poehali.dev/b85aabab-7dc5-4092-b463-9c357a025728',
  transfer: 'https://functions.poehali.dev/7dcc5548-6221-4a23-815a-6c4862d967e4',
};

async function post(url: string, body: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

async function get(url: string, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${url}?${qs}`);
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
    post(URLS.auth, { action: 'register', username, password }),
  login: (username: string, password: string) =>
    post(URLS.auth, { action: 'login', username, password }),
  profile: (user_id: string) =>
    get(URLS.auth, { action: 'profile', user_id }),

  minerStart: (user_id: string, bet: number, mines: number) =>
    post(URLS.games, { action: 'miner_start', user_id, bet, mines }),
  minerReveal: (user_id: string, session_id: number, cell: number) =>
    post(URLS.games, { action: 'miner_reveal', user_id, session_id, cell }),
  minerCashout: (user_id: string, session_id: number) =>
    post(URLS.games, { action: 'miner_cashout', user_id, session_id }),

  crashStart: (user_id: string, bet: number) =>
    post(URLS.games, { action: 'crash_start', user_id, bet }),
  crashCashout: (user_id: string, session_id: number, cashout_at: number) =>
    post(URLS.games, { action: 'crash_cashout', user_id, session_id, cashout_at }),

  slotSpin: (user_id: string, bet: number) =>
    post(URLS.games, { action: 'slot_spin', user_id, bet }),
  slotBonusSpin: (user_id: string, bet: number, buy_bonus = false, is_bonus_spin = false) =>
    post(URLS.games, { action: 'slot_bonus_spin', user_id, bet, buy_bonus, is_bonus_spin }),

  adminUsers: (admin_id: string) =>
    post(URLS.admin, { action: 'users', admin_id }),
  adminStats: (admin_id: string) =>
    post(URLS.admin, { action: 'stats', admin_id }),
  adminGiveCoins: (admin_id: string, target_user_id: string, amount: number) =>
    post(URLS.admin, { action: 'give_coins', admin_id, target_user_id, amount }),
  adminSetAdmin: (admin_id: string, target_user_id: string, is_admin: boolean) =>
    post(URLS.admin, { action: 'set_admin', admin_id, target_user_id, is_admin }),
  adminBan: (admin_id: string, target_user_id: string, is_banned: boolean) =>
    post(URLS.admin, { action: 'ban', admin_id, target_user_id, is_banned }),
  adminInitAdmin: (user_id: string, secret: string) =>
    post(URLS.admin, { action: 'init_admin', user_id, secret }),

  transferFind: (user_id: string) =>
    post(URLS.transfer, { action: 'find', user_id }),
  transferSend: (from_user_id: string, to_user_id: string, amount: number) =>
    post(URLS.transfer, { action: 'send', from_user_id, to_user_id, amount }),
};

export type User = {
  user_id: string;
  username: string;
  balance: number;
  is_admin: boolean;
};
