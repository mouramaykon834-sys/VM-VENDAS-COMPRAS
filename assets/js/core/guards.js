// =============================================================
// GUARDS — VM VENDAS E COMPRAS
// =============================================================
// Funções de proteção de rota com feedback visual claro.
// =============================================================

import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// Prefixo base (para páginas dentro de /admin/)
// -------------------------------------------------------------
function basePrefix() {
  return window.location.pathname.includes('/admin/') ? '../' : './';
}

// -------------------------------------------------------------
// Overlay de "verificando acesso"
// -------------------------------------------------------------
function mostrarOverlay(mensagem = 'Verificando acesso...') {
  // Remove se já existir
  document.getElementById('guard-overlay')?.remove();

  const el = document.createElement('div');
  el.id = 'guard-overlay';
  el.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: #f8fafc;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 16px; font-family: system-ui, sans-serif;
    color: #0f172a;
  `;
  el.innerHTML = `
    <div style="width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #0ea5e9; border-radius: 50%; animation: spin 0.7s linear infinite;"></div>
    <div style="font-size: 14px; color: #64748b;">${mensagem}</div>
    <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
  `;
  document.body.appendChild(el);
  return el;
}

function esconderOverlay() {
  document.getElementById('guard-overlay')?.remove();
}

// -------------------------------------------------------------
// Tela de bloqueio (usuário não autorizado)
// -------------------------------------------------------------
function mostrarBloqueio(titulo, mensagem, botoes = []) {
  esconderOverlay();

  const el = document.createElement('div');
  el.id = 'guard-bloqueio';
  el.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: #f8fafc;
    display: flex; align-items: center; justify-content: center;
    padding: 24px; font-family: system-ui, sans-serif;
  `;

  const btnsHTML = botoes.map(b => `
    <a href="${b.href}" style="
      display: inline-block;
      padding: 12px 20px;
      background: ${b.principal ? '#0ea5e9' : 'transparent'};
      color: ${b.principal ? '#fff' : '#0ea5e9'};
      border: 1px solid ${b.principal ? 'transparent' : '#0ea5e9'};
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      margin: 4px;
    ">${b.rotulo}</a>
  `).join('');

  el.innerHTML = `
    <div style="
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 30px rgba(15,23,42,0.08);
    ">
      <div style="
        width: 56px; height: 56px; margin: 0 auto 20px;
        border-radius: 16px; background: #fee2e2;
        display: flex; align-items: center; justify-content: center;
        color: #dc2626; font-size: 28px;
      ">!</div>
      <h2 style="font-size: 20px; margin: 0 0 8px; color: #0f172a;">${titulo}</h2>
      <p style="color: #64748b; font-size: 14px; margin: 0 0 24px; line-height: 1.5;">${mensagem}</p>
      <div>${btnsHTML}</div>
    </div>
  `;
  document.body.appendChild(el);
}

// -------------------------------------------------------------
// EXIGE USUÁRIO LOGADO
// -------------------------------------------------------------
export async function requireAuth({ redirecionarPara = null } = {}) {
  const overlay = mostrarOverlay('Verificando acesso...');

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      esconderOverlay();
      const destino = redirecionarPara
        || `${basePrefix()}login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      window.location.replace(destino);
      // Trava a execução do módulo
      await new Promise(() => {});
    }

    return session;
  } catch (e) {
    esconderOverlay();
    mostrarBloqueio(
      'Erro ao verificar acesso',
      'Não foi possível verificar sua sessão. Verifique sua internet e tente novamente.',
      [
        { rotulo: 'Ir para login', href: `${basePrefix()}login.html`, principal: true },
        { rotulo: 'Ir para a loja', href: `${basePrefix()}index.html`, principal: false }
      ]
    );
    await new Promise(() => {});
  }
}

// -------------------------------------------------------------
// EXIGE ADMIN
// -------------------------------------------------------------
export async function requireAdmin() {
  const overlay = mostrarOverlay('Verificando permissões...');

  try {
    const { data: { session } } = await supabase.auth.getSession();

    // Sem login
    if (!session) {
      esconderOverlay();
      const destino = `${basePrefix()}login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      window.location.replace(destino);
      await new Promise(() => {});
    }

    // Busca o perfil
    const { data: perfil, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error || !perfil) {
      esconderOverlay();
      mostrarBloqueio(
        'Perfil não encontrado',
        'Sua conta existe, mas o perfil não foi criado. Entre em contato com o administrador.',
        [
          { rotulo: 'Ir para a loja', href: `${basePrefix()}index.html`, principal: true }
        ]
      );
      await new Promise(() => {});
    }

    // Não é admin
    if (perfil.role !== 'admin') {
      esconderOverlay();
      mostrarBloqueio(
        'Acesso restrito',
        'Esta área é exclusiva para administradores da loja.',
        [
          { rotulo: 'Ir para a loja', href: `${basePrefix()}index.html`, principal: true },
          { rotulo: 'Sair da conta', href: `${basePrefix()}login.html`, principal: false }
        ]
      );
      await new Promise(() => {});
    }

    // É admin
    esconderOverlay();
    return perfil;

  } catch (e) {
    console.error('[guards] Erro:', e);
    esconderOverlay();
    mostrarBloqueio(
      'Erro inesperado',
      e?.message || 'Ocorreu um erro ao verificar suas permissões.',
      [
        { rotulo: 'Ir para a loja', href: `${basePrefix()}index.html`, principal: true }
      ]
    );
    await new Promise(() => {});
  }
}

// -------------------------------------------------------------
// EXIGE NÃO ESTAR LOGADO (login / cadastro)
// -------------------------------------------------------------
export async function requireGuest({ redirecionarPara = null } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const destino = redirecionarPara || `${basePrefix()}index.html`;
    window.location.replace(destino);
    await new Promise(() => {});
  }
  return true;
}

// -------------------------------------------------------------
// REDIRECIONA APÓS LOGIN
// -------------------------------------------------------------
export function redirecionarPosLogin() {
  const params = new URLSearchParams(window.location.search);
  const r = params.get('redirect');

  if (r) {
    const limpo = r.replace(/^\/+/, '');
    if (!limpo.includes('://') && !limpo.startsWith('//')) {
      window.location.replace('./' + limpo);
      return;
    }
  }
  window.location.replace('./index.html');
}
