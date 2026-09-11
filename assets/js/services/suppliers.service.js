// =============================================================
// SERVICE: FORNECEDORES — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

export async function listarFornecedores({ busca = '', somenteAtivos = true } = {}) {
  let q = supabase.from('suppliers').select('*').order('nome', { ascending: true });
  if (somenteAtivos) q = q.eq('ativo', true);
  if (busca) q = q.ilike('nome', '%' + busca + '%');
  const r = await q;
  if (r.error) throw r.error;
  return r.data || [];
}

export async function buscarFornecedor(id) {
  const r = await supabase.from('suppliers').select('*').eq('id', id).maybeSingle();
  if (r.error) throw r.error;
  return r.data;
}

export async function salvarFornecedor(dados, id) {
  const payload = {
    nome: dados.nome.trim(),
    razao_social: dados.razao_social ? dados.razao_social.trim() : null,
    cnpj: dados.cnpj ? dados.cnpj.trim() : null,
    ie: dados.ie ? dados.ie.trim() : null,
    telefone: dados.telefone ? dados.telefone.trim() : null,
    whatsapp: dados.whatsapp ? dados.whatsapp.trim() : null,
    email: dados.email ? dados.email.trim() : null,
    endereco: dados.endereco ? dados.endereco.trim() : null,
    cidade: dados.cidade ? dados.cidade.trim() : null,
    estado: dados.estado ? dados.estado.trim().toUpperCase() : null,
    cep: dados.cep ? dados.cep.trim() : null,
    banco: dados.banco ? dados.banco.trim() : null,
    agencia: dados.agencia ? dados.agencia.trim() : null,
    conta: dados.conta ? dados.conta.trim() : null,
    observacoes: dados.observacoes ? dados.observacoes.trim() : null,
    ativo: dados.ativo !== false
  };

  let r;
  if (id) {
    r = await supabase.from('suppliers').update(payload).eq('id', id);
  } else {
    r = await supabase.from('suppliers').insert(payload);
  }
  if (r.error) throw r.error;
}

export async function excluirFornecedor(id) {
  const r = await supabase.from('suppliers').delete().eq('id', id);
  if (r.error) throw r.error;
}
