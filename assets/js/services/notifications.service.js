// =============================================================
// SERVICE: NOTIFICAÇÕES — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

export async function listarMinhasNotificacoes({ apenasNaoLidas = false } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let q = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (apenasNaoLidas) q = q.eq('lida', false);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function contarNaoLidas() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('lida', false);
  return count || 0;
}

export async function marcarLida(id) {
  await supabase.from('notifications').update({ lida: true }).eq('id', id);
}

export async function marcarTodasLidas() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('notifications').update({ lida: true }).eq('user_id', user.id).eq('lida', false);
}

export async function criarNotificacao({ user_id, tipo, titulo, mensagem, link }) {
  await supabase.from('notifications').insert({ user_id, tipo, titulo, mensagem, link });
}