// =============================================================
// PÁGINA: ADMIN CATEGORIAS — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';
import { requireAdmin } from '../core/guards.js';
import { renderAdminSidebar } from '../components/admin-sidebar.js';

try {
  await requireAdmin();
  await renderAdminSidebar('categorias');
  await carregar();
} catch (e) {
  console.error('[admin-categorias] Erro:', e);
  mostrarErroNaTela(e);
}

document.getElementById('btn-nova-categoria')
  ?.addEventListener('click', () => abrirModal());

// -------------------------------------------------------------
async function carregar() {
  const elLista = document.getElementById('lista-categorias');

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });

  if (error) {
    elLista.innerHTML = `<div class="alerta alerta--erro">Erro ao carregar categorias: ${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!data.length) {
    elLista.innerHTML = `
      <div class="estado-vazio">
        <div class="estado-vazio__titulo">Nenhuma categoria cadastrada</div>
        <p class="estado-vazio__descricao">Clique em "Nova categoria" para criar a primeira.</p>
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
              <td><strong>${escapeHtml(c.nome)}</strong></td>
              <td class="texto-suave">${escapeHtml(c.slug || '')}</td>
              <td>
                ${c.ativo
                  ? `<span class="badge badge--sucesso">Ativa</span>`
                  : `<span class="badge badge--neutro">Inativa</span>`}
              </td>
              <td>
                <div class="admin-tabela__acoes">
                  <button class="btn btn--fantasma btn--sm" data-editar="${c.id}">Editar</button>
                  <button class="btn btn--fantasma btn--sm" data-excluir="${c.id}"
                          style="color:var(--cor-erro);">Excluir</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  elLista.querySelectorAll('[data-editar]').forEach(b => {
    b.addEventListener('click', () => {
      const cat = data.find(x => x.id === b.dataset.editar);
      abrirModal(cat);
    });
  });

  elLista.querySelectorAll('[data-excluir]').forEach(b => {
    b.addEventListener('click', async () => {
      const cat = data.find(x => x.id === b.dataset.excluir);
      if (!confirm(`Excluir "${cat.nome}"?`)) return;
      const { error } = await supabase.from('categories').delete().eq('id', cat.id);
      if (error) { alert('Erro ao excluir: ' + error.message); return; }
      carregar();
    });
  });
}

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
          <button class="modal__fechar" id="btn-fechar" aria-label="Fechar">×</button>
        </div>
        <form id="form-cat">
          <div class="modal__corpo">
            <div class="campo">
              <label for="nome">Nome</label>
              <input type="text" id="nome" required value="${escapeHtml(cat?.nome || '')}" />
            </div>
            <div class="campo">
              <label for="descricao">Descrição</label>
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

    const payload = {
      nome: document.getElementById('nome').value.trim(),
      descricao: document.getElementById('descricao').value.trim() || null,
      ordem: Number(document.getElementById('ordem').value) || 0,
      ativo: document.getElementById('ativo').value === 'true',
      slug: gerarSlug(document.getElementById('nome').value.trim())
    };

    let error;
    if (editando) {
      ({ error } = await supabase.from('categories').update(payload).eq('id', cat.id));
    } else {
      ({ error } = await supabase.from('categories').insert(payload));
    }

    if (error) {
      alert('Erro ao salvar: ' + error.message);
      btn.disabled = false;
      btn.textContent = editando ? 'Salvar' : 'Criar';
      return;
    }

    fecharModal();
    carregar();
  });
}

function fecharModal() {
  const el = document.getElementById('modal-categoria');
  el.classList.add('oculto');
  el.innerHTML = '';
}

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

function mostrarErroNaTela(e) {
  const main = document.querySelector('.admin-conteudo') || document.body;
  const div = document.createElement('div');
  div.className = 'alerta alerta--erro';
  div.innerHTML = `<div>
    <strong>Erro ao carregar</strong><br>
    ${escapeHtml(e?.message || 'Erro desconhecido')}
  </div>`;
  main.prepend(div);
}