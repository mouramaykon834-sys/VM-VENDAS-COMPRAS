// assets/js/core/sanitize.js
// Sanitização central contra XSS. Importar em TODAS as páginas que injetam HTML dinâmico.

const MAPA_HTML = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
  '=': '&#61;',
  '/': '&#47;'
};

/**
 * Escapa texto para ser inserido com segurança dentro de HTML.
 * Converte & < > " ' ` = / em entidades.
 */
export function escapeHtml(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor).replace(/[&<>"'`=\/]/g, (c) => MAPA_HTML[c]);
}

/**
 * Escapa texto para uso em atributos HTML (mais restrito).
 * Bloqueia também espaços e caracteres de controle.
 */
export function escapeAttr(valor) {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .replace(/[^a-zA-Z0-9\-_.,:\/ ]/g, (c) => '&#' + c.charCodeAt(0) + ';')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Valida e sanitiza URLs. Bloqueia javascript:, data:, vbscript:.
 * Retorna '#' se a URL for suspeita.
 */
export function escapeUrl(url) {
  if (!url) return '#';
  const s = String(url).trim().toLowerCase();
  if (/^(javascript|data|vbscript|file):/i.test(s)) return '#';
  return String(url);
}

/**
 * Tagged template que escapa automaticamente interpolações.
 * Uso: safeHtml`<p>Olá ${nome}</p>`
 * Para inserir HTML confiável (ex.: ícone SVG), use rawHtml().
 */
export function safeHtml(strings, ...valores) {
  return strings.reduce((acc, str, i) => {
    if (i === 0) return str;
    const v = valores[i - 1];
    return acc + (v && v.__raw === true ? v.html : escapeHtml(v)) + str;
  }, '');
}

/**
 * Marca uma string como "HTML confiável" (não será escapada).
 * Usar APENAS com conteúdo estático do próprio código.
 */
export function rawHtml(html) {
  return { __raw: true, html: String(html) };
}

/**
 * Substitui innerHTML com sanitização. Aceita string já segura
 * (via safeHtml/rawHtml) ou texto puro.
 */
export function setSafeHtml(el, conteudo) {
  if (!el) return;
  if (conteudo && conteudo.__raw === true) {
    el.innerHTML = conteudo.html;
  } else {
    el.innerHTML = escapeHtml(conteudo);
  }
}

/**
 * Cria elemento de texto (alternativa mais segura a innerHTML).
 */
export function texto(el, valor) {
  if (!el) return;
  el.textContent = valor == null ? '' : String(valor);
}

/**
 * Sanitiza um objeto inteiro (útil para logs/auditoria).
 */
export function escapeObjeto(obj) {
  if (obj === null || typeof obj !== 'object') return escapeHtml(obj);
  if (Array.isArray(obj)) return obj.map(escapeObjeto);
  const out = {};
  for (const k of Object.keys(obj)) out[k] = escapeObjeto(obj[k]);
  return out;
}

// Export default para facilitar import
export default { escapeHtml, escapeAttr, escapeUrl, safeHtml, rawHtml, setSafeHtml, texto, escapeObjeto };
