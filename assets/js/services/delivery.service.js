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
// Texto amigável do prazo de entrega
// -------------------------------------------------------------
export function textoPrazo(resultado) {
  if (!resultado || !resultado.encontrado) {
    return resultado?.motivo || 'Não foi possível calcular o frete';
  }

  if (resultado.mesmo_dia) {
    return 'Entrega no mesmo dia';
  }

  if (resultado.prazo_dias_min === resultado.prazo_dias_max) {
    return `Entrega em ${resultado.prazo_dias_min} dia(s) úteis`;
  }

  return `Entrega de ${resultado.prazo_dias_min} a ${resultado.prazo_dias_max} dias úteis`;
}

// -------------------------------------------------------------
// Formata valor de frete
// -------------------------------------------------------------
export function formatarFrete(valor) {
  if (Number(valor) === 0) return 'Frete grátis';
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

// -------------------------------------------------------------
// Aplica máscara de CEP no input
// -------------------------------------------------------------
export function mascaraCEP(input) {
  input.addEventListener('input', function(e) {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 5) {
      v = v.slice(0, 5) + '-' + v.slice(5);
    }
    e.target.value = v;
  });
}

// -------------------------------------------------------------
// Verifica se está no horário de corte para entrega no mesmo dia
// -------------------------------------------------------------
export function dentroDoHorarioCorte(resultado) {
  if (!resultado || !resultado.mesmo_dia || !resultado.hora_corte) return true;

  const agora = new Date();
  const [hora, minuto] = String(resultado.hora_corte).split(':').map(Number);
  const corte = new Date();
  corte.setHours(hora, minuto, 0, 0);

  return agora <= corte;
}
