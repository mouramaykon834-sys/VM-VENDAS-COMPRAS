// =============================================================
// SERVICE: CHAT — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// Abre (ou cria) conversa do usuário com a loja
// -------------------------------------------------------------
export async function abrirConversa({ product_id = null, proposal_id = null, order_id = null, assunto = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Faça login para conversar.');

  let q = supabase.from('chats').select('id').eq('user_id', user.id).limit(1);
  if (product_id)  q = q.eq('product_id', product_id);
  else if (proposal_id) q = q.eq('proposal_id', proposal_id);
  else if (order_id) q = q.eq('order_id', order_id);
  else q = q.is('product_id', null).is('proposal_id', null).is('order_id', null);

  const { data: ex } = await q.maybeSingle();
  if (ex?.id) return ex.id;

  const { data, error } = await supabase.from('chats').insert({
    user_id: user.id, product_id, proposal_id, order_id,
    assunto: assunto || 'Conversa com a loja'
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

// -------------------------------------------------------------
// Lista conversas do cliente
// -------------------------------------------------------------
export async function listarMinhasConversas() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('chats')
    .select(`id, assunto, ultima_msg, ultima_msg_at, nao_lidas_cliente, product_id, products:product_id ( nome, product_images ( url, principal, ordem ) )`)
    .eq('user_id', user.id)
    .order('ultima_msg_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data || [];
}

// -------------------------------------------------------------
// Admin: lista todas
// -------------------------------------------------------------
export async function listarTodasConversas() {
  const { data, error } = await supabase
    .from('chats')
    .select(`id, assunto, ultima_msg, ultima_msg_at, nao_lidas_admin, user_id, profiles:user_id ( nome, email )`)
    .order('ultima_msg_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data || [];
}

// -------------------------------------------------------------
// Busca chat por id
// -------------------------------------------------------------
export async function buscarChat(id) {
  const { data, error } = await supabase
    .from('chats')
    .select(`*, profiles:user_id ( id, nome, email, whatsapp ), products:product_id ( id, nome )`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// -------------------------------------------------------------
// Lista mensagens do chat
// -------------------------------------------------------------
export async function listarMensagens(chatId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// -------------------------------------------------------------
// Envia mensagem
// -------------------------------------------------------------
export async function enviarMensagem(chatId, { conteudo, imagem_url = null, storage_path = null }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Faça login.');

  const { data: perfil } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  const role = perfil?.role === 'admin' ? 'admin' : 'cliente';

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ chat_id: chatId, sender_id: user.id, sender_role: role, conteudo, imagem_url, storage_path })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

// -------------------------------------------------------------
// Marca mensagens como lidas (zera contador do lado certo)
// -------------------------------------------------------------
export async function marcarComoLidas(chatId, lado) {
  const campo = lado === 'admin' ? 'nao_lidas_admin' : 'nao_lidas_cliente';
  await supabase.from('chats').update({ [campo]: 0 }).eq('id', chatId);
}

// -------------------------------------------------------------
// Upload de imagem no chat
// -------------------------------------------------------------
export async function uploadImagemChat(chatId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${chatId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

  const { error } = await supabase.storage.from('chat').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from('chat').getPublicUrl(path);
  return { url: data.publicUrl, path };
}