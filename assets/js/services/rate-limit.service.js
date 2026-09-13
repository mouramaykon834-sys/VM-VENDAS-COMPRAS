// =============================================================
// SERVICE: RATE LIMITING — VM VENDAS E COMPRAS
// =============================================================
// Evita abuso de funcionalidades (login, cadastro, propostas, chat).
// =============================================================

import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// CONFIGURAÇÕES DE LIMITES POR AÇÃO
// -------------------------------------------------------------
const LIMITES = {
  login:        { max: 5,  janela: 900 },  // 5 tentativas em 15 min
  cadastro:     { max: 3,  janela: 3600 }, // 3 cadastros em 1 hora
  recuperar:    { max: 3,  janela: 3600 }, // 3 recuperações em 1 hora
  proposta:     { max: 5,  janela: 3600 }, // 5 propostas em 1 hora
  mensagem:     { max: 20, janela: 3600 }, // 20 mensagens em 1 hora
  contato:      { max: 5,  janela: 3600 }, // 5 mensagens de contato em 1 hora
  pedido:       { max: 10, janela: 3600 }  // 10 pedidos em 1 hora
};

// -------------------------------------------------------------
// Verificar se pode fazer a ação
// Retorna { permitido, restantes, esperar_segundos }
// -------------------------------------------------------------
export async function verificarLimite(acao, chave = null) {
  try {
    const config = LIMITES[acao];
    if (!config) {
      console.warn('[rate-limit] Ação desconhecida:', acao);
      return { permitido: true, restantes: 999, esperar_segundos: 0 };
    }

    // Chave = identificação (e-mail, IP, etc.)
    const chaveFinal = chave || await gerarChaveUsuario();

    const r = await supabase.rpc('verificar_rate_limit', {
      p_chave: chaveFinal,
      p_acao: acao,
      p_max: config.max,
      p_janela_segundos: config.janela
    });

    if (r.error) {
      console.warn('[rate-limit] Erro ao verificar:', r.error);
      return { permitido: true, restantes: 999, esperar_segundos: 0 };
    }

    return r.data;
  } catch (e) {
    console.warn('[rate-limit] Erro:', e);
    return { permitido: true, restantes: 999, esperar_segundos: 0 };
  }
}

// -------------------------------------------------------------
// Registrar tentativa (quando a ação é executada)
// -------------------------------------------------------------
export async function registrarTentativa(acao, chave = null, sucesso = true) {
  try {
    const chaveFinal = chave || await gerarChaveUsuario();
    await supabase.rpc('registrar_tentativa', {
      p_chave: chaveFinal,
      p_acao: acao,
      p_sucesso: sucesso
    });
  } catch (e) {
    console.warn('[rate-limit] Erro ao registrar:', e);
  }
}

// -------------------------------------------------------------
// Verificar + bloquear se necessário (uso em uma linha)
// Lança erro com mensagem amigável se bloqueado
// -------------------------------------------------------------
export async function checarLimite(acao, chave = null) {
  const r = await verificarLimite(acao, chave);

  if (!r.permitido) {
    const minutos = Math.ceil(r.esperar_segundos / 60);
    throw new Error(
      `Muitas tentativas. Aguarde ${minutos} minuto${minutos > 1 ? 's' : ''} e tente novamente.`
    );
  }

  return r;
}

// -------------------------------------------------------------
// Gera chave única do usuário (para usar como identificador)
// -------------------------------------------------------------
async function gerarChaveUsuario() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user.id;

    // Se não estiver logado, usa um identificador anônimo
    let anonId = localStorage.getItem('vm_anon_id');
    if (!anonId) {
      anonId = 'anon_' + Math.random().toString(36).slice(2, 15) + '_' + Date.now();
      localStorage.setItem('vm_anon_id', anonId);
    }
    return anonId;
  } catch (e) {
    return 'unknown_' + Date.now();
  }
}

// -------------------------------------------------------------
// Helper: mostra alerta amigável se bloqueado
// -------------------------------------------------------------
export function formatarEspera(segundos) {
  if (segundos < 60) return `${segundos} segundos`;
  const min = Math.ceil(segundos / 60);
  return `${min} minuto${min > 1 ? 's' : ''}`;
}
