// Agrega os times dos torneios em estatísticas de uso. Funções puras: recebem dados e devolvem números.
(function () {
  class Contador {
    constructor() { this.mapa = new Map(); }
    add(chave, n = 1) { if (chave) this.mapa.set(chave, (this.mapa.get(chave) || 0) + n); }
    get(chave) { return this.mapa.get(chave) || 0; }
    top(n = Infinity) { return [...this.mapa].sort((a, b) => b[1] - a[1]).slice(0, n); }
  }

  // Todas as combinações de `k` elementos de `lista` (usado para as duplas).
  function combinacoes(lista, k, inicio = 0, atual = [], saida = []) {
    if (atual.length === k) { saida.push([...atual]); return saida; }
    for (let i = inicio; i < lista.length; i++) {
      atual.push(lista[i]);
      combinacoes(lista, k, i + 1, atual, saida);
      atual.pop();
    }
    return saida;
  }

  // Resultado das partidas de um jogador. Empate vale meia vitória.
  function partidasDe(jogador) {
    const r = jogador.record || {};
    const v = r.wins || 0, d = r.losses || 0, e = r.ties || 0;
    return { pontos: v + e / 2, partidas: v + d + e };
  }

  /**
   * torneios: [{ torneio, classificacao: [...] }]
   * corte: o USO só conta jogadores até essa colocação (ex.: 8 = top 8). Infinity = todos.
   * A TAXA DE VITÓRIA usa sempre todos os jogadores que publicaram o time: se usasse só o top 8,
   * todo Pokémon pareceria vencedor, porque o top 8 inteiro tem campanha boa.
   */
  function agregar(torneios, corte = Infinity) {
    const pokemon = new Map(); // id -> estatísticas de uso (dentro do corte)
    const resultados = new Map(); // id -> { pontos, partidas } (todos os jogadores)
    const duplas = new Contador();
    const campeoes = [];
    let totalTimes = 0, pontosGerais = 0, partidasGerais = 0;

    for (const { torneio, classificacao } of torneios) {
      for (const jogador of classificacao) {
        const time = jogador.decklist;
        if (!Array.isArray(time) || time.length === 0) continue; // time não publicado
        const ids = [...new Set(time.map((m) => m.id))].sort();

        // Vitórias: todos os jogadores.
        const p = partidasDe(jogador);
        pontosGerais += p.pontos;
        partidasGerais += p.partidas;
        for (const id of ids) {
          const r = resultados.get(id) || { pontos: 0, partidas: 0 };
          r.pontos += p.pontos;
          r.partidas += p.partidas;
          resultados.set(id, r);
        }

        // Uso e composições: só dentro do corte.
        if (jogador.placing == null || jogador.placing > corte) continue;
        totalTimes++;
        if (jogador.placing === 1) campeoes.push({ torneio, jogador, time });

        for (const m of time) {
          if (!pokemon.has(m.id)) {
            pokemon.set(m.id, {
              id: m.id, nome: m.name, times: 0,
              itens: new Contador(), habilidades: new Contador(), golpes: new Contador(),
              naturezas: new Contador(), parceiros: new Contador(),
            });
          }
          const s = pokemon.get(m.id);
          s.times++;
          s.itens.add(m.item);
          s.habilidades.add(m.ability);
          s.naturezas.add(m.nature);
          for (const g of m.attacks || []) s.golpes.add(g);
          for (const outro of ids) if (outro !== m.id) s.parceiros.add(outro);
        }
        for (const d of combinacoes(ids, 2)) duplas.add(d.join("|"));
      }
    }

    const mediaVitoria = partidasGerais ? pontosGerais / partidasGerais : 0;
    const ranking = [...pokemon.values()]
      .map((s) => {
        const r = resultados.get(s.id) || { pontos: 0, partidas: 0 };
        return {
          ...s,
          uso: totalTimes ? s.times / totalTimes : 0,
          partidas: r.partidas,
          taxaVitoria: r.partidas ? r.pontos / r.partidas : 0,
        };
      })
      .sort((a, b) => b.times - a.times);

    campeoes.sort((a, b) => new Date(b.torneio.date) - new Date(a.torneio.date));
    return { totalTimes, totalTorneios: torneios.length, ranking, duplas, campeoes, porId: pokemon, mediaVitoria };
  }

  window.Analise = { agregar, Contador };
})();
