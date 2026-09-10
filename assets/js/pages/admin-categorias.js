// =============================================================
// PÁGINA: ADMIN CATEGORIAS — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';
import { requireAdmin } from '../core/guards.js';
import { renderAdminSidebar } from '../components/admin-sidebar.js';

await requireAdmin();
await renderAdminSidebar('categorias');

const elLista = document.getElementById('lista-categorias');

await carregar();

document.getElementById('btn-nova-categoria')
  .addEventListener('click', () => abrirModal());

// -------------------------------------------------------------
// LISTAR
// -------------------------------------------------------------
async function carregar() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });

  if (error) {
    elLista.innerHTML = `<div class="alerta alerta--erro">Erro ao carregar categorias.</div>`;
    console.error(error);
    return;
  }

  if (!data.length) {
    elLista.innerHTML = `
      <div class="estado-vazio">
        <div class="estado-vazio__titulo">Nenhuma categoria cadastrada</div>
        <p class="estado-vazio__descricao">
          Clique em "Nova categoria" para criar a primeira.
        </p>
      </div>
    `;
    return;
  }

  elLista.innerHTML = `
    <div class="admin-secao">
      <table class="admin-tabela">
        <thead>
          <tr>
            <th style="width:60px;">Ordem</th>
            <th style="width:80px;">Imagem</th>
            <th>Nome</th>
            <th>Slug</th>
            <th style="width:100px;">Ativa</th>
            <th style="width:140px;"></th>
          </tr>
        </thead>
        <tbody>
          ${data.map(c => `
            <tr>
              <td>${c.ordem ?? 0}</td>
              <td>
                ${c.imagem_url
                  ? `<img src="${c.imagem_url}" class="admin-tabela__miniatura" alt="" />`
                  : `<div class="admin-tabela__miniatura"></div>`}
              </td>
              <td>
                <strong>${escapeHtml(c.nome)}</strong>
                ${c.descricao ? `<div class="texto-xs texto-suave">${escapeHtml(c.descricao.slice(0, 60))}</div>` : ''}
              </td>
              <td class="texto-suave">${escapeHtml(c.slug || '')}</td>
              <td>
                ${c.ativo
                  ? `<span class="badge badge--sucesso">Ativa</span>`
                  : `<span class="badge badge--neutro">Inativa</span>`}
              </td>
              <td>
                <div class="admin-tabela__acoes">
                  <button class="btn btn--fantasma btn--sm" data-editar="${c.id}">Editar</button>
                  <button class="btn btn--fantasma btn--sm" data-excluir="${c.id}" style="color: var(--cor-erro);">Excluir</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  // Eventos
  elLista.querySelectorAll('[data-editar]').forEach(b => {
    b.addEventListener('click', () => {
      const cat = data.find(x => x.id === b.dataset.editar);
      abrirModal(cat);
    });
  });

  elLista.querySelectorAll('[data-excluir]').forEach(b => {
    b.addEventListener('click', async () => {
      const cat = data.find(x => x.id === b.dataset.excluir);
      if (!confirm(`Excluir a categoria "${cat.nome}"? Produtos vinculados ficarão sem categoria.`)) return;
      const { error } = await supabase.from('categories').delete().eq('id', cat.id);
      if (error) { toast('Erro ao excluir', error.message, 'erro'); return; }
      toast('Categoria excluída', '', 'sucesso');
      carregar();
    });
  });
}

// -------------------------------------------------------------
// MODAL CRIAR/EDITAR
// -------------------------------------------------------------
function abrirModal(cat = null) {
  const editando = !!cat;
  const el = document.getElementById('modal-categoria');
  el.classList.remove('oculto');
  el.innerHTML = `
    <div class="modal-overlay" id="modal-bg">
      <div class="modal" style="max-width: 520px;">
        <div class="modal__cabecalho">
          <h2 class="modal__titulo">${editando ? 'Editar' : 'Nova'} categoria</h2>
          <button class="modal__fechar" id="btn-fechar" aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form id="form-cat">
          <div class="modal__corpo">
            <div class="campo">
              <label for="nome">Nome</label>
              <input type="text" id="nome" required value="${escapeHtml(cat?.nome || '')}" />
            </div>
            <div class="campo">
              <label for="descricao">Descrição (opcional)</label>
              <textarea id="descricao" rows="3">${escapeHtml(cat?.descricao || '')}</textarea>
            </div>
            <div class="campo-grupo" style="gap: var(--esp-3);">
              <div class="campo" style="flex:1; margin-bottom:0;">
                <label for="ordem">Ordem</label>
                <input type="number" id="ordem" value="${cat?.ordem ?? 0}" min="0" />
              </div>
              <div class="campo" style="flex:1; margin-bottom:0;">
                <label for="ativo">Ativa</label>
                <select id="ativo">
                  <option value="true" ${cat?.ativo !== false ? 'selected' : ''}>Sim</option>
                  <option value="false" ${cat?.ativo === false ? 'selected' : ''}>Não</option>
                </select>
              </div>
            </div>
          </div>
          <div class="modal__rodape">
            <button type="button" class="btn btn--fantasma" id="btn-cancelar">Cancelar</button>
            <button type="submit" class="btn btn--principal" id="btn-salvar">
              ${editando ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('btn-fechar').onclick = fecharModal;
  document.getElementById('btn-cancelar').onclick = fecharModal;
  document.getElementById('modal-bg').onclick = (e) => {
    if (e.target.id === 'modal-bg') fecharModal();
  };

  document.getElementById('form-cat').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const nome = document.getElementById('nome').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const ordem = Number(document.getElementById('ordem').value) || 0;
    const ativo = document.getElementById('ativo').value === 'true';

    const slug = gerarSlug(nome);
    const payload = { nome, descricao: descricao || null, ordem, ativo, slug };

    let error;
    if (editando) {
      ({ error } = await supabase.from('categories').update(payload).eq('id', cat.id));
    } else {
      ({ error } = await supabase.from('categories').insert(payload));
    }

    if (error) {
      console.error(error);
      toast('Erro ao salvar', error.message, 'erro');
      btn.disabled = false;
      btn.textContent = editando ? 'Salvar' : 'Criar';
      return;
    }

    fecharModal();
    toast(editando ? 'Categoria atualizada' : 'Categoria criada', '', 'sucesso');
    carregar();
  });
}

function fecharModal() {
  const el = document.getElementById('modal-categoria');
  el.classList.add('oculto');
  el.innerHTML = '';
}

// -------------------------------------------------------------
// Util
// -------------------------------------------------------------
function gerarSlug(s) {
  return s.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toast(titulo, msg = '', tipo = 'info') {
  let area = document.querySelector('.toast-area');
  if (!area) {
    area = document.createElement('div');
    area.className = 'toast-area';
    document.body.appendChild(area);
  }
  const t = document.createElement('div');
  t.className = `toast toast--${tipo}`;
  t.innerHTML = `
    <div class="toast__titulo">${escapeHtml(titulo)}</div>
    ${msg ? `<div class="toast__msg">${escapeHtml(msg)}</div>` : ''}
  `;
  area.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}