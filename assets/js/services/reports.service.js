// =============================================================
// SERVICE: RELATÓRIOS — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// KPIs do dashboard
// -------------------------------------------------------------
export async function kpisDashboard({ dataInicio = null, dataFim = null } = {}) {
  const filtro = (q) => {
    if (dataInicio) q = q.gte('created_at', dataInicio);
    if (dataFim) q = q.lte('created_at', dataFim + 'T23:59:59');
    return q;
  };

  // Vendas
  let qOrders = supabase.from('orders').select('total, status, created_at');
  qOrders = filtro(qOrders);
  const ordersR = await qOrders;
  const orders = ordersR.data || [];

  const faturamento = orders.filter(function(o) { return o.status !== 'cancelado'; }).reduce(function(s, o) { return s + Number(o.total || 0); }, 0);
  const vendas = orders.filter(function(o) { return o.status !== 'cancelado'; }).length;
  const ticketMedio = vendas > 0 ? faturamento / vendas : 0;

  // Orçamentos pendentes
  let qQuotes = supabase.from('quotes').select('id, status, total, created_at');
  qQuotes = filtro(qQuotes);
  const quotesR = await qQuotes;
  const quotes = quotesR.data || [];
  const orcamentosPendentes = quotes.filter(function(q) { return ['rascunho','enviado','aguardando'].indexOf(q.status) !== -1; }).length;

  // Compras
  let qPurchases = supabase.from('purchases').select('total, status, created_at');
  qPurchases = filtro(qPurchases);
  const purchasesR = await qPurchases;
  const purchases = purchasesR.data || [];
  const totalCompras = purchases.filter(function(p) { return p.status === 'recebida'; }).reduce(function(s, p) { return s + Number(p.total || 0); }, 0);

  // Financeiro
  const finR = await supabase.from('financial_accounts').select('tipo, status, valor_original, valor_aberto, data_vencimento');
  const contas = finR.data || [];
  let contasReceber = 0;
  let contasPagar = 0;
  contas.forEach(function(c) {
    if (c.status === 'cancelado' || c.status === 'pago') return;
    if (c.tipo === 'receber') contasReceber += Number(c.valor_aberto || 0);
    else contasPagar += Number(c.valor_aberto || 0);
  });

  // Estoque
  const estR = await supabase.from('products').select('estoque, preco').neq('status', 'oculto');
  const produtos = estR.data || [];
  const valorEstoque = produtos.reduce(function(s, p) { return s + (Number(p.estoque || 0) * Number(p.preco || 0)); }, 0);

  // Lucro bruto estimado = faturamento - total compras
  const lucroBruto = faturamento - totalCompras;

  return {
    faturamento: faturamento,
    vendas: vendas,
    ticketMedio: ticketMedio,
    orcamentosPendentes: orcamentosPendentes,
    totalCompras: totalCompras,
    contasReceber: contasReceber,
    contasPagar: contasPagar,
    valorEstoque: valorEstoque,
    lucroBruto: lucroBruto
  };
}

// -------------------------------------------------------------
// Evolução das vendas por dia
// -------------------------------------------------------------
export async function evolucaoVendas({ dataInicio, dataFim } = {}) {
  let q = supabase.from('orders').select('total, created_at, status');
  if (dataInicio) q = q.gte('created_at', dataInicio);
  if (dataFim) q = q.lte('created_at', dataFim + 'T23:59:59');
  const r = await q;
  if (r.error) throw r.error;

  const porDia = {};
  (r.data || []).forEach(function(o) {
    if (o.status === 'cancelado') return;
    const dia = o.created_at.slice(0, 10);
    if (!porDia[dia]) porDia[dia] = 0;
    porDia[dia] += Number(o.total || 0);
  });

  return Object.keys(porDia).sort().map(function(d) {
    return { dia: d, valor: porDia[d] };
  });
}

