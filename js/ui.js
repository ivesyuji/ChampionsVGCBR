// Peças de interface usadas por todas as telas: criação de elementos, formatação, tipos e retratos.
window.App = window.App || {};
App.ui = (function () {
  const TIPOS = {
    normal: ["Normal", "#9fa19f"], fire: ["Fogo", "#e62829"], water: ["Água", "#2980ef"],
    electric: ["Elétrico", "#e5b800"], grass: ["Planta", "#3fa129"], ice: ["Gelo", "#3dcef3"],
    fighting: ["Lutador", "#ff8000"], poison: ["Veneno", "#9141cb"], ground: ["Terra", "#915121"],
    flying: ["Voador", "#81b9ef"], psychic: ["Psíquico", "#ef4179"], bug: ["Inseto", "#91a119"],
    rock: ["Pedra", "#afa981"], ghost: ["Fantasma", "#704170"], dragon: ["Dragão", "#5060e1"],
    dark: ["Sombrio", "#624d4e"], steel: ["Aço", "#60a1b8"], fairy: ["Fada", "#ef70ef"],
  };
  const STATS = { hp: "PS", attack: "Ataque", defense: "Defesa", "special-attack": "Atq. Esp.", "special-defense": "Def. Esp.", speed: "Velocidade" };

  const $ = (s) => document.querySelector(s);

  // Cria um elemento: el("a", { href: "#", class: "x", onclick: fn }, "texto", outroElemento, [lista]).
  // Filhos null/false são ignorados, para facilitar partes opcionais (condicao && el(...)).
  const el = (tag, attrs = {}, ...filhos) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) e.setAttribute(k, v === true ? "" : v);
    }
    for (const f of filhos.flat(Infinity)) if (f != null && f !== false) e.append(f);
    return e;
  };

  const formatarNome = (id) => id.split("-").map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join(" ");
  const pct = (x, casas = 1) => (x * 100).toFixed(casas).replace(".", ",") + "%";
  const dataBR = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const corStat = (v) => (v < 60 ? "#e25b45" : v < 90 ? "#e8a92f" : v < 120 ? "#8ac43f" : "#2fb35a");

  const badgeTipo = (t) => el("span", { class: "tipo", style: `--cor:${TIPOS[t][1]}` }, TIPOS[t][0]);

  // Sprite da PokeAPI (só para identificar o Pokémon). Enquanto carrega, ou se falhar,
  // aparece um retrato com as cores dos tipos e as iniciais do nome.
  function retrato(tipos, nome, tamanho = "", sprite = null) {
    const t = tipos && tipos.length ? tipos : ["normal"];
    const [c1, c2] = [TIPOS[t[0]][1], TIPOS[t[1] || t[0]][1]];
    const caixa = el("div", { class: `retrato ${tamanho}`, style: `--c1:${c1};--c2:${c2}`, "aria-hidden": "true" },
      el("span", {}, nome.replace(/[^A-Za-z]/g, "").slice(0, 2)));
    if (sprite) {
      const img = el("img", { src: sprite, alt: "", loading: "lazy", decoding: "async" });
      img.addEventListener("load", () => caixa.classList.add("com-sprite"));
      img.addEventListener("error", () => img.remove());
      caixa.append(img);
    }
    return caixa;
  }

  function carregando(texto, comProgresso) {
    return el("div", { class: "carregando", role: "status" },
      el("div", { class: "spinner" }), el("p", {}, texto),
      comProgresso && el("progress", { id: "progresso", value: 0, max: 1 }));
  }

  function erro(texto, tentar) {
    return el("div", { class: "aviso erro" }, el("p", {}, texto),
      tentar && el("button", { class: "botao", type: "button", onclick: tentar }, "Tentar de novo"));
  }

  // Atualiza a barra de progresso visível (se houver). Usada como callback de emLotes.
  function progresso(feitos, total) {
    const p = $("#progresso");
    if (p) { p.max = total; p.value = feitos; }
  }

  return { TIPOS, STATS, $, el, formatarNome, pct, dataBR, corStat, badgeTipo, retrato, carregando, erro, progresso };
})();
