const footballPitch=window.goatStadiums.pitch;
const footballPlayLimits=Object.freeze({side:footballPitch.width/2,front:.9,back:footballPitch.centerZ});
const footballGoalLineZ=-.11;
const footballEndLineRunoff=footballGoalLineZ-.60;
function playerFrontLimit(player){
  return player.canCrossEndLine?footballEndLineRunoff:footballPlayLimits.front;
}
window.createFootballBallPhysics=function(){
'use strict';
const config={radius:.11,mass:.43,gravity:9.81,airDensity:1.225,dragCoefficient:.22,magnus:.0022,rollingResistance:.62,grassDrag:.018,freeRollingResistance:1.18,freeGrassDrag:.066,slidingFriction:.24,postRestitution:.70},r=config.radius,air=.5*config.airDensity*config.dragCoefficient*Math.PI*r*r/config.mass,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],subtract=(a,b)=>a.map((v,i)=>v-b[i]),unit=v=>{let l=Math.hypot(...v)||1;return v.map(x=>x/l)};
function step(p,v,spin,dt,freeRoll=false){
const ground=p[1]<=r+.002&&Math.abs(v[1])<=.08;
if(ground){
  const resistance=freeRoll?config.freeRollingResistance:config.rollingResistance;
  const grassDrag=freeRoll?config.freeGrassDrag:config.grassDrag;
  const speed=Math.hypot(v[0],v[2]);
  const factor=speed>0?Math.max(0,1-(resistance+grassDrag*speed*speed)*dt/speed):0;
  v[0]*=factor;
  v[2]*=factor;
  v[1]=0;
  p[1]=r;
  const blend=1-Math.exp(-dt*12);
  spin[0]+=(v[2]/r-spin[0])*blend;
  spin[2]+=(-v[0]/r-spin[2])*blend;
  spin[1]*=Math.exp(-dt*2);
}else{
  const speed=Math.hypot(...v),lift=cross(spin,v);
  for(let i=0;i<3;i++)v[i]+=(-air*speed*v[i]+config.magnus*lift[i]-(i===1?config.gravity:0))*dt;
}
for(let i=0;i<3;i++)p[i]+=v[i]*dt;
if(p[1]<r){p[1]=r;let impact=-v[1];v[1]=impact>.75?impact*(.48+.09*Math.min(1,impact/8)):0;let tangent=Math.hypot(v[0],v[2]),loss=Math.min(tangent,impact*config.slidingFriction);if(tangent>0){v[0]*=(tangent-loss)/tangent;v[2]*=(tangent-loss)/tangent}}
let decay=Math.exp(-dt*.16);for(let i=0;i<3;i++)spin[i]*=decay;if(p[1]<=r+.002&&Math.hypot(...v)<.035){v[0]=v[1]=v[2]=0;spin[0]=spin[1]=spin[2]=0}
}
function bootContact(before,after,position,velocity,dt,padding=.08){
  if(!after)return false;
  const reach=r+padding;
  if(Math.hypot(...subtract(after,position))<=reach)return true;
  if(!before)return false;
  const start=subtract(before,position);
  const travel=after.map((value,index)=>value-before[index]-velocity[index]*dt);
  const magnitude=dot(travel,travel);
  if(magnitude<1e-8)return false;
  const t=clamp(-dot(start,travel)/magnitude,0,1);
  return Math.hypot(...start.map((v,i)=>v+travel[i]*t))<=reach;
}

