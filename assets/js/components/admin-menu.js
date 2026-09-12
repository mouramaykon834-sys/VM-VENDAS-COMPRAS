// =============================================================
// ADMIN MENU — VM VENDAS E COMPRAS
// =============================================================
// Menu lateral único, usado em TODAS as páginas do admin.
// Recebe o identificador da página ativa (ex: 'pagamentos').
// =============================================================

export function renderAdminMenu(ativo) {
  ativo = ativo || '';

  const el = document.getElementById('admin-sidebar');
  if (!el) return;

  const item = (chave, href, rotulo) => {
    const cls = chave === ativo ? 'admin-sidebar__item ativo' : 'admin-sidebar__item';
    return '<a href="' + href + '" class="' + cls + '">' + rotulo + '</a>';
  };

  el.innerHTML =
    '<a href="../index.html" class="admin-sidebar__logo"><span>🏠</span><span>Minha Loja</span><span class="admin-sidebar__logo-badge">ADMIN</span></a>' +

    '<div class="admin-sidebar__secao">Principal</div>' +
    '<nav class="admin-sidebar__lista">' +
      item('dashboard',    './index.html',        'Dashboard') +
      item('pedidos',      './pedidos.html',      'Pedidos') +
      item('propostas',    './propostas.html',    'Propostas') +
      item('conversas',    './conversas.html',    'Conversas') +
      item('mensagens',    './mensagens.html',    'Mensagens') +
    '</nav>' +

    '<div class="admin-sidebar__secao">Vendas</div>' +
    '<nav class="admin-sidebar__lista">' +
      item('orcamentos',   './orcamentos.html',   'Orçamentos') +
    '</nav>' +

    '<div class="admin-sidebar__secao">Financeiro</div>' +
    '<nav class="admin-sidebar__lista">' +
      item('financeiro',   './financeiro.html',      'Visão geral') +
      item('receber',      './contas-receber.html',  'Contas a receber') +
      item('pagar',        './contas-pagar.html',    'Contas a pagar') +
      item('fluxo',        './fluxo-caixa.html',     'Fluxo de caixa') +
    '</nav>' +

    '<div class="admin-sidebar__secao">Relatórios</div>' +
    '<nav class="admin-sidebar__lista">' +
      item('relatorios',   './relatorios.html',   'Todos os relatórios') +
    '</nav>' +

    '<div class="admin-sidebar__secao">Catálogo</div>' +
    '<nav class="admin-sidebar__lista">' +
      item('produtos',     './produtos.html',           'Produtos') +
      item('categorias',   './categorias.html',         'Categorias') +
      item('destaques',    './produtos-destaque.html',  'Destaques e promoções') +
    '</nav>' +

    '<div class="admin-sidebar__secao">Estoque</div>' +
    '<nav class="admin-sidebar__lista">' +
      item('estoque',      './estoque.html',              'Visão geral') +
      item('movimentar',   './estoque-movimentar.html',   'Movimentar') +
      item('historico',    './estoque-historico.html',    'Histórico') +
      item('alertas',      './estoque-alertas.html',      'Alertas') +
    '</nav>' +

    '<div class="admin-sidebar__secao">Compras</div>' +
    '<nav class="admin-sidebar__lista">' +
      item('fornecedores', './fornecedores.html',  'Fornecedores') +
      item('compras',      './compras.html',       'Compras') +
    '</nav>' +

    '<div class="admin-sidebar__secao">Clientes</div>' +
    '<nav class="admin-sidebar__lista">' +
      item('clientes',     './clientes.html',   'Clientes') +
    '</nav>' +

    '<div class="admin-sidebar__secao">Sistema</div>' +
    '<nav class="admin-sidebar__lista">' +
      item('auditoria',    './auditoria.html',   'Auditoria') +
    '</nav>' +

    '<div class="admin-sidebar__secao">Configurações</div>' +
    '<nav class="admin-sidebar__lista">' +
      item('empresa',      './empresa.html',        'Dados da empresa') +
      item('identidade',   './identidade.html',     'Identidade visual') +
      item('pagamentos',   './pagamentos.html',     'Formas de pagamento') +
      item('entregas',     './entregas.html',       'Entregas e fretes') +
      item('config',       './configuracoes.html',  'Outras configurações') +
    '</nav>' +

    '<div class="admin-sidebar__rodape">' +
      '<a href="../index.html">← Ver loja</a>' +
    '</div>';

  // Botão do menu mobile
  const btn     = document.getElementById('admin-menu-btn');
  const overlay = document.getElementById('admin-sidebar-overlay');

  if (btn) {
    btn.onclick = function() {
      el.classList.toggle('aberta');
      if (overlay) overlay.classList.toggle('ativa');
    };
  }
  if (overlay) {
    overlay.onclick = function() {
      el.classList.remove('aberta');
      overlay.classList.remove('ativa');
    };
  }
}
