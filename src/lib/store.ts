import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from './api';

interface Store {
  user: User | null;
  setUser: (user: User | null) => void;
  updateBalance: (balance: number) => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      updateBalance: (balance) => set((s) => s.user ? { user: { ...s.user, balance } } : {}),
    }),
    { name: 'casino-user' }
  )
);
