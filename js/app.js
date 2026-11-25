// Ponto de entrada: rotas (#/...) e troca de telas.
// Cada tela fica em js/telas/; dados em js/dados.js; peças de interface em js/ui.js.
window.App = window.App || {};
(function () {
  const { $, erro } = App.ui;
  const D = App.dados;
  const T = App.telas;

  // [padrão do endereço, tela, item do menu marcado]
  const rotas = [
    [/^#?\/?(pokedex)?$/, T.pokedex, "pokedex"],
    [/^#\/pokemon\/([a-z0-9-]+)(?:\?forma=([a-z0-9-]+))?$/, T.pokemon, "pokedex"],
    [/^#\/top$/, T.top, "top"],
    [/^#\/composicoes$/, T.composicoes, "composicoes"],
    [/^#\/sobre$/, T.sobre, "sobre"],
  ];

  let renderAtual = 0;
  async function navegar() {
    const hash = location.hash || "#/pokedex";
    const [re, tela, menu] = rotas.find(([re]) => re.test(hash)) || rotas[0];
    const params = hash.match(re) || [];
    document.querySelectorAll(".menu a").forEach((a) => a.toggleAttribute("aria-current", a.dataset.menu === menu));
    const main = $("#conteudo");
    const meu = ++renderAtual; // ignora respostas de telas que o usuário já deixou
    const montar = (...filhos) => {
      if (meu === renderAtual) main.replaceChildren(...filhos.flat(Infinity).filter((f) => f != null && f !== false));
    };
    try {
      await tela(montar, ...params.slice(1));
    } catch (e) {
      console.error(e);
      montar(erro(D.mensagemErro(e), navegar));
    }
    if (meu === renderAtual) window.scrollTo(0, 0);
  }

  App.navegar = navegar;
  window.addEventListener("hashchange", navegar);
  navegar();
})();
