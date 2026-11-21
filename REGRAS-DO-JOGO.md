# GOAT — regras do jogo e guia de continuidade

As regras deste guia foram levantadas na revisão 41 de `goat/src/index.html`, de 19/11/2026. O mapa técnico e as instruções de desenvolvimento abaixo já acompanham a estrutura reorganizada, baseada no HTML local com as alterações posteriores.

## 1. O que é o jogo

GOAT é um jogo 3D de finalização. O jogador controla um atacante com a bola ou perto dela e tenta converter oportunidades contra um goleiro e, conforme a situação, defensores. Há dois modos jogáveis, **Treino livre** e **Carreira**, além da tela **Controles**. Na carreira, o usuário joga apenas os lances ofensivos selecionados. O placar de abertura e as demais partidas da rodada são simulados.

O jogo roda no navegador a partir do HTML, com WebGL, JavaScript, CSS, dados de animação e áudio em arquivos separados. Abra o HTML de referência em um navegador desktop com WebGL. O menu inicial libera o treino após a inicialização. A versão documentada é local, individual e sem servidor de partida.

## 2. Controles

| Ação | Teclado | Xbox |
| --- | --- | --- |
| Mover o jogador e escolher o canto durante a carga | WASD ou setas | Analógico esquerdo |
| Correr | Shift | RT |
| Chute normal | Segurar e soltar X | Segurar e soltar X |
| Chute colocado | F com X | RB com X |
| Cavadinha | E com X | LB com X |
| Fake shot ou cortinho | Com X carregando, indicar a direção e apertar Espaço | Com X carregando, indicar a direção e apertar A |
| Puxar a bola com a sola | E sem carregar o chute | LB sem carregar o chute |
| Finalizar de primeira no rebote | Toque em X | Toque em X |
| Passar para o companheiro, em lance aberto da carreira | T | Y |
| Nova bola no treino | T ou B | B |
| Replay no treino | V | A fora da carga do chute |
| Trocar câmera | C | View |
| Mirar em falta ou pênalti | A/D ou ←/→ | Analógico esquerdo na horizontal |
| Confirmar local da falta no treino | X | X |
| Pausar ou continuar | Esc ou P | Menu |
| Navegar nos menus | Tab e Shift+Tab | Direcional ou analógico esquerdo |
| Confirmar ou voltar no menu | Enter ou Esc | A ou B |
| Trocar abas principais da carreira | Tab para focar e Enter para selecionar | LB ou RB |
| Trocar submenus da carreira | Tab para focar e Enter para selecionar | LT ou RT |
| Girar o jogador no editor | ←/→ | LB ou RB |
| Ajustar o jogador do treino | ↑/↓ selecionam, ←/→ alteram | ↑/↓ selecionam, ←/→ alteram |

O movimento usa os eixos da câmera. Há câmeras **jogador**, **clássica** e **lateral**, além do enquadramento específico das cobranças. Em bola rolando, o eixo horizontal na carga escolhe o alvo e a retícula acompanha a altura prevista da bola. O mouse permite navegar e acionar a interface. Perder o foco da janela ou ocultar a aba limpa os comandos e pausa a partida quando aplicável.

## 3. Movimento, domínio e dribles

