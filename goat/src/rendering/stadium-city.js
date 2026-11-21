(() => {
  'use strict';

  const streets = [.24,.23,.24];
  const pavement = [.57,.52,.45];
  const parks = [[.30,.43,.30],[.38,.48,.30],[.27,.39,.34]];
  const trees = [[.21,.35,.26],[.31,.41,.24],[.23,.37,.32]];
  const facades = [[.77,.68,.52],[.64,.65,.63],[.66,.49,.41],[.80,.75,.66],[.53,.59,.63],[.69,.61,.49]];
  const roofs = [[.53,.32,.25],[.62,.42,.32],[.45,.43,.41],[.64,.59,.49]];
  const glass = [[.24,.34,.43],[.32,.41,.47],[.41,.53,.55],[.71,.57,.37]];
  const roadPaint = [.74,.67,.51];
  const cars = [[.63,.25,.22],[.28,.42,.56],[.81,.73,.57],[.52,.58,.47],[.45,.39,.46]];
  const up = [0,1,0];

  function build(id, {center,halfSize}) {
    let seed = 2166136261;
    for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0),16777619);
    const random = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    };
    const between = (low,high) => low+(high-low)*random();
    const pick = palette => palette[Math.floor(random()*palette.length)];
    const vertices = [];
    const [originX,,originZ] = center;

    function triangle(a,b,c,color,normal) {
      if (!normal) {
        const [x,y,z] = b.map((value,i) => value-a[i]);
        const [u,v,w] = c.map((value,i) => value-a[i]);
        normal = [y*w-z*v,z*u-x*w,x*v-y*u];
        const length = Math.hypot(...normal);
        normal = normal.map(value => value/length);
      }
      for (const [x,y,z] of [a,b,c]) vertices.push(x+originX,y,z+originZ,...normal,...color);
    }

    function quad(a,b,c,d,color,normal) {
      triangle(a,b,c,color,normal);
      triangle(a,c,d,color,normal);
    }

    function surface(x0,z0,x1,z1,y,color) {
      quad([x0,y,z0],[x0,y,z1],[x1,y,z1],[x1,y,z0],color,up);
    }

    function box(x,z,width,depth,base,height,wall,top) {
      const left=x-width/2,right=x+width/2,front=z-depth/2,back=z+depth/2,y=base+height;
      const a=[left,y,front],b=[left,y,back],c=[right,y,back],d=[right,y,front];
      quad(a,b,c,d,top,up);
      quad([left,base,front],[left,base,back],b,a,wall,[-1,0,0]);
      quad([right,base,back],[right,base,front],d,c,wall,[1,0,0]);
      quad([right,base,front],[left,base,front],a,d,wall,[0,0,-1]);
      quad([left,base,back],[right,base,back],c,b,wall,[0,0,1]);
    }

    function facadeDetail(x,z,width,depth,height,wall,residential) {
      const floors=residential?1:Math.min(6,Math.max(2,Math.round(height/3.5)-1));
      const trim=wall.map(channel=>Math.min(1,channel*1.16));
      const glassForWall=pick(glass);
      for (let face=0; face<4; face++) {
        const alongX=face<2,sign=face%2?1:-1,span=alongX?width:depth;
        const anchor=(alongX?z:x)+sign*((alongX?depth:width)/2+.042);
        const normal=alongX?[0,0,sign]:[sign,0,0];
        const columns=residential?2:Math.min(4,Math.max(2,Math.floor(span/3.9)));
        const bay=span/columns;
        const point=(across,y,offset=0)=>alongX?[x+across,y,anchor+sign*offset]:[anchor+sign*offset,y,z+across];
        const panel=(left,right,bottom,top,color,offset=0)=>{
          const vertices=[point(left,bottom,offset),point(right,bottom,offset),point(right,top,offset),point(left,top,offset)];
          if (alongX ? sign<0 : sign>0) vertices.reverse();
          quad(...vertices,color,normal);
        };
        for (let row=0; row<floors; row++) {
          const y=residential?height*.57:height*(row+1)/(floors+1);
          if (!residential) panel(-span*.5,span*.5,y-.91,y-.58,trim);
          for (let column=0; column<columns; column++) {
            const mid=(column+.5)*bay-span/2;
            const half=bay*(residential?.26:.34);
            panel(mid-half,mid+half,y-.53,y+Math.min(.70,height*.19),glassForWall,.025);
          }
        }
        if (face===1) panel(-.68,.68,.10,Math.min(2.28,height*.68),[.32,.26,.25],.025);
      }
    }

    function house(x,z,width,depth,height,wall,roof,detailed) {
      const x0=x-width*.53,x1=x+width*.53,z0=z-depth*.53,z1=z+depth*.53,y=.08+height;
      const front=[x,y+width*.25,z0],back=[x,y+width*.25,z1];
      box(x,z,width,depth,.08,height,wall,roof);
      quad([x0,y,z0],[x0,y,z1],back,front,roof);
      quad(front,back,[x1,y,z1],[x1,y,z0],roof);
      triangle([x0,y,z0],front,[x1,y,z0],wall);
      triangle([x1,y,z1],back,[x0,y,z1],wall);
      if (detailed) {
        const ridge=roof.map(channel=>channel*.77);
        box(x,z,.42,depth*1.07,y+width*.25-.08,.18,ridge,ridge);
        facadeDetail(x,z,width,depth,height,wall,true);
        if (random()<.48) box(x+width*.24,z-depth*.22,.86,.78,y+width*.12,1.45,wall,ridge);
      }
    }

    function tree(x,z) {
      const size=between(1.6,3.8),crown=pick(trees);
      const base=[[x-size,size*.45,z-size],[x-size,size*.45,z+size],[x+size,size*.45,z+size],[x+size,size*.45,z-size]];
      const tip=[x+size*.16,size*1.8,z];
      for (let i=0;i<4;i++) triangle(base[i],base[(i+1)%4],tip,crown);
    }

    function blocks(half,spacing) {
      const middle=Math.ceil(2*half/spacing);
      const edges=Array.from({length:middle+1},(_,i)=>-half+2*half*i/middle);
      let offset=0;
      while (offset<435) {offset+=spacing*between(.79,1.17);edges.push(half+offset);}
      offset=0;
      while (offset<435) {offset+=spacing*between(.79,1.17);edges.unshift(-half-offset);}
      return edges.slice(1).map((end,i)=>[edges[i],end]);
    }

    const [stadiumX,,stadiumZ] = halfSize;
    const plazaX=stadiumX+14,plazaZ=stadiumZ+14;
    surface(-plazaX,-plazaZ,-stadiumX,plazaZ,.025,pavement);
    surface(stadiumX,-plazaZ,plazaX,plazaZ,.025,pavement);
    surface(-stadiumX,-plazaZ,stadiumX,-stadiumZ,.025,pavement);
    surface(-stadiumX,stadiumZ,stadiumX,plazaZ,.025,pavement);
    for (const side of [-1,1]) {
      for (let z=-stadiumZ+8;z<stadiumZ-7;z+=11) tree(side*(stadiumX+10),z);
      for (let x=-stadiumX+6;x<stadiumX-5;x+=3.6) {
        const z=side*(stadiumZ+9);
        surface(x,z-1.9,x+.16,z+1.9,.031,[.77,.71,.59]);
      }
    }

    const blockX=blocks(plazaX,between(37,52)),blockZ=blocks(plazaZ,between(39,55));
    const urbanShare=between(.22,.63),tallSide=random()<.5?-1:1;
    for (const [x0,x1] of blockX) for (const [z0,z1] of blockZ) {
      if (x0>=-plazaX&&x1<=plazaX&&z0>=-plazaZ&&z1<=plazaZ) continue;
      const x=(x0+x1)/2,z=(z0+z1)/2;
      const district=Math.sin(x*.017+z*.009)*.19;
      const park=random()<.11+district*.3;
      const urban=random()<urbanShare+district;
      const detailed=Math.hypot(Math.max(0,Math.abs(x)-plazaX),Math.max(0,Math.abs(z)-plazaZ))<150;
      surface(x0,z0,x1,z1,.018,streets);
      surface(x0+3,z0+3,x1-3,z1-3,.043,pavement);
      surface(x0+4,z0+4,x1-4,z1-4,.066,pick(parks));
      if (detailed) {
        for (let mark=x0+5; mark<x1-4; mark+=8) surface(mark,z0-.10,mark+2.8,z0+.10,.042,roadPaint);
        for (let mark=z0+5; mark<z1-4; mark+=8) surface(x0-.10,mark,x0+.10,mark+2.8,.042,roadPaint);
        if (random()<.35) {
          const carX=x0+between(6,x1-x0-6),carZ=z0+1.4,car=pick(cars);
          box(carX,carZ,4.4,1.8,.04,.61,car,car);
          box(carX+.19,carZ,2.15,1.56,.65,.51,glass[1],car);
        }
      }
      const lotX=(x1-x0-10)/2,lotZ=(z1-z0-10)/2;
      for (const dx of [-.5,.5]) for (const dz of [-.5,.5]) {
        const bx=x+dx*lotX,bz=z+dz*lotZ;
        if (park||random()<.11) {
          tree(bx+between(-3,3),bz+between(-3,3));
          tree(bx+between(-3,3),bz+between(-3,3));
          continue;
        }
        const width=lotX*between(.55,.83),depth=lotZ*between(.53,.84);
        const height=urban?between(8,x*tallSide>0?23:16):between(3.3,7.2);
        const wall=pick(facades),roof=pick(roofs);
        if (urban) {
          box(bx,bz,width,depth,.08,height,wall,roof);
          if (height>13) box(bx,bz,width*.6,depth*.63,.08+height,between(.7,2.8),wall,pavement);
          if (detailed) {
            facadeDetail(bx,bz,width,depth,height,wall,false);
            box(bx,bz+depth*.5,width+.3,.32,.08+height,.47,wall,pavement);
            box(bx,bz-depth*.5,width+.3,.32,.08+height,.47,wall,pavement);
            if (height>16) box(bx+width*.33,bz+depth*.22,.32,.32,height,between(2,4),roof,pavement);
          }
        } else {
          house(bx,bz,width,depth,height,wall,roof,detailed);
        }
      }
    }
    return new Float32Array(vertices);
  }

  window.buildStadiumCity=build;
})();
