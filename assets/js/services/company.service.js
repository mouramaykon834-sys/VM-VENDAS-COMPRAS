// =============================================================
// SERVICE: EMPRESA — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

let cache = null;

export async function carregarEmpresa(force = false) {
  if (cache && !force) return cache;
  try {
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    cache = data || {};
  } catch (e) {
    console.error('[company] Erro:', e);
    cache = {};
  }
  return cache;
}

export async function salvarEmpresa(dados) {
  const payload = {
    id: 1,
    nome_empresa:  dados.nome_empresa  || null,
    nome_fantasia: dados.nome_fantasia || null,
    cnpj:          dados.cnpj          || null,
    telefone:      dados.telefone      || null,
    whatsapp:      dados.whatsapp      || null,
    email:         dados.email         || null,
    endereco:      dados.endereco      || null,
    cidade:        dados.cidade        || null,
    estado:        dados.estado        || null,
    cep:           dados.cep           || null,
    descricao:     dados.descricao     || null,
    horario:       dados.horario       || null,
    updated_at:    new Date().toISOString()
  };
  const { error } = await supabase.from('company_settings').upsert(payload);
  if (error) throw error;
  cache = null;
}

export function limparCacheEmpresa() { cache = null; }