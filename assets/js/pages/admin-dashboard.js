// =============================================================
// PÁGINA: ADMIN DASHBOARD — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';
import { requireAdmin } from '../core/guards.js';
import { renderAdminSidebar } from '../components/admin-sidebar.js';

// -------------------------------------------------------------
// 1. Protege a rota — só admin entra
// -------------------------------------------------------------
await requireAdmin();

// -------------------------------------------------------------
// 2. Renderiza o menu lateral
// -------------------------------------------------------------
await renderAdminSidebar('dashboard');

// -------------------------------------------------------------
// 3. Carrega os números do dashboard
// -------------------------------------------------------------
await carregarCards();
await carregarUltimosPedidos();
await carregarUltimasPropostas();
await carregarUltimasConversas();

// -------------------------------------------------------------
// CARDS DE RESUMO
// -------------------------------------------------------------
async function carregarCards() {
  const el = document.getElementById('admin-cards');

  const [
    totalProdutos,
    produtosDisponiveis,
    totalPedidos,
    pedidosAbertos,
    totalPropostas,
    propostasAbertas,
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
    ${card('Produtos', totalProdutos, `${produtosDisponiveis} disponíveis`, 'caixa')}
    ${card('Pedidos', totalPedidos, `${pedidosAbertos} aguardando`, 'carrinho')}
    ${card('Propostas', totalPropostas, `${propostasAbertas} em análise`, 'proposta')}
    ${card('Clientes', totalClientes, 'cadastrados', 'user')}
  `;
}

async function contar(tabela, filtro = null) {
  let q = supabase.from(tabela).select('*', { count: 'exact', head: true });
  if (filtro) {
    Object.entries(filtro).forEach(([k, v]) => { q = q.eq(k, v); });
  }
  const { count } = await q;
  return count || 0;
}

function card(rotulo, valor, nota, icone) {
  return `
    <div class="admin-card">
      <div class="admin-card__icone">${svgIcone(icone)}</div>
      <div class="admin-card__rotulo">${rotulo}</div>
      <div class="admin-card__valor">${valor}</div>
      <div class="admin-card__nota">${nota}</div>
    </div>
  `;
}

// -------------------------------------------------------------
// ÚLTIMOS PEDIDOS
// -------------------------------------------------------------
async function carregarUltimosPedidos() {
  const el = document.getElementById('admin-ultimos-pedidos');

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id, numero, status, total, created_at,
      profiles:user_id ( nome )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !data?.length) {
    el.innerHTML = `<div class="admin-lista-vazia">Nenhum pedido ainda.</div>`;
    return;
  }

  el.innerHTML = `
    <table class="admin-tabela">
      <thead>
        <tr>
          <th>Pedido</th>
          <th>Cliente</th>
          <th>Status</th>
          <th>Total</th>
          <th>Data</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(p => `
          <tr>
            <td><a href="./pedido.html?id=${p.id}"><strong>${escapeHtml(p.numero || '-')}</strong></a></td>
            <td>${escapeHtml(p.profiles?.nome || '-')}</td>
            <td><span class="badge badge--info">${traduzStatusPedido(p.status)}</span></td>
            <td>R$ ${Number(p.total || 0).toFixed(2)}</td>
            <td class="texto-suave">${formatarData(p.created_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// -------------------------------------------------------------
// ÚLTIMAS PROPOSTAS
// -------------------------------------------------------------
async function carregarUltimasPropostas() {
  const el = document.getElementById('admin-ultimas-propostas');

  const { data, error } = await supabase
    .from('proposals')
    .select(`
      id, numero, valor_proposta, status, created_at,
      profiles:user_id ( nome ),
      products:product_id ( nome )
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !data?.length) {
    el.innerHTML = `<div class="admin-lista-vazia">Nenhuma proposta ainda.</div>`;
    return;
  }

  el.innerHTML = `
    <table class="admin-tabela">
      <thead>
        <tr>
          <th>Número</th>
          <th>Cliente</th>
          <th>Produto</th>
          <th>Valor</th>
          <th>Status</th>
          <th>Data</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(p => `
          <tr>
            <td><a href="./proposta.html?id=${p.id}"><strong>${escapeHtml(p.numero || '-')}</strong></a></td>
            <td>${escapeHtml(p.profiles?.nome || '-')}</td>
            <td>${escapeHtml(p.products?.nome || '-')}</td>
            <td>R$ ${Number(p.valor_proposta || 0).toFixed(2)}</td>
            <td><span class="badge badge--alerta">${traduzStatusProposta(p.status)}</span></td>
            <td class="texto-suave">${formatarData(p.created_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// -------------------------------------------------------------
// ÚLTIMAS CONVERSAS
// -------------------------------------------------------------
async function carregarUltimasConversas() {
  const el = document.getElementById('admin-ultimas-conversas');

  const { data, error } = await supabase
    .from('chats')
    .select(`
      id, assunto, ultima_msg, ultima_msg_at, nao_lidas_admin,
      profiles:user_id ( nome )
    `)
    .order('ultima_msg_at', { ascending: false, nullsFirst: false })
    .limit(5);

  if (error || !data?.length) {
    el.innerHTML = `<div class="admin-lista-vazia">Nenhuma conversa ainda.</div>`;
    return;
  }

  el.innerHTML = `
    <table class="admin-tabela">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Assunto</th>
          <th>Última mensagem</th>
          <th>Quando</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(c => `
          <tr>
            <td>
              <a href="./conversa.html?id=${c.id}">
                <strong>${escapeHtml(c.profiles?.nome || 'Cliente')}</strong>
                ${c.nao_lidas_admin > 0 ? `<span class="admin-sidebar__badge">${c.nao_lidas_admin}</span>` : ''}
              </a>
            </td>
            <td>${escapeHtml(c.assunto || '-')}</td>
            <td class="texto-suave">${escapeHtml((c.ultima_msg || '').slice(0, 60))}${(c.ultima_msg || '').length > 60 ? '…' : ''}</td>
            <td class="texto-suave">${c.ultima_msg_at ? formatarData(c.ultima_msg_at) : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// -------------------------------------------------------------
// Utilidades
// -------------------------------------------------------------
function formatarData(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function traduzStatusPedido(s) {
  const map = {
    aguardando: 'Aguardando',
    recebido: 'Recebido',
    em_analise: 'Em análise',
    confirmado: 'Confirmado',
    em_preparacao: 'Em preparação',
    enviado: 'Enviado',
    concluido: 'Concluído',
    cancelado: 'Cancelado'
  };
  return map[s] || s;
}

function traduzStatusProposta(s) {
  const map = {
    enviada: 'Enviada',
    em_analise: 'Em análise',
    contraproposta: 'Contraproposta',
    aceita: 'Aceita',
    recusada: 'Recusada',
    cancelada: 'Cancelada',
    concluida: 'Concluída'
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