// =============================================================
// SERVICE: COMPRAS — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

export async function listarCompras({ status = null, supplier_id = null, busca = '' } = {}) {
  let q = supabase
    .from('purchases')
    .select('id, numero, status, data_pedido, data_recebimento, total, supplier_nome, supplier_id')
    .order('created_at', { ascending: false });

  if (status) q = q.eq('status', status);
  if (supplier_id) q = q.eq('supplier_id', supplier_id);
  if (busca) q = q.ilike('numero', '%' + busca + '%');

  const r = await q;
  if (r.error) throw r.error;
  return r.data || [];
}

export async function buscarCompra(id) {
  const r = await supabase
    .from('purchases')
    .select('*, suppliers:supplier_id ( * ), purchase_items ( * )')
    .eq('id', id)
    .maybeSingle();
  if (r.error) throw r.error;
  return r.data;
}

export async function salvarCompra(dados, itens, id) {
  const subtotal = itens.reduce(function(s, i) { return s + (Number(i.custo_unitario) * Number(i.quantidade)); }, 0);
  const desconto = Number(dados.desconto) || 0;
  const frete = Number(dados.frete) || 0;
  const total = subtotal - desconto + frete;

  const payload = {
    supplier_id: dados.supplier_id || null,
    supplier_nome: dados.supplier_nome || null,
    status: dados.status || 'rascunho',
    data_pedido: dados.data_pedido || new Date().toISOString().slice(0, 10),
    data_previsao: dados.data_previsao || null,
    subtotal: subtotal,
    desconto: desconto,
    frete: frete,
    total: total,
    condicao_pagamento: dados.condicao_pagamento || null,
    prazo_entrega: dados.prazo_entrega || null,
    observacoes: dados.observacoes || null
  };

  let purchaseId = id;
  if (id) {
    const r = await supabase.from('purchases').update(payload).eq('id', id);
    if (r.error) throw r.error;
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    payload.user_id = user ? user.id : null;
    const r = await supabase.from('purchases').insert(payload).select('id').single();
    if (r.error) throw r.error;
    purchaseId = r.data.id;
  }

  await supabase.from('purchase_items').delete().eq('purchase_id', purchaseId);

  const itensPayload = itens.map(function(i) {
    return {
      purchase_id: purchaseId,
      product_id: i.product_id || null,
      product_nome: i.product_nome,
      custo_unitario: Number(i.custo_unitario),
      quantidade: Number(i.quantidade),
      subtotal: Number(i.custo_unitario) * Number(i.quantidade)
    };
  });

  if (itensPayload.length) {
    const r = await supabase.from('purchase_items').insert(itensPayload);
    if (r.error) throw r.error;
  }

  return purchaseId;
}

export async function alterarStatusCompra(id, novoStatus) {
  const r = await supabase.from('purchases').update({ status: novoStatus }).eq('id', id);
  if (r.error) throw r.error;
}

// -------------------------------------------------------------
// RECEBER COMPRA + criar conta a pagar automaticamente
// -------------------------------------------------------------
export async function receberCompra(id) {
  // 1) Busca a compra completa
  const compra = await buscarCompra(id);
  if (!compra) throw new Error('Compra não encontrada.');
  if (compra.status === 'recebida') throw new Error('Esta compra já foi recebida.');

  // 2) Chama a função do banco para receber (atualiza estoque)
  const r = await supabase.rpc('receber_compra', { p_purchase_id: id });
  if (r.error) throw r.error;

  // 3) Cria automaticamente a conta a pagar
  try {
    await supabase.rpc('criar_conta_pagar', {
      p_purchase_id: id,
      p_valor: Number(compra.total),
      p_descricao: 'Compra ' + compra.numero,
      p_vencimento: null,
      p_parcelas: 1
    });
  } catch (e) {
    console.warn('[purchases] Conta a pagar não criada:', e.message);
  }
}

export function rotuloStatus(s) {
  const map = {
    rascunho:              ['Rascunho', 'neutro'],
    solicitada:            ['Solicitada', 'info'],
    aguardando:            ['Aguardando', 'alerta'],
    recebida:              ['Recebida', 'sucesso'],
    parcialmente_recebida: ['Parcial', 'alerta'],
    cancelada:             ['Cancelada', 'erro']
  };
  const v = map[s] || [s, 'neutro'];
  return { texto: v[0], tipo: v[1] };
}
