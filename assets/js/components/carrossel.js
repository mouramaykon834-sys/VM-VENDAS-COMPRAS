// =============================================================
// CARROSSEL DA HOME — VM VENDAS E COMPRAS
// =============================================================
// Lê os slides da coluna banners_home (visual_settings).
// Se não houver slides, NÃO faz nada (a home usa o banner padrão).
// =============================================================

import { supabase } from '../supabase.js';

export async function iniciarCarrossel() {
  const container = document.getElementById('home-carrossel');
  if (!container) return;

  let slides = [];
  let config = {
    autoplay_segundos: 5,
    mostrar_setas: true,
    mostrar_bolinhas: true,
    pausar_no_hover: true,
    permitir_swipe: true
  };

  try {
    const r = await Promise.race([
      supabase
        .from('visual_settings')
        .select('banners_home, carrossel_config')
        .eq('id', 1)
        .maybeSingle(),
      new Promise(function(_, rej) {
        setTimeout(function() { rej(new Error('timeout')); }, 5000);
      })
    ]);

    if (r && r.data) {
      slides = Array.isArray(r.data.banners_home) ? r.data.banners_home : [];
      config = Object.assign(config, r.data.carrossel_config || {});
    }
  } catch (e) {
    console.warn('[carrossel] erro ao carregar:', e);
    return;
  }

  // Filtra slides ativos e ordena
  slides = slides
    .filter(function(s) { return s && s.ativo !== false; })
    .sort(function(a, b) { return (a.ordem || 0) - (b.ordem || 0); });

  // Se não há slides, mantém o banner padrão que está no HTML
  if (!slides.length) {
    return;
  }

  // Marca o container como ativo (o CSS troca o estilo)
  container.classList.add('carrossel--ativo');

  // Esconde o banner padrão
  const bannerPadrao = document.getElementById('banner');
  if (bannerPadrao) bannerPadrao.style.display = 'none';

  // Constrói o carrossel
  let indiceAtual = 0;
  let timer = null;
  let pausado = false;

  const autoplayMs = Math.max(2, Number(config.autoplay_segundos) || 5) * 1000;

  // HTML dos slides
  const slidesHTML = slides.map(function(s, i) {
    const bg = s.imagem_url
      ? 'style="background-image: linear-gradient(rgba(15,23,42,.35), rgba(15,23,42,.55)), url(' + escapeAttr(s.imagem_url) + '); background-size: cover; background-position: center;"'
      : '';

    const botaoHTML = (s.texto_botao && s.link_botao)
      ? '<a href="' + escapeAttr(s.link_botao) + '" class="carrossel__botao">' +
          escapeHtml(s.texto_botao) +
        '</a>'
      : '';

    return '<div class="carrossel__slide' + (i === 0 ? ' ativo' : '') + '" data-idx="' + i + '" ' + bg + '>' +
      '<div class="carrossel__conteudo">' +
        (s.titulo ? '<h2 class="carrossel__titulo">' + escapeHtml(s.titulo) + '</h2>' : '') +
        (s.subtitulo ? '<p class="carrossel__subtitulo">' + escapeHtml(s.subtitulo) + '</p>' : '') +
        botaoHTML +
      '</div>' +
    '</div>';
  }).join('');

  // Setas
  const setasHTML = (config.mostrar_setas && slides.length > 1)
    ? '<button type="button" class="carrossel__seta carrossel__seta--prev" aria-label="Anterior">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>' +
      '</button>' +
      '<button type="button" class="carrossel__seta carrossel__seta--next" aria-label="Próximo">' +
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
      '</button>'
    : '';

  // Bolinhas
  const bolinhasHTML = (config.mostrar_bolinhas && slides.length > 1)
    ? '<div class="carrossel__bolinhas">' +
        slides.map(function(_, i) {
          return '<button type="button" class="carrossel__bolinha' + (i === 0 ? ' ativa' : '') + '" data-idx="' + i + '" aria-label="Ir para slide ' + (i + 1) + '"></button>';
        }).join('') +
      '</div>'
    : '';

  container.innerHTML =
    '<div class="carrossel__track">' + slidesHTML + '</div>' +
    setasHTML +
    bolinhasHTML;

  // Referências
  const todosSlides = container.querySelectorAll('.carrossel__slide');
  const todasBolinhas = container.querySelectorAll('.carrossel__bolinha');
  const btnPrev = container.querySelector('.carrossel__seta--prev');
  const btnNext = container.querySelector('.carrossel__seta--next');

  // Ir para um slide
  function irPara(novo) {
    if (novo < 0) novo = slides.length - 1;
    if (novo >= slides.length) novo = 0;

    todosSlides.forEach(function(s, i) {
      s.classList.toggle('ativo', i === novo);
    });
    todasBolinhas.forEach(function(b, i) {
      b.classList.toggle('ativa', i === novo);
    });

    indiceAtual = novo;
  }

  // Autoplay
  function iniciarAutoplay() {
    if (slides.length <= 1) return;
    pararAutoplay();
    timer = setInterval(function() {
      if (!pausado) irPara(indiceAtual + 1);
    }, autoplayMs);
  }

  function pararAutoplay() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  // Setas
  if (btnPrev) {
    btnPrev.onclick = function() {
      irPara(indiceAtual - 1);
      iniciarAutoplay();
    };
  }
  if (btnNext) {
    btnNext.onclick = function() {
      irPara(indiceAtual + 1);
      iniciarAutoplay();
    };
  }

  // Bolinhas
  todasBolinhas.forEach(function(b) {
    b.onclick = function() {
      irPara(Number(b.dataset.idx) || 0);
      iniciarAutoplay();
    };
  });

  // Pausar no hover
  if (config.pausar_no_hover) {
    container.addEventListener('mouseenter', function() {
      pausado = true;
    });
    container.addEventListener('mouseleave', function() {
      pausado = false;
    });
  }

  // Swipe (mobile)
  if (config.permitir_swipe) {
    let touchX = null;
    container.addEventListener('touchstart', function(e) {
      touchX = e.touches[0].clientX;
    }, { passive: true });

    container.addEventListener('touchend', function(e) {
      if (touchX == null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) {
        if (dx < 0) irPara(indiceAtual + 1);
        else irPara(indiceAtual - 1);
        iniciarAutoplay();
      }
      touchX = null;
    }, { passive: true });
  }

  // Teclado (acessibilidade)
  container.setAttribute('tabindex', '0');
  container.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowLeft') { irPara(indiceAtual - 1); iniciarAutoplay(); }
    if (e.key === 'ArrowRight') { irPara(indiceAtual + 1); iniciarAutoplay(); }
  });

  // Inicia autoplay
  iniciarAutoplay();
}

/* ============================================================
   HELPERS
   ============================================================ */
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

function escapeAttr(s) {
  return escapeHtml(s);
}
