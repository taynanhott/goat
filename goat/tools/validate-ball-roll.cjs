const fs=require('fs'),vm=require('vm'),path=require('path');const root=path.resolve(__dirname,'../..');
const ctx=vm.createContext({window:{goatStadiums:{pitch:{width:68,centerZ:52.5}}},console,Float32Array,Uint8Array,Uint16Array,Uint32Array,Int16Array,ArrayBuffer,atob,localStorage:{getItem:()=>null,setItem(){},removeItem(){}},performance:{now:()=>0}});
function run(file){vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});}
for(const f of ['animations','fifa16-animations','goalkeeper-poses','shot-and-crowd-animations','team-animations','animation-overrides'])run('goat/assets/animations/'+f+'.js');
for(const f of ['ui/comic-art','gameplay/body-response','rendering/mocap','gameplay/ball-physics','gameplay/football-motion'])run('goat/src/'+f+'.js');
vm.runInContext(fs.readFileSync(path.join(root,'goat/src/gameplay/game.js'),'utf8').split('\n').slice(6,10).join('\n'),ctx);
vm.runInContext(`const gl=new Proxy({getParameter:()=>1024,getProgramParameter:()=>true},{get:(a,k)=>k in a?a[k]:(()=>({}))});
const rig=window.createFootballMocap({gl,shader:()=>({}),mm,transform,point,I});
const motion=window.createFootballMotionController({clips:rig.clips}),physics=window.createFootballBallPhysics();
globalThis.rig=rig;globalThis.motion=motion;globalThis.physics=physics;`,ctx);


vm.runInContext(`globalThis.cases=[];
for(const ballLead of [.5,.85])for(const heading of [0,Math.PI])for(const speed of [0,2,6])for(const sign of [-1,1]){
 const front=[-Math.sin(heading),-Math.cos(heading)],right=[Math.cos(heading),-Math.sin(heading)];
 const actor={x:0,z:25,y:0,yaw:heading,vx:front[0]*speed,vz:front[1]*speed,rollStickHeld:true,b:{lh:{},rh:{},spine:{}}};
 const lane=sign<0?.15:-.15;
 const ball=[right[0]*lane+front[0]*ballLead,.11,25+right[1]*lane+front[1]*ballLead],v=[front[0]*speed,0,front[1]*speed],spin=[0,0,0];
 rig.update(actor,{clip:'idle',grounded:true,bodyYaw:heading,fade:.001},1);
 for(let w=0;w<18;w++){
   motion.move(actor,{dt:1/60,direction:front,speed,controlled:true,ball,velocity:v});
   const pose=motion.locomotion(actor,{dt:1/60,ball,velocity:v,controlled:true,ankles:rig.get(actor).ankles});rig.update(actor,pose,1/60);
   ball[0]=actor.x+right[0]*lane+front[0]*.5;ball[2]=actor.z+right[1]*lane+front[1]*.5;
 }
 const origin=[actor.x,actor.z];
 const local=p=>[(p[0]-origin[0])*right[0]+(p[2]-origin[1])*right[1],p[1],25-(p[0]-origin[0])*front[0]-(p[2]-origin[1])*front[1]];
 let cycle=0,wasRolling=false;const frames=[];
 for(let f=0;f<230;f++){
  if(!actor.ballRoll&&cycle<3&&motion.startBallRoll(actor,right.map(v=>v*sign),ball,rig.get(actor).ankles,speed>3))cycle++;
  rig.bodyContext({active:true,player:actor,actors:[actor],ball,velocity:v,ballState:'controlled',fatigue:0});
  const r=actor.ballRoll;
  motion.move(actor,{dt:1/60,direction:speed?front:[0,0],speed,controlled:true,ball,velocity:v});
  const pose=motion.locomotion(actor,{dt:1/60,ball,velocity:v,controlled:true,ankles:rig.get(actor).ankles});rig.update(actor,pose,1/60);
  for(let j=0;j<2;j++){motion.ballRollContact(actor,ball,v,spin,physics,1/120);physics.step(ball,v,spin,1/120,false);}
  frames.push({f,cycle,age:r?.age,preparedGap:r?.preparedGap,preparedBallSpeed:r?.preparedBallSpeed,push:r?.pushAge,planted:r?.planted,index:r?.index,body:[local([actor.x,0,actor.z])[0],local([actor.x,0,actor.z])[2]],ball:local(ball),ankles:rig.get(actor).ankles.map(local),bones:rig.boneWorldPositions(actor).map(local),targets:pose.ankleTargets?.map(t=>t.point)});
 }
 cases.push({ballLead,heading,speed,sign,cycles:cycle,frames});
}
`,ctx);


