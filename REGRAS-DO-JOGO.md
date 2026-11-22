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
| Chute de primeira em passes ou bolas soltas | Segurar X antes da chegada e soltar para preparar | Segurar X antes da chegada e soltar para preparar |
| Passe rasteiro / pedir passe ao companheiro com a bola | Espaço | A |
| Lançamento rasteiro em profundidade / pedir lançamento | Segurar e soltar Y | Segurar e soltar Y |
| Lançamento aéreo em profundidade | E + segurar e soltar Y | LB + segurar e soltar Y |
| Cruzamento / pedir cruzamento | Segurar e soltar B | Segurar e soltar B |
| Nova bola no treino | T | R3 |
| Replay no treino | V | L3 |
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

**Chute de primeira, voleio e cabeceio.** Sem a posse, segure X para carregar a força antes de receber um passe ou alcançar uma bola solta e solte para preparar a finalização. O jogador continua se movimentando e buscando a interceptação enquanto carrega ou aguarda. A força é a escolhida na barra, com o mesmo ritmo de carga do chute normal; não é sorteada. O comando de chute ou voleio fica aguardando por até 2,4 s após a soltura. Cabeceios usam um toque em X, sem carregar força, escolhendo Header no chão ou Soccer Header com salto pela altura prevista da bola. Segurar X não atrasa nem aumenta a força de um cabeceio. Se X foi solto antes da chegada, o domínio automático cede à finalização preparada, cujo tempo de contato é sincronizado com a interceptação prevista. Se X ainda estiver pressionado no contato, o jogador domina a bola e transfere a força acumulada para a carga normal, mantendo a direção e a velocidade de corrida escolhidas. Soltar X depois desse domínio executa o chute normal. A mecânica vale também para sobras após defesa ou trave, sem uma janela exclusiva de rebote. Uma preparação que não encontra contato expira e permite voltar a dominar normalmente.

## 5. Goleiro, defensores e companheiro

### Goleiro

- Em bola rolando, ajusta posição e profundidade pela bissetriz do ângulo entre a bola e as duas traves. Sem cobertura defensiva à frente do atacante na área, pode sair para fechar o ângulo. Quando já está saindo e o alinhamento lateral está aberto, reduz o avanço para corrigir o posicionamento. Perto da bola baixa, pode tentar abafar ou encaixar nos pés.
- No chute, projeta a trajetória até o gol e até o plano de contato. A boca do gol tem uma grade de 5 colunas por 3 alturas. As colunas A a E vão da esquerda para a direita em coordenadas do campo. As alturas 1 a 3 vão de cima para baixo. Cada zona sugere clipes de defesa, com regras especiais para chutes baixos, rápidos, altos, próximos e nos cantos.
- A reação inclui bolas até 0,75 m além dos limites geométricos da boca do gol pela regra de distância da zona. Por isso, um chute que passa rente à trave ou ao travessão pode provocar um salto mesmo quando a bola vai sair. Em pênaltis, o goleiro pode saltar para o lado errado.
- Na cavadinha, acompanha a bola recuando enquanto prepara a resposta. Para coberturas longas, a partir de 16,5 m, o código prevê a altura no ponto em que ainda daria para defender em pé. Quando a trajetória exige mais alcance, pode selecionar salto para trás e com braço estendido.
- A escolha da defesa considera posição, tempo até contato, altura, potência, zona, dificuldade e alcance dos clipes. Quando há mais de uma opção alcançável, o histórico recente por zona ajuda a variar a animação. A leitura pode falhar. A defesa só se concretiza se a bola colidir com o goleiro. O contato pode produzir encaixe, espalmar, soco ou bloqueio com pés, pernas ou corpo.

### Defensores

