// =============================================================
// SERVICE: PRODUTOS — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';

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
    .select(
      'id, nome, slug, descricao_curta, preco, preco_promocional, condicao, estoque, status, destaque, marca, sku, created_at, categoria_id, garantia_padrao_meses, garantia_padrao_descricao, garantias_estendidas, categories ( id, nome, slug ), product_images ( url, principal, ordem )',
      { count: 'exact' }
    );

  query = query.neq('status', 'oculto');

  if (filtros.categoria) {
    query = query.eq('categoria_id', filtros.categoria);
  }

  if (Array.isArray(filtros.condicao) && filtros.condicao.length) {
    query = query.in('condicao', filtros.condicao);
  } else if (filtros.condicao) {
    query = query.eq('condicao', filtros.condicao);
  }

  const precoMin = parsePrecoFiltro(filtros.precoMin);
  const precoMax = parsePrecoFiltro(filtros.precoMax);

  if (precoMin != null) {
    query = query.gte('preco', precoMin);
  }

  if (precoMax != null) {
    query = query.lte('preco', precoMax);
  }

  if (filtros.marca) {
    query = query.ilike(
      'marca',
      '%' + filtros.marca + '%'
    );
  }

  if (filtros.busca) {
    const b = filtros.busca.trim();

    if (b) {
      query = query.or(
        'nome.ilike.%' + b + '%,descricao.ilike.%' + b + '%'
      );
    }
  }

  if (ordenar === 'menor-preco') {
    query = query.order('preco', {
      ascending: true
    });
  } else if (ordenar === 'maior-preco') {
    query = query.order('preco', {
      ascending: false
    });
  } else {
    query = query.order('created_at', {
      ascending: false
    });
  }

  query = query.range(de, ate);

  const {
    data,
    error,
    count
  } = await query;

  if (error) {
    throw error;
  }

  return {
    produtos: (data || []).map(normalizarProduto),
    total: count || 0,
    pagina: pagina,
    porPagina: porPagina,
    totalPaginas: Math.ceil(
      (count || 0) / porPagina
    )
  };
}


