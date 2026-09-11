// =============================================================
// COMPONENTE: CART + FAVORITOS — VM VENDAS E COMPRAS
// =============================================================
// Funções utilitárias:
//  - adicionarAoCarrinho(produto, quantidade)
//  - alternarFavorito(productId) → true/false (marcado)
//  - ehFavorito(productId)
//  - toast(titulo, mensagem, tipo)
// =============================================================

import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// Toast (notificação flutuante) — não usa modal, é discreto
// -------------------------------------------------------------
export function toast(titulo, mensagem, tipo) {
  tipo = tipo || 'info';

  let area = document.querySelector('.toast-area-cart');
  if (!area) {
    area = document.createElement('div');
    area.className = 'toast-area-cart';
    area.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;max-width:calc(100% - 40px);';
    document.body.appendChild(area);
  }

  const cores = {
    sucesso: { bg: '#dcfce7', cor: '#166534', borda: '#16a34a' },
    erro:    { bg: '#fee2e2', cor: '#991b1b', borda: '#dc2626' },
    info:    { bg: '#dbeafe', cor: '#1e40af', borda: '#0ea5e9' },
    alerta:  { bg: '#fef3c7', cor: '#92400e', borda: '#f59e0b' }
  };
  const c = cores[tipo] || cores.info;

  const el = document.createElement('div');
  el.style.cssText =
    'background:' + c.bg + ';color:' + c.cor + ';' +
    'border-left:4px solid ' + c.borda + ';' +
    'padding:12px 16px;border-radius:10px;' +
    'box-shadow:0 8px 20px rgba(15,23,42,.15);' +
    'font-family:system-ui,sans-serif;font-size:14px;' +
    'min-width:240px;max-width:100%;' +
    'pointer-events:auto;opacity:0;transform:translateX(20px);' +
    'transition:all .25s;';

  el.innerHTML =
    '<div style="font-weight:700;margin-bottom:2px;">' + escapar(titulo) + '</div>' +
    (mensagem ? '<div style="font-size:12px;opacity:.85;">' + escapar(mensagem) + '</div>' : '');

  area.appendChild(el);

  // Animação de entrada
  requestAnimationFrame(function() {
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
  });

  // Remove sozinho
  setTimeout(function() {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    setTimeout(function() { el.remove(); }, 300);
  }, 3000);
}

// -------------------------------------------------------------
// Adicionar ao carrinho (SEM redirecionar)
// -------------------------------------------------------------
export function adicionarAoCarrinho(produto, quantidade) {
  quantidade = quantidade || 1;

  try {
    const c = JSON.parse(localStorage.getItem('carrinho') || '[]');
    const idx = c.findIndex(function(i) { return i.id === produto.id; });

    if (idx >= 0) {
      c[idx].quantidade += quantidade;
    } else {
      c.push({
        id: produto.id,
        nome: produto.nome,
        preco: produto.precoFinal != null ? produto.precoFinal : produto.preco,
        imagem: produto.imagemPrincipal || null,
        quantidade: quantidade
      });
    }

    localStorage.setItem('carrinho', JSON.stringify(c));

    // Atualiza badge do carrinho no header (se existir)
    atualizarBadgeHeader();

    toast('✅ Adicionado ao carrinho', produto.nome, 'sucesso');
    return true;
  } catch (e) {
    console.error('[cart] erro', e);
    toast('Erro', 'Não foi possível adicionar ao carrinho.', 'erro');
    return false;
  }
}

function atualizarBadgeHeader() {
  try {
    const itens = JSON.parse(localStorage.getItem('carrinho') || '[]');
    const total = itens.reduce(function(s, i) { return s + (i.quantidade || 0); }, 0);
    const badge = document.getElementById('badge-carrinho');
    if (badge) {
      if (total > 0) {
        badge.textContent = total;
        badge.classList.remove('oculto');
      } else {
        badge.classList.add('oculto');
      }
    }
  } catch (e) {}
}

// -------------------------------------------------------------
// Verificar se é favorito
// -------------------------------------------------------------
export async function ehFavorito(productId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const r = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .maybeSingle();

    return !!(r.data && r.data.id);
  } catch (e) {
    return false;
  }
}

// -------------------------------------------------------------
// Alternar favorito — retorna true se ficou marcado, false se desmarcou
// -------------------------------------------------------------
export async function alternarFavorito(productId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Faça login para favoritar.');

  const r = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (r.data && r.data.id) {
    // Remove
    const del = await supabase.from('favorites').delete().eq('id', r.data.id);
    if (del.error) throw del.error;
    atualizarBadgeFavoritosHeader();
    return false;
  } else {
    // Insere
    const ins = await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
    if (ins.error) throw ins.error;
    atualizarBadgeFavoritosHeader();
    return true;
  }
}

function atualizarBadgeFavoritosHeader() {
  // Só atualiza se o header estiver com o badge
  const badge = document.getElementById('badge-favoritos');
  if (!badge) return;

  supabase.from('favorites').select('*', { count: 'exact', head: true })
    .then(function(r) {
      if (r.count > 0) {
        badge.textContent = r.count;
        badge.classList.remove('oculto');
      } else {
        badge.classList.add('oculto');
      }
    })
    .catch(function() {});
}

// -------------------------------------------------------------
// Utilitário
// -------------------------------------------------------------
function escapar(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}
