// Tela "Pokédex": lista dos Pokémon do Pokémon Champions, com busca e filtro por tipo.
window.App = window.App || {};
App.telas = App.telas || {};
App.telas.pokedex = (function () {
  const { TIPOS, el, formatarNome, badgeTipo, retrato, carregando } = App.ui;
  const D = App.dados;
  const E = D.E;

  const filtros = { busca: "", tipo: "" }; // continuam valendo ao voltar para a Pokédex

  return async function telaPokedex(montar) {
    if (!E.dex) { montar(carregando("Buscando a Pokédex do Pokémon Champions na PokeAPI...")); await D.carregarBase(); }

    const grade = el("div", { class: "grade" });
    const contagem = el("p", { class: "contagem" });
    const desenhar = () => {
      const lista = E.dex.filter((d) =>
        (!filtros.busca || d.especie.replace(/-/g, " ").includes(filtros.busca) || String(d.numero) === filtros.busca) &&
        (!filtros.tipo || d.tipos.includes(filtros.tipo)));
      contagem.textContent = `${lista.length} de ${E.dex.length} Pokémon`;
      grade.replaceChildren(...lista.map((d) => el("a", { class: "carta", href: `#/pokemon/${d.especie}` },
        retrato(d.tipos, formatarNome(d.especie), "", D.spriteDe(d.pokemon)),
        el("div", {},
          el("span", { class: "numero" }, "#" + String(d.numero).padStart(3, "0")),
          el("strong", {}, formatarNome(d.especie)),
          el("div", { class: "tipos" }, d.tipos.map(badgeTipo))))));
      if (!lista.length) grade.append(el("p", { class: "vazio" }, "Nenhum Pokémon encontrado."));
    };

    const busca = el("input", { type: "search", placeholder: "Buscar por nome ou número", "aria-label": "Buscar", value: filtros.busca,
      oninput: (e) => { filtros.busca = e.target.value.trim().toLowerCase(); desenhar(); } });
    const tipo = el("select", { "aria-label": "Filtrar por tipo", onchange: (e) => { filtros.tipo = e.target.value; desenhar(); } },
      el("option", { value: "" }, "Todos os tipos"),
      Object.keys(TIPOS).sort((a, b) => TIPOS[a][0].localeCompare(TIPOS[b][0]))
        .map((t) => el("option", { value: t, selected: t === filtros.tipo }, TIPOS[t][0])));

    desenhar();
    montar(
      el("header", { class: "cabecalho" },
        el("h1", {}, "Pokédex do Pokémon Champions"),
        el("p", { class: "lead" }, "Todos os Pokémon disponíveis no jogo, com status, tipos e golpes vindos da PokeAPI.")),
      el("div", { class: "filtros" }, busca, tipo, contagem),
      grade);
  };
})();