function sweepBoot(before,after,position,velocity,dt,margin=0){
  const reach=r+after.radius+margin;
  const relativeStart=subtract(position,before.center);
  const bootVelocity=after.center.map((value,index)=>(value-before.center[index])/dt);
  const travel=velocity.map((value,index)=>(value-bootVelocity[index])*dt);
  const a=dot(travel,travel),b=dot(relativeStart,travel),c=dot(relativeStart,relativeStart)-reach*reach;
  if(c>0&&(a<1e-10||b>=0||b*b<a*c))return null;
  const time=c<=0?0:(-b-Math.sqrt(b*b-a*c))/a;
  if(time<0||time>1)return null;
  const separation=relativeStart.map((value,index)=>value+travel[index]*time);
  const spatialNormal=unit(separation);
  const normal=unit([separation[0],0,separation[2]]);
  const relativeVelocity=subtract(bootVelocity,velocity);
  return {normal,spatialNormal,bootVelocity,approach:dot(relativeVelocity,normal),
    approach3D:dot(relativeVelocity,spatialNormal),time,overlap:c<=0};
}

function separateBoot(position,ballVelocity,boot){
  const reach=r+boot.radius+.001;
  const delta=subtract(position,boot.center);
  const length=Math.hypot(...delta);
  if(length>=reach)return false;
  if(length>1e-5&&boot.center[1]+delta[1]*reach/length>=r){
    for(let i=0;i<3;i++)position[i]=boot.center[i]+delta[i]*reach/length;
  }else{
    const vertical=r-boot.center[1];
    const distance=Math.sqrt(Math.max(0,reach*reach-vertical*vertical));
    let normal=unit([delta[0],0,delta[2]]);
    if(Math.hypot(normal[0],normal[2])<.1)normal=unit([ballVelocity[0]+.001,0,ballVelocity[2]-.002]);
    position[0]=boot.center[0]+normal[0]*distance;
    position[1]=r;
    position[2]=boot.center[2]+normal[2]*distance;
  }
  return true;
}

function deflectBoot(velocity,hit,pace,controlled){
  const normal=hit.spatialNormal;
  const approach=controlled?Math.min(.075,Math.max(0,-dot(velocity,normal))):Math.min(2.7,Math.max(0,hit.approach3D));
  const limit=Math.max(Math.hypot(velocity[0],velocity[2]),pace+.26);
  const outgoing=velocity.map((value,index)=>value+normal[index]*approach);
  const speed=Math.hypot(outgoing[0],outgoing[2]);
  const cap=controlled&&speed>limit?limit/speed:1;
  velocity[0]=outgoing[0]*cap;
  velocity[1]=outgoing[1];
  velocity[2]=outgoing[2]*cap;
}

function freeBallBetweenBoots(position,velocity,boots){
  const sections=[];
  let overlapping=false;
  for(const boot of boots){
    const radius=r+boot.radius+.001;
    const offset=subtract(boot.center,position);
    const radiusSq=radius*radius-offset[1]*offset[1];
    if(radiusSq<=0)continue;
    const surface=offset[0]*offset[0]+offset[2]*offset[2]-radiusSq;
    sections.push({x:offset[0],z:offset[2],surface});
    if(surface<-.00005)overlapping=true;
  }
  if(!overlapping)return;
  const heading=Math.atan2(velocity[2],velocity[0]);
  let nearest=null;
  for(let index=0;index<8;index++){
    const angle=heading+index*Math.PI/4;
    const x=Math.cos(angle),z=Math.sin(angle);
    const intervals=[];
    for(const section of sections){
      const middle=x*section.x+z*section.z;
      const inside=middle*middle-section.surface;
      if(inside<=0)continue;
      const half=Math.sqrt(inside);
      if(middle+half>0)intervals.push([middle-half,middle+half]);
    }
    intervals.sort((a,b)=>a[0]-b[0]);
    let distance=0;
    for(const interval of intervals){
      if(interval[0]>distance)break;
      distance=Math.max(distance,interval[1]+.0004);
    }
    if(!nearest||distance<nearest.distance)nearest={x,z,distance};
  }
  position[0]+=nearest.x*nearest.distance;
  position[2]+=nearest.z*nearest.distance;
}

