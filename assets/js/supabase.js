// =============================================================
// CLIENTE SUPABASE — VM VENDAS E COMPRAS
// =============================================================
// Este arquivo cria e exporta o cliente Supabase, que será
// usado por todos os outros módulos do sistema para se
// comunicar com o banco de dados.
//
// A biblioteca @supabase/supabase-js é carregada via CDN
// (importada como ES Module) no topo de cada página HTML que
// precisar dela.
// =============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_CONFIG } from '../../config/config.js';

// Validação rápida para pegar erros de configuração cedo
if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
  console.error(
    '[supabase.js] ERRO: config/config.js não está preenchido corretamente. ' +
    'Verifique a URL e a anonKey.'
  );
}

if (SUPABASE_CONFIG.url.includes('COLE_AQUI')) {
  console.error(
    '[supabase.js] ERRO: você esqueceu de substituir os valores padrão do ' +
    'config/config.js. Edite o arquivo e coloque a URL e a anonKey reais.'
  );
}

// Cria o cliente. Exportado com o nome `supabase` para uso em
// qualquer módulo:  import { supabase } from '.../supabase.js';
export const supabase = createClient(
  SUPABASE_CONFIG.url,
  SUPABASE_CONFIG.anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Exporta também o usuário atual de forma assíncrona.
export async function getUsuarioAtual() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

// Exporta o perfil (public.profiles) do usuário logado.
export async function getPerfilAtual() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[supabase.js] Erro ao buscar perfil:', error);
    return null;
  }
  return data;
}