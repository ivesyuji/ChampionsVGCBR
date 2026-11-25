// Tela "Composições": duplas que mais aparecem juntas e times campeões dos torneios brasileiros.
window.App = window.App || {};
App.telas = App.telas || {};
App.telas.composicoes = (function () {
  const { el, pct, dataBR, retrato } = App.ui;
  const D = App.dados;
  const C = App.comum;
  const E = D.E;

  function membros(chave) {
    return chave.split("|").map((id) => {
      const nome = C.nomeNoMeta(id);
      return el("span", { class: "membro" }, retrato(D.tiposDoTorneio(id), nome, "mini", D.spriteDoTorneio(id)), C.linkPokemon(id, nome));
    });
  }

  function cartaoTime({ torneio, jogador, time }) {
    const r = jogador.record || {};
    return el("article", { class: "time" },
      el("header", {},
        el("h3", {}, el("a", { href: API.Limitless.linkTorneio(torneio.id), target: "_blank", rel: "noopener" }, torneio.name)),
        el("p", {}, `${torneio.organizador} · ${dataBR(torneio.date)} · ${torneio.players} jogadores · campanha ${r.wins || 0}-${r.losses || 0}${r.ties ? "-" + r.ties : ""}`)),
      el("ul", {}, time.map((m) => el("li", {},
        retrato(D.tiposDoTorneio(m.id), m.name, "mini", D.spriteDoTorneio(m.id)),
        el("div", {}, C.linkPokemon(m.id, m.name), el("small", {}, [m.item, m.ability].filter(Boolean).join(" · ")))))));
  }

  return async function telaComposicoes(montar) {
    await C.garantirMeta(montar);
    const M = E.meta;
    const linhaNucleo = ([chave, qtd]) => el("li", {}, el("div", { class: "nucleo" }, membros(chave)), el("b", {}, pct(qtd / M.totalTimes)));

    montar(
      el("header", { class: "cabecalho" },
        el("h1", {}, "Composições"),
        el("p", { class: "lead" }, "Quais Pokémon aparecem juntos nos times e como eram os times campeões dos torneios brasileiros recentes.")),
      C.controlesMeta(), C.resumoMeta(),
      el("section", { class: "bloco" }, el("h2", {}, "Duplas mais comuns"),
        el("p", { class: "dica" }, "% dos times que têm os dois Pokémon."),
        el("ol", { class: "nucleos" }, M.duplas.top(10).map(linhaNucleo))),
      el("section", {},
        el("h2", {}, "Times campeões"),
        M.campeoes.length ? el("div", { class: "times" }, M.campeoes.slice(0, 12).map(cartaoTime))
          : el("p", { class: "vazio" }, "Nenhum time campeão publicado nesse recorte.")));
  };
})();