function limitDribbleAtEdges(outgoing,position){
  if(!position)return outgoing;
  const speedToEdge=room=>{
    const stopping=Math.sqrt(2*config.rollingResistance*room);
    const contactWindow=room/.36;
    const near=clamp((1.40-room)/.82,0,1);
    return contactWindow+(stopping-contactWindow)*near;
  };
  const [x,,z]=position;
  const [vx,vz]=outgoing;
  const backRoom=footballPlayLimits.back+.18-z;
  const sideRoom=footballPlayLimits.side+.20-Math.sign(vx)*x;
  return [
    Math.sign(vx)*Math.min(Math.abs(vx),speedToEdge(Math.max(0,sideRoom))),
    vz>0?Math.min(vz,speedToEdge(Math.max(0,backRoom))):vz
  ];
}

function brakeDribble(position,velocity,target,rate,dt){
  if(position[1]>r+.018||Math.abs(velocity[1])>.14)return;
  const speed=Math.hypot(velocity[0],velocity[2]);
  if(speed<=target)return;
  const scale=Math.max(target,speed-rate*dt)/speed;
  velocity[0]*=scale;
  velocity[2]*=scale;
}

function approachRollingVelocity(velocity,target,acceleration,dt){
  const dx=target[0]-velocity[0],dz=target[1]-velocity[2];
  const blend=Math.min(1,acceleration*dt/Math.max(.001,Math.hypot(dx,dz)));
  velocity[0]+=dx*blend;
  velocity[2]+=dz*blend;
}

function guideCharge(position,velocity,target,carry,dt){
  if(position[1]>r+.035||Math.abs(velocity[1])>.25)return;
  const correction=[target[0]-position[0],target[1]-position[2]];
  const error=Math.hypot(...correction);
  const gain=Math.min(6.0,3.9/Math.max(.001,error));
  const outgoing=carry.map((value,i)=>value+correction[i]*gain);
  const acceleration=21+clamp((error-.48)*32,0,24);
  approachRollingVelocity(velocity,limitDribbleAtEdges(outgoing,position),acceleration,dt);
}

function steadyDribble(position,velocity,offset,target,carry,opening,dt){
  if(position[1]>r+.025||Math.abs(velocity[1])>.18)return;
  const outgoing=carry.map((speed,i)=>speed+(target[i]-offset[i])*(opening?4.2:3.7));
  approachRollingVelocity(velocity,limitDribbleAtEdges(outgoing,position),opening?18:12,dt);
}

function rollUnderSole(position,velocity,spin,point,axis,maxPace,dt){
  const remaining=(point[0]-position[0])*axis[0]+(point[2]-position[2])*axis[1];
  const pace=clamp(remaining/.019,0,maxPace);
  approachRollingVelocity(velocity,limitDribbleAtEdges(axis.map(value=>value*pace),position),70,dt);
  velocity[1]=0;
  spin[0]=velocity[2]/r;
  spin[1]*=Math.exp(-dt*12);
  spin[2]=-velocity[0]/r;
}

function receiveTouch(position,velocity,spin,heading,pace,offset){
  const axis=[-Math.sin(heading),-Math.cos(heading)];
  const side=[axis[1],-axis[0]];
  const incoming=velocity[0]*axis[0]+velocity[2]*axis[1];
  const sideways=velocity[0]*side[0]+velocity[2]*side[1];
  const lateral=offset[0]*side[0]+offset[1]*side[1];
  const forward=clamp(pace+.34+(incoming-pace)*.24,pace+.19,pace+.74);
  const correction=clamp(sideways*.12-lateral*.95,-.44,.44);
  const outgoing=limitDribbleAtEdges(axis.map((value,i)=>value*forward+side[i]*correction),position);
  velocity[0]=outgoing[0];
  velocity[1]=0;
  velocity[2]=outgoing[1];
  spin[0]=velocity[2]/r;
  spin[1]=0;
  spin[2]=-velocity[0]/r;
}

