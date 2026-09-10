// =============================================================
// SERVICE: PRODUTOS — VM VENDAS E COMPRAS
// =============================================================
// Encapsula as consultas à tabela `products`. Toda página que
// precisar listar/consultar produtos deve importar daqui — nunca
// falar direto com o banco.
// =============================================================

import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// LISTAR PRODUTOS com filtros e ordenação
// -------------------------------------------------------------
// Parâmetros:
//   filtros.categoria   (uuid)
//   filtros.condicao    'novo' | 'usado' | 'seminovo' | 'outro'
//   filtros.precoMin    número
//   filtros.precoMax    número
//   filtros.marca       string
//   filtros.busca       string (busca por nome/descrição)
//   filtros.disponivel  true | false | null
//   ordenar:  'recentes' | 'menor-preco' | 'maior-preco' | 'relevancia'
//   pagina:   1, 2, 3...
//   porPagina: 12 (padrão)
// -------------------------------------------------------------
export async function listarProdutos({
  filtros = {},
  ordenar = 'recentes',
  pagina = 1,
  porPagina = 12
} = {}) {

  const de = (pagina - 1) * porPagina;
  const ate = de + porPagina - 1;

  let query = supabase
    .from('products')
    .select(`
      id, nome, slug, descricao_curta, preco, preco_promocional,
      condicao, estoque, status, destaque, marca, sku, created_at,
      categoria_id,
      categories ( id, nome, slug ),
      product_images ( url, principal, ordem )
    `, { count: 'exact' });

  // Nunca mostrar produtos ocultos no catálogo público
  query = query.neq('status', 'oculto');

  // Filtro: categoria
  if (filtros.categoria) {
    query = query.eq('categoria_id', filtros.categoria);
  }

  // Filtro: condição
  if (filtros.condicao) {
    query = query.eq('condicao', filtros.condicao);
  }

  // Filtro: preço mínimo
  if (filtros.precoMin != null && filtros.precoMin !== '') {
    query = query.gte('preco', Number(filtros.precoMin));
  }

  // Filtro: preço máximo
  if (filtros.precoMax != null && filtros.precoMax !== '') {
    query = query.lte('preco', Number(filtros.precoMax));
  }

  // Filtro: marca
  if (filtros.marca) {
    query = query.ilike('marca', `%${filtros.marca}%`);
  }

  // Filtro: disponibilidade (estoque > 0 ou não)
  if (filtros.disponivel === true) {
    query = query.eq('status', 'disponivel').gt('estoque', 0);
  }

  // Filtro: busca textual
  if (filtros.busca) {
    const b = filtros.busca.trim();
    query = query.or(`nome.ilike.%${b}%,descricao.ilike.%${b}%`);
  }

  // Ordenação
  switch (ordenar) {
    case 'menor-preco':
      query = query.order('preco', { ascending: true });
      break;
    case 'maior-preco':
      query = query.order('preco', { ascending: false });
      break;
    case 'relevancia':
      // Simples: destaques primeiro, depois recentes
      query = query.order('destaque', { ascending: false })
                   .order('created_at', { ascending: false });
      break;
    case 'recentes':
    default:
      query = query.order('created_at', { ascending: false });
  }

  // Paginação
  query = query.range(de, ate);

  const { data, error, count } = await query;

  if (error) {
    console.error('[products.service] Erro ao listar produtos:', error);
    throw error;
  }

  return {
    produtos: (data || []).map(normalizarProduto),
    total: count || 0,
    pagina,
    porPagina,
    totalPaginas: Math.ceil((count || 0) / porPagina)
  };
}

// -------------------------------------------------------------
// BUSCAR 1 PRODUTO por id
// -------------------------------------------------------------
export async function buscarProduto(id) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      categories ( id, nome, slug ),
      product_images ( id, url, principal, ordem, alt )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[products.service] Erro ao buscar produto:', error);
    throw error;
  }
  if (!data) return null;

  return normalizarProduto(data, true);
}

