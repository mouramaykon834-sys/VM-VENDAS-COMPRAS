// =============================================================
// SERVICE: WHATSAPP — VM VENDAS E COMPRAS
// =============================================================
// Monta links do WhatsApp com mensagens prontas. O número
// comercial é lido de company_settings.whatsapp.
// =============================================================

import { supabase } from '../supabase.js';

let numeroCache = null;

// -------------------------------------------------------------
// Carrega o número de WhatsApp configurado na loja
// -------------------------------------------------------------
export async function carregarNumeroWhatsapp() {
  if (numeroCache) return numeroCache;
  try {
    const { data } = await supabase
      .from('company_settings')
      .select('whatsapp')
      .eq('id', 1)
      .maybeSingle();
    numeroCache = data?.whatsapp || null;
  } catch (_) {
    numeroCache = null;
  }
  return numeroCache;
}

// -------------------------------------------------------------
// Gera link do WhatsApp com mensagem
// -------------------------------------------------------------
// Tipo:
//   'produto'  → usa template padrão com o nome do produto
//   'geral'    → mensagem geral
//   'proposta' → mensagem sobre proposta
//   'pedido'   → mensagem sobre pedido
// -------------------------------------------------------------
export async function gerarLinkWhatsapp({ tipo = 'geral', produto = null, texto = null } = {}) {
  const numero = await carregarNumeroWhatsapp();
  if (!numero) {
    console.warn('[whatsapp.service] Número de WhatsApp não configurado em company_settings.');
    return null;
  }

  const numeroLimpo = numero.replace(/\D/g, '');

  let mensagem = texto;
  if (!mensagem) {
    mensagem = await montarMensagem({ tipo, produto });
  }

  return `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
}

// -------------------------------------------------------------
// Monta a mensagem conforme o tipo
// -------------------------------------------------------------
async function montarMensagem({ tipo, produto }) {
  let template = null;

  try {
    const { data: settings } = await supabase
      .from('store_settings')
      .select('whatsapp_msg_produto, whatsapp_msg_geral')
      .eq('id', 1)
      .maybeSingle();

    if (tipo === 'produto' && settings?.whatsapp_msg_produto) {
      template = settings.whatsapp_msg_produto;
    } else if (settings?.whatsapp_msg_geral) {
      template = settings.whatsapp_msg_geral;
    }
  } catch (_) { /* silencioso */ }

  // Fallbacks
  if (!template) {
    if (tipo === 'produto') {
      template = 'Olá! Tenho interesse no produto [NOME DO PRODUTO]. Gostaria de mais informações.';
    } else {
      template = 'Olá! Vim pela loja online e gostaria de mais informações.';
    }
  }

  // Substitui [NOME DO PRODUTO] pelo nome real
  if (produto) {
    template = template.replaceAll('[NOME DO PRODUTO]', produto.nome || '');
    template = template.replaceAll('[PRODUTO]', produto.nome || '');
    if (produto.precoFinal != null) {
      template = template.replaceAll('[PRECO]', 'R$ ' + produto.precoFinal.toFixed(2));
    }
  }

  return template;
}

// -------------------------------------------------------------
// Abre o WhatsApp em nova aba
// -------------------------------------------------------------
export async function abrirWhatsapp(params) {
  const link = await gerarLinkWhatsapp(params);
  if (!link) {
    alert('O WhatsApp da loja ainda não foi configurado pelo administrador.');
    return;
  }
  window.open(link, '_blank', 'noopener');
}

// Limpa o cache (útil quando admin altera o número)
export function limparCacheWhatsapp() {
  numeroCache = null;
}