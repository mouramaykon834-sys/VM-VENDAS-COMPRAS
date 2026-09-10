// =============================================================
// PÁGINA: ADMIN PRODUTO EDITAR/CRIAR — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';
import { requireAdmin } from '../core/guards.js';
import { renderAdminSidebar } from '../components/admin-sidebar.js';

await requireAdmin();
await renderAdminSidebar('produtos');

const params = new URLSearchParams(window.location.search);
const idEdicao = params.get('id');
const editando = !!idEdicao;

let imagensExistentes = []; // { id, url, principal, ordem }
let arquivosNovos = [];     // File objects

// -------------------------------------------------------------
// 1. Inicialização
// -------------------------------------------------------------
await carregarCategorias();

if (editando) {
  document.getElementById('titulo-pagina').textContent = 'Editar produto';
  document.title = 'Editar produto — Admin';
  await carregarProduto();
} else {
  document.getElementById('titulo-pagina').textContent = 'Novo produto';
}

document.getElementById('carregando').classList.add('oculto');
document.getElementById('form-produto').classList.remove('oculto');

// -------------------------------------------------------------
// 2. Carregar categorias
// -------------------------------------------------------------
async function carregarCategorias() {
  const { data } = await supabase
    .from('categories')
    .select('id, nome')
    .eq('ativo', true)
    .order('nome');

  const sel = document.getElementById('categoria_id');
  sel.innerHTML = `<option value="">Sem categoria</option>` +
    (data || []).map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
}

// -------------------------------------------------------------
// 3. Carregar produto existente
// -------------------------------------------------------------
async function carregarProduto() {
  const { data: p, error } = await supabase
    .from('products')
    .select(`*, product_images ( id, url, principal, ordem, storage_path )`)
    .eq('id', idEdicao)
    .maybeSingle();

  if (error || !p) {
    alert('Produto não encontrado.');
    window.location.href = './produtos.html';
    return;
  }

  document.getElementById('nome').value = p.nome || '';
  document.getElementById('descricao_curta').value = p.descricao_curta || '';
  document.getElementById('descricao').value = p.descricao || '';
  document.getElementById('marca').value = p.marca || '';
  document.getElementById('modelo').value = p.modelo || '';
  document.getElementById('sku').value = p.sku || '';
  document.getElementById('preco').value = p.preco ?? '';
  document.getElementById('preco_promocional').value = p.preco_promocional ?? '';
  document.getElementById('estoque').value = p.estoque ?? 0;
  document.getElementById('status').value = p.status || 'disponivel';
  document.getElementById('condicao').value = p.condicao || 'novo';
  document.getElementById('destaque').checked = !!p.destaque;

  // Categoria (aguarda carregamento anterior)
  setTimeout(() => {
    if (p.categoria_id) document.getElementById('categoria_id').value = p.categoria_id;
  }, 100);

  // Características (array)
  if (Array.isArray(p.caracteristicas) && p.caracteristicas.length) {
    document.getElementById('caracteristicas').value = p.caracteristicas.join('\n');
  }

  // Especificações (objeto)
  if (p.especificacoes && typeof p.especificacoes === 'object') {
    const linhas = Object.entries(p.especificacoes)
      .map(([k, v]) => `${k}: ${v}`).join('\n');
    document.getElementById('especificacoes').value = linhas;
  }

  // Imagens
  imagensExistentes = (p.product_images || [])
    .slice().sort((a, b) => {
      if (a.principal && !b.principal) return -1;
      if (!a.principal && b.principal) return 1;
      return (a.ordem || 0) - (b.ordem || 0);
    });

  renderizarImagens();
}

// -------------------------------------------------------------
// 4. Upload de arquivos
// -------------------------------------------------------------
const uploadArea = document.getElementById('upload-area');
const inputArquivos = document.getElementById('input-arquivos');

uploadArea.addEventListener('click', () => inputArquivos.click());
inputArquivos.addEventListener('change', (e) => {
  const novos = Array.from(e.target.files || []);
  arquivosNovos = arquivosNovos.concat(novos);
  renderizarImagens();
  inputArquivos.value = '';
});

// -------------------------------------------------------------
// 5. Render imagens (existentes + novas)
// -------------------------------------------------------------
function renderizarImagens() {
  const grid = document.getElementById('imagens-grid');

  const existentesHTML = imagensExistentes.map((img, idx) => `
    <div class="imagem-card ${img.principal ? 'principal' : ''}">
      <img src="${img.url}" alt="" />
      <button type="button" class="imagem-card__btn" data-rm-existente="${img.id}" title="Remover">×</button>
      ${!img.principal
        ? `<button type="button" class="imagem-card__btn" style="right: auto; left: 4px; color: var(--cor-principal);"
             data-principal="${img.id}" title="Tornar principal">★</button>`
        : ''}
    </div>
  `).join('');

  const novasHTML = arquivosNovos.map((file, idx) => `
    <div class="imagem-card">
      <img src="${URL.createObjectURL(file)}" alt="" />
      <button type="button" class="imagem-card__btn" data-rm-novo="${idx}" title="Remover">×</button>
    </div>
  `).join('');

  grid.innerHTML = existentesHTML + novasHTML;

  grid.querySelectorAll('[data-rm-existente]').forEach(b => {
    b.addEventListener('click', () => {
      imagensExistentes = imagensExistentes.filter(x => x.id !== b.dataset.rmExistente);
      renderizarImagens();
    });
  });

  grid.querySelectorAll('[data-rm-novo]').forEach(b => {
    b.addEventListener('click', () => {
      arquivosNovos.splice(Number(b.dataset.rmNovo), 1);
      renderizarImagens();
    });
  });

  grid.querySelectorAll('[data-principal]').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.dataset.principal;
      imagensExistentes = imagensExistentes.map(x => ({
        ...x,
        principal: x.id === id
      }));
      renderizarImagens();
    });
  });
}