- Um defensor inicia a pressão ou busca o ponto de interceptação previsto da bola. Os demais recebem alvos distintos: marcar linhas de passe para o usuário ou outros companheiros, antecipar o recebedor de um cruzamento, cobrir o gol e equilibrar os lados. Bolas altas podem ser amortecidas com joelho, peito ou cabeça; o defensor que toca recebe prioridade na disputa da bola que cai, domina embaixo e lança para afastar sem esperar uma animação longa. Os botes são mais rápidos, têm menos intervalo entre tentativas e antecipam melhor a bola exposta na condução. A atribuição considera a distância e preserva o marcador anterior quando possível para evitar trocas constantes e corridas em bloco. Podem disputar corpo a corpo, tentar desarme em pé, interceptar com carrinho, bloquear o corredor do chute, desviar com o corpo ou tirar uma bola baixa próxima à linha do gol.
- A pressão aumenta a dispersão do chute, reduz o ritmo do atacante e consome estamina. **Força** aumenta a resistência à tomada de bola. Um desarme limpo pode dar domínio ao defensor, que faz um ajuste curto e afasta a bola. Após um carrinho com contato na bola, o afastamento acontece com a perna da disputa, antes da animação de levantar terminar. Os outros defensores abrem espaço durante a posse e o afastamento; não cercam a bola.
- No carrinho, tocar o atacante sem tocar a bola antes de ela cruzar a linha pode gerar falta. Na carreira, a posição do atacante define pênalti na área ou falta com barreira fora dela. A cobrança substitui a fase atual do lance sem gastar uma oportunidade adicional. O cronômetro volta a 10 s na cobrança e os chutes já executados ficam contabilizados. No treino de bola rolando, o lance exibe a falta e reinicia após a espera do resultado.

### Companheiros e passes

- Nos lances coletivos de bola rolando da carreira há três companheiros. No treino livre, o menu de pausa permite escolher de zero a quatro, com dois por padrão. A preferência do treino fica salva no navegador. Cobranças, treino sem bola e exercícios individuais mantêm suas regras próprias.
- A / Espaço executa passe rasteiro; segurar e soltar Y carrega e executa o lançamento rasteiro; LB + segurar/soltar Y ou E + segurar/soltar Y faz o lançamento aéreo; B cruza para a região central da área. O analógico ou a direção de movimento orienta o ponto de destino. Durante a carga de Y, a barra mostra a força e a mira no campo mostra esse destino; mais força adianta o ponto no espaço. O passe só sai ao soltar Y. Durante a carga de X, A / Espaço continua sendo cortinho.
- Durante a recepção, o usuário orienta o corpo e o olhar para a bola em passes comuns e para o ponto futuro de encontro nos lançamentos. O movimento indicado no controle é preservado para a saída do primeiro toque.
- O recebedor de um passe é atraído para um ponto alcançável na trajetória futura da bola, usando a mesma previsão de gravidade, resistência do ar e atrito da simulação. Isso vale para o usuário, companheiros e lançamentos aéreos. O usuário pode contrariar a assistência indicando uma direção claramente oposta.
- Cada tipo de passe calcula velocidade e trajetória pela distância e pelo destino, considerando resistência do ar, gravidade, atrito e efeito. Lançamentos escolhem um ponto futuro na direção da corrida ou da intenção do recebedor, mesmo que ele esteja parado no momento do passe; não se limitam à posição atual. Cruzamentos chegam pelo alto à região de finalização. A bola continua sujeita a interceptações, desvios, saídas e defesa do goleiro.
- Sem dono e sem um destinatário de passe ativo, a bola é buscada pelo atacante mais próximo, considerando o usuário e os companheiros. Os demais procuram opções de passe. Cada companheiro tem corredor, profundidade e intervalo de decisão próprios, sem copiar a direção do usuário.
- Os companheiros procuram espaço, linhas de passe e corredores alternados, mantendo separação do usuário e dos demais aliados. Seguram a corrida junto à linha de impedimento antes do passe e atacam a profundidade depois da saída da bola. Quando o portador chega à linha de fundo, oferecem opções na marca do pênalti, na entrada da área e na região do segundo poste.
- Com a bola, escolhem corredores com menos pressão, conduzem para avançar, passam para um jogador com melhor oportunidade e correm para oferecer a devolução. Tentam finalizar com linha de chute aberta e devolvem ao usuário quando ele está melhor posicionado e o corredor do passe está livre.
- Enquanto um companheiro tem a posse, X força a tentativa de finalização; A, Y, LB + Y e B pedem que ele execute a ação correspondente em direção ao usuário. Pedidos durante a chegada de um passe podem ficar aguardando o domínio por uma janela curta. A ação ainda depende de alcançar a bola e realizar o contato.
- O impedimento vale também no treino livre quando há pelo menos um defensor de linha. Com zero defensores no treino, a regra fica desativada, mesmo com o goleiro presente. Registra a posição dos atacantes no instante do toque do passador ou finalizador. A referência é a bola e o penúltimo adversário, incluindo o goleiro, na metade ofensiva. Estar adiantado por si só não encerra o lance: a infração é marcada ao tocar a bola. Recuar depois do passe não apaga a posição registrada; ultrapassar a defesa depois da saída da bola é permitido. Um desvio mantém a avaliação; uma nova posse deliberada do adversário encerra a avaliação anterior. O impedimento exibe mensagem, apito e encerra a chance.
- A recepção de um companheiro amortece o primeiro toque e reduz sua velocidade antes da condução. A manutenção do domínio usa assistência física curta junto aos pés. O intervalo de recepção do usuário diminui continuamente; um passe que expira sem recepção volta a ser bola livre, permitindo recuperar o domínio em contatos posteriores.
- Os companheiros cancelam as ações e transitam para a postura neutra quando o lance termina, inclusive por impedimento. A velocidade de corrida é zerada no encerramento; a animação não continua uma passada com o personagem parado. Chutes e domínios encerram antes do fim estático do clipe e reiniciam os apoios ao voltar à locomoção. Nos passes, a influência da animação e do posicionamento dos pés é combinada progressivamente para evitar comandos conflitantes na perna.
- Os companheiros usam rigs independentes e aparecem nos replays. Gol do usuário soma gol pessoal; gol de companheiro após passe do usuário soma assistência; gol de companheiro após combinação entre aliados soma apenas para a equipe.

