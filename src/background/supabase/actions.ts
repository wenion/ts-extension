import { supabase } from "./supabase-client";

export const supabaseActions = {
  // 🔐 Update current auth session
  async updateSession(session: any) {
    const { error, data } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) throw error;
    console.log("Supabase session updated:", data);
    return data;
  },

  // 📥 Read all rows from a table
  async getAll(table: string) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    return data;
  },

  // ➕ Insert a new row
  async insert(table: string, payload: any) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    if (!userId) throw new Error("User not logged in");

    const record = { ...payload, user_id: userId };

    const { data, error } = await supabase.from(table).insert([record]).select();
    if (error) throw error;
    return data;
  },

  // ✏️ Update existing rows
  async update(table: string, match: object, updates: object) {
    const { data, error } = await supabase.from(table).update(updates).match(match).select();
    if (error) throw error;
    return data;
  },

  // ❌ Delete rows
  async remove(table: string, match: object) {
    const { data, error } = await supabase.from(table).delete().match(match).select();
    if (error) throw error;
    return data;
  },
};