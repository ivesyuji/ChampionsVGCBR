// Acesso às duas fontes de dados. Cada dado é uma requisição feita só quando a página precisa dele.
// Nada é salvo em disco: as respostas ficam em memória enquanto a aba está aberta, para não repetir requisições.
// A exceção é a Limitless (limite de 50 requisições a cada 5 minutos): as respostas dela ficam também no
// sessionStorage por 30 minutos, para que recarregar a página (F5) não gaste o limite de novo.
(function () {
  const requisicoes = new Map();

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  // Faz o GET. Se a API responder 429 (muitas requisições) pedindo uma espera curta, espera e tenta de novo;
  // se a espera for longa, desiste e informa quantos segundos faltam (erro.esperar).
  // A Limitless, por exemplo, aceita 50 requisições a cada 5 minutos por IP.
  async function buscar(url) {
    for (let tentativa = 1; ; tentativa++) {
      const r = await fetch(url);
      if (r.ok) return r.json();
      const segundos = Number(r.headers.get("Retry-After")) || 2 * tentativa;
      if (r.status === 429 && tentativa <= 3 && segundos <= 10) {
        await esperar(segundos * 1000);
        continue;
      }
      const erro = new Error(`${r.status} em ${url}`);
      erro.status = r.status;
      if (r.status === 429) erro.esperar = segundos;
      throw erro;
    }
  }

  function getJSON(url) {
    if (!requisicoes.has(url)) {
      const promessa = buscar(url);
      promessa.catch(() => requisicoes.delete(url)); // se falhar, deixa tentar de novo
      requisicoes.set(url, promessa);
    }
    return requisicoes.get(url);
  }

  // ------------------------------------------------------------------ Cache temporário (sessionStorage)
  // Vale por 30 minutos e é apagado quando a aba é fechada. Se o navegador bloquear ou o espaço acabar,
  // o site simplesmente segue sem cache.
  const CACHE_MINUTOS = 30;
  const PREFIXO = "championsvgcbr:";

  function lerCache(chave) {
    try {
      const item = JSON.parse(sessionStorage.getItem(PREFIXO + chave));
      if (item && Date.now() - item.salvoEm < CACHE_MINUTOS * 60000) return item.valor;
    } catch { /* sem cache disponível */ }
    return undefined;
  }

  function gravarCache(chave, valor) {
    try {
      sessionStorage.setItem(PREFIXO + chave, JSON.stringify({ salvoEm: Date.now(), valor }));
    } catch { /* cheio ou bloqueado: segue sem cache */ }
  }

  async function comCache(chave, buscarValor) {
    const guardado = lerCache(chave);
    if (guardado !== undefined) return guardado;
    const valor = await buscarValor();
    gravarCache(chave, valor);
    return valor;
  }

  // Executa `fn` em todos os itens, no máximo `limite` ao mesmo tempo (para não sobrecarregar as APIs).
  async function emLotes(itens, limite, fn, aoAvancar = () => {}) {
    const resultados = new Array(itens.length);
    let proximo = 0, feitos = 0;
    async function trabalhador() {
      while (proximo < itens.length) {
        const i = proximo++;
        resultados[i] = await fn(itens[i]);
        aoAvancar(++feitos, itens.length);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
    return resultados;
  }

  // ------------------------------------------------------------------ PokeAPI
  const POKEAPI = "https://pokeapi.co/api/v2";
  const VERSION_GROUP = "champions";
  const TIPOS_IGNORADOS = ["unknown", "shadow", "stellar"];
  const emIngles = (lista, campo = "name") => (lista.find((x) => x.language.name === "en") || {})[campo];

  const PokeAPI = {
    // GET /pokedex/champions: as espécies presentes no Pokémon Champions.
    async pokedex() {
      const d = await getJSON(`${POKEAPI}/pokedex/${VERSION_GROUP}`);
      return d.pokemon_entries
        .map((e) => ({ numero: e.entry_number, especie: e.pokemon_species.name }))
        .sort((a, b) => a.numero - b.numero);
    },

    // GET /type + GET /type/{nome} para os 18 tipos. Devolve a tabela de efetividade
    // e, de quebra, o tipo de cada Pokémon (cada tipo lista os Pokémon que o têm).
    async tipos() {
      const lista = await getJSON(`${POKEAPI}/type?limit=100`);
      const nomes = lista.results.map((t) => t.name).filter((n) => !TIPOS_IGNORADOS.includes(n));
      const detalhes = await Promise.all(nomes.map((n) => getJSON(`${POKEAPI}/type/${n}`)));
      const tabela = {}, tiposDoPokemon = {}, idDoPokemon = {};
      for (const t of detalhes) {
        const r = t.damage_relations;
        tabela[t.name] = {
          dobro: r.double_damage_to.map((x) => x.name),
          metade: r.half_damage_to.map((x) => x.name),
          nada: r.no_damage_to.map((x) => x.name),
        };
        for (const p of t.pokemon) {
          (tiposDoPokemon[p.pokemon.name] ||= [])[p.slot - 1] = t.name;
          idDoPokemon[p.pokemon.name] = Number(p.pokemon.url.match(/\/(\d+)\/?$/)[1]);
        }
      }
      for (const k in tiposDoPokemon) tiposDoPokemon[k] = tiposDoPokemon[k].filter(Boolean);
      return { tabela, tiposDoPokemon, idDoPokemon };
    },

    // GET /pokemon-species/{nome}: descrição, categoria e formas (Mega, regionais...).
    async especie(nome) {
      const s = await getJSON(`${POKEAPI}/pokemon-species/${nome}`);
      const textos = s.flavor_text_entries.filter((f) => f.language.name === "en");
      return {
        nome: s.name,
        nomeExibicao: emIngles(s.names) || nome,
        categoria: emIngles(s.genera, "genus"),
        descricao: textos.length ? textos[textos.length - 1].flavor_text.replace(/[\f\n\r­]+/g, " ") : "",
        formas: s.varieties.map((v) => ({ nome: v.pokemon.name, padrao: v.is_default })),
        lendario: s.is_legendary || s.is_mythical,
      };
    },

    // GET /move/{nome}: tipo, categoria (físico/especial/status), poder e precisão de um golpe.
    async golpe(nome) {
      const m = await getJSON(`${POKEAPI}/move/${nome}`);
      return {
        id: m.name,
        nome: emIngles(m.names) || nome,
        tipo: m.type.name,
        classe: m.damage_class.name,
        poder: m.power,
        precisao: m.accuracy,
      };
    },

    // GET /pokemon/{nome}: status base, tipos, habilidades e golpes aprendidos em Champions.
    async pokemon(nome) {
      const p = await getJSON(`${POKEAPI}/pokemon/${nome}`);
      return {
        id: p.id,
        nome: p.name,
        especie: p.species.name,
        sprite: p.sprites.front_default,
        tipos: [...p.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
        stats: Object.fromEntries(p.stats.map((s) => [s.stat.name, s.base_stat])),
        habilidades: p.abilities.map((a) => ({ nome: a.ability.name, oculta: a.is_hidden })),
        altura: p.height / 10,
        peso: p.weight / 10,
        golpesChampions: p.moves
          .filter((m) => m.version_group_details.some((d) => d.version_group.name === VERSION_GROUP))
          .map((m) => m.move.name)
          .sort(),
      };
    },

  };

  // Nome exibido ("King's Rock", "U-turn") → nome usado nas URLs da PokeAPI ("kings-rock", "u-turn").
  const paraSlug = (nome) => nome.toLowerCase().replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Sprite de um item (ex.: "Choice Scarf"), no mesmo endereço que a PokeAPI devolve em /item/{nome} → sprites.default.
  const spriteDoItem = (nome) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${paraSlug(nome)}.png`;

  // Sprite do Pokémon pelo id, no mesmo endereço que a PokeAPI devolve em sprites.front_default.
  // As imagens ficam no repositório PokeAPI/sprites; o site só aponta para elas, não copia nada.
  const spriteDoId = (id) => id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` : null;

  // Converte o nome usado nos torneios (estilo Showdown) para o da PokeAPI.
  // Ex.: "indeedee-f" → "indeedee-female", "tauros-paldea-aqua" → "tauros-paldea-aqua-breed".
  const nomePokeAPI = (id) => id
    .replace(/-f$/, "-female").replace(/-m$/, "-male")
    .replace(/^(tauros-paldea-(combat|blaze|aqua))$/, "$1-breed");

  // ------------------------------------------------------------------ Limitless (torneios)
  const LIMITLESS = "https://play.limitlesstcg.com/api";
  const FORMATO = "M-C"; // regulamento atual do VGC 2026 jogado no Pokémon Champions

  const Limitless = {
    formato: FORMATO,
    // GET /tournaments?game=VGC&format=M-C&organizerId=X&limit=N: torneios mais recentes de um organizador.
    torneiosDoOrganizador(organizerId, limite) {
      const url = `${LIMITLESS}/tournaments?game=VGC&format=${FORMATO}&organizerId=${organizerId}&limit=${limite}`;
      return comCache(url, () => getJSON(url));
    },
    // GET /tournaments/{id}/standings: classificação com o time completo de cada jogador.
    // Guarda só os campos que o site usa (sem nome de jogador), para caber no sessionStorage.
    classificacao(id) {
      const url = `${LIMITLESS}/tournaments/${id}/standings`;
      return comCache(url, async () => (await getJSON(url)).map((j) => ({
        placing: j.placing,
        country: j.country,
        record: j.record,
        decklist: Array.isArray(j.decklist)
          ? j.decklist.map((m) => ({ id: m.id, name: m.name, item: m.item, ability: m.ability, attacks: m.attacks, nature: m.nature }))
          : null,
      })));
    },
    linkTorneio: (id) => `https://play.limitlesstcg.com/tournament/${id}/standings`,
  };

  window.API = { PokeAPI, Limitless, emLotes, nomePokeAPI, spriteDoId, spriteDoItem, paraSlug };
})();