const assert=require('node:assert/strict');
for(const c of ctx.cases){
  assert.equal(c.cycles,3,'Three held-stick cycles must complete');
  for(const frame of c.frames){
    assert.ok(frame.bones.flat().every(Number.isFinite),'Skeleton must remain finite');
    assert.ok(frame.bones[ctx.rig.byName.Hips][1]>.65,'Hips must not collapse toward ground');
  }
  for(let cycle=1;cycle<=3;cycle++){
    const frames=c.frames.filter(f=>f.cycle===cycle&&f.push!==undefined);
    assert.ok(frames.length>8,'Push and recovery must run');
    assert.ok(frames.every(f=>f.preparedBallSpeed<=2.55),'Ball must slow before sole roll');
    assert.ok(frames.every(f=>f.preparedGap<=.62),'Ball must be close enough before sole roll');
    const planted=frames.find(f=>f.push>0);
    const active=planted.ankles[planted.index],other=planted.ankles[1-planted.index];
    assert.ok((active[0]-other[0])*c.sign>.12,'Active foot must cross beyond support '+JSON.stringify({heading:c.heading,speed:c.speed,sign:c.sign,cycle,active,other}));
    assert.ok(other[2]-active[2]>.12,'Cross must pass in front of support');
    assert.ok(active[1]<.17,'Active foot must land before impulse');
    assert.ok((active[0]-planted.ball[0])*c.sign>.035,'Active foot must land beyond the ball '+JSON.stringify({lead:c.ballLead,speed:c.speed,sign:c.sign,cycle,active,ball:planted.ball}));
    const previous=c.frames.filter(f=>f.cycle===cycle&&f.age>.24&&f.age<.80);
    assert.ok(previous.every(f=>f.ankles[1-planted.index][1]<.17),'Opposite foot must support during roll');
    const pushing=frames.filter(f=>f.push<.38);
    const ankleStart=pushing[0].ankles[planted.index];
    assert.ok(pushing.every(f=>Math.hypot(f.ankles[planted.index][0]-ankleStart[0],f.ankles[planted.index][2]-ankleStart[2])<.10),'Pushing foot must stay planted');
    const last=frames.at(-1);
    for(let i=1;i<frames.length;i++){
      const shift=Math.abs(frames[i].body[0]-frames[i-1].body[0]);
      assert.ok(shift<.16,'Lateral body travel must stay continuous between frames');
    }
    assert.ok((last.body[0]-planted.body[0])*c.sign>(c.speed>3?.35:.25),'Planted foot must continue the impulse');
    const rolling=c.frames.filter(f=>f.cycle===cycle&&f.age>.24&&f.age<.80);
    assert.ok((rolling.at(-1).body[0]-rolling[0].body[0])*c.sign>.10,'Body must move sideways during the roll before landing');
    assert.ok(Math.max(...frames.map(f=>f.ankles[1-planted.index][1]))>.22,'Free foot must lift for recovery');
    assert.ok(last.ankles[1-planted.index][1]<.17,'Free foot must return to ground');
    const hip=ctx.rig.byName[(planted.index?'Right':'Left')+'UpLeg'];
    const length=f=>Math.hypot(...f.ankles[planted.index].map((v,i)=>v-f.bones[hip][i]));
    const lengths=frames.map(length),loaded=Math.min(...lengths);
    const lowest=lengths.indexOf(loaded);
    assert.ok(Math.max(...lengths.slice(lowest+1))>loaded+.03,'Planted leg must extend after loading: '+JSON.stringify({speed:c.speed,side:c.sign,cycle,loaded,extension:Math.max(...lengths.slice(lowest+1))-loaded}));
    assert.ok((last.ankles[planted.index][0]-last.ankles[1-planted.index][0])*c.sign<0,'Recovery must uncross legs');
  }
  console.log('OK yaw '+c.heading.toFixed(2)+': '+(c.sign<0?'left':'right')+', speed '+c.speed+', 3 cycles; X, landing, planted-foot impulse, recovery');
}

for(const yaw of [0,.7,Math.PI/2,Math.PI]){
  const front=[-Math.sin(yaw),-Math.cos(yaw)],right=[Math.cos(yaw),-Math.sin(yaw)];
  for(const running of [false,true]){
    assert.equal(ctx.motion.skillDirection(yaw,right,running)?.kind,'roll');
    assert.equal(ctx.motion.skillDirection(yaw,right.map(v=>-v),running)?.kind,'roll');
    assert.equal(ctx.motion.skillDirection(yaw,front,running),null);
    assert.equal(ctx.motion.skillDirection(yaw,front.map(v=>-v),running)?.kind,running?undefined:'pull');
  }
}
console.log('OK: lateral relative to heading; pull only at walking pace; no forward roll.');
