// =============================================================
// ADMIN DASHBOARD — VERSÃO SIMPLIFICADA (sem guards nem sidebar)
// =============================================================

import { supabase } from '../supabase.js';

console.log('[admin-dashboard] Início');

// -------------------------------------------------------------
// Checa sessão e admin aqui dentro, sem depender de guards.js
// -------------------------------------------------------------
(async function init() {
  try {
    console.log('[admin-dashboard] Verificando sessão...');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('[admin-dashboard] Sem sessão, redirecionando.');
      window.location.href = '../login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    console.log('[admin-dashboard] Sessão ok:', session.user.email);

    const { data: perfil, error: errPerfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (errPerfil || !perfil || perfil.role !== 'admin') {
      console.warn('[admin-dashboard] Não é admin.', perfil, errPerfil);
      alert('Acesso restrito a administradores.');
      window.location.href = '../index.html';
      return;
    }
    console.log('[admin-dashboard] É admin ✅');

    // Preenche a sidebar MANUALMENTE (sem depender de admin-sidebar.js)
    preencherSidebar();
    console.log('[admin-dashboard] Sidebar preenchida');

    // Preenche o conteúdo
    await carregarCards();
    console.log('[admin-dashboard] Cards carregados');

    await carregarSecao('admin-ultimos-pedidos', 'orders', 'Nenhum pedido ainda.');
    await carregarSecao('admin-ultimas-propostas', 'proposals', 'Nenhuma proposta ainda.');
    await carregarSecao('admin-ultimas-conversas', 'chats', 'Nenhuma conversa ainda.');

    console.log('[admin-dashboard] Fim ✅');
  } catch (e) {
    console.error('[admin-dashboard] ERRO:', e);
    const main = document.querySelector('.admin-conteudo') || document.body;
    const div = document.createElement('div');
    div.style.cssText = 'background:#fee2e2;color:#991b1b;padding:16px;border-radius:8px;margin:16px;font-family:monospace;';
    div.textContent = 'Erro: ' + (e?.message || e);
    main.prepend(div);
  }
})();

// -------------------------------------------------------------
// Sidebar manual (sem import de admin-sidebar.js)
// -------------------------------------------------------------
function preencherSidebar() {
  const el = document.getElementById('admin-sidebar');
  if (!el) return;

  const item = (chave, href, rotulo, icone) => `
    <a href="${href}" class="admin-sidebar__item ${chave === 'dashboard' ? 'ativo' : ''}">
      ${icone}
      <span>${rotulo}</span>
    </a>
  `;

  el.innerHTML = `
    <a href="../index.html" class="admin-sidebar__logo">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      </svg>
      <span>Minha Loja</span>
      <span class="admin-sidebar__logo-badge">ADMIN</span>
    </a>
    <div class="admin-sidebar__secao">Principal</div>
    <nav class="admin-sidebar__lista">
      ${item('dashboard', './index.html', 'Dashboard', svg('dashboard'))}
      ${item('pedidos', './pedidos.html', 'Pedidos', svg('pedidos'))}
      ${item('propostas', './propostas.html', 'Propostas', svg('propostas'))}
      ${item('conversas', './conversas.html', 'Conversas', svg('chat'))}
    </nav>
    <div class="admin-sidebar__secao">Catálogo</div>
    <nav class="admin-sidebar__lista">
      ${item('produtos', './produtos.html', 'Produtos', svg('produtos'))}
      ${item('categorias', './categorias.html', 'Categorias', svg('categorias'))}
    </nav>
    <div class="admin-sidebar__secao">Clientes</div>
    <nav class="admin-sidebar__lista">
      ${item('clientes', './clientes.html', 'Clientes', svg('clientes'))}
    </nav>
    <div class="admin-sidebar__secao">Configurações</div>
    <nav class="admin-sidebar__lista">
      ${item('empresa', './empresa.html', 'Dados da empresa', svg('empresa'))}
      ${item('identidade', './identidade.html', 'Identidade visual', svg('identidade'))}
      ${item('config', './configuracoes.html', 'Outras configurações', svg('config'))}
    </nav>
    <div class="admin-sidebar__rodape">
      <a href="../index.html">← Ver loja</a>
      <a href="#" id="admin-sair">Sair da conta</a>
    </div>
  `;

  document.getElementById('admin-sair')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!confirm('Sair da conta?')) return;
    await supabase.auth.signOut();
    window.location.href = '../login.html';
  });

  const btn = document.getElementById('admin-menu-btn');
  const overlay = document.getElementById('admin-sidebar-overlay');
  if (btn) {
    btn.addEventListener('click', () => {
      el.classList.toggle('aberta');
      overlay?.classList.toggle('ativa');
    });
    overlay?.addEventListener('click', () => {
      el.classList.remove('aberta');
      overlay.classList.remove('ativa');
    });
  }
}

