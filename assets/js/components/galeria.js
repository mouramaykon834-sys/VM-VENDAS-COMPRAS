// =============================================================
// COMPONENTE: GALERIA FULLSCREEN — VM VENDAS E COMPRAS
// =============================================================
// Abre a imagem do produto em tela cheia, com navegação entre
// as fotos (setas, swipe, teclado).
// =============================================================

// -------------------------------------------------------------
// Abre a galeria fullscreen
// -------------------------------------------------------------
// imagens: array de URLs (strings)
// indiceInicial: número (0 por padrão)
// -------------------------------------------------------------
export function abrirGaleria(imagens, indiceInicial) {
  if (!imagens || !imagens.length) return;

  const urls = imagens.filter(function(u) { return u; });
  if (!urls.length) return;

  let indice = (typeof indiceInicial === 'number' && indiceInicial >= 0 && indiceInicial < urls.length) ? indiceInicial : 0;

  // Cria overlay
  const overlay = document.createElement('div');
  overlay.id = 'galeria-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.95);display:flex;flex-direction:column;align-items:center;justify-content:center;user-select:none;-webkit-tap-highlight-color:transparent;';

  overlay.innerHTML =
    // Botão fechar
    '<button id="gal-x" aria-label="Fechar" style="position:absolute;top:16px;right:16px;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;border:none;font-size:26px;line-height:1;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;">×</button>' +

    // Contador
    '<div id="gal-contador" style="position:absolute;top:22px;left:50%;transform:translateX(-50%);color:#fff;font-size:14px;font-weight:600;background:rgba(255,255,255,.15);padding:6px 14px;border-radius:9999px;z-index:2;"></div>' +

    // Área da imagem
    '<div id="gal-area" style="flex:1;width:100%;display:flex;align-items:center;justify-content:center;padding:60px 20px 80px;overflow:hidden;position:relative;">' +
      '<img id="gal-img" src="" alt="" style="max-width:100%;max-height:100%;object-fit:contain;transition:transform .2s;user-select:none;-webkit-user-drag:none;" draggable="false" />' +
    '</div>' +

    // Seta esquerda
    '<button id="gal-prev" aria-label="Anterior" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;border:none;font-size:24px;line-height:1;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;">‹</button>' +

    // Seta direita
    '<button id="gal-next" aria-label="Próxima" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;border:none;font-size:24px;line-height:1;cursor:pointer;z-index:2;display:flex;align-items:center;justify-content:center;">›</button>' +

    // Miniaturas (rodapé)
    '<div id="gal-minis" style="position:absolute;bottom:16px;left:50%;transform:translateX(-50%);display:flex;gap:8px;padding:8px 14px;background:rgba(255,255,255,.1);border-radius:9999px;max-width:calc(100% - 32px);overflow-x:auto;z-index:2;"></div>';

  document.body.appendChild(overlay);

  // Esconde botões se só tiver 1 imagem
  if (urls.length <= 1) {
    overlay.querySelector('#gal-prev').style.display = 'none';
    overlay.querySelector('#gal-next').style.display = 'none';
    overlay.querySelector('#gal-contador').style.display = 'none';
  }

  // Renderiza miniaturas
  const minis = overlay.querySelector('#gal-minis');
  if (urls.length > 1) {
    minis.innerHTML = urls.map(function(url, i) {
      return '<button data-mini="' + i + '" style="flex-shrink:0;width:48px;height:48px;border-radius:6px;overflow:hidden;border:2px solid transparent;padding:0;background:#333;cursor:pointer;transition:border-color .15s;">' +
        '<img src="' + url + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" draggable="false" />' +
      '</button>';
    }).join('');
  } else {
    minis.style.display = 'none';
  }

  // Atualiza a tela
  function atualizar() {
    const img = overlay.querySelector('#gal-img');
    img.src = urls[indice];

    const cont = overlay.querySelector('#gal-contador');
    if (urls.length > 1) cont.textContent = (indice + 1) + ' / ' + urls.length;

    minis.querySelectorAll('[data-mini]').forEach(function(b) {
      const i = Number(b.dataset.mini);
      b.style.borderColor = (i === indice) ? '#0ea5e9' : 'transparent';
    });
  }

  function irPara(novo) {
    indice = (novo + urls.length) % urls.length;
    atualizar();
  }

  function proxima() { if (urls.length > 1) irPara(indice + 1); }
  function anterior() { if (urls.length > 1) irPara(indice - 1); }

  // Eventos
  overlay.querySelector('#gal-x').onclick = fechar;
  overlay.querySelector('#gal-prev').onclick = function(e) { e.stopPropagation(); anterior(); };
  overlay.querySelector('#gal-next').onclick = function(e) { e.stopPropagation(); proxima(); };

  minis.querySelectorAll('[data-mini]').forEach(function(b) {
    b.onclick = function(e) {
      e.stopPropagation();
      irPara(Number(b.dataset.mini));
    };
  });

  // Clicar no fundo fecha
  overlay.onclick = function(e) {
    if (e.target === overlay || e.target.id === 'gal-area') fechar();
  };

  // Teclado
  function onKey(e) {
    if (e.key === 'Escape') { fechar(); }
    else if (e.key === 'ArrowRight') { proxima(); }
    else if (e.key === 'ArrowLeft') { anterior(); }
  }
  document.addEventListener('keydown', onKey);

  // Swipe (mobile)
  let touchX = null;
  overlay.querySelector('#gal-area').addEventListener('touchstart', function(e) {
    touchX = e.touches[0].clientX;
  }, { passive: true });

  overlay.querySelector('#gal-area').addEventListener('touchend', function(e) {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 60) {
      if (dx < 0) proxima();
      else anterior();
    }
    touchX = null;
  }, { passive: true });

  // Fecha e limpa
  function fechar() {
    document.removeEventListener('keydown', onKey);
    overlay.remove();
    // Impede que a página "pule" ao fechar
    document.body.style.overflow = '';
  }

  // Impede scroll da página enquanto aberto
  document.body.style.overflow = 'hidden';

  // Primeira renderização
  atualizar();
}
