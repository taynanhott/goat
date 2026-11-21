# GOAT

- Leia `goat/README.md` para localizar arquivos e `REGRAS-DO-JOGO.md` quando a tarefa envolver comportamento do jogo.
- Edite as fontes de `goat/src/`. Não gere HTML único. `npm run build` prepara os arquivos separados em `goat/dist/` para Cloudflare.
- Comece pelo assunto da mudança. Use `src/gameplay/` para controles, física, movimentação, partida e goleiro. Use `src/career/` para temporada, telas da carreira e replays. Use `src/rendering/` para rig e rede e `src/ui/` para estilos da interface. Esses caminhos ficam dentro de `goat/`.
- Consulte `goat/assets/animations/` quando a tarefa exigir clipes ou poses. Os arquivos dessa pasta contêm dados grandes de animação.
- Preserve a ordem de carregamento declarada em `goat/src/index.html` ao adicionar ou mover scripts.
- Confira sintaxe e referências com `npm run check`. A entrada oficial é `goat/src/index.html`; não recrie o empacotador offline.