// -------------------------------------------------------------
// PRODUTOS EM DESTAQUE (home)
// -------------------------------------------------------------
export async function listarDestaques(limite = 8) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, nome, slug, descricao_curta, preco, preco_promocional,
      condicao, estoque, status, marca, created_at,
      categories ( id, nome, slug ),
      product_images ( url, principal, ordem )
    `)
    .neq('status', 'oculto')
    .eq('destaque', true)
    .order('created_at', { ascending: false })
    .limit(limite);

  if (error) throw error;
  return (data || []).map(normalizarProduto);
}

// -------------------------------------------------------------
// PRODUTOS RECENTES (home)
// -------------------------------------------------------------
export async function listarRecentes(limite = 8) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, nome, slug, descricao_curta, preco, preco_promocional,
      condicao, estoque, status, marca, created_at,
      categories ( id, nome, slug ),
      product_images ( url, principal, ordem )
    `)
    .neq('status', 'oculto')
    .order('created_at', { ascending: false })
    .limit(limite);

  if (error) throw error;
  return (data || []).map(normalizarProduto);
}

// -------------------------------------------------------------
// PRODUTOS EM OFERTA (com preço promocional)
// -------------------------------------------------------------
export async function listarOfertas(limite = 8) {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id, nome, slug, descricao_curta, preco, preco_promocional,
      condicao, estoque, status, marca, created_at,
      categories ( id, nome, slug ),
      product_images ( url, principal, ordem )
    `)
    .neq('status', 'oculto')
    .not('preco_promocional', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limite);

  if (error) throw error;
  return (data || []).map(normalizarProduto);
}

// -------------------------------------------------------------
// LISTAR CATEGORIAS ATIVAS
// -------------------------------------------------------------
export async function listarCategorias() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, nome, slug, ordem')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });

  if (error) throw error;
  return data || [];
}

// -------------------------------------------------------------
// NORMALIZAR — padroniza o objeto de produto para o frontend
// -------------------------------------------------------------
function normalizarProduto(p, completo = false) {
  const imgs = (p.product_images || [])
    .slice()
    .sort((a, b) => {
      if (a.principal && !b.principal) return -1;
      if (!a.principal && b.principal) return 1;
      return (a.ordem || 0) - (b.ordem || 0);
    });

  const imagemPrincipal = imgs.find(i => i.principal)?.url
                       || imgs[0]?.url
                       || null;

  const temPromo = p.preco_promocional != null
                && Number(p.preco_promocional) > 0
                && Number(p.preco_promocional) < Number(p.preco);

  const precoFinal = temPromo ? Number(p.preco_promocional) : Number(p.preco);

  const base = {
    id: p.id,
    nome: p.nome,
    slug: p.slug,
    descricaoCurta: p.descricao_curta,
    preco: Number(p.preco),
    precoPromocional: temPromo ? Number(p.preco_promocional) : null,
    precoFinal,
    temPromo,
    descontoPct: temPromo
      ? Math.round((1 - Number(p.preco_promocional) / Number(p.preco)) * 100)
      : 0,
    condicao: p.condicao,
    estoque: p.estoque,
    status: p.status,
    destaque: !!p.destaque,
    marca: p.marca,
    sku: p.sku,
    categoria: p.categories || null,
    categoriaId: p.categoria_id || p.categories?.id || null,
    imagemPrincipal,
    imagens: imgs,
    createdAt: p.created_at
  };

  if (completo) {
    base.descricao = p.descricao;
    base.modelo = p.modelo;
    base.peso = p.peso;
    base.largura = p.largura;
    base.altura = p.altura;
    base.profundidade = p.profundidade;
    base.especificacoes = p.especificacoes || {};
    base.caracteristicas = p.caracteristicas || [];
    base.visualizacoes = p.visualizacoes || 0;
  }

  return base;
}

// -------------------------------------------------------------
// DISPONIBILIDADE EM TEXTO
// -------------------------------------------------------------
export function rotuloDisponibilidade(produto) {
  if (produto.status === 'vendido')       return { texto: 'Vendido',      tipo: 'erro' };
  if (produto.status === 'indisponivel')  return { texto: 'Indisponível', tipo: 'erro' };
  if (produto.status === 'em_negociacao') return { texto: 'Em negociação',tipo: 'alerta' };
  if (produto.estoque <= 0)               return { texto: 'Sem estoque',  tipo: 'erro' };
  return { texto: 'Disponível', tipo: 'sucesso' };
}

// -------------------------------------------------------------
// RÓTULO DE CONDIÇÃO EM PORTUGUÊS
// -------------------------------------------------------------
export function rotuloCondicao(cond) {
  switch (cond) {
    case 'novo':      return 'Novo';
    case 'usado':     return 'Usado';
    case 'seminovo':  return 'Seminovo';
    case 'outro':     return 'Outro';
    default:          return cond || '';
  }
}