function groundTouch(velocity,spin,hit,{kind,heading,pace,offset,acceleration=0,position,wishHeading,exit,sprint=true}){
  const {normal,bootVelocity,approach}=hit;
  const turn=Number.isFinite(wishHeading)?Math.atan2(Math.sin(wishHeading-heading),Math.cos(wishHeading-heading)):0;
  const steering=kind==='trap'?0:clamp(turn*(kind==='cut'?.6:.42),-.34,.34);
  const forward=[-Math.sin(heading+steering),0,-Math.cos(heading+steering)];
  const tangent=[-normal[2],0,normal[0]];
  const tangentSpeed=dot(subtract(bootVelocity,velocity),tangent);
  const trap=kind==='trap',cut=kind==='cut';
  const lead=offset ? Math.max(0,offset[0]*forward[0]+offset[1]*forward[2]) : 0;
  const sideways=offset ? offset[0]*forward[2]-offset[1]*forward[0] : 0;
  const redirect=clamp(Math.abs(turn)/1.1,0,1);
  const burst=kind==='carry' ? acceleration*clamp((.65-lead)/.30,0,1)*(1-.75*redirect) : 0;
  const normalChange=Math.min(trap?3.1:4.7,approach*(trap?.62:.87));
  const sideChange=clamp(tangentSpeed*(cut?.38:.13),-normalChange*.45,normalChange*.45);
  const headingShare=trap?0:cut?.69:.78;
  const aim=unit(normal.map((value,index)=>value*(1-headingShare)+forward[index]*headingShare));
  let outgoing=[0,2].map(index=>velocity[index]+aim[index]*normalChange+tangent[index]*sideChange);
  if(cut&&exit&&position){
    const delta=[exit.target[0]-position[0],exit.target[1]-position[2]];
    const initialSpeed=Math.hypot(...delta)/exit.duration;
    const loss=(config.rollingResistance+config.grassDrag*initialSpeed*initialSpeed)*exit.duration*.5;
    const correction=initialSpeed>.01?1+loss/initialSpeed:1;
    outgoing=delta.map(value=>value/exit.duration*correction);
  }else if(!trap){
    const carrySpeed=dot(velocity,forward);
    const push=dot(normal,forward);
    const control=clamp((push+.25)/1.05,0,1);
    const drive=clamp(pace+approach*.33+.44+burst-carrySpeed,0,3.6)*control;
    const length=Math.max(dot([outgoing[0],0,outgoing[1]],forward),carrySpeed+drive);
    const lateralRecovery=sprint?1.43:1.79;
    const lateralLimit=sprint?.52:.46;
    const carrySide=clamp((outgoing[0]*forward[2]-outgoing[1]*forward[0])*.57-sideways*lateralRecovery,-lateralLimit,lateralLimit);
    outgoing=[forward[0]*length+forward[2]*carrySide,forward[2]*length-forward[0]*carrySide];
  }
  const runTouch=kind==='carry'&&pace>3.1;
  const paceBonus=runTouch?clamp(.70-(lead-.38)*1.65,.07,.66):(cut?.56:.61)+Math.min(approach*.065,.20);
  const leadTarget=sprint?.405+Math.min(5.6,pace)*.024:.295+Math.min(3.4,pace)*.020;
  const closeTouch=clamp((leadTarget-lead)/.32,-.61,.40);
  const rollingAllowance=(config.rollingResistance+config.grassDrag*pace*pace)*.17;
  const extraStart=burst*.28*clamp((3.75-pace)/2.45,0,1);
  const pacedLimit=Math.max(1.05,pace+rollingAllowance+closeTouch+burst*.92+extraStart-redirect*.28);
  const steadyPace=clamp((pace-3.6)/1.8,0,1);
  const runningLimit=Math.max(1.20,pace+paceBonus*(1-steadyPace*.48)+burst);
  const cutLimit=sprint?clamp(Math.max(pace+.85,(exit?.pace??pace)+.60),1.35,5.85):
    clamp(Math.max(pace+.47,(exit?.pace??pace)+.32),1.20,4.03);
  const limit=trap?.30:cut?cutLimit:Math.min(pacedLimit,runningLimit);
  const magnitude=Math.hypot(...outgoing);
  if(magnitude>limit)outgoing=outgoing.map(value=>value*limit/magnitude);
  outgoing=limitDribbleAtEdges(outgoing,position);
  velocity[0]=outgoing[0];
  velocity[1]=trap?0:clamp(bootVelocity[1]*.08,0,.12);
  velocity[2]=outgoing[1];
  spin[0]+=((velocity[2]/r)-spin[0])*.66;
  spin[2]+=((-velocity[0]/r)-spin[2])*.66;
  spin[1]=clamp(spin[1]+sideChange/r*.54,-19,19);
}

