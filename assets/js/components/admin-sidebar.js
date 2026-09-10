// =============================================================
// COMPONENTE: ADMIN SIDEBAR — VM VENDAS E COMPRAS
// =============================================================
// Gera o menu lateral do painel administrativo.
//
// Uso:
//   import { renderAdminSidebar } from '../assets/js/components/admin-sidebar.js';
//   await renderAdminSidebar('dashboard');
// =============================================================

import { supabase } from '../supabase.js';

export async function renderAdminSidebar(ativo = 'dashboard') {
  const el = document.getElementById('admin-sidebar');
  if (!el) return;

  // Contadores para badges
  const { count: pedidosNovos } = await contar('orders', 'aguardando');
  const { count: propostasNovas } = await contar('proposals', 'enviada');
  const { count: msgsNovas } = await contarMensagensNaoLidas();
  const { count: notifNovas } = await contarNotificacoes();

  const item = (chave, href, rotulo, icone, badge = 0) => {
    const badgeHTML = badge > 0
      ? `<span class="admin-sidebar__badge">${badge > 99 ? '99+' : badge}</span>`
      : '';
    return `
      <a href="${href}" class="admin-sidebar__item ${ativo === chave ? 'ativo' : ''}">
        ${icone}
        <span>${rotulo}</span>
        ${badgeHTML}
      </a>
    `;
  };

  el.innerHTML = `
    <a href="../index.html" class="admin-sidebar__logo">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <span>Minha Loja</span>
      <span class="admin-sidebar__logo-badge">ADMIN</span>
    </a>

    <div class="admin-sidebar__secao">Principal</div>
    <nav class="admin-sidebar__lista">
      ${item('dashboard', './index.html', 'Dashboard', icone('dashboard'))}
      ${item('pedidos', './pedidos.html', 'Pedidos', icone('pedidos'), pedidosNovos || 0)}
      ${item('propostas', './propostas.html', 'Propostas', icone('propostas'), propostasNovas || 0)}
      ${item('conversas', './conversas.html', 'Conversas', icone('chat'), msgsNovas || 0)}
    </nav>

    <div class="admin-sidebar__secao">Catálogo</div>
    <nav class="admin-sidebar__lista">
      ${item('produtos', './produtos.html', 'Produtos', icone('produtos'))}
      ${item('categorias', './categorias.html', 'Categorias', icone('categorias'))}
    </nav>

    <div class="admin-sidebar__secao">Clientes</div>
    <nav class="admin-sidebar__lista">
      ${item('clientes', './clientes.html', 'Clientes', icone('clientes'))}
    </nav>

    <div class="admin-sidebar__secao">Configurações</div>
    <nav class="admin-sidebar__lista">
      ${item('empresa', './empresa.html', 'Dados da empresa', icone('empresa'))}
      ${item('identidade', './identidade.html', 'Identidade visual', icone('identidade'))}
      ${item('config', './configuracoes.html', 'Outras configurações', icone('config'))}
    </nav>

    <div class="admin-sidebar__rodape">
      <a href="../index.html">← Ver loja</a>
      <a href="#" id="admin-sair">Sair da conta</a>
    </div>
  `;

  // Botão de sair
  document.getElementById('admin-sair')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!confirm('Sair da conta?')) return;
    await supabase.auth.signOut();
    window.location.href = '../login.html';
  });

  // Menu mobile
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
// Contadores
// -------------------------------------------------------------
async function contar(tabela, status) {
  const { count } = await supabase
    .from(tabela)
    .select('*', { count: 'exact', head: true })
    .eq('status', status);
  return { count: count || 0 };
}

async function contarMensagensNaoLidas() {
  const { data } = await supabase
    .from('chats')
    .select('nao_lidas_admin');
  const total = (data || []).reduce((s, c) => s + (c.nao_lidas_admin || 0), 0);
  return { count: total };
}

async function contarNotificacoes() {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('lida', false);
  return { count: count || 0 };
}

// -------------------------------------------------------------
// Ícones SVG inline
// -------------------------------------------------------------
function icone(nome) {
  const base = 'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  switch (nome) {
    case 'dashboard':
      return `<svg ${base}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`;
    case 'pedidos':
      return `<svg ${base}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
    case 'propostas':
      return `<svg ${base}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
    case 'chat':
      return `<svg ${base}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;
    case 'produtos':
      return `<svg ${base}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`;
    case 'categorias':
      return `<svg ${base}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    case 'clientes':
      return `<svg ${base}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
    case 'empresa':
      return `<svg ${base}><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>`;
    case 'identidade':
      return `<svg ${base}><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z"/></svg>`;
    case 'config':
      return `<svg ${base}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    default:
      return '';
  }
}