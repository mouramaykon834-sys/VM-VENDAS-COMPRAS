import { supabase } from '../supabase.js';

/* ============================================================
   NORMALIZAÇÃO DOS ITENS
   ============================================================ */

function normalizarItens(itens = []) {
    return (Array.isArray(itens) ? itens : [])
        .map(item => ({
            product_id: item.product_id || item.id,
            quantidade: Number(item.quantidade ?? item.quantity ?? 0)
        }))
        .filter(item =>
            item.product_id &&
            Number.isFinite(item.quantidade) &&
            item.quantidade > 0
        );
}

/* ============================================================
   TOKEN DO CHECKOUT
   ============================================================ */

function obterCheckoutToken() {
    const chave = 'vm_checkout_token';

    let token = localStorage.getItem(chave);

    if (!token) {
        if (crypto?.randomUUID) {
            token = crypto.randomUUID();
        } else {
            token =
                Date.now().toString(36) +
                Math.random().toString(36).substring(2);
        }

        localStorage.setItem(chave, token);
    }

    return token;
}

/* ============================================================
   CRIAR PEDIDO
   ============================================================ */

export async function criarPedido(itens, dados = {}) {
    const itensNormalizados = normalizarItens(itens);

    if (!itensNormalizados.length) {
        throw new Error('O carrinho está vazio.');
    }

    const checkoutToken = dados.checkout_token || obterCheckoutToken();

    const payload = {
        ...dados,
        checkout_token: checkoutToken
    };

    const { data, error } = await supabase.rpc('finalizar_venda', {
        p_itens: itensNormalizados,
        p_dados: payload
    });

    if (error) {
        console.error('[orders] erro ao finalizar venda:', error);
        throw error;
    }

    if (!data) {
        throw new Error('Não foi possível registrar o pedido.');
    }

    // Pedido registrado com sucesso.
    // O token não precisa mais ser reutilizado.
    localStorage.removeItem('vm_checkout_token');

    let pedido = null;

    if (data.order_id) {
        const { data: pedidoData } = await supabase
            .from('orders')
            .select('id, numero, status, total, created_at')
            .eq('id', data.order_id)
            .maybeSingle();

        pedido = pedidoData || null;
    }

    return {
        ...data,
        pedido
    };
}

/* ============================================================
   BUSCAR PEDIDO
   ============================================================ */

export async function buscarPedido(id) {
    if (!id) {
        throw new Error('ID do pedido não informado.');
    }

    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (*)
        `)
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('[orders] erro ao buscar pedido:', error);
        throw error;
    }

    return data;
}

/* ============================================================
   LISTAR MEUS PEDIDOS
   ============================================================ */

export async function listarMeusPedidos() {
    const {
        data: { user },
        error: authError
    } = await supabase.auth.getUser();

    if (authError) {
        throw authError;
    }

    if (!user) {
        throw new Error('Usuário não autenticado.');
    }

    const { data, error } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[orders] erro ao listar pedidos:', error);
        throw error;
    }

    return data || [];
}

/* ============================================================
   RÓTULO DO STATUS DO PEDIDO
   ============================================================ */

export function rotuloStatusPedido(status) {
    const map = {
        aguardando: {
            texto: 'Aguardando',
            tipo: 'neutro'
        },

        recebido: {
            texto: 'Recebido',
            tipo: 'info'
        },

        em_analise: {
            texto: 'Em análise',
            tipo: 'info'
        },

        confirmado: {
            texto: 'Confirmado',
            tipo: 'ok'
        },

        em_preparacao: {
            texto: 'Em preparação',
            tipo: 'info'
        },

        enviado: {
            texto: 'Enviado',
            tipo: 'info'
        },

        concluido: {
            texto: 'Concluído',
            tipo: 'ok'
        },

        cancelado: {
            texto: 'Cancelado',
            tipo: 'erro'
        }
    };

    return map[status] || {
        texto: status || 'Aguardando',
        tipo: 'neutro'
    };
}
