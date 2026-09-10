// =============================================================
// COMPONENTE: FOOTER — VM VENDAS E COMPRAS
// =============================================================
import { carregarEmpresa } from '../services/company.service.js';

export async function renderFooter() {
  const el = document.getElementById('footer');
  if (!el) return;

  const empresa = await carregarEmpresa();
  const nome = empresa.nome_fantasia || empresa.nome_empresa || 'Minha Loja';
  const ano = new Date().getFullYear();

  const tel = empresa.telefone ? `<a href="tel:${limpar(empresa.telefone)}">${esc(empresa.telefone)}</a>` : '';
  const zap = empresa.whatsapp ? `<a href="https://wa.me/55${limpar(empresa.whatsapp)}" target="_blank" rel="noopener">${esc(empresa.whatsapp)}</a>` : '';
  const mail = empresa.email ? `<a href="mailto:${esc(empresa.email)}">${esc(empresa.email)}</a>` : '';

  const linhasEndereco = [
    empresa.endereco,
    [empresa.cidade, empresa.estado].filter(Boolean).join(' - '),
    empresa.cep
  ].filter(Boolean).join('<br>');

  el.innerHTML = `
    <footer class="rodape">
      <div class="container">
        <div class="rodape__grid">
          <div>
            <div class="rodape__titulo">${esc(nome)}</div>
            <p style="max-width:300px;">${esc(empresa.descricao || 'Loja virtual especializada em vendas e compras de produtos.')}</p>
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
            <nav class="rodape__lista">${tel}${zap}${mail}</nav>
            ${linhasEndereco ? `<p class="mt-3 texto-xs">${linhasEndereco}</p>` : ''}
            ${empresa.horario ? `<p class="mt-2 texto-xs">${esc(empresa.horario)}</p>` : ''}
          </div>
        </div>
        <div class="rodape__base">
          <span>© ${ano} ${esc(nome)}. Todos os direitos reservados.</span>
          <span>
            <a href="#" style="color:#94a3b8;margin-right:12px;">Política de Privacidade</a>
            <a href="#" style="color:#94a3b8;">Termos de Uso</a>
          </span>
        </div>
      </div>
    </footer>
  `;
}

function limpar(s) { return String(s || '').replace(/\D/g, ''); }
function esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}