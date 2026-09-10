// =============================================================
// SERVICE: CONFIGURAÇÕES — VM VENDAS E COMPRAS
// =============================================================
// Versão à prova de loop: timeout em cada consulta, cache
// agressivo, e nunca deixa o await pendurado.
// =============================================================

import { supabase } from '../supabase.js';

let cache = null;
let carregandoPromise = null;

// -------------------------------------------------------------
// Wrapper com timeout (evita requisições penduradas)
// -------------------------------------------------------------
function comTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    )
  ]);
}

// -------------------------------------------------------------
// Carrega com deduplicação de chamadas
// -------------------------------------------------------------
export async function carregarConfiguracoes(force = false) {
  if (cache && !force) return cache;
  if (carregandoPromise) return carregandoPromise;

  carregandoPromise = (async () => {
    try {
      const [company, store, visual] = await Promise.all([
        comTimeout(supabase.from('company_settings').select('*').eq('id', 1).maybeSingle()),
        comTimeout(supabase.from('store_settings').select('*').eq('id', 1).maybeSingle()),
        comTimeout(supabase.from('visual_settings').select('*').eq('id', 1).maybeSingle())
      ]).catch(err => {
        console.warn('[settings] Falha ao carregar (usando vazio):', err?.message);
        return [{ data: null }, { data: null }, { data: null }];
      });

      cache = {
        company: company?.data || {},
        store: store?.data || {},
        visual: visual?.data || {}
      };
      return cache;
    } catch (e) {
      console.error('[settings] Erro fatal:', e);
      cache = { company: {}, store: {}, visual: {} };
      return cache;
    } finally {
      carregandoPromise = null;
    }
  })();

  return carregandoPromise;
}

// -------------------------------------------------------------
// Aplica cores/favicon/título
// -------------------------------------------------------------
export function aplicarConfiguracoes({ company = {}, store = {}, visual = {} } = {}) {
  const root = document.documentElement;

  if (visual.cor_principal)  root.style.setProperty('--cor-principal', visual.cor_principal);
  if (visual.cor_secundaria) root.style.setProperty('--cor-secundaria', visual.cor_secundaria);
  if (visual.cor_destaque)   root.style.setProperty('--cor-destaque', visual.cor_destaque);
  if (visual.cor_fundo)      root.style.setProperty('--cor-fundo', visual.cor_fundo);
  if (visual.cor_texto)      root.style.setProperty('--cor-texto', visual.cor_texto);
  if (visual.cor_sucesso)    root.style.setProperty('--cor-sucesso', visual.cor_sucesso);

  if (visual.favicon_url) {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = visual.favicon_url;
  }

  const nome = company.nome_fantasia || company.nome_empresa;
  if (nome && document.title.includes('Minha Loja')) {
    document.title = document.title.replaceAll('Minha Loja', nome);
  }
}

// -------------------------------------------------------------
// Atalho combinado
// -------------------------------------------------------------
export async function iniciarConfiguracoes() {
  const cfg = await carregarConfiguracoes();
  aplicarConfiguracoes(cfg);
  return cfg;
}

export function limparCacheConfiguracoes() {
  cache = null;
  carregandoPromise = null;
}
