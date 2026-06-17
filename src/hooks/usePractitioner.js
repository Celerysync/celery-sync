import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase.js";

export function usePractitioner(authUser) {
  const [clients, setClients] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [protocol, setProtocol] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadClients = useCallback(async () => {
    if (!authUser?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("practitioner_clients")
      .select("*")
      .eq("practitioner_id", authUser.id)
      .order("created_at", { ascending: false });
    if (data) setClients(data);
    setLoading(false);
  }, [authUser?.id]);

  const createClient = useCallback(async (payload) => {
    if (!authUser?.id) return;
    const { data } = await supabase
      .from("practitioner_clients")
      .insert({ ...payload, practitioner_id: authUser.id })
      .select().single();
    if (data) setClients((prev) => [data, ...prev]);
    return data;
  }, [authUser?.id]);

  const updateClient = useCallback(async (id, updates) => {
    const { data } = await supabase
      .from("practitioner_clients")
      .update(updates).eq("id", id).select().single();
    if (data) setClients((prev) => prev.map((c) => c.id === id ? data : c));
  }, []);

  const deleteClient = useCallback(async (id) => {
    await supabase.from("practitioner_clients").delete().eq("id", id);
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const loadSessions = useCallback(async (clientId) => {
    const { data } = await supabase
      .from("practitioner_client_sessions")
      .select("*")
      .eq("client_id", clientId)
      .order("session_date", { ascending: false })
      .limit(30);
    if (data) setSessions(data);
  }, []);

  const saveSession = useCallback(async (clientId, sessionData) => {
    if (!authUser?.id) return;
    const { data } = await supabase
      .from("practitioner_client_sessions")
      .upsert(
        { ...sessionData, client_id: clientId, practitioner_id: authUser.id },
        { onConflict: "client_id,session_date" }
      ).select().single();
    if (data) setSessions((prev) => {
      const without = prev.filter((s) => s.session_date !== data.session_date);
      return [data, ...without];
    });
    return data;
  }, [authUser?.id]);

  const loadProtocol = useCallback(async (clientId) => {
    const { data } = await supabase
      .from("practitioner_protocols")
      .select("*").eq("client_id", clientId).single();
    setProtocol(data || null);
    return data;
  }, []);

  const saveProtocol = useCallback(async (clientId, content) => {
    if (!authUser?.id) return;
    const { data } = await supabase
      .from("practitioner_protocols")
      .upsert(
        { client_id: clientId, practitioner_id: authUser.id, content, generated_at: new Date().toISOString() },
        { onConflict: "client_id" }
      ).select().single();
    if (data) setProtocol(data);
    return data;
  }, [authUser?.id]);

  return {
    clients, sessions, protocol, loading,
    loadClients, createClient, updateClient, deleteClient,
    loadSessions, saveSession, loadProtocol, saveProtocol,
  };
}
