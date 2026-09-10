// =============================================================
// HEADER — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';
import { carregarConfiguracoes } from '../services/settings.service.js';

export async function renderHeader(ativo) {
  ativo = ativo || '';
  const el = document.getElementById('header');
  if (!el) return;

  aplicarTemaSalvo();

  const temaAtual = document.documentElement.getAttribute('data-tema') || 'claro';
  const iconeTema = temaAtual === 'escuro'
    ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  el.innerHTML = `
    <header class="cabecalho">
      <div class="container cabecalho__interno">
        <a href="./index.html" class="cabecalho__logo" id="header-logo"><span id="header-logo-nome">Minha Loja</span></a>

        <form class="cabecalho__busca" role="search" id="form-busca">
          <svg class="cabecalho__busca-icone" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="search" name="q" placeholder="O que você procura?" aria-label="Buscar produtos">
        </form>

        <nav class="cabecalho__acoes" aria-label="Ações do usuário">
          <button type="button" class="cabecalho__acao" id="btn-tema" title="Alternar tema">${iconeTema}</button>
          <a href="./favoritos.html" class="cabecalho__acao" title="Favoritos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span class="cabecalho__acao-texto">Favoritos</span>
            <span class="cabecalho__badge oculto" id="badge-favoritos"></span>
          </a>
          <a href="./carrinho.html" class="cabecalho__acao" title="Carrinho">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span class="cabecalho__acao-texto">Carrinho</span>
            <span class="cabecalho__badge oculto" id="badge-carrinho"></span>
          </a>
          <a href="./chat.html" class="cabecalho__acao" title="Mensagens">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span class="cabecalho__acao-texto">Chat</span>
          </a>
          <a href="./notificacoes.html" class="cabecalho__acao" title="Notificações">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span class="cabecalho__acao-texto">Notif.</span>
            <span class="cabecalho__badge oculto" id="badge-notif"></span>
          </a>
          <span id="header-admin-slot"></span>
          <a href="./login.html" id="header-conta" class="cabecalho__acao" title="Minha conta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span class="cabecalho__acao-texto" id="header-conta-texto">Entrar</span>
          </a>
        </nav>
      </div>
    </header>
  `;

  const formBusca = document.getElementById('form-busca');
  if (formBusca) {
    formBusca.addEventListener('submit', function(e) {
      e.preventDefault();
      const q = formBusca.querySelector('input[name="q"]').value.trim();
      window.location.href = './produtos.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
  }

  const btnTema = document.getElementById('btn-tema');
  if (btnTema) {
    btnTema.addEventListener('click', function() {
      const atual = document.documentElement.getAttribute('data-tema') || 'claro';
      const novo = atual === 'escuro' ? 'claro' : 'escuro';
      document.documentElement.setAttribute('data-tema', novo);
      try { localStorage.setItem('vm-tema', novo); } catch (e) {}
      btnTema.innerHTML = novo === 'escuro'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    });
  }

  try {
    const cfg = await comTimeout(carregarConfiguracoes(), 3000);
    const visual = cfg.visual || {};
    const company = cfg.company || {};
    const nomeLoja = company.nome_fantasia || company.nome_empresa || 'Minha Loja';
    const logoEl = document.getElementById('header-logo');
    if (visual.logo_url) {
      logoEl.innerHTML = '<img src="' + visual.logo_url + '" alt="' + escapar(nomeLoja) + '" loading="eager" />';
    } else {
      document.getElementById('header-logo-nome').textContent = nomeLoja;
    }
  } catch (e) { console.warn('[header] logo:', e); }

  atualizarBadge('badge-carrinho', contarCarrinhoLocal());

  (async function() {
    let user = null;
    try {
      const r = await comTimeout(supabase.auth.getUser(), 4000);
      user = (r && r.data) ? r.data.user : null;
    } catch (e) { user = null; }

    if (!user) return;

    const contaLink = document.getElementById('header-conta');
    const contaTexto = document.getElementById('header-conta-texto');
    if (contaLink) contaLink.href = './perfil.html';
    if (contaTexto) contaTexto.textContent = 'Minha conta';

    try {
      const f = await comTimeout(
        supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        3000
      );
      atualizarBadge('badge-favoritos', (f && f.count) ? f.count : 0);
    } catch (e) {}

    try {
      const n = await comTimeout(
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('lida', false),
        3000
      );
      atualizarBadge('badge-notif', (n && n.count) ? n.count : 0);
    } catch (e) {}

    try {
      const p = await comTimeout(
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
        3000
      );
      const ehAdmin = (p && p.data && p.data.role === 'admin');
      if (ehAdmin) {
        const slot = document.getElementById('header-admin-slot');
        if (slot) {
          const a = document.createElement('a');
          a.href = './admin/';
          a.className = 'cabecalho__acao cabecalho__acao--admin';
          a.title = 'Painel administrativo';
          a.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l9 4v6c0 5-3.5 9.5-9 10-5.5-.5-9-5-9-10V6z"/></svg><span class="cabecalho__acao-texto">Admin</span>';
          slot.appendChild(a);
        }
      }
    } catch (e) {}
  })();
}

function aplicarTemaSalvo() {
  try {
    const salvo = localStorage.getItem('vm-tema');
    if (salvo === 'escuro') document.documentElement.setAttribute('data-tema', 'escuro');
  } catch (e) {}
}

function comTimeout(p, ms) {
  ms = ms || 5000;
  return Promise.race([p, new Promise(function(_, rej) { setTimeout(function() { rej(new Error('timeout')); }, ms); })]);
}

function atualizarBadge(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;
  if (valor > 0) { el.textContent = valor; el.classList.remove('oculto'); }
  else { el.classList.add('oculto'); }
}

function contarCarrinhoLocal() {
  try {
    const itens = JSON.parse(localStorage.getItem('carrinho') || '[]');
    return itens.reduce(function(s, i) { return s + (i.quantidade || 0); }, 0);
  } catch (e) { return 0; }
}

function escapar(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}
