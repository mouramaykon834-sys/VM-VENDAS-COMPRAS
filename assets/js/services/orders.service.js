import { supabase } from '../supabase.js';

/* ============================================================
   NORMALIZAÇÃO DOS ITENS
   ============================================================ */

function normalizarItens(itens = []) {
    return (Array.isArray(itens) ? itens : [])
        .map(item => ({
            product_id: item.product_id || item.id,
            quantidade: Number(
                item.quantidade ??
                item.quantity ??
                0
            )
        }))
        .filter(item =>
            item.product_id &&
            Number.isFinite(item.quantidade) &&
            Number.isInteger(item.quantidade) &&
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
                Math.random()
                    .toString(36)
                    .substring(2);
        }

        localStorage.setItem(chave, token);
    }

    return token;
}

/* ============================================================
   CRIAR PEDIDO
   Aceita o formato usado pelo checkout:
   criarPedido({
       itens,
       dadosContato,
       observacoes
   })
   ============================================================ */

export async function criarPedido(parametros = {}, dadosAntigo = {}) {

    let itens = [];
    let dados = {};

    /*
     * Formato atual do checkout
     */
    if (
        parametros &&
        !Array.isArray(parametros) &&
        typeof parametros === 'object'
    ) {
        itens = parametros.itens || [];

        const dadosContato =
            parametros.dadosContato || {};

        const observacoes =
            parametros.observacoes || '';

        dados = {
            ...dadosContato,
            observacoes:
                observacoes ||
                dadosContato.observacoes ||
                ''
        };
    }

    /*
     * Mantém compatibilidade com chamadas antigas:
     * criarPedido(itens, dados)
     */
    else if (Array.isArray(parametros)) {
        itens = parametros;
        dados = dadosAntigo || {};
    }

    const itensNormalizados =
        normalizarItens(itens);

    if (!itensNormalizados.length) {
        throw new Error(
            'O carrinho está vazio.'
        );
    }

    /*
     * Verificar autenticação
     */
    const {
        data: { user },
        error: authError
    } = await supabase.auth.getUser();

    if (authError) {
        throw new Error(
            authError.message ||
            'Não foi possível verificar o usuário.'
        );
    }

    if (!user) {
        throw new Error(
            'Você precisa estar autenticado para realizar o pedido.'
        );
    }

    /*
     * Token de segurança/idempotência
     */
    const checkoutToken =
        dados.checkout_token ||
        obterCheckoutToken();

    /*
     * Dados enviados ao banco
     */
    const payload = {
        nome_contato:
            dados.nome_contato ||
            dados.nome ||
            '',

        telefone:
            dados.telefone || '',

        whatsapp:
            dados.whatsapp || '',

        email:
            dados.email || '',

        endereco:
            dados.endereco || null,

        cep:
            dados.cep || '',

        observacoes:
            dados.observacoes || '',

        payment_method_id:
            dados.payment_method_id || null,

        payment_method_nome:
            dados.payment_method_nome || '',

        parcelas:
            Number(dados.parcelas || 1),

        delivery_zone_id:
            dados.delivery_zone_id || null,

        frete:
            Number(dados.frete || 0),

        desconto:
            Number(dados.desconto || 0),

        checkout_token:
            checkoutToken
    };

    /*
     * Finalizar venda no Supabase
     */
    const {
        data,
        error
    } = await supabase.rpc(
        'finalizar_venda',
        {
            p_itens: itensNormalizados,
            p_dados: payload
        }
    );

    if (error) {
        console.error(
            '[orders] erro ao finalizar venda:',
            error
        );

        throw new Error(
            error.message ||
            'Não foi possível finalizar o pedido.'
        );
    }

    if (!data || data.sucesso !== true) {
        throw new Error(
            data?.mensagem ||
            'O pedido não pôde ser finalizado.'
        );
    }

    /*
     * Venda concluída.
     * O token não precisa mais ser reutilizado.
     */
    localStorage.removeItem(
        'vm_checkout_token'
    );

    /*
     * Buscar dados completos do pedido
     */
    let pedido = null;

    if (data.order_id) {

        const {
            data: pedidoData,
            error: pedidoError
        } = await supabase
            .from('orders')
            .select(
                'id, numero, status, total, created_at'
            )
            .eq('id', data.order_id)
            .maybeSingle();

        if (!pedidoError) {
            pedido = pedidoData || null;
        }
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
        throw new Error(
            'ID do pedido não informado.'
        );
    }

    const {
        data,
        error
    } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (*)
        `)
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error(
            '[orders] erro ao buscar pedido:',
            error
        );

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
        throw new Error(
            'Usuário não autenticado.'
        );
    }

    const {
        data,
        error
    } = await supabase
        .from('orders')
        .select(`
            *,
            order_items (*)
        `)
        .eq('user_id', user.id)
        .order(
            'created_at',
            {
                ascending: false
            }
        );

    if (error) {
        console.error(
            '[orders] erro ao listar pedidos:',
            error
        );

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
        texto:
            status ||
            'Aguardando',

        tipo: 'neutro'
    };
}
