// Tela "Top 10": os Pokémon mais usados nos torneios brasileiros, com itens, golpes, habilidade e parceiros.
window.App = window.App || {};
App.telas = App.telas || {};
App.telas.top = (function () {
  const { el, pct, badgeTipo, retrato } = App.ui;
  const D = App.dados;
  const C = App.comum;
  const E = D.E;

  const listaTop = (contador, total, n) => el("ul", { class: "ranking-mini" },
    contador.top(n).map(([nome, qtd]) => el("li", {}, el("span", {}, nome), el("b", {}, pct(qtd / total, 0)))));

  // Taxa de vitória de todos os times com o Pokémon, comparada com a média geral dos torneios.
  function rodapeVitoria(r) {
    if (r.partidas < C.PARTIDAS_MINIMAS) {
      return el("p", { class: "rodape-uso" }, `Taxa de vitória: amostra pequena (${r.partidas} partidas).`);
    }
    const dif = C.diferencaVitoria(r);
    return el("p", { class: "rodape-uso" },
      `Taxa de vitória dos times com ele: ${pct(r.taxaVitoria)} em ${r.partidas} partidas `,
      el("span", { class: "dif " + dif.classe, title: `Média geral: ${pct(E.meta.mediaVitoria)}` },
        `${dif.texto} (${pct(E.meta.mediaVitoria)})`));
  }

  function cartaoUso(r, posicao) {
    const tipos = D.tiposDoTorneio(r.id);
    return el("article", { class: "uso" },
      el("div", { class: "uso-topo" },
        el("span", { class: "posicao" }, posicao + "º"),
        retrato(tipos, r.nome, "", D.spriteDoTorneio(r.id)),
        el("div", { class: "uso-nome" },
          el("h3", {}, C.linkPokemon(r.id, r.nome)),
          el("div", { class: "tipos" }, tipos.map(badgeTipo))),
        el("div", { class: "uso-pct" },
          el("b", {}, pct(r.uso)), el("small", {}, `${r.times} times`),
          el("i", { class: "medidor", style: `--v:${Math.min(100, r.uso * 100)}%` }))),
      el("div", { class: "uso-detalhes" },
        el("div", {}, el("h4", {}, "Itens"), listaTop(r.itens, r.times, 3)),
        el("div", {}, el("h4", {}, "Golpes"), listaTop(r.golpes, r.times, 4)),
        el("div", {}, el("h4", {}, "Habilidade"), listaTop(r.habilidades, r.times, 2)),
        el("div", {}, el("h4", {}, "Parceiros"), el("ul", { class: "ranking-mini" },
          r.parceiros.top(3).map(([id, qtd]) => el("li", {},
            C.linkPokemon(id, C.nomeNoMeta(id)), el("b", {}, pct(qtd / r.times, 0))))))),
      rodapeVitoria(r));
  }

  return async function telaTop(montar) {
    await C.garantirMeta(montar);
    const r = E.meta.ranking;
    montar(
      el("header", { class: "cabecalho" },
        el("h1", {}, "Top 10 Pokémon nos torneios do Brasil"),
        el("p", { class: "lead" }, `Os Pokémon mais usados nos torneios brasileiros recentes de Pokémon Champions (VGC, formato ${API.Limitless.formato}), segundo a Limitless.`)),
      C.controlesMeta(), C.resumoMeta(),
      r.length ? r.slice(0, 10).map((x, i) => cartaoUso(x, i + 1)) : el("p", { class: "vazio" }, "Nenhum time encontrado."),
      r.length > 10 && el("section", { class: "bloco" },
        el("h2", {}, "Do 11º ao 30º"),
        el("ol", { class: "tabela-uso" }, r.slice(10, 30).map((x, i) =>
          el("li", {}, el("span", { class: "pos" }, i + 11 + "º"), retrato(D.tiposDoTorneio(x.id), x.nome, "mini", D.spriteDoTorneio(x.id)),
            C.linkPokemon(x.id, x.nome),
            el("span", { class: "barra-inline", style: `--v:${Math.min(100, (x.uso / r[0].uso) * 100)}%` }), el("b", {}, pct(x.uso)))))));
  };
})();
