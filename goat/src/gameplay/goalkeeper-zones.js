window.goatGoalkeeperZones = (() => {
  'use strict';

  const zones = {
    A1: ['red', 'dive2Reference', 'oneHand', 'gkTipOverSide', 'catch4Reference', 'diveReference', 'catch3Reference'],
    B1: ['orange', 'oneHand', 'gkDeflectHigh', 'saveTopCatch', 'catch4Reference', 'dive2Reference'],
    C1: ['orange', 'catch4Reference', 'saveTopCatch', 'oneHand', 'gkDeflectHigh'],
    D1: ['orange', 'gkDeflectHigh', 'saveTopCatch', 'catch4Reference', 'oneHand', 'diveReference'],
    E1: ['red', 'diveReference', 'gkTipOverSide', 'oneHand', 'catch4Reference', 'dive2Reference', 'catch3Reference'],
    A2: ['red', 'dive2Reference', 'diveReference', 'gkDeflectSide2', 'gkReflexMid'],
    B2: ['lime', 'gkReflexMid', 'gkDeflectStand', 'catch2Reference', 'gkCatchJog', 'dive2Reference'],
    C2: ['lime', 'catch2Reference', 'saveChestCatch', 'gkCatchJog', 'gkCatchFwd', 'catchReference', 'gkDeflectStand'],
    D2: ['lime', 'catch2Reference', 'gkReflexMid', 'gkDeflectStand', 'gkCatchJog', 'diveReference'],
    E2: ['red', 'diveReference', 'gkDeflectSide2', 'dive2Reference', 'gkReflexMid'],
    A3: ['red', 'block2Reference', 'gkDeflectLow', 'gkReflexLow', 'blockReference', 'block3Reference'],
    B3: ['orange', 'block2Reference', 'gkDeflectLow', 'scoopReference', 'block3Reference'],
    C3: ['lime', 'scoopReference', 'saveQuickScoop', 'gkSmotherClose', 'gkReflexLow', 'gkDeflectSide1', 'blockReference', 'block2Reference'],
    D3: ['orange', 'blockReference', 'gkDeflectLow', 'scoopReference', 'block3Reference'],
    E3: ['red', 'blockReference', 'gkDeflectLow', 'gkReflexLow', 'block2Reference', 'block3Reference']
  };
  const halfWidth = 3.66, height = 2.44;

  function locate(path,padding=0) {
    if (!path || !Number.isFinite(path.x) || !Number.isFinite(path.y) || path.y < 0) return null;
    const outsideX=Math.max(0,Math.abs(path.x)-halfWidth);
    const outsideY=Math.max(0,path.y-height);
    if(Math.hypot(outsideX,outsideY)>padding)return null;
    const column=Math.max(0,Math.min(4,Math.floor((path.x+halfWidth)/(2*halfWidth)*5)));
    const row=3-Math.min(2,Math.floor(path.y/height*3));
    const id = 'ABCDE'[column] + row;
    const [color, ...options] = zones[id];
    return { id, column, row, color, options };
  }

  function prepareClips(clips, scale) {
    for (const key of [
      'oneHand', 'punchSave', 'reflexSave', 'footSave', 'footSave2',
      'gkTipOverBack1', 'gkTipOverBack2', 'gkTipOverStand', 'gkTipOverSide',
      'gkChipBack1', 'gkChipBack2', 'gkChipBack3', 'gkChipStand', 'gkChipSave', 'gkDeflectHigh',
      'gkChipCatchHigh', 'gkChipNearMiss', 'gkChipChaseGoal',
      'gkSmotherChest0', 'gkSmotherChest45', 'gkSmotherKnee', 'gkSmotherSide90', 'gkSmotherClose',
      'gkReflexLow', 'gkDeflectLow', 'gkDeflectSide1', 'gkDeflectSide2', 'gkDeflectStand',
      'gkReflexMid', 'gkCatchJog', 'gkCatchFwd'
    ]) {
      const clip = clips[key];
      if (!clip?.landmarks?.length) continue;
      clip.samples = clip.landmarks.map(frame =>
        ['LeftHand', 'RightHand', 'LeftFoot', 'RightFoot'].flatMap(name => frame[name].map(value => value * scale)));
      if (clip.takeoff === undefined) clip.takeoff = clip.contact * .64;
      if (clip.land === undefined) clip.land = Math.min(clip.duration, clip.contact + .31);
      clip.rootMotion = true;
    }
  }

  return { locate, prepareClips, zones };
})();