### Recepção aérea e movimentação sem posse

- Em bola na altura da cabeça, um toque em X prepara o cabeceio por até 1,8 s, com força própria, sem carga. A previsão da trajetória escolhe o encontro alcançável e sincroniza a animação com esse momento: **Header** para a altura da cabeça sem salto, **Soccer Header** para a bola mais alta que exige salto. O contato é conferido pela trajetória da cabeça em cada subpasso da física. A preparação não exige repetir X nem acertar um quadro exato; uma bola fora do alcance continua podendo passar.
- Os passes misturam a recuperação do chute com a locomoção, mantendo o deslocamento, a passada de apoio e uma saída gradual da animação. A animação termina antes de ficar presa no último quadro.
- A recepção antecipa a queda da bola e exige contato físico com joelho, peito ou cabeça. A preparação do domínio usa o ponto de interceptação previsto, com a fase do clipe ajustada ao tempo de chegada; no chão, a pose de recepção pode ser misturada com a corrida. A velocidade de chegada é amortecida para preparar o próximo toque; a bola não é colocada instantaneamente no chão.
- Uma bola frontal na cintura seleciona **Kneeing Soccerball**. Na região do peito, seleciona **Header Soccerball** para o domínio corporal. Bolas acima da cabeça podem exigir salto. Cabeceios de finalização têm trajetória própria e dependem do contato da cabeça.
- Com corrida pressionada e uma direção indicada, bolas no peito ou na barriga usam **Receive** para orientar a saída para o lado escolhido. O comando pode ser atualizado durante a aproximação, antes do contato.
- Quando um companheiro está com a bola, o usuário se desloca com o corpo voltado para ela. A direção relativa de movimento escolhe **Jog Forward**, **Jog Backward** e os clipes diagonais correspondentes.
- A câmera lateral acompanha a bola. A câmera de jogador preserva o enquadramento anterior enquanto o usuário tem o domínio; sem a posse, parte de trás do personagem, acompanha a bola e limita a rotação para não apontar para a metade oposta do campo.

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
| Fim do relógio | Na carreira e nas cobranças, um chute em preparação ou em andamento impede o encerramento por tempo até seu resultado físico: gol, saída, defesa resolvida ou bola que perdeu o movimento. A mesma proteção impede reinícios automáticos do treino durante a trajetória do chute. Sem chute pendente, a chance termina por tempo se nenhuma outra condição ocorrer. Se a bola está próxima, baixa, avançando sob condução e prestes a cruzar a linha, há até 2,5 s de tolerância para completar a jogada. |

A prioridade de eventos importa. Um contato de defensor ou goleiro só pode evitar o gol se ocorrer antes do cruzamento da linha naquele subpasso de física. A condução e o trajeto de saída do atacante têm tratamento próprio para evitar que o movimento seja congelado antes da mensagem de resultado.

## 7. Treino livre

- **Bola rolando.** O atacante começa em movimento e enfrenta o goleiro mais 0 a 5 defensores e 0 a 4 companheiros. O padrão é zero defensores e dois companheiros. A quantidade pode ser alterada no menu de pausa e a mudança reinicia a bola.
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

