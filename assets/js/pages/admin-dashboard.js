// =============================================================
// PÁGINA: ADMIN DASHBOARD — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';
import { requireAdmin } from '../core/guards.js';
import { renderAdminSidebar } from '../components/admin-sidebar.js';

// -------------------------------------------------------------
// Inicialização
// -------------------------------------------------------------
(async function init() {
  try {
    await requireAdmin();
  } catch (e) {
    // Se requireAdmin lançou, é porque já redirecionamos ou bloqueamos.
    // Para tudo aqui — não executa o resto.
    console.warn('[admin-dashboard]', e?.message || e);
    return;
  }

  // Daqui pra baixo, com certeza é admin ✅
  try {
    await renderAdminSidebar('dashboard');
    await carregarCards();
    await carregarUltimosPedidos();
    await carregarUltimasPropostas();
    await carregarUltimasConversas();
  } catch (e) {
    console.error('[admin-dashboard] Erro ao carregar dados:', e);
    mostrarErroNaTela(e);
  }
})();

// -------------------------------------------------------------
async function carregarCards() {
  const el = document.getElementById('admin-cards');
  if (!el) return;

  const [
    totalProdutos, produtosDisponiveis,
    totalPedidos, pedidosAbertos,
    totalPropostas, propostasAbertas,
    totalClientes
  ] = await Promise.all([
    contar('products'),
    contar('products', { status: 'disponivel' }),
    contar('orders'),
    contar('orders', { status: 'aguardando' }),
    contar('proposals'),
    contar('proposals', { status: 'enviada' }),
    contar('profiles', { role: 'cliente' })
  ]);

  el.innerHTML = `
    ${cardHTML('Produtos', totalProdutos, `${produtosDisponiveis} disponíveis`, 'caixa')}
    ${cardHTML('Pedidos', totalPedidos, `${pedidosAbertos} aguardando`, 'carrinho')}
    ${cardHTML('Propostas', totalPropostas, `${propostasAbertas} em análise`, 'proposta')}
    ${cardHTML('Clientes', totalClientes, 'cadastrados', 'user')}
  `;
}

async function contar(tabela, filtro = null) {
  try {
    let q = supabase.from(tabela).select('*', { count: 'exact', head: true });
    if (filtro) Object.entries(filtro).forEach(([k, v]) => { q = q.eq(k, v); });
    const { count } = await q;
    return count || 0;
  } catch (e) {
    console.warn('[admin-dashboard] erro ao contar', tabela, e);
    return 0;
  }
}

function cardHTML(rotulo, valor, nota, icone) {
  return `
    <div class="admin-card">
      <div class="admin-card__icone">${svgIcone(icone)}</div>
      <div class="admin-card__rotulo">${rotulo}</div>
      <div class="admin-card__valor">${valor}</div>
      <div class="admin-card__nota">${nota}</div>
    </div>
  `;
}

async function carregarUltimosPedidos() {
  const el = document.getElementById('admin-ultimos-pedidos');
  if (!el) return;

  const { data, error } = await supabase
    .from('orders')
    .select('id, numero, status, total, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !data?.length) {
    el.innerHTML = `<div class="admin-lista-vazia">Nenhum pedido ainda.</div>`;
    return;
  }

  el.innerHTML = `
    <table class="admin-tabela">
      <thead><tr><th>Pedido</th><th>Status</th><th>Total</th><th>Data</th></tr></thead>
      <tbody>
        ${data.map(p => `
          <tr>
            <td><a href="./pedido.html?id=${p.id}"><strong>${escapeHtml(p.numero || '-')}</strong></a></td>
            <td><span class="badge badge--info">${traduzStatusPedido(p.status)}</span></td>
            <td>R$ ${Number(p.total || 0).toFixed(2)}</td>
            <td class="texto-suave">${formatarData(p.created_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function carregarUltimasPropostas() {
  const el = document.getElementById('admin-ultimas-propostas');
  if (!el) return;

  const { data, error } = await supabase
    .from('proposals')
    .select('id, numero, valor_proposta, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !data?.length) {
    el.innerHTML = `<div class="admin-lista-vazia">Nenhuma proposta ainda.</div>`;
    return;
  }

  el.innerHTML = `
    <table class="admin-tabela">
      <thead><tr><th>Número</th><th>Valor</th><th>Status</th><th>Data</th></tr></thead>
      <tbody>
        ${data.map(p => `
          <tr>
            <td><a href="./proposta.html?id=${p.id}"><strong>${escapeHtml(p.numero || '-')}</strong></a></td>
            <td>R$ ${Number(p.valor_proposta || 0).toFixed(2)}</td>
            <td><span class="badge badge--alerta">${traduzStatusProposta(p.status)}</span></td>
            <td class="texto-suave">${formatarData(p.created_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function carregarUltimasConversas() {
  const el = document.getElementById('admin-ultimas-conversas');
  if (!el) return;

  const { data, error } = await supabase
    .from('chats')
    .select('id, assunto, ultima_msg, ultima_msg_at, nao_lidas_admin')
    .order('ultima_msg_at', { ascending: false, nullsFirst: false })
    .limit(5);

  if (error || !data?.length) {
    el.innerHTML = `<div class="admin-lista-vazia">Nenhuma conversa ainda.</div>`;
    return;
  }

  el.innerHTML = `
    <table class="admin-tabela">
      <thead><tr><th>Assunto</th><th>Última mensagem</th><th>Quando</th></tr></thead>
      <tbody>
        ${data.map(c => `
          <tr>
            <td><a href="./conversa.html?id=${c.id}"><strong>${escapeHtml(c.assunto || '-')}</strong></a></td>
            <td class="texto-suave">${escapeHtml((c.ultima_msg || '').slice(0, 60))}</td>
            <td class="texto-suave">${c.ultima_msg_at ? formatarData(c.ultima_msg_at) : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function formatarData(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

function traduzStatusPedido(s) {
  const map = {
    aguardando: 'Aguardando', recebido: 'Recebido', em_analise: 'Em análise',
    confirmado: 'Confirmado', em_preparacao: 'Em preparação',
    enviado: 'Enviado', concluido: 'Concluído', cancelado: 'Cancelado'
  };
  return map[s] || s;
}

function traduzStatusProposta(s) {
  const map = {
    enviada: 'Enviada', em_analise: 'Em análise', contraproposta: 'Contraproposta',
    aceita: 'Aceita', recusada: 'Recusada', cancelada: 'Cancelada', concluida: 'Concluída'
  };
  return map[s] || s;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function svgIcone(nome) {
  const base = 'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  switch (nome) {
    case 'caixa': return `<svg ${base}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`;
    case 'carrinho': return `<svg ${base}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;
    case 'proposta': return `<svg ${base}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
    case 'user': return `<svg ${base}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    default: return '';
  }
}

function mostrarErroNaTela(e) {
  const main = document.querySelector('.admin-conteudo') || document.body;
  const div = document.createElement('div');
  div.className = 'alerta alerta--erro';
  div.innerHTML = `<div>
    <strong>Erro ao carregar o painel</strong><br>
    ${escapeHtml(e?.message || 'Erro desconhecido')}
  </div>`;
  main.prepend(div);
}