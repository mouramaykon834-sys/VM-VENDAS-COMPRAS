// =============================================================
// GUARDS — VM VENDAS E COMPRAS
// =============================================================
// Proteção de rota com feedback visual claro. Nunca deixa a
// página em branco: se não autorizado, mostra uma tela de aviso.
// =============================================================

import { supabase } from '../supabase.js';

function basePrefix() {
  return window.location.pathname.includes('/admin/') ? '../' : './';
}

// -------------------------------------------------------------
// Tela de bloqueio (usuário não autorizado)
// -------------------------------------------------------------
function mostrarBloqueio(titulo, mensagem, botoes = []) {
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
        color: #dc2626; font-size: 28px; font-weight: 700;
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
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const destino = `${basePrefix()}login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = destino;
    throw new Error('NAO_AUTENTICADO'); // interrompe o fluxo do módulo
  }

  return session;
}

// -------------------------------------------------------------
// EXIGE ADMIN
// -------------------------------------------------------------
export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();

  // Sem login → manda para login e PARA
  if (!session) {
    const destino = `${basePrefix()}login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.href = destino;
    throw new Error('NAO_AUTENTICADO');
  }

  // Busca o perfil
  const { data: perfil, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error || !perfil) {
    mostrarBloqueio(
      'Perfil não encontrado',
      'Sua conta existe, mas o perfil não foi criado no banco. Contate o administrador.',
      [{ rotulo: 'Voltar para a loja', href: `${basePrefix()}index.html`, principal: true }]
    );
    throw new Error('PERFIL_INEXISTENTE');
  }

  // Não é admin
  if (perfil.role !== 'admin') {
    mostrarBloqueio(
      'Acesso restrito',
      'Esta área é exclusiva para administradores da loja.',
      [
        { rotulo: 'Voltar para a loja', href: `${basePrefix()}index.html`, principal: true },
        { rotulo: 'Sair e entrar como admin', href: `${basePrefix()}login.html`, principal: false }
      ]
    );
    throw new Error('NAO_E_ADMIN');
  }

  // É admin ✅
  return perfil;
}

// -------------------------------------------------------------
// EXIGE NÃO ESTAR LOGADO (login / cadastro)
// -------------------------------------------------------------
export async function requireGuest() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.location.href = `${basePrefix()}index.html`;
    throw new Error('JA_AUTENTICADO');
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
      window.location.href = './' + limpo;
      return;
    }
  }
  window.location.href = './index.html';
}