O goleiro também prevê passes e cruzamentos próximos dentro da área: sai para o ponto de encontro, mergulha em bolas baixas e usa encaixe alto com salto quando necessário. O domínio depende do contato físico das luvas; bolas fora do alcance continuam em jogo. Os zagueiros tentam afastar bolas na altura da cabeça com cabeceio no chão ou com salto, enviando a bola para longe do gol após o contato.

O noticiário publica uma matéria por partida, com um repórter responsável, e combina o resultado com a atuação do usuário quando ambos pertencem ao mesmo jogo. As manchetes e os comentários variam conforme desempenho, placar e importância do confronto. Algumas matérias exibem cenas ilustrativas renderizadas com os modelos do jogo: finalizações e comemorações nos destaques, Sad Walk/Sad Idle nas críticas. Pré-jogos de clássicos e fases decisivas podem mostrar a vista aérea do estádio específico do mandante. As imagens têm tamanho limitado nos cartões e não são gravações da partida.

Após um gol da equipe do usuário, alguns defensores alternam Sad Walk e Sad Idle durante a comemoração. Os companheiros escolhem por conta própria o destino de seus lançamentos, antecipando a direção e a velocidade da corrida do recebedor. Também podem iniciar lançamentos ao identificar uma corrida em profundidade; pedir o lançamento não permite definir o ponto do passe do companheiro.

Nos cruzamentos, atacantes e defensores antecipam a disputa aérea usando a trajetória física prevista e a posição da cabeça no quadro de contato do clipe. A corrida compensa o deslocamento da cabeça em relação ao corpo; o salto e a animação atingem o contato no instante de chegada. Os companheiros preparam a finalização antes da bola encostar, e os defensores preparam o afastamento. A checagem percorre o movimento da cabeça e da bola, preservando bolas fora do alcance e disputas perdidas. O tempo de voo do cruzamento também considera o deslocamento necessário do recebedor.

## 9. Mapa técnico

A entrada oficial é `goat/src/index.html`. A publicação copia os recursos separados para `goat/dist/`. Os caminhos da tabela são relativos à pasta `goat/`.

| Módulo | Responsabilidade | Entradas para manutenção |
| --- | --- | --- |
| `src/index.html` e `src/ui/comic.css` | Canvas, HUD, menus, pausa, visual | IDs do HTML e classes usadas em `career-ui.js` |
| `src/gameplay/game.js` | Integração da partida, entradas, regra de fim de lance, IA defensiva, tiros e câmera | `frame()`, `input()`, `chancePosition()`, `advanceCareerChance()`, `queueShot()`, `launchShot()`, `chooseDive()`, `keeperAnimation()`, `physics()`, `finishEndLine()` |
| `src/gameplay/football-motion.js` | Movimento, aceleração, passadas, giros, pé de apoio e cortes | `createFootballMotionController()`, `move()`, `locomotion()`, `planContact()`, `reverseRun()`, `lateralFakePose()` |
| `src/gameplay/team-ai.js` | Companheiros, ocupação de espaço, passes, recepção, comandos e impedimento | `reset()`, `request()`, `update()`, `touch()` |
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

### Cruzamentos com força e encontro da bola

Com a posse, segurar B carrega a força e soltar executa o cruzamento. Sem a posse, tocar B solicita o cruzamento ao companheiro, que decide a força pela distância e pela corrida do recebedor; a duração do botão não determina a força do companheiro. A direção seleciona o companheiro; o destino considera sua corrida, sem restringir o alvo ao centro da área. A força altera a velocidade horizontal e o impulso vertical: uma carga insuficiente deixa a bola curta e uma carga excessiva pode fazê-la passar pelo recebedor. A assistência de recepção usa a trajetória física prevista e só corrige corridas para encontros alcançáveis próximos; cruzamentos com erro grande de força ficam sem essa correção.

### Disputa em pé dos defensores

O bote em pé usa a locomoção contínua e uma janela da perna que está em movimento. O defensor acompanha o portador por um lado estável, tenta contato no ombro ou nas costas e procura o ponto futuro da bola com a chuteira, sem travar o corpo num clipe de interceptação. O roubo exige contato físico da chuteira com a bola. Os alvos das mãos limitam a extensão do braço e orientam o cotovelo para evitar hiperextensão.

