// =============================================================
// SERVICE: FAVORITOS — VM VENDAS E COMPRAS
// =============================================================
import { supabase } from '../supabase.js';

export async function listarMeusFavoritos() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('favorites')
    .select(`id, created_at, product_id,
      products:product_id (
        id, nome, preco, preco_promocional, status, estoque, condicao,
        product_images ( url, principal, ordem )
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function alternarFavorito(productId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Faça login para favoritar.');

  const { data: ex } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();

  if (ex) {
    await supabase.from('favorites').delete().eq('id', ex.id);
    return false;
  } else {
    await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
    return true;
  }
}

export async function removerFavorito(id) {
  const { error } = await supabase.from('favorites').delete().eq('id', id);
  if (error) throw error;
}

export async function ehFavorito(productId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .maybeSingle();
  return !!data;
}