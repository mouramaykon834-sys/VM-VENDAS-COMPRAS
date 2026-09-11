// =============================================================
// VOLTAR AO TOPO — VM VENDAS E COMPRAS
// =============================================================

export function inicializarVoltarTopo() {
  // Evita duplicação
  if (document.getElementById('btn-voltar-topo')) return;

  const btn = document.createElement('button');
  btn.id = 'btn-voltar-topo';
  btn.title = 'Voltar ao topo';
  btn.setAttribute('aria-label', 'Voltar ao topo');
  btn.innerHTML =
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<polyline points="18 15 12 9 6 15"></polyline>' +
    '</svg>';

  btn.style.cssText =
    'position:fixed;bottom:24px;right:24px;z-index:9998;' +
    'width:48px;height:48px;border-radius:50%;' +
    'background:#0ea5e9;color:#fff;border:none;' +
    'box-shadow:0 4px 16px rgba(14,165,233,.4);' +
    'cursor:pointer;display:none;align-items:center;justify-content:center;' +
    'transition:opacity .2s, transform .2s, filter .15s;' +
    '-webkit-tap-highlight-color:transparent;';

  // Aplica cor da loja se existir
  try {
    const corPrincipal = getComputedStyle(document.documentElement).getPropertyValue('--cor-principal');
    if (corPrincipal && corPrincipal.trim()) {
      btn.style.background = corPrincipal.trim();
    }
  } catch (e) {}

  btn.onmouseenter = function() { btn.style.filter = 'brightness(1.1)'; };
  btn.onmouseleave = function() { btn.style.filter = ''; };
  btn.onclick = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  document.body.appendChild(btn);

  // Mostra/some conforme scroll
  let visivel = false;

  function atualizar() {
    const deveMostrar = window.scrollY > 400;
    if (deveMostrar && !visivel) {
      visivel = true;
      btn.style.display = 'flex';
      requestAnimationFrame(function() {
        btn.style.opacity = '1';
        btn.style.transform = 'translateY(0)';
      });
    } else if (!deveMostrar && visivel) {
      visivel = false;
      btn.style.opacity = '0';
      btn.style.transform = 'translateY(20px)';
      setTimeout(function() {
        if (!visivel) btn.style.display = 'none';
      }, 200);
    }
  }

  // Estado inicial
  btn.style.opacity = '0';
  btn.style.transform = 'translateY(20px)';

  window.addEventListener('scroll', atualizar, { passive: true });
  atualizar();
}