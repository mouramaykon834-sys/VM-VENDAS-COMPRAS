// =============================================================
// SERVICE: AUTENTICAÇÃO — VM VENDAS E COMPRAS
// =============================================================

import { supabase } from '../supabase.js';
import { verificarLimite, registrarTentativa } from './rate-limit.service.js';

// -------------------------------------------------------------
// Lista de senhas proibidas
// -------------------------------------------------------------
const SENHAS_PROIBIDAS = [
  '123456','password','12345678','qwerty','123456789','12345','1234','111111','1234567',
  'dragon','123123','baseball','abc123','football','monkey','letmein','696969','shadow',
  'master','666666','qwertyuiop','123321','mustang','1234567890','michael','654321',
  'superman','1qaz2wsx','7777777','fuckyou','121212','000000','qazwsx','123qwe',
  'killer','trustno1','jordan','jennifer','zxcvbnm','asdfgh','hunter','buster','soccer',
  'harley','batman','andrew','tigger','sunshine','iloveyou','fuckme','2000','charlie',
  'robert','thomas','hockey','ranger','daniel','starwars','klaster','112233','george',
  'asshole','computer','michelle','jessica','pepper','1111','zxcvbn','555555','11111111',
  '131313','freedom','777777','pass','fuck','maggie','159753','aaaaaa','ginger','princess',
  'joshua','cheese','amanda','summer','love','ashley','nicole','chelsea','biteme','matthew',
  'access','yankees','987654321','dallas','austin','thunder','taylor','matrix','william',
  'corvette','hello','martin','heather','secret','fucker','merlin','diamond','1234qwer',
  'gfhjkm','hammer','silver','222222','88888888','anthony','justin','test','bailey',
  'patrick','internet','scooter','orange','11111','golfer','cookie','richard',
  'samantha','bigdog','guitar','jackson','whatever','mickey','chicken','sparky','snoopy',
  'maverick','phoenix','camaro','sexy','peanut','morgan','welcome','falcon','cowboy',
  'ferrari','samsung','andrea','smokey','steelers','joseph','mercedes','dakota','arsenal',
  'eagles','melissa','boomer','booboo','spider','nascar','monster','tigers','yellow',
  'xxxxxx','123123123','gateway','marina','diablo','bulldog','qwer1234','compaq','purple',
  'hardcore','banana','junior','hannah','123654','porsche','lakers','iceman','money',
  'cowboys','987654','london','tennis','999999','ncc1701','coffee','scooby','0000',
  'miller','boston','q1w2e3r4','fuckoff','brandon','yamaha','chester','mother','forever',
  'johnny','edward','333333','oliver','redsox','player','nikita','knight','fender',
  'barney','midnight','please','brandy','chicago','badboy','iwantu','slayer','rangers',
  'charles','angel','flower','bigdaddy','rabbit','wizard','bigdick','jasper','enter',
  'rachel','chris','steven','winner','adidas','victoria','natasha','1q2w3e4r','jasmine',
  'winter','prince','panties','marine','ghbdtn','fishing','cocacola','casper','james',
  '232323','raiders','888888','marlboro','gandalf','asdfasdf','crystal','87654321'
];

function ehSenhaComum(senha) {
  const s = senha.toLowerCase().trim();
  if (SENHAS_PROIBIDAS.indexOf(s) !== -1) return true;
  if (/^(.)\1+$/.test(s)) return true;
  if (/^(012|123|234|345|456|567|678|789|890)+/.test(s)) return true;
  if (/^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl)/.test(s)) return true;
  if (/^(qwerty|asdfgh|zxcvbn)/.test(s)) return true;
  return false;
}

// -------------------------------------------------------------
// CADASTRO
// -------------------------------------------------------------
export async function cadastrar({ nome, email, telefone, whatsapp, senha }) {
  // Validações
  if (!nome || nome.trim().length < 3) throw new Error('Informe seu nome completo (mínimo 3 caracteres).');
  if (!email || !validarEmail(email)) throw new Error('E-mail inválido.');
  if (!senha || senha.length < 8) throw new Error('A senha deve ter pelo menos 8 caracteres.');
  if (!/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha)) throw new Error('A senha deve conter letras e números.');
  if (ehSenhaComum(senha)) throw new Error('Esta senha é muito comum. Escolha uma diferente.');

  // 🔐 Rate limiting
  const rl = await verificarLimite('cadastro', email.toLowerCase());
  if (!rl.permitido) {
    const min = Math.ceil(rl.esperar_segundos / 60);
    throw new Error(`Muitas tentativas de cadastro. Aguarde ${min} minuto${min > 1 ? 's' : ''}.`);
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

  // Registra tentativa (sucesso ou falha)
  await registrarTentativa('cadastro', email.toLowerCase(), !error);

  if (error) throw traduzirErro(error);
  return data;
}

// -------------------------------------------------------------
// LOGIN
// -------------------------------------------------------------
export async function entrar({ email, senha }) {
  if (!email || !senha) throw new Error('Preencha e-mail e senha.');

  // 🔐 Rate limiting (verifica por e-mail)
  const rl = await verificarLimite('login', email.toLowerCase());
  if (!rl.permitido) {
    const min = Math.ceil(rl.esperar_segundos / 60);
    throw new Error(`Muitas tentativas de login. Aguarde ${min} minuto${min > 1 ? 's' : ''}.`);
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha
  });

  await registrarTentativa('login', email.toLowerCase(), !error);

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
    .from('profiles').select('*').eq('id', user.id).maybeSingle();
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

  // 🔐 Rate limiting
  const rl = await verificarLimite('recuperar', email.toLowerCase());
  if (!rl.permitido) {
    const min = Math.ceil(rl.esperar_segundos / 60);
    throw new Error(`Muitas solicitações. Aguarde ${min} minuto${min > 1 ? 's' : ''}.`);
  }

  const redirectTo = window.location.origin + window.location.pathname.replace('recuperar-senha.html', 'perfil.html');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });

  await registrarTentativa('recuperar', email.toLowerCase(), !error);

  if (error) throw traduzirErro(error);
}

// -------------------------------------------------------------
// ALTERAR SENHA
// -------------------------------------------------------------
export async function alterarSenha(novaSenha) {
  if (!novaSenha || novaSenha.length < 8) throw new Error('A nova senha deve ter pelo menos 8 caracteres.');
  if (!/[A-Za-z]/.test(novaSenha) || !/[0-9]/.test(novaSenha)) throw new Error('A nova senha deve conter letras e números.');
  if (ehSenhaComum(novaSenha)) throw new Error('Esta senha é muito comum. Escolha uma diferente.');

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
  return err;
}
