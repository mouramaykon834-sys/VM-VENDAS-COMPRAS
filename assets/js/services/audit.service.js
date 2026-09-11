// =============================================================
// SERVICE: AUDITORIA — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// Lista os logs com filtros e paginação
// -------------------------------------------------------------
export async function listarLogs({
  filtros = {},
  pagina = 1,
  porPagina = 30
} = {}) {
  const de = (pagina - 1) * porPagina;
  const ate = de + porPagina - 1;

  let q = supabase
    .from('audit_log')
    .select('*', { count: 'exact' });

  if (filtros.usuario) q = q.ilike('user_email', '%' + filtros.usuario + '%');
  if (filtros.tabela) q = q.eq('tabela', filtros.tabela);
  if (filtros.acao) q = q.eq('acao', filtros.acao);
  if (filtros.registro_id) q = q.eq('registro_id', filtros.registro_id);
  if (filtros.dataInicio) q = q.gte('created_at', filtros.dataInicio);
  if (filtros.dataFim) q = q.lte('created_at', filtros.dataFim + 'T23:59:59');
  if (filtros.busca) {
    q = q.or('observacao.ilike.%' + filtros.busca + '%,user_email.ilike.%' + filtros.busca + '%');
  }

  q = q.order('created_at', { ascending: false }).range(de, ate);

  const r = await q;
  if (r.error) throw r.error;

  return {
    logs: r.data || [],
    total: r.count || 0,
    pagina: pagina,
    porPagina: porPagina,
    totalPaginas: Math.ceil((r.count || 0) / porPagina)
  };
}

// -------------------------------------------------------------
// Busca um log específico
// -------------------------------------------------------------
export async function buscarLog(id) {
  const r = await supabase.from('audit_log').select('*').eq('id', id).maybeSingle();
  if (r.error) throw r.error;
  return r.data;
}

// -------------------------------------------------------------
// Lista tabelas que têm auditoria
// -------------------------------------------------------------
export async function listarTabelasAuditadas() {
  const r = await supabase
    .from('audit_log')
    .select('tabela')
    .order('tabela');
  if (r.error) throw r.error;

  const unicas = {};
  (r.data || []).forEach(function(x) { unicas[x.tabela] = true; });
  return Object.keys(unicas).sort();
}

// -------------------------------------------------------------
// Rótulos
// -------------------------------------------------------------
export function rotuloAcao(acao) {
  const map = {
    criado:   'Criado',
    editado:  'Editado',
    excluido: 'Excluído'
  };
  return map[acao] || acao;
}

export function corAcao(acao) {
  const map = {
    criado:   { bg: '#dcfce7', cor: '#166534' },
    editado:  { bg: '#dbeafe', cor: '#1e40af' },
    excluido: { bg: '#fee2e2', cor: '#991b1b' }
  };
  return map[acao] || { bg: '#f1f5f9', cor: '#475569' };
}

export function rotuloTabela(t) {
  const map = {
    products:         'Produtos',
    categories:       'Categorias',
    orders:           'Pedidos',
    proposals:        'Propostas',
    company_settings: 'Dados da empresa',
    visual_settings:  'Identidade visual',
    store_settings:   'Configurações da loja'
  };
  return map[t] || t;
}