- Uma chance de bola rolando começa com o atacante conduzindo automaticamente a cerca de 2,12 m/s. A condução inicial dura até cerca de 0,78 s e cede ao primeiro comando direcional. Se a primeira ação for uma arrancada diagonal curta enquanto a bola ainda está acessível, o jogo pode ativar um corte guiado para o pé alcançar a bola durante a transição.
- A condução combina direção desejada, velocidade real, aceleração, desaceleração, apoio dos pés e previsão do movimento da bola. O jogador pode correr sem domínio e recuperar uma bola baixa ao alcançá-la com o pé. A velocidade cai quando o defensor trava a passada ou quando a estamina está baixa.
- A bola tem inércia e pode escapar em uma mudança de direção. A passada planeja o ponto de encontro e a física verifica o contato entre o volume da chuteira e a bola. Os toques possíveis incluem condução, corte, domínio de bola solta e recepção em movimento. Há assistência de condução para estabilizar a bola no início do lance e quando ela começa a derivar.
- Uma inversão acentuada pode acionar uma sequência de apoio, puxada de sola, giro e saída. Parado, **E/LB** solicita uma puxada manual quando a bola está sob domínio e perto do pé. Em movimento, o mesmo comando pode solicitar um corte mais forte se o ângulo e a velocidade forem suficientes.
- O **fake shot** cancela a carga de chute. Para cortar, indique uma direção, tenha domínio e mantenha a bola baixa e próxima. Sem direção válida, o comando cancela a carga. Um desvio de aproximadamente 28° a 130° em relação ao corpo usa a animação lateral própria para esquerda ou direita. O jogador planta o apoio, ameaça o chute com o tronco, ajusta a chuteira à posição da bola e sai na direção escolhida. O desvio da bola depende de contato detectado com o pé.

## 4. Finalizações

**Chute normal.** Segure X para carregar e solte para executar. A força vai de 17% a 100% no lançamento e a carga começa a preencher a 164 pontos percentuais por segundo. A força altera a janela de precisão e a trajetória. Aproximar a carga de 53% reduz a dispersão básica em bola rolando. A distância, a pressão, o atributo Chute e a Frieza também influenciam a dispersão. A altura indicada no HUD vem de uma previsão de trajetória.

**Escolha de animação e pé.** Conforme a posição do corpo, a velocidade, a força, o alvo e a altura da bola, o jogo escolhe um chute frontal, de corrida, forte, lateral, diagonal, de costas, colocado ou voleio. Alguns chutes perto do gol e bem direcionados ao canto usam animação de colocada. Em bola rolando, o jogo avalia os dois pés pelo alcance e pela geometria da bola. Em falta ou pênalti, usa o pé dominante. O pé fraco aumenta a dispersão. Um chute de costas com o pé fraco também reduz a força efetiva.

**Colocado e cavadinha.** F/RB com X imprime curva no colocado. E/LB com X gera uma trajetória em arco com rotação para trás. A cavadinha tem velocidade horizontal menor e maior componente vertical. A mira e o momento do contato influenciam onde a bola cruza o gol. Em bola parada, falta e pênalti têm cálculo de trajetória próprio.

**Contato.** Soltar X prepara uma finalização e posiciona o pé de apoio. O disparo ocorre quando a chuteira em movimento encontra a bola na janela certa. Se a passada não chegar à bola, aparece **SEM CONTATO**. O contador de chutes avança quando a bola é lançada, excluindo a finalização automática do companheiro.

**Rebote e voleio.** Trave e bola espalmada com as mãos abrem uma janela de rebote de até 3 s enquanto a bola permanece viva. Um toque em X solicita um chute de primeira, com potência sorteada entre 36% e 92% e uma janela curta de execução. Se a bola estiver alta no impacto previsto, o jogo seleciona o voleio. Em bola rolando, uma bola suficientemente elevada também pode levar a um voleio sem um comando dedicado.

## 5. Goleiro, defensores e companheiro

### Goleiro

- Em bola rolando, ajusta posição e profundidade pela bissetriz do ângulo entre a bola e as duas traves. Sem cobertura defensiva à frente do atacante na área, pode sair para fechar o ângulo. Quando já está saindo e o alinhamento lateral está aberto, reduz o avanço para corrigir o posicionamento. Perto da bola baixa, pode tentar abafar ou encaixar nos pés.
- No chute, projeta a trajetória até o gol e até o plano de contato. A boca do gol tem uma grade de 5 colunas por 3 alturas. As colunas A a E vão da esquerda para a direita em coordenadas do campo. As alturas 1 a 3 vão de cima para baixo. Cada zona sugere clipes de defesa, com regras especiais para chutes baixos, rápidos, altos, próximos e nos cantos.
- A reação inclui bolas até 0,75 m além dos limites geométricos da boca do gol pela regra de distância da zona. Por isso, um chute que passa rente à trave ou ao travessão pode provocar um salto mesmo quando a bola vai sair. Em pênaltis, o goleiro pode saltar para o lado errado.
- Na cavadinha, acompanha a bola recuando enquanto prepara a resposta. Para coberturas longas, a partir de 16,5 m, o código prevê a altura no ponto em que ainda daria para defender em pé. Quando a trajetória exige mais alcance, pode selecionar salto para trás e com braço estendido.
- A escolha da defesa considera posição, tempo até contato, altura, potência, zona, dificuldade e alcance dos clipes. Quando há mais de uma opção alcançável, o histórico recente por zona ajuda a variar a animação. A leitura pode falhar. A defesa só se concretiza se a bola colidir com o goleiro. O contato pode produzir encaixe, espalmar, soco ou bloqueio com pés, pernas ou corpo.