function dribbleTouch(velocity,spin,{kind,foot,offset,heading,playerVelocity,interval,dragDirection,bounds,ballPosition}){
  const left=foot==='LeftFoot'?-1:1;
  const pace=clamp(Math.hypot(...playerVelocity),0,5.6);
  const forward=[-Math.sin(heading),-Math.cos(heading)];
  const right=[-forward[1],forward[0]];
  const forwardPace=Math.max(0,dot(forward,playerVelocity));
  const pull=kind==='pull';
  let target=[0,0];
  if(kind==='drag'){
    const direction=dragDirection??forward.map(n=>-n);
    target=direction.map(n=>n*1.8);
  }else if(kind!=='trap'){
    const next=clamp(interval,.145,.34);
    const lateral=offset[0]*right[0]+offset[1]*right[1];
    const front=offset[0]*forward[0]+offset[1]*forward[1];
    const reach=.35+pace*.023;
    const side=Math.abs(lateral)>.09?Math.sign(lateral):left;
    const lane=pull?(front<.14?.22:.10)*side:.09*left;
    const carry=pull?clamp(forwardPace*.72+.72,.72,4.15):clamp(pace+.26,.75,5.6);
    const rollingLoss=(config.rollingResistance+config.grassDrag*carry**2)*next*.5;
    target=forward.map((n,i)=>n*(carry+rollingLoss)+(n*reach+right[i]*lane-offset[i])/next);
    const maxSpeed=pull?clamp(1.25+forwardPace*.76,1.25,4.8):Math.max(1.5,pace+.83);
    const speed=Math.hypot(...target);
    if(speed>maxSpeed)target=target.map(n=>n*maxSpeed/speed);
  }

  if(bounds&&ballPosition&&kind!=='trap'){
    const horizon=clamp(interval,.17,.34);
    target=target.map((axis,i)=>clamp(axis,
      Math.min(0,(bounds[i][0]-ballPosition[i])/horizon),
      Math.max(0,(bounds[i][1]-ballPosition[i])/horizon)));
  }

  const delta=[target[0]-velocity[0],target[1]-velocity[2]];
  const maxChange=kind==='trap'?7.8:3.9+pace*1.25;
  const force=Math.hypot(...delta);
  const gain=force>maxChange?maxChange/force:1;
  velocity[0]+=delta[0]*gain;
  velocity[2]+=delta[1]*gain;
  velocity[1]=clamp(velocity[1],0,.06);
  spin[0]=velocity[2]/r;
  spin[2]=-velocity[0]/r;
  spin[1]=kind==='trap'?0:clamp(spin[1]*.4+left*(pull?2.2:1.1),-5,5);
}
function freeKickLaunch(position,power,heading,foot,finesse,curlSkill,verticalError=0){
  const sine=Math.sin(heading),cosine=Math.cos(heading);
  const flightDistance=clamp(position[2]/Math.max(.025,cosine),10,53);
  const ideal=clamp(.54+(flightDistance-20)*.004,.48,.67);
  const timing=power-ideal;
  const speed=clamp(9.7+flightDistance*.88,19,36);
  const travel=Math.min(9.15,flightDistance*.82);
  const wallPlane=position[2]-travel*cosine;
  const timeAt=distance=>Math.expm1(air*distance)/(air*speed);
  const wallTime=timeAt(travel),goalTime=timeAt(flightDistance);
  const wallHeight=2.62-position[1],goalHeight=2.08-position[1];
  const gravity=clamp(2*(wallHeight/wallTime-goalHeight/goalTime)/Math.max(.10,goalTime-wallTime),5.2,32);
  let lift=wallHeight/wallTime+.5*gravity*wallTime;
  let topspin=clamp((config.gravity-gravity)/(config.magnus*speed*.86),-540,110);
  const angleGrip=clamp(cosine,0,1);
  const curl=(foot==='Left'?-1:1)*(finesse?46:5)*curlSkill*angleGrip*angleGrip;
  const spin=top=>[top*cosine,curl,-top*sine];
  const probes=(vertical,top)=>{
    const velocity=[-sine*speed,vertical,-cosine*speed];
    const angular=spin(top);
    return [crossing(position,velocity,angular,wallPlane)?.y??0,crossing(position,velocity,angular,0)?.y??0];
  };
  for(let i=0;i<3;i++){
    const [wall,goal]=probes(lift,topspin);
    const [wallLift,goalLift]=probes(lift+.25,topspin);
    const [wallSpin,goalSpin]=probes(lift,topspin+12);
    const a=(wallLift-wall)/.25,b=(wallSpin-wall)/12,c=(goalLift-goal)/.25,d=(goalSpin-goal)/12;
    const determinant=a*d-b*c;
    if(Math.abs(determinant)<1e-5)break;
    const dw=wallHeight+position[1]-wall,dg=goalHeight+position[1]-goal;
    lift+=clamp((dw*d-b*dg)/determinant,-2.2,2.2);
    topspin=clamp(topspin+clamp((a*dg-dw*c)/determinant,-105,105),-590,145);
  }
  const mismatch=Math.max(0,Math.abs(timing)-.067);
  const shaping=timing*2.5+Math.sign(timing)*mismatch*10.6;
  const weak=clamp((-timing-.16)/.18,0,1);
  const pace=speed*(1+.105*timing)*(1-.48*weak*weak);
  const liftError=verticalError*.56/Math.max(.38,goalTime);
  const velocity=[-sine*pace,Math.max(.22,lift+shaping+liftError),-cosine*pace];
  return {velocity,spin:spin(topspin),finesse};
}

