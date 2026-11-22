(() => {
  'use strict';

  // Base de clubes, forças de elenco, kits, elencos de ataque/meio-campo (nome, posição, overall),
  // participantes oficiais de 2026, regiões e clássicos, alinhada ao football-hype.
  const clubs = [
    // ===== SÉRIE A (20) =====
    {
      id: 'flamengo', name: 'Flamengo', abbr: 'FLA', country: 'BR', league: 'A', strength: 81.4,
      primary: '#D0102C', secondary: '#141414', pattern: 'hoops', region: 'copa-sul-sudeste',
      players: [
        ['Pedro', 'ST', 82], ['Lucas Paquetá', 'AM', 84], ['Giorgian de Arrascaeta', 'AM', 83],
        ['Bruno Henrique', 'LW', 79], ['Luiz Araújo', 'RW', 78], ['Gerson', 'CM', 81],
        ['Gonzalo Plata', 'RW', 77], ['Everton Cebolinha', 'LW', 77]
      ]
    },
    {
      id: 'palmeiras', name: 'Palmeiras', abbr: 'PAL', country: 'BR', league: 'A', strength: 80.8,
      primary: '#0B6B3A', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Vitor Roque', 'ST', 81], ['Estêvão', 'RW', 82], ['Raphael Veiga', 'AM', 81],
        ['Paulinho', 'LW', 80], ['Flaco López', 'ST', 78], ['Maurício', 'AM', 78],
        ['Facundo Torres', 'RW', 77], ['Richard Ríos', 'CM', 78]
      ]
    },
    {
      id: 'botafogo-rj', name: 'Botafogo', abbr: 'BOT', country: 'BR', league: 'A', strength: 78.9,
      primary: '#141414', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Igor Jesus', 'ST', 80], ['Jefferson Savarino', 'AM', 79], ['Matheus Martins', 'LW', 76],
        ['Artur', 'RW', 77], ['Santiago Rodríguez', 'AM', 77], ['Marlon Freitas', 'CM', 78],
        ['Gregore', 'DM', 77], ['Rwan Cruz', 'ST', 74]
      ]
    },
    {
      id: 'cruzeiro', name: 'Cruzeiro', abbr: 'CRU', country: 'BR', league: 'A', strength: 77.8,
      primary: '#1B3F9A', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Matheus Pereira', 'AM', 81], ['Gabigol', 'ST', 79], ['Kaio Jorge', 'ST', 77],
        ['Dudu', 'LW', 76], ['Wanderson', 'LW', 75], ['Lucas Romero', 'CM', 76],
        ['Christian', 'CM', 74], ['Eduardo', 'AM', 75]
      ]
    },
    {
      id: 'internacional', name: 'Internacional', abbr: 'INT', country: 'BR', league: 'A', strength: 77.5,
      primary: '#D8102C', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Alan Patrick', 'AM', 81], ['Rafael Borré', 'ST', 79], ['Enner Valencia', 'ST', 78],
        ['Wesley', 'LW', 77], ['Johan Carbonero', 'LW', 76], ['Bruno Tabata', 'RW', 75],
        ['Thiago Maia', 'CM', 75], ['Fernando', 'DM', 76]
      ]
    },
    {
      id: 'atletico-mg', name: 'Atlético-MG', abbr: 'CAM', country: 'BR', league: 'A', strength: 77.2,
      primary: '#F4F4F4', secondary: '#141414', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Hulk', 'ST', 81], ['Gustavo Scarpa', 'AM', 79], ['Rony', 'LW', 77],
        ['Tomás Cuello', 'LW', 76], ['Júnior Santos', 'RW', 77], ['Bernard', 'AM', 75],
        ['Alan Franco', 'CM', 76], ['Gabriel Menino', 'CM', 75]
      ]
    },
    {
      id: 'sao-paulo', name: 'São Paulo', abbr: 'SAO', country: 'BR', league: 'A', strength: 76.9,
      primary: '#F4F4F4', secondary: '#D0102C', tertiary: '#141414', pattern: 'hoops', region: 'copa-sul-sudeste',
      players: [
        ['Lucas Moura', 'AM', 81], ['Oscar', 'AM', 80], ['Jonathan Calleri', 'ST', 79],
        ['Luciano', 'ST', 78], ['Ferreirinha', 'LW', 76], ['André Silva', 'ST', 75],
        ['Alisson', 'CM', 76], ['Pablo Maia', 'DM', 76]
      ]
    },
    {
      id: 'corinthians', name: 'Corinthians', abbr: 'COR', country: 'BR', league: 'A', strength: 76.8,
      primary: '#F4F4F4', secondary: '#141414', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Yuri Alberto', 'ST', 80], ['Memphis Depay', 'ST', 81], ['Rodrigo Garro', 'AM', 81],
        ['Ángel Romero', 'RW', 75], ['Talles Magno', 'LW', 75], ['André Carrillo', 'CM', 76],
        ['José Martínez', 'DM', 75], ['Igor Coronado', 'AM', 76]
      ]
    },
    {
      id: 'bahia', name: 'Bahia', abbr: 'BAH', country: 'BR', league: 'A', strength: 76.1,
      primary: '#F4F4F4', secondary: '#005CA9', tertiary: '#D0102C', pattern: 'stripes', region: 'copa-nordeste',
      players: [
        ['Everton Ribeiro', 'AM', 78], ['Cauly', 'AM', 77], ['Willian José', 'ST', 77],
        ['Erick Pulga', 'LW', 76], ['Lucho Rodríguez', 'ST', 76], ['Ademir', 'RW', 75],
        ['Jean Lucas', 'CM', 76], ['Caio Alexandre', 'CM', 76]
      ]
    },
    {
      id: 'fluminense', name: 'Fluminense', abbr: 'FLU', country: 'BR', league: 'A', strength: 75.6,
      primary: '#7A1230', secondary: '#0B6B3A', tertiary: '#F4F4F4', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Jhon Arias', 'RW', 80], ['Germán Cano', 'ST', 78], ['Paulo Henrique Ganso', 'AM', 77],
        ['Agustín Canobbio', 'LW', 76], ['Keno', 'LW', 75], ['Everaldo', 'ST', 74],
        ['Martinelli', 'CM', 75], ['Hércules', 'CM', 75]
      ]
    },
    {
      id: 'gremio', name: 'Grêmio', abbr: 'GRE', country: 'BR', league: 'A', strength: 74.8,
      primary: '#1E8FD8', secondary: '#141414', tertiary: '#F4F4F4', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Martin Braithwaite', 'ST', 78], ['Franco Cristaldo', 'AM', 77], ['Cristian Olivera', 'RW', 76],
        ['Francis Amuzu', 'LW', 75], ['Matías Arezo', 'ST', 75], ['Miguel Monsalve', 'AM', 75],
        ['Mathías Villasanti', 'CM', 77], ['Edenílson', 'CM', 73]
      ]
    },
    {
      id: 'santos', name: 'Santos', abbr: 'SAN', country: 'BR', league: 'A', strength: 74.4,
      primary: '#F4F4F4', secondary: '#141414', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Neymar', 'AM', 83], ['Guilherme', 'LW', 76], ['Tiquinho Soares', 'ST', 76],
        ['Yeferson Soteldo', 'LW', 77], ['Benjamín Rollheiser', 'RW', 76], ['Álvaro Barreal', 'LW', 74],
        ['Diego Pituca', 'CM', 74], ['Gabriel Bontempo', 'CM', 72]
      ]
    },
    {
      id: 'vasco', name: 'Vasco', abbr: 'VAS', country: 'BR', league: 'A', strength: 73.7,
      primary: '#F4F4F4', secondary: '#141414', pattern: 'sash', region: 'copa-sul-sudeste',
      players: [
        ['Pablo Vegetti', 'ST', 78], ['Philippe Coutinho', 'AM', 77], ['Nuno Moreira', 'LW', 74],
        ['Benjamín Garré', 'RW', 74], ['Rayan', 'RW', 73], ['Dimitri Payet', 'AM', 74],
        ['Tchê Tchê', 'CM', 73], ['Hugo Moura', 'DM', 73]
      ]
    },
    {
      id: 'bragantino', name: 'Bragantino', abbr: 'RBB', country: 'BR', league: 'A', strength: 73.1,
      primary: '#F4F4F4', secondary: '#D0102C', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Eduardo Sasha', 'ST', 75], ['Isidro Pitta', 'ST', 75], ['Jhon Jhon', 'AM', 74],
        ['Lucas Barbosa', 'RW', 74], ['Henry Mosquera', 'LW', 73], ['Vinicinho', 'LW', 72],
        ['Matheus Fernandes', 'CM', 73], ['Gabriel', 'DM', 73]
      ]
    },
    {
      id: 'athletico-pr', name: 'Athletico-PR', abbr: 'CAP', country: 'BR', league: 'A', strength: 72.4,
      primary: '#141414', secondary: '#D0102C', pattern: 'hoops', region: 'copa-sul-sudeste',
      players: [
        ['Gonzalo Mastriani', 'ST', 75], ['Bruno Zapelli', 'AM', 74], ['Kevin Velasco', 'RW', 73],
        ['Luiz Fernando', 'LW', 73], ['Alan Kardec', 'ST', 72], ['Isaac', 'LW', 71],
        ['Felipinho', 'CM', 72], ['Patrick', 'CM', 72]
      ]
    },
    {
      id: 'vitoria', name: 'Vitória', abbr: 'VIT', country: 'BR', league: 'A', strength: 71.2,
      primary: '#D0102C', secondary: '#141414', pattern: 'stripes', region: 'copa-nordeste',
      players: [
        ['Matheuzinho', 'AM', 75], ['Janderson', 'ST', 73], ['Gustavo Mosquito', 'RW', 73],
        ['Osvaldo', 'LW', 72], ['Carlinhos', 'ST', 72], ['Wellington Rato', 'AM', 73],
        ['Willian Oliveira', 'CM', 72], ['Gabriel Baralhas', 'CM', 72]
      ]
    },
    {
      id: 'coritiba', name: 'Coritiba', abbr: 'CFC', country: 'BR', league: 'A', strength: 70.6,
      primary: '#0B6B3A', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Josué', 'AM', 74], ['Dellatorre', 'ST', 72], ['Lucas Ronier', 'RW', 73],
        ['Gustavo Coutinho', 'ST', 72], ['Matheus Frizzo', 'AM', 73], ['Everaldo', 'LW', 71],
        ['Sebastián Gómez', 'CM', 73], ['Filipe Machado', 'DM', 71]
      ]
    },
    {
      id: 'mirassol', name: 'Mirassol', abbr: 'MIR', country: 'BR', league: 'A', strength: 70.1,
      primary: '#E8B934', secondary: '#16704C', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Iury Castilho', 'ST', 72], ['Chico Kim', 'AM', 72], ['Clayson', 'LW', 72],
        ['Léo Gamalho', 'ST', 71], ['Negueba', 'RW', 71], ['Gabriel', 'AM', 72],
        ['Danielzinho', 'CM', 72], ['Neto Moura', 'DM', 71]
      ]
    },
    {
      id: 'chapecoense', name: 'Chapecoense', abbr: 'CHA', country: 'BR', league: 'A', strength: 69.2,
      primary: '#16704C', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Mário Sérgio', 'ST', 71], ['Giovanni Augusto', 'AM', 71], ['Marcinho', 'RW', 70],
        ['Dentinho', 'LW', 70], ['Ítalo', 'ST', 69], ['Rafael Carvalheira', 'CM', 70],
        ['Bruno Matias', 'DM', 69], ['Mailton', 'RB', 70]
      ]
    },
    {
      id: 'remo', name: 'Remo', abbr: 'REM', country: 'BR', league: 'A', strength: 68.5,
      primary: '#1B3F9A', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-verde',
      players: [
        ['Ytalo', 'ST', 71], ['Pedro Rocha', 'LW', 72], ['Felipe Vizeu', 'ST', 71],
        ['Jaderson', 'CM', 70], ['Dodô', 'AM', 70], ['Maxwell', 'RW', 69],
        ['Pavani', 'CM', 69], ['Adaílton', 'LW', 69]
      ]
    },

    // ===== SÉRIE B (20) =====
    {
      id: 'fortaleza', name: 'Fortaleza', abbr: 'FOR', country: 'BR', league: 'B', strength: 73.2,
      primary: '#2254A3', secondary: '#CC303E', tertiary: '#F4F4F4', pattern: 'hoops', region: 'copa-nordeste',
      players: [
        ['Juan Martín Lucero', 'ST', 76], ['Moisés', 'LW', 75], ['Yago Pikachu', 'RW', 74],
        ['Tomás Pochettino', 'AM', 75], ['Marinho', 'RW', 74], ['Breno Lopes', 'LW', 73],
        ['Calebe', 'AM', 73], ['Lucas Sasha', 'CM', 73]
      ]
    },
    {
      id: 'ceara', name: 'Ceará', abbr: 'CEA', country: 'BR', league: 'B', strength: 71.0,
      primary: '#141414', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-nordeste',
      players: [
        ['Pedro Raul', 'ST', 74], ['Lucas Mugni', 'AM', 73], ['Aylon', 'RW', 72],
        ['Fernandinho', 'LW', 72], ['Galeano', 'RW', 72], ['Matheus Araújo', 'AM', 71],
        ['Lourenço', 'CM', 71], ['Fernando Sobral', 'CM', 71]
      ]
    },
    {
      id: 'sport', name: 'Sport', abbr: 'SPT', country: 'BR', league: 'B', strength: 70.8,
      primary: '#D0102C', secondary: '#141414', pattern: 'hoops', region: 'copa-nordeste',
      players: [
        ['Lucas Lima', 'AM', 74], ['Gonçalo Paciência', 'ST', 73], ['Pablo', 'ST', 73],
        ['Chrystian Barletta', 'RW', 72], ['Carlos Alberto', 'LW', 72], ['Lenny Lobato', 'LW', 71],
        ['Sérgio Oliveira', 'CM', 74], ['Fabricio Domínguez', 'CM', 72]
      ]
    },
    {
      id: 'juventude', name: 'Juventude', abbr: 'JUV', country: 'BR', league: 'B', strength: 70.3,
      primary: '#116B43', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Nenê', 'AM', 73], ['Gilberto', 'ST', 72], ['Erick Farias', 'RW', 71],
        ['Ênio', 'LW', 71], ['Jean Carlos', 'AM', 72], ['Gabriel Taliari', 'ST', 71],
        ['Jadson', 'CM', 71], ['Caíque', 'DM', 70]
      ]
    },
    {
      id: 'cuiaba', name: 'Cuiabá', abbr: 'CUI', country: 'BR', league: 'B', strength: 69.8,
      primary: '#E8B934', secondary: '#16704C', pattern: 'stripes', region: 'copa-verde',
      players: [
        ['Derik Lacerda', 'ST', 72], ['Clayson', 'LW', 71], ['Pedrinho', 'RW', 71],
        ['Lucas Cardoso', 'AM', 70], ['Edu', 'ST', 70], ['Max', 'CM', 70],
        ['Denilson', 'CM', 71], ['Fernando Sobral', 'DM', 70]
      ]
    },
    {
      id: 'goias', name: 'Goiás', abbr: 'GOI', country: 'BR', league: 'B', strength: 69.4,
      primary: '#16704C', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-verde',
      players: [
        ['Tadeu', 'GK', 73], ['Paulo Baya', 'LW', 71], ['Anselmo Ramon', 'ST', 72],
        ['Welliton Matheus', 'RW', 70], ['Rafael Gava', 'AM', 71], ['Pedrinho', 'LW', 70],
        ['Marcão', 'CM', 70], ['Juninho', 'CM', 70]
      ]
    },
    {
      id: 'america-mg', name: 'América-MG', abbr: 'AMG', country: 'BR', league: 'B', strength: 69.1,
      primary: '#16704C', secondary: '#141414', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Fabinho', 'RW', 71], ['Renato Marques', 'ST', 70], ['Martín Benítez', 'AM', 72],
        ['Figueiredo', 'LW', 70], ['Willian Bigode', 'ST', 70], ['Elizari', 'AM', 70],
        ['Alê', 'CM', 71], ['Felipe Amaral', 'DM', 69]
      ]
    },
    {
      id: 'criciuma', name: 'Criciúma', abbr: 'CRI', country: 'BR', league: 'B', strength: 68.9,
      primary: '#E8B934', secondary: '#141414', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Fellipe Mateus', 'CM', 72], ['João Carlos', 'ST', 70], ['Werik Popó', 'ST', 70],
        ['Marcelo Hermes', 'LB', 71], ['Jhonata Robert', 'AM', 70], ['Talisson', 'RW', 69],
        ['Morelli', 'CM', 70], ['Neto Pessoa', 'ST', 69]
      ]
    },
    {
      id: 'atletico-go', name: 'Atlético-GO', abbr: 'ACG', country: 'BR', league: 'B', strength: 68.7,
      primary: '#C72837', secondary: '#141414', pattern: 'stripes', region: 'copa-verde',
      players: [
        ['Shaylon', 'AM', 72], ['Caio Dantas', 'ST', 71], ['Marcelinho', 'RW', 70],
        ['William Pottker', 'LW', 70], ['Alejo Cruz', 'LW', 70], ['Rhaldney', 'CM', 70],
        ['Federico Martínez', 'RW', 70], ['Kauan', 'AM', 69]
      ]
    },
    {
      id: 'novorizontino', name: 'Novorizontino', abbr: 'NOV', country: 'BR', league: 'B', strength: 68.5,
      primary: '#E8B934', secondary: '#141414', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Robson', 'ST', 71], ['Pablo Dyego', 'RW', 70], ['Waguininho', 'LW', 70],
        ['Matheus Frizzo', 'AM', 71], ['Airton Moisés', 'LW', 69], ['Marlon', 'CM', 70],
        ['Luís Oyama', 'CM', 70], ['Bruno José', 'RW', 69]
      ]
    },
    {
      id: 'avai', name: 'Avaí', abbr: 'AVA', country: 'BR', league: 'B', strength: 68.0,
      primary: '#2355AD', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Vágner Love', 'ST', 71], ['Cléber', 'ST', 70], ['Hygor', 'RW', 69],
        ['Marquinhos Gabriel', 'AM', 71], ['Alef Manga', 'LW', 71], ['João Vitor', 'CM', 69],
        ['Zé Ricardo', 'DM', 69], ['Andrey', 'CM', 69]
      ]
    },
    {
      id: 'vila-nova', name: 'Vila Nova', abbr: 'VIL', country: 'BR', league: 'B', strength: 67.8,
      primary: '#C72837', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-verde',
      players: [
        ['Gabriel Poveda', 'ST', 71], ['Bruno Mendes', 'ST', 70], ['Júnior Todinho', 'RW', 70],
        ['Jean Mota', 'AM', 71], ['Labandeira', 'LW', 69], ['Igor Henrique', 'CM', 70],
        ['Arilson', 'DM', 69], ['Vinícius Paiva', 'RW', 69]
      ]
    },
    {
      id: 'crb', name: 'CRB', abbr: 'CRB', country: 'BR', league: 'B', strength: 67.5,
      primary: '#C72837', secondary: '#F4F4F4', pattern: 'hoops', region: 'copa-nordeste',
      players: [
        ['Léo Pereira', 'LW', 71], ['Daniel Lima', 'ST', 70], ['Gegê', 'AM', 70],
        ['Thiaguinho', 'RW', 69], ['Danielzinho', 'AM', 70], ['David da Hora', 'LW', 69],
        ['Higor Meritão', 'DM', 69], ['Nathan Melo', 'CM', 68]
      ]
    },
    {
      id: 'operario-pr', name: 'Operário-PR', abbr: 'OPE', country: 'BR', league: 'B', strength: 67.2,
      primary: '#141414', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Boschilia', 'AM', 71], ['Vinícius Mingotti', 'ST', 70], ['Rodrigo Rodrigues', 'RW', 69],
        ['Allano', 'LW', 69], ['Daniel Amorim', 'ST', 69], ['Neto Paraíba', 'CM', 69],
        ['Índio', 'DM', 69], ['Pedro Lucas', 'AM', 68]
      ]
    },
    {
      id: 'ponte-preta', name: 'Ponte Preta', abbr: 'PON', country: 'BR', league: 'B', strength: 66.8,
      primary: '#F4F4F4', secondary: '#141414', pattern: 'sash', region: 'copa-sul-sudeste',
      players: [
        ['Jeh', 'ST', 70], ['Jean Dias', 'LW', 69], ['Elvis', 'AM', 71],
        ['Everton Brito', 'RW', 69], ['Victor Andrade', 'LW', 68], ['Emerson Santos', 'CM', 68],
        ['Léo Oliveira', 'CM', 68], ['Serginho', 'AM', 69]
      ]
    },
    {
      id: 'nautico', name: 'Náutico', abbr: 'NAU', country: 'BR', league: 'B', strength: 66.4,
      primary: '#C72837', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-nordeste',
      players: [
        ['Paulo Sérgio', 'ST', 70], ['Patrick Allan', 'AM', 69], ['Bruno Mezenga', 'ST', 69],
        ['Hélio Borges', 'RW', 68], ['Kayon', 'LW', 68], ['Marco Antônio', 'CM', 68],
        ['Sousa', 'DM', 68], ['Otusanya', 'ST', 67]
      ]
    },
    {
      id: 'botafogo-sp', name: 'Botafogo-SP', abbr: 'BSP', country: 'BR', league: 'B', strength: 66.0,
      primary: '#F4F4F4', secondary: '#C72837', tertiary: '#141414', pattern: 'hoops', region: 'copa-sul-sudeste',
      players: [
        ['Alexandre Jesus', 'ST', 69], ['Douglas Baggio', 'RW', 69], ['Toró', 'LW', 69],
        ['Leandro Maciel', 'CM', 68], ['Pablo Thomaz', 'ST', 68], ['Jonathan Cafú', 'RW', 69],
        ['Sabit Abdulai', 'CM', 68], ['Alejo Dramisino', 'AM', 68]
      ]
    },
    {
      id: 'londrina', name: 'Londrina', abbr: 'LON', country: 'BR', league: 'B', strength: 65.6,
      primary: '#48A8D8', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Iago Teles', 'LW', 69], ['Pablo', 'ST', 68], ['Henrique', 'RW', 68],
        ['Gustavo França', 'AM', 69], ['Kaique', 'ST', 67], ['Lucas Marques', 'CM', 68],
        ['Alison', 'DM', 68], ['Paredes', 'CM', 67]
      ]
    },
    {
      id: 'sao-bernardo', name: 'São Bernardo', abbr: 'SBE', country: 'BR', league: 'B', strength: 65.2,
      primary: '#E8B934', secondary: '#141414', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Fabrício Daniel', 'ST', 69], ['Léo Jabá', 'RW', 69], ['Guilherme Queiróz', 'ST', 68],
        ['Romisson', 'CM', 68], ['Lucas Tocantins', 'LW', 68], ['Lucas Lima', 'AM', 68],
        ['Rodolfo', 'ST', 68], ['Foguinho', 'CM', 67]
      ]
    },
    {
      id: 'athletic', name: 'Athletic', abbr: 'ATH', country: 'BR', league: 'B', strength: 64.9,
      primary: '#F4F4F4', secondary: '#141414', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Lincoln', 'ST', 69], ['Welinton Torrão', 'LW', 68], ['David Braga', 'AM', 69],
        ['Gustavão', 'ST', 68], ['Max', 'RW', 68], ['Diego Fumaça', 'CM', 68],
        ['Sandry', 'CM', 69], ['Alason Carioca', 'LW', 67]
      ]
    },

    // ===== SÉRIE C (20) =====
    {
      id: 'paysandu', name: 'Paysandu', abbr: 'PAY', country: 'BR', league: 'C', strength: 65.4,
      primary: '#48A8D8', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-verde',
      players: [
        ['Nicolas', 'ST', 69], ['Rossi', 'RW', 70], ['Benítez', 'ST', 68],
        ['Giovanni', 'AM', 69], ['Borasi', 'LW', 68], ['Matheus Vargas', 'CM', 68]
      ]
    },
    {
      id: 'guarani', name: 'Guarani', abbr: 'GUA', country: 'BR', league: 'C', strength: 65.0,
      primary: '#116B43', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['João Marcelo', 'ST', 68], ['Rafael Bilu', 'LW', 68], ['Isaque', 'AM', 68],
        ['Denilson', 'ST', 67], ['Luiz Miguel', 'RW', 67], ['Caio Mello', 'CM', 67]
      ]
    },
    {
      id: 'amazonas', name: 'Amazonas', abbr: 'AMA', country: 'BR', league: 'C', strength: 64.8,
      primary: '#E8B934', secondary: '#141414', pattern: 'stripes', region: 'copa-verde',
      players: [
        ['Sassá', 'ST', 69], ['Luan Silva', 'ST', 68], ['Rafael Tavares', 'AM', 68],
        ['Rodrigo Varanda', 'LW', 68], ['Kevin Ramírez', 'RW', 67], ['Robertinho', 'CM', 67]
      ]
    },
    {
      id: 'volta-redonda', name: 'Volta Redonda', abbr: 'VRE', country: 'BR', league: 'C', strength: 64.5,
      primary: '#E8B934', secondary: '#141414', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Bruno Santos', 'ST', 68], ['MV', 'LW', 68], ['Luciano Naninho', 'AM', 68],
        ['Mirandinha', 'RW', 67], ['Heliardo', 'ST', 67], ['Robinho', 'CM', 67]
      ]
    },
    {
      id: 'ferroviaria', name: 'Ferroviária', abbr: 'FER', country: 'BR', league: 'C', strength: 64.2,
      primary: '#7F2639', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Carlão', 'ST', 68], ['Juninho', 'LW', 67], ['Albano', 'AM', 68],
        ['Vitor Barreto', 'RW', 67], ['Quirino', 'ST', 67], ['Ricardinho', 'CM', 67]
      ]
    },
    {
      id: 'santa-cruz', name: 'Santa Cruz', abbr: 'STC', country: 'BR', league: 'C', strength: 63.9,
      primary: '#141414', secondary: '#C72837', tertiary: '#F4F4F4', pattern: 'hoops', region: 'copa-nordeste',
      players: [
        ['Thiago Galhardo', 'ST', 70], ['João Pedro', 'AM', 67], ['Thiaguinho', 'LW', 67],
        ['Vini Moura', 'RW', 66], ['Gilvan', 'ST', 66], ['Lucas Siqueira', 'CM', 67]
      ]
    },
    {
      id: 'figueirense', name: 'Figueirense', abbr: 'FIG', country: 'BR', league: 'C', strength: 63.6,
      primary: '#141414', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Marlyson', 'ST', 67], ['Gabriel Santiago', 'AM', 67], ['Nicolas', 'LW', 66],
        ['Felipe Augusto', 'RW', 67], ['Kayke', 'ST', 67], ['Jhony Douglas', 'CM', 66]
      ]
    },
    {
      id: 'ituano', name: 'Ituano', abbr: 'ITU', country: 'BR', league: 'C', strength: 63.4,
      primary: '#C72837', secondary: '#141414', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Vinícius Popó', 'ST', 67], ['Neto Berola', 'LW', 67], ['Yann Rolim', 'AM', 67],
        ['Walterson', 'RW', 66], ['Thonny Anderson', 'AM', 68], ['Rodrigo', 'CM', 66]
      ]
    },
    {
      id: 'brusque', name: 'Brusque', abbr: 'BRU', country: 'BR', league: 'C', strength: 63.2,
      primary: '#E8B934', secondary: '#16704C', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Guilherme Pira', 'ST', 67], ['Diego Mathias', 'RW', 67], ['Biel', 'AM', 67],
        ['Pollero', 'ST', 67], ['Robinho', 'LW', 66], ['Serrato', 'CM', 66]
      ]
    },
    {
      id: 'botafogo-pb', name: 'Botafogo-PB', abbr: 'BPB', country: 'BR', league: 'C', strength: 63.0,
      primary: '#141414', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-nordeste',
      players: [
        ['Henrique Dourado', 'ST', 68], ['Danilo Mariotto', 'ST', 67], ['Guilherme Santos', 'LW', 66],
        ['Rafinha', 'RW', 66], ['Bruno Leite', 'AM', 67], ['Thallyson', 'CM', 66]
      ]
    },
    {
      id: 'caxias', name: 'Caxias', abbr: 'CAX', country: 'BR', league: 'C', strength: 62.7,
      primary: '#7F2639', secondary: '#48A8D8', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Welder', 'ST', 67], ['Tomas Bastos', 'AM', 67], ['Calyson', 'LW', 66],
        ['Richard', 'RW', 66], ['Iago', 'ST', 66], ['Pedro Cuiabá', 'CM', 66]
      ]
    },
    {
      id: 'ypiranga', name: 'Ypiranga', abbr: 'YPI', country: 'BR', league: 'C', strength: 62.4,
      primary: '#E8B934', secondary: '#16704C', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Cristiano', 'ST', 67], ['Roger', 'LW', 66], ['Jean Pyerre', 'AM', 68],
        ['Felipe Marques', 'RW', 66], ['Galego', 'ST', 65], ['Charles', 'CM', 65]
      ]
    },
    {
      id: 'maringa', name: 'Maringá', abbr: 'MAR', country: 'BR', league: 'C', strength: 62.2,
      primary: '#16704C', secondary: '#141414', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Maranhão', 'ST', 67], ['Matheus Moraes', 'LW', 67], ['Léo Ceará', 'AM', 66],
        ['Negueba', 'RW', 66], ['Júlio Rodrigues', 'ST', 66], ['Rodrigo', 'CM', 66]
      ]
    },
    {
      id: 'confianca', name: 'Confiança', abbr: 'CON', country: 'BR', league: 'C', strength: 61.9,
      primary: '#2355AD', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-nordeste',
      players: [
        ['Neto Oliveira', 'ST', 66], ['Ronald Camarão', 'LW', 66], ['Rafinha', 'AM', 66],
        ['Breyner Camilo', 'RW', 65], ['Luiz Otávio', 'CM', 65], ['Fábio', 'CM', 65]
      ]
    },
    {
      id: 'floresta-ce', name: 'Floresta', abbr: 'FLO', country: 'BR', league: 'C', strength: 61.5,
      primary: '#16704C', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-nordeste',
      players: [
        ['Jeam', 'ST', 66], ['Ruan Carlos', 'LW', 65], ['Pablo', 'AM', 65],
        ['Mateus Ludke', 'RW', 65], ['Guilherme', 'CM', 65], ['Rafael Furlan', 'CM', 64]
      ]
    },
    {
      id: 'itabaiana', name: 'Itabaiana', abbr: 'ITA', country: 'BR', league: 'C', strength: 61.2,
      primary: '#2355AD', secondary: '#C72837', pattern: 'stripes', region: 'copa-nordeste',
      players: [
        ['Wendel', 'ST', 66], ['Leilson', 'LW', 65], ['Tarcísio', 'AM', 65],
        ['Jackson', 'RW', 65], ['Coppetti', 'CM', 65], ['Gabriel Henrique', 'CM', 64]
      ]
    },
    {
      id: 'anapolis', name: 'Anápolis', abbr: 'ANA', country: 'BR', league: 'C', strength: 61.0,
      primary: '#C72837', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-verde',
      players: [
        ['Igor Cássio', 'ST', 66], ['Kadu', 'LW', 65], ['Ariel', 'AM', 65],
        ['João Celeri', 'ST', 65], ['Samuel Michels', 'CM', 65], ['Rafael Mineiro', 'CM', 64]
      ]
    },
    {
      id: 'inter-limeira', name: 'Inter de Limeira', abbr: 'ITL', country: 'BR', league: 'C', strength: 60.8,
      primary: '#141414', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-sul-sudeste',
      players: [
        ['Alex Sandro', 'ST', 66], ['Albano', 'AM', 66], ['Rhuan', 'LW', 65],
        ['Ruan Ribeiro', 'RW', 65], ['Lucas Buchecha', 'CM', 65], ['Flávio', 'CM', 64]
      ]
    },
    {
      id: 'barra', name: 'Barra', abbr: 'BAR', country: 'BR', league: 'C', strength: 60.5,
      primary: '#2355AD', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-sul-sudeste',
      players: [
        ['Giovani', 'ST', 65], ['Saymom', 'LW', 65], ['Natanael', 'AM', 65],
        ['Elvinho', 'RW', 65], ['Natan', 'CM', 64], ['Tetê', 'CM', 64]
      ]
    },
    {
      id: 'maranhao', name: 'Maranhão', abbr: 'MAC', country: 'BR', league: 'C', strength: 60.2,
      primary: '#2355AD', secondary: '#C72837', tertiary: '#F4F4F4', pattern: 'stripes', region: 'copa-nordeste',
      players: [
        ['Clessione', 'ST', 65], ['Ryan', 'LW', 65], ['Vagalume', 'AM', 65],
        ['Mikeias', 'RW', 64], ['Bedeu', 'CM', 64], ['Dudu', 'CM', 64]
      ]
    },

    // ===== SÉRIE D / REGIONAIS (para Copas Regionais e acesso/rebaixamento C<->D) =====
    { id: 'abc', name: 'ABC', abbr: 'ABC', country: 'BR', league: 'D', strength: 61.8, primary: '#141414', secondary: '#F4F4F4', pattern: 'stripes', region: 'copa-nordeste', players: [['Wallyson','ST',67],['Emanuel','LW',65],['Bruno Bispo','CM',65],['Adeílson','RW',64]] },
    { id: 'america-rn', name: 'América-RN', abbr: 'ARN', country: 'BR', league: 'D', strength: 61.5, primary: '#C72837', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-nordeste', players: [['Thailor','ST',66],['Souza','AM',67],['Ítalo','RW',65],['Ferreira','CM',64]] },
    { id: 'ferroviario', name: 'Ferroviário', abbr: 'FAC', country: 'BR', league: 'D', strength: 60.9, primary: '#C72837', secondary: '#141414', pattern: 'stripes', region: 'copa-nordeste', players: [['Ciel','ST',67],['Allanzinho','LW',65],['Janeudo','AM',65],['Gharib','CM',64]] },
    { id: 'altos', name: 'Altos', abbr: 'ALT', country: 'BR', league: 'D', strength: 60.4, primary: '#16704C', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-nordeste', players: [['Lucas Reis','ST',65],['Felipe Sales','LW',64],['Esquerdinha','AM',65],['Hudson','CM',64]] },
    { id: 'moto-club', name: 'Moto Club', abbr: 'MOT', country: 'BR', league: 'D', strength: 59.8, primary: '#C72837', secondary: '#141414', pattern: 'hoops', region: 'copa-nordeste', players: [['Luís Gustavo','ST',64],['Danilinho','RW',64],['Lucas Gomes','AM',64],['Felipe Dias','CM',63]] },
    { id: 'csa', name: 'CSA', abbr: 'CSA', country: 'BR', league: 'D', strength: 62.0, primary: '#2355AD', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-nordeste', players: [['Tiago Marques','ST',67],['Brayann','AM',66],['Guilherme Cachoeira','LW',65],['Gustavo Nicola','CM',65]] },
    { id: 'portuguesa', name: 'Portuguesa', abbr: 'POR', country: 'BR', league: 'D', strength: 62.6, primary: '#C72837', secondary: '#16704C', pattern: 'hoops', region: 'copa-sul-sudeste', players: [['Maceió','LW',67],['Cristiano','AM',67],['Henrique Almeida','ST',67],['Tauã','CM',65]] },
    { id: 'cianorte', name: 'Cianorte', abbr: 'CIA', country: 'BR', league: 'D', strength: 61.1, primary: '#2355AD', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-sul-sudeste', players: [['Gabriel Ramos','ST',65],['Luiz Fernando','LW',65],['Beléa','AM',65],['Danrley','CM',64]] },
    { id: 'brasiliense', name: 'Brasiliense', abbr: 'BRA', country: 'BR', league: 'D', strength: 61.6, primary: '#E8B934', secondary: '#16704C', pattern: 'solid', region: 'copa-verde', players: [['João Santos','ST',66],['Tobinha','RW',66],['Tarta','AM',65],['Marcos Júnior','CM',65]] },
    { id: 'capital', name: 'Capital', abbr: 'CAP', country: 'BR', league: 'D', strength: 60.5, primary: '#2355AD', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-verde', players: [['Wallace Pernambucano','ST',66],['Matheuzinho','AM',65],['Deizinho','LW',64],['Rodriguinho','CM',64]] },
    { id: 'nacional-am', name: 'Nacional-AM', abbr: 'NAM', country: 'BR', league: 'D', strength: 60.0, primary: '#2355AD', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-verde', players: [['Hernane Brocador','ST',66],['Peninha','AM',64],['Rogelio','RW',64],['Mardley','CM',63]] },
    { id: 'aguia-maraba', name: 'Águia de Marabá', abbr: 'AGU', country: 'BR', league: 'D', strength: 59.7, primary: '#2355AD', secondary: '#C72837', pattern: 'stripes', region: 'copa-verde', players: [['Jonata Bastos','ST',64],['Lucas Silva','LW',64],['Germano','AM',64],['Bruno Limão','CM',63]] },
    { id: 'independencia-ac', name: 'Independência-AC', abbr: 'IND', country: 'BR', league: 'D', strength: 58.9, primary: '#16704C', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-verde', players: [['Anderson Brito','ST',63],['Polaco','AM',63],['Felipe','RW',62],['Joel','CM',62]] },
    { id: 'gas', name: 'GAS', abbr: 'GAS', country: 'BR', league: 'D', strength: 58.5, primary: '#E8B934', secondary: '#141414', pattern: 'solid', region: 'copa-verde', players: [['Railan','ST',63],['Léo','AM',62],['Kayo','LW',62],['Matheus','CM',62]] },
    { id: 'trem', name: 'Trem', abbr: 'TRE', country: 'BR', league: 'D', strength: 58.6, primary: '#C72837', secondary: '#141414', pattern: 'hoops', region: 'copa-verde', players: [['Aleílson','ST',63],['Silvio','AM',62],['Neto','RW',62],['Fábio','CM',62]] },
    { id: 'porto-velho', name: 'Porto Velho', abbr: 'PVE', country: 'BR', league: 'D', strength: 59.3, primary: '#2355AD', secondary: '#E8B934', pattern: 'solid', region: 'copa-verde', players: [['Luan Viana','ST',64],['Marco Goiano','AM',64],['Caio Vinícius','LW',63],['Sorriso','CM',63]] },
    { id: 'primavera', name: 'Primavera', abbr: 'PRI', country: 'BR', league: 'D', strength: 59.5, primary: '#7F2639', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-verde', players: [['Sávio','ST',64],['Cleberson','AM',64],['Tinga','RW',63],['Valderrama','CM',63]] },
    { id: 'sampaio-correa', name: 'Sampaio Corrêa', abbr: 'SAM', country: 'BR', league: 'D', strength: 61.3, primary: '#16704C', secondary: '#E8B934', tertiary: '#C72837', pattern: 'stripes', region: 'copa-nordeste', players: [['Alan Stence','ST',65],['Jair','AM',65],['Pimentinha','RW',66],['Cavi','CM',64]] },
    { id: 'juazeirense', name: 'Juazeirense', abbr: 'JUA', country: 'BR', league: 'D', strength: 59.9, primary: '#E8B934', secondary: '#16704C', pattern: 'solid', region: 'copa-nordeste', players: [['Tatavitto','ST',64],['Guilherme','LW',64],['Clebson','AM',64],['Elivélton','CM',63]] },
    { id: 'gama', name: 'Gama', abbr: 'GAM', country: 'BR', league: 'D', strength: 60.2, primary: '#16704C', secondary: '#F4F4F4', pattern: 'solid', region: 'copa-verde', players: [['Nunes','ST',65],['Ramon','AM',64],['Pedro Paulo','LW',64],['Moisés','CM',63]] },

    // ===== SUL-AMERICANOS (Libertadores & Sul-Americana) =====
    { id: 'river-plate', name: 'River Plate', abbr: 'CARP', country: 'AR', league: 'INT', strength: 78.6, primary: '#F4F4F4', secondary: '#C82032', pattern: 'sash', players: [['Miguel Borja','ST',79],['Franco Mastantuono','AM',79],['Facundo Colidio','LW',78],['Sebastián Driussi','ST',78],['Manuel Lanzini','AM',76],['Maximiliano Meza','RW',76]] },
    { id: 'boca-juniors', name: 'Boca Juniors', abbr: 'CABJ', country: 'AR', league: 'INT', strength: 77.8, primary: '#153A71', secondary: '#E8B934', pattern: 'hoops', players: [['Edinson Cavani','ST',79],['Miguel Merentiel','ST',78],['Carlos Palacios','AM',77],['Kevin Zenón','LW',77],['Exequiel Zeballos','RW',76],['Ander Herrera','CM',76]] },
    { id: 'racing', name: 'Racing', abbr: 'RC', country: 'AR', league: 'INT', strength: 77.2, primary: '#48A8D8', secondary: '#F4F4F4', pattern: 'stripes', players: [['Adrián Martínez','ST',79],['Maximiliano Salas','LW',76],['Luciano Vietto','AM',77],['Santiago Solari','RW',75],['Agustín Almendra','CM',75],['Juan Nardoni','CM',76]] },
    { id: 'estudiantes', name: 'Estudiantes', abbr: 'EST', country: 'AR', league: 'INT', strength: 75.4, primary: '#C82032', secondary: '#F4F4F4', pattern: 'stripes', players: [['Guido Carrillo','ST',76],['Tiago Palacios','RW',76],['Cristian Medina','CM',76],['Lucas Alario','ST',75],['José Sosa','AM',74],['Santiago Ascacíbar','CM',77]] },
    { id: 'lanus', name: 'Lanús', abbr: 'LAN', country: 'AR', league: 'INT', strength: 74.0, primary: '#7F2639', secondary: '#F4F4F4', pattern: 'solid', players: [['Walter Bou','ST',76],['Marcelino Moreno','AM',76],['Eduardo Salvio','RW',74],['Dylan Aquino','LW',73],['Felipe Peña Biafore','CM',74]] },
    { id: 'independiente-del-valle', name: 'Independiente del Valle', abbr: 'IDV', country: 'EC', league: 'INT', strength: 75.0, primary: '#153A71', secondary: '#141414', pattern: 'stripes', players: [['Kendry Páez','AM',78],['Jeison Medina','ST',75],['Michael Hoyos','ST',74],['Junior Sornoza','AM',75],['Renato Ibarra','RW',74]] },
    { id: 'penarol', name: 'Peñarol', abbr: 'CAP', country: 'UY', league: 'INT', strength: 74.6, primary: '#E8B934', secondary: '#15191D', pattern: 'stripes', players: [['Leonardo Fernández','AM',78],['Maximiliano Silvera','ST',75],['Jaime Báez','LW',74],['David Terans','AM',75],['Eduardo Darias','CM',73]] },
    { id: 'nacional', name: 'Nacional', abbr: 'CNF', country: 'UY', league: 'INT', strength: 74.2, primary: '#F4F4F4', secondary: '#C82032', tertiary: '#153A71', pattern: 'sash', players: [['Nicolás López','ST',76],['Eduardo Vargas','ST',75],['Jeremía Recoba','AM',74],['Lucas Villalba','RW',73],['Christian Oliva','CM',74]] },
    { id: 'cerro-porteno', name: 'Cerro Porteño', abbr: 'CCP', country: 'PY', league: 'INT', strength: 73.5, primary: '#2355AD', secondary: '#C82032', pattern: 'stripes', players: [['Francisco da Costa','ST',75],['Cecilio Domínguez','LW',75],['Juan Iturbe','RW',74],['Jonathan Torres','ST',74],['Federico Carrizo','AM',74]] },
    { id: 'olimpia', name: 'Olimpia', abbr: 'OLI', country: 'PY', league: 'INT', strength: 73.4, primary: '#F4F4F4', secondary: '#141414', pattern: 'hoops', players: [['Derlis González','ST',75],['Darío Benedetto','ST',74],['Iván Leguizamón','LW',74],['Rodney Redes','RW',73],['Richard Ortiz','CM',73]] },
    { id: 'atletico-nacional', name: 'Atlético Nacional', abbr: 'NAL', country: 'CO', league: 'INT', strength: 75.2, primary: '#116B43', secondary: '#F4F4F4', pattern: 'stripes', players: [['Edwin Cardona','AM',76],['Alfredo Morelos','ST',76],['Marino Hinestroza','RW',76],['Kevin Viveros','ST',74],['Billy Arce','LW',74]] },
    { id: 'junior', name: 'Junior', abbr: 'JUN', country: 'CO', league: 'INT', strength: 73.6, primary: '#C82032', secondary: '#F4F4F4', pattern: 'stripes', players: [['Carlos Bacca','ST',75],['Yimmi Chará','AM',75],['José Enamorado','RW',74],['Déiber Caicedo','LW',74],['Guillermo Paiva','ST',73]] },
    { id: 'america-cali', name: 'América de Cali', abbr: 'AMC', country: 'CO', league: 'INT', strength: 74.0, primary: '#C72837', secondary: '#F4F4F4', pattern: 'solid', players: [['Juan Fernando Quintero','AM',78],['Duván Vergara','LW',76],['Rodrigo Holgado','ST',74],['Cristian Barrios','RW',74],['Éder Álvarez Balanta','DM',74]] },
    { id: 'millonarios', name: 'Millonarios', abbr: 'MIL', country: 'CO', league: 'INT', strength: 73.8, primary: '#174A9B', secondary: '#F4F4F4', pattern: 'solid', players: [['Radamel Falcao','ST',75],['Leonardo Castro','ST',75],['Daniel Cataño','AM',74],['Jhon Córdoba','RW',73],['Mackalister Silva','AM',74]] },
    { id: 'santa-fe', name: 'Santa Fe', abbr: 'SFE', country: 'CO', league: 'INT', strength: 72.8, primary: '#C82032', secondary: '#F4F4F4', pattern: 'solid', players: [['Hugo Rodallega','ST',75],['Omar Fernández','LW',73],['Harold Mosquera','RW',73],['Daniel Torres','CM',73],['Alexis Zapata','AM',72]] },
    { id: 'rosario-central', name: 'Rosario Central', abbr: 'ROS', country: 'AR', league: 'INT', strength: 74.4, primary: '#153A71', secondary: '#E8B934', pattern: 'stripes', players: [['Ignacio Malcorra','AM',76],['Jaminton Campaz','LW',76],['Enzo Copetti','ST',74],['Santiago López','RW',73],['Franco Ibarra','CM',73]] },
    { id: 'independiente', name: 'Independiente', abbr: 'CAI', country: 'AR', league: 'INT', strength: 74.6, primary: '#C82032', secondary: '#F4F4F4', pattern: 'solid', players: [['Gabriel Ávalos','ST',76],['Luciano Cabral','AM',76],['Santiago Montiel','LW',74],['Diego Tarzia','RW',73],['Felipe Loyola','CM',75]] },
    { id: 'velez-sarsfield', name: 'Vélez Sarsfield', abbr: 'VEL', country: 'AR', league: 'INT', strength: 74.8, primary: '#F4F4F4', secondary: '#174A9B', pattern: 'sash', players: [['Braian Romero','ST',76],['Maher Carrizo','RW',74],['Francisco Pizzini','LW',74],['Claudio Aquino','AM',77],['Christian Ordóñez','CM',75]] },
    { id: 'belgrano', name: 'Belgrano', abbr: 'BEL', country: 'AR', league: 'INT', strength: 72.6, primary: '#48A8D8', secondary: '#F4F4F4', pattern: 'solid', players: [['Lucas Zelarayán','AM',76],['Franco Jara','ST',74],['Nicolás Fernández','ST',74],['Bryan Reyna','LW',73],['Santiago Longo','CM',73]] },
    { id: 'talleres', name: 'Talleres', abbr: 'TAL', country: 'AR', league: 'INT', strength: 74.8, primary: '#153A71', secondary: '#F4F4F4', pattern: 'stripes', players: [['Rubén Botta','AM',76],['Cristian Tarragona','ST',74],['Sebastián Palacios','RW',74],['Matías Galarza','CM',74],['Federico Girotti','ST',75]] },
    { id: 'colo-colo', name: 'Colo-Colo', abbr: 'CC', country: 'CL', league: 'INT', strength: 73.9, primary: '#F4F4F4', secondary: '#15191D', pattern: 'solid', players: [['Arturo Vidal','CM',76],['Javier Correa','ST',75],['Claudio Aquino','AM',76],['Lucas Cepeda','LW',74],['Marcos Bolados','RW',73]] },
    { id: 'universidad-chile', name: 'Universidad de Chile', abbr: 'UCH', country: 'CL', league: 'INT', strength: 73.2, primary: '#153A71', secondary: '#C82032', pattern: 'solid', players: [['Leandro Fernández','ST',75],['Charles Aránguiz','CM',75],['Lucas Di Yorio','ST',74],['Maximiliano Guerrero','RW',73],['Marcelo Díaz','DM',73]] }
  ];

  // Participantes oficiais de 2026 (mesmas listas do football-hype/packages/shared/src/config/fixed-cup-entrants.ts)
  const fixedCups2026 = {
    'copa-brasil': [
      'athletico-pr','santos','novorizontino','remo','ceara','mirassol','vitoria','vila-nova',
      'cruzeiro','botafogo-sp','cuiaba','operario-pr','fluminense','fortaleza','vasco','goias',
      'criciuma','bahia','sport','corinthians','sao-paulo','internacional','flamengo','atletico-mg',
      'gremio','juventude','coritiba','botafogo-rj','palmeiras','crb','bragantino','chapecoense'
    ],
    'libertadores': [
      'cruzeiro','independiente-del-valle','boca-juniors','lanus','river-plate','racing',
      'vasco','cerro-porteno','palmeiras','estudiantes','atletico-nacional',
      'flamengo','penarol','junior'
    ],
    'sul-americana': [
      'rosario-central','gremio','independiente','america-cali','bahia','velez-sarsfield',
      'bragantino','santa-fe','millonarios','belgrano','olimpia',
      'fluminense','talleres','nacional'
    ],
    'pre-libertadores': ['corinthians','atletico-mg','santos','botafogo-rj'],
    'copa-sul-sudeste': [
      'juventude','america-mg','ituano','volta-redonda','athletic','barra','novorizontino','londrina',
      'operario-pr','sao-bernardo','figueirense','cianorte','avai','criciuma','ferroviaria','portuguesa'
    ],
    'copa-nordeste': [
      'fortaleza','altos','santa-cruz','maranhao','abc','itabaiana','botafogo-pb','moto-club',
      'nautico','ceara','confianca','ferroviario','sport','america-rn','crb','floresta-ce'
    ],
    'copa-verde': [
      'amazonas','nacional-am','independencia-ac','aguia-maraba','gas','trem','paysandu','porto-velho',
      'cuiaba','goias','anapolis','capital','atletico-go','vila-nova','primavera','brasiliense'
    ]
  };

  // Clássicos tradicionais do futebol brasileiro (pares bidirecionais)
  const classics = [
    // RJ
    ['flamengo', 'fluminense'], ['flamengo', 'vasco'], ['flamengo', 'botafogo-rj'],
    ['fluminense', 'vasco'], ['fluminense', 'botafogo-rj'], ['vasco', 'botafogo-rj'],
    // SP
    ['corinthians', 'palmeiras'], ['corinthians', 'sao-paulo'], ['corinthians', 'santos'],
    ['palmeiras', 'sao-paulo'], ['palmeiras', 'santos'], ['sao-paulo', 'santos'],
    ['guarani', 'ponte-preta'],
    // MG
    ['atletico-mg', 'cruzeiro'], ['atletico-mg', 'america-mg'], ['cruzeiro', 'america-mg'],
    // RS
    ['gremio', 'internacional'], ['juventude', 'caxias'],
    // PR
    ['athletico-pr', 'coritiba'], ['londrina', 'maringa'],
    // BA
    ['bahia', 'vitoria'],
    // CE
    ['fortaleza', 'ceara'],
    // PE
    ['sport', 'nautico'], ['sport', 'santa-cruz'], ['nautico', 'santa-cruz'],
    // PA
    ['remo', 'paysandu'],
    // GO
    ['goias', 'vila-nova'], ['goias', 'atletico-go'], ['vila-nova', 'atletico-go'],
    // SC
    ['avai', 'figueirense'], ['criciuma', 'chapecoense'],
    // AL / RN / SE
    ['crb', 'csa'], ['abc', 'america-rn'], ['confianca', 'itabaiana'],
    // MA
    ['maranhao', 'moto-club'], ['maranhao', 'sampaio-correa'], ['moto-club', 'sampaio-correa'],
    // Sul-Americanos
    ['boca-juniors', 'river-plate'], ['penarol', 'nacional']
  ];

  const classicSet = new Set(classics.flatMap(([a, b]) => [`${a}:${b}`, `${b}:${a}`]));
  const isClassic = (a, b) => !!a && !!b && classicSet.has(`${a}:${b}`);

  window.goatClubDatabase = { clubs, fixedCups2026, classics, isClassic };
})();
