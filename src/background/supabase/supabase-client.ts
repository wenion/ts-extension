import { createClient } from "@supabase/supabase-js";

declare const __SUPABASE_CONFIG__: {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};
const { SUPABASE_URL, SUPABASE_ANON_KEY } = __SUPABASE_CONFIG__;


export const chromeStorageAdapter = {
  getItem: async (key: string) => {
    const obj = await chrome.storage.local.get(key);
    return (obj && obj[key]) ?? null;
  },
  setItem: async (key: string, value: string) => { await chrome.storage.local.set({ [key]: value }); },
  removeItem: async (key: string) => { await chrome.storage.local.remove(key); },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // no window in service worker
  },
});
