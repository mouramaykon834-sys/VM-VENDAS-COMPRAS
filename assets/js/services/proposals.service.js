// =============================================================
// SERVICE: PROPOSTAS — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// Cria proposta
// -------------------------------------------------------------
export async function criarProposta({ product_id, valor_proposta, quantidade, mensagem }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Faça login para enviar uma proposta.');

  const { data: prod, error: errProd } = await supabase
    .from('products')
    .select('preco, preco_promocional')
    .eq('id', product_id)
    .maybeSingle();
  if (errProd || !prod) throw new Error('Produto não encontrado.');

  const precoAnunciado = prod.preco_promocional || prod.preco;

  const { data, error } = await supabase
    .from('proposals')
    .insert({
      user_id: user.id,
      product_id,
      preco_anunciado: precoAnunciado,
      valor_proposta,
      quantidade,
      mensagem: mensagem?.trim() || null,
      status: 'enviada'
    })
    .select('id, numero')
    .single();

  if (error) throw error;

  await supabase.from('notifications').insert({
    user_id: user.id,
    tipo: 'proposta',
    titulo: 'Nova proposta enviada',
    mensagem: `Proposta ${data.numero} aguardando resposta.`,
    link: `./proposta.html?id=${data.id}`
  });

  return data;
}

// -------------------------------------------------------------
// Lista minhas propostas
// -------------------------------------------------------------
export async function listarMinhasPropostas() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('proposals')
    .select(`id, numero, valor_proposta, preco_anunciado, quantidade, status, created_at, valor_contra, resposta_loja, product_id, products ( nome, product_images ( url, principal, ordem ) )`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// -------------------------------------------------------------
// Busca uma proposta específica
// -------------------------------------------------------------
export async function buscarProposta(id) {
  const { data, error } = await supabase
    .from('proposals')
    .select(`*, profiles:user_id ( id, nome, email, telefone, whatsapp ), products:product_id ( id, nome, preco, preco_promocional, product_images ( url, principal, ordem ) )`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// -------------------------------------------------------------
// Admin: lista todas
// -------------------------------------------------------------
export async function listarTodasPropostas({ status = null } = {}) {
  let q = supabase
    .from('proposals')
    .select(`id, numero, valor_proposta, preco_anunciado, quantidade, status, created_at, user_id, product_id, profiles:user_id ( nome, email ), products:product_id ( nome )`)
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// -------------------------------------------------------------
// Cliente cancela
// -------------------------------------------------------------
export async function cancelarProposta(id) {
  const { error } = await supabase.from('proposals').update({ status: 'cancelada' }).eq('id', id);
  if (error) throw error;
}

// -------------------------------------------------------------
// Admin responde
// -------------------------------------------------------------
export async function responderProposta(id, { status, valor_contra, resposta_loja }) {
  const payload = { status };
  if (valor_contra != null) payload.valor_contra = valor_contra;
  if (resposta_loja != null) payload.resposta_loja = resposta_loja;
  const { error } = await supabase.from('proposals').update(payload).eq('id', id);
  if (error) throw error;

  // Notifica o cliente
  const { data: prop } = await supabase.from('proposals').select('user_id, numero').eq('id', id).maybeSingle();
  if (prop) {
    const titulos = {
      contraproposta: 'A loja enviou uma contraproposta',
      aceita: 'Sua proposta foi aceita!',
      recusada: 'Sua proposta foi recusada',
      em_analise: 'Sua proposta está em análise'
    };
    await supabase.from('notifications').insert({
      user_id: prop.user_id,
      tipo: 'proposta',
      titulo: titulos[status] || 'Atualização na sua proposta',
      mensagem: `Proposta ${prop.numero}`,
      link: `./proposta.html?id=${id}`
    });
  }
}

export function rotuloStatusProposta(s) {
  const map = {
    enviada:        ['Enviada', 'info'],
    em_analise:     ['Em análise', 'info'],
    contraproposta: ['Contraproposta', 'alerta'],
    aceita:         ['Aceita', 'sucesso'],
    recusada:       ['Recusada', 'erro'],
    cancelada:      ['Cancelada', 'neutro'],
    concluida:      ['Concluída', 'sucesso']
  };
  const [texto, tipo] = map[s] || [s, 'neutro'];
  return { texto, tipo };
}