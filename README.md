# ChampionsVGCBR

Site informativo sobre os Pokémon do **Pokémon Champions**, feito em HTML, CSS e JavaScript puro, como trabalho acadêmico.
Não tem banco de dados nem servidor: cada informação é buscada direto das APIs públicas quando a página precisa dela.

Para usar, abra o `index.html` no navegador. Precisa de internet.

## Páginas

| Página | O que mostra | Fonte |
|---|---|---|
| **Pokédex** | Os Pokémon da Pokédex do Champions, com busca e filtro por tipo | PokeAPI |
| **Pokémon** | Status base, defesa contra cada tipo, habilidades, formas e tabela de golpes (tipo, categoria, poder, precisão) com filtros. Se o Pokémon aparece nos torneios brasileiros: faixa "No meta brasileiro" (posição, uso, taxa de vitória, itens com sprite, parceiros), uso de cada habilidade, naturezas mais usadas e % de uso de cada golpe | PokeAPI + Limitless |
| **Top 10** | Os Pokémon mais usados nos torneios brasileiros recentes, com itens, golpes, habilidades e parceiros mais comuns | Limitless |
| **Composições** | Duplas que mais aparecem juntas e os times campeões dos torneios | Limitless |
| **Sobre** | Fontes, metodologia e créditos | — |

## Estrutura

```
index.html        estrutura da página e menu
css/estilo.css    visual (tema claro e escuro, layout para celular)
js/tema.js        botão de modo claro/escuro (lembra a escolha no navegador)
js/config.js      lista de organizadores brasileiros na Limitless
js/api.js         requisições à PokeAPI e à Limitless
js/analise.js     agrega os times dos torneios em estatísticas (uso, vitórias, duplas)
js/ui.js          peças de interface: criação de elementos, formatação, tipos, retratos
js/dados.js       estado do site e carregamento dos dados (Pokédex, formas padrão, torneios)
js/telas/         uma tela por arquivo: pokedex, pokemon, top, composicoes, sobre
                  (comum.js tem as peças usadas por mais de uma tela)
js/app.js         rotas (#/pokedex, #/pokemon/nome, #/top...) e troca de telas
testes/           testes automatizados (abra testes/index.html no navegador)
```

Os arquivos compartilham um objeto global `App` (`App.ui`, `App.dados`, `App.telas`...) e são carregados em ordem
pelo `index.html`. Não são módulos ES (`import`/`export`) porque o navegador bloqueia módulos em páginas abertas
direto do arquivo (`file://`), e o site precisa funcionar assim.

## Testes

Abra `testes/index.html` no navegador. Os testes rodam sem internet: a PokeAPI e a Limitless são substituídas por
respostas falsas. Eles cobrem:

- `analise.js`: uso dentro do corte, taxa de vitória com todos os jogadores, empate valendo meia, duplas e campeões.
- `api.js`: conversão de nomes dos torneios para a PokeAPI e endereços de sprites.
- `dados.js`: forma padrão vinda da PokeAPI (ex.: Palafin Zero, não Hero), organizador que falha sem derrubar os
  outros, e dados parciais quando a Limitless atinge o limite (com nova tentativa depois da espera).

## Requisições

**PokeAPI** (`https://pokeapi.co/api/v2`)

| Quando | Requisição |
|---|---|
| Abrir o site | `GET /pokedex/champions` e `GET /type/{tipo}` para os 18 tipos (cada tipo lista os Pokémon que o têm, o que evita uma requisição por Pokémon na Pokédex) |
| Abrir um Pokémon | `GET /pokemon-species/{nome}`, `GET /pokemon/{forma}` e `GET /move/{golpe}` para cada golpe (6 por vez). Os dados dos torneios vêm em segundo plano, do cache quando possível |

**Limitless** (`https://play.limitlesstcg.com/api`)

| Quando | Requisição |
|---|---|
| Abrir Top 10 ou Composições | `GET /tournaments?game=VGC&format=M-C&organizerId={id}` para cada organizador brasileiro, depois `GET /tournaments/{id}/standings` para cada torneio (vem o time completo de cada jogador) |

As respostas ficam em memória enquanto a aba está aberta, para não repetir requisições.

Todas essas rotas estão em [`docs/ChampionsVGCBR.postman_collection.json`](docs/ChampionsVGCBR.postman_collection.json). Para testar, importe o arquivo no Postman, Insomnia ou Bruno (Import → arquivo); os valores de exemplo ficam nas variáveis da collection.

### Limite da Limitless

A Limitless aceita **50 requisições a cada 5 minutos por IP**. Carregar os 30 torneios do padrão gasta 39 requisições (9 listas de organizadores + 30 classificações).
Por isso as respostas da Limitless ficam no `sessionStorage` do navegador por **30 minutos** (só os campos usados,
sem nome de jogador), e recarregar a página não gasta o limite de novo. Esse cache some ao fechar a aba.
Se mesmo assim o limite for atingido, o site avisa quanto tempo esperar.

## Só torneios do Brasil

A Limitless não informa o país de um torneio, só o de cada jogador. Em 22/11/2026, os 120 organizadores com torneios
M-C de 8+ jogadores foram verificados: para cada um, a % de jogadores com país `BR` no maior torneio dele.
Os 9 com 75% ou mais estão em `js/config.js` (o seguinte da lista tinha só 25%). A cada carregamento, o site mostra
a % real de jogadores brasileiros nos torneios analisados. Organizadores novos precisam ser adicionados à mão nessa lista.

## Metodologia do Top 10

- **Uso** = % dos times analisados que têm o Pokémon.
- Padrão: os 30 torneios brasileiros mais recentes do formato **M-C** (VGC 2026, jogado no Pokémon Champions) com 8 ou mais
  jogadores, contando os times do **top 8** de cada um. O número de torneios é fixo; o recorte de times pode ser mudado na página.
- Formas diferentes (ex.: Arcanine e Arcanine de Hisui) contam separado.
- **Taxa de vitória** = partidas vencidas (empate vale meia) por **todos** os jogadores que usaram o Pokémon, em qualquer
  colocação, comparada com a média geral. Se usasse só o top 8, todo Pokémon pareceria vencedor. Abaixo de 30 partidas,
  aparece como amostra pequena.
- Os torneios são da comunidade e em **duplas**. O uso nas partidas ranqueadas do jogo pode ser diferente.

## Limitações conhecidas

- A PokeAPI não tem textos em português, então as descrições estão em inglês.
- Os nomes dos torneios seguem o padrão do Showdown (`indeedee-f`); `nomePokeAPI` em `js/api.js` converte para a PokeAPI.
- Sprites: carregados direto do repositório PokeAPI/sprites (`sprites.front_default`), só para identificar o Pokémon.
  Nada é copiado para o projeto. Se a imagem não carregar, aparece um retrato com as cores dos tipos.

## Créditos

- Dados: [PokeAPI](https://pokeapi.co) e [Limitless](https://play.limitlesstcg.com).
- Sprites: [PokeAPI/sprites](https://github.com/PokeAPI/sprites), © Nintendo, Creatures Inc. e GAME FREAK Inc.
- Pokémon e todos os nomes relacionados são marcas registradas da Nintendo, Creatures Inc. e GAME FREAK Inc.
  Projeto acadêmico, sem fins lucrativos e sem afiliação oficial.
