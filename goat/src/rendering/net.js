window.createFootballNet=function({gl,loc,I}){
const nodes=[],edges=[],faces=[],lookup=new Map();
function vertex(p,pinned,cable=false){
  const key=p.map(v=>v.toFixed(3)).join(','),old=lookup.get(key);
  if(old!==undefined){
    nodes[old].pin||=pinned;
    nodes[old].cable||=cable;
    return old;
  }
  const i=nodes.length;
  nodes.push({rest:[...p],p:[...p],v:[0,0,0],pin:pinned,cable,neighbors:[]});
  lookup.set(key,i);
  return i;
}
function surface(nu,nv,fn,pin,cableFn){
  const grid=[];
  for(let v=0;v<=nv;v++){
    const row=[];
    for(let u=0;u<=nu;u++){
      const p=fn(u/nu,v/nv);
      row.push(vertex(p,pin(u,v,nu,nv,p),cableFn?cableFn(u,v,nu,nv,p):false));
    }
    grid.push(row);
  }
  for(let v=0;v<=nv;v++)for(let u=0;u<=nu;u++){
    if(u<nu)edges.push([grid[v][u],grid[v][u+1]]);
    if(v<nv)edges.push([grid[v][u],grid[v+1][u]]);
  }
  faces.push(grid);
}
// Apenas traves/travessão (z=0), ganchos do chão (y≈0.04) e cantos superiores traseiros são fixos;
// as costuras traseiras (cabos de sustentação) são elásticas para a rede estufar de forma fluida.
surface(40,13,(u,v)=>[-3.66+u*7.32,.04+v*2.11,-2.4],
  (u,v,nu,nv)=>v===0||(v===nv&&(u===0||u===nu)),
  (u,v,nu,nv)=>u===0||u===nu||v===nv);
for(const s of [-1,1]){
  surface(13,13,(u,v)=>[s*3.66,.04+v*(2.40-u*.29),-u*2.4],
    (u,v,nu,nv)=>u===0||v===0||(u===nu&&v===nv),
    (u,v,nu,nv)=>u===nu||v===nv);
}
surface(40,13,(u,v)=>[-3.66+u*7.32,2.44-v*.29,-v*2.4],
  (u,v,nu,nv)=>v===0||(v===nv&&(u===0||u===nu)),
  (u,v,nu,nv)=>u===0||u===nu||v===nv);

for(const [a,b] of edges){nodes[a].neighbors.push(b);nodes[b].neighbors.push(a);}
const data=new Float32Array(edges.length*18),buffer=gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);

function step(dt){
  const steps=Math.max(1,Math.ceil(dt/.006)),h=dt/steps;
  for(let k=0;k<steps;k++){
    const forces=nodes.map(n=>{
      if(n.pin)return[0,0,0];
      const tether=n.cable?38:14;
      const cloth=n.cable?155:185;
      const damp=n.cable?4.8:3.6;
      return n.p.map((v,a)=>{
        let lap=0;
        for(const j of n.neighbors){
          const other=nodes[j];
          lap+=(other.p[a]-other.rest[a])-(v-n.rest[a]);
        }
        const grav=a===1?-.18:0;
        return -(v-n.rest[a])*tether+lap*cloth-n.v[a]*damp+grav;
      });
    });
    nodes.forEach((n,i)=>{
      if(n.pin)return;
      const maxDisp=n.cable?.55:1.15;
      for(let a=0;a<3;a++){
        n.v[a]+=forces[i][a]*h;
        n.p[a]+=n.v[a]*h;
        const delta=n.p[a]-n.rest[a];
        if(Math.abs(delta)>maxDisp){
          n.p[a]=n.rest[a]+Math.sign(delta)*maxDisp;
          n.v[a]*=.25;
        }
      }
      if(n.p[1]<.03){n.p[1]=.03;if(n.v[1]<0)n.v[1]=0;}
      if(n.p[2]>-.04){n.p[2]=-.04;if(n.v[2]>0)n.v[2]*=-.2;}
    });
  }
}