### Defensores

- O defensor mais próximo tende a iniciar a pressão. Os demais cobrem linhas e posições conforme seus papéis e distâncias. Podem disputar corpo a corpo, tentar desarme em pé, interceptar com carrinho, bloquear o corredor do chute, desviar com o corpo ou tirar uma bola baixa próxima à linha do gol.
- A pressão aumenta a dispersão do chute, reduz o ritmo do atacante e consome estamina. **Força** aumenta a resistência à tomada de bola. Um desarme limpo pode dar domínio ao defensor, que ajeita e afasta a bola.
- No carrinho, tocar o atacante sem tocar a bola antes de ela cruzar a linha pode gerar falta. Na carreira, a posição do atacante define pênalti na área ou falta com barreira fora dela. A cobrança substitui a fase atual do lance sem gastar uma oportunidade adicional. O cronômetro volta a 10 s na cobrança e os chutes já executados ficam contabilizados. No treino de bola rolando, o lance exibe a falta e reinicia após a espera do resultado.

### Companheiro

- Existe um companheiro nos lances de bola rolando da carreira. **T/Y** passa para ele se o atacante estiver em domínio com a bola baixa e próxima, sem chute em preparação e dentro da distância de passe. O companheiro tenta finalizar automaticamente após receber.
- Gol direto do atacante soma gol pessoal. Gol da finalização do companheiro soma assistência. Um chute originalmente fora do alvo que entra após desvio de um defensor pode contar como gol contra. Os três desfechos aumentam o placar da equipe.

## 6. Gol, linha de fundo e encerramento do lance

| Evento | Regra e efeito |
| --- | --- |
| Gol | O centro da bola cruza o plano de linha de fundo em `z = -0,11 m`, com `|x| ≤ 3,55 m` e `y ≤ 2,33 m`. O resultado vale para chute, desvio e condução. A rede recebe a bola após o gol. |
| Entrar com bola e tudo | O atacante pode passar do limite frontal. Ao cruzar entre as traves com a bola em domínio ou em condução recuperável, aparece **Entrou com bola e tudo!**. A passada de saída continua brevemente enquanto o resultado é mostrado. |
| Saída pela linha de fundo | Cruzar a mesma linha fora da abertura gera **PRA FORA!**. A bola precisa cruzar a linha antes de encerrar o lance. |
| Trave com bola viva | O contato com poste ou travessão incrementa **Traves** e anuncia **NA TRAVE!**. Se a bola ainda está em jogo, o lance continua com possibilidade de rebote. |
| Trave seguida de saída | Quando a bola sai após bater na trave, o lance termina e mostra **TRAVE!** por cerca de 1,4 s antes da transição. Uma cobrança que morre após o contato com a trave também encerra com essa classificação. |
| Encaixe ou bloqueio | Encaixe do goleiro encerra a chance. Uma defesa que devolve a bola ao campo pode continuar. Uma cobrança de bola parada bloqueada e sem possibilidade de sequência encerra a chance. |
| Outros limites | A bola que sai lateralmente ou pelo fundo do recorte jogável também pode terminar o lance. A carreira classifica a perda da bola para fora do alcance como saída do lance. |
| Fim do relógio | Na carreira, a chance termina por tempo se nenhuma outra condição ocorrer. Se a bola está próxima, baixa, avançando sob condução e prestes a cruzar a linha, há até 2,5 s de tolerância para completar a jogada. |

