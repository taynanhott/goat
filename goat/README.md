# GOAT

Jogo de futebol 3D em JavaScript e WebGL. A entrada oficial é `goat/src/index.html`, com código, estilos, animações e áudio separados. Não gere HTML único.

## Desenvolvimento

Na raiz do repositório, execute `npm run dev` e abra http://127.0.0.1:4173. O servidor permite salvar ajustes de animação nos arquivos locais. Também é possível abrir diretamente `goat/src/index.html`.

## Cloudflare

A configuração do Worker está em `wrangler.jsonc`, na raiz. Usa arquivos estáticos, sem banco de dados ou variáveis de ambiente.

```sh
npm run check
npm run build
npx wrangler@4 login
npm run deploy
```

O build copia as fontes para `goat/dist/` e ajusta os caminhos no index publicado. Os recursos permanecem separados. A saída é recriada a cada build e não deve ser versionada. O deploy executa o build automaticamente.

Para conectar o Git ao Cloudflare Workers Builds:

| Campo | Valor |
| --- | --- |
| Diretório raiz | Raiz do repositório |
| Comando de build | `npm run build` |
| Comando de deploy | `npx wrangler@4 deploy` |
| Configuração | `wrangler.jsonc` |
| Arquivos estáticos | `goat/dist` |

Para Cloudflare Pages, use `npm run build` e `goat/dist` como diretório de saída, sem comando de deploy do Worker.

Carreiras e replays ficam no navegador. Mudar de domínio, navegador ou origem não transfere o progresso automaticamente. O endpoint local de edição de animações não existe no Cloudflare; os ajustes publicados são carregados normalmente e o editor mantém seu armazenamento no navegador.

## Organização

| Caminho dentro de goat/ | Conteúdo |
| --- | --- |
| `src/index.html` | Entrada oficial e ordem dos scripts |
| `src/gameplay/` | Movimentação, física, controles e goleiro |
| `src/career/` | Carreira, telas e salvamento |
| `src/rendering/` | Rig, rede e estádios |
| `src/ui/` | Estilos, ícones e interface |
| `assets/` | Animações e áudio |
| `tools/animation-viewer/` | Visualizador de animações |
| `build.cjs` | Verificação das fontes e preparação da versão web |

O guia de jogabilidade está em `REGRAS-DO-JOGO.md` na raiz.
