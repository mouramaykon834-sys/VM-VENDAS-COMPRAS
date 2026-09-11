// =============================================================
// SERVICE: FINANCEIRO — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// Categorias
// -------------------------------------------------------------
export async function listarCategorias(tipo = null) {
  let q = supabase.from('financial_categories').select('*').eq('ativo', true).order('nome');
  if (tipo) q = q.eq('tipo', tipo);
  const r = await q;
  if (r.error) throw r.error;
  return r.data || [];
}

// -------------------------------------------------------------
// Listar contas (com filtros)
// -------------------------------------------------------------
export async function listarContas({
  tipo = null,        // 'receber' | 'pagar'
  status = null,      // 'pendente' | 'parcial' | 'pago' | 'atrasado' | 'cancelado'
  dataInicio = null,
  dataFim = null,
  busca = ''
} = {}) {
  let q = supabase
    .from('financial_accounts')
    .select('*, financial_categories ( nome, tipo )')
    .order('data_vencimento', { ascending: true });

  if (tipo) q = q.eq('tipo', tipo);
  if (status) q = q.eq('status', status);
  if (dataInicio) q = q.gte('data_vencimento', dataInicio);
  if (dataFim) q = q.lte('data_vencimento', dataFim);
  if (busca) q = q.or('descricao.ilike.%' + busca + '%,cliente_nome.ilike.%' + busca + '%,supplier_nome.ilike.%' + busca + '%');

  const r = await q;
  if (r.error) throw r.error;
  return r.data || [];
}

// -------------------------------------------------------------
// Buscar conta por id
// -------------------------------------------------------------
export async function buscarConta(id) {
  const r = await supabase
    .from('financial_accounts')
    .select('*, financial_categories ( nome, tipo )')
    .eq('id', id)
    .maybeSingle();
  if (r.error) throw r.error;
  return r.data;
}

// -------------------------------------------------------------
// Criar/editar conta manualmente
// -------------------------------------------------------------
export async function salvarConta(dados, id) {
  const payload = {
    tipo: dados.tipo,
    descricao: dados.descricao,
    categoria_id: dados.categoria_id || null,
    valor_original: Number(dados.valor_original),
    valor_aberto: Number(dados.valor_original),
    data_vencimento: dados.data_vencimento,
    cliente_id: dados.cliente_id || null,
    cliente_nome: dados.cliente_nome || null,
    supplier_id: dados.supplier_id || null,
    supplier_nome: dados.supplier_nome || null,
    observacoes: dados.observacoes || null,
    forma_pagamento: dados.forma_pagamento || null,
    status: 'pendente'
  };

  let r;
  if (id) {
    r = await supabase.from('financial_accounts').update(payload).eq('id', id);
  } else {
    const { data: { user } } = await supabase.auth.getUser();
    payload.user_id = user ? user.id : null;
    r = await supabase.from('financial_accounts').insert(payload);
  }
  if (r.error) throw r.error;
}

// -------------------------------------------------------------
// Registrar pagamento
// -------------------------------------------------------------
export async function registrarPagamento(contaId, dados) {
  const r = await supabase.rpc('registrar_pagamento', {
    p_conta_id: contaId,
    p_valor_pago: Number(dados.valor_pago),
    p_juros: Number(dados.juros || 0),
    p_multa: Number(dados.multa || 0),
    p_desconto: Number(dados.desconto || 0),
    p_forma: dados.forma_pagamento || null,
    p_obs: dados.observacoes || null
  });
  if (r.error) throw r.error;
}

// -------------------------------------------------------------
// Cancelar conta
// -------------------------------------------------------------
export async function cancelarConta(id) {
  const r = await supabase.from('financial_accounts').update({ status: 'cancelado' }).eq('id', id);
  if (r.error) throw r.error;
}

// -------------------------------------------------------------
// Excluir conta
// -------------------------------------------------------------
export async function excluirConta(id) {
  const r = await supabase.from('financial_accounts').delete().eq('id', id);
  if (r.error) throw r.error;
}