A prioridade de eventos importa. Um contato de defensor ou goleiro só pode evitar o gol se ocorrer antes do cruzamento da linha naquele subpasso de física. A condução e o trajeto de saída do atacante têm tratamento próprio para evitar que o movimento seja congelado antes da mensagem de resultado.

## 7. Treino livre

- **Bola rolando.** O atacante começa em movimento e enfrenta o goleiro mais 1 a 5 defensores. O padrão é um defensor. A quantidade pode ser alterada no menu de pausa e a mudança reinicia a bola.
- **Faltas.** Mova a bola para uma posição fora da área e confirme com X. Solte X antes de iniciar a cobrança. A barreira tem de seis a oito jogadores, conforme a distância, a cerca de 9,15 m no eixo da cobrança. Use a mira horizontal e o carregamento para definir a trajetória.
- **Pênaltis.** Bola centralizada a 11 m. Há goleiro e não há barreira. O cobrador fica no local da cobrança. A mira gira dentro de uma faixa limitada.
- **Jogador do Treino.** No treino aberto pelo menu inicial, o menu de pausa permite escolher pé dominante e editar seis atributos entre 50 e 99. O treino iniciado pela carreira herda os atributos e a aparência do personagem da carreira.
- **Chances e replay.** O treino funciona sem o cronômetro de 10 s da carreira. Mostra gols, defesas, chutes e traves da sessão. O usuário pode pedir nova bola a qualquer momento permitido pelo modo. O jogo também reinicia após resultados e esperas próprias, por exemplo cerca de 3,5 s para encaixe e 1,15 s para saída pela linha de fundo. O replay em câmera lenta usa o lance registrado disponível, com mínimo de 15 quadros.

## 8. Carreira

### Criação, seletiva e contrato

1. A carreira mantém um personagem por armazenamento do navegador. O editor permite nome de até 22 caracteres, pé dominante, cabelo, barba, pele, cores, chuteira e opções do uniforme. O nome padrão é **Camisa 10**.
2. Escolha **Brasa Laranja**, **Linha Azul** ou **Vento Dourado** para a seletiva contra **Seleção da Arena**. A partida tem cinco chances.
3. A nota da seletiva é 50 mais a contribuição de gols e assistências por chance, multiplicada por 42, com bônus de seis pontos pela vitória. Uma assistência pesa 0,65 gol nessa conta. A nota é arredondada e limitada a 0–100. O desempenho determina as três propostas iniciais da Série B.
4. Ao aceitar uma proposta inicial, inicia-se a temporada do clube escolhido. O jogo oferece treino também durante a seletiva, nas propostas iniciais e no submenu **Treino > Treino Livre** do painel da carreira.

### Partidas e temporada

- Existem Séries A, B e C, com 20 clubes por série. Cada série disputa 38 rodadas em turno e returno. O calendário distribui mandos e o simulador resolve os outros jogos das três divisões conforme a força dos times e o mando. Os clubes de cada série vêm de um catálogo fixo. O primeiro ano é 2026.
- A partida oficial oferece de três a seis chances conforme força do adversário, mando e cenário. O placar inicial é sorteado de uma tabela de situações. Cada chance dura 10 s, em posição de bola rolando, falta com barreira ou pênalti quando a situação exige. O número de defensores em bola rolando varia com a dificuldade e o cenário. Os adversários de força até 65 usam a dificuldade fácil, de 77 para cima usam difícil e os demais usam normal.
- O resultado efetivo de cada chance atualiza o placar ou registra defesa, saída ou tempo esgotado. Ao usar a última chance, o jogo grava a rodada, atualiza os totais pessoais, paga o salário do clube e abre o resultado com o replay de cada oportunidade disponível. Abandonar a partida preserva as oportunidades já confirmadas. Ao retornar, o jogo recria a oportunidade pendente ou retoma a cobrança registrada após falta.
- A classificação usa 3 pontos por vitória e 1 por empate. Os desempates são vitórias, saldo de gols, gols pró e nome do clube. A artilharia combina os gols do usuário com concorrentes simulados. O noticiário é gerado pelos dados da carreira e tem filtros **Todos**, **Meu Clube** e **Meu Jogador**.
- Ao terminar a rodada 38, é possível iniciar a temporada seguinte. O ano avança e tabela, estatísticas da temporada e histórico de jogos da temporada são reiniciados. Personagem, clube atual, dinheiro, itens e conquistas são preservados.

