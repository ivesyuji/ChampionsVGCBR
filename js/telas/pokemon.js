// Tela de um Pokémon: perfil, faixa "No meta brasileiro", status, naturezas, defesa, habilidades e golpes.
// Os dados da PokeAPI aparecem na hora; os de torneio chegam em segundo plano e completam a página.
window.App = window.App || {};
App.telas = App.telas || {};
App.telas.pokemon = (function () {
  const { TIPOS, STATS, el, formatarNome, pct, corStat, badgeTipo, retrato, carregando, erro, progresso } = App.ui;
  const D = App.dados;
  const C = App.comum;
  const E = D.E;

  // Naturezas (no Champions, "Stat Alignment"): status que sobe 10% e status que desce 10%.
  // As cinco neutras (Hardy, Docile, Serious, Bashful, Quirky) não mudam nada.
  const NATUREZAS = {
    Lonely: ["Atq", "Def"], Brave: ["Atq", "Vel"], Adamant: ["Atq", "AtE"], Naughty: ["Atq", "DfE"],
    Bold: ["Def", "Atq"], Relaxed: ["Def", "Vel"], Impish: ["Def", "AtE"], Lax: ["Def", "DfE"],
    Timid: ["Vel", "Atq"], Hasty: ["Vel", "Def"], Jolly: ["Vel", "AtE"], Naive: ["Vel", "DfE"],
    Modest: ["AtE", "Atq"], Mild: ["AtE", "Def"], Quiet: ["AtE", "Vel"], Rash: ["AtE", "DfE"],
    Calm: ["DfE", "Atq"], Gentle: ["DfE", "Def"], Sassy: ["DfE", "Vel"], Careful: ["DfE", "AtE"],
  };
  const CATEGORIAS = { physical: ["Físico", "fis"], special: ["Especial", "esp"], status: ["Status", "sta"] };
  const GOLPES_VISIVEIS = 8; // golpes fora do meta mostrados antes de "Mostrar os outros"

  // Entrada do ranking que corresponde à forma aberta (ex.: Arcanine e Arcanine de Hisui contam separado).
  function entradaDoMeta(pokemon, especie, ehFormaPadrao) {
    if (!E.meta) return null;
    return E.meta.ranking.find((r) => API.nomePokeAPI(r.id) === pokemon.nome) ||
      (ehFormaPadrao ? E.meta.ranking.find((r) => r.id === especie) : null) || null;
  }

  const barraMeta = (fracao) => el("span", { class: "barra-meta" },
    el("i", { style: `--v:${Math.round(fracao * 100)}%` }), `${pct(fracao, 0)} no meta`);

  // Multiplicador de dano de cada tipo atacante contra os tipos do Pokémon.
  function blocoDefesa(tiposAlvo) {
    const grupos = { "4×": [], "2×": [], "½×": [], "¼×": [], "0×": [] };
    for (const [atk, rel] of Object.entries(E.tipos.tabela)) {
      let m = 1;
      for (const t of tiposAlvo) m *= rel.nada.includes(t) ? 0 : rel.dobro.includes(t) ? 2 : rel.metade.includes(t) ? 0.5 : 1;
      const chave = { 4: "4×", 2: "2×", 0.5: "½×", 0.25: "¼×", 0: "0×" }[m];
      if (chave) grupos[chave].push(atk);
    }
    const rotulos = { "4×": "Muito fraco", "2×": "Fraco", "½×": "Resiste", "¼×": "Resiste muito", "0×": "Imune" };
    return el("dl", { class: "defesa" }, Object.entries(grupos).filter(([, l]) => l.length).map(([k, l]) => [
      el("dt", {}, el("b", {}, k), " ", rotulos[k]),
      el("dd", { class: "tipos" }, l.map(badgeTipo)),
    ]));
  }

  // Faixa "No meta brasileiro": posição, uso, taxa de vitória, itens (com sprite) e parceiros.
  function faixaMeta(r) {
    const posicao = E.meta.ranking.indexOf(r) + 1;
    const corte = E.opcoes.corte === Infinity ? "times" : E.opcoes.corte === 1 ? "times campeões" : `times do top ${E.opcoes.corte}`;
    let vitoria;
    if (r.partidas < C.PARTIDAS_MINIMAS) {
      vitoria = el("div", { class: "meta-vit" }, el("small", {}, "Taxa de vitória"), el("span", { class: "dica" }, "amostra pequena"));
    } else {
      const dif = C.diferencaVitoria(r);
      vitoria = el("div", { class: "meta-vit" },
        el("small", {}, "Taxa de vitória"),
        el("b", {}, pct(r.taxaVitoria)),
        el("span", { class: "dif " + dif.classe, title: `${r.partidas} partidas · média geral ${pct(E.meta.mediaVitoria)}` }, dif.texto));
    }
    return el("section", { class: "meta-faixa" },
      el("div", { class: "meta-cab" },
        el("div", {},
          el("span", { class: "selo" }, el("i", { class: "bandeira", "aria-hidden": "true" }), "No meta brasileiro"),
          el("h2", {}, el("b", {}, posicao + "º"), " mais usado · em ", el("b", {}, pct(r.uso)), " dos times"),
          el("p", { class: "dica" }, `${r.times} de ${E.meta.totalTimes} ${corte} em ${E.meta.totalTorneios} torneios online da comunidade brasileira (Limitless).`)),
        vitoria),
      el("div", { class: "meta-grade" },
        el("div", {}, el("h4", {}, "Itens"),
          el("ul", { class: "ranking-mini" }, r.itens.top(3).map(([item, qtd]) => el("li", { class: "item" },
            el("img", { src: API.spriteDoItem(item), alt: "", loading: "lazy", onerror: (e) => e.target.remove() }),
            el("span", {}, item), el("b", {}, pct(qtd / r.times, 0)))))),
        el("div", {}, el("h4", {}, "Parceiros mais comuns"),
          el("div", { class: "parceiros" }, r.parceiros.top(4).map(([id, qtd]) => {
            const nome = C.nomeNoMeta(id);
            return el("div", { class: "parceiro" }, retrato(D.tiposDoTorneio(id), nome, "mini", D.spriteDoTorneio(id)),
              C.linkPokemon(id, nome), el("b", {}, pct(qtd / r.times, 0)));
          })))));
  }

  return async function telaPokemon(montar, especie, forma) {
    if (!E.dex) { montar(carregando("Carregando...")); await D.carregarBase(); }
    montar(carregando(`Buscando ${formatarNome(especie)} na PokeAPI...`));
    const s = await API.PokeAPI.especie(especie);
    const formaPadrao = s.formas.find((f) => f.padrao).nome;
    const p = await API.PokeAPI.pokemon(forma || formaPadrao);
    const entrada = E.dex.find((d) => d.especie === especie);
    const total = Object.values(p.stats).reduce((a, b) => a + b, 0);
    const formas = s.formas.filter((f) => !/-(gmax|totem)/.test(f.nome));

    // Partes que dependem dos torneios: começam vazias e são preenchidas quando os dados chegam.
    const faixa = el("div", { hidden: true }); // vira a faixa do meta quando os torneios chegarem
    const naturezas = el("div");
    const habilidades = el("ul", { class: "habilidades" });
    const golpes = el("section", { class: "bloco" });
    let meta = null; // entrada do ranking para esta forma

    const desenharHabilidades = () => habilidades.replaceChildren(...p.habilidades.map((h) => {
      const qtd = meta ? meta.habilidades.top().find(([nome]) => API.paraSlug(nome) === h.nome) : null;
      return el("li", {},
        el("span", {}, formatarNome(h.nome), h.oculta && el("small", {}, " (oculta)")),
        meta && barraMeta(qtd ? qtd[1] / meta.times : 0));
    }));

    const desenharNaturezas = () => {
      if (!meta) return naturezas.replaceChildren();
      const lista = meta.naturezas.top(3).filter(([n]) => n);
      naturezas.replaceChildren(
        el("h2", { class: "espaco-acima" }, "Naturezas mais usadas"),
        el("ul", { class: "habilidades" }, lista.map(([nome, qtd]) => {
          const efeito = NATUREZAS[nome];
          return el("li", {},
            el("span", {}, nome, " ", efeito
              ? el("small", { class: "efeito" }, el("span", { class: "sobe" }, "+" + efeito[0]), " ", el("span", { class: "desce" }, "−" + efeito[1]))
              : el("small", {}, "neutra")),
            barraMeta(qtd / meta.times));
        })));
    };

    // ---------- Golpes: tabela com filtros; os usados no meta vêm primeiro.
    const tabela = { detalhes: null, erro: false, categoria: "", tipo: "", todos: false };
    const desenharGolpes = () => {
      const titulo = el("h2", {}, `Golpes que aprende em Champions (${p.golpesChampions.length})`);
      if (!p.golpesChampions.length) {
        return golpes.replaceChildren(titulo, el("p", { class: "vazio" }, "A PokeAPI ainda não tem a lista de golpes de Champions para esta forma."));
      }
      if (tabela.erro) return golpes.replaceChildren(titulo, erro("Não foi possível buscar os golpes na PokeAPI.", null));
      if (!tabela.detalhes) return golpes.replaceChildren(titulo, carregando("Buscando os detalhes dos golpes...", true));

      const usoDe = (g) => {
        if (!meta) return null;
        const achado = meta.golpes.top().find(([nome]) => API.paraSlug(nome) === g.id);
        return achado ? achado[1] / meta.times : null;
      };
      const filtrados = tabela.detalhes
        .filter((g) => (!tabela.categoria || g.classe === tabela.categoria) && (!tabela.tipo || g.tipo === tabela.tipo))
        .map((g) => ({ ...g, uso: usoDe(g) }));
      const doMeta = filtrados.filter((g) => g.uso).sort((a, b) => b.uso - a.uso);
      const outros = filtrados.filter((g) => !g.uso).sort((a, b) => a.nome.localeCompare(b.nome));
      const visiveis = tabela.todos || !doMeta.length ? outros : outros.slice(0, GOLPES_VISIVEIS);

      const linha = (g) => el("tr", { class: g.uso ? "no-meta" : "" },
        el("td", { class: "g-nome" }, g.nome),
        el("td", {}, badgeTipo(g.tipo)),
        el("td", { class: "col-cat" }, el("span", { class: "cat " + CATEGORIAS[g.classe][1] }, CATEGORIAS[g.classe][0])),
        el("td", { class: "num" }, g.poder ?? "—"),
        el("td", { class: "num col-prec" }, g.precisao ? g.precisao + "%" : "—"),
        meta && el("td", { class: "uso-col" }, g.uso ? barraMeta(g.uso) : el("span", { class: "sem" }, "—")));

      const botaoCat = (valor, rotulo) => el("button", {
        type: "button", class: tabela.categoria === valor ? "ativo" : "", "aria-pressed": String(tabela.categoria === valor),
        onclick: () => { tabela.categoria = valor; desenharGolpes(); },
      }, rotulo);
      const tiposPresentes = [...new Set(tabela.detalhes.map((g) => g.tipo))].sort((a, b) => TIPOS[a][0].localeCompare(TIPOS[b][0]));

      golpes.replaceChildren(...[
        el("div", { class: "tab-cab" }, titulo,
          el("div", { class: "filtros-golpes" },
            el("div", { class: "seg", role: "group", "aria-label": "Categoria" },
              botaoCat("", "Todos"), botaoCat("physical", "Físico"), botaoCat("special", "Especial"), botaoCat("status", "Status")),
            el("select", { "aria-label": "Tipo do golpe", onchange: (e) => { tabela.tipo = e.target.value; desenharGolpes(); } },
              el("option", { value: "" }, "Todos os tipos"),
              tiposPresentes.map((t) => el("option", { value: t, selected: t === tabela.tipo }, TIPOS[t][0]))))),
        meta && el("p", { class: "dica" }, `Os golpes usados nos torneios aparecem primeiro, com a % de times de ${formatarNome(p.nome)} que levam cada um.`),
        filtrados.length ? el("div", { class: "tabela-rolagem" },
          el("table", { class: "tabela-golpes" },
            el("thead", {}, el("tr", {},
              el("th", {}, "Golpe"), el("th", {}, "Tipo"), el("th", { class: "col-cat" }, "Categoria"),
              el("th", { class: "num" }, "Poder"), el("th", { class: "num col-prec" }, "Precisão"), meta && el("th", {}, "Uso no meta"))),
            el("tbody", {},
              doMeta.map(linha),
              doMeta.length > 0 && outros.length > 0 && el("tr", { class: "separador" },
                el("td", { colspan: meta ? 6 : 5 }, `Outros golpes que aprende (${outros.length})`)),
              visiveis.map(linha))))
          : el("p", { class: "vazio" }, "Nenhum golpe com esses filtros."),
        visiveis.length < outros.length && el("button", { class: "botao-secundario", type: "button",
          onclick: () => { tabela.todos = true; desenharGolpes(); } }, `Mostrar os outros ${outros.length - visiveis.length} golpes`),
      ].filter(Boolean)); // tira os itens opcionais que ficaram false/null
    };

    montar(
      el("a", { class: "voltar", href: "#/pokedex" }, "← Pokédex"),
      el("section", { class: "perfil" },
        retrato(p.tipos, formatarNome(especie), "grande", p.sprite),
        el("div", {},
          entrada && el("span", { class: "numero" }, `#${String(entrada.numero).padStart(3, "0")} na Pokédex de Champions`),
          el("h1", {}, formatarNome(p.nome)),
          s.categoria && el("p", { class: "categoria" }, s.categoria),
          el("div", { class: "tipos" }, p.tipos.map(badgeTipo)),
          s.descricao && el("p", { class: "descricao" }, s.descricao, el("small", {}, " (descrição em inglês; a PokeAPI não tem textos em português)")),
          formas.length > 1 && el("div", { class: "formas" }, el("span", {}, "Formas:"),
            formas.map((f) => el("a", { class: "chip", href: `#/pokemon/${especie}?forma=${f.nome}`, "aria-current": f.nome === p.nome ? "page" : null },
              formatarNome(f.nome)))))),
      faixa,
      el("div", { class: "colunas" },
        el("section", { class: "bloco" },
          el("h2", {}, "Status base"),
          el("div", { class: "barras" }, Object.entries(STATS).map(([k, rotulo]) =>
            el("div", { class: "barra" },
              el("span", {}, rotulo), el("b", {}, p.stats[k]),
              el("i", { style: `--v:${Math.min(100, (p.stats[k] / 200) * 100)}%;--c:${corStat(p.stats[k])}` })))),
          el("p", { class: "total" }, "Total: ", el("b", {}, total)),
          el("p", { class: "info" }, `Altura ${p.altura.toLocaleString("pt-BR")} m · Peso ${p.peso.toLocaleString("pt-BR")} kg`),
          naturezas),
        el("section", { class: "bloco" },
          el("h2", {}, "Defesa contra cada tipo"),
          blocoDefesa(p.tipos),
          el("h2", {}, "Habilidades"),
          habilidades)),
      golpes);

    desenharHabilidades();
    desenharGolpes();

    // Detalhes dos golpes: GET /move/{nome} para cada um (6 por vez), guardados em memória.
    API.emLotes(p.golpesChampions, 6, (g) => API.PokeAPI.golpe(g), progresso)
      .then((lista) => { tabela.detalhes = lista; })
      .catch(() => { tabela.erro = true; })
      .finally(() => { if (golpes.isConnected) desenharGolpes(); });

    // Dados dos torneios em segundo plano. Se falhar, a página fica só com os dados da PokeAPI.
    D.obterMeta()
      .then(() => {
        if (!faixa.isConnected) return; // a pessoa já saiu desta página
        meta = entradaDoMeta(p, especie, p.nome === formaPadrao);
        if (!meta) return;
        faixa.replaceWith(faixaMeta(meta));
        desenharHabilidades();
        desenharNaturezas();
        desenharGolpes();
      })
      .catch((e) => console.warn("Dados de torneio indisponíveis nesta página:", e.message));
  };
})();
