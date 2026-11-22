(()=>{
'use strict';
const $=s=>document.querySelector(s),canvas=$('#game'),gl=canvas.getContext('webgl',{antialias:true,alpha:false});
const ballPhysics=window.createFootballBallPhysics(),ballAngular=[0,0,0],ballRotation=[0,0,0];
if(!gl){$('#loading').textContent='WebGL indisponível. Abra no Chrome, Edge ou Brave com aceleração gráfica.';return}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)},V=(x=0,y=0,z=0)=>[x,y,z],add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>mul(a,1/(Math.hypot(...a)||1));
const I=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mm(a,b){let o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o}
function transform(p=[0,0,0],r=[0,0,0],s=[1,1,1]){let [x,y,z]=r,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);let rx=I(),ry=I(),rz=I(),t=I();rx[5]=cx;rx[6]=sx;rx[9]=-sx;rx[10]=cx;ry[0]=cy;ry[2]=-sy;ry[8]=sy;ry[10]=cy;rz[0]=cz;rz[1]=sz;rz[4]=-sz;rz[5]=cz;t=mm(rz,mm(ry,rx));for(let k=0;k<3;k++)for(let j=0;j<3;j++)t[k*4+j]*=s[k];t[12]=p[0];t[13]=p[1];t[14]=p[2];return t}
function point(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]]}
function look(eye,target){let z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
function perspective(fov,aspect,n=.1,f=360){let k=1/Math.tan(fov/2);return new Float32Array([k/aspect,0,0,0,0,k,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0])}
function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
const art=window.footballComicArt;
const paintSky=art.createSky(gl,shader);
const program=gl.createProgram();
gl.attachShader(program,shader(gl.VERTEX_SHADER,`
  attribute vec3 aP,aN,aC,aFanPart;
  attribute vec4 aFanPose,aFanPrimary,aFanSecondary,aFanSkin;
  uniform mat4 uM,uVP;
  uniform mediump float uInk;
  uniform float uFanMode;
  uniform mat4 uFanBones[15];
  varying mediump vec3 vN,vP,vC,vSecondary;
  varying mediump vec4 vLocal;
  void main(){
    vec3 vertex=aP,normal=aN;
    if(uFanMode>.5){
      float region=aFanPart.x;
      float seed=aFanPrimary.w;
      float scale=aFanSecondary.w;
      float hairIdx=aFanSkin.w;
      mat4 first=uFanBones[int(aFanPart.y)], second=uFanBones[int(aFanPart.z)];
      vec3 scaled=mix((second*vec4(vertex,1.)).xyz,(first*vec4(vertex,1.)).xyz,aC.x)*(.0094*.88*scale);
      normal=mix(mat3(second)*normal,mat3(first)*normal,aC.x);
      float yaw=aFanPose.w;
      float cy=cos(yaw),sy=sin(yaw);
      vec3 world=vec3(cy*scaled.x+sy*scaled.z,scaled.y,-sy*scaled.x+cy*scaled.z)+aFanPose.xyz;
      vN=normalize(vec3(cy*normal.x+sy*normal.z,normal.y,-sy*normal.x+cy*normal.z));
      vP=world;
      vec3 hairColor=hairIdx<.5?vec3(.09,.06,.065):hairIdx<1.5?vec3(.24,.13,.07):hairIdx<2.5?vec3(.46,.26,.13):vec3(.78,.60,.31);
      vec3 bottoms=mix(vec3(.12,.13,.18),vec3(.65,.59,.48),smoothstep(.35,.83,seed));
      vC=region<1.5?aFanPrimary.rgb:region<2.5?aFanSkin.rgb:region<3.5?hairColor:region<4.5?bottoms:region<5.5?mix(bottoms,aFanSkin.rgb,step(.58,seed)):vec3(.16,.13,.17);
      vSecondary=aFanSecondary.rgb;
      vLocal=vec4(aP*(.0094*.88),region);
      world+=vN*uInk;
      gl_Position=uVP*vec4(world,1.);
      return;
    }
    vec4 p=uM*vec4(vertex,1.);
    vN=normalize(mat3(uM)*normal);
    vP=p.xyz;
    vC=aC;
    vSecondary=aC;
    vLocal=vec4(aP,0.);
    p.xyz+=vN*uInk;
    gl_Position=uVP*p;
  }
`));
gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
  precision mediump float;
  varying mediump vec3 vN,vP,vC,vSecondary;
  varying mediump vec4 vLocal;
  uniform vec4 uColor;
  uniform float uKind,uFogFar;
  uniform vec2 uPlayLimits,uAerialFog;
  uniform mediump float uInk;
  uniform vec3 uEye;
  ${art.print}
  void main(){
    if(uInk>0.0){gl_FragColor=vec4(.063,.046,.073,1.);return;}
    vec3 n=normalize(vN);
    vec3 tint=vC*uColor.rgb;
    if(uKind>1.5){gl_FragColor=vec4(tint,uColor.a);return;}
    float distanceToEye=length((vP-uEye)/16.)*16.;
    float fog=uAerialFog.y>0.?smoothstep(uAerialFog.x,uAerialFog.y,distanceToEye):
      smoothstep(27.,max(111.,uFogFar),distanceToEye)*.76;
    vec3 air=vec3(${art.horizon.join(',')});
    if(fog>=1.){gl_FragColor=vec4(air,uColor.a);return;}
    vec3 color;
    if(uKind>.5){
      vec2 grass=vP.xz;
      float band=mod(floor((grass.y+70.)/5.5),2.);
      float gouache=wash(grass*vec2(.75,1.2));
      float brush=wash(grass*vec2(13.,34.));
      float stripe=.92+.115*band;
      color=mix(tint*vec3(.63,.90,.87),tint*vec3(1.13,1.11,.72),gouache)*stripe;
      color*=.90+.19*brush;
      float cuts=1.-smoothstep(.19,.25,length(fract(grass*vec2(35.,13.))-.5));
      color=mix(color,vec3(.55,.56,.24),cuts*.12);
      if(uPlayLimits.x>0.){
        float edge=max(abs(grass.x)-uPlayLimits.x,max(-grass.y,grass.y-uPlayLimits.y));
        color=mix(color,vec3(.057,.048,.076),smoothstep(-.35,3.4,edge)*.76);
      }
    }else{
      float region=vLocal.w;
      vec3 black=vec3(.085,.063,.103);
      if(region>.5){
        float lx=vLocal.x,ly=vLocal.y,lz=vLocal.z;
        if(region<1.5){
          float diag=lx-.32*(ly-1.02)+lz*.32;
          float split=1.-smoothstep(-.014,.014,diag);
          float seam=1.-smoothstep(.003,.012,abs(diag));
          tint=mix(vC,vSecondary,split);
          tint=mix(tint,black,seam*.78);
          float collar=smoothstep(1.22,1.255,ly)*smoothstep(.11,.05,abs(lx));
          float hem=1.-smoothstep(.76,.795,ly);
          float cuff=smoothstep(.245,.275,abs(lx));
          tint=mix(tint,black,max(collar*.9,max(hem*.65,cuff*.88)));
          if(lz>.04&&abs(lx-.058)<.022&&abs(ly-1.14)<.026){
            tint=abs(lx-.058)<.007&&abs(ly-1.14)<.015?vec3(1.,.63,.20):black;
          }
        }else if(region>3.5&&region<4.5){
          float sideStripe=smoothstep(.115,.135,abs(lx))*(1.-smoothstep(.16,.18,abs(lx)));
          tint=mix(vC,vSecondary,sideStripe*.72);
        }else if(region>4.5&&region<5.5){
          float topBand=smoothstep(.31,.34,ly)*(1.-smoothstep(.36,.385,ly));
          tint=mix(vC,vSecondary,topBand*.25);
        }
      }
      vec2 paint=vec2(vP.x+vP.z*.68,vP.y+vP.z*.30);
      if(uKind<-.5||region>.5)paint=vec2(vLocal.x+vLocal.z*.34,vLocal.y+vLocal.z*.24)*6.;
      color=printShade(tint,n,paint,region>.5?.82:(uKind<-.5?.64:.59));
      if(region>.5){
        float rim=1.-abs(dot(n,normalize(uEye-vP)));
        color=mix(color,black,smoothstep(.76,.94,rim)*.58);
      }
    }
    gl_FragColor=vec4(mix(color,air,fog),uColor.a);
  }
`));
gl.linkProgram(program);
if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
gl.useProgram(program);
const loc={};
for(const name of ['aP','aN','aC','aFanPart','aFanPose','aFanPrimary','aFanSecondary','aFanSkin'])loc[name]=gl.getAttribLocation(program,name);
for(const name of ['uM','uVP','uColor','uKind','uInk','uEye','uPlayLimits','uFanMode','uFogFar','uAerialFog','uFanBones[0]'])loc[name]=gl.getUniformLocation(program,name);
gl.uniform1f(loc.uFanMode,0);
gl.uniform1f(loc.uFogFar,111);
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
function mesh(data){let buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data instanceof Float32Array?data:new Float32Array(data),gl.STATIC_DRAW);return{buffer,count:data.length/9,data}}
function tri(a,b,c,na,nb,nc,color=[1,1,1]){return [...a,...na,...color,...b,...nb,...color,...c,...nc,...color]}
function sphere(seg=12,rings=8){let d=[];for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){let q=(a,b)=>[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)],a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2,c=j/rings*Math.PI,e=(j+1)/rings*Math.PI;let p=q(a,c),p1=q(b,c),p2=q(b,e),p3=q(a,e);d.push(...tri(p,p1,p2,p,p1,p2),...tri(p,p2,p3,p,p2,p3))}return mesh(d)}
function cylinder(top=1,bottom=1,n=12){let d=[];for(let i=0;i<n;i++){let a=i/n*2*Math.PI,b=(i+1)/n*2*Math.PI,p=[Math.cos(a)*bottom,-.5,Math.sin(a)*bottom],q=[Math.cos(b)*bottom,-.5,Math.sin(b)*bottom],r=[Math.cos(b)*top,.5,Math.sin(b)*top],s=[Math.cos(a)*top,.5,Math.sin(a)*top],na=norm([Math.cos(a),bottom-top,Math.sin(a)]),nb=norm([Math.cos(b),bottom-top,Math.sin(b)]);d.push(...tri(p,q,r,na,nb,nb),...tri(p,r,s,na,nb,na),...tri([0,.5,0],s,r,[0,1,0],[0,1,0],[0,1,0]),...tri([0,-.5,0],q,p,[0,-1,0],[0,-1,0],[0,-1,0]))}return mesh(d)}
function box(){let d=[];for(let [n,u,v] of [[[1,0,0],[0,1,0],[0,0,1]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[0,0,1],[1,0,0]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[0,1,0],[1,0,0]]]){let p=mul(sub(sub(n,u),v),.5),q=add(p,u),r=add(q,v),s=add(p,v);d.push(...tri(p,q,r,n,n,n),...tri(p,r,s,n,n,n))}return mesh(d)}
function disc(n=40){let d=[];for(let i=0;i<n;i++){let a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;d.push(...tri([0,0,0],[Math.cos(a),0,Math.sin(a)],[Math.cos(b),0,Math.sin(b)],[0,1,0],[0,1,0],[0,1,0]))}return mesh(d)}
function targetRing(){
  const data=[],normal=[0,1,0];
  for(let i=0;i<64;i++){
    const a=i/64*Math.PI*2,b=(i+1)/64*Math.PI*2;
    const p=[Math.cos(a),0,Math.sin(a)],q=[Math.cos(b),0,Math.sin(b)];
    const r=q.map(value=>value*.86),t=p.map(value=>value*.86);
    data.push(...tri(p,q,r,normal,normal,normal),...tri(p,r,t,normal,normal,normal));
  }
  return mesh(data);
}
function matchBall(){
  const phi=(1+Math.sqrt(5))/2;
  const corners=[];
  for(const a of [-1,1])for(const b of [-phi,phi])corners.push([0,a,b],[a,b,0],[b,0,a]);
  const adjacent=(a,b)=>Math.abs(Math.hypot(...sub(a,b))-2)<.001;
  const blend=(a,b,t)=>add(mul(a,1-t),mul(b,t));
  const truncate=(a,b)=>blend(a,b,1/3);
  const panels=[];
  for(const [index,corner] of corners.entries()){
    const n=norm(corner),ref=Math.abs(n[1])>.9?[1,0,0]:[0,1,0];
    const u=norm(cross(ref,n)),v=cross(n,u);
    const angle=point=>Math.atan2(dot(point,v),dot(point,u));
    const ring=corners.filter(b=>adjacent(corner,b)).map(b=>truncate(corner,b)).sort((a,b)=>angle(a)-angle(b));
    panels.push({ring,white:index%4!==1});
  }
  for(let i=0;i<corners.length;i++){
    const a=corners[i];
    for(let j=i+1;j<corners.length;j++){
      const b=corners[j];
      if(!adjacent(a,b))continue;
      for(let k=j+1;k<corners.length;k++){
        const c=corners[k];
        if(!adjacent(a,c)||!adjacent(b,c))continue;
        panels.push({ring:[truncate(a,b),truncate(b,a),truncate(b,c),truncate(c,b),truncate(c,a),truncate(a,c)],white:panels.length%7===0});
      }
    }
  }

  const data=[],segments=5;
  const seam=[.062,.047,.072],edge=[.26,.14,.20];
  function face(a,b,c,color){
    if(dot(cross(sub(b,a),sub(c,a)),a)<0)[b,c]=[c,b];
    data.push(...tri(a,b,c,norm(a),norm(b),norm(c),color));
  }

  for(const {ring,white} of panels){
    const center=mul(ring.reduce(add),1/ring.length);
    const inset=ring.map(v=>blend(v,center,.085));
    for(let i=0;i<ring.length;i++){
      const j=(i+1)%ring.length;
      const skin=(u,v)=>norm(add(center,add(mul(sub(inset[i],center),u),mul(sub(inset[j],center),v))));
      for(let a=0;a<segments;a++)for(let b=0;b<segments-a;b++){
        const t=clamp((a+b)/(segments-1),0,1),shade=1-.085*t+.028*Math.sin((i+1)*2.1+dot(norm(center),[3,1,2]));
        const color=mul(white?[.98,.88,.72]:[.84,.14,.13],shade);
        const p=skin(a/segments,b/segments),q=skin((a+1)/segments,b/segments),r=skin(a/segments,(b+1)/segments);
        face(p,q,r,color);
        if(a+b<segments-1)face(q,skin((a+1)/segments,(b+1)/segments),r,color);
      }
      for(let s=0;s<segments;s++){
        const a=s/segments,b=(s+1)/segments;
        const outer=t=>blend(ring[i],ring[j],t);
        const inner=t=>blend(inset[i],inset[j],t);
        const dark=t=>mul(norm(outer(t)),.997);
        const groove=t=>mul(norm(blend(outer(t),inner(t),.76)),.999);
        const lip=t=>norm(inner(t));
        face(dark(a),dark(b),groove(b),seam);
        face(dark(a),groove(b),groove(a),seam);
        face(groove(a),groove(b),lip(b),edge);
        face(groove(a),lip(b),lip(a),edge);
      }
    }
  }

  for(const normal of [[0,.12,1],[0,-.12,-1]].map(norm)){
    const up=[0,1,0],right=norm(cross(up,normal)),vertical=cross(normal,right);
    const bolt=[[-.39,.38],[.42,.38],[.10,.04],[.42,.04],[-.35,-.54],[-.11,-.09],[-.53,-.09]];
    const project=([x,y])=>mul(norm(add(normal,add(mul(right,x),mul(vertical,y)))),1.009);
    const center=project([-.04,.07]);
    for(let i=0;i<bolt.length;i++)face(center,project(bolt[i]),project(bolt[(i+1)%bolt.length]),[1.0,.60,.10]);
  }
  return mesh(data);
}
const geo={matchBall:matchBall(),sphere:sphere(),fine:sphere(18,12),box:box(),cyl:cylinder(),taper:cylinder(1,.78),leg:cylinder(.85,1),disc:disc(),targetRing:targetRing()};let staticData=[];
function bake(g,p,r,s,color){let m=transform(p,r,s);for(let i=0;i<g.data.length;i+=9){let v=point(m,g.data.slice(i,i+3)),n=norm([m[0]*g.data[i+3]+m[4]*g.data[i+4]+m[8]*g.data[i+5],m[1]*g.data[i+3]+m[5]*g.data[i+4]+m[9]*g.data[i+5],m[2]*g.data[i+3]+m[6]*g.data[i+4]+m[10]*g.data[i+5]]);staticData.push(...v,...n,...color)}}
function draw(g,m,color=[1,1,1,1],kind=0){gl.bindBuffer(gl.ARRAY_BUFFER,g.buffer);for(let [n,off] of [['aP',0],['aN',12],['aC',24]]){gl.enableVertexAttribArray(loc[n]);gl.vertexAttribPointer(loc[n],3,gl.FLOAT,false,36,off)}gl.uniformMatrix4fv(loc.uM,false,m);gl.uniform4fv(loc.uColor,color.length===3?[...color,1]:color);gl.uniform1f(loc.uKind,kind);gl.drawArrays(gl.TRIANGLES,0,g.count)}
const white=[.92,.94,.85],navy=[.055,.075,.12],skin=[.68,.43,.28],hair=[.075,.045,.03],lime=[.84,1,.36];
function bar(a,b,r=.045,color=white){let delta=sub(b,a),l=Math.hypot(...delta),dir=norm(delta),axis=cross([0,1,0],dir),angle=Math.acos(clamp(dir[1],-1,1));let m=I();if(Math.hypot(...axis)>.0001){let [x,y,z]=norm(axis),c=Math.cos(angle),s=Math.sin(angle),t=1-c;m=new Float32Array([t*x*x+c,t*x*y+s*z,t*x*z-s*y,0,t*x*y-s*z,t*y*y+c,t*y*z+s*x,0,t*x*z+s*y,t*y*z-s*x,t*z*z+c,0,0,0,0,1])}else if(dir[1]<0)m=transform([0,0,0],[Math.PI,0,0]);for(let i=0;i<3;i++){m[i]*=r;m[4+i]*=l;m[8+i]*=r}let p=mul(add(a,b),.5);m[12]=p[0];m[13]=p[1];m[14]=p[2];for(let i=0;i<geo.cyl.data.length;i+=9){let v=point(m,geo.cyl.data.slice(i,i+3));let n=norm([m[0]*geo.cyl.data[i+3]+m[4]*geo.cyl.data[i+4]+m[8]*geo.cyl.data[i+5],m[1]*geo.cyl.data[i+3]+m[5]*geo.cyl.data[i+4]+m[9]*geo.cyl.data[i+5],m[2]*geo.cyl.data[i+3]+m[6]*geo.cyl.data[i+4]+m[10]*geo.cyl.data[i+5]]);staticData.push(...v,...n,...color)}}
function stripe(a,b,w=.10){
  const delta=sub(b,a),length=Math.hypot(...delta);
  const angle=[0,Math.atan2(delta[0],delta[2]),0],center=mul(add(a,b),.5);
  bake(geo.box,[center[0],.012,center[2]],angle,[w+.064,.008,length],art.ink);
  bake(geo.box,[center[0],.022,center[2]],angle,[w,.009,length],[1,.88,.65]);
}
const halfWidth=footballPitch.width/2, fieldLength=footballPitch.length, midfield=footballPitch.centerZ;
const endPaths=[
  [[-20.16,0],[-20.16,16.5],[20.16,16.5],[20.16,0]],
  [[-9.16,0],[-9.16,5.5],[9.16,5.5],[9.16,0]]
];
const paths=[
  [[-halfWidth,0],[halfWidth,0],[halfWidth,fieldLength],[-halfWidth,fieldLength],[-halfWidth,0]],
  [[-halfWidth,midfield],[halfWidth,midfield]],
  ...endPaths,...endPaths.map(path=>path.map(([x,z])=>[x,fieldLength-z]))
];
for(const path of paths)for(let i=1;i<path.length;i++)stripe([path[i-1][0],0,path[i-1][1]],[path[i][0],0,path[i][1]]);
for(const [center,radius,begin,size] of [[11,9.15,.645,Math.PI-1.29],[midfield,9.15,0,Math.PI*2],[fieldLength-11,9.15,Math.PI+.645,Math.PI-1.29]]){
  for(let i=0;i<60;i++){
    const a=begin+size*i/60,b=begin+size*(i+1)/60;
    stripe([Math.cos(a)*radius,0,center+Math.sin(a)*radius],[Math.cos(b)*radius,0,center+Math.sin(b)*radius],.085);
  }
}
for(const z of [11,midfield,fieldLength-11])bake(geo.disc,[0,.026,z],[0,0,0],[.13,1,.13],[1,.88,.65]);

const concrete=[.29,.36,.37],steel=[.071,.105,.149],copper=[.63,.24,.13],amber=[.98,.59,.21];
for(const side of [-1,1]){
  const x=side*3.66;
  bar([x,0,0],[x,2.44,0],.06,[.96,.84,.66]);
  bar([x,0,0],[x,.24,0],.061,copper);
  bar([x,2.22,0],[x,2.44,0],.061,amber);
  bar([x,.04,0],[x,.04,-2.4],.038,steel);
  bar([x,2.44,0],[x,2.15,-2.4],.034,steel);
  bar([x,.03,-2.4],[x,2.15,-2.4],.038,concrete);
  bar([x,0,fieldLength],[x,2.44,fieldLength],.06,[.96,.84,.66]);
  bar([x,.04,fieldLength],[x,.04,fieldLength+2.4],.038,steel);
  bar([x,2.44,fieldLength],[x,2.15,fieldLength+2.4],.034,steel);
}
bar([-3.66,2.44,0],[3.66,2.44,0],.06,[.96,.84,.66]);
bar([-3.66,2.44,fieldLength],[3.66,2.44,fieldLength],.06,[.96,.84,.66]);
bar([-3.66,2.15,-2.4],[3.66,2.15,-2.4],.031,steel);
const boardY=.92,boardZ=-3.6;
for(const side of [-1,1]){
  for(let i=0;i<4;i++){
    const x=side*(6.4+i*5.7);
    for(const offset of [-1.9,1.9])bake(geo.box,[x+offset,.13,boardZ],[0,0,0],[.16,.26,.30],steel);
    bake(geo.box,[x,boardY,boardZ],[0,0,0],[5.48,1.34,.26],steel);
    bake(geo.box,[x,boardY,boardZ+.16],[0,0,0],[5.29,1.14,.11],i%2?copper:[.18,.35,.40]);
    for(let k=-2;k<3;k++)bake(geo.box,[x+k*.79,boardY,boardZ+.224],[0,0,-.30],[.30,.82,.036],i%2?amber:[.35,.49,.49]);
  }
}
const fieldMesh=mesh(staticData);staticData=[];

let randomSeed=187;
function rng(){randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296}
const audienceColors=[[.21,.43,.47],[.69,.25,.16],[.91,.62,.27],[.63,.66,.58],[.29,.29,.43],[.12,.37,.38],[.84,.63,.45]];
const brasaSeats=[];

for(let row=0;row<9;row++){
  const y=1.42+row*.74,z=-13.0-row*1.32;
  bake(geo.box,[0,y-.34,z],[0,0,0],[98,.66,1.4],row%2?concrete:[.34,.41,.41]);
  bake(geo.box,[0,y-.024,z+.71],[0,0,0],[98,.068,.071],steel);
  for(let bay=-4;bay<=4;bay++){
    const x=bay*10;
    bake(geo.box,[x,y-.025,z],[0,0,0],[.9,.15,1.14],amber);
    for(let seat=0;seat<9;seat++){
      const gap=(seat-4)*.91;
      if(Math.abs(gap)>.59&&rng()>.15)brasaSeats.push({x:x+gap,y:y+.415,z:z+(rng()-.5)*.31,rotation:0,visitor:false});
    }
  }
}
for(const side of [-1,1]){
  for(let row=0;row<7;row++){
    const x=side*(38.6+row*1.02),y=1.19+row*.66;
    bake(geo.box,[x,y-.36,23],[0,0,0],[1.14,.72,88],row%2?concrete:[.34,.41,.41]);
    bake(geo.box,[x-side*.56,y-.018,23],[0,0,0],[.085,.08,88],steel);
    for(let seat=0;seat<69;seat++){
      const z=-18+seat*1.19;
      if(seat%10!==0&&rng()>.27)brasaSeats.push({x,y:y+.425,z,rotation:-side*Math.PI*.5,visitor:side>0&&z>22});
    }
  }
  if(side<0){
  for(const z of [-14,7,28,49,66]){
    const x=side*45.0;
    bake(geo.box,[x,5.2,z],[0,0,0],[.38,10.5,.38],steel);
    bar([x,10.54,z],[side*37,9.31,z],.11,steel);
    bar([x,8.02,z],[side*37,9.31,z],.07,copper);
  }
  bake(geo.box,[side*42,9.95,22],[0,0,-side*.12],[8.8,.45,93],steel);
  bake(geo.box,[side*37.55,9.43,22],[0,0,0],[.26,.33,93],copper);
  }
  const x=side*32,z=-17;
  bar([x,0,z],[x,22,z],.20,steel);
  bar([x-1.28,8,z],[x,22,z],.13,concrete);
  bar([x+1.28,8,z],[x,22,z],.13,concrete);
  bake(geo.box,[x,21.1,z],[.13,0,0],[4.5,2.0,.44],steel);
  for(let row=0;row<2;row++)for(let col=0;col<6;col++){
    bake(geo.box,[x+(col-2.5)*.67,20.70+row*.73,z+.29],[.13,0,0],[.51,.52,.14],[1,.89,.59]);
  }
}

const glyphs={
  A:[14,17,17,31,17,17,17],B:[30,17,17,30,17,17,30],E:[31,16,16,30,16,16,31],
  I:[31,4,4,4,4,4,31],L:[16,16,16,16,16,16,31],N:[17,25,25,21,19,19,17],O:[14,17,17,17,17,17,14],
  R:[30,17,17,30,20,18,17],S:[15,16,16,14,1,1,30],T:[31,4,4,4,4,4,4],V:[17,17,17,17,17,10,4],
  '1':[4,12,4,4,4,4,14],'0':[14,19,21,21,21,25,14]
};
function lettering(label,x,y,z,unit,color){
  const line=(label.length*6-1)*unit;
  for(const [i,char] of [...label].entries()){
    const rows=glyphs[char];
    if(!rows)continue;
    rows.forEach((bits,row)=>{
      for(let col=0;col<5;col++)if(bits&(16>>col)){
        bake(geo.box,[x-line*.5+(i*6+col+.5)*unit,y+(3-row)*unit,z],[0,0,0],[unit*1.02,unit*1.02,.041],color);
      }
    });
  }
}
function poster(x,y,z,width,height,message,background,foreground,unit){
  bake(geo.box,[x,y,z],[0,0,0],[width,height,.38],art.ink);
  bake(geo.box,[x,y,z+.23],[0,0,0],[width-.23,height-.23,.07],background);
  for(const sign of [-1,1]){
    bake(geo.box,[x+sign*(width*.5-.39),y,z+.274],[0,0,-sign*.16],[.13,height*.66,.033],foreground);
  }
  lettering(message,x,y,z+.28,unit,foreground);
}
poster(0,9.62,-25.3,18.6,3.87,'ARENA BRASA',copper,[1,.83,.46],.255);
poster(-15,1.04,-6.55,9.6,1.7,'TREINO LIVRE',steel,[.94,.69,.28],.115);
poster(15,1.04,-6.55,9.6,1.7,'GOAT',copper,[1,.86,.55],.133);
const brasaMesh=mesh(staticData);staticData=[];
const identity=I();
const goalNet=window.createFootballNet({gl,loc,I});

// ===== Torcedores 3D com a mesma estética e anatomia dos jogadores =====
const crowdExt=gl.getExtension('ANGLE_instanced_arrays');
const crowdSupported=!!crowdExt;
const fanAttributes=[['aP',3,0],['aN',3,12],['aC',3,24],['aFanPart',3,36]];
const fanInstanceAttributes=['aFanPose','aFanPrimary','aFanSecondary','aFanSkin'];

function uploadFloats(data){
  const buffer=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
  return buffer;
}
const crowdAnimationVariants=[0,1,2,2,2,2,2,2];
let fanModels,fanPalettes,idleFanPalette;
let crowdState={lods:[],signature:''};
function disposeCrowd(){
  for(const lod of crowdState.lods)gl.deleteBuffer(lod.instances);
  crowdState={lods:[],signature:''};
}
const fanSkins=['#8b4d35','#d49c78','#53322c','#9d6648','#e0a982','#b67755','#754933','#bd855e'];
const rgbOf=color=>{
  if(Array.isArray(color))return color;
  const v=parseInt(String(color||'#d4562c').slice(1),16);
  return[(v>>16&255)/255,(v>>8&255)/255,(v&255)/255];
};
const MAX_FANS=7800,MAX_NEAR=6800;

function buildCrowd(seats,occupancy,homeKit,awayKit,signature,original=false){
  disposeCrowd();
  crowdState.signature=signature;
  if(!crowdSupported||!seats?.length)return;
  const noise=window.goatStadiums?.crowdNoise||(s=>((Math.sin(s)*43758.5453)%1+1)%1);
  const usable=seats.map((seat,index)=>({seat,index:seat.sourceIndex??index})).filter(({seat})=>original||seat.z<155);
  const ranked=usable.map(({seat,index})=>{
    const group=Math.imul(Math.floor(seat.x/7),73856093)^Math.imul(Math.floor(seat.z/7),19349663)^Math.imul(Math.floor(seat.y/3),83492791);
    const distance=Math.hypot(seat.x*.8,seat.z-16);
    return{seat,index,distance,rank:(noise(group)*.35+noise(index+17)*.65)*(1+distance/85)};
  });
  if(!original){
    ranked.sort((a,b)=>a.rank-b.rank);
    ranked.length=Math.min(MAX_FANS,Math.floor(ranked.length*clamp(occupancy,0,1)));
  }
  const groups=[0,1].map(()=>crowdAnimationVariants.map(()=>[]));
  let nearby=0;
  const rows=new Map();
  for(const item of ranked){
    const key=Math.round(item.seat.y*20);
    if(!rows.has(key))rows.set(key,[]);
    rows.get(key).push(item);
  }
  const packedSeats=[];
  for(const row of rows.values()){
    const buckets=new Map();
    for(const item of row){
      const key=Math.floor(item.seat.x/3)+':'+Math.floor(item.seat.z/3);
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push(item);
    }
    for(const {seat,index,distance} of row){
      const tx=Math.cos(seat.rotation),tz=-Math.sin(seat.rotation);
      let nextSeat=null,best=Infinity;
      const bx=Math.floor(seat.x/3),bz=Math.floor(seat.z/3);
      for(let ix=-1;ix<=1;ix++)for(let iz=-1;iz<=1;iz++){
        for(const other of buckets.get((bx+ix)+':'+(bz+iz))??[]){
          const dx=other.seat.x-seat.x,dz=other.seat.z-seat.z;
          const along=dx*tx+dz*tz,across=Math.abs(dx*tz-dz*tx);
          if(along>.65&&along<3&&across<.25&&along<best){nextSeat=other.seat;best=along;}
        }
      }
      const offset=nextSeat?Math.min(1.1,best*.5):.48;
      packedSeats.push({seat,index:index*2,distance});
      packedSeats.push({seat:{...seat,x:seat.x+tx*offset,z:seat.z+tz*offset},index:index*2+1,distance});
    }
  }
  for(const {seat,index,distance} of packedSeats){
    const visitor=seat.visitor??((Math.atan2(seat.z-52.5,seat.x)+Math.PI)/(Math.PI*2)<.3);
    const kit=visitor?awayKit:homeKit;
    const variation=noise(index+29);
    let primary,secondary;
    if(kit){
      const p=rgbOf(kit.primary),s=rgbOf(kit.secondary);
      if(variation<.20){primary=s;secondary=p;}
      else{primary=p;secondary=s;}
    }else{
      primary=audienceColors[Math.floor(noise(index+31)*audienceColors.length)];
      secondary=audienceColors[Math.floor(noise(index+47)*audienceColors.length)];
    }
    const skinCol=rgbOf(fanSkins[Math.floor(noise(index+97)*fanSkins.length)]);
    const hairRoll=noise(index+211),hairIdx=hairRoll<.50?0:hairRoll<.82?1:hairRoll<.94?2:3;
    const seed=noise(index+911),variant=Math.min(crowdAnimationVariants.length-1,Math.floor(seed*crowdAnimationVariants.length));
    const size=.93+noise(index+53)*.13;
    const yaw=seat.rotation+(original?0:(noise(index+61)-.5)*.28);
    const row=[
      seat.x,seat.y-.425,seat.z,yaw,
      primary[0],primary[1],primary[2],seed,
      secondary[0],secondary[1],secondary[2],size,
      skinCol[0],skinCol[1],skinCol[2],hairIdx
    ];
    const lod=distance<62&&nearby<MAX_NEAR?0:1;
    if(lod===0)nearby++;
    groups[lod][variant].push(row);
  }
  groups.forEach((variants,lod)=>variants.forEach((rows,variant)=>{
    if(!rows.length)return;
    const data=new Float32Array(rows.length*16);
    rows.forEach((row,i)=>data.set(row,i*16));
    crowdState.lods.push({lod,variant,instances:uploadFloats(data),count:rows.length});
  }));
}

const arenaMeshes=new Map();
let cityMesh=null;
let arena={id:'arena-brasa',mesh:brasaMesh,fog:111,ground:[160,230,midfield],homeKit:null,awayKit:null};
function kitSignature(home,away){
  return home&&away?[home.primary,home.secondary,away.primary,away.secondary].join('|'):'neutro';
}
function applyStadium(id,home=null,away=null,withCrowd=true){
  const S=window.goatStadiums;
  if(!S?.byId[id])id='arena-brasa';
  const signature=id+'#'+kitSignature(home,away)+'#'+withCrowd;
  if(arena.id===id&&crowdState.signature===signature)return;
  if(id==='arena-brasa'){
    arena={id,mesh:brasaMesh,fog:115,ground:[160,230,midfield],homeKit:home,awayKit:away};
    buildCrowd(withCrowd?brasaSeats:[],.96,home,away,signature);
  }else{
    if(!arenaMeshes.has(id)){
      const built=S.build(id);
      const layers=built.layers.map(({vertices,opacity})=>({mesh:mesh(vertices),opacity}));
      arenaMeshes.set(id,{...built,layers});
    }
    const built=arenaMeshes.get(id);
    arena={id,layers:built.layers,aerialBounds:built.aerialBounds,fog:built.fog,ground:[360,480,midfield],homeKit:home,awayKit:away};
    buildCrowd(withCrowd?built.seats:[],1,home,away,signature,true);
  }
}
function drawStadium(){
  if(!arena.layers){draw(arena.mesh,identity);return;}
  for(const layer of arena.layers){
    if(layer.opacity<1){
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
    }
    draw(layer.mesh,identity,[1,1,1,layer.opacity]);
    if(layer.opacity<1){gl.depthMask(true);gl.disable(gl.BLEND);}
  }
}
function drawStadiumCity(){
  if(cityMesh?.id!==arena.id){
    if(cityMesh)gl.deleteBuffer(cityMesh.buffer);
    const {buffer,count}=mesh(window.buildStadiumCity(arena.id,arena.aerialBounds));
    cityMesh={id:arena.id,buffer,count};
  }
  draw(cityMesh,identity);
}
function matchStadium(match,club,opponent){
  const S=window.goatStadiums;
  if(!S||!club||!opponent)return;
  const homeClub=match?.kind==='trial'||match?.home!==false?club:opponent;
  const awayClub=homeClub===club?opponent:club;
  const stId=match?.kind==='trial'?'arena-brasa':S.forClub(homeClub,match?.round||0);
  applyStadium(stId,
    {primary:homeClub.primary,secondary:homeClub.secondary},
    {primary:awayClub.primary,secondary:awayClub.secondary},!match?.training&&match?.kind!=='training');
}
function applyTrainingStadium(stadiumId){
  const S=window.goatStadiums;
  const valid=S?.byId[stadiumId]?stadiumId:'arena-brasa';
  if(trainingDefense)trainingDefense.stadiumId=valid;
  const club=trainingDefense?.club;
  const homeKit=club?{primary:club.primary,secondary:club.secondary}:{primary:'#d4562c',secondary:'#f4ddac'};
  const awayKit={primary:'#334f78',secondary:'#f4f4f4'};
  applyStadium(valid,homeKit,awayKit,!trainingDefense?.fromCareer);
  $('#trainingStadium').textContent='Estádio: '+(S?.byId[valid]?.name??'Arena Brasa');
}
applyStadium('arena-brasa',{primary:'#d4562c',secondary:'#f4ddac'},{primary:'#294553',secondary:'#f4ddac'});

function crowdAnimationTime(){
  if(careerReplay)return careerReplay.time-careerReplay.goalAt;
  if(replaying&&replayFrames?.length){
    const frame=replayFrames[Math.min(replayFrames.length-1,Math.floor(replayIndex))];
    return frame.crowdAge??-1;
  }
  const conceded=careerPlay?.transition?.scoreUpdate;
  if(conceded?.age>=.48)return conceded.age-.48;
  return result?.type==='goal'?result.t:-1;
}

const crowdCelebrations=window.FOOTBALL_CROWD_CELEBRATIONS;
function prepareFanModels(){
  fanModels=[6.5,13].map(cell=>{
    const {vertices,indices}=mocap.crowdMesh(cell),elements=gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
    return {buffer:uploadFloats(vertices),elements,count:indices.length};
  });
  fanPalettes=crowdAnimationVariants.map(()=>new Float32Array(mocap.crowdBoneCount*16));
  idleFanPalette=new Float32Array(mocap.crowdBoneCount*16);
  mocap.crowdPose('idle',0,0,idleFanPalette);
}

function drawSupporters(){
  if(!crowdSupported||!crowdState.lods.length)return;
  if(!fanModels)prepareFanModels();
  const age=crowdAnimationTime();
  const celebrating=Number.isFinite(age)&&age>=0&&age<3.35;
  const palettes=crowdAnimationVariants.map((clipIndex,variant)=>{
    if(!celebrating&&variant>=3)return idleFanPalette;
    const key=crowdCelebrations[celebrating?clipIndex:0],clip=mocap.clips[key];
    const phase=celebrating?Math.max(0,age-(clip.loop?(variant-2)*.085:variant*.12)):
      (performance.now()*.00053+variant*.41)%clip.duration;
    const time=clip.loop?phase%clip.duration:Math.min(phase,clip.duration);
    const weight=celebrating?smooth(phase/.22)*(1-smooth((age-2.44)/.91)):.16;
    const palette=fanPalettes[variant];
    mocap.crowdPose(key,time,weight,palette);
    return palette;
  });
  gl.uniform1f(loc.uFanMode,1);
  gl.uniformMatrix4fv(loc.uM,false,identity);
  gl.uniform4f(loc.uColor,1,1,1,1);
  gl.uniform1f(loc.uKind,0);
  for(const lod of crowdState.lods){
    const model=fanModels[lod.lod];
    gl.uniformMatrix4fv(loc['uFanBones[0]'],false,palettes[lod.variant]);
    gl.bindBuffer(gl.ARRAY_BUFFER,model.buffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,model.elements);
    for(const [name,size,offset] of fanAttributes){
      gl.enableVertexAttribArray(loc[name]);
      gl.vertexAttribPointer(loc[name],size,gl.FLOAT,false,48,offset);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER,lod.instances);
    fanInstanceAttributes.forEach((name,i)=>{
      gl.enableVertexAttribArray(loc[name]);
      gl.vertexAttribPointer(loc[name],4,gl.FLOAT,false,64,i*16);
      crowdExt.vertexAttribDivisorANGLE(loc[name],1);
    });
    crowdExt.drawElementsInstancedANGLE(gl.TRIANGLES,model.count,gl.UNSIGNED_SHORT,0,lod.count);
    for(const name of fanInstanceAttributes){
      crowdExt.vertexAttribDivisorANGLE(loc[name],0);
      gl.disableVertexAttribArray(loc[name]);
    }
  }
  gl.disableVertexAttribArray(loc.aFanPart);
  gl.uniform1f(loc.uFanMode,0);
}
function node(name,p=[0,0,0]){return{name,p,r:[0,0,0],s:[1,1,1],children:[],meshes:[],world:I()}}
function attach(parent,child){parent.children.push(child);return child}
function part(n,g,p,s,c,r=[0,0,0]){n.meshes.push({g,p,s,c,r})}
function makeHuman(goalie=false){let root=node('root'),hips=attach(root,node('hips',[0,1,0])),spine=attach(hips,node('spine',[0,.07,0])),neck=attach(spine,node('neck',[0,.63,0])),bones={root,hips,spine,neck},shirt=goalie?[.85,.11,.48]:[.048,.20,.59],shorts=goalie?[.09,.08,.11]:[.041,.14,.43];
part(hips,geo.sphere,[0,-.015,0],[.23,.17,.15],shorts);part(spine,geo.taper,[0,.24,0],[.25,.49,.155],shirt);part(spine,geo.sphere,[0,.43,0],[.26,.18,.15],shirt);part(spine,geo.cyl,[0,.54,0],[.105,.045,.1],navy);part(neck,geo.cyl,[0,.005,0],[.073,.14,.073],skin);part(neck,geo.fine,[0,.19,-.012],[.135,.178,.13],skin);part(neck,geo.sphere,[0,.292,.007],[.139,goalie?.09:.12,.135],goalie?[.17,.105,.063]:hair);part(neck,geo.box,[0,.22,.108],[.22,goalie?.055:.11,.04],goalie?[.17,.105,.063]:hair);part(neck,geo.sphere,[0,.185,-.145],[.037,.044,.032],skin);
for(let side of [-1,1]){part(neck,geo.sphere,[side*.136,.19,0],[.027,.045,.025],skin);part(neck,geo.box,[side*.05,.213,-.133],[.037,.015,.012],[.04,.04,.035]);part(neck,geo.box,[side*.05,.239,-.127],[.047,.009,.018],hair);let arm=attach(spine,node(side<0?'leftArm':'rightArm',[side*.29,.46,0])),fore=attach(arm,node('forearm',[0,-.29,0])),hand=attach(fore,node('hand',[0,-.27,0]));part(arm,geo.taper,[0,-.07,0],[.105,.18,.105],shirt);part(arm,geo.leg,[0,-.21,0],[.072,.22,.075],skin);part(fore,geo.leg,[0,-.115,0],[.062,.26,.065],skin);part(hand,geo.sphere,[0,-.045,-.01],goalie?[.09,.105,.058]:[.048,.08,.035],goalie?[.96,.84,.16]:skin);if(goalie){part(hand,geo.box,[0,-.06,-.05],[.135,.13,.03],[.98,.86,.18]);part(fore,geo.cyl,[0,-.23,0],[.067,.055,.067],[.12,.11,.14])}let thigh=attach(hips,node(side<0?'leftThigh':'rightThigh',[side*.135,-.05,0])),shin=attach(thigh,node('shin',[0,-.45,0])),foot=attach(shin,node('foot',[0,-.4,0]));part(thigh,geo.taper,[0,-.11,0],[.13,.25,.14],shorts);part(thigh,geo.leg,[0,-.32,0],[.088,.27,.092],skin);part(shin,geo.leg,[0,-.09,0],[.075,.20,.08],skin);part(shin,geo.leg,[0,-.27,0],[.069,.27,.075],goalie?[.85,.11,.48]:[.041,.195,.60]);part(shin,geo.cyl,[0,-.2,0],[.071,.025,.076],navy);part(foot,geo.sphere,[0,-.03,-.065],[.082,.065,.16],goalie?[.92,.84,.57]:[.89,.25,.16]);part(foot,geo.box,[0,-.074,-.065],[.15,.028,.25],[.065,.075,.08]);part(foot,geo.box,[0,.018,-.13],[.11,.012,.045],white);bones[side<0?'la':'ra']=arm;bones[side<0?'le':'re']=fore;bones[side<0?'lh':'rh']=hand;bones[side<0?'lt':'rt']=thigh;bones[side<0?'lk':'rk']=shin;bones[side<0?'lf':'rf']=foot}
if(!goalie){for(let side of [-1,1])part(spine,geo.box,[side*.105,.26,-.157],[.06,.43,.012],navy);for(let side of [-1,1])part(spine,geo.box,[side*.1,.45,-.162],[.085,.035,.014],[.89,.72,.22]);part(spine,geo.box,[-.07,.29,.16],[.025,.2,.014],navy);for(let x of [.025,.12])part(spine,geo.box,[x,.29,.16],[.022,.2,.014],navy);for(let y of [.2,.38])part(spine,geo.box,[.073,y,.16],[.10,.025,.014],navy)}else{part(spine,geo.box,[0,.30,.16],[.035,.22,.014],navy);part(spine,geo.box,[0,.4,-.16],[.30,.06,.014],navy)}
root.s=[.95,.95,.95];return{root,b:bones,goalie,phase:0,pose:{},x:0,z:goalie?.65:18,y:0,yaw:goalie?Math.PI:0}}
const playerShirtNumber=10,keeperShirtNumber=1;
const outfieldShirtNumbers=[2,3,4,5,6,7,8,9,11,12];
const player={...makeHuman(),canCrossEndLine:true,shirtNumber:playerShirtNumber};
const keeper={...makeHuman(true),shirtNumber:keeperShirtNumber};
const support={...makeHuman(),support:true,shirtNumber:8};
const teammates=[support,...[7,9,11].map(shirtNumber=>({...makeHuman(),support:true,shirtNumber}))];
const defenders=outfieldShirtNumbers.slice(0,8).map((shirtNumber,defenderIndex)=>({...makeHuman(),defender:true,defenderIndex,shirtNumber}));
const [defender]=defenders;
const mocap=window.createFootballMocap?.({gl,shader,mm,transform,point,I});
teammates.forEach(actor=>mocap.useIndependentRig(actor));
const freeKickAllies=[7,8,9,11].map(shirtNumber=>({...makeHuman(),shirtNumber}));
freeKickAllies.forEach(actor=>mocap.useIndependentRig(actor));
const replayActors=[player,keeper,...defenders.slice(0,5),support,...defenders.slice(5),...freeKickAllies,...teammates.slice(1)];
const replaySupportIndex=replayActors.indexOf(support);
const replayRigSize=11+mocap.boneCount*4;
const replayHeader=17;
const replayInterval=1/30;
const motion=window.createFootballMotionController({clips:mocap.clips});
const keeperZones=window.goatGoalkeeperZones;
keeperZones.prepareClips(mocap.clips,mocap.scale);
function renderNode(n,parent=I(),drawIt=true){n.world=mm(parent,transform(n.p,n.r,n.s));if(drawIt)for(let m of n.meshes)draw(m.g,mm(n.world,transform(m.p,m.r,m.s)),m.c);for(let c of n.children)renderNode(c,n.world,drawIt)}
function neutral(){return{hipY:0,hipX:0,hipZ:0,bodyX:0,bodyY:0,bodyZ:0,laX:0,raX:0,laZ:-.13,raZ:.13,leX:-.18,reX:-.18,ltX:0,rtX:0,ltZ:0,rtZ:0,lkX:0,rkX:0,lfX:0,rfX:0,headX:0}}
function poseHuman(h,p,dt){let k=1-Math.exp(-dt*20);for(let name in p)h.pose[name]=mix(h.pose[name]??p[name],p[name],k);let q=h.pose,b=h.b;h.root.p=[h.x,h.y,h.z];h.root.r=[0,h.yaw,h.roll||0];b.hips.p=[0,1+q.hipY,0];b.hips.r=[q.hipX,0,q.hipZ];b.spine.r=[q.bodyX,q.bodyY,q.bodyZ];b.neck.r=[q.headX,0,0];b.la.r=[q.laX,0,q.laZ];b.ra.r=[q.raX,0,q.raZ];b.le.r=[q.leX,0,0];b.re.r=[q.reX,0,0];b.lt.r=[q.ltX,0,q.ltZ];b.rt.r=[q.rtX,0,q.rtZ];b.lk.r=[q.lkX,0,0];b.rk.r=[q.rkX,0,0];b.lf.r=[q.lfX,0,0];b.rf.r=[q.rfX,0,0];renderNode(h.root,I(),false)}
let W=innerWidth,H=innerHeight,started=false,paused=false,clock=0,last=0,keys={},prevPad={},charge=0,charging=false,windup=null,shot=null,result=null,ballPos=[-.12,.11,17.58],ballVel=[0,0,0],ballSpin=0,moveSpeed=0,aim={x:0,y:1.15},stats={goals:0,saves:0,shots:0,posts:0},camMode=loadCameraPreference().mode,camera=[24,9.6,23.4],cameraTarget=[0,.83,12.2],replaying=false,record=[],replayIndex=0,replaySaved=null,audioCtx,soundReady=false,dive=null,toastTimer=0,netRipple=0,keeperLabel='EM POSIÇÃO',frameMs=16;
let ballState='controlled',touchCooldown=0,skillHeld=false,requestedVolley=false,ballAge=0,lastTouchSide=1,chargeYaw=0,chargeVelocity=[0,0],controlOffset=[-.12,-.42],dribbleClock=0,postCooldown=0,placedShot=false,chargePlaced=false;
let chargeRun,chargeChip=false;
let shotTap=false,shotButtonHeld=false,pendingRunDirection=null;
let firstTimeCharge=null;
let throughCharge=null,throughButtonHeld=false,throughTap=false,crossButtonHeld=false,crossTap=false,passButtonHeld=false,chipGraceUntil=-1;
let fakeShotTap=false,fakeShotCanceled=false,fakeCut=null;
const keeperReactionPadding=.75, nearMissHold=1.15, postResultHold=1.4, endLineGrace=2.5;
let hitGoalFrame=false;
let firstTimeRequest=null,headerSpecs=null;
let menu,careerPlay=null,previewLook=null,previewOrbit=0,previewYaw=0;
let careerReplay=null;
let trainingDefense=null, trainingDefenderCount=0, trainingTeammateCount=readTrainingCompanions(), trainingFadeUntil=0, trainingClip=null, replayFrames=null;
function readTrainingCompanions(){
  try{const saved=JSON.parse(localStorage.getItem('goat-training-team-v1'));return Number.isInteger(saved)?clamp(saved,1,3):2;}catch{return 2;}
}
const activeDefense=()=>careerPlay??trainingDefense;
const activeSetPiece=()=>activeDefense()?.piece;
const activeShootout=()=>activeDefense()?.shootout;
const careerRules=window.goatCareerSeason;
const enableCareerSupport=true;
const opponentAttribute=value=>clamp(((value??70)-70)/20,-1,1);
const careerSpawns=[[-6,44],[5,47],[0,41],[-25,34],[26,37],[-9,36],[8,40],[-27,29],[24,31],[1,32]];
let trainingSpawnIndex=0;
let aimViewProjection=null,passAimScreen={x:0,y:0,active:false},passAimPreview=null;
const baseAttributes=window.goatCareerSeason.defaultAttributes;
const mark=()=>activeDefense()?.shootoutAttributes??activeDefense()?.attributes??baseAttributes;
const playerPace=sprint=>sprint?3.05+mark().speed*.032:2.15+mark().speed*.015;
const staminaCapacity=()=>28+mark().stamina*.92;
function nearBall(range=1.25){return Math.hypot(ballPos[0]-player.x,ballPos[2]-player.z)<range}
function terminal(){
  const type=result?.type;
  return ballState==='goal'||ballState==='held'||!!careerPlay?.transition?.outcome||
    type==='miss'||type==='out'||type==='postOut'||type==='foul'||type==='offside';
}
function clearFirstTimeShot(){firstTimeCharge=null;firstTimeRequest=null}
function shotInProgress(){
  if(windup&&!windup.fired&&windup.t<=windup.contact+.18)return true;
  if(!shot||shot.goalChecked||terminal()||!['flight','loose'].includes(ballState))return false;
  if(shot.stopped&&!hitGoalFrame&&ballVel[2]>=-.25)return false;
  if(hitGoalFrame&&ballPos[2]>1.8&&ballVel[2]>.25)return false;
  return ballPos[1]>.14||Math.hypot(...ballVel)>.4;
}
function resize(){W=innerWidth;H=innerHeight;let scale=Math.min(devicePixelRatio||1,1.5);canvas.width=W*scale;canvas.height=H*scale;canvas.style.width=W+'px';canvas.style.height=H+'px';gl.viewport(0,0,canvas.width,canvas.height)}addEventListener('resize',resize);resize();
function isCareerTraining(){return !!(trainingDefense?.fromCareer||careerPlay?.match?.training||careerPlay?.match?.kind==='training')}
function sound(f,d=.15,type='sine',volume=.06){if(!soundReady||isCareerTraining())return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();audioCtx.resume();let o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(f,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(20,f*.4),audioCtx.currentTime+d);g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d)}catch{}}
const matchAudio=window.createMatchAudio($('#goalCheerAudio'),$('#stadiumAmbienceAudio'),
  ()=>audioCtx??=new(window.AudioContext||window.webkitAudioContext)());
let eventRatingDelta=0;
function setEventRating(delta){
  eventRatingDelta=Math.round(delta*10)/10;
  const badge=$('#eventRatingDelta');
  badge.hidden=eventRatingDelta===0;
  badge.dataset.tone=eventRatingDelta<0?'loss':'gain';
  badge.textContent=eventRatingDelta===0?'':(eventRatingDelta<0?'−':'+')+Math.abs(eventRatingDelta).toFixed(1).replace('.',',');
}

function clearAnnouncement(){
  $('#message').textContent='';
  $('#submessage').textContent='';
  setEventRating(0);
}

function announce(text,sub,color='#ffbf57',ratingDelta=0){
  $('#message').textContent=text;
  $('#message').style.color=color;
  $('#submessage').textContent=sub;
  setEventRating(ratingDelta);
  toastTimer=3.8;
}

function addResultRating(delta){
  if(!delta)return;
  if($('#message').textContent)setEventRating(eventRatingDelta+delta);
  else announce('NOTA DO LANCE','',undefined,delta);
}
function updateStats(){for(let [k,v] of Object.entries(stats)){let el=$('#'+k);if(el)el.textContent=String(v).padStart(2,'0')}}
function reset(){player.aerialFlight=null;keeper.aerialFlight=null;mocap?.resetBody(player);mocap?.resetBody(keeper);throughCharge=null;throughButtonHeld=false;throughTap=false;crossButtonHeld=false;crossTap=false;firstTimeRequest=null;headerSpecs=null;teamAI.reset(0);player.teamAction=null;shotTap=false;shotButtonHeld=false;chargeChip=false;fakeShotTap=false;fakeShotCanceled=false;fakeCut=null;clearFirstTimeShot();motion.reset(player);player.skipBootSweep=true;player.vx=0;player.vz=0;player.tackleReact=null;player.foulTrip=null;player.aerialAction=null;moveSpeed=0;player.dribbleIntent=false;player.touchPending=null;chargePlaced=false;ballAngular.fill(0);ballRotation.fill(0);dribbleClock=0;postCooldown=0;hitGoalFrame=false;ballState='controlled';ballAge=0;controlOffset=[.18,-.52];requestedVolley=false;touchCooldown=0;goalNet.reset();shot=null;windup=null;result=null;charge=0;charging=false;dive=null;keeper.x=0;keeper.z=.65;keeper.y=0;keeper.roll=0;keeper.yaw=Math.PI;keeper.trackSpeed=0;keeper.trackMirror=false;keeper.rush=0;keeper.vx=0;keeper.vz=0;keeper.readVx=0;keeper.readVz=0;keeper.feintStun=0;keeper.smotherCooldown=0;keeper.lastFakeCut=null;keeper.previousContacts=null;keeper.passClaim=null;keeper.passCooldown=0;keeper.recoverUntil=0;keeper.lastCarrier=null;keeper.pose={};keeperLabel='EM POSIÇÃO';controlOffset=[-Math.sin(player.yaw)*.42-Math.cos(player.yaw)*.12,-Math.cos(player.yaw)*.42+Math.sin(player.yaw)*.12];ballPos=[player.x+controlOffset[0],.11,player.z+controlOffset[1]];ballVel=[0,0,0];clearAnnouncement();toastTimer=0;record=[];replaying=false;$('#replayTag').hidden=true;$('#replay').disabled=true}
function clearMatchFade(){
  $('#matchFade').style.opacity='0';
  $('#matchFade').hidden=true;
}

function standardPosition(){
  matchAudio.stopCheer();
  Object.assign(player,{x:0,y:0,z:18,yaw:0,roll:0,phase:0,pose:{},shirtNumber:playerShirtNumber});
  reset();
  Object.assign(aim,{x:0,y:1.15});
}

function startMovingChance(x,z,yaw,lane){
  Object.assign(player,{x,z,yaw});
  motion.reset(player);
  const forward=[-Math.sin(yaw),-Math.cos(yaw)],right=[-forward[1],forward[0]];
  const pace=2.12;
  [player.vx,player.vz]=forward.map(value=>value*pace);
  moveSpeed=pace;
  player.dribbleIntent=true;
  player.spawnControl={elapsed:0,lane:lane*.12,auto:true,forward,pace};
  controlOffset=forward.map((value,i)=>value*.54+right[i]*player.spawnControl.lane);
  ballPos=[x+controlOffset[0],.11,z+controlOffset[1]];
  ballVel=[player.vx,0,player.vz];
  mocap.update(player,motion.locomotion(player,{dt:.065,ball:ballPos,velocity:ballVel,controlled:true}),1);
}

function advanceOpeningCarry(dt){
  const opening=player.spawnControl;
  if(!opening?.auto||ballState!=='controlled')return;
  moveSpeed=motion.move(player,{dt,direction:opening.forward,speed:opening.pace,
    sprint:false,ball:ballPos,velocity:ballVel,controlled:true});
  guideDribble(dt,true,player.turningAround);
  clock+=dt;
  keeperAnimation(dt);
  updateMocap(dt);
  physics(dt);
}

function startField(mode){
  started=true;
  paused=false;
  previewLook=null;
  previewOrbit=0;
  document.body.dataset.mode=mode;
  $('#paused').hidden=true;
  $('#trainingModes').hidden=mode!=='training';
  $('#trainingStadium').hidden=mode!=='training';
  $('#trainingPlayerSetup').hidden=mode!=='training'||trainingDefense.fromCareer;
  $('#leaveGame').textContent=mode==='career'||trainingDefense?.fromCareer?'Voltar à carreira':'Voltar ao menu';
  $('#trainingDefense').hidden=mode!=='training'||trainingDefense.mode!=='open';
  $('#trainingTeammates').hidden=mode!=='training'||trainingDefense.mode!=='open';
  $('#start').hidden=true;
  keys={};
  soundReady=true;
  if(camMode==='side'&&!careerPlay?.piece)[camera,cameraTarget]=sideCamera();
  canvas.focus();
  matchAudio.start(!isCareerTraining());
  if(activeShootout())matchAudio.whistle();
}

function startTraining({attributes=baseAttributes,appearance=null,dominantFoot='RightFoot',fromCareer=false,club=null,stadiumId='arena-brasa',playerName='Você'}={}){
  careerPlay=null;
  trainingDefense={defenders:[],slideCooldown:0,mode:'open',piece:null,placement:null,kickAngle:0,
    attributes:{...attributes},dominantFoot,fromCareer,club,stadiumId,appearance,playerName};
  applyTrainingStadium(stadiumId);
  refreshTrainingMenu();
  trainingClip=null;
  player.appearance=appearance;
  keeper.appearance=keeperKit(null,false);
  $('#matchRibbon').hidden=true;
  $('#matchRating').hidden=true;
  const opponent=resolveOpponentKit(appearance,{primary:'#af4939',secondary:'#33233d',pattern:'solid'});
  defenders.forEach(actor=>actor.appearance=opponent);
  Object.assign(stats,{goals:0,saves:0,shots:0,posts:0});
  updateStats();
  startField('training');
  resetTraining();
}

function updateTrainingPlayer({attributes,dominantFoot,stadiumId}){
  if(!trainingDefense||trainingDefense.fromCareer)return;
  const remaining=trainingDefense.stamina/staminaCapacity();
  trainingDefense.attributes={...attributes};
  trainingDefense.dominantFoot=dominantFoot;
  trainingDefense.stamina=remaining*staminaCapacity();
  if(stadiumId)applyTrainingStadium(stadiumId);
}

function initDefender(actor,position,attributes){
  const tackling=opponentAttribute(attributes?.tackling);
  Object.assign(actor,{...position,role:position.role??(['ZAG','ZAG','VOL','LE','LD'][position.index??0]??'ZAG'),phase:0,duelTime:0,action:null,aerialFlight:null,aerialBlock:null,aerialReceive:null,markActor:null,defenseRole:null,grip:null,gripDelay:0,blockTarget:null,blockWeight:0,fkBehavior:position.fkBehavior??null,
    settings:{
      pace:5.3+.95*opponentAttribute(attributes?.speed),
      windup:.13-.045*tackling,
      retry:.40-.15*tackling,
      combat:1.08+.30*tackling,
      aggression:1+.42*opponentAttribute(attributes?.aggression),
      intelligence:opponentAttribute(attributes?.intelligence)
    }});
  motion.reset(actor);
  mocap.get(actor).key=null;
  mocap.update(actor,{clip:'idle',grounded:true,fade:.001},1);
}

function resetTraining(instant=false){
  if(!trainingDefense)return;
  if(replaying)stopReplay();
  if(record.length>=15)trainingClip=record;
  standardPosition();
  player.appearance=trainingDefense.appearance;
  keeper.appearance=keeperKit(null,false);
  const trainOpp=resolveOpponentKit(trainingDefense.appearance,{primary:'#af4939',secondary:'#33233d',pattern:'solid'});
  defenders.forEach(actor=>actor.appearance=trainOpp);
  $('#matchRibbon').hidden=true;
  player.grip=player.pressure=player.pressureTime=0;
  player.gripActor=null;
  Object.assign(trainingDefense,{slideCooldown:0,clearanceUntil:0,piece:null,placement:null,kickAngle:0,wallSide:0,awaitRelease:false,
    shootout:null,shootoutBot:null,shootoutTurn:null,shootoutHold:null,shootoutFinished:false,
    shootoutLanes:[],shootoutLastLane:null,shootoutAttributes:null,goalkeeper:null,match:null,
    stamina:staminaCapacity(),exhausted:false,sprinting:false,shownStamina:undefined});
  if(trainingDefense.mode==='freeKick'){
    trainingDefense.placement={...(trainingDefense.freeKickSpot??{x:0,z:20})};
    trainingDefense.defenders=[];
    const {x,z}=trainingDefense.placement;
    ballPos=[x,.11,z];
    [camera,cameraTarget]=freeKickPlacementCamera();
  }else if(trainingDefense.mode==='shootout'){
    startTrainingShootout(trainingDefense);
  }else if(trainingDefense.mode==='penalty'){
    startTrainingSetPiece({kind:'penalty',x:0,z:11});
  }else if(trainingDefense.mode==='noBall'){
    Object.assign(player,{x:0,z:18,yaw:0,vx:0,vz:0,skipBootSweep:true,spawnControl:null});
    motion.reset(player);
    ballState='none';
    ballPos=[0,-10,0];
    ballVel=[0,0,0];
    ballAngular.fill(0);
    trainingDefense.defenders=[];
    mocap.update(player,{clip:'idle',grounded:true,fade:.001},1);
    announce('TREINO SEM BOLA','Corra, dê arrancadas e mude de direção livremente.');
  }else{
    const [sx,sz]=careerSpawns[trainingSpawnIndex++%careerSpawns.length];
    startMovingChance(sx,sz,Math.atan2(sx,sz),sx<0?-1:1);
    trainingDefense.wideAttack=Math.abs(sx)>19;
    trainingDefense.staminaDistanceScale=clamp(10.5/Math.max(10.5,Math.hypot(sx,sz-16.5)),.35,1);
    trainingDefense.defenders=defenders.slice(0,trainingDefenderCount);
    const layout=[[-6.2,11],[6.2,12.5],[0,24],[-18,19],[18,19]];
    const roles=['ZAG','ZAG','VOL','LE','LD'];
    trainingDefense.defenders.forEach((actor,index)=>{
      const [x,z]=layout[index];
      initDefender(actor,{x,z,role:roles[index],yaw:Math.atan2(x,z-player.z),vx:0,vz:0,index,homeLane:x,retry:.5+index*.14});
    });
  }
  teamAI.reset(trainingDefense.mode==='open'?trainingTeammateCount:0);
  if(!trainingDefense.placement&&!activeShootout())matchAudio.whistle();
  if(instant){
    trainingFadeUntil=0;
    if(trainingDefense.mode==='open'&&camMode==='side')[camera,cameraTarget]=sideCamera();
    clearMatchFade();
    return;
  }
  trainingFadeUntil=performance.now()+380;
  $('#matchFade').style.opacity='1';
  $('#matchFade').hidden=false;
}

function refreshTrainingMenu(){
  const mode=trainingDefense.mode;
  $('#trainingDefense').hidden=mode!=='open';
  $('#trainingTeammates').hidden=mode!=='open';
  for(const button of $('#trainingTeammates').querySelectorAll('button'))button.setAttribute('aria-pressed',String(Number(button.dataset.teammates)===trainingTeammateCount));
  for(const button of $('#trainingModes').querySelectorAll('button')){
    button.setAttribute('aria-pressed',String(button.dataset.practice===mode));
  }
}

function positionSetPieceKicker(piece){
  const yaw=Math.atan2(piece.x,piece.z);
  const x=piece.x+Math.sin(yaw)*.63,z=piece.z+Math.cos(yaw)*.63;
  Object.assign(player,{x,z,yaw,vx:0,vz:0,skipBootSweep:true});
  motion.reset(player);
  controlOffset=[piece.x-x,piece.z-z];
  ballPos=[piece.x,.11,piece.z];
  ballVel=[0,0,0];
  ballAngular.fill(0);
  ballState='controlled';
  moveSpeed=0;
  mocap.update(player,{clip:'idle',grounded:true,fade:.001},1);
}

function positionSetPieceWall(defense,piece){
  defense.wallSide=0;
  defense.humanWall=[];
  defense.wallGuard=null;
  defense.defenders=[];
  if(piece.kind!=='freeKick')return;

  const distance=Math.hypot(piece.x,piece.z),yaw=Math.atan2(piece.x,piece.z);
  const seed=defense.match?((defense.match.scenario??0)+Math.imul(defense.match.used+1,2654435761))>>>0:
    Math.floor(Math.random()*4294967296);
  const random=index=>((Math.imul(seed^Math.imul(index+1,2246822519),3266489917)^seed>>>13)>>>0)/4294967296;
  const side=defense.wallSide=piece.x>1?1:-1;
  const count=distance<21?5:distance<27?4:3;
  const position=(lateral,depth)=>({x:clamp(piece.x-Math.sin(yaw)*depth+Math.cos(yaw)*lateral,-halfWidth+1,halfWidth-1),
    z:clamp(piece.z-Math.cos(yaw)*depth-Math.sin(yaw)*lateral,2,fieldLength/2-1)});
  const occasionalStay=random(0)<.27?Math.floor(random(1)*count):-1;
  defense.humanWall=defenders.slice(0,count);
  defense.humanWall.forEach((actor,index)=>{
    const p=position(side*(.04+index*.64),9.16+(index%2)*.045);
    initDefender(actor,{...p,yaw:Math.atan2(p.x-piece.x,p.z-piece.z),vx:0,vz:0,index,role:'BAR',
      wallStance:Math.floor(random(4+index)*4),wallJump:index!==occasionalStay,wallTiming:(random(11+index)-.5)*.108,
      wallLift:.25+random(18+index)*.14,wallPhase:random(25+index)*Math.PI*2,wallClock:0});
  });
  const hasGuard=random(2)<(distance<26?.43:.22);
  if(hasGuard){
    const actor=defense.wallGuard=defenders[count];
    const p=position(side*(count-1)*.32,9.91);
    initDefender(actor,{...p,yaw:yaw+(side>0?0:Math.PI),vx:0,vz:0,index:count,role:'BAR'});
    mocap.update(actor,{clip:'fallen',time:.96,loop:false,authoredGround:true,fade:.001},1);
    const rig=mocap.get(actor);
    const middle=mul(add(rig.chest,rig.ankles[0]),.5);
    actor.x+=p.x-middle[0];actor.z+=p.z-middle[2];
    mocap.update(actor,{clip:'fallen',time:.96,loop:false,authoredGround:true,
      fade:.001},1);
  }

  const markers=defenders.slice(count+Number(hasGuard));
  defense.defenders=[...defense.humanWall,...(hasGuard?[defense.wallGuard]:[]),...markers];
  const baseDuelSpots=[[-side*(4.8+random(31)*1.6),12.2+random(32)*2.0],[side*(6.2+random(33)*1.8),13.6+random(34)*2.0]];
  const extraMarkerSpots=[[-side*(8.4+random(35)*1.8),14.8+random(36)*2.0],[side*(9.0+random(37)*1.8),12.4+random(38)*1.8],[-side*(7.8+random(39)*1.8),11.6+random(40)*1.6]];
  const extraAllySpots=[[-side*(9.4+random(41)*1.6),15.2+random(42)*1.8],[side*(7.4+random(43)*1.8),11.8+random(44)*1.6]];
  const duelCount=Math.min(2,markers.length,freeKickAllies.length);
  const lateralAxis=[Math.cos(yaw),-Math.sin(yaw)];
  const depthAxis=[-Math.sin(yaw),-Math.cos(yaw)];
  const safeSpot=(lateral,depth)=>{
    let p=position(lateral,depth);
    const dx=p.x-piece.x,dz=p.z-piece.z,dist=Math.hypot(dx,dz);
    if(dist<9.8){
      const altLat=lateral>=0?-Math.abs(lateral)-3:Math.abs(lateral)+3;
      p=position(altLat,Math.max(depth,12.2));
    }
    return p;
  };

  markers.forEach((actor,index)=>{
    const isDuel=index<duelCount;
    const spot=isDuel?baseDuelSpots[index]:extraMarkerSpots[(index-duelCount)%extraMarkerSpots.length];
    const p=safeSpot(spot[0],spot[1]);
    initDefender(actor,{...p,yaw:Math.atan2(p.x-piece.x,p.z-piece.z),vx:0,vz:0,index,role:'ZAG',
      fkBehavior:isDuel
        ? {kind:'duel',partner:freeKickAllies[index],homeX:p.x,homeZ:p.z,phase:random(50+index)*Math.PI*2,
           sideSign:index%2?1:-1,lat:lateralAxis,dep:depthAxis,clock:0}
        : {kind:'strafe',homeX:p.x,homeZ:p.z,phase:random(60+index)*Math.PI*2,
           amp:.95+random(65+index)*.75,speed:.72+random(70+index)*.36,lat:lateralAxis,dep:depthAxis,clock:0,animTime:index*.32}});
    mocap.update(actor,{clip:'idle',time:index*.32,grounded:true,fade:.001},1);
  });
  freeKickAllies.forEach((actor,index)=>{
    const isDuel=index<duelCount;
    let p;
    if(isDuel){
      const marker=markers[index];
      const offsetSign=index%2?-1:1;
      p={x:clamp(marker.x+lateralAxis[0]*offsetSign*.76-depthAxis[0]*.18,-halfWidth+1.5,halfWidth-1.5),
         z:clamp(marker.z+lateralAxis[1]*offsetSign*.76-depthAxis[1]*.18,2.4,fieldLength/2-1.5)};
    }else{
      const spot=extraAllySpots[(index-duelCount)%extraAllySpots.length];
      p=safeSpot(spot[0],spot[1]);
    }
    Object.assign(actor,{...p,y:0,roll:0,vx:0,vz:0,yaw:Math.atan2(p.x-piece.x,p.z-piece.z),
      fkReaction:null,
      fkBehavior:isDuel
        ? {kind:'duel',partner:markers[index],homeX:p.x,homeZ:p.z,phase:markers[index].fkBehavior.phase+Math.PI*.45,
           sideSign:index%2?-1:1,lat:lateralAxis,dep:depthAxis,clock:0}
        : {kind:'strafe',homeX:p.x,homeZ:p.z,phase:random(80+index)*Math.PI*2,
           amp:1.05+random(85+index)*.75,speed:.78+random(90+index)*.34,lat:lateralAxis,dep:depthAxis,clock:0,animTime:.14+index*.41}});
    actor.appearance={...player.appearance,skin:['#b9754d','#d39a72','#754933','#9d6648'][index],
      hair:index+1,primary:player.appearance?.primary??'#3b69a4',secondary:player.appearance?.secondary??'#22304e'};
    mocap.update(actor,{clip:'idle',time:.14+index*.41,grounded:true,fade:.001},1);
  });
}

function startTrainingSetPiece(piece){
  Object.assign(trainingDefense,{piece,placement:null,kickAngle:0});
  if(piece.kind==='freeKick')trainingDefense.goalkeeper={jump:76,reflex:76};
  positionSetPieceKicker(piece);
  positionSetPieceWall(trainingDefense,piece);
  placeSetPieceKeeper();
  mocap.update(keeper,{clip:'keeperIdle',grounded:true,fade:.001},1);
  updateWallPose(1);
  [camera,cameraTarget]=setPieceCamera();
  if(piece.kind==='freeKick')matchAudio.whistle();
  announce(piece.kind==='penalty'?'PÊNALTI':'FALTA COM BARREIRA','Ajuste a direção e segure X para cobrar.');
}

function freeKickPlacementCamera(){
  const spot=trainingDefense.placement;
  const x=spot.x*.87,z=spot.z*.82+1.5;
  return [[x,21,z+13],[x,0,z-5.5]];
}

function validFreeKickSpot(spot){
  return Math.abs(spot.x)>20.16||spot.z>16.5;
}

function chooseFreeKickSpot(dt,mx,mz,pressed,held){
  const spot=trainingDefense.placement;
  const prior=[spot.x,spot.z];
  const {side,front,back}=motion.limits;
  spot.x=clamp(spot.x+mx*dt*8.2,-side+.65,side-.65);
  spot.z=clamp(spot.z+mz*dt*8.2,front+.18,Math.min(back-.78,31.2));
  ballPos=[spot.x,.11,spot.z];
  ballRotation[0]+=(spot.z-prior[1])/.11;
  ballRotation[2]-=(spot.x-prior[0])/.11;
  if(pressed&&validFreeKickSpot(spot)){
    trainingDefense.freeKickSpot={...spot};
    trainingDefense.awaitRelease=held;
    startTrainingSetPiece({kind:'freeKick',...spot});
  }
}

function updateTrainingFade(now){
  if(!trainingFadeUntil)return;
  const remaining=trainingFadeUntil-now;
  if(remaining>0){
    $('#matchFade').style.opacity=clamp(remaining/300,0,1);
    return;
  }
  trainingFadeUntil=0;
  clearMatchFade();
}

function chancePosition(){
  standardPosition();
  const play=careerPlay,match=play.match;
  const code=(match.scenario??0)+match.used*3;
  const challenge=match.training?.type;
  const preset=challenge==='penalty'?{kind:'penalty',x:0,z:11}:challenge==='freeKick'?{kind:'freeKick',x:[-6,0,6][code%3],z:20+code%5}:
    challenge?null:code%7===4?{kind:'freeKick',x:[-6,0,6][code%3],z:19+code%6}:null;
  const piece=play.piece=match.penalty?{kind:'penalty',x:0,z:11}:match.setPiece??preset;
  prepareRating(play);
  const lane=code%2?-1:1;
  const enteringBox=false;
  play.kickAngle=0;
  if(!piece)play.wallSide=0;
  if(piece)positionSetPieceKicker(piece);
  else{
    const [x,z]=challenge==='outside'?[6*lane,23]:challenge==='finesse'?[3*lane,15.8]:enteringBox?[2.65*lane,15.6]:careerSpawns[code%careerSpawns.length];
    startMovingChance(x,z,Math.atan2(x,z),lane);
  }
  const {x,z}=player;
  play.wideAttack=!piece&&Math.abs(x)>19;
  const routeDistance=Math.hypot(x,Math.max(0,z-16.5));
  play.staminaDistanceScale=piece||challenge?1:clamp(10.5/Math.max(10.5,routeDistance),.35,1);
  play.chanceDuration=piece||challenge?10:Math.round(13+Math.max(0,routeDistance-10.5)/2.6);
  const difficulty=match.difficulty;
  const rotation=code%8;
  const baseCount=difficulty==='hard'?[3,3,4,4,4,5,5,4][rotation]:
    difficulty==='easy'?[2,2,2,3,3,4,2,2][rotation]:[2,3,3,3,4,5,4,3][rotation];
  play.teammateCount=1+((match.scenario??0)+match.used)%3;
  const count=!piece&&(!challenge||challenge==='collective')?play.teammateCount+2:baseCount;
  if(piece)positionSetPieceWall(play,piece);
  else play.defenders=defenders.slice(0,count);
  if(challenge==='freeKick'){
    play.defenders=[...play.humanWall,...(play.wallGuard?[play.wallGuard]:[])];
  }else if(challenge&&challenge!=='collective'){
    play.defenders=[];play.humanWall=[];play.wallGuard=null;play.wallSide=0;
  }
  const central=Math.min(count,2);
  const order=['VOL',...(code%2?['LD','LE']:['LE','LD'])];
  const roles=Array.from({length:count},(_,i)=>i<central?'ZAG':order[(i-central)%order.length]);
  if(!piece)play.defenders.forEach((actor,i)=>{
    const role=roles[i];
    const runner=enteringBox&&i===0;
    const [dx,dz]=role==='ZAG'?(i===0?(runner?[3.6*lane,5.0]:[3.05*lane,5.45]):[-3.65*lane,7.30]):
      role==='VOL'?[.65*lane,4.95]:[role==='LE'?-7.4:7.4,7.4];
    const regular=!challenge;
    const mx=regular?(role==='ZAG'?(i===0?3.8:-4.5):role==='VOL'?x*.35:role==='LE'?-17:17):clamp(x+dx,-motion.limits.side+1,motion.limits.side-1);
    const mz=regular?(role==='ZAG'?(i===0?10.5:13.5):role==='VOL'?Math.min(z-9,27):Math.min(z-8,21)):z-dz;
    const approach=runner?norm([x+player.vx*.42-mx,z+player.vz*.42-mz]):[0,0];
    const attributes=window.goatCareerSeason.defensiveProfile(play.opponent,role,role==='ZAG'?i:0);
    initDefender(actor,{x:mx,z:mz,yaw:runner?Math.atan2(-approach[0],-approach[1]):Math.atan2(mx-x,mz-z),
      vx:approach[0]*2.65,vz:approach[1]*2.65,index:i,homeLane:dx,role,retry:runner?0:.33+i*.13},attributes);
  });
  player.grip=player.pressure=player.pressureTime=0;
  player.gripActor=null;
  play.stamina=staminaCapacity();
  play.exhausted=false;
  play.slideCooldown=0;
  play.clearanceUntil=0;
  play.sprinting=false;
  play.teammateCount=1+((match.scenario??0)+match.used)%3;
  teamAI.reset(piece||challenge&&challenge!=='collective'?0:play.teammateCount);
  Object.assign(support,{pass:null});
  motion.reset(support);
  mocap.get(support).key=null;
  mocap.update(support,{clip:'idle',grounded:true,fade:.001},1);
  Object.assign(stats,{goals:0,saves:0,shots:0,posts:0});
  play.remaining=play.chanceDuration??10;
  play.endLineGraceUsed=0;
  play.clockLabel='';
  if(piece){
    placeSetPieceKeeper();
    updateWallPose(1);
    [camera,cameraTarget]=setPieceCamera();
    announce(piece.kind==='penalty'?'PÊNALTI':'FALTA COM BARREIRA','Ajuste a direção pela câmera e carregue o chute.');
  }
  if(!piece&&camMode==='side')[camera,cameraTarget]=sideCamera();
  mocap.update(keeper,{clip:'keeperIdle',grounded:true,fade:.001},1);
  updateStats();
}

function paintShootoutBoard(play,timer){
  const so=play.shootout,match=play.match;
  const board=$('#shootoutBoard');
  $('#matchRibbon').classList.toggle('is-shootout',!!so);
  board.hidden=!so;
  if(!so)return;
  const club=play.shootoutClub??play.club;
  const home=match.home?club:play.opponent,away=match.home?play.opponent:club;
  const homeKicks=match.home?so.userKicks:so.oppKicks,awayKicks=match.home?so.oppKicks:so.userKicks;
  const signature=JSON.stringify([home.id,away.id,match.forGoals,match.against,so.userScore,so.oppScore,homeKicks,awayKicks,so.winner]);
  if(board.dataset.score!==signature){
    board.dataset.score=signature;
    $('#shootoutHomeName').textContent=home.name;
    $('#shootoutAwayName').textContent=away.name;
    $('#shootoutHomeBadge').innerHTML=window.goatClubBadge.render(home,38);
    $('#shootoutAwayBadge').innerHTML=window.goatClubBadge.render(away,38);
    $('#shootoutHomeMatch').textContent=(match.home?match.forGoals:match.against)??0;
    $('#shootoutAwayMatch').textContent=(match.home?match.against:match.forGoals)??0;
    $('#shootoutHomeScore').textContent=match.home?so.userScore:so.oppScore;
    $('#shootoutAwayScore').textContent=match.home?so.oppScore:so.userScore;
    const most=Math.max(homeKicks.length,awayKicks.length);
    const slots=Math.max(5,most+Number(!so.winner&&most>=5&&homeKicks.length===awayKicks.length));
    for(const [selector,kicks] of [['#shootoutHomeKicks',homeKicks],['#shootoutAwayKicks',awayKicks]]){
      const dots=Array.from({length:slots},(_,i)=>{
        const dot=document.createElement('span'),kick=kicks[i];
        dot.className='shootout-dot'+(kick?(kick.scored?' is-goal':' is-miss'):'');
        dot.textContent=kick?(kick.scored?'✓':'×'):'';
        dot.setAttribute('aria-label',`${i+1}ª cobrança, ${kick?(kick.scored?'gol':'perdida'):'aguardando'}`);
        return dot;
      });
      $(selector).replaceChildren(...dots);
    }
  }
  const turn=play.shootoutTurn;
  $('#shootoutTurnLabel').textContent=`${turn.suddenDeath?'Alternados':`${turn.order}ª cobrança`} · ${turn.isUser?'Sua vez!':turn.kicker.name} · ${timer}`;
}

function paintMatch(play=careerPlay){
  if(!play)return;
  paintObjectives(play);
  const match=play.match;
  const lineup=$('#lineupStatus');
  lineup.hidden=play!==careerPlay||!!match.training||!!play.transition?.intro;
  if(!lineup.hidden)lineup.textContent=`${match.lineup?.label??'Titular'} · ${Math.round(match.lineup?.points??60)}/100 pontos · Titular a partir de 60${match.date?' · '+new Date(match.date+'T12:00:00').toLocaleDateString('pt-BR'):''}`;
  const so=play.shootout;
  const against=play.scorePreview??match.against;
  const score=so
    ?(match.home?`${so.userScore} × ${so.oppScore}`:`${so.oppScore} × ${so.userScore}`)
    :(match.home?`${match.forGoals} × ${against}`:`${against} × ${match.forGoals}`);
  const chance=Math.min(match.chances,match.used+1);
  const timer=(Math.ceil(play.remaining*10)/10).toFixed(1).replace('.',',')+' s';
  paintShootoutBoard(play,timer);
  if(play.scoreLabel!==score){$('#matchScore').textContent=score;play.scoreLabel=score;}
  const prefix=play.piece?(play.piece.kind==='penalty'?'Pênalti · ':'Falta · '):'';
  const chanceLabel=so
    ?`${play.shootoutTurn.suddenDeath?'Alternados':'Pênaltis'} · ${play.shootoutTurn.order}ª cobrança`
    :`${prefix}Chance ${chance} de ${match.chances}`;
  if(play.chanceLabel!==chanceLabel){$('#matchChance').textContent=chanceLabel;play.chanceLabel=chanceLabel;}
  if(play.clockLabel!==timer){
    $('#matchClock').textContent=timer;
    $('#matchClock').classList.toggle('is-urgent',play.remaining<=3);
    play.clockLabel=timer;
  }
}

function startCareerMatch(match,club,opponent,appearance,attributes,replayKey){
  if(!match.training)careerRules.ensureObjectives(match);
  careerPlay={match,club,opponent,appearance,attributes:attributes??baseAttributes,
    goalkeeper:window.goatCareerSeason.defensiveProfile(opponent,'GOL'),remaining:10,transition:{elapsed:0,opening:true},
    replayKey};
  trainingDefense=null;
  matchStadium(match,club,opponent);
  setMatchKits(appearance,club,opponent);
  const tags=[match.isFinal?'FINAL':null,match.isClassic?'CLÁSSICO':null].filter(Boolean).join(' · ');
  const baseLabel=match.kind==='trial'?'Seletiva':`${match.competitionShort??('Série '+club.league)} · ${match.phaseLabel??('Rodada '+match.round)} · ${match.home?'Casa':'Fora'}`;
  $('#matchLabel').textContent=tags?`${tags} · ${baseLabel}`:baseLabel;
  $('#matchClubs').textContent=match.home?`${club.name} × ${opponent.name}`:`${opponent.name} × ${club.name}`;
  $('#matchRibbon').hidden=false;
  $('#matchFade').style.opacity='1';
  $('#matchFade').hidden=false;
  chancePosition();
  const play=careerPlay;
  if(!match.training&&match.used===0&&!match.penalty&&!match.setPiece&&!match.introSeen)startMatchIntro(play);
  if(replayKey&&(match.penalty||match.setPiece)){
    play.loadingReplay=true;
    window.careerReplayStore.read(replayKey,match.used+1).then(clip=>{
      if(careerPlay===play&&!play.capture&&clip?.partial)play.resumeClip=clip;
      play.loadingReplay=false;
    });
  }
  paintMatch();
  startField('career');
  if(play.transition.intro)advanceMatchIntro(play,0);
}

function startShootoutKick(match,club,opponent,appearance,attributes){
  careerPlay={match,shootout:match.shootout,club,opponent,appearance,attributes:attributes??baseAttributes,replayKey:null};
  trainingDefense=null;
  matchStadium(match,club,opponent);
  clearMatchFade();
  prepareShootoutTurn(careerPlay);
  startField('career');
}

function startTrainingShootout(play){
  play.shootoutClub=play.club??careerRules.trials[0];
  play.opponent=careerRules.team('rival');
  play.match={kind:'training',opponent:play.opponent.id,home:true,scenario:Math.floor(Math.random()*0x7fffffff)};
  play.shootout=careerRules.createShootout({club:play.shootoutClub.id,player:{name:play.playerName}},play.match);
  play.shootoutLanes=[];
  play.shootoutLastLane=null;
  prepareShootoutTurn(play);
}

function aimShootoutBot(play,skill){
  if(!play.shootoutLanes?.length)play.shootoutLanes=[-1,0,1];
  const alternatives=play.shootoutLanes.filter(lane=>lane!==play.shootoutLastLane);
  const available=alternatives.length?alternatives:play.shootoutLanes;
  const lane=available[Math.floor(Math.random()*available.length)];
  play.shootoutLanes.splice(play.shootoutLanes.indexOf(lane),1);
  play.shootoutLastLane=lane;

  const high=Math.random()<.5;
  const scatter=clamp(1+(70-skill)*.012,.65,1.5);
  let x=lane*2.55+(Math.random()-.5)*.75*scatter;
  let y=(high?1.84:.39)+(Math.random()-.5)*.30*scatter;
  if(Math.random()<.10){
    if(lane)x=lane*(3.63+Math.random()*.37);
    else y=2.40+Math.random()*.42;
  }
  return {x,y};
}

function kitRgb(hex){
  const clean=String(hex??'').replace('#','');
  if(!/^[0-9a-f]{6}$/i.test(clean))return [128,128,128];
  const n=parseInt(clean,16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}
function kitColorDist(a,b){
  const [r1,g1,b1]=kitRgb(a),[r2,g2,b2]=kitRgb(b);
  const rm=(r1+r2)/2,dr=r1-r2,dg=g1-g2,db=b1-b2;
  return Math.sqrt((2+rm/256)*dr*dr+4*dg*dg+(2+(255-rm)/256)*db*db);
}
function kitsClash(a,b){
  if(!a?.primary||!b?.primary)return false;
  const pDist=kitColorDist(a.primary,b.primary);
  if(pDist<230)return true;
  const aBi=a.pattern&&a.pattern!=='solid'&&a.secondary;
  const bBi=b.pattern&&b.pattern!=='solid'&&b.secondary;
  if(aBi&&bBi){
    const sDist=kitColorDist(a.secondary,b.secondary);
    const cross1=kitColorDist(a.primary,b.secondary);
    const cross2=kitColorDist(a.secondary,b.primary);
    if((pDist<300&&sDist<260)||(cross1<220&&cross2<220))return true;
  }else if(aBi&&kitColorDist(a.secondary,b.primary)<190&&pDist<310)return true;
  else if(bBi&&kitColorDist(a.primary,b.secondary)<190&&pDist<310)return true;
  return false;
}
const keeperPalette={user:'#84e61c',opponent:'#d81b7a',shorts:'#141218'};
function keeperKit(club,isUserTeam=false){
  const base=club&&window.goatCareerSeason?window.goatCareerSeason.paint({},club):{};
  return {...base,primary:isUserTeam?keeperPalette.user:keeperPalette.opponent,
    secondary:keeperPalette.shorts,tertiary:null,pattern:'solid',clubId:club?.id??null};
}
function resolveOpponentKit(userKit,opponent){
  const base=opponent?.id&&window.goatCareerSeason?window.goatCareerSeason.paint({},opponent):{...(opponent??{primary:'#af4939',secondary:'#33233d',pattern:'solid'})};
  const ref=userKit?.primary?userKit:{primary:'#f0d9a8',secondary:'#c73828',pattern:'solid'};
  if(!kitsClash(ref,base))return base;
  const avoidKeeper=hex=>Math.min(kitColorDist(hex,keeperPalette.opponent),kitColorDist(hex,keeperPalette.user));
  const clubCandidates=[];
  if(base.secondary&&kitColorDist(base.secondary,base.primary)>=90){
    clubCandidates.push({primary:base.secondary,secondary:base.primary,pattern:'solid',tertiary:null});
  }
  if(base.tertiary&&kitColorDist(base.tertiary,base.primary)>=90&&(!base.secondary||kitColorDist(base.tertiary,base.secondary)>=90)){
    clubCandidates.push({primary:base.tertiary,secondary:base.primary,pattern:'solid',tertiary:null});
  }
  if(base.pattern&&base.pattern!=='solid'&&base.primary){
    clubCandidates.push({primary:base.primary,secondary:base.secondary??base.primary,pattern:'solid',tertiary:null});
  }
  const validClub=clubCandidates.filter(opt=>!kitsClash(ref,opt)&&avoidKeeper(opt.primary)>180);
  if(validClub.length){
    validClub.sort((x,y)=>kitColorDist(ref.primary,y.primary)-kitColorDist(ref.primary,x.primary));
    return {...base,...validClub[0]};
  }
  const fallbackPool=[
    {primary:'#f4f3ee',secondary:'#1b1d26',pattern:'solid',tertiary:null},
    {primary:'#183870',secondary:'#f4f3ee',pattern:'solid',tertiary:null},
    {primary:'#f0c420',secondary:'#1b1d26',pattern:'solid',tertiary:null},
    {primary:'#1b1d26',secondary:'#f4f3ee',pattern:'solid',tertiary:null},
    {primary:'#2b8ce0',secondary:'#f4f3ee',pattern:'solid',tertiary:null},
    {primary:'#c9242b',secondary:'#f4f3ee',pattern:'solid',tertiary:null},
    {primary:'#e86a1c',secondary:'#1b1d26',pattern:'solid',tertiary:null}
  ];
  const validFallback=fallbackPool.filter(opt=>!kitsClash(ref,opt)&&avoidKeeper(opt.primary)>200);
  if(validFallback.length){
    const seedStr=String(opponent?.id??opponent?.name??base.primary??'opp');
    let hash=0;
    for(let i=0;i<seedStr.length;i++)hash=(Math.imul(hash,31)+seedStr.charCodeAt(i))>>>0;
    return {...base,...validFallback[hash%validFallback.length]};
  }
  const best=fallbackPool.slice().sort((x,y)=>{
    const sx=Math.min(kitColorDist(ref.primary,x.primary),avoidKeeper(x.primary));
    const sy=Math.min(kitColorDist(ref.primary,y.primary),avoidKeeper(y.primary));
    return sy-sx;
  })[0];
  return {...base,...best};
}

function prepareShootoutTurn(play){
  const turn=careerRules.shootoutNextTurn(play.shootout);
  const club=play.shootoutClub??play.club;
  const kicking=turn.side==='user'?club:play.opponent;
  const defending=turn.side==='user'?play.opponent:club;
  const userBase=play.appearance??careerRules.paint({},club);
  const oppKit=resolveOpponentKit(userBase,play.opponent);
  const jersey=turn.isUser?play.appearance:turn.kicker.isGK?keeperKit(kicking,turn.side==='user'):
    {...careerRules.paint({hair:turn.kickIndex%5},kicking),...(turn.side==='user'?{}:{primary:oppKit.primary,secondary:oppKit.secondary,tertiary:oppKit.tertiary,pattern:oppKit.pattern})};
  const skill=turn.kicker.overall??kicking.strength;
  standardPosition();
  setMatchKits(jersey,kicking,defending,defending===club,turn.side==='user'?userBase:oppKit);
  if(!turn.isUser)player.shirtNumber=turn.kicker.isGK?keeperShirtNumber:outfieldShirtNumbers[turn.kickIndex%(outfieldShirtNumbers.length+1)];
  if(turn.isUser&&play===trainingDefense&&!play.appearance)player.appearance.dominantFoot=play.dominantFoot;
  Object.assign(play,{shootoutTurn:turn,shootoutHold:null,shootoutFinished:false,remaining:15,piece:{kind:'penalty',x:0,z:11},
    defenders:[],wallSide:0,kickAngle:0,scoreLabel:null,clockLabel:null,chanceLabel:null,
    shootoutAttributes:turn.isUser?null:{...baseAttributes,shot:skill,composure:skill},
    goalkeeper:careerRules.defensiveProfile(defending,'GOL')});
  const target=turn.isUser?null:aimShootoutBot(play,skill);
  play.shootoutBot=target?{target,age:0,delay:.85+Math.random()*.35,power:.48+Math.random()*.25,
    angle:Math.atan2(play.piece.x-target.x,play.piece.z-footballGoalLineZ),queued:false}:null;
  positionSetPieceKicker(play.piece);
  placeSetPieceKeeper();
  mocap.update(keeper,{clip:'keeperIdle',grounded:true,fade:.001},1);
  [camera,cameraTarget]=setPieceCamera();
  if(play===careerPlay)prepareRating(play);
  $('#matchLabel').textContent=turn.isUser?'SUA VEZ DE COBRAR':turn.kicker.name;
  $('#matchClubs').textContent=play.match.home?`${club.name} × ${play.opponent.name}`:`${play.opponent.name} × ${club.name}`;
  $('#matchRibbon').hidden=false;
  paintMatch(play);
  announce(turn.isUser?'Sua Vez!':'DISPUTA DE PÊNALTIS',turn.isUser?'Mire e segure X para cobrar.':`${turn.kicker.name} · ${kicking.name}`);
}

function setMatchKits(appearance,club,opponent,isUserKeeper=false,overrideClubKit=null){
  const clubKit=overrideClubKit??appearance??window.goatCareerSeason.paint({},club);
  const oppKit=resolveOpponentKit(clubKit,opponent);
  player.appearance=appearance??clubKit;
  keeper.appearance=keeperKit(opponent,isUserKeeper);
  defenders.forEach((actor,i)=>actor.appearance={...oppKit,skin:['#8b4d35','#d49c78','#53322c','#9d6648','#e0a982','#b67755','#754933','#bd855e'][i],
    hair:[2,1,3,0,5,4,2,1][i],hairColor:'#261824',boots:'#393645'});
  support.appearance={...window.goatCareerSeason.paint({},club),skin:'#b9754d',hair:3,hairColor:'#322126',boots:'#393645'};
  freeKickAllies.forEach(actor=>actor.appearance={...actor.appearance,...window.goatCareerSeason.paint({},club)});
}

function stopFieldSession(){
  $('#lineupStatus').hidden=true;
  $('#matchObjectives').hidden=true;
  $('#objectiveIntro').hidden=true;
  closeMatchIntro();
  $('#scoreUpdate').hidden=true;
  matchAudio.stop();
  const wasCareer=!!(careerPlay||trainingDefense?.fromCareer);
  started=false;
  paused=false;
  careerPlay=null;
  careerReplay=null;
  trainingDefense=null;
  trainingFadeUntil=0;
  trainingClip=null;
  replayFrames=null;
  $('#freeKickMarker').hidden=$('#freeKickInstructions').hidden=true;
  document.body.classList.remove('placing-kick');
  player.appearance=null;
  keeper.appearance=null;
  keys={};
  $('#paused').hidden=true;
  $('#matchRibbon').hidden=true;
  $('#matchRating').hidden=true;
  $('#careerReplayBar').hidden=true;
  clearMatchFade();
  standardPosition();
  delete document.body.dataset.mode;
  return wasCareer;
}

function setCreatorPreview(appearance,orbit=0){
  if(appearance&&!previewLook){
    standardPosition();
    previewYaw=orbit;
    [camera,cameraTarget]=previewCamera();
  }
  previewLook=appearance;
  previewOrbit=orbit;
  player.appearance=appearance;
  if(!appearance&&!started)player.yaw=0;
}

const fieldOfView=Math.PI/3.25;
function creatorCameraFrame(){
  const frame=menu?.creatorFrame;
  if(menu?.screen!=='creator'||!frame)return null;
  const {stage,controls}=frame,compact=stage.width<=195;
  const top=Math.max(0,stage.top),bottom=Math.min(H,compact?controls.top-16:stage.bottom);
  const height=Math.max(40,bottom-top),width=Math.max(36,compact?stage.width-20:controls.width-132);
  const focal=H/(2*Math.tan(fieldOfView/2));
  return {x:stage.left+stage.width/2,y:top+height/2,depth:Math.max(2.90,.45+focal*1.32/width,.45+focal*2.05/height)};
}

function previewCamera(frame=creatorCameraFrame()){
  if(frame)return [[player.x-.28,1.28,player.z-frame.depth],[player.x,.91,player.z]];
  const hub=menu?.screen==='hub';
  const offset=(W/H)*(hub?.85:.48);
  return [[-.28,1.28,player.z-(hub?3.05:2.90)],[offset,.87,player.z]];
}

function pause(){if(!started||replaying||careerPlay?.transition)return;paused=!paused;keys={};throughCharge=null;throughButtonHeld=false;throughTap=false;crossButtonHeld=false;crossTap=false;shotTap=false;shotButtonHeld=false;chargeChip=false;fakeShotTap=false;fakeShotCanceled=false;fakeCut=null;clearFirstTimeShot();charging=false;charge=0;$('#paused').hidden=!paused;if(paused)$('#resume').focus();else canvas.focus();}

function startMatchIntro(play){
  const teams=play.match.home?[play.club,play.opponent]:[play.opponent,play.club];
  const userKit=play.appearance??careerRules.paint({},play.club);
  const oppKit=resolveOpponentKit(userKit,play.opponent);
  const players=teams.flatMap((team,side)=>Array.from({length:11},(_,index)=>{
    const actor=makeHuman(index===0);
    const isUserTeam=team===play.club;
    const isUser=isUserTeam&&index===4;
    if(actor.goalie){
      actor.appearance={...careerRules.paint({hair:(index+side)%6,skin:(index*3+side)%5},team),...keeperKit(team,isUserTeam)};
    }else if(isUser){
      actor.appearance=play.appearance;
    }else if(isUserTeam){
      actor.appearance=careerRules.paint({hair:(index+side)%6,skin:(index*3+side)%5},team);
    }else{
      actor.appearance={...careerRules.paint({hair:(index+side)%6,skin:(index*3+side)%5},team),
        primary:oppKit.primary,secondary:oppKit.secondary,tertiary:oppKit.tertiary,pattern:oppKit.pattern};
    }
    actor.shirtNumber=isUser?playerShirtNumber:actor.goalie?keeperShirtNumber:outfieldShirtNumbers[index-1];
    mocap.useIndependentRig(actor);
    return {actor,side,index};
  }));
  const shots=[['stands',6],['walkout',3],['anthem',3]];
  if(arena.aerialBounds)shots.unshift(['aerial',4]);
  play.transition.intro={time:0,camera,cameraTarget,teams,players,shots,confirm:!!prevPad[0],section:null};
  $('#matchIntro').hidden=false;
  $('#matchFade').style.opacity='0';
  document.body.dataset.matchIntro='true';
}

function closeMatchIntro(){
  $('#matchIntro').hidden=true;
  $('#objectiveIntro').hidden=true;
  delete document.body.dataset.matchIntro;
}

function paintObjectives(play){
  const panel=$('#matchObjectives'),intro=$('#objectiveIntro');
  const visible=play===careerPlay&&!play.shootout&&!play.match.training&&!careerReplay&&started;
  panel.hidden=!visible||!!play.transition?.intro;
  intro.hidden=play!==careerPlay||!play.transition?.intro;
  if(play!==careerPlay||play.shootout||play.match.training)return;
  const objectives=careerRules.objectiveProgress(play.match,play.ratingEvents??[],play.rating);
  const signature=JSON.stringify(objectives);
  if(panel.dataset.progress!==signature){
    panel.dataset.progress=signature;
    $('#matchObjectiveItems').innerHTML=objectives.map(objective=>{
      const progress=Math.min(objective.current,objective.target);
      const value=String(Math.round(progress*10)/10).replace('.',',');
      const target=String(objective.target).replace('.',',');
      return `<div class="match-objective${objective.complete?' is-complete':''}"><div><strong>${objective.label}</strong><small>+${objective.reward} XP${objective.type==='rating'||objective.type==='win'?' · Ao fim da partida':''}</small></div><b>${value}/${target}</b><span aria-label="${objective.complete?'Concluído':'Em andamento'}">${objective.complete?'✓':'○'}</span></div>`;
    }).join('');
  }
  const introKey=JSON.stringify(play.match.objectives);
  if(intro.dataset.objectives!==introKey){
    intro.dataset.objectives=introKey;
    $('#objectiveIntroCards').innerHTML=objectives.map((objective,index)=>`<article style="--objective-order:${index}"><h3>${objective.label}</h3><strong>${String(objective.target).replace('.',',')}</strong><span>+${objective.reward} XP</span></article>`).join('');
  }
}

function anthemTone(){
  if(!soundReady)return;
  try{
    audioCtx??=new(window.AudioContext||window.webkitAudioContext)();
    audioCtx.resume();
    const start=audioCtx.currentTime;
    const voices=[];
    for(const [i,chord] of [[196,246.94,293.66],[220,261.63,329.63],[196,246.94,392]].entries()){
      for(const frequency of chord){
        const tone=audioCtx.createOscillator(),gain=audioCtx.createGain(),time=start+i;
        tone.type='triangle';tone.frequency.value=frequency;
        gain.gain.setValueAtTime(0,time);
        gain.gain.linearRampToValueAtTime(.027,time+.13);
        gain.gain.linearRampToValueAtTime(0,time+.94);
        tone.connect(gain);gain.connect(audioCtx.destination);
        tone.start(time);tone.stop(time+1);
        voices.push(tone);
      }
    }
    return voices;
  }catch{}
}

function setAerialIntroCamera(phase,progress){
  const {center,halfSize}=arena.aerialBounds;
  const angle=mix(.38,.90,progress),elevation=mix(.69,.60,progress);
  const outward=[Math.sin(angle)*Math.cos(elevation),Math.sin(elevation),Math.cos(angle)*Math.cos(elevation)];
  const right=norm(cross([0,1,0],outward)),up=cross(outward,right);
  const viewHeight=Math.tan(fieldOfView/2)*.84,viewWidth=viewHeight*(W/H);
  let distance=Math.min(halfSize[0]/outward[0],halfSize[2]/outward[2])+20;
  for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
    const corner=[sx*halfSize[0],sy*halfSize[1],sz*halfSize[2]];
    distance=Math.max(distance,dot(corner,outward)+Math.max(Math.abs(dot(corner,right))/viewWidth,Math.abs(dot(corner,up))/viewHeight));
  }
  distance*=mix(1.13,1.03,progress);
  camera=add(center,mul(outward,distance));
  cameraTarget=center;
  phase.fogStart=distance+Math.hypot(...halfSize);
  phase.fogEnd=phase.fogStart+360;
  phase.far=phase.fogEnd+90;
}

function advanceMatchIntro(play,dt){
  paintObjectives(play);
  const phase=play.transition.intro;
  const confirm=!!connectedGamepad()?.buttons[0]?.pressed;
  phase.skip||=confirm&&!phase.confirm;
  phase.confirm=confirm;
  phase.time+=dt;
  let t=phase.time;
  const shot=phase.shots.find(([,duration])=>{
    if(t<duration)return true;
    t-=duration;
    return false;
  });
  if(!shot||phase.skip){
    for(const tone of phase.voices??[]){try{tone.stop();}catch{}}
    closeMatchIntro();
    play.match.introSeen=true;
    menu.persistIntro();
    play.transition.intro=null;
    camera=phase.camera;
    cameraTarget=phase.cameraTarget;
    clearMatchFade();
    canvas.focus();
    return;
  }
  const [section,duration]=shot,progress=smooth(t/duration);
  if(section!==phase.section){
    phase.section=section;
    phase.far=null;
    phase.fov=null;
    $('#matchIntroCaption').textContent=section==='walkout'?`${phase.teams[0].name} × ${phase.teams[1].name}`:
      section==='anthem'?'Hino':window.goatStadiums?.byId[arena.id]?.name??'GOAT';
    if(section==='anthem')phase.voices=anthemTone();
  }
  if(section==='aerial'){
    setAerialIntroCamera(phase,progress);
    return;
  }
  if(section==='stands'){
    camera=[mix(-15,-11,progress),mix(1.72,2.05,progress),midfield+mix(-14,13,progress)];
    cameraTarget=[-halfWidth-18,mix(9,12,progress),midfield+mix(-26,30,progress)];
    return;
  }
  if(section==='walkout'){
    const leadX=-halfWidth+12+t*2.5;
    camera=[leadX+2.6,4.25,midfield-10-progress*.8];
    cameraTarget=[leadX-4.8,1.06,midfield];
    phase.fov=Math.max(fieldOfView,2*Math.atan(6.1/(10*(W/H))));
    for(const {actor,side,index} of phase.players){
      Object.assign(actor,{x:leadX-index*1.02-side*.48,z:midfield+(side?.85:-.85),y:0,yaw:-Math.PI/2});
      mocap.update(actor,{clip:'standardWalk',time:t*1.17+index*.22+side*.17,loop:true,grounded:true,fade:.001},dt);
    }
    return;
  }
  const lineX=-halfWidth+10,spacing=.75,teamGap=2,slide=mix(-1.55,1.35,progress);
  camera=[-halfWidth+.6,2.25,midfield+slide];
  cameraTarget=[lineX,1.04,midfield+slide*.18];
  const lineHalfLength=10*spacing+teamGap/2;
  phase.fov=Math.max(fieldOfView,2*Math.atan((lineHalfLength+2.45)/((lineX-camera[0])*(W/H))));
  for(const {actor,side,index} of phase.players){
    const stance=(index*7+side*3)%5;
    const still=stance<=2;
    const singing=still?0:Math.sin(t*(4.3+index*.21)+index*1.7+side)*.026;
    const startZ=midfield+(side?teamGap/2:-lineHalfLength);
    Object.assign(actor,{x:lineX,z:startZ+index*spacing,y:0,yaw:Math.PI/2});
    const handOnChest=stance!==2;
    const offsets={Neck:[-.025+singing,(stance-2)*.025,0],Spine:[singing*.42,0,0]};
    if(handOnChest){
      offsets.RightArm=[-.22,0,.16];
      offsets.RightForeArm=[-.45,0,0];
    }
    mocap.update(actor,{clip:'idle',time:index*.17+(still?0:t*.45),grounded:true,fade:.06,
      offsets,
      handTargets:handOnChest?[{hand:'RightHand',point:[actor.x-.155,1.345+stance*.011+singing,actor.z+.11],
        pole:[-.18,-.72,-.68],followForearm:true,weight:.94}]:[]},dt);
  }
}

function advanceOpponentGoal(play,goal,dt){
  const overlay=$('#scoreUpdate');
  if(overlay.hidden){
    const {match,club,opponent}=play;
    const home=match.home?club:opponent,away=match.home?opponent:club;
    $('#scoreUpdateHome').textContent=home.name;
    $('#scoreUpdateAway').textContent=away.name;
    const homeGoals=$('#scoreUpdateHomeGoals'),awayGoals=$('#scoreUpdateAwayGoals');
    homeGoals.textContent=match.home?match.forGoals:play.scorePreview;
    awayGoals.textContent=match.home?play.scorePreview:match.forGoals;
    homeGoals.classList.toggle('is-changing',!match.home);
    awayGoals.classList.toggle('is-changing',match.home);
    $('#scoreUpdateStatus').textContent='';
    const particles=$('#scoreUpdateParticles');
    if(!particles.childElementCount)for(let i=0;i<32;i++){
      const spark=document.createElement('i'),angle=i*2.399963;
      const radius=18+(i%7)*4;
      for(const [key,value] of Object.entries({dx:`${Math.cos(angle)*radius}vw`,dy:`${Math.sin(angle)*radius}vh`,
        size:`${3+(i%4)*2}px`,duration:`${.8+(i%6)*.16}s`,delay:`${i%5*.065}s`,
        spark:['#ffd485','#ffe8ba','#ef7761'][i%3]}))spark.style.setProperty('--'+key,value);
      particles.append(spark);
    }
    overlay.dataset.phase='in';
    overlay.hidden=false;
    clearAnnouncement();
  }
  goal.age+=dt;
  if(goal.age>=.48&&overlay.dataset.phase==='in'){
    $(play.match.home?'#scoreUpdateAwayGoals':'#scoreUpdateHomeGoals').textContent=play.match.against;
    $('#scoreUpdateStatus').textContent=`Gol de ${play.opponent.name}!`;
    delete play.scorePreview;
    paintMatch(play);
    overlay.dataset.phase='goal';
    matchAudio.playCheer(play.match.home?.54:.75);
  }
  if(goal.age>=2.1&&overlay.dataset.phase==='goal'&&!matchAudio.cheering()){
    overlay.dataset.phase='out';
    goal.exit=goal.age+.25;
  }
  if(!(goal.age>=goal.exit))return false;
  overlay.hidden=true;
  return true;
}

function changeCareerChance(dt){
  const fade=$('#matchFade');
  const transition=careerPlay.transition;
  if(transition.intro){advanceMatchIntro(careerPlay,dt);return;}
  transition.elapsed+=dt;
  if(transition.opening){
    fade.style.opacity=String(1-smooth(transition.elapsed/.30));
    if(transition.elapsed<.325)advanceOpeningCarry(dt);
    if(transition.elapsed>=.30&&(!careerPlay.loadingReplay||transition.elapsed>=1.35)){
      careerPlay.transition=null;clearMatchFade();beginReplayCapture();matchAudio.whistle();
    }
    return;
  }
  const elapsed=transition.elapsed-transition.hold;
  if(elapsed<0||transition.goal&&matchAudio.cheering()){
    if(elapsed>=0)transition.elapsed=transition.hold;
    if(transition.foul){poseFall(transition,dt);return;}
    clock+=dt;
    if(windup){windup.t+=dt;if(windup.t>windup.end&&(!windup.flight||windup.flight.done))windup=null;}
    advanceEndLineRunout(dt);
    playerAnimation(dt);keeperAnimation(dt);updateMocap(dt);teamAI.update(dt);advanceGoalReactions(dt);physics(dt);
    netRipple=Math.max(0,netRipple-dt);
    return;
  }
  if(transition.outcome&&!transition.sealed){
    transition.sealed=true;
    captureReplayFrame(0,true);
    sealReplay(transition.chance,transition.outcome,false);
  }
  if(transition.scoreUpdate){
    if(advanceOpponentGoal(careerPlay,transition.scoreUpdate,dt))transition.scoreUpdate=null;
    transition.elapsed=transition.hold;
    return;
  }
  if(elapsed<.23){
    fade.style.opacity=String(smooth(elapsed/.23));
    return;
  }
  if(!transition.changed){
    if(transition.complete&&elapsed<.34){fade.style.opacity='1';return;}
    transition.changed=true;
    fade.style.opacity='1';
    if(transition.complete){
      if(transition.complete!=='shootout')matchAudio.whistle();
      menu.finish();return;
    }
    chancePosition();
    paintMatch();
  }
  if(elapsed>.34){
    fade.style.opacity=String(1-smooth((elapsed-.34)/.27));
    advanceOpeningCarry(dt);
  }
  if(elapsed>=.61){
    careerPlay.transition=null;clearMatchFade();
    if(!transition.foul)beginReplayCapture();
    matchAudio.whistle();
  }
}

function beginReplayCapture(){
  const play=careerPlay,prior=play.resumeClip;
  play.resumeClip=null;
  const frames=prior?.frames.slice()??[];
  play.capture={frames,captions:prior?.captions.slice()??[],appearance:play.appearance,
    time:frames.length?frames.at(-1)[0]+replayInterval:0,next:0};
  captureReplayFrame(0,true);
}

function captureReplayFrame(dt,force=false){
  const play=careerPlay,r=play?.capture;
  if(!r)return;
  r.time+=dt;
  if(!force&&r.time+1e-6<r.next)return;
  r.next=r.time+replayInterval;
  const isFreeKick=play.piece?.kind==='freeKick';
  const actorCount=replayActors.length;
  const frame=new Float32Array(replayHeader+actorCount*replayRigSize);
  const text=$('#message').textContent;
  let note=r.captions.indexOf(text);
  if(note<0){note=r.captions.length;r.captions.push(text);}
  const people=isFreeKick?[...play.defenders,...freeKickAllies]:play.defenders;
  const mask=[...people,...teamAI.actors()].reduce((bits,actor)=>bits|1<<replayActors.indexOf(actor),3);
  frame.set([r.time,Number($('#matchFade').style.opacity)||0,
    play.piece?.kind==='penalty'?2:play.piece?1:0,mask,note,...ballPos,...ballRotation,...camera,...cameraTarget]);
  replayActors.forEach((actor,i)=>{
    if(!(mask&(1<<i)))return;
    const rig=mocap.get(actor),at=replayHeader+i*replayRigSize;
    frame.set([actor.x,actor.y,actor.z,actor.yaw,actor.roll||0,rig.extraY??0,rig.bodyYaw??actor.yaw,
      rig.mirror?1:0,...rig.root],at);
    rig.q.forEach((q,index)=>frame.set(q,at+11+index*4));
  });
  r.frames.push(frame);
}

function sealReplay(chance,outcome,partial){
  const play=careerPlay,capture=play?.capture;
  if(!play?.replayKey||!capture?.frames.length)return;
  const {frames,captions,appearance}=capture;
  const phases=[...new Set(frames.map(frame=>frame[2]))];
  const kind=phases.includes(2)?'penalty':phases.includes(1)?'freeKick':'play';
  window.careerReplayStore.write(play.replayKey,chance,{frames:frames.slice(),captions:captions.slice(),appearance,kind,outcome,partial});
}

function startCareerReplay(clip,club,opponent,chance){
  if(!clip?.frames.length)return false;
  stopFieldSession();
  setMatchKits(clip.appearance,club,opponent);
  const goalFrame=clip.frames.find(frame=>['GOOOOL!','GOL CONTRA!'].includes(clip.captions[frame[4]]));
  careerReplay={clip,time:0,index:0,drawn:-1,defenders:[],withSupport:false,goalAt:goalFrame?.[0]??Infinity};
  document.body.dataset.mode='review';
  $('#careerReplayBar').hidden=false;
  $('#careerReplayTitle').textContent=`Replay · Chance ${chance}`;
  $('#replayExit').focus();
  playReplayFrame(0);
  return true;
}

function playReplayFrame(dt){
  const review=careerReplay,frames=review.clip.frames;
  review.time+=dt;
  while(review.index+1<frames.length&&frames[review.index+1][0]<=review.time)review.index++;
  if(review.drawn!==review.index){
    review.drawn=review.index;
    const frame=frames[review.index],mask=frame[3];
    review.defenders=[...defenders,...teammates,...freeKickAllies].filter(actor=>mask&(1<<replayActors.indexOf(actor)));
    review.withSupport=false;
    ballPos=Array.from(frame.subarray(5,8));ballRotation.splice(0,3,...frame.subarray(8,11));
    camera=Array.from(frame.subarray(11,14));cameraTarget=Array.from(frame.subarray(14,17));
    $('#careerReplayCaption').textContent=review.clip.captions[frame[4]]||
      (frame[2]===2?'PÊNALTI':frame[2]===1?'FALTA COM BARREIRA':'');
    const fade=$('#matchFade');
    fade.hidden=frame[1]<=0;fade.style.opacity=String(frame[1]);
    replayActors.forEach((actor,i)=>{
      if(!(mask&(1<<i)))return;
      const at=replayHeader+i*replayRigSize;
      [actor.x,actor.y,actor.z,actor.yaw,actor.roll]=frame.subarray(at,at+5);
      const root=Array.from(frame.subarray(at+8,at+11));
      const q=Array.from({length:mocap.boneCount},(_,j)=>Array.from(frame.subarray(at+11+j*4,at+15+j*4)));
      mocap.restore(actor,{clip:'idle',time:0,extraY:frame[at+5],bodyYaw:frame[at+6],mirror:!!frame[at+7],root,q});
    });
    if(ballPos[2]<-.10)goalNet.contain([...ballPos],[0,0,-3]);
  }
  goalNet.step(dt);
  if(review.time>frames.at(-1)[0]+.38)menu.back();
}

function prepareRating(play){
  play.match.rating??=6;
  play.rating=play.match.rating;
  play.ratingEvents=[];
  play.dribbleReads=new Map();
  paintRating(play);
}

function paintRating(play){
  const panel=$('#matchRating');
  panel.hidden=false;
  const value=play.rating;
  panel.style.setProperty('--rating-bg',careerRules.ratingColor(value));
  $('#matchRatingValue').textContent=value.toFixed(1).replace('.',',');
}

function ratePlay(type,delta,details={}){
  const play=careerPlay;
  if(!play||play.transition||play.shootout&&(!play.shootoutTurn.isUser||play.shootoutHold!=null))return 0;
  const prior=play.rating;
  play.rating=careerRules.ratingAfter(prior,delta);
  const {match,shootoutTurn}=play;
  play.ratingEvents.push({id:String((match.ratingEvents?.length??0)+play.ratingEvents.length),type,delta,...details,chance:shootoutTurn?null:match.used+1,
    ...(shootoutTurn?{shootoutKick:shootoutTurn.order}:{})});
  paintRating(play);
  return play.rating-prior;
}

function rateDribbles(){
  const play=careerPlay;
  if(!play||play.piece||play.transition||ballState!=='controlled')return;
  let ratingDelta=0;
  for(const actor of play.defenders){
    const prior=play.dribbleReads.get(actor);
    if(prior?.done&&clock-prior.time<1.2)continue;
    const gap=Math.hypot(player.x-actor.x,player.z-actor.z);
    const behind=player.z-actor.z;
    if(prior&&!prior.done&&clock-prior.time<1.9&&behind<-.45&&gap<2.75&&player.vz<-.35){
      play.dribbleReads.set(actor,{done:true,time:clock});
      ratingDelta+=ratePlay('dribble',.2);
    }else if(behind>=.14&&gap<1.65){
      play.dribbleReads.set(actor,{time:clock});
    }
  }
  if(ratingDelta)announce('DRIBLE!','',undefined,ratingDelta);
}

function rateSetPiece(play,outcome){
  if(!play.piece||outcome==='goal')return 0;
  const penalty=play.piece.kind==='penalty';
  if(!penalty&&outcome==='out'&&(shot?.deflectedBy||shot?.hit))return 0;
  return ratePlay(penalty?'penaltyMiss':'freeKickMiss',penalty?-2:-.4);
}

function advanceShootout(dt){
  const play=activeDefense();
  if(play.shootoutFinished)return;
  if(play.shootoutHold!=null){
    play.shootoutHold-=dt;
    if(play.shootoutHold>0||matchAudio.cheering())return;
    if(!play.shootout.winner){prepareShootoutTurn(play);matchAudio.whistle();return;}
    play.shootoutFinished=true;
    if(careerPlay){menu.returnToShootout();return;}
    const winner=play.shootout.winner==='user'?play.shootoutClub:play.opponent;
    announce('FIM DA DISPUTA',`${winner.name} venceu · T / R3 para reiniciar`,'#ffd283');
    toastTimer=7;
    return;
  }
  play.remaining=Math.max(0,play.remaining-dt);
  const postMiss=hitGoalFrame&&(result?.type==='postOut'||ballState==='loose'&&
    ((ballPos[2]>1.8&&ballVel[2]>.25)||Math.hypot(ballVel[0],ballVel[2])<.85&&ballAge>.65));
  const outside=result?.type==='out'||Math.abs(ballPos[0])>motion.limits.side+.11||ballPos[2]>motion.limits.back+.11;
  const saved=ballState==='held'||shot?.stopped&&!hitGoalFrame&&(ballVel[2]>=-.25||ballAge>5);
  const outcome=outcomeFromGoal()||(postMiss||outside?'out':saved?'save':play.remaining===0&&!shotInProgress()?'time':null);
  if(outcome){
    let ratingDelta=0;
    if(careerPlay){
      ratingDelta=rateSetPiece(play,outcome);
      menu.commitShootoutKick(outcome,hitGoalFrame,play.ratingEvents);
    }else{
      const detail=outcome==='goal'?'Gol!':outcome==='save'?'Defesa do goleiro!':outcome==='time'?'Tempo esgotado!':
        hitGoalFrame?'Na trave!':'Pra fora!';
      careerRules.recordShootoutKick(play.match,outcome==='goal',detail);
    }
    if(outcome==='time')announce('TEMPO ESGOTADO','Cobrança desperdiçada.',undefined,ratingDelta);
    else if(postMiss)announce('NA TRAVE!','A bola voltou para fora.',undefined,eventRatingDelta+ratingDelta);
    else if(outcome==='out'&&!result)announce('PRA FORA!','Cobrança desperdiçada.',undefined,ratingDelta);
    else addResultRating(ratingDelta);
    windup=null;charging=false;charge=0;
    play.shootoutHold=1.4;
  }
  paintMatch(play);
}

function advanceCareerChance(dt){
  const play=careerPlay;
  if(!play||play.transition)return;
  play.remaining=Math.max(0,play.remaining-dt);
  const outsideReach=Math.abs(ballPos[0])>motion.limits.side+.11||ballPos[2]>motion.limits.back+.11;
  const lineOut=result?.type==='out'||result?.type==='offside';
  const postOut=result?.type==='postOut';
  const goal=outcomeFromGoal();
  const blocked=play.piece&&!hitGoalFrame&&shot?.stopped&&(ballVel[2]>=-.25||ballAge>5);
  let outcome=goal||(lineOut||postOut?'out':ballState==='held'||blocked?'save':ballState!=='controlled'&&outsideReach?'out':null);
  if(!outcome&&play.remaining<=0&&!shotInProgress()){
    const carrying=ballState==='controlled'||ballState==='loose'&&ballPos[1]<.32&&(player.lostDribble||ballVel[2]<-.20);
    const forwardPace=-Math.min(player.vz??0,ballVel[2]);
    const distance=ballPos[2]-footballGoalLineZ;
    const finishingCarry=!play.piece&&carrying&&nearBall(1.35)&&forwardPace>.20&&distance<=Math.min(6,forwardPace*endLineGrace);
    if(shot&&!shot.goalChecked&&['flight','loose'].includes(ballState)){
      outcome=shot.stopped&&!hitGoalFrame?'save':'out';
    }else if(finishingCarry&&play.endLineGraceUsed<endLineGrace)play.endLineGraceUsed+=dt;
    else outcome='time';
  }
  if(outcome){
    let ratingDelta=0;
    if(outsideReach&&outcome==='out'&&!play.piece&&shot&&!shot.teamScorer&&!shot.ratingHandled&&!shot.deflectedBy&&!shot.hit){
      ratingDelta=ratePlay('wideShot',-.3);
    }
    ratingDelta+=rateSetPiece(play,outcome);
    const previousAgainst=play.match.against;
    const complete=menu.commit(outcome,stats.shots,play.ratingEvents);
    const conceded=play.match.against>previousAgainst;
    if(conceded)play.scorePreview=previousAgainst;
    if(outcome==='time')announce('TEMPO ESGOTADO','A chance terminou.',undefined,ratingDelta);
    else if(outcome==='out'&&!lineOut&&!postOut)announce(hitGoalFrame?'NA TRAVE!':'LANCE PERDIDO',
      hitGoalFrame?'A bola voltou para o campo.':'A chance terminou.',undefined,ratingDelta);
    else addResultRating(ratingDelta);
    windup=null;charging=false;charge=0;
    const hold=result?.type==='offside'?1.7:postOut?postResultHold:goal||lineOut?nearMissHold:.60;
    play.transition={elapsed:0,hold,complete,changed:false,outcome,goal,scoreUpdate:conceded?{age:0}:null,chance:play.match.used};
    $('#matchFade').style.opacity='0';
    $('#matchFade').hidden=false;
    captureReplayFrame(0,true);
    sealReplay(play.match.used,outcome,false);
  }
  paintMatch();
}
function stopForFoul(actor){
  const side=Math.sign((actor.x-player.x)*Math.cos(player.yaw)-(actor.z-player.z)*Math.sin(player.yaw))||1;
  if(trainingDefense){
    clearFirstTimeShot();
    windup=null;charging=false;charge=0;
    ballVel=[0,0,0];ballAngular.fill(0);
    player.tackleReact=null;
    player.foulTrip={elapsed:0,side,yaw:player.yaw,velocity:[player.vx||0,player.vz||0],start:[player.x,player.z]};
    result={type:'foul',t:0,hold:Math.max(nearMissHold,1.45)};
    announce('FALTA!','O defensor atingiu o jogador.');
    matchAudio.whistle();
    return;
  }
  const play=careerPlay;
  if(play.transition||play.piece)return;
  const penalty=Math.abs(player.x)<=20.16&&player.z<=16.5;
  const piece=penalty?{kind:'penalty'}:{kind:'freeKick',x:clamp(player.x,-motion.limits.side+.65,motion.limits.side-.65),
    z:clamp(player.z,Math.abs(player.x)>20.16?motion.limits.front:16.55,31.2)};
  if(!menu.awardSetPiece(piece,stats.shots,play.ratingEvents))return;
  matchAudio.whistle();
  player.tackleReact=null;
  careerPlay.transition={foul:true,hold:1.35,elapsed:0,side,
    velocity:[player.vx||0,player.vz||0],start:[player.x,player.z],yaw:player.yaw,
    ankles:mocap.get(player).ankles.map(point=>[...point])};
  windup=null;charging=false;charge=0;moveSpeed=0;ballState='foul';
  $('#matchFade').style.opacity='0';$('#matchFade').hidden=false;
  announce(penalty?'FALTA NA ÁREA':'FALTA',penalty?'Pênalti!':'Cobrança com barreira.');
  captureReplayFrame(0,true);
  sealReplay(play.match.used+1,null,true);
}

function poseFall(transition,dt){
  const t=transition.elapsed,side=transition.side,yaw=transition.yaw;
  const tripClip=mocap?.clips?.soccerTrip;
  if(tripClip){
    const drift=.28*(1-Math.exp(-t*3.8));
    [player.x,player.z]=transition.start.map((value,i)=>value+transition.velocity[i]*drift);
    mocap.update(player,{
      clip:'soccerTrip',poseName:'tackleFall',
      time:Math.min(tripClip.duration,t*1.12),
      loop:false,fade:.22,mirror:side<0,authoredGround:true,grounded:true,bodyYaw:yaw
    },dt);
    return;
  }
  const stumble=smooth(t/.14)*(1-smooth((t-.23)/.27));
  const drop=smooth((t-.12)/.36),roll=smooth((t-.19)/.43);
  const impact=smooth((t-.38)/.105)*(1-smooth((t-.50)/.21));
  const settle=smooth((t-.53)/.40);
  const brace=smooth((t-.18)/.20)*(1-smooth((t-.51)/.19));
  const near=side===1?'Left':'Right',far=near==='Left'?'Right':'Left';
  const right=[Math.cos(yaw),-Math.sin(yaw)],forward=[-Math.sin(yaw),-Math.cos(yaw)];
  const drift=.27*(1-Math.exp(-t*4.4));
  [player.x,player.z]=transition.start.map((value,i)=>value+transition.velocity[i]*drift-right[i]*side*.43*roll);
  const point=(lateral,height,depth)=>[player.x+right[0]*lateral+forward[0]*depth,height,
    player.z+right[1]*lateral+forward[1]*depth];
  const feet=transition.ankles.map((ankle,index)=>{
    const isNear=(index===0)===(near==='Left');
    const plant=smooth((t-(isNear?.07:.16))/(isNear?.27:.34));
    const fold=smooth((t-.24)/.37);
    const target=point((index===0?-1:1)*.14-side*(isNear?.08:.35)*fold,.11,
      mix(isNear?.19:.07,isNear?.36:.59,fold));
    const placement=ankle.map((value,axis)=>mix(value,target[axis],plant));
    placement[1]=mix(clamp(ankle[1],.10,.24),target[1],plant)+Math.sin(Math.PI*plant)*(isNear?.096:.14);
    return {foot:index===0?'LeftFoot':'RightFoot',point:placement,yaw:yaw-side*.27*roll,
      pitch:.14*Math.sin(Math.PI*plant),bank:side*.12*drop,kneeBend:.51,groundWeight:plant,legExtension:0};
  });
  mocap.update(player,{clip:'idle',poseName:'tackleFall',time:0,fade:.14,bodyYaw:yaw-side*.39*roll,
    ankleTargets:feet,
    pelvis:{height:.925-.72*drop-.045*impact+.016*settle,lateral:0,forward:.05*stumble,
      rotation:[.48*stumble+.27*drop-.22*settle,-side*.26*roll,side*(1.40*roll+.12*impact)]},
    offsets:{Spine:[.28*stumble-.10*settle,side*.20*stumble,-side*.13*roll],
      [near+'Arm']:[-.86*stumble-.33*drop,0,side*.61*drop],
      [far+'Arm']:[-.48*stumble-.65*drop,0,-side*.63*drop],
      [near+'ForeArm']:[-.63*brace-.41*settle,0,0],[far+'ForeArm']:[-.83*drop,0,0],
      Neck:[-.23*stumble+.16*roll,0,-side*.14*roll]},
    handTargets:[{hand:near+'Hand',point:point(-side*.46,.055+.22*(1-brace),.41),weight:brace},
      {hand:far+'Hand',point:point(-side*.19,.19,.57),weight:drop*.62}]},dt);
}
function ownGoalFromDeflection(){
  return !!shot?.deflectedBy&&shot.onTarget===false;
}

function outcomeFromGoal(){
  return ballState==='goal'?(ownGoalFromDeflection()?'ownGoal':shot?.teamScorer?(shot.assisted?'assist':'teamGoal'):'goal'):null;
}

const teamAI=window.createFootballTeamAI({
  player,keeper,members:teammates,motion,mocap,physics:ballPhysics,
  state:()=>({play:activeDefense(),ball:ballPos,velocity:ballVel,spin:ballAngular,ballState,result,camera,
    age:ballAge,clock,aimScreen:passAimScreen,terminal:terminal(),windup,charging,passCharging:!!throughCharge,preparingFirstTime:!!firstTimeRequest,
    shotRequested:shotButtonHeld||shotTap}),
  screenPoint(actor){return aimViewProjection?projected([actor.x,.1,actor.z],aimViewProjection):null;},
  release(velocity,spin,state){
    clearFirstTimeShot();shot=null;result=null;dive=null;ballVel=velocity;ballAngular.splice(0,3,...spin);
    ballState=state;ballAge=0;player.touchPending=null;player.spawnControl=null;
  },
  loose(){ballState='loose';},
  control(){regainControl();shot=null;},
  possess(){ballState='teammate';ballAge=0;shot=null;player.touchPending=null;},
  playerPass(){charging=false;charge=0;player.spawnControl=null;},
  sound(){sound(112,.09,'triangle',.1);},
  shoot(w){launchShot(w);},
  headerPlan(actor){return findHeaderContact(actor);},
  reception(actor,position,arrivalTime){return aerialReception(actor,position,arrivalTime);},
  aerial(head,height){
    player.aerialAction={kind:head?'headerTrap':'receive',clip:head?'headerJump':'receiveBall',
      time:head?.7:2.85,contact:head?.92:2.95,end:head?1.42:3.45,touched:true,yaw:player.yaw,
      jumpHeight:head?clamp(height-1.6,0,.65):0};
  },
  offside(){
    clearFirstTimeShot();charging=false;charge=0;windup=null;shot=null;ballVel=[0,0,0];ballAngular.fill(0);ballState='loose';
    result={type:'offside',t:0,hold:1.7};
    announce('IMPEDIMENTO','O jogador participou da jogada à frente da linha de impedimento.');
    matchAudio.whistle();
  }
});
function advanceSupport(dt){teamAI.update(dt);}

function updateShotHeight(power,foot='Left',force=1,chip=chargeChip){
  const launch=ballPhysics.launch(ballPos,aim.x,power,chargeVelocity,requestedVolley,
    {chip,groundFriction:false,finesse:chargePlaced||placedShot,lowDriven:false,foot,accuracy:mark().shot});
  const appliedForce=power>=1?1:force;
  const hit=ballPhysics.crossing(ballPos,launch.velocity.map(value=>value*appliedForce),launch.spin.map(value=>value*appliedForce),0,false);
  aim.y=clamp(hit?.y??.11,.11,5);
}

function setPieceYaw(){
  const {piece,kickAngle}=activeDefense();
  return Math.atan2(piece.x,piece.z)+kickAngle;
}

function setPieceCamera(){
  const piece=activeSetPiece(),yaw=setPieceYaw();
  const depth=Math.max(6,piece.z-1.5);
  return [
    [piece.x+Math.sin(yaw)*5.5,2.65,piece.z+Math.cos(yaw)*5.5],
    [piece.x-Math.sin(yaw)*depth,1.03,piece.z-Math.cos(yaw)*depth]
  ];
}

const backShotAngle=2.45;
const backShotSpread=4.5;

function shotExecution(foot,preferred,backwards){
  const weak=foot!==preferred;
  if(backwards&&weak)return {dispersion:7.2,force:.65};
  if(backwards)return {dispersion:backShotSpread,force:1};
  return {dispersion:weak?2.7:1,force:1};
}

function staminaFatigue(){
  const play=activeDefense();
  if(!play||play.piece)return 0;
  const max=Math.max(1,staminaCapacity());
  return 1-smooth(clamp((play.stamina??max)/max,0,1)/.80);
}

function shotSpread(power,pressure,attributes,pieceKind){
  const timing=power<.53?(.53-power)*1.65:(power-.53)*4.45;
  const quality=clamp(2.45-(attributes[pieceKind]??attributes.shot)*.0235,.18,2.15);
  const composure=clamp(2.55-attributes.composure*.0225,.28,2.25);
  const dist=Math.hypot(ballPos[0],ballPos[2]);
  const longExtra=Math.max(0,dist-16.5);
  const range=clamp(dist/18+(longExtra*longExtra)*.019,.42,3.60);
  const fatigue=staminaFatigue();
  const base=(.72+timing)*quality*range+pressure*1.92*composure*(.73+power*.74);
  return base*(1+fatigue*1.25)+fatigue*.55;
}

function shotError(spread){
  const angle=Math.random()*Math.PI*2,radial=Math.sqrt(Math.random())*spread;
  return [Math.cos(angle)*radial,Math.sin(angle)*radial];
}

function updateStamina(dt){
  const play=activeDefense();
  if(!play||play.piece)return;
  const maximum=staminaCapacity();
  const drain=play.sprinting&&moveSpeed>.75?16.5*clamp(play.staminaDistanceScale??1,.75,1)*(ballState==='controlled'?1:.5):0;
  const recovery=drain?0:moveSpeed>.24?3.6:10.8;
  play.stamina=clamp(play.stamina+(recovery-drain-(player.defensiveDrain??0)*.5)*dt,0,maximum);
  if(play.exhausted)play.exhausted=play.stamina<maximum*.13;
  else if(play.stamina<=1.5)play.exhausted=true;
}
function signedTurn(value){return Math.atan2(Math.sin(value),Math.cos(value))}

function canTackleBall(){
  return (ballState==='controlled'||ballState==='loose'||ballState==='pass'||ballState==='teammate')&&ballPos[1]<.32;
}

function keepDefenderOutsidePlayer(defender){
  for(const actor of [player,...teamAI.actors()]){
    const dx=defender.x-actor.x,dz=defender.z-actor.z,gap=Math.hypot(dx,dz);
    if(gap<.60){
      const nx=gap>.01?dx/gap:Math.sin(defender.yaw),nz=gap>.01?dz/gap:Math.cos(defender.yaw);
      const closing=Math.max(0,-((defender.vx-actor.vx)*nx+(defender.vz-actor.vz)*nz));
      if(closing>.5){
        mocap.bodyImpact(defender,[nx*closing*3,0,nz*closing*3],'body',.8);
        mocap.bodyImpact(actor,[-nx*closing*3,0,-nz*closing*3],'body',.8);
      }
      defender.x=actor.x+(gap>.01?dx/gap:Math.sin(defender.yaw))*.60;
      defender.z=actor.z+(gap>.01?dz/gap:Math.cos(defender.yaw))*.60;
    }
  }
}

function resetDefenderPress(defender,delay){
  const action=defender.action;
  defender.action=null;
  defender.retry=delay;
  defender.vx=defender.vz=0;
  motion.reset(defender);
  defender.contactRecovery={elapsed:0,duration:action?.slide?.78:.58,side:action?.foot==='LeftFoot'?1:-1};
}

function canDispossessCarrier(defender){
  if(ballState!=='controlled')return true;
  const dx=defender.x-player.x,dz=defender.z-player.z;
  const gap=Math.hypot(dx,dz);
  const forward=-Math.sin(player.yaw)*dx-Math.cos(player.yaw)*dz;
  const frontal=forward/Math.max(.01,gap)>.55;
  if(frontal)return true;
  const behind=forward<-.18;
  const duration=(behind?1.05:.70)+clamp((mark().strength-50)*.003,0,.15);
  if((defender.duelTime??0)<duration)return false;
  if(!behind)return true;
  if(defender.grip?.target!==player||!(defender.grip.weight>.08)||clock-(defender.gripContactAt??-Infinity)>.025)return false;
  const hands=mocap.get(defender).hands;
  return (defender.gripContacts??[]).some(target=>{
    const hand=hands?.[target.hand==='LeftHand'?0:1];
    return target.weight>.06&&hand&&Math.hypot(...sub(hand,target.point))<.20;
  });
}

function captureByDefender(defender,tackle){
  if(tackle?.rollEvaded)return false;
  if(!canDispossessCarrier(defender))return false;
  const ratingDelta=ballState==='controlled'?ratePlay('dispossessed',-.5):0;
  const dx=ballPos[0]-defender.x,dz=ballPos[2]-defender.z;
  const side=Math.abs(dx)>.16?Math.sign(dx):Math.sign(ballPos[0])||Math.sign(defender.x)||1;
  const axis=norm([side*clamp(Math.abs(dx)*2.4,.42,1.25),0,Math.max(.65,dz*1.8)]);
  const yaw=Math.atan2(-axis[0],-axis[2]);
  const foot=tackle.foot;
  const width=foot==='LeftFoot'?.13:-.13;
  tackle.touchedAt=tackle.age;
  if(tackle.slide)tackle.clearAt=tackle.age+.075;
  tackle.possession={kind:'secure',age:0,axis,yaw,foot,
    stance:[ballPos[0]-axis[0]*.44-axis[2]*width,ballPos[2]-axis[2]*.44+axis[0]*width]};
  defender.vx=defender.vz=0;
  clearFirstTimeShot();
  shot=null;
  windup=null;
  charging=false;
  charge=0;
  requestedVolley=false;
  player.spawnControl=null;
  if(tackle.slide&&(mocap?.clips?.soccerTackleFront||mocap?.clips?.soccerTackleSide)){
    const dx=defender.x-player.x,dz=defender.z-player.z;
    const dist=Math.hypot(dx,dz)||1;
    const fwdX=-Math.sin(player.yaw),fwdZ=-Math.cos(player.yaw);
    const rightX=Math.cos(player.yaw),rightZ=-Math.sin(player.yaw);
    const frontDot=(dx*fwdX+dz*fwdZ)/dist;
    const sideDot=(dx*rightX+dz*rightZ)/dist;
    const isFront=Math.abs(frontDot)>=Math.abs(sideDot);
    const clipKey=isFront&&mocap.clips.soccerTackleFront
      ?'soccerTackleFront'
      :(mocap.clips.soccerTackleSide?'soccerTackleSide':'soccerTackleFront');
    player.tackleReact={
      clip:clipKey,
      time:0,
      elapsed:0,
      yaw:player.yaw,
      mirror:clipKey==='soccerTackleSide'?sideDot>0:sideDot<0,
      velocity:[player.vx||0,player.vz||0],
      start:[player.x,player.z]
    };
  }
  motion.lockCharge(player,player.yaw);
  ballState='defender';
  ballPos[1]=.11;
  ballVel=[0,0,0];
  ballAngular.fill(0);
  ballAge=0;
  announce('DESARME!','O zagueiro ficou com a bola.',undefined,ratingDelta);
  sound(150,.09,'triangle',.12);
  return true;
}

const carrierMotionHistory=new WeakMap();
function predictCarrierIntercept(defender,carrier){
  const vx=carrier.vx??0,vz=carrier.vz??0,speed=Math.hypot(vx,vz);
  if(speed<.8){carrierMotionHistory.delete(carrier);return null;}
  const heading=Math.atan2(vx,vz);
  let history=carrierMotionHistory.get(carrier);
  if(!history||clock-history.clock>.3||clock<history.clock){history={clock,heading,omega:0};carrierMotionHistory.set(carrier,history);}
  const dt=clock-history.clock;
  if(dt>.0001){
    const rate=clamp(signedTurn(heading-history.heading)/dt,-5,5);
    history.omega=mix(history.omega,rate,1-Math.exp(-dt*8));
    history.clock=clock;history.heading=heading;
  }
  const omega=history.omega,pace=defender.settings.pace;
  const initial=Math.hypot(defender.vx,defender.vz);
  const offset=[ballPos[0]-carrier.x,ballPos[2]-carrier.z];
  let best=null,bestCost=Infinity;
  for(const t of [.16,.26,.38,.52,.68,.86]){
    const arc=omega*t,c=Math.cos(arc),sn=Math.sin(arc);
    const dx=Math.abs(omega)>.05?speed*(Math.cos(heading)-Math.cos(heading+arc))/omega:vx*t;
    const dz=Math.abs(omega)>.05?speed*(Math.sin(heading+arc)-Math.sin(heading))/omega:vz*t;
    const x=carrier.x+dx+offset[0]*c+offset[1]*sn,z=carrier.z+dz-offset[0]*sn+offset[1]*c;
    const gap=Math.hypot(x-defender.x,z-defender.z);
    const travel=pace*t-Math.max(0,pace-initial)*Math.min(t,.45)*.5;
    const cost=Math.max(0,gap-travel-.50)*2+t*.85;
    if(cost<bestCost){bestCost=cost;best={x,z,time:t,omega};}
    if(gap<=travel+.50&&t>=.26)break;
  }
  return best;
}

function defenderDuelTarget(defender,carrier){
  const yaw=carrier.yaw,rx=Math.cos(yaw),rz=-Math.sin(yaw),fx=-Math.sin(yaw),fz=-Math.cos(yaw);
  const gap=Math.hypot(defender.x-carrier.x,defender.z-carrier.z);
  if(!defender.duelSide||gap>3.5)defender.duelSide=Math.sign((defender.x-carrier.x)*rx+(defender.z-carrier.z)*rz)||1;
  const intercept=predictCarrierIntercept(defender,carrier);
  if(intercept&&gap>1.05){
    return [clamp(intercept.x,-motion.limits.side+.35,motion.limits.side-.35),
      clamp(intercept.z,playerFrontLimit(defender),motion.limits.back-.35)];
  }
  const lead=clamp(gap*.05,.04,.16);
  const bx=ballPos[0]+ballVel[0]*.08-carrier.x,bz=ballPos[2]+ballVel[2]*.08-carrier.z;
  const ballGap=Math.hypot(bx,bz),ballSide=bx*rx+bz*rz;
  const along=(defender.x-carrier.x)*fx+(defender.z-carrier.z)*fz;
  const sameSide=ballSide*defender.duelSide>-.10;
  const contest=gap<2.1&&ballPos[1]<.32&&(sameSide||along>-.12);
  if(contest){
    const nx=ballGap>.05?bx/ballGap:fx,nz=ballGap>.05?bz/ballGap:fz;
    const inFront=clamp(ballGap*.65,.45,.78);
    return [carrier.x+nx*inFront+rx*defender.duelSide*.24+(carrier.vx??0)*lead,
      carrier.z+nz*inFront+rz*defender.duelSide*.24+(carrier.vz??0)*lead];
  }
  return [carrier.x+(carrier.vx??0)*lead+rx*defender.duelSide*.64+fx*.18,
    carrier.z+(carrier.vz??0)*lead+rz*defender.duelSide*.64+fz*.18];
}

function defenderGripPose(defender,pose){
  defender.gripContacts=[];defender.gripContactAt=clock;
  const grip=defender.grip;
  if(!(grip?.weight>.015))return pose;
  const target=grip.target??player,rig=mocap.get(target);
  const fx=-Math.sin(target.yaw),fz=-Math.cos(target.yaw),rx=Math.cos(target.yaw),rz=-Math.sin(target.yaw);
  const dx=defender.x-target.x,dz=defender.z-target.z;
  const behind=dx*fx+dz*fz<-.22,side=Math.sign(dx*rx+dz*rz)||1;
  const chest=rig.chest??[target.x,1.27,target.z];
  const gap=Math.hypot(dx,dz),second=smooth((.92-gap)/.22)*smooth(grip.age/.16);
  const hands=second>.02?[grip.hand,grip.hand==='LeftHand'?'RightHand':'LeftHand']:[grip.hand];
  pose.handTargets=[...(pose.handTargets??[])];
  for(let i=0;i<hands.length;i++){
    const hand=hands[i],contactSide=i===0?side:-side;
    const spread=behind?.13:.21;
    const point=behind?[chest[0]-fx*.16+rx*contactSide*spread,chest[1]+(i===0?.01:.07),chest[2]-fz*.16+rz*contactSide*spread]:
      [chest[0]+rx*contactSide*spread,chest[1]+.17,chest[2]+rz*contactSide*spread];
    const distance=Math.hypot(point[0]-defender.x,point[2]-defender.z);
    const reach=1-smooth((distance-.60)/.27);
    const front=-(point[0]-defender.x)*Math.sin(defender.yaw)-(point[2]-defender.z)*Math.cos(defender.yaw);
    if(reach<.02||front<-.14)continue;
    pose.handTargets.push({hand,point,weight:grip.weight*reach*(i===0?.90:second*.78),
      maxExtension:.87,anatomical:true,followForearm:true});
  }
  defender.gripContacts=pose.handTargets.filter(target=>target.anatomical);
  const offsets=pose.offsets??{};
  const spine=offsets.Spine??[0,0,0];
  pose.offsets={...offsets,Spine:[spine[0]+.025*grip.weight,spine[1],spine[2]]};
  pose.lookTarget=ballPos;
  return pose;
}

function ballRollEvadesTackle(defender,action){
  if(action.rollEvaded)return true;
  const carrier=teamAI.owner??player,roll=carrier.ballRoll;
  if(!roll||roll.preparing||roll.age<.27||roll.age>.62||action.possession)return false;
  const timing=action.age-action.hit;
  if(timing<-.10||timing>.06)return false;
  const dx=defender.x-carrier.x,dz=defender.z-carrier.z,gap=Math.hypot(dx,dz);
  const frontal=(-Math.sin(roll.yaw)*dx-Math.cos(roll.yaw)*dz)/Math.max(.01,gap);
  if(gap>2.8||!action.slide&&frontal<.25)return false;
  action.rollEvaded=true;
  action.evadeTarget=[ballPos[0]-roll.axis[0]*.35,ballPos[2]-roll.axis[1]*.35];
  defender.grip=null;
  return true;
}
function defendStandingTackle(defender,action,dt){
  ballRollEvadesTackle(defender,action);
  const carrier=teamAI.owner??player;
  const owned=ballState==='controlled'||ballState==='teammate';
  const target=action.evadeTarget??(owned?defenderDuelTarget(defender,carrier):[ballPos[0]+ballVel[0]*.10,ballPos[2]+ballVel[2]*.10]);
  const dx=target[0]-defender.x,dz=target[1]-defender.z,gap=Math.hypot(dx,dz);
  const carrierSpeed=owned?Math.hypot(carrier.vx??0,carrier.vz??0):0;
  const speed=Math.min(defender.settings.pace,Math.max(0,gap*6.5+carrierSpeed*.85));
  const yaw=speed>1.6&&gap>.025?Math.atan2(-dx,-dz):Math.atan2(defender.x-ballPos[0],defender.z-ballPos[2]);
  const before=mocap.get(defender).bootVolumes;
  motion.move(defender,{dt,direction:gap>.025?[dx/gap,dz/gap]:[0,0],speed,sprint:speed>3.6,
    ball:ballPos,velocity:ballVel,controlled:false,facing:defender.yaw+clamp(signedTurn(yaw-defender.yaw),-dt*9,dt*9)});
  keepDefenderOutsidePlayer(defender);
  const pose=motion.locomotion(defender,{dt,ball:ballPos,velocity:ballVel,controlled:false,
    recoverable:false,ankles:mocap.get(defender).ankles,suspended:false});
  const phase=clamp(action.age/Math.max(.12,action.hit+.11),0,1);
  const weight=smooth(phase/.34)*(1-smooth((phase-.58)/.42));
  const point=predictShotBall(clamp(action.hit-action.age,0,.10));
  const reach=Math.hypot(point[0]-defender.x,point[2]-defender.z);
  if(!action.rollEvaded&&reach<1.04&&canTackleBall()){
    pose.ballContacts=[{category:'defense',limb:action.foot,point,weight,maxCorrection:.34}];
    if(pose.pelvis)pose.pelvis.height-=.018*weight;
  }
  defenderGripPose(defender,pose);
  mocap.update(defender,pose,dt);
  const index=action.foot==='LeftFoot'?0:1,volumes=mocap.get(defender).bootVolumes[index];
  if(!action.rollEvaded&&weight>.22&&canTackleBall()&&volumes.some((volume,i)=>
    ballPhysics.sweepBoot(before?.[index]?.[i]??volume,volume,ballPos,ballVel,dt,.012))){
    if(captureByDefender(defender,action)){
      defender.action=action.possession;
      return;
    }
  }
  if(phase>=1||reach>1.6){defender.action=null;defender.retry=.10;}
}

function defendTackle(defender,action,dt,settling=false){
  if(!settling)ballRollEvadesTackle(defender,action);
  if(!action.slide){
    if(settling){defender.action=null;poseDefenderRun(defender,dt);}
    else defendStandingTackle(defender,action,dt);
    return;
  }
  const {slide,hit,age,foot}=action;
  if(!slide&&!action.possession&&age<hit+.045){
    const lead=Math.max(0,Math.min(.12,hit-age));
    const dx=ballPos[0]+ballVel[0]*lead-defender.x,dz=ballPos[2]+ballVel[2]*lead-defender.z;
    const wish=Math.atan2(-dx,-dz);
    action.yaw+=clamp(signedTurn(wish-action.yaw),-dt*12,dt*12);
    action.axis=[-Math.sin(action.yaw),-Math.cos(action.yaw)];
  }
  const [ax,az]=action.axis;
  const previousX=defender.x,previousZ=defender.z;
  if(action.possession&&action.clearAt!=null&&age>=action.clearAt){
    strikeClearance(action.possession);
    action.possession=null;action.cleared=true;
  }
  const sign=foot==='LeftFoot'?1:-1;
  const before=mocap.get(defender).bootVolumes, index=sign===1?0:1;
  const load=smooth(age/(slide?.24:hit*.80));
  const reachTime=slide?.21:.125;
  const recoverAt=hit+(slide?.11:.075);
  const rise=smooth((age-recoverAt)/(slide?.53:.30));
  const extend=smooth((age-hit+reachTime)/reachTime)*(1-smooth((age-recoverAt)/(slide?.32:.22)));
  const low=load*(1-rise);
  const dx=ballPos[0]-defender.x,dz=ballPos[2]-defender.z;
  const front=dx*ax+dz*az;
  const lateral=dx*az-dz*ax;
  const drift=action.pace*dt*(1-smooth((age-(slide?.10:0))/(slide?.58:hit+.07)));
  const intercept=slide?(action.target[0]-defender.x)*ax+(action.target[1]-defender.z)*az:front;
  const step=action.possession
    ?Math.min(drift,(slide?1.65:.65)*dt)*(1-smooth((age-action.touchedAt)/(slide?.16:.10)))
    :Math.min(drift,Math.max(0,intercept-(slide?.48:.44)));
  defender.x+=ax*step;
  defender.z+=az*step;
  defender.yaw+=signedTurn(action.yaw-defender.yaw)*(1-Math.exp(-dt*(slide?9:13)));
  keepDefenderOutsidePlayer(defender);
  const ballLead=(ballPos[0]-defender.x)*ax+(ballPos[2]-defender.z)*az;
  const ballSide=(ballPos[0]-defender.x)*az-(ballPos[2]-defender.z)*ax;
  const reach=slide?mix(.36,.96*defender.settings.combat,extend):clamp(ballLead,.19,.83*defender.settings.combat);
  const width=slide?sign*.14:clamp(ballSide,-.38,.38);
  const target=[defender.x+ax*reach+az*width,clamp(ballPos[1]-.019,.085,.22),defender.z+az*reach-ax*width];
  const feet=[0,1].map(i=>{
    const striking=i===index,footSide=i===0?1:-1;
    const headingYaw=defender.yaw;
    const fx=-Math.sin(headingYaw),fz=-Math.cos(headingYaw);
    const supportStep=smooth((age-recoverAt-(slide?.04:0))/(slide?.27:.18));
    const strikeStep=smooth((age-recoverAt-(slide?.18:.06))/(slide?.31:.21));
    const progress=striking?strikeStep:supportStep;
    const fore=striking?mix(mix(-.12*low,reach-.10,extend),.10,strikeStep):
      mix((slide?-.26:-.08)*low,-.095,supportStep);
    const spread=striking?mix(mix(footSide*.14,width,extend),footSide*.14,strikeStep):
      footSide*mix(.14,slide?.26:.19,load*(1-progress));
    const swing=Math.sin(Math.PI*progress)*(striking?.095:.059);
    const height=.112+swing+(striking?(slide?.016:.10)*load*(1-extend)*(1-rise):0);
    const base=[defender.x+fx*fore+fz*spread,height,defender.z+fz*fore-fx*spread];
    const entry=smooth(age/(slide?.19:.15));
    const point=base.map((value,k)=>{
      const offset=k===0?defender.x-action.start[0]:k===2?defender.z-action.start[1]:0;
      return mix(action.ankles[i][k]+offset*(striking?.88:.46),value,entry);
    });
    const pitch=striking?mix(mix(-.20*low,slide?-.24:.04,extend),0,strikeStep):-.08*Math.sin(Math.PI*supportStep);
    return {foot:i===0?'LeftFoot':'RightFoot',point,yaw:headingYaw+footSide*.095*low,
      pitch,bank:footSide*.09*low,kneeBend:striking?.34:.55,groundWeight:striking?strikeStep:1,legExtension:0};
  });
  const tacklePool=slide?['soccerTackleSlide']:
    action.pace>3.6?['defTackleSprint','defTackleLunge','defTackleJog']:['defTackleJog','defTackleStand','defTackleLunge'];
  const clipKey=action.clipKey??=tacklePool[((defender.defenderIndex||0)+Math.floor(clock))%tacklePool.length];
  const tackleClip=mocap.clips[clipKey];
  const recoveryDuration=slide?.82:.16;
  const contactTime=tackleClip?(tackleClip.contact||tackleClip.duration*.45):0;
  const plant=!slide&&extend>.42&&!action.possession&&front>-.04&&front<1.15&&Math.abs(lateral)<.56
    ?{foot,point:target,weight:extend*.90,boot:true}:null;
  let pose=tackleClip&&slide?{
    clip:clipKey,
    time:age<=hit?contactTime*(age/Math.max(.05,hit)):
      mix(contactTime,tackleClip.duration,clamp((age-hit)/recoveryDuration,0,1)),
    loop:false,fade:slide?.30:.16,mirror:clipKey==='soccerTackleSlide'?sign>0:sign<0,authoredGround:true,grounded:true,bodyYaw:defender.yaw,
    footPlant:plant
  }:{clip:'idle',poseName:slide?'defenderSlide':'defenderTackle',time:0,grounded:true,fade:slide?.15:.15,bodyYaw:defender.yaw,
    pelvis:{height:mix(.925,slide?.29:.80,low),lateral:sign*(slide?.17:-.053)*low,
      forward:(slide?-.13:.055)*low,
      rotation:[(slide?-.44:.19)*low,sign*.17*low,sign*(slide?.56:-.13)*low]},
    ankleTargets:feet,
    offsets:{
      Spine:[(slide?-.19:.09)*low,sign*-.30*low,sign*-.22*low],
      LeftArm:[(sign>0?.46:-.52)*low,0,-(.31+.33*extend)*low],
      RightArm:[(sign<0?.46:-.52)*low,0,(.31+.33*extend)*low],
      LeftForeArm:[-.46*low,0,0],RightForeArm:[-.46*low,0,0],
      Neck:[-.09*low,sign*.12*low,0]
    },
    handTargets:slide?[{hand:sign===1?'RightHand':'LeftHand',
      point:[defender.x-ax*.45-sign*az*.41,.065,defender.z-az*.45+sign*ax*.41],
      weight:low*.77}]:undefined,
    footPlant:plant};
  if(!slide){
    defender.vx=(defender.x-previousX)/dt;defender.vz=(defender.z-previousZ)/dt;
    if(tackleClip)pose.upperBody={clip:clipKey,time:Math.min(tackleClip.duration,contactTime*age/Math.max(.05,hit)),weight:.65};
    if(age>hit+.07&&!action.possession){
      const base=motion.locomotion(defender,{dt,ball:ballPos,velocity:ballVel,controlled:false,
        recoverable:false,ankles:mocap.get(defender).ankles,suspended:false});
      pose={...base,bodyYaw:defender.yaw,upperBody:pose.upperBody};
    }
  }
  if(!settling&&!action.rollEvaded&&!action.possession&&canTackleBall()){
    const remaining=clamp(hit-age,0,.12);
    const point=predictShotBall(remaining);
    const weight=smooth((age-hit+reachTime)/reachTime)*(1-smooth((age-hit-.025)/.16));
    pose.ballContacts=[{category:'defense',limb:foot,point,normal:[-ax,0,-az],weight,maxCorrection:slide?.50:.38}];
  }
  mocap.update(defender,pose,dt);
  if(!settling&&!action.rollEvaded&&extend>.55&&!action.possession&&!action.cleared&&canTackleBall()){
    const volumes=mocap.get(defender).bootVolumes[index];
    const contact=(point,velocity,padding)=>volumes.reduce((time,volume,i)=>{
      const hit=ballPhysics.sweepBoot(before?.[index]?.[i]??volume,volume,point,velocity,dt,padding);
      return hit?Math.min(time,hit.time):time;
    },Infinity);
    const lineContact=endLineCrossingFraction(ballPos[2],ballPos[2]+ballVel[2]*dt)??Infinity;
    const ballTouch=contact(ballPos,ballVel,.018*defender.settings.combat)<lineContact;
    const bodyTouch=slide&&ballState==='controlled'&&
      mocap.get(player).ankles.some(ankle=>contact(ankle,[player.vx,0,player.vz],.006)<lineContact);
    if(bodyTouch&&!ballTouch){stopForFoul(defender);return;}
    if(ballTouch){
      captureByDefender(defender,action);
    }
  }
  const readyToGetUp=action.possession?age-action.touchedAt>=.28:age>=hit+.30;
  if(slide&&readyToGetUp&&mocap.clips.getup){
    defender.vx=defender.vz=0;
    defender.action={kind:'getup',age:0,mirror:pose.mirror,foot,slide:true,
      next:action.possession??null};
  }else if(action.possession&&!settling){
    if(age-action.touchedAt>=(slide?.12:.035)){
      defender.action=action.possession;
      motion.reset(defender);
      defender.contactRecovery={elapsed:0,duration:slide?.78:.58,side:sign};
    }
  }else if(age>=hit+recoveryDuration){
    resetDefenderPress(defender,slide?defender.settings.retry+.17:Math.min(.16,defender.settings.retry));
  }
}

function defendGetup(defender,action,dt){
  const clip=mocap.clips.getup;
  const time=Math.min(clip.duration,action.age*2.0);
  mocap.update(defender,{clip:'getup',poseName:'defenderGetup',time,loop:false,fade:.28,
    mirror:action.mirror,authoredGround:true,grounded:true,bodyYaw:defender.yaw},dt);
  if(time<clip.duration)return;
  const next=action.next;
  resetDefenderPress(defender,defender.settings.retry);
  if(next&&!terminal())defender.action=next;
}

function defendClearance(defender,action,dt){
  const [fx,,fz]=action.axis;
  const point=(side,height,depth)=>[defender.x+fz*side+fx*depth,height,defender.z-fx*side+fz*depth];
  const sign=action.foot==='LeftFoot'?1:-1,supportIndex=sign===1?1:0;
  if(action.kind==='secure'){
    const dx=action.stance[0]-defender.x,dz=action.stance[1]-defender.z;
    const gap=Math.hypot(dx,dz),turn=signedTurn(action.yaw-defender.yaw);
    motion.move(defender,{dt,direction:gap>.025?[dx/gap,dz/gap]:[0,0],speed:gap>.025?Math.min(3.45,gap*11):0,
      sprint:false,ball:ballPos,velocity:ballVel,controlled:false,
      facing:defender.yaw+clamp(turn,-14*dt,14*dt)});
    poseDefenderRun(defender,dt);
    if(action.age>.016&&(gap<.28&&Math.abs(turn)<.65||action.age>.05)){
      const ankles=mocap.get(defender).ankles.map(value=>[...value]);
      const support=point(-sign*.15,.111,.14);
      if(Math.hypot(ankles[supportIndex][0]-defender.x,ankles[supportIndex][2]-defender.z)<.35){
        support[0]=mix(support[0],ankles[supportIndex][0],.63);
        support[2]=mix(support[2],ankles[supportIndex][2],.63);
      }
      Object.assign(action,{kind:'clear',age:0,impact:.09,fired:false,support,ankles,fromYaw:defender.yaw,
        target:[ballPos[0]-fx*.085,.099,ballPos[2]-fz*.085]});
      defender.vx=defender.vz=0;
    }
    return;
  }
  const impact=action.impact;
  const windEnd=impact*.40;
  const strike=smooth((action.age-windEnd)/(impact-windEnd));
  const brake=smooth((action.age-impact-.03)/.29);
  const wind=smooth(action.age/windEnd)*(1-strike);
  const enter=smooth(action.age/(action.quick?.065:.102));
  const drive=1-smooth(Math.abs(action.age-impact)/(action.quick?.082:.106));
  if(action.quick)action.bootsBefore=mocap.get(defender).bootVolumes;
  defender.yaw=action.fromYaw+signedTurn(action.yaw-action.fromYaw)*smooth(action.age/Math.min(.09,impact));
  const lean=strike*(1-brake);
  const wing=point(sign*(.15+.05*wind),.112+.15*wind+.17*Math.sin(Math.PI*brake),
    mix(-.26*wind,.55,strike)*(1-brake)+.095*brake);
  const support=action.support.map((value,index)=>mix(action.ankles[supportIndex][index],value,enter));
  const lifted=wing.map((value,index)=>mix(action.ankles[1-supportIndex][index],value,enter));
  mocap.update(defender,{clip:'idle',poseName:'defenderClearance',time:0,loop:false,fade:action.quick?.11:.065,grounded:true,bodyYaw:defender.yaw,
    pelvis:{height:.925-.052*wind-.031*lean,lateral:-sign*.049*(wind+lean),forward:.061*lean,
      rotation:[.16*lean-.10*wind,sign*.11*lean,-sign*.11*(wind+lean)]},
    ankleTargets:[
      {foot:sign===1?'RightFoot':'LeftFoot',point:support,yaw:action.yaw-sign*.12,pitch:0,kneeBend:.45,groundWeight:1,legExtension:0},
      {foot:action.foot,point:lifted,yaw:action.yaw,pitch:-.26*wind+.15*lean,kneeBend:.48,groundWeight:brake,legExtension:0}
    ],
    footPlant:drive>0?{foot:action.foot,point:action.target,weight:drive*(action.quick?1:.92),boot:true}:null,
    offsets:{Spine:[.10*lean,sign*.11*lean,0],LeftArm:[-.28*lean,0,-.38*(wind+lean)],
      RightArm:[.26*lean,0,.38*(wind+lean)],LeftForeArm:[-.26*wind,0,0],RightForeArm:[-.26*wind,0,0]}
  },dt);
  if(!action.quick&&!action.fired&&action.age>=impact)strikeClearance(action);
  if(action.age>impact+.355){
    defender.yaw=action.yaw;
    resetDefenderPress(defender,.45);
  }
}

function strikeClearance(action){
  const [fx,,fz]=action.axis;
  const defense=activeDefense();
  if(defense)defense.clearanceUntil=clock+.65;
  if(action.quick){
    ballVel=[fx*29,6,fz*29];
    ballAngular.splice(0,3,fz*15,0,-fx*15);
  }else{
    const distance=25+Math.min(9,Math.abs(ballPos[0])*.35+ballPos[2]*.12);
    const launch=ballPhysics.passLaunch(ballPos,[ballPos[0]+fx*distance,.11,ballPos[2]+fz*distance],
      'lob',{time:1.25+Math.min(.35,distance*.008)});
    ballVel=launch.velocity;ballAngular.splice(0,3,...launch.spin);
  }
  ballState='loose';
  ballAge=0;
  action.fired=true;
  if(action.quick&&shot){
    shot.stopped=true;
    shot.saveChecked=true;
    shot.goalChecked=true;
  }
  announce('BOLA AFASTADA',action.quick?'Corte de primeira do zagueiro.':'O zagueiro mandou a bola para longe.');
  sound(90,.18,'triangle',.18);
}

function advanceGoalReactions(dt){
  const defense=activeDefense();
  if(!defense)return false;
  const isGoal=ballState==='goal'||result?.type==='goal';
  const isFoul=ballState==='foul'||result?.type==='foul';
  const isFreeKick=defense.piece?.kind==='freeKick';
  if(isFreeKick&&terminal()&&!isFoul){
    const celebPool=['victory','sillyDancing'].filter(k=>mocap.clips[k]);
    freeKickAllies.forEach((actor,index)=>{
      if(!actor.fkReaction){
        const clip=isGoal
          ?(celebPool.length?celebPool[index%celebPool.length]:'idle')
          :(index%2?'sadIdle':'sadWalk');
        actor.fkReaction={clip,t:0,offset:index*.23,mirror:index%2===1,
          yaw:isGoal?Math.atan2(actor.x-camera[0],actor.z-camera[2]):actor.yaw};
      }
      const r=actor.fkReaction;
      r.t+=dt;
      const clipObj=mocap.clips[r.clip];
      if(!clipObj)return;
      if(isGoal){
        actor.yaw+=signedTurn(r.yaw-actor.yaw)*Math.min(1,dt*7);
        mocap.update(actor,{clip:r.clip,poseName:'goalCelebration',time:(r.t+r.offset)%Math.max(.1,clipObj.duration),
          loop:true,grounded:true,fade:.24,mirror:r.mirror,bodyYaw:actor.yaw},dt);
      }else{
        if(r.clip==='sadWalk'){
          actor.x=clamp(actor.x-Math.sin(actor.yaw)*dt*.46,-32,32);
          actor.z=clamp(actor.z-Math.cos(actor.yaw)*dt*.46,.4,motion.limits.back);
        }
        mocap.update(actor,{clip:r.clip,poseName:'missReaction',time:(r.t+r.offset)%Math.max(.1,clipObj.duration-.04),
          loop:true,grounded:true,fade:.22,bodyYaw:actor.yaw},dt);
      }
    });
  }
  if(!isGoal)return false;
  defense.defenders.forEach((actor,index)=>{
    if(index%3===2)return;
    actor.action=null;actor.aerialReceive=null;actor.aerialBlock=null;actor.vx=actor.vz=0;
    const clip=index%2?'sadIdle':'sadWalk';
    if(!mocap.clips[clip])return;
    const time=((result?.t??0)+index*.19)%Math.max(.1,mocap.clips[clip].duration-.04);
    if(clip==='sadWalk'){
      actor.x=clamp(actor.x-Math.sin(actor.yaw)*dt*.48,-32,32);
      actor.z=clamp(actor.z-Math.cos(actor.yaw)*dt*.48,.4,motion.limits.back);
    }
    mocap.update(actor,{clip,time,loop:true,grounded:true,fade:.22,bodyYaw:actor.yaw},dt);
  });
  return true;
}

function advanceDefenderHeader(actor,dt){
  const aa=actor.aerialReceive,plan=aa?.headerPlan;
  if(!plan)return false;
  aa.elapsed+=dt;
  const remaining=aa.impact-aa.elapsed;
  if(remaining<-.25&&aa.flight?.done){actor.aerialReceive=null;actor.retry=.2;motion.reset(actor);return false;}
  const point=predictShotBall(Math.max(0,remaining)),offset=shotOffset(plan.geometry.head,plan.yaw);
  const target=remaining>-.03?[point[0]-offset[0],point[2]-offset[1]]:[actor.x,actor.z];
  const axis=[target[0]-actor.x,target[1]-actor.z],gap=Math.hypot(...axis);
  const speed=aa.touched||remaining<=0?0:Math.min(actor.settings.pace,gap/Math.max(.055,remaining));
  actor.yaw+=clamp(signedTurn(plan.yaw-actor.yaw),-dt*12,dt*12);
  motion.move(actor,{dt,direction:gap>.02?norm(axis):[0,0],speed,sprint:speed>3.6,
    ball:ballPos,velocity:ballVel,controlled:false,facing:actor.yaw});
  keepDefenderOutsidePlayer(actor);
  const rig=mocap.get(actor);actor.headerBefore=rig.head?[...rig.head]:null;
  aa.time=clamp(aa.startT+aa.elapsed*aa.rate,0,mocap.clips[aa.clip].duration-.01);
  const base=actor.aerialFlight?.airborne?null:motion.locomotion(actor,{dt,ball:ballPos,velocity:ballVel,
    controlled:false,recoverable:false,ankles:rig.ankles,suspended:false});
  const pose=motion.aerialPose(actor,aa,{time:aa.time,contact:aa.contact,start:aa.startT,
    rate:aa.rate,height:aa.jumpHeight,end:aa.end,dt,base,yaw:actor.yaw});
  mocap.update(actor,pose,dt);
  return true;
}

function poseDefenderRun(defender,dt){
  if(defender.aerialReceive){
    const aa=defender.aerialReceive;
    aa.time+=dt*aa.rate;aa.elapsed+=dt;
    const base=defender.aerialFlight?.airborne?null:motion.locomotion(defender,{dt,ball:ballPos,velocity:ballVel,
      controlled:false,recoverable:false,ankles:mocap.get(defender).ankles,suspended:false});
    const pose=motion.aerialPose(defender,aa,{time:Math.min(aa.time,mocap.clips[aa.clip].duration),
      contact:aa.contact,start:aa.startT,rate:aa.rate,height:aa.jumpHeight??0,end:aa.end??1.4,dt,base});
    mocap.update(defender,pose,dt);
    if(!aa.flight.done)return;
    defender.aerialReceive=null;motion.reset(defender);
  }
  if(defender.aerialBlock){
    const action=defender.aerialBlock;action.age+=dt;
    if(action.age<.65||action.flight&&!action.flight.done){
      const time=.48+action.age*(1.1/.65);
      action.clip=action.height>.05?'headerJump':'headerStand';
      const pose=motion.aerialPose(defender,action,{time,contact:.92,start:.48,rate:1.1/.65,
        height:action.height,end:1.58,dt});
      mocap.update(defender,pose,dt);
      return;
    }
    defender.aerialBlock=null;
  }
  const pose=motion.locomotion(defender,{dt,ball:ballPos,velocity:ballVel,controlled:false,
    recoverable:false,ankles:mocap.get(defender).ankles,suspended:false});
  defenderGripPose(defender,pose);
  if(defender.blockWeight>.02){
    const stance=defender.blockWeight;
    pose.offsets={...pose.offsets,Spine:[.12*stance,0,0],
      LeftArm:[-.16*stance,0,-.12*stance],RightArm:[-.16*stance,0,.12*stance],
      LeftForeArm:[-.42*stance,0,0],RightForeArm:[-.42*stance,0,0]};
  }
  mocap.update(defender,pose,dt);
}

function updateDefenderGrip(dt){
  player.grip=player.pressure=0;
  player.gripActor=null;
  let staminaPressure=0;
  for(const defender of activeDefense()?.defenders??[]){
    const dx=defender.x-player.x,dz=defender.z-player.z,gap=Math.hypot(dx,dz);
    const angle=signedTurn(Math.atan2(dx,dz)-defender.yaw);
    const aggression=defender.settings.aggression;
    const forward=-Math.sin(player.yaw)*dx-Math.cos(player.yaw)*dz;
    const frontal=forward/Math.max(.01,gap)>.55;
    if(ballState!=='controlled'||frontal||gap>1.55)defender.duelTime=0;
    else if(gap<1.30&&!defender.action?.slide)defender.duelTime=(defender.duelTime??0)+dt;
    else defender.duelTime=Math.max(0,(defender.duelTime??0)-dt*2);
    if((ballState==='controlled'||ballState==='loose'&&nearBall(2))&&!defender.action?.slide){
      const pressure=smooth((1.95-gap)/1.22);
      player.pressure+=pressure;
      staminaPressure+=pressure*aggression;
    }
    defender.gripDelay=Math.max(0,defender.gripDelay-dt);
    if(defender.action&&defender.action.kind!=='tackle'||defender.action?.slide||defender.blockTarget||ballState!=='controlled'||gap>1.16||Math.abs(angle)>1.82){
      if(defender.grip)defender.gripDelay=.3;
      defender.grip=null;
      continue;
    }
    if(!defender.grip&&!defender.gripDelay&&gap<1.02&&Math.abs(angle)<1.64){
      const side=-dx*Math.cos(defender.yaw)+dz*Math.sin(defender.yaw);
      const hands=mocap.get(defender).hands,chest=mocap.get(player).chest;
      const hand=hands&&chest&&Math.hypot(...sub(hands[0],chest))<Math.hypot(...sub(hands[1],chest))?'LeftHand':'RightHand';
      defender.grip={age:0,hand,weight:0,target:player};
    }
    if(!defender.grip)continue;
    const age=defender.grip.age+=dt;
    const release=resistanceTime()+.28;
    if(age>release+.22){
      defender.gripDelay=.42;
      defender.grip=null;
      continue;
    }
    const weight=clamp(smooth(age/.10)*smooth((1.18-gap)/.46)*(1-smooth((age-release)/.21))*aggression,0,1);
    defender.grip.weight=weight;
    if(weight>player.grip){player.grip=weight;player.gripActor=defender;}
  }
  player.pressure=clamp(player.pressure,0,1);
  player.defensiveDrain=9.5*clamp(staminaPressure,0,1.42);
  player.pressureTime=ballState==='controlled'
    ?clamp((player.pressureTime||0)+(player.pressure>.22?dt*mix(.55,1.1,player.pressure):-dt*1.45),0,3):0;
}

function resistanceTime(){
  return clamp(.14+(mark().strength-45)*.009,.10,.65);
}

function interceptRun(defender,pace){
  const defense=activeDefense();
  if(ballState!=='controlled'||pace<3.2||player.grip>.30||clock<defense.slideCooldown||
    defense.defenders.some(other=>other.action?.slide))return null;
  const pv=[player.vx,player.vz],speed=Math.hypot(...pv);
  const gap=Math.hypot(defender.x-player.x,defender.z-player.z);
  const read=defender.settings.intelligence;
  if(speed<2.5||gap<1.95||gap>4.8+.65*read)return null;
  for(const time of [.36,.46,.56]){
    const x=player.x+pv[0]*time+pv[0]/speed*.48,z=player.z+pv[1]*time+pv[1]/speed*.48;
    const dx=x-defender.x,dz=z-defender.z,dist=Math.hypot(dx,dz);
    const heading=Math.atan2(-dx,-dz);
    const cross=(dx*pv[0]+dz*pv[1])/Math.max(.01,dist*speed);
    if(cross<-.48||cross>.76||Math.abs(signedTurn(heading-defender.yaw))>.58+.14*read||dist>pace*time*.93+.90+.24*read)continue;
    return {target:[x,z],axis:[dx/dist,dz/dist],heading};
  }
  return null;
}

function assignDefensiveRoles(defense){
  const available=defense.defenders.filter(a=>!a.action),plans=new Map();
  if(!available.length)return {lead:null,plans};
  if(ballState==='defender'||clock<(defense.clearanceUntil??0)){
    available.forEach((actor,index)=>{
      const side=actor.x>=ballPos[0]?1:-1;
      plans.set(actor,{role:'releaseSpace',paceScale:.85,target:[
        clamp(ballPos[0]+side*(5+index*2.1),-motion.limits.side+1.2,motion.limits.side-1.2),
        clamp(ballPos[2]+(index%2?3:-3),1.2,motion.limits.back-1)]});
    });
    return {lead:null,plans};
  }
  const delivery=teamAI.delivery,inTransit=['pass','loose'].includes(ballState);
  const carrier=ballState==='controlled'?player:teamAI.owner;
  const backs=defense.defenders.filter(a=>a.role==='ZAG').sort((a,b)=>a.index-b.index);
  const threats=[player,...teamAI.actors()];
  const lineDepth=clamp(ballPos[2]-6,5,18);
  const compact=smooth((27-ballPos[2])/16);
  const blockShift=clamp(ballPos[0]*.28,-5,5);
  const striker=threats.find(a=>a.formationRole==='ST');
  const strikerMarker=striker?backs.reduce((best,a)=>!best||Math.abs(a.x-striker.x)<Math.abs(best.x-striker.x)?a:best,null):null;
  for(const actor of available){
    const wide=actor.role==='LE'||actor.role==='LD',side=actor.role==='LE'?-1:1;
    let mark=null,x,z;
    if(wide){
      mark=threats.find(a=>a.formationRole===(side<0?'LW':'RW'));
      const farSide=side*ballPos[0]<-5;
      const width=farSide?mix(15,10,compact):mix(17,13,compact);
      const laneX=side*width+blockShift;
      x=mark?mix(laneX,clamp(mark.x,side<0?-23:8,side<0?-8:23),farSide?.25:.55):laneX;
      z=mark?clamp(mix(lineDepth+1,mark.z-1.6,.45),5,lineDepth+5):lineDepth+1;
    }else if(actor.role==='VOL'){
      mark=player;x=clamp(player.x*.9,-14,14);z=clamp(player.z-1.8,lineDepth+2,lineDepth+8);
    }else{
      const index=backs.indexOf(actor),spread=backs.length>1?(index%2?-1:1)*mix(4.8,3.4,compact):0;
      x=clamp(blockShift+spread,-9,9);z=lineDepth+(index%2?1.5:0);
      if(striker&&actor===strikerMarker&&striker.z<20){
        mark=striker;x=clamp(x*.65+striker.x*.35,spread<0?-11:1,spread<0?-1:11);z=clamp(striker.z-2,5,lineDepth+2);
      }
    }
    actor.markActor=mark;actor.defenseRole=wide?'wideMark':actor.role==='VOL'?'midfieldMark':'cover';
    plans.set(actor,{role:actor.defenseRole,markActor:mark,paceScale:.92,target:[x,z]});
  }
  let lead=null,best=Infinity,meet=null;
  for(const actor of available){
    const gap=Math.hypot(actor.x-ballPos[0],actor.z-ballPos[2]);
    const intercept=inTransit?teamAI.interception(actor,{pace:actor.settings.pace,height:2.45}):null;
    const zone=plans.get(actor).target;
    const local=gap<5.2;
    const dangerous=ballPos[2]<23&&Math.abs(ballPos[0])<15&&gap<9;
    const assigned=carrier&&actor.markActor===carrier&&(actor.role==='VOL'?gap<12:gap<6);
    const canIntercept=intercept?.reachable&&intercept.time<.65&&Math.hypot(intercept.x-zone[0],intercept.z-zone[1])<5;
    if(!local&&!assigned&&!canIntercept&&!(dangerous&&actor.role==='ZAG'))continue;
    const cost=(canIntercept?intercept.time:gap/actor.settings.pace)+
      Math.hypot(actor.x-zone[0],actor.z-zone[1])*.035-(assigned?.35:0)-(defense.pressActor===actor?.22:0);
    if(cost<best){best=cost;lead=actor;meet=canIntercept?intercept:null;}
  }
  defense.pressActor=lead;
  if(lead){
    lead.defenseRole=meet?'intercept':'press';
    plans.set(lead,{role:lead.defenseRole,intercept:meet,paceScale:1,target:meet?[meet.x,Math.max(.45,meet.z)]:
      [clamp(ballPos[0]+ballVel[0]*.2,-motion.limits.side+1,motion.limits.side-1),Math.max(.6,ballPos[2]+ballVel[2]*.2)]});
  }
  if(lead&&carrier&&ballPos[2]<25){
    const cover=backs.filter(a=>a!==lead&&plans.has(a)).sort((a,b)=>Math.abs(a.x-ballPos[0]*.45)-Math.abs(b.x-ballPos[0]*.45))[0];
    if(cover){
      const slot=plans.get(cover),channel=clamp(ballPos[0]*.45,-7,7);
      slot.target=[mix(slot.target[0],channel,.65),clamp(ballPos[2]-4,3,lineDepth+1)];
      slot.paceScale=1;
    }
  }
  return {lead,plans};
}

function advanceDefender(defender,dt,leadDefender,plan,defense){
  if(careerPlay?.transition||terminal()||trainingFadeUntil)return;
  const head=mocap.get(defender).head;defender.headerBefore=head?[...head]:null;
  const action=defender.action;
  if(action){
    action.age+=dt;
    if(action.kind==='tackle')defendTackle(defender,action,dt);
    else if(action.kind==='getup')defendGetup(defender,action,dt);
    else defendClearance(defender,action,dt);
    return;
  }
  if(!defender.aerialReceive&&['pass','loose','flight'].includes(ballState)&&ballPos[1]>.8&&
    (plan?.role==='intercept'||Math.hypot(ballPos[0]-defender.x,ballPos[2]-defender.z)<5)){
    const header=findHeaderContact(defender,true);
    if(header&&header.time<.68){
      const startT=header.jump?.12:.22;
      defender.aerialReceive={kind:'head',clip:header.clip,headerPlan:header,elapsed:0,impact:header.time,
        time:startT,startT,end:header.jump?1.42:1.4,jumpHeight:header.jumpHeight,
        rate:(header.strike-startT)/header.time,contact:header.strike,touched:false};
      defender.aerialBlock=null;defender.blockTarget=null;motion.reset(defender);
    }
  }
  if(defender.aerialReceive?.headerPlan&&advanceDefenderHeader(defender,dt))return;
  if(plan?.role==='intercept'&&!defender.aerialReceive&&plan.intercept.y>.45&&
    plan.intercept.y<2.65&&plan.intercept.time<.58){
    const point=plan.intercept,aa=aerialReception(defender,[point.x,point.y,point.z],point.time);
    if(point.y>=1.45){
      const jump=point.y>1.85;
      const startT=jump?.28:.42,contact=jump?.92:.97;
      const arrival=Math.max(.12,point.time);
      const rate=clamp((contact-startT)/arrival,.65,2.1);
      Object.assign(aa,{kind:'head',clip:jump?'headerJump':'headerStand',startT,contact,
        end:jump?1.42:1.4,rate,time:clamp(contact-arrival*rate,startT,contact-.04),jumpHeight:jump?clamp(point.y-1.68,0,.72):0});
    }
    aa.elapsed=0;defender.aerialReceive=aa;defender.aerialBlock=null;
  }
  defender.retry=Math.max(0,defender.retry-dt);
  const dx=ballPos[0]-defender.x,dz=ballPos[2]-defender.z,gap=Math.hypot(dx,dz);
  const facing=Math.atan2(-dx,-dz);
  const turn=signedTurn(facing-defender.yaw);
  if(defender.blockTarget){
    const [x,z]=defender.blockTarget;
    const ax=x-defender.x,az=z-defender.z;
    const distance=Math.hypot(ax,az);
    const speed=Math.min(defender.settings.pace,Math.max(0,(distance-.08)*7.8));
    defender.blockWeight=mix(defender.blockWeight,1-smooth((distance-.16)/.78),1-Math.exp(-dt*10));
    motion.move(defender,{dt,direction:distance>.08?[ax/distance,az/distance]:[0,0],speed,sprint:speed>3.8,
      ball:ballPos,velocity:ballVel,controlled:false,facing:defender.yaw+clamp(turn,-11*dt,11*dt)});
    keepDefenderOutsidePlayer(defender);
    poseDefenderRun(defender,dt);
    return;
  }
  defender.blockWeight*=Math.exp(-dt*13);
  const pace=Math.hypot(defender.vx,defender.vz);
  const isPresser=leadDefender===defender;
  const interception=!defender.retry&&isPresser?interceptRun(defender,pace):null;
  const slide=!!interception;
  const {combat}=defender.settings;
  const carrier=teamAI.owner??player;
  const exposed=Math.hypot(ballPos[0]-carrier.x,ballPos[2]-carrier.z)>.7||!!carrier.cutting;
  const canCommit=ballState!=='controlled'||gap<1.35*combat||exposed&&gap<1.8;
  // Só dá bote se for o marcador principal OU se o atacante invadir diretamente sua zona (< 1.15m)
  const stepWindow=motion.defensiveWindow(defender);
  const footReach=Math.min(...mocap.get(defender).boots.map(point=>Math.hypot(point[0]-ballPos[0],point[2]-ballPos[2])));
  const closePoke=footReach<.60&&gap<1.1;
  const strideReady=stepWindow?.available||closePoke||pace<.5&&gap<.85;
  if(canTackleBall()&&!defender.retry&&gap>.05&&(slide||strideReady&&canCommit&&gap<(isPresser?1.5:1.2)*combat&&(closePoke||Math.abs(turn)<1.30*combat))){
    const side=dx*Math.cos(defender.yaw)-dz*Math.sin(defender.yaw);
    const foot=!slide&&closePoke?(Math.hypot(...sub(mocap.get(defender).boots[0],ballPos))<Math.hypot(...sub(mocap.get(defender).boots[1],ballPos))?'LeftFoot':'RightFoot'):
      !slide&&stepWindow?stepWindow.foot:side>=0?'RightFoot':'LeftFoot';
    if(slide){defender.grip=null;defender.gripDelay=.35;}
    if(slide)activeDefense().slideCooldown=clock+2.65;
    defender.action={kind:'tackle',age:0,axis:interception?.axis??[dx/gap,dz/gap],yaw:interception?.heading??facing,
      target:interception?.target,foot,slide,
      hit:slide?.33/combat:Math.min(.11,stepWindow?.remaining??defender.settings.windup),pace:slide?clamp(pace+1.05,4.2,6.05):Math.max(2.3,Math.min(4.8,pace+.7)),
      start:[defender.x,defender.z],ankles:mocap.get(defender).ankles.map(point=>[...point])};
    return;
  }
  let tx=plan?plan.target[0]:ballPos[0];
  let tz=plan?plan.target[1]:ballPos[2];
  const closeDuel=(ballState==='controlled'||ballState==='teammate')&&
    (isPresser||Math.hypot(defender.x-carrier.x,defender.z-carrier.z)<1.05)&&
    Math.hypot(defender.x-carrier.x,defender.z-carrier.z)<7.0;
  if(closeDuel)[tx,tz]=defenderDuelTarget(defender,carrier);
  else if(isPresser&&(ballState==='controlled'||ballState==='teammate')){
    const intercept=predictCarrierIntercept(defender,carrier);
    if(intercept){tx=intercept.x;tz=intercept.z;}
  }
  // Separação tática para evitar que zagueiros de cobertura se aglomerem em bloco
  if(!isPresser&&defense&&!closeDuel){
    for(const other of defense.defenders){
      if(other===defender)continue;
      const ox=defender.x-other.x,oz=defender.z-other.z,od=Math.hypot(ox,oz);
      if(od>.01&&od<2.8){
        const push=(2.8-od)*1.2;
        tx+=ox/od*push;
        tz+=oz/od*push;
      }
    }
    tx=clamp(tx,-motion.limits.side+1.4,motion.limits.side-1.4);
    tz=clamp(tz,1.4,motion.limits.back-1);
  }
  const adjusting=!isPresser&&!closeDuel&&plan&&['wideMark','midfieldMark','cover'].includes(plan.role);
  if(adjusting){
    const phase=clock*.52+(defender.index??0)*2.1;
    tx+=Math.sin(phase)*.8+clamp((ballVel[0]??0)*.08,-.4,.4);
    tz+=Math.cos(phase)*.55;
  }
  const approach=[tx-defender.x,tz-defender.z];
  const approachDist=Math.hypot(...approach);
  const direction=norm(approach);
  const stopAt=isPresser?(defender.grip?.weight>.05?.63:.36):adjusting?.12:.65;
  const paceScale=plan?.paceScale??1;
  const carrierSpeed=closeDuel?Math.hypot(carrier.vx??0,carrier.vz??0):0;
  const speed=Math.min(adjusting&&approachDist<2.8?1.4:defender.settings.pace*paceScale,closeDuel?Math.max(0,carrierSpeed*.95+(approachDist-.12)*4):Math.max(0,(approachDist-stopAt)*7.6));
  const faceBall=gap<2.4||!isPresser&&approachDist<1.1;
  motion.move(defender,{dt,direction,speed,sprint:speed>3.6,ball:ballPos,velocity:ballVel,controlled:false,
    facing:speed<1.6&&pace<1.6&&faceBall?defender.yaw+clamp(turn,-10*dt,10*dt):undefined});
  keepDefenderOutsidePlayer(defender);
  poseDefenderRun(defender,dt);
}

function updateFreeKickActor(actor,dt,piece){
  const b=actor.fkBehavior;
  if(!b||dt<=0||dt>.25)return;
  b.clock+=dt;
  const focusX=shot?ballPos[0]:piece.x,focusZ=shot?ballPos[2]:piece.z;
  const lookBallYaw=Math.atan2(actor.x-focusX,actor.z-focusZ);
  const stepToward=(tx,tz,maxSpeed)=>{
    const prevX=actor.x,prevZ=actor.z;
    const dx=tx-prevX,dz=tz-prevZ,dist=Math.hypot(dx,dz);
    const maxMove=maxSpeed*dt;
    if(dist>maxMove&&dist>.0001){actor.x=prevX+dx/dist*maxMove;actor.z=prevZ+dz/dist*maxMove;}
    else{actor.x=tx;actor.z=tz;}
    return [(actor.x-prevX)/dt,(actor.z-prevZ)/dt];
  };
  if(b.kind==='duel'){
    const partner=b.partner;
    const t=b.clock;
    const sway=Math.sin(t*1.65+b.phase)-Math.sin(b.phase);
    const push=Math.sin(t*2.9+b.phase*1.7)-Math.sin(b.phase*1.7);
    const targetX=clamp(b.homeX+b.lat[0]*sway*.22+b.dep[0]*push*.12,-halfWidth+1.3,halfWidth-1.3);
    const targetZ=clamp(b.homeZ+b.lat[1]*sway*.22+b.dep[1]*push*.12,2.2,fieldLength/2-1.3);
    const [vx,vz]=stepToward(targetX,targetZ,1.8);
    const partnerYaw=partner?Math.atan2(actor.x-partner.x,actor.z-partner.z):lookBallYaw;
    const targetYaw=shot?lookBallYaw:lookBallYaw+signedTurn(partnerYaw-lookBallYaw)*(.38+.18*Math.sin(t*1.1+b.phase));
    actor.yaw+=signedTurn(targetYaw-actor.yaw)*Math.min(1,dt*6);
    const speed=Math.hypot(vx,vz);
    const rightAxis=[Math.cos(actor.yaw),-Math.sin(actor.yaw)];
    const latSpeed=vx*rightAxis[0]+vz*rightAxis[1];
    const moving=speed>.22&&Math.abs(latSpeed)>.14;
    const clip=moving?(latSpeed>0?'right':'left'):'idle';
    const cycle=mocap.clips[clip];
    b.animTime=(b.animTime??0)+dt*(moving?clamp(speed/1.5,.65,1.25):1);
    const lean=.08+.06*Math.max(0,Math.sin(t*2.9+b.phase*1.7));
    const armRaise=.34+.14*Math.sin(t*2.4+b.phase);
    mocap.update(actor,{clip,poseName:'freeKickDuel',time:b.animTime%Math.max(.1,cycle.duration),loop:true,grounded:true,fade:.20,
      bodyYaw:actor.yaw,
      offsets:{Spine:[lean,sway*.04,0],Neck:[-lean*.4,signedTurn(lookBallYaw-actor.yaw)*.35,0],
        LeftArm:[-armRaise,0,-.22],RightArm:[-armRaise,0,.22],
        LeftForeArm:[-.52,0,0],RightForeArm:[-.52,0,0]}},dt);
    return;
  }
  // kind === 'strafe': anda suavemente para os lados aguardando a cobrança
  const t=b.clock;
  const wave=Math.sin(t*b.speed+b.phase)-Math.sin(b.phase);
  const dWave=Math.cos(t*b.speed+b.phase)*b.speed;
  const targetX=clamp(b.homeX+b.lat[0]*wave*b.amp,-halfWidth+1.4,halfWidth-1.4);
  const targetZ=clamp(b.homeZ+b.lat[1]*wave*b.amp,2.2,fieldLength/2-1.4);
  const [vx,vz]=stepToward(targetX,targetZ,1.95);
  actor.yaw+=signedTurn(lookBallYaw-actor.yaw)*Math.min(1,dt*6);
  const rightAxis=[Math.cos(actor.yaw),-Math.sin(actor.yaw)];
  const latSpeed=vx*rightAxis[0]+vz*rightAxis[1];
  const moving=!shot&&Math.abs(dWave)>.22&&Math.abs(latSpeed)>.18;
  const clip=moving?(latSpeed>0?'right':'left'):'idle';
  const cycle=mocap.clips[clip];
  b.animTime=(b.animTime??0)+dt*(moving?clamp(Math.abs(latSpeed)/1.65,.6,1.25):1);
  mocap.update(actor,{clip,poseName:'freeKickStrafe',time:b.animTime%Math.max(.1,cycle.duration),loop:true,grounded:true,fade:.22,
    bodyYaw:actor.yaw},dt);
}

function updateWallPose(dt){
  const defense=activeDefense();
  if(!defense)return;
  const piece=defense.piece;
  const humanWall=defense.humanWall??[];
  for(const actor of humanWall){
    actor.wallClock=(actor.wallClock??0)+Math.min(dt,.1);
    const since=shot?.wallTime==null?-1:shot.t-shot.wallTime-actor.wallTiming;
    const crouch=smooth((since+.29)/.12)*(1-smooth((since+.16)/.067));
    const jump=actor.wallJump?Math.sin(Math.PI*clamp((since+.115)/.35,0,1))**1.12:0;
    const landing=actor.wallJump?smooth((since-.19)/.10)*(1-smooth((since-.32)/.16)):0;
    const forward=[-Math.sin(actor.yaw),-Math.cos(actor.yaw)];
    const right=[-forward[1],forward[0]];
    const stance=actor.wallStance;
    const phase=actor.wallPhase??0;
    const idleScale=shot?0:1;
    const t=actor.wallClock;
    const sway=idleScale*Math.sin(t*(1.25+(stance%2)*.22)+phase);
    const breath=idleScale*Math.sin(t*(2.15+(stance%3)*.18)+phase*1.3);
    const glance=idleScale*Math.sin(t*.78+phase*1.9);
    const lift=jump*actor.wallLift;
    const hip=.956-(actor.wallJump?.09:.055)*crouch-.057*landing+lift+breath*.009;
    const point=(lateral,height,depth)=>[actor.x+right[0]*lateral+forward[0]*depth,height,
      actor.z+right[1]*lateral+forward[1]*depth];
    const guardLeft=stance===0||stance===2;
    const lowSide=guardLeft?1:-1;
    const highHand=point(lowSide*.16+sway*.012,hip+(stance%2?.44:.48)+breath*.008,.16+crouch*.08);
    const highElbow=[-right[0]*lowSide*.62+forward[0]*.25,-.30,-right[1]*lowSide*.62+forward[1]*.25];
    const lowHand=point(lowSide*.045+sway*.008,hip-.17+(stance%2)*.022,.19);
    const lowElbow=[right[0]*lowSide*.68-forward[0]*.20,-.24,right[1]*lowSide*.68-forward[1]*.20];
    mocap.update(actor,{clip:'idle',poseName:'wall',time:0,fade:.10,
      pelvis:{height:hip,lateral:.012*(stance-1.5)+sway*.018,forward:.018+crouch*.067+breath*.006,
        rotation:[.044+crouch*.16+breath*.012,sway*.025,.023*(guardLeft?1:-1)+sway*.022]},
      ankleTargets:['LeftFoot','RightFoot'].map((foot,i)=>({
        foot,point:point((i?1:-1)*(.149+stance*.012),.108+lift*(i?1:.91),(i?-.025:.032)*(guardLeft?1:-1)),
        yaw:actor.yaw+(i?-.10:.10),pitch:-.18*jump,kneeBend:.14+.39*crouch+.33*landing+Math.max(0,(i?sway:-sway))*.035,groundWeight:1,legExtension:0
      })),
      offsets:{LeftArm:[-.28,0,-.17],RightArm:[-.28,0,.17],LeftForeArm:[-.54,0,0],RightForeArm:[-.54,0,0],
        Spine:[-.04-.10*crouch+breath*.018,(stance-1.5)*.035+sway*.032,sway*.018],
        Neck:[.025+.13*jump+breath*.015,(guardLeft?-1:1)*.16*jump+glance*.075,0]},
      handTargets:[{hand:guardLeft?'LeftHand':'RightHand',point:highHand,pole:highElbow,followForearm:true,weight:1},
        {hand:guardLeft?'RightHand':'LeftHand',point:lowHand,pole:lowElbow,followForearm:true,weight:.96}]},dt);
  }
  if(piece?.kind==='freeKick'&&dt<.5){
    for(const actor of defense.defenders??[])if(actor.role==='ZAG'&&actor.fkBehavior)updateFreeKickActor(actor,dt,piece);
    for(const actor of freeKickAllies)if(actor.fkBehavior)updateFreeKickActor(actor,dt,piece);
  }
}

function prepareDefensiveBlocks(defense){
  if(ballState==='flight')return;
  for(const actor of defense.defenders)actor.blockTarget=null;
  if(ballState!=='controlled'||ballPos[2]<2||!(charging||windup&&!windup.fired))return;
  const aimX=clamp(windup?.aim.x??aim.x,-3.15,3.15);
  const candidates=[];
  for(const actor of defense.defenders){
    if(actor.action||actor.z>ballPos[2]+.85)continue;
    const read=actor.settings.intelligence;
    if(careerPlay&&!windup&&charge<Math.max(0,.16-.28*read))continue;
    const z=clamp(actor.z,1.08,ballPos[2]-.92);
    const x=mix(aimX,ballPos[0],z/ballPos[2]);
    const cost=Math.hypot(x-actor.x,z-actor.z);
    if(cost<4.6+1.45*read)candidates.push({actor,target:[x,z],cost:cost/actor.settings.pace-.18*read});
  }
  candidates.sort((a,b)=>a.cost-b.cost);
  for(const option of candidates.slice(0,1)){
    option.actor.blockTarget=option.target;
    option.actor.grip=null;
    option.actor.gripDelay=Math.max(option.actor.gripDelay,.20);
  }
}

function findGoalLineClearance(defense){
  if(!shot||shot.goalChecked||!['flight','loose'].includes(ballState)||ballVel[2]>=-.30||ballPos[2]>8.5)return null;
  if(shot.clearanceChecked>clock)return shot.clearancePlan;
  shot.clearanceChecked=clock+.055;
  shot.clearancePlan=null;
  const goal=predictBallCrossing(0);
  if(!goal||Math.abs(goal.x)>3.55||goal.y>2.33||goal.time<.065||goal.time>1.15)return null;
  const position=[...ballPos],velocity=[...ballVel],spin=[...ballAngular];
  const step=1/120;
  let score=Infinity;
  for(let t=step;t<Math.min(goal.time-.025,.87);t+=step){
    ballPhysics.step(position,velocity,spin,step/2,true,shotGroundFriction());
    ballPhysics.step(position,velocity,spin,step/2,true,shotGroundFriction());
    if(t<.090||position[1]>.54||position[2]>3.8||position[2]<.50)continue;
    const [x,y,z]=position;
    const axis=norm([Math.sign(x||goal.x||1)*.65,.84]);
    const stance=[x-axis[0]*.35,Math.max(motion.limits.front,z-axis[1]*.36)];
    for(const actor of defense.defenders){
      if(actor.action)continue;
      const dx=stance[0]-actor.x,dz=stance[1]-actor.z,range=Math.hypot(dx,dz);
      const pace=range>.03?Math.max(0,((actor.vx||0)*dx+(actor.vz||0)*dz)/range):0;
      const time=Math.max(0,t-(.105-.060*actor.settings.intelligence));
      const reach=Math.min(actor.settings.pace*time,pace*time+4.3*time*time);
      if(range>reach+.44)continue;
      const cost=t+range*.105;
      if(cost<score){
        score=cost;
        shot.clearancePlan={actor,when:clock+t,point:[x,y,z],stance,axis};
      }
    }
  }
  return shot.clearancePlan;
}

function advanceGoalLineClearance(actor,plan,dt){
  const [fx,fz]=plan.axis;
  const yaw=Math.atan2(-fx,-fz);
  const remaining=plan.when-clock;
  const range=Math.hypot(actor.x-plan.point[0],actor.z-plan.point[2]);
  if(remaining>=.045&&remaining<=.215&&range<.68){
    const sign=(plan.point[0]-actor.x)*-Math.cos(yaw)+(plan.point[2]-actor.z)*Math.sin(yaw)>=0?1:-1;
    actor.vx=actor.vz=0;
    actor.grip=null;
    actor.blockTarget=null;
    actor.action={kind:'clear',quick:true,age:dt,impact:remaining,fired:false,yaw,fromYaw:actor.yaw,axis:[fx,0,fz],
      foot:sign===1?'LeftFoot':'RightFoot',ankles:mocap.get(actor).ankles.map(value=>[...value]),
      support:[actor.x+Math.cos(yaw)*sign*.14,.111,actor.z-Math.sin(yaw)*sign*.14],
      target:[plan.point[0]-fx*.070,plan.point[1],plan.point[2]-fz*.070]};
    defendClearance(actor,actor.action,dt);
    return;
  }
  const dx=plan.stance[0]-actor.x,dz=plan.stance[1]-actor.z,gap=Math.hypot(dx,dz);
  const speed=Math.min(actor.settings.pace,gap/Math.max(.095,remaining-.11));
  const turn=signedTurn(yaw-actor.yaw);
  actor.blockWeight*=Math.exp(-dt*13);
  motion.move(actor,{dt,direction:norm([dx,dz]),speed,sprint:speed>3.6,ball:ballPos,velocity:ballVel,
    controlled:false,facing:actor.yaw+clamp(turn,-dt*12,dt*12)});
  poseDefenderRun(actor,dt);
}

function advanceDefense(dt){
  const defense=activeDefense();
  if(!defense)return;
  if(advanceGoalReactions(dt))return;
  if(terminal()&&!defense.piece){
    for(const actor of defense.defenders){
      const action=actor.action;
      if(action?.kind==='tackle'||action?.kind==='getup'){
        action.age+=dt;
        if(action.kind==='tackle')defendTackle(actor,action,dt,true);
        else defendGetup(actor,action,dt);
      }else{
        actor.vx=actor.vz=0;
        poseDefenderRun(actor,dt);
      }
    }
    return;
  }
  if(defense.transition||terminal()||trainingFadeUntil)return;
  if(defense.piece){
    updateWallPose(dt);
    return;
  }
  prepareDefensiveBlocks(defense);
  const clearance=findGoalLineClearance(defense);
  const {lead,plans}=assignDefensiveRoles(defense);
  for(const actor of defense.defenders){
    if(clearance?.actor===actor&&!actor.action)advanceGoalLineClearance(actor,clearance,dt);
    else advanceDefender(actor,dt,lead,plans.get(actor),defense);
    if(defense.transition||trainingFadeUntil)break;
  }
}

function shotOffset(point,yaw){
  const sine=Math.sin(yaw),cosine=Math.cos(yaw);
  return [-cosine*point[0]-sine*point[2],sine*point[0]-cosine*point[2]];
}

function predictShotBall(seconds){
  const position=[...ballPos],velocity=[...ballVel],spin=[...ballAngular];
  for(let time=0;time<seconds;){
    const step=Math.min(1/240,seconds-time);
    ballPhysics.step(position,velocity,spin,step,ballState!=='controlled');
    time+=step;
  }
  return position;
}

function findHeaderContact(actor=player,defending=false){
  headerSpecs??=[false,true].map(jump=>{
    const clip=jump?'headerJump':'headerStand',strike=jump?.92:.97;
    return {clip,strike,jump,geometry:mocap.shotGeometry(clip,strike,'RightFoot')};
  });
  const p=[...ballPos],v=[...ballVel],spin=[...ballAngular];
  const speed=actor===player?Math.min(6.4,Math.max(5.2,playerPace(true))):actor.settings?.pace??6.25;
  for(let step=1;step<=192;step++){
    ballPhysics.step(p,v,spin,1/120,true);
    if(step%3||p[2]<footballGoalLineZ||p[1]<1.32||p[1]>2.72)continue;
    const time=step/120;
    const delivery=teamAI.delivery;
    if(!defending&&delivery?.kind==='cross'&&delivery.target===actor&&
      (v[1]>0||Math.abs(clock+time-delivery.contactAt)>.38))continue;
    const stand=headerSpecs[0],spec=p[1]>stand.geometry.head[1]+.2?headerSpecs[1]:stand;
    if(time<(spec.jump?.24:.13)||p[1]<spec.geometry.head[1]-.31||p[1]>spec.geometry.head[1]+(spec.jump?.75:.3))continue;
    const yaw=defending?Math.atan2(-Math.sign(p[0]||1)*12,-25):
      Math.atan2(p[0]-(actor===player?(firstTimeRequest?.aimX??aim.x):keeper.x>=0?-2.5:2.5),Math.max(.2,p[2]));
    const offset=shotOffset(spec.geometry.head,yaw);
    const target=[p[0]-offset[0],p[2]-offset[1]];
    const gap=Math.hypot(target[0]-actor.x,target[1]-actor.z);
    const initial=Math.min(speed,Math.hypot(actor.vx??0,actor.vz??0));
    const reach=speed*time-(speed-initial)*Math.min(time,.6)*.5+.32;
    if(gap>reach)continue;
    return {...spec,time,target,yaw,ball:[...p],jumpHeight:spec.jump?clamp(p[1]-spec.geometry.head[1],0,.75):0};
  }
  return null;
}
function queueBufferedHeader(){
  if(!firstTimeRequest||windup||player.aerialFlight?.airborne||!['pass','loose','flight'].includes(ballState))return false;
  const plan=findHeaderContact();
  if(!plan||plan.time>(plan.jump?.62:.46))return false;
  const previous=player.aerialAction;
  const baseStart=plan.jump?(plan.time<.32?.58:.32):(plan.time<.22?.73:.5);
  const clipStart=previous?.clip===plan.clip?clamp(previous.time-.04,baseStart,plan.strike-.08):baseStart;
  const rate=(plan.strike-clipStart)/plan.time;
  const start=[player.x,player.z];
  player.aerialAction=null;player.teamAction=null;player.touchPending=null;player.watchBall=false;
  windup={header:true,headerTimeline:true,t:0,power:firstTimeRequest.power,firstTime:true,
    clip:plan.clip,clipStart,rate,setup:0,contact:plan.time,end:plan.time+.27,fired:false,
    jumpHeight:plan.jumpHeight,flightTarget:plan.target,aim:{x:firstTimeRequest.aimX,y:.65},spread:0,
    start,velocity:[player.vx??0,player.vz??0],fromYaw:player.yaw,targetYaw:plan.yaw,
    foot:'RightFoot',oppositeShot:false,adjustment:[0,0],plant:[...start],supportCorrection:[0,0],
    supportHeight:0,execution:{force:1,dispersion:1},chip:false,finesse:false};
  charging=false;charge=0;requestedVolley=false;
  return true;
}
function advanceHeader(w,dt){
  const remaining=Math.max(.025,w.contact-w.t),point=predictShotBall(Math.min(.65,remaining));
  const geometry=mocap.shotGeometry(w.clip,w.clip==='headerJump'?.92:.97,'RightFoot');
  const offset=shotOffset(geometry.head,w.targetYaw);
  const target=[point[0]-offset[0],point[2]-offset[1]];
  let direction=norm([target[0]-player.x,target[1]-player.z]);
  const gap=Math.hypot(target[0]-player.x,target[1]-player.z);
  let speed=Math.min(6.4,gap/Math.max(.1,remaining));
  if(w.fired){
    direction=player.receiveDirection??norm([player.vx??0,player.vz??0]);
    speed=player.receiveDirection?playerPace(player.receiveSprint):Math.hypot(player.vx??0,player.vz??0)*Math.exp(-dt*8);
  }
  const facing=player.yaw+signedTurn(w.targetYaw-player.yaw)*Math.min(1,dt*11);
  moveSpeed=motion.move(player,{dt,direction,speed,sprint:speed>4,ball:ballPos,velocity:ballVel,
    controlled:false,facing});
  if(!w.fired&&w.t>w.contact+.18&&(!w.flight||w.flight.done))windup=null;
}
function headerBallContact(dt,substep,steps){
  const w=windup;
  if(!w?.headerTimeline||w.fired||w.t<w.contact-.085||w.t>w.contact+.18)return;
  const head=mocap.get(player).head;
  if(!head)return;
  const previous=player.headBefore??head;
  const from=head.map((value,i)=>mix(previous[i],value,substep/steps));
  const to=head.map((value,i)=>mix(previous[i],value,(substep+1)/steps));
  if(ballPhysics.bootContact(from,to,ballPos,ballVel,dt,.23))launchShot(w);
}

function queueShot(preparedShot){
  const firstTime=!!preparedShot;
  if(!started||paused||player.aerialFlight?.airborne||windup&&!(firstTime&&windup.fired)||replaying||terminal()||!['controlled','loose','pass',...(firstTime?['flight']:[])].includes(ballState)||!nearBall(firstTime?2.5:1.58)||ballPos[1]>2.45){
    charging=false;
    charge=0;
    return false;
  }
  const power=preparedShot?.power??Math.max(.17,charge);
  const chip=firstTime?!!preparedShot.chip:chargeChip;
  const finesse=!chip&&(preparedShot?.finesse??(chargePlaced||placedShot));
  const shotAim=preparedShot?{x:preparedShot.aimX,y:aim.y}:aim;
  const piece=!firstTime&&ballState==='controlled'&&!shot?activeSetPiece():null;
  const penaltyTarget=piece?.kind==='penalty'&&activeShootout()&&!activeDefense().shootoutTurn?.isUser?activeDefense().shootoutBot?.target:null;
  const manualYaw=piece?setPieceYaw():null;
  const ballH=firstTime?predictShotBall(preparedShot.contactTime??.16)[1]:ballPos[1];
  const isHeader=!firstTime&&!piece&&ballH>=1.32&&Boolean(mocap.clips.headerStand||mocap.clips.headerJump);
  const needJump=isHeader&&ballH>1.72&&Boolean(mocap.clips.headerJump);
  const volley=!piece&&!isHeader&&(firstTime?ballH>.32:ballPos[1]>.38||requestedVolley);
  const fromYaw=mocap.get(player).bodyYaw??player.yaw;
  const aimYaw=manualYaw??Math.atan2(ballPos[0]-shotAim.x,ballPos[2]);
  const turn=Math.abs(signedTurn(aimYaw-fromYaw));
  const clip=piece?(piece.kind==='penalty'?'penalty':'kick2')
    :isHeader?(needJump?'headerJump':(mocap.clips.headerStand?'headerStand':'headerJump'))
    :volley?'volley':finesse?'penalty'
    :turn>backShotAngle?'shotBack':turn>1.75?'shotDiagonal':turn>.85?'shotSide'
    :chip?(power>.72&&moveSpeed>1.8?'powerKick':moveSpeed>.5?'kick':'kick2'):'strikeForwardJog';
  const animation=mocap.clips[clip];
  const clipStart=clip==='penalty'?(piece?.kind==='penalty'?.26:.40):clip==='headerJump'?.28:clip==='headerStand'?.48:0;
  const clipEnd=clip==='penalty'?(piece?.kind==='penalty'?1.34:1.27):clip==='headerJump'?1.45:clip==='headerStand'?1.38:animation.duration;
  const duration=(clip==='penalty'?(piece?.kind==='penalty'?.70:.58):clip==='headerJump'?.58:clip==='headerStand'?.46:(animation.playDuration||.54))*(firstTime?.70:1);
  const strike=isHeader?{time:clip==='headerJump'?.92:.97,foot:'RightFoot'}:motion.shotContact(clip);
  const naturalRate=(clipEnd-clipStart)/duration;
  const setup=firstTime?Math.min(clamp(turn*.030,.017,.082),(preparedShot.contactTime??1)*.2):clamp(turn*.064,.034,.195);
  const rate=firstTime&&preparedShot.contactTime?
    Math.max(.08,strike.time-clipStart)/Math.max(.04,preparedShot.contactTime-setup):naturalRate;
  const contact=setup+Math.max(.08,strike.time-clipStart)/rate;
  const actionDuration=firstTime&&preparedShot.contactTime?(clipEnd-clipStart)/rate:duration;
  const jumpHeight=needJump?clamp(ballH-1.56,.16,.68):0;
  const atImpact=predictShotBall(contact);
  const start=[player.x,player.z],velocity=firstTime?[player.vx||0,player.vz||0]:[...chargeVelocity];
  const predicted=start.map((value,index)=>value+velocity[index]*contact);
  const facing=moveSpeed>1.2?Math.atan2(-velocity[0],-velocity[1]):fromYaw;
  const lateral=-(atImpact[0]-predicted[0])*Math.cos(facing)+(atImpact[2]-predicted[1])*Math.sin(facing);
  const hitPoint=[atImpact[0]+Math.sin(aimYaw)*.088,atImpact[2]+Math.cos(aimYaw)*.088];
  const oppositeFoot=strike.foot==='LeftFoot'?'RightFoot':'LeftFoot';
  const curlSide=Math.abs(shotAim.x)>.32?Math.sign(shotAim.x):Math.abs(ballPos[0])>.8?Math.sign(ballPos[0]):0;
  const curlFoot=curlSide>0?'RightFoot':curlSide<0?'LeftFoot':null;
  const options=[strike.foot,oppositeFoot].map((foot,index)=>{
    const oppositeShot=index===1;
    const geometry=mocap.shotGeometry(clip,strike.time,foot,oppositeShot);
    const prior=mocap.shotGeometry(clip,strike.time-1/animation.fps,foot,oppositeShot);
    const next=mocap.shotGeometry(clip,strike.time+1/animation.fps,foot,oppositeShot);
    const swingAngle=Math.atan2(next.boot[0]-prior.boot[0],next.boot[2]-prior.boot[2]);
    const targetYaw=isHeader?aimYaw:aimYaw-clamp(swingAngle,-.34,.34);
    const toe=shotOffset(isHeader?geometry.head:geometry.boot,targetYaw),support=shotOffset(geometry.support,targetYaw);
    const correction=hitPoint.map((value,i)=>value-toe[i]-predicted[i]);
    const distance=Math.hypot(...correction);
    const adjustment=correction.map(value=>value*Math.min(1,(volley?.83:1.28)/Math.max(.001,distance)));
    const plant=predicted.map((value,i)=>value+adjustment[i]+support[i]);
    const unsuitableSide=Math.max(0,(foot==='LeftFoot'?-lateral:lateral)-.035);
    const score=distance+unsuitableSide*2+Math.abs(signedTurn(targetYaw-fromYaw))*.045+
      (finesse&&curlFoot&&foot!==curlFoot?.16:0);
    return {foot,oppositeShot,targetYaw,adjustment,plant,supportHeight:geometry.support[1],distance,score};
  });
  const preferred=player.appearance?.dominantFoot??trainingDefense?.dominantFoot??'RightFoot';
  const chosen=piece?options.find(option=>option.foot===preferred):options[0].score<=options[1].score?options[0]:options[1];
  const {foot,oppositeShot,targetYaw,adjustment,plant,supportHeight,distance}=chosen;
  if(firstTime&&(distance>(isHeader?1.25:volley?1.06:1.26)||atImpact[1]>(isHeader?2.45:volley?1.37:.53)))return false;
  const execution=piece?null:shotExecution(foot,preferred,turn>backShotAngle);
  if(!firstTime&&!piece)updateShotHeight(power,foot==='LeftFoot'?'Left':'Right',execution.force,chip);
  requestedVolley=false;
  player.aerialAction=null;
  windup={t:0,power,chip,finesse,lowDriven:false,firstTime,header:isHeader,jumpHeight,aim:{...shotAim},spread:shotSpread(power,player.pressure||0,mark(),piece?.kind),execution,start,supportCorrection:[0,0],clip,clipStart,contact,end:setup+actionDuration,
    fired:false,velocity,fromYaw,setup,rate,foot,oppositeShot,targetYaw,adjustment,plant,supportHeight,manualYaw,penaltyTarget,piece,
    penaltySide:piece?.kind==='penalty'?choosePenaltySide():undefined};
  charging=false;
  charge=0;
  chargePlaced=false;
  chargeChip=false;
  player.touchPending=null;
  sound(180,.08,'triangle',.02);
  return true;
}

function advanceShot(w,dt){
  if(w.headerTimeline){advanceHeader(w,dt);return;}
  const time=Math.min(w.end,w.t+dt);
  const phase=Math.max(0,time-w.setup)*w.rate;
  const turn=signedTurn(w.targetYaw-w.fromYaw);
  const yaw=w.fromYaw+turn*smooth(time/Math.max(.05,w.contact*.87));
  const laid=smooth(time/w.contact);
  const recovery=Math.max(0,time-w.contact);
  const travel=time-recovery*.37;
  const position=w.start.map((value,index)=>value+w.velocity[index]*travel+w.adjustment[index]*laid);
  let desiredSupport=[0,0];
  if(w.clip!=='volley'&&!w.header&&time>=w.setup){
    const shift=1-smooth(Math.abs(time-w.contact)/(time<w.contact?.06:.13));
    if(shift>0){
      const support=shotOffset(mocap.shotGeometry(w.clip,phase,w.foot,w.oppositeShot).support,yaw);
      const error=position.map((value,index)=>w.plant[index]-support[index]-value);
      const limit=Math.min(1,.052/Math.max(.001,Math.hypot(...error)));
      desiredSupport=error.map(value=>value*shift*limit);
    }
  }
  if(w.header&&!w.fired&&time>=w.contact-.035&&time<=w.contact+.13&&
    ballPhysics.bootContact(mocap.get(player).head,mocap.get(player).head,ballPos,ballVel,dt,.23)){
    launchShot(w);
  }
  for(let index=0;index<2;index++){
    w.supportCorrection[index]+=clamp(desiredSupport[index]-w.supportCorrection[index],-dt*1.35,dt*1.35);
    position[index]+=w.supportCorrection[index];
  }
  const {side,back}=motion.limits;
  const x=clamp(position[0],-side,side),z=clamp(position[1],playerFrontLimit(player),back);
  player.vx=(x-player.x)/dt;
  player.vz=(z-player.z)/dt;
  player.x=x;
  player.z=z;
  player.yaw=yaw;
  player.travelYaw=yaw;
  player.dribbleIntent=false;
  player.inertiaPose=null;
  moveSpeed=Math.hypot(...w.velocity);
}

function launchShot(w){
  if(!w.teamScorer&&teamAI.involvement(player))return;
  if(w.headerTimeline)firstTimeRequest=null;
  if(!w.teamScorer)teamAI.snapshot(player);
  clearFirstTimeShot();
  hitGoalFrame=false;
  w.fired=true;
  w.contactBall=[...ballPos];
  w.impactAt=w.t;
  const fatigueForce=w.piece?1:mix(1,.64,staminaFatigue());
  const shotStatForce=w.piece?1:clamp(.80+(mark().shot-50)*.0048,.76,1.05);
  const force=(w.execution?.force??1)*fatigueForce*shotStatForce;
  const power=w.power*force;
  const attributes=mark(),pieceKind=w.piece?.kind;
  const overhit=w.power>=1;
  const spread=Math.max(w.spread??0,shotSpread(w.power,player.pressure||0,attributes,pieceKind));
  const spreadRadius=pieceKind==='freeKick'?Math.min(spread*.62,2.6):spread*(w.execution?.dispersion??1);
  const error=overhit?shotError(1):w.assisted||w.penaltyTarget?[0,0]:shotError(spreadRadius);
  const defense=activeDefense();
  const wallSide=w.piece?.kind==='freeKick'?defense.wallSide:0;
  const launch=ballPhysics.launch(ballPos,clamp(w.aim.x,-3.22,3.22)+error[0],w.power,w.velocity,w.clip==='volley',
    {chip:w.chip,groundFriction:!!w.teamScorer,finesse:w.finesse,lowDriven:w.lowDriven,foot:w.foot==='LeftFoot'?'Left':'Right',accuracy:attributes[pieceKind]??attributes.shot,
      manualYaw:w.manualYaw,setPiece:pieceKind,penaltyTarget:w.penaltyTarget,error});
  if(force<1&&!overhit){
    launch.velocity=launch.velocity.map(value=>value*force);
    launch.spin=launch.spin.map(value=>value*force);
  }
  if(!overhit&&!w.piece&&!w.chip&&Math.abs(error[1])>.001){
    const base=ballPhysics.crossing(ballPos,launch.velocity,launch.spin,0,!!w.teamScorer);
    const errY=w.lowDriven?clamp(error[1]*.16,-.08,.28):error[1];
    if(base)for(let i=0;i<3;i++){
      const probe=ballPhysics.crossing(ballPos,launch.velocity,launch.spin,0,!!w.teamScorer);
      if(!probe)break;
      const targetY=w.lowDriven?clamp(base.y+errY,.11,.52):base.y+errY;
      launch.velocity[1]+=clamp((targetY-probe.y)/Math.max(.15,probe.time),-2,2);
    }
  }
  if(w.header){
    const target=[clamp(w.aim.x,-3.1,3.1),.55+Math.random()*.3,0];
    const t=Math.max(.22,Math.hypot(target[0]-ballPos[0],ballPos[2])/mix(12,21,w.power));
    launch.velocity=[(target[0]-ballPos[0])/t,(target[1]-ballPos[1])/t+4.905*t,-ballPos[2]/t];
    launch.spin=[0,0,0];
  }
  ballVel=launch.velocity;
  ballAngular.splice(0,3,...launch.spin);
  const goal=predictBallCrossing(0,!!w.teamScorer);
  const prediction=predictBallCrossing(keeperContactPlane(),!!w.teamScorer);
  const penalty=w.piece?.kind==='penalty',freeKick=w.piece?.kind==='freeKick';
  const onTarget=!overhit&&!!goal&&Math.abs(goal.x)<3.55&&goal.y<2.33;
  const nearGoal=!overhit&&!!keeperZones.locate(goal,keeperReactionPadding);
  const reflex=opponentAttribute(activeDefense()?.goalkeeper?.reflex);
  const normalReaction=.13-.075*reflex;
  const keeperDist=Math.hypot(ballPos[0]-keeper.x,ballPos[2]-keeper.z);
  const chipRange=w.chip&&goal?keeperDist:0;
  const longChip=chipRange>=12.5;
  const chipGoal=w.chip&&nearGoal?goal:null;
  const earlierRead=longChip&&(goal.y>=1.46||keeper.z>3&&prediction?.y>=2.12);
  const chipReadLead=(earlierRead?.72:.60)+.10*reflex;
  const wall=defense?.humanWall;
  const screened=freeKick&&wall?.some(actor=>{
    const fraction=(actor.z-keeper.z)/(ballPos[2]-keeper.z);
    if(fraction<=0||fraction>=1)return false;
    const sightX=mix(keeper.x,ballPos[0],fraction),sightY=mix(1.65,ballPos[1],fraction);
    return Math.abs(actor.x-sightX)<.34&&sightY>.18&&sightY<1.80;
  });
  const react=chipGoal?Math.max(normalReaction,chipGoal.time-chipReadLead):
    freeKick?(.118-.070*reflex)+(screened?.09-.03*reflex:0):normalReaction;
  const wallCrossing=wallSide&&wall?.length&&predictBallCrossing(wall[Math.floor(wall.length/2)].z,!!w.teamScorer);
  ballState='flight';ballAge=0;result=null;
  player.lostDribble=false;
  shot={cleanStrike:!w.teamScorer,t:0,tx:prediction?.x??w.aim.x,ty:prediction?.y??w.aim.y,power,lowDriven:!!w.lowDriven,keeperDist,
    duration:prediction?.time??Math.max(.1,ballPos[2]/Math.abs(ballVel[2])),
    react,
    saveChecked:false,goalChecked:false,hit:false,done:false,assisted:!!w.assisted,teamScorer:!!w.teamScorer,
    penalty,penaltySide:w.penaltySide,freeKick,overhit,onTarget,nearGoal,chipGoal,longChip,wallTime:wallCrossing?.time,
    outsideArea:freeKick||Math.abs(ballPos[0])>20.16||ballPos[2]>16.5,finesse:!!w.finesse};
  const keeperDown=(()=>{
    if(!dive)return false;
    if(dive.getup)return true;
    const c=mocap?.clips?.[dive.key];
    if(!c)return false;
    const tNow=dive.smother?Math.min(c.duration,dive.t<=dive.contactAt?c.contact*dive.t/Math.max(.05,dive.contactAt):c.contact+(dive.t-dive.contactAt)*1.45)
      :Math.min(c.duration,keeperClipTime(Math.max(0,dive.t-(dive.delay||0)),c,dive.rate||1,dive.clipStart||0));
    const fNow=Math.min(c.frames-1,Math.max(0,Math.floor(tNow*c.fps)));
    return c.values[fNow*c.stride+c.stride-2]<64;
  })();
  const reachFromGround=!!(prediction??goal)&&Math.abs((prediction??goal).x-keeper.x)<1.55&&(prediction??goal).y<1.35&&((prediction??goal).time??0)>.16;
  if(keeperDown&&!reachFromGround){
    shot.planned=true;
    if(!dive?.getup&&mocap?.clips?.getup){
      dive={getup:true,t:0,key:'getup',rate:1.45,mirror:Boolean(dive?.mirror)};
    }
  }else{
    dive=null;
  }
  if(!w.teamScorer)stats.shots++;
  updateStats();
  keeperLabel='LEITURA DO CHUTE';
  if(record.length>600)record=record.slice(-180);
  sound(90,.16,'triangle',.2+power*.1);
}

function isOuterGoalZone(zone){
  return zone?.column===0||zone?.column===4;
}

function isUpperCornerZone(zone){
  return isOuterGoalZone(zone)&&zone.row===1;
}

const upperCornerLabels={
  diveReference:'MERGULHO 1',dive2Reference:'MERGULHO 2',catch3Reference:'ENCAIXE COM CORRIDA',
  catch4Reference:'SALTO VERTICAL',oneHand:'ESPALMADA COM UMA MÃO',punchSave:'SOCO ALTO',
  gkTipOverBack1:'PONTA DOS DEDOS',gkTipOverBack2:'PONTA DOS DEDOS',gkTipOverStand:'SALTO NA COBERTURA',
  gkTipOverSide:'PONTA DOS DEDOS',gkChipCatchHigh:'ENCAIXE NA COBERTURA',gkChipNearMiss:'QUASE ALCANÇOU',
  gkChipChaseGoal:'CORRENDO PARA O GOL',gkChipBack1:'DEFESA NA COBERTURA',gkChipBack2:'DEFESA NA COBERTURA',
  gkChipBack3:'DEFESA NA COBERTURA',gkDeflectHigh:'DESVIO ALTO',gkChipSave:'ALCANCE NA COBERTURA',
  gkChipStand:'ENCAIXE NA COBERTURA',gkDeflectSide1:'DESVIO LATERAL',gkDeflectSide2:'DESVIO LATERAL',
  gkDeflectStand:'DESVIO DE REAÇÃO',gkReflexMid:'REFLEXO NO MEIO',gkReflexLow:'REFLEXO RASTEIRO',
  gkDeflectLow:'DESVIO RASTEIRO',gkSmotherChest0:'ABAFANDO NO X1',gkSmotherChest45:'BLOQUEIO CARA A CARA',
  gkSmotherKnee:'BLOQUEIO DE JOELHO',gkSmotherSide90:'ABAFANDO LATERAL',gkSmotherClose:'ENCAIXE NOS PÉS',
  gkCatchJog:'ENCAIXE EM MOVIMENTO',gkCatchFwd:'ENCAIXE FRONTAL'
};

function keeperLaunchProgress(clip,time){
  return smooth(clamp(time/clip.takeoff,0,1));
}

function keeperClipTime(elapsed,clip,rate,start=0){
  const contactPhase=Math.min(clip.land??clip.duration,clip.contact+.17);
  const ready=Math.max(0,(contactPhase-start)/rate);
  return elapsed<ready?start+elapsed*rate:contactPhase+(elapsed-ready)*1.24;
}

function keeperElapsed(time,clip,rate,start=0){
  const contactPhase=Math.min(clip.land??clip.duration,clip.contact+.17);
  return time<=contactPhase?Math.max(0,(time-start)/rate):Math.max(0,(contactPhase-start)/rate)+(time-contactPhase)/1.24;
}

function cornerStepDistance(time,speed){
  const acceleration=21, ramp=speed/acceleration;
  return time<ramp?.5*acceleration*time*time:speed*(time-.5*ramp);
}

function clipRootX(clip,frame){
  return clip.values[frame*clip.stride+clip.stride-3]*mocap.scale;
}

function keeperLift(clip,time){
  const start=(clip.takeoff??clip.contact*.64)*.82;
  const end=Math.min(clip.land??clip.duration,clip.contact+.29);
  if(time<=start||time>=end)return 0;
  const u=(time-start)/(end-start);
  return 4*u*(1-u);
}

function keeperContactPlane(){
  const angle=keeper.yaw+Math.PI;
  return Math.max(.075,Math.min(ballPos[2]-.045,keeper.z+Math.max(.12,.40*Math.cos(angle))));
}

const keeperLowDives=['blockReference','block2Reference','block3Reference','gkDeflectLow'];
const keeperChipLow=['saveGroundScoop','saveLowCatch','saveKneeScoop','saveKneeScoopNear'];
const keeperChipMid=['gkChipSave','gkChipStand','saveHighStep','saveStretchStep'];
const keeperChipHigh=['gkChipCatchHigh','gkChipNearMiss','gkChipChaseGoal','gkChipBack1','gkChipBack2','gkChipBack3','gkTipOverBack1','gkTipOverBack2','gkTipOverStand'];
const keeperCoverageJumps=keeperChipHigh;

function keeperCoverageTravel(clip,time){
  return smooth(time/(clip.contact+.15));
}
const keeperCloseCornerDives=[
  ['gkReflexLow','gkDeflectLow','gkSmotherKnee','blockReference','block2Reference'],
  ['gkDeflectSide2','gkReflexMid','dive2Reference','diveReference'],
  ['gkDeflectHigh','gkTipOverSide','oneHand','dive2Reference','diveReference','catch4Reference']
];

function choosePenaltySide(){
  const owner=activeShootout()??activeDefense();
  const decision=owner.penaltyDecisions??={bag:[],last:null};
  if(!decision.bag.length){
    decision.bag=[-1,-1,0,1,1];
    for(let i=decision.bag.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [decision.bag[i],decision.bag[j]]=[decision.bag[j],decision.bag[i]];
    }
    if(decision.bag.at(-1)===decision.last)decision.bag.reverse();
  }
  decision.last=decision.bag.pop();
  return decision.last;
}

function chooseDive(){
  shot.planned=true;
  const goal=predictBallCrossing(0);
  const penaltyAngle=keeper.yaw+Math.PI;
  const penaltyOffset=Math.cos(penaltyAngle)*((goal?.x??shot.tx)-keeper.x)+Math.sin(penaltyAngle)*keeper.z;
  const penaltyLane=Math.abs(penaltyOffset)<.85?0:Math.sign(penaltyOffset);
  if(shot.penalty&&(penaltyLane!==(shot.penaltySide??0)||shot.penaltySide===0)){
    const side=shot.penaltySide??0;
    const height=goal?.y??shot.ty;
    const pool=side===0?(height<.65?['saveGroundScoop']:height>1.65?['catch4Reference']:['gkReflexMid']):
      height<.65?['block2Reference','blockReference']:['dive2Reference','diveReference'];
    const available=pool.filter(key=>mocap.clips[key]);
    const key=available[Math.floor(Math.random()*available.length)];
    const clip=mocap.clips[key];
    if(!clip)return;
    const reflex=opponentAttribute(activeDefense()?.goalkeeper?.reflex);
    const angle=keeper.yaw+Math.PI;
    const sign=side===0?1:side===(clip.saveSide??1)?1:-1;
    const approach=predictBallCrossing(keeperContactPlane())??goal;
    const reachTime=Math.max(.12,(approach?.time??shot.duration)-.015);
    const clipStart=side===0?0:Math.min(clip.takeoff*.55,Math.max(0,clip.contact-.24));
    const frame=clamp(clipStart*clip.fps,0,clip.frames-1),lo=Math.floor(frame),hi=Math.min(clip.frames-1,lo+1);
    const startRootX=clipStart?mix(clipRootX(clip,lo),clipRootX(clip,hi),frame-lo):0;
    const startRootZ=clipStart?mix(clip.values[lo*clip.stride+clip.stride-1],clip.values[hi*clip.stride+clip.stride-1],frame-lo)*mocap.scale:0;
    dive={key,sign,side,mirror:sign<0,delay:0,clipStart,startRootX,startRootZ,
      rate:clamp((clip.contact-clipStart)/reachTime,1,3.2+.3*reflex),
      shift:0,launchShift:side*.60,stretch:1,lift:0,guide:0,t:0,sx:keeper.x,sz:keeper.z,
      yaw:keeper.yaw,startYaw:keeper.yaw,cos:Math.cos(angle),sin:Math.sin(angle),lateralSpeed:4.7,
      upperCorner:false,type:clip.saveKind,
      intercept:side===0&&penaltyLane===0&&approach?{when:approach.time,point:[approach.x,approach.y,keeperContactPlane()],margin:0}:null};
    return;
  }
  const chip=!!shot.chipGoal&&!shot.penalty;
  const freeKick=shot.freeKick&&!chip;
  const zone=keeperZones.locate(goal,keeperReactionPadding);
  if(!zone)return;
  const shotDist=shot.keeperDist??Math.hypot(ballPos[0]-keeper.x,ballPos[2]-keeper.z);
  const highCorner=isUpperCornerZone(zone);
  const allowHighDeflect=highCorner?shotDist<5:zone.id!=='A2'&&zone.id!=='E2';
  const lateralPenalty=shot.penalty&&shot.penaltySide!==0;
  const penaltyClips=goal.y<.65?['blockReference','block2Reference']:['diveReference','dive2Reference'];
  const eligible=key=>(key!=='gkDeflectHigh'||allowHighDeflect)&&(!lateralPenalty||penaltyClips.includes(key));
  shot.nearGoal=true;
  const reflex=opponentAttribute(activeDefense()?.goalkeeper?.reflex);
  const jumpScale=1+.55*opponentAttribute(activeDefense()?.goalkeeper?.jump);
  const origin=[keeper.x,0,keeper.z];
  const angle=keeper.yaw+Math.PI,cos=Math.cos(angle),sin=Math.sin(angle);
  const positions=[], position=[...ballPos], velocity=[...ballVel], spin=[...ballAngular];
  const step=1/120;
  for(let i=0;i<=360&&position[2]>-.12&&velocity[2]<0;i++){
    const dx=position[0]-origin[0],dz=position[2]-origin[2];
    positions.push([cos*dx-sin*dz,position[1],sin*dx+cos*dz]);
    ballPhysics.step(position,velocity,spin,step/2,true,shotGroundFriction());
    ballPhysics.step(position,velocity,spin,step/2,true,shotGroundFriction());
  }

  const approachZ=keeperContactPlane();
  const regularApproach=predictBallCrossing(approachZ);
  const approach=regularApproach??goal;
  if(!approach)return;
  const lastStandingZ=clamp(keeper.z-cornerStepDistance(Math.max(0,goal.time-.095),3.8)+.28,.58,approachZ);
  const standing=chip&&(shot.longChip||keeper.z>.95)?predictBallCrossing(lastStandingZ):null;
  const coverageJump=!!standing&&standing.y>1.88&&standing.y>goal.y+.035&&approach.y>=1.78;
  const offset=cos*(approach.x-keeper.x)-sin*(approachZ-keeper.z);
  const side=Math.abs(offset)>.045?(Math.sign(offset)||1):zone.column<=1?-1:1;
  const ballReach=ballPhysics.config.radius+.06;
  const frameOrWide=Math.abs(goal.x)>=3.66-ballReach||goal.y>=2.44-ballReach;
  if(frameOrWide&&!coverageJump&&(!freeKick||!shot.onTarget)){
    const vertical=goal.y>=2.44-ballReach&&Math.abs(offset)<.85;
    const pool=(vertical?['catch4Reference','saveTopCatch','gkDeflectHigh','oneHand']:
      goal.y>1.48?['gkTipOverSide','oneHand','dive2Reference','diveReference']:
      goal.y<.62?['gkDeflectLow','block2Reference','blockReference']:
      ['dive2Reference','diveReference','gkDeflectSide2']).filter(k=>eligible(k)&&mocap.clips[k]);
    const recentFrame=keeper.recentByZone?.[zone.id]??[];
    const key=pool.find(k=>!recentFrame.includes(k))??
      pool.reduce((a,b)=>recentFrame.indexOf(a)>=recentFrame.indexOf(b)?a:b);
    if(!keeper.recentByZone)keeper.recentByZone={};
    keeper.recentByZone[zone.id]=[key,...recentFrame.filter(k=>k!==key)].slice(0,Math.max(pool.length,5));
    const clip=mocap.clips[key];
    const sign=side===(clip.saveSide??1)?1:-1;
    const rate=1.75+.38*reflex;
    const approaches=[regularApproach,goal].filter(Boolean);
    const reachTime=Math.max(.065,approaches.length?Math.min(...approaches.map(a=>a.time-.025)):shot.duration);
    const delay=Math.max(0,reachTime-clip.contact/rate);
    const lateralSpeed=4.65;
    const shift=side*Math.min(Math.max(0,Math.abs(offset)-.80),.95,cornerStepDistance(delay,lateralSpeed));
    const lift=vertical&&activeDefense()?.goalkeeper ? .14*jumpScale : 0;
    dive={key,sign,side,mirror:sign<0,delay,rate,shift,launchShift:0,stretch:1,lift,guide:0,
      t:0,sx:keeper.x,sz:keeper.z,yaw:keeper.yaw,startYaw:keeper.yaw,cos,sin,lateralSpeed,upperCorner:isUpperCornerZone(zone),type:clip.saveKind};
    return;
  }
  const diveRate=(shot.penalty?2.8:freeKick?2.04:1.90)+.42*reflex;
  const intercept=Math.abs(goal.x)<3.55&&goal.y<2.33?{when:approach.time+step,point:[approach.x,approach.y,approachZ],margin:0}:null;
  shot.intercept=intercept;
  const lowShot=zone.row===3&&goal.y<.62;
  const closeLow=lowShot&&approach.time<.34;
  const wide=isOuterGoalZone(zone);
  const upperCorner=highCorner;
  const closeCorner=!chip&&!shot.penalty&&!shot.freeKick&&!lowShot&&approach.time<.34&&Math.abs(offset)>(wide?.62:.94);
  const close1v1=!chip&&!shot.penalty&&!shot.freeKick&&approach.time<.34&&shotDist<6.0;
  if(!lateralPenalty&&!freeKick&&!coverageJump&&!closeCorner&&zone.row!==1&&Math.abs(offset)<.85&&approach.time<(chip?.135:.34)&&!lowShot&&!(close1v1&&goal.y<1.45)){
    const key='gkReflexMid',clip=mocap.clips[key];
    const sign=side===(clip.saveSide??1)?1:-1;
    const reflexIntercept=approach.time>=clip.contact/diveRate*.70?intercept:null;
    dive={key,sign,side,mirror:sign<0,delay:0,rate:diveRate,
      shift:0,launchShift:0,stretch:1,lift:0,guide:0,t:0,sx:keeper.x,sz:keeper.z,yaw:keeper.yaw,startYaw:keeper.yaw,
      cos,sin,lateralSpeed:4.7,upperCorner:false,type:clip.saveKind,intercept:reflexIntercept,close:true,chip};
    return;
  }
  const lowCorner=wide&&zone.row===3;
  const fast=wide&&!lowCorner;
  const lowReach=lowShot&&Math.abs(offset)>.48;
  // Vincular animações do goleiro estritamente ao setor (A1..E3) em que a bola cruza a linha do gol (z = 0)
  // Coberturas usam exclusivamente os 3 grupos dedicados (baixa, média e alta)
  const longShot=shotDist>=11.5;
  const chipOptions=zone.row===3?keeperChipLow:zone.row===2?keeperChipMid:keeperChipHigh;
  const close1v1Options=zone.row===3?(zone.id==='C3'?['gkSmotherKnee','gkSmotherChest45','gkReflexLow','saveQuickScoop','gkDeflectSide1','gkDeflectLow','block2Reference']:(zone.id==='A3'||zone.id==='E3')?['gkDeflectLow','block2Reference','blockReference']:['gkSmotherKnee','gkSmotherChest45','gkDeflectLow','block2Reference','blockReference']):
    ['gkSmotherChest0','gkReflexMid','gkDeflectStand'];
  const closeCornerLevel=zone.row===3?0:zone.row===2?1:2;
  const baseOptions=coverageJump?keeperCoverageJumps:closeCorner?keeperCloseCornerDives[closeCornerLevel]:
    chip?chipOptions:close1v1?close1v1Options:lowShot?[...new Set([...zone.options,...keeperLowDives])]:zone.options;
  const zoneOptions=freeKick&&zone.row===1&&Math.abs(offset)>.8
    ?[...new Set([...baseOptions,'oneHand','gkTipOverSide','dive2Reference','diveReference'])]:baseOptions;
  const options=lateralPenalty?penaltyClips.filter(key=>mocap.clips[key]):highCorner&&allowHighDeflect&&!chip&&!zoneOptions.includes('gkDeflectHigh')
    ?[...zoneOptions,'gkDeflectHigh']:zoneOptions;
  const groundCatch=zone.row===3&&!lowCorner&&approach.y<.42&&Math.abs(offset)<.90&&
    (shot.power<=.52||Math.hypot(...ballVel)<20);
  const rates=[diveRate];
  const lateralSpeed=(freeKick?4.95:4.65)+.62*reflex;
  const recent=keeper.recentByZone?.[zone.id]??[];
  const candidates=[];
  const ballSpeed=Math.hypot(...ballVel);
  const hardShot=(shot.power??.5)>=.66||ballSpeed>=24;
  const softShot=(shot.power??.5)<=.42||ballSpeed<=18.5;
  const c3Catch=zone.id==='C3'&&!chip&&!coverageJump;
  const lastDelay=Math.max(0,Math.min(coverageJump?.24:closeCorner?.105:groundCatch||softShot||c3Catch?2.50:
    freeKick?.96:longShot?.82:lowCorner?.78:.47,approach.time-.10));

  const tightAngle=Math.abs(Math.atan2(ballPos[0]-keeper.x,Math.max(.25,ballPos[2]-keeper.z)))>=.55;
  for(const [preference,key] of options.entries()){
    if(key==='catch3Reference'&&!tightAngle)continue;
    if(key==='gkReflexLow'&&shotDist>=9.5)continue;
    if(key==='gkSmotherKnee'&&(zone.id==='A3'||zone.id==='E3'))continue;
    if(key==='gkDeflectSide1'&&zone.id!=='C3')continue;
    if(!eligible(key))continue;
    const clip=mocap.clips[key];
    if(!clip?.rootMotion||!clip.samples?.length)continue;
    const sign=side===(clip.saveSide??1)?1:-1;
    const limbs=clip.saveKind==='foot'?[6,9]:clip.saveKind==='block'?[0,3,6,9]:clip.saveKind==='oneHand'?[0]:[0,3];
    const guide=key==='catch3Reference'?side*clamp(Math.atan2(Math.abs(offset),3),.40,.70):0;
    const guideCos=Math.cos(guide),guideSin=Math.sin(guide);
    const baseLift=coverageJump?.28:chip?(clip.saveKind==='jump'||clip.saveKind==='high'?.22:0):zone.row!==1?0:
      freeKick?.38:upperCorner?(clip.saveKind==='jump'?.22:clip.saveKind==='lateral'?.24:.26):clip.saveKind==='jump'?.26:.28;
    const liftLimit=baseLift*jumpScale;
    const isCatchClip=['scoop','catch','groundCatch'].includes(clip.saveKind);
    const clipStart=!chip&&!coverageJump&&!isCatchClip&&clip.takeoff>.22?Math.min(clip.takeoff*.55,Math.max(0,clip.contact-.20)):0;
    const startFrame=Math.min(clip.frames-1,clipStart*clip.fps);
    const sLo=Math.floor(startFrame),sHi=Math.min(clip.frames-1,sLo+1),sA=startFrame-sLo;
    const startRootX=clipStart>0?mix(clipRootX(clip,sLo),clipRootX(clip,sHi),sA):0;
    const sOffLo=sLo*clip.stride+clip.stride-1,sOffHi=sHi*clip.stride+clip.stride-1;
    const startRootZ=clipStart>0?mix(clip.values[sOffLo],clip.values[sOffHi],sA)*mocap.scale:0;
    const clipRates=rates;
    const powerBonus=hardShot
      ? (['oneHand','high','lateral','reflex','low','block'].includes(clip.saveKind)?-.10:['catch','scoop','groundCatch'].includes(clip.saveKind)?.14:0)
      : softShot
        ? (['catch','scoop','groundCatch','jump'].includes(clip.saveKind)?-.10:0)
        : 0;
    let clipBest=null;
    const lowDive=lowShot&&keeperLowDives.includes(key);
    for(const rate of clipRates){
      const firstPhase=Math.max(clipStart,coverageJump?mix(clip.takeoff,clip.contact,.22):Math.max(.08,clip.takeoff-((closeLow||closeCorner)?.16:fast?.12:.08)));
      const firstTime=keeperElapsed(firstPhase,clip,rate,clipStart);
      const lastTime=keeperElapsed(coverageJump?Math.min(clip.land,clip.contact+.16):clip.land+.02,clip,rate,clipStart);
      for(let delay=0;delay<=lastDelay+1e-8;delay+=(delay>.80?4:2)*step){
        const first=Math.max(1,Math.ceil((delay+firstTime)/step));
        const last=Math.min(positions.length-1,Math.floor((delay+lastTime)/step));
        if(last<first)continue;
        const maxShift=Math.min(freeKick?2.18+.30*reflex:lowCorner?2.45:upperCorner?(longShot?1.55:.95):wide?(longShot?1.70:1.15):(longShot?1.45:1.05),cornerStepDistance(delay,lateralSpeed));
        const canPush=(upperCorner&&(['lateral','high','oneHand','jump'].includes(clip.saveKind)||key==='catch3Reference'))||
          (lowCorner&&['block','low','reflex','lateral'].includes(clip.saveKind));
        const pushLimit=canPush?Math.min(lowCorner?.52:freeKick?.28*jumpScale:key==='catch3Reference'?.16:.12,
          cornerStepDistance(Math.max(.14,clip.takeoff/rate),lateralSpeed)*1.15):0;
        for(let i=first;i<=last;i++){
          const time=keeperClipTime(i*step-delay,clip,rate,clipStart);
          const backProgress=coverageJump?keeperCoverageTravel(clip,time):0;
          const backLimit=coverageJump?Math.min(.76,Math.max(0,origin[2]-.29),cornerStepDistance(i*step,3.1)):0;
          const frame=Math.min(clip.frames-1,time*clip.fps);
          const at=Math.floor(frame),next=Math.min(clip.frames-1,at+1),alpha=frame-at;
          const sample=clip.samples[at],sampleNext=clip.samples[next];
          const [ballX,ballY,ballZ]=positions[i];
          const localX=guideCos*ballX-guideSin*ballZ;
          const localZ=guideSin*ballX+guideCos*ballZ;
          const rootX=wide?sign*(mix(clipRootX(clip,at),clipRootX(clip,next),alpha)-startRootX):0;
          const liftFactor=liftLimit?keeperLift(clip,time):0;
          const launchProgress=canPush?keeperLaunchProgress(clip,time):0;
          for(const limb of limbs){
            const x=sign*(mix(sample[limb],sampleNext[limb],alpha)-startRootX);
            const y=mix(sample[limb+1],sampleNext[limb+1],alpha);
            const z=mix(sample[limb+2],sampleNext[limb+2],alpha)-startRootZ;
            const lateralNeed=localX-x;
            const upperReach=pushLimit*launchProgress;
            const extra=wide&&rootX*side>.16
              ? clamp(lateralNeed*side-maxShift-upperReach,0,Math.min(upperCorner?.08:lowCorner?.14:.14,Math.abs(rootX)*.20)):0;
            const shift=clamp(lateralNeed-side*extra,-maxShift,maxShift);
            const push=upperReach>0?clamp((lateralNeed-shift-side*extra)*side,0,upperReach):0;
            const launchShift=launchProgress>0?side*push/launchProgress:0;
            const retreat=clamp(z-localZ,0,backLimit*backProgress);
            const horizontalGap=Math.hypot(x+side*(extra+push)+shift-localX,z-retreat-localZ);
            const radius=limb>=6?.25:.29;
            const slack=upperCorner?Math.sqrt(Math.max(0,(radius-.045)**2-horizontalGap**2))*.88:0;
            const lift=liftFactor>.12?clamp((ballY-y-slack)/liftFactor,coverageJump?.15*jumpScale:0,liftLimit):0;
            const gap=Math.hypot(horizontalGap,y+lift*liftFactor-ballY)-radius;
            let miss=gap;
            if(groundCatch&&clip.saveKind==='scoop'){
              const centerX=sign*((mix(sample[0],sampleNext[0],alpha)+mix(sample[3],sampleNext[3],alpha))*.5-startRootX);
              const centerY=mix((sample[1]+sample[4])*.5,(sampleNext[1]+sampleNext[4])*.5,alpha);
              const centerZ=mix((sample[2]+sample[5])*.5,(sampleNext[2]+sampleNext[5])*.5,alpha)-startRootZ;
              const cradle=Math.hypot((centerX+shift-localX)*1.20,centerY-ballY,centerZ-localZ)-.32;
              miss=Math.max(miss,cradle);
            }
            const priority=(lowReach&&lowDive?-.21:groundCatch&&clip.saveKind==='scoop'?-.18:0)+powerBonus;
            const c3Timing=c3Catch&&isCatchClip;
            const score=chip?Math.max(0,miss)*15+miss*.46+Math.abs(time-clip.contact)*.65+
              Math.abs(shift)*.04+lift*.24+preference*.025+
              (coverageJump?Math.abs(time-clip.contact)*.30+retreat*.075+(Math.abs(offset)>.52&&clip.saveKind==='jump'?.14:0):0):
              Math.max(0,miss)*(closeCorner?9:6)+miss*.38+Math.abs(time-clip.contact)*(c3Timing?2.4:.42)+
              delay*(closeCorner?.85:c3Timing||(groundCatch||softShot)&&isCatchClip?.005:lowCorner?.06:.29)+priority+Math.abs(shift)*(lowCorner?.012:.025)+extra*.10+Math.abs(launchShift)*(lowCorner?.04:.08)+lift*(upperCorner?.11:.075)+preference*.015;
            if(!clipBest||score<clipBest.score){
              clipBest={key,score,mirror:sign<0,sign,side,delay,rate,clipStart,startRootX,startRootZ,miss,shift,guide,launchShift,
                stretch:extra>0?1+extra/Math.abs(rootX):1,lift,
                backStep:backProgress>0?retreat/backProgress:0,
                saveHand:limb<6?(limb===0?'LeftHand':'RightHand'):null,
                plannedIntercept:chip||(freeKick?intercept&&limb<6&&miss<=.055:(closeCorner||c3Timing)&&intercept)?{when:i*step,
                  point:[origin[0]+cos*ballX+sin*ballZ,ballY,origin[2]-sin*ballX+cos*ballZ],margin:0}:null};
            }
          }
        }
      }
    }
    if(clipBest)candidates.push(clipBest);
  }

  candidates.sort((a,b)=>a.score-b.score);
  let best=candidates[0];
  if(!best&&coverageJump){
    const key=allowHighDeflect?'gkDeflectHigh':'catch4Reference',clip=mocap.clips[key];
    const sign=side===(clip.saveSide??1)?1:-1;
    best={key,sign,side,mirror:sign<0,delay:0,rate:diveRate,clipStart:0,startRootX:0,startRootZ:0,miss:9,shift:0,launchShift:0,stretch:1,guide:0,lift:.32,backStep:0,
      saveHand:'LeftHand',plannedIntercept:null};
  }
  if(!best){
    const fallbackPool=(zone.id==='A1'||zone.id==='E1')&&shot.onTarget&&!chip&&!coverageJump
      ?[...new Set([...options,'diveReference','dive2Reference','gkDeflectSide2'])]:options;
    const validPool=fallbackPool.filter(k=>eligible(k)&&(k!=='catch3Reference'||tightAngle)&&!(k==='gkReflexLow'&&shotDist>=9.5)&&!(k==='gkSmotherKnee'&&(zone.id==='A3'||zone.id==='E3'))&&!(k==='gkDeflectSide1'&&zone.id!=='C3')&&mocap.clips[k]?.rootMotion);
    const key=validPool.find(k=>!recent.includes(k))??validPool[0];
    if(!key)return;
    const clip=mocap.clips[key];
    const sign=side===(clip.saveSide??1)?1:-1;
    const fbDelayRaw=lowCorner?Math.max(0,Math.min(.22,goal.time-.12)):0;
    const fbShift=lowCorner?side*Math.min(Math.max(0,Math.abs(offset)-.95),cornerStepDistance(fbDelayRaw,lateralSpeed)):0;
    const fbDelay=Math.abs(fbShift)>=.08?fbDelayRaw:0;
    const fbPush=lowCorner?side*Math.min(.48,Math.max(0,Math.abs(offset)-Math.abs(fbShift)-.95)):0;
    best={key,score:99,mirror:sign<0,sign,side,delay:fbDelay,rate:diveRate,clipStart:0,startRootX:0,startRootZ:0,miss:9,shift:fbShift,guide:0,launchShift:fbPush,
      stretch:1,lift:upperCorner?.22*jumpScale:0,backStep:0,saveHand:null,plannedIntercept:null};
  }
  const canReach=best.miss<=.18;
  const upperGoalMiss=(zone.id==='A1'||zone.id==='E1')&&shot.onTarget&&!canReach&&!chip&&!coverageJump;
  if(upperGoalMiss&&candidates.length){
    const midSide=['diveReference','dive2Reference','gkDeflectSide2'].filter(k=>mocap.clips[k]?.rootMotion&&!candidates.some(c=>c.key===k));
    for(const key of midSide){
      const clip=mocap.clips[key],sign=side===(clip.saveSide??1)?1:-1;
      candidates.push({key,score:best.score+.25,mirror:sign<0,sign,side,delay:best.delay,rate:diveRate,clipStart:0,startRootX:0,startRootZ:0,miss:best.miss,shift:best.shift,guide:0,launchShift:best.launchShift||0,
        stretch:1,lift:best.lift||.20*jumpScale,backStep:0,saveHand:null,plannedIntercept:null});
    }
  }
  const highChipScene=(chip&&zone.row===1)||coverageJump;
  let chipChaseGoal=null;
  if(highChipScene){
    const catchCand=candidates.find(c=>c.key==='gkChipCatchHigh');
    const nearCand=candidates.find(c=>c.key==='gkChipNearMiss');
    const canCatchHigh=catchCand&&catchCand.miss<=.20;
    const isNearMiss=!canCatchHigh&&best.miss<=.52&&nearCand;
    const enteringGoal=Math.abs(goal.x)<3.66&&goal.y<2.44;
    if(canCatchHigh){
      best=catchCand;
    }else if(isNearMiss){
      best={...nearCand,plannedIntercept:null};
    }else if(enteringGoal&&mocap.clips.gkChipChaseGoal){
      const chaseClip=mocap.clips.gkChipChaseGoal;
      const gx=clamp(goal.x,-3.25,3.25),gz=.22;
      const chaseYaw=Math.atan2(keeper.x-gx,keeper.z-gz);
      const chaseSign=side===(chaseClip.saveSide??1)?1:-1;
      best={key:'gkChipChaseGoal',score:0,mirror:chaseSign<0,sign:chaseSign,side,delay:0,
        rate:diveRate,clipStart:0,startRootX:0,startRootZ:0,
        miss:best.miss,shift:0,guide:0,launchShift:0,stretch:1,lift:0,backStep:0,saveHand:null,plannedIntercept:null};
      chipChaseGoal={goalX:gx,goalZ:gz,startX:keeper.x,startZ:keeper.z,yaw:chaseYaw,duration:Math.max(.9,Math.min(2.2,goal.time+.35))};
    }
  }
  const scoop=groundCatch&&candidates.find(candidate=>candidate.key==='scoopReference'&&candidate.miss<=.015);
  if(!chip&&!closeCorner&&scoop&&!lowReach)best=scoop;
  else if(!chip&&candidates.length>1){
    const missCap=freeKick?best.miss+.035:best.miss<=.12?Math.max(best.miss+.06,.12):upperGoalMiss?Math.max(best.miss+.45,.55):Math.max(best.miss+.14,upperCorner?.16:.10);
    const scoreCap=upperGoalMiss?best.score+4.5:best.score+(upperCorner?1.15:closeCorner?.85:.55);
    let pool=candidates.filter(c=>c.miss<=missCap&&c.score<=scoreCap);
    if(!pool.length)pool=[best];
    const fresh=pool.filter(c=>!recent.includes(c.key));
    if(fresh.length){
      best=fresh[0];
    }else if(pool.length>1){
      const varietyScore=c=>{
        const idx=recent.indexOf(c.key);
        const penalty=idx<0?0:[2.4,1.5,.9,.45,.2,.08][idx]??.04;
        return c.score+penalty;
      };
      best=pool.reduce((a,b)=>varietyScore(a)<=varietyScore(b)?a:b);
    }
  }

  if(!keeper.recentByZone)keeper.recentByZone={};
  keeper.recentByZone[zone.id]=[best.key,...recent.filter(key=>key!==best.key)].slice(0,Math.max(6,options.length));
  const yaw=keeper.yaw+best.guide;
  const saveKind=mocap.clips[best.key].saveKind;
  const type=groundCatch&&saveKind==='scoop'&&best.miss<=.015?'groundCatch':lowShot&&keeperLowDives.includes(best.key)?'low':saveKind;
  const finalIntercept=best.plannedIntercept??(freeKick?null:intercept);
  dive={...best,t:chip?0:step,sx:keeper.x,sz:keeper.z,yaw,startYaw:keeper.yaw,
    cos:Math.cos(yaw+Math.PI),sin:Math.sin(yaw+Math.PI),lateralSpeed,upperCorner,
    canReach:best.miss<=.28,type,chip,closeCorner,coverageJump,chipChaseGoal,intercept:finalIntercept};
}

function keeperCatchTargets(point,weight,yaw,mirrored,width){
  const facing=mirrored?-1:1;
  const side=[-Math.cos(yaw)*facing,0,Math.sin(yaw)*facing];
  return ['LeftHand','RightHand'].map((hand,index)=>({
    hand,weight,point:point.map((value,axis)=>value+side[axis]*width*(index===0?1:-1))
  }));
}

function finishKeeperDive(d,clip,time){
  const curFrame=Math.min(clip.frames-1,Math.max(0,Math.floor(time*clip.fps)));
  const rootY=clip.values[curFrame*clip.stride+clip.stride-2];
  const onGround=rootY<64;
  const immediateRebound=ballState==='loose'&&ballPos[1]<.50&&Math.hypot(ballPos[0]-keeper.x,ballPos[2]-keeper.z)<2.6;
  if(onGround&&!immediateRebound&&ballState!=='held'&&mocap.clips.getup){
    dive={getup:true,t:0,key:'getup',rate:1.55,mirror:Boolean(d.mirror)};
  }else{
    dive=null;
  }
}

function keeperSmotherPose(d,dt){
  d.t+=dt;
  const clip=mocap.clips[d.key];
  const time=Math.min(clip.duration,d.t<=d.contactAt?clip.contact*d.t/d.contactAt:
    clip.contact+(d.t-d.contactAt)*1.45);
  const turn=signedTurn(d.yaw-keeper.yaw);
  const turnLimit=d.t<d.contactAt*.65?7.5:2.2;
  keeper.yaw+=clamp(turn,-dt*turnLimit,dt*turnLimit);
  const dxBall=ballPos[0]-keeper.x,dzBall=ballPos[2]-keeper.z;
  const range=Math.hypot(dxBall,dzBall);
  const facing=keeper.yaw+Math.PI;
  const inFront=Math.sin(facing)*dxBall+Math.cos(facing)*dzBall>-.08;
  const ballReachable=ballState!=='held'&&ballPos[1]<(d.reboundClaim?.55:.24)&&range<(d.reboundClaim?1.55:1.08)&&(d.reboundClaim||inFront);
  if(d.t<d.contactAt+(d.reboundClaim?.16:.08)){
    if(ballReachable&&(d.reboundClaim||d.t<.045)){
      const lead=Math.max(0,d.contactAt-d.t);
      const liveX=ballPos[0]+clamp(ballVel[0]*lead,-.55,.55);
      const liveZ=ballPos[2]+clamp(ballVel[2]*lead,-.55,.55);
      const blend=1-Math.exp(-dt*(d.reboundClaim?18:10));
      d.targetX=mix(d.targetX,liveX,blend);
      d.targetZ=mix(d.targetZ,liveZ,blend);
      if(d.reboundClaim&&range>.08)d.yaw=Math.atan2(keeper.x-liveX,keeper.z-liveZ);
    }
    const dx=d.targetX-d.x,dz=d.targetZ-d.z;
    const gap=Math.hypot(dx,dz);
    const advance=clamp(gap-d.reach,0,d.maxAdvance??.70)*smooth(d.t/d.contactAt)/Math.max(.01,gap);
    const stepX=d.x+dx*advance-keeper.x,stepZ=d.z+dz*advance-keeper.z;
    const step=Math.min(1,dt*(d.reboundClaim?6.2:d.lunge?6.5:4.6)/Math.max(.001,Math.hypot(stepX,stepZ)));
    keeper.x+=stepX*step;
    keeper.z+=stepZ*step;
  }
  const weight=ballReachable?smooth((d.t-d.contactAt+.14)/.12)*(1-smooth((d.t-d.contactAt-.08)/.12)):0;
  const hands=weight>0?keeperCatchTargets([ballPos[0],Math.max(.11,ballPos[1]),ballPos[2]],weight,keeper.yaw,d.mirror,.08):undefined;
  keeperLabel=ballState==='held'?'ENCAIXE RASTEIRO':d.movingSide?'MERGULHO NOS PÉS':d.lunge?'SAÍDA NOS PÉS':'ABAFANDO';
  if(d.t>d.contactAt+(d.lunge?.52:.42)&&ballState!=='held'){
    finishKeeperDive(d,clip,time);
    keeper.smotherCooldown=d.lunge?1.35:.60;
    keeper.vx=(keeper.vx??0)*.22;
    keeper.vz=(keeper.vz??0)*.22;
  }
  return {clip:d.key,time,loop:false,fade:.16,mirror:d.mirror,authoredGround:true,grounded:true,handTargets:hands};
}

function keeperLobPose(d,elapsed){
  const intercept=d.intercept;
  if(!intercept)return {};
  const {when,point}=intercept;
  const age=elapsed-when;
  const held=ballState==='held';
  const active=ballState==='flight'&&!shot?.saveChecked&&!shot?.stopped;
  if(held)d.lobHeldAt??=elapsed;
  if(!active&&!held)d.lobReleasedAt??=elapsed;
  const lobCarry=held?smooth((elapsed-d.lobHeldAt)/.29):0;
  const paired=held||['catch','jump','scoop','groundCatch'].includes(d.type);
  const engage=paired?.214:.15;
  const window=smooth((age+engage)/(engage-.019))*(1-smooth((age-.035)/.085));
  const weight=window*(d.lobReleasedAt===undefined?1:1-smooth((elapsed-d.lobReleasedAt)/.075));
  if(weight<=0&&!held)return {};
  if(d.saveHand===null&&!held)return {};
  const track=active?smooth((age+.058)/.07):0;
  if(active)d.lobGlovePoint=point.map((value,i)=>value+clamp(ballPos[i]-value,-.09,.09)*track);
  const target=d.lobGlovePoint??point;
  const side=Math.cos(keeper.yaw+Math.PI)*(target[0]-keeper.x)-Math.sin(keeper.yaw+Math.PI)*(target[2]-keeper.z);
  const handTargets=paired?keeperCatchTargets(target,weight,keeper.yaw,d.mirror,.126):
    [{hand:d.saveHand??(side*(d.mirror?-1:1)>=0?'LeftHand':'RightHand'),point:target,weight}];
  for(const hand of handTargets){hand.lob=true;hand.paired=paired;}
  return {handTargets,lobCarry};
}

function keeperPlayback(dt){
  if(!dive)return null;
  const d=dive;
  if(d.getup){
    const urgentRebound=ballState==='loose'&&ballPos[1]<.35&&Math.hypot(ballPos[0]-keeper.x,ballPos[2]-keeper.z)<2.1;
    let urgentShot=false;
    if(ballState==='flight'&&shot&&!shot.planned){
      const probe=predictBallCrossing(keeperContactPlane())??predictBallCrossing(0);
      if(probe&&Math.abs(probe.x-keeper.x)<1.55&&probe.y<1.35&&probe.time>.16)urgentShot=true;
      else shot.planned=true;
    }
    if(urgentRebound||urgentShot){
      dive=null;
      return null;
    }
    d.t+=dt;
    const clip=mocap.clips.getup;
    const time=Math.min(clip.duration,d.t*d.rate);
    keeperLabel='LEVANTANDO';
    if(time>=clip.duration)dive=null;
    return {clip:'getup',time,loop:false,fade:.20,mirror:d.mirror,authoredGround:true,grounded:true};
  }
  if(d.smother)return keeperSmotherPose(d,dt);
  if(d.chipChaseGoal){
    d.t+=dt;
    const ch=d.chipChaseGoal,clip=mocap.clips[d.key];
    const time=Math.min(clip.duration,d.t*d.rate);
    const prog=smooth(d.t/ch.duration);
    keeper.x=mix(ch.startX,ch.goalX,prog);
    keeper.z=mix(ch.startZ,ch.goalZ,prog);
    keeper.yaw+=signedTurn(ch.yaw-keeper.yaw)*(1-Math.exp(-dt*10));
    keeperLabel='TENTANDO ALCANÇAR NO GOL';
    if(time>=clip.duration)finishKeeperDive(d,clip,time);
    return {clip:d.key,time,loop:false,fade:.12,mirror:d.mirror,authoredGround:true,extraY:0};
  }
  d.t+=dt;
  const elapsed=d.t;
  if(d.guide)keeper.yaw=mix(d.startYaw,d.yaw,clamp(elapsed/.14,0,1));
  if(elapsed<d.delay){
    if(Math.abs(d.shift)<.012)return null;
    const distance=cornerStepDistance(d.delay,d.lateralSpeed);
    const fraction=distance>0?cornerStepDistance(elapsed,d.lateralSpeed)/distance:0;
    keeper.x=d.sx+d.cos*d.shift*fraction;
    keeper.z=d.sz-d.sin*d.shift*fraction;
    keeperLabel='AJUSTANDO A POSIÇÃO';
    const cadence=clamp(Math.abs(d.shift)/d.delay/2.4,.65,1.7);
    return {clip:'sidestep',time:elapsed*cadence,loop:true,fade:.14,mirror:d.shift<0,grounded:true};
  }
  const clip=mocap.clips[d.key];
  const time=Math.min(clip.duration,keeperClipTime(elapsed-d.delay,clip,d.rate,d.clipStart||0));
  const frame=time*clip.fps, lo=Math.floor(frame), hi=Math.min(clip.frames-1,lo+1);
  const at=lo*clip.stride+clip.stride-3, next=hi*clip.stride+clip.stride-3;
  const x=d.shift+d.launchShift*keeperLaunchProgress(clip,time)+d.sign*d.stretch*(mix(clip.values[at],clip.values[next],frame-lo)*mocap.scale-(d.startRootX||0));
  const clipDepth=mix(clip.values[at+2],clip.values[next+2],frame-lo)*mocap.scale-(d.startRootZ||0);
  const z=clipDepth-(d.coverageJump?d.backStep*keeperCoverageTravel(clip,time):0);
  keeper.x=d.sx+d.cos*x+d.sin*z;
  keeper.z=d.sz-d.sin*x+d.cos*z;
  const fade=.13,extraY=d.lift*keeperLift(clip,time);
  const intercept=d.intercept;
  let handTargets;
  const lobPose=d.chip?keeperLobPose(d,elapsed):{};
  const leadingGlove=lobPose.handTargets?.[0];
  if(leadingGlove?.paired){
    const {point}=intercept;
    const assist=leadingGlove.weight*(1-(lobPose.lobCarry??0));
    const correction=Math.sign(point[0]-keeper.x)*Math.max(0,Math.abs(point[0]-keeper.x)-.66);
    keeper.x+=clamp(correction,-.22,.22)*assist;
    keeper.z+=clamp(point[2]-keeper.z,-.38,.38)*assist*.70;
  }
  if(intercept&&!d.chip){
    const {when,point,margin}=intercept;
    const weight=smooth((elapsed-when+.26)/(d.close?.13:.22))*(1-smooth((elapsed-when-.06)/.18));
    const direction=Math.sign(point[0]-d.sx)||1;
    const target=[point[0]-direction*margin,Math.max(.09,point[1]-(point[1]>1.6?margin*.30:0)),point[2]];
    const localSide=Math.cos(keeper.yaw+Math.PI)*(point[0]-keeper.x)-Math.sin(keeper.yaw+Math.PI)*(point[2]-keeper.z);
    const hand=d.saveHand??(localSide*(d.mirror?-1:1)>=0?'LeftHand':'RightHand');
    if(weight>0&&Math.abs(point[0]-keeper.x)<1.85){
      const twoHands=['groundCatch','catch','scoop','jump'].includes(d.type)&&Math.abs(localSide)<.85;
      const hands=twoHands
        ? keeperCatchTargets(target,weight,keeper.yaw,d.mirror,.12)
        : [{hand,point:target,weight,pole:d.close?[direction*.62,-.37,.34]:null}];
      if(!twoHands&&hands.length===1&&Math.abs(localSide)<.45){
        const other=hand==='LeftHand'?'RightHand':'LeftHand';
        const support=keeperCatchTargets([target[0],Math.max(.14,target[1]-.09),target[2]],weight*.70,keeper.yaw,d.mirror,.18);
        hands.push(support.find(handTarget=>handTarget.hand===other));
      }
      if(d.canReach){
        const reach=hands.length?.66:.49;
        const correction=Math.sign(target[0]-keeper.x)*Math.max(0,Math.abs(target[0]-keeper.x)-reach);
        const reachAdjustment=d.closeCorner?.08:.12;
        keeper.x+=clamp(correction,-reachAdjustment,reachAdjustment)*weight;
        keeper.z+=clamp(point[2]-keeper.z,-.20,.20)*weight*.55;
      }
      handTargets=hands;
    }
  }
  const labels={high:'DEFESA ALTA',lateral:'MERGULHO LATERAL',low:'DEFESA RASTEIRA',scoop:'ENCAIXE BAIXO',groundCatch:'ENCAIXE RASTEIRO',spread:'ABAFANDO',block:'BLOQUEIO',jump:'SALTO VERTICAL',catch:'ENCAIXE',oneHand:'ESPALMADA',reflex:'REFLEXO',foot:'DEFESA COM O PÉ'};
  keeperLabel=time>clip.land?'RECOMPONDO':d.coverageJump?'SALTO NA COBERTURA':
    ((d.upperCorner||d.type==='oneHand')?upperCornerLabels[d.key]:null)??labels[d.type];
  if(ballState==='loose'&&!d.smother&&time>=(clip.land||clip.contact+.35)+.18){
    const gkGap=Math.hypot(ballPos[0]-keeper.x,ballPos[2]-keeper.z);
    const plGap=Math.hypot(ballPos[0]-player.x,ballPos[2]-player.z);
    const ballInArea=Math.abs(ballPos[0])<=20.16&&ballPos[2]<=16.5;
    if(gkGap<4.8||(ballInArea&&gkGap<plGap)){
      finishKeeperDive(d,clip,time);
      keeper.smotherCooldown=0;
    }
  }
  if(time>=clip.duration){
    if(ballState==='held')return {clip:d.key,time,loop:false,fade,mirror:d.mirror,authoredGround:true,extraY,...lobPose};
    finishKeeperDive(d,clip,time);
  }
  return {clip:d.key,time,loop:false,fade,mirror:d.mirror,authoredGround:true,extraY,handTargets,...lobPose};
}
function resultShot(type,detail,hold,runout=null,ratingDelta=0){
  if((type==='save'||type==='post')&&shot)shot.stopped=true;
  if((type==='save'||type==='post')&&shot&&!shot.penalty&&!shot.teamScorer&&!shot.ratingHandled){
    shot.ratingHandled=true;
    ratingDelta=ratePlay(type==='save'?'savedShot':'post',type==='save'?.2:.3);
  }
  if(type==='save'){
    stats.saves++;
    announce('DEFENDEU!',detail,'#ffd283',ratingDelta);
    sound(150,.2,'triangle',.15);
    if(ballState==='held')result={type:'save',t:0};
    updateStats();
    return;
  }
  if(type==='post'){
    stats.posts++;
    announce('NA TRAVE!','Bola viva! Busque o rebote.','#fff0be',ratingDelta);
    sound(840,.4,'triangle',.12);
    updateStats();
    return;
  }
  if(result?.type==='goal')return;
  clearFirstTimeShot();
  result={type,t:0,hold,runout};
  if(type==='goal'){
    ballState='goal';
    windup=null;
    charging=false;
    charge=0;
    requestedVolley=false;
    player.touchPending=null;
    if(!runout)motion.reset(player);
    const ownGoal=ownGoalFromDeflection();
    if(!ownGoal&&(!shot?.teamScorer||shot.assisted))ratingDelta=ratePlay(shot?.assisted?'assist':'goal',shot?.assisted?.7:1,
      {outsideArea:!!shot?.outsideArea,freeKick:!!shot?.freeKick,finesse:!!shot?.finesse});
    if(!shot?.teamScorer&&!ownGoal)stats.goals++;
    const celebrations=['sillyDancing','victory'].filter(k=>mocap?.clips?.[k]);
    if(celebrations.length){
      const pool=celebrations.length>1?celebrations.filter(k=>k!==player.lastCelebration):celebrations;
      const clip=pool[Math.floor(Math.random()*pool.length)];
      player.lastCelebration=clip;
      result.celebration={clip,mirror:Math.random()<.5,yaw:Math.atan2(player.x-camera[0],player.z-camera[2])};
    }
    announce(ownGoal?'GOL CONTRA!':'GOOOOL!',ownGoal?'O desvio do defensor mandou a bola para o gol.':shot?.assisted?'Assistência sua!':shot?.teamScorer?'Gol do companheiro!':detail,undefined,ratingDelta);
    const play=activeDefense();
    const scoringHome=play?activeShootout()?(play.shootoutTurn.side==='user')===play.match.home:play.match?.home!==false:true;
    matchAudio.playCheer(scoringHome?.78:.62);
  }else if(type==='out'){
    windup=null;charging=false;charge=0;
    announce('PRA FORA!',detail,'#f4f5eb',ratingDelta);
  }else if(type==='postOut'){
    windup=null;
    charging=false;
    charge=0;
    announce('TRAVE!',detail,'#fff0be');
  }else announce('PRA FORA!',detail,'#f4f5eb');
  updateStats();
}
function playerAnimation(dt){let p=neutral();player.phase+=dt*(moveSpeed>4?15:10)*Math.min(1,moveSpeed/2);let run=clamp(moveSpeed/4.3,0,1),a=Math.sin(player.phase),b=Math.sin(player.phase+Math.PI);p.hipY=Math.abs(Math.cos(player.phase))*run*.055;p.bodyX=-.14*run;p.bodyY=Math.sin(player.phase)*.10*run;p.laX=b*.68*run;p.raX=a*.68*run;p.leX=-.4-.65*run;p.reX=-.4-.65*run;p.ltX=a*.78*run;p.rtX=b*.78*run;p.lkX=Math.max(0,-a)*1.15*run;p.rkX=Math.max(0,-b)*1.15*run;p.lfX=-.15*run;p.rfX=-.15*run;
if(charging){p.bodyX=-.1;p.laZ=-.35;p.raZ=.25;p.rtX=.16;p.rkX=.18}
if(windup){let t=windup.t;p=neutral();let back=smooth(t/.19),strike=smooth((t-.19)/.14),follow=smooth((t-.39)/.38);p.rtX=mix(.95,-1.35,strike)*(1-follow);p.rkX=mix(1.3,.16,strike)*(1-follow);p.ltX=-.14*(1-follow);p.lkX=.2*(1-follow);p.bodyX=mix(.10,-.25,strike)*(1-follow);p.bodyY=mix(-.23,.28,strike)*(1-follow);p.laX=-.6*back*(1-follow);p.laZ=-.55*back*(1-follow);p.raX=.45*back*(1-follow);p.raZ=.3*back*(1-follow);p.leX=-.7;p.reX=-.5;p.hipY=-.06*Math.sin(Math.min(1,t/.7)*Math.PI);p.rfX=-.25*(1-follow);if(t<.19){p.rtX*=back;p.rkX*=back}}
if(result?.type==='goal'&&result.t>1){p.laZ=-1.8;p.raZ=1.8;p.leX=-.2;p.reX=-.2;p.hipY=Math.max(0,Math.sin(result.t*7))*.04}
poseHuman(player,p,dt)}
function hasDefensiveCover(){
  const carrier=teamAI.owner??player;
  const dx=carrier.x-keeper.x,dz=carrier.z-keeper.z;
  const distance2=dx*dx+dz*dz;
  if(distance2<.04)return false;
  return (activeDefense()?.defenders??[]).some(actor=>{
    if(actor.action?.slide)return false;
    const x=actor.x-keeper.x,z=actor.z-keeper.z;
    const between=(x*dx+z*dz)/distance2;
    return between>0&&between<1&&Math.abs(x*dz-z*dx)<(1.07+.24*between)*Math.sqrt(distance2);
  });
}

function keeperTrackingSteps(dt,rig){
  const [vx,vz]=keeper.chipVelocity;
  const speed=Math.hypot(vx,vz),yaw=keeper.yaw;
  const side=[-Math.cos(yaw),Math.sin(yaw)];
  const backSpeed=vx*Math.sin(yaw)+vz*Math.cos(yaw);
  const lateralSpeed=vx*side[0]+vz*side[1];
  const width=.155+Math.min(.04,speed*.011);
  const stance=index=>[keeper.x+side[0]*width*(index===0?1:-1),.116,keeper.z+side[1]*width*(index===0?1:-1)];
  const state=keeper.chipSteps??={feet:[0,1].map(index=>{
    const ankle=rig.ankles?.[rig.mirror?1-index:index];
    return ankle&&Math.hypot(ankle[0]-keeper.x,ankle[2]-keeper.z)<.55?[ankle[0],.116,ankle[2]]:stance(index);
  }),next:Math.abs(lateralSpeed)>.3?Number(lateralSpeed<0):0,swing:null};
  if(!state.swing){
    const [first,second]=state.feet.map((foot,index)=>Math.hypot(...sub(stance(index),foot)));
    if(speed>.12||Math.max(first,second)>.085){
      const index=speed>.12?state.next:Number(second>first);
      const duration=mix(.235,.145,smooth(speed/3.8));
      const start=[...state.feet[index]];
      state.swing={index,duration,age:0,start,target:stance(index)};
    }
  }
  const step=state.swing;
  let lift=0;
  if(step){
    step.age=Math.min(step.duration,step.age+dt);
    const progress=step.age/step.duration;
    const ahead=Math.min(.12,Math.max(0,step.duration-step.age)+.065);
    const target=stance(step.index);
    target[0]+=vx*ahead;
    target[2]+=vz*ahead;
    const sign=step.index===0?1:-1;
    const other=state.feet[1-step.index];
    const room=(target[0]-other[0])*side[0]+(target[2]-other[2])*side[1];
    const correction=sign*Math.max(0,.19-room*sign);
    target[0]+=side[0]*correction;
    target[2]+=side[1]*correction;
    const settle=1-Math.exp(-dt*24);
    step.target=step.target.map((value,i)=>mix(value,target[i],settle));
    lift=Math.sin(Math.PI*progress);
    const foot=state.feet[step.index]=step.start.map((value,i)=>mix(value,step.target[i],smooth(progress)));
    foot[1]+=(.053+.05*smooth(speed/3.8))*lift;
    if(progress>=1){state.next=1-step.index;state.swing=null;}
  }
  const weight=step?(step.index===0?-1:1)*lift:0;
  return {clip:'keeperIdle',poseName:'keeperTracking',time:clock,fade:.12,grounded:true,bodyYaw:yaw,
    pelvis:{height:.876+.026*lift,lateral:weight*.025,forward:0,rotation:[.045-clamp(backSpeed*.037,-.09,.14),0,-weight*.045]},
    ankleTargets:state.feet.map((point,index)=>({foot:index===0?'LeftFoot':'RightFoot',point,yaw,
      pitch:step?.index===index?-.18*lift*clamp(backSpeed,-1,1):0,groundWeight:step?.index===index?1-lift:1,
      kneeBend:.48,legExtension:0}))};
}

function beginKeeperPassDive(point,time){
  const key=['saveGroundScoop','gkCatchFwd','scoopReference'].find(k=>mocap.clips[k]?.contact>0);
  if(!key)return false;
  dive={smother:true,lunge:true,reboundClaim:true,passInterception:true,t:0,x:keeper.x,z:keeper.z,
    targetX:point.x,targetZ:point.z,yaw:Math.atan2(keeper.x-point.x,keeper.z-point.z),key,
    contactAt:clamp(time,.12,.36),reach:.28,maxAdvance:2.4,mirror:false};
  keeper.passClaim=null;keeper.passCooldown=.8;keeperLabel='MERGULHANDO NO PASSE';
  return true;
}

function keeperHasBallPriority(){
  if(!['pass','loose','controlled','teammate'].includes(ballState)||Math.abs(ballPos[0])>20.16||ballPos[2]<0||ballPos[2]>16.5)return false;
  const gap=Math.hypot(keeper.x-ballPos[0],keeper.z-ballPos[2]);
  const field=[player,...teamAI.actors(),...(activeDefense()?.defenders??[])];
  return field.every(actor=>gap+.10<Math.hypot(actor.x-ballPos[0],actor.z-ballPos[2]));
}
function advanceKeeperPass(dt){
  keeper.passCooldown=Math.max(0,(keeper.passCooldown??0)-dt);
  const priority=keeperHasBallPriority();
  if(terminal()||shot&&!priority||dive||activeSetPiece()||!priority&&!['pass','loose'].includes(ballState)){
    if(ballState!=='held')keeper.passClaim=null;
    return false;
  }
  let claim=keeper.passClaim;
  if(!claim){
    if(keeper.passCooldown>0)return false;
    let point=teamAI.interception(keeper,{pace:5.8,height:3.2});
    if(priority&&!point.reachable){
      const time=clamp(Math.hypot(keeper.x-ballPos[0],keeper.z-ballPos[2])/5.8,.14,2.5);
      const predicted=predictShotBall(time);
      point={x:predicted[0],y:predicted[1],z:predicted[2],time,reachable:true};
    }
    const gap=Math.hypot(point.x-keeper.x,point.z-keeper.z);
    if(!point.reachable||point.time>(priority?3:1.25)||point.time<.06||gap>(priority?20:6)||Math.abs(point.x)>19.8||point.z<.15||point.z>16.2)return false;
    if(point.y<.6&&(priority||point.time<.4)&&gap<2.5&&beginKeeperPassDive(point,point.time))return true;
    const key=(point.y>1.8?['gkChipCatchHigh','saveTopCatch','catch4Reference']:
      ['gkCatchFwd','catchReference','gkCatchJog']).find(k=>mocap.clips[k]?.contact>0);
    if(!key)return false;
    claim=keeper.passClaim={priority,key,when:clock+point.time,point:[point.x,point.y,point.z],age:0,
      contact:mocap.clips[key].contact,reaching:false,jump:point.y>1.8};
  }
  const remaining=claim.when-clock;
  if(remaining>0){
    const predicted=predictShotBall(remaining);
    const missed=Math.hypot(predicted[0]-claim.point[0],predicted[2]-claim.point[2])>1.5||Math.abs(predicted[1]-claim.point[1])>1.2;
    if(missed){keeper.passClaim=null;keeper.passCooldown=.18;keeper.recoverUntil=clock+.65;return false;}
  }
  if(remaining<-.45){keeper.passClaim=null;keeper.passCooldown=.55;return false;}
  const point=claim.point,dx=point[0]-keeper.x,dz=point[2]-keeper.z,gap=Math.hypot(dx,dz);
  if(point[1]<.6&&remaining>0&&(priority||remaining<.35)&&gap<2.5&&
    beginKeeperPassDive({x:point[0],y:point[1],z:point[2]},remaining))return true;
  const speed=remaining>0?Math.min(5.8,Math.max(0,gap-.36)/Math.max(.1,remaining)):0;
  const axis=gap>.05?[dx/gap,dz/gap]:[0,0];
  const blend=Math.min(1,dt*12);
  keeper.vx=mix(keeper.vx??0,axis[0]*speed,blend);keeper.vz=mix(keeper.vz??0,axis[1]*speed,blend);
  keeper.x=clamp(keeper.x+keeper.vx*dt,-19.8,19.8);keeper.z=clamp(keeper.z+keeper.vz*dt,.15,16.2);
  const yaw=Math.atan2(keeper.x-point[0],keeper.z-point[2]);
  keeper.yaw+=clamp(signedTurn(yaw-keeper.yaw),-dt*10,dt*10);
  keeper.trackSpeed=Math.hypot(keeper.vx,keeper.vz);
  claim.reaching=remaining<(claim.jump?.48:.32);
  keeperLabel=claim.jump?'SAINDO NO PASSE AÉREO':'INTERCEPTANDO O PASSE';
  return true;
}
function keeperPassPose(dt){
  const claim=keeper.passClaim;
  if(!claim)return null;
  const remaining=claim.when-clock;
  if(!claim.reaching)return {clip:'jog',time:clock,loop:true,grounded:true,fade:.14,bodyYaw:keeper.yaw};
  const window=claim.jump?.48:.32;
  const phase=clamp((window-remaining)/window,0,1);
  const clip=mocap.clips[claim.key];
  const time=clamp(claim.contact*phase+Math.max(0,-remaining)*1.2,0,clip.duration-.01);
  const lift=claim.jump?clamp(claim.point[1]-2.15,.1,.75)*Math.sin(Math.PI*.5*phase)*
    (1-smooth(Math.max(0,-remaining)/.45)):0;
  const weight=smooth(phase/.65)*(1-smooth(Math.max(0,-remaining)/.45));
  const hands=keeperCatchTargets(claim.point,weight,keeper.yaw,false,.06);
  if(ballState==='held'&&remaining<-.45){keeper.passClaim=null;return null;}
  return {clip:claim.key,time,loop:false,fade:.12,authoredGround:true,grounded:!claim.jump,
    airborne:claim.jump,extraY:lift,bodyYaw:keeper.yaw,handTargets:hands};
}

function keeperAnimation(dt){
  keeper.trackSpeed=0;
  keeper.chipVelocity=null;
  if(advanceKeeperPass(dt))return;
  if(!dive&&ballState==='flight'&&shot?.chipGoal&&!shot.penalty&&!shot.planned&&shot.t>=.035){
    const {x,y}=shot.chipGoal;
    const [dx,dz]=[clamp(x,-3.20,3.20)-keeper.x,mix(1.04,.32,smooth((y-1.20)/.90))-keeper.z];
    const speed=Math.min(3.8,Math.hypot(dx,dz)*7);
    const [vx,vz]=norm([dx,dz]).map(value=>value*speed);
    keeper.x+=vx*dt;
    keeper.z+=vz*dt;
    const turn=signedTurn(Math.atan2(keeper.x-ballPos[0],keeper.z-ballPos[2])-keeper.yaw);
    keeper.yaw+=clamp(turn,-dt*7.5,dt*7.5);
    keeper.trackSpeed=speed;
    keeper.chipVelocity=[vx,vz];
    keeperLabel='ACOMPANHANDO A CAVADINHA';
    return;
  }
  if(dive||ballState==='flight'||terminal())return;
  if(activeSetPiece()&&!shot){
    placeSetPieceKeeper();
    return;
  }
  keeper.smotherCooldown=Math.max(0,(keeper.smotherCooldown??0)-dt);
  keeper.feintStun=Math.max(0,(keeper.feintStun??0)-dt);
  const noBall=ballState==='none';
  const ballX=noBall?player.x:ballPos[0],ballZ=Math.max(.44,noBall?player.z:ballPos[2]);
  const gap=Math.hypot(ballX-keeper.x,(noBall?player.z:ballPos[2])-keeper.z);
  const carrier=teamAI.owner??player;
  const controlled=ballState==='controlled'||ballState==='teammate';
  const loose=(ballState==='loose'||ballState==='pass')&&ballPos[1]<.32;
  const inArea=Math.abs(ballX)<=20.16&&ballPos[2]<=16.5;
  const attacker=controlled||loose&&nearBall(1.25);
  const playerToBall=Math.hypot(carrier.x-ballX,carrier.z-ballPos[2]);
  const closerThanPlayer=gap<playerToBall;
  const looseRebound=ballState==='loose'&&inArea&&ballPos[1]<.75&&Math.hypot(ballVel[0],ballVel[2])<11.5&&!activeSetPiece()
    &&((gap<4.6&&Math.hypot(ballX,ballPos[2])<10.5)||closerThanPlayer);
  const looseToClaim=looseRebound||(loose&&(keeper.rush??0)>.55&&gap<1.65);
  const open=inArea&&(attacker&&!hasDefensiveCover()||looseToClaim)&&!activeSetPiece();
  const changedCarrier=controlled&&keeper.lastCarrier&&keeper.lastCarrier!==carrier;
  if(changedCarrier||!open&&(keeper.rush??0)>.3)keeper.recoverUntil=clock+.65;
  keeper.lastCarrier=controlled?carrier:keeper.lastCarrier;
  const recovering=!looseRebound&&(clock<(keeper.recoverUntil??0)||!controlled&&keeper.z>2.5);
  keeper.rush=mix(keeper.rush??0,Number(open&&!recovering),1-Math.exp(-dt*(recovering?12:looseRebound?12:open?7.1:8)));

  if(fakeCut&&keeper.lastFakeCut!==fakeCut){
    keeper.lastFakeCut=fakeCut;
    if(gap<5.8&&keeper.rush>.25)keeper.feintStun=Math.max(keeper.feintStun,fakeCut.lateral?.30:.22);
  }
  if(!fakeCut)keeper.lastFakeCut=null;

  const vx=controlled?mix(carrier.vx,ballVel[0],.23):ballVel[0];
  const vz=controlled?mix(carrier.vz,ballVel[2],.23):ballVel[2];
  const readRate=keeper.feintStun>0?2.1:6.4;
  keeper.readVx=mix(keeper.readVx??vx,vx,1-Math.exp(-dt*readRate));
  keeper.readVz=mix(keeper.readVz??vz,vz,1-Math.exp(-dt*readRate));

  const lead=keeper.rush*mix(.095,.038,smooth((4.4-gap)/3.4));
  const aimX=ballX+clamp(keeper.readVx*lead,-.58,.58);
  const aimZ=Math.max(.44,ballZ+clamp(keeper.readVz*lead,-.58,.58));
  const left=Math.hypot(aimX+3.66,aimZ),right=Math.hypot(aimX-3.66,aimZ);
  const angleX=(-3.66-aimX)/left+(3.66-aimX)/right;
  const angleZ=-aimZ/left-aimZ/right;
  const slope=angleX/angleZ;
  const goalLineX=aimX-slope*aimZ;
  const range=Math.hypot(ballX,ballZ);
  const depth=clamp(Math.min(ballZ*.62,.64+Math.max(0,16-range)*.18),.32,2.9);
  const wide=smooth((Math.abs(aimX)-4.2)/10.5);
  const standOff=mix(1.36,2.65,wide);
  const maxDepth=Math.min(mix(8.6,4.1,wide),(7.2-Math.abs(goalLineX))/Math.max(.01,Math.abs(slope)));
  const rushDepth=clamp(aimZ-standOff*Math.abs(angleZ)/Math.hypot(angleX,angleZ),.32,Math.max(.32,maxDepth));
  const targetZ=looseRebound?clamp(ballPos[2]+ballVel[2]*.12,.30,closerThanPlayer?16.0:8.5):mix(depth,rushDepth,keeper.rush);
  const targetX=looseRebound?clamp(ballX+ballVel[0]*.12,closerThanPlayer?-19.5:-6.5,closerThanPlayer?19.5:6.5):clamp(goalLineX+slope*targetZ,-mix(3.22,7.2,keeper.rush),mix(3.22,7.2,keeper.rush));
  const dx=targetX-keeper.x,dz=targetZ-keeper.z;
  const jockey=looseRebound?0:keeper.rush*smooth((4.6-gap)/3.3);
  const lateralError=Math.abs(goalLineX+slope*clamp(keeper.z,.32,aimZ)-keeper.x);
  const forwardScale=1-.74*jockey*smooth(lateralError/1.25);
  const brace=charging&&!activeSetPiece()&&gap<6.5?smooth((6.5-gap)/3.5):0;
  const stunned=keeper.feintStun>0;

  const toBallLen=Math.max(.01,gap);
  const fwdX=(ballX-keeper.x)/toBallLen,fwdZ=(ballPos[2]-keeper.z)/toBallLen;
  const sideX=-fwdZ,sideZ=fwdX;
  const errFwd=dx*fwdX+dz*fwdZ,errSide=dx*sideX+dz*sideZ;
  const forwardMax=(recovering?6.4:mix(3.3,5.45,keeper.rush))*mix(1,.62,recovering?0:brace);
  const lateralMax=(recovering?5.8:mix(3.2,4.35,keeper.rush))*mix(1,.74,recovering?0:brace);
  const desFwd=clamp(errFwd*5.8,-forwardMax,errFwd>0?forwardMax*forwardScale:forwardMax);
  const desSide=clamp(errSide*mix(5.6,8.2,jockey),-lateralMax,lateralMax);
  let desVx=fwdX*desFwd+sideX*desSide;
  let desVz=fwdZ*desFwd+sideZ*desSide;
  const maxPace=Math.max(forwardMax,lateralMax);
  const desSpeed=Math.hypot(desVx,desVz);
  if(desSpeed>maxPace){desVx*=maxPace/desSpeed;desVz*=maxPace/desSpeed;}
  if(stunned){desVx*=.28;desVz*=.28;}

  const curVx=keeper.vx??0,curVz=keeper.vz??0;
  const dvx=desVx-curVx,dvz=desVz-curVz;
  const reversing=curVx*desVx+curVz*desVz<0;
  const accel=recovering?19:mix(9.5,13.5,keeper.rush)*(reversing?.70:1)*(stunned?.28:mix(1,.68,brace));
  const dv=Math.hypot(dvx,dvz),maxDv=accel*dt;
  const scale=dv>maxDv?maxDv/dv:1;
  keeper.vx=curVx+dvx*scale;
  keeper.vz=curVz+dvz*scale;
  const stepX=keeper.vx*dt,stepZ=keeper.vz*dt;
  keeper.x+=stepX;
  keeper.z+=stepZ;
  const angle=Math.atan2(keeper.x-ballX,keeper.z-ballPos[2]);
  const turn=signedTurn(angle-keeper.yaw);
  const turnRate=mix(6.2,9.8,jockey)*(stunned?.42:1);
  keeper.yaw+=clamp(turn,-dt*turnRate,dt*turnRate);
  keeper.trackSpeed=Math.hypot(keeper.vx,keeper.vz);
  const localX=-Math.cos(keeper.yaw)*stepX+Math.sin(keeper.yaw)*stepZ;
  const localZ=Math.sin(keeper.yaw)*stepX+Math.cos(keeper.yaw)*stepZ;
  keeper.trackForward=localZ<-Math.abs(localX)*1.13&&jockey<.56;
  if(Math.abs(localX)>dt*.19)keeper.trackMirror=localX<0;
  keeper.rushDiveCheck=Math.max(0,(keeper.rushDiveCheck??0)-dt);
  if(looseRebound&&!stunned&&keeper.smotherCooldown<=0){
    const playerThreat=playerToBall<3.4;
    if(playerThreat&&ballPos[1]<.35&&gap<=2.45){
      beginKeeperSmother(true,vx,vz,keeper.vx,keeper.vz);
    }else if(!playerThreat&&ballPos[1]<.55){
      const key=mocap.clips.gkCatchFwd?'gkCatchFwd':mocap.clips.gkCatchJog?'gkCatchJog':'scoopReference';
      const contactAt=clamp(mocap.clips[key]?.contact??.22,.16,.28);
      const futX=ballX+vx*contactAt,futZ=ballPos[2]+vz*contactAt;
      const futGap=Math.hypot(futX-keeper.x,futZ-keeper.z);
      const ballSpeed=Math.hypot(vx,vz);
      const closingSpeed=((keeper.vx-vx)*(ballX-keeper.x)+(keeper.vz-vz)*(ballPos[2]-keeper.z))/Math.max(.1,gap);
      if(futGap<=1.15&&(ballSpeed<4.2||closingSpeed>0||gap<.85)){
        const desired=futGap>.08?Math.atan2(keeper.x-futX,keeper.z-futZ):keeper.yaw;
        dive={smother:true,lunge:false,reboundClaim:true,t:0,x:keeper.x,z:keeper.z,
          targetX:futX,targetZ:futZ,yaw:desired,key,movingSide:false,
          contactAt,reach:.32,maxAdvance:1.35,mirror:false};
      }
    }
  }else if(open&&keeper.rush>.52&&!windup&&!fakeCut&&!stunned&&keeper.smotherCooldown<=0&&ballPos[1]<.26)
    beginKeeperSmother(loose,vx,vz,keeper.vx,keeper.vz);
}

function beginKeeperSmother(loose,vx,vz,keeperVx,keeperVz){
  const dx=ballPos[0]-keeper.x,dz=ballPos[2]-keeper.z;
  const gap=Math.hypot(dx,dz);
  if(gap>2.45)return;
  const facing=keeper.yaw+Math.PI;
  const sin=Math.sin(facing),cos=Math.cos(facing);
  const closing=((keeperVx-vx)*dx+(keeperVz-vz)*dz)/Math.max(.10,gap);
  const closeSmother=gap<=(loose?1.35:1.18)&&(!(!loose&&gap>.76&&closing<.70));
  let lunge=false;
  if(!closeSmother){
    if(gap<1.05||gap>2.40||ballPos[2]>14.0||keeper.rushDiveCheck>0)return;
    keeper.rushDiveCheck=.42+Math.random()*.36;
    const chance=loose?.85:gap<1.65?.58:.38;
    if(Math.random()>=chance)return;
    lunge=true;
  }
  const baseContactAt=lunge
    ? clamp(.22+(gap-.95)*.09,.20,.36)
    : clamp(.19+(gap-.48)*.12-Math.max(0,closing)*.012,.15,.28);
  const contactAt=baseContactAt*(1-.20*opponentAttribute(activeDefense()?.goalkeeper?.reflex));
  const leadCap=lunge?.78:.40;
  const predictedX=dx+clamp(vx*contactAt,-leadCap,leadCap),predictedZ=dz+clamp(vz*contactAt,-leadCap,leadCap);
  const forward=sin*predictedX+cos*predictedZ;
  const lateral=cos*predictedX-sin*predictedZ;
  if(lunge){
    if(sin*dx+cos*dz<.18||forward<-.05||Math.abs(lateral)>1.35)return;
  }else if(sin*dx+cos*dz<.12||forward<-.08||Math.abs(lateral)>.54||
    Math.hypot(predictedX,predictedZ)>Math.min(1.18,.76+Math.max(0,closing)*.12))return;
  const movingSide=lunge?(Math.abs(lateral)>.38):(gap>.47&&Math.abs(lateral)>.32);
  const frontalChoices=['gkSmotherChest0','gkSmotherClose','gkSmotherKnee','scoopReference'].filter(k=>mocap.clips[k]);
  const sideChoices=['gkSmotherSide90','gkSmotherChest45','blockReference','block2Reference'].filter(k=>mocap.clips[k]);
  const pool=movingSide?sideChoices:frontalChoices;
  const fallback=movingSide?(lateral<0?'block2Reference':'blockReference'):'scoopReference';
  const key=pool.length?pool[Math.floor((clock*3+Math.random()*pool.length)%pool.length)]:fallback;
  const desired=gap>.08?Math.atan2(-dx,-dz):keeper.yaw;
  const yaw=movingSide?keeper.yaw+clamp(signedTurn(desired-keeper.yaw),-.32,.32):desired;
  dive={smother:true,lunge,t:0,x:keeper.x,z:keeper.z,targetX:keeper.x+predictedX,targetZ:keeper.z+predictedZ,
    yaw,key,movingSide,contactAt,reach:lunge?(movingSide?.46:.40):(movingSide?.70:.52),
    maxAdvance:lunge?1.45:.70,
    mirror:movingSide&&Math.sign(lateral)!==(mocap.clips[key].saveSide??1)};
}

function finishKeeperSmother(){
  const maxY=dive?.reboundClaim?.58:.28;
  if(!dive?.smother||!['controlled','loose','teammate','pass'].includes(ballState)||ballPos[1]>maxY)return;
  const phase=dive.t-dive.contactAt;
  if(phase<(dive.reboundClaim?-.12:-.085)||phase>(dive.reboundClaim?.32:.18))return;
  const rig=mocap.get(keeper);
  const center=mul(add(rig.hands[0],rig.hands[1]),.5);
  const boxHit=rig?.hitboxes?.some(b=>(b.part==='hand'||b.part==='arm')&&mocap.sphereHitsBox(ballPos,.15,b));
  if(dive.reboundClaim){
    const handDist=Math.min(Math.hypot(...sub(ballPos,center)),...rig.hands.map(h=>Math.hypot(...sub(ballPos,h))));
    const bodyDist=Math.hypot(ballPos[0]-keeper.x,ballPos[2]-keeper.z);
    if(dive.passInterception){if(!boxHit&&handDist>.27)return;}
    else if(!boxHit&&handDist>.58&&bodyDist>.68)return;
  }else if(!boxHit&&(Math.hypot(...sub(ballPos,center))>.27||rig.hands.some(hand=>Math.hypot(...sub(ballPos,hand))>.35)))return;
  holdKeeperBall(rig);
  resultShot('save',dive.passInterception?'O goleiro saiu e interceptou o passe.':dive.reboundClaim?'O goleiro se recuperou e encaixou o rebote.':'O goleiro mergulhou e encaixou nos pés do atacante.');
}

function placeSetPieceKeeper(){
  const {wallSide}=activeDefense();
  keeper.z=wallSide?.60:.28;
  keeper.x=wallSide?clamp(-wallSide*1.05+ballPos[0]*keeper.z/ballPos[2],-2.4,2.4):0;
  keeper.yaw=Math.atan2(keeper.x-ballPos[0],keeper.z-ballPos[2]);
  keeper.vx=0;keeper.vz=0;keeper.readVx=0;keeper.readVz=0;keeper.feintStun=0;keeper.smotherCooldown=0;
}
function snapshot(){
  const human=actor=>({x:actor.x,y:actor.y,z:actor.z,yaw:actor.yaw,roll:actor.roll||0,pose:{...actor.pose}});
  return {p:human(player),k:human(keeper),ball:[...ballPos],spin:ballSpin,ballRotation:[...ballRotation],
    label:keeperLabel,crowdAge:result?.type==='goal'?result.t:-1,
    net:ballState==='goal'?goalNet.snapshot():null,mp:mocap.snapshot(player),mk:mocap.snapshot(keeper),
    defenders:[...(trainingDefense?.defenders??[]),...(trainingDefense?.piece?.kind==='freeKick'?freeKickAllies:[]),...teamAI.actors()]
      .map(actor=>({actor,state:human(actor),rig:mocap.snapshot(actor)}))};
}

function applySnapshot(frame){
  for(const [actor,state,rig] of [[player,frame.p,frame.mp],[keeper,frame.k,frame.mk],
    ...frame.defenders.map(({actor,state,rig})=>[actor,state,rig])]){
    Object.assign(actor,state,{pose:{...state.pose}});
    poseHuman(actor,state.pose,1);
    mocap.restore(actor,rig);
  }
  ballPos=[...frame.ball];
  ballSpin=frame.spin;
  ballRotation.splice(0,3,...frame.ballRotation);
  keeperLabel=frame.label;
  if(frame.net)goalNet.restore(frame.net);
  else goalNet.reset();
}

function replay(){
  if(replaying){stopReplay();return;}
  if(!trainingDefense||paused||trainingFadeUntil)return;
  const clip=result&&record.length>=15?record:trainingClip;
  if(!clip)return;
  replayFrames=clip;
  replaySaved=snapshot();
  replayIndex=0;
  replaying=true;
  $('#replayTag').hidden=false;
  updateInputLabels();
}

function stopReplay(){
  if(replaySaved)applySnapshot(replaySaved);
  replaySaved=null;
  replayFrames=null;
  replaying=false;
  $('#replayTag').hidden=true;
  updateInputLabels();
}

let inputDevice='keyboard', stickActive=false, previousStick=[0,0];
function updateInputLabels(){
  const pad=inputDevice==='gamepad';
  for(const button of document.querySelectorAll('[data-orbit]')){
    button.textContent=button.dataset[inputDevice];
  }
  $('#device').textContent=pad?'● Controle':'● Teclado e mouse';
  $('#reset').textContent='Nova bola · '+(pad?'R3':'T');
  $('#replay').textContent=(replaying?'Sair do replay':'Replay')+' · '+(pad?'L3':'V');
  $('#movementHint').textContent=pad?'Analógico esquerdo · mover e mirar':'WASD / setas · mover e mirar';
  $('#passHint').textContent=pad?'A · passe | Y · lançamento | LB + Y · aéreo | B · pedir / segurar para cruzar':'Espaço · passe | Y · lançamento | E + Y · aéreo | B · pedir / segurar para cruzar';
}

function useInput(device){
  if(inputDevice===device)return;
  inputDevice=device;
  updateInputLabels();
}

function connectedGamepad(){
  try{
    const pads=Array.from(navigator.getGamepads?.()||[]).filter(Boolean);
    return pads.find(device=>device.mapping==='standard')??pads[0];
  }catch{
    return null;
  }
}
function input(dt){
  const pad=connectedGamepad();
  const buttons={};
  const horizontal=pad?.axes[0]||0,vertical=pad?.axes[1]||0;
  const radial=smooth((Math.hypot(horizontal,vertical)-.17)/.06);
  let mx=horizontal*radial,mz=vertical*radial;
  if(pad)pad.buttons.forEach((button,index)=>buttons[index]=button.pressed);
  const rollX=pad?.axes[2]||0,rollY=pad?.axes[3]||0;
  const rollTriggered=Math.hypot(rollX,rollY)>.55;
  player.rollStickHeld=Math.hypot(rollX,rollY)>.28;
  if(!player.rollStickHeld){player.rollAxes=null;player.ballRollChain=null;player.skillInputYaw=null;player.pullStickConsumed=false;}
  const previous=prevPad;
  prevPad=buttons;
  const stickMoved=Math.hypot(horizontal,vertical)>.30;
  const moved=Math.hypot(horizontal-previousStick[0],vertical-previousStick[1])>.17;
  if(stickMoved&&(!stickActive||moved)||Object.keys(buttons).some(key=>buttons[key]&&!previous[key]))useInput('gamepad');
  if(moved||!stickMoved)previousStick=[horizontal,vertical];
  stickActive=stickMoved;
  const inMenu=menu.screen!=='game'||paused;
  if(inMenu||replaying||!started)pendingRunDirection=null;
  if(cameraPreview){
    menu.gamepad(buttons,0,0);
    const direction=buttons[15]||horizontal>.55?1:buttons[14]||horizontal<-.55?-1:0;
    if(direction&&direction!==cameraPreviewDirection)cycleCamera(direction);
    cameraPreviewDirection=direction;
    if(buttons[8]&&!previous[8])toggleCameraFocus();
    if(buttons[1]&&!previous[1])closeCameraPreview(false);
    else if(buttons[0]&&!previous[0])closeCameraPreview(true);
    return;
  }
  if(started&&menu.screen==='game'&&!menu.stadiumOpen&&buttons[9]&&!previous[9])pause();
  menu.gamepad(buttons,vertical,horizontal);
  if(inMenu||menu.screen!=='game'||paused||!started)return;
  if(trainingDefense&&buttons[11]&&!previous[11]){resetTraining(true);return;}
  if(trainingDefense&&buttons[10]&&!previous[10]){replay();return;}
  const shotHeld=!!(keys.KeyX||buttons[2]);
  const aPressed=buttons[0]&&!previous[0];
  const fakePressed=aPressed||fakeShotTap;
  fakeShotTap=false;
  if(replaying)return;
  if(buttons[8]&&!previous[8])toggleCameraFocus();
  if(trainingFadeUntil&&trainingFadeUntil-performance.now()>300)return;
const play=activeDefense();
if(play)play.sprinting=false;
if(activeShootout()){
  if(play.shootoutFinished||play.shootoutHold!=null)return;
  const bot=play.shootoutBot;
  if(bot){
    bot.age+=dt;
    play.kickAngle=bot.angle*smooth(bot.age/bot.delay);
    if(bot.age>=bot.delay&&!bot.queued){
      placedShot=false;
      beginCharge(false);
      charge=bot.power;
      Object.assign(aim,bot.target);
      bot.queued=queueShot();
    }
    if(windup)advanceShot(windup,dt);
    return;
  }
}
if(terminal()){throughCharge=null;throughButtonHeld=false;throughTap=false;crossButtonHeld=false;crossTap=false;return;}
const chipHeld=!!(keys.KeyE||buttons[4]);
if(chipHeld)chipGraceUntil=clock+.28;
const lobMod=chipHeld||clock<=chipGraceUntil;
placedShot=!!(keys.KeyF||buttons[5]);
skillHeld=chipHeld&&!shotHeld&&!charging&&!shotTap;
mx+=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);mz+=(keys.KeyS||keys.ArrowDown?1:0)-(keys.KeyW||keys.ArrowUp?1:0);const length=Math.hypot(mx,mz);if(length>1){mx/=length;mz/=length}
const shotAxis=camMode==='side'&&!activeSetPiece()?sideShotInput(mx,mz):mx;
const directionLength=Math.hypot(mx,mz);
passAimScreen={x:mx,y:mz,active:directionLength>.20};
const [forwardX,forwardZ]=throughCharge?.cameraAxes??norm([cameraTarget[0]-camera[0],cameraTarget[2]-camera[2]]);
let rightStickPull=false;
if(rollTriggered&&ballState==='controlled'&&!activeSetPiece()&&!windup&&!charging&&!fakeCut&&!throughCharge){
  player.rollAxes??=[forwardX,forwardZ];
  const [rollForwardX,rollForwardZ]=player.rollAxes;
  const axis=norm([-rollForwardZ*rollX-rollForwardX*rollY,rollForwardX*rollX-rollForwardZ*rollY]);
  player.skillInputYaw??=Math.hypot(player.vx,player.vz)>1?Math.atan2(-player.vx,-player.vz):player.yaw;
  const running=!!(keys.ShiftLeft||keys.ShiftRight||buttons[7])||Math.hypot(player.vx,player.vz)>3;
  const skill=motion.skillDirection(player.skillInputYaw,axis,running);
  if(skill?.kind==='roll'){
    if(motion.startBallRoll(player,skill.axis,ballPos,mocap.get(player).ankles,running))useInput('gamepad');
  }else if(skill?.kind==='pull'&&!player.ballRoll){
    rightStickPull=!player.pullStickConsumed||!!player.turningAround;
  }
}
let directed=directionLength>.20?[(-forwardZ*mx-forwardX*mz)/directionLength,
  (forwardX*mx-forwardZ*mz)/directionLength]:null;
if(directed&&aimViewProjection){
  const origin=projected([player.x,.1,player.z],aimViewProjection);
  const east=projected([player.x+1,.1,player.z],aimViewProjection);
  const south=projected([player.x,.1,player.z+1],aimViewProjection);
  const ex=east.x-origin.x,ey=east.y-origin.y,sx=south.x-origin.x,sy=south.y-origin.y;
  const determinant=ex*sy-ey*sx;
  if(origin.visible&&Math.abs(determinant)>.001){
    directed=norm([(mx*sy-mz*sx)/determinant,(mz*ex-mx*ey)/determinant]);
  }
}
const shooting=shotHeld||shotTap||charging||windup||firstTimeCharge||firstTimeRequest;
if(buttons[5]&&!previous[5])pendingRunDirection=!shooting&&directed?[...directed]:null;
if(shooting||terminal())pendingRunDirection=null;
if(!buttons[5]&&previous[5]){
  if(pendingRunDirection)teamAI.requestRun(pendingRunDirection);
  pendingRunDirection=null;
}
player.receiveDirection=directed;
player.receiveSprint=!!(keys.ShiftLeft||keys.ShiftRight||buttons[7]);
player.receptionLookTarget=teamAI.receptionGuide(player)?.point??null;
const passHeld=!!(keys.Space||buttons[0]);
const passPressed=(passHeld&&!passButtonHeld||fakePressed)&&!charging&&!shotHeld;
const passReleased=passButtonHeld&&!passHeld;
passButtonHeld=passHeld;
const throughHeld=!!(keys.KeyY||buttons[3]);
const throughPressed=throughTap||throughHeld&&!throughButtonHeld;
const throughReleased=throughButtonHeld&&!throughHeld;
throughButtonHeld=throughHeld;throughTap=false;
const crossHeld=!!(keys.KeyB||buttons[1]);
const crossPressed=crossTap||crossHeld&&!crossButtonHeld;
const crossReleased=crossButtonHeld&&!crossHeld;
crossButtonHeld=crossHeld;crossTap=false;
if(shotHeld&&!shotButtonHeld){throughCharge=null;teamAI.request('shot',directed);}
if(passPressed&&ballState!=='controlled'){throughCharge=null;teamAI.request('pass',directed);}
else{
  if(passPressed&&ballState==='controlled'&&!activeSetPiece()&&!windup&&!shotHeld&&teamAI.preview('pass',directed,.17)){
    clearFirstTimeShot();charging=false;charge=0;
    throughCharge={power:0,direction:directed,kind:'pass',preview:null,cameraAxes:[forwardX,forwardZ]};
  }
  if(crossPressed&&ballState!=='controlled'){
    throughCharge=null;teamAI.request('cross',null);
  }
  if(crossPressed&&ballState==='controlled'&&!activeSetPiece()&&!windup&&!shotHeld&&teamAI.preview('cross',directed,.17)){
    clearFirstTimeShot();charging=false;charge=0;
    throughCharge={power:0,direction:directed,kind:'cross',preview:null,cameraAxes:[forwardX,forwardZ]};
  }
  if(throughPressed&&!activeSetPiece()&&!windup&&!shotHeld){
    const lob=lobMod;
    const kind=lob?'lob':'through';
    if(ballState!=='controlled'){
      throughCharge=null;
      teamAI.request(kind,null);
    }else if(teamAI.preview(kind,directed,.17)){
      clearFirstTimeShot();charging=false;charge=0;
      throughCharge={power:0,direction:directed,kind,lob,preview:null,cameraAxes:[forwardX,forwardZ]};
    }
  }
  if(throughCharge){
    if(throughCharge.kind!=='cross'&&throughCharge.kind!=='pass'){
      if(lobMod)throughCharge.lob=true;
      throughCharge.kind=throughCharge.lob?'lob':'through';
    }
    if(directed)throughCharge.direction=[...directed];
    const cross=throughCharge.kind==='cross';
    const passing=throughCharge.kind==='pass';
    if(passing?passHeld:cross?crossHeld:throughHeld)throughCharge.power=clamp(throughCharge.power+dt*1.2,0,1);
    throughCharge.preview=teamAI.preview(throughCharge.kind,throughCharge.direction,Math.max(.17,throughCharge.power));
    if(!throughCharge.preview||!cross&&ballState!=='controlled'||activeSetPiece()||windup)throughCharge=null;
    else if(passing?(passReleased||passPressed&&!passHeld):cross?(crossReleased||crossPressed&&!crossHeld):(throughReleased||throughPressed&&!throughHeld)){
      teamAI.request(throughCharge.kind,throughCharge.direction,Math.max(.17,throughCharge.power),throughCharge.preview.target);
      throughCharge=null;
    }
  }
}
if(throughHeld||crossHeld||throughCharge)skillHeld=false;

const piece=activeSetPiece();
if(piece&&!shot&&(!windup||piece.kind==='penalty'&&!windup.fired)){
  const halfCone=piece.kind==='penalty'?Math.atan2(3.42,piece.z-footballGoalLineZ):clamp(6.3/piece.z,.22,.37);
  const defense=activeDefense();
  defense.kickAngle=clamp(defense.kickAngle-mx*dt*.76,-halfCone,halfCone);
  aim.x=piece.x-Math.tan(setPieceYaw())*piece.z;
  if(windup&&piece.kind==='penalty'){
    const yaw=setPieceYaw();
    const geometry=mocap.shotGeometry(windup.clip,(windup.clipStart||0)+(windup.contact-windup.setup)*windup.rate,windup.foot,windup.oppositeShot);
    const oldBoot=shotOffset(geometry.boot,windup.targetYaw),oldSupport=shotOffset(geometry.support,windup.targetYaw);
    windup.targetYaw+=signedTurn(yaw-windup.manualYaw);
    const newBoot=shotOffset(geometry.boot,windup.targetYaw),newSupport=shotOffset(geometry.support,windup.targetYaw);
    for(let i=0;i<2;i++){
      const correction=oldBoot[i]-newBoot[i];
      windup.adjustment[i]+=correction;
      windup.plant[i]+=correction+newSupport[i]-oldSupport[i];
    }
    windup.manualYaw=yaw;
    windup.aim.x=aim.x;
  }
}
const released=shotButtonHeld&&!shotHeld;
const pressed=shotTap||shotHeld&&!shotButtonHeld;
shotTap=false;
shotButtonHeld=shotHeld;
if(!shotHeld){fakeShotCanceled=false;}
if(trainingDefense?.placement){
  chooseFreeKickSpot(dt,mx,mz,pressed,shotHeld);
  return;
}
if(trainingDefense?.awaitRelease){
  if(shotHeld)return;
  trainingDefense.awaitRelease=false;
}
if(windup&&!windup.fired&&pressed&&!windup.chip&&!windup.header){
  windup.lowDriven=true;
  windup.aim.y=.22;
  sound(260,.05,'triangle',.04);
}
const firstTimeBall=!piece&&!player.aerialFlight?.airborne&&['pass','loose','flight'].includes(ballState);
const headerPress=pressed&&firstTimeBall&&!windup&&!fakeShotCanceled&&
  (ballPos[1]>=1.32||predictShotBall(.25)[1]>=1.32);
if(headerPress){
  firstTimeRequest={headerOnly:true,power:.62,aimX:shotAimLane(shotAxis),remaining:1.8};
  firstTimeCharge=null;headerSpecs=null;player.aerialAction=null;player.teamAction=null;
  charging=false;charge=0;
}else if(pressed&&firstTimeBall&&!windup&&!fakeShotCanceled){
  firstTimeCharge={power:0,aimX:shotAimLane(shotAxis),finesse:placedShot,chip:chipHeld,
    runDirection:moveSpeed>.15?norm([player.vx??0,player.vz??0]):directed,
    runSpeed:Math.hypot(player.vx??0,player.vz??0)};
  firstTimeRequest=null;headerSpecs=null;player.aerialAction=null;player.teamAction=null;
  charging=false;charge=0;
}
if(firstTimeCharge){
  if(terminal()||['teammate','defender','held','none'].includes(ballState)||fakePressed){
    clearFirstTimeShot();charge=0;fakeShotCanceled=shotHeld;
  }else{
    if(shotHeld)firstTimeCharge.power=clamp(firstTimeCharge.power+dt*1.64,0,1);
    if(Math.abs(shotAxis)>.085)firstTimeCharge.aimX=shotAimLane(shotAxis);
    aim.x=firstTimeCharge.aimX;
    if(directed){
      firstTimeCharge.runDirection=[...directed];
      firstTimeCharge.runSpeed=playerPace(player.receiveSprint)*Math.min(1,length);
    }
    firstTimeCharge.finesse=firstTimeCharge.finesse||placedShot;
    firstTimeCharge.chip=firstTimeCharge.chip||chipHeld;
    charge=firstTimeCharge.power;
    if(released||pressed&&!shotHeld){
      firstTimeRequest={...firstTimeCharge,power:Math.max(.17,firstTimeCharge.power),remaining:2.4};
      firstTimeCharge=null;charging=false;
    }
  }
}
if(firstTimeRequest){
  firstTimeRequest.remaining-=dt;
  if(terminal()||['teammate','defender','held','none'].includes(ballState)||firstTimeRequest.remaining<=0){
    clearFirstTimeShot();charge=0;
  }else if(!windup){
    const prepared=firstTimeRequest;
    const headerQueued=queueBufferedHeader();
    if(!headerQueued&&!prepared.headerOnly){
      const intercept=teamAI.interception(player,{height:1.32});
      if(intercept.reachable&&intercept.time<=.4&&nearBall(2.5)){
        queueShot({...prepared,contactTime:Math.max(.07,intercept.time)});
      }
    }
    if(firstTimeRequest&&!windup)charge=prepared.headerOnly?0:prepared.power;
  }
}
if(fakeCut&&(ballState!=='controlled'||(fakeCut.remaining-=dt)<=0))fakeCut=null;
const canCharge=(!piece||!shot)&&!player.aerialFlight?.airborne&&!windup&&!terminal()&&ballState==='controlled'&&
  !firstTimeCharge&&!firstTimeRequest&&!fakeShotCanceled&&!fakeCut&&nearBall(1.6);
if(fakePressed&&!piece&&(charging||shotHeld&&pressed&&canCharge)){
  charging=false;
  charge=0;
  chargePlaced=false;
  chargeChip=false;
  requestedVolley=false;
  fakeShotCanceled=shotHeld;
  player.spawnControl=null;
  if(ballState==='controlled'&&ballPos[1]<.23&&nearBall(1.10)){
    const from=player.yaw;
    const rawHeading=directed?Math.atan2(-directed[0],-directed[1]):from;
    const rawTurn=signedTurn(rawHeading-from);
    const side=Math.abs(rawTurn)>.05?Math.sign(rawTurn):(lastTouchSide||1);
    const clampedTurn=side*clamp(Math.abs(rawTurn),Math.PI/4,Math.PI/2);
    const heading=from+clampedTurn;
    const cutDir=[-Math.sin(heading),-Math.cos(heading)];
    const gap=Math.hypot(ballPos[0]-player.x,ballPos[2]-player.z);
    fakeCut={direction:cutDir,remaining:1.18,touched:false,lateral:true,
      from,heading,side,elapsed:0,strike:mix(.30,.36,smooth((gap-.40)/.55))};
    motion.lockCharge(player,player.travelYaw??player.yaw);
  }
}else if(shotHeld&&canCharge){
  if(!charging)beginCharge(chipHeld);
  charging=true;
  chargeChip=chargeChip||chipHeld;
  chargePlaced=chargePlaced||placedShot;
  requestedVolley=requestedVolley||(!piece&&ballPos[1]>.38);
  charge=clamp(charge+dt*1.64,0,1);
  if(!piece&&Math.abs(shotAxis)>.085)aim.x=mix(aim.x,shotAimLane(shotAxis),1-Math.exp(-dt*23));
}else if(charging&&!shotHeld){
  queueShot();
}else if(pressed&&!shotHeld&&canCharge){
  beginCharge(chipHeld);
  if(!piece&&Math.abs(shotAxis)>.085)aim.x=shotAimLane(shotAxis);
  queueShot();
}else if(!canCharge){charging=false;if(!firstTimeCharge&&!firstTimeRequest)charge=0}
if(windup){
  advanceShot(windup,dt);
  return;
}
if(charging){
  if(piece)return;
  if(play)play.sprinting=(chargeRun?.pace??0)>3.65&&play.stamina>0;
  advanceCharge(dt);
  updateShotHeight(Math.max(.17,charge));
  return;
}
if(piece)return;

const opening=ballState==='controlled'?player.spawnControl:null;
if(opening&&skillHeld)player.spawnControl=null;
if(opening&&directionLength>.1){
  opening.auto=false;
  opening.commandAt??=opening.elapsed;
}
const autoWalk=opening?.auto&&!skillHeld;
let direction=fakeCut?.direction??directed??(autoWalk?opening.forward:[0,0]);
let sprint=!autoWalk&&!fakeCut&&!!(keys.ShiftLeft||keys.ShiftRight||buttons[7])&&!play?.exhausted;
if(opening&&!skillHeld){
  const alignment=dot(direction,opening.forward);
  if(opening.cutUntil!==undefined){
    if(alignment<.08)player.spawnControl=null;
  }else if(sprint&&alignment>=.08&&alignment<=.97&&opening.elapsed-opening.commandAt<=.16&&player.grip<.12&&
    ballPos[1]<.24&&nearBall(.90)){
    opening.cutUntil=opening.elapsed+.55;
  }
}
const controlled=ballState==='controlled';
const recoverable=ballState==='loose'&&player.lostDribble;
const pace=playerPace(sprint);
const fatigue=play&&sprint?mix(.78,1,smooth(play.stamina/(staminaCapacity()*.28))):1;
let speed=fakeCut?3.55*(1-.44*(player.grip||0)):autoWalk?opening.pace:
  directed?pace*fatigue*Math.min(1,length)*(1-.44*(player.grip||0)):0;
let ballFacing=undefined;
const reception=teamAI.receptionGuide(player);
const attraction=!fakeCut&&!terminal()?teamAI.playerAttraction():null;
const attractionGap=attraction?Math.hypot(attraction.x-player.x,attraction.z-player.z):0;
if(attraction){
  const dx=attraction.x-player.x,dz=attraction.z-player.z,gap=attractionGap;
  if(gap>.08){
    const axis=[dx/gap,dz/gap];
    if(!directed||dot(directed,axis)>-.65){
      const weight=attraction.cross?.96:attraction.designated?.92:.78;
      direction=directed?norm([mix(directed[0],axis[0],weight),mix(directed[1],axis[1],weight)]):axis;
      const needed=gap/Math.max(.12,attraction.time);
      speed=attraction.cross?Math.min(Math.max(5.2,pace*fatigue),needed+.04):Math.max(speed,Math.min(Math.max(5.2,pace*fatigue),needed+1.0));
      if(!reception?.long&&gap<2.4&&speed<3.6)ballFacing=Math.atan2(player.x-ballPos[0],player.z-ballPos[2]);
    }
  }else if(attraction.cross){speed=0;}
}
const closeGuide=closeBallGuide(player,ballPos,ballVel,
  ['loose','pass'].includes(ballState)&&teamAI.canReceive(player)&&!firstTimeRequest&&!firstTimeCharge&&
  !fakeCut&&!windup&&!charging&&!terminal()&&!player.aerialFlight?.airborne);
if(closeGuide){
  direction=closeGuide.direction;
  speed=Math.min(pace*fatigue,Math.max(1.4,closeGuide.gap*4));
  player.receiveDirection=[...direction];
}
if(rightStickPull)speed=0;
const targetYaw=speed>0?Math.atan2(-direction[0],-direction[1]):player.yaw;
const turn=signedTurn(targetYaw-player.yaw);
const canPull=!fakeCut&&(skillHeld||rightStickPull)&&controlled&&!player.turningAround&&touchCooldown<=0;
const requestCut=canPull&&!rightStickPull&&speed>0&&moveSpeed>.35&&Math.abs(turn)>.95&&Math.abs(turn)<=1.95;
const requestPull=canPull&&(rightStickPull||speed===0||Math.abs(turn)>1.95);
if(requestCut)touchCooldown=.36;
if(requestPull){touchCooldown=.67;if(rightStickPull)player.pullStickConsumed=true;}

player.receptionLookTarget=reception?.point??null;
const chasingBall=!!reception&&(reception.long||attractionGap>2.0||speed>3.6||moveSpeed>3.6);
const fastOffBall=(sprint&&speed>4.1)||speed>4.4||moveSpeed>4.3;
if((ballState==='teammate'||reception)&&!windup&&!chasingBall&&!fastOffBall){
  const point=reception?.point??ballPos;
  const dx=point[0]-player.x,dz=point[2]-player.z;
  const facing=Math.hypot(dx,dz)>.16?Math.atan2(-dx,-dz):player.yaw;
  ballFacing=player.yaw+clamp(signedTurn(facing-player.yaw),-dt*10,dt*10);
  player.watchBall=true;
}else{
  if(chasingBall||fastOffBall)ballFacing=undefined;
  player.watchBall=false;
}
if(reception&&!reception.long&&!windup&&!charging&&ballPos[1]<.65){
  const dx=ballPos[0]-player.x,dz=ballPos[2]-player.z,gap=Math.hypot(dx,dz);
  const relativeSpeed=Math.hypot(ballVel[0]-(player.vx??0),ballVel[2]-(player.vz??0));
  const approaching=dx*(ballVel[0]-(player.vx??0))+dz*(ballVel[2]-(player.vz??0))<0;
  if(gap>.18&&(approaching||reception.arrival<.55)&&(gap<3.5||reception.arrival<.55||gap/Math.max(1,relativeSpeed)<.65)){
    const facing=Math.atan2(-dx,-dz);
    ballFacing=player.yaw+clamp(signedTurn(facing-player.yaw),-dt*12,dt*12);
    player.watchBall=true;
    if(speed>.18){
      const travelYaw=Math.atan2(-direction[0],-direction[1]);
      if(Math.abs(signedTurn(travelYaw-facing))>Math.PI/2){
        speed=Math.min(speed,2.8);
        sprint=false;
      }
    }
  }
}
if(player.aerialAction?.kind==='chest'&&!player.aerialAction.touched&&player.aerialAction.receiveYaw!==undefined){
  ballFacing=player.yaw+clamp(signedTurn(player.aerialAction.receiveYaw-player.yaw),-dt*7.5,dt*7.5);
}
if(play)play.sprinting=sprint&&speed>.01;
const lateralCut=fakeCut?.lateral?fakeCut:null;
if(lateralCut)lateralCut.elapsed+=dt;
moveSpeed=motion.move(player,{dt,direction,speed,sprint,ball:ballPos,velocity:ballVel,controlled,loose:ballState==='loose',recoverable,facing:ballFacing,
  requestCut,requestPull,fakeCut:!!fakeCut&&!fakeCut.touched,lateralCut,accelerationScale:.22+mark().acceleration*.0115});
 const reversal=player.turningAround;
 const planting=reversal?.phase==='plant'&&reversal.action.withBall;
 if(controlled&&(planting||player.brakeOnRelease)){
   ballPhysics.brakeDribble(ballPos,ballVel,planting?1.05:Math.max(1.18,speed),planting?22:15.5,dt);
 }
 if(controlled&&reversal?.action?.withBall&&reversal.phase==='pull'&&reversal.action.pullAxis){
   const [ax,az]=reversal.action.pullAxis;
   const dragBlend=1-Math.exp(-dt*22);
   ballVel[0]=mix(ballVel[0],ax*3.1,dragBlend);
   ballVel[2]=mix(ballVel[2],az*3.1,dragBlend);
 }
 if(controlled&&requestCut&&nearBall(1.40)){
   const cutSpeed=Math.max(4.5,moveSpeed*1.28);
   ballVel[0]=direction[0]*cutSpeed;
   ballVel[2]=direction[1]*cutSpeed;
   player.travelYaw=targetYaw;
 }
 if(controlled&&lateralCut&&!lateralCut.touched){
   if(lateralCut.elapsed<lateralCut.strike){
     ballPhysics.brakeDribble(ballPos,ballVel,1.20,16,dt);
   }else if(nearBall(1.85)){
     finishFakeCut({lateral:true});
   }
 }
 if(controlled&&player.grip>.04){
   ballPhysics.brakeDribble(ballPos,ballVel,Math.max(1.18,speed+.33),9+11*player.grip,dt);
 }
 if(!fakeCut)guideDribble(dt,controlled,reversal);
}

function sideShotInput(x,y){
  if(!aimViewProjection)return y;
  const left=projected([-3.15,.45,footballGoalLineZ],aimViewProjection);
  const right=projected([3.15,.45,footballGoalLineZ],aimViewProjection);
  const dx=right.x-left.x,dy=right.y-left.y,length=Math.hypot(dx,dy);
  if(!Number.isFinite(length)||length<.001)return y;
  return clamp((x*dx+y*dy)/length,-1,1);
}

function shotAimLane(value){
  const magnitude=clamp(Math.abs(value),0,1);
  if(camMode!=='side')return magnitude>.085?clamp(value,-1,1)*3.15:0;
  const precision=clamp((magnitude-.085)/.82,0,1)**.82;
  return Math.sign(value)*3.15*precision;
}

function closeBallGuide(actor,ball,velocity,eligible){
  const gap=Math.hypot(ball[0]-actor.x,ball[2]-actor.z);
  if(!eligible||ball[1]>2.4||gap>2.1){actor.closeBallLock=false;return null;}
  if(!actor.closeBallLock&&gap>1.25)return null;
  actor.closeBallLock=true;
  const lead=clamp(gap/Math.max(3,Math.hypot(velocity[0],velocity[2])),0,.10);
  const dx=ball[0]+velocity[0]*lead-actor.x,dz=ball[2]+velocity[2]*lead-actor.z;
  const length=Math.hypot(dx,dz);
  return {gap,direction:length>.01?[dx/length,dz/length]:[0,0]};
}

function guideDribble(dt,controlled,reversal){
  const spawn=player.spawnControl;
  if(spawn){
    spawn.elapsed+=dt;
    if(spawn.elapsed>=.78)spawn.auto=false;
    const expired=spawn.cutUntil!==undefined?spawn.elapsed>=spawn.cutUntil:
      spawn.elapsed>=.78&&spawn.commandAt!==undefined&&spawn.elapsed-spawn.commandAt>.16;
    if(!controlled||expired||player.grip>.12||reversal)player.spawnControl=null;
  }
  if(!controlled||reversal||player.ballRoll||player.grip>=.18)return;
  const heading=player.travelYaw??player.yaw;
  const front=[-Math.sin(heading),-Math.cos(heading)],side=[-front[1],front[0]];
  const offset=[ballPos[0]-player.x,ballPos[2]-player.z];
  const gap=Math.hypot(...offset);
  const lead=dot(offset,front),lateral=dot(offset,side);
  const relative=[ballVel[0]-player.vx,ballVel[2]-player.vz];
  const projected=Math.hypot(...offset.map((value,i)=>value+relative[i]*.20));
  const opening=!!player.spawnControl&&spawn.elapsed<.78&&spawn.cutUntil===undefined;
  const drifting=projected>.86&&(Math.abs(lateral)>.29||lead<.19||player.recovering);
  if((opening||drifting)&&gap<(opening?1.05:1.42)&&!player.retrievingBall){
    const lane=opening?spawn.lane:clamp(lateral*.55,-.20,.20);
    const leadTarget=opening?.54:mix(.52,.67,smooth((moveSpeed-1.8)/3.0));
    const target=front.map((value,i)=>value*leadTarget+side[i]*lane);
    ballPhysics.steadyDribble(ballPos,ballVel,offset,target,[player.vx,player.vz],opening,dt);
  }
}

function beginCharge(chip){
  player.spawnControl=null;
  chargeChip=chip;
  chargePlaced=placedShot;
  requestedVolley=!activeSetPiece()&&ballPos[1]>.38;
  chargeYaw=player.yaw;
  const vx=player.vx||0,vz=player.vz||0;
  const pace=Math.hypot(vx,vz);
  const heading=pace>.10?Math.atan2(-vx,-vz):chargeYaw;
  const axis=[-Math.sin(heading),-Math.cos(heading)];
  const side=[axis[1],-axis[0]];
  const lateral=(ballPos[0]-player.x)*side[0]+(ballPos[2]-player.z)*side[1];
  const maximum=playerPace(true);
  chargeRun={heading,axis,side,pace:pace>.10?Math.min(pace,maximum):0,lane:Math.sign(lateral)||1,width:clamp(lateral,-.30,.30)};
  chargeVelocity=axis.map(value=>value*chargeRun.pace);
  if(!activeSetPiece())aim.x=0;
  aim.y=.15;
  motion.lockCharge(player,heading);
}

function advanceCharge(dt){
  const {axis,side,heading,pace,lane}=chargeRun;
  const controlled=ballState==='controlled'&&!requestedVolley&&ballPos[1]<.30;
  const dx=ballPos[0]-player.x,dz=ballPos[2]-player.z;
  const lead=dx*axis[0]+dz*axis[1];
  const along=ballVel[0]*axis[0]+ballVel[2]*axis[1];
  const tired=activeDefense()?.exhausted?Math.min(pace,3.35):pace;
  const limit=tired*(1-.44*(player.grip||0));
  const desired=controlled?clamp(along+(lead-.36)*5.6+.38,0,limit):limit;
  const current=Math.hypot(...chargeVelocity);
  const speed=current+clamp(desired-current,-14*dt,7.5*dt);
  const limits=motion.limits;
  const x=clamp(player.x+axis[0]*speed*dt,-limits.side,limits.side);
  const z=clamp(player.z+axis[1]*speed*dt,playerFrontLimit(player),limits.back);
  const carry=dt>0?[(x-player.x)/dt,(z-player.z)/dt]:chargeVelocity;
  if(controlled){
    const widthGoal=lane*mix(.13,.27,1-smooth((lead+.09)/.32));
    const width=chargeRun.width=mix(chargeRun.width,widthGoal,1-Math.exp(-dt*8));
    const forward=.44+speed*.044;
    const targetX=clamp(x+axis[0]*forward+side[0]*width,-limits.side-.20,limits.side+.20);
    const target=[targetX,clamp(z+axis[1]*forward+side[1]*width,playerFrontLimit(player)-.25,limits.back+.19)];
    ballPhysics.guideCharge(ballPos,ballVel,target,carry,dt);
  }
  chargeVelocity=carry;
  [player.vx,player.vz]=carry;
  player.x=x;
  player.z=z;
  player.yaw=chargeYaw;
  player.travelYaw=heading;
  player.dribbleHeading=heading;
  moveSpeed=Math.hypot(...carry);
  player.dribbleIntent=moveSpeed>.12;
}

function finishFakeCut(touch){
  if(!fakeCut||fakeCut.touched||fakeCut.lateral&&!touch?.lateral)return;
  fakeCut.touched=true;
  if(fakeCut.lateral){
    fakeCut.touchedAt=fakeCut.elapsed;
    const ex=-Math.sin(fakeCut.heading),ez=-Math.cos(fakeCut.heading);
    const cutSpeed=Math.max(4.85,moveSpeed*1.28);
    ballVel[0]=ex*cutSpeed;
    ballVel[1]=Math.max(ballVel[1],0);
    ballVel[2]=ez*cutSpeed;
    ballAngular.splice(0,3,ez*16,0,-ex*16);
    player.vx=ex*3.85;
    player.vz=ez*3.85;
    player.yaw=fakeCut.heading;
    player.travelYaw=fakeCut.heading;
  }else if(fakeCut.direction){
    const cutSpeed=Math.max(4.2,moveSpeed*1.20);
    ballVel[0]=fakeCut.direction[0]*cutSpeed;
    ballVel[2]=fakeCut.direction[1]*cutSpeed;
  }
  fakeCut.remaining=fakeCut.lateral?(mocap?.clips?.fakeCut?.userEdited?.32:.28):.18;
}

function applyGroundTouch(hit,touch,dribble){
  const approach=touch.sole?hit.approach3D:hit.approach;
  const exit=touch.kind==='cut'?motion.cutExit(player,touch,ballPos):undefined;
  if(touch.kind==='trap')mocap.bodyImpact(player,ballVel,touch.foot,.25);
  ballPhysics.groundTouch(ballVel,ballAngular,{...hit,approach},{...dribble,kind:touch.kind,heading:touch.heading,exit});
  motion.acceptTouch(player,touch,exit);
  if(touch.kind==='cut'){
    finishFakeCut(touch);
    if(player.spawnControl?.cutUntil!==undefined)player.spawnControl=null;
  }
}

function regainControl(){
  if(firstTimeRequest)return;
  const held=firstTimeCharge;
  if(teamAI.involvement(player))return;
  teamAI.playerTouch();
  clearFirstTimeShot();
  if(ballPos[2]>footballGoalLineZ)hitGoalFrame=false;
  ballState='controlled';
  player.closeBallLock=false;
  ballAge=0;
  controlOffset=[ballPos[0]-player.x,ballPos[2]-player.z];
  dribbleClock=0;
  player.lostDribble=false;
  if(shot){shot.saveChecked=true;shot.goalChecked=true;shot.nearGoal=false}
  if(held){
    const direction=held.runDirection??(moveSpeed>.15?norm([player.vx??0,player.vz??0]):[-Math.sin(player.yaw),-Math.cos(player.yaw)]);
    const pace=held.runSpeed??Math.hypot(player.vx??0,player.vz??0);
    const heading=Math.atan2(-direction[0],-direction[1]);
    player.vx=direction[0]*pace;player.vz=direction[1]*pace;player.yaw=heading;player.travelYaw=heading;
    motion.reset(player);
    ballPhysics.receiveTouch(ballPos,ballVel,ballAngular,heading,pace,controlOffset);
    beginCharge(held.chip);
    charging=true;charge=held.power;chargePlaced=held.finesse;aim.x=held.aimX;
    player.aerialAction=null;
  }
}

function reversalContact(touch,rig,dt,phase){
  const index=touch.foot==='LeftFoot'?0:1;
  const current=rig.boots[index];
  const previous=player.bootsBefore?.[index]??current;
  const point=current.map((value,i)=>mix(previous[i],value,phase));
  const vertical=point[1]-ballPos[1];
  const horizontal=Math.hypot(point[0]-ballPos[0],point[2]-ballPos[2]);
  const engaged=!!touch.turn.anchor;
  if(ballPos[1]>.20||vertical<(engaged?.025:.04)||vertical>.28||horizontal>(engaged?.34:.26))return false;
  touch.turn.lastSoleContact=touch.turn.age;
  ballPhysics.rollUnderSole(ballPos,ballVel,ballAngular,point,touch.turn.pullAxis,touch.maxPace,dt);
  if(!engaged){
    motion.acceptTouch(player,{...touch,heading:touch.turn.target});
    finishFakeCut();
  }
  ballPhysics.step(ballPos,ballVel,ballAngular,dt);
  return true;
}

function aerialSurfaces(rig,actor,kind){
  if(kind==='knee')return rig.knees;
  if(kind==='head')return [rig.head];
  const fx=rig.chestForward?.[0]??-Math.sin(actor.yaw),fz=rig.chestForward?.[2]??-Math.cos(actor.yaw);
  const c=rig.chest;
  return [
    [c[0]+fx*.11,c[1]+.02,c[2]+fz*.11],
    [c[0]+fx*.08,c[1]+.15,c[2]+fz*.08],
    [c[0]+fx*.09,c[1]-.20,c[2]+fz*.09]
  ];
}
function aerialReception(actor,position=ballPos,arrivalTime=null){
  const height=position[1],dx=position[0]-actor.x,dz=position[2]-actor.z;
  const fromFront=-Math.sin(actor.yaw)*dx-Math.cos(actor.yaw)*dz>-.18;
  const directed=actor===player&&!!(player.receiveSprint&&player.receiveDirection||firstTimeCharge?.runDirection)&&height>.58&&height<1.70;
  const pace=Math.hypot(actor.vx??0,actor.vz??0);
  const frontGap=Math.hypot(dx,dz);
  const frontAlignment=frontGap>.1?(-Math.sin(actor.yaw)*dx-Math.cos(actor.yaw)*dz)/frontGap:1;
  const knee=fromFront&&frontAlignment>.55&&pace<3&&height>=.48&&height<1.02&&!directed;
  const head=height>1.72;
  const clip=directed?'receiveBall':knee?'kneeControl':head?'headerJump':'headerStand';
  const startT=directed?2.55:knee?0:head?.28:.42;
  const contact=directed?2.95:knee?.4:head?.92:.97;
  const end=directed?3.4:knee?mocap.clips[clip].duration:head?1.42:1.4;
  const defaultRate=directed?1.4:knee?1.35:1.4;
  const arrival=Number.isFinite(arrivalTime)?Math.max(.10,arrivalTime):null;
  const rate=arrival?clamp((contact-startT)/arrival,.62,2.1):defaultRate;
  const time=arrival?clamp(contact-arrival*rate,startT,contact-.03):Math.max(startT,contact-.22*rate);
  return {kind:knee?'knee':head?'head':'chest',clip,time,startT,contact,end,touched:false,
    yaw:actor.yaw,directed,rate,jumpHeight:head?clamp(height-mocap.shotGeometry('headerJump',.92,'RightFoot').head[1],0,.72):0};
}
function shotGroundFriction(){
  return !(ballState==='flight'&&shot?.cleanStrike);
}
function predictBallCrossing(plane=0,groundFriction=shotGroundFriction()){
  return ballPhysics.crossing(ballPos,ballVel,ballAngular,plane,groundFriction);
}
function rollBall(dt){
  ballPhysics.step(ballPos,ballVel,ballAngular,dt,ballState!=='controlled',shotGroundFriction());
}

function advancePlayerBall(dt,substep,steps){
  headerBallContact(dt,substep,steps);
  if(ballState==='teammate'){rollBall(dt);return;}

  const offset=[ballPos[0]-player.x,ballPos[2]-player.z];
  const gap=Math.hypot(...offset);
  if(ballState==='controlled'&&(gap>(fakeCut?2.25:1.55)||ballPos[1]>.70)){
    ballState='loose';
    ballAge=0;
    player.lostDribble=ballPos[1]<.30;
  }
  const incomingPass=ballState==='pass'?teamAI.receptionGuide(player):null;
  const receivingYaw=mocap.get(player).bodyYaw??player.yaw;
  const frontalReceive=!incomingPass||incomingPass.long||
    (offset[0]*-Math.sin(receivingYaw)+offset[1]*-Math.cos(receivingYaw))>.035;
  if(['loose','pass'].includes(ballState)&&frontalReceive&&teamAI.canReceive(player)&&!firstTimeRequest&&!terminal()&&!windup&&!charging&&ballAge>.08&&ballPos[1]<.36&&gap<.86){
    const heading=player.dribbleIntent?player.dribbleHeading:player.yaw;
    ballPhysics.receiveTouch(ballPos,ballVel,ballAngular,heading,Math.min(clock<player.receiveExitUntil?5.8:3.2,moveSpeed),offset);
    regainControl();
  }
  if(['loose','pass'].includes(ballState)&&!firstTimeRequest&&!terminal()&&!windup&&!charging&&ballPos[1]>.45&&ballPos[1]<2.4&&ballVel[1]<2.8&&gap<1.25){
    if(!player.aerialAction&&!player.aerialFlight?.airborne){
      player.aerialAction=aerialReception(player,ballPos,.10);
      player.aerialAction.time=player.aerialAction.contact-.06;
      player.aerialAction.elapsed=0;
    }
    if(player.aerialAction&&!player.aerialAction.touched){
      if(!player.aerialAction.flight?.launched&&!player.aerialAction.directed&&player.receiveSprint&&player.receiveDirection&&ballPos[1]>.58&&ballPos[1]<1.70){
        player.aerialAction=aerialReception(player,ballPos,.10);
        player.aerialAction.time=player.aerialAction.contact-.06;
      }
      const aa=player.aerialAction,rig=mocap.get(player);
      const surfaces=aerialSurfaces(rig,player,aa.kind);
      if(aa.time>=aa.contact-.34&&aa.time<=aa.contact+.42){
        const exitDirection=firstTimeCharge?.runDirection??player.receiveDirection;
        const heading=exitDirection?Math.atan2(-exitDirection[0],-exitDirection[1]):moveSpeed>.4?Math.atan2(-player.vx,-player.vz):aa.yaw;
        const incomingBodyVelocity=[...ballVel];
        const touched=surfaces.some(point=>ballPhysics.aerialControl(ballPos,ballVel,ballAngular,
          {point,dt,heading,pace:firstTimeCharge?.runSpeed??moveSpeed,actor:player,targetPace:exitDirection?playerPace(player.receiveSprint):moveSpeed,kind:aa.directed?'directed':aa.kind,normal:rig.chestForward,center:rig.chest}));
        if(touched){
          if(teamAI.involvement(player))return;
          mocap.bodyImpact(player,incomingBodyVelocity,aa.kind,.4);
          aa.touched=true;ballState='loose';
          player.receiveExitUntil=aa.directed?clock+.9:0;
          sound(165,.05,'triangle',.07);
        }
      }
    }
  }
  if(player.lostDribble&&(gap>2.25||ballPos[1]>.33||terminal()))player.lostDribble=false;
  const rig=mocap.get(player);
  const volumes=rig.bootVolumes;
  const shooting=windup&&!windup.header&&!windup.fired&&
    windup.t>=Math.max(windup.setup,windup.contact-(windup.firstTime?.06:.052))&&
    windup.t<=windup.contact+(windup.firstTime?.13:.085);
  if(terminal()||((ballState==='flight'||ballState==='pass')&&!shooting)||!volumes||ballPos[1]>2.10||gap>2.05){
    rollBall(dt);
    return;
  }
  const previous=player.bootVolumesBefore??volumes;
  const pending=player.touchPending;
  const controlled=ballState==='controlled';
  if(controlled&&(fakeCut?.lateral||player.ballRoll)){
    if(player.ballRoll)motion.ballRollContact(player,ballPos,ballVel,ballAngular,ballPhysics,dt);
    rollBall(dt);
    return;
  }
  const recovering=ballState==='loose'&&player.lostDribble&&player.retrievingBall;
  const receiving=ballState==='loose'&&player.receiving&&!windup&&!charging&&ballPos[1]<.29;
  const beforePhase=substep/steps,afterPhase=(substep+1)/steps;
  const reversing=pending?.kind==='soleTurn';
  if(controlled&&!windup&&reversing&&reversalContact(pending,rig,dt,afterPhase))return;
  let touch=null;
  if(!windup&&pending&&!pending.used&&!reversing){
    const trapping=pending.kind==='trap'&&(controlled||recovering);
    const carrying=controlled&&pending.kind!=='receive'&&!player.retrievingBall&&(!player.brakeOnRelease||pending.kind!=='carry');
    if(trapping||carrying||receiving&&pending.kind==='receive')touch=pending;
  }

  const surfaces=[];
  let earliest=null;
  for(const [foot,parts] of volumes.entries()){
    const name=foot===0?'LeftFoot':'RightFoot';
    const action=shooting&&windup.foot===name?'shot':touch?.foot===name?touch.kind:receiving?'receive':null;
    for(const [part,volume] of parts.entries()){
      const old=previous[foot]?.[part]??volume;
      const center=phase=>old.center.map((value,i)=>mix(value,volume.center[i],phase));
      const from={center:center(beforePhase),radius:volume.radius};
      const to={center:center(afterPhase),radius:volume.radius};
      surfaces.push(to);
      let margin=0;
      if(action==='cut')margin=touch.lateral?.036:player.dribbleSprint?.018:.024;
      else if(action==='shot')margin=windup.firstTime?.045:.012;
      else if(action==='receive'&&touch?.foot===name)margin=.027;
      else if(action==='carry')margin=.010;
      const hit=ballPhysics.sweepBoot(from,to,ballPos,ballVel,dt,margin);
      if(hit&&(hit.approach3D>.10||action==='shot'&&hit.overlap)&&(!earliest||hit.time<earliest.hit.time||
        hit.time===earliest.hit.time&&action&&!earliest.action)){
        earliest={hit,action,name,boot:{center:center(mix(beforePhase,afterPhase,hit.time)),radius:volume.radius}};
      }
    }
  }
  let elapsed=0;
  if(earliest){
    const {hit,boot,action,name}=earliest;
    elapsed=hit.time*dt;
    if(elapsed>0)rollBall(elapsed);
    ballPhysics.separateBoot(ballPos,ballVel,boot);
    const dribble={pace:moveSpeed,offset,acceleration:player.dribbleAcceleration,position:ballPos,
      wishHeading:player.dribbleIntent?player.dribbleHeading:undefined,sprint:player.dribbleSprint};
    if(action==='shot'){
      launchShot(windup);
    }else if(action==='receive'||recovering&&!action&&ballPos[1]<.22&&Math.hypot(ballVel[0]-player.vx,ballVel[2]-player.vz)<5.3){
      const heading=recovering?player.yaw:player.dribbleHeading;
      ballPhysics.receiveTouch(ballPos,ballVel,ballAngular,heading,recovering?Math.min(2.5,moveSpeed):moveSpeed,offset);
      motion.acceptTouch(player,{foot:name,kind:'receive',heading});
      regainControl();
    }else if(action&&(touch.sole||touch.lateral||hit.approach>(action==='cut'?.095:.16))){
      applyGroundTouch(hit,touch,dribble);
      if(recovering)regainControl();
    }else if(!windup){
      const carry=ballState==='controlled'?motion.incidentalTouch(player,name,hit):null;
      if(carry){
        applyGroundTouch(hit,carry,dribble);
      }else{
        if(shot)shot.cleanStrike=false;
        ballPhysics.deflectBoot(ballVel,hit,moveSpeed,ballState==='controlled');
      }
    }
  }
  if(elapsed<dt)rollBall(dt-elapsed);
  for(let pass=0;pass<3;pass++){
    let separated=false;
    for(const surface of surfaces)if(ballPhysics.separateBoot(ballPos,ballVel,surface))separated=true;
    if(!separated)return;
  }
  ballPhysics.freeBallBetweenBoots(ballPos,ballVel,surfaces);
}
function sweptContact(old,next,center,radius){let delta=sub(next,old),offset=sub(old,center),a=dot(delta,delta),c=dot(offset,offset)-radius*radius;if(a<1e-12){if(c>0)return null;let normal=Math.hypot(...offset)>1e-6?norm(offset):[0,1,0];return{time:0,point:[...old],normal}}let b=dot(offset,delta),disc=b*b-a*c;if(disc<0)return null;let time=c<=0?0:(-b-Math.sqrt(disc))/a;if(time<0||time>1)return null;let point=old.map((v,i)=>v+delta[i]*time),diff=sub(point,center),normal=Math.hypot(...diff)>1e-6?norm(diff):[0,1,0];return{time,point,normal}}
function wallContact(old){
  if(activeSetPiece()?.kind!=='freeKick'||!shot||shot.stopped||ballState!=='flight')return;
  let contact=null;
  const defense=activeDefense();
  for(const actor of defense.defenders){
    const s=mocap.get(actor);
    const guarding=actor===defense.wallGuard;
    const body=[[s.chest,guarding?.22:.27],[s.head,.16],...s.knees.map(point=>[point,guarding?.155:.12]),
      ...s.ankles.map(point=>[point,guarding?.13:.092])];
    if(guarding)body.push([mul(add(s.chest,s.knees[0]),.5),.19]);
    else if(actor.role==='BAR')body.push(...s.hands.map(point=>[point,.105]));
    for(const [center,r] of body){
      if(!center)continue;
      const hit=sweptContact(old,ballPos,center,r+.11);
      if(hit&&dot(ballVel,hit.normal)<0&&(!contact||hit.time<contact.time))contact={...hit,actor};
    }
  }
  if(!contact)return;
  deflectFromDefender(contact,.36,.16);
  const inWall=contact.actor.role==='BAR';
  announce(inWall?'NA BARREIRA':'DESVIO!',inWall?'A cobrança bateu na barreira.':'A bola desviou em um defensor.');
  sound(160,.13,'triangle',.12);
}

function deflectFromDefender(contact,restitution,friction){
  if(shot)shot.cleanStrike=false;
  if(contact.actor)mocap.bodyImpact(contact.actor,ballVel,contact.part??'body',.7);
  ballPos=add(contact.point,mul(contact.normal,.005));
  ballPhysics.reflect(ballVel,contact.normal,restitution,friction);
  for(let i=0;i<3;i++)ballAngular[i]*=.69;
  ballState=ballVel[2]<-.25?'flight':'loose';
  ballAge=0;
  if(!shot){ballState='loose';if(contact.actor)contact.actor.passBlockUntil=clock+.16;return;}
  shot.stopped=true;
  shot.deflectedBy=contact.actor;
  shot.deflectedAt=clock;
  shot.planned=false;
  shot.nearGoal=false;
  shot.saveChecked=false;
  shot.goalChecked=false;
  dive=null;
}

function clearDefenderHeader(actor){
  const side=Math.sign(ballPos[0])||Math.sign(actor.x)||1;
  const direction=norm([side*.55,.22,1]);
  const speed=clamp(Math.hypot(...ballVel)*.72+9,16,23);
  ballVel=mul(direction,speed);ballAngular.splice(0,3,-6,side*2,0);
  ballState='loose';ballAge=0;actor.passBlockUntil=clock+.28;
  const defense=activeDefense();
  if(defense){defense.receptionClaim=null;defense.clearanceUntil=clock+.5;}
  if(shot){
    shot.stopped=true;
    shot.deflectedBy=actor;
    shot.deflectedAt=clock;
    shot.planned=false;
    shot.nearGoal=false;
    shot.saveChecked=true;
    shot.goalChecked=true;
    dive=null;
  }
  clearFirstTimeShot();throughCharge=null;
  announce('TIROU DE CABEÇA!','O zagueiro afastou a bola pelo alto.');
  sound(135,.12,'triangle',.1);
}

function receiveByDefender(actor,dt){
  if(shot&&!shot.stopped||terminal()||activeSetPiece()||!['pass','loose'].includes(ballState)||
    actor.action||clock<(actor.passBlockUntil??0))return false;
  const dx=ballPos[0]-actor.x,dz=ballPos[2]-actor.z,gap=Math.hypot(dx,dz);
  if(gap>1.2||ballPos[1]>2.65)return false;
  const rig=mocap.get(actor);
  if(ballPos[1]>.42){
    let aa=actor.aerialReceive;
    if(!aa&&ballVel[1]<=2.6&&ballPos[1]<1.75){
      aa=aerialReception(actor,ballPos,.10);
      aa.time=aa.contact-.06;aa.elapsed=0;
      actor.aerialReceive=aa;
    }
    if(!aa||aa.touched||aa.time<aa.contact-.34||aa.time>aa.contact+.42||ballVel[1]>2.6)return false;
    if(aa.kind==='head'){
      if(!ballPhysics.bootContact(actor.headerBefore??rig.head,rig.head,ballPos,ballVel,dt,.16))return false;
      aa.touched=true;clearDefenderHeader(actor);return true;
    }
    const points=aerialSurfaces(rig,actor,aa.kind);
    const incomingBodyVelocity=[...ballVel];
    const hit=points.some(point=>ballPhysics.aerialControl(ballPos,ballVel,ballAngular,
      {point,dt,heading:actor.yaw,pace:0,kind:aa.kind,normal:rig.chestForward,center:rig.chest}));
    if(!hit)return false;
    mocap.bodyImpact(actor,incomingBodyVelocity,aa.kind,.4);
    aa.touched=true;
    clearFirstTimeShot();throughCharge=null;ballState='loose';ballAge=0;
    actor.passBlockUntil=clock+.12;
    activeDefense().receptionClaim={actor,until:clock+.85};
    return true;
  }
  if(actor.aerialFlight?.airborne)return false;
  const bootHit=rig.boots.some(point=>ballPhysics.bootContact(point,point,ballPos,ballVel,dt,.14));
  if(!bootHit&&!(activeDefense().receptionClaim?.actor===actor&&gap<.65))return false;
  const foot=dx*Math.cos(actor.yaw)-dz*Math.sin(actor.yaw)>=0?'RightFoot':'LeftFoot';
  const tackle={foot,age:0,slide:false};
  actor.aerialReceive=null;actor.aerialBlock=null;actor.blockTarget=null;
  captureByDefender(actor,tackle);actor.action=tackle.possession;
  activeDefense().receptionClaim=null;throughCharge=null;
  return true;
}

function defenderShotContact(old,from,to,dt,beforeLine){
  const passing=!shot&&['pass','teammate','loose'].includes(ballState);
  if(activeSetPiece()||!passing&&(!shot||!['flight','loose'].includes(ballState)||ballVel[2]>=-.05))return;
  let contact=null;
  for(const actor of activeDefense()?.defenders??[]){
    if(shot?.deflectedBy===actor&&clock-shot.deflectedAt<.14||passing&&clock<(actor.passBlockUntil??0))continue;
    const rig=mocap.get(actor);
    const clear=actor.action;
    const kicking=clear?.quick&&!clear.fired&&Math.abs(clear.age-clear.impact)<.065;
    if(kicking){
      const foot=clear.foot==='LeftFoot'?0:1;
      for(const [part,boot] of rig.bootVolumes[foot].entries()){
        const prior=clear.bootsBefore?.[foot]?.[part]??boot;
        const position=phase=>boot.center.map((value,i)=>mix(prior.center[i],value,phase));
        const hit=ballPhysics.sweepBoot({center:position(from),radius:boot.radius},{center:position(to),radius:boot.radius},old,ballVel,dt,.012);
        if(hit&&hit.time<beforeLine&&(!contact||hit.time<contact.time))contact={time:hit.time,clear};
      }
    }
    const body=[[rig.chest,.228],[rig.head,.125,'head'],...rig.bootVolumes.flat().map(boot=>[boot.center,boot.radius]),
      ...rig.ankles.flatMap((point,index)=>kicking&&index===(clear.foot==='LeftFoot'?0:1)?[]:[[point,.098]]),
      ...rig.knees.map(point=>[point,.122])];
    for(const [center,radius,part] of body){
      if(!center)continue;
      const hit=sweptContact(old,ballPos,center,radius+.11);
      if(hit&&hit.time<beforeLine&&dot(ballVel,hit.normal)<0&&(!contact||hit.time<contact.time))contact={...hit,actor,part};
    }
  }
  if(!contact)return;
  if(contact.clear){
    const impact=old.map((value,i)=>mix(value,ballPos[i],contact.time));
    if(impact[2]>footballGoalLineZ){
      ballPos=impact;
      strikeClearance(contact.clear);
      rollBall(dt*(1-contact.time));
      return true;
    }
    return;
  }
  deflectFromDefender(contact,.47,.13);
  if(contact.part==='head'){
    if(contact.actor.aerialReceive)contact.actor.aerialReceive.touched=true;
    else if(!contact.actor.aerialBlock)contact.actor.aerialBlock={age:.25,height:0};
    clearDefenderHeader(contact.actor);return true;
  }
  announce('DESVIO!',passing?'O zagueiro interceptou o passe.':'O zagueiro interceptou o chute.');
  sound(155,.12,'triangle',.09);
}

const keeperContactRadii=[.145,.145,.122,.122,.133,.133,.225,.142];
function keeperContact(old,from,to,beforeLine){
  const delivery=!shot&&['pass','teammate','loose'].includes(ballState);
  if(!delivery&&(!shot||shot.saveChecked||ballVel[2]>=0||!['flight','loose'].includes(ballState)))return;
  const rig=mocap.get(keeper);
  if(!rig.contacts)return;
  const previous=keeper.previousContacts??rig.contacts;
  const groundCatch=dive?.type==='groundCatch';
  let best=null;
  const colliders=rig.contacts.map((point,index)=>({point,index,previous:previous[index],radius:keeperContactRadii[index]}));
  if(groundCatch&&rig.hands.every(hand=>hand[1]<.41)&&Math.hypot(...sub(rig.hands[0],rig.hands[1]))<.48){
    colliders.unshift({index:-1,point:mul(add(rig.hands[0],rig.hands[1]),.5),
      previous:mul(add(previous[0],previous[1]),.5),radius:.125});
  }
  for(const {point:center,index:i,previous:centerPrevious,radius} of colliders){
    const centerBefore=center.map((value,axis)=>mix(centerPrevious[axis],value,from));
    const centerAfter=center.map((value,axis)=>mix(centerPrevious[axis],value,to));
    const relativeBefore=sub(old,centerBefore),relativeAfter=sub(ballPos,centerAfter);
    const hit=sweptContact(relativeBefore,relativeAfter,[0,0,0],radius+.11);
    if(hit&&hit.time<beforeLine&&dot(sub(relativeAfter,relativeBefore),hit.normal)<0&&(!best||hit.time<best.time))best={...hit,index:i};
  }
  // Exact 3D rectangular OBB check aligned with goalkeeper skeleton
  if(!best&&rig.hitboxes?.length){
    for(const box of rig.hitboxes){
      const obbHit=mocap.sphereHitsBox(ballPos,.115,box);
      if(obbHit&&dot(ballVel,obbHit.normal)<0){
        best={time:1,normal:obbHit.normal,index:box.keeperIndex??6};
        break;
      }
    }
  }
  if(!best)return;
  mocap.bodyImpact(keeper,ballVel,best.index===0?'LeftHand':best.index===1?'RightHand':best.index===7?'head':'body',.75);
  ballPos=old.map((v,i)=>mix(v,ballPos[i],best.time)+best.normal[i]*.002);
  if(shot){shot.saveChecked=true;shot.hit=true;}
  const hand=best.index<2, feet=best.index>=2&&best.index<6, incoming=Math.hypot(...ballVel);
  const receiving=['catch','scoop','jump','groundCatch'].includes(dive?.type)||!!keeper.passClaim?.reaching||!!dive?.smother;
  const handCenter=mul(add(rig.hands[0],rig.hands[1]),.5);
  const inCradle=groundCatch&&Math.abs(handCenter[0]-ballPos[0])<.265&&
    Math.abs(handCenter[1]-ballPos[1])<.19&&Math.hypot(...sub(rig.hands[0],rig.hands[1]))<.46;
  const bothInReach=best.index===-1||hand&&(inCradle||Math.hypot(...sub(rig.hands[1-best.index],ballPos))<(groundCatch?.37:.50));
  const hold=receiving&&bothInReach&&incoming<(groundCatch?25:26);
  if(hold)holdKeeperBall(rig);
  else{
    if(shot)shot.cleanStrike=false;
    ballPhysics.reflect(ballVel,best.normal,feet?.42:.36,.15);
    if(hand||ballVel[2]<0){
      const side=Math.sign(ballPos[0]-keeper.x)||dive?.side||1;
      const height=dive?.type==='high'?.43:.16;
      const direction=norm(hand?[side*.85,height,1]:[best.normal[0],Math.max(.05,best.normal[1]),Math.max(.45,Math.abs(best.normal[2]))]);
      ballVel=mul(direction,hand?clamp(incoming*.42,3,12):clamp(incoming*.30,2,9));
    }
    for(let i=0;i<3;i++)ballAngular[i]*=.65;
    ballState='loose';
    ballAge=0;
  }
  resultShot('save',hold?'Encaixe seguro.':hand?'Espalmou! Busque o rebote.':'Bola viva após o bloqueio.');
}
function holdKeeperBall(rig){
  clearFirstTimeShot();
  throughCharge=null;
  windup=null;
  charging=false;
  charge=0;
  requestedVolley=false;
  player.touchPending=null;
  ballVel=[0,0,0];
  ballAngular.fill(0);
  if(dive)dive.heldOffset=sub(ballPos,mul(add(rig.hands[0],rig.hands[1]),.5));
  ballState='held';
}

function endLineCrossingFraction(beforeZ,afterZ){
  if(beforeZ<=footballGoalLineZ)return 0;
  if(afterZ>footballGoalLineZ)return null;
  return (beforeZ-footballGoalLineZ)/(beforeZ-afterZ);
}

function finishOverhit(){
  const ratingDelta=!activeSetPiece()&&!shot?.deflectedBy&&!shot?.hit?ratePlay('wideShot',-.3):0;
  resultShot('out','Força máxima. Você isolou a bola.',nearMissHold,null,ratingDelta);
}

function finishEndLine(old,fraction){
  const x=mix(old[0],ballPos[0],fraction),y=mix(old[1],ballPos[1],fraction);
  const carried=ballState==='controlled'||ballState==='loose'&&player.lostDribble;
  const following=carried&&player.dribbleIntent&&player.vz<-.20&&player.z>-.34;
  const runout=following?{vx:player.vx,vz:player.vz,remaining:Math.min(.85,(player.z+.34)/-player.vz)}:null;
  if(Math.abs(x)<=3.55&&y<=2.33){
    if(ballState==='teammate'||!shot&&teamAI.credit().teamScorer)shot=teamAI.credit();
    else if(carried||shot?.goalChecked)shot=null;
    resultShot('goal',carried?'Entrou com bola e tudo!':ballAge<1?'Boa finalização!':'Valeu a insistência!',undefined,runout);
  }else if(hitGoalFrame){
    resultShot('postOut','A bola bateu na trave e saiu.',postResultHold);
  }else{
    let ratingDelta=0;
    if(shot&&!shot.teamScorer&&!shot.ratingHandled){
      shot.ratingHandled=true;
      const margin=Math.hypot(Math.max(0,Math.abs(x)-3.55),Math.max(0,y-2.33));
      if(margin<=.75&&!shot.penalty)ratingDelta=ratePlay('nearMiss',.2);
      else if(margin>=1.55&&!activeSetPiece()&&!shot.deflectedBy&&!shot.hit)ratingDelta=ratePlay('wideShot',-.3);
    }
    resultShot('out','A bola saiu pela linha de fundo.',nearMissHold,runout,ratingDelta);
  }
}

function advanceEndLineRunout(dt){
  const runout=result?.runout;
  if(!runout)return;
  const advance=Math.min(dt,runout.remaining);
  const x=clamp(player.x+runout.vx*advance,-motion.limits.side,motion.limits.side);
  player.vx=(x-player.x)/dt;
  player.vz=runout.vz*advance/dt;
  player.x=x;
  player.z+=runout.vz*advance;
  moveSpeed=Math.hypot(player.vx,player.vz);
  runout.remaining-=advance;
  if(runout.remaining<=0)result.runout=null;
}

function physics(dt){
  ballAge+=dt;
  postCooldown=Math.max(0,postCooldown-dt);
  touchCooldown=Math.max(0,touchCooldown-dt);
  goalNet.step(dt);
  if(ballState==='none'||ballState==='defender')return;
  if(shot)shot.t+=dt;
  if(!terminal()&&ballState==='flight'&&shot&&!shot.overhit&&!shot.planned&&!dive&&shot.t>shot.react)chooseDive();
  if(ballState==='held'){
    const hands=mocap?mocap.get(keeper).hands:[[keeper.x,1,keeper.z],[keeper.x,1,keeper.z]];
    const center=mul(add(hands[0],hands[1]),.5),offset=dive?.heldOffset??[0,0,0];
    ballPos=add(center,offset);
    if(dive?.heldOffset)dive.heldOffset=mul(offset,Math.exp(-dt*28));
    if(result){
      result.t+=dt;
      if(trainingDefense&&!activeShootout()&&result.t>3.5)resetTraining();
    }
    return;
  }

  const steps=Math.max(1,Math.ceil(dt/(1/240))),h=dt/steps;
  for(let substep=0;substep<steps;substep++){
    const old=[...ballPos];
    teamAI.touch(h,substep/steps,(substep+1)/steps);
    advancePlayerBall(h,substep,steps);
    if(!terminal()&&(!shot||shot.stopped)&&['pass','loose'].includes(ballState)){
      for(const actor of activeDefense()?.defenders??[])if(receiveByDefender(actor,h))break;
    }
    if(ballState==='defender')break;
    for(let i=0;i<3;i++)ballRotation[i]+=ballAngular[i]*h;
    ballSpin+=h*Math.hypot(...ballVel)/.11;
    if(!terminal()&&shot?.overhit){
      if(endLineCrossingFraction(old[2],ballPos[2])!==null)finishOverhit();
    }else if(!terminal()){
      if(ballPhysics.goalFrame(old,ballPos,ballVel,ballAngular)){
        ballState='loose';
        hitGoalFrame=true;
        if(shot)shot.cleanStrike=false;
        if(postCooldown<=0){
          resultShot('post');
          postCooldown=.18;
        }
        if(shot)shot.saveChecked=true;
      }
      if(ballPos[2]>footballGoalLineZ&&!windup&&!player.receiving&&ballState==='loose'&&ballPos[1]<.30&&
        Math.hypot(ballVel[0]-player.vx,ballVel[2]-player.vz)<5.5&&
        mocap.get(player).boots.some(p=>Math.hypot(p[0]-ballPos[0],p[1]-ballPos[1],p[2]-ballPos[2])<.27))regainControl();

      wallContact(old);
      const beforeLine=endLineCrossingFraction(old[2],ballPos[2])??Infinity;
      if(!defenderShotContact(old,substep/steps,(substep+1)/steps,h,beforeLine)){
        keeperContact(old,substep/steps,(substep+1)/steps,endLineCrossingFraction(old[2],ballPos[2])??Infinity);
      }
      if(ballState==='held')break;

      const crossing=endLineCrossingFraction(old[2],ballPos[2]);
      if(crossing!==null)finishEndLine(old,crossing);
      else finishKeeperSmother();
      if(ballState==='held')break;
    }
    if(ballState==='goal')goalNet.contain(ballPos,ballVel);
  }

  if(result){
    result.t+=dt;
    if(trainingDefense&&!activeShootout()&&result.t>=(result.hold??(result.type==='goal'?1.15:5.5))&&!matchAudio.cheering())resetTraining();
    return;
  }
  const {side,back}=motion.limits;
  const out=Math.abs(ballPos[0])>side+.11||ballPos[2]>back+.11;
  if(shot?.overhit&&(out||ballPos[1]<=.13&&Math.hypot(...ballVel)<.35)){finishOverhit();return;}
  if(hitGoalFrame){
    const deadPiece=activeSetPiece()&&(ballAge>7||Math.hypot(...ballVel)<.35);
    if(out||deadPiece){
      resultShot('postOut',out?'A bola bateu na trave e saiu.':'A cobrança terminou.',postResultHold);
      return;
    }
  }
  if(!trainingDefense||activeShootout())return;
  if(out)resultShot('out','A bola saiu dos limites do treino.',nearMissHold);
  else if(trainingDefense.piece&&shot){
    if(shot.stopped&&!hitGoalFrame&&(ballVel[2]>=-.25||ballAge>5))result={type:'miss',t:0};
    else if(ballAge>7&&!shotInProgress())resultShot('miss','A cobrança terminou.');
  }else if(ballState!=='controlled'&&ballAge>35&&!shotInProgress())resetTraining();
}
function updatePlayerMocap(dt){if(!mocap)return;let current=mocap.get(player);player.headBefore=current.head?[...current.head]:null;player.bootVolumesBefore=player.skipBootSweep?null:current.bootVolumes;player.bootsBefore=player.skipBootSweep?null:current.boots;player.skipBootSweep=false;
if(player.foulTrip){
  player.foulTrip.elapsed+=dt;
  poseFall(player.foulTrip,dt);
  return;
}
if(player.tackleReact&&mocap.clips[player.tackleReact.clip]){
  const tr=player.tackleReact,clip=mocap.clips[tr.clip];
  tr.elapsed+=dt;
  tr.time=Math.min(clip.duration,tr.time+dt*1.12);
  const drift=.22*(1-Math.exp(-tr.elapsed*4.2));
  [player.x,player.z]=tr.start.map((value,i)=>value+tr.velocity[i]*drift);
  mocap.update(player,{clip:tr.clip,poseName:'tackleReact',time:tr.time,loop:false,fade:.30,mirror:tr.mirror,authoredGround:true,grounded:true,bodyYaw:tr.yaw},dt);
  if(tr.time>=clip.duration){
    player.tackleReact=null;
    motion.locomotion(player,{dt:0,ball:ballPos,velocity:ballVel,controlled:false,suspended:true});
    player.contactRecovery={elapsed:0,duration:.72,side:tr.mirror?-1:1};
  }
  return;
}
if(!player.aerialAction&&!windup&&player.aerialFlight?.airborne){
  const f=player.aerialFlight,a={clip:f.clip,kind:f.kind,flight:f,contact:f.contact};
  const time=f.origin+f.age*f.rate;
  mocap.update(player,motion.aerialPose(player,a,{time,contact:a.contact??time,start:f.origin,
    rate:f.rate,height:0,end:time+.01,dt,yaw:f.yaw}),dt);
  return;
}
if(!player.aerialAction&&!firstTimeRequest&&!windup&&!charging&&!terminal()&&['pass','loose'].includes(ballState)&&ballPos[1]>.45){
  const intercept=teamAI.interception(player,{pace:Math.max(4.8,moveSpeed),height:2.6});
  const gap=Math.hypot(intercept.x-player.x,intercept.z-player.z);
  if(intercept.reachable&&intercept.time<=.58&&intercept.y>.45&&intercept.y<2.65&&gap<3.2){
    const aa=aerialReception(player,[intercept.x,intercept.y,intercept.z],intercept.time);
    aa.fromYaw=player.yaw;aa.elapsed=0;
    const point=teamAI.receptionGuide(player)?.point??ballPos;
    aa.yaw=Math.atan2(player.x-point[0],player.z-point[2]);
    player.aerialAction=aa;
  }
}
if(player.aerialAction&&!windup&&(!terminal()||player.aerialAction.flight&&!player.aerialAction.flight.done)&&mocap.clips[player.aerialAction.clip]){
  const aa=player.aerialAction,clip=mocap.clips[aa.clip];
  aa.time+=dt*(aa.rate??1.4);
  aa.elapsed=(aa.elapsed??0)+dt;
  const face=aa.fromYaw===undefined?aa.yaw:aa.fromYaw+signedTurn(aa.yaw-aa.fromYaw)*smooth(aa.elapsed/.18);
  const base=player.aerialFlight?.airborne?null:motion.locomotion(player,{dt,ball:ballPos,velocity:ballVel,
    controlled:false,recoverable:false,ankles:current.ankles,suspended:false});
  let pose=motion.aerialPose(player,aa,{time:Math.min(clip.duration,aa.time),contact:aa.contact,
    start:aa.startT??.28,rate:aa.rate??1.4,height:aa.jumpHeight??0,end:aa.end,dt,base,yaw:face});
  pose=motion.chestReception(player,aa,pose,ballPos,ballVel,dt);
  mocap.update(player,pose,dt);
  if(aa.flight.done){
    player.aerialAction=null;
  }
  return;
}
let p=motion.locomotion(player,{dt,ball:ballPos,velocity:ballVel,controlled:ballState==='controlled'&&!windup&&(!charging||!requestedVolley),recoverable:ballState==='loose'&&player.lostDribble,ankles:current.ankles,suspended:!!(windup&&!windup.header&&windup.t>=windup.setup),lateralCut:fakeCut?.lateral?fakeCut:null});

if(!terminal())player.terminalReaction=null;
if(terminal()&&!result?.runout&&(!windup?.flight||windup.flight.done)){
  windup=null;
  moveSpeed=player.vx=player.vz=0;
  const isGoal=ballState==='goal'||result?.type==='goal';
  const isFoul=ballState==='foul'||result?.type==='foul';
  if(isGoal&&result?.celebration&&mocap.clips[result.celebration.clip]){
    player.terminalReaction=null;
    const cel=result.celebration,cClip=mocap.clips[cel.clip];
    player.yaw+=signedTurn(cel.yaw-player.yaw)*Math.min(1,dt*8);
    p={clip:cel.clip,poseName:'goalCelebration',time:(result.t??0)%Math.max(.1,cClip.duration),
      loop:true,fade:.24,grounded:true,mirror:cel.mirror,bodyYaw:player.yaw};
  }else if(!isGoal&&!isFoul&&(mocap.clips.sadWalk||mocap.clips.sadIdle)){
    if(!player.terminalReaction){
      const sadPool=['sadWalk','sadIdle'].filter(k=>mocap.clips[k]);
      const clip=sadPool[Math.floor(Math.random()*sadPool.length)];
      player.terminalReaction={clip,t:0};
    }
    const r=player.terminalReaction;
    r.t+=dt;
    const sClip=mocap.clips[r.clip];
    if(r.clip==='sadWalk'){
      player.x=clamp(player.x-Math.sin(player.yaw)*dt*.46,-32,32);
      player.z=clamp(player.z-Math.cos(player.yaw)*dt*.46,.4,motion.limits.back);
    }
    p={clip:r.clip,poseName:'missReaction',time:r.t%Math.max(.1,sClip.duration-.04),
      loop:true,fade:.22,grounded:true,bodyYaw:player.yaw};
  }else{
    player.terminalReaction=null;
    const lift=isGoal?smooth((result?.t??0)/.61):0;
    const front=[-Math.sin(player.yaw),-Math.cos(player.yaw)];
    p={clip:'idle',poseName:'finishRecovery',time:0,grounded:true,fade:.19,
      pelvis:{height:.925,lateral:0,forward:.01,rotation:[-.045*lift,0,0]},
      ankleTargets:[1,-1].map((side,i)=>({foot:i?'RightFoot':'LeftFoot',point:[player.x+front[1]*side*.15,.111,player.z-front[0]*side*.15],
        yaw:player.yaw,pitch:0,kneeBend:.28,groundWeight:1,legExtension:0})),
      offsets:{LeftArm:[-.75*lift,0,-.78*lift],RightArm:[-.76*lift,0,.81*lift],
        LeftForeArm:[-.47*lift,0,0],RightForeArm:[-.55*lift,0,0],Neck:[-.045*lift,0,0]}};
  }
}else if(player.watchBall&&moveSpeed>.18&&!windup){
  const relative=signedTurn(Math.atan2(-player.vx,-player.vz)-player.yaw);
  const backward=Math.abs(relative)>Math.PI/2;
  const diagonal=Math.abs(Math.sin(relative))>.32;
  const desiredClip=diagonal?(backward?(relative<0?'jogBackwardLeft':'jogBackwardRight'):
    (relative<0?'jogForwardLeft':'jogForwardRight')):(backward?'backward':'jog');
  const clip=mocap.clips[desiredClip]?desiredClip:backward?'backward':'jog';
  const cycle=mocap.clips[clip];
  player.watchPhase=(player.watchPhase??0)+dt*clamp(moveSpeed/3.2,.55,1.8);
  p={clip,time:player.watchPhase%cycle.duration,loop:true,grounded:true,fade:.16,bodyYaw:player.yaw};
}else if(windup){
  const w=windup;
  if(w.t>=w.setup){
    const time=(w.clipStart||0)+(w.t-w.setup)*w.rate;
    let extraY=0,aerial=false;
    if(w.header){
      const end=(w.clipStart||0)+(w.end-w.setup)*w.rate;
      p=motion.aerialPose(player,w,{time,contact:(w.clipStart||0)+(w.contact-w.setup)*w.rate,
        start:w.clipStart||0,rate:w.rate,height:w.jumpHeight??0,end,dt,base:player.aerialFlight?.airborne?null:p,yaw:w.targetYaw});
      extraY=p.extraY;aerial=p.airborne;
    }else{
      const jumpPhase=w.jumpHeight>0?clamp((w.t-w.setup)/Math.max(.18,w.end-w.setup),0,1):0;
      extraY=w.jumpHeight>0?w.jumpHeight*Math.sin(Math.PI*jumpPhase):0;
      aerial=w.clip==='volley'||extraY>.001;
      p={clip:w.clip,time,bodyFoot:w.foot,bodyStartTime:w.clipStart||0,bodyContactTime:(w.clipStart||0)+(w.contact-w.setup)*w.rate,
        loop:false,fade:w.firstTime?clamp(w.contact*.45,.045,.12):clamp((w.contact-w.setup)*.92,.15,.24),
        grounded:!aerial,airborne:aerial,extraY,oppositeShot:w.oppositeShot};
    }
    if(!aerial&&!w.header&&w.supportHeight<.20){
      const plantIn=smooth((w.t-w.contact+.11)/.09);
      const plantOut=1-smooth((w.t-w.contact-.052)/.11);
      const support=w.foot==='LeftFoot'?'RightFoot':'LeftFoot';
      p.footPlant={foot:support,point:[w.plant[0],Math.max(.050,w.supportHeight),w.plant[1]],weight:plantIn*plantOut*.83,boot:true};
    }
    if(w.firstTime&&!w.header){
      const weight=smooth((w.t-w.contact+.079)/.058)*(1-smooth((w.t-w.contact-.025)/.060));
      if(weight>0){
        const point=predictShotBall(clamp(w.contact-w.t,0,.065));
        const angle=Math.atan2(point[0]-w.aim.x,point[2]);
        const strike={foot:w.foot,point:[point[0]+Math.sin(angle)*.090,Math.max(.063,point[1]-.018),
          point[2]+Math.cos(angle)*.090],weight,boot:true};
        p.footPlants=p.footPlant?[p.footPlant,strike]:[strike];
        p.footPlant=null;
      }
    }else if(aerial&&!w.header){
      const target=1-smooth(Math.abs(w.t-w.contact)/.09);
      const point=[ballPos[0]+Math.sin(w.targetYaw)*.088,ballPos[1]-.01,ballPos[2]+Math.cos(w.targetYaw)*.088];
      if(target>0)p.footPlant={foot:w.foot,point,weight:target,boot:true};
    }
  }
  const upperReference=mocap.clips.penalty;
  if(upperReference&&w.clip!=='penalty'&&w.clip!=='strikeForwardJog'&&!w.header){
    const impactFrame=22.35;
    const endFrame=Math.min(38,upperReference.frames-1);
    const release=w.impactAt??Math.min(w.end,w.contact+.085);
    const prepTime=Math.min(w.t,release);
    const prepFrame=mix(12,impactFrame,clamp(prepTime/w.contact,0,1))
      + .65*smooth((prepTime-w.contact)/.085);
    const phase=clamp((w.t-release)/Math.max(.001,w.end-release),0,1);
    const frame=mix(prepFrame,endFrame,phase*(1+.24*(1-phase)));
    const emphasis=w.clip==='volley'?.54:w.finesse?.77:mix(.83,1,w.power);
    const recovery=1-.23*smooth((phase-.55)/.45);
    p.upperBody={clip:'penalty',time:frame/upperReference.fps,
      weight:emphasis*smooth(w.t/.083)*recovery,shot:true,opposite:w.foot==='LeftFoot'};
  }
  player.touchPending=null;
}
if(windup&&!windup.header&&windup.t>=windup.setup&&!terminal()){
  const w=windup;
  const weight=smooth((w.t-w.contact+.13)/.11)*(1-smooth((w.t-w.contact-.015)/.09));
  const point=w.fired?w.contactBall:predictShotBall(clamp(w.contact-w.t,0,.13));
  if(point)p.ballContacts=[{category:'shot',limb:w.foot,point,
    normal:[Math.sin(w.targetYaw),0,Math.cos(w.targetYaw)],weight,maxCorrection:w.firstTime?.46:.36}];
}
if(player.gripActor&&player.grip>.02&&!windup&&!careerPlay?.transition?.outcome){
  const side=(player.gripActor.x-player.x)*Math.cos(player.yaw)-(player.gripActor.z-player.z)*Math.sin(player.yaw);
  const force=player.grip*(Math.sign(side)||1);
  const spine=p.offsets?.Spine??[0,0,0];
  p.offsets={...p.offsets,Spine:[spine[0]+.09*player.grip,spine[1]-.19*force,spine[2]+.10*force]};
}
if(player.teamAction?.kind==='kick'&&!windup&&!terminal())p=motion.passRecovery(player,p,player.teamAction,dt);
if(player.receptionLookTarget&&!windup&&!p.q)p.lookTarget=player.receptionLookTarget;
if(!p.lookTarget&&!p.q){
  const lookYaw=player.dribbleIntent?(player.dribbleHeading??player.yaw):player.yaw;
  p.lookTarget=windup?.aim?[windup.aim.x,windup.aim.y??1.15,0]:charging?[clamp(aim.x,-3.6,3.6),clamp(aim.y??1.15,.2,2.4),0]:ballState==='none'?[player.x-Math.sin(lookYaw)*6,1.48,player.z-Math.cos(lookYaw)*6]:ballPos;
}
mocap.update(player,p,dt);
}
function updateMocap(dt){
if(!mocap)return;
updatePlayerMocap(dt);
const rig=mocap.get(keeper);
const previousMirror=rig.mirror;
keeper.previousContacts=rig.contacts;
let k=keeperPlayback(dt)??keeperPassPose(dt);
if(!k&&keeper.chipVelocity&&!dive)k=keeperTrackingSteps(dt,rig);
else keeper.chipSteps=null;
if(!k){
  k={clip:'keeperIdle',time:clock,loop:true,fade:.28,grounded:true};
  if(!dive&&keeper.trackSpeed>.15){
    const pace=clamp(keeper.trackSpeed/1.6,.48,1.6);
    keeper.animTime=(keeper.animTime||0)+dt*pace;
    const jog=keeper.rush>.48&&keeper.trackForward&&keeper.trackSpeed>2.15;
    k={clip:jog?'jog':'sidestep',time:keeper.animTime,loop:true,fade:.20,grounded:true,mirror:!jog&&keeper.trackMirror};
  }
}
if(!dive&&!k.q)k.lookTarget=ballState==='none'?[player.x,1.35,player.z]:ballPos;
if(dive&&!dive.getup&&!k.q&&!terminal()&&['flight','loose','controlled'].includes(ballState)){
  const clip=mocap.clips[k.clip];
  if(clip?.contact){
    const remaining=clamp((clip.contact-k.time)/Math.max(.1,dive.rate||1),0,.10);
    const point=predictShotBall(remaining);
    const window=dive.type==='foot'?.20:.26;
    const weight=smooth((k.time-clip.contact+window)/window)*(1-smooth((k.time-clip.contact-.035)/.18));
    const feet=dive.type==='foot';
    const markers=feet?rig.feet:rig.hands;
    const nearest=markers&&Math.hypot(...sub(markers[0],point))<=Math.hypot(...sub(markers[1],point))?0:1;
    const paired=!feet&&['catch','scoop','groundCatch','jump'].includes(dive.type);
    const limb=dive.contactLimb??=(feet?(nearest===0?'LeftFoot':'RightFoot'):
      dive.saveHand??(dive.type==='oneHand'?'LeftHand':nearest===0?'LeftHand':'RightHand'));
    const limbs=paired?['LeftHand','RightHand']:[limb];
    k.ballContacts=limbs.map(limb=>({category:'goalkeeper',limb,point,weight,maxCorrection:feet?.34:.40}));
  }
}
k.bodyContactTime=mocap.clips[k.clip]?.contact;
mocap.update(keeper,k,dt);
if(previousMirror!==rig.mirror&&keeper.previousContacts){
  keeper.previousContacts=[1,0,3,2,5,4,6,7].map(index=>keeper.previousContacts[index]);
}
keeper.lastX=keeper.x;
}

function loadCameraPreference(){
  try{
    const saved=JSON.parse(localStorage.getItem('goat-camera-v1'));
    return {mode:['player','classic','side'].includes(saved?.mode)?saved.mode:'side',focus:saved?.focus==='player'?'player':'ball'};
  }catch{return {mode:'side',focus:'ball'};}
}
function saveCameraPreference(){
  try{localStorage.setItem('goat-camera-v1',JSON.stringify({mode:camMode,focus:cameraFocus}));}catch{}
}
let cameraFocus=loadCameraPreference().focus,cameraPreview=null,cameraPreviewDirection=0;
function liveCameraBall(){return cameraFocus==='player'||ballState==='none'?[player.x,.11,player.z]:ballPos;}
function playerBallCamera(){
  if(cameraFocus==='player')return [[player.x+1.35,4.45,player.z+8],[player.x,1.26,player.z-8.6]];
  if(ballState==='controlled')return [[player.x*.81+1.35,4.45,player.z+8.0],[player.x*.58,1.26,player.z-8.6]];
  const ball=liveCameraBall();
  const body=clamp(signedTurn(player.yaw),-1.02,1.02);
  const eye=[player.x+Math.sin(body)*8,4.45+Math.min(2,Math.max(0,ball[1]-1)*.25),player.z+Math.cos(body)*8];
  const heading=clamp(Math.atan2(eye[0]-ball[0],eye[2]-ball[2]),-1.22,1.22);
  const range=clamp(Math.hypot(ball[0]-eye[0],ball[2]-eye[2]),6,42);
  return [eye,[eye[0]-Math.sin(heading)*range,clamp(ball[1]+.4,.85,3.5),eye[2]-Math.cos(heading)*range]];
}
function sideCamera(){
  const ball=liveCameraBall(),z=ball[2];
  const lift=Math.max(0,ball[1]-.11);
  const aspect=W/Math.max(1,H);
  const halfFov=Math.atan(Math.tan(fieldOfView/2)*clamp((16/9)/aspect,1,1.5));
  const tilt=Math.atan2(14-.83,23.5);
  const bottomAngle=tilt+Math.atan(Math.tan(halfFov)*.78);
  const visibleNear=23.5-(14+lift)/Math.tan(bottomAngle);
  const maxFollow=footballPlayLimits.side-visibleNear-1;
  const x=Math.min(ball[0],maxFollow);
  return [[x+23.5,14+lift,z],[x,.83+lift,z]];
}

function cycleCamera(step=1){let modes=['player','classic','side'];camMode=modes[(modes.indexOf(camMode)+step+modes.length)%modes.length];updateCameraPreview();}
function updateCameraPreview(){
  $('#cameraName').textContent={player:'Jogador',classic:'Clássica',side:'Lateral'}[camMode];
  $('#cameraFocus').textContent='Foco: '+(cameraFocus==='ball'?'bola':'meu jogador');
}
function toggleCameraFocus(){cameraFocus=cameraFocus==='ball'?'player':'ball';if(!cameraPreview)saveCameraPreference();updateCameraPreview();}
function openCameraPreview(){
  if(!started||replaying||careerPlay?.transition)return;
  if(!paused)pause();
  cameraPreview={mode:camMode,focus:cameraFocus};
  cameraPreviewDirection=0;
  $('#paused').hidden=true;
  $('#cameraPreview').hidden=false;
  updateCameraPreview();
  canvas.focus();
}
function closeCameraPreview(confirm){
  if(!cameraPreview)return;
  if(!confirm){camMode=cameraPreview.mode;cameraFocus=cameraPreview.focus;}
  cameraPreview=null;
  keys={};
  $('#cameraPreview').hidden=true;
  if(confirm)saveCameraPreference();
  paused=true;
  $('#paused').hidden=false;
  $('#camera').focus();
}
function projected(p,vp){
  const v=point(vp,p),w=vp[3]*p[0]+vp[7]*p[1]+vp[11]*p[2]+vp[15];
  const depth=Math.max(.001,Math.abs(w));
  return{x:(v[0]/depth*.5+.5)*W,y:(-.5*v[1]/depth+.5)*H,visible:w>0};
}

function placeIndicator(el,x,y){
  el.style.left=x+'px';
  el.style.top=y+'px';
}

function renderIndicators(vp){
  const reticle=$('#reticle'),spread=$('#aimSpread'),cue=$('#ballCue'),panel=$('#staminaPanel');
  const passTarget=throughCharge?.preview?.point;
  const canAim=started&&!replaying&&!terminal()&&!windup&&!careerPlay?.transition&&!activeSetPiece()&&!trainingDefense?.placement&&(!!passTarget||['controlled','loose'].includes(ballState));
  const center=projected(passTarget?[passTarget[0],.18,passTarget[2]]:[aim.x,aim.y,.04],vp);
  reticle.hidden=!canAim||!center.visible;
  spread.hidden=reticle.hidden||!charging||paused;
  if(!reticle.hidden)placeIndicator(reticle,center.x,center.y);
  if(!spread.hidden){
    placeIndicator(spread,center.x,center.y);
    const bodyYaw=mocap.get(player).bodyYaw??player.yaw;
    const goalYaw=Math.atan2(ballPos[0]-aim.x,ballPos[2]);
    const backwards=Math.abs(signedTurn(goalYaw-bodyYaw))>backShotAngle;
    const r=shotSpread(Math.max(.17,charge),player.pressure||0,mark())*(backwards?backShotSpread:1);
    const left=projected([aim.x-r,aim.y,.04],vp),right=projected([aim.x+r,aim.y,.04],vp);
    const up=projected([aim.x,aim.y+r,.04],vp),down=projected([aim.x,aim.y-r,.04],vp);
    spread.style.width=Math.max(12,Math.hypot(right.x-left.x,right.y-left.y))+'px';
    spread.style.height=Math.max(12,Math.hypot(up.x-down.x,up.y-down.y))+'px';
  }
  const ball=projected(ballPos,vp);
  cue.hidden=!started||replaying||!!careerPlay?.transition||
    ball.visible&&ball.x>7&&ball.x<W-7&&ball.y>7&&ball.y<H-7;
  if(!cue.hidden){
    let dx=ball.x-W*.5,dy=ball.y-H*.5;
    if(!ball.visible&&Math.hypot(dx,dy)<2)dy=1;
    const edge=Math.min((W*.5-25)/Math.max(.001,Math.abs(dx)),(H*.5-26)/Math.max(.001,Math.abs(dy)));
    placeIndicator(cue,W*.5+dx*edge,H*.5+dy*edge);
    cue.style.setProperty('--ball-angle',Math.atan2(dy,dx)+'rad');
  }
  const play=activeDefense();
  panel.hidden=!play||!!play.piece||!!trainingDefense?.placement;
  if(!panel.hidden){
    const percent=Math.round(play.stamina/staminaCapacity()*100);
    if(percent!==play.shownStamina){
      play.shownStamina=percent;
      $('#staminaBar').value=percent;
      $('#staminaText').textContent=percent+'%';
      panel.classList.toggle('is-urgent',percent<=25);
    }
  }
}
function renderFreeKickPlacement(vp){
  const spot=!replaying&&!paused?trainingDefense?.placement:null;
  const marker=$('#freeKickMarker'),instructions=$('#freeKickInstructions');
  document.body.classList.toggle('placing-kick',!!spot);
  instructions.hidden=!spot;
  marker.hidden=true;
  if(!spot)return;
  const point=projected([ballPos[0],ballPos[1]-.11,ballPos[2]],vp);
  if(!point.visible)return;
  const valid=validFreeKickSpot(spot);
  const distance=Math.hypot(spot.x,spot.z).toFixed(1).replace('.',',');
  marker.textContent=distance+' m do gol'+(valid?'':' · dentro da área');
  marker.dataset.invalid=String(!valid);
  marker.hidden=false;
  placeIndicator(marker,point.x,point.y);
}

function ballMesh(){
  const model=transform(ballPos,ballRotation,[.11,.11,.11]);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.FRONT);
  gl.uniform1f(loc.uInk,.011);
  draw(geo.matchBall,model,[1,1,1],-1);
  gl.uniform1f(loc.uInk,0);
  gl.disable(gl.CULL_FACE);
  draw(geo.matchBall,model,[1,1,1],-1);
}
const newsSceneActors=[];
let newsTarget=null;
function renderNewsImage({kind='celebrate',club,opponent,appearance,variant=0,stadiumId}){
  if(!mocap||!club)return null;
  const oldArena=arena,oldCrowd=crowdState;
  const viewport=gl.getParameter(gl.VIEWPORT),framebuffer=gl.getParameter(gl.FRAMEBUFFER_BINDING);
  const width=640,height=360;
  try{
    crowdState={lods:[],signature:''};
    if(!newsTarget){
      const frame=gl.createFramebuffer(),texture=gl.createTexture(),depth=gl.createRenderbuffer();
      gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,width,height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.bindRenderbuffer(gl.RENDERBUFFER,depth);
      gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,width,height);
      gl.bindFramebuffer(gl.FRAMEBUFFER,frame);
      gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,depth);
      newsTarget={frame,texture,depth};
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER,newsTarget.frame);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)return null;
    gl.viewport(0,0,width,height);
    const S=window.goatStadiums;
    const id=stadiumId??S?.forClub(club,0)??'arena-brasa';
    applyStadium(id,club,opponent??club,false);
    const aerial=kind==='stadium';
    const center=arena.aerialBounds?.center??[0,8,52.5];
    const extent=arena.aerialBounds?.halfSize??[65,30,85];
    const distance=Math.max(145,Math.hypot(...extent)*1.9);
    const eye=aerial?add(center,[distance*.55,distance*.85,distance*.65]):
      kind==='sad'?[-5.2,2.3,20]:kind==='shoot'?[5,2.4,24]:[-4.4,2.1,22];
    const target=aerial?center:[0,1.05,17];
    const vp=mm(perspective(Math.PI/3.25,width/height,.1,1500),look(eye,target));
    gl.clearColor(.75,.52,.35,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    paintSky(width,height,eye,target);gl.useProgram(program);
    gl.uniformMatrix4fv(loc.uVP,false,vp);gl.uniform3fv(loc.uEye,eye);
    gl.uniform1f(loc.uInk,0);gl.uniform1f(loc.uFanMode,0);
    gl.uniform1f(loc.uFogFar,aerial?1200:arena.fog);
    gl.uniform2f(loc.uAerialFog,aerial?900:0,aerial?1400:0);
    gl.uniform2f(loc.uPlayLimits,halfWidth,fieldLength);
    draw(geo.box,transform([0,-.14,midfield],[0,0,0],[aerial?2000:360,.25,aerial?2000:480]),[.29,.52,.31],aerial?0:1);
    if(aerial&&arena.aerialBounds)drawStadiumCity();
    draw(fieldMesh,identity);drawStadium();goalNet.draw();
    if(!aerial){
      while(newsSceneActors.length<3){
        const actor=makeHuman();mocap.useIndependentRig(actor);newsSceneActors.push(actor);
      }
      newsSceneActors.forEach((actor,index)=>{
        actor.appearance=index===0&&appearance?appearance:careerRules.paint({hair:(index+variant)%6,skin:(index+variant)%5},index===2&&kind==='shoot'?(opponent??club):club);
        actor.shirtNumber=index===0?playerShirtNumber:8+index;
        actor.x=index===0?0:index===1?2.5:-2.6;actor.y=0;actor.z=index===0?17:18.5+index*.6;
        actor.yaw=kind==='sad'?.3:kind==='shoot'?0:Math.PI-.35;
        const clip=kind==='sad'?(index%2?'sadWalk':'sadIdle'):kind==='shoot'?(index===0?'kick2':'jog'):(index===0?(variant%2?'victory':'sillyDancing'):'victory');
        const available=mocap.clips[clip]?clip:'idle';
        const time=kind==='shoot'&&index===0?(motion.shotContact('kick2')?.time??.3):
          Math.min(mocap.clips[available].duration-.05,.55+(variant%3)*.3+index*.2);
        mocap.get(actor).key=null;
        mocap.update(actor,{clip:available,time,loop:false,grounded:true,fade:.001,bodyYaw:actor.yaw},1);
        shadow(actor.x,actor.z,.65,.2);mocap.draw(actor,vp,eye);gl.useProgram(program);
      });
      const point=kind==='shoot'?[.1,.22,16.45]:[1.8,.11,16.1];
      draw(geo.matchBall,transform(point,[0,.4,0],[.11,.11,.11]),[1,1,1],-1);
    }
    const pixels=new Uint8Array(width*height*4);gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const out=document.createElement('canvas');out.width=width;out.height=height;
    const ctx=out.getContext('2d'),image=ctx.createImageData(width,height);
    for(let y=0;y<height;y++)image.data.set(pixels.subarray((height-1-y)*width*4,(height-y)*width*4),y*width*4);
    ctx.putImageData(image,0,0);
    return out.toDataURL('image/jpeg',.8);
  }catch{return null;}
  finally{
    disposeCrowd();arena=oldArena;crowdState=oldCrowd;
    gl.bindFramebuffer(gl.FRAMEBUFFER,framebuffer);gl.viewport(...viewport);
    gl.useProgram(program);
  }
}

function shadow(x,z,size,alpha=.20){gl.depthMask(false);draw(geo.disc,transform([x,.032,z],[0,0,0],[size,1,size*.53]),[.066,.059,.094,alpha],2);gl.depthMask(true)}
function render(dt){const intro=careerPlay?.transition?.intro;const creatorFrame=!started&&previewLook?creatorCameraFrame():null;const onField=careerReplay?.defenders??(replaying?replayFrames?.[0]?.defenders?.map(({actor})=>actor):[...(activeDefense()?.defenders??[]),...teamAI.actors()])??[];const showSupport=false;const shownPower=throughCharge?throughCharge.power:charge;let targetCam,targetLook;if(intro||careerReplay){targetCam=camera;targetLook=cameraTarget}else if(!started&&animLab){[targetCam,targetLook]=animLabCamera()}else if(!started&&previewLook){[targetCam,targetLook]=previewCamera(creatorFrame)}else if(!started){targetCam=[-3.6,2.5,player.z-4.9];targetLook=[1.35,1.25,player.z+.2]}else if(replaying){let focus=mul(add([keeper.x,1,keeper.z],ballPos),.5);targetCam=[-9,3.5,5];targetLook=focus}else if(trainingDefense?.placement){[targetCam,targetLook]=freeKickPlacementCamera()}else if(activeSetPiece()&&(!careerPlay?.transition?.foul||careerPlay.transition.changed)){[targetCam,targetLook]=setPieceCamera()}else if(camMode==='classic'){targetCam=[liveCameraBall()[0]*.35,12,liveCameraBall()[2]+16];targetLook=[liveCameraBall()[0],.6,liveCameraBall()[2]]}else if(camMode==='side'){[targetCam,targetLook]=sideCamera()}else{[targetCam,targetLook]=playerBallCamera()}
const ease=creatorFrame?1:1-Math.exp(-dt*(started&&!replaying&&camMode==='side'?7:animLab?9:4));
camera=camera.map((v,i)=>mix(v,targetCam[i],ease));
cameraTarget=cameraTarget.map((v,i)=>mix(v,targetLook[i],ease));
const sideView=started&&!intro&&!replaying&&camMode==='side'&&!activeSetPiece()&&!trainingDefense?.placement;
const aerialView=intro?.section==='aerial';
const aspect=W/H;
const sideFov=2*Math.atan(Math.tan(fieldOfView/2)*clamp((16/9)/aspect,1,1.5));
const projection=perspective(intro?.fov??(sideView?sideFov:fieldOfView),aspect,aerialView?10:.1,intro?.far??360);
if(creatorFrame){
  projection[8]=1-2*creatorFrame.x/W;
  projection[9]=2*creatorFrame.y/H-1;
}
const vp=mm(projection,look(camera,cameraTarget));
aimViewProjection=vp;
gl.clearColor(.75,.52,.35,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
paintSky(W,H,camera,cameraTarget);
gl.useProgram(program);
gl.uniformMatrix4fv(loc.uVP,false,vp);
gl.uniform3fv(loc.uEye,camera);
gl.uniform1f(loc.uInk,0);
gl.uniform1f(loc.uFanMode,0);
gl.uniform1f(loc.uFogFar,arena.fog);
gl.uniform2f(loc.uAerialFog,aerialView?intro.fogStart:0,aerialView?intro.fogEnd:0);
const playableView=!intro&&(started||careerReplay);
gl.uniform2f(loc.uPlayLimits,halfWidth,playableView?motion.limits.back:fieldLength);
const ground=aerialView?[intro.far*3,intro.far*3,midfield]:arena.ground;
draw(geo.box,transform([0,-.14,ground[2]],[0,0,0],[ground[0],.25,ground[1]]),[.29,.52,.31],aerialView?0:1);
if(aerialView)drawStadiumCity();
draw(fieldMesh,identity);drawStadium();drawSupporters();goalNet.draw();
if(started&&!paused&&!terminal()&&!replaying&&!careerReplay&&!activeSetPiece()&&!trainingDefense?.placement&&ballState==='controlled'){
  passAimPreview=throughCharge?.preview??teamAI.preview('pass',player.receiveDirection,.5);
  const target=passAimPreview?.target;
  if(target){
    gl.depthMask(false);
    draw(geo.targetRing,transform([target.x,.045,target.z],[0,0,0],[.68,1,.68]),teamAI.isOffside(target)?[1,.36,.18,.95]:[.35,1,.72,.95],2);
    gl.depthMask(true);
  }
}else passAimPreview=null;
if(intro){
  if(intro.section==='walkout'||intro.section==='anthem'){
    for(const {actor} of intro.players)shadow(actor.x,actor.z,.65,.21);
    for(const {actor} of intro.players)mocap.draw(actor,vp,camera);
    gl.useProgram(program);
  }
  return;
}
if(!replaying&&!careerReplay&&activeSetPiece()?.kind==='freeKick'){
  for(const actor of freeKickAllies)shadow(actor.x,actor.z,.65,.21);
  for(const actor of freeKickAllies)mocap.draw(actor,vp,camera);
  gl.useProgram(program);
}
if(!trainingDefense?.placement||replaying)shadow(player.x,player.z,.65,.22);shadow(keeper.x,keeper.z,.7,.19);for(const actor of onField)shadow(actor.x,actor.z,.65,.21);if(showSupport)shadow(support.x,support.z,.65,.18);if(ballState!=='none')shadow(ballPos[0],ballPos[2],.15+Math.max(0,ballPos[1])*.05,.25/(1+ballPos[1]*.35));if(mocap){if(!trainingDefense?.placement||replaying)mocap.draw(player,vp,camera);mocap.draw(keeper,vp,camera);for(const actor of onField)mocap.draw(actor,vp,camera);if(showSupport)mocap.draw(support,vp,camera);gl.useProgram(program)}else{renderNode(player.root);renderNode(keeper.root)}if(ballState!=='none')ballMesh();
renderIndicators(vp);renderFreeKickPlacement(vp);if(animLab)drawAnimSkeletonOverlay(vp);let indicator=projected([player.x,2.18,player.z],vp);$('#playerMark').style.left=indicator.x+'px';$('#playerMark').style.top=indicator.y+'px';$('#playerMark').hidden=!indicator.visible||!started||!!trainingDefense?.placement;
const mateContainer=$('#teammateMarks');
if(mateContainer){
  const mates=!started||trainingDefense?.placement||replaying||careerReplay?[]:
    activeSetPiece()?.kind==='freeKick'?freeKickAllies:
    [...teamAI.actors(),...(showSupport&&!teamAI.actors().includes(support)?[support]:[])];
  while(mateContainer.children.length<mates.length){
    const el=document.createElement('div');
    el.className='teammate-mark';
    el.innerHTML='<span class="offside-flag" aria-hidden="true"></span><svg viewBox="0 0 20 16" width="14" height="12"><polygon points="3,2 17,2 10,14" fill="#ffffff" stroke="#1a1420" stroke-width="2.2" stroke-linejoin="round"/></svg>';
    mateContainer.appendChild(el);
  }
  for(let i=0;i<mateContainer.children.length;i++){
    const el=mateContainer.children[i],actor=mates[i];
    if(!actor){el.hidden=true;continue;}
    el.classList.toggle('is-offside',!activeSetPiece()&&!terminal()&&teamAI.isOffside(actor));
    el.classList.toggle('is-requested-run',!terminal()&&actor.teamRun?.requested===true&&actor.teamRun.remaining>0);
    const mp=projected([actor.x,2.18,actor.z],vp);
    el.style.left=mp.x+'px';el.style.top=mp.y+'px';el.hidden=!mp.visible;
  }
}$('#keeperState').textContent=shot?.zone?shot.zone.id+' · '+keeperLabel:keeperLabel;$('#range').textContent=Math.round(Math.hypot(player.x,player.z))+' m';$('#power').style.width=shownPower*100+'%';$('#power').style.background=shownPower>.94?'#ff705b':shownPower>.75?'#ffc564':'#d8ff7a';$('#powerText').textContent=(shownPower>=1?100:Math.min(99,Math.round(shownPower*100)))+'%';const firstTimeAvailable=!activeSetPiece()&&!terminal()&&['pass','loose','flight'].includes(ballState);$('#shotHint').textContent=throughCharge?(throughCharge.kind==='cross'?'SOLTE B · CRUZAMENTO':throughCharge.kind==='lob'?'SOLTE Y · LANÇAMENTO ALTO':'SOLTE Y · LANÇAMENTO RASTEIRO'):firstTimeRequest?.headerOnly?'CABECEIO PREPARADO':firstTimeRequest?'PRIMEIRA PREPARADA':firstTimeCharge?'CARREGANDO PRIMEIRA':firstTimeAvailable?'SEGURE E SOLTE X':'SEGURE X';$('#height').textContent=ballState==='none'?'TREINO SEM BOLA':ballState==='loose'?(firstTimeRequest?'CHUTE DE PRIMEIRA PREPARADO':'BOLA LIVRE'):ballState==='held'?'BOLA COM O GOLEIRO':ballState==='defender'?'BOLA COM O ZAGUEIRO':ballState==='teammate'?'COMPANHEIRO COM A BOLA':ballState==='pass'?'PASSE EM ANDAMENTO':player.grip>.20?'DISPUTA DE CORPO':ballPos[1]>.4?'BOLA AÉREA / VOLEIO':activeSetPiece()?'COBRANÇA MANUAL':aim.y<.65?'RASTEIRO':aim.y>2.35?'ACIMA DO GOL':aim.y>1.7?'ALTO':'MEIA ALTURA';$('#replay').disabled=!trainingDefense||(!replaying&&!trainingClip&&!(result&&record.length>=15));
}
let accumulator=0,recordClock=0;const fixedStep=1/120;
function frame(t){
  try{
  const realDt=clamp((t-last)/1000||1/60,0,.05);
  last=t;
  frameMs=mix(frameMs,realDt*1000,.02);
  updateTrainingFade(t);
  if(!started||paused){
    mocap?.bodyContext({active:false});
    input(0);
    accumulator=0;
    if(careerReplay){
      playReplayFrame(realDt);
    }else if(!started&&animLab){
      stepAnimLab(realDt);
    }else if(!started&&previewLook){
      previewYaw+=signedTurn(previewOrbit-previewYaw)*(1-Math.exp(-realDt*18));
      player.yaw=previewYaw;
      mocap.update(player,{clip:'idle',grounded:true,bodyYaw:player.yaw},realDt);
    }
  }else if(replaying){
    input(0);
    accumulator=0;
    if(replaying){
      replayIndex+=realDt*60*.42;
      const index=Math.min(replayFrames.length-1,Math.floor(replayIndex));
      applySnapshot(replayFrames[index]);
      if(replayIndex>=replayFrames.length-1)stopReplay();
    }
  }else{
    accumulator=Math.min(.08,accumulator+realDt);
    while(accumulator>=fixedStep){
      const dt=fixedStep;
      accumulator-=dt;
      if(careerPlay?.transition){
        const phase=careerPlay.transition;
        changeCareerChance(dt);
        if(!started)break;
        if(phase.foul||phase.outcome&&!phase.sealed){
          captureReplayFrame(dt,phase.foul&&!careerPlay.transition);
          if(phase.foul&&!careerPlay.transition)sealReplay(careerPlay.match.used+1,null,true);
        }
        if(careerPlay.transition){
          if(careerPlay.transition.outcome)teamAI.settle(dt);
          continue;
        }
      }
      mocap?.bodyContext({active:true,player,actors:[player,keeper,...teamAI.actors(),...(activeDefense()?.defenders??[])],
        ball:ballPos,velocity:ballVel,ballState,owner:teamAI.owner,terminal:terminal(),fatigue:staminaFatigue(),
        shotThreat:charging?clamp(charge+.25,0,1):windup?1:ballState==='flight'?.85:0});
      for(const actor of [player,...teamAI.actors(),...(activeDefense()?.defenders??[])])motion.advanceAir(actor,dt);
      updateDefenderGrip(dt);
      input(dt);
      if(paused||replaying){accumulator=0;break;}
      if(trainingDefense?.placement)continue;
      clock+=dt;
      if(windup){windup.t+=dt;if(windup.t>windup.end&&(!windup.flight||windup.flight.done))windup=null;}
      advanceEndLineRunout(dt);
      playerAnimation(dt);keeperAnimation(dt);updateMocap(dt);advanceDefense(dt);advanceSupport(dt);
      if(!careerPlay?.transition)physics(dt);
      updateStamina(dt);
      if(windup?.firstTime&&!windup.fired&&firstTimeRequest&&windup.t>windup.contact+.13){
        windup=null;
      }
      if(windup&&!windup.firstTime&&!windup.headerTimeline&&!windup.fired&&windup.t>windup.contact+.085){
        windup.fired=true;
        announce("SEM CONTATO","Aproxime-se da bola para finalizar.");
      }
      recordClock+=dt;
      if(recordClock>=1/60){
        if(!careerPlay&&(shot||windup||result?.type==='goal'||result?.type==='postOut')&&record.length<900)record.push(snapshot());
        recordClock-=1/60;
      }
      captureReplayFrame(dt);
      if(toastTimer>0){
        toastTimer-=dt;
        if(toastTimer<=0&&result?.type!=='goal')clearAnnouncement();
      }
      netRipple=Math.max(0,netRipple-dt);
      if(activeShootout())advanceShootout(dt);
      else{
        rateDribbles();
        advanceCareerChance(dt);
      }
      if(!started)break;
    }
  }
  if(started||previewLook||careerReplay||animLab)render(realDt);
  requestAnimationFrame(frame);
  }catch(err){
    const panel=document.getElementById('runtimeError');
    if(panel){
      panel.hidden=false;
      panel.textContent='O jogo encontrou um erro: '+(err?.stack||err?.message||err);
    }
    throw err;
  }
}
addEventListener('pointerdown',()=>useInput('keyboard'),true);
addEventListener('pointermove',event=>{
  if(Math.abs(event.movementX)+Math.abs(event.movementY)>2)useInput('keyboard');
},true);
addEventListener('keydown',event=>{
  if(cameraPreview){
    event.preventDefault();
    if(event.repeat)return;
    if(event.code==='ArrowLeft')cycleCamera(-1);
    else if(event.code==='ArrowRight')cycleCamera();
    else if(event.code==='Enter'||event.code==='Space')closeCameraPreview(true);
    else if(event.code==='Escape'||event.code==='KeyB')closeCameraPreview(false);
    else if(event.code==='KeyC')toggleCameraFocus();
    return;
  }
  const intro=careerPlay?.transition?.intro;
  if(intro&&['Escape','Enter','Space','KeyX'].includes(event.code)){event.preventDefault();intro.skip=true;return;}
  if(!event.metaKey&&!event.ctrlKey&&!event.altKey)useInput('keyboard');
  if(animLab){
    const typing=event.target&&(event.target.tagName==='INPUT'&&(event.target.type==='search'||event.target.type==='text')||event.target.tagName==='SELECT');
    if(event.code==='Escape'&&!event.repeat){event.preventDefault();closeAnimLab();return;}
    if(!typing){
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!event.shiftKey&&animLab.tab==='edit'){event.preventDefault();undoAnimEdit();return;}
      if((event.code==='ArrowDown'||event.code==='ArrowRight')&&!event.repeat){event.preventDefault();stepAnimLabSelection(1);return;}
      if((event.code==='ArrowUp'||event.code==='ArrowLeft')&&!event.repeat){event.preventDefault();stepAnimLabSelection(-1);return;}
      if(event.code==='Comma'){event.preventDefault();stepAnimFrame(-1);return;}
      if(event.code==='Period'){event.preventDefault();stepAnimFrame(1);return;}
      if(event.code==='Space'&&!event.repeat){event.preventDefault();toggleAnimLabPlay();return;}
    }
    return;
  }
  if(menu?.stadiumOpen)return;
  if(menu?.screen!=='game'){
    menu?.rotateWithKey(event);
    if(event.code==='Escape'&&!event.repeat)menu?.back();
    return;
  }
  if(!event.repeat&&(event.code==='KeyP'||event.code==='Escape')){
    event.preventDefault();
    pause();
    return;
  }
  if(paused||event.ctrlKey||event.metaKey||event.altKey)return;
  const field=['SELECT','BUTTON','A','INPUT'].includes(event.target.tagName);
  if(field||event.repeat)return;
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
  keys[event.code]=true;
  if(event.code==='KeyX'&&started&&!replaying&&!careerPlay?.transition)shotTap=true;
  if(event.code==='KeyY'&&started&&!replaying&&!careerPlay?.transition)throughTap=true;
  if(event.code==='KeyB'&&started&&!replaying&&!careerPlay?.transition)crossTap=true;
  if(event.code==='Space'&&started&&!replaying&&!careerPlay?.transition)fakeShotTap=true;
  if(event.code==='KeyT'&&trainingDefense)resetTraining(true);
  if(event.code==='KeyC')toggleCameraFocus();
  if(event.code==='KeyV'&&trainingDefense)replay();
});
addEventListener('keyup',event=>{keys[event.code]=false;});
addEventListener('blur',()=>{keys={};if(started&&!paused&&!replaying)pause();});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){keys={};if(started&&!paused&&!replaying)pause();}
});
$('#resume').onclick=()=>{if(paused)pause();canvas.focus();};
$('#reset').onclick=()=>{resetTraining(true);canvas.focus();};
$('#camera').onclick=openCameraPreview;
$('#cameraPrevious').onclick=()=>cycleCamera(-1);
$('#cameraNext').onclick=()=>cycleCamera();
$('#cameraConfirm').onclick=()=>closeCameraPreview(true);
$('#cameraCancel').onclick=()=>closeCameraPreview(false);
$('#cameraFocus').onclick=toggleCameraFocus;
$('#replay').onclick=()=>{replay();canvas.focus();};
$('#trainingModes').addEventListener('click',event=>{
  const button=event.target.closest('[data-practice]');
  if(!button||!trainingDefense)return;
  const mode=button.dataset.practice;
  if(mode!==trainingDefense.mode){
    trainingDefense.mode=mode;
    refreshTrainingMenu();
    resetTraining();
  }
  if(paused)pause();
});
$('#trainingDefense').addEventListener('click',event=>{
  const choice=event.target.closest('[data-defenders]');
  if(!choice||!trainingDefense)return;
  const selected=Number(choice.dataset.defenders);
  if(selected===trainingDefenderCount)return;
  trainingDefenderCount=selected;
  for(const button of $('#trainingDefense').querySelectorAll('button')){
    button.setAttribute('aria-pressed',String(button===choice));
  }
  resetTraining();
});
$('#trainingTeammates').addEventListener('click',event=>{
  const choice=event.target.closest('[data-teammates]');
  if(!choice||!trainingDefense)return;
  trainingTeammateCount=clamp(Number(choice.dataset.teammates),1,3);
  try{localStorage.setItem('goat-training-team-v1',JSON.stringify(trainingTeammateCount));}catch{}
  for(const button of $('#trainingTeammates').querySelectorAll('button'))button.setAttribute('aria-pressed',String(button===choice));
  resetTraining();
});
$('#leaveGame').onclick=()=>menu.leaveMatch();
$('#skipMatchIntro').onclick=()=>{if(careerPlay?.transition?.intro)careerPlay.transition.intro.skip=true;};
menu=window.createGoatCareer({
  train:startTraining, playMatch:startCareerMatch, playShootoutKick:startShootoutKick, leaveMatch:stopFieldSession, preview:setCreatorPreview,
  newsImage:renderNewsImage, playReplay:startCareerReplay, updateInputLabels, updateTrainingPlayer, changeTrainingStadium:applyTrainingStadium,
  closeControls(){paused=false;keys={};$('#paused').hidden=true;canvas.focus();}
});
// === Validador interativo de animações (Menu Iniciar) ===
let animLab=null;
const animLabStorageKey='goat-anim-validation-v1';
const animLabLabels={
  sadWalk:'Caminhada triste (Sad Walk)',sadIdle:'Parado abatido (Sad Idle)',
  kneeControl:'Domínio com o joelho (Kneeing Soccerball)',kneeControlAlt:'Domínio com o joelho (variação)',
  jogForwardLeft:'Trote diagonal à frente (esquerda)',jogForwardRight:'Trote diagonal à frente (direita)',
  jogBackwardLeft:'Trote diagonal de costas (esquerda)',jogBackwardRight:'Trote diagonal de costas (direita)',
  strikeForwardJog:'Chute normal (Strike Foward Jog)',
  idle:'Parado (base ofensiva)',standardWalk:'Andar sem bola (Standard Walk)',idleToSprint:'Aceleração na corrida (Idle To Sprint)',jog:'Trote leve',sprint:'Arrancada livre',backward:'Corrida de costas',
  left:'Deslocamento à esquerda',right:'Deslocamento à direita',walkingLeftTurn:'Andar na diagonal sem bola (Walking Left Turn)',walkingTurn180:'Mudança de direção andando (Walking Turn 180)',changeDirection:'Mudança de direção sem bola (Change Direction)',runningToTurn:'Mudança de direção com bola (Running To Turn)',sillyDancing:'Comemoração (Silly Dancing)',victory:'Comemoração (Victory)',runBall:'Corrida conduzindo a bola',
  sprintBall:'Arrancada com a bola',messiClose:'Condução curta (controle colado)',dribbleSide:'Condução lateral',
  dribbleWide:'Condução aberta',cutLeft:'Corte rápido à esquerda',cutRight:'Corte rápido à direita',
  outsideLeft:'Corte de trivela (esquerda)',outsideRight:'Corte de trivela (direita)',insideRight:'Corte por dentro (direita)',
  dragBack:'Puxada com a sola (legado)',solePull:'Puxada com a sola / Inversão 180°',fakeCut:'Fake Shot / Cortinho lateral',chipFake:'Fake Shot (Chip.fbx)',receiveBall:'Domínio a meia altura (Receive)',headerStand:'Cabeceio parado (Header)',headerJump:'Cabeceio no alto / domínio (Soccer Header)',soccerTrip:'Queda ao sofrer falta (Soccer Trip)',soccerTackleSlide:'Carrinho do defensor (Soccer Tackle 2)',soccerTackleFront:'Reação ao carrinho de frente (Soccer Tackle)',soccerTackleSide:'Reação ao carrinho de lado (Soccer Tackle 3)',kick:'Chute normal',kick2:'Chute rápido / cavadinha',penalty:'Cobrança de pênalti',
  powerKick:'Chute forte (bomba)',finesseStand:'Colocado parado',finesseRun:'Colocado em movimento',
  shotSide:'Chute lateral',shotDiagonal:'Chute diagonal',shotBack:'Chute girando de costas',volley:'Voleio no ar',
  keeperIdle:'Goleiro em posição',keeperIdle2:'Goleiro pronto (variação)',sidestep:'Goleiro passo lateral (esq.)',
  sidestep2:'Goleiro passo lateral (dir.)',catch:'Encaixe frontal',catch2:'Encaixe meia altura',
  catch3:'Encaixe alto aberto',catch4:'Encaixe alto no ângulo',dive:'Ponte lateral (direita)',dive2:'Ponte lateral (esquerda)',
  scoop:'Defesa rasteira encaixando',block:'Bloqueio baixo (direita)',block2:'Bloqueio baixo (esquerda)',block3:'Bloqueio fechado',
  oneHand:'Defesa com uma mão no ângulo',footSave:'Defesa com o pé',footSave2:'Defesa com o pé (variação)',
  reflexSave:'Reflexo à queima-roupa',punchSave:'Soco / espalmar forte',spreadSave:'Abertura de corpo (abafar)',
  fallen:'Queda após defesa',getup:'Levantando do gramado',miss:'Tentativa sem alcance',
  gkChipCatchHigh:'Cobertura alta encaixada (Football Catch)',gkChipNearMiss:'Cobertura quase alcançada (Defender)',gkChipChaseGoal:'Corrida desesperada pro gol (Defender 1)',
  defTackleJog:'Desarme em pé (corrida)',defTackleSprint:'Desarme em arrancada',defTackleLunge:'Bote esticado',
  defTackleStand:'Desarme parado'
};
function classifyAnimClip(key,clip){
  if(clip?.customCat)return clip.customCat;
  if(/^def|^soccerTackleSlide$/.test(key))return 'defender';
  if(clip.saveKind||/^(keeper|sidestep|catch|dive|scoop|block|oneHand|footSave|reflexSave|punchSave|gk|save|spreadSave|fallen|getup|miss)/.test(key))return 'keeper';
  if(/^(strikeForwardJog|kick|penalty|powerKick|finesse|shot|volley|header)/.test(key))return 'shot';
  if(/^(cut|outside|inside|dragBack|chipFake|receiveBall|kneeControl)/.test(key))return 'dribble';
  return 'move';
}
const keeperZoneSpecs={
  A1:{col:0,row:1,name:'A1 · Ângulo esquerdo'},B1:{col:1,row:1,name:'B1 · Alto centro-esq.'},C1:{col:2,row:1,name:'C1 · Alto central'},D1:{col:3,row:1,name:'D1 · Alto centro-dir.'},E1:{col:4,row:1,name:'E1 · Ângulo direito'},
  A2:{col:0,row:2,name:'A2 · Meia altura esq.'},B2:{col:1,row:2,name:'B2 · Meia altura centro-esq.'},C2:{col:2,row:2,name:'C2 · Meia altura central'},D2:{col:3,row:2,name:'D2 · Meia altura centro-dir.'},E2:{col:4,row:2,name:'E2 · Meia altura dir.'},
  A3:{col:0,row:3,name:'A3 · Rasteira canto esq.'},B3:{col:1,row:3,name:'B3 · Rasteira centro-esq.'},C3:{col:2,row:3,name:'C3 · Rasteira central'},D3:{col:3,row:3,name:'D3 · Rasteira centro-dir.'},E3:{col:4,row:3,name:'E3 · Rasteira canto dir.'}
};
function solveAnimLabShotToGoal(startPos,targetPos,speed){
  // Iteratively solve launch velocity under the exact drag+gravity of advanceAnimLabStep
  // so the ball crosses the goal line (z = 0) dead-center inside the target sector!
  const dx=targetPos[0]-startPos[0],dz=targetPos[2]-startPos[2];
  const dist=Math.hypot(dx,dz)||1;
  let flight=dist/Math.max(6,speed);
  let vx=dx/flight,vz=dz/flight;
  let vy=(targetPos[1]-startPos[1]+.5*9.81*flight*flight)/flight;
  const h=1/120;
  for(let iter=0;iter<6;iter++){
    let px=startPos[0],py=startPos[1],pz=startPos[2];
    let cvx=vx,cvy=vy,cvz=vz,t=0,crossX=px,crossY=py,hit=false;
    for(let s=0;s<360;s++){
      const prevX=px,prevY=py,prevZ=pz;
      cvy-=9.81*h;
      const drag=Math.max(0,1-.22*h);
      cvx*=drag;cvy*=drag;cvz*=drag;
      px+=cvx*h;py+=cvy*h;pz+=cvz*h;t+=h;
      if(py<.11){py=.11;cvy=Math.abs(cvy)*.54;}
      const stopZ=targetPos[2];
      if(prevZ>stopZ&&pz<=stopZ){
        const frac=clamp((prevZ-stopZ)/Math.max(1e-5,prevZ-pz),0,1);
        crossX=mix(prevX,px,frac);
        crossY=mix(prevY,py,frac);
        flight=t-h*(1-frac);
        hit=true;
        break;
      }
    }
    if(!hit){vx*=1.18;vz*=1.18;vy*=1.12;continue;}
    const errX=targetPos[0]-crossX,errY=targetPos[1]-crossY;
    if(Math.hypot(errX,errY)<.025)break;
    vx+=errX/Math.max(.2,flight)*1.12;
    vy+=errY/Math.max(.2,flight)*1.16;
  }
  return {vel:[vx,vy,vz],flight};
}
function keeperScenarioForClip(key,mirror){
  let zoneId='C2',kind='normal',dist=14.0,chipLevel=null;
  if(keeperChipLow.includes(key)){zoneId='C3';kind='chip';chipLevel='low';dist=16.0;}
  else if(keeperChipMid.includes(key)){zoneId='C2';kind='chip';chipLevel='mid';dist=16.5;}
  else if(keeperChipHigh.includes(key)){zoneId='C1';kind='chip';chipLevel='high';dist=17.0;}
  else if(/^(gkSmother|spreadSave|saveSpread|saveQuickScoop)/.test(key)){zoneId='C3';kind='close';dist=7.5;}
  else if(/^(catch3)/.test(key)){zoneId='A1';kind='corner';dist=10.5;}
  else if(/^(dive2|oneHand|gkTipOverSide|saveHigh)/.test(key)){zoneId='A1';kind='corner';dist=14.5;}
  else if(/^(dive|punchSave)/.test(key)){zoneId='E1';kind='corner';dist=14.5;}
  else if(/^(catch4|gkDeflectHigh|saveTopCatch)/.test(key)){zoneId='C1';kind='high';dist=14.5;}
  else if(/^(gkDeflectSide1|gkReflexLow)/.test(key)){zoneId='C3';kind='close';dist=8.0;}
  else if(/^(gkDeflectSide2|saveStretch)/.test(key)){zoneId='E2';kind='corner';dist=13.5;}
  else if(/^(block2|saveLow)/.test(key)){zoneId='A3';kind='low';dist=13.0;}
  else if(/^(block)/.test(key)){zoneId='E3';kind='low';dist=13.0;}
  else if(/^(gkDeflectLow|footSave)$/.test(key)){zoneId='B3';kind='low';dist=11.5;}
  else if(/^(scoop|footSave2|saveGroundScoop|saveKneeScoop|saveLowCatch)/.test(key)){zoneId='C3';kind='low';dist=11.0;}
  else if(/^(catch|gkCatch|reflexSave|gkReflexMid|gkDeflectStand|saveChestCatch)/.test(key)){zoneId='C2';kind='normal';dist=13.5;}

  const forcedSub=animLab?.cat==='keeper'?animLab.keeperSub:'all';
  if(forcedSub==='chipLow'){kind='chip';chipLevel='low';zoneId='C3';dist=16.0;}
  else if(forcedSub==='chipMid'){kind='chip';chipLevel='mid';zoneId='C2';dist=16.5;}
  else if(forcedSub==='chipHigh'){kind='chip';chipLevel='high';zoneId='C1';dist=17.0;}
  else if(forcedSub&&forcedSub!=='all'&&keeperZoneSpecs[forcedSub]){
    zoneId=forcedSub;
    const fs=keeperZoneSpecs[forcedSub];
    kind=fs.row===3?'low':(fs.col===0||fs.col===4)?'corner':fs.row===1?'high':'normal';
    chipLevel=null;
    dist=fs.row===3?12.5:13.8;
  }

  const spec=keeperZoneSpecs[zoneId]||keeperZoneSpecs.C2;
  const col=(forcedSub&&forcedSub!=='all'&&!forcedSub.startsWith('chip'))?spec.col:(mirror?(4-spec.col):spec.col);
  const finalId='ABCDE'[col]+spec.row;
  const finalSpec=keeperZoneSpecs[finalId];
  const halfW=3.66,goalH=2.44;
  const sectorX=-halfW+(col+.5)*(2*halfW/5);
  const sectorY=kind==='chip'?(chipLevel==='low'?.32:chipLevel==='mid'?1.22:2.12):(3-spec.row+.5)*(goalH/3);
  const shooterX=/^catch3/.test(key)?(col<2?-7.2:7.2):kind==='chip'?0:clamp(sectorX*.35,-2.2,2.2);
  return {zoneId:finalId,zoneName:finalSpec.name,col,row:spec.row,kind,chipLevel,dist,target:[sectorX,sectorY,0],shooter:[shooterX,0,dist]};
}
function describeAnimExample(key,cat){
  const legacyRemoved=/^(punchSave|reflexSave|saveLowNear|saveStretchNear|saveStretchWide|saveLowWide|saveHighNear|saveHighWide|footSave|footSave2)$/.test(key);
  if(legacyRemoved)return 'Clipe legado/referência (removido das defesas em partida).';
  if(cat==='keeper'){
    if(/^(keeperIdle|sidestep)/.test(key))return 'Exemplo: goleiro se posicionando na linha acompanhando o atacante na área.';
    if(/^(fallen|getup|miss)/.test(key))return 'Exemplo: reação corporal do goleiro no gramado após um lance de defesa ou queda.';
    if(key==='gkChipCatchHigh')return 'Cobertura alta: goleiro recua e encaixa a cavadinha no alto.';
    if(key==='gkChipNearMiss')return 'Cobertura alta: goleiro estica o braço e quase alcança a cavadinha.';
    if(key==='gkChipChaseGoal')return 'Cobertura alta: goleiro corre em direção ao gol tentando alcançar uma cavadinha encoberta.';
    if(/^catch3/.test(key))return 'Encaixe com corrida: usado apenas em chutes com ângulo fechado em relação ao goleiro.';
    if(key==='saveChestCatch')return 'Encaixe no peito: restrito exclusivamente ao setor C2.';
    if(key==='gkDeflectSide1')return 'Desvio lateral baixo: restrito exclusivamente ao setor C3.';
    if(key==='gkReflexLow')return 'Reflexo rasteiro: usado em C3 apenas em chutes curtos (< 9,5 m do goleiro).';
    if(key==='gkDeflectHigh')return 'Desvio alto: nos ângulos A1 e E1, só entra na seleção em chutes a menos de 5 m do goleiro.';
    const sc=keeperScenarioForClip(key,Boolean(animLab?.mirror));
    if(sc.kind==='chip'){
      const alt=sc.chipLevel==='low'?'baixa (curta à frente do goleiro)':sc.chipLevel==='mid'?'média (altura do peito/ombro)':'alta (caindo sob o travessão)';
      return `Cobertura ${alt}: goleiro adiantado fora da pequena área recua acompanhando a cavadinha de ${sc.dist.toFixed(0)} m.`;
    }
    const tipo=sc.kind==='close'?'finalização curta':sc.kind==='low'?'chute rasteiro':'finalização real';
    return `Condição real: atacante finaliza (${tipo} a ${sc.dist.toFixed(0)} m) no setor ${sc.zoneName}; goleiro reage, adapta braços via IK e defende pela hitbox.`;
  }
  if(cat==='shot'){
    if(key==='volley')return 'Exemplo: bola cruzada caindo no ar para o atacante finalizar de voleio no tempo exato.';
    if(key==='headerStand')return 'Cabeceio parado: acionado em bolas aéreas na altura da cabeça sem necessidade de salto.';
    if(key==='headerJump')return 'Cabeceio no alto: salto para cabecear ou dominar bolas altas.';
    if(/finesse/.test(key))return 'Exemplo: chute colocado imprimindo curva fechada em direção ao canto do gol.';
    return 'Exemplo: bola posicionada no ponto de contato disparando rumo ao gol no quadro do chute.';
  }
  if(cat==='dribble'){
    if(key==='chipFake')return 'Fake Shot (Chip.fbx): ameaça de chute com cortinho lateral para deslocar o defensor/goleiro.';
    if(key==='receiveBall')return 'Domínio a meia altura: amortece bolas médias direcionando a bola para frente.';
    if(key==='solePull')return 'Puxada com a sola / Inversão 180° (editável): atacante pisa na bola e inverte 180° na direção oposta.';
    if(key==='fakeCut')return 'Fake Shot / Cortinho lateral (editável): planta o pé de apoio e corta lateralmente.';
    if(key==='dragBack')return 'Clipe bruto (legado — o jogo usa Puxada com a sola / Inversão 180°).';
    return 'Exemplo: bola conduzida sofrendo corte brusco lateral sincronizado com a hitbox da chuteira.';
  }
  if(cat==='defender'){
    if(key==='soccerTackleSlide')return 'Carrinho do defensor (Soccer Tackle 2): bote deslizante sobre a bola na entrada da área.';
    return 'Exemplo: defensor executando o bote/carrinho sobre a bola na entrada da área.';
  }
  if(key==='standardWalk')return 'Referência de caminhada sem bola (Standard Walk): integra o blend procedural contínuo em baixa velocidade.';
  if(key==='walkingLeftTurn')return 'Referência de caminhada diagonal sem bola (Walking Left Turn): mistura-se ao tronco e passadas em curvas andando.';
  if(key==='walkingTurn180')return 'Referência de virada 180° andando sem bola (Walking Turn 180): acionada ao inverter direção em baixa velocidade.';
  if(key==='idleToSprint')return 'Referência de aceleração na corrida (Idle To Sprint): aplicada continuamente na arrancada até emendar no Sprint.';
  if(key==='sprint')return 'Referência de corrida rápida (Sprint): usada em alta velocidade com e sem bola no blend contínuo.';
  if(key==='changeDirection')return 'Referência de mudança de direção correndo sem bola (Change Direction): frenagem com queda de quadril e saída alinhada.';
  if(key==='runningToTurn')return 'Referência de mudança de direção correndo com bola (Running To Turn): giro de 180° mantendo a bola sob controle.';
  if(key==='sillyDancing'||key==='victory')return 'Comemoração de gol: reproduzida de frente para a câmera quando o jogador marca.';
  if(key==='soccerTrip')return 'Queda ao sofrer falta (Soccer Trip): acionada quando o defensor comete falta de carrinho.';
  if(key==='soccerTackleFront'||key==='soccerTackleSide')return 'Reação ao carrinho limpo (de frente / de lado): desequilíbrio sem falta quando o defensor tira a bola.';
  if(key==='dribbleSide'||key==='dribbleWide')return 'Referência de condução (legada — corrida com bola agora compartilha o blend contínuo de corrida livre).';
  if(/Ball|messi|dribble/.test(key))return 'Exemplo: atacante conduzindo com a bola sob domínio contínuo pela hitbox da chuteira.';
  return 'Exemplo: ciclo de movimentação procedural no gramado (use a câmera e 0.25× para inspecionar os pés e o tronco).';
}
function loadAnimMarks(){
  try{return JSON.parse(localStorage.getItem(animLabStorageKey)||'{}')||{};}catch{return {};}
}
function saveAnimMarks(marks){
  try{localStorage.setItem(animLabStorageKey,JSON.stringify(marks));}catch{}
}
const animDuplicateBase={
  catchReference:'catch',catch2Reference:'catch2',catch3Reference:'catch3',catch4Reference:'catch4',
  diveReference:'dive',dive2Reference:'dive2',blockReference:'block',block2Reference:'block2',
  block3Reference:'block3',scoopReference:'scoop',spreadSaveReference:'spreadSave'
};
function ensureProceduralClipsBaked(){
  if(!mocap||!motion)return;
  const specs=[
    {key:'solePull',frames:44,fps:30,warmup:10,contact:.44,bakeVersion:2},
    {key:'fakeCut',frames:38,fps:30,warmup:10,contact:.42,bakeVersion:5}
  ];
  const savedPlayer={x:player.x,y:player.y,z:player.z,yaw:player.yaw,vx:player.vx,vz:player.vz};
  const savedBall=[...ballPos],savedVel=[...ballVel];
  const stride=mocap.boneCount*4+3;
  for(const sp of specs){
    const existing=mocap.clips[sp.key];
    if(existing&&existing.previewTrack?.length&&(existing.bakeVersion||0)>=sp.bakeVersion)continue;
    const values=new Float32Array(sp.frames*stride);
    const track=[];
    motion.reset(player);
    player.x=0;player.z=17.5;player.yaw=0;player.vx=0;player.vz=-3.0;
    const bPos=[.12,.11,16.95],bVel=[0,0,-3.0];
    mocap.update(player,{clip:'idle',grounded:true,bodyYaw:0,fade:.001},1);
    const dtFrame=1/sp.fps;
    // Warm up into a clean natural dribble stride before recording the move
    for(let w=0;w<sp.warmup;w++){
      motion.move(player,{dt:dtFrame,direction:[0,-1],speed:3.6,sprint:false,controlled:true,ball:bPos,velocity:bVel});
      const curRig=mocap.get(player);
      const pose=motion.locomotion(player,{dt:dtFrame,ball:bPos,velocity:bVel,controlled:true,ankles:curRig?.ankles});
      mocap.update(player,pose,dtFrame);
      const fwdX=-Math.sin(player.yaw),fwdZ=-Math.cos(player.yaw);
      bVel[0]=mix(bVel[0],(player.x+fwdX*.46-bPos[0])*7+player.vx,clamp(dtFrame*14,0,1));
      bVel[2]=mix(bVel[2],(player.z+fwdZ*.46-bPos[2])*7+player.vz,clamp(dtFrame*14,0,1));
      bPos[0]+=bVel[0]*dtFrame;bPos[2]+=bVel[2]*dtFrame;
    }
    const startX=player.x,startZ=player.z;
    let triggered=false,cut=null,pullTouched=false;
    const isPull=sp.key==='solePull';
    const triggerFrame=3;
    for(let f=0;f<sp.frames;f++){
      const wishYaw=f<triggerFrame?0:(isPull?Math.PI:1.18);
      if(!isPull&&!triggered&&f>=triggerFrame){
        triggered=true;
        cut={side:1,from:player.yaw,heading:1.18,elapsed:0,strike:.32,duration:.50,lateral:true,touched:false};
      }
      if(cut){
        cut.elapsed+=dtFrame;
        if(cut.elapsed>=cut.duration)cut=null;
      }
      const inX=-Math.sin(wishYaw),inZ=-Math.cos(wishYaw);
      motion.move(player,{dt:dtFrame,direction:[inX,inZ],speed:3.8,sprint:false,controlled:true,ball:bPos,velocity:bVel,requestPull:false,fakeCut:Boolean(cut)&&!cut.touched,lateralCut:cut});
      const curRig=mocap.get(player);
      const pose=motion.locomotion(player,{dt:dtFrame,ball:bPos,velocity:bVel,controlled:true,ankles:curRig?.ankles,lateralCut:cut});
      mocap.update(player,pose,dtFrame);
      const rig=mocap.get(player);
      let flash=false;
      if(isPull){
        const rev=player.turningAround;
        if(rev?.phase==='plant'){
          ballPhysics.brakeDribble(bPos,bVel,1.05,22,dtFrame);
        }else if(rev?.phase==='pull'){
          if(!pullTouched){pullTouched=true;flash=true;}
          const [ax,az]=rev.action?.pullAxis??[0,1];
          bVel[0]=mix(bVel[0],ax*4.0,clamp(dtFrame*18,0,1));
          bVel[2]=mix(bVel[2],az*4.0,clamp(dtFrame*18,0,1));
        }else if(rev?.phase==='pivot'||pullTouched){
          const exitYaw=rev?.action?.target??Math.PI;
          const fx=-Math.sin(exitYaw),fz=-Math.cos(exitYaw);
          bVel[0]=mix(bVel[0],(player.x+fx*.46-bPos[0])*6.5+player.vx,clamp(dtFrame*12,0,1));
          bVel[2]=mix(bVel[2],(player.z+fz*.46-bPos[2])*6.5+player.vz,clamp(dtFrame*12,0,1));
        }
      }else{
        if(cut&&!cut.touched&&cut.elapsed>=cut.strike){
          cut.touched=true;cut.touchedAt=cut.elapsed;flash=true;
          const ex=-Math.sin(cut.heading),ez=-Math.cos(cut.heading);
          bVel[0]=ex*4.5;bVel[2]=ez*4.5;
          player.vx=ex*3.9;player.vz=ez*3.9;
          player.yaw=cut.heading;player.travelYaw=cut.heading;
        }else if(cut&&!cut.touched){
          const fx=-Math.sin(cut.from),fz=-Math.cos(cut.from);
          bVel[0]=mix(bVel[0],(player.x+fx*.48-bPos[0])*6+player.vx*.6,clamp(dtFrame*10,0,1));
          bVel[2]=mix(bVel[2],(player.z+fz*.48-bPos[2])*6+player.vz*.6,clamp(dtFrame*10,0,1));
        }else{
          const followYaw=cut?cut.heading:player.yaw;
          const fx=-Math.sin(followYaw),fz=-Math.cos(followYaw);
          bVel[0]=mix(bVel[0],(player.x+fx*.50-bPos[0])*6.5+player.vx,clamp(dtFrame*10,0,1));
          bVel[2]=mix(bVel[2],(player.z+fz*.50-bPos[2])*6.5+player.vz,clamp(dtFrame*10,0,1));
        }
      }
      bPos[0]+=bVel[0]*dtFrame;bPos[2]+=bVel[2]*dtFrame;
      track.push({
        x:player.x-startX,z:player.z-startZ,yaw:pose.bodyYaw??player.yaw,
        bx:bPos[0]-startX,by:bPos[1],bz:bPos[2]-startZ,flash
      });
      if(values){
        const base=f*stride;
        for(let i=0;i<mocap.boneCount;i++){
          const q=rig.q[i];
          const valid=q&&q.every(Number.isFinite);
          if(valid){
            values[base+i*4]=q[0];values[base+i*4+1]=q[1];values[base+i*4+2]=q[2];values[base+i*4+3]=q[3];
          }else if(f>0){
            values.set(values.subarray((f-1)*stride+i*4,(f-1)*stride+i*4+4),base+i*4);
          }else{
            values[base+i*4]=0;values[base+i*4+1]=0;values[base+i*4+2]=0;values[base+i*4+3]=1;
          }
        }
        const rOk=rig.root&&rig.root.every(Number.isFinite);
        if(rOk){
          values[base+mocap.boneCount*4]=rig.root[0];
          values[base+mocap.boneCount*4+1]=rig.root[1];
          values[base+mocap.boneCount*4+2]=rig.root[2];
        }else if(f>0){
          values.set(values.subarray((f-1)*stride+mocap.boneCount*4,(f-1)*stride+mocap.boneCount*4+3),base+mocap.boneCount*4);
        }
      }
    }
    const clipObj=mocap.registerBakedClip(sp.key,sp.frames,sp.fps,values,{customCat:'dribble',contact:sp.contact,bakeVersion:sp.bakeVersion});
    if(clipObj)clipObj.previewTrack=track;
  }
  Object.assign(player,savedPlayer);
  ballPos=savedBall;ballVel=savedVel;
  motion.reset(player);
  mocap.update(player,{clip:'idle',grounded:true,bodyYaw:player.yaw,fade:.001},1);
}
function buildAnimCatalog(){
  const catOrder={move:0,dribble:1,shot:2,keeper:3,defender:4};
  const fromClips=Object.entries(mocap?.clips||{}).map(([key,clip])=>{
    const cat=classifyAnimClip(key,clip);
    const dupOf=animDuplicateBase[key]||(mocap.clips[key+'Reference']?key+'Reference':null);
    return {
      key,clip,cat,dupOf,
      label:animLabLabels[key]||key.replace(/^gk/,'Goleiro · ').replace(/([a-z])([A-Z])/g,'$1 $2'),
      example:describeAnimExample(key,cat)
    };
  });
  const usageRank=item=>animUsedInGame.has(item.key)?0:item.clip.custom?1:2;
  return fromClips.sort((a,b)=>usageRank(a)-usageRank(b)||catOrder[a.cat]-catOrder[b.cat]||a.label.localeCompare(b.label,'pt-BR'));
}
const keeperChipLowSet=new Set(keeperChipLow);
const keeperChipMidSet=new Set(keeperChipMid);
const keeperChipHighSet=new Set(keeperChipHigh);
const keeperChipClips=new Set([...keeperChipLow,...keeperChipMid,...keeperChipHigh]);
const keeperSectorMap=(()=>{
  const map={};
  for(const [id,list] of Object.entries(keeperZones?.zones||{})){
    const set=new Set(list.slice(1));
    const row=Number(id[1]);
    const outer=id[0]==='A'||id[0]==='E';
    if(outer){
      const level=row===3?0:row===2?1:2;
      for(const k of keeperCloseCornerDives[level])set.add(k);
    }
    if(row===3)for(const k of keeperLowDives)set.add(k);
    map[id]=set;
  }
  return map;
})();
function keeperTagsForClip(key){
  const tags=[];
  for(const [id,set] of Object.entries(keeperSectorMap))if(set.has(key))tags.push(id);
  if(keeperChipLowSet.has(key))tags.push('Cob. Baixa');
  if(keeperChipMidSet.has(key))tags.push('Cob. Média');
  if(keeperChipHighSet.has(key))tags.push('Cob. Alta');
  return tags;
}
function filteredAnimCatalog(){
  if(!animLab)return [];
  const q=animLab.query.trim().toLowerCase();
  const sub=animLab.cat==='keeper'?(animLab.keeperSub||'all'):'all';
  return animLab.catalog.filter(item=>{
    if(animLab.cat!=='all'&&item.cat!==animLab.cat)return false;
    if(sub==='chipLow'&&!keeperChipLowSet.has(item.key))return false;
    if(sub==='chipMid'&&!keeperChipMidSet.has(item.key))return false;
    if(sub==='chipHigh'&&!keeperChipHighSet.has(item.key))return false;
    if(sub!=='all'&&!sub.startsWith('chip')&&!keeperSectorMap[sub]?.has(item.key))return false;
    if(q&&!item.key.toLowerCase().includes(q)&&!item.label.toLowerCase().includes(q))return false;
    return true;
  });
}
const animUsedInGame=(()=>{
  const used=new Set([
    'solePull','fakeCut','chipFake','receiveBall','headerStand','headerJump','soccerTrip','soccerTackleSlide','soccerTackleFront','soccerTackleSide',
    'idle','jog','kick','kick2','penalty','keeperIdle','sidestep','getup',
    'runBall','sprintBall','powerKick','volley','messiClose','shotSide',
    'shotDiagonal','shotBack','oneHand',
    'gkSmotherChest0','gkSmotherChest45','gkSmotherKnee','gkSmotherSide90','gkSmotherClose',
    'defTackleJog',
    'defTackleSprint','defTackleLunge','defTackleStand','dribbleSide','dribbleWide'
  ]);
  for(const k of keeperChipClips)used.add(k);
  for(const set of Object.values(keeperSectorMap))for(const k of set)used.add(k);
  return used;
})();
function refreshAnimLabUI(){
  if(!animLab)return;
  const subBox=$('#animKeeperSubs');
  if(subBox){
    subBox.hidden=animLab.cat!=='keeper';
    for(const b of subBox.querySelectorAll('button')){
      b.setAttribute('aria-pressed',String(b.dataset.sub===(animLab.keeperSub||'all')));
    }
  }
  const list=$('#animLabList');
  const items=filteredAnimCatalog();
  const total=animLab.catalog.length;
  const usedCount=animLab.catalog.filter(i=>animUsedInGame.has(i.key)).length;
  const unusedCount=animLab.catalog.filter(i=>!animUsedInGame.has(i.key)&&!i.clip.custom).length;
  const done=animLab.catalog.filter(i=>animLab.marks[i.key]).length;
  $('#animLabProgress').textContent=`${usedCount} em uso · ${unusedCount} não usadas · ${done}/${total} validadas`;
  list.innerHTML='';
  for(const item of items){
    const btn=document.createElement('button');
    btn.type='button';
    const usageClass=item.clip.custom?'custom':animUsedInGame.has(item.key)?'used':'unused';
    const usageLabel=item.clip.custom?'Manual':item.procedural?'Em uso · Procedural':animUsedInGame.has(item.key)?'Em uso':'Não usada';
    const dupTag=item.dupOf?` · par de ${item.dupOf}`:'';
    const kTags=item.cat==='keeper'?keeperTagsForClip(item.key):[];
    const sectorTag=kTags.length?` · ${kTags.slice(0,5).join(', ')}${kTags.length>5?'…':''}`:'';
    btn.className='anim-lab-item '+usageClass+(item.key===animLab.selectedKey?' active':'');
    const mark=animLab.marks[item.key];
    const badge=mark==='ok'?'✓ OK':mark==='fix'?'✗ Ajustar':usageLabel;
    btn.innerHTML=`<span><strong>${item.label}</strong><small>${item.key} · ${item.clip.frames} q · ${item.clip.duration.toFixed(2)}s · ${usageLabel}${sectorTag}${dupTag}</small></span><span class="anim-lab-badge ${mark||usageClass}">${badge}</span>`;
    btn.onclick=()=>selectAnimClip(item.key);
    list.appendChild(btn);
  }
  const active=animLab.catalog.find(i=>i.key===animLab.selectedKey)||items[0];
  if(active){
    $('#animLabName').textContent=active.label;
    $('#animLabInfo').textContent=`${active.key} · ${active.clip.fps} fps · ${active.clip.frames} q · ${active.clip.duration.toFixed(2)}s`;
    $('#animLabExample').textContent=describeAnimExample(active.key,active.cat);
  }
  $('#animLabPlay').textContent=animLab.playing?'Pausar':'Reproduzir';
  $('#animLabSpeed').textContent=animLab.speed.toFixed(2).replace(/0$/,'')+'×';
  $('#animLabMirror').setAttribute('aria-pressed',String(animLab.mirror));
  $('#animLabHitboxBtn').setAttribute('aria-pressed',String(animLab.showHitbox));
  $('#animShowHitbox').checked=Boolean(animLab.showHitbox);
  $('#animLabOrbit').value=String(Math.round(animLab.orbitDeg));
  $('#animLabOrbitText').textContent=Math.round(animLab.orbitDeg)+'°';
  const activeEl=list.querySelector('.anim-lab-item.active');
  if(activeEl)activeEl.scrollIntoView({block:'nearest'});
}
function selectAnimClip(key){
  if(!animLab)return;
  if(mocap?.hasUnsavedDrafts?.())mocap.discardClipDrafts();
  animLab.selectedKey=key;
  animLab.time=0;
  animLab.editFrame=0;
  animLab.playing=animLab.tab!=='edit';
  refreshAnimLabUI();
  if(animLab.tab==='edit')syncAnimEditorSliders();
}
function stepAnimLabSelection(delta){
  const items=filteredAnimCatalog();
  if(!items.length)return;
  const idx=Math.max(0,items.findIndex(i=>i.key===animLab.selectedKey));
  const next=items[(idx+delta+items.length)%items.length];
  selectAnimClip(next.key);
}
function toggleAnimLabPlay(){
  if(!animLab)return;
  animLab.playing=!animLab.playing;
  $('#animLabPlay').textContent=animLab.playing?'Pausar':'Reproduzir';
}
function animLabCamera(){
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey)||animLab.catalog[0];
  const isKeeper=item?.cat==='keeper';
  const isChip=isKeeper&&animLab.sim?.keeperScenario?.kind==='chip';
  const cx=isKeeper?keeper.x*.45:player.x;
  const cz=isChip?keeper.z:isKeeper?1.1:player.z;
  const ang=animLab.orbitDeg*Math.PI/180;
  const zoom=animLab.camZoom??1;
  const dist=(isChip?6.8:isKeeper?6.0:5.2)*zoom;
  const camX=cx+Math.sin(ang)*dist;
  const camZ=cz+Math.cos(ang)*dist;
  const camY=mix(1.18,isKeeper?2.05:1.85,clamp(zoom,.45,1.4));
  // Offset look slightly left so the actor sits centered in the open right side of the screen
  const rightX=Math.cos(ang);
  const rightZ=-Math.sin(ang);
  return [[camX,camY,camZ],[cx-rightX*.95*clamp(zoom,.55,1.3),1.02,cz-rightZ*.95*clamp(zoom,.55,1.3)]];
}
function clipNaturalDiveSide(clip){
  if(clip?.saveSide)return Math.sign(clip.saveSide);
  const dur=Math.max(.08,clip?.duration||.6);
  const contact=clamp(clip?.contact??dur*.48,0,dur);
  const at=Math.min((clip?.frames||1)-1,Math.round(contact*(clip?.fps||30)));
  let x=0;
  if(clip?.rootMotion){
    const off=clip.stride-3;
    x+=clip.values[at*clip.stride+off]*mocap.scale;
  }
  const lm=clip?.landmarks?.[at];
  if(lm){
    x+=((lm.LeftHand[0]+lm.RightHand[0])*.5)*mocap.scale;
  }
  return Math.abs(x)>.08?Math.sign(x):0;
}
function sampleClipRootOffset(clip,clipTime,mirror){
  if(!clip.rootMotion)return [0,0];
  const frame=clamp(clipTime*clip.fps,0,clip.frames-1);
  const lo=Math.floor(frame),hi=Math.min(clip.frames-1,lo+1),b=frame-lo;
  const off=clip.stride-3;
  const rx=mix(clip.values[lo*clip.stride+off],clip.values[hi*clip.stride+off],b)*mocap.scale*(mirror?-1:1);
  const rz=mix(clip.values[lo*clip.stride+off+2],clip.values[hi*clip.stride+off+2],b)*mocap.scale;
  return [rx,rz];
}
const animLabLiveMoveKeys=new Set(['idle','jog','runBall','sprintBall','messiClose','dribbleSide','dribbleWide']);
function animLabMoveVelocity(key,sideSign){
  if(key==='messiClose')return [0,-2.5];
  if(key==='jog')return [0,-3.2];
  if(key==='runBall')return [0,-4.6];
  if(key==='sprint')return [0,-6.4];
  if(key==='sprintBall')return [0,-6.2];
  if(key==='dribbleSide')return [0,-3.1];
  if(key==='dribbleWide')return [0,-3.6];
  if(key==='left')return [-3.0*sideSign,0];
  if(key==='right')return [3.0*sideSign,0];
  if(key==='backward')return [0,2.5];
  return [0,0];
}
function sampleAnimBootAt(item,baseZ,timeSec){
  const clip=item.clip;
  const [rx,rz]=sampleClipRootOffset(clip,timeSec,animLab.mirror);
  const isAerial=item.key==='volley'||Boolean(clip.rootMotion)||/^(dive|gkTipOver|gkChip|saveHigh|saveStretch|saveTopCatch|catch4|fallen|defSlide)/.test(item.key);
  player.x=rx;player.z=baseZ+rz;player.yaw=0;
  mocap.update(player,{
    clip:item.key,time:timeSec,loop:false,mirror:animLab.mirror,
    authoredGround:Boolean(clip.rootMotion||isAerial),
    grounded:!clip.rootMotion&&!isAerial,
    airborne:isAerial&&!clip.rootMotion,
    fade:.001,bodyYaw:0
  },.016);
  const rig=mocap.get(player);
  const b0=rig?.boots?.[0]?[...rig.boots[0]]:[-.16,.11,baseZ-.5];
  const b1=rig?.boots?.[1]?[...rig.boots[1]]:[.16,.11,baseZ-.5];
  return [b0,b1];
}
function findStrikingBootPoint(item,baseZ,contact){
  const dur=Math.max(.08,item.clip.duration);
  // Scan around contact window to find peak boot extension/velocity
  const tBefore=Math.max(0,contact-.06);
  const prevBoots=sampleAnimBootAt(item,baseZ,tBefore);
  const atBoots=sampleAnimBootAt(item,baseZ,clamp(contact,0,dur));
  const spd0=Math.hypot(atBoots[0][0]-prevBoots[0][0],atBoots[0][1]-prevBoots[0][1],atBoots[0][2]-prevBoots[0][2]);
  const spd1=Math.hypot(atBoots[1][0]-prevBoots[1][0],atBoots[1][1]-prevBoots[1][1],atBoots[1][2]-prevBoots[1][2]);
  let chosen;
  if(item.key==='volley'){
    chosen=atBoots[0][1]>=atBoots[1][1]?atBoots[0]:atBoots[1];
  }else if(item.cat==='defender'){
    // Extended tackling/sliding foot furthest forward (-Z)
    chosen=atBoots[0][2]<=atBoots[1][2]?atBoots[0]:atBoots[1];
  }else{
    chosen=spd0>=spd1?atBoots[0]:atBoots[1];
  }
  // Reset pose cleanly back to frame 0 before playback starts
  sampleAnimBootAt(item,baseZ,0);
  return chosen;
}
function resetAnimLabSim(item){
  const clip=item.clip,dur=Math.max(.08,clip.duration);
  const contact=clamp(clip.contact??dur*(item.cat==='defender'?.48:item.cat==='dribble'?.42:.44),.06,dur*.85);
  const sideSign=animLab.mirror?-1:1;
  goalNet.reset();
  const sim={
    key:item.key,mirror:animLab.mirror,simTime:0,
    touched:false,caught:false,touchCooldown:0,spin:0,contactFlash:0,
    moveVel:item.cat==='move'?animLabMoveVelocity(item.key,sideSign):[0,0]
  };
  if(item.cat==='keeper'){
    const isSave=!/^(keeperIdle|sidestep|fallen|getup|miss)/.test(item.key);
    const sc=keeperScenarioForClip(item.key,animLab.mirror);
    sim.keeperScenario=sc;
    sim.keeperSub=animLab.keeperSub||'all';
    sim.isSave=isSave;
    sim.shotLaunched=false;
    sim.diveStarted=false;
    sim.shotDelay=.28; // Attacker winds up & strikes at t = 0.28s
    sim.keeperStartX=clamp(sc.shooter[0]*.22,-.9,.9);
    sim.keeperStartZ=sc.kind==='chip'&&isSave?4.85:.95;
    sim.keeperInterceptZ=sc.kind==='chip'?(sc.chipLevel==='low'?2.85:sc.chipLevel==='mid'?2.45:2.15):.95;
    const ballDirSide=Math.sign(sc.target[0]-sim.keeperStartX);
    const natSide=clipNaturalDiveSide(clip);
    // Automatically mirror the save animation if its natural dive side is opposite to the ball's target sector!
    sim.keeperMirror=isSave&&ballDirSide!==0&&natSide!==0?(natSide!==ballDirSide):animLab.mirror;
    // Solve exact drag+gravity launch velocity so the ball genuinely crosses z = 0 inside the target sector!
    const shotSpeed=sc.kind==='chip'?(sc.chipLevel==='low'?11.2:sc.chipLevel==='mid'?10.0:9.0):sc.kind==='close'?16.5:sc.kind==='low'?19.5:21.0;
    const chipTarget=sc.kind==='chip'
      ? [sc.target[0],sc.chipLevel==='low'?.46:sc.chipLevel==='mid'?1.38:2.18,sim.keeperInterceptZ]
      : sc.target;
    const solved=solveAnimLabShotToGoal([sc.shooter[0],.11,sc.shooter[2]],chipTarget,shotSpeed);
    sim.solvedVel=solved.vel;
    const ballArrival=sim.shotDelay+solved.flight*((sc.shooter[2]-sim.keeperInterceptZ)/Math.max(1,sc.shooter[2]-chipTarget[2]));
    const clipContact=clamp(clip.contact??dur*.45,.08,dur*.8);
    sim.diveDelay=isSave?Math.max(sim.shotDelay+.04,ballArrival-clipContact):99;
    sim.keeperClipTime=0;
    keeper.x=sim.keeperStartX;keeper.z=sim.keeperStartZ;keeper.yaw=Math.PI;
    if(isSave){
      player.x=sc.shooter[0];player.z=sc.shooter[2]+.55;
      player.yaw=Math.atan2(sc.shooter[0]-sc.target[0],sc.shooter[2]-sc.target[2]);
      ballPos=[sc.shooter[0],.11,sc.shooter[2]];
      ballVel=[0,0,0];
    }else{
      player.x=0;player.z=15.0;player.yaw=0;
      ballPos=[0,.11,14.3];
      ballVel=[0,0,0];
    }
  }else if(!item.clip.custom&&(item.cat==='move'||item.cat==='dribble'||item.cat==='shot')){
    const isShot=item.cat==='shot';
    const isDribble=item.cat==='dribble';
    const baseZ=isShot?(item.key==='penalty'?11.8:16.2):item.key==='idle'?16.5:21.0;
    motion.reset(player);
    player.x=0;player.z=baseZ;player.yaw=0;
    const isStanding=item.key==='idle'||item.key==='finesseStand';
    const startYaw=item.key==='shotSide'?Math.PI*.5*sideSign:item.key==='shotDiagonal'?Math.PI*.72*sideSign:item.key==='shotBack'?Math.PI:0;
    const startSpeed=isStanding?0:item.key==='penalty'?1.8:item.key==='sprint'||item.key==='sprintBall'||item.key==='dribbleWide'||item.key==='powerKick'?4.6:3.0;
    player.yaw=startYaw;
    player.vx=-Math.sin(startYaw)*startSpeed;
    player.vz=-Math.cos(startYaw)*startSpeed;
    player.grip=0;player.spawnControl=null;player.skipBootSweep=true;
    keeper.x=0;keeper.z=.9;keeper.yaw=Math.PI;
    ballState='controlled';
    if(item.key==='volley'){
      ballState='loose';
      ballPos=[sideSign*3.2,1.65,baseZ-1.4];
      ballVel=[-sideSign*4.6,2.1,-.4];
    }else{
      const fx=-Math.sin(startYaw),fz=-Math.cos(startYaw);
      ballPos=[player.x+fx*.48+sideSign*.12,.11,player.z+fz*.48];
      ballVel=[player.vx,0,player.vz];
    }
    ballAngular.splice(0,3,0,0,0);
    sim.liveScene=item.cat;
    sim.liveStartYaw=startYaw;
    sim.liveTriggered=false;
    sim.liveCut=null;
    sim.shotApproach=isShot?(item.key==='finesseStand'?.14:item.key==='penalty'?.22:item.key==='volley'?.38:.46):0;
    sim.shotFired=false;
    mocap.update(player,{clip:'idle',grounded:true,bodyYaw:startYaw,fade:.001},1);
  }else if(item.procedural){
    motion.reset(player);
    player.x=0;player.z=17.5;player.yaw=0;player.vx=0;player.vz=-2.8;
    keeper.x=0;keeper.z=.9;keeper.yaw=Math.PI;
    ballPos=[sideSign*.14,.11,16.95];
    ballVel=[0,0,-2.8];
    sim.procTriggered=false;
    sim.procCut=null;
    mocap.update(player,{clip:'idle',grounded:true,bodyYaw:0,fade:.001},.016);
  }else{
    const baseZ=item.cat==='shot'?14.5:item.cat==='move'&&item.key!=='idle'?21.0:16.5;
    player.x=0;player.z=baseZ;player.yaw=0;
    keeper.x=0;keeper.z=.9;keeper.yaw=Math.PI;
    if(item.cat==='shot'){
      const hitPt=findStrikingBootPoint(item,baseZ,contact);
      if(item.key==='volley'){
        const flight=Math.max(.22,contact);
        const startPt=[hitPt[0]+sideSign*2.4,Math.max(.9,hitPt[1]+.35),hitPt[2]-.15];
        const targetPt=[hitPt[0],Math.max(.45,hitPt[1]),hitPt[2]];
        ballPos=[...startPt];
        ballVel=[
          (targetPt[0]-startPt[0])/flight,
          (targetPt[1]-startPt[1]+.5*9.81*flight*flight)/flight,
          (targetPt[2]-startPt[2])/flight
        ];
      }else{
        // Place ball dead-center at the exact 3D striking boot impact point!
        ballPos=[hitPt[0],.11,hitPt[2]-.04];
        ballVel=[0,0,0];
      }
    }else if(item.cat==='dribble'){
      const hitPt=findStrikingBootPoint(item,baseZ,contact);
      ballPos=[hitPt[0],.11,hitPt[2]-.03];
      ballVel=[0,0,0];
    }else if(item.cat==='defender'){
      const hitPt=findStrikingBootPoint(item,baseZ,contact);
      // Roll ball gently toward the tackler's contact point like an opponent dribbling into the tackle
      const approachZ=-1.2;
      ballPos=[hitPt[0],.11,hitPt[2]-approachZ*contact];
      ballVel=[0,0,approachZ];
    }else if(item.key==='idle'){
      ballPos=[sideSign*.24,.11,baseZ-.38];
      ballVel=[0,0,0];
    }else{
      const [vx,vz]=sim.moveVel;
      const spd=Math.hypot(vx,vz)||1;
      const dirX=vx/spd,dirZ=vz/spd;
      ballPos=[dirX*.42+sideSign*.08,.11,baseZ+dirZ*.42];
      ballVel=[vx*.96,0,vz*.96];
    }
  }
  animLab.sim=sim;
}
function advanceAnimLabStep(item,h,totalSimTime){
  const sim=animLab.sim;
  const clip=item.clip,dur=Math.max(.08,clip.duration);
  const isLoop=item.cat==='move'||/^(keeperIdle|sidestep)/.test(item.key);
  // In Edit mode, lock clip playback directly to the exact selected frame so edits always stay on that exact frame!
  const directEdit=animLab.tab==='edit'&&!animLab.playing&&!item.procedural;
  const clipTime=directEdit?clamp(animLab.editFrame/clip.fps,0,dur):(isLoop?(totalSimTime%dur):clamp(totalSimTime,0,dur));
  animLab.displayedFrame=clamp(Math.round(clipTime*clip.fps),0,clip.frames-1);
  const sideSign=animLab.mirror?-1:1;
  const [rootX,rootZ]=sampleClipRootOffset(clip,clipTime,animLab.mirror);
  const isAerial=item.key==='volley'||Boolean(clip.rootMotion)||/^(dive|gkTipOver|gkChip|saveHigh|saveStretch|saveTopCatch|catch4|fallen|defSlide)/.test(item.key);

  sim.touchCooldown=Math.max(0,sim.touchCooldown-h);
  sim.contactFlash=Math.max(0,sim.contactFlash-h);

  // 1. Update actor pose & real physical position
  if(item.cat==='keeper'){
    const sc=sim.keeperScenario;
    if(directEdit){
      const kMir=Boolean(sim.keeperMirror);
      const [kRx,kRz]=sampleClipRootOffset(clip,clipTime,kMir);
      keeper.x=kRx;keeper.z=.95+kRz;keeper.yaw=Math.PI;
      mocap.update(keeper,{
        clip:item.key,time:clipTime,loop:false,mirror:kMir,
        authoredGround:Boolean(clip.rootMotion||isAerial),
        grounded:!clip.rootMotion&&!isAerial,
        airborne:isAerial&&!clip.rootMotion,
        fade:.001,bodyYaw:Math.PI
      },.016);
      mocap.update(player,{clip:'idle',grounded:true,bodyYaw:0,fade:.001},.016);
      return;
    }
    if(sim.isSave){
      // Attacker plays real kick animation and launches the ball toward the target goal sector!
      const shotClip=sc.kind==='chip'?'kick2':sc.kind==='corner'?'powerKick':'kick';
      mocap.update(player,{clip:shotClip,time:clamp(totalSimTime,0,1.2),loop:false,grounded:true,bodyYaw:player.yaw,fade:totalSimTime<.04?.001:.08},h);
      if(!sim.shotLaunched&&totalSimTime>=sim.shotDelay){
        sim.shotLaunched=true;
        ballVel=[...sim.solvedVel];
      }
      // Goalkeeper waits (or backpedals on a lob/chip) until reaction time, then activates the save clip toward the sector
      if(totalSimTime<sim.diveDelay){
        const isChip=sc.kind==='chip';
        const retreatT=isChip&&totalSimTime>sim.shotDelay
          ? smooth(clamp((totalSimTime-sim.shotDelay)/Math.max(.2,sim.diveDelay-sim.shotDelay),0,1)):0;
        keeper.x=sim.keeperStartX;
        keeper.z=mix(sim.keeperStartZ??.95,sim.keeperInterceptZ??.95,retreatT);
        keeper.yaw=Math.PI;
        const waitClip=isChip&&retreatT>.04&&retreatT<.96?'sidestep':'keeperIdle';
        mocap.update(keeper,{clip:waitClip,time:totalSimTime*(waitClip==='sidestep'?1.35:1),loop:true,grounded:true,bodyYaw:Math.PI,fade:.12,lookTarget:ballPos},h);
      }else{
        sim.keeperClipTime=clamp(totalSimTime-sim.diveDelay,0,dur);
        const kMir=Boolean(sim.keeperMirror);
        const [kRx,kRz]=sampleClipRootOffset(clip,sim.keeperClipTime,kMir);
        const reachProgress=smooth(clamp(sim.keeperClipTime/Math.max(.18,clip.contact??dur*.48),0,1));
        const targetShift=clamp((sc.target[0]-sim.keeperStartX)*.72,-2.25,2.25)*reachProgress;
        const diveShift=clip.rootMotion?(kRx+(targetShift-kRx)*.45):targetShift;
        keeper.x=clamp(sim.keeperStartX+diveShift,-3.35,3.35);
        keeper.z=(sim.keeperInterceptZ??.95)+kRz;
        keeper.yaw=Math.PI;
        mocap.update(keeper,{
          clip:item.key,time:sim.keeperClipTime,loop:false,mirror:kMir,
          authoredGround:Boolean(clip.rootMotion||isAerial),
          grounded:!clip.rootMotion&&!isAerial,
          airborne:isAerial&&!clip.rootMotion,
          fade:.085,bodyYaw:Math.PI
        },h);
      }
    }else{
      keeper.x=rootX;keeper.z=.95+rootZ;keeper.yaw=Math.PI;
      mocap.update(keeper,{
        clip:item.key,time:clipTime,loop:isLoop,mirror:animLab.mirror,
        authoredGround:Boolean(clip.rootMotion||isAerial),
        grounded:!clip.rootMotion&&!isAerial,
        airborne:isAerial&&!clip.rootMotion,
        fade:totalSimTime<.04?.001:.09,bodyYaw:Math.PI,lookTarget:ballPos
      },h);
      mocap.update(player,{clip:'idle',grounded:true,bodyYaw:0,fade:.12},h);
    }
  }else if(sim.liveScene&&!directEdit&&!(animLab.tab==='edit'&&clip.previewTrack?.length)){
    // Real gameplay inputs + motion.move() + motion.locomotion() + real ball physics for Movimentação, Dribles & Chutes!
    const key=item.key;
    const curRig=mocap.get(player);
    player.bootVolumesBefore=player.skipBootSweep?null:curRig?.bootVolumes;
    player.bootsBefore=player.skipBootSweep?null:curRig?.boots;
    player.skipBootSweep=false;

    if(sim.liveScene==='move'){
      if(key==='idle'||key==='sillyDancing'||key==='victory'||key==='soccerTrip'||key==='soccerTackleFront'||key==='soccerTackleSide'){
        player.x=0;player.z=16.5;player.yaw=0;
        const loopClip=key==='idle'||key==='sillyDancing'||key==='victory';
        const showTime=loopClip?totalSimTime:clamp(totalSimTime,0,dur);
        mocap.update(player,{clip:key,time:showTime,loop:loopClip,mirror:animLab.mirror,grounded:true,authoredGround:!loopClip,fade:totalSimTime<.04?.001:.12,bodyYaw:0,lookTarget:ballPos},h);
        mocap.update(keeper,{clip:'keeperIdle',time:totalSimTime,loop:true,grounded:true,bodyYaw:Math.PI,fade:.18,lookTarget:ballPos},h);
        return;
      }
      const offBall=/^(standardWalk|walkingLeftTurn|walkingTurn180|idleToSprint|sprint|changeDirection)$/.test(key);
      let speed=3.55,sprint=false,wishYaw=0;
      if(key==='standardWalk'){speed=1.65;}
      else if(key==='walkingLeftTurn'){speed=1.65;wishYaw=.78*sideSign;}
      else if(key==='walkingTurn180'){speed=1.85;wishYaw=totalSimTime>.95?Math.PI:0;}
      else if(key==='idleToSprint'){speed=totalSimTime<.35?0:5.4;sprint=totalSimTime>=.35;}
      else if(key==='changeDirection'){speed=5.2;sprint=true;wishYaw=totalSimTime>.95?Math.PI:0;}
      else if(key==='runningToTurn'){speed=4.6;sprint=true;wishYaw=totalSimTime>.95?Math.PI:0;}
      else if(key==='jog'){speed=2.45;}
      else if(key==='runBall'){speed=3.55;}
      else if(key==='sprint'||key==='sprintBall'){speed=5.4;sprint=true;}
      else if(key==='messiClose'){speed=2.75;wishYaw=Math.sin(totalSimTime*2.8)*.48*sideSign;}
      else if(key==='dribbleSide'){speed=3.4;wishYaw=smooth(totalSimTime/1.8)*1.15*sideSign;}
      else if(key==='dribbleWide'){speed=4.9;sprint=true;wishYaw=smooth(totalSimTime/1.9)*.92*sideSign;}
      else if(key==='left'){speed=3.2;wishYaw=-Math.PI*.5*sideSign;}
      else if(key==='right'){speed=3.2;wishYaw=Math.PI*.5*sideSign;}
      else if(key==='backward'){speed=2.8;wishYaw=Math.PI;}
      if(offBall){ballPos=[0,-10,0];ballVel=[0,0,0];}
      const dir=[-Math.sin(wishYaw),-Math.cos(wishYaw)];
      moveSpeed=motion.move(player,{dt:h,direction:dir,speed,sprint,ball:ballPos,velocity:ballVel,controlled:!offBall});
      if(!offBall){
        const rev=player.turningAround;
        if(rev?.phase==='plant'&&rev.action.withBall)ballPhysics.brakeDribble(ballPos,ballVel,1.05,22,h);
        if(rev?.action?.withBall&&rev.phase==='pull'&&rev.action.pullAxis){
          const [ax,az]=rev.action.pullAxis,db=1-Math.exp(-h*22);
          ballVel[0]=mix(ballVel[0],ax*3.1,db);ballVel[2]=mix(ballVel[2],az*3.1,db);
        }
        guideDribble(h,true,rev);
      }
      const pose=motion.locomotion(player,{dt:h,ball:ballPos,velocity:ballVel,controlled:!offBall,ankles:curRig?.ankles});
      pose.lookTarget=ballPos;
      mocap.update(player,pose,h);
      mocap.update(keeper,{clip:'keeperIdle',time:totalSimTime,loop:true,grounded:true,bodyYaw:Math.PI,fade:.18,lookTarget:ballPos},h);
      const wasUsed=Boolean(player.touchPending?.used);
      advancePlayerBall(h,0,1);
      if(!wasUsed&&player.touchPending?.used)sim.contactFlash=.22;
      return;
    }

    if(sim.liveScene==='dribble'){
      const triggerAt=.36;
      const isPull=key==='solePull'||key==='dragBack';
      const isFake=key==='fakeCut';
      const cutSign=(/Left/.test(key)?-1:1)*sideSign;
      const wishYaw=totalSimTime<triggerAt?0:(isPull?Math.PI:cutSign*1.20);
      let requestCut=false;
      if(isFake&&!sim.liveTriggered&&totalSimTime>=triggerAt){
        sim.liveTriggered=true;
        sim.liveCut={side:cutSign,from:player.yaw,heading:cutSign*1.18,elapsed:0,strike:.32,duration:.50,lateral:true,touched:false};
      }else if(!isPull&&!isFake&&!sim.liveTriggered&&totalSimTime>=triggerAt){
        sim.liveTriggered=true;
        requestCut=true;
      }
      if(sim.liveCut){
        sim.liveCut.elapsed+=h;
        if(sim.liveCut.elapsed>=sim.liveCut.duration)sim.liveCut=null;
      }
      const dir=[-Math.sin(wishYaw),-Math.cos(wishYaw)];
      moveSpeed=motion.move(player,{dt:h,direction:dir,speed:3.8,sprint:false,ball:ballPos,velocity:ballVel,controlled:true,requestCut,fakeCut:Boolean(sim.liveCut)&&!sim.liveCut.touched,lateralCut:sim.liveCut});
      if(requestCut){
        ballVel[0]=dir[0]*4.5;ballVel[2]=dir[1]*4.5;
        player.travelYaw=wishYaw;
        sim.contactFlash=.22;
      }
      const rev=player.turningAround;
      if(rev?.phase==='plant'&&rev.action.withBall){
        ballPhysics.brakeDribble(ballPos,ballVel,1.05,22,h);
      }else if(rev?.action?.withBall&&(rev.phase==='pull'||rev.phase==='pivot')&&rev.action.pullAxis){
        const [ax,az]=rev.action.pullAxis;
        const dragBlend=1-Math.exp(-h*(rev.phase==='pull'?22:14));
        if(rev.phase==='pull'){
          ballVel[0]=mix(ballVel[0],ax*4.2,dragBlend);
          ballVel[2]=mix(ballVel[2],az*4.2,dragBlend);
          sim.contactFlash=.20;
        }else{
          const ex=rev.action.target??player.yaw;
          ballVel[0]=mix(ballVel[0],(player.x-Math.sin(ex)*.48-ballPos[0])*6.5+player.vx,dragBlend);
          ballVel[2]=mix(ballVel[2],(player.z-Math.cos(ex)*.48-ballPos[2])*6.5+player.vz,dragBlend);
        }
      }
      if(sim.liveCut&&!sim.liveCut.touched){
        if(sim.liveCut.elapsed<sim.liveCut.strike){
          ballPhysics.brakeDribble(ballPos,ballVel,1.35,14,h);
        }else{
          const ex=-Math.sin(sim.liveCut.heading),ez=-Math.cos(sim.liveCut.heading);
          ballVel[0]=ex*4.5;ballVel[2]=ez*4.5;
          player.vx=ex*3.9;player.vz=ez*3.9;
          player.yaw=sim.liveCut.heading;player.travelYaw=sim.liveCut.heading;
          sim.liveCut.touched=true;sim.liveCut.touchedAt=sim.liveCut.elapsed;
          sim.contactFlash=.22;
        }
      }
      if(!sim.liveCut||sim.liveCut.touched)guideDribble(h,true,rev);
      const pose=motion.locomotion(player,{dt:h,ball:ballPos,velocity:ballVel,controlled:true,ankles:curRig?.ankles,lateralCut:sim.liveCut});
      pose.lookTarget=ballPos;
      mocap.update(player,pose,h);
      mocap.update(keeper,{clip:'keeperIdle',time:totalSimTime,loop:true,grounded:true,bodyYaw:Math.PI,fade:.18,lookTarget:ballPos},h);
      const wasUsed=Boolean(player.touchPending?.used);
      advancePlayerBall(h,0,1);
      if(!wasUsed&&player.touchPending?.used)sim.contactFlash=.22;
      return;
    }

    if(sim.liveScene==='shot'){
      const approach=sim.shotApproach||.45;
      const isVolley=key==='volley';
      if(totalSimTime<approach){
        const spd=key==='finesseStand'?0:key==='penalty'?2.0:key==='powerKick'?4.8:3.3;
        const wy=sim.liveStartYaw||0;
        moveSpeed=motion.move(player,{dt:h,direction:[-Math.sin(wy),-Math.cos(wy)],speed:spd,sprint:key==='powerKick',ball:ballPos,velocity:ballVel,controlled:!isVolley});
        if(!isVolley)guideDribble(h,true,null);
        const pose=motion.locomotion(player,{dt:h,ball:ballPos,velocity:ballVel,controlled:!isVolley,ankles:curRig?.ankles});
        pose.lookTarget=[0,1.2,0];
        mocap.update(player,pose,h);
        if(isVolley)ballPhysics.step(ballPos,ballVel,ballAngular,h,true);
        else advancePlayerBall(h,0,1);
      }else{
        const sTime=totalSimTime-approach;
        const strike=motion.shotContact(key);
        const clipStart=key==='penalty'?.30:0;
        const playDur=key==='penalty'?.66:(clip.playDuration||.56);
        const clipEnd=key==='penalty'?1.30:dur;
        const rate=(clipEnd-clipStart)/playDur;
        const cTime=clamp(clipStart+sTime*rate,0,dur);
        const impactAt=Math.max(.06,(strike.time-clipStart)/rate);
        const aimYaw=Math.atan2(player.x-sideSign*1.8,player.z);
        player.yaw+=signedTurn(aimYaw-player.yaw)*clamp(h*14,0,1);
        player.vx*=Math.exp(-h*6);player.vz*=Math.exp(-h*6);
        player.x+=player.vx*h;player.z+=player.vz*h;
        mocap.update(player,{
          clip:key,time:cTime,loop:false,mirror:animLab.mirror,
          grounded:!isVolley,airborne:isVolley,fade:.15,bodyYaw:player.yaw,lookTarget:[sideSign*1.8,1.3,0]
        },h);
        if(!sim.shotFired&&sTime>=impactAt){
          sim.shotFired=true;
          sim.contactFlash=.28;
          const isPower=key==='powerKick';
          const isChip=key==='kick2';
          const isFinesse=key==='penalty'||/finesse/.test(key);
          const targetX=isFinesse?-sideSign*2.7:sideSign*1.9;
          const targetY=isChip?2.05:isPower?1.65:1.25;
          const spd=isPower?27.5:isChip?13.2:isFinesse?21.5:23.0;
          const solved=solveAnimLabShotToGoal([ballPos[0],ballPos[1],ballPos[2]],[targetX,targetY,0],spd);
          ballVel=[...solved.vel];
          ballAngular.splice(0,3,0,isFinesse?sideSign*16:0,0);
          ballState='flight';
        }
        if(sim.shotFired||isVolley)ballPhysics.step(ballPos,ballVel,ballAngular,h,true);
        else advancePlayerBall(h,0,1);
      }
      mocap.update(keeper,{clip:'keeperIdle',time:totalSimTime,loop:true,grounded:true,bodyYaw:Math.PI,fade:.18,lookTarget:ballPos},h);
      return;
    }
  }else if(clip.previewTrack?.length){
    const tr=clip.previewTrack;
    const fPos=clamp(clipTime*clip.fps,0,tr.length-1);
    const lo=Math.floor(fPos),hi=Math.min(tr.length-1,lo+1),a=fPos-lo;
    const pA=tr[lo],pB=tr[hi];
    const baseZ=17.0;
    const mir=animLab.mirror?-1:1;
    const px=mix(pA.x,pB.x,a)*mir;
    const pz=mix(pA.z,pB.z,a);
    const pyaw=(pA.yaw+signedTurn(pB.yaw-pA.yaw)*a)*mir;
    const bx=mix(pA.bx,pB.bx,a)*mir;
    const by=mix(pA.by,pB.by,a);
    const bz=mix(pA.bz,pB.bz,a);
    player.x=px;player.z=baseZ+pz;player.yaw=pyaw;
    ballPos=[bx,by,baseZ+bz];
    ballVel=[0,0,0];
    if(pA.flash||pB.flash)sim.contactFlash=.22;
    mocap.update(player,{
      clip:item.key,time:clipTime,loop:false,mirror:animLab.mirror,
      grounded:true,fade:directEdit||totalSimTime<.04?.001:.09,
      bodyYaw:pyaw,lookTarget:directEdit?null:ballPos
    },directEdit?.016:h);
    mocap.update(keeper,{clip:'keeperIdle',time:directEdit?0:totalSimTime,loop:true,grounded:true,bodyYaw:Math.PI,fade:directEdit?.001:.18,lookTarget:ballPos},directEdit?.016:h);
    return;
  }else{
    if(directEdit){
      const baseZ=item.cat==='shot'?14.5:16.5;
      player.x=rootX;player.z=baseZ+rootZ;player.yaw=0;
      mocap.update(player,{
        clip:item.key,time:clipTime,loop:false,mirror:animLab.mirror,
        authoredGround:Boolean(clip.rootMotion||isAerial),
        grounded:!clip.rootMotion&&!isAerial,
        airborne:isAerial&&!clip.rootMotion,
        fade:.001,bodyYaw:0
      },.016);
      mocap.update(keeper,{clip:'keeperIdle',time:0,loop:true,grounded:true,bodyYaw:Math.PI,fade:.001},.016);
      return;
    }
    if(item.cat==='move'&&item.key!=='idle'){
      player.x+=sim.moveVel[0]*h;
      player.z+=sim.moveVel[1]*h;
    }else{
      const baseZ=item.cat==='shot'?14.5:16.5;
      player.x=rootX;player.z=baseZ+rootZ;
    }
    player.yaw=0;
    mocap.update(player,{
      clip:item.key,time:clipTime,loop:isLoop,mirror:animLab.mirror,
      authoredGround:Boolean(clip.rootMotion||isAerial),
      grounded:!clip.rootMotion&&!isAerial,
      airborne:isAerial&&!clip.rootMotion,
      fade:totalSimTime<.04?.001:.09,bodyYaw:0,lookTarget:item.cat==='shot'?[0,1.2,0]:ballPos
    },h);
    mocap.update(keeper,{clip:'keeperIdle',time:totalSimTime,loop:true,grounded:true,bodyYaw:Math.PI,fade:.18,lookTarget:ballPos},h);
  }

  // 2. Real ball physics (gravity, Magnus curve, air drag, bounce, turf friction, net)
  if(sim.caught){
    const kRig=mocap.get(keeper);
    if(kRig?.hands?.[0]&&kRig?.hands?.[1]){
      ballPos=[
        (kRig.hands[0][0]+kRig.hands[1][0])*.5,
        Math.max(.11,(kRig.hands[0][1]+kRig.hands[1][1])*.5),
        (kRig.hands[0][2]+kRig.hands[1][2])*.5
      ];
    }
    ballVel=[0,0,0];
  }else{
    if(ballPos[1]>.112||ballVel[1]>0)ballVel[1]-=9.81*h;
    if(Math.abs(sim.spin)>.05&&Math.hypot(ballVel[0],ballVel[2])>2){
      ballVel[0]+=sim.spin*ballVel[2]*.028*h;
      ballVel[2]-=sim.spin*ballVel[0]*.028*h;
    }
    const drag=Math.max(0,1-.22*h);
    ballVel[0]*=drag;ballVel[1]*=drag;ballVel[2]*=drag;
    ballPos[0]+=ballVel[0]*h;
    ballPos[1]+=ballVel[1]*h;
    ballPos[2]+=ballVel[2]*h;
    if(ballPos[1]<=.11){
      ballPos[1]=.11;
      if(ballVel[1]<-.55){
        ballVel[1]=-ballVel[1]*.54;
        ballVel[0]*=.86;ballVel[2]*=.86;
      }else{
        ballVel[1]=0;
        const spd=Math.hypot(ballVel[0],ballVel[2]);
        if(spd>.005){
          const next=Math.max(0,spd-(1.75+.16*spd)*h);
          ballVel[0]*=next/spd;ballVel[2]*=next/spd;
        }
      }
      sim.spin*=Math.max(0,1-3*h);
    }
    const groundSpd=Math.hypot(ballVel[0],ballVel[2]);
    if(groundSpd>.02){
      ballRotation[0]+=ballVel[2]/(.11)*h;
      ballRotation[2]-=ballVel[0]/(.11)*h;
    }
    // Real net containment when a shot or missed save enters the goal
    if(ballPos[2]<0&&Math.abs(ballPos[0])<3.75&&ballPos[1]<2.55){
      goalNet.contain(ballPos,ballVel);
    }
    goalNet.step(h);
  }

  // 3. Real 3D Rectangular Hitbox (OBB) Contact Detection following the skeleton
  if(item.cat==='keeper'){
    const kRig=mocap.get(keeper);
    const isSave=!/^(keeperIdle|sidestep|fallen|getup|miss)/.test(item.key);
    if(isSave&&!sim.caught&&sim.touchCooldown<=0&&kRig?.hitboxes?.length){
      let hitBox=null;
      for(const box of kRig.hitboxes){
        if(mocap.sphereHitsBox(ballPos,.125,box)){hitBox=box;break;}
      }
      if(hitBox){
        sim.touched=true;
        sim.touchCooldown=.55;
        sim.contactFlash=.28;
        if(/^(catch|scoop|gkCatch|gkSmother|saveLowCatch|saveGroundScoop|saveKneeScoop|saveQuickScoop|saveChestCatch|saveTopCatch)/.test(item.key)){
          sim.caught=true;
          ballVel=[0,0,0];
        }else{
          const dirX=Math.sign(ballPos[0]-keeper.x)||sideSign;
          ballVel=[dirX*4.2+ballVel[0]*-.15,Math.max(2.6,Math.abs(ballVel[1])*.4+2.2),Math.abs(ballVel[2])*.42+3.0];
        }
      }
    }
  }else if(item.key!=='idle'&&!item.procedural&&sim.touchCooldown<=0){
    const pRig=mocap.get(player);
    let hitBox=null,hitDist=Infinity;
    for(const box of pRig?.hitboxes||[]){
      const activePart=box.part==='boot'||(item.cat==='defender'&&box.part==='leg');
      if(!activePart)continue;
      const res=mocap.sphereHitsBox(ballPos,.13,box);
      if(res&&res.dist<hitDist){hitDist=res.dist;hitBox=box;}
    }
    if(hitBox){
      sim.touched=true;
      sim.contactFlash=.22;
      if(item.cat==='shot'){
        sim.touchCooldown=.80;
        const isPower=item.key==='powerKick';
        const isChip=item.key==='kick2';
        const isFinesse=/finesse/.test(item.key);
        const spd=isPower?24.5:isChip?13.5:isFinesse?19.0:20.5;
        const lift=isPower?4.8:isChip?7.6:isFinesse?4.2:3.8;
        const aimX=isFinesse?-sideSign*2.6:sideSign*1.2;
        const dx=aimX-ballPos[0],dz=0-ballPos[2],len=Math.hypot(dx,dz)||1;
        ballVel=[dx/len*spd+(isFinesse?sideSign*3.2:0),lift,dz/len*spd];
        sim.spin=isFinesse?sideSign*10.5:0;
      }else if(item.cat==='dribble'){
        sim.touchCooldown=.55;
        if(item.key==='dragBack'){
          ballVel=[0,0,3.4];
        }else{
          const dir=(/Left/.test(item.key)?-1:1)*sideSign;
          ballVel=[dir*4.2,0,-2.6];
        }
      }else if(item.cat==='defender'){
        sim.touchCooldown=.65;
        ballVel=[sideSign*5.4,1.6,-3.8];
      }else{
        // Real dribble touch off rectangular boot OBB — keep continuous control in the running lane!
        sim.touchCooldown=.15;
        const [vx,vz]=sim.moveVel;
        const spd=Math.hypot(vx,vz)||1;
        const dirX=vx/spd,dirZ=vz/spd;
        const boost=/sprint/i.test(item.key)?1.28:item.key==='messiClose'?1.12:1.20;
        const idealX=player.x+dirX*.58,idealZ=player.z+dirZ*.58;
        const corrX=clamp((idealX-ballPos[0])*2.2,-1.4,1.4);
        const corrZ=clamp((idealZ-ballPos[2])*2.2,-1.4,1.4);
        ballVel=[vx*boost+corrX,0,vz*boost+corrZ];
      }
    }
  }
  // Gentle dribble-control leash during running clips so the player keeps ball possession like in a real match
  if(item.cat==='move'&&item.key!=='idle'){
    const [vx,vz]=sim.moveVel;
    const spd=Math.hypot(vx,vz)||1;
    const dirX=vx/spd,dirZ=vz/spd;
    const idealLead=/sprint/i.test(item.key)?.66:item.key==='messiClose'?.40:.52;
    const targetX=player.x+dirX*idealLead,targetZ=player.z+dirZ*idealLead;
    const errX=targetX-ballPos[0],errZ=targetZ-ballPos[2];
    const errDist=Math.hypot(errX,errZ);
    if(errDist>.36){
      const pull=clamp((errDist-.36)*7.5,0,6.5)*h;
      ballVel[0]+=errX/errDist*pull;
      ballVel[2]+=errZ/errDist*pull;
    }
  }
}
function stepAnimLab(dt){
  if(!animLab||!mocap)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey)||animLab.catalog[0];
  if(!item)return;
  const clip=item.clip;
  const dur=Math.max(.08,clip.duration);
  const isMoveRun=item.cat==='move'&&item.key!=='idle';
  const isKeeperSave=item.cat==='keeper'&&!/^(keeperIdle|sidestep|fallen|getup|miss)/.test(item.key);
  const isLoop=item.cat==='move'||/^(keeperIdle|sidestep)/.test(item.key);
  const needReset=!animLab.sim||animLab.sim.key!==item.key||animLab.sim.mirror!==animLab.mirror||(item.cat==='keeper'&&animLab.sim.keeperSub!==(animLab.keeperSub||'all'));
  if(needReset){
    resetAnimLabSim(item);
  }
  const isChipSim=isKeeperSave&&animLab.sim?.keeperScenario?.kind==='chip';
  const liveScene=animLab.sim?.liveScene;
  const cycle=item.key==='idle'?dur:liveScene==='move'?2.8:liveScene==='dribble'?2.15:liveScene==='shot'?2.25:isMoveRun?Math.max(2.4,dur*2):isChipSim?Math.max(dur+1.9,(animLab.sim.diveDelay||1.1)+dur+.45):isKeeperSave?(dur+1.25):isLoop?dur:dur+.75;

  if(animLab.playing){
    const prevT=animLab.time;
    animLab.time+=dt*animLab.speed;
    if(animLab.time>=cycle){
      animLab.time=0;
      resetAnimLabSim(item);
    }else{
      const stepDt=animLab.time-prevT;
      const subSteps=Math.max(1,Math.ceil(stepDt/(liveScene?1/60:1/120)));
      const h=stepDt/subSteps;
      for(let s=0;s<subSteps;s++){
        animLab.sim.simTime+=h;
        advanceAnimLabStep(item,h,animLab.sim.simTime);
      }
    }
  }else if(animLab.tab==='edit'&&!item.procedural){
    // Frozen on exact editFrame while refreshing live bone/hitbox edits without advancing simulation
    advanceAnimLabStep(item,0,clamp((animLab.editFrame??0)/clip.fps,0,dur));
  }else{
    // Paused in Validate mode or procedural clip: only step when scrubbed/frame-stepped, otherwise stay 100% frozen
    const targetT=clamp(animLab.time,0,cycle);
    if(Math.abs(targetT-animLab.sim.simTime)>.0015){
      if(targetT<animLab.sim.simTime)resetAnimLabSim(item);
      const remain=targetT-animLab.sim.simTime;
      const subSteps=Math.max(1,Math.min(180,Math.ceil(remain/(1/60))));
      const h=remain/subSteps;
      for(let s=0;s<subSteps;s++){
        animLab.sim.simTime+=h;
        advanceAnimLabStep(item,h,animLab.sim.simTime);
      }
    }
  }

  const clipT=animLab.tab==='edit'&&!animLab.playing&&!item.procedural
    ?clamp((animLab.editFrame??0)/clip.fps,0,dur)
    :(isLoop?(animLab.time%dur):clamp(animLab.time,0,dur));
  const u=clipT/dur;
  const frameNow=clamp(Math.round(clipT*clip.fps),0,clip.frames-1);
  animLab.editFrame=frameNow;
  $('#animLabScrub').value=String(Math.round(u*1000));
  $('#animLabTime').textContent=`Q ${frameNow+1}/${clip.frames}`;
}
const animEditableBones=[
  {group:'Tronco e Cabeça',bones:[
    ['Hips','Quadril (raiz)'],['Spine','Coluna baixa'],['Spine1','Coluna média'],['Spine2','Peito / Tronco'],
    ['Neck','Pescoço'],['Head','Cabeça']
  ]},
  {group:'Braço Esquerdo',bones:[
    ['LeftShoulder','Ombro esquerdo'],['LeftArm','Braço esquerdo'],['LeftForeArm','Antebraço esquerdo'],['LeftHand','Mão esquerda']
  ]},
  {group:'Braço Direito',bones:[
    ['RightShoulder','Ombro direito'],['RightArm','Braço direito'],['RightForeArm','Antebraço direito'],['RightHand','Mão direita']
  ]},
  {group:'Perna Esquerda',bones:[
    ['LeftUpLeg','Coxa esquerda'],['LeftLeg','Joelho / Canela esq.'],['LeftFoot','Pé esquerdo'],['LeftToeBase','Ponta do pé esq.']
  ]},
  {group:'Perna Direita',bones:[
    ['RightUpLeg','Coxa direita'],['RightLeg','Joelho / Canela dir.'],['RightFoot','Pé direito'],['RightToeBase','Ponta do pé dir.']
  ]}
];
const animEditableSet=new Set(animEditableBones.flatMap(g=>g.bones.map(b=>b[0])));
const animBoneLabelMap=Object.fromEntries(animEditableBones.flatMap(g=>g.bones));

function animQuatMul(a,b){
  return [
    a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
    a[3]*b[1]+a[1]*b[3]+a[2]*b[0]-a[0]*b[2],
    a[3]*b[2]+a[2]*b[3]+a[0]*b[1]-a[1]*b[0],
    a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]
  ];
}
function animEulerToQuat(rx,ry,rz){
  let q=[0,0,0,1];
  const axes=[rx,ry,rz];
  for(let a=0;a<3;a++){
    const d=[0,0,0,Math.cos(axes[a]*.5)];
    d[a]=Math.sin(axes[a]*.5);
    q=animQuatMul(q,d);
  }
  const len=Math.hypot(...q)||1;
  return q.map(v=>v/len);
}
function animQuatToEuler(q){
  const len=Math.hypot(...q)||1;
  const x=q[0]/len,y=q[1]/len,z=q[2]/len,w=q[3]/len;
  const ry=Math.asin(clamp(2*(w*y+x*z),-1,1));
  const rx=Math.atan2(2*(w*x-y*z),1-2*(x*x+y*y));
  const rz=Math.atan2(2*(w*z-x*y),1-2*(y*y+z*z));
  return [rx,ry,rz];
}
function animQuatLerp(a,b,t){
  const s=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]<0?-1:1;
  const out=[a[0]+(b[0]*s-a[0])*t,a[1]+(b[1]*s-a[1])*t,a[2]+(b[2]*s-a[2])*t,a[3]+(b[3]*s-a[3])*t];
  const l=Math.hypot(...out)||1;
  return out.map(v=>v/l);
}
function populateAnimBoneSelect(){
  const sel=$('#animBoneSelect');
  if(!sel||sel.options.length)return;
  for(const grp of animEditableBones){
    const og=document.createElement('optgroup');
    og.label=grp.group;
    for(const [name,label] of grp.bones){
      if(mocap?.byName?.[name]===undefined)continue;
      const opt=document.createElement('option');
      opt.value=name;
      opt.textContent=`${label} (${name})`;
      og.appendChild(opt);
    }
    sel.appendChild(og);
  }
}
function animCurrentFrame(){
  const item=animLab?.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item)return 0;
  if(animLab.editFrame!==undefined&&animLab.tab==='edit'&&!animLab.playing){
    return clamp(animLab.editFrame,0,item.clip.frames-1);
  }
  const dur=Math.max(.08,item.clip.duration);
  const isLoop=item.cat==='move'||/^(keeperIdle|sidestep)/.test(item.key);
  const t=isLoop?(animLab.time%dur):clamp(animLab.time,0,dur);
  return clamp(Math.round(t*item.clip.fps),0,item.clip.frames-1);
}
function syncAnimEditorSliders(){
  if(!animLab||!mocap)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item)return;
  if(item.procedural){
    $('#animEditFrameLabel').textContent='Animação procedural (gerada pelo código)';
    $('#animEditStatus').textContent='Esta animação é procedural (football-motion.js). Para editar ossos quadro a quadro, selecione um clipe de mocap ou crie um manual-*.';
    return;
  }
  const clip=item.clip,frameIdx=animCurrentFrame();
  $('#animEditFrameLabel').textContent=`Quadro ${frameIdx+1} / ${clip.frames}`+(mocap.editedClipKeys.has(item.key)?' · editado':'');
  const boneName=animLab.selectedBone||'RightUpLeg';
  const boneIdx=mocap.byName[boneName]??0;
  $('#animBoneSelect').value=boneName;
  const off=frameIdx*clip.stride+boneIdx*4;
  const q=Array.from(clip.values.subarray(off,off+4));
  const [rx,ry,rz]=animQuatToEuler(q).map(r=>Math.round(r*180/Math.PI));
  $('#animRotX').value=String(rx);$('#animRotXVal').textContent=rx+'°';
  $('#animRotY').value=String(ry);$('#animRotYVal').textContent=ry+'°';
  $('#animRotZ').value=String(rz);$('#animRotZVal').textContent=rz+'°';
  const isHips=boneName==='Hips';
  $('#animRootYRow').hidden=!isHips;
  if(isHips){
    const rootY=clip.values[frameIdx*clip.stride+mocap.boneCount*4+1];
    $('#animRootY').value=String(rootY.toFixed(1));
    $('#animRootYVal').textContent=rootY.toFixed(1);
  }
  $('#animDeleteCustom').hidden=!clip.custom;
  $('#animRestoreClip').hidden=Boolean(clip.custom);
}
function setAnimEditMode(mode){
  if(!animLab)return;
  if(animLab.tab==='edit'&&mode!=='edit'&&mocap?.hasUnsavedDrafts?.()){
    mocap.discardClipDrafts();
    animLab.sim=null;
  }
  animLab.tab=mode;
  const editing=mode==='edit',creating=mode==='create';
  $('#animTabValidate').setAttribute('aria-pressed',String(mode==='validate'));
  $('#animTabEdit').setAttribute('aria-pressed',String(editing));
  $('#animTabCreate').setAttribute('aria-pressed',String(creating));
  $('#animValidateView').hidden=mode!=='validate';
  $('#animEditView').hidden=!editing;
  $('#animCreateView').hidden=!creating;
  if(editing){
    const activeItem=animLab.catalog.find(i=>i.key===animLab.selectedKey);
    animLab.editFrame=animCurrentFrame();
    if(activeItem&&!activeItem.procedural)animLab.time=animLab.editFrame/activeItem.clip.fps;
    animLab.playing=false;
    $('#animLabPlay').textContent='Reproduzir';
    syncAnimEditorSliders();
  }
  $('#animSkeletonOverlay').hidden=!(animLab.showHitbox||(editing&&animLab.showSkeleton));
}
function applySliderEditToFrame(){
  if(!animLab||!mocap)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item)return;
  const clip=item.clip,frameIdx=animCurrentFrame();
  const boneName=animLab.selectedBone||'RightUpLeg';
  const boneIdx=mocap.byName[boneName];
  if(boneIdx===undefined)return;
  mocap.ensureOriginal(item.key);
  const rx=Number($('#animRotX').value)*Math.PI/180;
  const ry=Number($('#animRotY').value)*Math.PI/180;
  const rz=Number($('#animRotZ').value)*Math.PI/180;
  $('#animRotXVal').textContent=$('#animRotX').value+'°';
  $('#animRotYVal').textContent=$('#animRotY').value+'°';
  $('#animRotZVal').textContent=$('#animRotZ').value+'°';
  const q=animEulerToQuat(rx,ry,rz);
  clip.values.set(q,frameIdx*clip.stride+boneIdx*4);
  if(boneName==='Hips'){
    const rootY=Number($('#animRootY').value);
    clip.values[frameIdx*clip.stride+mocap.boneCount*4+1]=rootY;
    $('#animRootYVal').textContent=rootY.toFixed(1);
  }
  mocap.markClipEdited(item.key);
  animLab.playing=false;
  $('#animLabPlay').textContent='Reproduzir';
  $('#animEditFrameLabel').textContent=`Quadro ${frameIdx+1} / ${clip.frames} · editado`;
  $('#animEditStatus').textContent='Alteração pendente — clique em "Salvar no jogo" para gravar.';
}
function drawAnimSkeletonOverlay(vp){
  const overlay=$('#animSkeletonOverlay');
  if(!overlay)return;
  const showSkel=Boolean(animLab&&animLab.tab==='edit'&&animLab.showSkeleton);
  const showHb=Boolean(animLab&&animLab.showHitbox);
  const visible=showSkel||showHb;
  overlay.hidden=!visible;
  overlay.style.pointerEvents=showSkel?'auto':'none';
  if(!visible||!mocap)return;
  const dpr=Math.min(2,devicePixelRatio||1);
  const cw=Math.round(innerWidth*dpr),ch=Math.round(innerHeight*dpr);
  if(overlay.width!==cw||overlay.height!==ch){overlay.width=cw;overlay.height=ch;}
  const ctx=overlay.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,innerWidth,innerHeight);
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  const actor=item?.cat==='keeper'?keeper:player;

  // Draw 3D Rectangular Hitboxes (OBBs) aligned with the skeleton + ball sphere
  if(showHb){
    const focal=(innerHeight*.5)/Math.tan(fieldOfView*.5);
    const boxEdges=[[0,1],[1,3],[3,2],[2,0],[4,5],[5,7],[7,6],[6,4],[0,4],[1,5],[2,6],[3,7]];
    const drawBox=(box,stroke,fill)=>{
      const [u,v,w]=box.axes,[hx,hy,hz]=box.half,[cx,cy,cz]=box.center;
      const pts=[];
      for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
        const p=[
          cx+u[0]*hx*sx+v[0]*hy*sy+w[0]*hz*sz,
          cy+u[1]*hx*sx+v[1]*hy*sy+w[1]*hz*sz,
          cz+u[2]*hx*sx+v[2]*hy*sy+w[2]*hz*sz
        ];
        const sp=projected(p,vp);
        if(!sp?.visible)return;
        pts.push(sp);
      }
      ctx.save();
      ctx.beginPath();
      for(const [a,b] of boxEdges){ctx.moveTo(pts[a].x,pts[a].y);ctx.lineTo(pts[b].x,pts[b].y);}
      ctx.lineWidth=1.8;
      ctx.strokeStyle=stroke;
      ctx.stroke();
      if(fill){
        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.moveTo(pts[0].x,pts[0].y);ctx.lineTo(pts[1].x,pts[1].y);ctx.lineTo(pts[3].x,pts[3].y);ctx.lineTo(pts[2].x,pts[2].y);ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };
    const drawSphere=(center,radius,stroke,fill,dashed=false)=>{
      const pt=projected(center,vp);
      if(!pt?.visible)return;
      const dist=Math.max(.5,Math.hypot(camera[0]-center[0],camera[1]-center[1],camera[2]-center[2]));
      const pxR=clamp((radius*focal)/dist,4,140);
      ctx.save();
      ctx.beginPath();
      if(dashed)ctx.setLineDash([4,4]);
      ctx.arc(pt.x,pt.y,pxR,0,Math.PI*2);
      ctx.fillStyle=fill;
      ctx.fill();
      ctx.lineWidth=2;
      ctx.strokeStyle=stroke;
      ctx.stroke();
      ctx.restore();
    };
    const flashed=(animLab.sim?.contactFlash??0)>0;
    const activeStroke=flashed?'#7ff0a4':'#47e6ff';
    const activeFill=flashed?'rgba(127, 240, 164, 0.28)':'rgba(71, 230, 255, 0.16)';
    const bodyStroke=flashed?'rgba(127, 240, 164, 0.85)':'rgba(130, 205, 255, 0.58)';
    const rig=mocap.get(actor);
    if(item?.cat==='keeper'){
      // Draw the active goal sector (A1..E3) on the goal mouth so you see which sector triggered the save!
      const sc=animLab.sim?.keeperScenario;
      if(sc&&animLab.sim?.isSave){
        const hw=3.66,gh=2.44,cw=2*hw/5,rh=gh/3;
        const x0=-hw+sc.col*cw,x1=x0+cw;
        const y0=(3-sc.row)*rh,y1=y0+rh;
        const corners=[[x0,y0,0],[x1,y0,0],[x1,y1,0],[x0,y1,0]].map(c=>projected(c,vp));
        if(corners.every(c=>c?.visible)){
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(corners[0].x,corners[0].y);
          for(let k=1;k<4;k++)ctx.lineTo(corners[k].x,corners[k].y);
          ctx.closePath();
          ctx.fillStyle='rgba(255, 208, 105, 0.16)';
          ctx.fill();
          ctx.lineWidth=2;
          ctx.strokeStyle='rgba(255, 208, 105, 0.85)';
          ctx.stroke();
          ctx.font='700 12px system-ui, sans-serif';
          ctx.fillStyle='#ffd069';
          ctx.fillText('SETOR '+sc.zoneId,(corners[0].x+corners[2].x)*.5-28,(corners[0].y+corners[2].y)*.5+4);
          ctx.restore();
        }
      }
    }
    for(const box of rig?.hitboxes||[]){
      const isPrimary=item?.cat==='keeper'?(box.part==='hand'||box.part==='arm'||box.part==='boot'):(box.part==='boot'||(item?.cat==='defender'&&box.part==='leg'));
      drawBox(box,isPrimary?activeStroke:bodyStroke,isPrimary?activeFill:null);
    }
    drawSphere(ballPos,.115,'rgba(255, 208, 105, 0.9)','rgba(255, 208, 105, 0.14)',true);
  }

  animLab.projectedBones=[];
  if(!showSkel)return;
  const worldPts=mocap.boneWorldPositions(actor);
  if(!worldPts.length)return;
  const screenPts=worldPts.map(p=>p?projected(p,vp):{visible:false,x:0,y:0});

  // Draw skeleton lines
  ctx.lineWidth=2;
  ctx.strokeStyle='rgba(255, 208, 105, 0.72)';
  ctx.beginPath();
  for(let i=0;i<mocap.bones.length;i++){
    const b=mocap.bones[i];
    if(!animEditableSet.has(b.name)||b.parent<0)continue;
    const parent=mocap.bones[b.parent];
    if(!parent||!animEditableSet.has(parent.name))continue;
    const a=screenPts[b.parent],c=screenPts[i];
    if(a?.visible&&c?.visible){ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);}
  }
  ctx.stroke();

  // Draw clickable joint dots
  for(let i=0;i<mocap.bones.length;i++){
    const b=mocap.bones[i];
    if(!animEditableSet.has(b.name))continue;
    const pt=screenPts[i];
    if(!pt?.visible)continue;
    const selected=b.name===animLab.selectedBone;
    const hovered=b.name===animLab.hoveredBone;
    animLab.projectedBones.push({name:b.name,x:pt.x,y:pt.y,world:worldPts[i]});
    if(hovered){
      ctx.beginPath();
      ctx.arc(pt.x,pt.y,13,0,Math.PI*2);
      ctx.strokeStyle='#7ff0a4';
      ctx.lineWidth=2.5;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(pt.x,pt.y,selected||hovered?8:5.5,0,Math.PI*2);
    ctx.fillStyle=hovered?'#7ff0a4':selected?'#ffd069':'rgba(212, 86, 44, 0.92)';
    ctx.fill();
    ctx.lineWidth=selected||hovered?2.5:1.5;
    ctx.strokeStyle='#1a1420';
    ctx.stroke();
    if(selected||hovered){
      ctx.font='700 12px system-ui, sans-serif';
      const label=animBoneLabelMap[b.name]||b.name;
      ctx.fillStyle='rgba(24,18,30,0.88)';
      const w=ctx.measureText(label).width+12;
      ctx.fillRect(pt.x+11,pt.y-11,w,20);
      ctx.fillStyle=hovered?'#7ff0a4':'#ffd069';
      ctx.fillText(label,pt.x+17,pt.y+3);
    }
  }
}

function openAnimLab(){
  if(!mocap)return;
  ensureProceduralClipsBaked();
  populateAnimBoneSelect();
  animLab={
    catalog:buildAnimCatalog(),
    cat:'all',
    keeperSub:'all',
    query:'',
    selectedKey:'runBall',
    time:0,
    playing:true,
    speed:1,
    mirror:false,
    orbitDeg:38,
    camZoom:1,
    tab:'validate',
    selectedBone:'RightUpLeg',
    showSkeleton:true,
    showHitbox:true,
    copiedFrame:null,
    projectedBones:[],
    marks:loadAnimMarks()
  };
  if(!mocap.clips[animLab.selectedKey]&&animLab.catalog[0])animLab.selectedKey=animLab.catalog[0].key;
  $('#start').hidden=true;
  $('#animLab').hidden=false;
  $('#animShowHitbox').checked=true;
  setAnimEditMode('validate');
  refreshAnimLabUI();
}
function closeAnimLab(){
  if(!animLab)return;
  if(mocap?.hasUnsavedDrafts?.())mocap.discardClipDrafts();
  animLab=null;
  $('#animLab').hidden=true;
  $('#animSkeletonOverlay').hidden=true;
  $('#start').hidden=false;
  player.x=0;player.z=17.5;player.yaw=0;
  keeper.x=0;keeper.z=.65;keeper.yaw=Math.PI;
  ballPos=[-.12,.11,17.58];
}
$('#openAnimLab').onclick=openAnimLab;
$('#animLabClose').onclick=closeAnimLab;
$('#animTabValidate').onclick=()=>setAnimEditMode('validate');
$('#animTabEdit').onclick=()=>setAnimEditMode('edit');
$('#animTabCreate').onclick=()=>setAnimEditMode('create');
$('#animShowSkeleton').addEventListener('change',event=>{
  if(!animLab)return;
  animLab.showSkeleton=event.target.checked;
  $('#animSkeletonOverlay').hidden=!(animLab.showHitbox||(animLab.tab==='edit'&&animLab.showSkeleton));
});
function setAnimHitboxVisible(visible){
  if(!animLab)return;
  animLab.showHitbox=Boolean(visible);
  $('#animShowHitbox').checked=animLab.showHitbox;
  $('#animLabHitboxBtn').setAttribute('aria-pressed',String(animLab.showHitbox));
  $('#animSkeletonOverlay').hidden=!(animLab.showHitbox||(animLab.tab==='edit'&&animLab.showSkeleton));
}
$('#animShowHitbox').addEventListener('change',event=>setAnimHitboxVisible(event.target.checked));
$('#animLabHitboxBtn').onclick=()=>setAnimHitboxVisible(!animLab?.showHitbox);
function previewManualSlug(){
  const raw=$('#animNewName').value||'nova';
  const slug=raw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'nova';
  $('#animNewPreview').textContent=slug.startsWith('manual-')?slug:'manual-'+slug;
}
$('#animNewName').addEventListener('input',previewManualSlug);
$('#animNewFrames').addEventListener('input',event=>{
  $('#animNewFramesVal').textContent=event.target.value+' q';
});
$('#animCreateBtn').onclick=()=>{
  if(!animLab||!mocap)return;
  const name=$('#animNewName').value.trim();
  if(!name){$('#animCreateStatus').textContent='Digite um nome para a animação (ex: elastico).';return;}
  const frames=clamp(Number($('#animNewFrames').value)||30,2,100);
  const cat=$('#animNewCat').value;
  const baseChoice=$('#animNewBase').value;
  const baseKey=baseChoice==='__current__'?animLab.selectedKey:baseChoice;
  const key=mocap.createManualClip(name,frames,cat,baseKey);
  animLab.catalog=buildAnimCatalog();
  animLab.selectedKey=key;
  animLab.time=0;
  animLab.sim=null;
  $('#animNewName').value='';
  previewManualSlug();
  refreshAnimLabUI();
  setAnimEditMode('edit');
  $('#animEditStatus').textContent=`Animação "${key}" criada (${frames} frames) e salva! Edite quadro a quadro.`;
};
$('#animDeleteCustom').onclick=()=>{
  if(!animLab||!mocap)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item?.clip?.custom)return;
  mocap.deleteManualClip(item.key);
  animLab.catalog=buildAnimCatalog();
  animLab.selectedKey=animLab.catalog[0]?.key||'idle';
  animLab.time=0;
  animLab.sim=null;
  refreshAnimLabUI();
  setAnimEditMode('validate');
};
$('#animBoneSelect').addEventListener('change',event=>{
  if(!animLab)return;
  animLab.selectedBone=event.target.value;
  syncAnimEditorSliders();
});
let animSliderUndo=null;
function pushAnimUndo(item,label,valuesOverride,frameOverride){
  if(!animLab||!item?.clip?.values)return;
  animLab.undoStack??=[];
  animLab.undoStack.push({
    key:item.key,
    frame:frameOverride??animCurrentFrame(),
    values:valuesOverride??item.clip.values.slice(),
    label:label||'Edição'
  });
  if(animLab.undoStack.length>60)animLab.undoStack.shift();
}
function undoAnimEdit(){
  if(!animLab||!mocap)return;
  const stack=animLab.undoStack;
  if(!stack?.length){$('#animEditStatus').textContent='Nada para desfazer (Ctrl+Z).';return;}
  let idx=stack.length-1;
  while(idx>=0&&stack[idx].key!==animLab.selectedKey)idx--;
  if(idx<0){$('#animEditStatus').textContent='Nada para desfazer neste clipe (Ctrl+Z).';return;}
  const [entry]=stack.splice(idx,1);
  const item=animLab.catalog.find(i=>i.key===entry.key);
  if(!item?.clip?.values)return;
  item.clip.values.set(entry.values);
  animLab.playing=false;
  animLab.editFrame=clamp(entry.frame,0,item.clip.frames-1);
  animLab.time=animLab.editFrame/item.clip.fps;
  mocap.rebuildClip?.(item.key);
  advanceAnimLabStep(item,0,clamp(animLab.editFrame/item.clip.fps,0,Math.max(.08,item.clip.duration)));
  syncAnimEditorSliders();
  $('#animLabPlay').textContent='Reproduzir';
  const rem=stack.filter(e=>e.key===item.key).length;
  $('#animEditStatus').textContent=`Desfeito: ${entry.label} (quadro ${animLab.editFrame+1})${rem?` · ${rem} no histórico`:''}.`;
}
for(const id of ['#animRotX','#animRotY','#animRotZ','#animRootY']){
  const el=$(id);
  const captureBefore=()=>{
    if(!animLab||animSliderUndo)return;
    const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
    if(item?.clip?.values)animSliderUndo={item,frame:animCurrentFrame(),values:item.clip.values.slice()};
  };
  el.addEventListener('pointerdown',captureBefore);
  el.addEventListener('keydown',captureBefore);
  el.addEventListener('input',applySliderEditToFrame);
  el.addEventListener('change',()=>{
    if(animSliderUndo){
      pushAnimUndo(animSliderUndo.item,'Ajuste no slider',animSliderUndo.values,animSliderUndo.frame);
      animSliderUndo=null;
    }
  });
}
function stepAnimFrame(delta){
  if(!animLab)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item)return;
  animLab.playing=false;
  const f=(animCurrentFrame()+delta+item.clip.frames)%item.clip.frames;
  animLab.editFrame=f;
  animLab.time=f/item.clip.fps;
  $('#animLabPlay').textContent='Reproduzir';
  if(animLab.tab==='edit')syncAnimEditorSliders();
}
$('#animFramePrev').onclick=()=>stepAnimFrame(-1);
$('#animFrameNext').onclick=()=>stepAnimFrame(1);
$('#animStepBack').onclick=()=>stepAnimFrame(-1);
$('#animStepFwd').onclick=()=>stepAnimFrame(1);
$('#animCopyFrame').onclick=()=>{
  if(!animLab)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item)return;
  const f=animCurrentFrame();
  animLab.copiedFrame=item.clip.values.slice(f*item.clip.stride,(f+1)*item.clip.stride);
  $('#animEditStatus').textContent=`Quadro ${f+1} copiado! Avance para outro quadro e clique em Colar.`;
};
$('#animPasteFrame').onclick=()=>{
  if(!animLab||!animLab.copiedFrame)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item||animLab.copiedFrame.length!==item.clip.stride)return;
  mocap.ensureOriginal(item.key);
  pushAnimUndo(item,'Colar pose');
  const f=animCurrentFrame();
  item.clip.values.set(animLab.copiedFrame,f*item.clip.stride);
  mocap.markClipEdited(item.key);
  syncAnimEditorSliders();
  $('#animEditStatus').textContent=`Pose colada no quadro ${f+1}. Clique em "Salvar no jogo" para gravar.`;
};
function propagateAnimSmooth(radius){
  if(!animLab||!mocap)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item||item.procedural)return;
  const clip=item.clip,center=animCurrentFrame();
  mocap.ensureOriginal(item.key);
  pushAnimUndo(item,`Suavizar ±${radius}q`);
  const stride=clip.stride,bCount=mocap.boneCount,rootBase=bCount*4;
  const readFrame=f=>clip.values.slice(f*stride,(f+1)*stride);
  const loAnchor=Math.max(0,center-radius-1);
  const hiAnchor=Math.min(clip.frames-1,center+radius+1);
  const loStart=Math.max(0,center-radius);
  const hiEnd=Math.min(clip.frames-1,center+radius);
  const centerPose=readFrame(center);
  const loPose=readFrame(loAnchor);
  const hiPose=readFrame(hiAnchor);
  const blendInto=(dstFrame,fromPose,toPose,t)=>{
    const w=smooth(t);
    const dstOff=dstFrame*stride;
    for(let b=0;b<bCount;b++){
      const o=b*4;
      const qA=[fromPose[o],fromPose[o+1],fromPose[o+2],fromPose[o+3]];
      const qB=[toPose[o],toPose[o+1],toPose[o+2],toPose[o+3]];
      clip.values.set(animQuatLerp(qA,qB,w),dstOff+o);
    }
    for(let a=0;a<3;a++){
      if(rootBase+a<stride)clip.values[dstOff+rootBase+a]=mix(fromPose[rootBase+a],toPose[rootBase+a],w);
    }
  };
  if(center>0){
    const span=center-loAnchor;
    for(let f=loStart;f<center;f++){
      const t=span>0?(f-loAnchor)/span:.5;
      blendInto(f,loPose,centerPose,f===loAnchor?.5:t);
    }
  }
  if(center<clip.frames-1){
    const span=hiAnchor-center;
    for(let f=center+1;f<=hiEnd;f++){
      const t=span>0?(f-center)/span:.5;
      blendInto(f,centerPose,hiPose,f===hiAnchor?.5:t);
    }
  }
  mocap.rebuildClip?.(item.key);
  mocap.markClipEdited(item.key);
  syncAnimEditorSliders();
  $('#animEditStatus').textContent=`Transição suave (±${radius}q) criada nos quadros ${loStart+1} → ${center+1} → ${hiEnd+1}.`;
}
$('#animPropagate').onclick=()=>propagateAnimSmooth(5);
$('#animPropagate1').onclick=()=>propagateAnimSmooth(1);
$('#animDupNext').onclick=()=>{
  if(!animLab||!mocap)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item||item.procedural)return;
  const clip=item.clip,f=animCurrentFrame(),next=f+1;
  if(next>=clip.frames){
    $('#animEditStatus').textContent=`Já está no último quadro (${clip.frames}/${clip.frames}).`;
    return;
  }
  mocap.ensureOriginal(item.key);
  pushAnimUndo(item,`Duplicar Q${f+1} → Q${next+1}`,clip.values.slice(),f);
  const stride=clip.stride;
  clip.values.set(clip.values.subarray(f*stride,(f+1)*stride),next*stride);
  animLab.playing=false;
  animLab.editFrame=next;
  animLab.time=next/clip.fps;
  mocap.rebuildClip?.(item.key);
  mocap.markClipEdited(item.key);
  advanceAnimLabStep(item,0,clamp(next/clip.fps,0,Math.max(.08,clip.duration)));
  syncAnimEditorSliders();
  $('#animLabPlay').textContent='Reproduzir';
  $('#animEditStatus').textContent=`Pose do quadro ${f+1} duplicada para o quadro ${next+1} (Ctrl+Z desfaz).`;
};
$('#animResetBone').onclick=()=>{
  if(!animLab||!mocap)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item)return;
  const orig=mocap.ensureOriginal(item.key);
  const f=animCurrentFrame(),boneIdx=mocap.byName[animLab.selectedBone];
  if(!orig||boneIdx===undefined)return;
  pushAnimUndo(item,'Zerar osso');
  const off=f*item.clip.stride+boneIdx*4;
  item.clip.values.set(orig.subarray(off,off+4),off);
  if(animLab.selectedBone==='Hips'){
    const rIdx=f*item.clip.stride+mocap.boneCount*4+1;
    item.clip.values[rIdx]=orig[rIdx];
  }
  syncAnimEditorSliders();
  $('#animEditStatus').textContent=`Osso restaurado no quadro ${f+1}.`;
};
async function saveOverridesDirectToProject(){
  if(!location.protocol.startsWith('http'))return 'local';
  try{
    const res=await fetch('/api/save-animations',{
      method:'POST',
      headers:{'Content-Type':'text/javascript; charset=utf-8'},
      body:mocap.exportOverridesScript()
    });
    if(res.ok)return 'project';
  }catch{}
  return 'local';
}
$('#animSaveEdits').onclick=async ()=>{
  if(!animLab||!mocap)return;
  const ok=mocap.commitClipDrafts();
  animLab.sim=null;
  refreshAnimLabUI();
  if(!ok){$('#animEditStatus').textContent='Erro ao salvar no jogo.';return;}
  const mode=await saveOverridesDirectToProject();
  $('#animEditStatus').textContent=mode==='project'
    ?'Salvo e aplicado direto no jogo e nos arquivos do projeto!'
    :'Salvo e aplicado no jogo! (Para gravar automático nos arquivos do projeto sem baixar nada, abra via npm --prefix goat run dev.)';
};
$('#animRestoreClip').onclick=()=>{
  if(!animLab||!mocap)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item)return;
  mocap.restoreOriginal(item.key);
  syncAnimEditorSliders();
  $('#animEditStatus').textContent=`Clipe "${item.label}" restaurado ao original.`;
};
$('#animExportJson').onclick=()=>{
  if(!mocap)return;
  const blob=new Blob([mocap.exportEditedClips()],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='goat-animacoes-editadas.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  $('#animEditStatus').textContent='Backup JSON exportado!';
};
$('#animImportJson').onclick=()=>$('#animImportFile').click();
$('#animImportFile').addEventListener('change',async event=>{
  const file=event.target.files?.[0];
  if(!file||!mocap)return;
  try{
    const count=mocap.importEditedClips(await file.text());
    syncAnimEditorSliders();
    $('#animEditStatus').textContent=`${count} clipe(s) importado(s) e salvo(s) no jogo!`;
  }catch{
    $('#animEditStatus').textContent='Arquivo JSON inválido.';
  }
  event.target.value='';
});
function animScreenToWorldOnPlane(clientX,clientY,planePoint){
  const fwd=norm(sub(cameraTarget,camera));
  const right=norm(cross(fwd,[0,1,0]));
  const up=cross(right,fwd);
  const ndcX=(clientX/Math.max(1,innerWidth))*2-1;
  const ndcY=1-(clientY/Math.max(1,innerHeight))*2;
  const tanHalf=Math.tan(fieldOfView*.5);
  const aspect=innerWidth/Math.max(1,innerHeight);
  const rayDir=norm(add(fwd,add(mul(right,ndcX*tanHalf*aspect),mul(up,ndcY*tanHalf))));
  const denom=dot(rayDir,fwd);
  if(Math.abs(denom)<1e-4)return planePoint;
  const dist=dot(sub(planePoint,camera),fwd)/denom;
  return add(camera,mul(rayDir,dist));
}
function wrapOrbitDeg(deg){
  const d=((deg+180)%360+360)%360-180;
  return d===-180?180:d;
}
let animOrbitDrag=null,animBoneDrag=null,animRotateDrag=null;
$('#animSkeletonOverlay').addEventListener('contextmenu',event=>event.preventDefault());
$('#animSkeletonOverlay').addEventListener('pointerdown',event=>{
  if(!animLab||animLab.tab!=='edit'||event.button===1)return;
  let best=null,bestDist=32;
  for(const pt of animLab.projectedBones||[]){
    const d=Math.hypot(pt.x-event.clientX,pt.y-event.clientY);
    if(d<bestDist){bestDist=d;best=pt;}
  }
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(event.button===2){
    event.preventDefault();
    event.stopPropagation();
    if(best)animLab.selectedBone=best.name;
    if(!item||item.procedural)return;
    animLab.playing=false;
    $('#animLabPlay').textContent='Reproduzir';
    syncAnimEditorSliders();
    const boneName=animLab.selectedBone||'RightUpLeg';
    const boneIdx=mocap.byName[boneName];
    if(boneIdx===undefined)return;
    const f=animCurrentFrame();
    const off=f*item.clip.stride+boneIdx*4;
    const startEuler=animQuatToEuler(Array.from(item.clip.values.subarray(off,off+4)));
    animRotateDrag={item,name:boneName,boneIdx,frame:f,startX:event.clientX,startY:event.clientY,startEuler,beforeValues:item.clip.values.slice(),moved:false};
    $('#animSkeletonOverlay').setPointerCapture(event.pointerId);
    $('#animEditStatus').textContent=`Rotacionando ${animBoneLabelMap[boneName]||boneName} (botão direito · Shift = inclinação Z).`;
    return;
  }
  if(best){
    event.preventDefault();
    event.stopPropagation();
    animLab.selectedBone=best.name;
    animLab.playing=false;
    $('#animLabPlay').textContent='Reproduzir';
    syncAnimEditorSliders();
    if(item&&!item.procedural&&best.world){
      animBoneDrag={item,name:best.name,frame:animCurrentFrame(),planePoint:[...best.world],beforeValues:item.clip.values.slice(),moved:false};
      $('#animSkeletonOverlay').setPointerCapture(event.pointerId);
      $('#animEditStatus').textContent=`Arrastando ${animBoneLabelMap[best.name]||best.name} (botão esquerdo) — solte para fixar no quadro ${animCurrentFrame()+1}.`;
    }
  }else{
    animOrbitDrag={x:event.clientX,start:animLab.orbitDeg};
    $('#animSkeletonOverlay').setPointerCapture(event.pointerId);
  }
});
function handleAnimEditPointerMove(event){
  if(!animLab)return;
  if(animRotateDrag){
    const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
    if(!item||item.procedural)return;
    mocap.ensureOriginal(item.key);
    const dx=(event.clientX-animRotateDrag.startX)*.012;
    const dy=(event.clientY-animRotateDrag.startY)*.012;
    const [sx,sy,sz]=animRotateDrag.startEuler;
    const rx=clamp(sx+dy,-Math.PI,Math.PI);
    const ry=event.shiftKey?sy:clamp(sy+dx,-Math.PI,Math.PI);
    const rz=event.shiftKey?clamp(sz+dx,-Math.PI,Math.PI):sz;
    const q=animEulerToQuat(rx,ry,rz);
    item.clip.values.set(q,animRotateDrag.frame*item.clip.stride+animRotateDrag.boneIdx*4);
    mocap.markClipEdited(item.key);
    animRotateDrag.moved=true;
    advanceAnimLabStep(item,0,clamp(animRotateDrag.frame/item.clip.fps,0,Math.max(.08,item.clip.duration)));
    syncAnimEditorSliders();
    return;
  }
  if(animBoneDrag){
    const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
    if(!item||item.procedural)return;
    const actor=item.cat==='keeper'?keeper:player;
    const worldTarget=animScreenToWorldOnPlane(event.clientX,event.clientY,animBoneDrag.planePoint);
    const f=animCurrentFrame();
    if(mocap.dragBoneToWorld(actor,item.key,f,animBoneDrag.name,worldTarget,animLab.mirror)){
      animBoneDrag.moved=true;
      advanceAnimLabStep(item,0,clamp(f/item.clip.fps,0,Math.max(.08,item.clip.duration)));
      syncAnimEditorSliders();
    }
    return;
  }
  if(animLab.tab==='edit'){
    let hover=null,bestDist=32;
    for(const pt of animLab.projectedBones||[]){
      const d=Math.hypot(pt.x-event.clientX,pt.y-event.clientY);
      if(d<bestDist){bestDist=d;hover=pt.name;}
    }
    animLab.hoveredBone=hover;
    $('#animSkeletonOverlay').style.cursor=hover?'grab':'crosshair';
  }
}
function finishAnimEditDrag(){
  if(animBoneDrag?.moved){
    pushAnimUndo(animBoneDrag.item,`Mover ${animBoneLabelMap[animBoneDrag.name]||animBoneDrag.name}`,animBoneDrag.beforeValues,animBoneDrag.frame);
    const f=animCurrentFrame();
    $('#animEditStatus').textContent=`Pose fixada no quadro ${f+1} — Ctrl+Z desfaz, ou clique em "Salvar no jogo".`;
  }else if(animRotateDrag?.moved){
    pushAnimUndo(animRotateDrag.item,`Rotacionar ${animBoneLabelMap[animRotateDrag.name]||animRotateDrag.name}`,animRotateDrag.beforeValues,animRotateDrag.frame);
    const f=animCurrentFrame();
    $('#animEditStatus').textContent=`Pose fixada no quadro ${f+1} — Ctrl+Z desfaz, ou clique em "Salvar no jogo".`;
  }
  animBoneDrag=null;
  animRotateDrag=null;
  animOrbitDrag=null;
}
$('#animSkeletonOverlay').addEventListener('pointerup',finishAnimEditDrag);
$('#animSkeletonOverlay').addEventListener('pointercancel',()=>{animBoneDrag=null;animRotateDrag=null;animOrbitDrag=null;});
addEventListener('mousedown',event=>{
  if(!animLab||event.button!==1)return;
  if(event.target&&event.target.closest('.anim-lab-panel'))return;
  event.preventDefault();
});
addEventListener('auxclick',event=>{
  if(!animLab||event.button!==1)return;
  if(event.target&&event.target.closest('.anim-lab-panel'))return;
  event.preventDefault();
});
addEventListener('pointerdown',event=>{
  if(!animLab)return;
  if(event.target&&event.target.closest('.anim-lab-panel'))return;
  if(event.button===1||(event.button===0&&animLab.tab!=='edit')){
    event.preventDefault();
    animOrbitDrag={x:event.clientX,start:animLab.orbitDeg};
  }
});
addEventListener('pointermove',event=>{
  if(!animLab)return;
  if(animBoneDrag||animRotateDrag||animLab.tab==='edit')handleAnimEditPointerMove(event);
  if(!animOrbitDrag)return;
  animLab.orbitDeg=wrapOrbitDeg(animOrbitDrag.start+(event.clientX-animOrbitDrag.x)*.45);
  $('#animLabOrbit').value=String(Math.round(animLab.orbitDeg));
  $('#animLabOrbitText').textContent=Math.round(animLab.orbitDeg)+'°';
});
addEventListener('pointerup',finishAnimEditDrag);
addEventListener('pointercancel',()=>{animBoneDrag=null;animRotateDrag=null;animOrbitDrag=null;});
addEventListener('blur',()=>{animBoneDrag=null;animRotateDrag=null;animOrbitDrag=null;});
addEventListener('wheel',event=>{
  if(!animLab)return;
  if(event.target&&event.target.closest('.anim-lab-panel'))return;
  event.preventDefault();
  animLab.camZoom=clamp((animLab.camZoom??1)*(event.deltaY>0?1.1:.91),.38,2.2);
},{passive:false});
$('#animLabCats').addEventListener('click',event=>{
  const btn=event.target.closest('[data-cat]');
  if(!btn||!animLab)return;
  animLab.cat=btn.dataset.cat;
  if(animLab.cat!=='keeper')animLab.keeperSub='all';
  for(const b of $('#animLabCats').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===btn));
  const items=filteredAnimCatalog();
  if(items.length&&!items.some(i=>i.key===animLab.selectedKey))animLab.selectedKey=items[0].key;
  animLab.time=0;
  refreshAnimLabUI();
});
$('#animKeeperSubs').addEventListener('click',event=>{
  const btn=event.target.closest('[data-sub]');
  if(!btn||!animLab)return;
  animLab.keeperSub=btn.dataset.sub;
  const items=filteredAnimCatalog();
  if(items.length&&!items.some(i=>i.key===animLab.selectedKey))animLab.selectedKey=items[0].key;
  animLab.time=0;
  refreshAnimLabUI();
});
$('#animLabSearch').addEventListener('input',event=>{
  if(!animLab)return;
  animLab.query=event.target.value;
  refreshAnimLabUI();
});
$('#animLabScrub').addEventListener('input',event=>{
  if(!animLab)return;
  const item=animLab.catalog.find(i=>i.key===animLab.selectedKey);
  if(!item)return;
  animLab.playing=false;
  const f=clamp(Math.round((Number(event.target.value)/1000)*(item.clip.frames-1)),0,item.clip.frames-1);
  animLab.editFrame=f;
  animLab.time=f/item.clip.fps;
  $('#animLabPlay').textContent='Reproduzir';
  if(animLab.tab==='edit')syncAnimEditorSliders();
});
$('#animLabPrev').onclick=()=>stepAnimLabSelection(-1);
$('#animLabNext').onclick=()=>stepAnimLabSelection(1);
$('#animLabPlay').onclick=toggleAnimLabPlay;
$('#animLabSpeed').onclick=()=>{
  if(!animLab)return;
  const speeds=[1,.5,.25];
  animLab.speed=speeds[(speeds.indexOf(animLab.speed)+1)%speeds.length];
  refreshAnimLabUI();
};
$('#animLabMirror').onclick=()=>{
  if(!animLab)return;
  animLab.mirror=!animLab.mirror;
  refreshAnimLabUI();
};
$('#animLabOrbit').addEventListener('input',event=>{
  if(!animLab)return;
  animLab.orbitDeg=Number(event.target.value);
  $('#animLabOrbitText').textContent=Math.round(animLab.orbitDeg)+'°';
});
$('#animLabOk').onclick=()=>{
  if(!animLab)return;
  animLab.marks[animLab.selectedKey]='ok';
  saveAnimMarks(animLab.marks);
  stepAnimLabSelection(1);
};
$('#animLabFix').onclick=()=>{
  if(!animLab)return;
  animLab.marks[animLab.selectedKey]='fix';
  saveAnimMarks(animLab.marks);
  stepAnimLabSelection(1);
};
$('#animLabClear').onclick=()=>{
  if(!animLab)return;
  delete animLab.marks[animLab.selectedKey];
  saveAnimMarks(animLab.marks);
  refreshAnimLabUI();
};

$('#loading').hidden=true;
$('#play').disabled=false;
$('#openAnimLab').disabled=false;
updateStats();
poseHuman(player,neutral(),1);
poseHuman(keeper,neutral(),1);
requestAnimationFrame(frame);
})();
