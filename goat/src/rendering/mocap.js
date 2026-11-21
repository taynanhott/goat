window.createFootballMocap=function(api){
'use strict';
const {gl,shader,mm,transform,point,I}=api,pack=window.FOOTBALL_ANIMATIONS;
const removedDefensiveClips=new Set(['defSlideJog','defSlideStand','defSlideFast','defJostle']);
const tackleArmClips=new Set(['defTackleSprint','defTackleJog','defTackleStand']);
if(!pack)return null;
const decode=(s,Type=Float32Array)=>{let raw=atob(s),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Type(bytes.buffer)},clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const count=pack.bones.length,scale=.0094,gpu=gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)>count*4+32;
for(let c of Object.values(pack.clips))c.values=decode(c.data);
function qmatrix(q,p){let[x,y,z,w]=q;return new Float32Array([1-2*(y*y+z*z),2*(x*y+w*z),2*(x*z-w*y),0,2*(x*y-w*z),1-2*(x*x+z*z),2*(y*z+w*x),0,2*(x*z+w*y),2*(y*z-w*x),1-2*(x*x+y*y),0,p[0],p[1],p[2],1])}
function qlerp(a,b,t){let flip=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]<0?-1:1,out=a.map((v,i)=>lerp(v,b[i]*flip,t)),length=Math.hypot(...out)||1;return out.map(v=>v/length)}
function qm(a,b){return[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]+a[1]*b[3]+a[2]*b[0]-a[0]*b[2],a[3]*b[2]+a[2]*b[3]+a[0]*b[1]-a[1]*b[0],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]}
const qi=q=>[-q[0],-q[1],-q[2],q[3]],subtract=(a,b)=>a.map((v,i)=>v-b[i]),unit=a=>{let l=Math.hypot(...a)||1;return a.map(v=>v/l)},dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function qturn(a,b){a=unit(a);b=unit(b);let c=cross(a,b),w=1+dot(a,b);if(w<.00001){c=cross(a,Math.abs(a[0])<.8?[1,0,0]:[0,1,0]);w=0}return unit([...c,w])}
function qeuler(v){let q=[0,0,0,1];for(let a=0;a<3;a++){let delta=[0,0,0,Math.cos(v[a]/2)];delta[a]=Math.sin(v[a]/2);q=qm(q,delta)}return q}
const byName=Object.fromEntries(pack.bones.map((bone,index)=>[bone.name,index]));
const neutralWorld=[],bindWorld=[];
const idleValues=pack.clips.idle.values;
for(const [i,bone] of pack.bones.entries()){
  const rotation=Array.from(idleValues.subarray(i*4,i*4+4));
  neutralWorld[i]=bone.parent<0?rotation:qm(neutralWorld[bone.parent],rotation);
  bindWorld[i]=bone.parent<0?bone.q:qm(bindWorld[bone.parent],bone.q);
}

function rotateVector(q,v){
  return qm(qm(q,[...v,0]),qi(q)).slice(0,3);
}

const referenceProportions={
  thigh:.51266,
  upperArm:.5,
  hipWidth:.13748,
  clavicleWidth:.05033,
  shoulderWidth:.33975,
  trunk:[
    ['Spine',.11802],['Spine1',.28069],['Spine2',.59596],['Neck',.85130]
  ],
  clavicleHeight:.71692,
  shoulderHeight:.74818
};

function fitReferenceProportions(bones,hipWidth){
  const original=bones.map(({inverse:m})=>[0,4,8].map(i=>-(m[i]*m[12]+m[i+1]*m[13]+m[i+2]*m[14])));
  const at=name=>original[byName[name]];
  const hips=at('Hips'),trunk=at('Head')[1]-hips[1];
  const target=new Map(referenceProportions.trunk.map(([name,fraction])=>{
    const [x,,z]=at(name);
    return [name,[x,hips[1]+trunk*fraction,z]];
  }));
  target.set('Head',at('Head'));
  function fitChain(side,names,fraction,placeRoot){
    const [a,b,c]=names.map(name=>side+name);
    const first=subtract(at(b),at(a)),second=subtract(at(c),at(b));
    const length=Math.hypot(...first)+Math.hypot(...second);
    const joint=(start,vector,reach)=>unit(vector).map((v,i)=>start[i]+v*reach);
    const start=placeRoot(at(a),length);
    const middle=joint(start,first,length*fraction);
    target.set(a,start);
    target.set(b,middle);
    target.set(c,joint(middle,second,length*(1-fraction)));
    return length;
  }
  for(const [side,sign] of [['Left',1],['Right',-1]]){
    fitChain(side,['UpLeg','Leg','Foot'],referenceProportions.thigh,([,y,z],length)=>[
      hips[0]+sign*length*hipWidth,y,z
    ]);
    const length=fitChain(side,['Arm','ForeArm','Hand'],referenceProportions.upperArm,([,,z],reach)=>[
      hips[0]+sign*reach*referenceProportions.shoulderWidth,
      hips[1]+trunk*referenceProportions.shoulderHeight,z
    ]);
    const shoulder=side+'Shoulder';
    target.set(shoulder,[
      hips[0]+sign*length*referenceProportions.clavicleWidth,
      hips[1]+trunk*referenceProportions.clavicleHeight,at(shoulder)[2]
    ]);
  }
  const fitted=[];
  for(const [i,bone] of bones.entries()){
    const parent=fitted[bone.parent];
    const delta=target.has(bone.name)?subtract(target.get(bone.name),original[i]):parent?.delta??[0,0,0];
    const m=bone.inverse;
    const inverse=Array.from(m);
    for(let a=0;a<3;a++)inverse[12+a]-=m[a]*delta[0]+m[4+a]*delta[1]+m[8+a]*delta[2];
    let p=bone.p;
    if(parent){
      const relativeDelta=subtract(delta,parent.delta);
      p=p.map((v,a)=>v+parent.inverse[a]*relativeDelta[0]+parent.inverse[4+a]*relativeDelta[1]+parent.inverse[8+a]*relativeDelta[2]);
    }
    fitted.push({...bone,p,inverse,delta});
  }
  return fitted;
}

const fieldRig=fitReferenceProportions(pack.bones,.119);
const keeperRig=fitReferenceProportions(pack.bones,referenceProportions.hipWidth);

function rebindVertex(vertex,mesh,index,bones){
  const position=Array.from(vertex);
  for(let influence=0;influence<4;influence++){
    const offset=index*4+influence,weight=mesh.w[offset];
    if(!weight)continue;
    const delta=bones[mesh.j[offset]].delta;
    for(let axis=0;axis<3;axis++)position[axis]+=weight*delta[axis];
  }
  return position;
}

const footNames=['LeftFoot','RightFoot'];
const bootMarkers=footNames.map(name=>rotateVector(qi(neutralWorld[byName[name]]),[0,-.036/scale,.127/scale]));
const footRolls=footNames.map(name=>{
  const foot=byName[name],toe=byName[name.replace('Foot','ToeBase')],inverse=pack.bones[foot].inverse;
  const x=-(inverse[0]*inverse[12]+inverse[1]*inverse[13]+inverse[2]*inverse[14]);
  const flexAxis=rotateVector(qi(bindWorld[toe]),[1,0,0]);
  return {foot,toe,heel:point(inverse,[x,.05,-5.4]),forefoot:pack.bones[toe].p,flexAxis};
});
const toeWeight=z=>ramp(6.6,11.1,z);
const upperBodyJoints=fieldRig.map(bone=>/^(Spine|Neck|Head|LeftShoulder|RightShoulder|LeftArm|RightArm|LeftForeArm|RightForeArm|LeftHand|RightHand)/.test(bone.name));
const shotUpperWeights=fieldRig.map(bone=>/^(Left|Right)(Shoulder|Arm|ForeArm|Hand)/.test(bone.name)?1:/^Spine/.test(bone.name)?.85:/^(Neck|Head)/.test(bone.name)?.35:0);

function sampleFrames(clip,time){
  const frame=clamp(time*clip.fps,0,clip.frames-1);
  const lo=Math.floor(frame);
  return {lo,hi:Math.min(clip.frames-1,lo+1),weight:frame-lo};
}

function sampleJoint(clip,frame,joint){
  const start=frame.lo*clip.stride+joint*4;
  const end=frame.hi*clip.stride+joint*4;
  return qlerp(Array.from(clip.values.subarray(start,start+4)),Array.from(clip.values.subarray(end,end+4)),frame.weight);
}

const mirroredJoints=fieldRig.map((bone,index)=>{
  const name=bone.name.replace(/^(Left|Right)/,side=>side==='Left'?'Right':'Left');
  return byName[name]??index;
});

function shotJoint(clip,frame,index,opposite){
  const q=sampleJoint(clip,frame,opposite?mirroredJoints[index]:index);
  return opposite?[q[0],-q[1],-q[2],q[3]]:q;
}

function runningKneeCosine(profile,phase){
  const clip=pack.clips[profile.clip];
  const time=lerp(profile.start,profile.end,phase);
  const knee=byName[profile.foot.startsWith('Left')?'LeftLeg':'RightLeg'];
  const foot=byName[profile.foot];
  const thigh=unit(fieldRig[knee].p);
  const shin=unit(rotateVector(sampleJoint(clip,sampleFrames(clip,time),knee),fieldRig[foot].p));
  return clamp(dot(thigh,shin),-.50,.98);
}

function shotGeometry(key,time,footName,opposite=false){
  const clip=pack.clips[key];
  const frame=sampleFrames(clip,time);
  const rootY=lerp(clip.values[frame.lo*clip.stride+count*4+1],clip.values[frame.hi*clip.stride+count*4+1],frame.weight);
  const matrices=[];
  function boneMatrix(index){
    if(matrices[index])return matrices[index];
    const bone=fieldRig[index];
    const local=qmatrix(shotJoint(clip,frame,index,opposite),index===0?[0,rootY,0]:bone.p);
    return matrices[index]=bone.parent<0?local:mm(boneMatrix(bone.parent),local);
  }
  const names=['LeftFoot','RightFoot'];
  const toe=index=>point(boneMatrix(byName[names[index]]),bootMarkers[index]).map(value=>value*scale);
  const index=footName==='LeftFoot'?0:1;
  return {boot:toe(index),support:toe(1-index),
    head:point(boneMatrix(byName.Head),[0,8,0]).map(value=>value*scale)};
}

function limitRotation(rotation,maxAngle){
  const q=rotation[3]<0?rotation.map(v=>-v):rotation;
  const angle=2*Math.atan2(Math.hypot(q[0],q[1],q[2]),q[3]);
  if(angle<=maxAngle)return q;
  const shift=Math.sin(maxAngle/2)/Math.hypot(q[0],q[1],q[2]);
  return [q[0]*shift,q[1]*shift,q[2]*shift,Math.cos(maxAngle/2)];
}

function limitJoint(q,rest,axis,swingLimit,twistLimit){
  const delta=qm(qi(rest),q);
  const along=dot(delta.slice(0,3),axis);
  const twist=Math.hypot(along,delta[3])>1e-6?unit([...axis.map(v=>v*along),delta[3]]):[0,0,0,1];
  const swing=qm(delta,qi(twist));
  return unit(qm(rest,qm(limitRotation(swing,swingLimit),limitRotation(twist,twistLimit))));
}

function stabilizeKeeperPunch(clip,ready){
  if(!clip||!ready)return;
  const channels=clip.values.slice();
  const sample=(values,stride,frame,index)=>Array.from(values.subarray(frame*stride+index*4,frame*stride+index*4+4));
  const rest=index=>unit(sample(ready.values,ready.stride,0,index));
  const weights=[1,2,4,2,1];
  function smoothRotation(frame,index){
    const center=sample(channels,clip.stride,frame,index);
    const sum=[0,0,0,0];
    for(let j=0;j<weights.length;j++){
      const q=sample(channels,clip.stride,clamp(frame+j-2,0,clip.frames-1),index);
      const weight=dot(q,center)<0?-weights[j]:weights[j];
      for(let k=0;k<4;k++)sum[k]+=q[k]*weight;
    }
    return unit(sum);
  }

  for(const side of ['Left','Right']){
    const shoulder=byName[side+'Shoulder'],upper=byName[side+'Arm'];
    const forearm=byName[side+'ForeArm'],wrist=byName[side+'Hand'];
    const axes={
      shoulder:unit(fieldRig[upper].p),upper:unit(fieldRig[forearm].p),
      forearm:unit(fieldRig[wrist].p),wrist:unit(fieldRig[byName[side+'HandMiddle1']].p)
    };
    const base={shoulder:rest(shoulder),upper:rest(upper),forearm:rest(forearm),wrist:rest(wrist)};
    const restLower=rotateVector(base.forearm,axes.forearm);
    const hinge=unit(cross(axes.upper,restLower));
    const maxStep=[.135,.32,.26,.23];
    let previous=null;
    for(let frame=0;frame<clip.frames;frame++){
      const shoulderQ=limitJoint(smoothRotation(frame,shoulder),base.shoulder,axes.shoulder,.34,.25);
      const fromClip=smoothRotation(frame,upper);
      const upperQ=limitJoint(side==='Left'?fromClip:qlerp(base.upper,fromClip,.66),base.upper,axes.upper,2.12,.78);
      const rawLower=rotateVector(smoothRotation(frame,forearm),axes.forearm);
      const flex=clamp(Math.acos(clamp(dot(axes.upper,rawLower),-1,1)),.12,2.25);
      const desiredLower=rotateVector([...hinge.map(v=>v*Math.sin(flex/2)),Math.cos(flex/2)],axes.upper);
      const forearmQ=unit(qm(qturn(restLower,desiredLower),base.forearm));
      const wristQ=limitJoint(smoothRotation(frame,wrist),base.wrist,axes.wrist,.60,.30);
      const pose=[shoulderQ,upperQ,forearmQ,wristQ].map((q,i)=>
        previous?unit(qm(previous[i],limitRotation(qm(qi(previous[i]),q),maxStep[i]))):q);
      [shoulder,upper,forearm,wrist].forEach((index,i)=>clip.values.set(pose[i],frame*clip.stride+index*4));
      previous=pose;
    }
  }

  rebuildLandmarks(clip,keeperRig);
  const atContact=Math.min(clip.frames-1,Math.round(clip.contact*clip.fps));
  clip.saveSide=Math.sign(clip.landmarks[atContact].LeftHand[0])||1;
}

function rebuildLandmarks(clip,bones=fieldRig){
  const points={LeftHand:[0,-7,0],RightHand:[0,-7,0],LeftFoot:[0,0,9],RightFoot:[0,0,9],Spine2:[0,0,0],Head:[0,0,0]};
  clip.landmarks=Array.from({length:clip.frames},(_,frame)=>{
    const world=[];
    for(const [i,bone] of bones.entries()){
      const offset=frame*clip.stride+i*4;
      const root=frame*clip.stride+count*4;
      const pos=i?bone.p:clip.values.subarray(root,root+3);
      const matrix=qmatrix(clip.values.subarray(offset,offset+4),pos);
      world.push(bone.parent<0?matrix:mm(world[bone.parent],matrix));
    }
    return Object.fromEntries(Object.entries(points).map(([bone,offset])=>[bone,point(world[byName[bone]],offset)]));
  });
}

function smoothGait(clip){
  if(!clip||clip.frames<6)return;
  const values=clip.values.slice();
  const loopFrames=clip.frames-1;
  const weights=[1,2,3,4,3,2,1];
  const legJoints=['UpLeg','Leg','Foot','ToeBase'];
  for(const side of ['Left','Right']){
    for(const name of legJoints){
      const joint=byName[side+name];
      if(joint===undefined)continue;
      const get=frame=>Array.from(values.subarray(frame*clip.stride+joint*4,frame*clip.stride+joint*4+4));
      for(let frame=0;frame<loopFrames;frame++){
        const center=get(frame),sum=[0,0,0,0];
        for(let j=0;j<weights.length;j++){
          const q=get((frame+j-3+loopFrames)%loopFrames);
          const w=dot(center,q)<0?-weights[j]:weights[j];
          for(let k=0;k<4;k++)sum[k]+=q[k]*w;
        }
        const smoothed=unit(sum);
        clip.values.set(smoothed,frame*clip.stride+joint*4);
        if(frame===0)clip.values.set(smoothed,loopFrames*clip.stride+joint*4);
      }
    }
  }
  rebuildLandmarks(clip);
}

function smoothLoopSeam(clip){
  if(!clip||clip.frames<8)return;
  const seam=Math.min(3,Math.floor(clip.frames/5));
  const last=clip.frames-1;
  const rootOff=count*4;
  const r0=[clip.values[rootOff],clip.values[rootOff+1],clip.values[rootOff+2]];
  for(let f=clip.frames-seam;f<clip.frames;f++){
    const u=(f-(clip.frames-seam)+1)/seam;
    const t=u*u*(3-2*u);
    for(let a=0;a<3;a++){
      const idx=f*clip.stride+rootOff+a;
      clip.values[idx]=lerp(clip.values[idx],r0[a],t);
    }
    for(let b=0;b<count;b++){
      const q0=Array.from(clip.values.subarray(b*4,b*4+4));
      const off=f*clip.stride+b*4;
      const q=Array.from(clip.values.subarray(off,off+4));
      clip.values.set(qlerp(q,q0,t),off);
    }
  }
  // Exact frame wrap at last frame for zero seam pop
  for(let b=0;b<count;b++)clip.values.set(clip.values.subarray(b*4,b*4+4),last*clip.stride+b*4);
  for(let a=0;a<3;a++)clip.values[last*clip.stride+rootOff+a]=r0[a];
}

