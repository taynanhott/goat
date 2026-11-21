(() => {
  'use strict';
  const data=window.goatFootballHypeData;
  const db=window.goatClubDatabase;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const normalize=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const players=Object.values(data.players.byId);
  const originalByName=new Map(db.clubs.map(club=>[normalize(club.name),club]));
  const importedById=new Map();
  const leagues=data.europeanLeagues.map(league=>({...league,code:'EU-'+league.country}));
  const countryNames=new Intl.DisplayNames(['pt-BR'],{type:'region'});
  const nationNames={ENG:'Inglaterra',SCO:'Escócia',WAL:'País de Gales',NIR:'Irlanda do Norte',XK:'Kosovo'};
  const rules=()=>window.goatCareerSeason;
  const mean=values=>values.reduce((sum,value)=>sum+value,0)/Math.max(1,values.length);
  function random(seed) {
    return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  }
  for(const input of Object.values(data.clubs.byId)){
    let club=originalByName.get(normalize(input.name));
    const roster=input.playerIds.map(id=>data.players.byId[id]).filter(Boolean);
    if(!club){
      club={id:'fh-'+input.id,name:input.name,abbr:input.abbreviation,country:input.country,
        league:input.country==='BR'?'CAT-BR':'INT',...input.kit};
      db.clubs.push(club);
    }
    Object.assign(club,{...input.kit,databaseId:input.id,coachName:input.coachName,
      players:roster.map(player=>[player.name,player.position,player.overall,player.id]),
      strength:Math.round(mean(roster.map(player=>player.overall).sort((a,b)=>b-a).slice(0,11))||input.leagueStrength)});
    importedById.set(input.id,club);
  }
  for(const [country,id,name] of [['PT','liga-portugal','Liga Portugal'],['NL','eredivisie','Eredivisie']]){
    const clubs=[...importedById.values()].filter(club=>club.country===country&&club.players.length>=11)
      .sort((a,b)=>b.strength-a.strength).slice(0,18).map(club=>club.name);
    if(clubs.length>=12)leagues.push({id,name,country,code:'EU-'+country,clubs});
  }
  for(const league of leagues){
    league.teamIds=league.clubs.map(name=>db.clubs.find(club=>club.country===league.country&&normalize(club.name)===normalize(name))?.id).filter(Boolean);
    for(const id of league.teamIds){const club=db.clubs.find(item=>item.id===id);club.league=league.code;club.european=true;}
  }
  const nationalPlayers=new Map();
  for(const player of players){
    const country=player.internationalNationality??player.nationality;
    if(!nationalPlayers.has(country))nationalPlayers.set(country,[]);
    nationalPlayers.get(country).push(player);
  }
  const countries=[...nationalPlayers].filter(([,roster])=>roster.length>=11).map(([code,roster])=>({code,roster,
    name:nationNames[code]??countryNames.of(code),strength:Math.round(mean(roster.map(player=>player.overall).sort((a,b)=>b-a).slice(0,11)))}));
  const nations=countries.sort((a,b)=>b.strength-a.strength||b.roster.length-a.roster.length).slice(0,48);
  if(!nations.some(nation=>nation.code==='BR'))nations[47]=countries.find(nation=>nation.code==='BR');
  const rosterPlan=[['GK',3],['CB',4],['LB',2],['RB',2],['MID',8],['ATT',7]];
  const groupOf=position=>position==='GK'?'GK':['CB','LB','RB'].includes(position)?position:['DM','CM','AM','LM','RM'].includes(position)?'MID':'ATT';
  function squad(code,year=2026){
    const nation=nations.find(item=>item.code===code);
    const selected=[];
    for(const [position,count] of rosterPlan){
      const available=(nationalPlayers.get(code)??[]).filter(player=>groupOf(player.position)===position&&player.age+year-2026<=(player.position==='GK'?42:39))
        .map(player=>({...player,age:player.age+year-2026,overall:clamp(player.overall-Math.max(0,player.age+year-2026-32),40,96)}))
        .sort((a,b)=>b.overall-a.overall||a.id.localeCompare(b.id));
      for(let i=0;i<count;i++){
        const real=available[i];
        selected.push(real?{id:real.id,name:real.name,position:real.position,overall:real.overall,generated:false}:
          {id:`generated-${code}-${position}-${i}`,name:`Jovem ${nation?.name??code} ${position} ${i+1}`,position:position==='MID'?'CM':position==='ATT'?'ST':position,
            overall:clamp((nation?.strength??60)-12-i,45,72),generated:true});
      }
    }
    return selected;
  }
  for(const nation of nations){
    const roster=squad(nation.code);
    db.clubs.push({id:'national-'+nation.code,name:nation.name,abbr:nation.code,country:nation.code,league:'NATIONAL',national:true,
      primary:nation.code==='BR'?'#f1c932':nation.code==='AR'?'#80cce3':'#'+(Math.imul(nation.code.charCodeAt(0)+nation.code.charCodeAt(1),51937)>>>0).toString(16).padStart(6,'0').slice(-6),
      secondary:'#f4f0df',pattern:nation.code==='AR'?'stripes':'solid',strength:nation.strength,
      players:roster.map(player=>[player.name,player.position,player.overall,player.id])});
  }
  function state(save){
    save.player.nationality='BR';
    save.player.position??='AM';
    save.selection??={points:60,training:null};
    save.selection.points=clamp(Number(save.selection.points)||0,0,100);
    save.internationalHistory??=[];
    return save.selection;
  }
  function status(save){
    const selection=state(save);
    const recent=save.ratingHistory.filter(entry=>entry.kind!=='trial'&&!entry.national).slice(-5);
    const average=recent.length?mean(recent.map(entry=>entry.rating)):7;
    return {points:selection.points,average,starter:selection.points>=60&&average>=6,
      label:average<6?'Questionado':selection.points>=60?'Titular':'Reserva'};
  }
  function postMatch(save,match){
    state(save);
    if(match.kind==='trial'||match.training||match.journeyRecorded)return;
    match.journeyRecorded=true;
    const rating=match.rating??6;
    const delta=rating<6?-Math.ceil((6-rating)*6+4):rating>=7?Math.min(8,Math.round((rating-6)*3)):1;
    save.selection.points=clamp(save.selection.points+delta,0,100);
    match.selectionDelta=delta;
    const cycle=`${save.year}-${save.round}-${match.scenario}`;
    const rng=random(match.scenario??save.seed);
    const options=['freeKick','penalty','finesse','outside'];
    save.selection.training={cycle,drills:[{id:cycle+'-collective',type:'collective',label:'Coletivo',attempts:4,target:0,status:'available'},
      {id:cycle+'-technical',type:options[Math.floor(rng()*options.length)],attempts:3,target:3,status:'available'}]};
    const date=match.date??dateOf(save.year,save.calendar[Math.max(0,save.calendarIndex-1)]?.time??0);
    const month=date.slice(0,7);
    const monthMatches=save.history.filter(entry=>!entry.national&&(entry.date??'').startsWith(month));
    const add=(kind,label)=>{
      if(!save.achievements.some(award=>award.kind===kind&&award.year===save.year&&award.league===label&&award.period===month))
        save.achievements.push({kind,club:save.club,league:label,year:save.year,period:month});
    };
    const monthComplete=save.stage==='complete'||save.calendar[save.calendarIndex]?.date?.slice(0,7)!==month;
    if(monthComplete&&monthMatches.length>=3&&mean(monthMatches.map(entry=>entry.rating??6))>=8)add('month',rules().nameOf(rules().leagueOf(save)));
    const important=Object.values(save.competitions).some(comp=>['champions-league','world-cup'].includes(comp.id)&&comp.knockout?.at(-2)?.some(tie=>tie.home===(comp.national?'national-'+save.player.nationality:save.club)||tie.away===(comp.national?'national-'+save.player.nationality:save.club)));
    if(save.stage==='complete'){
      const avg=rules().averageRating(save)??6;
      if(avg>=8&&save.personal.goals>=15)add(rules().team(save.club).country==='BR'?'brazil-player':'season-national',rules().team(save.club).country==='BR'?'Melhor jogador do Brasil':'Melhor jogador da liga');
      const eliteGoalLeader=['champions-league','world-cup'].some(id=>{
        const rows=rules().scorers(save,id);return rows[0]?.player&&rows[0].goals>(rows[1]?.goals??0)&&rows[0].goals>=5;
      });
      if(avg>=8.3&&(important||eliteGoalLeader))add('world-player','Melhor jogador do mundo');
    }
  }
  function availableDrills(save){
    const drills=state(save).training?.drills??[];
    for(const drill of drills)if(drill.type!=='collective'&&drill.status!=='complete')drill.target=drill.attempts;
    return drills;
  }
  const drillNames={collective:'Coletivo',freeKick:'Bolas paradas · faltas',penalty:'Bolas paradas · pênaltis',finesse:'Finalização colocada',outside:'Finalização de fora da área'};
  function startDrill(save,id){
    const drill=availableDrills(save).find(item=>item.id===id);
    if(!drill||drill.status!=='available'||save.pending)return null;
    drill.status='playing';
    return {kind:'training',training:{id,type:drill.type},opponent:'rival',home:true,round:save.round,
      competitionId:'training',competitionName:drillNames[drill.type],competitionShort:'Treino',phaseLabel:drillNames[drill.type],
      scenario:Math.floor(random(save.seed^save.round)()*2147483647),forGoals:0,against:0,chances:drill.attempts,used:0,
      goals:0,assists:0,shots:0,rating:6,ratingEvents:[],difficulty:'normal'};
  }
  function finishDrill(save,match){
    const drill=availableDrills(save).find(item=>item.id===match.training?.id);
    if(!drill||drill.status==='complete')return;
    const validGoals=(match.ratingEvents??[]).filter(event=>event.type==='goal'&&
      (drill.type!=='finesse'||event.finesse)&&(drill.type!=='outside'||event.outsideArea)).length;
    const rating=match.rating??6;
    const result=drill.type==='collective'?(rating>=9?3:rating>=8?2:rating>=7?1:rating<6?-Math.min(4,Math.ceil((6-rating)*2)):0):validGoals>=drill.attempts?3:validGoals>0?2:-2;
    const delta=match.abandoned?(match.used===0?0:Math.min(0,result)):result;
    Object.assign(drill,{status:'complete',goals:validGoals,rating:match.rating,delta});
    save.selection.points=clamp(save.selection.points+delta,0,100);
  }
  function restoreSquads(save){
    for(const nation of nations){
      const team=rules().team('national-'+nation.code);
      const roster=save.worldCup?.year===save.year&&save.worldCup.callup?.nationality===nation.code?save.worldCup.callup.roster:squad(nation.code,save.year);
      team.players=roster.filter(player=>!player.user).map(player=>[player.name,player.position,player.overall,player.id]);
      team.strength=Math.round(mean(roster.map(player=>player.overall).sort((a,b)=>b-a).slice(0,11)));
    }
  }
  function callup(save){
    state(save);
    restoreSquads(save);
    if(save.worldCup?.year===save.year&&save.worldCup.callup)return save.worldCup.callup;
    const nationality=save.player.nationality;
    const roster=squad(nationality,save.year);
    const mids=roster.filter(player=>groupOf(player.position)==='MID');
    const recent=save.ratingHistory.filter(entry=>entry.kind!=='trial'&&!entry.national).slice(-12);
    const average=recent.length?mean(recent.map(entry=>entry.rating)):6;
    const div=rules().leagueOf(save);
    const platform=String(div).startsWith('EU-')?6:div==='A'?0:div==='B'?-18:-27;
    const continental=recent.some(entry=>['champions-league','libertadores'].includes(entry.competitionId))?4:0;
    const form=clamp((average-7)*5,-10,15)+Math.min(4,(save.personal.goals+save.personal.assists)/Math.max(1,save.personal.matches)*2);
    const score=rules().overall(save.player.attributes)+platform+continental+form;
    const threshold=Math.min(...mids.map(player=>player.overall))+2;
    const played=recent.length>=8;
    const selected=played&&average>=7&&score>=threshold&&nations.some(nation=>nation.code===nationality);
    if(selected){
      const lowest=mids.slice().sort((a,b)=>a.overall-b.overall)[0];
      roster.splice(roster.indexOf(lowest),1,{id:'__user__',name:save.player.name,position:'AM',overall:rules().overall(save.player.attributes),user:true});
    }
    roster.sort((a,b)=>rosterPlan.findIndex(([group])=>groupOf(a.position)===group)-rosterPlan.findIndex(([group])=>groupOf(b.position)===group)||b.overall-a.overall);
    const result={selected,roster,nationality,score:Math.round(score),threshold:Math.round(threshold),average,seen:false,
      reason:!played?'É preciso uma sequência de pelo menos 8 partidas oficiais.':selected?'Seu desempenho e o nível das competições garantiram a convocação.':'O nível da liga, sua forma recente e a concorrência pesaram na decisão.'};
    save.worldCup={year:save.year,callup:result};
    const national=rules().team('national-'+nationality);
    if(national)national.players=roster.filter(player=>!player.user).map(player=>[player.name,player.position,player.overall,player.id]);
    return result;
  }
  function userTeam(save,comp){return comp?.national?(save.worldCup?.callup?.selected?'national-'+save.player.nationality:null):save.club;}
  function dateOf(year,time){return new Date(Date.UTC(year,0,10)+Math.round(time/1000*340)*86400000).toISOString().slice(0,10);}
  function calendar(save,slots){
    const cupYear=save.year%4===2;
    for(const slot of slots){
      if(cupYear&&slot.compId!=='world-cup'&&slot.time>=430)slot.time=570+(slot.time-430)*430/570;
    }
    if(cupYear){
      [430,446,462].forEach((time,round)=>slots.push({time,compId:'world-cup',stage:'group',round,leg:1}));
      [480,497,514,531,550].forEach((time,round)=>slots.push({time,compId:'world-cup',stage:'knockout',round,leg:1}));
    }
    slots.sort((a,b)=>a.time-b.time||a.compId.localeCompare(b.compId)||a.round-b.round||a.leg-b.leg);
    const occupied=new Map();
    for(const slot of slots){
      let day=Math.round(slot.time/1000*340)+9;
      const participants=save.competitions[slot.compId]?.participants??[];
      day=Math.max(day,...participants.map(id=>(occupied.get(id)??-2)+2));
      if(cupYear&&slot.compId!=='world-cup'&&day>=155&&day<=196)day=198;
      slot.date=new Date(Date.UTC(save.year,0,1)+day*86400000).toISOString().slice(0,10);
      for(const id of participants)occupied.set(id,day);
    }
    return slots.sort((a,b)=>a.date.localeCompare(b.date)||a.time-b.time||a.compId.localeCompare(b.compId));
  }
  function europeanProposals(save){
    const div=rules().leagueOf(save);
    if((div!=='A'&&!String(div).startsWith('EU-'))||save.pending)return;
    const recent=save.ratingHistory.filter(entry=>!entry.national&&entry.kind!=='trial').slice(-8);
    if(recent.length<8||mean(recent.map(entry=>entry.rating))<7.6)return;
    const level=rules().overall(save.player.attributes);
    const candidates=rules().clubs.filter(club=>club.european&&club.id!==save.club&&club.strength<=level+12&&!save.proposals.some(offer=>offer.id===club.id));
    candidates.sort((a,b)=>b.strength-a.strength||a.id.localeCompare(b.id));
    const rng=random(save.seed^save.round^save.year);
    const club=candidates[Math.floor(rng()*Math.min(12,candidates.length))];
    if(club)save.proposals.push({id:club.id,round:save.round,expires:save.round+5,european:true});
  }
  function trophyIcon(index=0){
    const color=['#ffc95c','#c7d2df','#e4aa66'][index%3];
    return `<svg viewBox="0 0 80 90" aria-hidden="true"><path d="M20 10H60L56 39Q52 54 40 57Q28 54 24 39Z" fill="${color}" stroke="#17111e" stroke-width="4"/><path d="M22 16H8Q7 39 27 40M58 16H72Q73 39 53 40" fill="none" stroke="${color}" stroke-width="7"/><path d="M40 56V72M23 77H57" stroke="${color}" stroke-width="8"/><path d="M20 77H60V85H20Z" fill="#50405d" stroke="#17111e" stroke-width="3"/><path d="M31 16L29 34" stroke="#fff0be" stroke-width="4"/></svg>`;
  }
  function gallery(save){
    const awards=save.achievements??[];
    const competitions=Object.values(rules().COMPETITION_META).filter(comp=>comp.id!=='pre-libertadores');
    const cups=competitions.map(comp=>{
      const count=awards.filter(award=>award.competitionId===comp.id||award.kind==='cup'&&award.league===comp.name||award.kind==='title'&&rules().leagueCompId(award.league)===comp.id).length;
      return `<article class="trophy-tile${count?' is-won':''}">${window.goatCompetitionTrophy(comp.id)}<b>${count}</b><strong>${comp.name}</strong></article>`;
    });
    const individual=[['month','Jogador do mês'],['player','Jogador da temporada'],['brazil-player','Melhor jogador do Brasil'],['season-national','Melhor jogador da liga'],['world-player','Melhor jogador do mundo'],['scorer','Artilheiro'],['assister','Líder de assistências']]
      .map(([kind,label])=>{const count=awards.filter(award=>award.kind===kind).length;return `<article class="trophy-tile${count?' is-won':''}"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 5 64 33 95 38 72 60 77 92 50 77 23 92 28 60 5 38 36 33Z" fill="#ffd078" stroke="#17111e" stroke-width="4"/><path d="m50 17 9 22 24 4-23 4-10 25-1-25-23-4 24-4Z" fill="#fff0b4"/></svg><b>${count}</b><strong>${label}</strong></article>`;});
    return `<div class="awards-panel awards-overview"><section class="award-section personal-awards"><h3 class="hub-section-title">Conquistas pessoais</h3><div class="trophy-gallery">${individual.join('')}</div></section><section class="award-section team-awards"><h3 class="hub-section-title">Troféus</h3><div class="trophy-gallery" style="--trophy-rows:${Math.ceil(cups.length/5)};--trophy-small-rows:${Math.ceil(cups.length/4)}">${cups.join('')}</div></section></div>`;
  }
  window.goatCareerJourney={data,leagues,nations,groupOf,squad,state,status,postMatch,availableDrills,drillNames,startDrill,finishDrill,
    callup,userTeam,calendar,dateOf,europeanProposals,random,gallery,trophyIcon,restoreSquads};
})();