// -------------------------------------------------------------
// Resumo para o painel financeiro
// -------------------------------------------------------------
export async function resumoFinanceiro() {
  const hoje = new Date().toISOString().slice(0, 10);

  const r = await supabase
    .from('financial_accounts')
    .select('tipo, status, valor_original, valor_aberto, valor_pago, data_vencimento');

  if (r.error) throw r.error;

  const contas = r.data || [];

  const resultado = {
    aReceber: 0,
    aPagar: 0,
    recebido: 0,
    pago: 0,
    atrasadoReceber: 0,
    atrasadoPagar: 0,
    totalReceber: 0,
    totalPagar: 0,
    saldo: 0
  };

  contas.forEach(function(c) {
    const valor = Number(c.valor_original) || 0;
    const aberto = Number(c.valor_aberto) || 0;
    const pago = Number(c.valor_pago) || 0;
    const vencido = c.data_vencimento && c.data_vencimento < hoje && c.status !== 'pago' && c.status !== 'cancelado';

    if (c.status === 'cancelado') return;

    if (c.tipo === 'receber') {
      resultado.totalReceber += valor;
      resultado.recebido += pago;
      resultado.aReceber += aberto;
      if (vencido) resultado.atrasadoReceber += aberto;
    } else {
      resultado.totalPagar += valor;
      resultado.pago += pago;
      resultado.aPagar += aberto;
      if (vencido) resultado.atrasadoPagar += aberto;
    }
  });

  resultado.saldo = resultado.recebido - resultado.pago;

  return resultado;
}

// -------------------------------------------------------------
// Fluxo de caixa (por dia)
// -------------------------------------------------------------
export async function fluxoCaixa({ dataInicio = null, dataFim = null } = {}) {
  let q = supabase
    .from('financial_accounts')
    .select('tipo, status, valor_pago, valor_aberto, data_vencimento, data_pagamento');

  if (dataInicio) q = q.gte('data_vencimento', dataInicio);
  if (dataFim) q = q.lte('data_vencimento', dataFim);

  const r = await q;
  if (r.error) throw r.error;

  const movimentos = {};

  (r.data || []).forEach(function(c) {
    if (c.status === 'cancelado') return;

    const dia = c.data_pagamento || c.data_vencimento;
    if (!dia) return;
    if (!movimentos[dia]) movimentos[dia] = { dia: dia, entradas: 0, saidas: 0 };

    const pago = Number(c.valor_pago) || 0;
    if (c.tipo === 'receber' && pago > 0) movimentos[dia].entradas += pago;
    if (c.tipo === 'pagar' && pago > 0) movimentos[dia].saidas += pago;
  });

  return Object.values(movimentos).sort(function(a, b) {
    return a.dia.localeCompare(b.dia);
  });
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
export function rotuloStatus(s) {
  const map = {
    pendente:  ['Pendente', 'alerta'],
    parcial:   ['Parcial', 'info'],
    pago:      ['Pago', 'sucesso'],
    atrasado:  ['Atrasado', 'erro'],
    cancelado: ['Cancelado', 'neutro']
  };
  const v = map[s] || [s, 'neutro'];
  return { texto: v[0], tipo: v[1] };
}

export function corStatus(s) {
  const map = {
    pendente:  { bg: '#fef3c7', cor: '#92400e' },
    parcial:   { bg: '#dbeafe', cor: '#1e40af' },
    pago:      { bg: '#dcfce7', cor: '#166534' },
    atrasado:  { bg: '#fee2e2', cor: '#991b1b' },
    cancelado: { bg: '#f1f5f9', cor: '#475569' }
  };
  return map[s] || { bg: '#f1f5f9', cor: '#475569' };
}

export function formasPagamento() {
  return ['Dinheiro', 'Pix', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Transferência', 'Outros'];
}
