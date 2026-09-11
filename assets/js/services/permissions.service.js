// =============================================================
// SERVICE: PERMISSÕES — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

let cachePerfil = null;
let cachePermissoes = null;

// -------------------------------------------------------------
// Perfil do usuário atual
// -------------------------------------------------------------
export async function meuPerfil() {
  if (cachePerfil) return cachePerfil;
  const r = await supabase.auth.getUser();
  if (!r.data || !r.data.user) return null;

  const p = await supabase
    .from('profiles')
    .select('*')
    .eq('id', r.data.user.id)
    .maybeSingle();

  cachePerfil = p.data || null;
  return cachePerfil;
}

// -------------------------------------------------------------
// Lista de recursos permitidos para o usuário atual
// -------------------------------------------------------------
export async function meusRecursos() {
  if (cachePermissoes) return cachePermissoes;

  const perfil = await meuPerfil();
  if (!perfil) return [];

  const r = await supabase
    .from('permissions')
    .select('recurso')
    .eq('role', perfil.role)
    .eq('permitido', true);

  cachePermissoes = (r.data || []).map(function(x) { return x.recurso; });
  return cachePermissoes;
}

// -------------------------------------------------------------
// Verificar se o usuário pode acessar um recurso
// -------------------------------------------------------------
export async function pode(recurso) {
  const recursos = await meusRecursos();
  return recursos.indexOf(recurso) !== -1;
}

// -------------------------------------------------------------
// Verificar se é admin
// -------------------------------------------------------------
export async function souAdmin() {
  const p = await meuPerfil();
  return p && p.role === 'admin';
}

// -------------------------------------------------------------
// Listar TODAS as permissões (para o admin gerenciar)
// -------------------------------------------------------------
export async function listarTodasPermissoes() {
  const r = await supabase
    .from('permissions')
    .select('*')
    .order('role')
    .order('recurso');
  if (r.error) throw r.error;
  return r.data || [];
}

// -------------------------------------------------------------
// Admin: alterar perfil de um usuário
// -------------------------------------------------------------
export async function alterarPerfilUsuario(userId, novoRole) {
  const rolesValidos = ['admin', 'gerente', 'financeiro', 'comercial', 'estoque', 'cliente'];
  if (rolesValidos.indexOf(novoRole) === -1) throw new Error('Perfil inválido.');

  const r = await supabase
    .from('profiles')
    .update({ role: novoRole })
    .eq('id', userId);

  if (r.error) throw r.error;
}

// -------------------------------------------------------------
// Rótulo do perfil
// -------------------------------------------------------------
export function rotuloPerfil(role) {
  const map = {
    admin:      'Administrador',
    gerente:    'Gerente',
    financeiro: 'Financeiro',
    comercial:  'Comercial',
    estoque:    'Estoque',
    cliente:    'Cliente'
  };
  return map[role] || role;
}

// -------------------------------------------------------------
// Limpar cache
// -------------------------------------------------------------
export function limparCachePermissoes() {
  cachePerfil = null;
  cachePermissoes = null;
}