// -------------------------------------------------------------
// Cards do topo
// -------------------------------------------------------------
async function carregarCards() {
  const el = document.getElementById('admin-cards');
  if (!el) return;

  const contar = async (tabela, filtro) => {
    let q = supabase.from(tabela).select('*', { count: 'exact', head: true });
    if (filtro) Object.entries(filtro).forEach(([k, v]) => { q = q.eq(k, v); });
    const { count } = await q;
    return count || 0;
  };

  const [produtos, pedidos, propostas, clientes] = await Promise.all([
    contar('products'),
    contar('orders'),
    contar('proposals'),
    contar('profiles', { role: 'cliente' })
  ]);

  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-card__rotulo">Produtos</div>
      <div class="admin-card__valor">${produtos}</div>
      <div class="admin-card__nota">cadastrados</div>
    </div>
    <div class="admin-card">
      <div class="admin-card__rotulo">Pedidos</div>
      <div class="admin-card__valor">${pedidos}</div>
      <div class="admin-card__nota">total</div>
    </div>
    <div class="admin-card">
      <div class="admin-card__rotulo">Propostas</div>
      <div class="admin-card__valor">${propostas}</div>
      <div class="admin-card__nota">total</div>
    </div>
    <div class="admin-card">
      <div class="admin-card__rotulo">Clientes</div>
      <div class="admin-card__valor">${clientes}</div>
      <div class="admin-card__nota">cadastrados</div>
    </div>
  `;
}

// -------------------------------------------------------------
// Seções (últimos registros)
// -------------------------------------------------------------
async function carregarSecao(idEl, tabela, textoVazio) {
  const el = document.getElementById(idEl);
  if (!el) return;

  try {
    let q = supabase.from(tabela).select('*').limit(5);

    if (tabela === 'orders') q = q.order('created_at', { ascending: false });
    if (tabela === 'proposals') q = q.order('created_at', { ascending: false });
    if (tabela === 'chats') q = q.order('updated_at', { ascending: false });

    const { data, error } = await q;

    if (error) {
      el.innerHTML = `<div class="admin-lista-vazia" style="color:#dc2626;">Erro: ${escapar(error.message)}</div>`;
      return;
    }

    if (!data?.length) {
      el.innerHTML = `<div class="admin-lista-vazia">${textoVazio}</div>`;
      return;
    }

    el.innerHTML = `<div class="admin-lista-vazia">${data.length} registro(s) encontrado(s).</div>`;
  } catch (e) {
    el.innerHTML = `<div class="admin-lista-vazia" style="color:#dc2626;">Erro: ${escapar(e.message)}</div>`;
  }
}

// -------------------------------------------------------------
function escapar(s) {
  if (s == null) return '';
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function svg(nome) {
  const b = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const icones = {
    dashboard: `<svg ${b}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
    pedidos: `<svg ${b}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    propostas: `<svg ${b}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    chat: `<svg ${b}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    produtos: `<svg ${b}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    categorias: `<svg ${b}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
    clientes: `<svg ${b}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    empresa: `<svg ${b}><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>`,
    identidade: `<svg ${b}><circle cx="12" cy="12" r="10"/><circle cx="8.5" cy="8.5" r="1.5"/><circle cx="15.5" cy="8.5" r="1.5"/><circle cx="8.5" cy="15.5" r="1.5"/><circle cx="15.5" cy="15.5" r="1.5"/></svg>`,
    config: `<svg ${b}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`
  };
  return icones[nome] || '';
}
