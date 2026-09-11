// =============================================================
// SERVICE: AUTENTICAÇÃO — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// CADASTRO
// -------------------------------------------------------------
export async function cadastrar({ nome, email, telefone, whatsapp, senha }) {
  // Validações locais (antes de mandar pro Supabase)
  if (!nome || nome.trim().length < 3) {
    throw new Error('Informe seu nome completo (mínimo 3 caracteres).');
  }
  if (!email || !validarEmail(email)) {
    throw new Error('E-mail inválido.');
  }
  if (!senha || senha.length < 8) {
    throw new Error('A senha deve ter pelo menos 8 caracteres.');
  }
  if (!/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha)) {
    throw new Error('A senha deve conter letras e números.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: senha,
    options: {
      data: {
        nome: nome.trim(),
        telefone: telefone ? telefone.trim() : '',
        whatsapp: whatsapp ? whatsapp.trim() : ''
      }
    }
  });

  if (error) throw traduzirErro(error);
  return data;
}

// -------------------------------------------------------------
// LOGIN
// -------------------------------------------------------------
export async function entrar({ email, senha }) {
  if (!email || !senha) throw new Error('Preencha e-mail e senha.');

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
// SESSÃO
// -------------------------------------------------------------
export async function sessaoAtual() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function usuarioAtual() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function perfilAtual() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) return null;
  return data;
}

// -------------------------------------------------------------
// ATUALIZAR PERFIL
// -------------------------------------------------------------
export async function atualizarPerfil(dados) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado.');

  const { error } = await supabase
    .from('profiles')
    .update({
      nome: dados.nome ? dados.nome.trim() : null,
      telefone: dados.telefone ? dados.telefone.trim() : null,
      whatsapp: dados.whatsapp ? dados.whatsapp.trim() : null
    })
    .eq('id', user.id);

  if (error) throw error;
}

// -------------------------------------------------------------
// RECUPERAÇÃO DE SENHA
// -------------------------------------------------------------
export async function enviarEmailRecuperacao(email) {
  if (!email || !validarEmail(email)) throw new Error('E-mail inválido.');

  const redirectTo = window.location.origin + window.location.pathname.replace('recuperar-senha.html', 'perfil.html');

  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo }
  );

  if (error) throw traduzirErro(error);
}

// -------------------------------------------------------------
// ALTERAR SENHA (logado)
// -------------------------------------------------------------
export async function alterarSenha(novaSenha) {
  if (!novaSenha || novaSenha.length < 8) throw new Error('A nova senha deve ter pelo menos 8 caracteres.');
  if (!/[A-Za-z]/.test(novaSenha) || !/[0-9]/.test(novaSenha)) throw new Error('A nova senha deve conter letras e números.');

  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw traduzirErro(error);
}

// -------------------------------------------------------------
// É ADMIN?
// -------------------------------------------------------------
export async function ehAdmin() {
  const perfil = await perfilAtual();
  return perfil && perfil.role === 'admin';
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------
function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function traduzirErro(err) {
  const msg = (err && err.message ? err.message : '').toLowerCase();

  if (msg.includes('invalid login credentials')) return new Error('E-mail ou senha incorretos.');
  if (msg.includes('email not confirmed')) return new Error('Confirme seu e-mail antes de entrar.');
  if (msg.includes('user already registered')) return new Error('Este e-mail já está cadastrado. Faça login.');
  if (msg.includes('password should be at least')) return new Error('A senha deve ter pelo menos 8 caracteres.');
  if (msg.includes('unable to validate email')) return new Error('E-mail inválido.');
  if (msg.includes('rate limit')) return new Error('Muitas tentativas. Aguarde alguns minutos.');
  if (msg.includes('network')) return new Error('Falha de conexão. Verifique sua internet.');
  if (msg.includes('signup is disabled')) return new Error('Cadastros estão desativados no momento.');

  return err;
}
