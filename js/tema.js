// Botão de modo claro/escuro.
// Sem escolha salva, o site segue o tema do sistema. Ao clicar, a escolha fica no localStorage
// e é aplicada logo no carregamento (script no <head> do index.html), para a página não piscar.
(function () {
  const CHAVE = "championsvgcbr:tema";
  const raiz = document.documentElement;
  const botao = document.getElementById("botao-tema");
  const sistemaEscuro = window.matchMedia("(prefers-color-scheme: dark)");

  const SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const LUA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

  const temaAtual = () => raiz.dataset.theme || (sistemaEscuro.matches ? "dark" : "light");

  // No escuro mostra o sol (clicar volta ao claro); no claro mostra a lua.
  function atualizarBotao() {
    const escuro = temaAtual() === "dark";
    botao.innerHTML = escuro ? SOL : LUA;
    const acao = escuro ? "Ativar modo claro" : "Ativar modo escuro";
    botao.setAttribute("aria-label", acao);
    botao.title = acao;
  }

  botao.addEventListener("click", () => {
    const novo = temaAtual() === "dark" ? "light" : "dark";
    raiz.dataset.theme = novo;
    try { localStorage.setItem(CHAVE, novo); } catch { /* sem armazenamento: vale só nesta visita */ }
    atualizarBotao();
  });

  // Se o sistema mudar de tema e a pessoa não escolheu nada, o ícone acompanha.
  sistemaEscuro.addEventListener("change", atualizarBotao);
  atualizarBotao();
})();