// -------------------------------------------------------------
// 6. Salvar
// -------------------------------------------------------------
document.getElementById('form-produto').addEventListener('submit', salvar);
document.getElementById('btn-salvar-topo').addEventListener('click', (e) => {
  e.preventDefault();
  salvar();
});

async function salvar() {
  const nome = document.getElementById('nome').value.trim();
  const preco = Number(document.getElementById('preco').value);

  if (!nome) { alert('Informe o nome do produto.'); return; }
  if (!preco || preco <= 0) { alert('Informe um preço válido.'); return; }

  const btn = document.getElementById('btn-salvar');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const precoPromo = document.getElementById('preco_promocional').value;

  // Características (uma por linha)
  const caracTexto = document.getElementById('caracteristicas').value.trim();
  const caracteristicas = caracTexto
    ? caracTexto.split('\n').map(l => l.trim()).filter(Boolean)
    : [];

  // Especificações (chave: valor)
  const espTexto = document.getElementById('especificacoes').value.trim();
  const especificacoes = {};
  if (espTexto) {
    espTexto.split('\n').forEach(l => {
      const [k, ...rest] = l.split(':');
      if (k && rest.length) especificacoes[k.trim()] = rest.join(':').trim();
    });
  }

  const payload = {
    nome,
    descricao_curta: document.getElementById('descricao_curta').value.trim() || null,
    descricao: document.getElementById('descricao').value.trim() || null,
    marca: document.getElementById('marca').value.trim() || null,
    modelo: document.getElementById('modelo').value.trim() || null,
    sku: document.getElementById('sku').value.trim() || null,
    preco,
    preco_promocional: precoPromo ? Number(precoPromo) : null,
    estoque: Number(document.getElementById('estoque').value) || 0,
    status: document.getElementById('status').value,
    condicao: document.getElementById('condicao').value,
    destaque: document.getElementById('destaque').checked,
    categoria_id: document.getElementById('categoria_id').value || null,
    caracteristicas,
    especificacoes,
    slug: gerarSlug(nome) + '-' + Date.now().toString(36)
  };

  let produtoId = idEdicao;

  // Insert ou Update
  if (editando) {
    const { error } = await supabase.from('products').update(payload).eq('id', idEdicao);
    if (error) { finalizarErro(error); return; }
  } else {
    const { data, error } = await supabase.from('products').insert(payload).select('id').single();
    if (error) { finalizarErro(error); return; }
    produtoId = data.id;
  }

  // Remover imagens que foram apagadas da lista existente
  if (editando) {
    const { data: imgsDB } = await supabase
      .from('product_images')
      .select('id, storage_path')
      .eq('product_id', produtoId);

    const idsManter = imagensExistentes.map(x => x.id);
    const remover = (imgsDB || []).filter(x => !idsManter.includes(x.id));

    for (const r of remover) {
      if (r.storage_path) {
        await supabase.storage.from('products').remove([r.storage_path]).catch(() => {});
      }
      await supabase.from('product_images').delete().eq('id', r.id);
    }
  }

  // Upload de novas imagens
  if (arquivosNovos.length) {
    const status = document.getElementById('status-upload');
    status.classList.remove('oculto');

    for (let i = 0; i < arquivosNovos.length; i++) {
      const file = arquivosNovos[i];
      status.innerHTML = `Enviando imagem ${i + 1} de ${arquivosNovos.length}...`;

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${produtoId}/${Date.now()}-${i}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('products')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (upErr) {
        console.error('Erro upload:', upErr);
        continue;
      }

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(path);

      await supabase.from('product_images').insert({
        product_id: produtoId,
        url: urlData.publicUrl,
        storage_path: path,
        principal: false,
        ordem: i
      });
    }
    status.innerHTML = 'Imagens enviadas com sucesso.';
  }

  // Definir imagem principal (se alguma foi marcada)
  const principal = imagensExistentes.find(x => x.principal);
  if (principal) {
    // Remove principal atual no banco
    await supabase.from('product_images')
      .update({ principal: false })
      .eq('product_id', produtoId);
    // Aplica a nova
    await supabase.from('product_images')
      .update({ principal: true })
      .eq('id', principal.id);
  }

  btn.textContent = 'Salvo!';
  setTimeout(() => {
    window.location.href = './produtos.html';
  }, 800);
}

function finalizarErro(error) {
  console.error(error);
  alert('Erro ao salvar: ' + error.message);
  const btn = document.getElementById('btn-salvar');
  btn.disabled = false;
  btn.textContent = 'Salvar produto';
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