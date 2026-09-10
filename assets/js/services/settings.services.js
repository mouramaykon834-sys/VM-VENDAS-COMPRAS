// =============================================================
// SERVICE: CONFIGURAÇÕES — VM VENDAS E COMPRAS
// =============================================================
// Carrega company_settings, store_settings e visual_settings do
// Supabase e aplica como CSS Variables no documento.
// Também troca favicon e título da aba.
// =============================================================

import { supabase } from '../supabase.js';

let cache = null;
let carregando = null;

// -------------------------------------------------------------
// Carrega do banco (com cache e deduplicação de chamadas)
// -------------------------------------------------------------
export async function carregarConfiguracoes(force = false) {
  if (cache && !force) return cache;
  if (carregando) return carregando;

  carregando = (async () => {
    try {
      const [company, store, visual] = await Promise.all([
        supabase.from('company_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('store_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('visual_settings').select('*').eq('id', 1).maybeSingle()
      ]);

      cache = {
        company: company.data || {},
        store: store.data || {},
        visual: visual.data || {}
      };
      return cache;
    } catch (e) {
      console.error('[settings] Erro ao carregar:', e);
      cache = { company: {}, store: {}, visual: {} };
      return cache;
    } finally {
      carregando = null;
    }
  })();

  return carregando;
}

// -------------------------------------------------------------
// Aplica cores, favicon e título como CSS Variables
// -------------------------------------------------------------
export function aplicarConfiguracoes({ company = {}, store = {}, visual = {} } = {}) {
  const root = document.documentElement;

  // Cores da marca
  if (visual.cor_principal)  root.style.setProperty('--cor-principal', visual.cor_principal);
  if (visual.cor_secundaria) root.style.setProperty('--cor-secundaria', visual.cor_secundaria);
  if (visual.cor_destaque)   root.style.setProperty('--cor-destaque', visual.cor_destaque);
  if (visual.cor_fundo)      root.style.setProperty('--cor-fundo', visual.cor_fundo);
  if (visual.cor_texto)      root.style.setProperty('--cor-texto', visual.cor_texto);
  if (visual.cor_sucesso)    root.style.setProperty('--cor-sucesso', visual.cor_sucesso);

  // Favicon
  if (visual.favicon_url) {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = visual.favicon_url;
  }

  // Título da aba — troca "Minha Loja" pelo nome real
  const nome = company.nome_fantasia || company.nome_empresa;
  if (nome && document.title.includes('Minha Loja')) {
    document.title = document.title.replaceAll('Minha Loja', nome);
  }
}

// -------------------------------------------------------------
// Atalho: carrega e aplica de uma vez
// -------------------------------------------------------------
export async function iniciarConfiguracoes() {
  const cfg = await carregarConfiguracoes();
  aplicarConfiguracoes(cfg);
  return cfg;
}

// -------------------------------------------------------------
// Limpa o cache (quando admin altera a identidade visual)
// -------------------------------------------------------------
export function limparCacheConfiguracoes() {
  cache = null;
}