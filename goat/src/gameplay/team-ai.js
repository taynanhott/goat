window.createFootballTeamAI=function(api){
'use strict';
const {player,keeper,members,motion,mocap,physics}=api;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=a=>Math.atan2(Math.sin(a),Math.cos(a));
let count=0,owner=null,delivery=null,offside=null,lastPasser=null,lastTouch=null,command=null;
let trajectory=[],trajectoryAt=-Infinity,trajectoryState=null;
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
  for(const sample of path){
    const p={...sample,time:sample.time-elapsed};
    if(p.time<=.015)continue;
    if(p.y>height||p.y>.45&&p.vy>1.4)continue;
    if(actor===delivery?.target&&state().ballState==='pass'&&delivery.runDirection){
      const progress=(p.x-delivery.start[0])*delivery.runDirection[0]+(p.z-delivery.start[1])*delivery.runDirection[1];
      if(progress<delivery.advance*.65)continue;
    }
    const reach=Math.max(0,pace*p.time-(pace-initial)*Math.min(p.time,.65)*.5);
    const gap=Math.hypot(p.x-actor.x,p.z-actor.z),remaining=gap-reach-.62;
    const target={...p,remaining,reachable:remaining<=0};
    if(remaining<=0)return target;
    const cost=remaining+p.time*.2;
    if(cost<bestCost){best=target;bestCost=cost;}
  }
  return best??{x:s.ball[0],y:s.ball[1],z:s.ball[2],time:.15,reachable:false};
}
function receiver(){return delivery&&state().ballState==='pass'?delivery.target:null;}
function chaser(){
  const s=state();
  if(!['pass','loose'].includes(s.ballState)||s.terminal)return null;
  if(receiver())return receiver();
  const point={x:s.ball[0],z:s.ball[2]};
  return all().filter(a=>a!==delivery?.passer||s.age>.3).reduce((best,a)=>
    !best||distance(a,point)<distance(best,point)?a:best,null);
}
function playerAttraction(){
  if(chaser()!==player)return null;
  return {...interception(player),designated:receiver()===player};
}
function receptionGuide(actor){
  if(receiver()!==actor)return null;
  const s=state(),long=delivery.kind==='through'||delivery.kind==='lob';
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
function reset(n){
  count=clamp(n,0,members.length);owner=null;delivery=null;offside=null;command=null;lastPasser=null;lastTouch=player;
  trajectoryAt=-Infinity;trajectoryState=null;trajectory=[];player.teamCooldown=0;
  const side=player.x>=0?-1:1;
  actors().forEach((a,i)=>{
    Object.assign(a,{x:clamp(player.x+side*(i%2?-1:1)*(5+Math.floor(i/2)*3),-24,24),
      z:clamp(Math.max(line()+.65,player.z-3+(i%2)*3),2,45),y:0,yaw:0,vx:0,vz:0,
      decision:.55+i*.17,teamAction:null,teamRun:null,teamCooldown:0,teamTouch:0,
      teamThink:0,teamTarget:null,teamRole:i,controlAge:0,teamFullBody:false,teamStopped:false,teamReaction:null,canCrossEndLine:true});
    a.appearance={...player.appearance,skin:['#b9754d','#d49c78','#754933','#9d6648'][i],hair:2+i%3};
    motion.reset(a);mocap.get(a).key=null;
    mocap.update(a,{clip:'idle',grounded:true,fade:.001},1);
  });
}
function select(passer,kind,direction){
  if(passer!==player)return player;
  let best=null,value=-Infinity;
  for(const a of actors()){
    const d=distance(a,passer);if(d<1.1)continue;
    const long=kind==='through'||kind==='lob';
    const future=direction&&long?{x:a.x+direction[0]*9,z:a.z+direction[1]*9}:a;
    const futureDistance=Math.max(1,distance(future,passer));
    const alignment=direction?((future.x-passer.x)*direction[0]+(future.z-passer.z)*direction[1])/futureDistance:0;
    const score=alignment*(long?13:7)+space(a)*.35+Math.min(3,lane(passer,a))*.8-d*.06+
      (kind==='cross'?10-Math.abs(a.z-10)*.35-Math.abs(a.x)*.2:0)-(offside?.has(a)?1:0);
    if(score>value){best=a;value=score;}
  }
  return best;
}
function passPlan(passer,target,kind,direction=null,power=.5){
  power=clamp(power,.1,1);
  const d=distance(passer,target),lead=kind==='pass'?.3:clamp(d/18,.65,1.7);
  let x=target.x+(target.vx??0)*lead,z=target.z+(target.vz??0)*lead;
  let runDirection=null,advance=0,flightTime;
  if(kind==='through'||kind==='lob'){
    const autonomous=passer!==player;
    if(autonomous)direction=null;
    const pace=Math.hypot(target.vx??0,target.vz??0);
    const intent=autonomous?(pace>.55?[(target.vx??0)/pace,(target.vz??0)/pace]:(target===player?player.receiveDirection:null)):
      direction??(target===player?player.receiveDirection:null);
    const run=target.teamTarget;
    let dx=intent?.[0]??(run?run.x-target.x:target.vx??0);
    let dz=intent?.[1]??(run?Math.min(-1,run.z-target.z):Math.min(-1,target.vz??-1));
    if(autonomous&&dz>-.45)dz=-Math.max(.65,Math.abs(dx)*.75);
    else if(dz>-.2&&!intent)dz=-1;
    const length=Math.hypot(dx,dz)||1;
    runDirection=[dx/length,dz/length];
    const forward=clamp(-runDirection[1],-1,1);
    advance=clamp((kind==='lob'?4.5:3.5)+power*(kind==='lob'?20:18)+d*.08+pace*.2+Math.max(0,forward),
      kind==='lob'?5.5:4.5,kind==='lob'?23:21);
    if(autonomous){
      const roomAhead=runDirection[1]<-.2?Math.max(3,(target.z-2.8)/-runDirection[1]):18;
      const baseDepth=pace>.55
        ?(kind==='lob'?7.2:6.2)+pace*(kind==='lob'?1.2:1.05)+d*.12
        :(kind==='lob'?7.5:6.5)+d*.14;
      const minDepth=Math.min(roomAhead,kind==='lob'?7.2:6.2);
      advance=clamp(baseDepth,minDepth,Math.min(roomAhead,kind==='lob'?19.5:17.5));
    }
    x=target.x+runDirection[0]*advance;z=target.z+runDirection[1]*advance;
    if(direction){
      const projection=Math.max(3,(x-passer.x)*runDirection[0]+(z-passer.z)*runDirection[1]);
      const ray=[passer.x+runDirection[0]*projection,passer.z+runDirection[1]*projection];
      x+=clamp((ray[0]-x)*.85,-8,8);z+=clamp((ray[1]-z)*.85,-8,8);
    }
  }
  if(kind==='cross'){
    x=clamp(x,-7.5,7.5);z=clamp(z,5.5,16.8);
    const runGap=Math.hypot(x-target.x,z-target.z);
    flightTime=clamp(Math.max(.95+Math.hypot(x-passer.x,z-passer.z)*.028,runGap/5.7+.42),1.05,2.5);
  }
  x=clamp(x,-32,32);z=clamp(z,kind==='through'||kind==='lob'?2.2:.8,49);
  if(runDirection){
    advance=Math.hypot(x-target.x,z-target.z);
    if(advance>.05)runDirection=[(x-target.x)/advance,(z-target.z)/advance];
    const passDist=Math.hypot(x-passer.x,z-passer.z);
    const reaction=.22+Math.max(0,5-Math.hypot(target.vx??0,target.vz??0))*.025;
    if(kind==='lob'){
      const clearanceTime=clamp(1.52+passDist*.022,1.55,2.35);
      flightTime=Math.max(clearanceTime,advance/5.8+reaction+.15);
    }else{
      flightTime=clamp(Math.max(.55+passDist*.028,advance/6.2+reaction),.65,2.2);
    }
  }
  return {point:[x,kind==='cross'?1.75:.11,z],runDirection,advance,flightTime};
}
function kick(passer,target,kind,direction=null,power=.5){
  const s=state();
  if(!target||distance(passer,target)<1||s.ball[1]>.52)return false;
  const {point,runDirection,advance,flightTime}=passPlan(passer,target,kind,direction,power);
  const [x,,z]=point;
  snapshot(passer);lastPasser=passer;lastTouch=passer;
  const launch=physics.passLaunch(s.ball,[x,kind==='cross'?1.75:.11,z],kind,{time:flightTime});
  delivery={target,passer,kind,point:[x,z],start:[target.x,target.z],runDirection,advance,age:0,time:launch.time};
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
  const impact=header?.27:(clip==='penalty'?.22:.18);
  const clipRate=(strike.time-clipStart)/impact;
  const duration=impact+Math.min(.26,(clipEnd-strike.time)/clipRate);
  a.teamAction={kind:'shot',clip:mocap.clips[clip]?clip:'kick2',age:0,duration,clipStart,clipRate,foot:strike.foot,
    yaw:Math.atan2(a.x-(keeper.x>=0?-2.5:2.5),a.z),power,header,
    impact,jumpHeight:header?clamp(s.ball[1]-1.65,0,.72):0};
  const action=a.teamAction,geometry=mocap.shotGeometry(action.clip,strike.time,strike.foot);
  const boot=header?geometry.head:geometry.boot;
  const c=Math.cos(action.yaw),sn=Math.sin(action.yaw);
  const predicted=s.ball.map((v,i)=>v+s.velocity[i]*action.impact-(i===1?4.905*action.impact*action.impact:0));
  const correction=[predicted[0]-a.x+boot[0]*c+boot[2]*sn,predicted[2]-a.z-boot[0]*sn+boot[2]*c];
  const length=Math.hypot(...correction),scale=Math.min(1,.95/Math.max(.001,length));
  action.start=[a.x,a.z];action.adjustment=correction.map(v=>v*scale);
  command=null;
  if(immediate){a.teamAction.age=a.teamAction.impact;fire(a,a.teamAction);}
}
function prepareHeader(a,plan){
  const clipStart=plan.jump?.32:.5;
  a.teamAction={kind:'shot',header:true,headerPlan:plan,clip:plan.clip,clipStart,
    clipRate:(plan.strike-clipStart)/plan.time,age:0,impact:plan.time,duration:plan.time+.25,
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
  action.fired=true;snapshot(a);lastTouch=a;a.yaw=action.yaw;owner=null;delivery=null;command=null;
  const header=action.header,clip=action.clip,power=action.power;
  api.shoot({power,aim:{x:keeper.x>=0?-2.5:2.5,y:header?.55:1},velocity:[a.vx??0,a.vz??0],
    clip,header,foot:action.foot,finesse:!header,assisted:lastPasser===player,teamScorer:true});
}
function request(kind,direction,power=.5){
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
  if(kind==='shot')return false;
  if(s.ballState!=='controlled'||s.windup||s.charging||Math.hypot(s.ball[0]-player.x,s.ball[2]-player.z)>1.3)return false;
  return kick(player,select(player,kind,direction),kind,direction,power);
}
function preview(kind,direction,power=.5){
  const s=state(),passer=owner??(s.ballState==='controlled'?player:delivery?.target);
  if(!passer||s.terminal||s.play?.piece)return null;
  const target=passer===player?select(passer,kind,direction):player;
  if(!target)return null;
  return {...passPlan(passer,target,kind,direction,power),target};
}
function targetFor(a,index){
  const s=state(),pursuer=chaser();
  if(receiver()===a||pursuer===a)return interception(a);
  if(a.teamRun?.remaining>0)return a.teamRun;
  if(a.teamTarget&&a.teamThink>0)return a.teamTarget;
  const carrier=s.ballState==='controlled'?player:owner??pursuer??{x:s.ball[0],z:s.ball[2]};
  const wide=Math.abs(carrier.x)>9&&carrier.z<14;
  const role=[{lane:-11,depth:-3},{lane:11,depth:1},{lane:-4,depth:-6},{lane:17,depth:4}][index];
  let best=null,value=-Infinity;
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    const x=wide?(-5+index*3.2+(col-1)*2):clamp(role.lane+carrier.x*.18+(col-1)*3.3,-28,28);
    const desiredZ=wide?[10.8,16.7,7.2][(index+row)%3]:carrier.z+role.depth+(row-1)*4;
    const z=clamp(Math.max(line()+.65,desiredZ),1.2,48);
    const p={x,z};let score=space(p)*1.1+Math.min(4,lane(carrier,p))*.85-distance(p,a)*.16;
    score-=Math.max(0,5-distance(p,carrier))*3;
    for(const other of all())if(other!==a&&other!==carrier)score-=Math.max(0,4-distance(p,other))*2;
    if(wide)score-=Math.abs(z-([11,16.7,7][index%3]))*.4;
    if(score>value){best=p;value=score;}
  }
  a.teamTarget=best;a.teamThink=.38+index*.11;
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
  for(const a of actors())settleActor(a,dt);
}
function animate(a,dt){
  if(state().terminal){settleActor(a,dt);return;}
  const action=a.teamAction;
  if(action?.kind==='kick'){
    const pose=locomotionPose(a,dt);
    mocap.update(a,motion.passRecovery(a,pose,action,dt),dt);return;
  }
  if(action){
    action.age+=dt;
    const reception=action.reception;
    const receptionDone=reception&&(reception.time>=Math.min(reception.end,mocap.clips[action.clip].duration-.01)||
      reception.touched&&action.age>(action.touchedAt??action.age)+.16);
    if(action.age<action.duration&&!receptionDone){
      a.yaw+=turn(action.yaw-a.yaw)*Math.min(1,dt*14);
      const aerial=action.clip==='headerJump';
      const layeredTrap=action.kind==='trap'&&!aerial&&Math.hypot(a.vx,a.vz)>.75;
      const phase=action.age/action.duration;
      if(!layeredTrap&&!a.teamFullBody){motion.reset(a);a.teamFullBody=true;}
      if(action.start&&!action.fired){
        const t=clamp(action.age/action.impact,0,1),weight=t*t*(3-2*t);
        a.x=action.start[0]+action.adjustment[0]*weight;a.z=action.start[1]+action.adjustment[1]*weight;
      }
      const clipTime=action.kind==='shot'?action.clipStart+action.age*action.clipRate:
        action.reception?action.reception.time:
        action.clip==='receiveBall'?2.55+phase*.8:action.clip.startsWith('header')?.28+phase*1.1:phase*(mocap.clips[action.clip]?.duration??.6);
      if(action.reception){
        const r=action.reception,s=state();
        const ballGap=Math.hypot(s.ball[0]-a.x,s.ball[2]-a.z);
        const waiting=!r.touched&&['pass','loose'].includes(s.ballState)&&s.ball[1]>.45&&ballGap<3.4&&r.time>=r.contact-.05&&r.time<r.contact+.06;
        r.time+=dt*(waiting?r.rate*.15:r.rate);
      }
      let pose={clip:action.clip,time:clipTime,loop:false,fade:.1,grounded:!aerial,
        airborne:aerial,extraY:aerial?Math.sin(Math.PI*phase)*(action.jumpHeight??.4):0};
      if(layeredTrap){
        const base=locomotionPose(a,dt);
        const fadeIn=clamp(action.age/.08,0,1),fadeOut=clamp((action.duration-action.age)/.16,0,1);
        pose={...base,actionLayer:{clip:action.clip,time:clipTime,weight:fadeIn*fadeOut,
          foot:'RightFoot',upperWeight:1,legWeight:reception?.kind==='knee'?1:0}};
      }
      if(action.headerPlan){
        const lift=action.age<=action.impact?Math.sin(Math.PI*.5*clamp(action.age/action.impact,0,1)):
          Math.cos(Math.PI*.5*clamp((action.age-action.impact)/.25,0,1));
        pose.extraY=action.jumpHeight*lift;
        pose.bodyYaw=a.yaw;
        a.headerBefore=mocap.get(a).head?[...mocap.get(a).head]:null;
      }
      mocap.update(a,pose,dt);
      if(!action.headerPlan&&action.kind==='shot'&&!action.fired&&action.age>=action.impact&&action.age<action.impact+.16){
        const s=state(),rig=mocap.get(a);
        const contact=action.header?physics.bootContact(rig.head,rig.head,s.ball,s.velocity,dt,.23):
          rig.boots.some(p=>physics.bootContact(p,p,s.ball,s.velocity,dt,.12));
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
    if((!a.teamAction||a.teamAction.kind==='trap')&&!a.teamCooldown&&a!==delivery?.passer&&
      ['pass','loose'].includes(s.ballState)&&s.ball[1]>.85&&
      (receiver()===a||pursuer===a||distance(a,{x:s.ball[0],z:s.ball[2]})<4)&&
      (command?.kind==='shot'||delivery?.kind==='cross'&&a.z<24)){
      const plan=api.headerPlan(a);
      if(plan&&plan.time<.68)prepareHeader(a,plan);
    }
    if(!a.teamAction&&!a.teamCooldown&&['pass','loose'].includes(s.ballState)&&s.ball[1]>.45&&s.velocity[1]<2.6){
      const intercept=interception(a,{pace:Math.max(4.8,Math.hypot(a.vx,a.vz)),height:2.6});
      const gap=Math.hypot(intercept.x-a.x,intercept.z-a.z);
      if(intercept.reachable&&intercept.time<=.58&&intercept.y>.45&&intercept.y<2.65&&gap<3.0){
        const reception=api.reception(a,[intercept.x,intercept.y,intercept.z],intercept.time);
        const yaw=Math.atan2(a.x-intercept.x,a.z-intercept.z);
        a.teamAction={kind:'trap',clip:reception.clip,age:0,duration:1.15,yaw,reception,jumpHeight:reception.jumpHeight};
      }
    }
    let target;
    if(a.teamAction?.kind==='shot'){
      if(a.teamAction.headerPlan)moveToHeader(a,a.teamAction,dt);
      else{a.vx*=Math.exp(-dt*12);a.vz*=Math.exp(-dt*12);}
      animate(a,dt);return;
    }
    if(a===owner){
      a.controlAge+=dt;
      const candidates=[-1,-.5,0,.5,1].map(dx=>({x:clamp(a.x+dx*3,-30,30),z:a.z-3}));
      target=candidates.sort((p,q)=>(space(q)+lane(a,q)*.3-Math.abs(q.x)*.05)-(space(p)+lane(a,p)*.3-Math.abs(p.x)*.05))[0];
      a.decision-=dt;
      if(command&&s.ball[1]<.48){
        if(command.kind==='shot')shoot(a);else kick(a,player,command.kind,command.direction,command.power);
      }else if(!s.passCharging&&a.decision<=0&&a.teamCooldown===0){
        a.decision=.35+Math.random()*.3;
        const available=all().filter(b=>b!==a&&distance(a,b)>2&&b.z>=line()-.08&&lane(a,b)>1.05);
        const better=available.sort((b,c)=>(quality(c)+space(c)*.08)-(quality(b)+space(b)*.08))[0];
        const clear=lane(a,{x:keeper.x>0?-2.5:2.5,z:0})>.9;
        const playerRun=Math.hypot(player.vx??0,player.vz??0),runGap=distance(a,player);
        const advancing=(player.vz??0)<-1.2&&player.z<a.z+2;
        if(playerRun>3&&advancing&&player.z>=line()-.08&&runGap>8&&runGap<35&&space(player)>1.1){
          kick(a,player,lane(a,player)>1.8?'through':'lob');
        }else if(better&&quality(better)>quality(a)+.5&&better.z<20)kick(a,better,'pass');
        else if(a.z<19&&Math.abs(a.x)<12&&clear)shoot(a,clamp(.45+a.z*.012,.48,.76));
        else if(space(a)<1.8&&better)kick(a,better,better.z<a.z-4?'through':'pass');
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
    const cap=a===owner?(a.controlAge<.22?1.6:4.3):receiving?6.25:5.5;
    const speed=receiving?Math.min(cap,d/Math.max(.14,target.time??.2)+.35):Math.min(cap,d*2.5);
    motion.move(a,{dt,direction:d>.1?[dx/d,dz/d]:[0,0],speed,sprint:speed>4.5,
      ball:s.ball,velocity:s.velocity,controlled:a===owner});
    animate(a,dt);
  });
}
function touch(dt,from=0,to=1){
  const s=state();if(!count||s.terminal||s.play?.piece)return;
  if(owner&&s.ballState==='teammate'){
    const a=owner,gap=Math.hypot(a.x-s.ball[0],a.z-s.ball[2]);
    if(gap>1.65||s.ball[1]>.7){owner=null;api.loose();return;}
    a.teamTouch=(a.teamTouch??0)-dt;
    const bootContact=mocap.get(a).boots.some(p=>Math.hypot(p[0]-s.ball[0],p[1]-s.ball[1],p[2]-s.ball[2])<.44);
    if(a.teamTouch<=0&&s.ball[1]<.4&&a.teamAction?.kind!=='shot'&&bootContact){
      a.teamTouch=.19;
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
  for(const a of actors()){
    const action=a.teamAction;
    if(!action?.headerPlan||action.fired||action.age<action.impact-.1||action.age>action.impact+.2)continue;
    const head=mocap.get(a).head;
    if(!head)continue;
    const previous=a.headerBefore??head;
    const before=head.map((v,i)=>previous[i]+(v-previous[i])*from);
    const after=head.map((v,i)=>previous[i]+(v-previous[i])*to);
    if(physics.bootContact(before,after,s.ball,s.velocity,dt,.18)){fire(a,action);return;}
  }
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
        a.teamAction={kind:'trap',clip:aa.clip,age:0,duration:1.0,yaw:a.yaw,reception:aa,jumpHeight:aa.jumpHeight};
      }
      if(!aa||aa.touched||aa.time<aa.contact-.34||aa.time>aa.contact+.42)continue;
      const rig=mocap.get(a),fx=-Math.sin(a.yaw),fz=-Math.cos(a.yaw),c=rig.chest;
      const points=aa.kind==='knee'?rig.knees:aa.kind==='head'?[rig.head]:
        [[c[0]+fx*.11,c[1]+.02,c[2]+fz*.11],[c[0]+fx*.08,c[1]+.15,c[2]+fz*.08],[c[0]+fx*.09,c[1]-.20,c[2]+fz*.09]];
      const contact=points.some(point=>physics.aerialControl(s.ball,s.velocity,s.spin,
        {point,dt,heading:a.yaw,pace:Math.min(2.2,Math.hypot(a.vx,a.vz)),kind:aa.kind}));
      if(!contact)continue;
      if(involvement(a))return;
      aa.touched=true;a.teamAction.touchedAt=a.teamAction.age;lastTouch=a;a.teamCooldown=.16;
      delivery=null;api.loose();return;
    }
    if(gap>.88)continue;
    if(involvement(a))return;
    const pace=Math.hypot(a.vx??0,a.vz??0);
    const direction=a===player?player.receiveDirection:null;
    const heading=direction?Math.atan2(-direction[0],-direction[1]):a.yaw;
    physics.receiveTouch(s.ball,s.velocity,s.spin,heading,a===player?Math.min(3.2,pace):Math.min(1.6,pace*.45),[s.ball[0]-a.x,s.ball[2]-a.z]);
    delivery=null;offside=null;lastTouch=a;a.teamCooldown=.12;trajectoryAt=-Infinity;
    if(a===player){owner=null;api.control();}
    else{
      owner=a;a.decision=.3;a.teamTouch=.08;a.controlAge=0;a.teamAction=null;
      a.vx*=.55;a.vz*=.55;motion.reset(a);api.possess();
    }
    return;
  }
}
return {reset,actors,request,update,touch,settle,snapshot,involvement,interception,playerAttraction,receptionGuide,preview,chaser,canReceive,
  get delivery(){return delivery;},
  credit:()=>({teamScorer:!!lastTouch&&lastTouch!==player,assisted:lastTouch!==player&&lastPasser===player}),
  playerTouch(){lastTouch=player;owner=null;delivery=null;offside=null;player.teamCooldown=0;trajectoryAt=-Infinity;},get owner(){return owner;}};
};
