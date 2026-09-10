// =============================================================
// COMPONENTE: HEADER — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';
import { carregarConfiguracoes } from '../services/settings.service.js';

export async function renderHeader(ativo = '') {
  const el = document.getElementById('header');
  if (!el) return;

  const cfg = await carregarConfiguracoes();
  const visual = cfg.visual || {};
  const company = cfg.company || {};
  const nomeLoja = company.nome_fantasia || company.nome_empresa || 'Minha Loja';

  // Contadores com timeout curto — não travam a página
  const [carrinho, favoritos, notif] = await Promise.all([
    comTimeout(contarCarrinho(), 2000).catch(() => 0),
    comTimeout(contarFavoritos(), 2000).catch(() => 0),
    comTimeout(contarNotificacoes(), 2000).catch(() => 0)
  ]);

  const logoHTML = visual.logo_url
    ? `<img src="${visual.logo_url}" alt="${escapar(nomeLoja)}"
            style="height:40px;width:auto;max-width:180px;object-fit:contain;display:block;"
            loading="eager" onerror="this.style.display='none'" />`
    : `<span id="header-logo-nome" style="font-weight:700;font-size:18px;">${escapar(nomeLoja)}</span>`;

  el.innerHTML = `
    <header class="cabecalho">
      <div class="container cabecalho__interno">
        <a href="./index.html" class="cabecalho__logo" aria-label="${escapar(nomeLoja)}">${logoHTML}</a>

        <form class="cabecalho__busca" role="search" id="form-busca">
          <svg class="cabecalho__busca-icone" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="search" name="q" placeholder="O que você procura?" aria-label="Buscar produtos">
        </form>

        <nav class="cabecalho__acoes" aria-label="Ações do usuário">
          <a href="./favoritos.html" class="cabecalho__acao" title="Favoritos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span class="cabecalho__acao-texto">Favoritos</span>
            ${favoritos > 0 ? `<span class="cabecalho__badge">${favoritos}</span>` : ''}
          </a>
          <a href="./carrinho.html" class="cabecalho__acao" title="Carrinho">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
            <span class="cabecalho__acao-texto">Carrinho</span>
            ${carrinho > 0 ? `<span class="cabecalho__badge">${carrinho}</span>` : ''}
          </a>
          <a href="./chat.html" class="cabecalho__acao" title="Mensagens">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <span class="cabecalho__acao-texto">Chat</span>
          </a>
          <a href="./notificacoes.html" class="cabecalho__acao" title="Notificações">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span class="cabecalho__acao-texto">Notif.</span>
            ${notif > 0 ? `<span class="cabecalho__badge">${notif}</span>` : ''}
          </a>
          <a href="#" id="header-conta" class="cabecalho__acao" title="Minha conta">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span class="cabecalho__acao-texto" id="header-conta-texto">Entrar</span>
          </a>
        </nav>
      </div>
    </header>
  `;

  const formBusca = document.getElementById('form-busca');
  if (formBusca) {
    formBusca.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = formBusca.querySelector('input[name="q"]').value.trim();
      window.location.href = `./produtos.html${q ? `?q=${encodeURIComponent(q)}` : ''}`;
    });
  }

  try {
    const { data: { user } } = await comTimeout(supabase.auth.getUser(), 2500);
    const contaLink = document.getElementById('header-conta');
    const contaTexto = document.getElementById('header-conta-texto');
    if (user) { contaLink.href = './perfil.html'; contaTexto.textContent = 'Minha conta'; }
    else { contaLink.href = './login.html'; contaTexto.textContent = 'Entrar'; }
  } catch (_) { /* silencioso */ }
}

function comTimeout(p, ms = 3000) {
  return Promise.race([
    p,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

async function contarCarrinho() {
  try {
    const itens = JSON.parse(localStorage.getItem('carrinho') || '[]');
    return itens.reduce((s, i) => s + (i.quantidade || 0), 0);
  } catch { return 0; }
}

async function contarFavoritos() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { count } = await supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    return count || 0;
  } catch { return 0; }
}

async function contarNotificacoes() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('lida', false);
    return count || 0;
  } catch { return 0; }
}

function escapar(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}