function impact(p,velocity){
  const speed=Math.hypot(...velocity);
  if(speed<.05)return;
  const direction=velocity.map(v=>v/(speed||1));
  const power=Math.min(20,speed*.88+2.4);
  for(const n of nodes){
    if(n.pin)continue;
    const d2=n.rest.reduce((sum,v,a)=>sum+(v-p[a])**2,0);
    const weight=Math.exp(-d2/.78)+.34*Math.exp(-d2/2.4);
    if(weight<.004)continue;
    const scale=n.cable?.58:1;
    for(let a=0;a<3;a++){
      n.v[a]+=direction[a]*power*weight*scale;
    }
  }
}

function displacement(p,axis){
  let total=0,weight=0;
  for(const n of nodes){
    if(Math.abs(n.rest[axis]-p[axis])>.22)continue;
    let d2=0;
    for(let a=0;a<3;a++)if(a!==axis)d2+=(n.rest[a]-p[a])**2;
    const w=Math.exp(-d2/.26);
    total+=(n.p[axis]-n.rest[axis])*w;
    weight+=w;
  }
  return weight?total/weight:0;
}

function contain(p,v){
  let hit=false;
  const touch=(axis,plane,sign)=>{
    const q=[...p];
    q[axis]=plane;
    const disp=displacement(q,axis);
    const boundary=plane+disp-sign*.115;
    const pen=(p[axis]-boundary)*sign;
    if(pen>0){
      impact(q,v);
      // Empurra os nós próximos junto com a bola para formar o bolsão da rede
      for(const n of nodes){
        if(n.pin)continue;
        const d2=n.rest.reduce((sum,val,a)=>sum+(val-q[a])**2,0);
        const w=Math.exp(-d2/.65)*(n.cable?.5:1);
        if(w>.02){
          n.p[axis]+=sign*Math.min(.14,pen*.55)*w;
          n.v[axis]+=v[axis]*.28*w;
        }
      }
      const newBoundary=plane+displacement(q,axis)-sign*.115;
      if((p[axis]-newBoundary)*sign>0){
        p[axis]=newBoundary;
      }
      if(v[axis]*sign>0){
        v[axis]=-sign*Math.abs(v[axis])*.16;
      }
      for(let a=0;a<3;a++)if(a!==axis)v[a]*=.78;
      hit=true;
    }
  };
  touch(2,-2.4,-1);
  touch(0,3.66,1);
  touch(0,-3.66,-1);
  const roof=2.44+Math.min(0,p[2])*.1208;
  touch(1,roof,1);
  return hit;
}

function draw(){
  let at=0;
  for(const edge of edges)for(const i of edge){
    const p=nodes[i].p;
    data.set([p[0],p[1],p[2],0,1,0,.85,.75,.62],at);
    at+=9;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferSubData(gl.ARRAY_BUFFER,0,data);
  for(const [name,off] of [['aP',0],['aN',12],['aC',24]]){
    gl.enableVertexAttribArray(loc[name]);
    gl.vertexAttribPointer(loc[name],3,gl.FLOAT,false,36,off);
  }
  gl.uniformMatrix4fv(loc.uM,false,I());
  gl.uniform4fv(loc.uColor,[1,1,1,.76]);
  gl.uniform1f(loc.uKind,2);
  gl.drawArrays(gl.LINES,0,edges.length*2);
}

function snapshot(){
  const out=new Float32Array(nodes.length*6);
  nodes.forEach((n,i)=>{out.set(n.p,i*6);out.set(n.v,i*6+3);});
  return out;
}
function restore(state){
  if(!state)return;
  nodes.forEach((n,i)=>{
    if(i*6+6>state.length)return;
    n.p=Array.from(state.subarray(i*6,i*6+3));
    n.v=Array.from(state.subarray(i*6+3,i*6+6));
  });
}
function reset(){nodes.forEach(n=>{n.p=[...n.rest];n.v=[0,0,0];});}
return{step,impact,contain,draw,snapshot,restore,reset};
};