### Atributos, dinheiro, propostas e conquistas

| Atributo | Inicial | Uso principal |
| --- | ---: | --- |
| Chute | 74 | Precisão e efeito nas finalizações |
| Estamina | 71 | Capacidade total para esforço |
| Força | 68 | Resistência à pressão e ao desarme |
| Frieza | 70 | Precisão sob pressão |
| Velocidade | 72 | Ritmo de deslocamento e corrida |
| Aceleração | 65 | Quanto o jogador consegue ganhar de velocidade a cada passo |

O geral é a média arredondada dos seis atributos. A estamina cai ao correr e sob pressão, recupera em ritmo menor ao se deslocar e mais rapidamente parado. A corrida é bloqueada na exaustão até recuperar 13% da reserva. Cada chance nova recarrega a reserva. Na carreira, o editor altera nome e visual. O ajuste direto dos atributos é oferecido no treino independente.

- **Salário e loja.** O salário é creditado a cada rodada concluída pelo clube atual. O saldo compra cosméticos. É possível pré-visualizar, comprar e equipar. Comprar exige saldo, impede duplicatas e equipa o item comprado. Itens e propostas podem aparecer com indicadores de novidade.
- **Mercado.** A cada quatro rodadas e no fim da temporada, o jogo avalia o histórico das últimas quatro rodadas. A média é calculada somando os gols e 1,20 vez as assistências, divididos pelos jogos do período. A nota abaixo de 0,33 fica sem proposta. As faixas a partir de 0,33, 0,69 e 1,30 qualificam a busca respectivamente para Série C, Séries B/C e Séries A/B. As propostas expiram após até quatro rodadas. Aceitar pode mudar o clube e a divisão do jogador. Recusar remove a proposta. Uma partida pendente impede a decisão.
- **Confirmação.** Compras, aceitar ou recusar propostas e excluir a carreira exigem segurar a ação por cerca de 1,6 s.
- **Conquistas.** Melhor do mês compara contribuição em blocos de quatro rodadas e exige pelo menos dois jogos no período da divisão. Ao fim da temporada, podem ser concedidos título, artilharia, líder de assistências e melhor jogador. A pontuação de desempenho usa 3 por gol, 2,4 por assistência e 0,85 por vitória. Os prêmios comparam o usuário a concorrentes simulados por divisão.

## 9. Mapa técnico

A entrada oficial é `goat/src/index.html`. A publicação copia os recursos separados para `goat/dist/`. Os caminhos da tabela são relativos à pasta `goat/`.

