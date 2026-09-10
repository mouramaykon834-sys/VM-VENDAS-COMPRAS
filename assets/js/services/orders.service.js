// =============================================================
// SERVICE: PEDIDOS — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// Cria um pedido completo a partir do carrinho
// -------------------------------------------------------------
export async function criarPedido({
  itens,
  dadosContato = {},
  observacoes = ''
}) {
  if (!Array.isArray(itens) || !itens.length) {
    throw new Error('Carrinho vazio.');
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('É preciso estar logado para finalizar o pedido.');

  // Calcula totais
  const subtotal = itens.reduce((s, i) => s + (Number(i.preco) * Number(i.quantidade)), 0);
  const total = subtotal;

  // Cria o pedido
  const { data: pedido, error: errPedido } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      status: 'aguardando',
      subtotal,
      desconto: 0,
      total,
      observacoes: observacoes?.trim() || null,
      nome_contato: dadosContato.nome || null,
      telefone: dadosContato.telefone || null,
      whatsapp: dadosContato.whatsapp || null,
      email_contato: dadosContato.email || null,
      endereco: dadosContato.endereco || null
    })
    .select('id, numero')
    .single();

  if (errPedido) {
    console.error('[orders.service] Erro ao criar pedido:', errPedido);
    throw errPedido;
  }

  // Cria os itens
  const itensPayload = itens.map(i => ({
    order_id: pedido.id,
    product_id: i.id,
    product_nome: i.nome,
    product_sku: i.sku || null,
    product_imagem: i.imagem || null,
    preco_unitario: Number(i.preco),
    quantidade: Number(i.quantidade),
    subtotal: Number(i.preco) * Number(i.quantidade)
  }));

  const { error: errItens } = await supabase.from('order_items').insert(itensPayload);
  if (errItens) {
    console.error('[orders.service] Erro ao criar itens:', errItens);
    throw errItens;
  }

  // Notifica admin (usa a tabela notifications)
  try {
    await supabase.from('notifications').insert({
      user_id: user.id,
      tipo: 'pedido',
      titulo: 'Novo pedido recebido',
      mensagem: `Pedido ${pedido.numero} no valor de R$ ${total.toFixed(2)}`,
      link: `/admin/pedidos.html`
    });
  } catch (_) { /* silencioso */ }

  return { id: pedido.id, numero: pedido.numero, total };
}

// -------------------------------------------------------------
// Lista pedidos do usuário logado
// -------------------------------------------------------------
export async function listarMeusPedidos() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('orders')
    .select(`id, numero, status, total, created_at, order_items ( id, product_nome, quantidade, preco_unitario, product_imagem )`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// -------------------------------------------------------------
// Busca um pedido por id (com itens)
// -------------------------------------------------------------
export async function buscarPedido(id) {
  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items ( * )`)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// -------------------------------------------------------------
// Lista pedidos para o admin (com nome do cliente)
// -------------------------------------------------------------
export async function listarTodosPedidos({ status = null, busca = '' } = {}) {
  let q = supabase
    .from('orders')
    .select(`id, numero, status, total, created_at, nome_contato, user_id, order_items ( id, product_nome, quantidade )`)
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// -------------------------------------------------------------
// Atualiza status do pedido
// -------------------------------------------------------------
export async function atualizarStatusPedido(id, novoStatus, obsAdmin = null) {
  const payload = { status: novoStatus };
  if (obsAdmin != null) payload.obs_admin = obsAdmin;

  const { error } = await supabase.from('orders').update(payload).eq('id', id);
  if (error) throw error;
}

// -------------------------------------------------------------
// Traduz status para texto amigável
// -------------------------------------------------------------
export function rotuloStatusPedido(s) {
  const map = {
    aguardando:    ['Aguardando', 'alerta'],
    recebido:      ['Recebido', 'info'],
    em_analise:    ['Em análise', 'info'],
    confirmado:    ['Confirmado', 'sucesso'],
    em_preparacao: ['Em preparação', 'info'],
    enviado:       ['Enviado', 'info'],
    concluido:     ['Concluído', 'sucesso'],
    cancelado:     ['Cancelado', 'erro']
  };
  const [texto, tipo] = map[s] || [s, 'neutro'];
  return { texto, tipo };
}