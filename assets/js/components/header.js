// =============================================================
// COMPONENTE: HEADER — VM VENDAS E COMPRAS
// =============================================================
// Gera o cabeçalho padrão em todas as páginas. Deve ser chamado
// no início do <body> de cada HTML.
//
// Uso:
//   import { renderHeader } from './assets/js/components/header.js';
//   renderHeader('inicio');   // marca qual item do menu fica ativo
// =============================================================

import { supabase } from '../supabase.js';

// Recebe o "ativo" para destacar o item certo do menu
// (ex.: 'inicio', 'produtos', 'favoritos', 'carrinho', 'conta').
export async function renderHeader(ativo = '') {
  const el = document.getElementById('header');
  if (!el) {
    console.warn('[header.js] Elemento #header não encontrado na página.');
    return;
  }

  // Contadores dinâmicos (carrinho e favoritos)
  const { count: qtdCarrinho } = await contarCarrinho();
  const { count: qtdFavoritos } = await contarFavoritos();
  const { count: qtdNotif } = await contarNotificacoes();

  el.innerHTML = `
    <header class="cabecalho">
      <div class="container cabecalho__interno">

        <a href="./index.html" class="cabecalho__logo">
          <span id="header-logo-nome">Minha Loja</span>
        </a>

        <form class="cabecalho__busca" role="search" id="form-busca">
          <svg class="cabecalho__busca-icone" width="18" height="18" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="search" name="q" placeholder="O que você procura?" aria-label="Buscar produtos">
        </form>

        <nav class="cabecalho__acoes" aria-label="Ações do usuário">

          <a href="./favoritos.html" class="cabecalho__acao ${ativo === 'favoritos' ? 'ativo' : ''}"
             title="Favoritos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span class="cabecalho__acao-texto">Favoritos</span>
            ${qtdFavoritos > 0 ? `<span class="cabecalho__badge">${qtdFavoritos}</span>` : ''}
          </a>

          <a href="./carrinho.html" class="cabecalho__acao ${ativo === 'carrinho' ? 'ativo' : ''}"
             title="Carrinho">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <span class="cabecalho__acao-texto">Carrinho</span>
            ${qtdCarrinho > 0 ? `<span class="cabecalho__badge">${qtdCarrinho}</span>` : ''}
          </a>

          <a href="./chat.html" class="cabecalho__acao ${ativo === 'chat' ? 'ativo' : ''}"
             title="Mensagens">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span class="cabecalho__acao-texto">Chat</span>
            ${qtdNotif > 0 ? `<span class="cabecalho__badge">${qtdNotif}</span>` : ''}
          </a>

          <a href="#" id="header-conta" class="cabecalho__acao ${ativo === 'conta' ? 'ativo' : ''}"
             title="Minha conta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span class="cabecalho__acao-texto" id="header-conta-texto">Entrar</span>
          </a>

          <button type="button" class="cabecalho__menu-btn" aria-label="Abrir menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </nav>
      </div>
    </header>
  `;

  // Busca: ao enviar, redireciona para a página de produtos
  const formBusca = document.getElementById('form-busca');
  if (formBusca) {
    formBusca.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = formBusca.querySelector('input[name="q"]').value.trim();
      window.location.href = `./produtos.html${q ? `?q=${encodeURIComponent(q)}` : ''}`;
    });
  }

  // Conta: se logado, vai para perfil; se não, vai para login
  const { data: { user } } = await supabase.auth.getUser();
  const contaLink = document.getElementById('header-conta');
  const contaTexto = document.getElementById('header-conta-texto');

  if (user) {
    contaLink.href = './perfil.html';
    contaTexto.textContent = 'Minha conta';
  } else {
    contaLink.href = './login.html';
    contaTexto.textContent = 'Entrar';
  }

  // Aplica dados da empresa (nome) se disponíveis
  try {
    const { data: empresa } = await supabase
      .from('company_settings')
      .select('nome_fantasia, nome_empresa')
      .eq('id', 1)
      .maybeSingle();

    const nome = empresa?.nome_fantasia || empresa?.nome_empresa;
    if (nome) {
      document.getElementById('header-logo-nome').textContent = nome;
      document.title = document.title.replace('Minha Loja', nome);
    }
  } catch (_) { /* silencioso */ }
}

// -------------------------------------------------------------
// Contadores auxiliares (lê do localStorage por enquanto — depois
// virá do banco para usuários logados)
// -------------------------------------------------------------
async function contarCarrinho() {
  try {
    const itens = JSON.parse(localStorage.getItem('carrinho') || '[]');
    return { count: itens.reduce((s, i) => s + (i.quantidade || 0), 0) };
  } catch { return { count: 0 }; }
}

async function contarFavoritos() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { count: 0 };

    const { count } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return { count: count || 0 };
  } catch { return { count: 0 }; }
}

async function contarNotificacoes() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { count: 0 };

    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('lida', false);

    return { count: count || 0 };
  } catch { return { count: 0 }; }
}