export async function buscarProduto(id) {
  const {
    data,
    error
  } = await supabase
    .from('products')
    .select(
      '*, categories ( id, nome, slug ), product_images ( id, url, principal, ordem, alt )'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizarProduto(data, true);
}


// DESTAQUES
export async function listarDestaques(limite) {
  limite = limite || 8;

  const {
    data,
    error
  } = await supabase
    .from('products')
    .select(
      'id, nome, slug, descricao_curta, preco, preco_promocional, condicao, estoque, status, destaque, marca, sku, created_at, garantia_padrao_meses, garantia_padrao_descricao, garantias_estendidas, categoria_id, categories ( id, nome, slug ), product_images ( url, principal, ordem )'
    )
    .neq('status', 'oculto')
    .eq('destaque', true)
    .order('created_at', {
      ascending: false
    })
    .limit(limite);

  if (error) {
    throw error;
  }

  return (data || []).map(normalizarProduto);
}


// NOVIDADES
export async function listarRecentes(limite) {
  limite = limite || 8;

  const {
    data,
    error
  } = await supabase
    .from('products')
    .select(
      'id, nome, slug, descricao_curta, preco, preco_promocional, condicao, estoque, status, destaque, marca, sku, created_at, garantia_padrao_meses, garantia_padrao_descricao, garantias_estendidas, categoria_id, categories ( id, nome, slug ), product_images ( url, principal, ordem )'
    )
    .neq('status', 'oculto')
    .order('created_at', {
      ascending: false
    })
    .limit(limite);

  if (error) {
    throw error;
  }

  return (data || []).map(normalizarProduto);
}


// OFERTAS
export async function listarOfertas(limite) {
  limite = limite || 8;

  const {
    data,
    error
  } = await supabase
    .from('products')
    .select(
      'id, nome, slug, descricao_curta, preco, preco_promocional, condicao, estoque, status, destaque, marca, sku, created_at, garantia_padrao_meses, garantia_padrao_descricao, garantias_estendidas, categoria_id, categories ( id, nome, slug ), product_images ( url, principal, ordem )'
    )
    .neq('status', 'oculto')
    .not('preco_promocional', 'is', null)
    .order('created_at', {
      ascending: false
    })
    .limit(limite);

  if (error) {
    throw error;
  }

  return (data || [])
    .filter(function (p) {
      return (
        p.preco_promocional != null &&
        Number(p.preco_promocional) <
          Number(p.preco)
      );
    })
    .map(normalizarProduto);
}


export async function listarCategorias() {
  const {
    data,
    error
  } = await supabase
    .from('categories')
    .select(
      'id, nome, slug, ordem'
    )
    .eq('ativo', true)
    .order('ordem', {
      ascending: true
    })
    .order('nome', {
      ascending: true
    });

  if (error) {
    throw error;
  }

  return data || [];
}


function normalizarProduto(p, completo) {
  const imgs =
    (p.product_images || [])
      .slice()
      .sort(function (a, b) {
        if (
          a.principal &&
          !b.principal
        ) {
          return -1;
        }

        if (
          !a.principal &&
          b.principal
        ) {
          return 1;
        }

        return (
          (a.ordem || 0) -
          (b.ordem || 0)
        );
      });

  const imagemPrincipal =
    (
      imgs.find(
        x => x.principal
      ) ||
      imgs[0] ||
      {}
    ).url || null;

  const temPromo =
    p.preco_promocional != null &&
    Number(p.preco_promocional) > 0 &&
    Number(p.preco_promocional) <
      Number(p.preco);

  const precoFinal =
    temPromo
      ? Number(p.preco_promocional)
      : Number(p.preco);

  const base = {
    id: p.id,
    nome: p.nome,
    slug: p.slug,
    descricaoCurta:
      p.descricao_curta,

    preco:
      Number(p.preco),

    precoPromocional:
      temPromo
        ? Number(p.preco_promocional)
        : null,

    precoFinal:
      precoFinal,

    temPromo:
      temPromo,

    descontoPct:
      temPromo
        ? Math.round(
            (
              1 -
              Number(
                p.preco_promocional
              ) /
              Number(p.preco)
            ) * 100
          )
        : 0,

    condicao:
      p.condicao,

    estoque:
      p.estoque,

    status:
      p.status,

    destaque:
      !!p.destaque,

    marca:
      p.marca,

    sku:
      p.sku,

    categoria:
      p.categories || null,

    categoriaId:
      p.categoria_id ||
      (
        p.categories
          ? p.categories.id
          : null
      ),

    imagemPrincipal:
      imagemPrincipal,

    imagens:
      imgs,

    createdAt:
      p.created_at,

    garantia_padrao_meses:
      Number(
        p.garantia_padrao_meses
      ) || 0,

    garantia_padrao_descricao:
      p.garantia_padrao_descricao ||
      null,

    garantias_estendidas:
      Array.isArray(
        p.garantias_estendidas
      )
        ? p.garantias_estendidas
        : []
  };

  if (completo) {
    base.descricao =
      p.descricao;

    base.modelo =
      p.modelo;

    base.especificacoes =
      p.especificacoes || {};

    base.caracteristicas =
      p.caracteristicas || [];
  }

  return base;
}


export function rotuloDisponibilidade(produto) {
  if (
    produto.status === 'vendido'
  ) {
    return {
      texto: 'Vendido',
      tipo: 'erro'
    };
  }

  if (
    produto.status === 'indisponivel'
  ) {
    return {
      texto: 'Indisponível',
      tipo: 'erro'
    };
  }

  if (
    produto.status === 'em_negociacao'
  ) {
    return {
      texto: 'Em negociação',
      tipo: 'alerta'
    };
  }

  if (
    produto.estoque <= 0
  ) {
    return {
      texto: 'Sem estoque',
      tipo: 'erro'
    };
  }

  return {
    texto: 'Disponível',
    tipo: 'sucesso'
  };
}


function parsePrecoFiltro(valor) {
  if (
    valor == null ||
    valor === ''
  ) {
    return null;
  }

  const texto =
    String(valor)
      .trim()
      .replace(
        /R\$\s?/gi,
        ''
      );

  if (!texto) {
    return null;
  }

  const normalizado =
    texto
      .replace(/\./g, '')
      .replace(',', '.');

  const numero =
    Number(
      normalizado.replace(
        /[^0-9.-]/g,
        ''
      )
    );

  return Number.isFinite(numero)
    ? numero
    : null;
}


export function rotuloCondicao(cond) {
  if (
    cond === 'novo'
  ) {
    return 'Novo';
  }

  if (
    cond === 'usado'
  ) {
    return 'Usado';
  }

  if (
    cond === 'seminovo'
  ) {
    return 'Seminovo';
  }

  if (
    cond === 'outro'
  ) {
    return 'Outro';
  }

  return cond || '';
}
