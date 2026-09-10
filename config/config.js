// =============================================================
// CONFIGURAÇÃO DO SUPABASE — VM VENDAS E COMPRAS
// =============================================================
// Este arquivo é o ÚNICO lugar do sistema onde as credenciais
// do Supabase devem ficar. Todos os outros arquivos importam
// daqui.
//
// SEGURANÇA:
//  - A "anonKey" é pública por natureza e PODE ficar no frontend.
//    A proteção real dos dados vem das políticas de RLS do banco.
//  - NUNCA coloque aqui a "service_role key" do Supabase.
//  - NUNCA coloque senhas, tokens privados ou chaves administrativas.
// =============================================================

export const SUPABASE_CONFIG = {
  url: 'https://sgvsosfhgxnrjaghgzwb.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndnNvc2ZoZ3hucmphZ2hnendiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMzg5OTQsImV4cCI6MjEwNDYxNDk5NH0.5MjsS3rStOG6bjOmMCV8yTJsNUfzldBNEBk53IsouIk'
};

// Versão do sistema — útil para debug no console do navegador.
export const APP_VERSION = '0.1.0';
