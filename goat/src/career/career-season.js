(() => {
  'use strict';

  const db = window.goatClubDatabase;
  const journey=window.goatCareerJourney;
  const rawClubs = db.clubs;
  const fixedCups2026 = db.fixedCups2026;

  // Salário por partida rebalanceado (para a loja levar várias temporadas)
  function clubSalary(league, strength) {
    if(String(league).startsWith('EU-'))return Math.round((9000+clamp((strength-65)/25,0,1)*21000)/100)*100;
    if (league === 'A') return Math.round((2200 + clamp((strength - 68) / 14, 0, 1) * 2000) / 50) * 50;
    if (league === 'B') return Math.round((950 + clamp((strength - 64) / 10, 0, 1) * 900) / 50) * 50;
    if (league === 'C') return Math.round((450 + clamp((strength - 60) / 6, 0, 1) * 400) / 50) * 50;
    return 350;
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const clubs = rawClubs.map(c => ({
    ...c,
    salary: clubSalary(c.league, c.strength)
  }));

  const defaultDivisions = {
    A: clubs.filter(c => c.league === 'A').map(c => c.id),
    B: clubs.filter(c => c.league === 'B').map(c => c.id),
    C: clubs.filter(c => c.league === 'C').map(c => c.id),
    D: clubs.filter(c => c.league === 'D').map(c => c.id)
  };
  const foreignPool = clubs.filter(c => c.league === 'INT'&&['AR','EC','UY','PY','CO','CL','PE','BO','VE'].includes(c.country)).map(c => c.id);

  const legacyTeams = ['aurora','mare','ferro','porto','floresta','estaleiro','sabiá','vale','cobre','pioneiro',
    'campina','laguna','nascente','pedra','prado','candeia','ribeira','arco','horizonte','ventania'];
  const legacyMap = new Map(legacyTeams.map((id, i) => [id, defaultDivisions.B[i]]));

  const trials = [
    { id: 'arsenal', name: 'Brasa Laranja', abbr: 'BLA', primary: '#e96a38', secondary: '#41212b', pattern: 'sash', strength: 65, players: [] },
    { id: 'linhas', name: 'Linha Azul', abbr: 'LAZ', primary: '#3bacd3', secondary: '#202b60', pattern: 'stripes', strength: 66, players: [] },
    { id: 'dourado', name: 'Vento Dourado', abbr: 'VDO', primary: '#e9b948', secondary: '#225055', pattern: 'hoops', strength: 67, players: [] }
  ];
  const rival = { id: 'rival', name: 'Seleção da Arena', abbr: 'SAR', primary: '#e8e0cf', secondary: '#79475f', pattern: 'solid', strength: 66, players: [] };
  const byId = new Map([...clubs, ...trials, rival].map(t => [t.id, t]));
  const team = id => byId.get(id);

  // Regras das competições (alinhadas ao football-hype/packages/shared/src/config/competitions.json)
  const COMPETITION_META = {
    'serie-a': { id: 'serie-a', name: 'Brasileirão Série A', shortName: 'Série A', format: 'league', division: 'A', promote: 0, relegate: 4, continental: 4, preContinental: 2, secondaryContinental: 5 },
    'serie-b': { id: 'serie-b', name: 'Brasileirão Série B', shortName: 'Série B', format: 'league', division: 'B', promote: 4, relegate: 4 },
    'serie-c': { id: 'serie-c', name: 'Brasileirão Série C', shortName: 'Série C', format: 'league', division: 'C', promote: 4, relegate: 4 },
    'serie-d': { id: 'serie-d', name: 'Brasileirão Série D', shortName: 'Série D', format: 'league', division: 'D', promote: 4, relegate: 0 },
    'copa-brasil': { id: 'copa-brasil', name: 'Copa do Brasil', shortName: 'Copa do Brasil', format: 'knockout', teamCount: 32 },
    'pre-libertadores': { id: 'pre-libertadores', name: 'Pré-Libertadores', shortName: 'Pré-Liberta', format: 'knockout', teamCount: 4 },
    'libertadores': { id: 'libertadores', name: 'Libertadores', shortName: 'Libertadores', format: 'groups-knockout', teamCount: 16, groupSize: 4, groupLegs: 2 },
    'sul-americana': { id: 'sul-americana', name: 'Sul-Americana', shortName: 'Sul-Americana', format: 'groups-knockout', teamCount: 16, groupSize: 4, groupLegs: 2 },
    'copa-nordeste': { id: 'copa-nordeste', name: 'Copa do Nordeste', shortName: 'Copa do Nordeste', format: 'groups-knockout', teamCount: 16, groupSize: 4, groupLegs: 2 },
    'copa-sul-sudeste': { id: 'copa-sul-sudeste', name: 'Copa Sul-Sudeste', shortName: 'Copa Sul-Sudeste', format: 'groups-knockout', teamCount: 16, groupSize: 4, groupLegs: 2 },
    'copa-verde': { id: 'copa-verde', name: 'Copa Verde', shortName: 'Copa Verde', format: 'groups-knockout', teamCount: 16, groupSize: 4, groupLegs: 2 }
  };
  for(const league of journey.leagues)COMPETITION_META[league.id]={id:league.id,name:league.name,shortName:league.name,format:'league',division:league.code};
  COMPETITION_META['champions-league']={id:'champions-league',name:'UEFA Champions League',shortName:'Champions League',format:'groups-knockout',teamCount:36};
  COMPETITION_META['world-cup']={id:'world-cup',name:'Copa do Mundo',shortName:'Copa do Mundo',format:'groups-knockout',teamCount:48};

  function knockoutLegs(compId, round, finalRound) {
    if(compId==='world-cup')return 1;
    if(compId==='champions-league')return round===finalRound?1:2;
    if (compId === 'copa-brasil') return round === finalRound ? 2 : 1;
    if (['libertadores', 'copa-nordeste', 'copa-verde', 'copa-sul-sudeste'].includes(compId)) return 1;
    if (compId === 'pre-libertadores') return 2;
    if (compId === 'sul-americana') return round === finalRound ? 1 : 2;
    return 1;
  }

  function knockoutRoundLabel(round, totalRounds, compId) {
    if (compId === 'pre-libertadores') return 'Pré-Libertadores';
    const fromEnd = totalRounds - 1 - round;
    if (fromEnd === 0) return 'Final';
    if (fromEnd === 1) return 'Semifinal';
    if (fromEnd === 2) return 'Quartas de final';
    if (fromEnd === 3) return 'Oitavas de final';
    if (fromEnd === 4) return compId==='champions-league'?'Playoffs':'16-avos de final';
    return '1ª fase';
  }

  // Aparência e loja (preços rebalanceados para progressão de várias temporadas)
  const appearance = {
    dominantFoot: { label: 'Pé dominante', values: ['Direito', 'Esquerdo'] },
    hair: { label: 'Cabelo', values: ['Topete', 'Raspado', 'Curto', 'Cacheado', 'Degradê lateral', 'Risco lateral', 'Ondulado', 'Moicano', 'Black Power', 'Coque Samurai', 'Longo', 'Dreads'] },
    skin: { label: 'Cor da pele', values: ['#efb18b', '#b9754d', '#8b4d35', '#63382e', '#402726'] },
    beard: { label: 'Barba', values: ['Sem barba', 'Por fazer', 'Cavanhaque', 'Cheia', 'Longa', 'Baixa alinhada', 'Bigode', 'Cavanhaque longo', 'Viking', 'Costeleta & Bigode'] },
    boots: { label: 'Chuteira', values: [
      '#e49439', '#393645', '#f3e9d1', '#38c4b8', '#ea5467', '#83a8f2',
      '#f4c04c', '#8361bb', '#b4d345', '#ce4a42', '#d8e2ee', '#ee79ae',
      '#22a866', '#26d9e8', '#7e1d36', '#f5f7fa',
      ['#18181f', '#f4c04c'], ['#f5f7fa', '#ce2a3b'], ['#1c5bd9', '#38e0d0'], ['#1b8c4c', '#c6ef3e'],
      ['#6838b8', '#f06ba8'], ['#d42626', '#18181f'], ['#f07d22', '#f5f7fa'], ['#f4c04c', '#18181f']
    ] },
    socks: { label: 'Meião', values: ['Normal', 'Curta', 'Longa'] },
    shorts: { label: 'Short', values: ['Curto', 'Longo'] },
    sleeves: { label: 'Manga', values: ['Curta', 'Longa'] },
    shirt: { label: 'Camisa', values: ['Para fora', 'Por dentro'] },
    tankTop: { label: 'Regata', values: ['', '#1c1d24', '#f2f0ea', '#1b478c'] },
    pants: { label: 'Calça', values: [
      '',
      { color: '#1b1c24', accent: '#f0f0f0', style: 'track' },
      { color: '#1b3568', accent: '#f4c04c', style: 'track' },
      { color: '#474c58', accent: '#1c1d24', style: 'jogger' },
      { color: '#314933', accent: '#1e2c1f', style: 'cargo' },
      { color: '#2b4d7e', accent: '#6287bd', style: 'jeans' },
      { color: '#c4ae8c', accent: '#8c7554', style: 'cargo' }
    ] },
    chain: { label: 'Cordão', values: ['', '#f0c24b', '#d9e0ea', '#252630'] },
    earring: { label: 'Brinco', values: ['', '#f0c24b', '#e6f5ff', '#22222b'] },
    glasses: { label: 'Óculos', values: ['', '#1d1e26', '#d8a63c', '#2998e8'] },
    bracelet: { label: 'Pulseira', values: ['', '#f0c24b', '#22232c', '#f2f0ea'] },
    hairColor: { label: 'Cor do cabelo', values: ['#261824', '#593128', '#9b482c', '#d5974d', '#c4bbaf', '#412e69', '#dccab1', '#175d65'] },
    beardColor: { label: 'Cor da barba', values: ['#261824', '#593128', '#9b482c', '#d5974d', '#c4bbaf', '#412e69', '#704c87', '#e2c5a0'] }
  };
  const colors = ['Clara', 'Média', 'Bronze', 'Escura', 'Profunda'];
  const hairColors = ['Preto', 'Castanho', 'Ruivo', 'Loiro', 'Grisalho', 'Violeta'];
  appearance.skin.names = colors;
  appearance.hairColor.names = [...hairColors, 'Platinado', 'Petróleo'];
  appearance.beardColor.names = [...hairColors, 'Ameixa', 'Areia'];
  appearance.boots.names = [
    'Laranja', 'Preta', 'Creme', 'Turquesa', 'Coral', 'Azul',
    'Ouro', 'Violeta', 'Lima', 'Rubi', 'Prata', 'Rosa',
    'Esmeralda', 'Ciano', 'Vinho', 'Branca Neve',
    'Preta & Ouro', 'Branca & Rubi', 'Azul & Ciano', 'Verde & Lima',
    'Roxa & Rosa', 'Rubi & Preta', 'Laranja & Branca', 'Ouro & Preta'
  ];
  appearance.tankTop.names = ['Uniforme do clube', 'Regata Preta', 'Regata Branca', 'Regata Azul'];
  appearance.pants.names = ['Short do clube', 'Esportiva Preta', 'Esportiva Azul', 'Jogger Cinza', 'Cargo Verde', 'Jeans Azul', 'Cargo Bege'];
  appearance.chain.names = ['Sem cordão', 'Cordão de Ouro', 'Cordão de Prata', 'Cordão Ônix'];
  appearance.earring.names = ['Sem brinco', 'Brinco de Ouro', 'Brinco Diamante', 'Brinco Preto'];
  appearance.glasses.names = ['Sem óculos', 'Óculos Escuro', 'Óculos Dourado', 'Óculos Esportivo'];
  appearance.bracelet.names = ['Sem pulseira', 'Pulseira de Ouro', 'Pulseira Preta', 'Pulseira Branca'];

  const shopCategories = [
    { id: 'appearance', label: 'Aparência' },
    { id: 'boots', label: 'Chuteiras' },
    { id: 'clothes', label: 'Roupas' },
    { id: 'accessories', label: 'Acessórios' },
    { id: 'consumables', label: 'Consumíveis' }
  ];

  const wearableShop = [
    ['hair', 4, 18500, 'appearance'], ['hair', 5, 24000, 'appearance'], ['hair', 6, 29500, 'appearance'],
    ['hair', 7, 26000, 'appearance'], ['hair', 8, 28000, 'appearance'], ['hair', 9, 32000, 'appearance'],
    ['hair', 10, 27500, 'appearance'], ['hair', 11, 35000, 'appearance'],
    ['beard', 4, 22500, 'appearance'], ['beard', 5, 16000, 'appearance'],
    ['beard', 6, 13500, 'appearance'], ['beard', 7, 19500, 'appearance'], ['beard', 8, 29000, 'appearance'], ['beard', 9, 17500, 'appearance'],
    ['hairColor', 5, 9500, 'appearance'], ['hairColor', 6, 11500, 'appearance'], ['hairColor', 7, 10500, 'appearance'],
    ['beardColor', 5, 8500, 'appearance'], ['beardColor', 6, 9800, 'appearance'], ['beardColor', 7, 9200, 'appearance'],
    ['boots', 6, 52000, 'boots'], ['boots', 7, 36000, 'boots'], ['boots', 8, 28500, 'boots'],
    ['boots', 9, 33000, 'boots'], ['boots', 10, 44000, 'boots'], ['boots', 11, 39500, 'boots'],
    ['boots', 12, 31000, 'boots'], ['boots', 13, 34500, 'boots'], ['boots', 14, 37500, 'boots'], ['boots', 15, 41000, 'boots'],
    ['boots', 16, 58000, 'boots'], ['boots', 17, 54000, 'boots'], ['boots', 18, 49500, 'boots'], ['boots', 19, 48000, 'boots'],
    ['boots', 20, 51500, 'boots'], ['boots', 21, 53000, 'boots'], ['boots', 22, 47000, 'boots'], ['boots', 23, 62000, 'boots'],
    ['socks', 1, 6500, 'clothes'], ['socks', 2, 7500, 'clothes'],
    ['shirt', 1, 8000, 'clothes'], ['sleeves', 1, 11000, 'clothes'],
    ['tankTop', 1, 14500, 'clothes'], ['tankTop', 2, 14500, 'clothes'], ['tankTop', 3, 15500, 'clothes'],
    ['pants', 1, 16000, 'clothes'], ['pants', 2, 17000, 'clothes'], ['pants', 3, 16500, 'clothes'],
    ['pants', 4, 18500, 'clothes'], ['pants', 5, 19500, 'clothes'], ['pants', 6, 18500, 'clothes'],
    ['chain', 1, 26000, 'accessories'], ['chain', 2, 21000, 'accessories'], ['chain', 3, 19500, 'accessories'],
    ['earring', 1, 16000, 'accessories'], ['earring', 2, 22000, 'accessories'], ['earring', 3, 13500, 'accessories'],
    ['glasses', 1, 18000, 'accessories'], ['glasses', 2, 23500, 'accessories'], ['glasses', 3, 20500, 'accessories'],
    ['bracelet', 1, 15000, 'accessories'], ['bracelet', 2, 11500, 'accessories'], ['bracelet', 3, 11500, 'accessories']
  ].map(([key, index, price, category]) => ({ id: key + ':' + index, key, index, price, category }));

  const consumableShop = [
    { id: 'consumable:attr-point', category: 'consumables', consumable: true, repeatable: true, icon: 'attrPoint', name: 'Ponto de Atributo (+1)', description: '+1 ponto para evoluir qualquer atributo', price: 15000 },
    { id: 'consumable:kit-treino', category: 'consumables', consumable: true, icon: 'kit', name: 'Kit de Treino', description: '+5% de XP nos treinos', xpBonusPct: 5, price: 12000 },
    { id: 'consumable:mini-gols', category: 'consumables', consumable: true, icon: 'minigoal', name: 'Mini Gols', description: '+5% de XP nos treinos', xpBonusPct: 5, price: 16500 },
    { id: 'consumable:pesos-academia', category: 'consumables', consumable: true, icon: 'weights', name: 'Pesos de Academia', description: '+10% de XP nos treinos', xpBonusPct: 10, price: 28000 },
    { id: 'consumable:personal', category: 'consumables', consumable: true, icon: 'personal', name: 'Personal Trainer', description: '+10% de XP nos treinos', xpBonusPct: 10, price: 42000 }
  ];

  const shop = [...wearableShop, ...consumableShop];
  const storeById = new Map(shop.map(item => [item.id, item]));

  function trainingBoosts(save) {
    const owned = save?.owned || [];
    const items = consumableShop.filter(item => owned.includes(item.id));
    const totalPct = items.reduce((sum, item) => sum + (item.xpBonusPct || 0), 0);
    return { items, totalPct };
  }

  const attributes = { Chute: 'shot', Estamina: 'stamina', Força: 'strength', Frieza: 'composure', Velocidade: 'speed', Aceleração: 'acceleration', Falta: 'freeKick', Pênalti: 'penalty' };
  const defaultAttributes = { shot: 74, stamina: 71, strength: 68, composure: 70, speed: 72, acceleration: 65, freeKick: 68, penalty: 72 };
  const attributeKeys = Object.keys(defaultAttributes);
  const overall = stats => Math.round(attributeKeys.reduce((sum, key) => sum + (stats?.[key] ?? defaultAttributes[key]), 0) / attributeKeys.length);
  const defaultLook = Object.fromEntries(Object.keys(appearance).map(key => [key, key === 'skin' ? 1 : 0]));

  function normalLook(look) {
    return Object.fromEntries(Object.entries(appearance).map(([key, group]) => [
      key, Number.isInteger(look?.[key]) ? clamp(look[key], 0, group.values.length - 1) : defaultLook[key]
    ]));
  }

  function paint(look, club) {
    const p = normalLook(look);
    const bootVal = appearance.boots.values[p.boots];
    const boots = Array.isArray(bootVal) ? bootVal[0] : bootVal;
    const bootsSecondary = Array.isArray(bootVal) ? bootVal[1] : null;
    const pantsVal = appearance.pants.values[p.pants] || null;
    return {
      hair: p.hair, beard: p.beard, socks: p.socks, shirt: p.shirt, shorts: p.shorts, sleeves: p.sleeves,
      tankTop: appearance.tankTop.values[p.tankTop] || null,
      pantsColor: pantsVal?.color || null,
      pantsAccent: pantsVal?.accent || null,
      pantsStyle: pantsVal?.style || null,
      chain: p.chain, earring: p.earring, glasses: p.glasses, bracelet: p.bracelet,
      dominantFoot: p.dominantFoot === 1 ? 'LeftFoot' : 'RightFoot',
      skin: appearance.skin.values[p.skin], boots, bootsSecondary,
      hairColor: appearance.hairColor.values[p.hairColor], beardColor: appearance.beardColor.values[p.beardColor],
      primary: club?.primary ?? '#efd9a8', secondary: club?.secondary ?? '#bd442e',
      tertiary:club?.tertiary,pattern:club?.pattern??'solid',clubId:club?.id
    };
  }

  function random(seed) {
    let state = (seed >>> 0) || 1;
    return () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function hashString(seed, str) {
    let h = (seed ^ 0x811c9dc5) >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  function defensiveProfile(club, role, slot = 0) {
    const position = { ZAG: 'CB', LE: 'LB', LD: 'RB', VOL: 'DM', GOL: 'GK' }[role];
    const defenders = (club.players ?? []).filter(([, pos]) => ['CB', 'LB', 'RB', 'DM'].includes(pos));
    const positionPlayers = (role === 'GOL' ? club.players ?? [] : defenders)
      .filter(([, pos]) => pos === position)
      .sort((a, b) => b[2] - a[2]);
    const rng = random(hashString(0, `${club.id}:${role}:${slot}`));
    const variation = (rng() - .5) * (role === 'GOL' ? 10 : 8);
    const defensiveStrength = defenders.length
      ? defenders.reduce((sum, [, , overall]) => sum + overall, 0) / defenders.length
      : club.strength;
    const base = positionPlayers[slot]?.[2] ?? (role === 'GOL' ? club.strength : defensiveStrength) + variation;
    const rate = offset => clamp(Math.round(base + offset + (rng() - .5) * 10), 45, 99);
    if (role === 'GOL') return { jump: rate(0), reflex: rate(0) };
    const centreBack = role === 'ZAG', fullBack = role === 'LE' || role === 'LD';
    return {
      speed: rate(centreBack ? -2 : fullBack ? 3 : 1),
      tackling: rate(centreBack ? 4 : fullBack ? -6 : 1),
      aggression: rate(centreBack ? 2 : 0),
      intelligence: rate(centreBack || role === 'VOL' ? 3 : 1)
    };
  }

  function shuffle(list, seed, salt) {
    const rng = random(hashString(seed, salt));
    const arr = [...list];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function roundRobin(ids, legs = 2) {
    const order = [...ids];
    if (order.length % 2 === 1) order.push(null);
    const first = [];
    for (let round = 0; round < order.length - 1; round++) {
      const pairings = [];
      for (let i = 0; i < order.length / 2; i++) {
        const a = order[i], b = order[order.length - 1 - i];
        if (!a || !b) continue;
        pairings.push((round + i) % 2 ? { home: b, away: a } : { home: a, away: b });
      }
      first.push(pairings);
      order.splice(1, 0, order.pop());
    }
    return legs === 2
      ? [...first, ...first.map(day => day.map(({ home, away }) => ({ home: away, away: home })))]
      : first;
  }

  const totalRounds = 38;
  const blankStats = () => ({ matches: 0, goals: 0, assists: 0, chances: 0, shots: 0, wins: 0 });
  const nameOf = id => journey.leagues.find(league=>league.code===id)?.name??('Série ' + id);

  function divisionOf(save, clubId = save?.club) {
    if (!clubId) return null;
    if (save?.divisions) {
      for (const div of ['A', 'B', 'C', 'D']) {
        if (save.divisions[div]?.includes(clubId)) return div;
      }
    }
    return team(clubId)?.league ?? null;
  }

  function leagueOf(save) {
    return divisionOf(save, save?.club);
  }

  function leagueCompId(div) {
    const european=journey.leagues.find(league=>league.code===div);
    if(european)return european.id;
    return 'serie-' + div.toLowerCase();
  }

  function salaryFor(save, clubId = save?.club) {
    const c = team(clubId);
    if (!c) return 0;
    const div = divisionOf(save, clubId) || c.league;
    return clubSalary(div, c.strength);
  }

  const available = (save, key, index) => !storeById.has(key + ':' + index) || !!save?.owned.includes(key + ':' + index);
  const availableLook = (save, look) => Object.fromEntries(Object.entries(normalLook(look)).map(([key, index]) =>
    [key, available(save, key, index) ? index : defaultLook[key]]));

  // ===== SIMULAÇÃO DE GOLS E ARTILHARIA/ASSISTÊNCIAS PONDERADAS POR QUALIDADE =====
  const POS_GOAL_MULT = { ST: 2.65, LW: 1.75, RW: 1.75, AM: 1.5, CM: 0.72, DM: 0.28, LB: 0.2, RB: 0.2, CB: 0.14, GK: 0.01 };
  const POS_ASSIST_MULT = { AM: 2.35, LW: 1.9, RW: 1.9, CM: 1.65, ST: 1.0, LB: 0.9, RB: 0.9, DM: 0.55, CB: 0.14, GK: 0.01 };

  function pickWeightedPlayer(players, multMap, rng, excludeName = null) {
    if (!players || !players.length) return null;
    let total = 0;
    const weights = players.map(([name, pos, ovr]) => {
      if (excludeName && name === excludeName) return 0;
      const quality = Math.pow(Math.max(1, (Number(ovr) || 65) - 48), 2.15);
      const w = quality * (multMap[pos] ?? 0.5);
      total += w;
      return w;
    });
    if (total <= 0) return players[0][0];
    let r = rng() * total;
    for (let i = 0; i < players.length; i++) {
      r -= weights[i];
      if (r <= 0) return players[i][0];
    }
    return players[players.length - 1][0];
  }

  function recordPlayerStat(save, compId, clubId, name, goals, assists, isUser = false) {
    if (!goals && !assists) return;
    if (!save.playerStats) save.playerStats = {};
    if (!save.playerStats[compId]) save.playerStats[compId] = {};
    const key = isUser ? '__user__' : `${clubId}:${name}`;
    const entry = save.playerStats[compId][key] || { name, clubId, goals: 0, assists: 0, player: isUser };
    entry.name = name;
    entry.clubId = clubId;
    entry.goals += goals;
    entry.assists += assists;
    save.playerStats[compId][key] = entry;
  }

  function assignSimulatedGoalEvents(save, compId, clubId, goalCount, rng, userGoals = 0, userAssists = 0, teamScorers = []) {
    if (userGoals > 0 || userAssists > 0) {
      recordPlayerStat(save, compId, clubId, save.player.name, userGoals, userAssists, true);
    }
    const club = team(clubId);
    const roster = club?.players || [];
    let remainingGoals = Math.max(0, goalCount - userGoals);
    let remainingUserAssists = userAssists;
    const recordedTeam = Array.isArray(teamScorers) ? teamScorers.slice(0, remainingGoals) : [];
    for (const item of recordedTeam) {
      const scorer = item?.name || pickWeightedPlayer(roster, POS_GOAL_MULT, rng);
      if (scorer) recordPlayerStat(save, compId, clubId, scorer, 1, 0, false);
      remainingGoals--;
      if (item?.assisted && remainingUserAssists > 0) {
        remainingUserAssists--;
      } else if (rng() < 0.72) {
        const assister = pickWeightedPlayer(roster, POS_ASSIST_MULT, rng, scorer);
        if (assister) recordPlayerStat(save, compId, clubId, assister, 0, 1, false);
      }
    }
    for (let g = 0; g < remainingGoals; g++) {
      const scorer = pickWeightedPlayer(roster, POS_GOAL_MULT, rng);
      if (scorer) recordPlayerStat(save, compId, clubId, scorer, 1, 0, false);
      if (remainingUserAssists > 0) {
        remainingUserAssists--;
      } else if (rng() < 0.72) {
        const assister = pickWeightedPlayer(roster, POS_ASSIST_MULT, rng, scorer);
        if (assister) recordPlayerStat(save, compId, clubId, assister, 0, 1, false);
      }
    }
    // Se o usuário fez gols, companheiros podem ter dado assistência
    for (let g = 0; g < userGoals; g++) {
      if (rng() < 0.65) {
        const assister = pickWeightedPlayer(roster, POS_ASSIST_MULT, rng);
        if (assister) recordPlayerStat(save, compId, clubId, assister, 0, 1, false);
      }
    }
  }

  function simulateGoals(mean, rng) {
    const safeMean = clamp(mean, 0.25, 3.6);
    const stop = Math.exp(-safeMean);
    let draw = rng(), score = 0;
    while (draw > stop && score < 7) {
      draw *= rng();
      score++;
    }
    return score;
  }

  function simulateFixtureScore(homeId, awayId, rng) {
    const homeStrength = team(homeId)?.strength ?? 68;
    const awayStrength = team(awayId)?.strength ?? 68;
    const delta = (homeStrength - awayStrength) / 14;
    const h = simulateGoals(1.36 + delta * 0.52, rng);
    const a = simulateGoals(1.04 - delta * 0.46, rng);
    return { h, a };
  }

  function penaltyShootout(rng) {
    let h = 0, a = 0;
    for (let i = 0; i < 5; i++) {
      if (rng() < 0.75) h++;
      if (h > a + (5 - i)) return { h, a };
      if (rng() < 0.75) a++;
      if (h > a + (4 - i) || a > h + (4 - i)) return { h, a };
    }
    for (let i = 0; h === a && i < 20; i++) {
      if (rng() < 0.75) h++;
      if (rng() < 0.75) a++;
    }
    if (h === a) {
      if (rng() < 0.5) h++;
      else a++;
    }
    return { h, a };
  }

  // ===== CONSTRUÇÃO DOS TORNEIOS APENAS DO CLUBE DO JOGADOR =====
  function buildLeagueCompetition(compId, teamIds, seed, year) {
    const meta = COMPETITION_META[compId];
    const ordered = shuffle(teamIds, seed ^ year, compId);
    const rounds = roundRobin(ordered, 2);
    return {
      id: compId,
      name: meta.name,
      shortName: meta.shortName,
      format: 'league',
      division: meta.division,
      participants: ordered,
      rounds,
      results: []
    };
  }

  function buildGroupsCompetition(compId, teamIds, seed, year) {
    const meta = COMPETITION_META[compId];
    const shuffled = shuffle(teamIds, seed ^ year, compId);
    const national=compId==='world-cup',champions=compId==='champions-league';
    const size=meta.teamCount??16;
    const letters=Array.from({length:champions?1:size/4},(_,i)=>String.fromCharCode(65+i));
    const groups=Object.fromEntries(letters.map(letter=>[letter,[]]));
    shuffled.slice(0,size).forEach((id,i)=>groups[letters[i%letters.length]].push(id));
    const groupRounds = Array.from({ length: national?3:champions?8:6 }, () => []);
    for (const letter of letters) {
      const rr = roundRobin(groups[letter], national||champions?1:2).slice(0,groupRounds.length);
      rr.forEach((matches, r) => {
        for (const m of matches) groupRounds[r].push({ group: letter, home: m.home, away: m.away });
      });
    }
    return {
      id: compId,
      name: meta.name,
      shortName: meta.shortName,
      format: 'groups-knockout',
      participants: shuffled.slice(0,size),national,
      groups,
      groupRounds,
      groupResults: [],
      knockout: [] // preenchido ao fim da fase de grupos (Quartas -> Semi -> Final)
    };
  }

  function buildPendingGroupsCompetition(compId, baseTeamIds) {
    const meta = COMPETITION_META[compId];
    return {
      id: compId,
      name: meta.name,
      shortName: meta.shortName,
      format: 'groups-knockout',
      participants: [...new Set(baseTeamIds)],
      national: false,
      awaitingPreLibertadores: true,
      groups: {},
      groupRounds: [],
      groupResults: [],
      knockout: []
    };
  }

  function seedContinentalFromPreLibertadores(save) {
    const pre = save?.competitions?.['pre-libertadores'];
    const ties = pre?.knockout?.[0] || [];
    if (!ties.length || !ties.every(t => t.winner)) return;
    const preParticipants = new Set(pre.participants || []);
    const winners = ties.map(t => t.winner).filter(Boolean);
    const losers = ties.map(t => t.winner === t.home ? t.away : t.home).filter(Boolean);

    const fillTo16 = (baseList, added, forbidden) => {
      const result = [];
      const seen = new Set(forbidden);
      const pushUnique = id => {
        if (id && !seen.has(id) && result.length < 16) {
          seen.add(id);
          result.push(id);
        }
      };
      for (const id of baseList) pushUnique(id);
      for (const id of added) pushUnique(id);
      for (const id of foreignPool) pushUnique(id);
      return result;
    };

    const lib = save.competitions['libertadores'];
    if (lib && !(lib.groupResults?.length > 0)) {
      const libBase = (lib.participants || []).filter(id => !preParticipants.has(id));
      const libTeams = fillTo16(libBase, winners, losers);
      save.competitions['libertadores'] = buildGroupsCompetition('libertadores', libTeams, save.seed, save.year);
    }
    const sula = save.competitions['sul-americana'];
    if (sula && !(sula.groupResults?.length > 0)) {
      const libNow = new Set(save.competitions['libertadores']?.participants || []);
      const sulaBase = (sula.participants || []).filter(id => !preParticipants.has(id) && !libNow.has(id));
      const sulaTeams = fillTo16(sulaBase, losers, libNow);
      save.competitions['sul-americana'] = buildGroupsCompetition('sul-americana', sulaTeams, save.seed, save.year);
    }
  }

  function replaceClubInCompetition(comp, fromId, toId) {
    if (!comp || !fromId || !toId || fromId === toId) return;
    if (Array.isArray(comp.participants)) {
      comp.participants = comp.participants.map(id => id === fromId ? toId : id);
    }
    if (comp.groups && typeof comp.groups === 'object') {
      for (const letter of Object.keys(comp.groups)) {
        comp.groups[letter] = comp.groups[letter].map(id => id === fromId ? toId : id);
      }
    }
    if (Array.isArray(comp.groupRounds)) {
      for (const round of comp.groupRounds) {
        for (const m of round) {
          if (m.home === fromId) m.home = toId;
          if (m.away === fromId) m.away = toId;
        }
      }
    }
    if (Array.isArray(comp.groupResults)) {
      for (const r of comp.groupResults) {
        if (r.home === fromId) r.home = toId;
        if (r.away === fromId) r.away = toId;
      }
    }
    if (Array.isArray(comp.knockout)) {
      for (const round of comp.knockout) {
        for (const t of round) {
          if (t.home === fromId) t.home = toId;
          if (t.away === fromId) t.away = toId;
          if (t.winner === fromId) t.winner = toId;
        }
      }
    }
  }

  function sanitizeContinentalCompetitions(data) {
    const comps = data?.competitions;
    if (!comps) return;
    const pre = comps['pre-libertadores'];
    const lib = comps['libertadores'];
    const sula = comps['sul-americana'];
    if (!pre) return;

    if (Array.isArray(pre.knockout) && pre.knockout.length > 1) {
      pre.knockout = [pre.knockout[0]];
    }

    const preSet = new Set(pre.participants || []);
    const ties = pre.knockout?.[0] || [];
    const preDone = ties.length > 0 && ties.every(t => t.winner);
    const groupsStarted = (lib?.groupResults?.length || 0) > 0 || (sula?.groupResults?.length || 0) > 0;

    if (!preDone && !groupsStarted) {
      if (lib && (lib.participants?.some(id => preSet.has(id)) || !lib.awaitingPreLibertadores)) {
        const cleanLib = (lib.participants || []).filter(id => !preSet.has(id));
        comps['libertadores'] = buildPendingGroupsCompetition('libertadores', cleanLib);
      }
      if (sula && (sula.participants?.some(id => preSet.has(id)) || !sula.awaitingPreLibertadores)) {
        const libSet = new Set(comps['libertadores']?.participants || []);
        const cleanSula = (sula.participants || []).filter(id => !preSet.has(id) && !libSet.has(id));
        comps['sul-americana'] = buildPendingGroupsCompetition('sul-americana', cleanSula);
      }
    } else if (preDone && !groupsStarted) {
      const winners = ties.map(t => t.winner).filter(Boolean);
      const losers = ties.map(t => t.winner === t.home ? t.away : t.home).filter(Boolean);
      const libNeedsSeed = lib && (lib.awaitingPreLibertadores || !Object.keys(lib.groups || {}).length || losers.some(id => lib.participants?.includes(id)) || !winners.every(id => lib.participants?.includes(id)));
      const sulaNeedsSeed = sula && (sula.awaitingPreLibertadores || !Object.keys(sula.groups || {}).length || winners.some(id => sula.participants?.includes(id)) || !losers.every(id => sula.participants?.includes(id)));
      if (libNeedsSeed || sulaNeedsSeed) {
        seedContinentalFromPreLibertadores(data);
      }
    } else if (preDone && groupsStarted) {
      const winners = ties.map(t => t.winner).filter(Boolean);
      const losers = ties.map(t => t.winner === t.home ? t.away : t.home).filter(Boolean);
      if (lib) {
        const missingWinners = winners.filter(id => !lib.participants?.includes(id));
        const wrongLosers = losers.filter(id => lib.participants?.includes(id));
        wrongLosers.forEach((loserId, i) => {
          const replacement = missingWinners[i] || foreignPool.find(id => !lib.participants?.includes(id) && !sula?.participants?.includes(id));
          if (replacement) replaceClubInCompetition(lib, loserId, replacement);
        });
      }
      if (sula) {
        const libSet = new Set(lib?.participants || []);
        const missingLosers = losers.filter(id => !sula.participants?.includes(id) && !libSet.has(id));
        const wrongWinners = winners.filter(id => sula.participants?.includes(id));
        wrongWinners.forEach((winnerId, i) => {
          const replacement = missingLosers[i] || foreignPool.find(id => !libSet.has(id) && !sula.participants?.includes(id));
          if (replacement) replaceClubInCompetition(sula, winnerId, replacement);
        });
      }
    }

    if (data.pending && (data.pending.competitionId === 'libertadores' || data.pending.competitionId === 'sul-americana')) {
      const targetComp = comps[data.pending.competitionId];
      if (!targetComp?.participants?.includes(data.club)) {
        data.pending = null;
      }
    }
  }

  function buildKnockoutCompetition(compId, teamIds, seed, year) {
    const meta = COMPETITION_META[compId];
    const size = Math.pow(2, Math.floor(Math.log2(teamIds.length)));
    const shuffled = shuffle(teamIds.slice(0, size), seed ^ year, compId);
    const totalKoRounds = compId === 'pre-libertadores' ? 1 : Math.log2(size);
    const firstRound = [];
    for (let i = 0; i < size; i += 2) {
      firstRound.push({
        id: `${compId}:0:${i / 2}`,
        round: 0,
        label: knockoutRoundLabel(0, totalKoRounds, compId),
        legs: knockoutLegs(compId, 0, totalKoRounds - 1),
        home: shuffled[i],
        away: shuffled[i + 1],
        firstLeg: null,
        secondLeg: null,
        penalties: null,
        winner: null
      });
    }
    const knockout = [firstRound];
    for (let r = 1; r < totalKoRounds; r++) {
      const prevCount = knockout[r - 1].length;
      const roundTies = [];
      for (let i = 0; i < prevCount; i += 2) {
        roundTies.push({
          id: `${compId}:${r}:${i / 2}`,
          round: r,
          label: knockoutRoundLabel(r, totalKoRounds, compId),
          legs: knockoutLegs(compId, r, totalKoRounds - 1),
          home: null,
          away: null,
          firstLeg: null,
          secondLeg: null,
          penalties: null,
          winner: null
        });
      }
      knockout.push(roundTies);
    }
    return {
      id: compId,
      name: meta.name,
      shortName: meta.shortName,
      format: 'knockout',
      participants: shuffled,
      knockout
    };
  }

  function resolveSeasonEntrants(save) {
    const divs = save.divisions;
    const is2026 = save.year === 2026 && !save.nextQualifications;
    if (is2026) {
      const pre2026 = [...new Set(fixedCups2026['pre-libertadores'])];
      const preSet = new Set(pre2026);
      const lib2026 = fixedCups2026['libertadores'].filter(id => !preSet.has(id));
      const libSet = new Set(lib2026);
      const sula2026 = fixedCups2026['sul-americana'].filter(id => !preSet.has(id) && !libSet.has(id));
      return {
        'copa-brasil': fixedCups2026['copa-brasil'],
        'pre-libertadores': pre2026,
        'libertadores': lib2026,
        'sul-americana': sula2026,
        'copa-nordeste': fixedCups2026['copa-nordeste'],
        'copa-sul-sudeste': fixedCups2026['copa-sul-sudeste'],
        'copa-verde': fixedCups2026['copa-verde']
      };
    }
    const q = save.nextQualifications || {};
    const serieA = divs.A;
    const serieB = divs.B;
    const copaBrasil = [...serieA, ...(q.serieBTop12 || serieB.slice(0, 12)).filter(id => !serieA.includes(id))].slice(0, 32);
    while (copaBrasil.length < 32) {
      const nextB = serieB.find(id => !copaBrasil.includes(id));
      if (!nextB) break;
      copaBrasil.push(nextB);
    }

    const usedForeign = new Set();
    const takeForeign = count => {
      const picked = [];
      for (const id of foreignPool) {
        if (!usedForeign.has(id) && picked.length < count) {
          usedForeign.add(id);
          picked.push(id);
        }
      }
      return picked;
    };

    const libDomestic = [...new Set(q.libertadores || serieA.slice(0, 4))].slice(0, 4);
    const preDomestic = [...new Set((q.preLibertadores || serieA.slice(4, 6)).filter(id => !libDomestic.includes(id)))].slice(0, 2);
    const preLibertadores = [...preDomestic, ...takeForeign(4 - preDomestic.length)];
    const takenContinental = new Set([...libDomestic, ...preLibertadores]);

    const libertadores = [...libDomestic, ...takeForeign(14 - libDomestic.length)];
    const sulaDomestic = (q.sulAmericana || serieA.slice(6, 11)).filter(id => !takenContinental.has(id)).slice(0, 6);
    const sulAmericana = [...sulaDomestic, ...takeForeign(14 - sulaDomestic.length)];

    const nonA = [...divs.B, ...divs.C, ...divs.D];
    const regionalOf = regionId => {
      const eligible = nonA.filter(id => team(id)?.region === regionId);
      const list = eligible.slice(0, 16);
      if (list.length < 16) {
        for (const id of nonA) {
          if (list.length >= 16) break;
          if (!list.includes(id)) list.push(id);
        }
      }
      return list;
    };

    return {
      'copa-brasil': copaBrasil,
      'pre-libertadores': preLibertadores,
      'libertadores': libertadores,
      'sul-americana': sulAmericana,
      'copa-nordeste': regionalOf('copa-nordeste'),
      'copa-sul-sudeste': regionalOf('copa-sul-sudeste'),
      'copa-verde': regionalOf('copa-verde')
    };
  }

  function buildSeasonCalendar(competitions) {
    const slots = [];
    const add = (time, compId, stage, round, leg = 1) => slots.push({ time, compId, stage, round, leg });

    for (const comp of Object.values(competitions)) {
      if (comp.format === 'league') {
        for (let r = 0; r < comp.rounds.length; r++) {
          // 38 rodadas espalhadas ao longo do ano (tempo 20..960)
          const t = Math.round(20 + (r / Math.max(1, comp.rounds.length - 1)) * 940);
          add(t, comp.id, 'league', r, 1);
        }
      } else if (comp.id === 'copa-brasil') {
        // 5 fases: 1ª fase(0), Oitavas(1), Quartas(2), Semi(3), Final(4 - ida e volta)
        const times = [105, 290, 560, 810, 975];
        comp.knockout.forEach((ties, r) => {
          const legs = ties[0]?.legs ?? 1;
          add(times[r], comp.id, 'knockout', r, 1);
          if (legs === 2) add(times[r] + 18, comp.id, 'knockout', r, 2);
        });
      } else if (comp.id === 'pre-libertadores') {
        add(65, comp.id, 'knockout', 0, 1);
        add(85, comp.id, 'knockout', 0, 2);
      } else if (comp.id === 'libertadores' || comp.id === 'sul-americana') {
        // 6 rodadas de grupos (180..410) + Quartas(610), Semi(760), Final(945)
        [180, 225, 270, 315, 360, 405].forEach((t, r) => add(t, comp.id, 'group', r, 1));
        const koTimes = [615, 770, 945];
        for (let r = 0; r < 3; r++) {
          const legs = knockoutLegs(comp.id, r, 2);
          add(koTimes[r], comp.id, 'knockout', r, 1);
          if (legs === 2) add(koTimes[r] + 22, comp.id, 'knockout', r, 2);
        }
      } else if (['copa-nordeste', 'copa-sul-sudeste', 'copa-verde'].includes(comp.id)) {
        // Copas regionais: 6 rodadas de grupos (45..265) + Quartas(330), Semi(435), Final(515)
        [45, 90, 135, 180, 225, 265].forEach((t, r) => add(t, comp.id, 'group', r, 1));
        [330, 435, 515].forEach((t, r) => add(t, comp.id, 'knockout', r, 1));
      } else if(comp.id==='champions-league'){
        [80,160,240,320,400,480,560,640].forEach((time,round)=>add(time,comp.id,'group',round));
        [700,760,820,880,960].forEach((time,round)=>{
          add(time,comp.id,'knockout',round);
          if(round<4)add(time+14,comp.id,'knockout',round,2);
        });
      }
    }

    slots.sort((a, b) => a.time - b.time || a.compId.localeCompare(b.compId) || a.round - b.round || a.leg - b.leg);
    return slots;
  }

  function buildChampionsCompetition(save) {
    const champions=[];
    for(const league of journey.leagues){
      const prior=save.europeanQualifications?.[league.id];
      const ranked=(prior??league.teamIds).slice().sort((a,b)=>prior?0:team(b).strength-team(a).strength);
      champions.push(...ranked.slice(0,['GB','ES','DE','IT'].includes(league.country)?4:league.country==='FR'?3:2));
    }
    const otherEurope=clubs.filter(club=>club.country!=='BR'&&['GB','ES','DE','IT','FR','PT','NL','BE','TR','GR','AT','CH','DK','HR','RS','UA'].includes(club.country)&&club.players.length>=11)
      .sort((a,b)=>b.strength-a.strength);
    for(const candidate of otherEurope)if(champions.length<36&&!champions.includes(candidate.id))champions.push(candidate.id);
    return buildGroupsCompetition('champions-league',champions,save.seed,save.year);
  }

  function initSeason(save) {
    const clubId = save.club;
    const div = divisionOf(save, clubId) || 'B';
    const entrants = resolveSeasonEntrants(save);
    const competitions = {};

    // 1. Sempre cria a liga da divisão do clube do jogador
    const lId = leagueCompId(div);
    competitions[lId] = buildLeagueCompetition(lId, save.divisions[div]??journey.leagues.find(league=>league.code===div)?.teamIds, save.seed, save.year);
    for(const division of ['A','B','C','D']){
      const id=leagueCompId(division);
      if(!competitions[id])competitions[id]=buildLeagueCompetition(id,save.divisions[division],save.seed,save.year);
    }
    if(!competitions['serie-a'])competitions['serie-a']=buildLeagueCompetition('serie-a',save.divisions.A,save.seed,save.year);
    for(const league of journey.leagues){
      if(!competitions[league.id])competitions[league.id]=buildLeagueCompetition(league.id,league.teamIds,save.seed,save.year);
    }
    competitions['champions-league']=buildChampionsCompetition(save);
    if(save.year%4===2)competitions['world-cup']=buildGroupsCompetition('world-cup',journey.nations.map(nation=>'national-'+nation.code),save.seed,save.year);

    // 2. Só cria as copas em que o clube do jogador participa!
    if (entrants['copa-brasil']?.length) {
      competitions['copa-brasil'] = buildKnockoutCompetition('copa-brasil', entrants['copa-brasil'], save.seed, save.year);
    }
    const hasPreLib = !!(entrants['pre-libertadores']?.length);
    if (hasPreLib) {
      competitions['pre-libertadores'] = buildKnockoutCompetition('pre-libertadores', entrants['pre-libertadores'], save.seed, save.year);
    }
    if (entrants['libertadores']?.length) {
      competitions['libertadores'] = hasPreLib
        ? buildPendingGroupsCompetition('libertadores', entrants['libertadores'])
        : buildGroupsCompetition('libertadores', entrants['libertadores'], save.seed, save.year);
    }
    if (entrants['sul-americana']?.length) {
      competitions['sul-americana'] = hasPreLib
        ? buildPendingGroupsCompetition('sul-americana', entrants['sul-americana'])
        : buildGroupsCompetition('sul-americana', entrants['sul-americana'], save.seed, save.year);
    }
    if (div !== 'A') {
      for (const regId of ['copa-nordeste', 'copa-sul-sudeste', 'copa-verde']) {
        if (entrants[regId]?.includes(clubId)) {
          competitions[regId] = buildGroupsCompetition(regId, entrants[regId], save.seed, save.year);
        }
      }
    }

    save.competitions = competitions;
    save.calendar = journey.calendar(save,buildSeasonCalendar(competitions));
    save.calendarIndex = 0;
    save.journeyCalendarVersion=1;
    save.round = 0; // contador de jogos do clube na temporada
    save.leagueRound = 0; // contador de rodadas da liga concluídas (0..38)
    save.rounds = []; // histórico recente de jogos para notícias / últimos jogos
    save.playerStats = {};
    save.pending = null;
    save.last = null;
  }

  // ===== TABELAS E CLASSIFICAÇÕES (MESMA REGRA DO FOOTBALL-HYPE) =====
  function computeTable(teamIds, results, conmebol = false) {
    const rows = new Map(teamIds.map(id => [id, {
      id, name: team(id)?.name ?? id, p: 0, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, form: []
    }]));
    for (const r of results) {
      if (!rows.has(r.home) || !rows.has(r.away)) continue;
      for (const [id, scored, conceded] of [[r.home, r.h, r.a], [r.away, r.a, r.h]]) {
        const row = rows.get(id);
        row.j++;
        row.gp += scored;
        row.gc += conceded;
        row.sg = row.gp - row.gc;
        if (scored > conceded) { row.p += 3; row.v++; row.form.push('V'); }
        else if (scored === conceded) { row.p++; row.e++; row.form.push('E'); }
        else { row.d++; row.form.push('D'); }
      }
    }
    return [...rows.values()].sort((a, b) =>
      b.p - a.p ||
      (!conmebol ? b.v - a.v : 0) ||
      b.sg - a.sg ||
      b.gp - a.gp ||
      a.name.localeCompare(b.name, 'pt-BR')
    );
  }

  function standings(save, compId = null) {
    const id = compId || leagueCompId(leagueOf(save) || 'B');
    const comp = save?.competitions?.[id];
    if (!comp || comp.format !== 'league') return [];
    return computeTable(comp.participants, comp.results, false);
  }

  function groupTables(save, compId) {
    const comp = save?.competitions?.[compId];
    if (!comp || comp.format !== 'groups-knockout') return [];
    const conmebol = ['libertadores','sul-americana','world-cup','champions-league'].includes(compId);
    return Object.keys(comp.groups).sort().map(letter => {
      const ids = comp.groups[letter];
      const matches = comp.groupResults.filter(r => r.group === letter);
      return { group: letter, table: computeTable(ids, matches, conmebol) };
    });
  }

  // Vagas continentais da Série A (mesma lógica de qualification.ts do football-hype)
  function continentalPlaces(save) {
    const table = standings(save, 'serie-a');
    if (!table.length) return [];
    const eligible = table.slice(0, 16).map(r => r.id);
    const places = [];
    const assigned = new Set();
    const addLeague = (competition, source, origin = 'league') => {
      const id = eligible.find(cid => !assigned.has(cid));
      if (id) {
        assigned.add(id);
        places.push({ clubId: id, competition, origin, source });
      }
    };
    const addTitle = (id, competition, source) => {
      if (!id || team(id)?.country !== 'BR') return;
      if (assigned.has(id)) {
        const cur = places.find(p => p.clubId === id);
        if (cur?.competition === 'libertadores' && competition === 'libertadores') {
          cur.origin = 'title';
          cur.source = source;
        }
        addLeague(competition, source, 'inherited');
        return;
      }
      assigned.add(id);
      places.push({ clubId: id, competition, origin: 'title', source });
    };
    for (let i = 0; i < 4; i++) addLeague('libertadores', 'Série A');
    for (const cid of ['copa-brasil', 'libertadores', 'sul-americana']) {
      const finalTie = save.competitions?.[cid]?.knockout?.at(-1)?.[0];
      if (finalTie?.winner) addTitle(finalTie.winner, 'libertadores', cid);
    }
    for (let i = 0; i < 2; i++) addLeague('pre-libertadores', 'Série A');
    const cbFinal = save.competitions?.['copa-brasil']?.knockout?.at(-1)?.[0];
    if (cbFinal?.winner) {
      const runnerUp = cbFinal.home === cbFinal.winner ? cbFinal.away : cbFinal.home;
      addTitle(runnerUp, 'pre-libertadores', 'Vice da Copa do Brasil');
    }
    for (let i = 0; i < 5; i++) addLeague('sul-americana', 'Série A');
    return places;
  }

  function activeCompetitions(save) {
    if (!save?.competitions) return [];
    const order = ['serie-a', 'serie-b', 'serie-c', 'copa-brasil', 'pre-libertadores', 'libertadores', 'sul-americana', 'copa-nordeste', 'copa-sul-sudeste', 'copa-verde'];
    return [...new Set([...order,...Object.keys(save.competitions)])].filter(id=>save.competitions[id]).map(id=>save.competitions[id]);
  }

  // ===== PROGRESSÃO DE MATA-MATA E FASE DE GRUPOS =====
  function seedKnockoutFromGroups(save, comp) {
    if (comp.knockout.length) return;
    const tables = groupTables(save, comp.id);
    if(comp.id==='world-cup'||comp.id==='champions-league'){
      const compare=(a,b)=>b.p-a.p||b.sg-a.sg||b.gp-a.gp||a.id.localeCompare(b.id);
      let seeds,opponents;
      if(comp.national){
        const decorated=tables.map(group=>group.table.map(row=>({...row,group:group.group})));
        const thirds=decorated.map(table=>table[2]).sort(compare).slice(0,8);
        const runners=decorated.map(table=>table[1]).sort(compare);
        seeds=[...decorated.map(table=>table[0]),...runners.slice(0,4)];
        opponents=[...thirds,...runners.slice(4)];
      }else{
        const table=tables[0].table;
        comp.byes=table.slice(0,8).map(row=>row.id);
        seeds=table.slice(8,16);opponents=table.slice(16,24).reverse();
      }
      const pairs=[];
      const matchPairs=(index,remaining)=>{
        if(index===seeds.length)return true;
        for(let i=0;i<remaining.length;i++){
          if(comp.national&&seeds[index].group===remaining[i].group)continue;
          pairs[index]=[seeds[index].id,remaining[i].id];
          if(matchPairs(index+1,remaining.filter((_,j)=>j!==i)))return true;
        }
        return false;
      };
      matchPairs(0,opponents);
      comp.bestThirds=comp.national?tables.map(group=>({...group.table[2],group:group.group})).sort(compare).slice(0,8):[];
      comp.knockout=Array.from({length:5},(_,round)=>{
        const count=comp.national?16/2**round:round===0||round===1?8:8/2**(round-1);
        return Array.from({length:count},(_,index)=>({id:`${comp.id}:${round}:${index}`,round,label:knockoutRoundLabel(round,5,comp.id),
          legs:knockoutLegs(comp.id,round,4),home:round===0?pairs[index][0]:!comp.national&&round===1?comp.byes[index]:null,
          away:round===0?pairs[index][1]:null,firstLeg:null,secondLeg:null,penalties:null,winner:null}));
      });
      if(comp.national)comp.knockout[4].push({id:'world-cup:third',round:4,label:'Disputa de 3º lugar',isThird:true,legs:1,home:null,away:null,firstLeg:null,winner:null});
      return;
    }
    if (tables.length < 4) return;
    // Cruzamento igual ao football-hype (cup-groups.ts): 1A x 2B, 1B x 2A, 1C x 2D, 1D x 2C
    const pairs = [
      [tables[0].table[0].id, tables[1].table[1].id],
      [tables[1].table[0].id, tables[0].table[1].id],
      [tables[2].table[0].id, tables[3].table[1].id],
      [tables[3].table[0].id, tables[2].table[1].id]
    ];
    const totalKoRounds = 3; // Quartas (0), Semi (1), Final (2)
    const qf = pairs.map(([home, away], i) => ({
      id: `${comp.id}:0:${i}`,
      round: 0,
      label: knockoutRoundLabel(0, totalKoRounds, comp.id),
      legs: knockoutLegs(comp.id, 0, totalKoRounds - 1),
      home, away, firstLeg: null, secondLeg: null, penalties: null, winner: null
    }));
    const sf = [0, 1].map(i => ({
      id: `${comp.id}:1:${i}`,
      round: 1,
      label: knockoutRoundLabel(1, totalKoRounds, comp.id),
      legs: knockoutLegs(comp.id, 1, totalKoRounds - 1),
      home: null, away: null, firstLeg: null, secondLeg: null, penalties: null, winner: null
    }));
    const fin = [{
      id: `${comp.id}:2:0`,
      round: 2,
      label: knockoutRoundLabel(2, totalKoRounds, comp.id),
      legs: knockoutLegs(comp.id, 2, totalKoRounds - 1),
      home: null, away: null, firstLeg: null, secondLeg: null, penalties: null, winner: null
    }];
    comp.knockout = [qf, sf, fin];
  }

  function advanceKnockoutWinners(comp, roundIndex) {
    const current = comp.knockout[roundIndex];
    const next = comp.knockout[roundIndex + 1];
    if (!current || !next) return;
    if(comp.id==='champions-league'&&roundIndex===0){
      current.forEach((tie,index)=>{next[index].away=tie.winner;});
      return;
    }
    for (let i = 0; i < current.length; i += 2) {
      const target = next[i / 2];
      if (!target) continue;
      target.home = current[i]?.winner ?? null;
      target.away = current[i + 1]?.winner ?? null;
    }
    if(comp.national&&roundIndex===3){
      const third=next[1];
      [third.home,third.away]=current.map(tie=>tie.winner===tie.home?tie.away:tie.home);
    }
  }

  function resolveTieWinner(tie, rng, forcedPenalties = null) {
    if (tie.legs === 1) {
      if (!tie.firstLeg) return;
      if (tie.firstLeg.h > tie.firstLeg.a) tie.winner = tie.home;
      else if (tie.firstLeg.a > tie.firstLeg.h) tie.winner = tie.away;
      else {
        tie.penalties = forcedPenalties || penaltyShootout(rng);
        tie.winner = tie.penalties.h > tie.penalties.a ? tie.home : tie.away;
      }
      return;
    }
    if (!tie.firstLeg || !tie.secondLeg) return;
    // Ida: home vs away; Volta: away vs home
    const homeAgg = tie.firstLeg.h + tie.secondLeg.a;
    const awayAgg = tie.firstLeg.a + tie.secondLeg.h;
    if (homeAgg > awayAgg) tie.winner = tie.home;
    else if (awayAgg > homeAgg) tie.winner = tie.away;
    else {
      tie.penalties = forcedPenalties || penaltyShootout(rng);
      // Na volta, away é o mandante dos pênaltis
      tie.winner = tie.penalties.h > tie.penalties.a ? tie.away : tie.home;
    }
  }

  function findUserFixtureInSlot(save, slot) {
    const comp = save.competitions?.[slot.compId];
    if (!comp) return null;
    const clubId = journey.userTeam(save,comp);
    if(!clubId)return null;
    if (slot.stage === 'league') {
      const pair = comp.rounds[slot.round]?.find(f => f.home === clubId || f.away === clubId);
      if (!pair) return null;
      return { home: pair.home, away: pair.away, isFinal: false, phaseLabel: `Rodada ${slot.round + 1} / ${comp.rounds.length}` };
    }
    if (slot.stage === 'group') {
      const pair = comp.groupRounds[slot.round]?.find(f => f.home === clubId || f.away === clubId);
      if (!pair) return null;
      return { home: pair.home, away: pair.away, group: pair.group, isFinal: false, phaseLabel: `${comp.id==='champions-league'?'Fase de liga':`Grupo ${pair.group}`} · Rodada ${slot.round + 1}/${comp.groupRounds.length}` };
    }
    if (slot.stage === 'knockout') {
      const ties = comp.knockout[slot.round];
      if (!ties) return null;
      const tie = ties.find(t => t.home === clubId || t.away === clubId);
      if (!tie || !tie.home || !tie.away) return null;
      const isFinal = slot.round === comp.knockout.length - 1 && comp.id !== 'pre-libertadores'&&!tie.isThird;
      const isSecond = tie.legs === 2 && slot.leg === 2;
      const home = isSecond ? tie.away : tie.home;
      const away = isSecond ? tie.home : tie.away;
      const legText = tie.legs === 2 ? (isSecond ? ' · Volta' : ' · Ida') : ' · Jogo único';
      return { home, away, tieId: tie.id, isFinal, phaseLabel: `${tie.label}${legText}` };
    }
    return null;
  }

  function simulateSlot(save, slot, userMatch = null) {
    const comp = save.competitions?.[slot.compId];
    if (!comp) return [];
    const userClub=journey.userTeam(save,comp);
    const rng = random(hashString(save.seed ^ Math.imul(save.year, 99991), `${slot.compId}:${slot.stage}:${slot.round}:${slot.leg}`));
    const recordedGames = [];

    if (slot.stage === 'league') {
      const fixtures = comp.rounds[slot.round] || [];
      for (const f of fixtures) {
        const isUser = userMatch && (f.home === userClub || f.away === userClub);
        const score = isUser
          ? { h: f.home === userClub ? userMatch.forGoals : userMatch.against, a: f.away === userClub ? userMatch.forGoals : userMatch.against }
          : simulateFixtureScore(f.home, f.away, rng);
        const entry = { compId: comp.id, round: slot.round + 1, home: f.home, away: f.away, h: score.h, a: score.a, phaseLabel: `Rodada ${slot.round + 1}` };
        comp.results.push(entry);
        recordedGames.push(entry);
        assignSimulatedGoalEvents(save, comp.id, f.home, score.h, rng, isUser && f.home === userClub ? userMatch.goals : 0, isUser && f.home === userClub ? userMatch.assists : 0, isUser ? (f.home === userClub ? userMatch.teamScorers : userMatch.oppScorers) : []);
        assignSimulatedGoalEvents(save, comp.id, f.away, score.a, rng, isUser && f.away === userClub ? userMatch.goals : 0, isUser && f.away === userClub ? userMatch.assists : 0, isUser ? (f.away === userClub ? userMatch.teamScorers : userMatch.oppScorers) : []);
      }
      if(comp.id===leagueCompId(leagueOf(save)))save.leagueRound = Math.max(save.leagueRound || 0, slot.round + 1);
      return recordedGames;
    }

    if (slot.stage === 'group') {
      const fixtures = comp.groupRounds[slot.round] || [];
      for (const f of fixtures) {
        const isUser = userMatch && (f.home === userClub || f.away === userClub);
        const score = isUser
          ? { h: f.home === userClub ? userMatch.forGoals : userMatch.against, a: f.away === userClub ? userMatch.forGoals : userMatch.against }
          : simulateFixtureScore(f.home, f.away, rng);
        const entry = { compId: comp.id, round: slot.round + 1, group: f.group, home: f.home, away: f.away, h: score.h, a: score.a, phaseLabel: `Grupo ${f.group} · R${slot.round + 1}` };
        comp.groupResults.push(entry);
        recordedGames.push(entry);
        assignSimulatedGoalEvents(save, comp.id, f.home, score.h, rng, isUser && f.home === userClub ? userMatch.goals : 0, isUser && f.home === userClub ? userMatch.assists : 0, isUser ? (f.home === userClub ? userMatch.teamScorers : userMatch.oppScorers) : []);
        assignSimulatedGoalEvents(save, comp.id, f.away, score.a, rng, isUser && f.away === userClub ? userMatch.goals : 0, isUser && f.away === userClub ? userMatch.assists : 0, isUser ? (f.away === userClub ? userMatch.teamScorers : userMatch.oppScorers) : []);
      }
      if (slot.round === comp.groupRounds.length - 1) seedKnockoutFromGroups(save, comp);
      return recordedGames;
    }

    if (slot.stage === 'knockout') {
      const ties = comp.knockout[slot.round] || [];
      for (const tie of ties) {
        if (!tie.home || !tie.away) continue;
        const isSecond = tie.legs === 2 && slot.leg === 2;
        const home = isSecond ? tie.away : tie.home;
        const away = isSecond ? tie.home : tie.away;
        const isUser = userMatch && (home === userClub || away === userClub);
        const score = isUser
          ? { h: home === userClub ? userMatch.forGoals : userMatch.against, a: away === userClub ? userMatch.forGoals : userMatch.against }
          : simulateFixtureScore(home, away, rng);
        if (isSecond) tie.secondLeg = score;
        else tie.firstLeg = score;
        if (tie.legs === 1 || isSecond) resolveTieWinner(tie, rng, isUser ? userMatch.penalties : null);
        const legText = tie.legs === 2 ? (isSecond ? 'Volta' : 'Ida') : 'Jogo único';
        const entry = {
          compId: comp.id, round: slot.round + 1, home, away, h: score.h, a: score.a,
          penalties: (tie.legs === 1 || isSecond) ? tie.penalties : null,
          phaseLabel: `${tie.label} · ${legText}`
        };
        recordedGames.push(entry);
        assignSimulatedGoalEvents(save, comp.id, home, score.h, rng, isUser && home === userClub ? userMatch.goals : 0, isUser && home === userClub ? userMatch.assists : 0, isUser ? (home === userClub ? userMatch.teamScorers : userMatch.oppScorers) : []);
        assignSimulatedGoalEvents(save, comp.id, away, score.a, rng, isUser && away === userClub ? userMatch.goals : 0, isUser && away === userClub ? userMatch.assists : 0, isUser ? (away === userClub ? userMatch.teamScorers : userMatch.oppScorers) : []);
      }
      const allDone = ties.length > 0 && ties.every(t => t.winner);
      if (allDone) {
        if (comp.id === 'pre-libertadores') seedContinentalFromPreLibertadores(save);
        else advanceKnockoutWinners(comp, slot.round);
      }
      return recordedGames;
    }
    return recordedGames;
  }

  // Avança automaticamente slots de copas onde o clube do jogador já foi eliminado
  function advanceToNextUserSlot(save) {
    while (save.calendarIndex < save.calendar.length) {
      const slot = save.calendar[save.calendarIndex];
      if(slot.compId==='world-cup')journey.callup(save);
      const matchInfo = findUserFixtureInSlot(save, slot);
      if (matchInfo) return { slot, matchInfo };
      simulateSlot(save, slot, null);
      save.calendarIndex++;
    }
    return null;
  }

  // ===== CRIAÇÃO DE SAVE E PARTIDAS =====
  const START_AGE = 18;
  const RETIRE_AGE = 36;

  function agePhase(age) {
    if (age >= RETIRE_AGE) return 'Aposentado';
    if (age > 32) return 'Declínio';
    if (age >= 30) return 'Veterano';
    if (age >= 23) return 'Auge';
    return 'Promessa';
  }

  function create(player, seed) {
    return {
      version: 3,
      seed,
      player: {
        name: player.name.trim().slice(0, 22) || 'Camisa 10',
        age: START_AGE,
        nationality:'BR',position:'AM',
        look: availableLook(null, player.look),
        attributes: { ...defaultAttributes },
        progression: { points: 0, level: 0, total: 0, attributePoints: ATTRIBUTE_POINTS_PER_LEVEL }
      },
      stage: 'trial',
      trial: null,
      club: null,
      offers: [],
      trialResult: null,
      year: 2026,
      seasonNumber: 1,
      divisions: {
        A: [...defaultDivisions.A],
        B: [...defaultDivisions.B],
        C: [...defaultDivisions.C],
        D: [...defaultDivisions.D]
      },
      competitions: {},
      calendar: [],
      calendarIndex: 0,
      round: 0,
      leagueRound: 0,
      pending: null,
      personal: blankStats(),
      careerTotals: { seasons: 0, matches: 0, goals: 0, assists: 0, wins: 0, clubs: [] },
      ratingHistory: [],
      lastProgression: null,
      rounds: [],
      playerStats: {},
      last: null,
      balance: 0,
      earned: 0,
      owned: [],
      unreadItems: [],
      proposals: [],
      offerLock: null,
      achievements: [],
      history: [],
      lastSalary: null,
      nextQualifications: null
    };
  }

  function opponent(save) {
    if (!save?.club || save.stage === 'complete') return null;
    const found = advanceToNextUserSlot(save);
    if (!found) return null;
    const { slot, matchInfo } = found;
    const comp = save.competitions[slot.compId];
    const playingClub=journey.userTeam(save,comp);
    const home = matchInfo.home === playingClub;
    const oppId = home ? matchInfo.away : matchInfo.home;
    return {
      club: team(oppId),
      home,
      competitionId: slot.compId,
      competitionName: comp.name,
      competitionShort: comp.shortName,
      phaseLabel: matchInfo.phaseLabel,
      isClassic: db.isClassic(save.club, oppId),
      isFinal: !!matchInfo.isFinal,
      national:!!comp.national,playingClub,date:slot.date,
      slot
    };
  }

  function makeMatch(save, kind) {
    const next = kind === 'trial'
      ? { club: rival, home: true, competitionId: 'trial', competitionName: 'Seletiva', competitionShort: 'Seletiva', phaseLabel: 'Jogo-teste', isClassic: false, isFinal: false }
      : opponent(save);
    if (!next) return null;
    const rng = random(save.seed ^ Math.imul(save.round + 1, kind === 'trial' ? 1597334677 : 668265263) ^ Math.imul(save.year - 2026, 99991));
    const opening = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 1], [1, 0]];
    const [forGoals, against] = opening[Math.floor(rng() * opening.length)];
    const regularChances = kind === 'trial'
      ? 5
      : clamp(Math.round(5.1 - (next.club.strength - 64) * 0.11 + (next.home ? 0.25 : 0) + (rng() - 0.5) * 1.8), 3, 6);
    const lineup=kind==='trial'?{starter:true,label:'Seletiva',points:60}:journey.status(save);
    const chances=lineup.starter?regularChances:2+Math.floor(rng()*2);
    const difficulty = next.club.strength >= 75 ? 'hard' : next.club.strength <= 66 ? 'easy' : 'normal';
    const playingClub = next.playingClub ?? save.club;
    const myTeam = team(playingClub);
    const openingForScorers = [];
    const openingOppScorers = [];
    const teamScorers = [];
    const oppScorers = [];
    for (let i = 0; i < forGoals; i++) {
      const name = pickWeightedPlayer(myTeam?.players || [], POS_GOAL_MULT, rng);
      if (name) {
        openingForScorers.push(name);
        teamScorers.push({ name, assisted: false, simulated: true });
      }
    }
    for (let i = 0; i < against; i++) {
      const name = pickWeightedPlayer(next.club?.players || [], POS_GOAL_MULT, rng);
      if (name) {
        openingOppScorers.push(name);
        oppScorers.push({ name, assisted: false, simulated: true });
      }
    }
    return {
      kind,
      national:!!next.national,playingClub,date:next.date,lineup,
      opponent: next.club.id,
      home: next.home,
      round: kind === 'trial' ? null : save.round + 1,
      competitionId: next.competitionId,
      competitionName: next.competitionName,
      competitionShort: next.competitionShort,
      phaseLabel: next.phaseLabel,
      isClassic: next.isClassic,
      isFinal: next.isFinal,
      scenario: Math.floor(rng() * 0x7fffffff),
      penalty: false,
      setPiece: null,
      forGoals,
      against,
      chances,
      used: 0,
      goals: 0,
      assists: 0,
      teamScorers,
      oppScorers,
      openingForScorers,
      openingOppScorers,
      lastSimForScorer: null,
      lastSimOppScorer: null,
      shots: 0,
      rating: 6,
      ratingEvents: [],
      difficulty
    };
  }

  function selectTrial(save, id) {
    if (save.stage !== 'trial' || save.pending || !trials.some(c => c.id === id)) return false;
    save.trial = id;
    save.pending = makeMatch(save, 'trial');
    return true;
  }

  function contract(save, id) {
    if (save.stage !== 'offers' || !save.offers.includes(id)) return false;
    save.club = id;
    save.stage = 'season';
    journey.state(save).points = 0;
    if (!save.careerTotals) save.careerTotals = { seasons: 0, matches: 0, goals: 0, assists: 0, wins: 0, clubs: [] };
    if (!save.careerTotals.clubs.includes(id)) save.careerTotals.clubs.push(id);
    initSeason(save);
    return true;
  }

  function joinAcademy(save,id){
    if(save.stage!=='trial'||save.pending||!team(id)||!['A','B','C','D',...journey.leagues.map(league=>league.code)].includes(team(id).league))return false;
    save.stage='offers';save.offers=[id];save.origin='academy';
    journey.state(save).points=0;
    return contract(save,id);
  }

  function upgradeCalendar(data) {
    if(data.stage==='season'&&!data.journeyCalendarVersion&&!data.pending){
      const futureIndex=data.calendarIndex;
      const remaining=data.calendar.slice(futureIndex);
      const cut=remaining[0]?.time??1000;
      const newComps={};
      for(const division of ['A','B','C','D']){
        const id=leagueCompId(division);
        if(!data.competitions[id])newComps[id]=buildLeagueCompetition(id,data.divisions[division],data.seed,data.year);
      }
      if(!data.competitions['champions-league'])newComps['champions-league']=buildChampionsCompetition(data);
      for(const league of journey.leagues){
        if(!data.competitions[league.id])newComps[league.id]=buildLeagueCompetition(league.id,league.teamIds,data.seed,data.year);
      }
      if(!data.competitions['serie-a'])newComps['serie-a']=buildLeagueCompetition('serie-a',data.divisions.A,data.seed,data.year);
      Object.assign(data.competitions,newComps);
      const added=buildSeasonCalendar(newComps).filter(slot=>slot.time>=cut);
      for(const slot of buildSeasonCalendar(newComps).filter(slot=>slot.time<cut))simulateSlot(data,slot,null);
      if(data.year%4===2&&cut<430&&!data.competitions['world-cup'])data.competitions['world-cup']=buildGroupsCompetition('world-cup',journey.nations.map(nation=>'national-'+nation.code),data.seed,data.year);
      const planned=journey.calendar(data,[...remaining,...added]);
      const filtered=planned.filter(slot=>slot.compId!=='world-cup'||data.competitions['world-cup']&&cut<430);
      data.calendar=[...data.calendar.slice(0,futureIndex),...filtered];
      data.journeyCalendarVersion=1;
    }
  }

  function startRound(save) {
    upgradeCalendar(save);
    if (save.stage === 'season' && !save.pending) save.pending = makeMatch(save, 'league');
    if(save.pending)ensureObjectives(save.pending);
    return save.pending;
  }

  function purchase(save, id) {
    const item = storeById.get(id);
    if (!item || save.balance < item.price) return false;
    if (item.repeatable) {
      if (item.id === 'consumable:attr-point') {
        const hasRoom = attributeKeys.some(k => (save.player?.attributes?.[k] ?? 0) < 99);
        if (!hasRoom) return false;
        save.balance -= item.price;
        xpProgress(save);
        save.player.progression.attributePoints += 1;
        return true;
      }
      return false;
    }
    if (save.owned.includes(id)) return false;
    save.balance -= item.price;
    save.owned.push(id);
    save.unreadItems.push(id);
    return true;
  }

  function edit(save, name, look) {
    save.player = { ...save.player, name: name.trim().slice(0, 22) || 'Camisa 10', look: availableLook(save, look) };
  }

  // ===== MERCADO / PROPOSTAS (2ª METADE DA 1ª TEMPORADA + 1 ANO DE COOLDOWN AO ACEITAR) =====
  function seasonProgress(save) {
    return clamp((save.leagueRound || 0) / totalRounds, 0, 1);
  }

  function offerLockStatus(save) {
    if (!save) return { locked: false, reason: '' };
    const progress = seasonProgress(save);
    if ((save.seasonNumber || 1) === 1 && progress < 0.5) {
      return { locked: true, reason: 'Propostas começam a chegar na segunda metade da primeira temporada.' };
    }
    if (save.offerLock) {
      const lock = save.offerLock;
      if (save.year < lock.year || (save.year === lock.year && progress < lock.progress)) {
        const pct = Math.round(lock.progress * 100);
        return {
          locked: true,
          reason: `Contrato recente ativo: novas propostas liberadas em ${lock.year}${pct > 0 ? ` (${pct}% da temporada)` : ''}.`
        };
      }
    }
    return { locked: false, reason: '' };
  }

  function activeProposals(save) {
    if (!save || offerLockStatus(save).locked) return [];
    return (save.proposals || []).filter(p => p.expires >= save.round && p.id !== save.club);
  }

  const DIV_RANK = { A: 1, B: 2, C: 3, D: 4,...Object.fromEntries(journey.leagues.map(league=>[league.code,0])) };

  function isWorseClub(save, candidateId, currentId) {
    const cDiv = divisionOf(save, candidateId) || team(candidateId)?.league || 'C';
    const mDiv = divisionOf(save, currentId) || team(currentId)?.league || 'B';
    const cRank = DIV_RANK[cDiv] ?? 3;
    const mRank = DIV_RANK[mDiv] ?? 3;
    if (cRank > mRank) return true;
    if (cRank < mRank) return false;
    const cStr = team(candidateId)?.strength ?? 0;
    const mStr = team(currentId)?.strength ?? 0;
    return cStr < mStr - 0.5;
  }

  function performanceContext(save) {
    const matches = save.personal?.matches ?? 0;
    const seasonAvg = matches > 0 ? (save.personal.goals + 1.2 * save.personal.assists) / matches : 0;
    const recent = save.history.slice(-4);
    const recentAvg = recent.length > 0 ? recent.reduce((sum, m) => sum + m.goals + 1.2 * m.assists, 0) / recent.length : 0;
    const playerBad = (matches >= 4 && seasonAvg < 0.50) || (recent.length >= 3 && recentAvg < 0.45);

    const table = standings(save);
    const pos = table.findIndex(r => r.id === save.club) + 1;
    const row = pos > 0 ? table[pos - 1] : null;
    const teamBad = !!row && row.j >= 6 && (pos >= 15 || (row.v / row.j) < 0.30);

    return { playerBad, teamBad, allowWorse: playerBad || teamBad, recentAvg };
  }

  function propose(save) {
    if (offerLockStatus(save).locked || (save.player.age >= RETIRE_AGE - 1 && save.calendarIndex >= save.calendar.length)) {
      save.proposals = [];
      return;
    }
    save.proposals = activeProposals(save);
    const isEnd = save.calendarIndex >= save.calendar.length;
    if (save.round % 4 !== 0 && !isEnd) return;
    const form = save.history.slice(-4);
    if (!form.length) return;
    const rating = form.reduce((sum, m) => sum + m.goals + 1.20 * m.assists, 0) / Math.max(1, form.length);
    journey.europeanProposals(save);
    if (rating < 0.33) return;

    const currentId = save.club;
    const currentDiv = divisionOf(save, currentId) || 'B';
    const { allowWorse } = performanceContext(save);

    let tiers;
    if (allowWorse) {
      tiers = rating >= 1.30 ? ['A', 'B'] : rating >= 0.69 ? ['B', 'C'] : ['C'];
      if (!tiers.includes(currentDiv)) tiers.push(currentDiv);
    } else {
      tiers = [currentDiv];
      if (currentDiv === 'C' && rating >= 0.69) tiers.unshift('B');
      if (currentDiv === 'B' && rating >= 1.15) tiers.unshift('A');
    }

    const rng = random(save.seed ^ Math.imul(save.round + 31, 91871) ^ save.year);
    const targets = tiers.map(div => {
      const sorted = [...(save.divisions[div] || [])].sort((a, b) => (team(b)?.strength ?? 0) - (team(a)?.strength ?? 0));
      const eligible = sorted.filter(cid =>
        cid !== currentId &&
        !save.proposals.some(o => o.id === cid) &&
        (allowWorse || !isWorseClub(save, cid, currentId))
      );
      if (!eligible.length) return null;
      const wanted = clamp(Math.floor((1 - clamp(rating / 2.2, 0, 1)) * (eligible.length - 1)), 0, Math.max(0, eligible.length - 1));
      const pool = eligible.slice(Math.max(0, wanted - 3), wanted + 4);
      return pool[Math.floor(rng() * pool.length)] || eligible[0];
    }).filter(Boolean);

    save.proposals.push(...targets.slice(0, 2).map(cid => ({ id: cid, round: save.round, expires: save.round + 5 })));
  }

  function decide(save, id, accept) {
    if (save.pending || !activeProposals(save).some(p => p.id === id)) return false;
    save.proposals = save.proposals.filter(p => p.id !== id);
    if (accept) {
      const prevDiv = divisionOf(save, save.club);
      const nextDiv = divisionOf(save, id);
      save.club = id;
      journey.state(save).points = journey.transferPoints(save, id);
      if (!save.careerTotals) save.careerTotals = { seasons: 0, matches: 0, goals: 0, assists: 0, wins: 0, clubs: [] };
      if (!save.careerTotals.clubs.includes(id)) save.careerTotals.clubs.push(id);
      save.proposals = [];
      // Bloqueio de 1 ano completo sem receber propostas
      save.offerLock = { year: save.year + 1, progress: seasonProgress(save) };
      // Se mudou de divisão no meio da temporada, cria e sincroniza a liga da nova divisão até a rodada atual
      if (nextDiv && nextDiv !== prevDiv) {
        const nextCompId = leagueCompId(nextDiv);
        if (!save.competitions[nextCompId]) {
          const newComp = buildLeagueCompetition(nextCompId, save.divisions[nextDiv], save.seed, save.year);
          save.competitions[nextCompId] = newComp;
          const targetRound = Math.min(save.leagueRound || 0, newComp.rounds.length);
          for (let r = 0; r < targetRound; r++) {
            simulateSlot(save, { compId: nextCompId, stage: 'league', round: r, leg: 1 }, null);
          }
          // Substitui os slots futuros da liga antiga pelos da nova divisão
          const oldCompId = leagueCompId(prevDiv);
          for (let i = save.calendarIndex; i < save.calendar.length; i++) {
            if (save.calendar[i].compId === oldCompId) {
              save.calendar[i] = { ...save.calendar[i], compId: nextCompId };
            }
          }
          delete save.competitions[oldCompId];
        }
      }
    }
    return true;
  }

  // ===== ARTILHEIROS, ASSISTÊNCIAS E PRÊMIOS =====
  function playerLeaderboard(save, compId = null, metric = 'goals') {
    if (!save?.playerStats) return [];
    const targetComp = compId || leagueCompId(leagueOf(save) || 'B');
    const bucket = save.playerStats[targetComp] || {};
    return Object.values(bucket)
      .filter(row => row[metric] > 0)
      .sort((a, b) => b[metric] - a[metric] || b.goals - a.goals || a.name.localeCompare(b.name, 'pt-BR'));
  }

  function scorers(save, compId = null) {
    return playerLeaderboard(save, compId, 'goals');
  }

  function assisters(save, compId = null) {
    if (compId && COMPETITION_META[compId]?.format !== 'league') return [];
    return playerLeaderboard(save, compId, 'assists');
  }

  const performance = m => m.goals * 3 + m.assists * 2.4 + (m.win ? 0.85 : 0);

  function recordAwards(save) {
    const end = save.calendarIndex >= save.calendar.length;
    const div = leagueOf(save);
    if (!div) return;
    function award(kind, club, compLabel, period = 0) {
      if (!save.achievements.some(a => a.kind === kind && a.year === save.year && a.period === period && a.league === compLabel)) {
        save.achievements.push({ kind, club, league: compLabel, year: save.year, period });
      }
    }
    for(const comp of activeCompetitions(save)){
      if(comp.format==='league')continue;
      const owner=journey.userTeam(save,comp);
      if(owner&&comp.knockout?.at(-1)?.[0]?.winner===owner){
        award('cup',owner,comp.name);
        const leaders=scorers(save,comp.id);
        if(leaders[0]?.player)award('scorer',owner,comp.name);
      }
    }
    if (!end) return;
    const lId = leagueCompId(div);
    const table = standings(save, lId);
    if (table[0]?.id === save.club) award('title', save.club, div);
    const topScorers = scorers(save, lId);
    if (topScorers[0]?.player) award('scorer', save.club, div);
    const topAssisters = assisters(save, lId);
    if (topAssisters[0]?.player) award('assister', save.club, div);
    if (topScorers[0]?.player || (save.personal.goals * 3 + save.personal.assists * 2.4 >= 45)) {
      award('player', save.club, div);
    }
    // Títulos de copas vencidas pelo clube
    for (const comp of activeCompetitions(save)) {
      if (comp.format === 'league') continue;
      const finalTie = comp.knockout?.at(-1)?.[0];
      if (finalTie?.winner === save.club) {
        award('cup', save.club, comp.name);
      }
    }
  }

  // ===== FIM DE TEMPORADA: PROMOÇÃO E REBAIXAMENTO (4 SOBEM / 4 DESCEM) =====
  function resolveOtherDivisionOrder(teamIds, seed, year, div) {
    const rng = random(hashString(seed ^ year, `resolve-div:${div}`));
    return [...teamIds]
      .map(id => {
        const str = team(id)?.strength ?? 65;
        // Força do elenco define a base; ruído moderado permite surpresas mas os mais fracos têm muito mais chance de cair
        const score = str + (rng() + rng() - 1) * 5.2;
        return { id, score };
      })
      .sort((a, b) => b.score - a.score)
      .map(x => x.id);
  }

  // ===== EVOLUÇÃO POR IDADE E APOSENTADORIA AOS 36 ANOS =====
  const ATTRIBUTE_POINTS_PER_LEVEL = 5;

  function attributeProgress(save) {
    const progress=xpProgress(save);
    return clamp(progress.points/progress.required,0,1);
  }

  function xpProgress(save) {
    const progress=save.player.progression??={points:0,level:0,total:0,attributePoints:0};
    progress.points=Math.max(0,Number(progress.points)||0);
    progress.level=Math.max(0,Math.floor(Number(progress.level)||0));
    progress.total=Math.max(progress.points,Number(progress.total)||0);
    progress.attributePoints=Math.max(0,Math.floor(Number(progress.attributePoints)||0));
    return {...progress,required:2200+progress.level*350+Math.max(0,overall(save.player.attributes)-80)*100};
  }

  function upgradeAttribute(save, key) {
    if (!save?.player?.attributes || !attributeKeys.includes(key)) return false;
    xpProgress(save);
    const progress = save.player.progression;
    const current = Number(save.player.attributes[key]);
    if (progress.attributePoints < 1 || !Number.isFinite(current) || current >= 99) return false;
    save.player.attributes[key] = Math.min(99, Math.round(current) + 1);
    progress.attributePoints--;
    return true;
  }

  function ensureObjectives(match) {
    if(Array.isArray(match.objectives)&&match.objectives.length===3)return match.objectives;
    const rng=random((match.scenario??1)^Math.imul((match.round??0)+1,9137));
    const goals=Math.max(1,Math.min(2,Math.floor((match.chances??3)/3)));
    const pool=[
      {type:'goals',target:goals,reward:20+goals*5,label:`Marque ${goals} ${goals===1?'gol':'gols'}`},
      {type:'outside',target:1,reward:30,label:'Marque 1 gol fora da área'},
      {type:'dribbles',target:2+Math.floor(rng()*2),reward:25,label:'Complete dribles'},
      {type:'rating',target:rng()<.6?7:7.5,reward:20,label:'Termine com a nota mínima'},
      {type:'win',target:1,reward:20,label:'Ganhe a partida'},
      {type:'finesse',target:1,reward:30,label:'Marque 1 gol colocado'}
    ];
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    match.objectives=pool.slice(0,3);
    return match.objectives;
  }

  function objectiveProgress(match,liveEvents=[],liveRating=null,final=false) {
    const seen=new Set();
    const events=[...(match.ratingEvents??[]),...liveEvents].filter(event=>{
      if(event.shootoutKick!=null||event.id!=null&&seen.has(event.id))return false;
      if(event.id!=null)seen.add(event.id);
      return true;
    });
    const goals=events.filter(event=>event.type==='goal');
    const recordedGoals=(match.ratingEvents??[]).filter(event=>event.type==='goal'&&event.shootoutKick==null).length;
    const goalCount=goals.length+Math.max(0,(match.goals??0)-recordedGoals);
    const won=match.forGoals>match.against||match.shootout?.winner==='user';
    return ensureObjectives(match).map(objective=>{
      const values={goals:goalCount,outside:goals.filter(event=>event.outsideArea||event.freeKick).length,
        finesse:goals.filter(event=>event.finesse).length,dribbles:events.filter(event=>event.type==='dribble').length,
        rating:liveRating??match.rating??6,win:won?1:0};
      const current=values[objective.type]??0;
      const provisional=objective.type==='rating'||objective.type==='win';
      return {...objective,current,complete:current>=objective.target&&(!provisional||final)};
    });
  }

  function awardXp(save, amount) {
    const earned = Math.max(0, Math.round(Number(amount) || 0));
    xpProgress(save);
    const progress = save.player.progression;
    progress.points += earned;
    progress.total += earned;
    let upgrades = 0;
    while (progress.points >= xpProgress(save).required) {
      progress.points -= xpProgress(save).required;
      progress.level++;
      progress.attributePoints += ATTRIBUTE_POINTS_PER_LEVEL;
      upgrades++;
    }
    return { total: earned, upgrades, attributePoints: upgrades * ATTRIBUTE_POINTS_PER_LEVEL };
  }

  function awardMatchXp(save,match) {
    if(match.xpAward)return;
    const objectives=objectiveProgress(match,[],null,true);
    const bonus=objectives.reduce((sum,objective)=>sum+(objective.complete?objective.reward:0),0);
    const won=match.forGoals>match.against||match.shootout?.winner==='user';
    const base=(match.kind==='trial'?35:55)+Math.round(clamp((match.rating??6)-6,0,4)*5)+(won?10:0);
    const earned=base+bonus;
    xpProgress(save);
    const progress=save.player.progression;
    progress.points+=earned;
    progress.total+=earned;
    let upgrades=0;
    while(progress.points>=xpProgress(save).required){
      progress.points-=xpProgress(save).required;
      progress.level++;
      progress.attributePoints+=ATTRIBUTE_POINTS_PER_LEVEL;
      upgrades++;
    }
    const attributePoints=upgrades*ATTRIBUTE_POINTS_PER_LEVEL;
    match.xpAward={base,bonus,total:earned,upgrades,attributePoints,objectives};
  }

  function applySeasonProgression(save) {
    const attrs = save.player.attributes;
    const oldOverall = overall(attrs);
    const fromAge = Number.isInteger(save.player.age) ? save.player.age : START_AGE;
    const toAge = fromAge + 1;
    save.player.age = toAge;

    const s = save.personal || blankStats();
    const matches = Math.max(1, s.matches);
    const contrib = (s.goals + 0.85 * s.assists) / matches;
    const winRate = s.wins / matches;
    const seasonScore = clamp(contrib * 0.72 + winRate * 0.35 + Math.min(1, s.matches / 35) * 0.28, 0, 1.85);
    const rng = random(save.seed ^ Math.imul(save.year, 41957) ^ Math.imul(toAge, 7919));

    const deltas = {};
    const physicalFast = new Set(['speed', 'acceleration']);
    const physicalBody = new Set(['stamina', 'strength']);

    for (const key of attributeKeys) {
      let delta = 0;
      if (toAge <= 32) {
        delta = 0;
      } else {
        // Depois dos 32 anos (33, 34, 35...): perda gradual que aumenta conforme fica mais velho
        const yearsOver = toAge - 32; // 1 aos 33, 2 aos 34, 3 aos 35
        const speedExtra = physicalFast.has(key) ? Math.ceil(yearsOver * 0.65) : 0;
        const bodyExtra = physicalBody.has(key) ? Math.floor(yearsOver * 0.45) : 0;
        const techSoften = (!physicalFast.has(key) && !physicalBody.has(key) && seasonScore >= 1.0) ? 0.5 : 0;
        const rawLoss = yearsOver * 0.95 + speedExtra + bodyExtra - techSoften + rng() * 0.75;
        delta = -Math.max(yearsOver >= 2 ? 1 : 0, Math.round(rawLoss));
      }
      const nextVal = clamp(attrs[key] + delta, 40, 99);
      deltas[key] = nextVal - attrs[key];
      attrs[key] = nextVal;
    }

    const newOverall = overall(attrs);
    save.lastProgression = { fromAge, toAge, deltas, oldOverall, newOverall };
  }

  function newSeason(save) {
    if (save.stage !== 'complete') return false;
    save.europeanQualifications=Object.fromEntries(journey.leagues.map(league=>[league.id,standings(save,league.id).map(row=>row.id)]));

    // Acumula totais históricos da carreira antes de virar a temporada
    if (!save.careerTotals) save.careerTotals = { seasons: 0, matches: 0, goals: 0, assists: 0, wins: 0, clubs: [] };
    save.careerTotals.seasons++;
    save.careerTotals.matches += save.personal.matches;
    save.careerTotals.goals += save.personal.goals;
    save.careerTotals.assists += save.personal.assists;
    save.careerTotals.wins += save.personal.wins;
    if (save.club && !save.careerTotals.clubs.includes(save.club)) save.careerTotals.clubs.push(save.club);

    // Evolui idade e atributos (e verifica aposentadoria aos 36 anos)
    applySeasonProgression(save);
    if (save.player.age >= RETIRE_AGE) {
      save.stage = 'retired';
      save.proposals = [];
      save.pending = null;
      return true;
    }

    // 1. Determina classificação final de A, B, C, D (usando tabela real na divisão jogada, e simulação ponderada por força nas outras)
    const finalTables = {};
    for (const div of ['A', 'B', 'C', 'D']) {
      const cId = leagueCompId(div);
      if (save.competitions?.[cId]?.results?.length) {
        finalTables[div] = standings(save, cId).map(r => r.id);
      } else {
        finalTables[div] = resolveOtherDivisionOrder(save.divisions[div], save.seed, save.year, div);
      }
    }

    // 2. Qualificações continentais (Série A) antes de mexer nas divisões
    let nextLib = finalTables.A.slice(0, 4);
    let nextPre = finalTables.A.slice(4, 6);
    let nextSula = finalTables.A.slice(6, 11);
    if (save.competitions?.['serie-a']) {
      const places = continentalPlaces(save);
      nextLib = places.filter(p => p.competition === 'libertadores').map(p => p.clubId);
      nextPre = places.filter(p => p.competition === 'pre-libertadores').map(p => p.clubId);
      nextSula = places.filter(p => p.competition === 'sul-americana').map(p => p.clubId);
    }

    // 3. Promoção e rebaixamento: 4 sobem / 4 descem!
    const downA = finalTables.A.slice(-4);
    const upB = finalTables.B.slice(0, 4);
    const downB = finalTables.B.slice(-4);
    const upC = finalTables.C.slice(0, 4);
    const downC = finalTables.C.slice(-4);
    const upD = finalTables.D.slice(0, 4);

    save.divisions = {
      A: [...finalTables.A.slice(0, 16), ...upB],
      B: [...downA, ...finalTables.B.slice(4, 16), ...upC],
      C: [...downB, ...finalTables.C.slice(4, 16), ...upD],
      D: [...downC, ...finalTables.D.slice(4)]
    };

    save.nextQualifications = {
      libertadores: nextLib,
      preLibertadores: nextPre,
      sulAmericana: nextSula,
      serieBTop12: finalTables.B.slice(0, 12)
    };

    save.year += 1;
    save.seasonNumber = (save.seasonNumber || 1) + 1;
    save.stage = 'season';
    save.personal = blankStats();
    save.history = [];
    save.proposals = [];
    save.lastSalary = null;

    initSeason(save);
    return true;
  }

  function ratingAfter(rating, delta) {
    return Math.round(clamp((rating ?? 6) + delta, 0, 10) * 10) / 10;
  }

  function ratingColor(value) {
    const rating = clamp(value, 0, 10);
    const hue = rating < 6 ? 3 + 34 * rating / 6 : 37 + 90 * (rating - 6) / 4;
    return `hsl(${hue}, 73%, 59%)`;
  }

  function recordRatingEvents(match, events) {
    if (!events.length) return;
    match.ratingEvents ??= [];
    for (const event of events) {
      if(event.id!=null&&match.ratingEvents.some(existing=>existing.id===event.id))continue;
      match.rating = ratingAfter(match.rating, event.delta);
      match.ratingEvents.push({ ...event, rating: match.rating });
    }
  }

  function averageRating(save) {
    const matches = save.ratingHistory.filter(entry => entry.year === save.year && entry.kind !== 'trial');
    return matches.length ? matches.reduce((sum, entry) => sum + entry.rating, 0) / matches.length : null;
  }

  function finishMatch(save, match) {
    if(match.xpAward)return;
    awardMatchXp(save,match);
    save.pending = null;
    save.last = { ...match };
    if (Number.isFinite(match.rating)) {
      save.ratingHistory.push({
        year: save.year, round: match.round, kind: match.kind, competitionId: match.competitionId,
        club: match.kind === 'trial' ? save.trial : save.club, opponent: match.opponent,
        rating: match.rating, events: match.ratingEvents ?? [],national:!!match.national
      });
    }
    if (match.kind === 'trial') {
      const rating = clamp(Math.round(50 + (match.goals + 0.65 * match.assists) / match.chances * 42 + (match.forGoals > match.against ? 6 : 0)), 0, 100);
      const sortedB = [...save.divisions.B].sort((a, b) => (team(b)?.strength ?? 0) - (team(a)?.strength ?? 0));
      const rank = clamp(Math.round((100 - rating) / 4.2) - 2, 0, sortedB.length - 3);
      save.trialResult = { rating, goals: match.goals, chances: match.chances };
      save.offers = sortedB.slice(rank, rank + 3);
      save.stage = 'offers';
      return;
    }

    const slot = save.calendar[save.calendarIndex];
    const playedGames = slot ? simulateSlot(save, slot, match) : [];
    save.calendarIndex++;

    // Guarda resultados da rodada para o noticiário e últimos jogos
    if (playedGames.length) {
      save.rounds.push(playedGames.map(g => ({ ...g, seasonRound: save.round + 1 })));
      if (save.rounds.length > 60) save.rounds.shift();
    }

    save.round++;
    save.personal.matches++;
    save.personal.goals += match.goals;
    save.personal.assists += match.assists;
    save.personal.chances += match.chances;
    save.personal.shots += match.shots;
    const win = match.forGoals > match.against;
    if (win) save.personal.wins++;
    save.history.push({
      round: save.round,
      compId: match.competitionId,
      compName: match.competitionShort || match.competitionName,
      phaseLabel: match.phaseLabel,
      club: save.club,
      opponent: match.opponent,
      home: match.home,
      forGoals: match.forGoals,
      against: match.against,
      penalties: match.penalties || null,
      goals: match.goals,
      assists: match.assists,
      rating: match.rating ?? null,
      date:match.date,national:!!match.national,
      xp:match.xpAward,
      win
    });

    const pay = match.national?0:salaryFor(save, save.club);
    save.balance += pay;
    save.earned += pay;
    save.lastSalary = { club: save.club, amount: pay, round: save.round };

    // Avança slots onde o clube não joga (ex: eliminado da copa)
    upgradeCalendar(save);
    const hasNext = advanceToNextUserSlot(save);
    recordAwards(save);
    propose(save);
    if (!hasNext) save.stage = 'complete';
    journey.postMatch(save,match);
    if(match.national)save.internationalHistory.push({...save.last,year:save.year});
  }

  function chance(save, outcome, shots, scorerName = null) {
    const match = save.pending;
    if (!match || match.used >= match.chances) return false;
    match.used++;
    match.shots += shots;
    match.penalty = false;
    match.setPiece = null;
    if (outcome === 'goal' || outcome === 'assist' || outcome === 'ownGoal' || outcome === 'teamGoal') {
      match.forGoals++;
      if (outcome === 'goal') match.goals++;
      if (outcome === 'assist') match.assists++;
      if ((outcome === 'assist' || outcome === 'teamGoal') && scorerName) {
        (match.teamScorers ??= []).push({ name: scorerName, assisted: outcome === 'assist' });
      }
    }
    match.lastSimForScorer = null;
    match.lastSimOppScorer = null;
    if (match.used < match.chances && !match.training) {
      const opponent = team(match.opponent);
      const myTeam = team(match.playingClub ?? save.club);
      const gapRng = random(hashString(match.scenario ?? save.seed, `goal-between-${match.used}`));
      const risk = clamp(.16 + ((opponent?.strength ?? 70)-70)*.005 + (match.home ? 0 : .03), .08, .26);
      const forRisk = clamp(.11 + ((myTeam?.strength ?? 70)-70)*.004 + (match.home ? .02 : 0), .06, .18);
      const roll = gapRng();
      if (roll < risk) {
        match.against++;
        const oppName = pickWeightedPlayer(opponent?.players || [], POS_GOAL_MULT, gapRng);
        if (oppName) {
          match.lastSimOppScorer = oppName;
          (match.oppScorers ??= []).push({ name: oppName, assisted: false, simulated: true });
        }
      } else if (roll < risk + forRisk) {
        match.forGoals++;
        const forName = pickWeightedPlayer(myTeam?.players || [], POS_GOAL_MULT, gapRng);
        if (forName) {
          match.lastSimForScorer = forName;
          (match.teamScorers ??= []).push({ name: forName, assisted: false, simulated: true });
        }
      }
    }
    return match.used === match.chances;
  }

  // ===== DISPUTA DE PÊNALTIS INTERATIVA (REGRA IFAB) =====
  const SHOOTOUT_POS_LABELS = { ST: 'ATA', LW: 'PE', RW: 'PD', AM: 'MEI', CM: 'MC', DM: 'VOL', LB: 'LE', RB: 'LD', CB: 'ZAG', GK: 'GOL' };
  const SHOOTOUT_FILLERS = [
    ['Lateral Direito', 'LD'], ['Lateral Esquerdo', 'LE'], ['Zagueiro Central', 'ZAG'],
    ['Zagueiro', 'ZAG'], ['Volante', 'VOL'], ['Meia', 'MC'], ['Ponta', 'ATA'],
    ['Atacante', 'ATA'], ['Meia-atacante', 'MEI'], ['Segundo Volante', 'VOL']
  ];

  function findKnockoutTieForMatch(save, match) {
    if (!save || !match || match.kind !== 'league') return null;
    const slot = save.calendar?.[save.calendarIndex];
    if (!slot || slot.stage !== 'knockout') return null;
    const comp = save.competitions?.[slot.compId];
    const ties = comp?.knockout?.[slot.round];
    if (!ties) return null;
    const playingClub=match.playingClub??save.club;
    const tie = ties.find(t => t.home === playingClub || t.away === playingClub);
    if (!tie || !tie.home || !tie.away) return null;
    const isSecond = tie.legs === 2 && slot.leg === 2;
    return { comp, slot, tie, isSecond };
  }

  function needsPenaltyShootout(save, match) {
    const info = findKnockoutTieForMatch(save, match);
    if (!info) return false;
    const { tie, isSecond } = info;
    if (tie.legs === 1) return match.forGoals === match.against;
    if (!isSecond || !tie.firstLeg) return false;
    const secondH = tie.away === save.club ? match.forGoals : match.against;
    const secondA = tie.home === save.club ? match.forGoals : match.against;
    const homeAgg = tie.firstLeg.h + secondA;
    const awayAgg = tie.firstLeg.a + secondH;
    return homeAgg === awayAgg;
  }

  function buildShootoutKickers(save, clubId, includeUser, userSlot, rng) {
    const club = team(clubId);
    const userName = (save.player?.name || 'Camisa 10').trim();
    const raw = (club?.players || [])
      .filter(p => p && p[0] && p[1] !== 'GK' && (!includeUser || p[0].toLowerCase() !== userName.toLowerCase()))
      .map(p => ({ name: p[0], pos: SHOOTOUT_POS_LABELS[p[1]] || p[1] || 'MEI', overall: p[2], isUser: false, isGK: false }));
    // Mistura levemente preservando tendência dos melhores cobradores no início
    const pool = [...raw];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      if (Math.abs(i - j) <= 2) [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const outfieldNeeded = includeUser ? 9 : 10;
    const outfield = [];
    for (const p of pool) {
      if (outfield.length >= outfieldNeeded) break;
      outfield.push(p);
    }
    let fillerIdx = 0;
    while (outfield.length < outfieldNeeded) {
      const [label, pos] = SHOOTOUT_FILLERS[fillerIdx % SHOOTOUT_FILLERS.length];
      outfield.push({ name: `${label} (${club?.abbr || 'CLU'})`, pos, isUser: false, isGK: false });
      fillerIdx++;
    }
    const list = [];
    let oi = 0;
    for (let slot = 0; slot < 10; slot++) {
      if (includeUser && slot === userSlot) {
        list.push({ name: userName, pos: 'ATA', isUser: true, isGK: false });
      } else {
        list.push(outfield[oi++]);
      }
    }
    // 11º cobrador: goleiro (regra IFAB: todos os 11 em campo cobram antes de qualquer jogador repetir)
    list.push({ name: `Goleiro (${club?.abbr || 'GOL'})`, pos: 'GOL', isUser: false, isGK: true });
    return list;
  }

  function createShootout(save, match) {
    if (match.shootout) return match.shootout;
    const info = findKnockoutTieForMatch(save, match);
    const rng = random((match.scenario ?? 1) ^ Math.imul((save.round || 0) + 17, 2654435761) ^ Math.floor(Math.random() * 0x7fffffff));
    const firstSide = rng() < 0.5 ? 'user' : 'opp';
    const userSlot = Math.floor(rng() * 5); // Ordem aleatória entre os 5 primeiros (0..4)
    const userKickers = buildShootoutKickers(save, match.playingClub??save.club, true, userSlot, rng);
    const oppKickers = buildShootoutKickers(save, match.opponent, false, -1, rng);
    let aggText = null;
    if (info && info.tie.legs === 2 && info.tie.firstLeg) {
      const secondH = info.tie.away === save.club ? match.forGoals : match.against;
      const secondA = info.tie.home === save.club ? match.forGoals : match.against;
      const homeAgg = info.tie.firstLeg.h + secondA;
      const awayAgg = info.tie.firstLeg.a + secondH;
      aggText = `Agregado ${awayAgg} × ${homeAgg}`;
    }
    match.shootout = {
      firstSide,
      userSlot,
      userKickers,
      oppKickers,
      userKicks: [],
      oppKicks: [],
      userScore: 0,
      oppScore: 0,
      winner: null,
      suddenDeath: false,
      lastEvent: null,
      aggText,
      isFinal: !!match.isFinal
    };
    return match.shootout;
  }

  function shootoutNextTurn(shootout) {
    if (!shootout || shootout.winner) return null;
    const total = shootout.userKicks.length + shootout.oppKicks.length;
    const side = (total % 2 === 0) ? shootout.firstSide : (shootout.firstSide === 'user' ? 'opp' : 'user');
    const kickIndex = side === 'user' ? shootout.userKicks.length : shootout.oppKicks.length;
    const kickers = side === 'user' ? shootout.userKickers : shootout.oppKickers;
    const kicker = kickers[kickIndex % 11];
    const cycle = Math.floor(kickIndex / 11) + 1;
    const order = kickIndex + 1;
    const suddenDeath = kickIndex >= 5;
    return { side, kickIndex, order, cycle, kicker, isUser: !!kicker?.isUser, suddenDeath };
  }

  function evaluateShootoutWinner(shootout) {
    const uT = shootout.userKicks.length;
    const oT = shootout.oppKicks.length;
    const uS = shootout.userScore;
    const oS = shootout.oppScore;
    if (uT < 5 || oT < 5) {
      const uRem = 5 - uT;
      const oRem = 5 - oT;
      if (uS > oS + oRem) shootout.winner = 'user';
      else if (oS > uS + uRem) shootout.winner = 'opp';
      return shootout.winner;
    }
    if (uT === oT) {
      if (uS > oS) shootout.winner = 'user';
      else if (oS > uS) shootout.winner = 'opp';
      else shootout.suddenDeath = true;
    } else {
      shootout.suddenDeath = true;
    }
    return shootout.winner;
  }

  function recordShootoutKick(match, scored, detail) {
    const so = match?.shootout;
    const turn = shootoutNextTurn(so);
    if (!turn) return null;
    const entry = {
      kicker: turn.kicker.name,
      pos: turn.kicker.pos,
      isUser: turn.isUser,
      cycle: turn.cycle,
      order: turn.order,
      scored: !!scored,
      detail: detail || (scored ? 'Gol!' : 'Perdeu!')
    };
    if (turn.side === 'user') {
      so.userKicks.push(entry);
      if (entry.scored) so.userScore++;
    } else {
      so.oppKicks.push(entry);
      if (entry.scored) so.oppScore++;
    }
    so.lastEvent = { side: turn.side, ...entry };
    evaluateShootoutWinner(so);
    if (so.winner) {
      match.penalties = match.home
        ? { h: so.userScore, a: so.oppScore }
        : { h: so.oppScore, a: so.userScore };
    }
    return { entry, side: turn.side, winner: so.winner };
  }

  // ===== RESTAURAÇÃO E MIGRAÇÃO DE SAVES =====
  function restore(data) {
    if (!data || ![1, 2, 3].includes(data.version) || !data.player || !['trial', 'offers', 'season', 'complete', 'retired'].includes(data.stage) ||
        !Array.isArray(data.offers) || !data.personal) return null;

    const legacy = data.version === 1;
    const mapId = id => legacy ? (legacyMap.get(id) ?? id) : id;
    const club = mapId(data.club);
    if (['season', 'complete', 'retired'].includes(data.stage) && !team(club)) return null;

    data.offers = data.offers.map(mapId).filter(id => !!team(id));
    data.owned = Array.isArray(data.owned) ? [...new Set(data.owned.filter(id => storeById.has(id)))] : [];
    data.unreadItems = Array.isArray(data.unreadItems) ? [...new Set(data.unreadItems.filter(id => data.owned.includes(id)))] : [];
    data.proposals = Array.isArray(data.proposals) ? data.proposals.filter(o => o && team(o.id) && Number.isInteger(o.expires)) : [];
    data.year = Number.isInteger(data.year) ? Math.max(2026, data.year) : 2026;
    data.seasonNumber = Number.isInteger(data.seasonNumber) ? Math.max(1, data.seasonNumber) : Math.max(1, data.year - 2025);
    data.achievements = Array.isArray(data.achievements) ? data.achievements.filter(a => a && team(a.club)) : [];
    data.history = Array.isArray(data.history) ? data.history : [];
    data.balance = Number.isFinite(data.balance) ? Math.max(0, data.balance) : 0;
    data.earned = Number.isFinite(data.earned) ? Math.max(0, data.earned) : 0;
    data.personal = { ...blankStats(), ...data.personal };
    data.club = club;

    if (!data.divisions || !Array.isArray(data.divisions.A)) {
      data.divisions = {
        A: [...defaultDivisions.A],
        B: [...defaultDivisions.B],
        C: [...defaultDivisions.C],
        D: [...defaultDivisions.D]
      };
    }

    // Migração limpa de saves v1/v2 para a estrutura v3 de torneios
    if (data.version < 3 || !data.competitions || !Array.isArray(data.calendar)) {
      data.version = 3;
      data.offerLock = null;
      data.nextQualifications = null;
      if (['season', 'complete'].includes(data.stage) && club) {
        initSeason(data);
        data.stage = 'season';
      } else {
        data.competitions = {};
        data.calendar = [];
        data.calendarIndex = 0;
        data.round = 0;
        data.leagueRound = 0;
        data.rounds = [];
        data.playerStats = {};
      }
    }

    const savedAttributes = data.player.attributes;
    const shootingProgress = Number.isFinite(savedAttributes?.shot) ? savedAttributes.shot-defaultAttributes.shot : 0;
    const ratings = Object.fromEntries(attributeKeys.map(key => {
      const value = savedAttributes?.[key];
      const fallback = defaultAttributes[key]+(key==='freeKick'||key==='penalty'?shootingProgress:0);
      return [key, clamp(Math.round(Number.isFinite(value)?value:fallback), 1, 99)];
    }));
    const inferredAge = clamp(START_AGE + Math.max(0, (data.seasonNumber || 1) - 1), START_AGE, RETIRE_AGE);
    data.player = {
      ...data.player,
      name: String(data.player.name ?? '').slice(0, 22) || 'Camisa 10',
      age: Number.isInteger(data.player.age) ? clamp(data.player.age, START_AGE, RETIRE_AGE) : inferredAge,
      look: availableLook(data, data.player.look),
      attributes: ratings
    };
    if (!data.careerTotals || typeof data.careerTotals !== 'object') {
      data.careerTotals = { seasons: Math.max(0, (data.seasonNumber || 1) - 1), matches: 0, goals: 0, assists: 0, wins: 0, clubs: club ? [club] : [] };
    }
    if (!Array.isArray(data.careerTotals.clubs)) data.careerTotals.clubs = club ? [club] : [];
    if (!data.lastProgression) data.lastProgression = null;
    data.ratingHistory = Array.isArray(data.ratingHistory)
      ? data.ratingHistory.filter(entry => Number.isFinite(entry?.rating)) : [];
    upgradeCalendar(data);
    sanitizeContinentalCompetitions(data);

    for (const match of [data.pending, data.last]) if (match) {
      match.opponent = mapId(match.opponent);
      match.assists = Number.isInteger(match.assists) ? match.assists : 0;
      match.scenario = Number.isInteger(match.scenario) ? match.scenario : ((data.seed ^ Math.imul((match.round ?? 0) + 1, 91871)) >>> 0);
      match.penalty = match.penalty === true;
      match.isClassic = !!match.isClassic;
      match.isFinal = !!match.isFinal;
      const piece = match.setPiece;
      match.setPiece = piece?.kind === 'freeKick' && Number.isFinite(piece.x) && Number.isFinite(piece.z)
        ? {
            kind: 'freeKick',
            x: clamp(piece.x, -footballPlayLimits.side + 0.65, footballPlayLimits.side - 0.65),
            z: clamp(piece.z, Math.abs(piece.x) > 20.16 ? footballPlayLimits.front : 16.55, 31.2)
          }
        : null;
    }

    journey.state(data);
    if(data.worldCup?.callup){
      const national=team('national-'+data.player.nationality);
      if(national)national.players=data.worldCup.callup.roster.filter(player=>!player.user).map(player=>[player.name,player.position,player.overall,player.id]);
    }
    if (data.pending && (!team(data.pending.opponent) || !['trial', 'league','training'].includes(data.pending.kind) ||
        !Number.isInteger(data.pending.chances) || data.pending.chances < 1 || data.pending.chances > 6 ||
        !Number.isInteger(data.pending.used) || data.pending.used < 0 || data.pending.used > data.pending.chances)) {
      data.pending = null;
    }
    if (data.pending && data.pending.used === data.pending.chances) {
      if(data.pending.training){journey.finishDrill(data,data.pending);data.lastTraining=data.pending;data.pending=null;return data;}
      if (data.pending.shootout && !data.pending.shootout.winner) {
        // Mantém pendente para retomar a disputa de pênaltis
      } else if (!data.pending.shootout && needsPenaltyShootout(data, data.pending)) {
        createShootout(data, data.pending);
      } else {
        finishMatch(data, data.pending);
      }
    }
    return data;
  }

  window.goatCareerSeason = {
    clubs, trials, team, appearance, defaultLook, paint, create, selectTrial, contract,joinAcademy,
    startRound, opponent, chance, finishMatch, standings, groupTables, continentalPlaces,
    activeCompetitions, scorers, assisters, restore, totalRounds, leagueOf, divisionOf,
    leagueCompId, salaryFor, nameOf, shop, shopCategories, trainingBoosts, available, purchase, edit, activeProposals,
    offerLockStatus, decide, newSeason, attributes, defaultAttributes, overall,
    agePhase, attributeProgress, xpProgress, awardXp, upgradeAttribute, ATTRIBUTE_POINTS_PER_LEVEL, ensureObjectives, objectiveProgress, START_AGE, RETIRE_AGE, isWorseClub, performanceContext, defensiveProfile,
    COMPETITION_META, isClassic: db.isClassic,
    needsPenaltyShootout, createShootout, shootoutNextTurn, recordShootoutKick,
    ratingAfter, ratingColor, recordRatingEvents, averageRating
  };
})();
