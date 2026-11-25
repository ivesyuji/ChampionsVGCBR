// Organizadores brasileiros na Limitless.
// A Limitless não informa o país de um torneio, só o de cada jogador. Esta lista foi montada em 22/11/2026
// verificando os 120 organizadores com torneios de 8+ jogadores no formato M-C: para cada um, a % de jogadores
// com país "BR" no maior torneio dele. Entram os que têm 75% ou mais (o seguinte da lista tinha só 25%).
// O site busca os torneios de cada um com GET /tournaments?organizerId=ID e mostra, a cada carregamento,
// a % real de jogadores do Brasil nos torneios analisados.
window.CONFIG = {
  organizadoresBR: [
    { id: 2612, nome: "Hit Legends TCG" },          // 100% BR
    { id: 2442, nome: "TEAM GALAR" },               // 91% BR
    { id: 1582, nome: "Pokémon VG do Litoral" },    // 88% BR
    { id: 2674, nome: "X1 Battle League" },         // 85% BR
    { id: 2709, nome: "Thalera" },                  // 83% BR
    { id: 2860, nome: "Floette Supremacy" },        // 82% BR
    { id: 2812, nome: "Oak Stadium" },              // 78% BR
    { id: 2823, nome: "INTIMIDATORS VGC" },         // 77% BR
    { id: 1165, nome: "Liga CWB" },                 // 75% BR
  ],
};
