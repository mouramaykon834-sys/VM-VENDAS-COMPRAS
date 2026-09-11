// =============================================================
// SERVICE: ORÇAMENTOS — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

export async function listarOrcamentos({ status = null, busca = '' } = {}) {
  let q = supabase
    .from('quotes')
    .select('id, numero, cliente_nome, validade, total, status, created_at')
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);
  if (busca) q = q.ilike('numero', '%' + busca + '%');

  const r = await q;
  if (r.error) throw r.error;
  return r.data || [];
}

export async function buscarOrcamento(id) {
  const r = await supabase
    .from('quotes')
    .select('*, quote_items ( * )')
    .eq('id', id)
    .maybeSingle();
  if (r.error) throw r.error;
  return r.data;
}

export async function salvarOrcamento(dados, itens, id) {
  const subtotal = itens.reduce(function(s, i) {
    return s + (Number(i.preco_unitario) * Number(i.quantidade) - Number(i.desconto_item || 0));
  }, 0);
  const desconto = Number(dados.desconto) || 0;
  const frete = Number(dados.frete) || 0;
  const total = subtotal - desconto + frete;

  const payload = {
    cliente_id: dados.cliente_id || null,
    cliente_nome: dados.cliente_nome,
    cliente_telefone: dados.cliente_telefone || null,
    cliente_whatsapp: dados.cliente_whatsapp || null,
    cliente_email: dados.cliente_email || null,
    validade: dados.validade || null,
    subtotal: subtotal,
    desconto: desconto,
    frete: frete,
    total: total,
    condicao_pagamento: dados.condicao_pagamento || null,
    prazo_entrega: dados.prazo_entrega || null,
    observacoes: dados.observacoes || null,
    responsavel: dados.responsavel || null,
    status: dados.status || 'rascunho'
  };

  let quoteId = id;

  if (id) {
    const r = await supabase.from('quotes').update(payload).eq('id', id);
    if (r.error) throw r.error;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    payload.user_id = user ? user.id : null;
    const r = await supabase.from('quotes').insert(payload).select('id, numero').single();
    if (r.error) throw r.error;
    quoteId = r.data.id;
  }

  await supabase.from('quote_items').delete().eq('quote_id', quoteId);

  const itensPayload = itens.map(function(i) {
    return {
      quote_id: quoteId,
      product_id: i.product_id || null,
      product_nome: i.product_nome,
      preco_unitario: Number(i.preco_unitario),
      quantidade: Number(i.quantidade),
      desconto_item: Number(i.desconto_item || 0),
      subtotal: Number(i.preco_unitario) * Number(i.quantidade) - Number(i.desconto_item || 0)
    };
  });

  if (itensPayload.length) {
    const r = await supabase.from('quote_items').insert(itensPayload);
    if (r.error) throw r.error;
  }

  return quoteId;
}

export async function alterarStatusOrcamento(id, novoStatus) {
  const payload = { status: novoStatus };
  if (novoStatus === 'aprovado') payload.data_aprovacao = new Date().toISOString();
  const r = await supabase.from('quotes').update(payload).eq('id', id);
  if (r.error) throw r.error;
}

// -------------------------------------------------------------
// CONVERTER EM VENDA + criar conta a receber automaticamente
// -------------------------------------------------------------
export async function converterEmVenda(id) {
  // 1) Busca o orçamento completo
  const orc = await buscarOrcamento(id);
  if (!orc) throw new Error('Orçamento não encontrado.');
  if (orc.venda_id) throw new Error('Este orçamento já foi convertido.');

  // 2) Chama a função do banco para converter em venda
  const r = await supabase.rpc('converter_orcamento_em_venda', { p_quote_id: id });
  if (r.error) throw r.error;

  const vendaId = r.data;

  // 3) Cria automaticamente a conta a receber
  try {
    await supabase.rpc('criar_conta_receber', {
      p_order_id: vendaId,
      p_valor: Number(orc.total),
      p_descricao: 'Venda do orçamento ' + orc.numero,
      p_vencimento: null,
      p_parcelas: 1
    });
  } catch (e) {
    console.warn('[quotes] Conta a receber não criada:', e.message);
  }

  return vendaId;
}

export async function excluirOrcamento(id) {
  const r = await supabase.from('quotes').delete().eq('id', id);
  if (r.error) throw r.error;
}

export function rotuloStatus(s) {
  const map = {
    rascunho:   ['Rascunho', 'neutro'],
    enviado:    ['Enviado', 'info'],
    aguardando: ['Aguardando', 'alerta'],
    aprovado:   ['Aprovado', 'sucesso'],
    rejeitado:  ['Rejeitado', 'erro'],
    expirado:   ['Expirado', 'neutro'],
    cancelado:  ['Cancelado', 'erro'],
    convertido: ['Convertido em venda', 'sucesso']
  };
  const v = map[s] || [s, 'neutro'];
  return { texto: v[0], tipo: v[1] };
}
