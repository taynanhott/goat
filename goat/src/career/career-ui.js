(() => {
  'use strict';
  const season = window.goatCareerSeason;
  const journey=window.goatCareerJourney;
  const storageKey = 'goat-career-v1';
  const trainingPlayerKey = 'goat-training-player-v1';
  const trainingStatLabel = Object.fromEntries(Object.entries(season.attributes).map(([label,key])=>[key,label]));
  const trainingFeet = ['LeftFoot','RightFoot'];
  const trainingRating = value => Math.max(50,Math.min(99,Math.round(value)));

  function readTrainingPlayer() {
    let stored;
    try { stored=JSON.parse(localStorage.getItem(trainingPlayerKey)); } catch {}
    const attributes=Object.fromEntries(Object.entries(season.defaultAttributes).map(([key,value])=>{
      const savedValue=stored?.attributes?.[key];
      return [key,Number.isFinite(savedValue)?trainingRating(savedValue):value];
    }));
    const S=window.goatStadiums;
    const stadiumId=S?.byId[stored?.stadiumId]?stored.stadiumId:'arena-brasa';
    const careerStadiumId=(stored?.careerStadiumId==='club-auto'||S?.byId[stored?.careerStadiumId])?stored.careerStadiumId:'club-auto';
    return {attributes,dominantFoot:stored?.dominantFoot==='LeftFoot'?'LeftFoot':'RightFoot',stadiumId,careerStadiumId};
  }
  const holdTime = 1600;
  const upgradeHoldTime = 700;
  const firstRepeat = 350;
  const repeatInterval = 130;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  const actions = [
    ['Mover e mirar', 'W A S D / setas', 'Analógico esquerdo'],
    ['Correr', 'Shift', 'RT'],
    ['Chutar', 'X', 'X'],
    ['Cabecear bola alta', 'Um toque em X', 'Um toque em X'],
    ['Chute de primeira sem domínio', 'Segurar X e soltar antes da chegada', 'Segurar X e soltar antes da chegada'],
    ['Chute colocado', 'F + X', 'RB + X'],
    ['Cavadinha', 'E + X', 'LB + X'],
    ['Fake shot', 'Carregar X e apertar Espaço', 'Carregar X e apertar A'],
    ['Puxar com a sola', 'E', 'LB'],
    ['Passe / pedir passe ao portador', 'Espaço', 'A'],
    ['Lançamento rasteiro / pedir lançamento', 'Segurar e soltar Y', 'Segurar e soltar Y'],
    ['Lançamento aéreo', 'E + segurar/soltar Y', 'LB + segurar/soltar Y'],
    ['Cruzamento / pedir cruzamento', 'B', 'B'],
    ['Nova bola no treino', 'T', 'R3'],
    ['Replay no treino', 'V', 'L3'],
    ['Trocar câmera', 'C', 'View'],
    ['Mirar na bola parada', 'A / D ou ← / →', 'Analógico esquerdo'],
    ['Pausar', 'Esc / P', 'Menu'],
    ['Navegar nos menus', 'Tab / Shift + Tab', 'Direcional / analógico esquerdo'],
    ['Abas principais da carreira', 'Tab / Enter', 'LB / RB'],
    ['Submenus da carreira', 'Tab / Enter', 'LT / RT'],
    ['Confirmar / voltar no menu', 'Enter / Esc', 'A / B'],
    ['Girar jogador no editor', '← / →', 'LB / RB'],
    ['Ajustar Jogador do Treino', '↑ / ↓ selecionar · ← / → alterar', '↑ / ↓ selecionar · ← / → alterar']
  ];

  const newsAuthors = [
    ['Marcelo Bechler','MB','#565a91','#e4ad88','#342427','glasses'],
    ['Bruno Formiga','BF','#a65837','#b77c55','#292124','beard'],
    ['Craque Neto','CN','#246952','#ce966e','#4d3843','cap'],
    ['Cazé','CZ','#66528d','#d5a786','#302123','beard glasses'],
    ['Fred Caldeira','FC','#295d82','#d7a480','#412d2a','beard'],
    ['Pilhado','PI','#943833','#c69171','#36252b','cap beard'],
    ['CazéTV','CTV','#425587'],
    ['Rede Globo','RG','#464273'],
    ['TNT Sports','TNT','#83353c']
  ];

  function newsAvatar(author) {
    const [name,initials,color,skin,hair,details='']=author;
    return skin
      ? `<span class="news-avatar news-portrait ${details}" aria-hidden="true" style="--avatar-bg:${color};--avatar-skin:${skin};--avatar-hair:${hair}"><i><b></b></i><small>${initials}</small></span>`
      : `<span class="news-avatar news-network" aria-hidden="true" style="--avatar-bg:${color}" title="${name}">${initials}</span>`;
  }

  function keyboard() {
    const usage={
      move:['W','A','S','D','↑','←','↓','→','Shift'],
      shot:['X','F','E','Y','B','Espaço'],
      train:['T','V','C'],
      menu:['Esc','P','Tab','Enter','Espaço']
    };
    const rows=[
      ['Esc',2,'F1','F2','F3','F4',2,'F5','F6','F7','F8',2,'F9','F10','F11','F12'],
      ["'","1","2","3","4","5","6","7","8","9","0","-","=",'Backspace:8'],
      ['Tab:6','Q','W','E','R','T','Y','U','I','O','P','´','[','Enter:6'],
      ['Caps:7','A','S','D','F','G','H','J','K','L','Ç','~',']','Enter:5'],
      ['Shift:5','\\','Z','X','C','V','B','N','M',',','.',';','/','Shift:7'],
      ['Ctrl:5','Win:5','Alt:5','Espaço:26','AltGr:5','Win:4','Menu:5','Ctrl:5']
    ];
    const navigation=[
      ['PrtSc','ScrLk','Pause'],['Insert','Home','PgUp'],['Delete','End','PgDn'],
      [4,4,4],[4,'↑',4],['←','↓','→']
    ];
    const numpad=[
      ['Num',2,1],['/',2,2],['*',2,3],['−',2,4],
      ['7',3,1],['8',3,2],['9',3,3],['+',3,4,2],
      ['4',4,1],['5',4,2],['6',4,3],
      ['1',5,1],['2',5,2],['3',5,3],['↵',5,4,2],
      ['0',6,1,1,2],[',',6,3]
    ];
    const row=keys=>keys.map(key=>{
      if(typeof key==='number')return `<kbd class="key-spacer" style="--key-width:${key}"></kbd>`;
      const [label,width=4]=key.split(':');
      const group=Object.keys(usage).find(category=>usage[category].includes(label));
      return `<kbd class="${group?'key-'+group:''}" style="--key-width:${width}">${esc(label)}</kbd>`;
    }).join('');
    const block=keys=>keys.map(line=>`<div class="key-row">${row(line)}</div>`).join('');
    return `<div class="key-diagram" role="img" aria-label="Teclado completo com as teclas usadas no jogo em destaque">
      <div class="key-legend"><span class="key-move">Movimento</span><span class="key-shot">Bola</span><span class="key-train">Treino e câmera</span><span class="key-menu">Menus e pausa</span></div>
      <div class="keyboard-board">
        <div class="key-block">${block(rows)}</div><div class="key-block">${block(navigation)}</div>
        <div class="key-block key-numpad">${numpad.map(([label,line,column,height=1,width=1])=>
          `<kbd style="grid-row:${line} / span ${height};grid-column:${column} / span ${width}">${esc(label)}</kbd>`).join('')}</div>
      </div>
    </div>`;
  }

  function xbox() {
    return `<svg class="pad-diagram" viewBox="9 4 500 239" role="img" aria-label="Controle Xbox com indicações de movimento, corrida, chute, reinício do treino, puxada e pausa">
      <path class="pad-shell" d="M161 63 Q180 41 213 51 L307 51 Q340 41 359 63 Q390 103 406 184 Q413 221 386 232 Q365 241 337 208 L317 183 H203 L183 208 Q155 241 134 232 Q107 221 114 184 Q130 103 161 63Z"/>
      <path class="pad-shoulder" d="M157 64 Q154 32 185 32 H207 L213 51 M363 64 Q366 32 335 32 H313 L307 51 M158 65 H208 M312 65 H362"/>
      <circle class="pad-stick" cx="181" cy="111" r="24"/><circle class="pad-stick" cx="181" cy="111" r="15"/>
      <circle class="pad-stick" cx="292" cy="146" r="24"/><circle class="pad-stick" cx="292" cy="146" r="15"/>
      <path class="pad-stick" d="M214 132 H225 V120 H237 V132 H249 V144 H237 V156 H225 V144 H214 Z"/>
      <rect class="pad-stick" x="230" y="84" width="17" height="11" rx="4"/><rect class="pad-stick" x="272" y="84" width="17" height="11" rx="4"/>
      <circle class="pad-button pad-y" cx="337" cy="87" r="13"/><circle class="pad-button pad-x" cx="314" cy="110" r="13"/>
      <circle class="pad-button pad-b" cx="360" cy="110" r="13"/><circle class="pad-button pad-a" cx="337" cy="133" r="13"/>
      <g class="pad-letters"><text x="337" y="91">Y</text><text x="314" y="114">X</text><text x="360" y="114">B</text><text x="337" y="137">A</text></g>
      <g class="pad-lines"><path d="M176 45 L97 38 H19 M181 111 H104 L89 97 H19 M237 89 L104 158 H19 M330 44 L405 29 H500 M350 64 L410 56 H500 M314 110 L419 148 H500 M360 110 H500 M280 90 L407 190 H500"/></g>
      <g class="pad-labels"><text x="18" y="28">LB · Puxar</text><text x="18" y="88">Mover / mirar</text><text x="18" y="150">View · Câmera</text>
      <text x="500" y="19" text-anchor="end">RT · Correr</text><text x="500" y="47" text-anchor="end">RB + X · Colocado</text><text x="500" y="100" text-anchor="end">B · Cruzamento</text><text x="500" y="138" text-anchor="end">X · Chutar</text><text x="500" y="181" text-anchor="end">Menu · Pausa</text></g>
    </svg>`;
  }

  function controlPanel() {
    const middle=Math.ceil(actions.length/2);
    const table=rows=>`<table class="career-table control-table"><thead><tr><th>Ação</th><th>Teclado</th><th>Xbox</th></tr></thead>
      <tbody>${rows.map(row=>`<tr>${row.map(value=>`<td>${esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    return `<div class="input-panels"><article><h3>Teclado</h3>${keyboard()}</article><article><h3>Controle Xbox</h3>${xbox()}</article></div>
      <div class="controls-tables">${table(actions.slice(0,middle))}${table(actions.slice(middle))}</div>
      <p class="controls-note">No fake shot, aponte a direção do corte enquanto carrega o chute. Para chutar de primeira um passe ou uma bola solta, carregue X antes da chegada e solte para preparar a finalização com a força escolhida. Se ainda estiver segurando X ao receber, o jogador domina e continua correndo com a força carregada. Na carreira, cada oportunidade dura 10 segundos.</p>`;
  }

  const button = (action, text, extra = '') => `<button type="button" data-action="${action}" class="career-button${extra ? ' '+extra : ''}">${text}</button>`;
  const money = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
  const cash = amount => money.format(amount);
  const swatch = club => `<span class="team-swatch" aria-hidden="true" style="--team-a:${club.primary};--team-b:${club.secondary}"></span>`;
  const medal = (club, size = 40) => window.goatClubBadge
    ? window.goatClubBadge.render(club, size)
    : `<span class="team-emblem" aria-hidden="true" style="--team-a:${club.primary};--team-b:${club.secondary}">${club.name.split(' ').filter(s=>s.length>2).slice(0,2).map(s=>s[0].toUpperCase()).join('')}</span>`;

  function teamCards(list, action, note) {
    return `<div class="team-cards">${list.map(club => `<button type="button" class="team-card" data-action="${action}" data-team="${club.id}">
      ${medal(club)}<strong>${club.name}</strong><span>${note}</span>${swatch(club)}</button>`).join('')}</div>`;
  }

  const hairShapes = [
    'M12 20 13 12 19 7 30 5 37 3 36 8 42 7 41 15 36 19 29 15 21 16 17 23Z',
    'M12 18 13 13 18 8 25 6 32 6 39 10 42 16 41 20 36 14 29 12 21 13 16 19Z',
    'M12 19 13 13 17 8 23 5 32 5 39 8 43 16 42 20 37 15 33 14 28 11 20 14 16 20Z',
    'M11 20 11 15 13 11 17 9 18 5 23 6 27 3 31 6 36 5 39 8 43 10 42 14 44 17 42 21 37 18 34 14 30 16 26 13 22 16 18 15 15 23Z',
    'M12 19 15 12 22 7 35 7 41 12 42 18 37 16 26 12 17 17Z',
    'M12 19 14 12 22 6 37 7 42 13 42 20 37 16 34 13 23 12 17 17Z',
    'M11 20 12 14 16 12 18 8 24 7 29 4 34 7 40 8 43 14 43 21 37 16 32 17 27 13 21 16 16 16Z'
  ];
  const beardShapes = [
    '',
    'M15 27 19 30 24 30 27 28 31 29 35 29 40 25 39 34 34 40 24 42 17 37Z',
    'M21 29 27 27 34 28 36 30 33 31 29 30 24 31ZM23 34 27 36 33 35 35 33 34 39 29 42 24 39Z',
    'M13 22 18 26 21 29 25 28 27 27 34 28 37 27 40 22 41 30 37 38 30 43 22 42 16 36Z',
    'M13 23 18 28 22 30 27 28 34 28 40 23 40 31 37 39 30 47 24 46 17 39 14 32Z',
    'M14 24 18 28 23 33 31 35 37 30 40 24 40 31 35 38 29 41 22 39 17 34Z'
  ];

  function thumbnail(key, index, value) {
    if(key==='dominantFoot')return '<span class="foot-choice">'+(index===1?'E':'D')+'</span>';
    if (key === 'boots') {
      return `<svg viewBox="0 0 54 48" aria-hidden="true">
        <path fill="${value}" d="M14 14H26L31 25L43 27L48 30L48 35L42 39H7L5 34L12 27Z"/>
        <path fill="#504356" d="M5 34L12 35L38 35L48 32L48 36L43 39H8Z"/>
        <path fill="none" stroke="#f4ddac" d="M18 21L27 20M21 25L30 24M24 29L33 27"/>
        <path fill="#201923" d="M10 39H15V42H10ZM23 39H27V42H23ZM37 38H42V41H37Z"/>
      </svg>`;
    }
    if (key === 'socks') {
      const top = [13,22,4][index];
      return `<svg viewBox="0 0 54 48" aria-hidden="true">
        <path fill="#bb815d" d="M19 8H34L32 34H18Z"/>
        <path fill="#f0d6a0" d="M19 ${top}H34L32 33L42 37L42 41L37 43H18L17 39Z"/>
        <path stroke="#aa4737" fill="none" d="M20 ${top+4}H32"/>
      </svg>`;
    }
    if (key === 'shorts') {
      const hem = index === 0 ? 30 : 41;
      return `<svg viewBox="0 0 54 48" aria-hidden="true"><path fill="#39364c" d="M15 10H39L44 ${hem}H30L27 ${hem-8}L24 ${hem}H10Z"/><path fill="none" stroke="#deaa65" d="M15 14H39M15 16L12 ${hem-2}M39 16L42 ${hem-2}"/></svg>`;
    }
    if (key === 'shirt' || key === 'sleeves') {
      const hem = key === 'shirt' && index === 1 ? 29 : 36;
      const arms = key === 'sleeves' && index === 1
        ? `L47 15L52 37L44 40L38 23L38 ${hem}H16L16 23L10 40L2 37L7 15`
        : `L47 15L43 24L38 22L38 ${hem}H16L16 22L11 24L7 15`;
      return `<svg viewBox="0 0 54 48" aria-hidden="true">
        <path fill="#39364c" d="M16 26H38L41 43H30L27 38L24 43H13Z"/>
        <path fill="#ded0a6" d="M19 8H24L27 11L30 8H35${arms}Z"/>
        <path fill="#bf4931" d="M28 12H34L25 ${hem}H19Z"/>
      </svg>`;
    }
    const skin = key === 'skin' ? value : 'var(--preview-skin)';
    const hair = key === 'hairColor' ? value : 'var(--preview-hair)';
    const beard = key === 'beardColor' ? value : 'var(--preview-beard)';
    const hairStyle = key === 'hair' ? index : 2;
    const beardStyle = key === 'beard' ? index : key === 'beardColor' ? 3 : 0;
    return `<svg viewBox="0 0 54 48" aria-hidden="true">
      <path fill="#794339" d="M21 33H33L35 40L45 46H9L19 40Z"/>
      <path fill="${skin}" d="M14 13L19 8L25 6L33 7L39 11L43 18L40 31L36 37L31 42L23 41L17 36L13 27L12 20Z"/>
      <path fill="#38212a" fill-opacity=".24" stroke="none" d="M34 8L39 11L43 18L40 31L36 37L31 42L27 41L35 30L37 19Z"/>
      <path fill="${hair}" opacity="${hairStyle===1?.62:1}" d="${hairShapes[hairStyle]}"/>
      ${beardStyle?`<path fill="${beard}" opacity="${beardStyle===1?.52:1}" d="${beardShapes[beardStyle]}"/>`:''}
      <path fill="none" stroke="#38232b" stroke-width="1.35" d="M18 22L23 21M30 21L36 21M26 22L24 28H28M23 33L30 33L33 32"/>
    </svg>`;
  }

  function createGoatCareer(api) {
    const menu = document.querySelector('#start');
    const panel = document.querySelector('#careerScreen');
    const content = document.querySelector('#careerContent');
    const warning = document.querySelector('#careerWarning');
    const pauseMenu = document.querySelector('#paused');
    const stadiumDialog = document.querySelector('#trainingStadiumDialog');
    let careerPractice = false;
    let stadiumTrigger = null;
    let trainingStepTimer = null;
    let trainingStepPointer = null;
    let save = null, look = null, creatorName = '', screen = 'home', hubTab = 'games', playerTab = 'profile',
      selectedCompId = null, compPhase = 'table', selectedGroup = 'ALL', selectedKoRound = null,
      gamesStatTab = 'goals', newsTab = 'all', editing = false;
    let orbitAngle = 0, orbitDirection = 0, orbitHeldAt = 0, orbitLast = 0;
    let orbitHold = null, orbitPaint = null, creatorStage = null, creatorFrame = null;
    let hold = 0, holdButton = null, storageError = '';
    let nav = { confirm: false, back: false, x: 0, y: 0, repeatAt: 0, shoulders: [] };
    let focusedOption = null;
    let practiceTab='challenges',originLeague='B',callupTimer=null;
    const trainingPlayer=readTrainingPlayer();
    const carouselObserver = new ResizeObserver(entries => entries.forEach(({target}) => layoutCarousel(target)));
    const stageObserver = new ResizeObserver(updateCreatorFrame);
    const alertObserver = new IntersectionObserver(viewedAlerts,{threshold:.65});

    function badge(visible) {
      return '<i class="notification-dot" aria-hidden="true"'+(visible?'':' hidden')+'></i>';
    }

    function playerAlerts(proposals=season.activeProposals(save)) {
      const xp=season.xpProgress(save);
      const profile=xp.attributePoints>0&&Object.values(season.attributes).some(key=>(save.player.attributes[key]??0)<99);
      const shop=save.unreadItems.length>0, market=proposals.some(offer=>offer.seen!==true);
      return {profile,shop,market,player:profile||shop||market};
    }

    function updateAlerts() {
      const {player,profile,shop,market}=playerAlerts();
      for(const [action,unread] of [['tab-player',player],['player-profile',profile],['player-shop',shop],['player-market',market]]){
        const button=content.querySelector('[data-action="'+action+'"]');
        if(!button)continue;
        button.querySelector('.notification-dot').hidden=!unread;
        if(unread)button.setAttribute('aria-label',button.textContent.trim()+', novidades');
        else button.removeAttribute('aria-label');
      }
      persist();
    }

    function markShopItemSeen(id) {
      const index=save.unreadItems.indexOf(id);
      if(index<0)return false;
      save.unreadItems.splice(index,1);
      const card=content.querySelector('[data-item="'+id+'"]');
      if(card){
        card.querySelector('.notification-dot').hidden=true;
        delete card.dataset.unread;
        alertObserver.unobserve(card);
      }
      return true;
    }

    function viewedAlerts(entries) {
      if(screen!=='hub'||hubTab!=='player'||!['market','shop'].includes(playerTab))return;
      let changed=false;
      for(const {target,intersectionRatio} of entries){
        if(intersectionRatio<.65||!target.isConnected||!target.dataset.unread)continue;
        if(playerTab==='shop'){
          if(markShopItemSeen(target.dataset.item))changed=true;
          continue;
        }
        const offer=save.proposals.find(entry=>entry.id===target.dataset.offer);
        if(!offer||offer.seen===true)continue;
        offer.seen=true;
        delete target.dataset.unread;
        target.querySelector('.notification-dot').hidden=true;
        alertObserver.unobserve(target);
        changed=true;
      }
      if(changed)updateAlerts();
    }
    window.addEventListener('resize',updateCreatorFrame);
    panel.addEventListener('scroll',updateCreatorFrame,{passive:true});

    function updateCreatorFrame() {
      if(!creatorStage)return;
      creatorFrame={stage:creatorStage.getBoundingClientRect(),controls:creatorStage.firstElementChild.getBoundingClientRect()};
    }

    function revealThumbnail(button) {
      if(!button)return;
      const track=button.parentElement,left=button.offsetLeft,right=left+button.offsetWidth;
      if(left<track.scrollLeft-1||right>track.scrollLeft+track.clientWidth+1)track.scrollLeft=left;
    }

    function layoutCarousel(track) {
      const width=track.clientWidth;
      if(width){
        const styles=getComputedStyle(track),gap=parseFloat(styles.columnGap),minimum=parseFloat(styles.getPropertyValue('--look-tile-min'));
        const visible=Math.max(1,Math.floor((width+gap)/(minimum+gap)));
        track.style.setProperty('--look-tile-width',((width+gap)/visible-gap)+'px');
        revealThumbnail(track.querySelector(':focus')??track.querySelector('[aria-pressed="true"]'));
      }
      syncCarousel(track);
    }

    function syncCarousel(track) {
      const max = track.scrollWidth - track.clientWidth;
      track.previousElementSibling.disabled = track.scrollLeft <= 1;
      track.nextElementSibling.disabled = track.scrollLeft >= max - 1;
    }
    let reviewClips=null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        save = season.restore(JSON.parse(raw));
        if (!save) storageError = 'O arquivo de carreira não pôde ser carregado.';
      }
    } catch {
      storageError = 'O salvamento está indisponível neste navegador.';
    }

    function notify() {
      warning.hidden = !storageError;
      warning.textContent = storageError;
    }

    function persist() {
      try {
        if (save) localStorage.setItem(storageKey, JSON.stringify(save));
        else localStorage.removeItem(storageKey);
        storageError = '';
        return true;
      } catch {
        storageError = 'O progresso só ficará disponível enquanto esta página estiver aberta.';
        return false;
      } finally {
        notify();
      }
    }

    function endHold() {
      if (hold) clearTimeout(hold);
      hold = 0;
      holdButton?.classList.remove('is-holding');
      holdButton = null;
    }

    function beginHold(el) {
      if (hold || !save || el.disabled) return;
      const {action,team,item,attr} = el.dataset;
      const inPlayer=screen==='hub'&&hubTab==='player';
      const allowed=['origin-club','origin-trial'].includes(action)?screen==='origin':action==='training-challenge'?screen==='hub'&&hubTab==='practice'&&practiceTab==='challenges':action==='delete'?screen==='gateway':action==='buy'?inPlayer&&playerTab==='shop':
        action==='upgrade-attribute'?inPlayer&&playerTab==='profile':
        inPlayer&&playerTab==='market'&&['accept-offer','refuse-offer'].includes(action);
      if(!allowed||el.dataset.hold!=='true')return;
      holdButton = el;
      el.classList.add('is-holding');
      hold = setTimeout(() => {
        endHold();
        if(action==='upgrade-attribute'){
          if(season.upgradeAttribute(save,attr)){
            const prevScroll=content.querySelector('.hub-content')?.scrollTop??0;
            persist();
            hub();
            const scroller=content.querySelector('.hub-content');
            if(scroller)scroller.scrollTop=prevScroll;
            const nextEl=content.querySelector(`[data-action="upgrade-attribute"][data-attr="${attr}"]`)??content.querySelector(`[data-attr="${attr}"]`);
            if(nextEl){
              nextEl.classList.add('is-just-upgraded');
              if(nextEl.matches('button'))focusOption(nextEl,{preventScroll:true});
            }
          }
          return;
        }
        if(['training-challenge','origin-club','origin-trial'].includes(action)){dispatch(action,el,true);return;}
        if(action==='buy'){
          if(season.purchase(save,item))equipItem(item,true);
          return;
        }
        if(action!=='delete'){
          if(season.decide(save,team,action==='accept-offer')){
            if(action==='accept-offer'){ hubTab='games'; selectedCompId=null; }
            persist();hub();
          }
          return;
        }
        try {
          localStorage.removeItem(storageKey);
          save = null;
          storageError = '';
        } catch {
          storageError = 'Não foi possível excluir a carreira.';
        }
        gateway();
      }, action === 'upgrade-attribute' ? upgradeHoldTime : holdTime);
    }

    function showFocus(element) {
      if (element === focusedOption) return;
      focusedOption?.classList.remove('is-menu-focused');
      focusedOption = element;
      focusedOption?.classList.add('is-menu-focused');
    }

    function focusOption(element, options) {
      if (!element) return;
      element.focus(options);
      showFocus(element);
    }

    function activate(page, title, body, back = 'home') {
      if(callupTimer){clearInterval(callupTimer);callupTimer=null;}
      stopTrainingStep();
      endHold();
      carouselObserver.disconnect();
      stageObserver.disconnect();
      alertObserver.disconnect();
      creatorStage=creatorFrame=null;
      stopOrbitHold();
      showFocus(null);
      screen = page;
      document.body.dataset.screen = page;
      menu.hidden = page !== 'home';
      panel.hidden = page === 'home' || page === 'game' || page === 'review';
      document.querySelector('#controls').hidden = true;
      if (!panel.hidden) {
        content.innerHTML = `<div class="career-top">${button(back,'← Voltar','quiet')}<h2 id="careerTitle">${title}</h2></div>${body}`;
        panel.scrollTop = 0;
        const selector = page==='training-player'?'[data-training-stat]':page === 'creator' ? (editing?'[data-look-panel]:not([hidden]) [data-look]':'#athleteName') : page==='result'?'[data-action="close-result"]':'button:not(.quiet)';
        focusOption(content.querySelector(selector) ?? content.querySelector('button'),{preventScroll:true});
      }
      notify();
    }

    function home() {
      activate('home');
      api.preview(null);
      focusOption(menu.querySelector('button:not(:disabled)'),{preventScroll:true});
    }

    function gateway() {
      api.preview(null);
      const statusText = save
        ? save.stage === 'retired'
          ? `Aposentado aos ${save.player.age} anos · ${save.careerTotals?.goals ?? 0} gols na carreira`
          : save.club
            ? `${esc(season.team(save.club).name)} · ${save.player.age} anos · ${save.year} · ${save.leagueRound ?? save.round} de ${season.totalRounds} rodadas`
            : 'Seletiva'
        : '';
      activate('gateway', 'Carreira', save
        ? `<div class="save-card"><strong>${esc(save.player.name)}</strong><p>${statusText}</p>
           ${button('load',save.stage==='retired'?'Ver resumo da carreira':'Carregar carreira','accent')}<button type="button" class="career-button delete-button" data-action="delete" data-hold="true" aria-describedby="deleteNote">Excluir carreira</button>
           <small id="deleteNote">Segure o botão para excluir</small></div>`
        : `<div class="save-card">${button('create','Iniciar nova carreira','accent')}</div>`);
    }

    function creator(edit = false) {
      editing = edit;
      look = { ...(edit ? save.player.look : season.defaultLook) };
      creatorName = edit ? save.player.name : '';
      orbitAngle = orbitDirection = 0;
      const field = key => {
        const group = season.appearance[key];
        const labels = group.names ?? group.values;
        const choices = group.values.flatMap((value,i) => season.available(edit?save:null,key,i)?[`<button type="button" class="look-thumbnail"
          data-look="${key}" data-index="${i}" aria-label="${labels[i]}" title="${labels[i]}" aria-pressed="${look[key]===i}">${thumbnail(key,i,value)}</button>`]:[]);
        return `<fieldset class="look-group"><legend>${group.label}</legend><span class="look-selection" data-selection="${key}">${labels[look[key]]}</span>
          <div class="look-carousel"><button type="button" class="look-arrow" data-slide="-1" aria-label="Itens anteriores de ${group.label}" disabled>‹</button>
            <div class="look-thumbnails">${choices.join('')}</div><button type="button" class="look-arrow" data-slide="1" aria-label="Mais itens de ${group.label}" disabled>›</button>
          </div></fieldset>`;
      };
      const sections = [
        ['appearance','Aparência',['hair','hairColor','skin','beard','beardColor']],
        ['equipment','Equipamento',['dominantFoot','boots','socks','shorts','sleeves','shirt']]
      ];
      const sectionButtons = sections.map(([id,label],index)=>`<button type="button" class="career-button" data-look-section="${id}"
        id="creator-tab-${id}" role="tab" aria-selected="${index===0}" aria-controls="creator-${id}" aria-pressed="${index===0}">${label}</button>`).join('');
      const fields = sections.map(([id,,keys],index)=>`<div id="creator-${id}" class="creator-fields" role="tabpanel" aria-labelledby="creator-tab-${id}" data-look-panel="${id}"${index?' hidden':''}>${keys.map(field).join('')}</div>`).join('');
      activate('creator',edit?'Editar jogador':'Criação do jogador', `<div class="creator-layout"><div class="creator-form">
        <label class="look-field">Nome do jogador<input id="athleteName" maxlength="22" value="${esc(creatorName)}" placeholder="Camisa 10" autocomplete="off"></label>
        <div class="creator-sections" role="tablist" aria-label="Personalização">${sectionButtons}</div>
        <div class="creator-fields-area">${fields}</div>
        <p class="creator-help">LT / RT: trocar categoria <span>LB / RB ou arrastar: girar jogador</span></p>
        <div class="creator-commit">${button('save-look',edit?'Salvar aparência':'Concluir criação','accent')}</div></div>
        <div class="creator-stage"><div class="orbit-control" role="group" aria-label="Girar jogador">
          <button type="button" class="career-button" data-orbit="-1" aria-label="Girar para a esquerda" data-keyboard="←" data-gamepad="LB">←</button>
          <button type="button" class="career-button" data-orbit="1" aria-label="Girar para a direita" data-keyboard="→" data-gamepad="RB">→</button>
        </div></div></div>`, edit?'tab-player':'career');
      creatorStage=content.querySelector('.creator-stage');
      updateCreatorFrame();
      stageObserver.observe(creatorStage);
      for(const track of content.querySelectorAll('.look-thumbnails')){
        layoutCarousel(track);
        carouselObserver.observe(track);
      }
      api.updateInputLabels();
      refreshLook();
    }

    function careerOrigin(){
      const categories=[['A','Série A'],['B','Série B'],['C','Série C'],['D','Série D'],...journey.leagues.map(league=>[league.code,league.name])];
      const available=season.clubs.filter(club=>club.league===originLeague);
      activate('origin','O começo da carreira',`<div class="origin-layout">
        <div class="origin-settings">
        <section class="origin-trial"><div><h3>Disputar uma peneira</h3><p>Faça a seletiva e receba propostas da Série B.</p></div><button type="button" class="career-button accent hold-action" data-action="origin-trial" data-hold="true">Segure para entrar na peneira</button></section></div>
        <div class="origin-heading"><div><h3>Subir da base</h3><p>Escolha uma liga e o clube que você vai defender.</p></div><span>${available.length} clubes</span></div>
        <div class="origin-picker"><nav class="origin-leagues" aria-label="Ligas">${categories.map(([id,label])=>`<button type="button" data-action="origin-league" data-league="${id}" aria-pressed="${originLeague===id}">${label}</button>`).join('')}</nav>
        <div class="origin-clubs" role="group" aria-label="Clubes da liga selecionada">${available.map(club=>`<button type="button" class="origin-club hold-action" data-hold="true" data-action="origin-club" data-team="${club.id}" style="--team-a:${club.primary};--team-b:${club.secondary}"><span class="origin-crest" aria-hidden="true">${medal(club,54)}</span><strong>${esc(club.name)}</strong><span class="origin-club-arrow" aria-hidden="true">→</span></button>`).join('')}</div></div>
        <p class="origin-help">Segure sobre o clube para iniciar sua carreira no elenco profissional.</p></div>`,'career');
      api.preview(null);
    }

    function callupScreen(){
      const callup=save.worldCup.callup;
      const nation=season.team('national-'+callup.nationality);
      activate('callup',`Convocação · ${nation?.name??callup.nationality}`,`<div class="callup-header">${medal(nation,60)}<div><strong>Copa do Mundo ${save.year}</strong><p>Os 26 nomes para representar a seleção</p></div><b id="callupCount">0/26</b></div>
        <div id="callupList" class="callup-list" aria-live="polite"></div><div id="callupDecision" class="callup-decision" hidden></div>
        <button type="button" class="career-button accent" data-action="callup-complete" disabled>Continuar</button>`,'career');
      api.preview(null);
      let index=0;
      callupTimer=setInterval(()=>{
        if(screen!=='callup'){clearInterval(callupTimer);callupTimer=null;return;}
        const player=callup.roster[index];
        if(player){
          const list=content.querySelector('#callupList');
          const section=position=>position==='GK'?'Goleiros':['CB','LB','RB'].includes(position)?'Defensores':journey.groupOf(position)==='MID'?'Meias':'Atacantes';
          if(index===0||section(callup.roster[index-1].position)!==section(player.position)){
            const heading=document.createElement('h3');heading.className='callup-position';heading.textContent=section(player.position);list.append(heading);
          }
          const positionLabel={GK:'GOL',CB:'ZAG',LB:'LE',RB:'LD',DM:'VOL',CM:'MC',AM:'MEI',LW:'PE',RW:'PD',ST:'ATA'}[player.position]??player.position;
          const row=document.createElement('div');
          row.className='callup-row'+(player.user?' is-user':'');
          row.innerHTML=`<span>${index+1}</span><small>${esc(positionLabel)}</small><strong>${esc(player.name)}</strong><b>${player.user?'VOCÊ':player.generated?'GERADO':player.overall}</b>`;
          list.append(row);list.scrollTop=list.scrollHeight;
          index++;content.querySelector('#callupCount').textContent=`${index}/26`;
        }
        if(index===callup.roster.length){
          clearInterval(callupTimer);callupTimer=null;
          const decision=content.querySelector('#callupDecision');decision.hidden=false;
          decision.textContent=(callup.selected?'VOCÊ FOI CONVOCADO! ':'Você não foi convocado. ')+callup.reason;
          const continueButton=content.querySelector('[data-action="callup-complete"]');
          continueButton.disabled=false;focusOption(continueButton);
        }
      },420);
    }

    function trainingChallenges(){
      const drills=journey.availableDrills(save);
      if(!drills.length)return emptyRecords('Nenhum treino disponível','Conclua uma partida oficial para liberar novos desafios de treino.');
      return `<div class="training-challenges">${drills.map(drill=>`<article><h3>${journey.drillNames[drill.type]}</h3><p>${drill.type==='collective'?`${drill.attempts} lances com defensores. Sua nota define o resultado.`:`${drill.attempts} tentativas. Acerte todas para a pontuação máxima.${drill.type==='freeKick'?' Com barreira.':' Sem defensores.'}`}</p>
          ${drill.status==='complete'?`<strong>Concluído · ${drill.delta>0?'+':''}${drill.delta} pontos</strong>`:
            `<button type="button" class="career-button accent hold-action" data-hold="true" data-action="training-challenge" data-drill="${drill.id}" ${save.pending?'disabled':''}>${drill.status==='playing'?'Em andamento':'Segure para iniciar'}</button>`}</article>`).join('')}</div>
        `;
    }

    function summary(match) {
      if (!match) return '';
      return `<div class="last-result"><span>Último jogo</span><strong>${match.forGoals} × ${match.against}</strong><span>${esc(season.team(match.opponent).name)}</span></div>`;
    }

    function attributeMeter(label,value){
      return `<meter min="0" max="99" value="${value}" aria-label="${label}"></meter>`;
    }

    function ratingPanel(attributes,editable=false,age=null,prog=null,seasonProgress=null,average=null,xp=null) {
      const availablePoints=!editable&&xp?Math.max(0,xp.attributePoints||0):0;
      const ratings=Object.entries(season.attributes).map(([label,key])=>{
        if(editable)return editableRating(key,label,attributes[key],attributes[key]);
        const d=prog?.deltas?.[key]??0;
        const deltaHtml=d?`<small class="stat-delta ${d>0?'is-up':'is-down'}">${d>0?'+':''}${d}</small>`:'';
        if(availablePoints>0&&attributes[key]<99){
          return `<button type="button" class="rating is-upgradable hold-action" data-action="upgrade-attribute" data-attr="${key}" data-hold="true" aria-label="Evoluir ${label} de ${attributes[key]} para ${attributes[key]+1}. Segure para confirmar">
            <span>${label}</span><strong class="rating-value">${attributes[key]}${deltaHtml}<small class="rating-upgrade-hint">Segure +1</small></strong>${attributeMeter(label,attributes[key])}</button>`;
        }
        const maxed=availablePoints>0&&attributes[key]>=99;
        return `<div class="rating${maxed?' is-maxed':''}" data-attr="${key}"><span>${label}</span><strong class="rating-value">${attributes[key]}${deltaHtml}${maxed?'<small class="rating-max-badge">MÁX</small>':''}</strong>${attributeMeter(label,attributes[key])}</div>`;
      }).join('');
      const ageBadge=age!=null?`<span class="player-age-badge">${age} anos · ${season.agePhase(age)}</span>`:'';
      const percent=seasonProgress==null?null:Math.floor(seasonProgress*100);
      const progressLabel='Evolução';
      const progressHint=`Ganhe XP por partidas e objetivos. Ao completar 100%, você ganha ${season.ATTRIBUTE_POINTS_PER_LEVEL} pontos de atributo acumulativos.`;
      const progressBar=percent==null?'':`<div class="player-evolution" style="--progress-color:hsl(${Math.round(percent*1.2)} 56% 55%)" title="${progressHint}">
        <span>${progressLabel}</span><progress max="100" value="${percent}" aria-label="${progressLabel} · ${progressHint}"></progress>
        <strong>${xp?`${xp.points}/${xp.required} XP`:`${percent}%`}</strong></div>`;
      const averageStyle=average==null?'':` style="--rating-bg:${season.ratingColor(Number(average.toFixed(1)))}"`;
      const averageBadge=seasonProgress==null?'':`<div class="player-average-rating${average==null?'':' has-rating'}"${averageStyle} title="Média das partidas avaliadas nesta temporada">
        <span>Nota média</span><strong>${average==null?'—':average.toFixed(1).replace('.',',')}</strong></div>`;
      const anyUpgradable=Object.values(season.attributes).some(key=>attributes[key]<99);
      const pointsBanner=availablePoints>0?`<div class="attribute-points-banner" role="status"><strong>+${availablePoints} ${availablePoints===1?'ponto':'pontos'} de atributo</strong><span>${anyUpgradable?'Segure o atributo que quiser para evoluir (+1)':'Todos os atributos estão no máximo (99)'}</span></div>`:'';
      return `<div class="player-ratings"><div class="player-rating-head"><strong${editable?' id="trainingOverall"':''}>GER ${season.overall(attributes)}</strong>${ageBadge}${progressBar}${averageBadge}</div>${pointsBanner}<div class="rating-grid">${ratings}</div></div>`;
    }

    function editableRating(key,label,value,rating){
      return `<div class="rating${rating==null?' training-foot':''}" tabindex="0" role="group" data-training-stat="${key}" aria-label="${label}, ${value}">
        <span>${label}</span>
        <div class="training-attribute-control">
          <button type="button" tabindex="-1" class="career-button training-step" data-training-step="-1" aria-label="${rating==null?'Pé esquerdo':'Diminuir '+label}">←</button>
          <strong data-training-value aria-live="polite">${value}</strong>
          <button type="button" tabindex="-1" class="career-button training-step" data-training-step="1" aria-label="${rating==null?'Pé direito':'Aumentar '+label}">→</button>
        </div>${rating==null?'':`<input type="range" class="training-range" min="50" max="99" value="${rating}" aria-label="${label}">`}</div>`;
    }

    function trainingFootLabel(foot){
      return foot==='LeftFoot'?'Esquerdo':'Direito';
    }

    function trainingStadiumList(){
      return window.goatStadiums?.list||[{id:'arena-brasa',name:'Arena Brasa'}];
    }
    function trainingStadiumLabel(id){
      return window.goatStadiums?.byId[id]?.name||'Arena Brasa';
    }

    function saveTrainingPlayer(){
      try { localStorage.setItem(trainingPlayerKey,JSON.stringify(trainingPlayer)); } catch {}
    }

    function openTrainingStadium(trigger){
      const club=careerPractice?season.team(save?.club??save?.trial):null;
      const auto=window.goatStadiums?.forClub(club,save?.round||0)??'arena-brasa';
      const choices=trainingStadiumList();
      const selected=careerPractice?trainingPlayer.careerStadiumId:trainingPlayer.stadiumId;
      const options=careerPractice?[{id:'club-auto',name:`Estádio do clube · ${trainingStadiumLabel(auto)}`},...choices]:choices;
      stadiumTrigger=trigger;
      stadiumDialog.querySelector('#trainingStadiumOptions').innerHTML=options.map(({id,name})=>
        `<button type="button" class="practice-stadium-btn" data-stadium="${id}" aria-pressed="${id===selected}">${esc(name)}</button>`).join('');
      stadiumDialog.showModal();
      focusOption(stadiumDialog.querySelector('[aria-pressed="true"]'));
    }

    stadiumDialog.addEventListener('click',event=>{
      const button=event.target.closest('button');
      if(!button)return;
      if(button.dataset.stadium){
        const id=button.dataset.stadium;
        if(careerPractice)trainingPlayer.careerStadiumId=id;
        else trainingPlayer.stadiumId=id;
        saveTrainingPlayer();
        const club=careerPractice?season.team(save?.club??save?.trial):null;
        const stadium=id==='club-auto'?window.goatStadiums?.forClub(club,save?.round||0)??'arena-brasa':id;
        api.changeTrainingStadium(stadium);
        const editButton=content.querySelector('[data-action="training-stadium"]');
        if(editButton)editButton.textContent='Estádio: '+trainingStadiumLabel(stadium);
      }
      stadiumDialog.close();
    });
    stadiumDialog.addEventListener('close',()=>{
      focusOption(stadiumTrigger,{preventScroll:true});
      stadiumTrigger=null;
    });

    function trainingPlayerScreen(){
      const back='return-practice-pause';
      activate('training-player','Jogador do Treino',`<div class="training-profile">${ratingPanel(trainingPlayer.attributes,true)}
        ${editableRating('dominantFoot','Pé dominante',trainingFootLabel(trainingPlayer.dominantFoot))}
        <div class="training-profile-footer">
          <button type="button" class="career-button" data-action="training-stadium" aria-haspopup="dialog">Estádio: ${esc(trainingStadiumLabel(trainingPlayer.stadiumId))}</button>
          ${button(back,'Aplicar e voltar','accent')}
        </div>
      </div>`,back);
      content.querySelectorAll('[data-training-stat]').forEach(updateTrainingRating);
    }

    function updateTrainingRating(row){
      const key=row.dataset.trainingStat;
      const foot=key==='dominantFoot';
      const min=foot?0:50,max=foot?1:99;
      const value=foot?trainingFeet.indexOf(trainingPlayer.dominantFoot):trainingPlayer.attributes[key];
      const label=foot?'Pé dominante':trainingStatLabel[key];
      const display=foot?trainingFootLabel(trainingPlayer.dominantFoot):String(value);
      row.setAttribute('aria-label',label+', '+display);
      const text=row.querySelector('[data-training-value]');
      if(text.textContent!==display)text.textContent=display;
      row.querySelector('[data-training-step="-1"]').setAttribute('aria-disabled',String(value<=min));
      row.querySelector('[data-training-step="1"]').setAttribute('aria-disabled',String(value>=max));
      if(!foot){
        const range=row.querySelector('input');
        range.value=value;
        range.style.setProperty('--training-fill',((value-50)/49*100)+'%');
      }
    }

    function adjustTrainingRating(row,direction,value){
      if(!row)return;
      const key=row.dataset.trainingStat;
      if(key==='dominantFoot'){
        trainingPlayer.dominantFoot=direction<0?'LeftFoot':'RightFoot';
      }else{
        trainingPlayer.attributes[key]=trainingRating(value??trainingPlayer.attributes[key]+direction);
      }
      updateTrainingRating(row);
      content.querySelector('#trainingOverall').textContent='GER '+season.overall(trainingPlayer.attributes);
      saveTrainingPlayer();
    }

    function moveTrainingSelection(active,x,y){
      const row=active?.closest('[data-training-stat]');
      if(x&&row){
        adjustTrainingRating(row,x);
        return true;
      }
      if(!y)return false;
      const items=[...content.querySelectorAll('button.quiet,[data-training-stat],.training-profile-footer button')];
      const index=items.indexOf(row??active);
      const next=index<0?(y<0?items.length-1:0):(index+y+items.length)%items.length;
      focusOption(items[next]);
      return true;
    }

    function playerStats(club) {
      const attributes=save.player.attributes;
      const s=save.personal,conversion=s.chances?Math.round(s.goals/s.chances*100):0;
      const values=[[s.matches,'Jogos'],[s.goals,'Gols'],[s.assists,'Assistências'],[s.shots,'Chutes'],[s.chances,'Chances'],[s.wins,'Vitórias'],[conversion+'%','Conversão']];
      const currentSalary=season.salaryFor(save,club.id);
      const finances=`<div class="career-stat-grid player-finances"><div><strong>${cash(save.balance)}</strong><span>Saldo</span></div>
        <div><strong>${cash(currentSalary)}</strong><span>Salário por partida</span></div>
        <div><strong>${cash(save.earned)}</strong><span>Salários recebidos</span></div></div>
        ${save.lastSalary?`<p class="career-note">Último pagamento de ${season.team(save.lastSalary.club).name} · ${cash(save.lastSalary.amount)}</p>`:''}`;
      return `${ratingPanel(attributes,false,save.player.age,save.lastProgression,season.attributeProgress(save),season.averageRating(save),season.xpProgress(save))}
        <h3 class="hub-section-title">Desempenho na temporada</h3><div class="career-stat-grid">${values.map(([number,label])=>
        `<div><strong>${number}</strong><span>${label}</span></div>`).join('')}</div><h3 class="hub-section-title">Finanças</h3>${finances}`;
    }

    function myPlayer(club,proposals) {
      if(playerTab==='shop'){
        const lookPaint=season.paint(save.player.look,club);
        const cards=season.shop.map(item=>{
          const group=season.appearance[item.key];
          const name=(group.names??group.values)[item.index];
          const own=save.owned.includes(item.id),unread=save.unreadItems.includes(item.id);
          const equipped=own&&save.player.look[item.key]===item.index;
          const canBuy=!own&&save.balance>=item.price;
          const action=canBuy?'buy':own&&!equipped?'equip':'preview-item';
          return `<button type="button" class="shop-item ${canBuy?'hold-action':''}" data-action="${action}" data-item="${item.id}"
            ${canBuy?'data-hold="true"':''} ${unread?'data-unread="true"':''}>${badge(unread)}${thumbnail(item.key,item.index,group.values[item.index])}
            <span><strong>${name}</strong><small>${group.label}</small></span>
            <span class="shop-price"><strong>${equipped?'Equipado':own?'Equipar':cash(item.price)}</strong>
              ${own?'':`<small>${canBuy?'Segure para comprar':'Saldo insuficiente'}</small>`}</span></button>`;
        }).join('');
        return `<div class="shop-summary"><span>Saldo <strong>${cash(save.balance)}</strong></span>
          <span>Selecione um item para ver no modelo 3D.</span></div><div class="standings-scroll shop-scroll" tabindex="0" aria-label="Itens da loja">
          <div class="shop-grid" style="--preview-skin:${lookPaint.skin};--preview-hair:${lookPaint.hairColor};--preview-beard:${lookPaint.beardColor}">${cards}</div></div>`;
      }
      if(playerTab==='awards')return journey.gallery(save);
      return playerTab==='market'?market(proposals):playerStats(club);
    }

    function market(proposals) {
      const lock=season.offerLockStatus(save);
      if(lock.locked||!proposals.length)return `<section class="market-empty"><span class="market-empty-icon" aria-hidden="true">↔</span><div><small>MERCADO DE TRANSFERÊNCIAS</small><h3>Sem propostas</h3><p>${esc(lock.locked?lock.reason:'Nenhuma proposta recebida no momento.')}</p></div></section>`;
      return `<p class="career-note">${save.pending?'Conclua a partida em andamento para responder.':'Segure para aceitar ou recusar. Ao aceitar, você não receberá novas ofertas por 1 ano.'}</p>
        <div class="transfer-list">${proposals.map(offer=>{
          const club=season.team(offer.id);
          const div=season.divisionOf(save,club.id)||club.league;
          const sal=season.salaryFor(save,club.id);
          return `<article class="transfer-offer" data-offer="${offer.id}" ${offer.seen===true?'':'data-unread="true"'}>${badge(offer.seen!==true)}${medal(club,38)}
            <div><strong>${esc(club.name)}</strong><small>${season.nameOf(div)} · ${cash(sal)} por partida · Expira em ${Math.max(1,offer.expires-save.round)} jogo(s)</small></div>
            <div class="transfer-actions">${[['accept-offer','Aceitar'],['refuse-offer','Recusar']].map(([action,label])=>
              `<button type="button" class="career-button hold-action ${action==='accept-offer'?'accent':''}" data-hold="true" data-action="${action}"
                data-team="${club.id}" ${save.pending?'disabled':''}>${label}</button>`).join('')}</div></article>`;
        }).join('')}</div>`;
    }

    function tabs(label, items, selected, prefix, className='hub-tabs') {
      return `<nav class="${className}" aria-label="${label}">${items.map(([id,text,unread])=>
        `<button type="button" data-action="${prefix}-${id}" aria-pressed="${selected===id}"
          ${unread?'aria-label="'+text+', novidades"':''}>${text}${unread===undefined?'':badge(unread)}</button>`).join('')}</nav>`;
    }

    function fixtureTitle(game) {
      return `${season.team(game.home)?.name ?? game.home} ${game.h} × ${game.a} ${season.team(game.away)?.name ?? game.away}`;
    }

    function emptyRecords(title,description) {
      return `<section class="career-empty"><span class="career-empty-icon" aria-hidden="true"><svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="4" width="22" height="24" rx="1"/><path d="M10 11h12M10 16h12M10 21h7"/></svg></span><div><h3>${esc(title)}</h3><p>${esc(description)}</p></div></section>`;
    }

    function leaderboardList(rows, metric, emptyText) {
      const top=rows.slice(0,8);
      const playerRank=rows.findIndex(r=>r.player);
      if(playerRank>=8)top.push(rows[playerRank]);
      if(!top.length)return emptyRecords(metric==='assists'?'Sem assistências registradas':'Sem gols registrados',emptyText);
      return `<ol class="scorer-list">${top.map(row=>`<li${row.player?' class="your-scorer"':''}>
        <span>${rows.indexOf(row)+1}.</span>${medal(season.team(row.clubId),20)}<span class="scorer-player"><strong>${esc(row.name)}</strong><small>${esc(season.team(row.clubId)?.name??'')}</small></span>
        <strong>${row[metric]}</strong></li>`).join('')}</ol>`;
    }

    function tournamentGames(next, club, position) {
      if(next?.national)club=season.team(next.playingClub);
      const lineup=journey.status(save);
      const selectionPanel=`<div class="selection-status" style="--progress-color:hsl(${Math.round(lineup.points*1.2)} 56% 55%)"><strong>${lineup.label}</strong><span>${lineup.points}/100 · Titular a partir de 60 · Média ${lineup.average.toFixed(1).replace('.',',')}</span><div class="selection-meter"><progress max="100" value="${lineup.points}" aria-label="Pontos de titularidade"></progress><i aria-hidden="true"></i></div><small>${lineup.starter?'Você terá a sequência normal de lances. ':''}Treinos opcionais ajudam a conquistar espaço.</small></div>`;
      const badges=next?[next.isFinal?'<span class="match-tag is-final">FINAL</span>':'',next.isClassic?'<span class="match-tag is-classic">CLÁSSICO</span>':''].filter(Boolean).join(''):'';
      const retiringNext = (save.player.age ?? 18) >= season.RETIRE_AGE - 1;
      const fixture=next
        ? `<div class="next-fixture">${medal(club,44)}<div><span>${esc(next.competitionName)} · ${esc(next.phaseLabel)} · ${next.home?'Em casa':'Fora de casa'} ${badges}</span><strong>${esc(club.name)} × ${esc(next.club.name)}</strong></div>${medal(next.club,44)}</div>
          ${button('continue',save.pending?'Continuar jogo':'Jogar próxima partida','accent')}`
        : `<p class="trial-rating"><strong>${position}º</strong> lugar na liga · Temporada ${save.year} concluída</p>${button('new-season',retiringNext?'Aposentar-se (36 anos)':'Próxima temporada','accent')}`;
      const last=save.history.slice(-3).reverse();
      const leagueId=season.leagueCompId(season.leagueOf(save)||'B');
      const list=gamesStatTab==='assists'?season.assisters(save,leagueId):season.scorers(save,leagueId);
      const leaders=list.slice(0,5);
      const playerRank=list.findIndex(row=>row.player);
      if(playerRank>=5)leaders.push(list[playerRank]);
      return `${fixture}${selectionPanel}<div class="tournament-overview"><section><div class="section-head-row"><h3 class="hub-section-title">Últimos 3 jogos</h3></div>
        ${last.length?`<ul class="fixture-history">${last.map(game=>{
          const opp=season.team(game.opponent);
          const outcome=game.forGoals===game.against?'E':game.forGoals>game.against?'V':'D';
          return `<li>${medal(opp,24)}<span><strong>${esc(opp?.name??'')}</strong><small>${esc(game.compName||'Liga')} · ${esc(game.phaseLabel||('Jogo '+game.round))} · ${game.home?'Casa':'Fora'}</small></span>
            <strong>${game.forGoals} × ${game.against}</strong><i class="game-outcome" data-result="${outcome}">${outcome}</i></li>`;
        }).join('')}</ul>`:emptyRecords('Nenhum jogo concluído','Os resultados das suas próximas partidas aparecerão aqui.')}</section>
        <section><div class="section-head-row"><h3 class="hub-section-title">${gamesStatTab==='assists'?'Assistências':'Artilheiros'}</h3>
          <div class="mini-toggle"><button type="button" data-action="games-stat-goals" aria-pressed="${gamesStatTab==='goals'}">Gols</button>
          <button type="button" data-action="games-stat-assists" aria-pressed="${gamesStatTab==='assists'}">Assist.</button></div></div>
        ${leaders.length?`<ol class="scorer-list">${leaders.map(row=>`<li${row.player?' class="your-scorer"':''}>
          <span>${list.indexOf(row)+1}.</span><span class="scorer-player"><strong>${esc(row.name)}</strong><small>${esc(season.team(row.clubId)?.name??'')}</small></span>
          <strong>${row[gamesStatTab]}</strong></li>`).join('')}</ol>`:emptyRecords(gamesStatTab==='assists'?'Sem assistências registradas':'Sem gols registrados',gamesStatTab==='assists'?'As assistências aparecem após os primeiros passes decisivos.':'A artilharia aparece após os primeiros gols.')}</section></div>`;
    }

    function renderStandingsTable(rows, compId, groupLetter = null) {
      const places = !groupLetter && compId === 'serie-a' ? season.continentalPlaces(save) : [];
      const meta = season.COMPETITION_META[compId];
      const zoneOf = (idx, rowId) => {
        if(compId==='champions-league')return idx<8?'promotion':idx<24?'pre':'';
        if (groupLetter) return idx < (groupLetter==='Melhores terceiros'?8:2) ? 'promotion' : '';
        if (compId === 'serie-a') {
          const p = places.find(x => x.clubId === rowId);
          if (p) return p.competition === 'libertadores' ? 'continental' : p.competition === 'pre-libertadores' ? 'pre' : 'secondary';
          if (idx >= rows.length - 4) return 'relegation';
          return '';
        }
        if (meta?.promote && idx < meta.promote) return 'promotion';
        if (meta?.relegate && idx >= rows.length - meta.relegate) return 'relegation';
        return '';
      };
      const formDots = form => {
        const last5 = (form || []).slice(-5);
        const pad = Array.from({ length: 5 - last5.length }, () => '<span class="form-dot form-empty">·</span>').join('');
        const dots = last5.map(r => {
          const cls = r === 'V' ? 'win' : r === 'E' ? 'draw' : 'loss';
          return `<span class="form-dot form-${cls}">${r === 'V' ? '✓' : r === 'E' ? '−' : '×'}</span>`;
        }).join('');
        return `<div class="standings-form">${pad}${dots}</div>`;
      };
      const legend = compId==='champions-league'?'<footer class="standings-legend"><span><i class="zone-promotion"></i>1º a 8º · Oitavas</span><span><i class="zone-pre"></i>9º a 24º · Playoffs</span></footer>':groupLetter==='Melhores terceiros'?'<footer class="standings-legend"><span><i class="zone-promotion"></i>8 melhores terceiros classificados</span></footer>':groupLetter
        ? '<footer class="standings-legend"><span><i class="zone-promotion"></i>Classificados para o mata-mata (Top 2)</span></footer>'
        : compId === 'serie-a'
          ? '<footer class="standings-legend"><span><i class="zone-continental"></i>Libertadores</span><span><i class="zone-pre"></i>Pré-Liberta</span><span><i class="zone-secondary"></i>Sul-Americana</span><span><i class="zone-relegation"></i>Rebaixamento</span></footer>'
          : '<footer class="standings-legend"><span><i class="zone-promotion"></i>Acesso (G4)</span><span><i class="zone-relegation"></i>Rebaixamento (Z4)</span></footer>';

      return `<div class="standings-block">${groupLetter ? `<h3 class="group-heading">${compId==='champions-league'?'Fase de liga · 36 clubes':groupLetter==='Melhores terceiros'?groupLetter:`Grupo ${groupLetter}`}</h3>` : ''}
        <table class="career-table standings">
        <thead><tr><th>Pos.</th><th>Clube</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th class="col-form">Últ. 5</th></tr></thead>
        <tbody>${rows.map((r, i) => {
          const z = zoneOf(i, r.id);
          const place = places.find(x => x.clubId === r.id);
          const mark = place?.origin === 'title' ? ' ★' : place?.origin === 'inherited' ? ' ↳' : '';
          return `<tr class="${r.id === save.club ? 'your-club' : ''} ${z ? 'zone-' + z : ''}">
            <td><span class="standing-rank">${i + 1}</span></td>
            <th scope="row"><div class="standing-club">${medal(season.team(r.id), 20)}<span>${esc(r.name)}${mark}</span></div></th>
            <td class="standing-points">${r.p}</td>
            <td>${r.j}</td><td>${r.v}</td><td>${r.e}</td><td>${r.d}</td>
            <td>${r.sg > 0 ? '+' : ''}${r.sg}</td>
            <td class="col-form">${formDots(r.form)}</td>
          </tr>`;
        }).join('')}</tbody></table>${legend}</div>`;
    }

    function renderKnockout(comp) {
      const rounds = comp.knockout || [];
      if (!rounds.length) {
        return emptyRecords('Confrontos ainda não definidos',comp.national?'Avançam os 2 primeiros de cada grupo e os 8 melhores terceiros, formando os 16-avos de final.':comp.id==='champions-league'?'Os 8 primeiros avançam às oitavas. Do 9º ao 24º disputam os playoffs.':'Os dois primeiros de cada grupo avançam ao mata-mata.');
      }
      const readyRounds = rounds.map((ties, idx) => ({ idx, ties, ready: ties.some(t => t.home && t.away), label: ties[0]?.label || `Fase ${idx + 1}` }));
      const latestReady = [...readyRounds].reverse().find(r => r.ready)?.idx ?? 0;
      const activeIdx = (selectedKoRound !== null && readyRounds[selectedKoRound]?.ready) ? selectedKoRound : latestReady;
      const activeRound = readyRounds[activeIdx];
      const roundNav = readyRounds.length > 1
        ? `<div class="tournament-phases cup-round-nav" role="group" aria-label="Fases do mata-mata">${readyRounds.map(r =>
            `<button type="button" data-action="ko-round" data-round="${r.idx}" aria-pressed="${r.idx === activeIdx}" ${r.ready ? '' : 'disabled title="Confrontos ainda não definidos"'}>${esc(r.label)}</button>`
          ).join('')}</div>`
        : '';
      const tiesHtml = activeRound.ties.map(tie => {
        const homeClub = tie.home ? season.team(tie.home) : null;
        const awayClub = tie.away ? season.team(tie.away) : null;
        const sideHtml = (clubObj, id) => clubObj
          ? `<div class="cup-side ${id === tie.winner ? 'cup-winner' : ''} ${id === save.club ? 'cup-user' : ''}">${medal(clubObj, 20)}<span>${esc(clubObj.name)}</span></div>`
          : `<div class="cup-side"><span>A definir</span></div>`;
        const legs = tie.legs === 2
          ? [
              { label: 'Ida', hClub: homeClub, hId: tie.home, aClub: awayClub, aId: tie.away, score: tie.firstLeg, pen: null },
              { label: 'Volta', hClub: awayClub, hId: tie.away, aClub: homeClub, aId: tie.home, score: tie.secondLeg, pen: tie.penalties }
            ]
          : [
              { label: 'Jogo único', hClub: homeClub, hId: tie.home, aClub: awayClub, aId: tie.away, score: tie.firstLeg, pen: tie.penalties }
            ];
        return `<article class="cup-tie">${legs.map(leg => `
          <div class="cup-leg">
            <small>${leg.label}</small>
            <div class="cup-score-row">
              ${sideHtml(leg.hClub, leg.hId)}
              <strong class="cup-score">${leg.score ? `${leg.score.h}–${leg.score.a}` : '×'}${leg.pen ? `<small class="cup-pen">${leg.pen.h}–${leg.pen.a} pên</small>` : ''}</strong>
              ${sideHtml(leg.aClub, leg.aId)}
            </div>
          </div>`).join('')}
          ${tie.winner ? `<p class="cup-qualified">${esc(season.team(tie.winner)?.name ?? '')} ${tie.isThird?'· 3º lugar':activeIdx === rounds.length - 1 && comp.id !== 'pre-libertadores' ? 'campeão' : 'classificado'}</p>` : ''}
        </article>`;
      }).join('');
      return `${roundNav}<div class="cup-bracket-grid">${tiesHtml}</div>`;
    }

    function renderTournamentView(comps) {
      if (!comps.length) return emptyRecords('Nenhum torneio ativo','As competições da temporada aparecerão aqui quando estiverem disponíveis.');
      const comp = comps.find(c => c.id === selectedCompId) || comps[0];
      selectedCompId = comp.id;

      // Fases clicáveis igual ao football-hype
      let phaseButtons = [];
      let phaseBody = '';
      if (comp.format === 'league') {
        if (!['table', 'scorers', 'assists'].includes(compPhase)) compPhase = 'table';
        phaseButtons = [['table', 'Classificação'], ['scorers', 'Artilharia'], ['assists', 'Assistências']];
        if (compPhase === 'table') {
          phaseBody = renderStandingsTable(season.standings(save, comp.id), comp.id);
        } else if (compPhase === 'scorers') {
          phaseBody = leaderboardList(season.scorers(save, comp.id), 'goals', 'A artilharia aparece após os primeiros gols.');
        } else {
          phaseBody = leaderboardList(season.assisters(save, comp.id), 'assists', 'As assistências aparecem após os primeiros passes decisivos.');
        }
      } else if (comp.format === 'groups-knockout') {
        const koReady = (comp.knockout || []).length > 0;
        if (!['groups', 'knockout', 'scorers','thirds'].includes(compPhase) || (compPhase === 'knockout' && !koReady)) compPhase = 'groups';
        phaseButtons = [['groups', 'Fase de grupos'], ['knockout', 'Mata-mata', !koReady], ['scorers', 'Artilharia']];
        if(comp.id==='champions-league')phaseButtons[0][1]='Fase de liga';
        if(comp.national)phaseButtons.splice(1,0,['thirds','Melhores terceiros']);
        if (compPhase === 'groups') {
          const groups = season.groupTables(save, comp.id);
          const groupNav = `<div class="tournament-phases group-pills" role="group" aria-label="Grupos">${[
            ['ALL', 'Todos os grupos'], ...groups.map(g => [g.group, `Grupo ${g.group}`])
          ].map(([gKey, gLabel]) => `<button type="button" data-action="comp-group" data-group="${gKey}" aria-pressed="${selectedGroup === gKey}">${gLabel}</button>`).join('')}</div>`;
          const visible = selectedGroup === 'ALL' ? groups : groups.filter(g => g.group === selectedGroup);
          phaseBody = `${groupNav}<div class="cup-groups-list">${visible.map(g => renderStandingsTable(g.table, comp.id, g.group)).join('')}</div>`;
        } else if(compPhase==='thirds'&&comp.national){
          const thirds=season.groupTables(save,comp.id).map(group=>({...group.table[2],name:group.table[2].name+' · '+group.group})).sort((a,b)=>b.p-a.p||b.sg-a.sg||b.gp-a.gp||a.id.localeCompare(b.id));
          phaseBody=renderStandingsTable(thirds,comp.id,'Melhores terceiros');
        } else if (compPhase === 'knockout') {
          phaseBody = renderKnockout(comp);
        } else {
          phaseBody = leaderboardList(season.scorers(save, comp.id), 'goals', 'Nenhum gol registrado neste torneio ainda.');
        }
      } else {
        if (!['knockout', 'scorers'].includes(compPhase)) compPhase = 'knockout';
        phaseButtons = [['knockout', 'Chaveamento'], ['scorers', 'Artilharia']];
        phaseBody = compPhase === 'knockout'
          ? renderKnockout(comp)
          : leaderboardList(season.scorers(save, comp.id), 'goals', 'Nenhum gol registrado neste torneio ainda.');
      }

      const phaseNav = `<div class="tournament-phases" role="group" aria-label="Fases do torneio">${phaseButtons.map(([id, label, disabled]) =>
        `<button type="button" data-action="comp-phase" data-phase="${id}" aria-pressed="${compPhase === id}" ${disabled ? 'disabled title="Disponível após a fase de grupos"' : ''}>${label}</button>`
      ).join('')}</div>`;

      return `${phaseNav}<div class="standings-scroll tournament-scroll" tabindex="0" aria-label="${esc(comp.name)}">${phaseBody}</div>`;
    }

    const newsImages=new Map();
    function newsHash(value){
      let hash=2166136261;
      for(const char of String(value))hash=Math.imul(hash^char.charCodeAt(0),16777619);
      return hash>>>0;
    }
    function newsPhoto(story){
      if(!story.media||!api.newsImage)return '';
      const media=story.media,key=[save.year,save.player.name,JSON.stringify(save.player.look),story.key,media.kind].join('|');
      if(!newsImages.has(key)){
        const image=api.newsImage({...media,variant:newsHash(story.key)%6});
        if(!image)return '';
        if(newsImages.size>=24)newsImages.delete(newsImages.keys().next().value);
        newsImages.set(key,image);
      }
      return '<figure class="news-photo"><img src="'+newsImages.get(key)+'" width="640" height="360" loading="lazy" alt="'+esc(media.alt)+'">'+(media.caption?'<figcaption>'+esc(media.caption)+'</figcaption>':'')+'</figure>';
    }
    function newsFeed(club) {
      const stories=[],seen=new Set(),usedComments=new Set();
      const choose=(list,key)=>{
        const offset=newsHash(key)%list.length;
        for(let i=0;i<list.length;i++){
          const text=list[(offset+i)%list.length];
          if(!usedComments.has(text)){usedComments.add(text);return text;}
        }
        return list[offset];
      };
      const add=story=>{if(!seen.has(story.key)){seen.add(story.key);stories.push(story);}};
      const next=season.opponent(save);
      if(next&&(next.isClassic||next.isFinal||/semifinal|quartas/i.test(next.phaseLabel??''))){
        const home=next.home?season.team(next.playingClub??club.id):next.club;
        const away=next.home?next.club:season.team(next.playingClub??club.id);
        const stadiumId=window.goatStadiums?.forClub(home,0),stadium=window.goatStadiums?.byId[stadiumId];
        const key='preview:'+save.year+':'+next.competitionId+':'+next.slot.round+':'+home.id+':'+away.id;
        const occasion=next.isFinal?'FINAL':next.isClassic?'CLÁSSICO':'JOGO DECISIVO';
        add({key,round:save.round+1,author:newsAuthors[newsHash(key)%newsAuthors.length],club:true,player:false,
          title:occasion+' À VISTA: '+home.name+' x '+away.name,
          label:next.competitionShort+' · '+next.phaseLabel,
          body:choose([
            'Arquibancada em contagem regressiva. '+home.name+' e '+away.name+' se encontram em um jogo que promete mexer com a temporada.',
            'O calendário guardou uma noite especial: '+home.name+' recebe '+away.name+'. Concentração e bola parada podem decidir os detalhes.',
            'Semana de expectativa alta para '+home.name+' x '+away.name+'. O peso do confronto começa antes do primeiro toque na bola.',
            'A conversa da torcida tem endereço: '+(stadium?.name??home.name)+'. '+home.name+' e '+away.name+' entram em campo com muito em jogo.'
          ],key),media:stadium?.kind==='real'?{kind:'stadium',club:home,opponent:away,stadiumId,
            alt:'Vista aérea de '+stadium.name+' no jogo',caption:stadium.name+' · Vista aérea no GOAT'}:null});
      }
      for(const [dayIndex,day] of save.rounds.slice(-4).reverse().entries()){
        const games=day.filter(game=>season.team(game.home)&&season.team(game.away));
        if(!games.length)continue;
        const round=games[0].seasonRound??games[0].round??1;
        const played=save.history.find(game=>game.round===round);
        const own=games.find(game=>game.home===club.id||game.away===club.id)||
          (played?games.find(game=>game.home===played.club||game.away===played.club):null);
        const selected=[own,...games.filter(game=>game!==own).sort((a,b)=>
          (Math.abs(b.h-b.a)*2+b.h+b.a)-(Math.abs(a.h-a.a)*2+a.h+a.a)).slice(0,3)].filter(Boolean);
        for(const [index,game] of selected.entries()){
          const home=season.team(game.home),away=season.team(game.away);
          const key=[save.year,game.compId,round,game.round,game.home,game.away].join(':');
          const compName=season.COMPETITION_META[game.compId]?.shortName??'Torneio';
          const author=newsAuthors[(newsHash(key)+index)%newsAuthors.length];
          const total=game.h+game.a,margin=Math.abs(game.h-game.a),winner=game.h>game.a?home:away;
          const label=compName+' · '+(game.phaseLabel||('Rodada '+game.round));
          const isOwn=game===own,performance=isOwn&&played&&(!played.compId||played.compId===game.compId)?played:null;
          let title=fixtureTitle(game),body,media=null;
          if(performance){
            const name=save.player.name,positive=performance.goals+performance.assists>0;
            const poor=!positive&&(performance.rating!=null?performance.rating<6:performance.forGoals<performance.against);
            const actions=[performance.goals?performance.goals+' '+(performance.goals===1?'gol':'gols'):'',
              performance.assists?performance.assists+' '+(performance.assists===1?'assistência':'assistências'):''].filter(Boolean).join(' e ');
            const headlines=positive?[name+' aparece na hora decisiva',name+' faz a diferença',name+' deixa sua marca',name+' encontra o caminho do gol',name+' ganha os holofotes',name+' participa e decide']:
              poor?[name+' fica devendo',name+' termina sob cobrança','Noite difícil para '+name,name+' busca uma resposta']:
                [name+' participa de duelo disputado',name+' deixa o campo sem participação em gol'];
            title=choose(headlines,key+'title');
            const praise=[
              'Teve presença, leitura e execução. '+name+' participou com '+actions+' e deu motivo para a torcida levantar.',
              'Quando a bola pediu uma solução, '+name+' respondeu: '+actions+'. Atuação para rever os melhores momentos.',
              'Não foi só aparecer na foto. '+name+' somou '+actions+' e ajudou a transformar a jogada em resultado.',
              'A defesa tentou fechar o caminho, mas '+name+' encontrou espaço. Terminou com '+actions+'.',
              'Movimentação que dá opção e toque que faz diferença: '+name+' saiu com '+actions+'.',
              'A torcida tem assunto para a semana. '+name+' participou com '+actions+' e mostrou personalidade.'
            ];
            const criticism=[
              name+' teve dificuldade para entrar no jogo. Faltou presença nas jogadas decisivas e sobrou cobrança no apito final.',
              'A bola chegou, mas a resposta não veio. '+name+' precisa recuperar a confiança para a próxima partida.',
              'Pouco espaço e decisões apressadas marcaram a noite de '+name+'. O próximo jogo pede outra postura.',
              'Cabeça baixa no fim. '+name+' passou longe do protagonismo e agora tenta transformar a cobrança em reação.',
              'A marcação tirou '+name+' do jogo. Procurar novos espaços será parte do trabalho para a próxima rodada.',
              'Não deu encaixe: '+name+' encontrou dificuldades nas combinações e saiu sem participar de gol.'
            ];
            body=(positive?choose(praise,key):poor?choose(criticism,key):
              name+' terminou sem gol ou assistência em uma partida de muita disputa. A avaliação também passa pela movimentação e pelo trabalho coletivo.')+' '+fixtureTitle(game)+'.';
            if(dayIndex<3&&(positive||poor))media={kind:positive?(performance.goals&&newsHash(key)%2?'celebrate':'shoot'):'sad',
              club:season.team(performance.club)??club,opponent:season.team(performance.opponent)??away,
              appearance:season.paint(save.player.look,season.team(performance.club)??club),alt:positive?name+' em cena de partida':name+' e companheiros abatidos após a partida'};
          }else{
            const zero=[
              'As defesas chegaram antes dos atacantes. O zero permaneceu até o fim.',
              'O placar não saiu do lugar, mas os goleiros tiveram trabalho para manter tudo igual.',
              'Faltou o último toque. A organização defensiva venceu a criatividade.',
              'Um ponto para cada lado e a sensação de que dava para arriscar mais.',
              'O torcedor esperou o grito que não veio. As redes passaram a noite em silêncio.',
              'Os espaços foram raros e as finalizações não resolveram. Empate sem gols.'
            ];
            const festival=[
              'Quem piscou perdeu um lance. Ataques inspirados e defesas expostas fizeram um jogo aberto.',
              'Não faltou coragem para atacar. O placar contou a história de uma partida sem descanso.',
              'As redes trabalharam mais que a defesa gostaria. Foi noite de chances dos dois lados.',
              'O jogo trocou controle por emoção. A torcida mal teve tempo de sentar entre os ataques.',
              'Um roteiro cheio de gols para quem gosta de futebol com risco.',
              'A conta do placar subiu rápido. Os treinadores terão gols para comemorar e ajustes para cobrar.'
            ];
            const wins=[
              winner.name+' aproveitou melhor as chances e saiu com a vitória.',
              winner.name+' encontrou a solução no ataque e sustentou o resultado até o fim.',
              'A noite terminou do lado de '+winner.name+'. Eficiência fez diferença no placar.',
              winner.name+' fez valer os momentos de superioridade e levou a melhor.',
              'O resultado recompensa '+winner.name+', que conseguiu transformar pressão em gol.',
              winner.name+' respondeu nos detalhes e ganhou um duelo importante.',
              'A torcida de '+winner.name+' deixou o estádio com motivos para comemorar.',
              winner.name+' foi mais preciso na hora de decidir. Vitória construída com atenção nas duas áreas.'
            ];
            const draws=[
              'Os dois lados tiveram sua vez, mas ninguém conseguiu se impor até o fim.',
              'Equilíbrio no placar e opiniões divididas na arquibancada. O empate deixa trabalho para os dois.',
              'Cada equipe levou um ponto e uma lista de oportunidades para lamentar.',
              'O empate combinou com a disputa: reação de um lado, resposta do outro.',
              'Ninguém saiu de mãos vazias, mas os dois queriam mais.',
              'As equipes alternaram bons momentos e terminaram sem separar o placar.'
            ];
            body=choose(!total?zero:total>=5?festival:game.h===game.a?draws:wins,key);
            if(index===1&&dayIndex===0&&margin>=3)media={kind:'celebrate',club:winner,opponent:winner===home?away:home,alt:'Jogadores de '+winner.name+' comemorando em cena de partida'};
          }
          add({key,author,title,body,club:isOwn,player:!!performance,round,label,media});
        }
      }
      const filtered=stories.filter(story=>newsTab==='all'||(newsTab==='club'?story.club:story.player)).sort((a,b)=>b.round-a.round);
      return (filtered.length?'<div class="news-feed standings-scroll" tabindex="0" aria-label="Notícias da carreira">'+filtered.map(story=>
          '<article class="news-story">'+newsAvatar(story.author)+'<div class="news-copy"><small class="news-round">'+esc(story.label)+'</small>'+
          '<h3><span>'+esc(story.author[0])+'</span> · '+esc(story.title)+'</h3><p>'+esc(story.body)+'</p>'+newsPhoto(story)+'</div></article>').join('')+'</div>':
          emptyRecords('Nenhuma notícia por enquanto','As novidades desta seção aparecerão conforme sua carreira avançar.'));
    }

    function hub(skipNewItem=null) {
      if (!save) return gateway();
      journey.state(save);
      if(save.stage==='trial'&&!save.origin&&!save.pending){careerOrigin();return;}
      if (save.stage === 'trial') {
        api.preview(null);
        const body = save.pending
          ? `<p>Seu teste com ${esc(season.team(save.trial).name)} está em andamento.</p>${button('continue','Continuar seletiva','accent')}`
          : `<p>Escolha um time para o jogo-teste. Seu desempenho define quais clubes da Série B farão propostas.</p>${teamCards(season.trials,'trial','Jogo-teste')}`;
        activate('trial','Seletiva',body+button('career-training','Treino livre'),'career');
        return;
      }
      if (save.stage === 'offers') {
        api.preview(null);
        activate('offers','Propostas da Série B', `<p class="trial-rating">Nota <strong>${save.trialResult.rating}</strong> / 100 · ${save.trialResult.goals} gols em ${save.trialResult.chances} chances</p>
          ${summary(save.last)}${teamCards(save.offers.map(season.team),'contract','Assinar proposta')}${button('career-training','Treino livre')}`,'career');
        return;
      }
      if (save.stage === 'retired') {
        const club = season.team(save.club);
        const tot = save.careerTotals || { seasons: save.seasonNumber, matches: save.personal.matches, goals: save.personal.goals, assists: save.personal.assists, wins: save.personal.wins, clubs: club ? [club.id] : [] };
        const clubsHtml = (tot.clubs || []).map(id => season.team(id)).filter(Boolean).map(c =>
          `<span class="retired-club-chip">${medal(c, 22)}${esc(c.name)}</span>`
        ).join('');
        api.preview(club ? season.paint(save.player.look, club) : null, -.22);
        activate('retired', 'Aposentadoria · 36 anos', `<div class="retired-summary">
          <div class="club-header">${club ? medal(club, 48) : ''}<div><strong>${esc(save.player.name)}</strong><span>Aposentado aos ${save.player.age} anos · GER final ${season.overall(save.player.attributes)}</span></div></div>
          <p class="career-note">Sua trajetória nos gramados chegou ao fim após ${tot.seasons} temporada(s).</p>
          <div class="career-stat-grid">
            <div><strong>${tot.seasons}</strong><span>Temporadas</span></div>
            <div><strong>${tot.matches}</strong><span>Jogos</span></div>
            <div><strong>${tot.goals}</strong><span>Gols</span></div>
            <div><strong>${tot.assists}</strong><span>Assistências</span></div>
            <div><strong>${tot.wins}</strong><span>Vitórias</span></div>
            <div><strong>${save.achievements.length}</strong><span>Prêmios / Títulos</span></div>
            <div><strong>${cash(save.earned)}</strong><span>Total ganho</span></div>
          </div>
          ${clubsHtml ? `<h3 class="hub-section-title">Clubes defendidos</h3><div class="retired-clubs">${clubsHtml}</div>` : ''}
          <div class="retired-actions">${button('career', 'Voltar ao menu da carreira', 'accent')}</div>
        </div>`, 'career');
        return;
      }
      const club = season.team(save.club);
      const div = season.leagueOf(save) || club.league;
      const league=season.nameOf(div);
      const proposals=season.activeProposals(save);
      const alerts=playerAlerts(proposals);
      const next = season.opponent(save);
      if(save.worldCup?.callup&&!save.worldCup.callup.seen){persist();callupScreen();return;}
      const training=save.selection?.training;
      if(hubTab==='practice'&&training&&training.seen!==true){
        training.seen=true;
        persist();
      }
      const trainingAlert=training?.seen!==true&&journey.availableDrills(save).some(drill=>drill.status!=='complete');
      const table = season.standings(save);
      const position = Math.max(1, table.findIndex(row => row.id === save.club) + 1);
      const comps = season.activeCompetitions(save).filter(comp => {
        if(comp.id==='world-cup')return save.worldCup?.year===save.year&&save.worldCup.callup?.selected===true;
        return !comp.national&&comp.participants?.includes(save.club);
      });
      if (!comps.some(c => c.id === selectedCompId)) selectedCompId = comps.find(comp=>comp.id===season.leagueCompId(div))?.id??comps[0]?.id??null;
      const subtabClass='hub-tabs hub-subtabs';
      const subtabs={
        games:()=>'',
        tournaments:()=>`<nav class="${subtabClass}" aria-label="Torneios do clube">${comps.map(c=>
          `<button type="button" data-action="comp-select" data-comp="${c.id}" aria-pressed="${selectedCompId===c.id}">${esc(c.shortName)}</button>`
        ).join('')}</nav>`,
        player:()=>tabs('Meu Jogador',[['profile','Dados Gerais',alerts.profile],['shop','Loja',alerts.shop],['awards','Conquistas'],
          ['market','Propostas',alerts.market],['edit','Editar jogador']],playerTab,'player',subtabClass),
        news:()=>tabs('Filtro do Noticiário',[['all','Todos'],['club','Meu Clube'],['player','Meu Jogador']],newsTab,'news',subtabClass),
        practice:()=>tabs('Treinos',[['challenges','Desafios de treino'],['free','Treino Livre']],practiceTab,'practice',subtabClass)
      };
      const sections={
        games:()=>tournamentGames(next,club,position),
        tournaments:()=>renderTournamentView(comps),
        player:()=>myPlayer(club,proposals),
        news:()=>newsFeed(club),
        practice:()=>practiceTab==='challenges'?trainingChallenges():button('career-training','Iniciar treino','accent')
      };
      const playerSection=hubTab==='player'&&(playerTab==='profile'||playerTab==='awards');
      const backTarget=hubTab==='player'&&playerTab!=='profile'?'player-profile':
        hubTab==='news'&&newsTab!=='all'?'news-all':'career';
      activate('hub',league+' · '+save.year,
        `<div class="career-hub${hubTab==='games'?' is-no-subtabs':''}" data-panel="${hubTab==='player'?playerTab:hubTab}" style="--club-primary:${club.primary};--club-secondary:${club.secondary}">
         <div class="club-header">${medal(club,42)}<div><strong>${esc(club.name)}</strong><span>${esc(save.player.name)} · ${save.player.age} anos · ${position}º na ${league}</span></div></div>
         ${tabs('Painel da carreira',[['games','Jogos'],['tournaments','Torneios'],['practice','Treinos',trainingAlert],['player','Meu Jogador',alerts.player],['news','Noticiário']],hubTab,'tab')}
         ${subtabs[hubTab]()}
         <div class="hub-content"${playerSection?' tabindex="0" aria-label="'+(playerTab==='profile'?'Dados gerais do jogador':'Conquistas do jogador')+'"':''}>${sections[hubTab]()}</div></div>`,backTarget);
      api.preview(season.paint(save.player.look,club),-.22);
      for(const card of content.querySelectorAll('[data-unread]')){
        if(!skipNewItem||card.dataset.item!==skipNewItem)alertObserver.observe(card);
      }
    }

    function match() {
      const play = save?.pending ?? season.startRound(save);
      if (!play) return;
      if (play.used >= play.chances && (play.shootout || season.needsPenaltyShootout(save, play))) {
        if (!play.shootout) season.createShootout(save, play);
        persist();
        startShootoutField();
        return;
      }
      persist();
      activate('game');
      const club = season.team(play.kind === 'trial' ? save.trial : play.playingClub??save.club);
      const opponent=season.team(play.opponent);
      api.playMatch(play, club, opponent, season.paint(save.player.look, club),save.player.attributes,matchKey(play,club.id));
    }

    function startShootoutField() {
      const play = save?.pending;
      if (!play?.shootout) return;
      if (play.shootout.winner) { shootoutScreen(); return; }
      const club = season.team(play.playingClub??save.club);
      const opponent = season.team(play.opponent);
      activate('game');
      api.playShootoutKick(play, club, opponent, season.paint(save.player.look, club), save.player.attributes);
    }

    function shootoutScreen() {
      const play = save?.pending;
      const so = play?.shootout;
      if (!play || !so) { hub(); return; }
      api.preview(null);
      const club = season.team(play.playingClub??save.club);
      const opp = season.team(play.opponent);
      const homeClub = play.home ? club : opp;
      const awayClub = play.home ? opp : club;
      const homeSide = play.home ? 'user' : 'opp';
      const awaySide = play.home ? 'opp' : 'user';
      const homePen = homeSide === 'user' ? so.userScore : so.oppScore;
      const awayPen = awaySide === 'user' ? so.userScore : so.oppScore;
      const homeNorm = play.home ? play.forGoals : play.against;
      const awayNorm = play.home ? play.against : play.forGoals;
      const turn = season.shootoutNextTurn(so);

      const maxTaken = Math.max(so.userKicks.length, so.oppKicks.length);
      const visibleSlots = so.winner ? Math.max(5, maxTaken) : Math.max(5, maxTaken + (turn && turn.kickIndex >= maxTaken ? 1 : 0));

      const renderPips = (side) => {
        const kicks = side === 'user' ? so.userKicks : so.oppKicks;
        const isUserSide = side === 'user';
        return Array.from({ length: visibleSlots }, (_, idx) => {
          const k = kicks[idx];
          const isCurrent = !so.winner && turn && turn.side === side && turn.kickIndex === idx;
          const isUserScheduled = isUserSide && (idx % 11 === so.userSlot);
          const extra = idx >= 5 ? ' is-alt' : '';
          if (k) {
            const cls = k.scored ? 'is-goal' : 'is-miss';
            const title = `${idx + 1}ª: ${k.kicker} — ${k.detail}`;
            return `<span class="so-pip ${cls}${extra}${k.isUser ? ' is-user-pip' : ''}" title="${esc(title)}">${k.scored ? '✓' : '×'}</span>`;
          }
          if (isCurrent) {
            return `<span class="so-pip is-current${extra}${isUserScheduled ? ' is-user-pip' : ''}" title="Cobrança atual">${isUserScheduled ? '★' : idx + 1}</span>`;
          }
          return `<span class="so-pip is-pending${extra}${isUserScheduled ? ' is-user-pip' : ''}" title="${isUserScheduled ? `Sua vez (${idx + 1}ª cobrança)` : `${idx + 1}ª cobrança`}">${isUserScheduled ? '★' : '·'}</span>`;
        }).join('');
      };

      const phaseBadge = so.suddenDeath
        ? '<span class="so-phase-tag is-sudden">Pênaltis alternados (morte súbita)</span>'
        : '<span class="so-phase-tag">Série inicial · 5 cobranças</span>';
      const cycleBadge = turn && turn.cycle > 1
        ? `<span class="so-phase-tag is-cycle">${turn.cycle}º ciclo · Todos os 11 cobraram</span>`
        : '';

      const firstClubName = so.firstSide === 'user' ? club.name : opp.name;
      const nextUserKickNum = Math.floor(Math.max(0, so.userKicks.length - so.userSlot - 1) / 11 + (so.userKicks.length > so.userSlot ? 1 : 0)) * 11 + so.userSlot + 1;
      const orderInfo = so.winner
        ? `Disputa encerrada após ${Math.max(so.userKicks.length, so.oppKicks.length)} ${Math.max(so.userKicks.length, so.oppKicks.length) === 1 ? 'rodada' : 'rodadas'}.`
        : so.userKicks.length <= so.userSlot
          ? `Sua ordem na lista: <strong>${so.userSlot + 1}ª cobrança</strong> de ${esc(club.name)} · ${esc(firstClubName)} abre a disputa.`
          : `Você já cobrou neste ciclo · Volta a bater na <strong>${nextUserKickNum}ª cobrança</strong> (após todos os 11 jogadores cobrarem).`;

      let lastHtml = '';
      if (so.lastEvent) {
        const ev = so.lastEvent;
        const evClub = ev.side === 'user' ? club : opp;
        lastHtml = `<div class="so-last ${ev.scored ? 'is-goal' : 'is-miss'}">
          <strong>${ev.scored ? '✓' : '×'} ${ev.order}ª de ${esc(evClub.name)} · ${esc(ev.kicker)}${ev.isUser ? ' (Você)' : ''}</strong>
          <span>${esc(ev.detail)}</span>
        </div>`;
      }

      let stageHtml = '';
      if (so.winner) {
        const winnerClub = so.winner === 'user' ? club : opp;
        const userWon = so.winner === 'user';
        const outcomeTitle = so.isFinal
          ? (userWon ? `${winnerClub.name} é CAMPEÃO nos pênaltis!` : `${winnerClub.name} conquista o título nos pênaltis`)
          : (userWon ? `${winnerClub.name} avança nos pênaltis!` : `${club.name} eliminado nos pênaltis`);
        stageHtml = `<div class="so-stage ${userWon ? 'is-win' : 'is-loss'}">
          <strong>${esc(outcomeTitle)}</strong>
          <span>Placar dos pênaltis: ${homePen} × ${awayPen}</span>
          <div class="so-actions">${button('shootout-finish', 'Continuar', 'accent')}</div>
        </div>`;
      }

      // Histórico intercalado em ordem cronológica reversa
      const allLogs = [];
      const maxLen = Math.max(so.userKicks.length, so.oppKicks.length);
      for (let i = 0; i < maxLen; i++) {
        const firstK = so.firstSide === 'user' ? so.userKicks[i] : so.oppKicks[i];
        const secondK = so.firstSide === 'user' ? so.oppKicks[i] : so.userKicks[i];
        if (firstK) allLogs.push({ side: so.firstSide, ...firstK });
        if (secondK) allLogs.push({ side: so.firstSide === 'user' ? 'opp' : 'user', ...secondK });
      }
      const logHtml = allLogs.length
        ? `<ol class="so-log">${allLogs.slice().reverse().map(ev => {
            const evClub = ev.side === 'user' ? club : opp;
            return `<li class="${ev.scored ? 'is-goal' : 'is-miss'}${ev.isUser ? ' is-user-row' : ''}">
              <span class="so-log-badge">${ev.scored ? '✓' : '×'}</span>
              <span><strong>${ev.order}ª · ${esc(evClub.abbr)} · ${esc(ev.kicker)}${ev.isUser ? ' ★' : ''}</strong><small>${esc(ev.detail)}${ev.cycle > 1 ? ` · ${ev.cycle}º ciclo` : ''}</small></span>
            </li>`;
          }).join('')}</ol>`
        : '<p class="career-note">Os jogadores se posicionam no círculo central para iniciar a disputa.</p>';

      const subLine = `${esc(play.competitionName)} · ${esc(play.phaseLabel)} · Tempo normal: ${homeNorm} × ${awayNorm}${so.aggText ? ` · ${esc(so.aggText)}` : ''}`;

      activate('shootout', 'Disputa de Pênaltis', `
        <p class="so-subtitle">${subLine}</p>
        <div class="result-score so-scoreboard">
          <div>${medal(homeClub)}<strong>${esc(homeClub.name)}</strong></div>
          <div class="so-score-center">
            <strong aria-label="Placar dos pênaltis">${homePen} × ${awayPen}</strong>
            <div class="so-phase-row">${phaseBadge}${cycleBadge}</div>
          </div>
          <div>${medal(awayClub)}<strong>${esc(awayClub.name)}</strong></div>
        </div>
        <div class="so-tracker">
          <div class="so-track-row">
            <span class="so-track-team">${medal(homeClub, 18)}<strong>${esc(homeClub.abbr)}</strong></span>
            <div class="so-pips">${renderPips(homeSide)}</div>
          </div>
          <div class="so-track-row">
            <span class="so-track-team">${medal(awayClub, 18)}<strong>${esc(awayClub.abbr)}</strong></span>
            <div class="so-pips">${renderPips(awaySide)}</div>
          </div>
        </div>
        <p class="so-order-note">${orderInfo}</p>
        ${lastHtml}
        ${stageHtml}
        <h3 class="result-replay-title">Cobranças</h3>
        ${logHtml}`, 'shootout-stay');

    }

    function matchKey(match,club){
      return [save.seed,save.year,match.kind,match.round??0,club,match.opponent].join(':');
    }

    function resultScreen(){
      const match=save?.last, review=match?.review;
      const club=season.team(review?.club),opponent=season.team(match?.opponent);
      if(!club||!opponent||!review?.key){hub();return;}
      api.preview(null);
      const home=match.home?club:opponent,away=match.home?opponent:club;
      const score=match.home?[match.forGoals,match.against]:[match.against,match.forGoals];
      const outcomes={goal:'Gol',assist:'Assistência',ownGoal:'Gol contra',teamGoal:'Gol do companheiro',save:'Defesa ou bloqueio',out:'Bola fora',time:'Tempo esgotado'};
      const types={play:'Bola rolando',penalty:'Pênalti',freeKick:'Falta com barreira'};
      const rows=Array.from({length:match.chances},(_,i)=>{
        const clip=reviewClips?.[i];
        const label=clip?`${types[clip.kind]} · ${outcomes[clip.outcome]??''}`:reviewClips?'Replay indisponível':'Carregando replay…';
        return `<button type="button" class="result-replay" data-action="watch-chance" data-index="${i}" ${clip?'':'disabled'}>
          <strong>Chance ${i+1}</strong><span>${label}</span><span aria-hidden="true">▶</span></button>`;
      }).join('');
      const penLine = match.penalties ? `<small class="result-penalties">Pênaltis: ${match.penalties.h} × ${match.penalties.a}</small>` : '';
      const xp=match.xpAward;
      const earnedPoints=xp?.attributePoints??(xp?.upgrades?xp.upgrades*season.ATTRIBUTE_POINTS_PER_LEVEL:0);
      const xpResult=xp?`<section class="result-xp"><h3>+${xp.total} XP</h3><p>Partida +${xp.base} XP · Objetivos +${xp.bonus} XP${xp.upgrades?` · ${xp.upgrades} ${xp.upgrades>1?'evoluções':'evolução'} (+${earnedPoints} pts de atributo)`:''}</p><div>${xp.objectives.map(objective=>`<div class="result-objective${objective.complete?' is-complete':''}"><span>${objective.complete?'✓':'○'} ${objective.label}</span><strong>${objective.complete?'+':''}${objective.complete?objective.reward:0} XP</strong></div>`).join('')}</div></section>`:'';
      activate('result','Fim de jogo',`<div class="result-score"><div>${medal(home)}<strong>${home.name}</strong></div>
        <div class="result-score-mid"><strong aria-label="Placar final">${score[0]} × ${score[1]}</strong>${penLine}</div><div>${medal(away)}<strong>${away.name}</strong></div></div>
        ${xpResult}<div class="result-continue">${button('close-result','Continuar','accent')}</div>
        <h3 class="result-replay-title">Replays das chances</h3><div class="result-replays">${rows}</div>`,'close-result');
      if(reviewClips)return;
      Promise.all(Array.from({length:match.chances},(_,i)=>window.careerReplayStore.read(review.key,i+1))).then(clips=>{
        if(screen!=='result'||save?.last?.review?.key!==review.key)return;
        reviewClips=clips;
        resultScreen();
      });
    }

    function controls(origin = 'home') {
      activate('controls','Controles',controlPanel(),origin === 'match' ? 'return-match' : 'home');
    }

    function leaveMatch() {
      const wasCareer = api.leaveMatch();
      if(save?.pending?.training){
        save.pending.abandoned=true;
        journey.finishDrill(save,save.pending);
        save.lastTraining={...save.pending,unseen:false};save.pending=null;
        hubTab='practice';practiceTab='challenges';persist();
      }
      if (wasCareer && save) {
        hub();
        if(screen==='hub'&&hubTab==='practice')focusOption(content.querySelector('[data-action="career-training"]'),{preventScroll:true});
      }else home();
    }

    function previewItem(id) {
      if(screen!=='hub'||hubTab!=='player'||playerTab!=='shop')return;
      const item=season.shop.find(entry=>entry.id===id);
      const preview=item?{...save.player.look,[item.key]:item.index}:save.player.look;
      api.preview(season.paint(preview,season.team(save.club)),-.22);
      content.querySelectorAll('[data-item]').forEach(element=>element.classList.toggle('is-previewing',element.dataset.item===id));
    }

    function equipItem(id,justPurchased=false) {
      const item=season.shop.find(entry=>entry.id===id);
      if(!item||!save.owned.includes(item.id))return;
      season.edit(save,save.player.name,{...save.player.look,[item.key]:item.index});
      if(!justPurchased)markShopItemSeen(id);
      persist();
      hub(justPurchased?id:null);
      focusOption(content.querySelector(`button[data-item="${id}"]`));
    }

    function dispatch(action, target, holdConfirmed=false) {
      switch (action) {
        case 'home': home(); break;
        case 'career': gateway(); break;
        case 'controls': controls(); break;
        case 'training-player-paused':
          pauseMenu.hidden=true;
          trainingPlayerScreen();
          break;
        case 'return-practice-pause':
          api.updateTrainingPlayer(trainingPlayer);
          activate('game');
          pauseMenu.hidden=false;
          focusOption(document.querySelector('#trainingPlayerSetup'));
          break;
        case 'training': careerPractice=false; activate('game'); api.train(trainingPlayer); break;
        case 'training-stadium': openTrainingStadium(target); break;
        case 'career-training': {
          if(!save)break;
          careerPractice=true;
          activate('game');
          const cObj=season.team(save.club??save.trial);
          const S=window.goatStadiums;
          const autoId=S?S.forClub(cObj,save.round||0):'arena-brasa';
          const chosen=(trainingPlayer.careerStadiumId&&trainingPlayer.careerStadiumId!=='club-auto')?trainingPlayer.careerStadiumId:autoId;
          api.train({attributes:save.player.attributes,appearance:season.paint(save.player.look,cObj),
            fromCareer:true,club:cObj,stadiumId:chosen,playerName:save.player.name});
          break;
        }
        case 'create': creator(); break;
        case 'load': hubTab='games';playerTab='profile';selectedCompId=null;compPhase='table';selectedGroup='ALL';selectedKoRound=null;newsTab='all';
          if(save?.last?.review){reviewClips=null;resultScreen();}else hub();
          break;
        case 'save-look':
          if (screen !== 'creator') break;
          if(editing)season.edit(save,creatorName,look);
          else save = season.create({ name: creatorName, look }, (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0);
          persist(); if(editing)hub();else careerOrigin(); break;
        case 'origin-league':
          originLeague=target.dataset.league;careerOrigin();focusOption(content.querySelector(`[data-league="${originLeague}"]`),{preventScroll:true});break;
        case 'origin-trial':
          if(!holdConfirmed)break;
          save.player.nationality='BR';
          save.origin='trial';persist();hub();break;
        case 'origin-club':
          if(!holdConfirmed)break;
          save.player.nationality='BR';
          if(season.joinAcademy(save,target.dataset.team)){persist();hub();}break;
        case 'callup-complete':
          save.worldCup.callup.seen=true;persist();hub();break;
        case 'training-challenge': {
          if(!holdConfirmed)break;
          const drillMatch=journey.startDrill(save,target.dataset.drill);
          if(drillMatch){save.pending=drillMatch;persist();match();}
          break;
        }
        case 'trial': if (season.selectTrial(save,target.dataset.team)) match(); break;
        case 'contract': if (season.contract(save,target.dataset.team)) { persist(); hubTab = 'games'; selectedCompId = null; hub(); } break;
        case 'continue': match(); break;
        case 'shootout-finish': {
          const current = save?.pending;
          if (current?.shootout?.winner) {
            const club = current.playingClub??save.club;
            const review = { club, key: matchKey(current, club) };
            season.finishMatch(save, current);
            save.last.review = review;
            persist();
          }
          hubTab = 'games';
          reviewClips = null;
          resultScreen();
          break;
        }
        case 'close-result': {
          const match=save?.last,review=match?.review;
          if(!review)break;
          delete match.review;
          window.careerReplayStore.clear(review.key,match.chances);
          reviewClips=null;
          persist();hub();break;
        }
        case 'watch-chance': {
          const index=Number(target.dataset.index),clip=reviewClips?.[index],match=save?.last;
          if(!clip||!match?.review)break;
          activate('review');
          if(!api.playReplay(clip,season.team(match.review.club),season.team(match.opponent),index+1))resultScreen();
          break;
        }
        case 'new-season': if(season.newSeason(save)){hubTab='games';selectedCompId=null;compPhase='table';selectedGroup='ALL';selectedKoRound=null;persist();hub();}break;
        case 'player-edit': if(save?.club)creator(true);break;
        case 'player-profile': case 'player-shop': case 'player-awards': case 'player-market':
          hubTab='player';playerTab=action.slice(7);hub();focusOption(content.querySelector(`[data-action="${action}"]`));break;
        case 'buy': case 'preview-item':
          previewItem(target.dataset.item);
          if(markShopItemSeen(target.dataset.item))updateAlerts();
          break;
        case 'equip': equipItem(target.dataset.item);break;
        case 'return-match': activate('game'); api.closeControls(); break;
        case 'comp-select':
          selectedCompId=target.dataset.comp;
          {
            const c=save?.competitions?.[selectedCompId];
            compPhase=c?.format==='groups-knockout'?'groups':c?.format==='knockout'?'knockout':'table';
          }
          selectedGroup='ALL';selectedKoRound=null;
          hub();focusOption(content.querySelector(`[data-action="comp-select"][data-comp="${selectedCompId}"]`),{preventScroll:true});break;
        case 'comp-phase':
          compPhase=target.dataset.phase;selectedKoRound=null;
          hub();focusOption(content.querySelector(`[data-action="comp-phase"][data-phase="${compPhase}"]`),{preventScroll:true});break;
        case 'comp-group':
          selectedGroup=target.dataset.group;
          hub();focusOption(content.querySelector(`[data-action="comp-group"][data-group="${selectedGroup}"]`),{preventScroll:true});break;
        case 'ko-round':
          selectedKoRound=Number(target.dataset.round);
          hub();focusOption(content.querySelector(`[data-action="ko-round"][data-round="${selectedKoRound}"]`),{preventScroll:true});break;
        case 'games-stat-goals': case 'games-stat-assists':
          gamesStatTab=action.slice(11);
          hub();focusOption(content.querySelector(`[data-action="${action}"]`),{preventScroll:true});break;
        case 'news-all': case 'news-club': case 'news-player':
          newsTab=action.slice(5);hub();focusOption(content.querySelector(`[data-action="${action}"]`));break;
        case 'practice-free': case 'practice-challenges':
          practiceTab=action.slice(9);hub();focusOption(content.querySelector(`[data-action="${action}"]`),{preventScroll:true});break;
        case 'tab-games': case 'tab-tournaments': case 'tab-player': case 'tab-news': case 'tab-practice':
          hubTab=action.slice(4);
          hub();focusOption(content.querySelector(`[data-action="${action}"]`),{preventScroll:true});break;
      }
    }

    function refreshLook() {
      const paint = orbitPaint = season.paint(look,editing?season.team(save.club):null);
      for (const [key,color] of [['skin',paint.skin],['hair',paint.hairColor],['beard',paint.beardColor]]) {
        content.style.setProperty('--preview-'+key,color);
      }
      api.preview(paint, orbitAngle*Math.PI/180);
    }
    function click(event) {
      const row=screen==='training-player'?event.target.closest('[data-training-stat]'):null;
      if(row){
        if(event.target.matches('input[type="range"]'))return;
        focusOption(row,{preventScroll:true});
        const step=event.target.closest('[data-training-step]');
        if(step&&event.detail===0&&step.getAttribute('aria-disabled')!=='true')adjustTrainingRating(row,Number(step.dataset.trainingStep));
        return;
      }
      const target = event.target.closest('button');
      if (!target || target.disabled) return;
      if (target.dataset.action) dispatch(target.dataset.action,target);
      if(screen==='creator'&&target.dataset.lookSection)selectCreatorSection(target.dataset.lookSection);
      if(screen==='creator'&&target.dataset.orbit&&event.detail===0)rotate(Number(target.dataset.orbit)*18);
      if(screen==='creator'&&target.dataset.slide){
        const track=target.parentElement.querySelector('.look-thumbnails');
        track.scrollBy({left:Number(target.dataset.slide)*Math.max(33,track.clientWidth),behavior:'smooth'});
      }
      if (screen === 'creator' && target.dataset.look) {
        const key = target.dataset.look;
        look[key] = Number(target.dataset.index);
        const group = season.appearance[key];
        content.querySelector(`[data-selection="${key}"]`).textContent = (group.names ?? group.values)[look[key]];
        content.querySelectorAll(`button[data-look="${key}"]`).forEach(el=>el.setAttribute('aria-pressed', String(el===target)));
        refreshLook();
      }
    }
    menu.addEventListener('click', click);
    content.addEventListener('click', click);
    pauseMenu.addEventListener('click', click);
    for (const root of [menu, content, pauseMenu]) {
      root.addEventListener('focusin', event => {
        if (event.target.matches('button, input, select, .standings-scroll, .hub-content[tabindex], [data-training-stat]')) showFocus(event.target);
        if (event.target.matches('.look-thumbnail')) revealThumbnail(event.target);
      });
    }
    content.addEventListener('focusin',event=>previewItem(event.target.dataset.item));
    content.addEventListener('pointerover',event=>{
      const item=event.target.closest('[data-item]');
      if(item&&item!==event.relatedTarget?.closest?.('[data-item]'))previewItem(item.dataset.item);
    });
    content.addEventListener('pointermove',event=>{
      if(screen!=='hub'||hubTab!=='player'||playerTab!=='shop'||event.buttons||!(event.movementX||event.movementY))return;
      const item=event.target.closest('[data-item][data-unread]');
      if(item&&markShopItemSeen(item.dataset.item))updateAlerts();
    });
    content.addEventListener('pointerout',event=>{
      if(event.target.closest('[data-item]')&&!event.relatedTarget?.closest?.('[data-item]')&&!holdButton){
        previewItem(document.activeElement?.dataset.item);
      }
    });
    content.addEventListener('input', event => {
      const target = event.target;
      if(screen==='training-player'&&target.matches('.training-range')){
        adjustTrainingRating(target.closest('[data-training-stat]'),0,target.valueAsNumber);
        return;
      }
      if (screen !== 'creator') return;
      if (target.id === 'athleteName') creatorName = target.value;
    });
    content.addEventListener('scroll',event=>{
      if(event.target.classList.contains('look-thumbnails'))syncCarousel(event.target);
    },true);
    function stopTrainingStep(event){
      if(event?.pointerId!=null&&event.pointerId!==trainingStepPointer)return;
      clearTimeout(trainingStepTimer);
      trainingStepTimer=null;
      trainingStepPointer=null;
    }
    content.addEventListener('pointerdown', event => {
      if(event.button!==0)return;
      const step=event.target.closest('[data-training-step]');
      if(step&&screen==='training-player'&&step.getAttribute('aria-disabled')!=='true'){
        stopTrainingStep();
        trainingStepPointer=event.pointerId;
        step.setPointerCapture(event.pointerId);
        const row=step.closest('[data-training-stat]');
        focusOption(row,{preventScroll:true});
        const repeat=()=>{
          if(step.getAttribute('aria-disabled')==='true')return;
          adjustTrainingRating(row,Number(step.dataset.trainingStep));
          trainingStepTimer=setTimeout(repeat,85);
        };
        adjustTrainingRating(row,Number(step.dataset.trainingStep));
        if(row.dataset.trainingStat!=='dominantFoot')trainingStepTimer=setTimeout(repeat,300);
        return;
      }
      const orbitButton=event.target.closest('[data-orbit]');
      if(orbitButton&&screen==='creator'){
        startOrbitHold(orbitButton,event);
        return;
      }
      const el = event.target.closest('[data-hold="true"]');
      if (!el) return;
      el.setPointerCapture?.(event.pointerId);
      beginHold(el);
    });
    for (const type of ['pointerup','pointercancel','lostpointercapture']){
      content.addEventListener(type,endHold);
      content.addEventListener(type,stopOrbitHold);
      content.addEventListener(type,stopTrainingStep);
    }
    content.addEventListener('focusout', event => {
      if (event.target === holdButton) endHold();
    });
    content.addEventListener('keydown', event => {
      if(screen==='creator'&&event.target.id==='athleteName'&&event.code==='ArrowDown'){
        event.preventDefault();focusOption(content.querySelector('[data-look-section][aria-pressed="true"]'),{preventScroll:true});
      }
      if(screen==='training-player'&&!event.target.matches('.training-range')){
        const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.code];
        if(direction&&moveTrainingSelection(event.target,...direction))event.preventDefault();
      }
      if (event.target.dataset.hold === 'true' && ['Space','Enter'].includes(event.code)) {
        event.preventDefault();
        if (!event.repeat) beginHold(event.target);
      }
    });
    content.addEventListener('keyup', event => {
      if (event.target.dataset.hold === 'true' && ['Space','Enter'].includes(event.code)) { event.preventDefault(); endHold(); }
    });
    window.addEventListener('blur',endHold);
    window.addEventListener('blur',stopOrbitHold);
    window.addEventListener('blur',stopTrainingStep);

    function back() {
      if(screen==='review'){api.leaveMatch();resultScreen();return;}
      if (screen === 'home' || screen === 'game' || screen === 'shootout') return;
      dispatch(content.querySelector('button.quiet')?.dataset.action);
    }

    function direction(buttons, vertical, horizontal) {
      const digitalX = Number(!!buttons[15]) - Number(!!buttons[14]);
      const digitalY = Number(!!buttons[13]) - Number(!!buttons[12]);
      if (digitalY) return [0, digitalY];
      if (digitalX) return [digitalX, 0];
      if (nav.x && horizontal * nav.x > .38) return [nav.x, 0];
      if (nav.y && vertical * nav.y > .38) return [0, nav.y];
      if (Math.max(Math.abs(horizontal), Math.abs(vertical)) < .58) return [0, 0];
      return Math.abs(vertical) >= Math.abs(horizontal) ? [0, Math.sign(vertical)] : [Math.sign(horizontal), 0];
    }

    function moveFocus(elements, active, x, y) {
      const index = elements.indexOf(active);
      if (index < 0) {
        focusOption(elements[0]);
        return;
      }
      const a = active.getBoundingClientRect();
      let best = null, bestScore = Infinity;
      for (const element of elements) {
        if (element === active) continue;
        const r = element.getBoundingClientRect();
        const dx = r.left + r.width / 2 - a.left - a.width / 2;
        const dy = r.top + r.height / 2 - a.top - a.height / 2;
        const along = dx * x + dy * y;
        if (along <= 4) continue;
        const cross = Math.abs(x ? dy : dx);
        const score = along + cross * 3;
        if (score < bestScore) {
          best = element;
          bestScore = score;
        }
      }
      const fallback = elements[(index + (x || y) + elements.length) % elements.length];
      focusOption(best ?? (screen==='creator'?active:fallback));
    }

    function switchHubTab(direction,submenu) {
      const selector=submenu?'.hub-subtabs button':'.hub-tabs:not(.hub-subtabs) button';
      const tabs=[...content.querySelectorAll(selector)];
      if(tabs.length<2)return;
      const selected=tabs.find(button=>button.getAttribute('aria-pressed')==='true');
      const index=tabs.indexOf(selected);
      const target=tabs[(index+direction+tabs.length)%tabs.length];
      target.click();
    }

    function gamepad(buttons, vertical, horizontal, now = performance.now()) {
      const confirm = !!buttons[0], goBack = !!buttons[1];
      const [x, y] = screen === 'game' && pauseMenu.hidden ? [0, 0] : direction(buttons, vertical, horizontal);
      const previous = nav;
      const changed = x !== previous.x || y !== previous.y;
      const moving = (x || y) && (changed || now >= previous.repeatAt);
      const shoulders=[4,5,6,7].map(index=>!!buttons[index]);
      const [lb,rb,lt,rt]=shoulders.map((pressed,index)=>Number(pressed&&!previous.shoulders[index]));
      nav = { confirm, back: goBack, x, y, shoulders, repeatAt: moving ? now + (changed ? firstRepeat : repeatInterval) : previous.repeatAt };
      if(stadiumDialog.open){
        if(goBack&&!previous.back){stadiumDialog.close();return;}
        const options=[...stadiumDialog.querySelectorAll('button')];
        const active=document.activeElement;
        if(confirm&&!previous.confirm)active?.click();
        else if(moving)moveFocus(options,active,x,y);
        return;
      }
      if (!confirm && previous.confirm && holdButton) endHold();
      if(screen==='review'){
        if((goBack&&!previous.back)||(confirm&&!previous.confirm))back();
        return;
      }
      if (screen === 'game' && pauseMenu.hidden) return;
      if (screen === 'creator') {
        rotateWithBumpers(buttons,now);
        if(rt!==lt){switchCreatorSection(rt-lt);return;}
      }
      if(screen==='hub'&&(rb!==lb||rt!==lt)){
        if(rb!==lb)switchHubTab(rb-lb,false);
        else switchHubTab(rt-lt,true);
        return;
      }
      if (!(moving || confirm && !previous.confirm || goBack && !previous.back)) return;
      if (goBack && !previous.back) {
        if (screen === 'game') document.querySelector('#resume').click();
        else back();
        return;
      }
      const current = screen === 'game' ? pauseMenu : screen === 'home' ? menu : content;
      const elements = [...current.querySelectorAll('button:not(:disabled):not([data-training-step]),input:not(:disabled):not(.training-range),select:not(:disabled),.standings-scroll,.hub-content[tabindex],[data-training-stat]')].filter(element=>!element.closest('[hidden]'));
      const active = elements.includes(document.activeElement) ? document.activeElement
        : elements.includes(focusedOption) ? focusedOption : null;
      if (active) showFocus(active);
      if (confirm && !previous.confirm) {
        if (!active) focusOption(elements[0]);
        else if (active.dataset.hold === 'true') beginHold(active);
        else if (active.tagName === 'BUTTON') active.click();
        else if(!active.matches('[data-training-stat]'))focusOption(elements[elements.indexOf(active) + 1]);
        return;
      }
      if (confirm || goBack) return;
      if(screen==='creator'&&moveCreatorSelection(active,x,y))return;

      if(screen==='training-player'&&moveTrainingSelection(active,x,y))return;
      if (y && active?.matches('.standings-scroll, .hub-content[tabindex]')) {
        const bottom = active.scrollHeight - active.clientHeight;
        if (y < 0 ? active.scrollTop > 1 : active.scrollTop < bottom - 1) {
          active.scrollTop += y * 42;
          return;
        }
      }
      moveFocus(elements,active,x,y);
    }

    function rotate(amount) {
      orbitAngle = (orbitAngle + amount + 540) % 360 - 180;
      api.preview(orbitPaint,orbitAngle*Math.PI/180);
    }

    function startOrbitHold(button,event) {
      if(orbitHold||!event.isPrimary)return;
      button.setPointerCapture(event.pointerId);
      const held={button,pointerId:event.pointerId,last:performance.now(),frame:0};
      const turn=Number(button.dataset.orbit);
      orbitHold=held;
      rotate(turn*12);
      function advance(now){
        if(orbitHold!==held)return;
        rotate(turn*Math.min(40,Math.max(0,now-held.last))*.17);
        held.last=now;
        held.frame=requestAnimationFrame(advance);
      }
      held.frame=requestAnimationFrame(advance);
    }

    function stopOrbitHold(event) {
      if(!orbitHold||event?.pointerId!=null&&event.pointerId!==orbitHold.pointerId)return;
      const {button,pointerId,frame}=orbitHold;
      orbitHold=null;
      cancelAnimationFrame(frame);
      if(button.hasPointerCapture(pointerId))button.releasePointerCapture(pointerId);
    }

    function moveCreatorSelection(active,x,y) {
      const tab=content.querySelector('[data-look-section][aria-pressed="true"]');
      const groups=[...content.querySelectorAll('[data-look-panel]:not([hidden]) .look-group')];
      const selected=group=>group?.querySelector('[data-look][aria-pressed="true"]');
      if(active?.dataset.lookSection){
        if(x)switchCreatorSection(x);
        else if(y>0)focusOption(selected(groups[0]),{preventScroll:true});
        else if(y<0)focusOption(content.querySelector('#athleteName'),{preventScroll:true});
        return true;
      }
      if(active?.id==='athleteName'){
        if(y>0)focusOption(tab,{preventScroll:true});
        return true;
      }
      if(active?.dataset.action==='save-look'){
        if(y<0)focusOption(selected(groups.at(-1)),{preventScroll:true});
        return true;
      }
      const group=active?.closest('.look-group');
      if(!group)return false;
      if(x){
        const choices=[...group.querySelectorAll('[data-look]')];
        const current=active.matches('[data-look]')?choices.indexOf(active):choices.findIndex(choice=>choice.getAttribute('aria-pressed')==='true');
        const next=choices[Math.max(0,Math.min(choices.length-1,current+x))];
        if(next){focusOption(next,{preventScroll:true});next.click();}
        return true;
      }
      if(y){
        const next=groups[groups.indexOf(group)+y];
        focusOption(next?selected(next):y<0?tab:content.querySelector('[data-action="save-look"]'),{preventScroll:true});
        return true;
      }
      return false;
    }

    function selectCreatorSection(id) {
      for(const tab of content.querySelectorAll('[data-look-section]')){
        const selected=tab.dataset.lookSection===id;
        tab.setAttribute('aria-pressed',String(selected));
        tab.setAttribute('aria-selected',String(selected));
      }
      for(const fields of content.querySelectorAll('[data-look-panel]')){
        fields.hidden=fields.dataset.lookPanel!==id;
        if(!fields.hidden)fields.querySelectorAll('.look-thumbnails').forEach(layoutCarousel);
      }
    }

    function switchCreatorSection(direction) {
      const tabs=[...content.querySelectorAll('[data-look-section]')];
      const index=tabs.findIndex(tab=>tab.getAttribute('aria-pressed')==='true');
      const next=tabs[Math.max(0,Math.min(tabs.length-1,index+direction))];
      if(next){selectCreatorSection(next.dataset.lookSection);next.scrollIntoView({block:'nearest',inline:'nearest'});focusOption(content.querySelector('[data-look-panel]:not([hidden]) [data-look][aria-pressed="true"]'),{preventScroll:true});}
    }

    function rotateWithKey(event) {
      if(!['creator','origin'].includes(screen)||event.target.matches('input,select'))return;

      const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.code];
      if(!direction)return;
      event.preventDefault();
      if(screen==='creator'&&event.altKey){rotate(direction[0]*12);return;}
      if(screen==='creator'&&moveCreatorSelection(document.activeElement,...direction))return;
      const elements=[...content.querySelectorAll('button:not(:disabled),input,select')].filter(el=>!el.closest('[hidden]'));
      moveFocus(elements,document.activeElement,...direction);
    }

    function rotateWithBumpers(buttons, now) {
      const turn = Number(!!buttons[5]) - Number(!!buttons[4]);
      if (turn !== orbitDirection) orbitHeldAt = now;
      const amount = turn !== orbitDirection ? 18 : now-orbitHeldAt>170 ? Math.min(now-orbitLast,40)*.17 : 0;
      orbitDirection = turn;
      orbitLast = now;
      if (!turn || !amount) return;
      rotate(turn*amount);
    }

    function commit(outcome, shots, ratingEvents) {
      const current = save.pending;
      if(current?.training){
        season.recordRatingEvents(current,ratingEvents);
        current.used++;current.shots+=shots;
        if(outcome==='goal'){current.goals++;current.forGoals++;}
        else if(outcome==='assist'){current.assists=(current.assists??0)+1;current.forGoals++;}
        else if(outcome==='teamGoal'||outcome==='ownGoal')current.forGoals++;
        const complete=current.used>=current.chances;
        if(complete){journey.finishDrill(save,current);save.lastTraining={...current,unseen:true};save.pending=null;}
        persist();return complete;
      }
      const club=current.kind==='trial'?save.trial:current.playingClub??save.club;
      season.recordRatingEvents(current,ratingEvents);
      const complete = season.chance(save, outcome, shots);
      if (complete){
        if (season.needsPenaltyShootout(save, current)) {
          season.createShootout(save, current);
          persist();
          return 'shootout';
        }
        const review={club,key:matchKey(current,club)};
        season.finishMatch(save,current);
        save.last.review=review;
      }
      persist();
      return complete;
    }

    function commitShootoutKick(outcome, hitPost, ratingEvents) {
      const current = save?.pending;
      if (!current?.shootout) return;
      const scored = outcome === 'goal';
      const detail = scored
        ? 'Gol!'
        : outcome === 'save'
          ? 'Defesa do goleiro!'
          : outcome === 'time'
            ? 'Tempo esgotado!'
            : hitPost
              ? 'Na trave!'
              : 'Pra fora!';
      season.recordRatingEvents(current,ratingEvents);
      season.recordShootoutKick(current, scored, detail);
      persist();
    }

    function returnToShootout() {
      api.leaveMatch();
      shootoutScreen();
    }

    function awardSetPiece(piece,shots,ratingEvents) {
      if(!save?.pending||save.pending.penalty||save.pending.setPiece)return false;
      save.pending.penalty=piece.kind==='penalty';
      save.pending.setPiece=piece.kind==='freeKick'?piece:null;
      save.pending.shots+=shots;
      season.recordRatingEvents(save.pending,ratingEvents);
      persist();
      return true;
    }

    function finish() {
      api.leaveMatch();
      if(save?.lastTraining?.unseen){
        save.lastTraining.unseen=false;hubTab='practice';practiceTab='challenges';persist();hub();return;
      }
      if (save?.pending?.shootout && !save.pending.shootout.winner) {
        startShootoutField();
        return;
      }
      hubTab = 'games';
      reviewClips=null;
      resultScreen();
    }

    home();
    document.querySelector('#replayExit').onclick=back;
    return { get screen(){return screen;}, get creatorFrame(){return creatorFrame;}, get stadiumOpen(){return stadiumDialog.open;},
      back, controls, leaveMatch, commit, commitShootoutKick, returnToShootout, awardSetPiece, finish, gamepad, rotateWithKey, persistIntro:persist };
  }

  window.createGoatCareer = createGoatCareer;
})();