const seamlessLoopClips=new Set([
  'idle','jog','sprint','backward','left','right',
  'runBall','sprintBall','messiClose','dribbleSide','dribbleWide',
  'keeperIdle','keeperIdle2','sidestep','sidestep2'
]);

for(const [name,clip] of Object.entries(pack.clips)){
  if(name==='oneHand'||name==='punchSave')stabilizeKeeperPunch(clip,pack.clips.keeperIdle);
  else if(name==='messiClose'||name==='runBall'||name==='sprintBall'){
    smoothGait(clip);
    smoothLoopSeam(clip);
    rebuildLandmarks(clip,fieldRig);
  }else{
    if(seamlessLoopClips.has(name))smoothLoopSeam(clip);
    if(clip.landmarks?.length)rebuildLandmarks(clip,clip.saveKind||/^(keeper|sidestep|catch|dive|scoop|block|spreadSave|fallen|getup)/.test(name)?keeperRig:fieldRig);
  }
}

const art=window.footballComicArt;
const vertexHeader=`
  attribute vec3 aP,aN,aC,aBind;
  attribute vec2 aDetail;
  uniform mat4 uM,uVP;
  uniform mediump float uInk;
  varying mediump vec3 vN,vP,vC,vBind;
  varying mediump vec2 vDetail;
`;
const skinShader=gpu?`
  attribute vec4 aJ,aW;
  uniform mat4 uB[${count}];
  mat4 skin(){
    return uB[int(aJ.x)]*aW.x+uB[int(aJ.y)]*aW.y+uB[int(aJ.z)]*aW.z+uB[int(aJ.w)]*aW.w;
  }
`:'';
const vertex=vertexHeader+skinShader+`
  void main(){
    mat4 model=${gpu?'uM*skin()':'uM'};
    vec4 p=model*vec4(aP,1.);
    vN=normalize(mat3(model)*aN);
    vP=p.xyz;
    vC=aC;
    vBind=aBind;
    vDetail=aDetail;
    float outline=aDetail.x>7.5?.32:aDetail.y>1.5||aDetail.x>4.7&&aDetail.x<5.3?.48:1.;
    p.xyz+=vN*uInk*outline;
    gl_Position=uVP*p;
  }
`;
const program=gl.createProgram();
gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));
gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
  precision mediump float;
  varying mediump vec3 vN,vP,vC,vBind;
  varying mediump vec2 vDetail;
  uniform vec3 uEye;
  uniform float uKeeper;
  uniform float uShirtNumber;
  uniform float uCustom;
  uniform float uTeam;
  uniform float uKitPattern,uHasTertiary,uHasBadge;
  uniform sampler2D uClubBadge;
  uniform vec3 uTertiary;
  uniform vec3 uSkin,uHair,uBeard,uBoot,uPrimary,uSecondary;
  uniform vec4 uLook;
  uniform vec2 uKitFit;
  uniform float uMirrorSign;
  uniform mediump float uInk;
  ${art.print}
  float panel(vec2 p,vec2 size){
    vec2 margin=abs(p)-size;
    return 1.-smoothstep(-.15,.18,max(margin.x,margin.y));
  }
  float oval(vec2 p,vec2 size){
    return 1.-smoothstep(.72,1.05,length(p/size));
  }
  float one(vec2 p){
    float stem=panel(p,vec2(.92,5.65));
    float hook=panel(vec2(p.x+.72+(p.y-4.4)*.49,p.y-4.4),vec2(1.3,.77));
    return max(stem,hook);
  }
  float zero(vec2 p){
    float outer=panel(vec2(p.x+.08*p.y,p.y),vec2(3.50,5.68));
    float inner=panel(vec2(p.x+.08*p.y,p.y),vec2(1.61,3.58));
    return outer*(1.-inner);
  }
  float four(vec2 p){
    float right=panel(p-vec2(1.7,0.),vec2(.93,5.65));
    float left=panel(vec2(p.x+2.2-.35*(p.y-1.7),p.y-2.6),vec2(.83,2.95));
    float bar=panel(p+vec2(.3,.64),vec2(3.18,.91));
    return max(right,max(left,bar));
  }
  float digitSegment(float mask,float bit,vec2 p,vec2 size){
    return mod(floor(mask/bit),2.)*panel(p,size);
  }
  float shirtDigit(vec2 p,float digit){
    if(digit<.5)return zero(p);
    if(digit<1.5)return one(p);
    if(digit>3.5&&digit<4.5)return four(p);
    float mask=digit<2.5?91.:digit<3.5?79.:digit<5.5?109.:digit<6.5?125.:digit<7.5?7.:digit<8.5?127.:111.;
    vec2 horizontal=vec2(2.82,.87),vertical=vec2(.88,2.24);
    float bars=max(digitSegment(mask,1.,p-vec2(0.,4.76),horizontal),digitSegment(mask,8.,p+vec2(0.,4.76),horizontal));
    bars=max(bars,digitSegment(mask,64.,p,horizontal));
    float right=max(digitSegment(mask,2.,p-vec2(2.36,2.56),vertical),digitSegment(mask,4.,p-vec2(2.36,-2.56),vertical));
    float left=max(digitSegment(mask,32.,p-vec2(-2.36,2.56),vertical),digitSegment(mask,16.,p-vec2(-2.36,-2.56),vertical));
    return max(bars,max(right,left));
  }
  float edge(float value){
    return 1.-smoothstep(-.15,.16,value);
  }
  vec3 classicFace(vec3 skin,vec3 ink){
    float x=abs(vBind.x),y=vBind.y,z=vBind.z;
    float frontal=smoothstep(3.2,7.7,z);
    float hairline=mix(164.2,174.8,smoothstep(-1.,8.,z));
    float fade=1.-smoothstep(-.45,1.4,hairline-y);
    float shaved=1.-step(.5,abs(uLook.x-1.));
    float grain=wash(floor(vec2(vBind.x+z*.4,y)*2.3)*.73);
    vec3 hair=mix(vec3(.13,.086,.071),uHair,uCustom);
    vec3 material=mix(skin,hair*(.90+.16*grain),fade*shaved*(.36+.38*grain));

    float eyeHeight=168.15+.10*(x-3.5);
    float eyeSocket=edge(abs(x-3.45)-1.93)*edge(abs(y-eyeHeight)-.91+.19*abs(x-3.45));
    float eyeOpening=edge(abs(x-3.40)-1.43)*edge(abs(y-eyeHeight)-.32+.16*abs(x-3.4));
    float pupil=edge(max(abs(x-3.18)-.45,abs(y-eyeHeight)-.34));
    float brow=edge(abs(x-3.65)-1.88)*edge(abs(y-169.35-.20*(x-3.65))-.34);
    float nostril=edge(abs(x-1.20)-.48)*edge(abs(y-163.25+.13*x)-.24);
    float philtrum=edge(x-.46)*edge(abs(y-162.47)-.45);
    float lipLine=edge(x-2.60)*edge(abs(y-160.9+.06*x*x)-.12);
    float lowerLip=edge(x-1.78)*edge(abs(y-160.34+.05*x*x)-.20);


    material=mix(material,skin*vec3(.63,.49,.43),frontal*eyeSocket*.50);
    material=mix(material,vec3(.59,.48,.35),frontal*eyeOpening*.78);
    material=mix(material,ink,frontal*eyeOpening*pupil*.96);
    material=mix(material,mix(skin*.45,hair,.62),frontal*brow*.95);
    material=mix(material,skin*vec3(.39,.28,.26),frontal*(nostril*.78+philtrum*.26));
    material=mix(material,skin*vec3(1.19,.80,.71),frontal*lowerLip*.73);
    material=mix(material,vec3(.25,.12,.094),frontal*lipLine*.78);
    return material;
  }
  void main(){
    if(uInk>0.){gl_FragColor=vec4(.060,.044,.071,1.);return;}
    vec3 n=normalize(vN);
    float x=vBind.x*uMirrorSign,y=vBind.y,z=vBind.z;
    float front=smoothstep(2.,7.5,z),back=1.-smoothstep(-7.,-3.,z);
    float shirt=1.-step(.26,abs(vDetail.x-1.));
    float sleeve=1.-step(.26,abs(vDetail.x-2.));
    float region=vDetail.x;
    float face=vDetail.y;
    vec3 black=vec3(.085,.063,.103);
    vec3 bone=vec3(.97,.86,.66);
    vec3 ember=vec3(.78,.162,.10);
    vec3 teal=vec3(.055,.59,.55);
    vec3 trophy=vec3(1.,.63,.20);
    vec3 material=vC;
    vec3 skin=mix(vec3(.69,.41,.27),uSkin,uCustom);
    vec3 shorts=mix(mix(vec3(.13,.126,.18),mix(black,uSecondary,.29),uTeam),black,uKeeper);
    if(region>2.7&&region<3.3&&(uCustom>.5||uTeam>.5||uKeeper>.5)){
      float cuffLevel=uLook.z>1.5?58.:uLook.z>.5?19.:44.;
      float sock=1.-smoothstep(cuffLevel-.5,cuffLevel+.5,y);
      float stripe=1.-smoothstep(.38,.9,abs(y-cuffLevel+2.));
      vec3 sockColor=mix(mix(bone,uPrimary,uTeam),mix(vec3(.85,.11,.48),uPrimary,uTeam),uKeeper);
      material=mix(skin,mix(sockColor,mix(black,mix(uSecondary,black,uKeeper),uTeam),stripe)*(0.92+.08*cos(x*4.3+z*2.3)),sock);
      float hem=mix(76.,61.,uKitFit.x);
      float fabric=smoothstep(hem,hem+.7,y);
      float stripeShorts=smoothstep(10.1,11.8,abs(x))*(1.-smoothstep(13.,14.,abs(x)));
      vec3 legShorts=mix(shorts,uPrimary,stripeShorts*.72*uTeam*(1.-uKeeper));
      material=mix(material,mix(legShorts,black,(1.-smoothstep(.4,1.2,y-hem))*.55),fabric);
    }
    if(region>3.7&&region<4.3&&uCustom>.5){
      float upper=smoothstep(.98,2.42,y);
      float trim=etchedLine(z*.35+x*.22,.12);
      float stitch=1.-smoothstep(.12,.4,abs(y-2.65));
      material=mix(vC*.62,mix(uBoot*.49,uBoot,upper),.91);
      material=mix(material,bone,(trim*.28+stitch*.47)*upper);
    }
    if(region>4.7&&region<5.3&&uCustom>.5){
      float grain=wash(vec2(x*.55+z*.25,y*.43));
      float lock=etchedLine((x*.78+z*.34)*1.24+y*.20,.072);
      material=uHair*(.71+vC.r*1.8+grain*.12+lock*.18);
    }
    if(region>7.5){
      float grain=wash(floor(vec2(x+z*.3,y)*2.5)*.65);
      float strands=etchedLine((x+z*.42)*2.45+y*.20,.094);
      material=uBeard*(.70+vC.r*.95+grain*.14+strands*.16);
      if(uLook.y<1.5)material=mix(skin,material,.62);
    }
    if(region>5.7&&region<6.3)material=mix(vC,skin,uCustom*.92);
    if(region>6.7&&region<7.3&&(uTeam>.5||uKeeper>.5)){
      float strip=smoothstep(10.1,11.8,abs(x))*(1.-smoothstep(13.,14.,abs(x)));
      material=mix(shorts,uPrimary,strip*.72*(1.-uKeeper));
    }
    if(shirt+sleeve>.5){
      float left=1.-smoothstep(-1.2,1.2,x-.32*(y-125.)+z*.32);
      float seam=1.-smoothstep(.28,1.10,abs(x-.32*(y-125.)+z*.32));
      vec3 field=mix(bone,ember,left);
      float keeperStripe=smoothstep(-.8,.45,cos(x*.24-y*.36+z*.06));
      vec3 keep=mix(vec3(.85,.11,.48),vec3(.60,.07,.34),keeperStripe*.42);
      vec3 jersey=mix(field,keep,uKeeper);
      float kitMark=0.;
      if(uKitPattern>.5&&uKitPattern<1.5)kitMark=step(.5,fract((x+2.8)/11.2));
      else if(uKitPattern<2.5&&uKitPattern>1.5)kitMark=step(.5,fract((y-102.)/13.));
      else if(uKitPattern<3.5&&uKitPattern>2.5)kitMark=1.-smoothstep(3.4,4.3,abs(x+(y-126.)*.65));
      else if(uKitPattern<4.5&&uKitPattern>3.5)kitMark=step(0.,x);
      else if(uKitPattern<5.5&&uKitPattern>4.5)kitMark=step(0.,x*(y-126.));
      else if(uKitPattern>5.5)kitMark=max(1.-step(3.,abs(x)),1.-step(3.,abs(y-133.)));
      vec3 teamJersey=mix(uPrimary,uSecondary,kitMark);
      float thirdStripe=kitMark*step(.76,fract((uKitPattern<1.5?x:y)/11.2));
      teamJersey=mix(teamJersey,uTertiary,thirdStripe*uHasTertiary);
      jersey=mix(jersey,mix(teamJersey,mix(uPrimary,uPrimary*.74,keeperStripe*.38),uKeeper),uTeam);
      jersey=mix(jersey,black,seam*(1.-uKeeper*.72)*.78*(1.-uTeam));
      float collar=(1.-smoothstep(.34,1.2,abs(y-149.7+front*4.-abs(x)*.18)))*(1.-smoothstep(7.8,11.,abs(x)));
      float hem=1.-smoothstep(.26,.98,abs(y-102.2));
      jersey=mix(jersey,mix(black,trophy,uKeeper),max(collar*.91,hem*.55));
      vec2 p=vec2(-x+.13*(y-125.),y-125.);
      float plate=panel(p,vec2(8.45,7.55));
      if(back*plate>0.){
        float units=mod(uShirtNumber,10.);
        float digits=uShirtNumber<10.?shirtDigit(p,units):max(
          shirtDigit(p+vec2(3.8,0.),floor(uShirtNumber*.1)),shirtDigit(p-vec2(3.8,0.),units));
        jersey=mix(jersey,black,back*plate*.94);
        jersey=mix(jersey,bone,digits*back);
      }
      vec2 badge=vec2(x-7.1,y-140.2);
      float crest=panel(vec2(badge.x,badge.y+.52*abs(badge.x)),vec2(2.30,2.8));
      float bolt=panel(vec2(badge.x+.43*badge.y,badge.y),vec2(.37,1.86));
      jersey=mix(jersey,black,crest*front*(1.-uHasBadge));
      jersey=mix(jersey,trophy,crest*bolt*front*(1.-uHasBadge));
      vec2 badgeUV=vec2((x-7.1)/6.4+.5,.5-(y-140.2)/6.4);
      float badgeArea=step(0.,badgeUV.x)*step(badgeUV.x,1.)*step(0.,badgeUV.y)*step(badgeUV.y,1.);
      vec4 clubBadge=texture2D(uClubBadge,clamp(badgeUV,0.,1.));
      jersey=mix(jersey,clubBadge.rgb,clubBadge.a*badgeArea*front*uHasBadge*shirt);
      float piping=etchedLine((abs(x)+z*.26)*.43,.064)*(1.-smoothstep(.50,.81,front+back));
      jersey=mix(jersey,black,.27*piping);
      float wrinkles=etchedLine((y+sin(x*.5)*2.3+z*.30)*.28,.045);
      float folds=(1.-smoothstep(1.0,4.,abs(y-105.5)))*.63+.24*(1.-smoothstep(2.,5.,abs(x)-9.));
      jersey=mix(jersey,black,wrinkles*folds*.37);
      jersey*=.94+.09*wash(vec2(x+z*.38,y)*.42);
      if(shirt>.5&&uLook.w>.5){
        float belt=1.-smoothstep(.55,1.24,abs(y-108.));
        jersey=mix(jersey,shorts,1.-smoothstep(107.3,108.0,y));
        jersey=mix(jersey,mix(black,uPrimary,uTeam*.24),belt*.88);
      }
      if(sleeve>.5){
        float side=abs(x),shortSleeve=1.-smoothstep(33.2,34.2,side);
        float fullSleeve=max(uKeeper,uKitFit.y);
        float cuff=1.-smoothstep(.42,1.07,abs(side-mix(32.4,66.4,fullSleeve)));
        vec3 longSleeve=mix(mix(keep,vec3(.72,.09,.40),smoothstep(34.,48.,side)),mix(uPrimary,mix(uSecondary,uPrimary*.82,uKeeper),smoothstep(34.,59.,side)),uTeam);
        jersey=mix(mix(skin,jersey,shortSleeve),mix(jersey,longSleeve,smoothstep(31.,36.,side)),fullSleeve);
        jersey=mix(jersey,black,cuff*.94);
        float band=1.-smoothstep(1.35,1.68,abs(x-42.2));
        float pin=1.-smoothstep(.07,.21,abs(x-41.3));
        jersey=mix(jersey,mix(trophy,black,pin),band*(1.-fullSleeve));
      }
      material=jersey;
    }
    if(face>1.5){
      material=classicFace(skin,black);
    }else if(face>.5){
      float hairEdge=mix(mix(159.8,171.6,smoothstep(1.,9.,z)),mix(163.5,173.7,smoothstep(1.,9.,z)),uKeeper)+1.14*smoothstep(5.1,8.6,abs(x));
      float scalp=smoothstep(-.55,.88,y-hairEdge);
      float visible=smoothstep(7.2,10.1,z)*(1.-scalp);
      vec2 eyePos=vec2(abs(x)-3.57,y-168.4+.13*(abs(x)-3.57));
      float socket=oval(eyePos+vec2(0,.14),vec2(1.81,.93));
      float eye=oval(eyePos,vec2(1.40,.46));
      float liner=oval(eyePos,vec2(1.52,.59));
      float iris=oval(eyePos+vec2(.17,.0),vec2(.48,.50));
      float brow=oval(eyePos-vec2(.08,1.08-.14*eyePos.x),vec2(1.75,.39));
      float lips=oval(vec2(x,y-161.3+.073*x*x),vec2(2.53,.31));
      float nose=oval(vec2(abs(x)-.84,y-164.65),vec2(.50,.23));
      float cheek=etchedLine((x*.53+y*.65)*1.15,.06)*oval(vec2(abs(x)-5.3,y-165.1),vec2(1.45,1.57));
      float beard=oval(vec2(x,y-159.3),vec2(4.8,3.0))*uKeeper;
      material=mix(material,skin,uCustom*.95);
      material=mix(material,material*vec3(.66,.57,.59),visible*(socket*.56+beard*.70));
      material=mix(material,vec3(.18,.081,.074),visible*(lips*.83+nose*.79+cheek*.37));
      material=mix(material,black,visible*liner);
      material=mix(material,bone,visible*eye*.94);
      material=mix(material,black,visible*max(iris,brow));
      float strand=sin(x*2.3+z*1.65+sin(y*.61))*sin(z*.77+x*.62);
      vec3 hair=mix(mix(vec3(.105,.063,.067),vec3(.23,.118,.065),uKeeper),uHair,uCustom);
      material=mix(material,hair*(.90+strand*.25),scalp);
    }
    vec2 paper=vec2(x+z*.32,y+z*.13)*.31;
    vec3 color=printShade(material,n,paper,face>1.5?.24:.90);
    float rim=1.-abs(dot(n,normalize(uEye-vP)));
    color=mix(color,black,smoothstep(.83,.96,rim)*(face>1.5?.28:.60));
    float fog=smoothstep(30.,100.,distance(vP,uEye));
    gl_FragColor=vec4(mix(color,vec3(${art.horizon.join(',')}),fog*.73),1.);
  }
