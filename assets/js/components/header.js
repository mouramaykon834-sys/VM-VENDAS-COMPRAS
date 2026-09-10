/* -------------------------------------------------------------
   BOTÃO ADMIN NO HEADER (só aparece para administradores)
   ------------------------------------------------------------- */
.cabecalho__acao--admin {
  background: linear-gradient(135deg, var(--cor-principal), #0284c7);
  color: #fff !important;
  padding: 8px 14px;
  border-radius: 8px;
  font-weight: 600;
  margin-right: 6px;
}
.cabecalho__acao--admin:hover {
  filter: brightness(1.1);
  background: linear-gradient(135deg, var(--cor-principal), #0284c7);
  color: #fff !important;
  text-decoration: none;
}
.cabecalho__acao--admin svg { stroke: #fff; }

/* Logo — tamanho controlado */
.cabecalho__logo img {
  height: 40px;
  width: auto;
  max-width: 180px;
  object-fit: contain;
  display: block;
}

/* -------------------------------------------------------------
   BOTÃO VOLTAR (usar em páginas internas)
   ------------------------------------------------------------- */
.btn-voltar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid var(--cor-borda);
  color: var(--cor-texto);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  margin-bottom: 16px;
  transition: all .15s;
}
.btn-voltar:hover {
  background: var(--cor-fundo-suave);
  color: var(--cor-principal);
  border-color: var(--cor-principal);
  text-decoration: none;
}
.btn-voltar::before {
  content: "←";
  font-size: 16px;
  line-height: 1;
}
