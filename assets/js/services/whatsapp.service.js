// =============================================================
// SERVICE: WHATSAPP — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

let numeroCache = null;

export async function carregarNumeroWhatsapp() {
  if (numeroCache) return numeroCache;
  try {
    const { data } = await supabase.from('company_settings').select('whatsapp').eq('id', 1).maybeSingle();
    numeroCache = data?.whatsapp || null;
  } catch { numeroCache = null; }
  return numeroCache;
}

export async function gerarLinkWhatsapp({ tipo = 'geral', produto = null, texto = null } = {}) {
  const numero = await carregarNumeroWhatsapp();
  if (!numero) {
    console.warn('[whatsapp] Número não configurado');
    return null;
  }
  const limpo = numero.replace(/\D/g, '');
  const mensagem = texto || await montarMensagem({ tipo, produto });
  return `https://wa.me/55${limpo}?text=${encodeURIComponent(mensagem)}`;
}

async function montarMensagem({ tipo, produto }) {
  let template = null;
  try {
    const { data } = await supabase.from('store_settings').select('whatsapp_msg_produto, whatsapp_msg_geral').eq('id', 1).maybeSingle();
    if (tipo === 'produto' && data?.whatsapp_msg_produto) template = data.whatsapp_msg_produto;
    else if (data?.whatsapp_msg_geral) template = data.whatsapp_msg_geral;
  } catch (_) {}

  if (!template) {
    template = tipo === 'produto'
      ? 'Olá! Tenho interesse no produto [NOME DO PRODUTO]. Gostaria de mais informações.'
      : 'Olá! Vim pela loja online e gostaria de mais informações.';
  }

  if (produto) {
    template = template.replaceAll('[NOME DO PRODUTO]', produto.nome || '');
    template = template.replaceAll('[PRODUTO]', produto.nome || '');
    if (produto.precoFinal != null) template = template.replaceAll('[PRECO]', 'R$ ' + produto.precoFinal.toFixed(2));
  }
  return template;
}

export async function abrirWhatsapp(params) {
  const link = await gerarLinkWhatsapp(params);
  if (!link) { alert('O WhatsApp da loja ainda não foi configurado.'); return; }
  window.open(link, '_blank', 'noopener');
}

export function limparCacheWhatsapp() { numeroCache = null; }