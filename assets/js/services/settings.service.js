// =============================================================
// SERVICE: CONFIGURAÇÕES — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

let cache = null;
let carregandoPromise = null;
const CACHE_KEY = 'vm-settings-cache-v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function lerCacheLocal() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function gravarCacheLocal(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch (_) {}
}

function comTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}

export async function carregarConfiguracoes(force = false) {
  if (cache && !force) return cache;
  if (carregandoPromise) return carregandoPromise;

  if (!force) {
    const local = lerCacheLocal();
    if (local) { cache = local; return local; }
  }

  carregandoPromise = (async () => {
    try {
      const [company, store, visual] = await Promise.all([
        comTimeout(supabase.from('company_settings').select('*').eq('id', 1).maybeSingle()),
        comTimeout(supabase.from('store_settings').select('*').eq('id', 1).maybeSingle()),
        comTimeout(supabase.from('visual_settings').select('*').eq('id', 1).maybeSingle())
      ]).catch(() => [{ data: null }, { data: null }, { data: null }]);

      cache = {
        company: company?.data || {},
        store: store?.data || {},
        visual: visual?.data || {}
      };
      gravarCacheLocal(cache);
      return cache;
    } catch (e) {
      console.error('[settings] Erro:', e);
      cache = { company: {}, store: {}, visual: {} };
      return cache;
    } finally {
      carregandoPromise = null;
    }
  })();

  return carregandoPromise;
}

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
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = visual.favicon_url;
  }

  const nome = company.nome_fantasia || company.nome_empresa;
  if (nome && document.title.includes('Minha Loja')) {
    document.title = document.title.replaceAll('Minha Loja', nome);
  }
}

export async function iniciarConfiguracoes() {
  const cfg = await carregarConfiguracoes();
  aplicarConfiguracoes(cfg);
  return cfg;
}

export function limparCacheConfiguracoes() {
  cache = null;
  carregandoPromise = null;
  try { localStorage.removeItem(CACHE_KEY); } catch (_) {}
}