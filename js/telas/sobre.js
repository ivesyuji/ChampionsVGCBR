// Tela "Sobre": fontes, critério dos torneios brasileiros, metodologia, créditos e equipe.
window.App = window.App || {};
App.telas = App.telas || {};
App.telas.sobre = (function () {
  const { el } = App.ui;
  const E = App.dados.E;

  return function telaSobre(montar) {
    const link = (href, texto) => el("a", { href, target: "_blank", rel: "noopener" }, texto);
    montar(el("article", { class: "texto" },
      el("h1", {}, "Sobre o projeto"),
      el("p", {}, "Site informativo feito em HTML, CSS e JavaScript puro, como trabalho acadêmico. Não há banco de dados nem servidor: " +
        "cada informação é buscada direto das APIs públicas no momento em que a página precisa dela."),
      el("h2", {}, "Fontes de dados"),
      el("ul", {},
        el("li", {}, link("https://pokeapi.co", "PokeAPI"), ": Pokédex do Pokémon Champions (", el("code", {}, "/pokedex/champions"),
          "), status, tipos, habilidades e golpes aprendidos (version group ", el("code", {}, "champions"), ")."),
        el("li", {}, link("https://play.limitlesstcg.com", "Limitless"), ": torneios da comunidade brasileira no formato VGC ", API.Limitless.formato,
          ", com os times completos dos jogadores. É daí que vêm o Top 10 e as composições.")),
      el("h2", {}, "Como os torneios brasileiros são escolhidos"),
      el("p", {}, "A Limitless não informa o país de um torneio, só o de cada jogador. Por isso o site usa uma lista de organizadores " +
        "brasileiros, em js/config.js: organizadores cujos torneios têm a maioria dos jogadores com país BR. " +
        "A cada carregamento, o site também confere e mostra qual % dos jogadores analisados é do Brasil."),
      el("ul", {}, CONFIG.organizadoresBR.map((o) => el("li", {}, o.nome))),
      el("h2", {}, "Metodologia"),
      el("ul", {},
        el("li", {}, "Uso = porcentagem dos times analisados que têm o Pokémon."),
        el("li", {}, `Por padrão: os ${E.opcoes.torneios} torneios brasileiros mais recentes com ${E.opcoes.minJogadores} ou mais jogadores, contando os times do top 8.`),
        el("li", {}, "Formas diferentes (ex.: Arcanine e Arcanine de Hisui) contam separado."),
        el("li", {}, "Taxa de vitória = partidas vencidas (empate vale meia) por todos os jogadores que usaram o Pokémon, em qualquer colocação, " +
          "comparada com a média geral dos torneios. Abaixo de 30 partidas, aparece como amostra pequena."),
        el("li", {}, "Os torneios são da comunidade e jogados em duplas (VGC). O uso nas partidas ranqueadas do jogo pode ser diferente.")),
      el("h2", {}, "Créditos e avisos"),
      el("p", {}, "Pokémon e todos os nomes relacionados são marcas registradas da Nintendo, Creatures Inc. e GAME FREAK Inc. " +
        "Projeto acadêmico, sem fins lucrativos e sem nenhuma afiliação oficial."),
      el("p", {}, "Sprites: carregados direto do repositório ", link("https://github.com/PokeAPI/sprites", "PokeAPI/sprites"),
        " apenas para identificar cada Pokémon. As imagens são © Nintendo, Creatures Inc. e GAME FREAK Inc.; nenhuma é copiada para o projeto."),
      el("h2", {}, "Equipe"),
      el("ul", {},
        el("li", {}, "Ives Yuji - Engenharia de Software UEM"),
        el("li", {}, "Gabrielle Prado - Engenharia de Software UEM"),
        el("li", {}, "João Fagotti - Engenharia de Software UEM")),
      el("h2", {}, "Professor: João Choma"),
      el("p", {}, "9907/33 - Programação de Sistemas Web · Universidade Estadual de Maringá (UEM) · 2026")));
  };
})();
