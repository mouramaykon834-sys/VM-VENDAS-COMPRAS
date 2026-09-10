// =============================================================
// COMPONENTE: FOOTER — VM VENDAS E COMPRAS
// =============================================================
// Gera o rodapé padrão em todas as páginas.
//
// Uso:
//   import { renderFooter } from './assets/js/components/footer.js';
//   await renderFooter();
// =============================================================

import { supabase } from '../supabase.js';

export async function renderFooter() {
  const el = document.getElementById('footer');
  if (!el) {
    console.warn('[footer.js] Elemento #footer não encontrado na página.');
    return;
  }

  // Tenta carregar dados da empresa (nome, telefone, whatsapp, etc.)
  let empresa = {};
  try {
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();
    if (data) empresa = data;
  } catch (_) { /* silencioso */ }

  const nome = empresa.nome_fantasia || empresa.nome_empresa || 'Minha Loja';
  const ano = new Date().getFullYear();

  const tel = empresa.telefone
    ? `<a href="tel:${empresa.telefone.replace(/\D/g, '')}">${empresa.telefone}</a>`
    : '';
  const zap = empresa.whatsapp
    ? `<a href="https://wa.me/${empresa.whatsapp.replace(/\D/g, '')}" target="_blank" rel="noopener">${empresa.whatsapp}</a>`
    : '';
  const mail = empresa.email
    ? `<a href="mailto:${empresa.email}">${empresa.email}</a>`
    : '';

  const enderecoLinhas = [
    empresa.endereco,
    [empresa.cidade, empresa.estado].filter(Boolean).join(' - '),
    empresa.cep
  ].filter(Boolean).join('<br>');

  el.innerHTML = `
    <footer class="rodape">
      <div class="container">
        <div class="rodape__grid">
          <div>
            <div class="rodape__titulo">${nome}</div>
            <p style="max-width: 300px;">
              ${empresa.descricao || 'Loja virtual especializada em vendas e compras de produtos.'}
            </p>
          </div>

          <div>
            <div class="rodape__titulo">Loja</div>
            <nav class="rodape__lista">
              <a href="./index.html">Início</a>
              <a href="./produtos.html">Produtos</a>
              <a href="./favoritos.html">Favoritos</a>
              <a href="./carrinho.html">Carrinho</a>
            </nav>
          </div>

          <div>
            <div class="rodape__titulo">Minha conta</div>
            <nav class="rodape__lista">
              <a href="./login.html">Entrar</a>
              <a href="./cadastro.html">Criar conta</a>
              <a href="./pedidos.html">Meus pedidos</a>
              <a href="./propostas.html">Minhas propostas</a>
              <a href="./chat.html">Mensagens</a>
            </nav>
          </div>

          <div>
            <div class="rodape__titulo">Contato</div>
            <nav class="rodape__lista">
              ${tel}
              ${zap}
              ${mail}
            </nav>
            ${enderecoLinhas ? `<p class="mt-3 texto-xs">${enderecoLinhas}</p>` : ''}
            ${empresa.horario ? `<p class="mt-2 texto-xs">${empresa.horario}</p>` : ''}
          </div>
        </div>

        <div class="rodape__base">
          <span>© ${ano} ${nome}. Todos os direitos reservados.</span>
          <span>
            <a href="#" style="color: #94a3b8; margin-right: 12px;">Política de Privacidade</a>
            <a href="#" style="color: #94a3b8;">Termos de Uso</a>
          </span>
        </div>
      </div>
    </footer>
  `;
}