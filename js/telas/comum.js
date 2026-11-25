// Peças usadas por mais de uma tela que mostra dados de torneio (Top 10, Composições e página do Pokémon).
window.App = window.App || {};
App.comum = (function () {
  const { el, pct, dataBR, formatarNome, carregando, progresso } = App.ui;
  const D = App.dados;
  const E = D.E;

  const PARTIDAS_MINIMAS = 30; // abaixo disso, a taxa de vitória aparece como "amostra pequena"

  // Garante Pokédex e torneios carregados, mostrando o carregamento enquanto isso.
  async function garantirMeta(montar) {
    if (!E.dex) { montar(carregando("Carregando a Pokédex...")); await D.carregarBase(); }
    const vaiBuscar = !E.meta || (E.incompleto && Date.now() >= E.incompleto.tentarApos);
    if (vaiBuscar) {
      montar(carregando(`Buscando os ${E.opcoes.torneios} torneios brasileiros mais recentes na Limitless...`, true));
    }
    await D.obterMeta(progresso);
  }

  // Link para a página do Pokémon (ou só o nome, se a espécie não estiver na Pokédex).
  function linkPokemon(id, nome) {
    const especie = D.especieDoTorneio(id);
    const forma = API.nomePokeAPI(id);
    const href = especie ? `#/pokemon/${especie}${forma !== especie && E.tipos.tiposDoPokemon[forma] ? "?forma=" + forma : ""}` : null;
    return href ? el("a", { href }, nome) : el("span", {}, nome);
  }

  const nomeNoMeta = (id) => (E.meta.porId.get(id) || { nome: formatarNome(id) }).nome;

  // Diferença entre a taxa de vitória do Pokémon e a média geral, já formatada.
  function diferencaVitoria(r) {
    const dif = (r.taxaVitoria - E.meta.mediaVitoria) * 100;
    return {
      classe: Math.abs(dif) < 1 ? "neutro" : dif > 0 ? "acima" : "abaixo",
      texto: `${dif > 0 ? "+" : "−"}${Math.abs(dif).toFixed(1).replace(".", ",")} p.p. vs média`,
    };
  }

  // O número de torneios é fixo (E.opcoes.torneios); só o recorte de times pode mudar,
  // e isso não gera requisição nova: só recalcula com os torneios já carregados.
  function controlesMeta() {
    return el("div", { class: "filtros" },
      el("label", {}, "Times: ",
        el("select", { onchange: (e) => { E.opcoes.corte = Number(e.target.value); D.recalcularMeta(); App.navegar(); } },
          [[1, "só campeões"], [4, "top 4"], [8, "top 8"], [16, "top 16"], [Infinity, "todos"]]
            .map(([v, t]) => el("option", { value: v, selected: E.opcoes.corte === v }, t)))));
  }

  function resumoMeta() {
    const datas = E.torneios.map((t) => new Date(t.torneio.date));
    const corte = E.opcoes.corte === Infinity ? "todos os jogadores" : E.opcoes.corte === 1 ? "só os campeões" : `top ${E.opcoes.corte} de cada torneio`;
    return [
      el("p", { class: "resumo" },
        `Baseado em ${E.meta.totalTimes} times (${corte}) de ${E.meta.totalTorneios} torneios brasileiros do formato ${API.Limitless.formato} ` +
        `com ${E.opcoes.minJogadores}+ jogadores, de ${dataBR(Math.min(...datas))} a ${dataBR(Math.max(...datas))}. ` +
        `${pct(E.pctBrasil, 0)} dos jogadores desses torneios são do Brasil.`),
      avisoIncompleto(),
    ];
  }

  // Quando faltaram torneios ou organizadores: explica, diz quando o site tenta de novo e oferece o botão.
  function avisoIncompleto() {
    if (!E.incompleto) return null;
    const partes = [];
    if (E.falhas) partes.push(`${E.falhas} torneio(s)`);
    if (E.organizadoresFalharam) partes.push(`${E.organizadoresFalharam} organizador(es)`);
    const motivo = E.incompleto.porLimite ? " porque a Limitless atingiu o limite de requisições" : "";
    const quando = new Date(E.incompleto.tentarApos).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return el("div", { class: "aviso-parcial", role: "status" },
      el("span", {}, `Dados parciais: ${partes.join(" e ")} não responderam${motivo}. ` +
        `O site tenta buscar o que faltou de novo a partir das ${quando}.`),
      el("button", { class: "botao-secundario", type: "button",
        onclick: () => { D.liberarNovaTentativa(); App.navegar(); } }, "Tentar agora"));
  }

  return { PARTIDAS_MINIMAS, garantirMeta, linkPokemon, nomeNoMeta, diferencaVitoria, controlesMeta, resumoMeta };
})();
