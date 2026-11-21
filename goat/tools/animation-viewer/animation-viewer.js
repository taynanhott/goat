(()=>{
'use strict';
const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl',{antialias:true,alpha:false}),status=document.querySelector('#status');
if(!gl){status.textContent='WebGL indisponível';return}
const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),mm=(a,b)=>{let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o},point=(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]],normalize=v=>{let n=Math.hypot(...v)||1;return v.map(x=>x/n)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function transform(p=[0,0,0],r=[0,0,0],s=[1,1,1]){let c=Math.cos(r[1]),v=Math.sin(r[1]);return new Float32Array([c*s[0],0,-v*s[0],0,0,s[1],0,0,v*s[2],0,c*s[2],0,...p,1])}
function look(eye,target){let z=normalize(eye.map((v,i)=>v-target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
function perspective(aspect){let k=1/Math.tan(.47);return new Float32Array([k/aspect,0,0,0,0,k,0,0,0,0,-1.002,-1,0,0,-.2002,0])}
function shader(type,source){let s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
const mocap=window.createFootballMocap({gl,shader,mm,transform,point,I}),actors=[{x:-.85,z:0,yaw:Math.PI,goalie:false,b:{lh:{},rh:{},spine:{}}},{x:.85,z:0,yaw:Math.PI,goalie:true,b:{lh:{},rh:{},spine:{}}}],selectors=[document.querySelector('#player'),document.querySelector('#keeper')],clips=window.FOOTBALL_ANIMATIONS.clips;
const originalSaves={
  saveHigh:'Defesa alta com uma mão',saveStretch:'Mergulho lateral',saveLow:'Defesa rasteira',
  saveLowCatch:'Encaixe baixo',saveGroundScoop:'Encaixe rasteiro agachado',
  saveKneeScoop:'Encaixe rasteiro com um joelho baixo',saveQuickScoop:'Encaixe rasteiro de perto',saveChestCatch:'Encaixe no peito',saveSpread:'Abafa com braços e pernas',
  saveTopCatch:'Salto vertical com as duas mãos',saveHighStep:'Defesa alta com passo lateral',
  saveStretchStep:'Mergulho com passo lateral',saveLowStep:'Defesa rasteira com passo lateral',
  catchReference:'Encaixe anterior 1',catch2Reference:'Encaixe anterior 2',catch4Reference:'Salto anterior',catch3Reference:'Encaixe alto com corrida (FBX)',
  diveReference:'Mergulho anterior 1',dive2Reference:'Mergulho anterior 2',
  blockReference:'Bloqueio anterior 1',block2Reference:'Bloqueio anterior 2',block3Reference:'Mergulho rasteiro estendido',
  scoopReference:'Encaixe rasteiro anterior',spreadSaveReference:'Abafa anterior',
  oneHand:'Espalmada alta com uma mão (FIFA 16 adaptado)',punchSave:'Soco de perto (FIFA 16 adaptado)',
  reflexSave:'Defesa de reflexo (FIFA 16 adaptado)',footSave:'Desvio com o pé 1 (FIFA 16 adaptado)',
  footSave2:'Desvio com o pé 2 (FIFA 16 adaptado)'
};
function addClip(select,name,label){
  const option=document.createElement('option');
  option.value=name;
  option.textContent=label;
  select.append(option);
}
for(const [name,clip] of Object.entries(window.FOOTBALL_FIFA16.clips)){
  addClip(selectors[0],name,name+' - '+clip.frames+' quadros');
}
addClip(selectors[0],'strikeForwardJog','Strike Foward Jog');
for(const [name,label] of Object.entries(originalSaves))addClip(selectors[1],name,label);
selectors[0].value='runBall';
selectors[1].value='saveHigh';

function updateActor(index,time,phase,dt){
  const name=selectors[index].value,clip=clips[name],actor=actors[index];
  const clipTime=phase===null?time%clip.duration:phase*clip.duration;
  actor.x=index?.85:-.85;
  actor.z=0;
  if(clip.rootMotion){
    const frame=clipTime*clip.fps, lower=Math.floor(frame), upper=Math.min(clip.frames-1,lower+1), blend=frame-lower;
    const offset=clip.stride-3;
    const position=axis=>{
      const a=clip.values[lower*clip.stride+offset+axis],b=clip.values[upper*clip.stride+offset+axis];
      return (a+(b-a)*blend)*mocap.scale;
    };
    actor.x+=position(0);
    actor.z+=position(2);
  }
  mocap.update(actor,{clip:name,time:clipTime,loop:false,fade:.12,authoredGround:clip.rootMotion},dt);
}
let time=0,last=0,paused=false;document.querySelector('#phase').oninput=()=>{paused=true;document.querySelector('#pause').textContent='Continuar'};document.querySelector('#pause').onclick=()=>{paused=!paused;document.querySelector('#pause').textContent=paused?'Continuar':'Pausar'};for(let s of selectors)s.onchange=()=>time=0;
gl.enable(gl.DEPTH_TEST);
function frame(now){try{let dt=Math.min(.04,(now-last)/1000||.016);last=now;if(!paused)time+=dt*Number(document.querySelector('#speed').value);let ratio=devicePixelRatio||1,w=canvas.clientWidth*ratio,h=canvas.clientHeight*ratio;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}let angle=Number(document.querySelector('#view').value),eye=[Math.sin(angle)*6.5+1,3.1,Math.cos(angle)*6.5],vp=mm(perspective(w/h),look(eye,[1,.9,0]));gl.clearColor(.12,.19,.23,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const phase=paused?Number(document.querySelector('#phase').value):null;for(let i=0;i<2;i++){updateActor(i,time,phase,dt);mocap.draw(actors[i],vp,eye)}status.textContent=selectors.map(s=>clips[s.value].source).join(' | ');requestAnimationFrame(frame)}catch(error){status.textContent='ERRO: '+error.stack}}
requestAnimationFrame(frame);
})();
