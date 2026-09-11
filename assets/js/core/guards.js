// =============================================================
// GUARDS — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';

function basePrefix() {
  return window.location.pathname.includes('/admin/') ? '../' : './';
}

function mostrarBloqueio(titulo, mensagem, botoes) {
  botoes = botoes || [];
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f8fafc;display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,sans-serif;';

  const btnsHTML = botoes.map(function(b) {
    const bg = b.principal ? '#0ea5e9' : 'transparent';
    const cor = b.principal ? '#fff' : '#0ea5e9';
    const borda = b.principal ? 'transparent' : '#0ea5e9';
    return '<a href="' + b.href + '" style="display:inline-block;padding:12px 20px;background:' + bg + ';color:' + cor + ';border:1px solid ' + borda + ';border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;margin:4px;">' + b.rotulo + '</a>';
  }).join('');

  el.innerHTML =
    '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:40px 32px;max-width:440px;width:100%;text-align:center;box-shadow:0 10px 30px rgba(15,23,42,0.08);">' +
      '<div style="width:56px;height:56px;margin:0 auto 20px;border-radius:16px;background:#fee2e2;display:flex;align-items:center;justify-content:center;color:#dc2626;font-size:28px;font-weight:700;">!</div>' +
      '<h2 style="font-size:20px;margin:0 0 8px;color:#0f172a;">' + titulo + '</h2>' +
      '<p style="color:#64748b;font-size:14px;margin:0 0 24px;line-height:1.5;">' + mensagem + '</p>' +
      '<div>' + btnsHTML + '</div>' +
    '</div>';
  document.body.appendChild(el);
}

// -------------------------------------------------------------
// EXIGE LOGIN
// -------------------------------------------------------------
export async function requireAuth() {
  const r = await supabase.auth.getSession();
  if (!r.data || !r.data.session) {
    const destino = basePrefix() + 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = destino;
    throw new Error('NAO_AUTENTICADO');
  }
  return r.data.session;
}

// -------------------------------------------------------------
// EXIGE ADMIN
// -------------------------------------------------------------
export async function requireAdmin() {
  const r = await supabase.auth.getSession();
  if (!r.data || !r.data.session) {
    const destino = basePrefix() + 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = destino;
    throw new Error('NAO_AUTENTICADO');
  }

  const p = await supabase.from('profiles').select('role').eq('id', r.data.session.user.id).maybeSingle();

  if (!p.data) {
    mostrarBloqueio('Perfil não encontrado', 'Sua conta existe mas o perfil não foi criado.',
      [{ rotulo: 'Voltar para a loja', href: basePrefix() + 'index.html', principal: true }]);
    throw new Error('PERFIL_INEXISTENTE');
  }

  if (p.data.role !== 'admin') {
    mostrarBloqueio('Acesso restrito', 'Esta área é exclusiva para administradores.',
      [{ rotulo: 'Voltar para a loja', href: basePrefix() + 'index.html', principal: true }]);
    throw new Error('NAO_E_ADMIN');
  }

  return p.data;
}

// -------------------------------------------------------------
// EXIGE PERMISSÃO A UM RECURSO
// -------------------------------------------------------------
export async function requireRecurso(recurso) {
  const r = await supabase.auth.getSession();
  if (!r.data || !r.data.session) {
    const destino = basePrefix() + 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = destino;
    throw new Error('NAO_AUTENTICADO');
  }

  const p = await supabase.from('profiles').select('role').eq('id', r.data.session.user.id).maybeSingle();
  if (!p.data) {
    mostrarBloqueio('Perfil não encontrado', 'Sua conta existe mas o perfil não foi criado.',
      [{ rotulo: 'Voltar para a loja', href: basePrefix() + 'index.html', principal: true }]);
    throw new Error('PERFIL_INEXISTENTE');
  }

  const perm = await supabase
    .from('permissions')
    .select('permitido')
    .eq('role', p.data.role)
    .eq('recurso', recurso)
    .maybeSingle();

  if (!perm.data || !perm.data.permitido) {
    mostrarBloqueio('Sem permissão', 'Seu perfil (' + p.data.role + ') não tem acesso a esta área.',
      [{ rotulo: 'Voltar ao início', href: basePrefix() + 'admin/index.html', principal: true }]);
    throw new Error('SEM_PERMISSAO');
  }

  return p.data;
}

// -------------------------------------------------------------
// EXIGE NÃO ESTAR LOGADO (login / cadastro)
// -------------------------------------------------------------
export async function requireGuest() {
  const r = await supabase.auth.getSession();
  if (r.data && r.data.session) {
    window.location.href = basePrefix() + 'index.html';
    throw new Error('JA_AUTENTICADO');
  }
  return true;
}

// -------------------------------------------------------------
// REDIRECIONAR APÓS LOGIN
// =============================================================
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
