// Estado do site e carregamento dos dados (PokeAPI e Limitless). Nada de interface aqui.
// As APIs são lidas de window.API na hora de cada chamada, para os testes poderem substituí-las.
window.App = window.App || {};
App.dados = (function () {
  const estadoInicial = () => ({
    dex: null,          // [{ numero, especie, pokemon, tipos }]
    tipos: null,        // { tabela, tiposDoPokemon, idDoPokemon }
    formaPadrao: {},    // espécie → forma padrão, para as espécies sem um Pokémon com o mesmo nome (ex.: indeedee → indeedee-male)
    meta: null,         // resultado de Analise.agregar
    torneios: null,     // [{ torneio, classificacao }]
    opcoes: { torneios: 30, corte: 8, minJogadores: 8 }, // 30 torneios = 39 requisições à Limitless (limite: 50 a cada 5 min)
    falhas: 0,          // torneios cuja classificação não veio
    organizadoresFalharam: 0, // organizadores cuja lista de torneios não veio
    incompleto: null,   // { tentarApos } quando faltaram dados; o site tenta de novo depois desse horário
    pctBrasil: 0,
  });
  const E = estadoInicial();

  // ------------------------------------------------------------------ Nomes e formas
  // Nome do Pokémon "padrão" de uma espécie ou id de torneio.
  // 1. Se existe um Pokémon com esse nome exato, é ele.
  // 2. Se a espécie está no mapa de formas padrão (vindo da PokeAPI, is_default), usa esse.
  // 3. Último recurso (nomes fora da Pokédex): a primeira forma em ordem alfabética, sem Mega/Gmax.
  function pokemonPadrao(nome) {
    const mapa = E.tipos.tiposDoPokemon;
    if (mapa[nome]) return nome;
    if (E.formaPadrao[nome]) return E.formaPadrao[nome];
    return Object.keys(mapa).filter((n) => n.startsWith(nome + "-") && !/-(mega|gmax|totem)/.test(n)).sort()[0] || nome;
  }

  const tiposDe = (nomePokemon) => E.tipos.tiposDoPokemon[nomePokemon] || E.tipos.tiposDoPokemon[pokemonPadrao(nomePokemon)] || [];
  const spriteDe = (nomePokemon) => API.spriteDoId(E.tipos.idDoPokemon[nomePokemon] ?? E.tipos.idDoPokemon[pokemonPadrao(nomePokemon)]);
  const tiposDoTorneio = (id) => tiposDe(API.nomePokeAPI(id));
  const spriteDoTorneio = (id) => spriteDe(API.nomePokeAPI(id));

  // De um id de torneio ("arcanine-hisui") para a espécie da Pokédex ("arcanine").
  function especieDoTorneio(id) {
    const especies = E.dex.map((d) => d.especie);
    if (especies.includes(id)) return id;
    return especies.filter((s) => id.startsWith(s + "-")).sort((a, b) => b.length - a.length)[0] || null;
  }

  // ------------------------------------------------------------------ PokeAPI
  // Pokédex + tipos. Para as poucas espécies sem um Pokémon de mesmo nome (13 hoje), busca a
  // espécie para saber qual é a forma padrão: sem isso, Palafin apareceria como Hero, Aegislash como Blade etc.
  async function carregarBase() {
    if (E.dex) return;
    const [dex, tipos] = await Promise.all([API.PokeAPI.pokedex(), API.PokeAPI.tipos()]);
    E.tipos = tipos;
    const semNomeProprio = dex.map((d) => d.especie).filter((s) => !tipos.tiposDoPokemon[s]);
    const especies = await Promise.all(semNomeProprio.map((s) => API.PokeAPI.especie(s)));
    especies.forEach((s, i) => { E.formaPadrao[semNomeProprio[i]] = s.formas.find((f) => f.padrao).nome; });
    E.dex = dex.map((d) => {
      const pokemon = pokemonPadrao(d.especie);
      return { ...d, pokemon, tipos: tipos.tiposDoPokemon[pokemon] || [] };
    });
  }

  // ------------------------------------------------------------------ Limitless
  const ESPERA_PADRAO = 60; // segundos até tentar de novo quando a falha não diz quanto esperar

  // 1. Lista de torneios de cada organizador brasileiro (1 requisição cada). Se um falhar, segue com os outros.
  // 2. Classificação dos N torneios mais recentes (2 por vez). Se um falhar, segue com os outros;
  //    se a Limitless avisar que o limite estourou (429), para de pedir.
  // 3. Se faltou alguma coisa, marca E.incompleto: os dados parciais aparecem, mas o site tenta de novo depois.
  async function carregarMeta(aoAvancar = () => {}) {
    const { Limitless, emLotes } = API;
    let limite = null, primeiroErro = null;
    const anotar = (e) => { primeiroErro ||= e; if (e.status === 429) limite ||= e; };

    const listas = await Promise.all(CONFIG.organizadoresBR.map((o) =>
      Limitless.torneiosDoOrganizador(o.id, E.opcoes.torneios)
        .then((ts) => ts.map((t) => ({ ...t, organizador: o.nome })))
        .catch((e) => { anotar(e); console.warn("Organizador ignorado:", o.nome, e.message); return null; })));
    const organizadoresFalharam = listas.filter((l) => l === null).length;
    if (organizadoresFalharam === listas.length) throw primeiroErro || new Error("A Limitless não respondeu.");

    const torneios = listas.filter(Boolean).flat()
      .filter((t) => t.players >= E.opcoes.minJogadores)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, E.opcoes.torneios);
    if (!torneios.length) throw new Error("Nenhum torneio brasileiro encontrado no formato " + Limitless.formato + ".");

    const classificacoes = await emLotes(torneios, 2, (t) => {
      if (limite) return null; // já estourou o limite: não adianta pedir os outros agora
      return Limitless.classificacao(t.id).catch((e) => {
        anotar(e);
        console.warn("Torneio ignorado:", t.name, e.message);
        return null;
      });
    }, aoAvancar);

    const carregados = torneios.map((torneio, i) => ({ torneio, classificacao: classificacoes[i] })).filter((t) => t.classificacao);
    if (!carregados.length) throw limite || primeiroErro || new Error("A Limitless não respondeu.");

    E.torneios = carregados;
    E.falhas = torneios.length - carregados.length;
    E.organizadoresFalharam = organizadoresFalharam;
    const faltou = E.falhas > 0 || organizadoresFalharam > 0;
    const espera = (limite && limite.esperar) || ESPERA_PADRAO;
    E.incompleto = faltou ? { tentarApos: Date.now() + espera * 1000, porLimite: !!limite } : null;

    // Confere o critério: quantos dos jogadores desses torneios são do Brasil.
    const jogadores = carregados.flatMap((t) => t.classificacao);
    E.pctBrasil = jogadores.length ? jogadores.filter((j) => j.country === "BR").length / jogadores.length : 0;
    recalcularMeta();
    return E.meta;
  }

  const recalcularMeta = () => { E.meta = Analise.agregar(E.torneios, E.opcoes.corte); };

  // Carrega os torneios uma vez só, mesmo que várias telas peçam ao mesmo tempo.
  // Se o último carregamento ficou incompleto e o tempo de espera já passou, busca de novo
  // (os torneios que já vieram saem do cache, então só os que faltaram geram requisição).
  let carregando = null;
  function obterMeta(aoAvancar) {
    const podeTentarDeNovo = E.incompleto && Date.now() >= E.incompleto.tentarApos;
    if (E.meta && !podeTentarDeNovo) return Promise.resolve(E.meta);
    carregando ||= carregarMeta(aoAvancar).finally(() => { carregando = null; });
    // Se a nova tentativa falhar de vez, continua mostrando o que já tinha.
    return E.meta ? carregando.catch(() => E.meta) : carregando;
  }

  // Botão "Tentar de novo": libera uma nova tentativa imediata.
  function liberarNovaTentativa() {
    if (E.incompleto) E.incompleto.tentarApos = 0;
  }

  function mensagemErro(e) {
    if (e.status === 429) {
      const minutos = Math.max(1, Math.ceil((e.esperar || 60) / 60));
      return `A Limitless limita o acesso a 50 requisições a cada 5 minutos, e esse limite foi atingido. ` +
        `Tente de novo em cerca de ${minutos} minuto(s).`;
    }
    return "Não foi possível carregar os dados. Verifique a internet. (" + e.message + ")";
  }

  // Só para os testes: volta tudo ao estado inicial.
  function reiniciar() {
    Object.assign(E, estadoInicial());
    carregando = null;
  }

  return {
    E, pokemonPadrao, tiposDe, spriteDe, tiposDoTorneio, spriteDoTorneio, especieDoTorneio,
    carregarBase, carregarMeta, obterMeta, recalcularMeta, liberarNovaTentativa, mensagemErro, reiniciar,
  };
})();
