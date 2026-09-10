// =============================================================
// PÁGINA: ADMIN PRODUTOS — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';
import { requireAdmin } from '../core/guards.js';
import { renderAdminSidebar } from '../components/admin-sidebar.js';

await requireAdmin();
await renderAdminSidebar('produtos');

const elLista = document.getElementById('lista-produtos');
let busca = '';

document.getElementById('busca').addEventListener('input', (e) => {
  busca = e.target.value.trim();
  clearTimeout(window.__t);
  window.__t = setTimeout(carregar, 300);
});

await carregar();

// -------------------------------------------------------------
async function carregar() {
  elLista.innerHTML = `<div class="carregando"><div class="spinner"></div></div>`;

  let q = supabase
    .from('products')
    .select(`
      id, nome, preco, preco_promocional, estoque, status, condicao,
      destaque, created_at, marca,
      categories ( nome ),
      product_images ( url, principal, ordem )
    `)
    .order('created_at', { ascending: false });

  if (busca) q = q.ilike('nome', `%${busca}%`);

  const { data, error } = await q;

  if (error) {
    console.error(error);
    elLista.innerHTML = `<div class="alerta alerta--erro">Erro ao carregar produtos.</div>`;
    return;
  }

  if (!data.length) {
    elLista.innerHTML = `
      <div class="estado-vazio">
        <div class="estado-vazio__titulo">
          ${busca ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
        </div>
        <p class="estado-vazio__descricao">
          ${busca
            ? 'Tente outra busca.'
            : 'Clique em "Novo produto" para cadastrar o primeiro.'}
        </p>
        ${!busca ? `<a href="./produto-editar.html" class="btn btn--principal">Cadastrar primeiro produto</a>` : ''}
      </div>
    `;
    return;
  }

  elLista.innerHTML = `
    <div class="admin-secao">
      <table class="admin-tabela">
        <thead>
          <tr>
            <th style="width:60px;">Imagem</th>
            <th>Produto</th>
            <th>Categoria</th>
            <th>Preço</th>
            <th>Estoque</th>
            <th>Status</th>
            <th style="width:160px;"></th>
          </tr>
        </thead>
        <tbody>
          ${data.map(p => {
            const img = ordenarImgs(p.product_images)[0]?.url || null;
            const temPromo = p.preco_promocional != null;
            return `
              <tr>
                <td>
                  ${img
                    ? `<img src="${img}" class="admin-tabela__miniatura" alt="" />`
                    : `<div class="admin-tabela__miniatura"></div>`}
                </td>
                <td>
                  <a href="../produto.html?id=${p.id}" target="_blank"><strong>${escapeHtml(p.nome)}</strong></a>
                  ${p.marca ? `<div class="texto-xs texto-suave">${escapeHtml(p.marca)}</div>` : ''}
                </td>
                <td class="texto-suave">${escapeHtml(p.categories?.nome || '-')}</td>
                <td>
                  ${temPromo
                    ? `<div class="texto-xs texto-suave" style="text-decoration:line-through;">R$ ${Number(p.preco).toFixed(2)}</div>
                       <strong class="texto-sucesso">R$ ${Number(p.preco_promocional).toFixed(2)}</strong>`
                    : `<strong>R$ ${Number(p.preco).toFixed(2)}</strong>`}
                </td>
                <td>${p.estoque}</td>
                <td>${badgeStatus(p.status)}</td>
                <td>
                  <div class="admin-tabela__acoes">
                    <a href="./produto-editar.html?id=${p.id}" class="btn btn--fantasma btn--sm">Editar</a>
                    <button class="btn btn--fantasma btn--sm" data-excluir="${p.id}" style="color:var(--cor-erro);">Excluir</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  elLista.querySelectorAll('[data-excluir]').forEach(b => {
    b.addEventListener('click', async () => {
      if (!confirm('Excluir este produto? Essa ação não pode ser desfeita.')) return;
      const { error } = await supabase.from('products').delete().eq('id', b.dataset.excluir);
      if (error) { alert('Erro ao excluir: ' + error.message); return; }
      carregar();
    });
  });
}

function ordenarImgs(imgs) {
  return (imgs || []).slice().sort((a, b) => {
    if (a.principal && !b.principal) return -1;
    if (!a.principal && b.principal) return 1;
    return (a.ordem || 0) - (b.ordem || 0);
  });
}

function badgeStatus(s) {
  const map = {
    disponivel:      ['badge--sucesso', 'Disponível'],
    indisponivel:    ['badge--erro', 'Indisponível'],
    em_negociacao:   ['badge--alerta', 'Em negociação'],
    vendido:         ['badge--neutro', 'Vendido'],
    oculto:          ['badge--neutro', 'Oculto']
  };
  const [cls, txt] = map[s] || ['badge--neutro', s];
  return `<span class="badge ${cls}">${txt}</span>`;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}