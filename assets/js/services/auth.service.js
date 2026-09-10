// =============================================================
// SERVICE: AUTENTICAÇÃO — VM VENDAS E COMPRAS
// =============================================================
// Encapsula cadastro, login, logout, recuperação de senha e
// consulta de sessão. Todas as páginas usam daqui.
// =============================================================

import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// CADASTRO
// -------------------------------------------------------------
export async function cadastrar({ nome, email, telefone, whatsapp, senha }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: senha,
    options: {
      data: {
        nome: nome?.trim() || '',
        telefone: telefone?.trim() || '',
        whatsapp: whatsapp?.trim() || ''
      }
    }
  });

  if (error) throw traduzirErro(error);

  return data; // { user, session }
}

// -------------------------------------------------------------
// LOGIN
// -------------------------------------------------------------
export async function entrar({ email, senha }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha
  });

  if (error) throw traduzirErro(error);
  return data;
}

// -------------------------------------------------------------
// LOGOUT
// -------------------------------------------------------------
export async function sair() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// -------------------------------------------------------------
// SESSÃO ATUAL
// -------------------------------------------------------------
export async function sessaoAtual() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function usuarioAtual() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// -------------------------------------------------------------
// PERFIL PÚBLICO (tabela profiles)
// -------------------------------------------------------------
export async function perfilAtual() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[auth.service] Erro ao buscar perfil:', error);
    return null;
  }
  return data;
}

// -------------------------------------------------------------
// ATUALIZAR PERFIL
// -------------------------------------------------------------
export async function atualizarPerfil(dados) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      nome: dados.nome?.trim() || null,
      telefone: dados.telefone?.trim() || null,
      whatsapp: dados.whatsapp?.trim() || null
    })
    .eq('id', user.id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

// -------------------------------------------------------------
// RECUPERAÇÃO DE SENHA
// -------------------------------------------------------------
export async function enviarEmailRecuperacao(email) {
  const redirectTo = `${window.location.origin}${basePath()}perfil.html`;

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo }
  );

  if (error) throw traduzirErro(error);
}

// -------------------------------------------------------------
// ALTERAR SENHA (usuário logado)
// -------------------------------------------------------------
export async function alterarSenha(novaSenha) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw traduzirErro(error);
}

// -------------------------------------------------------------
// É ADMIN?
// -------------------------------------------------------------
export async function ehAdmin() {
  const perfil = await perfilAtual();
  return perfil?.role === 'admin';
}

// -------------------------------------------------------------
// TRADUÇÃO DE ERROS
// -------------------------------------------------------------
function traduzirErro(err) {
  const msg = (err?.message || '').toLowerCase();

  if (msg.includes('invalid login credentials')) {
    return new Error('E-mail ou senha incorretos.');
  }
  if (msg.includes('email not confirmed')) {
    return new Error('Você precisa confirmar seu e-mail antes de entrar. Verifique sua caixa de entrada.');
  }
  if (msg.includes('user already registered')) {
    return new Error('Este e-mail já está cadastrado. Faça login ou recupere sua senha.');
  }
  if (msg.includes('password should be at least')) {
    return new Error('A senha deve ter pelo menos 6 caracteres.');
  }
  if (msg.includes('unable to validate email')) {
    return new Error('E-mail inválido.');
  }
  if (msg.includes('rate limit')) {
    return new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
  }
  if (msg.includes('network')) {
    return new Error('Falha de conexão. Verifique sua internet.');
  }

  return err;
}

// -------------------------------------------------------------
// BASE PATH (GitHub Pages)
// -------------------------------------------------------------
function basePath() {
  // GitHub Pages serve em /nome-do-repo/, então os links relativos
  // funcionam. Esta função devolve string vazia para permitir
  // caminhos relativos puros.
  return '';
}