// =============================================================
// LOGGER — VM VENDAS E COMPRAS
// =============================================================
// Sistema de log centralizado.
//
// Em desenvolvimento (localhost / 127.0.0.1):
//   - info, warn e error aparecem no console
//
// Em produção (GitHub Pages):
//   - apenas error aparece no console
//   - info e warn são silenciados
//
// Uso:
//   import { log } from '../core/logger.js';
//   log.info('[produtos] carregando...', dados);
//   log.error('[produtos] erro:', erro);
// =============================================================

const DEBUG = (() => {
  try {
    const h = location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '' || h.startsWith('192.168.');
  } catch {
    return false;
  }
})();

function formatarPrefixo(prefixo) {
  return prefixo ? `[${prefixo}]` : '';
}

export const log = {
  /**
   * Log de informação — só aparece em desenvolvimento.
   * Use para debug, acompanhamento de fluxo, etc.
   */
  info(prefixo, ...args) {
    if (!DEBUG) return;
    if (args.length === 0) {
      console.log(prefixo);
    } else {
      console.log(formatarPrefixo(prefixo), ...args);
    }
  },

  /**
   * Log de aviso — só aparece em desenvolvimento.
   * Use para situações inesperadas mas não críticas.
   */
  warn(prefixo, ...args) {
    if (!DEBUG) return;
    if (args.length === 0) {
      console.warn(prefixo);
    } else {
      console.warn(formatarPrefixo(prefixo), ...args);
    }
  },

  /**
   * Log de erro — SEMPRE aparece (dev e produção).
   * Use para erros reais que precisam ser investigados.
   */
  error(prefixo, ...args) {
    if (args.length === 0) {
      console.error(prefixo);
    } else {
      console.error(formatarPrefixo(prefixo), ...args);
    }
  },

  /**
   * Retorna se está em modo debug (útil para condicionais).
   */
  isDebug() {
    return DEBUG;
  }
};

export default log;