Na disputa próxima, a segunda mão entra gradualmente conforme distância e alcance de cada braço. O contato usa plano de flexão estável, limite de dobramento do cotovelo e limite de extensão, sem forçar alvos atrás do ombro. Com a bola baixa exposta, o defensor procura ocupar o corredor entre o portador e a bola e pode tentar o toque curto com a chuteira mais próxima, mantendo a exigência de contato físico para o desarme.

A previsão do cruzamento solicitado resolve em conjunto o tempo de voo e o avanço do recebedor. A assistência busca um encontro alcançável na descida da bola e ajusta a velocidade para chegar no instante previsto. Companheiros distinguem uma oportunidade de finalização de cabeça de uma recepção para dominar; os domínios aéreos verificam o movimento dos pontos de contato entre os quadros e dão prioridade ao recebedor para recolher a bola amortecida.

Para desarmar o usuário por trás enquanto ele tem a posse, o defensor precisa manter pelo menos uma mão efetivamente em contato com o ombro ou as costas. A tentativa de agarrar sem alcance físico não habilita o roubo. A regra não altera disputas frontais, laterais nem a recuperação de bolas soltas.

Desarmes laterais exigem cerca de 0,7 s de combate próximo; por trás, cerca de 1,05 s, além do contato real de pelo menos uma mão. A força do usuário pode ampliar esse intervalo em até 0,15 s. O tempo é individual por defensor e zera ao se afastar, mudar a posse ou passar à disputa frontal. Pela frente, o desarme mantém a rapidez atual e exige contato da chuteira com a bola.

### Início dos ataques e indicadores

Lances comuns alternam saídas entre aproximadamente 29 e 47 metros do gol, incluindo os dois corredores laterais. A linha defensiva começa mais recuada, dando espaço inicial à condução. Saídas laterais colocam companheiros na área e na entrada dela. O relógio do lance cresce com a distância até a área e o consumo de estamina da corrida diminui na proporção dessa distância. Exercícios específicos e cobranças preservam suas posições próprias. Uma pequena bandeira acima do indicador do companheiro sinaliza posição de impedimento; a infração continua dependendo da participação no lance. A condução interpola a orientação do pé pelo giro mais curto e preserva a velocidade da perna ao replanejar o toque durante a passada.

### Seleção de passe e organização ofensiva

Um círculo no gramado destaca o companheiro selecionado para passe, lançamento ou cruzamento. A seleção usa a direção do controle na projeção da câmera, incluindo a lateral, e tem tolerância a pequenas oscilações. A carga preserva os eixos de direção e o alvo ao centralizar o controle; a soltura executa para o alvo exibido. Os companheiros recebem funções de ponta esquerdo, ponta direito, centroavante e apoio de meio, preenchendo os papéis disponíveis em torno da posição do usuário. Mantêm largura, profundidade e apoio, com o ponta oposto fechando para receber cruzamentos e deslocamentos táticos graduais.

O usuário ocupa sempre a função de meia-atacante. Cada lance coletivo da carreira alterna entre um e três companheiros: um centroavante; centroavante e um ponta; ou centroavante e os dois pontas. O treino de bola rolando permite escolher entre um e três companheiros. Cobranças e exercícios individuais mantêm sua configuração própria. A função do usuário não muda ao conduzir pela lateral.


### Condução do companheiro com espaço

Com corredor livre, o companheiro conduz em direção ao centro do gol e busca finalizar mais perto, por volta de 10,5 metros e com ângulo favorável. A pressão considera a distância e a velocidade de aproximação dos defensores e do goleiro: sob risco de perder a bola, pode antecipar um chute viável ou procurar um passe. Pedidos do usuário continuam tendo prioridade.


### Recepção de passes e câmera lateral

Passes rasteiros dos companheiros ao usuário antecipam seu deslocamento e miram à frente dos pés. Parado, o recebedor oferece a frente do corpo ao passador; na aproximação de um passe baixo, vira gradualmente para a bola antes do contato. A câmera lateral mantém altura, distância e ângulo fixos, deslizando apenas ao longo do campo conforme a posição da bola, sem zoom ou giro conforme a altura ou a largura da jogada.


Finalizações dos companheiros recalculam a aproximação a cada quadro pela trajetória prevista da bola e pela posição da chuteira no contato. A preparação dá tempo para ajustar o apoio e acompanha a bola até o impacto; o contato percorre o movimento da chuteira também antes do instante nominal. O chute continua exigindo contato físico.


