// =============================================================
// SERVICE: PAGAMENTO — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// Lista métodos de pagamento ativos
// -------------------------------------------------------------
export async function listarMetodosPagamento() {
  const r = await supabase
    .from('payment_methods')
    .select('*')
    .eq('ativo', true)
    .order('ordem');

  if (r.error) throw r.error;
  return r.data || [];
}

// -------------------------------------------------------------
// Calcula opções de parcelamento para um método
// -------------------------------------------------------------
export async function calcularParcelas(methodId, valorTotal) {
  const r = await supabase.rpc('calcular_parcelas', {
    p_method_id: methodId,
    p_valor_total: Number(valorTotal)
  });

  if (r.error) throw r.error;
  return r.data || [];
}

// -------------------------------------------------------------
// Busca conta que recebe (por método + admin)
// Só admin vê todas. Cliente vê apenas a que foi vinculada ao pedido.
// -------------------------------------------------------------
export async function listarContasRecebimento() {
  const r = await supabase
    .from('payment_accounts')
    .select('*')
    .eq('ativo', true)
    .order('ordem');

  if (r.error) throw r.error;
  return r.data || [];
}

// -------------------------------------------------------------
// Retorna o melhor método de pagamento (menor prazo/maior desconto)
// -------------------------------------------------------------
export function melhorMetodo(metodos) {
  if (!metodos || !metodos.length) return null;

  return metodos.slice().sort(function(a, b) {
    // Prioridade: maior desconto, depois menor ordem
    if (Number(b.desconto_pct) !== Number(a.desconto_pct)) {
      return Number(b.desconto_pct) - Number(a.desconto_pct);
    }
    return Number(a.ordem) - Number(b.ordem);
  })[0];
}

// -------------------------------------------------------------
// Formata método de pagamento para exibição
// -------------------------------------------------------------
export function formatarMetodo(m) {
  const emoji = {
    pix:           '⚡',
    cartao:        '💳',
    dinheiro:      '💵',
    boleto:        '📄',
    transferencia: '🏦'
  };

  return {
    ...m,
    emoji: emoji[m.tipo] || '💰',
    descontoTexto: Number(m.desconto_pct) > 0
      ? `${m.desconto_pct}% de desconto`
      : null
  };
}

// -------------------------------------------------------------
// Calcula desconto do método sobre o valor
// -------------------------------------------------------------
export function aplicarDescontoMetodo(valor, metodo) {
  const desc = Number(metodo.desconto_pct || 0);
  const taxa = Number(metodo.taxa_fixa || 0);
  const valorComDesconto = valor * (1 - desc / 100);
  return {
    valorOriginal: valor,
    desconto: valor - valorComDesconto,
    taxa: taxa,
    valorFinal: valorComDesconto + taxa
  };
}

// -------------------------------------------------------------
// Formata valor em R$
// -------------------------------------------------------------
export function formatarReais(valor) {
  return 'R$ ' + Number(valor || 0).toFixed(2).replace('.', ',');
}

// -------------------------------------------------------------
// Formata opção de parcela para exibição
// Ex: "3x de R$ 33,33 (sem juros)"
// -------------------------------------------------------------
export function formatarParcela(opcao) {
  const valor = formatarReais(opcao.valor_parcela);
  if (opcao.parcelas === 1) return `À vista: ${valor}`;
  if (opcao.tem_juros) return `${opcao.parcelas}x de ${valor} (com juros)`;
  return `${opcao.parcelas}x de ${valor} (sem juros)`;
}
