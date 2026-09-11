// =============================================================
// PRODUTO PREVIEW — VM VENDAS E COMPRAS
// =============================================================
// Transforma [produto:Nome ou ID] em links com preview flutuante.
//
// Uso:
//   import { ativarPreviews } from './assets/js/components/produto-preview.js';
//   await ativarPreviews(elemento);
// =============================================================

import { supabase } from '../supabase.js';

let cacheProdutos = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minuto

// -------------------------------------------------------------
// Buscar produtos (com cache)
// -------------------------------------------------------------
async function carregarProdutos() {
  const agora = Date.now();
  if (cacheProdutos && (agora - cacheTime) < CACHE_TTL) {
    return cacheProdutos;
  }

  try {
    const r = await supabase
      .from('products')
      .select('id, nome, preco, preco_promocional, status, estoque, product_images ( url, principal, ordem )')
      .neq('status', 'oculto');

    cacheProdutos = (r.data || []).map(function(p) {
      const imgs = (p.product_images || []).slice().sort(function(a, b) {
        return (b.principal ? 1 : 0) - (a.principal ? 1 : 0);
      });
      const temPromo = p.preco_promocional != null && Number(p.preco_promocional) < Number(p.preco);
      return {
        id: p.id,
        nome: p.nome,
        preco: Number(p.preco),
        precoPromocional: temPromo ? Number(p.preco_promocional) : null,
        precoFinal: temPromo ? Number(p.preco_promocional) : Number(p.preco),
        temPromo: temPromo,
        status: p.status,
        estoque: p.estoque,
        imagem: imgs[0] ? imgs[0].url : null
      };
    });
    cacheTime = agora;
    return cacheProdutos;
  } catch (e) {
    console.warn('[produto-preview] erro ao carregar produtos:', e);
    return [];
  }
}

// -------------------------------------------------------------
// Encontrar produto por nome OU id
// -------------------------------------------------------------
async function buscarProdutoPorReferencia(referencia) {
  const produtos = await carregarProdutos();
  const ref = referencia.trim().toLowerCase();

  // Tenta por ID exato
  let encontrado = produtos.find(function(p) {
    return p.id.toLowerCase() === ref;
  });
  if (encontrado) return encontrado;

  // Tenta por nome exato (case-insensitive)
  encontrado = produtos.find(function(p) {
    return p.nome.toLowerCase() === ref;
  });
  if (encontrado) return encontrado;

  // Tenta por nome parcial (contém)
  encontrado = produtos.find(function(p) {
    return p.nome.toLowerCase().indexOf(ref) !== -1;
  });
  return encontrado || null;
}

// -------------------------------------------------------------
// Substituir [produto:XXX] por links
// -------------------------------------------------------------
export async function processarDescricao(texto) {
  if (!texto) return '';

  const regex = /\[produto:([^\]]+)\]/g;
  const matches = [];
  let m;

  while ((m = regex.exec(texto)) !== null) {
    matches.push({ tag: m[0], referencia: m[1].trim() });
  }

  if (!matches.length) {
    return { html: escapeHtml(texto), temReferencias: false };
  }

  let resultado = escapeHtml(texto);

  for (const item of matches) {
    const prod = await buscarProdutoPorReferencia(item.referencia);
    const tagEscapada = escapeHtml(item.tag);

    if (prod) {
      const linkHtml =
        '<span class="prod-ref" data-prod-id="' + prod.id + '" ' +
        'data-prod-nome="' + escapeAttr(prod.nome) + '" ' +
        'data-prod-preco="' + prod.precoFinal.toFixed(2) + '" ' +
        'data-prod-promo="' + (prod.temPromo ? '1' : '0') + '" ' +
        'data-prod-imagem="' + escapeAttr(prod.imagem || '') + '" ' +
        'data-prod-estoque="' + (prod.estoque || 0) + '" ' +
        'data-prod-status="' + escapeAttr(prod.status) + '">' +
          escapeHtml(prod.nome) +
        '</span>';
      resultado = resultado.replace(tagEscapada, linkHtml);
    } else {
      // Produto não encontrado — deixa texto simples, sublinhado para avisar
      resultado = resultado.replace(tagEscapada,
        '<span class="prod-ref-nao-achado" title="Produto não encontrado">' +
        escapeHtml(item.referencia) + '</span>');
    }
  }

  return { html: resultado, temReferencias: true };
}