// -------------------------------------------------------------
// Vendas x Compras por mês
// -------------------------------------------------------------
export async function vendasXCompras({ meses = 6 } = {}) {
  const hoje = new Date();
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - meses);

  const ordersR = await supabase
    .from('orders')
    .select('total, created_at, status')
    .gte('created_at', inicio.toISOString());
  const purchasesR = await supabase
    .from('purchases')
    .select('total, created_at, status')
    .gte('created_at', inicio.toISOString());

  const porMes = {};

  (ordersR.data || []).forEach(function(o) {
    if (o.status === 'cancelado') return;
    const mes = o.created_at.slice(0, 7);
    if (!porMes[mes]) porMes[mes] = { mes: mes, vendas: 0, compras: 0 };
    porMes[mes].vendas += Number(o.total || 0);
  });

  (purchasesR.data || []).forEach(function(p) {
    const mes = p.created_at.slice(0, 7);
    if (!porMes[mes]) porMes[mes] = { mes: mes, vendas: 0, compras: 0 };
    if (p.status === 'recebida') porMes[mes].compras += Number(p.total || 0);
  });

  return Object.values(porMes).sort(function(a, b) { return a.mes.localeCompare(b.mes); });
}

// -------------------------------------------------------------
// Entradas x Saídas financeiras por mês
// -------------------------------------------------------------
export async function entradasXSaidas({ meses = 6 } = {}) {
  const hoje = new Date();
  const inicio = new Date();
  inicio.setMonth(inicio.getMonth() - meses);

  const r = await supabase
    .from('financial_accounts')
    .select('tipo, valor_pago, data_pagamento')
    .not('data_pagamento', 'is', null)
    .gte('data_pagamento', inicio.toISOString().slice(0, 10));

  const porMes = {};
  (r.data || []).forEach(function(c) {
    const mes = c.data_pagamento.slice(0, 7);
    if (!porMes[mes]) porMes[mes] = { mes: mes, entradas: 0, saidas: 0 };
    if (c.tipo === 'receber') porMes[mes].entradas += Number(c.valor_pago || 0);
    else porMes[mes].saidas += Number(c.valor_pago || 0);
  });

  return Object.values(porMes).sort(function(a, b) { return a.mes.localeCompare(b.mes); });
}

// -------------------------------------------------------------
// Produtos mais vendidos
// -------------------------------------------------------------
export async function produtosMaisVendidos({ limite = 10 } = {}) {
  const r = await supabase
    .from('order_items')
    .select('product_nome, quantidade, subtotal');

  const mapa = {};
  (r.data || []).forEach(function(i) {
    if (!mapa[i.product_nome]) mapa[i.product_nome] = { nome: i.product_nome, quantidade: 0, total: 0 };
    mapa[i.product_nome].quantidade += Number(i.quantidade || 0);
    mapa[i.product_nome].total += Number(i.subtotal || 0);
  });

  return Object.values(mapa)
    .sort(function(a, b) { return b.quantidade - a.quantidade; })
    .slice(0, limite);
}

// -------------------------------------------------------------
// Relatório de vendas (completo)
// -------------------------------------------------------------
export async function relatorioVendas({ dataInicio, dataFim } = {}) {
  let q = supabase
    .from('orders')
    .select('id, numero, status, total, created_at, nome_contato, order_items ( product_nome, quantidade, subtotal )')
    .order('created_at', { ascending: false });

  if (dataInicio) q = q.gte('created_at', dataInicio);
  if (dataFim) q = q.lte('created_at', dataFim + 'T23:59:59');

  const r = await q;
  if (r.error) throw r.error;

  const lista = r.data || [];
  const validas = lista.filter(function(o) { return o.status !== 'cancelado'; });
  const faturamento = validas.reduce(function(s, o) { return s + Number(o.total); }, 0);
  const ticket = validas.length > 0 ? faturamento / validas.length : 0;

  return {
    lista: lista,
    total: lista.length,
    validas: validas.length,
    faturamento: faturamento,
    ticketMedio: ticket
  };
}

// -------------------------------------------------------------
// Relatório de orçamentos
// -------------------------------------------------------------
export async function relatorioOrcamentos({ dataInicio, dataFim } = {}) {
  let q = supabase
    .from('quotes')
    .select('id, numero, status, total, cliente_nome, created_at')
    .order('created_at', { ascending: false });

  if (dataInicio) q = q.gte('created_at', dataInicio);
  if (dataFim) q = q.lte('created_at', dataFim + 'T23:59:59');

  const r = await q;
  if (r.error) throw r.error;

  const lista = r.data || [];
  const porStatus = {};
  let valorTotal = 0;
  lista.forEach(function(o) {
    porStatus[o.status] = (porStatus[o.status] || 0) + 1;
    valorTotal += Number(o.total || 0);
  });

  const convertidos = porStatus['convertido'] || 0;
  const enviados = (porStatus['enviado'] || 0) + (porStatus['aguardando'] || 0) + (porStatus['aprovado'] || 0);
  const taxaConversao = (convertidos + enviados) > 0 ? (convertidos / (convertidos + enviados)) * 100 : 0;

  return {
    lista: lista,
    total: lista.length,
    porStatus: porStatus,
    valorTotal: valorTotal,
    taxaConversao: taxaConversao
  };
}