`));
gl.linkProgram(program);
if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Modelo 3D: '+gl.getProgramInfoLog(program));
const loc={};
for(const name of ['aP','aN','aC','aJ','aW','aBind','aDetail'])loc[name]=gl.getAttribLocation(program,name);
for(const name of ['uM','uVP','uEye','uKeeper','uShirtNumber','uInk','uCustom','uTeam','uSkin','uHair','uBeard','uBoot','uPrimary','uSecondary','uTertiary','uKitPattern','uHasTertiary','uClubBadge','uHasBadge','uLook','uKitFit','uMirrorSign','uB[0]'])loc[name]=gl.getUniformLocation(program,name);
const sourceMeshes=pack.meshes.map(m=>({...m,p:decode(m.positions),n:decode(m.normals),j:decode(m.joints),w:decode(m.weights),ix:decode(m.indices,Uint16Array)}));
const bootShapes=['Left','Right'].map(side=>{
  const foot=byName[side+'Foot'];
  const inverse=pack.bones[foot].inverse;
  const influences=fieldRig.map(bone=>bone.name.startsWith(side)&&/Foot|Toe/.test(bone.name));
  const vertices=[];
  for(const mesh of sourceMeshes){
    for(let index=0;index<mesh.count;index++){
      let weight=0;
      for(let joint=0;joint<4;joint++)if(influences[mesh.j[index*4+joint]])weight+=mesh.w[index*4+joint];
      if(weight<.65)continue;
      const local=point(inverse,mesh.p.subarray(index*3,index*3+3));
      vertices.push(rotateVector(neutralWorld[foot],local));
    }
  }
  if(!vertices.length)return[{local:bootMarkers[side==='Left'?0:1],radius:.046}];
  const back=Math.min(...vertices.map(vertex=>vertex[2]));
  const front=Math.max(...vertices.map(vertex=>vertex[2]));
  return [.30,.74].map(fraction=>{
    const depth=lerp(back,front,fraction);
    const slice=vertices.filter(vertex=>Math.abs(vertex[2]-depth)<.055/scale);
    const x=slice.map(vertex=>vertex[0]),y=slice.map(vertex=>vertex[1]);
    const left=Math.min(...x),right=Math.max(...x),bottom=Math.min(...y),top=Math.max(...y);
    const radius=Math.min((right-left)*.5,(top-bottom)*.5+1.2,depth-back,front-depth+.8);
    const center=[(left+right)*.5,(bottom+top)*.5,depth];
    const local=rotateVector(qi(neutralWorld[foot]),center);
    const toe=pack.bones[byName[side+'ToeBase']];
    const toeLocal=rotateVector(qi(toe.q),subtract(local,toe.p));
    const forefoot=rotateVector(bindWorld[foot],subtract(local,toe.p))[2]+7.97;
    return {local,toeLocal,flex:toeWeight(forefoot),radius:clamp(radius*scale*1.15,.036,.064)};
  });
});
const soleSamples=[];for(let mesh of sourceMeshes){let cells=new Map();for(let i=0;i<mesh.count;i++){if(mesh.p[i*3+1]>24)continue;let footWeight=0;for(let j=0;j<4;j++)if(/Foot|Toe/.test(fieldRig[mesh.j[i*4+j]].name))footWeight+=mesh.w[i*4+j];if(footWeight<.5)continue;let key=Math.round(mesh.p[i*3]/2)+','+Math.round(mesh.p[i*3+2]/2),old=cells.get(key);if(old===undefined||mesh.p[i*3+1]<mesh.p[old*3+1])cells.set(key,i)}for(let i of cells.values())soleSamples.push({mesh,index:i,bind:mesh.p.subarray(i*3,i*3+3)})}
function ramp(a,b,x){
  const t=clamp((x-a)/(b-a),0,1);
  return t*t*(3-2*t);
}

function hairline(x,z,goalie){
  const front=ramp(1,9,z);
  const side=ramp(5.2,8.7,Math.abs(x));
  if(goalie)return lerp(164,173.7,front)+.9*side+.65*Math.sin(x*.44+z*.12);
  return lerp(159.8,171.6,front)+1.9*side+1.45*Math.sin(x*.47+z*.14);
}

function reshapeVertex(x,y,z,goalie){
  const head=ramp(153,160,y)*(1-ramp(10,13,Math.abs(x)));
  const hair=ramp(-.9,1.8,y-hairline(x,z,goalie))*head;
  const crown=ramp(171,181,y);
  const lock=goalie?.18*Math.sin(x*1.7+z*.56):.32*Math.sin(x*1.43+z*.75)+.19*Math.sin(z*2.6-x*.9);
  const shoulders=ramp(109,142,y)*(1-ramp(148,157,y))*(1-ramp(14,23,Math.abs(x)));
  const temples=ramp(161,173,y);
  const cheek=Math.exp(-((Math.abs(x)-4.3)**2*.23+(y-165.8)**2*.28))*ramp(6,10,z);
  const chin=ramp(154,158,y)*(1-ramp(161,164,y))*ramp(5,10,z);
  const jaw=ramp(154,157,y)*(1-ramp(161.5,166,y));
  const nose=Math.exp(-(x*x*.54+(y-165.7)**2*.39))*ramp(7.5,11,z);
  const brow=Math.exp(-((Math.abs(x)-3.5)**2*.25+(y-169.9)**2*.61))*ramp(7.5,11,z);
  const glove=goalie?ramp(68,74,Math.abs(x)):0;
  return [
    x*(1+shoulders*(goalie?.142:-.027)+head*((goalie?.022:-.090)*temples+(goalie?.125:-.056)*jaw)+hair*(goalie?.018:.052)),
    y+head*(goalie?.9:-.28)*ramp(160,176,y)+hair*crown*(goalie?.82:2.3)+hair*lock+glove*(y-143)*.22,
    z+(z+5)*shoulders*(goalie?.077:.030)+(z+.7)*hair*(goalie?.025:.06)+head*(cheek*(goalie?.38:.96)+chin*(goalie?1.0:-.40)+nose*(goalie?1.70:2.11)+brow*.52)+glove*(z+5)*.18
  ];
}

const kits={
  field:{skin:[.69,.41,.27],top:[.88,.69,.48],cuff:[.28,.14,.12],shorts:[.14,.10,.17],sock:[.67,.17,.14],trim:[.97,.69,.29],boot:[.89,.44,.13],sole:[.19,.10,.16],lace:[1,.86,.53]},
  keeper:{skin:[.80,.56,.38],top:[.85,.11,.48],cuff:[.64,.08,.36],shorts:[.085,.063,.103],sock:[.85,.11,.48],trim:[.12,.10,.14],boot:[.15,.34,.41],sole:[.09,.12,.20],lace:[.86,.64,.29]}
};
const mixColor=(a,b,t)=>a.map((value,k)=>lerp(value,b[k],t));

function kitVertex(name,x,y,z,normal,goalie){
  const kit=goalie?kits.keeper:kits.field;
  const side=Math.abs(x);
  if(name.includes('Head')||name==='Neck')return kit.skin;
  if(name.includes('Hand')){
    if(!goalie)return kit.skin;
    const finger=ramp(76,82,side),palm=ramp(.1,.84,normal[1]),pads=ramp(.16,.53,Math.sin(side*.55+z*1.4)**2);
    return mixColor(mixColor([.84,.70,.10],[.98,.86,.16],finger*(.52+.40*pads)),[1.0,.92,.30],palm*.76);
  }
  if(/Arm|Shoulder|Spine/.test(name)){
    const cuff=ramp(63,67,side);
    const seam=ramp(.64,.95,Math.cos((side-65)*1.58))*cuff;
    const color=mixColor(kit.top,kit.cuff,cuff*.64);
    if(goalie&&side>18&&side<38&&y>144&&z>-5)return mixColor(color,[.78,.91,.51],ramp(145,148,y)*.7);
    return mixColor(color,goalie?[.18,.40,.67]:[.58,.09,.16],seam*.57);
  }
  if(name==='Hips'||name.includes('UpLeg')){
    const hem=ramp(goalie?78:81,goalie?83:86,y);
    const piping=ramp(14.5,18,side)*ramp(.36,.83,Math.abs(normal[0]));
    return mixColor(kit.skin,mixColor(kit.shorts,kit.trim,piping*.64),hem);
  }
  if(name.includes('Foot')||name.includes('Toe')){
    const upper=ramp(.6,2.0,y);
    const heel=ramp(-7,-2,z);
    const laces=ramp(3,6,y)*ramp(1,5,z)*(1-ramp(10,13,z))*ramp(.15,.85,normal[1]);
    const diagonal=ramp(.62,.99,Math.sin(z*.72+(side-9)*.74)**2);
    return mixColor(mixColor(kit.sole,mixColor(kit.boot,kit.lace,laces*diagonal*.76),upper),kit.sock,(1-heel)*ramp(7.0,10.5,y));
  }
  if(name.includes('Leg')){
    const sock=1-ramp(40,43,y),band=ramp(36,38,y)*(1-ramp(40,42,y));
    return mixColor(kit.skin,mixColor(kit.sock,kit.trim,band*.87),sock);
  }
  return kit.skin;
}

function retainAnatomy(base,withBoot){
  const vertices=[],normals=[],joints=[],weights=[],indices=[],mapped=new Map();
  const keep=(i)=>{
    const [x,y]=base.p.subarray(i*3,i*3+2),side=Math.abs(x);
    return (withBoot&&y<10.9)||(y>148&&side<9.7&&(withBoot||y<155))||(side>=70&&y>134);
  };
  for(let i=0;i<base.ix.length;i+=3){
    const triangle=base.ix.subarray(i,i+3);
    if(!triangle.every(keep))continue;
    for(const vertex of triangle){
      if(!mapped.has(vertex)){
        mapped.set(vertex,vertices.length/3);
        vertices.push(...base.p.subarray(vertex*3,vertex*3+3));
        normals.push(...base.n.subarray(vertex*3,vertex*3+3));
        joints.push(...base.j.subarray(vertex*4,vertex*4+4));
        weights.push(...base.w.subarray(vertex*4,vertex*4+4));
      }
      indices.push(mapped.get(vertex));
    }
  }
  return {count:vertices.length/3,p:new Float32Array(vertices),n:new Float32Array(normals),j:new Float32Array(joints),w:new Float32Array(weights),ix:new Uint16Array(indices)};
}

const anatomy=sourceMeshes.map(mesh=>retainAnatomy(mesh,true));
const fieldAnatomy=sourceMeshes.map(mesh=>retainAnatomy(mesh,false));

function kitSurface(goalie){
  const vertices=[],normals=[],joints=[],weights=[],indices=[],regions=[];
  function tube(guides,region,position,influences){
    const sides=24,first=vertices.length/3,sections=[];
    const interpolate=(a,b,c,d,t)=>.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);
    for(let i=0;i<guides.length-1;i++){
      const a=guides[Math.max(0,i-1)],b=guides[i],c=guides[i+1],d=guides[Math.min(guides.length-1,i+2)];
      const steps=Math.max(1,Math.ceil((c[0]-b[0])/2.2));
      for(let j=0;j<steps;j++){
        const t=j/steps;
        sections.push([lerp(b[0],c[0],t),...b.slice(1).map((_,k)=>interpolate(a[k+1],b[k+1],c[k+1],d[k+1],t))]);
      }
    }
    sections.push(guides[guides.length-1]);
    for(let r=0;r<sections.length;r++){
      const section=sections[r];
      for(let s=0;s<sides;s++){
        const angle=s/sides*Math.PI*2;
        const at=(row,theta)=>position(sections[row],Math.cos(theta),Math.sin(theta));
        const vertex=at(r,angle);
        const [a,b,t]=influences(section[0],vertex);
        const around=subtract(at(r,angle+.03),at(r,angle-.03));
        const along=subtract(at(Math.min(r+1,sections.length-1),angle),at(Math.max(r-1,0),angle));
        const out=subtract(vertex,position(section,0,0));
        let normal=unit(cross(around,along));
        if(dot(normal,out)<0)normal=normal.map(x=>-x);
        vertices.push(...vertex);
        normals.push(...normal);
        joints.push(byName[a],byName[b],0,0);
        weights.push(1-t,t,0,0);
        regions.push(region);
        if(r===sections.length-1)continue;
        const p=first+r*sides+s,q=first+r*sides+(s+1)%sides;
        indices.push(p,q,p+sides,q,q+sides,p+sides);
      }
    }
  }

  const spine=y=>{
    if(y<115)return ['Hips','Spine',ramp(105,116,y)];
    if(y<125)return ['Spine','Spine1',ramp(115,125,y)];
    return ['Spine1','Spine2',ramp(125,137,y)];
  };
  const waist=[
    [99.6,14.0,8.6,.8],[101.2,15.0,9.3,.7],[105,14.9,9.0,.6],[112,13.1,8.4,.8],
    [120,12.9,8.9,.45],[129,14.7,10.6,-.15],[138,goalie?17.1:16.6,goalie?10.9:10.2,-1.45],
    [144,17.0,9.3,-2.25],[147.5,14.2,7.65,-2.6],[150.2,8.8,5.05,-2.7],[151.4,5.2,4.45,-2.75]
  ];
  tube(waist,'Jersey',([y,w,d,z],c,s)=>{
    const folds=.31*Math.sin(y*1.15+c*4.7+s*2.1)*(1-ramp(116,134,y))
      +.23*Math.cos(c*7+s*4+y*.46)*ramp(117,131,y)*(1-ramp(141,149,y));
    return [(w+folds)*c,y,z+(d+folds)*s];
  },spine);
  tube(
    goalie?[[89.8,12.7,7.1,.15],[92.6,15.7,9.05,.5],[98.2,16.0,9.25,.6],[103.5,14.6,8.8,.7],[105,13.6,8.2,.6]]:
      [[86.7,.06,.08,.45],[87.8,3.25,4.6,.45],[89.7,10.1,7.75,.50],[92.4,14.7,9.52,.43],
       [96.4,15.7,9.56,.44],[100.6,15.1,9.05,.57],[105,13.6,8.14,.65]],
    'Shorts',([y,w,d,z],c,s)=>[w*c,y,z+d*s],
    (y,[x])=>['Hips',x>=0?'LeftUpLeg':'RightUpLeg',goalie?0:ramp(2.1,12.2,Math.abs(x))*(1-ramp(92,101,y))*.52]
  );

  for(const sign of [-1,1]){
    const side=sign<0?'Right':'Left';
    tube(
      [[10.9,144.0,-4.8,5.3,6.3],[15.7,144,-5.5,6.3,6.7],[22.5,144,-5.5,5.8,5.55],[29.5,144.1,-5.6,4.95,5.2],
       [37.2,144,-5.6,4.1,4.55],[43.1,144.1,-5.4,3.8,4.03],[48.2,144.05,-5.4,4.35,4.5],
       [55.0,144.05,-5.4,3.95,4.01],[63.8,144.05,-5.5,3.2,3.42],[68.5,144.1,-5.55,2.9,3.2],
       [71.25,144.1,-5.55,goalie?3.25:2.6,goalie?3.35:3.0],[72.4,144.1,-5.55,2.1,2.55]],
      'Sleeve',([x,y,z,h,d],c,s)=>[sign*x,y+h*c*(goalie?1.055:1),z+d*s*(goalie?1.055:1)],x=>{
        if(x<23)return ['Spine2',side+'Arm',ramp(10.4,23,x)];
        if(x<60)return [side+'Arm',side+'ForeArm',ramp(37.2,49.3,x)];
        return [side+'ForeArm',side+'Hand',ramp(66.9,72.5,x)];
      }
    );
    if(!goalie){
      tube([
        [-7.75,8.1,.13,.9,3.1],[-7.25,8.13,1.9,.43,6.0],[-5.7,8.14,3.18,.18,8.05],
        [-3.8,8.2,3.92,.10,9.9],[-1.1,8.26,4.32,.18,10.65],[1.55,8.32,4.48,.19,9.75],
        [4.25,8.87,4.72,.14,8.25],[6.6,9.13,4.92,.09,6.93],[8.3,9.18,4.94,.12,6.25],
        [9.8,9.15,4.86,.09,5.87],[11.1,8.95,4.61,.09,5.45],[13.3,8.55,4.22,.2,4.79],
        [15.3,7.97,3.23,.47,4.06],[16.65,7.4,1.88,.9,3.3],[17.1,6.89,.115,1.51,2.44]
      ],'Boot',([z,x,w,sole,upper],c,s)=>[sign*x+w*c,sole+(upper-sole)*((s+1)*.5)**1.48,z],
      z=>[side+'Foot',side+'ToeBase',toeWeight(z)]);
    }
    const hem=goalie?80.5:82.2;
    tube(
      [[8.0,8.23,-2.45,3.25,3.6],[11.5,8.23,-2.55,3.6,4.15],[17.5,8.25,-2.8,3.66,4.35],
       [23.5,8.3,-2.7,4.2,5.06],[31.2,8.5,-2.0,5.39,6.18],[37.0,8.5,-1.54,5.75,6.17],
       [40.5,8.44,-.91,5.43,5.79],[44.2,8.4,-.46,4.93,5.5],[49.1,8.25,.0,4.79,5.62],
       [53.2,8.22,.44,5.3,6.15],[58.2,8.31,.33,5.75,6.04],[68,8.8,.21,goalie?6.85:7.10,7.42],
       [hem-1.8,9.45,.19,7.79,8.08],[hem+1.1,9.45,.03,goalie?8.35:8.68,8.67],
       [91.1,goalie?9.09:8.85,-.38,goalie?9.08:9.24,9.12],
       [96.6,8.65,-.37,9.01,9.1],[101.7,8.4,-.22,6.9,7.55]],
      'Leg',([y,x,z,w,d],c,s)=>[sign*x+w*c,y,z+d*s],y=>{
        if(y<22)return [side+'Foot',side+'Leg',ramp(8,18.5,y)];
        if(y<84)return [side+'Leg',side+'UpLeg',ramp(46,60,y)];
        return [side+'UpLeg','Hips',ramp(92.8,101.4,y)];
      }
    );
  }
  return {count:vertices.length/3,p:new Float32Array(vertices),n:new Float32Array(normals),j:new Float32Array(joints),w:new Float32Array(weights),ix:new Uint16Array(indices),regions};
}

function setModelMaterial(region,name,x,y,z,normal,goalie){
  const kit=goalie?kits.keeper:kits.field;
  if(region==='Leg'){
    if(y>64){
      const hem=goalie?80.5:82.2;
      const fabric=ramp(hem-.5,hem+1.4,y);
      const edge=ramp(hem,hem+.65,y)*(1-ramp(hem+1.15,hem+2.25,y));
      const side=ramp(.82,.99,Math.abs(normal[0]))*(1-ramp(.13,.42,Math.abs(normal[2])));
      return mixColor(kit.skin,mixColor(kit.shorts,kit.trim,Math.max(edge*.28,side*.65)),fabric);
    }
    const sock=1-ramp(39.9,41,y),band=ramp(37,37.8,y)*(1-ramp(38.7,39.75,y));
    const rib=.93+.07*Math.cos(x*4.3+z*2.3);
    return mixColor(kit.skin,mixColor(kit.sock,kit.trim,band*.84).map(c=>c*rib),sock);
  }
  if(region==='Jersey')return kit.top;
  if(region==='Shorts')return kit.shorts;
  if(region==='Sleeve')return kitVertex('Arm',x,y,z,normal,goalie);
  return kitVertex(name,x,y,z,normal,goalie);
}

const headAngles=[0,18,36,55,82,112,146,180,214,248,278,305,324,342].map(deg=>deg*Math.PI/180);
const faceProfile=[
  [151.5,3.8,3.4,6.6,0],[154.4,4.6,7.5,7.0,0],[157.5,5.8,9.1,9.0,.3],
  [160.1,6.9,9.9,10.5,.15],[162.0,7.45,10.1,11.4,.25],[163.9,7.9,9.6,11.8,2.95],
  [165.9,8.02,9.2,12.1,1.30],[168.2,8.04,8.75,12.0,.83],[170.45,8.19,10.1,11.9,.29],
  [173.45,8.07,10.3,11.45,0],[176.65,7.12,8.9,9.9,0],[179.25,5.0,5.95,6.85,0],[180.5,2.6,2.7,3.9,0]
];
const faceRings=faceProfile.map(([y,width,front,back,tip])=>headAngles.map(angle=>{
  const cos=Math.cos(angle),x=Math.sin(angle)*width;
  const cheeks=Math.exp(-((y-165.9)**2)*.24)*Math.exp(-((Math.abs(x)-4.5)**2)*.40)*Math.max(0,cos)*.95;
  return [x,y,-.7+cos*(cos>0?front+.7:back-.7)+tip*Math.max(0,cos)**20+cheeks];
}));

function headSurface(y,angle){
  const a=(angle+Math.PI*2)%(Math.PI*2);
  const next=headAngles.findIndex(t=>t>a+.00001);
  const j=next<0?headAngles.length-1:Math.max(0,next-1),k=(j+1)%headAngles.length;
  const t=(a-headAngles[j])/((headAngles[k]||Math.PI*2)-headAngles[j]);
  const row=faceProfile.findIndex(p=>p[0]>=y);
  const hi=row<0?faceRings.length-1:Math.max(1,row),lo=hi-1;
  const u=clamp((y-faceProfile[lo][0])/(faceProfile[hi][0]-faceProfile[lo][0]),0,1);
  const v=clamp(t,0,1);
  return faceRings[lo][j].map((point,i)=>v>=u
    ?point+(faceRings[lo][k][i]-point)*(v-u)+(faceRings[hi][k][i]-point)*u
    :point+(faceRings[hi][j][i]-point)*(u-v)+(faceRings[hi][k][i]-point)*v);
}

function classicHead(hairStyle,beardStyle){
  const hair=hairStyle!==undefined,beard=beardStyle!==undefined,joint=byName.Head;
  const vertices=[],normals=[],indices=[],joints=[],weights=[],colors=[],regions=[];
  const baseColor=hair||beard?[.140,.096,.079]:kits.field.skin;
  const region=hair?'Hair':beard?'Beard':'Face';

  function polygon(points,out,shade=1){
    let normal=unit(cross(subtract(points[1],points[0]),subtract(points[2],points[0])));
    if(dot(normal,out)<0){
      normal=normal.map(n=>-n);
      points=points.slice().reverse();
    }
    const start=vertices.length/3;
    for(const p of points){
      vertices.push(...p);
      normals.push(...normal);
      joints.push(joint,0,0,0);
      weights.push(1,0,0,0);
      colors.push(baseColor.map(c=>c*shade));
      regions.push(region);
    }
    for(let i=1;i<points.length-1;i++)indices.push(start,start+i,start+i+1);
  }

  function cover(rings,top,bottom){
    for(let row=0;row<rings.length;row++){
      for(let i=0;i<headAngles.length;i++){
        const next=(i+1)%headAngles.length;
        const a=rings[row][i],b=rings[row][next];
        const angle=headAngles[i];
        if(row===0)polygon([bottom,b,a],[0,-1,0]);
        if(row===rings.length-1)polygon([a,b,top],[0,1,0]);
        else polygon([a,b,rings[row+1][next],rings[row+1][i]],
          [a[0]+b[0],0,a[2]+b[2]+1.6],hair?.94+.13*Math.cos(angle*4+row):1);
      }
    }
  }

  if(beard){
    const width=[0,1.62,.60,1.66,1.61,1.57][beardStyle];
    const length=[0,0,0,.2,5.5,0][beardStyle];
    const depth=[0,.18,.48,1.09,1.49,.53][beardStyle];
    function strip(span,lower,upper,boost){
      const rows=5,cols=24;
      const vertices=Array.from({length:rows+1},(_,row)=>Array.from({length:cols+1},(_,col)=>{
        const angle=(col/cols*2-1)*span, t=row/rows, side=Math.abs(angle)/span;
        const y=lerp(lower(side),upper(side),t);
        const scalpY=clamp(y,156.55,170);
        const p=headSurface(scalpY,angle);
        const mass=Math.sin(t*Math.PI)**.74*Math.max(0,1-side**3);
        const offset=.16+boost*(.28+.72*mass)*(1-side**5);
        const hanging=y<scalpY?clamp((scalpY-y)/6.4,0,1):0;
        return [p[0]*(1-hanging*.31)+Math.sin(angle)*offset,y,p[2]+Math.cos(angle)*offset-hanging*.55];
      }));
      for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
        const a=vertices[row][col],b=vertices[row][col+1],c=vertices[row+1][col+1],d=vertices[row+1][col];
        const angle=((col+.5)/cols*2-1)*span,out=[Math.sin(angle),-0.10,Math.cos(angle)];
        polygon([a,b,c,d],out,.89+.20*Math.cos(col*.81+row*.51));
      }
      for(let col=0;col<cols;col++){
        const a=vertices[0][col],b=vertices[0][col+1];
        const anchor=(p,i)=>headSurface(clamp(p[1]+.09,152,166),(i/cols*2-1)*span);
        polygon([a,b,anchor(b,col+1),anchor(a,col)],[0,-1,0],.83);
      }
    }
    const short=beardStyle===1||beardStyle===5;
    const goat=beardStyle===2;
    strip(width,s=>goat?156.3+s*.75:155.1+6.2*s**2-length*(1-s*s),
      s=>goat?159.45+.14*Math.cos(s*Math.PI):159.65+(short?7.6:9.4)*s**1.7,depth);
    if(!short)strip(goat?.53:.54,s=>161.55-.59*s*s, s=>162.65-.78*s*s,depth*.49);
  }else if(hair){
    const lift=[2.75,0,.9,2.0,1.65,2.10,2.62][hairStyle];
    const fringe=[173.8,0,175.3,173.6,175.1,174.7,173.4][hairStyle];
    const nape=[163.7,0,166.9,164.6,169.4,165.8,164.2][hairStyle];
    const rings=headAngles.map(angle=>{
      const sin=Math.sin(angle), cos=Math.cos(angle), front=Math.max(0,cos);
      const curls=hairStyle===3||hairStyle===6;
      const wave=curls?.51*Math.sin(angle*7+.8)+.40*Math.sin(angle*11):.20*Math.sin(angle*3);
      const swept=(hairStyle===0||hairStyle===5)?sin*front*1.38:0;
      const edge=lerp(nape,fringe,front**.61)+wave*.52+swept;
      return [0,.28,.57,.82,1].map(t=>{
        const y=lerp(edge,180.45,t),p=headSurface(y,angle);
        const part=hairStyle===5?.80*Math.exp(-((angle-.41)**2)/.013)*Math.sin(t*Math.PI):0;
        const gain=Math.sin(t*Math.PI*.79)*(lift+wave*.55)*(front*.27+.63);
        const fullness=.22+gain*.72-part;
        return [p[0]+sin*fullness+swept*t*.40,p[1]+gain*.89,p[2]+cos*fullness];
      });
    });
    cover([0,1,2,3,4].map(row=>rings.map(column=>column[row])),[hairStyle===0?1.0:0,181.15+lift*.47,-.65],[0,171.4,-1.5]);
  }else{
    cover(faceRings,[0,180.85,-.7],[0,151.3,-1.5]);
    for(const side of [-1,1]){
      const ear=[[7.25,165.45,1.68],[7.64,169.1,-.02],[8.9,169.0,-1.43],[9.24,166.3,-1.4],
        [8.91,163.5,-.45],[7.65,162.95,1.18]].map(([x,y,z])=>[x*side,y,z]);
      const bowl=[8.58*side,166.0,.22],back=[7.78*side,166.1,-2.28];
      for(let i=0;i<ear.length;i++){
        const next=(i+1)%ear.length;
        polygon([ear[i],ear[next],bowl],[side,0,1]);
        polygon([ear[next],ear[i],back],[side,0,-1]);
      }
    }
  }
  return {count:vertices.length/3,p:new Float32Array(vertices),n:new Float32Array(normals),j:new Float32Array(joints),
    w:new Float32Array(weights),ix:new Uint16Array(indices),colors,regions,hairStyle,beardStyle};
}

function modelDetails(goalie,hairStyle){
  const vertices=[],normals=[],joints=[],weights=[],indices=[],regions=[],colors=[];
  function form(center,axes,bone,color,kind,angle=0,sides=12,rings=8){
    const base=vertices.length/3,joint=byName[bone],cs=Math.cos(angle),sn=Math.sin(angle);
    for(let ring=0;ring<=rings;ring++){
      const latitude=Math.PI*ring/rings;
      for(let i=0;i<=sides;i++){
        const longitude=Math.PI*2*i/sides;
        const unitNormal=[Math.sin(latitude)*Math.cos(longitude),Math.cos(latitude),Math.sin(latitude)*Math.sin(longitude)];
        const local=unitNormal.map((v,k)=>v*axes[k]);
        const n=unitNormal.map((v,k)=>v/axes[k]);
        vertices.push(center[0]+local[0]*cs+local[2]*sn,center[1]+local[1],center[2]-local[0]*sn+local[2]*cs);
        normals.push(...unit([n[0]*cs+n[2]*sn,n[1],-n[0]*sn+n[2]*cs]));
        const stroke=1+.13*Math.sin(longitude*3+latitude*.8)+.09*Math.cos(latitude*5-longitude);
        colors.push(color.map(v=>v*stroke));
        regions.push(kind);
        joints.push(joint,0,0,0);
        weights.push(1,0,0,0);
        if(ring===rings||i===sides)continue;
        const p=base+ring*(sides+1)+i,q=p+sides+1;
        if(ring!==0)indices.push(p,q,p+1);
        if(ring<rings-1)indices.push(p+1,q,q+1);
      }
    }
  }
  const hair=[.30,.15,.079];
  if(hairStyle===0){
    form([0,177.9,-1.18],[8.65,5.55,11.3],'Head',hair,'Hair',.06);
    for(let row=0;row<3;row++){
      for(let i=0;i<5;i++){
        const x=(i-2)*2.8+(row%2?.65:0),z=-6.8+row*5.2;
        const y=181.4-Math.abs(i-2)*.40+.61*Math.sin(i+row);
        form([x,y,z],[2.35,2.55+.45*Math.sin(i*2+row),3.7],'Head',hair.map(v=>v*(1.03+.20*Math.sin(i+row))), 'Hair',i*.39,9,6);
      }
    }
  }
  if(hairStyle===undefined)for(const sign of [-1,1]){
    const side=sign>0?'Left':'Right';
    const foot=side+'Foot',toe=side+'ToeBase';
    if(goalie){
      const hand=side+'Hand',cuff=side+'ForeArm';
      form([sign*72.2,144.1,-5.3],[3.60,3.72,5.12],cuff,[.12,.11,.14],'Detail');
      form([sign*73.2,147.15,-5.35],[2.75,1.37,4.58],hand,[.95,.82,.14],'Detail');
      form([sign*77.15,146.9,-5.35],[4.35,1.75,4.18],hand,[.98,.86,.18],'Detail');
      for(let finger=0;finger<4;finger++){
        form([sign*(80.15-finger*.33),145.68+finger*.23,-9.15+finger*2.04],
          [2.63,1.11,1.30],hand,[1.0,.90,.28],'Detail');
      }
      form([sign*76.2,143.82,-.36],[3.1,1.91,1.71],hand,[.86,.72,.12],'Detail');
    }
    for(const [z,half] of [[-4.4,1.85],[2.0,2.15],[8.0,2.61],[12.1,2.24]]){
      for(const x of [-half,half]){
        form([sign*8.65+x,.53,z],[.64,.53,.82],z>=8?toe:foot,[.20,.11,.17],'Detail',0,7,5);
      }
    }
    for(let tab=0;tab<3;tab++){
      const z=5.2+1.68*tab;
      form([sign*8.95,7.31-tab*.78,z],[2.4,.32,.38],z>=8?toe:foot,[.96,.80,.50],'Detail',-.2,9,5);
    }
  }
  return {count:vertices.length/3,p:new Float32Array(vertices),n:new Float32Array(normals),j:new Float32Array(joints),
    w:new Float32Array(weights),ix:new Uint16Array(indices),colors,regions,hairStyle};
}

function outwardIndices(mesh){
  const indices=new Uint16Array(mesh.ix);
  const vertex=(i)=>mesh.p.subarray(i*3,i*3+3);
  for(let i=0;i<indices.length;i+=3){
    const a=indices[i],b=indices[i+1],c=indices[i+2];
    const orientation=cross(subtract(vertex(b),vertex(a)),subtract(vertex(c),vertex(a)));
    const normal=[0,1,2].map(k=>mesh.n[a*3+k]+mesh.n[b*3+k]+mesh.n[c*3+k]);
    if(dot(orientation,normal)<0){indices[i+1]=c;indices[i+2]=b;}
  }
  return indices;
}

const modelStride=22;
const regionCodes={Jersey:1,Sleeve:2,Leg:3,Boot:4,Hair:5,Shorts:7,Beard:8};
function create(goalie,shared){
  const rig=goalie?keeperRig:fieldRig;
  const instance={goalie,bones:rig,sole:shared?.sole??soleSamples.map(({mesh,index,bind})=>({mesh,index,position:rebindVertex(bind,mesh,index,rig)})),clip:null,time:0,mirror:false,root:[0,100,0],q:rig.map(b=>[...b.q]),world:[],palette:new Float32Array(count*16),meshes:shared?.meshes??[],key:null,blend:1};
  if(shared)return instance;
  const head=goalie?[modelDetails(true,0)]:[classicHead(),...[0,2,3,4,5,6].map(style=>classicHead(style)),
    ...[1,2,3,4,5].map(style=>classicHead(undefined,style))];
  for(const base of [...(goalie?anatomy:fieldAnatomy),kitSurface(goalie),modelDetails(goalie),...head]){
    const model={...base,p:new Float32Array(base.p),n:new Float32Array(base.n),ix:outwardIndices(base)};
    const data=new Float32Array(base.count*modelStride);
    for(let i=0;i<base.count;i++){
      const vertex=i*3,influence=i*4,start=i*modelStride;
      const bind=base.p.subarray(vertex,vertex+3);
      const normal=Array.from(base.n.subarray(vertex,vertex+3));
      const [x,y,z]=bind;
      let dominant=0,best=-1;
      for(let j=0;j<4;j++){
        const weight=base.w[influence+j],bone=base.j[influence+j];
        if(weight>best){best=weight;dominant=bone;}
      }
      const name=rig[dominant].name;
      const region=base.regions?.[i];
      const sculpted=base.colors?bind:reshapeVertex(x,y,z,goalie);
      if(Math.hypot(...subtract(sculpted,bind))>.001){
        const tangent=unit(cross(Math.abs(normal[1])>.8?[1,0,0]:[0,1,0],normal));
        const bitangent=cross(normal,tangent),h=.08;
        const u=reshapeVertex(x+tangent[0]*h,y+tangent[1]*h,z+tangent[2]*h,goalie);
        const v=reshapeVertex(x+bitangent[0]*h,y+bitangent[1]*h,z+bitangent[2]*h,goalie);
        const adjusted=unit(cross(subtract(u,sculpted),subtract(v,sculpted)));
        model.n.set(adjusted,vertex);
      }
      const p=rebindVertex(sculpted,model,i,rig);
      model.p.set(p,vertex);
      data.set(p,start);
      data.set(model.n.subarray(vertex,vertex+3),start+3);
      data.set(base.colors?.[i]??setModelMaterial(region,name,x,y,z,normal,goalie),start+6);
      data.set(model.j.subarray(influence,influence+4),start+9);
      data.set(model.w.subarray(influence,influence+4),start+13);
      data.set(bind,start+17);
      const bareSkin=!base.colors&&!goalie&&/Hand|Neck|Head/.test(name)&&y>132;
      data[start+20]=regionCodes[region]??(bareSkin?6:0);
      data[start+21]=region==='Face'?2:goalie&&!base.colors&&name.includes('Head')?1:0;
    }
    const buffer=gl.createBuffer(),index=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,data,gpu?gl.STATIC_DRAW:gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,model.ix,gl.STATIC_DRAW);
    instance.meshes.push({source:model,data,buffer,index});
  }
  return instance;
}
const keeperArms=['Left','Right'].map((side,index)=>{
  const upper=byName[side+'Arm'],middle=byName[side+'ForeArm'],end=byName[side+'Hand'];
  const ready=pack.clips.keeperIdle;
  return {upper,middle,end,side:index===0?1:-1,
    upperAxis:unit(keeperRig[middle].p),forearm:unit(keeperRig[end].p),hand:unit(keeperRig[byName[side+'HandMiddle1']].p),
    forearmRest:sampleJoint(ready,sampleFrames(ready,0),middle),handRest:sampleJoint(ready,sampleFrames(ready,0),end)};
});
function keeperPreviousPose(state,mirror){
  if(state.mirror===mirror)return state.q.map(q=>[...q]);
  return state.q.map((_,index)=>{
    const q=state.q[mirroredJoints[index]];
    return [q[0],-q[1],-q[2],q[3]];
  });
}
const player=create(false),keeper=create(true),defenders=Array.from({length:8},()=>create(false,player)),support=create(false,player);
const crowdBones=['Hips','Spine2','Head',...['Left','Right'].flatMap(side=>['Arm','ForeArm','Hand','UpLeg','Leg','Foot'].map(part=>side+part))].map(name=>byName[name]);
const crowdJoint=fieldRig.map((_,index)=>{
  while(!crowdBones.includes(index))index=fieldRig[index].parent;
  return crowdBones.indexOf(index);
});

function crowdMesh(cell){
  const clusters=new Map(),vertices=[],indices=[],faces=new Set();
  for(const {source,data} of player.meshes){
    if(source.beardStyle!==undefined||source.hairStyle!==undefined&&source.hairStyle!==0)continue;
    const mapped=new Uint16Array(source.count);
    for(let i=0;i<source.count;i++){
      const at=i*modelStride,x=data[at],y=data[at+1],z=data[at+2],material=data[at+20];
      const region=material===1||material===2?1:material===5?3:material===7?4:material===4?6:material===3?(y<42?5:2):2;
      const step=y>151?cell*.72:cell;
      const key=[region,Math.round(x/step),Math.round(y/step),Math.round(z/step)].join(',');
      let vertex=clusters.get(key);
      if(!vertex){
        vertex={index:vertices.length,region,count:0,values:[0,0,0,0,0,0],joints:new Float32Array(crowdBones.length)};
        clusters.set(key,vertex);
        vertices.push(vertex);
      }
      mapped[i]=vertex.index;
      vertex.count++;
      for(let k=0;k<6;k++)vertex.values[k]+=data[at+k];
      for(let k=0;k<4;k++)vertex.joints[crowdJoint[data[at+9+k]]]+=data[at+13+k];
    }
    for(let i=0;i<source.ix.length;i+=3){
      const a=mapped[source.ix[i]],b=mapped[source.ix[i+1]],c=mapped[source.ix[i+2]];
      if(a===b||b===c||a===c)continue;
      const face=[a,b,c].sort((x,y)=>x-y).join(',');
      if(faces.has(face))continue;
      faces.add(face);
      indices.push(a,b,c);
    }
  }
  const packed=new Float32Array(vertices.length*12);
  for(const {index,region,count:total,values,joints} of vertices){
    const order=crowdBones.map((_,i)=>i).sort((a,b)=>joints[b]-joints[a]);
    const [first,second]=order;
    const weight=joints[first]/(joints[first]+joints[second]||1);
    packed.set([...values.slice(0,3).map(v=>v/total),...unit(values.slice(3,6)),weight,0,0,region,first,second],index*12);
  }
  return {vertices:packed,indices:new Uint16Array(indices)};
}

function crowdPose(key,seconds,weight,out){
  const idle=pack.clips.idle,clip=pack.clips[key]??idle;
  const frame=sampleFrames(clip,seconds),idleFrame=sampleFrames(idle,0);
  const rootY=lerp(clip.values[frame.lo*clip.stride+count*4+1],clip.values[frame.hi*clip.stride+count*4+1],frame.weight);
  const worlds=[];
  for(const [index,bone] of fieldRig.entries()){
    const q=qlerp(sampleJoint(idle,idleFrame,index),sampleJoint(clip,frame,index),weight);
    const local=qmatrix(q,bone.parent<0?[0,lerp(idle.values[count*4+1],rootY,weight),0]:bone.p);
    worlds.push(bone.parent<0?local:mm(worlds[bone.parent],local));
  }
  for(const [index,bone] of crowdBones.entries())out.set(mm(worlds[bone],fieldRig[bone].inverse),index*16);
  let floor=Infinity;
  for(const sample of player.sole){
    const [x,y,z]=sample.position;
    let height=0;
    for(let i=0;i<4;i++){
      const index=sample.index*4+i,amount=sample.mesh.w[index];
      if(!amount)continue;
      const at=crowdJoint[sample.mesh.j[index]]*16;
      height+=(out[at+1]*x+out[at+5]*y+out[at+9]*z+out[at+13])*amount;
    }
    floor=Math.min(floor,height);
  }
  const lift=clip.lift?lerp(clip.lift[frame.lo],clip.lift[frame.hi],frame.weight)*weight:0;
  for(let i=0;i<crowdBones.length;i++)out[i*16+13]+=lift-floor;
}
const independentRigs=new WeakMap();
function useIndependentRig(actor){
  if(!independentRigs.has(actor))independentRigs.set(actor,create(actor.goalie,actor.goalie?keeper:player));
}
function get(h){return independentRigs.get(h)??(h.goalie?keeper:h.defender?defenders[h.defenderIndex??0]:h.support?support:player)}
function smooth5(u){const t=clamp(u,0,1);return t*t*t*(t*(t*6-15)+10)}
function qscale(q,factor){
  let [x,y,z,w]=q;
  if(w<0){x=-x;y=-y;z=-z;w=-w;}
  const sinHalf=Math.hypot(x,y,z);
  if(sinHalf<1e-5)return [0,0,0,1];
  const half=Math.atan2(sinHalf,w)*factor;
  const k=Math.sin(half)/sinHalf;
  return [x*k,y*k,z*k,Math.cos(half)];
}
const spine1Idx=byName.Spine1,spine2Idx=byName.Spine2,neckIdx=byName.Neck,headIdx=byName.Head;
const leftArmIdx=byName.LeftArm,rightArmIdx=byName.RightArm,leftForeIdx=byName.LeftForeArm,rightForeIdx=byName.RightForeArm;
function update(h,options,dt){
const s=get(h),rig=s.bones,clip=pack.clips[options.clip]||pack.clips.idle,loop=options.loop??true,time=options.time??s.time+dt,key=(options.poseName??options.clip)+'|'+!!options.mirror+'|'+!!options.oppositeShot;
const instant=(options.fade??.18)<=.005||dt>=.5;
const extraY=options.extraY||0;
const armPrevious=!instant&&h.goalie&&clip.saveKind&&s.clip&&!options.q?keeperPreviousPose(s,!!options.mirror):null;
const restarted=!loop&&!instant&&s.clip&&time<s.time-.12;
if(s.key!==key||restarted){
  s.key=key;
  const flip=s.mirror!==!!options.mirror;
  const prevPose=armPrevious??keeperPreviousPose(s,!!options.mirror);
  s.from=prevPose;
  s.fromRoot=[...s.root];
  if(flip)s.fromRoot[0]*=-1;
  if(s.extraY!==undefined&&Math.abs(s.extraY-extraY)>1e-4)s.fromRoot[1]+=(s.extraY-extraY)/scale;
  // Capture incoming angular & root velocity for inertialization carry-through
  const invDt=s.lastDt>.001&&!instant?1/s.lastDt:0;
  if(invDt>0&&s.qPrev&&!h.goalie&&!flip){
    s.inertVel=prevPose.map((q,i)=>qscale(qm(q,qi(s.qPrev[i])),clamp(invDt*.042,0,.55)));
    s.inertRootVel=s.rootPrev?s.fromRoot.map((v,a)=>clamp((v-s.rootPrev[a])*invDt*.042,-4.5,4.5)):[0,0,0];
  }else{
    s.inertVel=null;
    s.inertRootVel=null;
  }
  s.armBends=[];
  s.blend=instant?1:0;
  s.blendDuration=Math.max(.08,options.fade??.18);
  s.blendElapsed=0;
}
if(!instant){
  s.blendElapsed=(s.blendElapsed??0)+dt;
  s.blend=Math.min(1,s.blendElapsed/Math.max(.08,s.blendDuration??(options.fade??.18)));
}else{
  s.blend=1;
}
const blendWeight=smooth5(s.blend);
const inertDecay=s.blend<1?(1-s.blend)*(1-s.blend)*(1-s.blend)*Math.min(s.blend*4.5,1):0;
const prevSnapshot=s.q.map(q=>[...q]);
const prevRootSnapshot=[...s.root];
s.clip=options.clip;s.time=time;s.mirror=!!options.mirror;
let t=loop?((time%clip.duration)+clip.duration)%clip.duration:clamp(time,0,clip.duration),f=Math.min(clip.frames-1,t*clip.fps),lo=Math.floor(f),hi=Math.min(clip.frames-1,lo+1),a=f-lo;
const upper=options.upperBody,upperClip=upper&&pack.clips[upper.clip],upperFrame=upperClip&&sampleFrames(upperClip,upper.time);
const actionLayer=options.actionLayer,actionClip=actionLayer&&pack.clips[actionLayer.clip];
const actionFrame=actionClip&&sampleFrames(actionClip,actionLayer.time);
const upperLayers=options.upperBlend?.length?options.upperBlend.map(layer=>{
  const lc=pack.clips[layer.clip];
  return lc&&layer.weight>.002?{clip:lc,frame:sampleFrames(lc,layer.time),weight:layer.weight,opposite:!!layer.opposite}:null;
}).filter(Boolean):null;
const frame={lo,hi,weight:a};
const tackleArmClip=tackleArmClips.has(options.clip)?pack.clips.jog:null;
const tackleArmFrame=tackleArmClip?sampleFrames(tackleArmClip,time):null;
// Smoothly track world lookTarget (ball or goal corner) for organic head/neck motion
let lookYaw=0,lookPitch=0;
if(options.lookTarget&&!options.q&&(!h.goalie||!clip.saveKind)){
  const dx=options.lookTarget[0]-h.x,dy=options.lookTarget[1]-1.55,dz=options.lookTarget[2]-h.z;
  const flat=Math.hypot(dx,dz);
  if(flat>.15){
    const targetYaw=Math.atan2(-dx,-dz);
    const relYaw=Math.atan2(Math.sin(targetYaw-(options.bodyYaw??h.yaw)),Math.cos(targetYaw-(options.bodyYaw??h.yaw)));
    const rawYaw=clamp(relYaw,-.62,.62)*(options.mirror?-1:1);
    const rawPitch=clamp(Math.atan2(-dy,flat),-.24,.28);
    const trackEase=instant?1:1-Math.exp(-dt*11);
    s.lookYaw=lerp(s.lookYaw??0,rawYaw,trackEase);
    s.lookPitch=lerp(s.lookPitch??0,rawPitch,trackEase);
    lookYaw=s.lookYaw;lookPitch=s.lookPitch;
  }
}else{
  const relax=instant?1:1-Math.exp(-dt*8);
  s.lookYaw=lerp(s.lookYaw??0,0,relax);
  s.lookPitch=lerp(s.lookPitch??0,0,relax);
  lookYaw=s.lookYaw;lookPitch=s.lookPitch;
}
for(let i=0;i<count;i++){
  let q=options.q?.[i]||shotJoint(clip,frame,i,options.oppositeShot),offset=options.offsets?.[rig[i].name];
  if(tackleArmFrame&&!options.q&&/^(Left|Right)(Shoulder|Arm|ForeArm|Hand)/.test(rig[i].name)){
    q=shotJoint(tackleArmClip,tackleArmFrame,i,options.oppositeShot);
  }
  if(upperLayers){
    const mask=Number(upperBodyJoints[i]);
    if(mask){
      let blended=null,acc=0;
      for(const layer of upperLayers){
        const lq=shotJoint(layer.clip,layer.frame,i,layer.opposite);
        acc+=layer.weight;
        blended=blended?qlerp(blended,lq,layer.weight/acc):lq;
      }
      if(blended&&acc>0)q=qlerp(q,blended,clamp(acc,0,1)*mask);
    }
  }
  if(upperFrame){const weight=upper.shot?shotUpperWeights[i]:Number(upperBodyJoints[i]);if(weight)q=qlerp(q,shotJoint(upperClip,upperFrame,i,upper.opposite),upper.weight*weight)}
  if(actionFrame&&!options.q){
    const name=rig[i].name,side=actionLayer.foot?.startsWith('Left')?'Left':'Right';
    const mask=name.startsWith(side)&&/UpLeg|Leg|Foot|Toe/.test(name)?(actionLayer.legWeight??1):
      upperBodyJoints[i]?(actionLayer.upperWeight??.45):0;
    if(mask)q=qlerp(q,shotJoint(actionClip,actionFrame,i,false),actionLayer.weight*mask);
  }
  if(offset)q=qm(q,qeuler(offset));
  if(options.inertia&&!options.q){
    const p=options.inertia;
    if(i===0)q=qm(qeuler([p.pitch,0,p.roll]),q);
    else if(i===byName.Spine)q=qm(q,qeuler([-.14*p.pitch,p.twist*.45,-.18*p.roll]));
    else if(i===spine1Idx)q=qm(q,qeuler([-.10*p.pitch,p.twist*.38,-.22*p.roll]));
    else if(i===spine2Idx)q=qm(q,qeuler([.08*p.pitch,p.twist*.24,-.16*p.roll]));
    else if(i===leftArmIdx)q=qm(q,qeuler([p.pitch*.18,0,-p.roll*.34-Math.abs(p.roll)*.12]));
    else if(i===rightArmIdx)q=qm(q,qeuler([p.pitch*.18,0,-p.roll*.34+Math.abs(p.roll)*.12]));
    else if(i===leftForeIdx)q=qm(q,qeuler([Math.abs(p.roll)*.14,0,0]));
    else if(i===rightForeIdx)q=qm(q,qeuler([Math.abs(p.roll)*.14,0,0]));
  }
  if((Math.abs(lookYaw)>.002||Math.abs(lookPitch)>.002)&&!options.q){
    if(i===neckIdx)q=qm(q,qeuler([lookPitch*.35,lookYaw*.35,0]));
    else if(i===headIdx)q=qm(q,qeuler([lookPitch*.65,lookYaw*.65,0]));
  }
  if(!options.q&&!clip.saveKind&&((options.poseName==='locomotion'&&!upperLayers)||options.clip==='keeperIdle')){
    const breath=Math.sin((s.breathClock=(s.breathClock||0)+(i===0?dt:0))*2.2);
    if(i===byName.Spine)q=qm(q,qeuler([breath*.012,0,0]));
    else if(i===spine2Idx)q=qm(q,qeuler([-breath*.010,0,breath*.006]));
  }
  s.q[i]=q;
}
let rootOffset=lo*clip.stride+count*4,rootNext=hi*clip.stride+count*4,rootY=lerp(clip.values[rootOffset+1],clip.values[rootNext+1],a);
s.root=options.root?[...options.root]:options.inertia?[-options.inertia.roll*13.5,rootY-options.inertia.crouch/scale,options.inertia.pitch*8.5]:[0,rootY,0];
let mirror=options.mirror?-1:1;s.extraY=extraY;s.bodyYaw=options.bodyYaw??h.yaw;s.model=transform([h.x,extraY,h.z],[0,s.bodyYaw+Math.PI,0],[scale*mirror,scale,scale]);s.world=[];
function world(i){if(s.world[i])return s.world[i];let bone=rig[i],p=i===0?s.root:bone.p,m=qmatrix(s.q[i],p);return s.world[i]=bone.parent<0?m:mm(world(bone.parent),m)}
function worldQ(i){let parent=rig[i].parent;return parent<0?s.q[i]:qm(worldQ(parent),s.q[i])}
function aimBone(i,from,to){let parent=rig[i].parent,pq=parent<0?[0,0,0,1]:worldQ(parent),delta=qturn(from,to);s.q[i]=qm(qm(qm(qi(pq),delta),pq),s.q[i]);s.world=[]}
function toModel(target){
  const delta=[target[0]-h.x,target[1]-extraY,target[2]-h.z];
  return [0,4,8].map(i=>(s.model[i]*delta[0]+s.model[i+1]*delta[1]+s.model[i+2]*delta[2])/(scale*scale));
}
if(options.pelvis){
  const pose=options.pelvis;
  s.root=[pose.lateral/scale,pose.height/scale,pose.forward/scale];
  s.q[0]=qm(qeuler(pose.rotation),s.q[0]);
}
const soleFlex=[0,0];
const clipEdited=editedClipKeys.has(options.clip);
const ankleGoals=(clipEdited?[]:(options.ankleTargets??[])).map(target=>{
  const actionWeight=actionFrame&&target.foot===actionLayer.foot?
    clamp(actionLayer.weight*(actionLayer.legWeight??1),0,1):0;
  target={...target,weight:(target.weight??1)*(1-actionWeight)};
  const side=target.foot.startsWith('Left')?'Left':'Right';
  const hip=byName[side+'UpLeg'],knee=byName[side+'Leg'],foot=byName[side+'Foot'];
  const aim=toModel(target.point);
  const yaw=target.yaw-s.bodyYaw;
   const heading=qeuler([0,yaw,0]),pitch=qeuler([target.pitch,0,target.bank??0]);
  const index=side==='Left'?0:1;
  const rocker=footRolls[index];
  const roll=(target.roll??0)*target.weight;
  const rest=qlerp(neutralWorld[foot],bindWorld[foot],roll);
  const orientation=qm(heading,qm(pitch,rest));
  if(roll>0&&target.sole){
    const anchor=target.pitch>=0?rocker.forefoot:rocker.heel;
    const flat=rotateVector(qm(heading,bindWorld[foot]),anchor);
    const inclined=rotateVector(qm(heading,qm(pitch,bindWorld[foot])),anchor);
    const sole=toModel(target.sole);
    for(const axis of [0,1,2])aim[axis]=lerp(aim[axis],sole[axis]+(axis===1?0:flat[axis])-inclined[axis],roll);
  }
  return {target,side,hip,knee,foot,aim,yaw,index,rocker,roll,orientation};
});
if(options.pelvis&&ankleGoals.length){
  const maxLift=.112/scale;
  let desired=0,limit=maxLift;
  for(const {target,hip,knee,foot,aim} of ankleGoals){
    const origin=point(world(hip),[0,0,0]);
    const thigh=Math.hypot(...rig[knee].p),shin=Math.hypot(...rig[foot].p);
    const horizontal=(aim[0]-origin[0])**2+(aim[2]-origin[2])**2;
    const drop=origin[1]-aim[1];
    const distance2=thigh**2+shin**2+2*thigh*shin*Math.cos(target.kneeBend);
    const lift=Math.sqrt(Math.max(0,distance2-horizontal))-drop;
    desired=Math.max(desired,lift*target.legExtension*target.weight);
    const reachable=Math.sqrt(Math.max(0,(thigh+shin-.75)**2-horizontal))-drop;
    limit=Math.min(limit,lerp(maxLift,Math.max(0,reachable),target.groundWeight*target.weight));
  }
  s.legRaise=lerp(s.legRaise??0,clamp(desired,0,limit),1-Math.exp(-dt*22));
  s.root[1]+=s.legRaise;
  s.world=[];
}else s.legRaise=0;
for(const {target,side,hip,knee,foot,aim,yaw,index,rocker,roll,orientation} of ankleGoals){
  const original=target.weight<1?[hip,knee,foot].map(bone=>[...s.q[bone]]):null;
  const H=point(world(hip),[0,0,0]),K=point(world(knee),[0,0,0]),A=point(world(foot),[0,0,0]);
  const delta=subtract(aim,H),axis=unit(delta);
  const l1=Math.hypot(...subtract(K,H)),l2=Math.hypot(...subtract(A,K));
  let reach=l1+l2-.75;
  if(target.runningSwing){
    const {low,high,blend,phase,weight}=target.runningSwing;
    const first=runningKneeCosine(low,phase);
    const flex=blend>0?lerp(first,runningKneeCosine(high,phase),blend):first;
    const referenceReach=Math.sqrt(l1*l1+l2*l2+2*l1*l2*flex);
    reach=lerp(reach,Math.min(reach,referenceReach),weight);
  }
  const d=clamp(Math.hypot(...delta),Math.abs(l1-l2)+.1,reach);
  const kneeYaw=clamp(Math.atan2(Math.sin(yaw),Math.cos(yaw)),-.58,.58);
  const guide=[Math.sin(kneeYaw)*.65+(side==='Left'?.12:-.12),0,Math.cos(kneeYaw)];
  let bend=unit(guide.map((value,i)=>value-axis[i]*dot(guide,axis)));
  const prevPole=s.kneePoles?.[index];
  if(prevPole&&!instant){
    const projected=prevPole.map((v,i)=>v-axis[i]*dot(prevPole,axis));
    if(Math.hypot(...projected)>.15&&dot(projected,bend)>0){
      const poleEase=1-Math.exp(-dt*24);
      bend=unit(unit(projected).map((v,i)=>lerp(v,bend[i],poleEase)));
    }
  }
  (s.kneePoles??=[])[index]=bend;
  const along=(l1*l1-l2*l2+d*d)/(2*d);
  const height=Math.sqrt(Math.max(0,l1*l1-along*along));
  const desiredKnee=H.map((value,index)=>value+axis[index]*along+bend[index]*height);
  const desiredAnkle=H.map((value,index)=>value+axis[index]*d);
  aimBone(hip,subtract(K,H),subtract(desiredKnee,H));
  const actualKnee=point(world(knee),[0,0,0]),actualAnkle=point(world(foot),[0,0,0]);
  aimBone(knee,subtract(actualAnkle,actualKnee),subtract(desiredAnkle,actualKnee));
  s.q[foot]=qm(qi(worldQ(knee)),orientation);
  if(roll>0){
    const toe=rocker.toe;
    const flex=(target.toeFlex??0)*roll;
    const rotation=[...rocker.flexAxis.map(value=>value*Math.sin(-flex*.5)),Math.cos(flex*.5)];
    s.q[toe]=qm(qlerp(s.q[toe],rig[toe].q,roll),rotation);
    soleFlex[index]=roll;
  }
  if(original)for(const [i,bone] of [hip,knee,foot].entries())s.q[bone]=qlerp(original[i],s.q[bone],target.weight);
  s.world=[];
}
const contactFeet=[],contactHands=[],contactCorrections=new Map();
for(const contact of options.ballContacts??[]){
  if(options.q||!(contact.weight>0))continue;
  const hand=contact.limb.endsWith('Hand');
  const bone=byName[contact.limb];
  if(bone===undefined)continue;
  const marker=hand?[0,-7,0]:bootMarkers[contact.limb.startsWith('Left')?0:1];
  const current=point(s.model,point(world(bone),marker));
  const normal=unit(contact.normal??subtract(current,contact.point));
  const destination=contact.point.map((value,i)=>value+normal[i]*(hand?.065:.09));
  const offset=subtract(destination,current),gap=Math.hypot(...offset);
  const limit=contact.maxCorrection??(hand?.38:.40);
  const reachable=1-smooth5(clamp((gap-limit)/.65,0,1));
  const correction=offset.map(value=>value*Math.min(1,limit/Math.max(.001,gap)));
  const key=contact.category+'|'+contact.limb;
  const previous=s.contactCorrections?.get(key)??[0,0,0];
  const ease=1-Math.exp(-Math.max(0,dt)*38);
  const filtered=correction.map((value,i)=>lerp(previous[i],value,ease));
  contactCorrections.set(key,filtered);
  const target=current.map((value,i)=>value+filtered[i]);
  const weight=clamp(contact.weight,0,1)*reachable;
  if(hand)contactHands.push({hand:contact.limb,point:target,weight});
  else contactFeet.push({foot:contact.limb,point:target,weight,boot:true});
}
s.contactCorrections=contactCorrections;
const adaptiveFeet=new Set(contactFeet.map(target=>target.foot));
const footPlants=[...(options.footPlants||[]),...(options.footPlant?[options.footPlant]:[])].filter(target=>!adaptiveFeet.has(target.foot));
for(let plant of [...footPlants,...contactFeet]){let side=plant.foot.startsWith('Left')?'Left':'Right',hip=byName[side+'UpLeg'],knee=byName[side+'Leg'],foot=byName[side+'Foot'],H=point(world(hip),[0,0,0]),K=point(world(knee),[0,0,0]),A=point(world(foot),[0,0,0]),toe=point(world(foot),plant.boot?bootMarkers[side==='Left'?0:1]:[0,0,9]),localTarget=[];let delta=[plant.point[0]-h.x,plant.point[1]-extraY,plant.point[2]-h.z];for(let a=0;a<3;a++)localTarget[a]=(s.model[a*4]*delta[0]+s.model[a*4+1]*delta[1]+s.model[a*4+2]*delta[2])/(scale*scale);let weight=clamp(plant.weight??1,0,1),target=A.map((v,i)=>v+(localTarget[i]-toe[i])*weight),distance=Math.hypot(...subtract(target,H)),l1=Math.hypot(...subtract(K,H)),l2=Math.hypot(...subtract(A,K)),d=clamp(distance,Math.abs(l1-l2)+.01,l1+l2-(plant.track ? .4 : .01)),axis=unit(subtract(target,H)),bend=subtract(K,H),projection=dot(bend,axis);bend=unit(bend.map((v,i)=>v-axis[i]*projection));
if(plant.track){
  const old=plant.track.knee;
  const base=[0,0,1];
  const forward=unit(base.map((v,i)=>v-axis[i]*axis[2]));
  const guide=old?unit(old.map((v,i)=>v-axis[i]*dot(old,axis))):forward;
  if(Math.hypot(...guide)>.05){
    if(dot(guide,bend)<0)bend=guide;
    else bend=unit(bend.map((v,i)=>lerp(guide[i],v,.22)));
  }
  plant.track.knee=bend;
}
let along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along)),newK=H.map((v,i)=>v+axis[i]*along+bend[i]*height),newA=H.map((v,i)=>v+axis[i]*d),footOrientation=worldQ(foot);aimBone(hip,subtract(K,H),subtract(newK,H));let actualK=point(world(knee),[0,0,0]),actualA=point(world(foot),[0,0,0]);aimBone(knee,subtract(actualA,actualK),subtract(newA,actualK));s.q[foot]=qm(qi(worldQ(rig[foot].parent)),footOrientation);s.world=[]}
if(!instant&&h.goalie&&clip.saveKind&&!options.q){
  for(const arm of keeperArms){
    s.q[arm.middle]=limitJoint(s.q[arm.middle],arm.forearmRest,arm.forearm,2.38,.64);
    s.q[arm.end]=limitJoint(s.q[arm.end],arm.handRest,arm.hand,.80,.45);
  }
  s.world=[];
}
const trackedArms=h.goalie?[]:null;
const lobCarry=options.lobCarry??0;
let carryFrame;
if(lobCarry>0){
  const shoulders=keeperArms.map(arm=>point(world(arm.upper),[0,0,0]));
  const middle=shoulders[0].map((value,i)=>(value+shoulders[1][i])*.5);
  const side=unit(subtract(shoulders[0],shoulders[1]));
  const torsoUp=unit(subtract(middle,point(world(byName.Spine),[0,0,0])));
  const forward=unit(cross(side,torsoUp));
  carryFrame={side,center:middle.map((value,i)=>value+forward[i]*.34/scale-torsoUp[i]*.15/scale)};
}
const adaptiveHands=new Set(contactHands.map(target=>target.hand));
for(const target of contactHands){
  const planned=(options.handTargets??[]).find(existing=>existing.hand===target.hand&&!existing.lob);
  if(planned){
    target.point=planned.point.map((value,i)=>lerp(value,target.point[i],.25));
    target.weight=Math.max(target.weight,planned.weight??1);
  }
}
const handTargets=(options.handTargets??[]).filter(target=>!adaptiveHands.has(target.hand)||target.lob);
for(const target of [...contactHands.filter(target=>!handTargets.some(existing=>existing.hand===target.hand&&existing.lob)),...handTargets]){
  const side=target.hand.startsWith('Left')?'Left':'Right';
  const upper=byName[side+'Arm'],middle=byName[side+'ForeArm'],end=byName[side+'Hand'];
  const armIndex=side==='Left'?0:1;
  const arm=h.goalie?keeperArms[armIndex]:null;
  const shoulder=point(world(upper),[0,0,0]),elbow=point(world(middle),[0,0,0]),wrist=point(world(end),[0,0,0]);
  const palm=point(world(end),[0,-7,0]);
  let local=toModel(target.point),weight=clamp(target.weight??1,0,1);
  const lobAnchor=target.lob?(target.paired?lobCarry:1):0;
  if(target.lob&&carryFrame){
    const grip=carryFrame.center.map((value,i)=>value+carryFrame.side[i]*arm.side*.119/scale);
    local=local.map((value,i)=>lerp(value,grip[i],lobCarry));
    weight=lerp(weight,.96,lobCarry);
  }
  if(weight<.003)continue;
  let adjustment=subtract(local,palm);
  if(target.lob){
    const maxNudge=lerp(target.paired?1.06:.42,.78,lobCarry)/scale;
    const length=Math.hypot(...adjustment);
    adjustment=adjustment.map(value=>value*Math.min(1,maxNudge/Math.max(.001,length)));
  }
  const destination=wrist.map((value,i)=>value+adjustment[i]*weight);
  const reach=subtract(destination,shoulder),axis=unit(reach);
  const upperLength=Math.hypot(...subtract(elbow,shoulder)),forearmLength=Math.hypot(...subtract(wrist,elbow));
  const minReach=arm?Math.sqrt(upperLength**2+forearmLength**2+2*upperLength*forearmLength*Math.cos(2.36)):Math.abs(upperLength-forearmLength)+.1;
  const distance=clamp(Math.hypot(...reach),minReach,upperLength+forearmLength-(arm?.65:.1));
  const clipBend=subtract(elbow,shoulder);
  const preferred=target.pole?unit(toModel([h.x+target.pole[0],extraY+target.pole[1],h.z+target.pole[2]])):null;
  const bendSource=preferred?unit(clipBend).map((value,i)=>lerp(value,preferred[i],weight*.89)):clipBend;
  const project=vector=>vector.map((value,i)=>value-axis[i]*dot(vector,axis));
  let bend=project(unit(bendSource));
  if(arm){
    const torso=worldQ(byName.Spine2);
    let outward=project(rotateVector(torso,[arm.side,-.90,-.35]));
    if(Math.hypot(...outward)<.22)outward=project(rotateVector(torso,[arm.side,.20,-.85]));
    outward=unit(outward);
    const length=Math.hypot(...bend);
    const influence=clamp((length-.06)/.32,0,lerp(.65,.92,lobAnchor))*clamp(dot(unit(bend),outward)+lerp(.45,.65,lobAnchor),0,1);
    bend=unit(outward.map((value,i)=>lerp(value,unit(bend)[i],influence)));
    const previous=s.armBends?.[armIndex];
    if(previous){
      const prior=project(previous);
      if(Math.hypot(...prior)>.20&&dot(prior,bend)>0){
        const settle=1-Math.exp(-dt*21);
        bend=unit(bend.map((value,i)=>lerp(unit(prior)[i],value,settle)));
      }
    }
    (s.armBends??=[])[armIndex]=bend;
    trackedArms[armIndex]=true;
  }else bend=Math.hypot(...bend)<.001?unit(cross(axis,[0,1,.3])):unit(bend);
  const along=(upperLength**2-forearmLength**2+distance**2)/(2*distance);
  const height=Math.sqrt(Math.max(0,upperLength**2-along**2));
  const newElbow=shoulder.map((value,i)=>value+axis[i]*along+bend[i]*height);
  const newWrist=shoulder.map((value,i)=>value+axis[i]*distance);
  const orientation=worldQ(end),wristPose=s.q[end];
  const upperPose=s.q[upper],lowerPose=s.q[middle];
  aimBone(upper,clipBend,subtract(newElbow,shoulder));
  if(lobAnchor>0){
    const limited=limitJoint(s.q[upper],upperPose,arm.upperAxis,lerp(.64,1.35,lobCarry),.16);
    s.q[upper]=qlerp(s.q[upper],limited,lobAnchor);
    s.world=[];
  }
  const actualElbow=point(world(middle),[0,0,0]),actualWrist=point(world(end),[0,0,0]);
  aimBone(middle,subtract(actualWrist,actualElbow),subtract(newWrist,actualElbow));
  const handPose=qm(qi(worldQ(rig[end].parent)),orientation);
  s.q[end]=target.followForearm?wristPose:
    arm?limitJoint(handPose,wristPose,arm.hand,lerp(.42,.32,lobAnchor),lerp(.22,.12,lobAnchor)):handPose;
  if(lobAnchor>0){
    const limited=limitJoint(s.q[middle],lowerPose,arm.forearm,lerp(.77,1.60,lobCarry),.14);
    s.q[middle]=qlerp(s.q[middle],limited,lobAnchor);
    if(lobCarry>0)s.q[end]=qlerp(s.q[end],arm.handRest,lobCarry*.70);
  }
  s.world=[];
}
if(trackedArms&&s.armBends)for(let i=0;i<2;i++)if(!trackedArms[i])s.armBends[i]=null;
function solveSoleShift(){
  let lowest=Infinity;
  for(let sample of s.sole){
    let m=sample.mesh,i=sample.index,[x,baseY,z]=sample.position,y=0;
    for(let j=0;j<4;j++){let weight=m.w[i*4+j];if(!weight)continue;let at=m.j[i*4+j]*16,b=s.palette;y+=(b[at+1]*x+b[at+5]*baseY+b[at+9]*z+b[at+13])*weight}
    lowest=Math.min(lowest,y);
  }
  return (.025-extraY)/scale-lowest;
}
for(let i=0;i<count;i++){let mat=mm(world(i),rig[i].inverse);s.palette.set(mat,i*16)}
if(!options.root&&!options.pelvis&&!options.authoredGround&&!options.airborne&&s.sole.length){
  let shift=solveSoleShift();
  if(options.inertia){
    const old=s.floorShift??shift;
    shift=Math.max(shift-1.6,lerp(old,shift,1-Math.exp(-dt*16)));
    s.floorShift=shift;
  }else s.floorShift=null;
  if(options.grounded||shift>0){s.root[1]+=shift;s.world=[];}
}
if(blendWeight<1){
  for(let i=0;i<count;i++){
    let fromQ=s.from[i];
    if(inertDecay>.001&&s.inertVel)fromQ=qm(qscale(s.inertVel[i],inertDecay),fromQ);
    s.q[i]=qlerp(fromQ,s.q[i],blendWeight);
  }
  s.root=s.root.map((v,idx)=>{
    const fromVal=s.fromRoot[idx]+(inertDecay>.001&&s.inertRootVel?s.inertRootVel[idx]*inertDecay:0);
    return lerp(fromVal,v,blendWeight);
  });
  s.world=[];
}
if(armPrevious){
  for(const arm of keeperArms){
    s.q[arm.upper]=limitJoint(s.q[arm.upper],armPrevious[arm.upper],arm.upperAxis,dt*44,dt*19);
    s.q[arm.middle]=limitJoint(s.q[arm.middle],armPrevious[arm.middle],arm.forearm,dt*40,dt*18);
    s.q[arm.end]=limitJoint(s.q[arm.end],armPrevious[arm.end],arm.hand,dt*27,dt*16);
  }
  s.world=[];
}
for(let i=0;i<count;i++){let mat=mm(world(i),rig[i].inverse);s.palette.set(mat,i*16)}
if(blendWeight<1&&!options.authoredGround&&!options.airborne&&s.sole.length){
  const guardShift=solveSoleShift();
  if(guardShift>0){s.root[1]+=guardShift;s.world=[];for(let i=0;i<count;i++)s.palette.set(mm(world(i),rig[i].inverse),i*16)}
}
s.qPrev=prevSnapshot;s.rootPrev=prevRootSnapshot;s.lastDt=dt;
let boneWorld=n=>mm(s.model,world(byName[n]));s.hands=[point(boneWorld('LeftHand'),[0,-7,0]),point(boneWorld('RightHand'),[0,-7,0])];s.chest=point(boneWorld('Spine2'),[0,0,0]);s.head=point(boneWorld('Head'),[0,8,0]);s.feet=[point(boneWorld('LeftFoot'),[0,0,9]),point(boneWorld('RightFoot'),[0,0,9])];s.knees=[point(boneWorld('LeftLeg'),[0,0,0]),point(boneWorld('RightLeg'),[0,0,0])];

const hbScale=1;
const hbOff=null;
s.hitboxes=buildSkeletonBoxes(boneWorld,h.goalie,hbScale,hbOff);
if(!h.goalie){
  const matrices=footNames.map(boneWorld);
  s.ankles=matrices.map(matrix=>point(matrix,[0,0,0]));
  s.boots=matrices.map((matrix,index)=>point(matrix,bootMarkers[index]));
  s.bootVolumes=matrices.map((matrix,index)=>{
    const forefoot=soleFlex[index]>0?boneWorld(footNames[index].replace('Foot','ToeBase')):null;
    return bootShapes[index].map(({local,toeLocal,flex,radius})=>{
      const center=point(matrix,local);
      if(forefoot&&flex>0){
        const tip=point(forefoot,toeLocal);
        for(let axis=0;axis<3;axis++)center[axis]=lerp(center[axis],tip[axis],flex*soleFlex[index]);
      }
      if(hbOff){center[0]+=hbOff[0];center[1]+=hbOff[1];center[2]+=hbOff[2];}
      return {center,radius:radius*hbScale};
    });
  });
}
if(h.goalie){
  s.ankles=footNames.map(name=>point(boneWorld(name),[0,0,0]));
  const rawContacts=[...s.hands,...s.feet,...s.knees,s.chest,s.head];
  s.contacts=hbOff?rawContacts.map(pt=>[pt[0]+hbOff[0],pt[1]+hbOff[1],pt[2]+hbOff[2]]):rawContacts;
  s.contactRadiusScale=hbScale;
}h.contactZ=Math.max(s.hands[0][2],s.hands[1][2],h.z+.15);h.skinLabel=clip.source;h.b.lh.world=boneWorld('LeftHand');h.b.rh.world=boneWorld('RightHand');h.b.spine.world=boneWorld('Spine2');return s}
function makeSegmentBox(id,part,pA,pB,hx,hy,padZ,hbScale,hbOff,extra={}){
  const diff=subtract(pB,pA);
  const len=Math.hypot(...diff);
  const w=len>1e-4?diff.map(v=>v/len):[0,1,0];
  const ref=Math.abs(w[1])<.88?[0,1,0]:[1,0,0];
  const u=unit(cross(ref,w));
  const v=unit(cross(w,u));
  const center=[(pA[0]+pB[0])*.5,(pA[1]+pB[1])*.5,(pA[2]+pB[2])*.5];
  if(hbOff){center[0]+=hbOff[0];center[1]+=hbOff[1];center[2]+=hbOff[2];}
  return {id,part,center,axes:[u,v,w],half:[hx*hbScale,hy*hbScale,(len*.5+padZ)*hbScale],...extra};
}
function sphereHitsBox(center,radius,box){
  const dx=center[0]-box.center[0],dy=center[1]-box.center[1],dz=center[2]-box.center[2];
  let cx=box.center[0],cy=box.center[1],cz=box.center[2];
  for(let i=0;i<3;i++){
    const a=box.axes[i];
    const proj=clamp(dx*a[0]+dy*a[1]+dz*a[2],-box.half[i],box.half[i]);
    cx+=a[0]*proj;cy+=a[1]*proj;cz+=a[2]*proj;
  }
  const rx=center[0]-cx,ry=center[1]-cy,rz=center[2]-cz;
  const dist=Math.hypot(rx,ry,rz);
  if(dist>radius)return null;
  const normal=dist>1e-5?[rx/dist,ry/dist,rz/dist]:[0,1,0];
  return {dist,closest:[cx,cy,cz],normal,box};
}
function buildSkeletonBoxes(boneWorld,goalie,hbScale,hbOff){
  const pt=(name,off=[0,0,0])=>point(boneWorld(name),off);
  const hips=pt('Hips'),spine2=pt('Spine2'),neck=pt('Neck'),headTop=pt('Head',[0,14,0]);
  const lUp=pt('LeftUpLeg'),lKnee=pt('LeftLeg'),lAnkle=pt('LeftFoot'),lToe=pt('LeftToeBase',[0,0,6]);
  const rUp=pt('RightUpLeg'),rKnee=pt('RightLeg'),rAnkle=pt('RightFoot'),rToe=pt('RightToeBase',[0,0,6]);
  const lArm=pt('LeftArm'),lFore=pt('LeftForeArm'),lHand=pt('LeftHand'),lPalm=pt('LeftHand',[0,-12,0]);
  const rArm=pt('RightArm'),rFore=pt('RightForeArm'),rHand=pt('RightHand'),rPalm=pt('RightHand',[0,-12,0]);
  const gBoost=goalie?1.35:1;
  return [
    makeSegmentBox('LeftFoot','boot',lAnkle,lToe,.062,.052,.045,hbScale,hbOff,{footIndex:0,keeperIndex:2}),
    makeSegmentBox('RightFoot','boot',rAnkle,rToe,.062,.052,.045,hbScale,hbOff,{footIndex:1,keeperIndex:3}),
    makeSegmentBox('LeftShin','leg',lKnee,lAnkle,.075,.075,.02,hbScale,hbOff,{footIndex:0,keeperIndex:4}),
    makeSegmentBox('RightShin','leg',rKnee,rAnkle,.075,.075,.02,hbScale,hbOff,{footIndex:1,keeperIndex:5}),
    makeSegmentBox('LeftThigh','leg',lUp,lKnee,.095,.095,.02,hbScale,hbOff,{keeperIndex:4}),
    makeSegmentBox('RightThigh','leg',rUp,rKnee,.095,.095,.02,hbScale,hbOff,{keeperIndex:5}),
    makeSegmentBox('Torso','torso',hips,spine2,.19,.13,.06,hbScale,hbOff,{keeperIndex:6}),
    makeSegmentBox('Head','head',neck,headTop,.10,.11,.02,hbScale,hbOff,{keeperIndex:7}),
    makeSegmentBox('LeftUpperArm','arm',lArm,lFore,.065*gBoost,.065*gBoost,.02,hbScale,hbOff,{keeperIndex:0}),
    makeSegmentBox('RightUpperArm','arm',rArm,rFore,.065*gBoost,.065*gBoost,.02,hbScale,hbOff,{keeperIndex:1}),
    makeSegmentBox('LeftForeArm','arm',lFore,lHand,.06*gBoost,.06*gBoost,.02,hbScale,hbOff,{keeperIndex:0}),
    makeSegmentBox('RightForeArm','arm',rFore,rHand,.06*gBoost,.06*gBoost,.02,hbScale,hbOff,{keeperIndex:1}),
    makeSegmentBox('LeftHand','hand',lHand,lPalm,.085*gBoost,.065*gBoost,.04*gBoost,hbScale,hbOff,{keeperIndex:0}),
    makeSegmentBox('RightHand','hand',rHand,rPalm,.085*gBoost,.065*gBoost,.04*gBoost,hbScale,hbOff,{keeperIndex:1})
  ];
}
const materialRegions={uSkin:'skin',uHair:'hairColor',uBeard:'beardColor',uBoot:'boots',uPrimary:'primary',uSecondary:'secondary'};
const paints=new Map();
const kitPatterns={solid:0,stripes:1,hoops:2,sash:3,split:4,quarters:5,cross:6};
const clubBadges=new Map();
function badgeTexture(clubId){
  const key=clubId??'';
  if(clubBadges.has(key))return clubBadges.get(key);
  const binding=gl.getParameter(gl.TEXTURE_BINDING_2D);
  const entry={texture:gl.createTexture(),ready:false};
  clubBadges.set(key,entry);
  gl.bindTexture(gl.TEXTURE_2D,entry.texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array(4));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D,binding);
  const club=window.goatCareerSeason?.team(clubId);
  if(!club||!window.goatClubBadge)return entry;
  const svg=window.goatClubBadge.render(club,128).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');
  const image=new Image();
  image.onload=()=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d');
    ctx.drawImage(image,0,0,128,128);
    const crest=window.goatClubBadge.clubCrest(club);
    if(crest.symbol==='monogram'){
      ctx.save();ctx.scale(2,2);ctx.fillStyle=crest.primary;ctx.fillRect(12,23,40,20);
      ctx.font=`900 ${crest.initials.length>2?10:crest.initials.length>1?15:23}px "Press Start 2P",monospace`;
      ctx.textAlign='center';
      const rgb=pigment(crest.primary),light=rgb[0]*.299+rgb[1]*.587+rgb[2]*.114;
      ctx.fillStyle=light>.58?'#14181c':'#fff2ca';ctx.fillText(crest.initials,32,38);ctx.restore();
    }
    const previous=gl.getParameter(gl.TEXTURE_BINDING_2D),flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
    gl.bindTexture(gl.TEXTURE_2D,entry.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);gl.bindTexture(gl.TEXTURE_2D,previous);entry.ready=true;
  };
  const load=()=>{image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);};
  if(document.fonts)document.fonts.ready.then(load);else load();
  return entry;
}
function pigment(hex){
  if(!hex)return [0,0,0];
  if(!paints.has(hex))paints.set(hex,[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255));
  return paints.get(hex);
}
function draw(h,vp,eye){
  const s=get(h);
  if(!s.model)return;
  gl.useProgram(program);
  gl.uniformMatrix4fv(loc.uM,false,s.model);
  gl.uniformMatrix4fv(loc.uVP,false,vp);
  gl.uniform3fv(loc.uEye,eye);
  gl.uniform1f(loc.uKeeper,s.goalie?1:0);
  gl.uniform1f(loc.uShirtNumber,h.shirtNumber??(h.goalie?1:10));
  const look=h.appearance;
  const badge=badgeTexture(look?.clubId);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,badge.texture);
  gl.uniform1i(loc.uClubBadge,0);gl.uniform1f(loc.uHasBadge,badge.ready?1:0);
  gl.uniform1f(loc.uKitPattern,kitPatterns[look?.pattern]??0);
  gl.uniform1f(loc.uHasTertiary,look?.tertiary?1:0);
  gl.uniform3fv(loc.uTertiary,pigment(look?.tertiary));
  gl.uniform1f(loc.uCustom,look?.skin?1:0);
  gl.uniform1f(loc.uTeam,look?.primary?1:0);
  gl.uniform4f(loc.uLook,look?.hair??0,look?.beard??0,look?.socks??0,look?.shirt??0);
  gl.uniform2f(loc.uKitFit,look?.shorts??0,look?.sleeves??0);
  gl.uniform1f(loc.uMirrorSign,s.mirror?-1:1);
  for(const [uniform,key] of Object.entries(materialRegions))gl.uniform3fv(loc[uniform],pigment(look?.[key]));
  const meshes=s.meshes.filter(({source})=>(source.hairStyle===undefined||source.hairStyle===(look?.hair??0))
    &&(source.beardStyle===undefined||source.beardStyle===(look?.beard??0)));
  if(gpu)gl.uniformMatrix4fv(loc['uB[0]'],false,s.palette);
  else for(const m of meshes){
    const src=m.source,out=m.data;
    for(let i=0;i<src.count;i++){
      const p=[0,0,0],n=[0,0,0];
      const px=src.p[i*3],py=src.p[i*3+1],pz=src.p[i*3+2];
      const nx=src.n[i*3],ny=src.n[i*3+1],nz=src.n[i*3+2];
      for(let j=0;j<4;j++){
        const w=src.w[i*4+j];
        if(!w)continue;
        const at=src.j[i*4+j]*16,b=s.palette;
        for(let a=0;a<3;a++){
          p[a]+=(b[at+a]*px+b[at+4+a]*py+b[at+8+a]*pz+b[at+12+a])*w;
          n[a]+=(b[at+a]*nx+b[at+4+a]*ny+b[at+8+a]*nz)*w;
        }
      }
      out.set(p,i*modelStride);
      out.set(n,i*modelStride+3);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER,0,m.data);
  }
  const attributes=[['aP',3,0],['aN',3,12],['aC',3,24],['aJ',4,36],['aW',4,52],['aBind',3,68],['aDetail',2,80]];
  const distance=Math.hypot(eye[0]-h.x,eye[1]-1,eye[2]-h.z);
  const outline=clamp(.011+distance*.00063,.012,.025);
  gl.frontFace(s.mirror?gl.CW:gl.CCW);
  for(const ink of [outline,0]){
    gl.uniform1f(loc.uInk,ink);
    if(ink){
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.FRONT);
    }else gl.disable(gl.CULL_FACE);
    for(const m of meshes){
      gl.bindBuffer(gl.ARRAY_BUFFER,m.buffer);
      for(const [name,size,offset] of attributes){
        if(loc[name]<0)continue;
        gl.enableVertexAttribArray(loc[name]);
        gl.vertexAttribPointer(loc[name],size,gl.FLOAT,false,modelStride*Float32Array.BYTES_PER_ELEMENT,offset);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,m.index);
      gl.drawElements(gl.TRIANGLES,m.source.ix.length,gl.UNSIGNED_SHORT,0);
    }
  }
  gl.frontFace(gl.CCW);
}
const editStorageKey='goat-anim-edits-v1';
const originalClipData=new Map();
const editedClipKeys=new Set();
const draftSnapshots=new Map();
function encodeFloat32(arr){
  const bytes=new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength);
  let out='';
  for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(out);
}
function isKeeperClipName(name,clip){
  if(clip?.customCat)return clip.customCat==='keeper';
  return Boolean(clip?.saveKind||/^(keeper|sidestep|catch|dive|scoop|block|oneHand|footSave|reflexSave|punchSave|gk|save|spreadSave|fallen|getup|miss)/.test(name));
}
function ensureOriginal(key){
  const clip=pack.clips[key];
  if(!clip)return null;
  if(!originalClipData.has(key))originalClipData.set(key,clip.values.slice());
  return originalClipData.get(key);
}
function rebuildClip(key){
  const clip=pack.clips[key];
  if(!clip)return;
  rebuildLandmarks(clip,isKeeperClipName(key,clip)?keeperRig:fieldRig);
}
function beginClipDraft(key){
  const clip=pack.clips[key];
  if(!clip||draftSnapshots.has(key))return;
  draftSnapshots.set(key,{
    values:clip.values.slice(),
    hitboxOverride:clip.hitboxOverride?{...clip.hitboxOverride}:null,
    wasEdited:editedClipKeys.has(key)
  });
}
function markClipEdited(key){
  if(!pack.clips[key])return;
  beginClipDraft(key);
  editedClipKeys.add(key);
  pack.clips[key].userEdited=true;
}
function registerBakedClip(key,frames,fps,values,meta={}){
  const stride=count*4+3;
  const freshValues=values instanceof Float32Array?values:new Float32Array(values);
  const targetVer=meta.bakeVersion||1;
  originalClipData.set(key,freshValues.slice());
  const existing=pack.clips[key];
  if(existing){
    if(existing.userEdited&&(existing.bakeVersion||0)>=targetVer&&existing.values.length===freshValues.length){
      return existing;
    }
    existing.duration=(frames-1)/fps;
    existing.frames=frames;
    existing.fps=fps;
    existing.stride=stride;
    existing.values=freshValues;
    existing.bakedProcedural=true;
    existing.bakeVersion=targetVer;
    existing.customCat=meta.customCat||existing.customCat||'dribble';
    existing.contact=meta.contact??((frames-1)/fps)*.45;
    existing.userEdited=false;
    editedClipKeys.delete(key);
    rebuildClip(key);
    saveEditedClips();
    return existing;
  }
  const clip={
    source:meta.source||key,
    duration:(frames-1)/fps,
    frames,fps,stride,
    values:freshValues,
    bakedProcedural:true,
    bakeVersion:targetVer,
    customCat:meta.customCat||'dribble',
    contact:meta.contact??((frames-1)/fps)*.45
  };
  pack.clips[key]=clip;
  rebuildClip(key);
  return clip;
}
function commitClipDrafts(){
  for(const key of draftSnapshots.keys())rebuildClip(key);
  draftSnapshots.clear();
  return saveEditedClips();
}
function discardClipDrafts(){
  if(!draftSnapshots.size)return false;
  for(const [key,snap] of draftSnapshots.entries()){
    const clip=pack.clips[key];
    if(!clip)continue;
    clip.values.set(snap.values);
    if(snap.hitboxOverride)clip.hitboxOverride={...snap.hitboxOverride};
    else delete clip.hitboxOverride;
    if(!snap.wasEdited){editedClipKeys.delete(key);clip.userEdited=false;}
    else clip.userEdited=true;
    rebuildClip(key);
  }
  draftSnapshots.clear();
  return true;
}
function hasUnsavedDrafts(){return draftSnapshots.size>0;}
function createManualClip(rawName,framesCount,category,baseKey){
  const slug=String(rawName||'nova').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'nova';
  const key=slug.startsWith('manual-')?slug:'manual-'+slug;
  const frames=clamp(Math.round(Number(framesCount)||30),2,100);
  const fps=30,stride=count*4+3;
  const values=new Float32Array(frames*stride);
  const base=pack.clips[baseKey]||pack.clips[category==='keeper'?'keeperIdle':'idle'];
  for(let f=0;f<frames;f++){
    if(base&&baseKey&&baseKey!=='idle'&&baseKey!=='keeperIdle'){
      const srcF=Math.min(base.frames-1,Math.round(f/(frames-1)*(base.frames-1)));
      values.set(base.values.subarray(srcF*base.stride,srcF*base.stride+stride),f*stride);
    }else if(base){
      values.set(base.values.subarray(0,stride),f*stride);
    }
  }
  const clip={
    source:key,duration:(frames-1)/fps,frames,fps,stride,values,
    custom:true,customCat:category||'move',contact:((frames-1)/fps)*.45,
    hitboxOverride:{scale:1,offsetX:0,offsetY:0,offsetZ:0}
  };
  pack.clips[key]=clip;
  rebuildClip(key);
  editedClipKeys.add(key);
  saveEditedClips();
  return key;
}
function deleteManualClip(key){
  const clip=pack.clips[key];
  if(!clip?.custom)return false;
  delete pack.clips[key];
  originalClipData.delete(key);
  editedClipKeys.delete(key);
  if(clip)clip.userEdited=false;
  saveEditedClips();
  return true;
}
function serializeEditedPayload(){
  const clips={},hitboxes={},customs={};
  for(const key of editedClipKeys){
    const clip=pack.clips[key];
    if(!clip)continue;
    clips[key]=encodeFloat32(clip.values);
    if(clip.hitboxOverride)hitboxes[key]=clip.hitboxOverride;
    if(clip.custom||clip.bakedProcedural){
      customs[key]={frames:clip.frames,fps:clip.fps,customCat:clip.customCat||'move',contact:clip.contact,bakedProcedural:Boolean(clip.bakedProcedural),bakeVersion:clip.bakeVersion||1};
    }
  }
  return {version:2,clips,hitboxes,customs};
}
function saveEditedClips(){
  const payload=serializeEditedPayload();
  try{
    if(Object.keys(payload.clips).length)localStorage.setItem(editStorageKey,JSON.stringify(payload));
    else localStorage.removeItem(editStorageKey);
    return true;
  }catch{return false;}
}
function restoreOriginal(key){
  const clip=pack.clips[key],orig=originalClipData.get(key);
  if(clip&&orig){
    clip.values.set(orig);
    delete clip.hitboxOverride;
    rebuildClip(key);
  }
  editedClipKeys.delete(key);
  if(clip)clip.userEdited=false;
  saveEditedClips();
}
function exportEditedClips(){
  return JSON.stringify(serializeEditedPayload());
}
function exportOverridesScript(){
  return 'window.FOOTBALL_ANIMATION_OVERRIDES = '+JSON.stringify(serializeEditedPayload())+';\n';
}
function applyPayload(parsed){
  const clipsMap=parsed?.clips||parsed||{};
  const hitboxesMap=parsed?.hitboxes||{};
  const customsMap=parsed?.customs||{};
  let applied=0;
  for(const [key,b64] of Object.entries(clipsMap)){
    if(removedDefensiveClips.has(key))continue;
    if(typeof b64!=='string')continue;
    const decoded=decode(b64);
    let clip=pack.clips[key];
    if(!clip&&customsMap[key]){
      const meta=customsMap[key];
      const frames=clamp(Math.round(meta.frames||30),2,100);
      const fps=meta.fps||30,stride=count*4+3;
      if(decoded.length===frames*stride){
        clip={source:key,duration:(frames-1)/fps,frames,fps,stride,values:new Float32Array(decoded),custom:!meta.bakedProcedural,bakedProcedural:Boolean(meta.bakedProcedural),bakeVersion:meta.bakeVersion||0,customCat:meta.customCat||'move',contact:meta.contact??((frames-1)/fps)*.45};
        pack.clips[key]=clip;
      }
    }else if(clip&&decoded.length===clip.values.length){
      ensureOriginal(key);
      clip.values.set(decoded);
    }else{
      continue;
    }
    if(hitboxesMap[key])clip.hitboxOverride={scale:1,offsetX:0,offsetY:0,offsetZ:0,...hitboxesMap[key]};
    rebuildClip(key);
    editedClipKeys.add(key);
    clip.userEdited=true;
    applied++;
  }
  return applied;
}
function importEditedClips(text){
  const applied=applyPayload(JSON.parse(text));
  saveEditedClips();
  return applied;
}
function applySavedClipEdits(){
  try{
    if(window.FOOTBALL_ANIMATION_OVERRIDES)applyPayload(window.FOOTBALL_ANIMATION_OVERRIDES);
  }catch{}
  try{
    const raw=localStorage.getItem(editStorageKey);
    if(!raw)return;
    applyPayload(JSON.parse(raw));
  }catch{}
}
applySavedClipEdits();

function dragBoneToWorld(h,clipKey,frameIdx,boneName,targetWorld,mirror){
  const clip=pack.clips[clipKey];
  if(!clip)return false;
  const s=get(h),rig=s.bones;
  if(!s.model)return false;
  ensureOriginal(clipKey);
  const f=clamp(Math.round(frameIdx),0,clip.frames-1);
  const base=f*clip.stride;
  const q=Array.from({length:count},(_,i)=>Array.from(clip.values.subarray(base+i*4,base+i*4+4)));
  const rootOff=base+count*4;
  // Use the exact live rendered root (including floor shift) so dragged joints stay pixel-exact under the cursor
  const root=s.root?[s.root[0],s.root[1],s.root[2]]:[0,clip.values[rootOff+1],0];
  let wCache=[];
  function wMat(i){
    if(wCache[i])return wCache[i];
    const b=rig[i],m=qmatrix(q[i],i===0?root:b.p);
    return wCache[i]=b.parent<0?m:mm(wMat(b.parent),m);
  }
  function wQuat(i){
    const p=rig[i].parent;
    return p<0?q[i]:qm(wQuat(p),q[i]);
  }
  function aimLocal(i,from,to){
    const p=rig[i].parent,pq=p<0?[0,0,0,1]:wQuat(p);
    const delta=qturn(from,to);
    q[i]=unit(qm(qm(qm(qi(pq),delta),pq),q[i]));
    wCache=[];
  }
  const dx=targetWorld[0]-h.x,dy=targetWorld[1]-(s.extraY||0),dz=targetWorld[2]-h.z;
  const sx=scale*(s.mirror?-1:1);
  const localTarget=[
    (s.model[0]*dx+s.model[1]*dy+s.model[2]*dz)/(sx*sx),
    (s.model[4]*dx+s.model[5]*dy+s.model[6]*dz)/(scale*scale),
    (s.model[8]*dx+s.model[9]*dy+s.model[10]*dz)/(scale*scale)
  ];

  if(boneName==='Hips'){
    clip.values[rootOff+1]=clamp(localTarget[1],28,172);
    markClipEdited(clipKey);
    return true;
  }

  const twoBoneChains={
    LeftFoot:['LeftUpLeg','LeftLeg','LeftFoot',true],
    LeftToeBase:['LeftUpLeg','LeftLeg','LeftFoot',true],
    RightFoot:['RightUpLeg','RightLeg','RightFoot',true],
    RightToeBase:['RightUpLeg','RightLeg','RightFoot',true],
    LeftHand:['LeftArm','LeftForeArm','LeftHand',false],
    RightHand:['RightArm','RightForeArm','RightHand',false]
  };
  const chain=twoBoneChains[boneName];
  if(chain){
    const [uName,mName,eName,isLeg]=chain;
    const u=byName[uName],m=byName[mName],e=byName[eName];
    const P0=point(wMat(u),[0,0,0]),P1=point(wMat(m),[0,0,0]),P2=point(wMat(e),[0,0,0]);
    const l1=Math.hypot(...subtract(P1,P0)),l2=Math.hypot(...subtract(P2,P1));
    const delta=subtract(localTarget,P0);
    const dist=clamp(Math.hypot(...delta),Math.abs(l1-l2)+.5,l1+l2-.5);
    const axis=unit(delta);
    let bend=subtract(P1,P0);
    bend=bend.map((v,i)=>v-axis[i]*dot(bend,axis));
    if(Math.hypot(...bend)<.08){
      const fallback=isLeg?[0,0,1]:[0,-1,-.4];
      bend=fallback.map((v,i)=>v-axis[i]*dot(fallback,axis));
    }
    bend=unit(bend);
    const along=(l1*l1-l2*l2+dist*dist)/(2*dist);
    const height=Math.sqrt(Math.max(0,l1*l1-along*along));
    const newP1=P0.map((v,i)=>v+axis[i]*along+bend[i]*height);
    const newP2=P0.map((v,i)=>v+axis[i]*dist);
    aimLocal(u,subtract(P1,P0),subtract(newP1,P0));
    const actP1=point(wMat(m),[0,0,0]),actP2=point(wMat(e),[0,0,0]);
    aimLocal(m,subtract(actP2,actP1),subtract(newP2,actP1));
    clip.values.set(q[u],base+u*4);
    clip.values.set(q[m],base+m*4);
    markClipEdited(clipKey);
    return true;
  }

  const idx=byName[boneName];
  if(idx===undefined||rig[idx].parent<0)return false;
  const parent=rig[idx].parent;
  const P0=point(wMat(parent),[0,0,0]),P1=point(wMat(idx),[0,0,0]);
  const curVec=subtract(P1,P0),tgtVec=subtract(localTarget,P0);
  if(Math.hypot(...curVec)<.05||Math.hypot(...tgtVec)<.05)return false;
  aimLocal(parent,curVec,tgtVec);
  clip.values.set(q[parent],base+parent*4);
  markClipEdited(clipKey);
  return true;
}

function boneWorldPositions(h){
  const s=get(h);
  if(!s.model||!s.world?.length)return [];
  const out=[];
  for(let i=0;i<count;i++){
    const m=s.world[i];
    out.push(m?point(mm(s.model,m),[0,0,0]):null);
  }
  return out;
}
function snapshot(h){let s=get(h);return{clip:s.clip,time:s.time,mirror:s.mirror,extraY:s.extraY,bodyYaw:s.bodyYaw,root:[...s.root],q:s.q.map(q=>[...q])}}
function restore(h,data){if(!data)return;let s=get(h);s.key=null;update(h,{...data,loop:false,fade:.001},1)}
return{update,draw,get,useIndependentRig,snapshot,restore,shotGeometry,sphereHitsBox,dragBoneToWorld,registerBakedClip,clips:pack.clips,boneCount:count,scale,bones:fieldRig,byName,boneWorldPositions,ensureOriginal,rebuildClip,markClipEdited,commitClipDrafts,discardClipDrafts,hasUnsavedDrafts,saveEditedClips,restoreOriginal,exportEditedClips,exportOverridesScript,importEditedClips,createManualClip,deleteManualClip,editedClipKeys,crowdMesh,crowdPose,crowdBoneCount:crowdBones.length};
};
