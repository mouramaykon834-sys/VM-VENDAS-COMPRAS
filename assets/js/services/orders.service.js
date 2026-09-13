import { supabase } from '../supabase.js';


/* ============================================================
   PEDIDOS
   ============================================================ */


/**
 * Cria/finaliza um pedido através da RPC segura do banco.
 *
 * IMPORTANTE:
 * - Não confia no preço enviado pelo navegador.
 * - O banco consulta o preço real do produto.
 * - O banco valida o estoque.
 * - O banco registra a saída do estoque.
 * - O banco cria o pedido e os itens.
 * - O token evita duplicidade em caso de duplo clique/reenvio.
 */
export async function criarPedido({
    itens = [],
    dadosContato = {},
    observacoes = ''
}) {

    // ----------------------------------------------------------
    // 1. Validar carrinho
    // ----------------------------------------------------------

    if (!Array.isArray(itens) || itens.length === 0) {
        throw new Error('O carrinho está vazio.');
    }


    // ----------------------------------------------------------
    // 2. Verificar autenticação
    // ----------------------------------------------------------

    const {
        data: { user },
        error: authError
    } = await supabase.auth.getUser();

    if (authError) {
        throw new Error(
            authError.message || 'Não foi possível verificar o usuário.'
        );
    }

    if (!user) {
        throw new Error(
            'Você precisa estar autenticado para realizar o pedido.'
        );
    }


    // ----------------------------------------------------------
    // 3. Normalizar itens
    //
    // O preço do carrinho NÃO é enviado para a RPC.
    // O banco será responsável por buscar o preço oficial.
    // ----------------------------------------------------------

    const itensNormalizados = itens.map((item) => {

        const productId =
            item.product_id ||
            item.id ||
            null;

        const quantidade =
            Number(item.quantidade);


        if (!productId) {
            throw new Error(
                'Um dos produtos do carrinho não possui identificação válida.'
            );
        }


        if (!Number.isInteger(quantidade) || quantidade <= 0) {
            throw new Error(
                'A quantidade de um dos produtos é inválida.'
            );
        }


        return {
            product_id: productId,
            quantidade
        };

    });


    // ----------------------------------------------------------
    // 4. Token de checkout
    //
    // Mantemos o mesmo token enquanto o checkout não terminar.
    //
    // Isso protege contra:
    // - duplo clique;
    // - reenvio;
    // - perda de resposta da internet;
    // - tentativa imediata de repetir a operação.
    // ----------------------------------------------------------

    const TOKEN_KEY = 'vm_checkout_token';

    let checkoutToken =
        localStorage.getItem(TOKEN_KEY);


    if (!checkoutToken) {

        checkoutToken =
            crypto.randomUUID();

        localStorage.setItem(
            TOKEN_KEY,
            checkoutToken
        );
    }


    // ----------------------------------------------------------
    // 5. Preparar dados enviados ao banco
    // ----------------------------------------------------------

    const dados = {

        nome_contato:
            dadosContato.nome_contato ||
            dadosContato.nome ||
            '',

        telefone:
            dadosContato.telefone ||
            '',

        whatsapp:
            dadosContato.whatsapp ||
            '',

        email:
            dadosContato.email ||
            '',

        endereco:
            dadosContato.endereco ||
            null,

        cep:
            dadosContato.cep ||
            '',

        observacoes:
            observacoes ||
            dadosContato.observacoes ||
            '',

        // ------------------------------------------------------
        // Pagamento
        // ------------------------------------------------------

        payment_method_id:
            dadosContato.payment_method_id ||
            null,

        payment_method_nome:
            dadosContato.payment_method_nome ||
            '',

        parcelas:
            Number(dadosContato.parcelas || 1),

        // ------------------------------------------------------
        // Entrega
        // ------------------------------------------------------

        delivery_zone_id:
            dadosContato.delivery_zone_id ||
            null,

        frete:
            Number(dadosContato.frete || 0),

        desconto:
            Number(dadosContato.desconto || 0),

        // ------------------------------------------------------
        // Controle
        // ------------------------------------------------------

        checkout_token:
            checkoutToken
    };


    // ----------------------------------------------------------
    // 6. Chamar RPC
    // ----------------------------------------------------------

    const {
        data,
        error
    } = await supabase.rpc(
        'finalizar_venda',
        {
            p_itens: itensNormalizados,
            p_dados: dados
        }
    );


    // ----------------------------------------------------------
    // 7. Tratar erro
    // ----------------------------------------------------------

    if (error) {

        console.error(
            'Erro ao finalizar venda:',
            error
        );

        /*
         * NÃO removemos o token aqui.
         *
         * Se o erro ocorreu antes da conclusão,
         * o usuário poderá tentar novamente utilizando
         * o mesmo token.
         */

        throw new Error(
            error.message ||
            'Não foi possível finalizar o pedido.'
        );
    }


    // ----------------------------------------------------------
    // 8. Validar resposta
    // ----------------------------------------------------------

    if (!data || data.sucesso !== true) {

        throw new Error(
            data?.mensagem ||
            'O pedido não pôde ser finalizado.'
        );
    }


    // ----------------------------------------------------------
    // 9. Pedido concluído
    //
    // Agora podemos remover o token.
    // ----------------------------------------------------------

    localStorage.removeItem(TOKEN_KEY);


    // ----------------------------------------------------------
    // 10. Obter número do pedido
    //
    // A RPC retorna o ID.
    // O número pode ser gerado automaticamente pelo banco.
    // ----------------------------------------------------------

    let numero = null;


    if (data.order_id) {

        const {
            data: pedido,
            error: pedidoError
        } = await supabase
            .from('orders')
            .select('id, numero, total, status')
            .eq('id', data.order_id)
            .maybeSingle();


        if (!pedidoError && pedido) {
            numero = pedido.numero;
        }

    }


    // ----------------------------------------------------------
    // 11. Retorno compatível com o sistema atual
    // ----------------------------------------------------------

    return {

        id:
            data.order_id,

        numero:
            numero,

        total:
            Number(
                data.total || 0
            ),

        subtotal:
            Number(
                data.subtotal || 0
            ),

        frete:
            Number(
                data.frete || 0
            ),

        desconto:
            Number(
                data.desconto || 0
            ),

        parcelas:
            Number(
                data.parcelas || 1
            ),

        checkout_id:
            data.checkout_id || null,

        duplicado:
            data.duplicado === true,

        status:
            'aguardando'

    };

}


/* ============================================================
   BUSCAR PEDIDO
   ============================================================ */

export async function buscarPedido(id) {

    if (!id) {
        throw new Error('ID do pedido não informado.');
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
            'Erro ao buscar pedido:',
            error
        );

        throw new Error(
            error.message ||
            'Não foi possível carregar o pedido.'
        );
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

        throw new Error(
            authError.message ||
            'Não foi possível verificar o usuário.'
        );
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
            'Erro ao listar pedidos:',
            error
        );

        throw new Error(
            error.message ||
            'Não foi possível carregar seus pedidos.'
        );
    }


    return data || [];

}
