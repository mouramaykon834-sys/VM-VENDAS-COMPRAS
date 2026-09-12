// =============================================================
// SERVICE: ENTREGA — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

// -------------------------------------------------------------
// Lista zonas de entrega ativas (para o admin)
// -------------------------------------------------------------
export async function listarZonasEntrega() {
  const r = await supabase
    .from('delivery_zones')
    .select('*')
    .eq('ativo', true)
    .order('ordem');

  if (r.error) throw r.error;
  return r.data || [];
}

// -------------------------------------------------------------
// Calcula frete pelo CEP (chama função SQL)
// -------------------------------------------------------------
export async function calcularFrete(cep, subtotal) {
  const cepLimpo = String(cep || '').replace(/\D/g, '');

  if (cepLimpo.length !== 8) {
    return { encontrado: false, motivo: 'CEP incompleto' };
  }

  const r = await supabase.rpc('calcular_frete', {
    p_cep: cepLimpo,
    p_subtotal: Number(subtotal || 0)
  });

  if (r.error) {
    console.warn('[delivery] erro ao calcular frete:', r.error);
    return { encontrado: false, motivo: 'Erro ao calcular frete' };
  }

  return r.data;
}

// -------------------------------------------------------------
// Formata CEP: 01310100 -> 01310-100
// -------------------------------------------------------------
export function formatarCEP(cep) {
  const limpo = String(cep || '').replace(/\D/g, '');
  if (limpo.length !== 8) return cep;
  return limpo.slice(0, 5) + '-' + limpo.slice(5);
}

// -------------------------------------------------------------
// Texto do prazo de entrega
// Ex: "Entrega no mesmo dia" / "De 2 a 4 dias úteis"
// -------------------------------------------------------------
export function textoP (calculo) {
  return '';
}