function launch(p,targetX,power,carry=[0,0],volley=false,options={}){
  const finesse=!!options.finesse,foot=options.foot||'Left';
  const depth=Math.max(1,p[2]),direction=unit([targetX-p[0],0,-depth]);
  if(power>=1){
    const [side=0,height=0]=options.error??[];
    const aim=options.manualYaw??Math.atan2(p[0]-targetX,depth);
    const yaw=clamp(aim,-.55,.55)-side*.19;
    const forward=Math.min(34*Math.cos(yaw),Math.max(.001,p[2]-footballGoalLineZ)*5.8);
    return {velocity:[-34*Math.sin(yaw),25+height*3,-forward],spin:[0,0,0],finesse:false};
  }
  if(options.chip){
    const {manualYaw,error=[0,0]}=options;
    const heading=Number.isFinite(manualYaw)?manualYaw-error[0]/Math.max(8,depth):null;
    const axis=heading===null?direction:[-Math.sin(heading),0,-Math.cos(heading)];
    const speed=4.2+12.5*power;
    const lift=3.65+6.55*power;
    const velocity=[axis[0]*speed+carry[0]*.08,lift,axis[2]*speed+carry[1]*.08];
    const backspin=17+18*power;
    return {velocity,spin:[-axis[2]*backspin,0,axis[0]*backspin],finesse:false};
  }
  const curlSkill=clamp(.48+(options.accuracy??70)*.0094,.60,1.43); const lowDriven=!!options.lowDriven;
  if(Number.isFinite(options.manualYaw)){
    const {manualYaw:yaw,setPiece,error=[0,0]}=options;
    const target=setPiece==='penalty'?options.penaltyTarget:null;
    const goalDepth=p[2]-footballGoalLineZ;
    const heading=target?Math.atan2(p[0]-target.x,goalDepth):yaw-error[0]/Math.max(8,Math.hypot(p[0],depth));
    if(setPiece==='freeKick')return freeKickLaunch(p,power,heading,foot,finesse,curlSkill,error[1]);
    const speed=16+23*power;
    const lift=lowDriven?(.28+.40*power):(.61+4.35*power**1.38);
    const velocity=[-Math.sin(heading)*speed,lift+error[1]*(lowDriven?.16:1)*speed/Math.max(8,depth),-Math.cos(heading)*speed];
    const spin=[0,0,0];
    if(target){
      const travel=goalDepth/-velocity[2];
      velocity[1]=(target.y-p[1])/travel+.5*config.gravity*travel;
      for(let i=0;i<3;i++){
        const hit=crossing(p,velocity,spin,footballGoalLineZ);
        if(!hit||Math.abs(target.y-hit.y)<.008)break;
        velocity[1]+=(target.y-hit.y)/hit.time;
      }
    }
    return {velocity,spin,finesse};
  }
  const speed=(17+21*Math.pow(power,.78))*(finesse?.88:1);
  const elevation=lowDriven?(.008+.022*power):(finesse?.070+.16*Math.pow(power,1.4):.012+.205*Math.pow(power,1.8));
  const velocity=[direction[0]*speed+carry[0]*.12,speed*Math.sin(elevation)+(volley&&!lowDriven?.65:0),direction[2]*speed+carry[1]*.12];
  if(!finesse){
    return {velocity,spin:[velocity[2]/r*.12,clamp((targetX-p[0])*.45,-4,4),-velocity[0]/r*.12],finesse};
  }
  const outside=Math.abs(targetX)>.32?Math.sign(targetX):
    Math.abs(p[0])>.8?Math.sign(p[0]):foot==='Right'?1:-1;
  const hang=lowDriven?0:Math.min(5.8,depth/Math.max(8,-velocity[2])*config.gravity*.53);
  velocity[1]=Math.max(velocity[1],hang);
  const curl=outside*(162+power*81+Math.min(depth,22)*1.45)*curlSkill;
  const spin=[-velocity[2]/r*.035,curl,velocity[0]/r*.035];

  for(let i=0;i<9;i++){
    const hit=crossing(p,velocity,spin,0);
    if(!hit||Math.abs(targetX-hit.x)<.008)break;
    velocity[0]+=clamp((targetX-hit.x)/Math.max(.09,hit.time),-9,9);
  }
  return {velocity,spin,finesse};
}
function crossing(position,velocity,angular,plane=.65){let p=[...position],v=[...velocity],spin=[...angular],dt=1/240;for(let time=0;time<4;time+=dt){let old=[...p];step(p,v,spin,dt,true);if(old[2]>=plane&&p[2]<=plane){let t=(old[2]-plane)/(old[2]-p[2]);return{x:old[0]+(p[0]-old[0])*t,y:old[1]+(p[1]-old[1])*t,time:time+t*dt}}if(v[2]>=0||Math.hypot(...v)<.05)break}return null}
function reflect(v,n,restitution=.5,friction=.08){let normal=dot(v,n);if(normal>=0)return;let tangent=v.map((x,i)=>x-normal*n[i]);for(let i=0;i<3;i++)v[i]=tangent[i]*(1-friction)-normal*restitution*n[i]}
function closestSegments(a,b,c,d){let u=subtract(b,a),v=subtract(d,c),w=subtract(a,c),aa=dot(u,u),bb=dot(u,v),cc=dot(v,v),dd=dot(u,w),ee=dot(v,w),den=aa*cc-bb*bb,s=aa<1e-12?0:clamp(den>1e-12?(bb*ee-cc*dd)/den:-dd/aa,0,1),t=cc<1e-12?0:clamp((bb*s+ee)/cc,0,1);if(aa>1e-12)s=clamp((bb*t-dd)/aa,0,1);if(cc>1e-12)t=clamp((bb*s+ee)/cc,0,1);return{ball:a.map((x,i)=>x+u[i]*s),bar:c.map((x,i)=>x+v[i]*t),fraction:s}}
function goalFrame(old,p,v,spin){let bars=[[[-3.66,0,0],[-3.66,2.44,0]],[[3.66,0,0],[3.66,2.44,0]],[[-3.66,2.44,0],[3.66,2.44,0]]];for(let [a,b]of bars){let hit=closestSegments(old,p,a,b),delta=subtract(hit.ball,hit.bar),distance=Math.hypot(...delta),radius=r+.06;if(distance>=radius)continue;let normal=distance>1e-6?delta.map(x=>x/distance):unit(v.map(x=>-x));if(dot(v,normal)>=0)continue;reflect(v,normal,config.postRestitution,.055);for(let i=0;i<3;i++){p[i]=hit.bar[i]+normal[i]*(radius+.001);spin[i]*=.7}return true}return false}
function aerialControl(position,velocity,spin,{point,previous=point,dt,heading,pace=0,kind='chest'}){
  if(!point||!bootContact(previous,point,position,velocity,dt,kind==='head'?.22:kind==='chest'||kind==='directed'?.36:.20))return false;
  const incoming=Math.hypot(...velocity);
  const speed=clamp(pace*(kind==='directed'?.95:.8)+incoming*.07,.65,kind==='directed'?5.8:3.4);
  velocity[0]=-Math.sin(heading)*speed;
  velocity[2]=-Math.cos(heading)*speed;
  velocity[1]=kind==='head'?-clamp(incoming*.10,1,2.6):-clamp(Math.abs(velocity[1])*.16,.35,1.8);
  for(let i=0;i<3;i++)spin[i]*=.12;
  return true;
}
function passLaunch(origin,target,kind='pass',options={}){
  const distance=Math.hypot(target[0]-origin[0],target[2]-origin[2]);
  const aerial=kind==='lob'||kind==='cross';
  const baseTime=kind==='lob'?clamp(1.45+distance*.025,1.52,2.45):aerial?clamp(.8+distance*.034,.95,2.45):clamp(.25+distance*.038,.4,1.8);
  const time=clamp(options.time??baseTime,aerial?.8:.35,aerial?3.2:3.0);
  const velocity=[(target[0]-origin[0])/time,aerial?(target[1]-origin[1])/time+config.gravity*time*.56:.04,
    (target[2]-origin[2])/time];
  const spin=aerial?[0,kind==='cross'?3.5:0,-3]:[velocity[2]/r,0,-velocity[0]/r];
  for(let iteration=0;iteration<14;iteration++){
    const p=[...origin],v=[...velocity],w=[...spin];
    let elapsed=0,earlyBounce=0;
    while(elapsed<time){const dt=Math.min(1/120,time-elapsed);step(p,v,w,dt,true);elapsed+=dt;if(aerial&&!earlyBounce&&elapsed<time-.06&&p[1]<=r+.002&&v[1]>=0)earlyBounce=time-elapsed;}
    if(!earlyBounce&&Math.hypot(target[0]-p[0],aerial?target[1]-p[1]:0,target[2]-p[2])<.025)break;
    for(const axis of aerial?[0,1,2]:[0,2])velocity[axis]+=(target[axis]-p[axis])/time*.9;if(earlyBounce>0)velocity[1]+=config.gravity*earlyBounce*.55;
  }
  return {velocity,spin,time};
}
return{config,step,sweepBoot,separateBoot,deflectBoot,freeBallBetweenBoots,brakeDribble,guideCharge,steadyDribble,rollUnderSole,receiveTouch,groundTouch,dribbleTouch,launch,passLaunch,aerialControl,bootContact,crossing,reflect,goalFrame};
};
