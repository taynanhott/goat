(function () {
  'use strict';

  const ink = [.062, .047, .072];
  const horizon = [.76, .65, .56];
  const print = `
    float fleck(vec2 p) {
      vec3 q=fract(vec3(p.xyx)*.1031);
      q+=dot(q,q.yzx+33.33);
      return fract((q.x+q.y)*q.z);
    }
    float wash(vec2 p) {
      vec2 i=floor(p), f=fract(p);
      f=f*f*(3.0-2.0*f);
      return mix(mix(fleck(i),fleck(i+vec2(1,0)),f.x),
                 mix(fleck(i+vec2(0,1)),fleck(i+vec2(1,1)),f.x),f.y);
    }
    float pigment(vec2 p) {
      float wide=wash(p*vec2(.42,1.8)+.26*wash(p*.8));
      float dry=wash(p*vec2(6.0,18.0));
      float fibers=fleck(gl_FragCoord.xy);
      return .87+.19*wide+.08*dry+.045*(fibers-.5);
    }
    float etchedLine(float value, float width) {
      float d=abs(fract(value)-.5);
      return 1.0-smoothstep(width,width+.095,d);
    }
    vec3 printShade(vec3 color, vec3 normal, vec2 paper, float textureStrength) {
      float light=dot(normal,normalize(vec3(-.62,.72,.48)));
      float middle=smoothstep(-.14,-.07,light);
      float lit=smoothstep(.38,.47,light);
      float rim=smoothstep(.67,.88,dot(normal,normalize(vec3(.67,.60,-.45))));
      vec3 dark=color*vec3(.39,.47,.61)+vec3(.075,.040,.075);
      vec3 mid=color*vec3(.76,.75,.86)+vec3(.046,.027,.036);
      vec3 bright=color*vec3(1.05,.94,.85)+vec3(.13,.086,.039);
      vec3 printed=mix(mix(dark,mid,middle),bright,lit)+rim*.10*vec3(1.0,.62,.29);
      printed*=mix(1.0,pigment(paper),textureStrength);
      float diagonal=etchedLine((gl_FragCoord.x+gl_FragCoord.y*1.39)/7.5,.05);
      float crosshatch=etchedLine((gl_FragCoord.x-gl_FragCoord.y*.95)/9.5,.035);
      float hatching=diagonal*(1.0-middle*.9)+crosshatch*(1.0-smoothstep(-.8,-.38,light))*.52;
      return mix(printed,vec3(.073,.049,.085),hatching*.48*textureStrength);
    }
  `;

  function createSky(gl, shader) {
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,`
      attribute vec2 corner;
      varying mediump vec2 plane;
      void main(){plane=corner;gl_Position=vec4(corner,0.99,1.0);}
    `));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`
      precision mediump float;
      varying mediump vec2 plane;
      uniform vec2 cameraAngle;
      uniform float aspect;
      ${print}
      void main(){
        vec2 p=vec2(plane.x*aspect,plane.y+cameraAngle.y*1.4);
        float height=smoothstep(-.62,1.38,p.y);
        vec3 color=mix(vec3(1.0,.77,.42),vec3(.23,.42,.58),height);
        vec2 sun=p-vec2(.69-cameraAngle.x*.35,.59);
        float disk=1.0-smoothstep(.19,.195,length(sun));
        color=mix(color,vec3(1.0,.89,.63),exp(-length(sun)*2.05)*.53);
        color=mix(color,vec3(.98,.62,.32),disk*.25);
        color=mix(color,vec3(1.0,.93,.68),disk*(1.0-smoothstep(.179,.186,length(sun))));
        vec2 wind=vec2(p.x+cameraAngle.x*.54,p.y+.08*p.x);
        float cloud=wash(wind*vec2(2.1,10.1))*.70+wash(wind*vec2(4.4,18.0))*.30;
        float body=smoothstep(.57,.615,cloud)*smoothstep(-.37,.23,p.y)*(1.0-smoothstep(.88,1.38,p.y));
        float light=smoothstep(.64,.78,cloud);
        vec3 cloudColor=mix(vec3(.51,.45,.55),vec3(.94,.77,.64),light);
        cloudColor*=.92+.15*wash(wind*vec2(18.0,38.0));
        color=mix(color,cloudColor,body*.77);
        vec2 screen=fract(gl_FragCoord.xy/5.0)-.5;
        float dots=1.0-smoothstep(.10,.23,length(screen));
        color=mix(color,vec3(.24,.23,.33),dots*(height*.14+body*.18));
        color*=.975+.045*fleck(gl_FragCoord.xy);
        gl_FragColor=vec4(color,1.0);
      }
    `));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
    const corner=gl.getAttribLocation(program,'corner');
    const cameraAngle=gl.getUniformLocation(program,'cameraAngle');
    const aspect=gl.getUniformLocation(program,'aspect');
    const buffer=gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    return (width,height,eye,focus)=>{
      gl.depthMask(false);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
      gl.enableVertexAttribArray(corner);
      gl.vertexAttribPointer(corner,2,gl.FLOAT,false,8,0);
      const dx=focus[0]-eye[0],dz=focus[2]-eye[2];
      gl.uniform2f(cameraAngle,Math.sin(Math.atan2(dx,-dz)),Math.atan2(focus[1]-eye[1],Math.hypot(dx,dz)));
      gl.uniform1f(aspect,width/height);
      gl.drawArrays(gl.TRIANGLES,0,3);
      gl.depthMask(true);
    };
  }

  window.footballComicArt={ink,horizon,print,createSky};
})();