// -------------------------------------------------------------
// Ativa os eventos de preview nos elementos com .prod-ref
// -------------------------------------------------------------
export function ativarEventosPreview(container) {
  if (!container) return;

  container.querySelectorAll('.prod-ref').forEach(function(el) {
    if (el.dataset.previewAtivo) return;
    el.dataset.previewAtivo = '1';

    let timerHover = null;
    let clicado = false;

    // Desktop — hover
    el.addEventListener('mouseenter', function() {
      clearTimeout(timerHover);
      timerHover = setTimeout(function() { mostrarPreview(el); }, 400);
    });

    el.addEventListener('mouseleave', function() {
      clearTimeout(timerHover);
    });

    // Mobile — toque
    el.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      // Se o preview já está aberto, abre o produto
      if (el.dataset.previewAberto === '1') {
        window.location.href = './produto.html?id=' + el.dataset.prodId;
        return;
      }

      mostrarPreview(el);
    });
  });

  // Fecha previews ao clicar fora
  if (!window.__previewListenerAtivo) {
    window.__previewListenerAtivo = true;
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.prod-ref') && !e.target.closest('.prod-ref-preview')) {
        fecharTodosPreviews();
      }
    });
    window.addEventListener('scroll', fecharTodosPreviews, { passive: true });
  }
}

// -------------------------------------------------------------
// Mostrar preview
// -------------------------------------------------------------
function mostrarPreview(el) {
  fecharTodosPreviews();

  const id = el.dataset.prodId;
  const nome = el.dataset.prodNome;
  const preco = el.dataset.prodPreco;
  const promo = el.dataset.prodPromo === '1';
  const imagem = el.dataset.prodImagem;
  const estoque = Number(el.dataset.prodEstoque || 0);
  const status = el.dataset.prodStatus;

  let dispTexto = 'Disponível';
  let dispCor = '#16a34a';
  if (status === 'vendido' || status === 'indisponivel' || estoque <= 0) {
    dispTexto = 'Indisponível';
    dispCor = '#dc2626';
  } else if (status === 'em_negociacao') {
    dispTexto = 'Em negociação';
    dispCor = '#f59e0b';
  }

  const preview = document.createElement('div');
  preview.className = 'prod-ref-preview';
  preview.style.cssText =
    'position:fixed;z-index:99999;background:#fff;border:1px solid #e2e8f0;' +
    'border-radius:12px;padding:12px;box-shadow:0 10px 30px rgba(15,23,42,.15);' +
    'width:260px;font-family:system-ui,sans-serif;' +
    'opacity:0;transform:translateY(4px);transition:all .15s;';

  const imagemHTML = imagem
    ? '<img src="' + escapeAttr(imagem) + '" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:8px;display:block;" />'
    : '<div style="width:100%;height:140px;background:#f1f5f9;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px;">Sem imagem</div>';

  const precoHTML = promo
    ? '<div style="font-size:18px;font-weight:700;color:#16a34a;">R$ ' + preco + '</div>'
    : '<div style="font-size:18px;font-weight:700;color:#0f172a;">R$ ' + preco + '</div>';

  preview.innerHTML =
    imagemHTML +
    '<div style="margin-top:10px;font-size:14px;font-weight:600;color:#0f172a;line-height:1.3;">' + escapeHtml(nome) + '</div>' +
    '<div style="margin-top:6px;">' + precoHTML + '</div>' +
    '<div style="margin-top:6px;font-size:12px;font-weight:600;color:' + dispCor + ';">' + dispTexto + '</div>' +
    '<a href="./produto.html?id=' + id + '" style="display:block;margin-top:12px;padding:8px 12px;background:#0ea5e9;color:#fff;border-radius:8px;text-align:center;font-size:13px;font-weight:600;text-decoration:none;">Ver produto →</a>';

  document.body.appendChild(preview);

  // Posicionar
  const rect = el.getBoundingClientRect();
  const previewRect = preview.getBoundingClientRect();

  let top = rect.bottom + 8;
  let left = rect.left;

  // Se estourar embaixo, joga pra cima
  if (top + previewRect.height > window.innerHeight) {
    top = rect.top - previewRect.height - 8;
  }

  // Se estourar direita, alinha à direita
  if (left + previewRect.width > window.innerWidth) {
    left = window.innerWidth - previewRect.width - 16;
  }
  if (left < 8) left = 8;

  preview.style.top = top + 'px';
  preview.style.left = left + 'px';

  // Animar
  requestAnimationFrame(function() {
    preview.style.opacity = '1';
    preview.style.transform = 'translateY(0)';
  });

  el.dataset.previewAberto = '1';
  preview.addEventListener('mouseenter', function() { /* mantém aberto */ });
}

function fecharTodosPreviews() {
  document.querySelectorAll('.prod-ref-preview').forEach(function(p) { p.remove(); });
  document.querySelectorAll('.prod-ref').forEach(function(el) {
    delete el.dataset.previewAberto;
  });
}

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

function escapeAttr(s) {
  return escapeHtml(s);
}

// -------------------------------------------------------------
// Atalho: processa + ativa (uso em uma linha)
// -------------------------------------------------------------
export async function renderizarDescricao(texto, container) {
  if (!container) return;
  const r = await processarDescricao(texto);
  container.innerHTML = r.html;
  if (r.temReferencias) {
    ativarEventosPreview(container);
  }
}