Na aproximação do passe rasteiro pelas costas, o usuário reduz a corrida para receber e usa os clipes de corrida de costas ou diagonal conforme o deslocamento relativo ao corpo. A seleção desses clipes acompanha também a desaceleração de uma arrancada, evitando misturar pernas de corrida frontal com o corpo virado para a bola.


Nos lançamentos do usuário, a carga define o alcance a partir do passador, independentemente da distância do companheiro selecionado. O recebedor e sua corrida definem a direção; não reduzem a distância da mesma carga quando estão próximos. Os limites do campo continuam valendo e os companheiros preservam sua escolha autônoma de lançamento.


Companheiros orientam o domínio aéreo contra a direção de chegada da bola, mantendo essa orientação durante a aproximação. O domínio exige que a bola esteja à frente do corpo e não esteja chegando por trás; sem tempo para virar e fazer contato frontal, a bola continua em jogo.


Os cabeceios preservam o estado da passada durante a aproximação, entram gradualmente na preparação perto da chegada da bola e mantêm tempo de acompanhamento e pouso após o impacto. Companheiros em apoio param dentro de uma zona de tolerância e só retomam o ajuste de posição ao se afastarem dela, evitando oscilações por correções mínimas repetidas.


Passes rasteiros dos companheiros ao usuário limitam a antecipação a cerca de 1,2 m, mantendo a bola próxima dos pés mesmo na corrida. Lançamentos rasteiros autônomos comparam o tempo de chegada do recebedor, defensores e goleiro e verificam pontos intermediários da linha de passe. Priorizam a direção da corrida, vantagem de chegada e posição de finalização; quando não encontram uma profundidade segura, usam um passe curto.


Na câmera lateral em bola rolando, a mira do chute usa o eixo vertical do analógico: cima aponta para a esquerda do gol e baixo para a direita, incluindo diagonais. Vale para chute normal, primeira e cabeceio; cobranças mantêm sua orientação própria.


Com a posse, A/Espaço carrega o passe rasteiro e a soltura executa. Direção e força selecionam o recebedor dos passes, cruzamentos e lançamentos: cargas menores favorecem companheiros próximos, maiores favorecem distantes na direção indicada. A prévia acompanha a carga. O passe do usuário tem alcance definido pela carga; pedidos sem a posse continuam imediatos e os companheiros decidem a própria força.


A direção de passes usa a projeção do campo na câmera para converter o analógico, compartilhando a mesma direção com a escolha do recebedor. Lançamentos do usuário seguem essa direção e o alcance da carga, sem virar ao trocar o companheiro selecionado ou conforme sua corrida. Centralizar o analógico preserva a última direção durante a carga.


A câmera lateral fica perpendicular à linha lateral, sem deslocamento diagonal entre câmera e alvo. A posição fixa mais alta e afastada inclui as duas faixas laterais no enquadramento, mantendo somente o acompanhamento longitudinal da bola.


A defesa mantém funções por posição: laterais acompanham os pontas em seus corredores, zagueiros protegem o centro da área e volante acompanha o usuário. Um único defensor assume a pressão ou interceptação conforme proximidade, marcação atribuída e perigo central; os demais preservam suas regiões. A câmera lateral fica mais próxima e baixa, com enquadramento deslocado para a lateral próxima.


O goleiro cancela uma interceptação de passe quando a trajetória já não passa pelo ponto planejado. Ao perder a necessidade de saída ou trocar o portador da bola, reduz rapidamente a saída, recupera profundidade e realinha o ângulo com maior velocidade e aceleração, preservando tentativas de interceptação alcançáveis. A câmera lateral recebeu mais uma aproximação de zoom mantendo altura e ângulo constantes durante o lance.


A câmera lateral acompanha também a altura da bola: câmera e alvo recebem o mesmo deslocamento vertical, preservando a inclinação e a distância entre eles. O enquadramento foi aproximado novamente.


A câmera lateral acompanha a bola nos dois eixos do gramado e na altura. O deslocamento pela largura do campo mantém a bola enquadrada ao chegar à parte inferior da tela. Câmera e ponto de visão se deslocam juntos com distância e inclinação constantes, em enquadramento mais próximo.


O acompanhamento da câmera em direção à lateral próxima tem limite calculado pelo campo de visão e pela proporção da tela: para de avançar quando a linha lateral inferior já cabe com margem no enquadramento, mantendo zoom e inclinação fixos.


