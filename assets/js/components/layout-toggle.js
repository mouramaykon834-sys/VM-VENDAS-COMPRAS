// =============================================================
// LAYOUT TOGGLE — Desktop / Mobile forçado
// =============================================================

const KEY = 'vm-modo-layout';

// -------------------------------------------------------------
// Aplica o modo salvo (chamado em toda página)
// -------------------------------------------------------------
export function aplicarModoSalvo() {
  try {
    const modo = localStorage.getItem(KEY);
    if (modo === 'mobile' || modo === 'desktop') {
      document.documentElement.setAttribute('data-modo', modo);
    }
  } catch (e) {}
}

// -------------------------------------------------------------
// Retorna o modo atual: 'auto' | 'mobile' | 'desktop'
// -------------------------------------------------------------
export function modoAtual() {
  const html = document.documentElement;
  if (html.getAttribute('data-modo') === 'mobile') return 'mobile';
  if (html.getAttribute('data-modo') === 'desktop') return 'desktop';
  return 'auto';
}

// -------------------------------------------------------------
// Ciclo de modos: auto → mobile → desktop → auto
// -------------------------------------------------------------
export function alternarModo() {
  const atual = modoAtual();
  const html = document.documentElement;
  let novo;

  if (atual === 'auto') novo = 'mobile';
  else if (atual === 'mobile') novo = 'desktop';
  else novo = 'auto';

  if (novo === 'auto') {
    html.removeAttribute('data-modo');
    try { localStorage.removeItem(KEY); } catch (e) {}
  } else {
    html.setAttribute('data-modo', novo);
    try { localStorage.setItem(KEY, novo); } catch (e) {}
  }

  return novo;
}

// -------------------------------------------------------------
// Ícone SVG para o botão
// -------------------------------------------------------------
export function iconeModo(modo) {
  if (modo === 'mobile') {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';
  }
  if (modo === 'desktop') {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
  }
  return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
}

export function tituloModo(modo) {
  if (modo === 'mobile') return 'Modo mobile forçado (clique para desktop)';
  if (modo === 'desktop') return 'Modo desktop forçado (clique para automático)';
  return 'Modo automático (clique para forçar mobile)';
}
