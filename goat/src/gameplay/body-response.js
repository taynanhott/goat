window.createFootballBodyResponse=function(){
'use strict';
const states=new WeakMap(),events=new WeakMap();
let context={active:false};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
const angle=v=>Math.atan2(Math.sin(v),Math.cos(v));
const pulse=(t,start,peak,end)=>smooth((t-start)/Math.max(.001,peak-start))*(1-smooth((t-peak)/Math.max(.001,end-peak)));
function impact(actor,velocity,part='body',strength=1){
  if(!actor||!velocity?.every(Number.isFinite))return;
  const old=events.get(actor),energy=Math.hypot(...velocity)*strength;
  if(old&&old.age<.10&&old.energy>=clamp(energy/18,0,1))return;
  events.set(actor,{velocity:[...velocity],part,energy:clamp(energy/18,0,1),age:0});
}
function response(actor,pose,dt,rig,clip){
  if(pose.q||pose.bodyResponse===false||!context.active)return null;
  if(!(dt>0&&dt<.1)){states.delete(actor);events.delete(actor);return null;}
  let s=states.get(actor);
  if(!s||Math.hypot(actor.x-s.x,actor.z-s.z)>1.8||pose.time<s.time-.15&&pose.clip===s.clip&&!pose.loop){
    s={x:actor.x,z:actor.z,vx:actor.vx||0,vz:actor.vz||0,yaw:pose.bodyYaw??actor.yaw??0,
      side:0,forward:0,sideV:0,forwardV:0,landing:0,air:false,recover:0,age:0,time:pose.time??0,clip:pose.clip};
    states.set(actor,s);events.delete(actor);
  }
  const yaw=pose.bodyYaw??actor.yaw??0,mirror=pose.mirror?-1:1;
  const sideX=Math.cos(yaw),sideZ=-Math.sin(yaw),frontX=-Math.sin(yaw),frontZ=-Math.cos(yaw);
  const measured=[(actor.x-s.x)/dt,(actor.z-s.z)/dt];
  const vx=actor.goalie?measured[0]:actor.vx||0,vz=actor.goalie?measured[1]:actor.vz||0;
  const speed=Math.hypot(vx,vz),ax=(vx-s.vx)/dt,az=(vz-s.vz)/dt;
  const turn=clamp(angle(yaw-s.yaw)/dt,-10,10);
  const held=typeof actor.grip==='number'?actor.grip:actor.grip?.weight??0;
  const other=actor.gripActor;
  let contactSide=other?Math.sign((other.x-actor.x)*sideX+(other.z-actor.z)*sideZ):0;
  let proximity=0;
  for(const otherActor of context.actors??[]){
    if(otherActor===actor)continue;
    const dx=actor.x-otherActor.x,dz=actor.z-otherActor.z,gap=Math.hypot(dx,dz);
    if(gap>.85||gap<.001)continue;
    const closing=-((vx-(otherActor.vx||0))*dx+(vz-(otherActor.vz||0))*dz)/gap;
    const weight=smooth((.85-gap)/.30)*clamp(closing/3+.15,0,1);
    if(weight>proximity){proximity=weight;contactSide=-(dx*sideX+dz*sideZ)/gap;}
  }
  const event=events.get(actor);
  if(event){event.age+=dt;if(event.age>.65)events.delete(actor);}
  const hit=event?pulse(event.age,0,.055,.52)*event.energy:0;
  const hitSide=event?clamp((event.velocity[0]*sideX+event.velocity[2]*sideZ)/18,-1,1):0;
  const hitForward=event?clamp((event.velocity[0]*frontX+event.velocity[2]*frontZ)/18,-1,1):0;
  const lateral=clamp(-(ax*sideX+az*sideZ)*.006+contactSide*(held*.11+proximity*.14)+hitSide*hit*.22,-.25,.25);
  const forward=clamp(-(ax*frontX+az*frontZ)*.005+hitForward*hit*.20,-.20,.20);
  for(let remaining=dt;remaining>0;){
    const h=Math.min(remaining,1/120);remaining-=h;
    s.sideV+=((lateral-s.side)*155-s.sideV*21)*h;
    s.forwardV+=((forward-s.forward)*155-s.forwardV*21)*h;
    s.side=clamp(s.side+s.sideV*h,-.26,.26);
    s.forward=clamp(s.forward+s.forwardV*h,-.21,.21);
  }
  const action=actor.aerialAction??actor.aerialReceive??actor.teamAction;
  const layer=pose.actionLayer,actionClip=layer?.clip??pose.clip;
  const time=layer?.time??pose.time??0;
  const header=/^header/.test(actionClip);
  const trap=!!action?.reception||['knee','chest','head','headerTrap','receive'].includes(action?.kind)||action?.touched!==undefined;
  const volley=actionClip==='volley';
  const kick=!trap&&!header&&(/kick|strike|penalty|chip|placed/i.test(actionClip)||action?.kind==='kick'||action?.kind==='shot');
  const cut=/fake|sole|reversal|lateral/i.test(pose.poseName??actionClip);
  const fall=/fall|trip|tackleReact/i.test(pose.poseName??actionClip);
  const tackle=/tackle|slide/i.test(actionClip)||(actor.action?.kind==='tackle'||actor.action?.slide===true);
  const getup=/getup/i.test(actionClip)||actor.action?.kind==='getup';
  const sad=/sad/i.test(actionClip)||/Sad/.test(pose.poseName??'');
  const celebrate=/celebr|victory|goalReaction/i.test(pose.poseName??actionClip);
  const saved=actor.goalie&&!!clip?.saveKind;
  const airborne=!!pose.airborne||saved&&(pose.time??0)>(clip.takeoff??.15)&&(pose.time??0)<(clip.land??clip.duration*.75);
  const contact=pose.bodyContactTime??action?.reception?.contact??action?.headerPlan?.strike??
    (action?.clip===actionClip?action.contact:undefined)??clip?.contact??(header?(actionClip==='headerJump'?.92:.97):volley?.55:trap&&actionClip==='receiveBall'?2.95:.40);
  const duration=clip?.duration??1;
  const activeAction=header||volley||kick||trap||saved||tackle;
  const start=pose.bodyStartTime??action?.reception?.startT??action?.startT??action?.clipStart??(header?.28:0);
  const lead=Math.max(.06,contact-start);
  const prepare=activeAction?pulse(time,start,start+lead*.32,contact):0;
  const impulse=activeAction?pulse(time,contact-Math.min(.24,lead*.5),contact-.06,contact+.10):0;
  const follow=activeAction?pulse(time,contact,contact+.12,Math.min(duration+.1,contact+.55)):0;
  const contactGuard=activeAction?smooth(Math.abs(time-contact)/.16):1;
  if(s.air&&!airborne)s.landing=clamp(.45+speed*.07+Math.abs(s.forwardV)*.07,0,1);
  s.landing=Math.max(0,s.landing-dt*3.2);
  if(s.clip!==pose.clip){
    if(s.action&&!activeAction)s.recover=Math.max(s.recover,.7);
    s.age=0;
  }
  s.age+=dt;s.recover=Math.max(0,s.recover-dt*2.6);
  const landing=smooth(s.landing),recovery=smooth(s.recover);
  const brake=clamp(-(ax*frontX+az*frontZ)/12,0,1),accel=clamp((ax*frontX+az*frontZ)/12,0,1);
  const balance=clamp(Math.abs(s.side)+Math.abs(s.forward)+proximity*.18,0,.55);
  const fatigue=actor===context.player?clamp(context.fatigue??0,0,1):0;
  const carrying=context.ballState==='controlled'&&actor===context.player||context.ballState==='teammate'&&actor===context.owner;
  const shielding=carrying?clamp(held+proximity*.6,0,1):0;
  const offsets={},patch={};
  const put=(name,x=0,y=0,z=0)=>{
    const old=offsets[name]??[0,0,0];
    offsets[name]=[clamp(old[0]+x,-.7,.7),clamp(old[1]+y,-.45,.45),clamp(old[2]+z,-.7,.7)];
  };
  const strength=(fall||getup)?.25:1;
  const ball=context.ball,ballVelocity=context.velocity??[0,0,0];
  const bx=ball?ball[0]-actor.x:0,bz=ball?ball[2]-actor.z:0;
  const ballGap=Math.hypot(bx,bz),incoming=ballGap>.01?-(bx*ballVelocity[0]+bz*ballVelocity[2])/ballGap:0;
  const approaching=!context.terminal&&!activeAction&&ball&&['pass','loose'].includes(context.ballState)&&incoming>1;
  const arrival=approaching?ballGap/incoming:Infinity;
  const anticipation=approaching?smooth((.65-arrival)/.45)*smooth((ballGap-.25)/.6):0;
  const ballSide=clamp((bx*sideX+bz*sideZ)/Math.max(.3,ballGap),-1,1)*mirror;
  const ballFront=clamp((bx*frontX+bz*frontZ)/Math.max(.3,ballGap),-1,1);
  const highBall=ball?clamp((ball[1]-.6)/1.2,0,1):0;
  const anatomySide=s.side*mirror*strength,anatomyForward=s.forward*strength;
  for(const [side,sign] of [['Left',1],['Right',-1]]){
    const protectedHand=(pose.handTargets??[]).some(target=>target.hand===side+'Hand')||
      (pose.ballContacts??[]).some(target=>target.limb===side+'Hand');
    const armWeight=actor.goalie?(protectedHand?.12:saved?.25:.65):1;
    const aerial=volley||actionClip==='headerJump';
    put(side+'Arm',armWeight*(-.22*prepare*Number(aerial)+.30*impulse*Number(aerial)-.16*follow-.13*landing+anatomyForward*.6-.09*accel),
      armWeight*sign*anatomySide*.3,
      armWeight*(-sign*(.17*prepare*Number(aerial)+.32*impulse*Number(aerial)+.18*follow+.20*landing+balance*.6+.12*recovery)-anatomySide*.45));
    put(side+'ForeArm',armWeight*(-.22*prepare*Number(aerial)-.28*impulse*Number(aerial)-.18*landing-balance*.45-.08*recovery));
    if(kick||cut){
      const foot=layer?.foot??pose.bodyFoot??action?.foot??'RightFoot';
      const kickingSide=foot.startsWith(side)?1:-1;
      put(side+'Arm',-.12*prepare+.15*follow*kickingSide,sign*.10*impulse,-sign*.20*(prepare+follow*.6));
    }
    if(shielding>.01){
      const near=sign*contactSide*mirror>0?1:.35;
      put(side+'Arm',-.12*shielding*near,sign*.08*shielding,-sign*.25*shielding*near);
      put(side+'ForeArm',-.20*shielding*near);
    }
    if(trap){
      put(side+'Arm',-.12*prepare,sign*.08*prepare,-sign*.24*(prepare+follow*.4));
      put(side+'ForeArm',-.12*prepare);
    }
    if(tackle&&!actor.goalie)put(side+'Arm',-.12*prepare,0,-sign*.17*(prepare+follow));
    if(!pose.ankleTargets&&!pose.footPlant&&!pose.footPlants&&!pose.ballContacts?.some(t=>t.limb.endsWith('Foot'))&&!layer&&!pose.authoredGround){
      const crouch=landing*.23+brake*.12+recovery*.09;
      put(side+'UpLeg',(-.12*prepare*Number(aerial)+.13*impulse*Number(aerial))*contactGuard-crouch*.5,0,sign*anatomySide*.10);
      put(side+'Leg',(.29*prepare+.31*impulse)*Number(aerial)*contactGuard+crouch);
      put(side+'Foot',-.12*impulse*Number(aerial)*contactGuard-crouch*.35);
    }
  }
  if(anticipation>0&&!actor.goalie){
    for(const [side,sign] of [['Left',1],['Right',-1]]){
      put(side+'Arm',-.12*anticipation*highBall,sign*ballSide*.08*anticipation,-sign*.16*anticipation);
      put(side+'ForeArm',-.12*anticipation);
    }
    put('Spine2',0,ballSide*.11*anticipation,0);
  }
  if(!pose.authoredGround&&!pose.pelvis){
    const guard=contactGuard*(actor.goalie&&saved?.15:1);
    put('Spine',(anatomyForward*.35+fatigue*.035-prepare*.05*Number(trap))*guard,-turn*.005*guard,anatomySide*.36*guard);
    put('Spine1',anatomyForward*.24*guard,turn*.008*guard,anatomySide*.25*guard);
    if(kick||cut)put('Spine2',0,clamp(turn*.013,-.10,.10)*contactGuard,0);
    if(header&&!trap){
      put('Spine',(.055*prepare-.045*follow)*contactGuard,0,0);
      put('Spine2',(.035*prepare-.025*follow)*contactGuard,0,0);
    }
    if(trap)put('Spine2',(-.045*prepare+.055*follow)*contactGuard,ballSide*.035*prepare*contactGuard,0);
  }
  if(!activeAction&&!pose.authoredGround&&!fall&&!getup&&speed>.2){
    const lateralTravel=(vx*sideX+vz*sideZ)/Math.max(.1,speed);
    const backwardTravel=clamp(-(vx*frontX+vz*frontZ)/Math.max(.1,speed),0,1);
    put('Spine2',0,clamp(lateralTravel*.06+turn*.007,-.12,.12),0);
    for(const [side,sign] of [['Left',1],['Right',-1]]){
      put(side+'Arm',backwardTravel*.06,0,-sign*Math.abs(lateralTravel)*.045);
    }
  }
  if(event&&!actor.goalie&&hit>.001){
    if(event.part==='head')put('Neck',hitForward*hit*.035,0,hitSide*hit*.035);
    else if(event.part==='knee'||event.part==='foot'){
      for(const side of ['Left','Right'])put(side+'ForeArm',-.10*hit);
    }else if(!pose.authoredGround)put('Spine2',hitForward*hit*.065,0,hitSide*hit*.065);
  }
  if(sad||celebrate){
    const entry=1-smooth(s.age/.45);
    put('Spine',-brake*.07*entry+(sad?.035:0),0,anatomySide*.2*entry);
    for(const side of ['Left','Right'])put(side+'Arm',anatomyForward*.5*entry);
  }
  if(actor.goalie){
    if(saved){
      for(const [side,sign] of [['Left',1],['Right',-1]]){
        if(!(pose.handTargets??[]).some(t=>t.hand===side+'Hand')){
          put(side+'Arm',-.07*prepare+.08*follow,0,-sign*.08*prepare);
        }
      }
    }
    if(!saved&&!getup){
      const ready=clamp(context.shotThreat??0,0,1);
      put('Spine',-.055*ready+anatomyForward*.3,0,anatomySide*.22);
      for(const [side,sign] of [['Left',1],['Right',-1]]){
        put(side+'Arm',-.10*ready,0,-sign*.10*ready);
        put(side+'ForeArm',-.08*ready);
      }
    }
    if(event&&hit>.001){
      const hand=event.part==='LeftHand'||event.part==='RightHand'?event.part.replace('Hand',''):null;
      if(hand){put(hand+'ForeArm',-.15*hit);put(hand+'Hand',-.07*hit);}
      else put('Spine',hitForward*hit*.10,0,hitSide*hit*.10);
    }
  }
  if(!actor.goalie&&!fall&&!getup&&!pose.authoredGround&&pose.ankleTargets?.length){
    const adjust=clamp(balance+landing*.35+recovery*.18,0,.4)*contactGuard;
    if(adjust>.015)patch.ankleTargets=pose.ankleTargets.map(target=>{
      const swing=1-clamp(target.groundWeight??1,0,1);
      if(swing<.1)return target;
      const distance=clamp(anatomySide*.09,-.022,.022)*adjust*swing;
      const point=[...target.point];
      point[0]+=sideX*distance;point[2]+=sideZ*distance;
      return {...target,point,kneeBend:Math.min(1.1,(target.kneeBend??0)+adjust*swing*.06)};
    });
  }
  if(!pose.authoredGround&&!pose.pelvis&&!fall&&!getup&&!activeAction&&!airborne&&!pose.ankleTargets?.length&&
    !pose.footPlant&&!pose.footPlants&&!pose.ballContacts?.length&&speed<1.2&&proximity<.12&&rig.feet?.length===2){
    if(landing>.1||recovery>.25||balance>.12){
      if(!s.support){
        const index=rig.feet[0][1]<rig.feet[1][1]?0:1;
        s.support={index,point:[...rig.feet[index]],age:0};
        s.support.point[1]=Math.max(.045,Math.min(.14,s.support.point[1]));
      }
      const support=s.support;support.age+=dt;
      const gap=Math.hypot(support.point[0]-actor.x,support.point[2]-actor.z);
      if(gap<.42&&support.age<.40)patch.footPlants=[{foot:support.index===0?'LeftFoot':'RightFoot',
        point:support.point,weight:smooth(support.age/.06)*(1-smooth((support.age-.22)/.18))*.55}];
    }else s.support=null;
  }else s.support=null;
  if(pose.ankleTargets?.length&&!fall&&!getup&&!activeAction&&!airborne){
    const targets=patch.ankleTargets??pose.ankleTargets;
    const adjustment=(brake*.05+anticipation*.04+landing*.06)*contactGuard;
    if(adjustment>.002)patch.ankleTargets=targets.map(target=>({...target,
      kneeBend:Math.min(1.1,(target.kneeBend??0)+adjustment),
      pitch:(target.pitch??0)-anticipation*ballFront*.025*(1-(target.groundWeight??1))}));
  }
  Object.assign(s,{x:actor.x,z:actor.z,vx,vz,yaw,air:airborne,time:pose.time??0,clip:pose.clip,action:activeAction});
  const eased={};
  for(const name of new Set([...Object.keys(s.offsets??{}),...Object.keys(offsets)])){
    const target=offsets[name]??[0,0,0],previous=s.offsets?.[name]??[0,0,0];
    const weight=1-Math.exp(-dt*(event?22:16));
    eased[name]=target.map((value,index)=>previous[index]+(value-previous[index])*weight);
    if(Math.max(...eased[name].map(Math.abs))<.0001&&!offsets[name])delete eased[name];
  }
  s.offsets=eased;
  return {offsets:eased,patch};
}
response.impact=impact;
response.setContext=value=>{context=value??{active:false}};
response.reset=actor=>{states.delete(actor);events.delete(actor)};
return response;
};