A câmera lateral usa inclinação mais acentuada, com menor afastamento horizontal e maior elevação, para reduzir a obstrução pelas coberturas das arquibancadas, incluindo a Arena Brasa. O limite da lateral inferior acompanha essa nova geometria. A inclinação permanece constante durante o acompanhamento.


A Arena Brasa não tem cobertura nem suportes de teto na arquibancada da lateral próxima à câmera (lado positivo de X). Arquibancada, torcida e iluminação desse lado permanecem.


A torcida usa roupa na parte inferior das pernas, com variações de calça e bermuda. A distribuição adiciona dois torcedores por posição anteriormente ocupada, com deslocamento lateral no sentido da fileira e variações independentes de aparência e animação. O limite de modelos próximos acompanha a duplicação.


A distribuição da torcida mantém as posições originais e posiciona o público adicional nos intervalos das fileiras, usando a orientação de cada assento e a distância até o próximo. Isso substitui pares deslocados em torno de um único assento, preservando a quantidade duplicada e espalhando melhor o público.


Os dois zagueiros preservam lados distintos do centro da área e somente um marca o centroavante. A saída de cobertura para pressão exige proximidade real ou perigo central próximo do gol; o volante pode acompanhar seu marcador em raio maior. Defensores sem pressão mantêm margem de parada na posição e somente um fecha a linha do chute.


O treino livre atribui explicitamente as funções dos defensores a cada reinício: dois zagueiros, volante, lateral esquerdo e lateral direito, conforme a quantidade configurada. A inicialização também fornece uma função padrão por índice quando não informada, evitando papéis indefinidos ou herdados de outro lance.


A defesa compacta a largura conforme a bola se aproxima da área: zagueiros reduzem o intervalo central, o lateral oposto fecha por dentro e o volante protege à frente da linha. A pressão começa antes na entrada da área; quando um defensor sai, outro zagueiro cobre o corredor entre bola e gol sem seguir o portador.


Nos lances coletivos da carreira, a quantidade de defensores é sempre a quantidade de companheiros mais dois: 1/3, 2/4 ou 3/5. A composição prioriza dois zagueiros e volante, acrescentando laterais nas quantidades maiores. O treino livre mantém as escolhas independentes do menu e as cobranças preservam sua configuração específica.


A corrida consome estamina sem o redutor global de metade do gasto. A compensação por começar longe do gol reduz o consumo em no máximo 25%, evitando arrancadas prolongadas demais; recuperação e efeito do atributo Estamina permanecem.


RB com o analógico apontado para um companheiro solicita uma corrida em profundidade por até 4,5 segundos. O companheiro avança no seu corredor; se permanecer impedido por cerca de 0,9 segundo, recua até voltar à posição legal e retoma sua função. RB com chute mantém a finalização colocada.


Solicitar corrida de companheiro com RB exige que o usuário esteja com a bola sob domínio. O comando não solicita devolução nem corrida quando a posse está com um companheiro ou a bola está em trânsito.


A corrida solicitada com RB e seu indicador vermelho terminam no primeiro contato de recepção do companheiro, incluindo domínio aéreo e finalização de primeira.


Partidas iniciadas como reserva oferecem de 2 a 3 lances, sorteados na criação da partida.


Recepções aéreas preservam a orientação da passada e os apoios durante a mistura do tronco com o domínio. Domínio de joelho exige aproximação frontal e velocidade moderada; o peso da perna reduz na corrida. Cabeceios e recepções de peito em solo preservam as pernas da locomoção, e a camada de domínio sai gradualmente após o toque. O companheiro mantém a continuidade da passada ao dominar um passe rasteiro.


Sem ação urgente, jogadores fazem pequenos ajustes contínuos dentro da região tática, com ritmos diferentes. Companheiros procuram abertura de linha de passe e espaço livre; defensores ajustam a cobertura antecipando o movimento da bola. Deslocamentos curtos usam caminhada, preservando as decisões de recepção e pressão.


Apenas um companheiro mantém corrida solicitada por RB. Selecionar outro cancela a solicitação anterior, remove seu indicador vermelho e retoma o alvo de posicionamento da função, sem reposicionar o jogador instantaneamente.


A seleção do RB prioriza o companheiro mais próximo dentro de direções semelhantes à mira, sem usar alcance de força nem preferência do alvo de passe anterior. Jogadores fora do cone apontado não recebem a solicitação.
