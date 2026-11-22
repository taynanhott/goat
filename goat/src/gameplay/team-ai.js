window.createFootballTeamAI=function(api){
'use strict';
const {player,keeper,members,motion,mocap,physics}=api;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=a=>Math.atan2(Math.sin(a),Math.cos(a));
let count=0,owner=null,delivery=null,offside=null,lastPasser=null,lastTouch=null,command=null;
let trajectory=[],trajectoryAt=-Infinity,trajectoryState=null;
let aimedTarget=null;
const state=()=>api.state();
const actors=()=>members.slice(0,count);
const opponents=()=>state().play?.defenders??[];
const all=()=>[player,...actors()];
function line(){
  const zs=[keeper.z,...opponents().map(a=>a.z)].sort((a,b)=>a-b);
  return Math.min(state().ball[2],zs[1]??footballPlayLimits.back);
}
function flightPath(){
  const s=state();
  if(s.clock-trajectoryAt<.075&&trajectoryState===s.ballState)return trajectory;
  trajectoryAt=s.clock;trajectoryState=s.ballState;
  const p=[...s.ball],v=[...s.velocity],spin=[...s.spin];
  trajectory=[];
  for(let step=1;step<=456;step++){
    physics.step(p,v,spin,1/120,true);
    if(p[2]<-.12||p[2]>footballPlayLimits.back+.1||Math.abs(p[0])>footballPlayLimits.side+.1)break;
    if(step%4===0)trajectory.push({x:p[0],y:p[1],z:p[2],time:step/120,vy:v[1]});
  }
  return trajectory;
}
function interception(actor,{pace=6.25,height=2.4}={}){
  const s=state(),initial=Math.min(pace,Math.hypot(actor.vx??0,actor.vz??0));
  const path=flightPath(),elapsed=Math.max(0,s.clock-trajectoryAt);
  let best=null,bestCost=Infinity;
  const cross=delivery?.kind==='cross'&&actor===delivery.target;
  const arrival=cross?delivery.contactAt-s.clock:0;
  for(const sample of path){
    const p={...sample,time:sample.time-elapsed};
    if(p.time<=.015)continue;
    if(p.y>Math.min(height,cross?2.25:height)||p.y>.45&&p.vy>1.4)continue;
    if(cross&&(p.y<1.05||p.time<.09||p.vy>0||Math.abs(p.time-arrival)>.40))continue;
    if(actor===delivery?.target&&state().ballState==='pass'&&delivery.runDirection){
      const progress=(p.x-delivery.start[0])*delivery.runDirection[0]+(p.z-delivery.start[1])*delivery.runDirection[1];
      if(progress<delivery.advance*.65)continue;
    }
    const deltaX=p.x-actor.x,deltaZ=p.z-actor.z,distance=Math.hypot(deltaX,deltaZ);
    const projected=cross&&distance>.01?clamp(((actor.vx??0)*deltaX+(actor.vz??0)*deltaZ)/distance,-pace,pace):initial;
    const reach=Math.max(0,pace*p.time-(pace-projected)*Math.min(p.time,.65)*.5);
    const gap=Math.hypot(p.x-actor.x,p.z-actor.z),remaining=gap-reach-.62;
    const target={...p,remaining,reachable:remaining<=0};
    if(remaining<=0&&!cross)return target;
    const momentum=Math.hypot(p.x-actor.x-(actor.vx??0)*p.time,p.z-actor.z-(actor.vz??0)*p.time);
    const cost=cross?Math.max(0,remaining)*8+Math.abs(p.time-arrival)*2+momentum*.12-(remaining<=0?3:0):remaining+p.time*.2;
    if(cost<bestCost){best=target;bestCost=cost;}
  }
  return best??{x:s.ball[0],y:s.ball[1],z:s.ball[2],time:.15,reachable:false};
}
function receiver(){return delivery&&state().ballState==='pass'?delivery.target:null;}
function chaser(){
  const s=state();
  if(!['pass','loose'].includes(s.ballState)||s.terminal)return null;
  const claim=actors().find(a=>(a.receptionUntil??0)>s.clock&&Math.hypot(a.x-s.ball[0],a.z-s.ball[2])<2.2);
  if(claim)return claim;
  if(receiver())return receiver();
  const point={x:s.ball[0],z:s.ball[2]};
  return all().filter(a=>a!==delivery?.passer||s.age>.3).reduce((best,a)=>
    !best||distance(a,point)<distance(best,point)?a:best,null);
}
function crossInterception(actor){
  const meet=interception(actor,{pace:6.25,height:2.6});
  if(delivery?.kind!=='cross')return meet;
  const pace=Math.hypot(actor.vx??0,actor.vz??0),gap=Math.hypot(meet.x-actor.x,meet.z-actor.z);
  const correctionLimit=clamp(3+pace*.65,3.5,7.5);
  if(!meet.reachable||delivery.crossError>.26||gap>correctionLimit||meet.time>2.2)return null;
  return {...meet,cross:true};
}
function playerAttraction(){
  if(chaser()!==player||player.aerialFlight?.airborne)return null;
  const meet=delivery?.kind==='cross'?crossInterception(player):interception(player);
  if(!meet?.reachable)return null;
  return {...meet,designated:receiver()===player};
}
function receptionGuide(actor){
  if(receiver()!==actor)return null;
  const s=state(),long=delivery.kind==='through'||delivery.kind==='lob'||delivery.kind==='cross';
  if(delivery.kind==='cross'){
    const meet=crossInterception(actor);
    return meet?{long:true,point:[meet.x,meet.y,meet.z],kind:delivery.kind}:null;
  }
  const point=long?[delivery.point[0],Math.max(.6,s.ball[1]*.2),delivery.point[1]]:[...s.ball];
  return {long,point,kind:delivery.kind};
}
function canReceive(actor){
  const s=state();
  return !(actor===player&&s.preparingFirstTime)&&!(actor===delivery?.passer&&s.age<.42)&&(actor.teamCooldown??0)<=0;
}
function snapshot(passer){
  const play=state().play;
  if(play?.mode==='open'&&!play.defenders?.length){offside=null;return;}
  const limit=line();
  offside=new Set(all().filter(a=>a!==passer&&a.z<footballPlayLimits.back&&a.z+.12<limit));
}
function involvement(actor){
  if(!offside?.has(actor))return false;
  owner=null;delivery=null;command=null;offside=null;
  api.offside();
  return true;
}
function lane(a,b){
  const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
  let clearance=10;
  for(const d of opponents()){
    const t=clamp(((d.x-a.x)*dx+(d.z-a.z)*dz)/(den||1),0,1);
    if(t>.04&&t<.96)clearance=Math.min(clearance,Math.hypot(d.x-a.x-dx*t,d.z-a.z-dz*t));
  }
  return clearance;
}
function space(p){return Math.min(9,...opponents().map(d=>distance(p,d)));}
function quality(p){
  const range=Math.hypot(p.x,p.z);
  const mouth=Math.atan2(3.55-p.x,p.z)-Math.atan2(-3.55-p.x,p.z);
  return mouth*7-range*.12+Math.min(2,lane(p,{x:keeper.x>0?-2.6:2.6,z:0}))*.45;
}
function formationTarget(a,carrier){
  const role=a.formationRole??'CM',wide=Math.abs(carrier.x)>17&&carrier.z<38;
  const sign=role==='LW'?-1:1;
  let x,z;
  if(role==='ST'){
    const wideAM=Math.abs(player.x)>17;
    x=clamp(player.x*.08,-2,2);
    z=wideAM?clamp(player.z-14,.8,15):clamp(player.z-8,.8,31);
  }else if(role==='LW'||role==='RW'){
    const farSide=wide&&sign*carrier.x<0;
    x=sign*(farSide?6:wide?21:18);
    z=farSide?clamp(carrier.z-15,11,18):clamp(carrier.z-(wide?5:11),9,33);
  }else{
    x=clamp(carrier.x*.30+(role==='CM_R'?6:-3),-12,12);
    z=wide?clamp(carrier.z-7,19,29):clamp(carrier.z+4,21,47);
  }
  const onside=role==='ST'?Math.min(line()+.25,player.z-.6):line()+.8;
  return {x:clamp(x,-29,29),z:clamp(Math.max(onside,z),role==='ST'?.6:2,48)};
}
function reset(n){
  count=clamp(n,0,Math.min(3,members.length));owner=null;delivery=null;offside=null;command=null;lastPasser=null;lastTouch=player;
  trajectoryAt=-Infinity;trajectoryState=null;trajectory=[];aimedTarget=null;player.teamCooldown=0;
  const side=player.x>=0?-1:1;
  player.formationRole='AM';
  const roles=count===3?['ST','LW','RW']:['ST',player.x<0?'RW':'LW'];
  actors().forEach((a,i)=>{
    Object.assign(a,{x:clamp(player.x+side*(i%2?-1:1)*(5+Math.floor(i/2)*3),-24,24),
      z:clamp(Math.max(line()+.65,player.z-3+(i%2)*3),2,45),y:0,yaw:0,vx:0,vz:0,
      decision:.55+i*.17,receptionUntil:0,aerialBefore:null,aerialFlight:null,teamAction:null,teamRun:null,teamCooldown:0,teamTouch:0,
      teamThink:0,teamTarget:null,teamRole:i,controlAge:0,teamFullBody:false,teamStopped:false,teamReaction:null,canCrossEndLine:true});
    a.formationRole=roles[i]??'ST';a.formationClock=state().clock;
    const position=formationTarget(a,player);a.x=position.x;a.z=position.z;
    a.teamTarget={...position};a.teamThink=.45+i*.08;
    a.appearance={...player.appearance,skin:['#b9754d','#d49c78','#754933','#9d6648'][i],hair:2+i%3};
    motion.reset(a);mocap.get(a).key=null;
    mocap.update(a,{clip:'idle',grounded:true,fade:.001},1);
  });
}
function select(passer,kind,direction,power=.5){
  if(passer!==player)return player;
  let best=null,value=-Infinity;
  const stick=state().aimScreen,screen=api.screenPoint?.(passer);
  const screenAim=!direction&&stick?.active&&screen;

  const desiredRange=(kind==='pass'?4:kind==='cross'?8:kind==='lob'?7:6)+clamp(power,.1,1)*(kind==='pass'?34:kind==='cross'?44:kind==='lob'?44:40);
  const fallback=direction??[-Math.sin(passer.yaw),-Math.cos(passer.yaw)];
  if(kind==='run'){
    const candidates=actors().map(actor=>{
      const gap=distance(actor,passer);
      const alignment=((actor.x-passer.x)*fallback[0]+(actor.z-passer.z)*fallback[1])/Math.max(.001,gap);
      return {actor,gap,alignment};
    }).filter(item=>item.gap>=1.1&&item.alignment>.65);
    const bestAlignment=Math.max(-1,...candidates.map(item=>item.alignment));
    return candidates.filter(item=>item.alignment>=bestAlignment-.12)
      .sort((a,b)=>a.gap-b.gap)[0]?.actor??null;
  }
  for(const a of actors()){
    const d=distance(a,passer);if(d<1.1)continue;
    let alignment;
    if(screenAim){
      const point=api.screenPoint(a);if(!point?.visible)continue;
      const dx=point.x-screen.x,dy=point.y-screen.y,length=Math.hypot(dx,dy)*Math.hypot(stick.x,stick.y);
      alignment=length>.01?(dx*stick.x+dy*stick.y)/length:-1;
    }else alignment=((a.x-passer.x)*fallback[0]+(a.z-passer.z)*fallback[1])/d;
    if(alignment<-.10)continue;
    const score=alignment*40+Math.min(3,lane(passer,a))*.35-Math.abs(d-desiredRange)*.85+
      (a===aimedTarget?3.5:0);
    if(score>value){best=a;value=score;}
  }
  if(!best&&aimedTarget&&actors().includes(aimedTarget)&&(!screenAim||state().passCharging))best=aimedTarget;
  aimedTarget=best;
  return best;
}
function passPlan(passer,target,kind,direction=null,power=.5){
  power=clamp(power,.1,1);
  const d=distance(passer,target),lead=kind==='pass'?.3:clamp(d/18,.65,1.7);
  let x=target.x+(target.vx??0)*lead,z=target.z+(target.vz??0)*lead;
  let runDirection=null,advance=0,flightTime,crossPower,crossReference;
  if(kind==='pass'&&passer!==player&&target===player){
    const pace=Math.hypot(target.vx??0,target.vz??0);
    const arrival=Math.min(.16,.85/Math.max(1,pace));
    const facing=pace>1?[(target.vx??0)/pace,(target.vz??0)/pace]:
      [(passer.x-target.x)/d,(passer.z-target.z)/d];
    x=target.x+(target.vx??0)*arrival+facing[0]*.35;
    z=target.z+(target.vz??0)*arrival+facing[1]*.35;
  }
  if(kind==='pass'&&passer===player){
    const range=4+power*34,dx=x-passer.x,dz=z-passer.z,len=Math.hypot(dx,dz)||1;
    x=passer.x+dx/len*range;z=passer.z+dz/len*range;
  }
  if(kind==='through'||kind==='lob'){
    const autonomous=passer!==player;
    if(autonomous)direction=null;
    const pace=Math.hypot(target.vx??0,target.vz??0);
    const intent=autonomous?(pace>.55?[(target.vx??0)/pace,(target.vz??0)/pace]:(target===player?player.receiveDirection:null)):
      pace>.55?[(target.vx??0)/pace,(target.vz??0)/pace]:direction??(target===player?player.receiveDirection:null);
    const run=target.teamTarget;
    let dx=intent?.[0]??(run?run.x-target.x:target.vx??0);
    let dz=intent?.[1]??(run?Math.min(-1,run.z-target.z):Math.min(-1,target.vz??-1));
    if(autonomous&&pace<.55&&dz>-.45)dz=-Math.max(.65,Math.abs(dx)*.75);
    else if(dz>-.2&&!intent)dz=-1;
    const length=Math.hypot(dx,dz)||1;
    runDirection=[dx/length,dz/length];
    const forward=clamp(-runDirection[1],-1,1);
    advance=clamp((kind==='lob'?4.5:3.5)+power*(kind==='lob'?20:18)+d*.08+pace*.2+Math.max(0,forward),
      kind==='lob'?5.5:4.5,kind==='lob'?23:21);
    if(autonomous){
      const baseAngle=Math.atan2(runDirection[0],runDirection[1]);
      const toGoalLen=Math.hypot(-target.x,-Math.max(4,target.z-6))||1;
      const goalDir=[-target.x/toGoalLen,-Math.max(4,target.z-6)/toGoalLen];
      const dirs=[
        runDirection,
        [Math.sin(baseAngle-.30),Math.cos(baseAngle-.30)],
        [Math.sin(baseAngle+.30),Math.cos(baseAngle+.30)],
        goalDir
      ];
      const depths=kind==='lob'?[7.5,11,14.5,18]:[3.5,5.5,8,11,14];
      let bestPoint=null,bestScore=-Infinity;
      for(const dir of dirs){
        const dl=Math.hypot(dir[0],dir[1])||1;
        const ux=dir[0]/dl,uz=dir[1]/dl;
        for(const dist of depths){
          const cx=clamp(target.x+ux*dist,-28,28);
          const cz=clamp(target.z+uz*dist,3.2,46);
          const p={x:cx,z:cz};
          const stepDist=Math.hypot(cx-target.x,cz-target.z);
          if(stepDist<3.2)continue;
          const align=((cx-target.x)*runDirection[0]+(cz-target.z)*runDirection[1])/stepDist;
          const keeperGap=distance(p,keeper);
          let advantage=0;
          if(kind==='through'){
            if(align<.78)continue;
            const arrivalTime=(actor,point,cap,reaction)=>{
              const ax=point.x-actor.x,az=point.z-actor.z,gap=Math.hypot(ax,az);
              const towards=((actor.vx??0)*ax+(actor.vz??0)*az)/Math.max(.01,gap);
              return Math.max(0,(gap-.65)/cap)+Math.max(0,cap-towards)/cap*.25+reaction;
            };
            const receiverTime=arrivalTime(target,p,6.25,.06);
            const ballTime=clamp(Math.max(.55+distance(passer,p)*.028,stepDist/6.2+.22+Math.max(0,5-pace)*.025),.65,2.2);
            if(receiverTime>ballTime+.22)continue;
            const rivals=[...opponents(),keeper];
            const rivalTime=Math.min(...rivals.map(actor=>arrivalTime(actor,p,actor===keeper?6.2:actor.settings?.pace??6,.12)));
            advantage=rivalTime-Math.max(receiverTime,ballTime);
            if(advantage<.12)continue;
            let intercepted=false;
            for(const fraction of [.2,.4,.6,.8]){
              const sample={x:passer.x+(cx-passer.x)*fraction,z:passer.z+(cz-passer.z)*fraction};
              if(rivals.some(actor=>arrivalTime(actor,sample,actor===keeper?6.2:actor.settings?.pace??6,.12)<ballTime*fraction-.06)){
                intercepted=true;break;
              }
            }
            if(intercepted)continue;
          }
          const passLane=Math.min(4,lane(passer,p));
          const progress=Math.max(0,target.z-cz);
          const score=quality(p)*1.45+space(p)*1.30+passLane*(kind==='through'?1.40:.25)
            +align*3+Math.min(1.5,advantage)*5+progress*.22-Math.max(0,6.2-keeperGap)*2.5
            -Math.max(0,stepDist-15.5)*.35;
          if(score>bestScore){bestScore=score;bestPoint=p;}
        }
      }
      if(bestPoint){
        x=bestPoint.x;z=bestPoint.z;
      }else{
        if(kind==='through')return null;
        const roomAhead=runDirection[1]<-.2?Math.max(3,(target.z-3.2)/-runDirection[1]):16;
        advance=clamp(kind==='lob'?10:8.5,Math.min(roomAhead,6),Math.min(roomAhead,16));
        x=target.x+runDirection[0]*advance;z=target.z+runDirection[1]*advance;
      }
    }else{
      const range=(kind==='lob'?7:6)+power*(kind==='lob'?44:40);
      const axis=direction??[-Math.sin(passer.yaw),-Math.cos(passer.yaw)];
      const size=Math.hypot(...axis)||1;
      x=passer.x+axis[0]/size*range;z=passer.z+axis[1]/size*range;
    }

  }
  if(kind==='cross'){
    const reference=clamp(.18+d/60,.22,.78),nominalSpeed=8+reference*28;
    flightTime=clamp(d/nominalSpeed,.48,1.8);
    for(let iteration=0;iteration<7;iteration++){
      x=target.x+(target.vx??0)*flightTime;z=target.z+(target.vz??0)*flightTime;
      const distance=Math.hypot(x-passer.x,z-passer.z);
      const next=clamp(distance/nominalSpeed,.45,Math.min(1.8,clamp(.45+distance*.040,.50,2.15)));
      flightTime=(flightTime+next)*.5;
    }
    x=target.x+(target.vx??0)*flightTime;z=target.z+(target.vz??0)*flightTime;
    crossReference=reference;crossPower=passer===player?power:reference;
  }
  x=clamp(x,-32,32);z=clamp(z,kind==='through'||kind==='lob'?2.2:.8,49);
  if(runDirection){
    advance=Math.hypot(x-target.x,z-target.z);
    if(advance>.05)runDirection=[(x-target.x)/advance,(z-target.z)/advance];
    const passDist=Math.hypot(x-passer.x,z-passer.z);
    const reaction=.22+Math.max(0,5-Math.hypot(target.vx??0,target.vz??0))*.025;
    if(kind==='lob'){
      const effPower=passer===player?power:clamp((passDist-8)/22,.25,.85);
      flightTime=clamp(1.16+effPower*.44+passDist*.014,1.22,1.84);
    }else{
      flightTime=clamp(Math.max(.55+passDist*.028,advance/6.2+reaction),.65,2.2);
    }
  }
  return {point:[x,kind==='cross'?1.75:.11,z],runDirection,advance,flightTime,crossPower,crossReference};
}
function kick(passer,target,kind,direction=null,power=.5){
  const s=state();
  if(!target||distance(passer,target)<1||s.ball[1]>.52)return false;
  if(kind==='cross'&&passer!==player){
    const d=distance(passer,target),pace=Math.hypot(target.vx??0,target.vz??0);
    power=clamp(.18+d/60+clamp(pace-3,0,4)*.008,.22,.78);
  }
  const plan=passPlan(passer,target,kind,direction,power);
  if(!plan){
    if(passer!==player&&kind==='through')return kick(passer,target,'pass',null,power);
    return false;
  }
  const {point,runDirection,advance,flightTime,crossPower,crossReference}=plan;
  const [x,,z]=point;
  snapshot(passer);lastPasser=passer;lastTouch=passer;
  const launch=physics.passLaunch(s.ball,[x,kind==='cross'?1.75:.11,z],kind,{time:flightTime,crossPower,crossReference});
  delivery={target,passer,kind,point:[x,z],start:[target.x,target.z],runDirection,advance,age:0,time:launch.time,contactAt:s.clock+launch.time,crossError:kind==='cross'?Math.abs(crossPower-crossReference):0};
  trajectoryAt=-Infinity;
  owner=null;command=null;
  passer.teamRun={x:clamp(passer.x+(passer.x>=0?-1:1)*4,-25,25),z:Math.max(2,passer.z-6),remaining:2.4};
  passer.teamAction={kind:'kick',clip:'kick2',age:0,duration:.3,yaw:Math.atan2(s.ball[0]-x,s.ball[2]-z),lookTarget:[x,.8,z]};
  if(passer===player)api.playerPass();
  api.release(launch.velocity,launch.spin,'pass');
  api.sound();
  return true;
}
function shoot(a,power=.62,immediate=false){
  const s=state();
  const header=s.ball[1]>1.2;
  const placedClip=mocap.clips.penalty?'penalty':'kick2';
  const clip=header?(s.ball[1]>1.75?'headerJump':'headerStand'):placedClip;
  if(a.teamAction?.kind==='shot'&&!immediate)return;
  const strike=header?{time:clip==='headerJump'?.92:.97,foot:'RightFoot'}:motion.shotContact(clip);
  const clipStart=header?(clip==='headerJump'?.32:.48):(clip==='penalty'?.40:0);
  const clipEnd=clip==='penalty'?Math.min(1.27,mocap.clips[clip].duration-.01):mocap.clips[clip].duration-.01;
  const impact=header?.27:(clip==='penalty'?.32:.30);
  const clipRate=(strike.time-clipStart)/impact;
  const duration=impact+Math.min(.26,(clipEnd-strike.time)/clipRate);
  a.teamAction={kind:'shot',clip:mocap.clips[clip]?clip:'kick2',age:0,duration,clipStart,clipRate,foot:strike.foot,
    yaw:Math.atan2(a.x-(keeper.x>=0?-2.5:2.5),a.z),power,header,
    impact,jumpHeight:header?clamp(s.ball[1]-1.65,0,.72):0};
  const action=a.teamAction,geometry=mocap.shotGeometry(action.clip,strike.time,strike.foot);
  const boot=header?geometry.head:geometry.boot;
  const c=Math.cos(action.yaw),sn=Math.sin(action.yaw);
  const predicted=[...s.ball],predictedVelocity=[...s.velocity],predictedSpin=[...s.spin];
  for(let elapsed=0;elapsed<action.impact;){const h=Math.min(1/120,action.impact-elapsed);physics.step(predicted,predictedVelocity,predictedSpin,h,true);elapsed+=h;}
  const correction=[predicted[0]-a.x+boot[0]*c+boot[2]*sn,predicted[2]-a.z-boot[0]*sn+boot[2]*c];
  const length=Math.hypot(...correction),scale=Math.min(1,1.65/Math.max(.001,length));
  action.geometry=geometry;action.target=[a.x+correction[0]*scale,a.z+correction[1]*scale];
  command=null;
  if(immediate){a.teamAction.age=a.teamAction.impact;fire(a,a.teamAction);}
}
function prepareHeader(a,plan){
  const clipStart=plan.jump?(plan.time<.32?.45:.12):(plan.time<.24?.60:.22);
  a.teamAction={kind:'shot',header:true,headerPlan:plan,clip:plan.clip,clipStart,
    clipRate:(plan.strike-clipStart)/plan.time,age:0,impact:plan.time,duration:plan.time+.60,
    yaw:plan.yaw,power:.55,foot:'RightFoot',jumpHeight:plan.jumpHeight};
  a.teamFullBody=false;command=null;
}
function moveToHeader(a,action,dt){
  const s=state(),plan=action.headerPlan,remaining=Math.max(0,action.impact-action.age);
  const point=[...s.ball],v=[...s.velocity],spin=[...s.spin];
  for(let t=0;t<remaining;){const h=Math.min(1/120,remaining-t);physics.step(point,v,spin,h,true);t+=h;}
  const head=plan.geometry.head,c=Math.cos(plan.yaw),sn=Math.sin(plan.yaw);
  const target=[point[0]+c*head[0]+sn*head[2],point[2]-sn*head[0]+c*head[2]];
  const axis=[target[0]-a.x,target[1]-a.z],gap=Math.hypot(...axis);
  const speed=action.fired||action.age>action.impact+.03?0:Math.min(6.25,gap/Math.max(.055,remaining));
  motion.move(a,{dt,direction:gap>.02?[axis[0]/gap,axis[1]/gap]:[0,0],speed,sprint:speed>4,
    ball:s.ball,velocity:s.velocity,controlled:false,facing:a.yaw+turn(plan.yaw-a.yaw)*Math.min(1,dt*12)});
}
function fire(a,action){
  const s=state();
  if(s.terminal||action.fired||involvement(a))return;
  if(a.teamRun?.requested)a.teamRun=null;
  action.fired=true;snapshot(a);lastTouch=a;a.yaw=action.yaw;owner=null;delivery=null;command=null;
  const header=action.header,clip=action.clip,power=action.power;
  api.shoot({power,aim:{x:keeper.x>=0?-2.5:2.5,y:header?.55:1},velocity:[a.vx??0,a.vz??0],
    clip,header,foot:action.foot,finesse:!header,assisted:lastPasser===player,teamScorer:true});
}
function request(kind,direction,power=.5,targetOverride=null){
  const s=state();
  if(!count||!s.play||s.play.piece||s.terminal)return false;
  if(owner&&s.ballState==='teammate'){
    command={kind,power,direction:direction?[...direction]:null,until:s.clock+1.1};
    if(kind==='shot'&&s.ball[1]<2.55)shoot(owner);
    else if(s.ball[1]<.48)kick(owner,player,kind,direction,power);
    return true;
  }
  if(delivery?.target!==player&&delivery&&s.ballState==='pass'){
    command={kind,power,direction:direction?[...direction]:null,until:s.clock+Math.max(1.3,delivery.time+1)};return true;
  }
  if(s.ballState==='loose'&&chaser()&&chaser()!==player){
    command={kind,power,direction:direction?[...direction]:null,until:s.clock+1.5};return true;
  }
  if(kind==='shot')return false;
  if(s.ballState!=='controlled'||s.windup||s.charging||Math.hypot(s.ball[0]-player.x,s.ball[2]-player.z)>1.3)return false;
  return kick(player,actors().includes(targetOverride)?targetOverride:select(player,kind,direction,power),kind,direction,power);
}
function preview(kind,direction,power=.5){
  const s=state();
  const looseMate=s.ballState==='loose'?chaser():null;
  const passer=owner??(s.ballState==='controlled'?player:delivery?.target??(looseMate&&looseMate!==player?looseMate:null));
  if(!passer||s.terminal||s.play?.piece)return null;
  const target=passer===player?select(passer,kind,direction,power):player;
  if(!target)return null;
  return {...passPlan(passer,target,kind,direction,power),target};
}
function requestRun(direction){
  const s=state();
  if(!direction||s.ballState!=='controlled'||s.terminal||s.play?.piece||s.windup||s.charging)return false;
  const target=select(player,'run',direction,.5);
  if(!target||target===owner)return false;
  for(const a of actors()){
    if(a!==target&&a.teamRun?.requested){
      a.teamRun=null;
      a.teamTarget=formationTarget(a,player);
      a.formationClock=s.clock;
      a.teamAtRest=false;
    }
  }
  target.teamRun={requested:true,x:target.x,z:Math.max(2,target.z-16),remaining:4.5,offsideAt:null,returning:false};
  target.teamAtRest=false;
  return true;
}
function targetFor(a,index){
  const s=state(),pursuer=chaser();
  if(receiver()===a||pursuer===a){
    const meet=delivery?.kind==='cross'?crossInterception(a):interception(a);
    if(meet)return meet;
  }
  const run=a.teamRun;
  if(run?.requested&&run.remaining>0){
    const limit=line(),illegal=opponents().length>0&&a.z<limit-.12;
    if(illegal){
      run.offsideAt??=s.clock;
      if(s.clock-run.offsideAt>.9)run.returning=true;
    }else{
      run.offsideAt=null;
      if(run.returning){a.teamRun=null;return formationTarget(a,owner??player);}
    }
    return {x:run.x,z:run.returning?Math.max(a.z,limit+1.2):run.z};
  }
  const carrier=s.ballState==='controlled'?player:owner??player;
  const anchor=formationTarget(a,carrier);
  if(a.teamRun?.remaining>0){
    const role=a.formationRole;
    anchor.z=clamp(anchor.z-2,line()+.8,48);
    if(role==='LW'||role==='RW')anchor.x=role==='LW'?-20:20;
  }
  for(const d of opponents()){
    const dx=anchor.x-d.x,dz=anchor.z-d.z,gap=Math.hypot(dx,dz);
    if(gap>.01&&gap<2){anchor.x+=dx/gap*(2-gap)*.45;anchor.z+=dz/gap*(2-gap)*.35;}
  }
  const phase=s.clock*.55+index*2.1;
  const future={x:carrier.x+(carrier.vx??0)*.7,z:carrier.z+(carrier.vz??0)*.7};
  const options=[-1,1].map(side=>({x:anchor.x+side*1.3,z:anchor.z-.6}));
  const preferred=options.reduce((best,p)=>space(p)+lane(future,p)*.2>space(best)+lane(future,best)*.2?p:best);
  anchor.x=clamp(anchor.x+Math.sin(phase)*.85+(preferred.x-anchor.x)*.35,-28,28);
  anchor.z=clamp(anchor.z+Math.cos(phase)*.65,.8,48);
  const old=a.teamTarget??anchor;
  const weight=1-Math.exp(-Math.max(.001,s.clock-(a.formationClock??s.clock-.016))*4);
  a.formationClock=s.clock;
  const nextZ=old.z+(anchor.z-old.z)*weight;
  const z=a.formationRole==='ST'?Math.max(.6,Math.min(player.z-.6,Math.max(Math.min(line()+.25,player.z-.6),nextZ))):Math.max(line()+.65,nextZ);
  a.teamTarget={x:old.x+(anchor.x-old.x)*weight,z};
  return a.teamTarget;
}
function locomotionPose(a,dt){
  const resuming=a.teamFullBody;
  if(resuming){motion.reset(a);a.teamFullBody=false;}
  return motion.locomotion(a,{dt,ball:state().ball,velocity:state().velocity,
    controlled:a===owner,recoverable:false,ankles:resuming?undefined:mocap.get(a).ankles,suspended:false});
}
function settleActor(a,dt){
  const s=state();
  const isGoal=s.ballState==='goal'||s.result?.type==='goal';
  const isFoul=s.ballState==='foul'||s.result?.type==='foul';
  if(!a.teamStopped){
    a.teamAction=null;a.teamRun=null;a.teamFullBody=false;a.teamStopped=true;
    a.vx=0;a.vz=0;a.y=0;motion.reset(a);
    const index=a.teamRole??0;
    if(isGoal){
      const celebs=['victory','sillyDancing'].filter(k=>mocap.clips[k]);
      const clip=celebs.length?celebs[(index+Math.floor(Math.random()*celebs.length))%celebs.length]:null;
      const cam=s.camera;
      const yaw=cam?Math.atan2(a.x-cam[0],a.z-cam[2]):Math.atan2(a.x-player.x,a.z-player.z);
      a.teamReaction=clip?{kind:'goal',clip,t:0,offset:index*.21,mirror:Math.random()<.5,yaw}:null;
    }else if(!isFoul){
      const sads=['sadWalk','sadIdle'].filter(k=>mocap.clips[k]);
      const clip=sads.length?sads[(index+Math.floor(Math.random()*sads.length))%sads.length]:null;
      a.teamReaction=clip?{kind:'sad',clip,t:0,offset:index*.24,mirror:false,yaw:a.yaw}:null;
    }else a.teamReaction=null;
  }
  const r=a.teamReaction;
  if(r&&mocap.clips[r.clip]){
    r.t+=dt;
    const clipObj=mocap.clips[r.clip];
    if(r.kind==='goal'){
      a.yaw+=turn(r.yaw-a.yaw)*Math.min(1,dt*7);
      mocap.update(a,{clip:r.clip,poseName:'teamCelebration',time:(r.t+r.offset)%Math.max(.1,clipObj.duration),
        loop:true,grounded:true,fade:.24,mirror:r.mirror,bodyYaw:a.yaw},dt);
      return;
    }
    if(r.clip==='sadWalk'){
      a.x=clamp(a.x-Math.sin(a.yaw)*dt*.46,-32,32);
      a.z=clamp(a.z-Math.cos(a.yaw)*dt*.46,.4,footballPlayLimits.back);
    }
    mocap.update(a,{clip:r.clip,poseName:'teamSad',time:(r.t+r.offset)%Math.max(.1,clipObj.duration-.04),
      loop:true,grounded:true,fade:.22,bodyYaw:a.yaw},dt);
    return;
  }
  mocap.update(a,{clip:'idle',poseName:'teamStopped',time:0,loop:false,grounded:true,fade:.22,bodyYaw:a.yaw},dt);
}
function settle(dt){
  owner=null;delivery=null;command=null;
  const s=state();
  for(const a of actors()){
    const flight=a.teamAction?.flight??a.teamAction?.reception?.flight;
    if(flight&&!flight.done){
      if(flight.airborne)motion.move(a,{dt,direction:[0,0],speed:0,ball:s.ball,velocity:s.velocity,controlled:false});
      animate(a,dt);
    }else settleActor(a,dt);
  }
}
function animate(a,dt){
  const pending=a.teamAction?.flight??a.teamAction?.reception?.flight;
  if(state().terminal&&(!pending||pending.done)){settleActor(a,dt);return;}
  const action=a.teamAction;
  if(action?.kind==='kick'){
    const pose=locomotionPose(a,dt);
    mocap.update(a,motion.passRecovery(a,pose,action,dt),dt);return;
  }
  if(action){
    action.age+=dt;
    const reception=action.reception;
    const receptionDone=reception&&!!reception.flight?.done;
    if((action.age<action.duration||reception&&!receptionDone||action.flight&&!action.flight.done)&&!receptionDone){
      if(!a.aerialFlight?.airborne)a.yaw+=turn(action.yaw-a.yaw)*Math.min(1,dt*14);
      const aerial=action.clip==='headerJump';
      const layeredTrap=action.kind==='trap'&&!aerial&&Math.hypot(a.vx,a.vz)>.75;
      const phase=action.age/action.duration;
      if(!action.reception&&!action.header&&!layeredTrap&&!a.teamFullBody){motion.reset(a);a.teamFullBody=true;}

      let clipTime=action.kind==='shot'?action.clipStart+action.age*action.clipRate:
        action.reception?action.reception.time:
        action.clip==='receiveBall'?2.55+phase*.8:action.clip.startsWith('header')?.28+phase*1.1:phase*(mocap.clips[action.clip]?.duration??.6);
      if(action.reception){
        const r=action.reception;
        r.time+=dt*r.rate;clipTime=Math.min(r.time,mocap.clips[action.clip].duration);
      }
      let pose;
      if(action.reception||action.header){
        const r=action.reception??action;
        const base=a.aerialFlight?.airborne?null:locomotionPose(a,dt);
        const rate=action.reception?r.rate:action.clipRate;
        const contact=action.reception?r.contact:action.clipStart+action.impact*action.clipRate;
        const end=action.reception?r.end:action.clipStart+action.duration*action.clipRate;
        pose=motion.aerialPose(a,r,{time:clipTime,contact,start:r.startT??action.clipStart??0,
          rate,height:action.jumpHeight??r.jumpHeight??0,end,dt,base,yaw:a.yaw,
          kind:action.reception?r.kind:'head'});
        if(action.headerPlan)a.headerBefore=mocap.get(a).head?[...mocap.get(a).head]:null;
      }else{
        pose={clip:action.clip,time:clipTime,bodyStartTime:action.clipStart,
          bodyContactTime:action.kind==='shot'?action.clipStart+action.impact*action.clipRate:undefined,
          bodyFoot:action.foot,loop:false,fade:.1,grounded:true};
      }
      if(action.reception)pose=motion.chestReception(a,action.reception,pose,state().ball,state().velocity,dt);
      a.aerialBefore=receptionSurfaces(a,mocap.get(a),action.reception?.kind??'head');
      a.strikeBefore=mocap.get(a).boots?.map(point=>[...point]);
      if(action.kind==='shot'&&!action.header&&!action.fired){
        const s=state(),remaining=Math.max(0,action.impact-action.age);
        const point=[...s.ball],v=[...s.velocity],w=[...s.spin];
        for(let t=0;t<remaining;){const h=Math.min(1/120,remaining-t);physics.step(point,v,w,h,true);t+=h;}
        const weight=clamp((action.age-action.impact+.10)/.08,0,1)*(1-clamp((action.age-action.impact-.025)/.10,0,1));
        pose.ballContacts=[{category:'shot',limb:action.foot,point,weight,maxCorrection:.28}];
      }
      mocap.update(a,pose,dt);
      if(!action.headerPlan&&action.kind==='shot'&&!action.fired&&action.age>=action.impact-.09&&action.age<action.impact+.16){
        const s=state(),rig=mocap.get(a);
        const contact=action.header?physics.bootContact(rig.head,rig.head,s.ball,s.velocity,dt,.23):
          physics.bootContact(a.strikeBefore?.[action.foot==='LeftFoot'?0:1]??rig.boots[action.foot==='LeftFoot'?0:1],rig.boots[action.foot==='LeftFoot'?0:1],s.ball,s.velocity,dt,.13);
        if(contact)fire(a,action);
      }
      return;
    }
    a.teamAction=null;
    a.teamCooldown=Math.max(a.teamCooldown,.16);a.decision=Math.max(a.decision,.3);
  }
  mocap.update(a,locomotionPose(a,dt),dt);
}
function update(dt){
  const s=state();
  player.teamCooldown=Math.max(0,(player.teamCooldown??0)-dt);
  if(!s.play||s.play.piece||!count)return;
  if(s.terminal||s.play.transition?.outcome){settle(dt);return;}
  if(s.play.transition)return;
  if(s.ballState!=='teammate')owner=null;
  if(['defender','held','none'].includes(s.ballState)){delivery=null;offside=null;command=null;lastPasser=null;lastTouch=null;}
  if(command&&command.until<s.clock)command=null;
  if(delivery){
    delivery.age+=dt;
    if(s.ballState!=='pass'||delivery.age>Math.max(3,delivery.time+1.5)){
      if(s.ballState==='pass')api.loose();
      delivery=null;trajectoryAt=-Infinity;
    }
  }else if(s.ballState==='pass'){
    api.loose();trajectoryAt=-Infinity;
  }
  const pursuer=chaser();
  actors().forEach((a,i)=>{
    if(state().terminal){settleActor(a,dt);return;}
    a.teamStopped=false;
    a.teamReaction=null;
    a.teamThink-=dt;
    a.teamCooldown=Math.max(0,a.teamCooldown-dt);
    if(a.teamRun)a.teamRun.remaining-=dt;
    if(!a.aerialFlight?.airborne&&(!a.teamAction||a.teamAction.kind==='trap')&&!a.teamCooldown&&a!==delivery?.passer&&
      ['pass','loose'].includes(s.ballState)&&s.ball[1]>.85&&
      (receiver()===a||pursuer===a||distance(a,{x:s.ball[0],z:s.ball[2]})<4)&&
      (command?.kind==='shot'||delivery?.kind==='cross'&&a.z<15&&Math.abs(a.x)<10&&lane(a,{x:0,z:0})>1.3&&space(a)>.9)){
      const plan=api.headerPlan(a);
      if(plan&&plan.time<.68)prepareHeader(a,plan);
    }
    if(!a.teamAction&&!a.teamCooldown&&['pass','loose'].includes(s.ballState)&&s.ball[1]>.45&&s.velocity[1]<2.6){
      const intercept=interception(a,{pace:Math.max(4.8,Math.hypot(a.vx,a.vz)),height:2.6});
      const gap=Math.hypot(intercept.x-a.x,intercept.z-a.z);
      if(intercept.reachable&&intercept.time<=.58&&intercept.y>.45&&intercept.y<2.65&&gap<3.0){
        const reception=api.reception(a,[intercept.x,intercept.y,intercept.z],intercept.time);
        const horizontal=Math.hypot(s.velocity[0],s.velocity[2]);
        const yaw=horizontal>1?Math.atan2(s.velocity[0],s.velocity[2]):Math.atan2(a.x-s.ball[0],a.z-s.ball[2]);
        reception.yaw=yaw;
        a.teamAction={kind:'trap',clip:reception.clip,age:0,duration:1.15,yaw,reception,jumpHeight:reception.jumpHeight};
      }
    }
    let target;
    if(a.teamAction?.kind==='shot'){
      if(a.teamAction.headerPlan)moveToHeader(a,a.teamAction,dt);
      else{
        const action=a.teamAction,remaining=action.impact-action.age;
        if(!action.fired&&remaining>-.06&&action.geometry){
          const point=[...s.ball],v=[...s.velocity],spin=[...s.spin];
          for(let t=0;t<Math.max(0,remaining);){
            const h=Math.min(1/120,remaining-t);physics.step(point,v,spin,h,true);t+=h;
          }
          const boot=action.header?action.geometry.head:action.geometry.boot;
          const c=Math.cos(action.yaw),sn=Math.sin(action.yaw);
          action.target=[point[0]+boot[0]*c+boot[2]*sn,point[2]-boot[0]*sn+boot[2]*c];
        }
        const target=action.target??[a.x,a.z],dx=target[0]-a.x,dz=target[1]-a.z,gap=Math.hypot(dx,dz);
        motion.move(a,{dt,direction:gap>.01?[dx/gap,dz/gap]:[0,0],
          speed:!action.fired&&remaining>-.06?Math.min(6.25,gap/Math.max(.045,remaining)):Math.hypot(a.vx,a.vz)*Math.exp(-dt*9),
          ball:s.ball,velocity:s.velocity,controlled:false,facing:action.yaw});
      }
      animate(a,dt);return;
    }
    if(a===owner){
      a.controlAge+=dt;
      const candidates=[-1,-.5,0,.5,1].map(dx=>({x:clamp(a.x+dx*3-clamp(a.x*.12,-1.5,1.5),-30,30),z:a.z-3}));
      target=candidates.sort((p,q)=>(space(q)+lane(a,q)*.3-Math.abs(q.x)*.05)-(space(p)+lane(a,p)*.3-Math.abs(p.x)*.05))[0];
      a.decision-=dt;
      if(command&&s.ball[1]<.48){
        if(command.kind==='shot')shoot(a);else kick(a,player,command.kind,command.direction,command.power);
      }else if(!s.passCharging&&a.decision<=0&&a.teamCooldown===0){
        a.decision=.35+Math.random()*.3;
        const available=all().filter(b=>b!==a&&distance(a,b)>2&&b.z>=line()-.08&&lane(a,b)>1.05);
        const better=available.sort((b,c)=>(quality(c)+space(c)*.08)-(quality(b)+space(b)*.08))[0];
        const clear=lane(a,{x:keeper.x>0?-2.5:2.5,z:0})>.9;
        const range=Math.hypot(a.x,a.z),closeFinish=range<10.5&&Math.abs(a.x)<7;
        const threatened=[...opponents(),keeper].some(d=>{
          const dx=d.x-a.x,dz=d.z-a.z,gap=Math.hypot(dx,dz);
          const closing=-((d.vx??0)-(a.vx??0))*dx/Math.max(.01,gap)
            -((d.vz??0)-(a.vz??0))*dz/Math.max(.01,gap);
          return gap<2.3||gap<4.8&&closing>.5&&(gap-1.3)/closing<.85;
        });
        const forwardLane=lane(a,{x:clamp(a.x*.4,-3,3),z:Math.max(0,a.z-8)});
        const carryOpen=!threatened&&forwardLane>1.8&&!closeFinish;
        const playerRun=Math.hypot(player.vx??0,player.vz??0),runGap=distance(a,player);
        const advancing=(player.vz??0)<-1.2&&player.z<a.z+2;
        if(!carryOpen&&playerRun>3&&advancing&&player.z>=line()-.08&&runGap>8&&runGap<35&&space(player)>1.1){
          kick(a,player,lane(a,player)>1.8?'through':'lob');
        }else if(!carryOpen&&better&&quality(better)>quality(a)+.5&&better.z<20)kick(a,better,'pass');
        else if((closeFinish||threatened&&range<23)&&Math.abs(a.x)<12&&clear)shoot(a,clamp(.45+a.z*.012,.48,.76));
        else if(threatened&&better)kick(a,better,better.z<a.z-4?'through':'pass');
      }
    }else target=targetFor(a,i);
    if(!target)target={x:a.x,z:a.z};
    const receiving=receiver()===a||pursuer===a;
    let dx=target.x-a.x,dz=target.z-a.z;
    for(const b of all())if(b!==a){
      const d=distance(a,b);
      const spacing=receiving?.8:2.5;
      if(d<spacing&&d>.01){dx+=(a.x-b.x)/d*(spacing-d)*2;dz+=(a.z-b.z)/d*(spacing-d)*2;}
    }
    const d=Math.hypot(dx,dz);
    const cap=a===owner?(a.controlAge<.22?1.6:4.3):receiving?6.25:a.formationRole==='ST'?6.25:6.0;
    const settling=a!==owner&&!receiving;
    if(settling){
      if(d<.12)a.teamAtRest=true;
      else if(d>.25)a.teamAtRest=false;
    }else a.teamAtRest=false;
    const speed=a.teamAtRest?0:receiving?Math.min(cap,d/Math.max(.14,target.time??.2)+.35):Math.min(settling&&!a.teamRun?.requested&&d<3?1.45:cap,d*2.5);
    motion.move(a,{dt,direction:!a.teamAtRest&&d>.1?[dx/d,dz/d]:[0,0],speed,sprint:speed>4.5,
      ball:s.ball,velocity:s.velocity,controlled:a===owner,facing:a.teamAction?.kind==='trap'&&!a.teamAction.reception?.touched?
        a.yaw+clamp(turn(a.teamAction.yaw-a.yaw),-dt*9,dt*9):undefined});
    animate(a,dt);
  });
}
function receptionSurfaces(a,rig,kind){
  if(kind==='head')return rig.head?[[...rig.head]]:[];
  if(kind==='knee')return rig.knees?.map(point=>[...point])??[];
  const c=rig.chest;if(!c)return [];
  const fx=rig.chestForward?.[0]??-Math.sin(a.yaw),fz=rig.chestForward?.[2]??-Math.cos(a.yaw);
  return [[c[0]+fx*.11,c[1]+.02,c[2]+fz*.11],[c[0]+fx*.08,c[1]+.15,c[2]+fz*.08],
    [c[0]+fx*.09,c[1]-.20,c[2]+fz*.09]];
}
function touch(dt,from=0,to=1){
  const s=state();if(!count||s.terminal||s.play?.piece)return;
  for(const a of actors()){
    const action=a.teamAction;
    if(action?.kind!=='shot'||action.fired||action.age<action.impact-.09||action.age>action.impact+.16)continue;
    const rig=mocap.get(a),index=action.foot==='LeftFoot'?0:1;
    const current=action.header?rig.head:rig.boots?.[index];
    const previous=action.header?a.headerBefore:a.strikeBefore?.[index];
    if(!current)continue;
    const before=current.map((v,i)=>(previous?.[i]??v)+(v-(previous?.[i]??v))*from);
    const after=current.map((v,i)=>(previous?.[i]??v)+(v-(previous?.[i]??v))*to);
    if(physics.bootContact(before,after,s.ball,s.velocity,dt,action.header?.22:.13)){fire(a,action);return;}
  }
  if(owner&&s.ballState==='teammate'){
    const a=owner,gap=Math.hypot(a.x-s.ball[0],a.z-s.ball[2]);
    if(gap>1.65||s.ball[1]>.7){owner=null;api.loose();return;}
    a.teamTouch=(a.teamTouch??0)-dt;
    const bootContact=mocap.get(a).boots.some(p=>Math.hypot(p[0]-s.ball[0],p[1]-s.ball[1],p[2]-s.ball[2])<.44);
    if(a.teamTouch<=0&&s.ball[1]<.4&&a.teamAction?.kind!=='shot'&&bootContact){
      a.teamTouch=.19;
      mocap.bodyImpact(a,s.velocity,'foot',.25);
    physics.receiveTouch(s.ball,s.velocity,s.spin,a.yaw,Math.hypot(a.vx,a.vz),[s.ball[0]-a.x,s.ball[2]-a.z]);
    }
    if(a.teamAction?.kind!=='shot'&&gap<1.45){
      const offset=[s.ball[0]-a.x,s.ball[2]-a.z];
      const target=[-Math.sin(a.yaw)*.5-Math.cos(a.yaw)*.1,-Math.cos(a.yaw)*.5+Math.sin(a.yaw)*.1];
      physics.steadyDribble(s.ball,s.velocity,offset,target,[a.vx,a.vz],a.controlAge<.4,dt);
    }
    return;
  }
  if(!['pass','loose'].includes(s.ballState)||s.age<.12)return;
  const candidates=all().filter(a=>a!==delivery?.passer||s.age>.6).sort((a,b)=>
    Math.hypot(a.x-s.ball[0],a.z-s.ball[2])-Math.hypot(b.x-s.ball[0],b.z-s.ball[2]));
  for(const a of candidates){
    const gap=Math.hypot(a.x-s.ball[0],a.z-s.ball[2]);
    if(gap>1.25||!canReceive(a)||a===player&&(s.windup||s.charging)||a.teamAction?.kind==='shot')continue;
    const height=s.ball[1],vertical=s.velocity[1];
    if(height>2.6||height>.45&&vertical>2.6)continue;
    if(height>.45){
      if(a===player)continue;
      let aa=a.teamAction?.reception;
      if(!aa&&height<1.75){
        aa=api.reception(a,s.ball,.10);
        aa.time=aa.contact-.06;
        const incoming=Math.hypot(s.velocity[0],s.velocity[2]);
        const yaw=incoming>1?Math.atan2(s.velocity[0],s.velocity[2]):Math.atan2(a.x-s.ball[0],a.z-s.ball[2]);
        aa.yaw=yaw;
        a.teamAction={kind:'trap',clip:aa.clip,age:0,duration:1.0,yaw,reception:aa,jumpHeight:aa.jumpHeight};
      }
      if(!aa||aa.touched||aa.time<aa.contact-.34||aa.time>aa.contact+.42)continue;
      const front=[-Math.sin(a.yaw),-Math.cos(a.yaw)];
      const facingBall=(s.ball[0]-a.x)*front[0]+(s.ball[2]-a.z)*front[1];
      const incoming=s.velocity[0]*front[0]+s.velocity[2]*front[1];
      if(facingBall<-.08||incoming>1)continue;
      const rig=mocap.get(a),points=receptionSurfaces(a,rig,aa.kind);
      const incomingBodyVelocity=[...s.velocity];
      const contact=points.some((point,index)=>{
        const old=a.aerialBefore?.[index]??point;
        const before=point.map((v,i)=>old[i]+(v-old[i])*from);
        const after=point.map((v,i)=>old[i]+(v-old[i])*to);
        return physics.aerialControl(s.ball,s.velocity,s.spin,{point:after,previous:before,dt,
          heading:a.yaw,pace:Math.min(2.2,Math.hypot(a.vx,a.vz)),kind:aa.kind,normal:rig.chestForward,center:rig.chest});
      });
      if(!contact)continue;
      if(involvement(a))return;
      mocap.bodyImpact(a,incomingBodyVelocity,aa.kind,.4);
      if(a.teamRun?.requested)a.teamRun=null;
      aa.touched=true;a.teamAction.touchedAt=a.teamAction.age;lastTouch=a;a.teamCooldown=.10;a.receptionUntil=s.clock+.9;
      delivery=null;api.loose();return;
    }
    if(gap>.88||a.aerialFlight?.airborne)continue;
    if(involvement(a))return;
    const pace=Math.hypot(a.vx??0,a.vz??0);
    const direction=a===player?player.receiveDirection:null;
    const heading=direction?Math.atan2(-direction[0],-direction[1]):a.yaw;
    physics.receiveTouch(s.ball,s.velocity,s.spin,heading,a===player?Math.min(3.2,pace):Math.min(1.6,pace*.45),[s.ball[0]-a.x,s.ball[2]-a.z]);
    delivery=null;offside=null;lastTouch=a;a.teamCooldown=.12;trajectoryAt=-Infinity;
    if(a===player){owner=null;api.control();}
    else{
      if(a.teamRun?.requested)a.teamRun=null;
      owner=a;a.decision=.3;a.teamTouch=.08;a.controlAge=0;a.teamAction=null;
      a.vx*=.8;a.vz*=.8;a.contactRecovery={elapsed:0,duration:.22,side:1};api.possess();
    }
    return;
  }
}
return {isOffside(actor){const s=state();if(s.play?.mode==='open'&&!s.play.defenders?.length)return false;if(s.ballState==='pass'&&offside)return offside.has(actor);if(!['controlled','teammate'].includes(s.ballState))return false;return actor!==(owner??(s.ballState==='controlled'?player:null))&&actor.z<footballPlayLimits.back&&actor.z+.12<line();},reset,actors,request,update,touch,settle,snapshot,involvement,interception,playerAttraction,receptionGuide,preview,chaser,canReceive,
  requestRun,
  get delivery(){return delivery;},
  credit:()=>({teamScorer:!!lastTouch&&lastTouch!==player,assisted:lastTouch!==player&&lastPasser===player}),
  playerTouch(){lastTouch=player;owner=null;delivery=null;offside=null;player.teamCooldown=0;trajectoryAt=-Infinity;},get owner(){return owner;}};
};
