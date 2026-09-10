// =============================================================
// GUARDS — VM VENDAS E COMPRAS
// =============================================================
// Funções de proteção de rota. Use no topo do <script type=module>
// de qualquer página que exija autenticação.
//
// Exemplos:
//   await requireAuth();       // exige login (redireciona p/ login)
//   await requireAdmin();      // exige admin
//   await requireGuest();      // exige NÃO estar logado (p/ login)
// =============================================================

import { supabase } from '../supabase.js';
import { perfilAtual } from '../services/auth.service.js';

// Caminho base: como o site roda em GitHub Pages em /VM-VENDAS-COMPRAS/,
// usamos caminhos relativos a partir da raiz. As páginas estão na raiz,
// então "./login.html" funciona de qualquer página da raiz. Já páginas
// dentro de /admin/ usam "../login.html".

function basePrefix() {
  // Detecta se estamos em /admin/ para voltar uma pasta
  return window.location.pathname.includes('/admin/') ? '../' : './';
}

// -------------------------------------------------------------
// EXIGE USUÁRIO LOGADO
// -------------------------------------------------------------
export async function requireAuth({ redirecionarPara = null } = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const destino = redirecionarPara
      || `${basePrefix()}login.html?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    window.location.replace(destino);
    // Devolve uma Promise pendente para interromper o fluxo do módulo
    return new Promise(() => {});
  }
  return session;
}

// -------------------------------------------------------------
// EXIGE ADMIN
// -------------------------------------------------------------
export async function requireAdmin() {
  await requireAuth();
  const perfil = await perfilAtual();

  if (!perfil || perfil.role !== 'admin') {
    alert('Acesso restrito a administradores.');
    window.location.replace(`${basePrefix()}index.html`);
    return new Promise(() => {});
  }
  return perfil;
}

// -------------------------------------------------------------
// EXIGE NÃO ESTAR LOGADO (para login/cadastro)
// -------------------------------------------------------------
export async function requireGuest({ redirecionarPara = null } = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    const destino = redirecionarPara || `${basePrefix()}index.html`;
    window.location.replace(destino);
    return new Promise(() => {});
  }
  return true;
}

// -------------------------------------------------------------
// REDIRECIONA APÓS LOGIN
// -------------------------------------------------------------
// Verifica se há ?redirect=... e redireciona para lá.
// Se não houver, vai para a home.
export function redirecionarPosLogin() {
  const params = new URLSearchParams(window.location.search);
  const r = params.get('redirect');

  if (r) {
    // Segurança: só permite caminhos relativos internos
    const limpo = r.replace(/^\/+/, '');
    if (!limpo.includes('://') && !limpo.startsWith('//')) {
      window.location.replace('./' + limpo);
      return;
    }
  }
  window.location.replace('./index.html');
}