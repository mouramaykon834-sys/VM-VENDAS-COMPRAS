// =============================================================
// ADMIN GUARD — VM VENDAS E COMPRAS
// =============================================================
// Bloqueia acesso de não-admins a QUALQUER página /admin/.
// Deve ser importado e chamado no início de cada página admin.
//
// Uso:
//   import { exigirAdmin } from '../assets/js/core/admin-guard.js';
//   await exigirAdmin();
//
// Comportamento:
//   - Sem sessão → redireciona pra login
//   - Com sessão mas sem role admin → mostra tela de bloqueio
//   - Com sessão e role admin → continua normalmente
// =============================================================

export async function exigirAdmin() {
  // 1. Carrega Supabase
  const { supabase } = await import('../supabase.js');

  // 2. Verifica sessão
  const sessao = await supabase.auth.getSession();

  if (!sessao.data || !sessao.data.session) {
    // Sem login → manda pro login
    const destino = '../login.html?redirect=' +
      encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = destino;
    throw new Error('NAO_AUTENTICADO');
  }

  // 3. Verifica role
  const perfil = await supabase
    .from('profiles')
    .select('role, nome, email')
    .eq('id', sessao.data.session.user.id)
    .maybeSingle();

  const role = perfil.data ? perfil.data.role : null;

  if (role !== 'admin') {
    // Não é admin → mostra tela de bloqueio
    mostrarBloqueio();
    throw new Error('NAO_E_ADMIN');
  }

  // É admin ✅
  return perfil.data;
}

// -------------------------------------------------------------
// Tela de bloqueio limpa (substitui o body inteiro)
// -------------------------------------------------------------
function mostrarBloqueio() {
  // Remove tudo e coloca uma tela limpa
  document.documentElement.innerHTML = `
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="robots" content="noindex, nofollow" />
      <title>Acesso restrito</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: #f8fafc;
          color: #0f172a;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 40px 32px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        }
        .icone {
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          border-radius: 20px;
          background: #fee2e2;
          color: #dc2626;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        h1 {
          font-size: 22px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 8px;
        }
        p {
          color: #64748b;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .acoes {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        a {
          display: block;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all .15s;
        }
        .btn-voltar {
          background: #0ea5e9;
          color: #fff;
        }
        .btn-voltar:hover {
          background: #0284c7;
          color: #fff;
        }
        .btn-sair {
          background: #fff;
          color: #64748b;
          border: 1px solid #e2e8f0;
        }
        .btn-sair:hover {
          background: #f8fafc;
          color: #0f172a;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icone">🚫</div>
        <h1>Acesso restrito</h1>
        <p>
          Esta área é exclusiva para administradores da loja.
          Sua conta não tem permissão para acessar o painel administrativo.
        </p>
        <div class="acoes">
          <a href="../index.html" class="btn-voltar">← Voltar para a loja</a>
          <a href="#" class="btn-sair" id="btn-sair">Sair da conta</a>
        </div>
      </div>
      <script type="module">
        document.getElementById('btn-sair').onclick = async (e) => {
          e.preventDefault();
          const { supabase } = await import('../assets/js/supabase.js');
          await supabase.auth.signOut();
          window.location.href = '../login.html';
        };
      </script>
    </body>
  `;
}