| Módulo | Responsabilidade | Entradas para manutenção |
| --- | --- | --- |
| `src/index.html` e `src/ui/comic.css` | Canvas, HUD, menus, pausa, visual | IDs do HTML e classes usadas em `career-ui.js` |
| `src/gameplay/game.js` | Integração da partida, entradas, regra de fim de lance, IA defensiva, tiros e câmera | `frame()`, `input()`, `chancePosition()`, `advanceCareerChance()`, `queueShot()`, `launchShot()`, `chooseDive()`, `keeperAnimation()`, `physics()`, `finishEndLine()` |
| `src/gameplay/football-motion.js` | Movimento, aceleração, passadas, giros, pé de apoio e cortes | `createFootballMotionController()`, `move()`, `locomotion()`, `planContact()`, `reverseRun()`, `lateralFakePose()` |
| `src/gameplay/ball-physics.js` | Integração da bola, lançamento, rolagem, curva, colisão e toque | `createFootballBallPhysics()`, `step()`, `crossing()`, `sweepBoot()`, `groundTouch()`, `goalFrame()`, `launch()` |
| `src/rendering/mocap.js` e `assets/animations/` | Rig, poses, clipes incorporados, IK, volumes de contato e espelhamento | `createFootballMocap()`, `update()`, `updateMocap()` em `game.js` |
| `src/gameplay/goalkeeper-zones.js` e `src/rendering/net.js` | Opções de defesa por zona e resposta da rede | `goatGoalkeeperZones.locate()`, `prepareClips()`, `goalNet.contain()` |
| `src/career/career-season.js` | Estado e regras puras da carreira e tabelas de dados | `goatCareerSeason`, `create()`, `restore()`, `chance()`, `finishMatch()`, `standings()`, `propose()` |
| `src/career/career-ui.js` e `src/career/career-replay.js` | Navegação, editor, loja, persistência e replays | `createGoatCareer()`, `hub()`, `dispatch()`, `persist()`, `window.careerReplayStore` |
| `tools/animation-viewer/index.html` | Visualizador auxiliar de clipes | Seleção e inspeção de poses e quadros |

**Tempos e coordenadas.** A simulação de jogo dá passos fixos de 1/120 s e subdivide a física da bola em passos de no máximo 1/240 s. Coordenadas são `[x, y, z]` em metros. `x` é lateral, `y` é altura e o ataque progride em direção a `z` menor. O gol é desenhado em torno de `z = 0`. O plano efetivo da regra fica atrás pela distância do raio da bola, que é 0,11 m. A física usa gravidade de 9,81 m/s², resistência do ar, efeito Magnus, restituição e atrito. A bola livre tem desaceleração de piso maior que a bola sob domínio.

**Estados.** `ballState` passa por `controlled`, `loose`, `flight`, `pass`, `teammate`, `defender`, `held`, `goal` e, durante a transição da falta da carreira, `foul`. `shot`, `windup`, `result`, `hitGoalFrame` e `careerPlay.transition` carregam informações complementares. Um toque pode alterar o dono momentâneo sem encerrar a chance. Resultado de trave com bola viva, por exemplo, difere de saída depois da trave.

**Persistência.** O save usa `localStorage` na chave `goat-career-v1`, com estrutura atual de versão 2 e migração da versão 1 em `restore()`. A configuração do treino usa `goat-training-player-v1`. A carreira grava os quadros de replay a 30 por segundo no IndexedDB `goat-replays`, coleção `clips`, com fallback em memória. O replay pode incluir um trecho parcial antes da cobrança de uma falta. Depois de continuar da tela de resultado, os clipes correspondentes são descartados. O progresso pertence ao navegador e ao contexto no qual o arquivo foi aberto.

## 10. Como continuar o projeto

1. Para compartilhar o projeto com outra IA, envie o ZIP do GOAT ou a pasta `goat/` junto com este guia e o `AGENTS.md`. O `README.md` da pasta explica como executar e localizar as fontes.
2. Edite os módulos em `goat/src/` e execute `npm --prefix goat run build` na raiz. Para conferir sintaxe e referências, use `npm run check`. Não gere uma versão de HTML único.
3. Evite acoplar mudanças de visual ao resultado. Para mexer em animação, preserve a janela de contato e os volumes da chuteira, luva ou corpo. Para mexer na linha de fundo, preserve a ordem entre contato físico, cruzamento e transição. Para mexer no save, preserve a migração e os dados do jogador já existentes.
4. A checagem por simulação confirmou 72 combinações de contato e saída do cortinho lateral, incluindo os dois lados, ângulos diagonais e laterais e diferentes velocidades iniciais. A avaliação visual em navegador ainda é necessária. Cenários prioritários são cortar andando e correndo, arrancar na diagonal no início do lance, entrar no gol com bola dominada, conduzir para fora pela linha de fundo, trave com rebote versus trave para fora, salto em chute rente ao gol e reação a uma cavadinha longa.
