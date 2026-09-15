// =============================================================
// ADMIN GUARD — VM VENDAS E COMPRAS
// =============================================================
// Bloqueia acesso de não-admins a QUALQUER página /admin/.
// Redireciona direto pra home sem mostrar nada.
//
// Uso:
//   import { exigirAdmin } from '../assets/js/core/admin-guard.js';
//   await exigirAdmin();
//
// Comportamento:
//   - Sem sessão → redireciona pra login
//   - Com sessão mas sem role admin → redireciona pra home
//   - Com sessão e role admin → continua normalmente
// =============================================================

export async function exigirAdmin() {
  // 1. Carrega Supabase
  const { supabase } = await import('../supabase.js');

  // 2. Verifica sessão
  const sessao = await supabase.auth.getSession();

  if (!sessao.data || !sessao.data.session) {
    // Sem login → manda pro login
    const destino = '../login.html?redirect=' +
      encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = destino;
    throw new Error('NAO_AUTENTICADO');
  }

  // 3. Verifica role
  const perfil = await supabase
    .from('profiles')
    .select('role, nome, email')
    .eq('id', sessao.data.session.user.id)
    .maybeSingle();

  const role = perfil.data ? perfil.data.role : null;

  if (role !== 'admin') {
    // Não é admin → redireciona direto pra home
    window.location.href = '../index.html';
    throw new Error('NAO_E_ADMIN');
  }

  // É admin ✅
  return perfil.data;
}