// -------------------------------------------------------------
// Relatório de compras
// -------------------------------------------------------------
export async function relatorioCompras({ dataInicio, dataFim } = {}) {
  let q = supabase
    .from('purchases')
    .select('id, numero, status, total, supplier_nome, data_pedido, created_at')
    .order('created_at', { ascending: false });

  if (dataInicio) q = q.gte('created_at', dataInicio);
  if (dataFim) q = q.lte('created_at', dataFim + 'T23:59:59');

  const r = await q;
  if (r.error) throw r.error;

  const lista = r.data || [];
  const recebidas = lista.filter(function(c) { return c.status === 'recebida'; });
  const total = recebidas.reduce(function(s, c) { return s + Number(c.total); }, 0);

  const porFornecedor = {};
  recebidas.forEach(function(c) {
    const nome = c.supplier_nome || 'Sem fornecedor';
    if (!porFornecedor[nome]) porFornecedor[nome] = { nome: nome, total: 0, compras: 0 };
    porFornecedor[nome].total += Number(c.total);
    porFornecedor[nome].compras++;
  });

  return {
    lista: lista,
    total: lista.length,
    recebidas: recebidas.length,
    valorTotal: total,
    porFornecedor: Object.values(porFornecedor).sort(function(a, b) { return b.total - a.total; })
  };
}

// -------------------------------------------------------------
// Relatório financeiro
// -------------------------------------------------------------
export async function relatorioFinanceiro({ dataInicio, dataFim } = {}) {
  let q = supabase
    .from('financial_accounts')
    .select('id, tipo, status, descricao, valor_original, valor_pago, valor_aberto, data_vencimento, data_pagamento, cliente_nome, supplier_nome, financial_categories ( nome )')
    .order('data_vencimento', { ascending: false });

  if (dataInicio) q = q.gte('data_vencimento', dataInicio);
  if (dataFim) q = q.lte('data_vencimento', dataFim);

  const r = await q;
  if (r.error) throw r.error;

  const lista = r.data || [];
  const hoje = new Date().toISOString().slice(0, 10);

  let totalReceber = 0, totalPagar = 0, recebido = 0, pago = 0, inadimplencia = 0;

  lista.forEach(function(c) {
    if (c.status === 'cancelado') return;
    if (c.tipo === 'receber') {
      totalReceber += Number(c.valor_original);
      recebido += Number(c.valor_pago);
      if (c.data_vencimento < hoje && c.status !== 'pago') inadimplencia += Number(c.valor_aberto);
    } else {
      totalPagar += Number(c.valor_original);
      pago += Number(c.valor_pago);
    }
  });

  return {
    lista: lista,
    total: lista.length,
    totalReceber: totalReceber,
    totalPagar: totalPagar,
    recebido: recebido,
    pago: pago,
    saldo: recebido - pago,
    inadimplencia: inadimplencia
  };
}

// -------------------------------------------------------------
// Relatório de estoque
// -------------------------------------------------------------
export async function relatorioEstoque() {
  const r = await supabase
    .from('products')
    .select('id, nome, estoque, estoque_minimo, preco, status, categories ( nome )')
    .neq('status', 'oculto')
    .order('nome');
  if (r.error) throw r.error;

  const produtos = r.data || [];
  let valorTotal = 0;
  let baixo = 0;
  let esgotados = 0;

  produtos.forEach(function(p) {
    valorTotal += Number(p.estoque) * Number(p.preco);
    if (p.estoque <= 0) esgotados++;
    else if (p.estoque_minimo > 0 && p.estoque <= p.estoque_minimo) baixo++;
  });

  return {
    lista: produtos,
    total: produtos.length,
    valorTotal: valorTotal,
    baixo: baixo,
    esgotados: esgotados
  };
}
