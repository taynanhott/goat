const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function readFBX(file){
  const data=fs.readFileSync(file),wide=data.readUInt32LE(23)>=7500;
  let at=27;
  const integer=()=>{const v=wide?Number(data.readBigUInt64LE(at)):data.readUInt32LE(at);at+=wide?8:4;return v;};
  function property(){
    const type=String.fromCharCode(data[at++]);
    const scalar={Y:['readInt16LE',2],C:['readUInt8',1],I:['readInt32LE',4],F:['readFloatLE',4],D:['readDoubleLE',8],L:['readBigInt64LE',8]};
    if(scalar[type]){const [method,size]=scalar[type],v=data[method](at);at+=size;return typeof v==='bigint'?Number(v):v;}
    if(type==='S'||type==='R'){const n=data.readUInt32LE(at);at+=4;const v=data.subarray(at,at+n);at+=n;return type==='S'?v.toString('utf8'):v;}
    const length=data.readUInt32LE(at),encoding=data.readUInt32LE(at+4),bytes=data.readUInt32LE(at+8);at+=12;
    const raw=data.subarray(at,at+bytes);at+=bytes;
    const buffer=encoding?zlib.inflateSync(raw):raw;
    const [method,size]=({f:['readFloatLE',4],d:['readDoubleLE',8],l:['readBigInt64LE',8],i:['readInt32LE',4],b:['readUInt8',1],c:['readUInt8',1]})[type]??[];
    if(!method)throw Error('FBX property '+type);
    return Array.from({length},(_,i)=>Number(buffer[method](i*size)));
  }
  function node(){
    const end=integer(),count=integer();integer();const nameSize=data[at++];
    if(!end)return null;
    const name=data.toString('utf8',at,at+nameSize);at+=nameSize;
    const values=Array.from({length:count},property),children=[];
    while(at<end){const child=node();if(!child)break;children.push(child);}
    at=end;return {name,values,children};
  }
  const nodes=[];while(at<data.length){const n=node();if(!n)break;nodes.push(n);}return nodes;
}
const mul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]+a[1]*b[3]+a[2]*b[0]-a[0]*b[2],a[3]*b[2]+a[2]*b[3]+a[0]*b[1]-a[1]*b[0],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
function quaternion(v,order=0){
  let q=[0,0,0,1];
  const axes=['XYZ','XZY','YZX','YXZ','ZXY','ZYX'][order]??'XYZ';
  for(const axis of axes.split('').reverse()){
    const i='XYZ'.indexOf(axis),angle=(v[i]??0)*Math.PI/360;
    const delta=[0,0,0,Math.cos(angle)];delta[i]=Math.sin(angle);q=mul(q,delta);
  }
  return q;
}
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'assets/animations/animations.js'),'utf8'),context);
const pack=context.window.FOOTBALL_ANIMATIONS;
function convert(filename){
  const tree=readFBX(path.join(root,'../referencias',filename));
  const objects=tree.find(n=>n.name==='Objects').children;
  const connections=tree.find(n=>n.name==='Connections').children.map(n=>n.values);
  const map=new Map(objects.map(n=>[n.values[0],n]));
  const props=n=>Object.fromEntries((n?.children.find(c=>c.name==='Properties70')?.children??[]).map(p=>[p.values[0],p.values.slice(4)]));
  const models=new Map(objects.filter(n=>n.name==='Model').map(n=>[n.values[1].split('\0')[0].replace(/^mixamorig\d*:/,''),n]));
  const tracks=new Map();let end=0;
  for(const c of connections){
    const source=map.get(c[1]),model=map.get(c[2]);
    if(source?.name!=='AnimationCurveNode'||model?.name!=='Model'||!['Lcl Rotation','Lcl Translation'].includes(c[3]))continue;
    const axes={};
    for(const link of connections.filter(link=>link[2]===source.values[0])){
      const curve=map.get(link[1]);if(curve?.name!=='AnimationCurve')continue;
      const times=curve.children.find(n=>n.name==='KeyTime')?.values[0],values=curve.children.find(n=>n.name==='KeyValueFloat')?.values[0];
      if(times?.length){axes[link[3].slice(-1)]={times:times.map(t=>t/46186158000),values};end=Math.max(end,times.at(-1)/46186158000);}
    }
    tracks.set(model.values[0]+'|'+c[3],axes);
  }
  function sample(track,t,fallback){
    if(!track)return fallback;
    const {times,values}=track;let lo=0,hi=times.length-1;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(times[mid]<=t)lo=mid;else hi=mid-1;}
    const next=Math.min(lo+1,times.length-1),weight=next===lo?0:Math.max(0,Math.min(1,(t-times[lo])/(times[next]-times[lo])));
    return values[lo]+(values[next]-values[lo])*weight;
  }
  const fps=30,frames=Math.round(end*fps)+1,stride=pack.bones.length*4+3,values=new Float32Array(frames*stride);
  for(let frame=0;frame<frames;frame++)for(let i=0;i<pack.bones.length;i++){
    const bone=pack.bones[i],model=models.get(bone.name),p=props(model);
    if(!model){values.set(bone.q,frame*stride+i*4);continue;}
    const rotation=tracks.get(model.values[0]+'|Lcl Rotation');
    const euler=['X','Y','Z'].map((axis,j)=>sample(rotation?.[axis],frame/fps,p['Lcl Rotation']?.[j]??0));
    const pre=quaternion(p.PreRotation??[0,0,0]),q=mul(pre,quaternion(euler,p.RotationOrder?.[0]??0));
    values.set(q,frame*stride+i*4);
    if(i===0){
      const track=tracks.get(model.values[0]+'|Lcl Translation');
      values.set(['X','Y','Z'].map((axis,j)=>sample(track?.[axis],frame/fps,p['Lcl Translation']?.[j]??0)),frame*stride+pack.bones.length*4);
    }
  }
  const clip={fps,frames,duration:(frames-1)/fps,stride,data:Buffer.from(values.buffer).toString('base64'),source:filename};
  console.log(filename+': '+frames+' frames');return clip;
}
const clips=Object.fromEntries(Object.entries({kneeControl:'kneeing soccerball.fbx',kneeControlAlt:'kneeing soccerball (2).fbx',
  sadWalk:'Sad Walk.fbx',sadIdle:'Sad Idle.fbx',
  jogForwardLeft:'jog forward diagonal.fbx',jogForwardRight:'jog forward diagonal (2).fbx',
  jogBackwardLeft:'jog backward diagonal.fbx',jogBackwardRight:'jog backward diagonal (2).fbx'}).map(([key,file])=>[key,convert(file)]));
fs.writeFileSync(path.join(root,'assets/animations/team-animations.js'),'Object.assign(window.FOOTBALL_ANIMATIONS.clips,'+JSON.stringify(clips)+');\n');
