(() => {
  'use strict';

  const { THREE, modules, standModels } = window.goatFootballHypeModels;
  const pitch = Object.freeze({ width:68, length:105, centerZ:52.5 });
  const occupancy = .85;
  const moduleCache = new Map();
  const react = { useMemo: create => create(), useEffect() {}, useLayoutEffect() {}, useCallback: fn => fn, useRef: current => ({ current }) };
  const jsx = (type, props, ...children) => ({ type, props, children: children.flat(Infinity).filter(child => child && typeof child === 'object') });

  function load(id) {
    if (id === 'three') return THREE;
    if (id === 'react') return react;
    if (!moduleCache.has(id)) moduleCache.set(id, modules[id](load, jsx));
    return moduleCache.get(id);
  }

  const { RealStadium } = load('real-stadiums');
  const { STADIUM_SKINS } = load('stadium-catalog');
  const { LevelTwoStadium } = load('level-two-stadium');
  const { TraditionalDetails } = load('stadium-architecture');
  const { realStadiumSeats, occupiedCrowdSeats, crowdNoise } = load('stadium-seating');
  const { genericCrowdSeats } = load('generic-crowd-seats');
  const { levelTwoCrowdSeats } = load('level-two-layout');
  const { clearCrowdSeats } = load('crowd-clearance');
  const { visitorCrowdSeat } = load('flare-layout');
  const geometryTypes = {
    boxGeometry: THREE.BoxGeometry, cylinderGeometry: THREE.CylinderGeometry,
    planeGeometry: THREE.PlaneGeometry, ringGeometry: THREE.RingGeometry, tubeGeometry: THREE.TubeGeometry
  };

  function objectFromTree({ type, props, children }) {
    if (typeof type === 'function') return objectFromTree(type(props));
    const { name, position, rotation, quaternion, scale } = props;
    let object;
    if (type === 'group') {
      object = new THREE.Group();
      for (const child of children) object.add(objectFromTree(child));
    } else if (type === 'mesh') {
      const shape = children.find(child => geometryTypes[child.type]);
      const paint = children.find(child => child.type === 'meshStandardMaterial')?.props ?? {};
      const geometry = props.geometry ?? new geometryTypes[shape.type](...(shape.props.args ?? []));
      const { color, side, transparent, opacity, map, vertexColors } = paint;
      const material = new THREE.MeshStandardMaterial(Object.fromEntries(Object.entries({
        color, side, transparent, opacity, map, vertexColors
      }).filter(([, value]) => value != null)));
      object = new THREE.Mesh(geometry, material);
    } else {
      throw new Error('Elemento desconhecido do estádio: ' + type);
    }
    if (name) object.name = name;
    if (position) object.position.fromArray(position);
    if (rotation) object.rotation.fromArray(rotation);
    if (quaternion) object.quaternion.copy(quaternion);
    if (Array.isArray(scale)) object.scale.fromArray(scale);
    else if (scale != null) object.scale.setScalar(scale);
    return object;
  }

  function createStand({ nodes, positions, indices }, width, accent, showRoof) {
    const group = new THREE.Group();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    for (const node of nodes) {
      if (node.name === 'Cobertura' && !showRoof) continue;
      const color = node.materialName === 'Arquibancada' ? new THREE.Color(accent)
        : new THREE.Color().setRGB(...node.color.slice(0, 3));
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color }));
      mesh.name = node.name;
      mesh.position.fromArray(node.translation);
      mesh.scale.fromArray(node.scale);
      if (node.rotation) mesh.quaternion.fromArray(node.rotation);
      group.add(mesh);
    }
    group.scale.x = width;
    return group;
  }

  function genericStructure(level, accent) {
    if (level === 2) return objectFromTree(LevelTwoStadium());
    const group = new THREE.Group();
    const model = standModels[level === 1 ? 0 : 1];
    const sections = [
      { position:[0, 0, -63], angle:0, width:78 },
      { position:[0, 0, 63], angle:Math.PI, width:78 },
      { position:[45, 0, 0], angle:-Math.PI / 2, width:110 },
      { position:[-45, 0, 0], angle:Math.PI / 2, width:110 }
    ];
    for (const [index, section] of sections.entries()) {
      for (let tier = 0; tier < (level === 3 ? 2 : 1); tier++) {
        const stand = createStand(model, section.width, accent, level === 3 && index >= 2);
        stand.position.set(section.position[0] * (tier ? 1.12 : 1), tier * 10, section.position[2] * (tier ? 1.08 : 1));
        stand.rotation.y = section.angle;
        group.add(stand);
      }
    }
    group.add(objectFromTree(TraditionalDetails({ level, color:accent })));
    return group;
  }

  function meshLayers(structure, bounds) {
    const groups = new Map();
    structure.updateWorldMatrix(true, true);
    structure.traverseVisible(object => {
      if (!object.isMesh) return;
      const opacity = object.material.transparent ? object.material.opacity : 1;
      if (!groups.has(opacity)) groups.set(opacity, []);
      groups.get(opacity).push(object);
    });
    return [...groups].sort(([a], [b]) => b - a).map(([opacity, objects]) => {
      const count = objects.reduce((total, { geometry }) => total + (geometry.index ?? geometry.attributes.position).count, 0);
      const vertices = new Float32Array(count * 9);
      const point = new THREE.Vector3(), normal = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
      const textures = new Map();
      let at = 0;
      for (const { geometry, material, matrixWorld } of objects) {
        if (!geometry.attributes.normal) geometry.computeVertexNormals();
        const { position, normal: normals, uv } = geometry.attributes;
        const index = geometry.index;
        const color = material.color.clone().convertLinearToSRGB();
        normalMatrix.getNormalMatrix(matrixWorld);
        const image = material.map?.image;
        if (image?.getContext && !textures.has(image)) {
          textures.set(image, image.getContext('2d').getImageData(0, 0, image.width, image.height));
        }
        const texture = textures.get(image);
        for (let i = 0; i < (index ?? position).count; i++) {
          const v = index ? index.getX(i) : i;
          point.fromBufferAttribute(position, v).applyMatrix4(matrixWorld);
          bounds?.expandByPoint(point);
          normal.fromBufferAttribute(normals, v).applyNormalMatrix(normalMatrix);
          vertices[at++] = point.x;
          vertices[at++] = point.y;
          vertices[at++] = point.z + pitch.centerZ;
          vertices[at++] = normal.x;
          vertices[at++] = normal.y;
          vertices[at++] = normal.z;
          let r = color.r, g = color.g, b = color.b;
          if (texture && uv) {
            const x = Math.max(0, Math.min(texture.width - 1, Math.floor(uv.getX(v) * texture.width)));
            const y = Math.max(0, Math.min(texture.height - 1, Math.floor((1 - uv.getY(v)) * texture.height)));
            const pixel = (y * texture.width + x) * 4;
            r *= texture.data[pixel] / 255;
            g *= texture.data[pixel + 1] / 255;
            b *= texture.data[pixel + 2] / 255;
          }
          vertices[at++] = r;
          vertices[at++] = g;
          vertices[at++] = b;
        }
      }
      return { opacity, vertices };
    });
  }

  const CLUB_SKIN = {
    palmeiras:'palmeiras-park', 'sao-paulo':'morumbi', santos:'vila-belmiro',
    'athletico-pr':'arena-baixada', athletico:'arena-baixada', 'athletico-paranaense':'arena-baixada',
    flamengo:'maracana', fluminense:'maracana', cruzeiro:'mineirao', 'atletico-mg':'arena-mrv',
    corinthians:'neo-quimica', vasco:'sao-januario', 'vasco-da-gama':'sao-januario',
    internacional:'beira-rio', gremio:'arena-gremio', 'botafogo-rj':'nilton-santos', botafogo:'nilton-santos'
  };
  const list = [
    { id:'arena-brasa', name:'Arena Brasa (clássico)', kind:'brasa' },
    { id:'generic-1', name:'Campo de Bairro (Nível 1)', kind:'generic', level:1, accent:'#315d55' },
    { id:'generic-2', name:'Estádio Municipal (Nível 2)', kind:'generic', level:2, accent:'#79b8d5' },
    { id:'generic-3', name:'Caldeirão Urbano (Nível 3)', kind:'generic', level:3, accent:'#875742' },
    ...STADIUM_SKINS.map(([id,name]) => ({ id,name,kind:'real' }))
  ];
  const byId = Object.fromEntries(list.map(item => [item.id,item]));

  function forClub(club, roundSalt = 0) {
    const id = typeof club === 'string' ? club : club?.id ?? '';
    if (CLUB_SKIN[id]) return CLUB_SKIN[id];
    let hash = 2166136261;
    for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    return 'generic-' + (1 + ((hash >>> 0) + Math.max(0, roundSalt | 0)) % 3);
  }

  function build(id) {
    const info = byId[id];
    if (!info || info.kind === 'brasa') return null;
    const structure = info.kind === 'real' ? objectFromTree(RealStadium({ skin:id })) : genericStructure(info.level, info.accent);
    const rows = info.kind === 'real' ? realStadiumSeats(id) : info.level === 2 ? levelTwoCrowdSeats() : genericCrowdSeats(info.level);
    const safe = clearCrowdSeats(structure, rows);
    const occupied = occupiedCrowdSeats(safe, occupancy);
    const seats = safe.flatMap((seat, index) => occupied[index] ? [{
      ...seat, z:seat.z + pitch.centerZ, visitor:visitorCrowdSeat(seat), sourceIndex:index
    }] : []);
    const bounds = info.kind === 'real' ? new THREE.Box3() : null;
    const layers = meshLayers(structure, bounds);
    const aerialBounds = bounds && !bounds.isEmpty() ? {
      center: bounds.getCenter(new THREE.Vector3()).toArray(),
      halfSize: bounds.getSize(new THREE.Vector3()).multiplyScalar(.5).toArray()
    } : null;
    if (aerialBounds) aerialBounds.center[2] += pitch.centerZ;
    return { layers, seats, aerialBounds, fog:info.kind === 'real' ? 260 : 205 };
  }

  window.goatStadiums = { list, byId, forClub, build, crowdNoise, pitch };
})();
