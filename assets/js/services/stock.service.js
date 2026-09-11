// =============================================================
// SERVICE: ESTOQUE — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// Lista todos os produtos com estoque atual
// -------------------------------------------------------------
export async function listarEstoque({ busca = '', somenteBaixo = false, somenteEsgotados = false } = {}) {
  let q = supabase
    .from('products')
    .select('id, nome, preco, estoque, estoque_minimo, status, categoria_id, categories ( nome ), product_images ( url, principal, ordem )')
    .neq('status', 'oculto')
    .order('nome', { ascending: true });

  if (busca) q = q.ilike('nome', '%' + busca + '%');

  const r = await q;
  if (r.error) throw r.error;

  let produtos = (r.data || []).map(function(p) {
    const imgs = (p.product_images || []).slice().sort(function(a, b) { return (b.principal ? 1 : 0) - (a.principal ? 1 : 0); });
    return {
      id: p.id,
      nome: p.nome,
      preco: Number(p.preco),
      estoque: p.estoque || 0,
      estoque_minimo: p.estoque_minimo || 0,
      status: p.status,
      categoria: p.categories ? p.categories.nome : null,
      imagem: imgs[0] ? imgs[0].url : null
    };
  });

  if (somenteBaixo) {
    produtos = produtos.filter(function(p) { return p.estoque_minimo > 0 && p.estoque <= p.estoque_minimo && p.estoque > 0; });
  }
  if (somenteEsgotados) {
    produtos = produtos.filter(function(p) { return p.estoque <= 0; });
  }

  return produtos;
}

// -------------------------------------------------------------
// Resumo geral do estoque
// -------------------------------------------------------------
export async function resumoEstoque() {
  const r = await supabase
    .from('products')
    .select('estoque, estoque_minimo, preco')
    .neq('status', 'oculto');

  if (r.error) throw r.error;

  const produtos = r.data || [];
  let totalItens = 0;
  let valorTotal = 0;
  let baixo = 0;
  let esgotados = 0;

  produtos.forEach(function(p) {
    const est = p.estoque || 0;
    totalItens += est;
    valorTotal += est * Number(p.preco || 0);
    if (est <= 0) esgotados++;
    else if (p.estoque_minimo > 0 && est <= p.estoque_minimo) baixo++;
  });

  return {
    totalProdutos: produtos.length,
    totalItens: totalItens,
    valorTotal: valorTotal,
    baixo: baixo,
    esgotados: esgotados
  };
}

// -------------------------------------------------------------
// Movimentar estoque (chama a função do banco)
// -------------------------------------------------------------
export async function movimentar({ product_id, tipo, quantidade, origem, observacao }) {
  const r = await supabase.rpc('registrar_movimentacao', {
    p_product_id: product_id,
    p_tipo: tipo,
    p_quantidade: Number(quantidade),
    p_origem: origem || null,
    p_observacao: observacao || null
  });

  if (r.error) throw r.error;
  return r.data;
}

// -------------------------------------------------------------
// Histórico de movimentações
// -------------------------------------------------------------
export async function listarHistorico({ filtros = {}, pagina = 1, porPagina = 30 } = {}) {
  const de = (pagina - 1) * porPagina;
  const ate = de + porPagina - 1;

  let q = supabase
    .from('stock_movements')
    .select('id, product_id, tipo, quantidade, estoque_antes, estoque_depois, origem, observacao, user_email, created_at, products ( nome )', { count: 'exact' });

  if (filtros.product_id) q = q.eq('product_id', filtros.product_id);
  if (filtros.tipo) q = q.eq('tipo', filtros.tipo);
  if (filtros.dataInicio) q = q.gte('created_at', filtros.dataInicio);
  if (filtros.dataFim) q = q.lte('created_at', filtros.dataFim + 'T23:59:59');

  q = q.order('created_at', { ascending: false }).range(de, ate);

  const r = await q;
  if (r.error) throw r.error;

  return {
    movimentacoes: r.data || [],
    total: r.count || 0,
    pagina: pagina,
    porPagina: porPagina,
    totalPaginas: Math.ceil((r.count || 0) / porPagina)
  };
}

// -------------------------------------------------------------
// Rótulos
// -------------------------------------------------------------
export function rotuloTipo(tipo) {
  const map = {
    entrada_compra:             'Entrada por compra',
    entrada_devolucao_cliente:  'Devolução de cliente',
    entrada_ajuste:             'Ajuste positivo',
    saida_venda:                'Saída por venda',
    saida_devolucao_fornecedor: 'Devolução ao fornecedor',
    saida_perda:                'Perda / avaria',
    saida_uso_interno:          'Uso interno',
    saida_ajuste:               'Ajuste negativo'
  };
  return map[tipo] || tipo;
}

export function corTipo(tipo) {
  if (tipo.indexOf('entrada') === 0) return { bg: '#dcfce7', cor: '#166534' };
  return { bg: '#fee2e2', cor: '#991b1b' };
}

export function tiposEntrada() {
  return [
    { value: 'entrada_compra',             label: 'Entrada por compra' },
    { value: 'entrada_devolucao_cliente',  label: 'Devolução de cliente' },
    { value: 'entrada_ajuste',             label: 'Ajuste positivo' }
  ];
}

export function tiposSaida() {
  return [
    { value: 'saida_venda',                label: 'Saída por venda' },
    { value: 'saida_devolucao_fornecedor', label: 'Devolução ao fornecedor' },
    { value: 'saida_perda',                label: 'Perda / avaria' },
    { value: 'saida_uso_interno',          label: 'Uso interno' },
    { value: 'saida_ajuste',               label: 'Ajuste negativo' }
  ];
}
