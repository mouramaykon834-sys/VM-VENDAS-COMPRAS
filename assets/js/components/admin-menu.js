// =============================================================
// ADMIN MENU — VM VENDAS E COMPRAS
// =============================================================
// Menu lateral recolhível, usado nas páginas do admin.
// =============================================================

export function renderAdminMenu(ativo) {
  ativo = ativo || '';

  const el = document.getElementById('admin-sidebar');
  if (!el) return;

  const item = (chave, href, icone, rotulo) => {
    const cls = chave === ativo
      ? 'admin-sidebar__item ativo'
      : 'admin-sidebar__item';

    return `
      <a href="${href}" class="${cls}" title="${rotulo}">
        <span class="admin-sidebar__icone">${icone}</span>
        <span class="admin-sidebar__texto">${rotulo}</span>
      </a>
    `;
  };

  el.innerHTML = `
    <div class="admin-sidebar__topo">

      <a href="../index.html"
         class="admin-sidebar__logo"
         title="Minha Loja">

        <span class="admin-sidebar__logo-icone">🏠</span>

        <span class="admin-sidebar__logo-texto">
          Minha Loja
        </span>

        <span class="admin-sidebar__logo-badge">
          ADMIN
        </span>

      </a>

      <button
        type="button"
        class="admin-sidebar__recolher"
        id="admin-sidebar-toggle"
        title="Recolher menu"
        aria-label="Recolher menu">
        ‹
      </button>

    </div>

    <!-- PRINCIPAL -->
    <div class="admin-sidebar__secao">Principal</div>

    <nav class="admin-sidebar__lista">
      ${item('dashboard', './index.html', '⌂', 'Dashboard')}
      ${item('pedidos', './pedidos.html', '🛒', 'Pedidos')}
      ${item('propostas', './propostas.html', '📄', 'Propostas')}
      ${item('conversas', './conversas.html', '💬', 'Conversas')}
      ${item('mensagens', './mensagens.html', '✉', 'Mensagens')}
    </nav>


    <!-- VENDAS -->
    <div class="admin-sidebar__secao">Vendas</div>

    <nav class="admin-sidebar__lista">
      ${item('orcamentos', './orcamentos.html', '🧾', 'Orçamentos')}
    </nav>


    <!-- FINANCEIRO -->
    <div class="admin-sidebar__secao">Financeiro</div>

    <nav class="admin-sidebar__lista">
      ${item('financeiro', './financeiro.html', '💰', 'Visão geral')}
      ${item('receber', './contas-receber.html', '↗', 'Contas a receber')}
      ${item('pagar', './contas-pagar.html', '↘', 'Contas a pagar')}
      ${item('fluxo', './fluxo-caixa.html', '📊', 'Fluxo de caixa')}
    </nav>


    <!-- RELATÓRIOS -->
    <div class="admin-sidebar__secao">Relatórios</div>

    <nav class="admin-sidebar__lista">
      ${item('relatorios', './relatorios.html', '📈', 'Todos os relatórios')}
    </nav>


    <!-- CATÁLOGO -->
    <div class="admin-sidebar__secao">Catálogo</div>

    <nav class="admin-sidebar__lista">
      ${item('produtos', './produtos.html', '📦', 'Produtos')}
      ${item('categorias', './categorias.html', '🏷', 'Categorias')}
      ${item('destaques', './produtos-destaque.html', '⭐', 'Destaques e promoções')}
    </nav>


    <!-- ESTOQUE -->
    <div class="admin-sidebar__secao">Estoque</div>

    <nav class="admin-sidebar__lista">
      ${item('estoque', './estoque.html', '📦', 'Visão geral')}
      ${item('movimentar', './estoque-movimentar.html', '↕', 'Movimentar')}
      ${item('historico', './estoque-historico.html', '🕘', 'Histórico')}
      ${item('alertas', './estoque-alertas.html', '⚠', 'Alertas')}
    </nav>


    <!-- COMPRAS -->
    <div class="admin-sidebar__secao">Compras</div>

    <nav class="admin-sidebar__lista">
      ${item('fornecedores', './fornecedores.html', '🚚', 'Fornecedores')}
      ${item('compras', './compras.html', '🛍', 'Compras')}
    </nav>


    <!-- CLIENTES -->
    <div class="admin-sidebar__secao">Clientes</div>

    <nav class="admin-sidebar__lista">
      ${item('clientes', './clientes.html', '👥', 'Clientes')}
    </nav>


    <!-- SISTEMA -->
    <div class="admin-sidebar__secao">Sistema</div>

    <nav class="admin-sidebar__lista">
      ${item('auditoria', './auditoria.html', '🔎', 'Auditoria')}
    </nav>


    <!-- CONFIGURAÇÕES -->
    <div class="admin-sidebar__secao">Configurações</div>

    <nav class="admin-sidebar__lista">
      ${item('empresa', './empresa.html', '🏢', 'Dados da empresa')}
      ${item('identidade', './identidade.html', '🎨', 'Identidade visual')}
      ${item('pagamentos', './pagamentos.html', '💳', 'Formas de pagamento')}
      ${item('entregas', './entregas.html', '🚚', 'Entregas e fretes')}
      ${item('config', './configuracoes.html', '⚙', 'Outras configurações')}
    </nav>


    <!-- RODAPÉ -->
    <div class="admin-sidebar__rodape">

      <a href="../index.html" title="Ver loja">
        <span class="admin-sidebar__icone">←</span>
        <span class="admin-sidebar__texto">Ver loja</span>
      </a>

    </div>
  `;


  // =============================================================
  // RECOLHER / EXPANDIR
  // =============================================================

  const toggle = document.getElementById('admin-sidebar-toggle');

  if (toggle) {
    toggle.onclick = function () {

      const recolhida =
        el.classList.toggle('recolhida');

      document.body.classList.toggle(
        'admin-menu-recolhido',
        recolhida
      );

      toggle.innerHTML = recolhida ? '›' : '‹';

      toggle.title = recolhida
        ? 'Expandir menu'
        : 'Recolher menu';

    };
  }


  // =============================================================
  // MENU MOBILE
  // =============================================================

  const btn =
    document.getElementById('admin-menu-btn');

  const overlay =
    document.getElementById('admin-sidebar-overlay');


  if (btn) {

    btn.onclick = function () {

      el.classList.toggle('aberta');

      if (overlay) {
        overlay.classList.toggle('ativa');
      }

    };

  }


  if (overlay) {

    overlay.onclick = function () {

      el.classList.remove('aberta');
      overlay.classList.remove('ativa');

    };

  }

}
