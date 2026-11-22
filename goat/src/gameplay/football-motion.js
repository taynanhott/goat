window.createFootballMotionController = function(options) {
  'use strict';
  const { clips } = options;
  const states = new WeakMap();
  const feet = ['LeftFoot', 'RightFoot'];
  const ankleHeight = .118;
  function clipLandings(clip) {
    if (!clip?.landmarks?.length) return [0, 0];
    return feet.map(foot => {
      const frames = clip.landmarks;
      const lowest = Math.min(...frames.map(frame => frame[foot][1]));
      const landing = frames.findIndex((frame, index) => index > 0 &&
        frames[index - 1][foot][1] >= lowest + 6 && frame[foot][1] < lowest + 6);
      return Math.max(0, landing) / clip.fps;
    });
  }
  const walkReference = clips.jog;
  const walkLandings = clipLandings(walkReference);
  const cyclicRefs = {};
  for (const key of ['standardWalk', 'jog', 'sprint', 'walkingLeftTurn']) {
    if (clips[key]?.landmarks?.length) cyclicRefs[key] = { clip: clips[key], landings: clipLandings(clips[key]) };
  }
  function swingProfile(key) {
    const clip = clips[key];
    if (!clip) return null;
    let best = null;
    for (const name of feet) {
      const frames = clip.landmarks.map(frame => frame[name]);
      const floor = Math.min(...frames.map(point => point[1]));
      const threshold = floor + Math.max(2, (Math.max(...frames.map(point => point[1])) - floor) * .16);
      let start = 0;
      while (start < frames.length - 3) {
        if (frames[start][1] > threshold || frames[start + 1][1] <= threshold) {
          start++;
          continue;
        }
        let end = start + 2;
        while (end < frames.length && frames[end][1] > threshold) end++;
        if (end >= frames.length) break;
        const points = frames.slice(start, end + 1);
        const reach = points.at(-1)[2] - points[0][2];
        const lift = points.map((point, i) => Math.max(0, point[1] -
          (points[0][1] + (points.at(-1)[1] - points[0][1]) * i / (points.length - 1))));
        const peak = Math.max(...lift);
        if (end - start >= 4 && reach > 11 && peak > 3 && (!best || reach > best.reach)) {
          best = { clip: key, foot: name, start: start / clip.fps, end: end / clip.fps,
            reach, lift: lift.map(y => y / peak) };
        }
        start = end;
      }
    }
    return best;
  }

  const jogSwing = swingProfile('jog');
  const walkSwing = swingProfile('standardWalk') ?? jogSwing;
  const runSwing = jogSwing;
  const sprintSwing = swingProfile('sprint') ?? runSwing;

  function runningProfile(pace) {
    if (pace < 2.4) return walkSwing && {
      low: walkSwing, high: runSwing, blend: smooth((pace - 1.15) / 1.25)
    };
    return runSwing && {
      low: runSwing, high: sprintSwing, blend: smooth((pace - 2.65) / 1.85)
    };
  }

  function profileLift(profile, phase) {
    const from = swingSample(profile.low.lift, phase);
    const to = swingSample(profile.high.lift, phase);
    return mix(from, to, profile.blend);
  }

  function swingSample(channel, phase) {
    const frame = phase * (channel.length - 1);
    const index = Math.floor(frame);
    return mix(channel[index], channel[Math.min(index + 1, channel.length - 1)], frame - index);
  }

  const shotFrames = {
    kick: 8, kick2: 11, powerKick: 10, finesseStand: 9, finesseRun: 10,
    shotSide: 8, shotDiagonal: 11, shotBack: 10
  };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
  const angle = value => Math.atan2(Math.sin(value), Math.cos(value));
  const forward = yaw => [-Math.sin(yaw), -Math.cos(yaw)];
  const left = yaw => [-Math.cos(yaw), Math.sin(yaw)];
  const yawOf = (x, z) => Math.atan2(-x, -z);
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
  const interpolate = (a, b, u) => a.map((value, index) => mix(value, b[index], u));

  const turnSeverity = error => smooth((Math.abs(error) - .32) / 1.90);
  const normalGrip = pace => clamp(10.8 / Math.max(.70, pace), 2.25, 11.3);
  const exitGrip = pace => normalGrip(pace) * 1.40;

  function pivotDuration(turn) {
    return mix(.285, .375, smooth((turn.speed - 1.5) / 4.1)) * mix(.80, 1, Math.abs(turn.delta) / Math.PI);
  }

  function reverseRun(state, { intent, facing, wishYaw, previousYaw, velocityYaw, pace, dt, controlled, recoverable, player, ball, velocity, requestPull }) {
    if (!state) return null;
    state.reversalRetry = Math.max(0, (state.reversalRetry ?? 0) - dt);
    state.reversalCooldown = Math.max(0, (state.reversalCooldown ?? 0) - dt);
    let turn = state.reversal;
    if (turn && (facing !== undefined || turn.withBall && !controlled || !turn.anchor &&
        (intent ? Math.abs(angle(wishYaw - turn.command)) > .85 : !turn.manual && (turn.phase !== 'plant' || turn.age > .13)))) {
      state.reversal = null;
      state.reversalCooldown = .35;
      turn = null;
    }
    const offset = [ball[0] - player.x, ball[2] - player.z];
    const gap = Math.hypot(...offset);
    const front = forward(player.yaw);
    const lead = offset[0] * front[0] + offset[1] * front[1];
    const close = controlled && !player.retrievingBall && ball[1] < .22 && gap < 1.32 && lead > -.26;
    const commandedReverse = close && Math.abs(angle(wishYaw - player.yaw)) > 1.95;
    const travellingReverse = (!controlled || close) && pace > (controlled ? 1.35 : .35) &&
      Math.abs(angle(wishYaw - velocityYaw)) > (controlled ? 1.95 : 1.85) &&
      (!controlled || Math.abs(angle(wishYaw - player.yaw)) > 1.85);
    const manual = requestPull && close;
    if (!turn && state.reversalRetry === 0 && state.reversalCooldown === 0 && facing === undefined && (manual || intent && (commandedReverse || travellingReverse))) {
      const from = close ? player.yaw : velocityYaw;
      const target = manual ? (intent ? wishYaw : from + Math.PI) : wishYaw;
      let delta = angle(target - from);
      const side = left(from);
      const lateral = offset[0] * side[0] + offset[1] * side[1];
      const lateralVelocity = velocity[0] * side[0] + velocity[2] * side[1];
      const contactSide = lateral + lateralVelocity * .095;
      const footSide = manual ? (Math.sign(contactSide) || 1) : (Math.sign(delta) || 1);
      if (manual && Math.sign(delta) !== footSide) delta += footSide * 2 * Math.PI;
      turn = { from, command: target, target, delta, age: 0, speed: pace, phase: 'plant',
        withBall: close, manual, index: footSide > 0 ? 0 : 1,
        pullAxis: manual && !intent ? forward(from + Math.PI - footSide * .38) : forward(target),
        plantDuration: mix(.15, .21, smooth(pace / 5.6)),
        brakeDuration: mix(.12, .22, smooth((pace - 1.5) / 4)) };
      state.reversal = turn;
    }
    if (!turn) return null;
    turn.age += dt;
    if (intent && !turn.manual && Math.abs(angle(wishYaw - turn.command)) < .75) {
      turn.target = wishYaw;
      turn.delta = angle(turn.target - turn.from);
      turn.pullAxis = forward(turn.target);
    }
    const brakeTime = mix(.085, .19, smooth((turn.speed - 1.7) / 4));
    const plantCap = turn.withBall ? turn.plantDuration : Math.max(.12, turn.brakeDuration || brakeTime);
    if (turn.phase === 'plant') {
      const plantProgress = clamp(turn.age / Math.max(.10, plantCap), 0, 1);
      const plantHeading = turn.withBall ? turn.from : turn.from + turn.delta * smooth(plantProgress) * .35;
      if (!turn.withBall && intent && turn.age > .08 && Math.abs(angle(wishYaw - plantHeading)) < .22) {
        state.reversal = null;
        state.reversalRetry = .45;
        return { phase: 'exit', heading: wishYaw, progress: 1, action: turn };
      }
      const ready = turn.withBall ? (turn.anchor && pace <= 1.85) || (turn.age >= turn.plantDuration && gap < 1.25) : pace <= 2.08 && turn.age >= brakeTime;
      if (!ready && turn.age < (turn.withBall ? turn.plantDuration + .14 : .33)) {
        return { phase: 'plant', heading: plantHeading, progress: plantProgress, action: turn };
      }
      turn.plantEndFrac = turn.withBall ? 0 : smooth(plantProgress) * .35;
      if (turn.withBall && !turn.anchor && gap < 1.30) {
        turn.anchor = [...ball];
        turn.lastSoleContact = turn.age;
      }
      if (turn.withBall && !turn.anchor) {
        state.reversal = null;
        state.reversalRetry = .22;
        return null;
      }
      turn.withBall = !!turn.anchor;
      turn.phase = turn.withBall ? 'pull' : 'pivot';
      turn.phaseAt = turn.age;
      turn.lastSoleContact ??= turn.age;
      turn.duration = turn.withBall ? (turn.manual ? .22 : .18) : pivotDuration(turn);
    }

    if (turn.phase === 'pull') {
      const progress = (turn.age - turn.phaseAt) / turn.duration;
      if (turn.age - (turn.lastSoleContact ?? turn.phaseAt) > .22 && gap > 1.35) {
        state.reversal = null;
        state.reversalRetry = .22;
        return null;
      }
      if (progress < 1) return { phase: 'pull', heading: turn.from, progress, action: turn };
      turn.phase = 'pivot';
      turn.phaseAt = turn.age;
      turn.duration = turn.manual ? .26 : .26;
    }
    const progress = clamp((turn.age - turn.phaseAt) / turn.duration, 0, 1);
    const startFrac = turn.plantEndFrac ?? 0;
    const rotation = turn.withBall ? smooth((progress - .10) / .90) : mix(startFrac, 1, smooth(progress));
    const currentHeading = turn.from + turn.delta * rotation;
    const reachedTarget = intent && !turn.manual && Math.abs(angle(wishYaw - currentHeading)) < .22;
    if (progress >= 1 || reachedTarget) {
      const exitHeading = reachedTarget ? wishYaw : turn.target;
      state.reversal = null;
      state.reversalCooldown = .45;
      if (turn.withBall) {
        state.sinceTouch = 0;
        state.touchHeading = exitHeading;
      }
      return { phase: 'exit', heading: exitHeading, progress: 1, action: turn };
    }
    return { phase: 'pivot', heading: currentHeading, progress, action: turn };
  }

  function move(player, { dt, direction, speed, sprint, ball, velocity, controlled, loose = false, recoverable = false, facing, requestCut = false, requestPull = false, fakeCut = false, lateralCut, accelerationScale = 1 }) {
    if (dt <= 0) return Math.hypot(player.vx || 0, player.vz || 0);
    const flight=player.aerialFlight;
    if(flight?.airborne){
      player.vx=flight.vx;player.vz=flight.vz;
      player.x+=flight.vx*dt;player.z+=flight.vz*dt;
      player.yaw=flight.yaw;
      player.dribbleIntent=false;player.touchPending=null;
      return Math.hypot(flight.vx,flight.vz);
    }
    const oldX = player.vx || 0, oldZ = player.vz || 0;
    const pace = Math.hypot(oldX, oldZ);
    const intent = speed > .05;
    const wishYaw = intent ? yawOf(...direction) : player.yaw;
    const lastCommand = player.dribbleIntent ? player.dribbleHeading : undefined;
    const commandDelta = lastCommand === undefined ? 0 : angle(wishYaw - lastCommand);
    const commandTurn = Math.abs(commandDelta) / dt;
    const velocityYaw = pace > .12 ? yawOf(oldX, oldZ) : player.yaw;
    const inputTurn = Math.abs(angle(wishYaw - velocityYaw));
    const wasCutting = player.cutting;
    const wasRecovering = player.recovering;
    const wasRetrieving = player.retrievingBall;
    const wasReceiving = player.receiving;
    const openingCut = controlled && intent && player.spawnControl?.cutUntil !== undefined;
    const guidedCut = openingCut || fakeCut;
    const state = states.get(player);
    const curveInput = controlled && intent && facing === undefined && !guidedCut && !requestCut && !requestPull &&
      ball[1] < .23 && pace > 1.25 && Math.abs(commandDelta) < .15;
    const filteredCurve = curveInput ? mix(state?.commandCurve ?? 0, clamp(commandDelta / dt, -4.8, 4.8), 1 - Math.exp(-dt * 12)) : 0;
    if (state) state.commandCurve = filteredCurve;
    const curveRate = filteredCurve * smooth((Math.abs(filteredCurve) - .40) / .66);
    const curvePace = Math.min(speed, 7.25 / Math.max(1.25, Math.abs(curveRate)));
    player.dribbleCurve = curveRate;
    const recentCut = state?.exit;
    const touchTurn = Math.abs(angle(wishYaw - (state?.touchHeading ?? lastCommand ?? wishYaw)));
    const needsDirectionalTouch = touchTurn > (sprint ? .19 : .125);
    const exiting = intent && controlled && facing === undefined && recentCut &&
      state.sinceTouch < recentCut.duration + .07 && Math.abs(angle(wishYaw - recentCut.heading)) < (sprint ? .22 : .15);
    player.dribbleTargetSpeed = curvePace;
    const closePace = Math.max(1.18, speed);
    player.brakeOnRelease = controlled && facing === undefined && !sprint &&
      (player.dribbleSprint || player.brakeOnRelease) &&
      (pace > closePace + .10 || Math.hypot(velocity[0], velocity[2]) > closePace + .03);
    player.dribbleSprint = sprint;
    let driveYaw = wishYaw;
    let desiredSpeed = speed;
    let cutApproach = 0;
    const reversal = lateralCut ? null : reverseRun(state, { intent, facing, wishYaw, previousYaw: lastCommand, velocityYaw, pace, dt, controlled, recoverable, player, ball, velocity, requestPull });
    player.turningAround = reversal;
    if (reversal) player.dribbleCurve = 0;

    player.collecting = false;
    player.cutting = false;
    player.recovering = false;
    player.retrievingBall = false;
    player.receiving = false;
    if ((controlled || recoverable) && facing === undefined && ball[1] < .32) {
      const x = ball[0] - player.x, z = ball[2] - player.z;
      const gap = Math.hypot(x, z);
      const ahead = x * direction[0] + z * direction[1];
      const relative = gap > .01 ? ahead / gap : 1;
      const ballPace = velocity[0] * direction[0] + velocity[2] * direction[1];
      const rollingPace = Math.hypot(velocity[0], velocity[2]);
      const ballYaw = yawOf(x, z);
      const pathYaw = rollingPace > .20 ? yawOf(velocity[0], velocity[2]) : ballYaw;
      const pathTurn = Math.abs(angle(wishYaw - pathYaw));
      const sideways = Math.abs(x * direction[1] - z * direction[0]);
      const lookAhead = .16;
      const curveAxis = left(wishYaw);
      const curveSlip = (x + (velocity[0] - oldX) * lookAhead) * curveAxis[0] +
        (z + (velocity[2] - oldZ) * lookAhead) * curveAxis[1] - .5 * pace * player.dribbleCurve * lookAhead ** 2;
      const curveTouch = Math.abs(player.dribbleCurve) > .55 && gap < 1.40 &&
        (Math.abs(curveSlip) > .16 || pathTurn > .14 || gap > .70);
      const nextGap = Math.hypot(x + (velocity[0] - oldX) * .16, z + (velocity[2] - oldZ) * .16);
      const escapingSide = gap > .74 && sideways > .50 && relative < .72 && nextGap > 1.02;
      const facingDirection = forward(player.yaw);
      const leadInFront = x * facingDirection[0] + z * facingDirection[1];
      const bodySideways = Math.abs(x * facingDirection[1] - z * facingDirection[0]);
      const behind = gap > .23 && leadInFront < -.095;
      const recoveringSide = recoverable && gap < 2.20 && (bodySideways > .33 || leadInFront < .26);
      const retrieving = behind || recoveringSide || state?.reversalRetry > 0 && gap < 1.45 ||
        wasRetrieving && (recoverable || gap > .35 || leadInFront < .17);
      const needsRecovery = intent && gap < 1.54 && (
        wasRecovering && gap > .61 || gap > .91 && (relative < .50 || sideways > .57) || escapingSide
      );
      const needsFrontTouch = gap > .26 && leadInFront < .11 && ahead < .20;
      const sideDrift = sideways > (sprint ? .30 : .23) && sideways > Math.max(.12, ahead * .69) ||
        bodySideways > (sprint ? .33 : .25) && bodySideways > Math.max(.14, leadInFront * .82);
      const tangent = sideways > (sprint ? .29 : .21) && pathTurn > (sprint ? .24 : .17);
      const changing = needsDirectionalTouch || sideDrift || tangent || (wasCutting && pathTurn > (sprint ? .22 : .15));
      const canCut = intent && (curveTouch || gap < (sprint ? 1.18 : .91) && (guidedCut || requestCut || needsFrontTouch || changing ||
        pathTurn > .43 && (inputTurn > .24 || relative < .68 && sideways > .21)));
      if (retrieving) {
        player.retrievingBall = true;
        player.recovering = true;
        player.collecting = true;
        driveYaw = ballYaw;
        const approach = gap > .01 ? (velocity[0] * x + velocity[2] * z) / gap : 0;
        const aligned = 1 - smooth((Math.abs(angle(ballYaw - player.yaw)) - .32) / 1.0);
        desiredSpeed = clamp(approach + (gap - .30) * 4.4, 0, recoverable ? 4.9 : 4.1) * aligned;
      } else if (recoverable) {
        desiredSpeed = speed;
      } else if (exiting && gap < 1.24 && !curveTouch && !needsDirectionalTouch && !sideDrift) {
        const leadInTurn = x * direction[0] + z * direction[1];
        const catchPace = ballPace + (leadInTurn - .10) * 4.2;
        const paceFloor = speed * mix(sprint ? .86 : .73, .44, smooth(recentCut.turn / 2.72));
        desiredSpeed = Math.min(speed, Math.max(paceFloor, catchPace));
        const closing = inputTurn < .63 && nextGap > .77;
        if (closing) driveYaw += clamp(angle(ballYaw - wishYaw), -.55, .55) * smooth((nextGap - .77) / .46) * .54;
      } else if (needsRecovery && !canCut) {
        player.recovering = true;
        player.collecting = true;
        driveYaw = ballYaw + clamp(angle(wishYaw - ballYaw), -.65, .65) * .27;
        const approach = gap > .01 ? (velocity[0] * x + velocity[2] * z) / gap : 0;
        const catchUp = Math.min(5.8, Math.max(1.22, speed, approach + .72));
        desiredSpeed = clamp(approach + (gap - .39) * 3.9, .54, catchUp);
      } else if (!intent && gap < 1.18 && rollingPace > .59) {
        player.collecting = true;
        driveYaw = pathYaw + clamp(angle(ballYaw - pathYaw), -.73, .73) * .80;
        desiredSpeed = clamp(rollingPace + (gap - .35) * 4.1, .45, player.brakeOnRelease ? 2.2 : 5.75);
      } else if (canCut) {
        player.cutting = true;
        const sharp = smooth((pathTurn - .67) / 1.38);
        const step = states.get(player)?.step;
        const meetingBall = step?.contact?.kind === 'cut' && !step.contact.used;
        cutApproach = meetingBall ? 0 : smooth((pathTurn - .49) / .96) * smooth((gap - .35) / .23);
        const reach = meetingBall ? smooth((gap - .55) / .32) : Math.max(cutApproach * .8, smooth((gap - .43) / .32));
        const interceptYaw = yawOf(x + velocity[0] * .12, z + velocity[2] * .12);
        const correction = angle(interceptYaw - wishYaw);
        const tightPivot = smooth((pathTurn - 1.49) / .99);
        const curveReach = curveTouch ? Math.max(smooth((Math.abs(curveSlip) - .13) / .38),
          smooth((gap - .58) / .45)) * (meetingBall ? .62 : 1) : 0;
        driveYaw += correction * Math.max(curveReach, reach * (meetingBall ? .55 : .84), tightPivot * .88, cutApproach * .95);
        const steerPace = Math.max(speed * (sprint ? .91 - sharp * .43 : .86 - sharp * .42),
          pace * (sprint ? .96 - sharp * .45 : .90 - sharp * .49));
        const travel = forward(driveYaw);
        const rollingAhead = velocity[0] * travel[0] + velocity[2] * travel[1];
        const matchingPace = (rollingAhead + (gap - .44) * 3.5) * reach;
        const cap = meetingBall ? speed : Math.min(5.8, Math.max(speed, ballPace + .28, rollingPace));
        if (guidedCut) {
          driveYaw = wishYaw + correction * (meetingBall ? .87 : 1);
          const [dx, dz] = forward(driveYaw);
          const following = velocity[0] * dx + velocity[2] * dz;
          desiredSpeed = Math.min(speed, clamp(following + (gap - .39) * 4.5, .48, 2.75));
        } else if (curveTouch) {
          const closePace = rollingAhead + (gap - .34) * 4.6;
          desiredSpeed = Math.min(curvePace, Math.max(.65, closePace));
        } else {
          desiredSpeed = Math.min(cap, Math.max(.66, steerPace, matchingPace));
        }
      } else if (intent && relative > .15 && gap > .25) {
        const steer = angle(ballYaw - wishYaw);
        const assist = smooth((gap - .45) / .35);
        const alignment = Math.max(1 - smooth(inputTurn / .47), assist * .75);
        const laneRecovery = smooth((sideways - .26) / .34) * smooth((gap - .62) / .48);
        driveYaw += clamp(steer, -.42, .42) * smooth((Math.abs(steer) - .12) / .50) * .72 * alignment;
        driveYaw += clamp(steer, -.80, .80) * laneRecovery * .82;
        const travel = forward(velocityYaw);
        const lead = Math.max(ahead, x * travel[0] + z * travel[1]);
        const safePace = ballPace + (lead - (sprint ? .27 : .20)) * (sprint ? 8.3 : 7.8);
        const steeringPace = pace * .93 * smooth(inputTurn / .11) * (1 - smooth((inputTurn - .45) / .26));
        desiredSpeed = Math.min(desiredSpeed, Math.max(.48, safePace, steeringPace));
      } else if (intent && gap < .88) {
        const advance = ballPace + (ahead - .04) * 3.8;
        const closing = ballPace > .48 && gap < .74;
        desiredSpeed = Math.min(speed, Math.max(.67, closing ? speed * .63 : pace * .78, advance));
      }
    }

    if (loose && sprint && intent && !reversal && !player.retrievingBall && facing === undefined && ball[1] < .29) {
      const x = ball[0] - player.x, z = ball[2] - player.z;
      const ahead = x * direction[0] + z * direction[1];
      const across = x * direction[1] - z * direction[0];
      const along = velocity[0] * direction[0] + velocity[2] * direction[1];
      const lead = clamp((ahead - .26) / Math.max(2.75, pace - along), 0, .17);
      if (ahead > (wasReceiving ? -.19 : .04) && ahead < 1.48 && Math.abs(across) < .38 + Math.max(0, ahead) * .18) {
        player.receiving = true;
        const intercept = yawOf(x + velocity[0] * lead, z + velocity[2] * lead);
        driveYaw += clamp(angle(intercept - wishYaw), -.31, .31) * smooth((ahead + .10) / .43);
        const settle = smooth((1.17 - ahead) / .82);
        const contactSpeed = clamp(along + 3.35, speed * .68, speed);
        desiredSpeed = mix(speed, contactSpeed, settle);
      }
    }
    if (controlled && intent && !reversal && facing === undefined && !player.recovering) {
      const correction = angle(driveYaw - wishYaw);
      const cuttingCurve = player.cutting && Math.abs(player.dribbleCurve) > .55;
      const clearance = (guidedCut || cuttingCurve) && player.cutting ? 1.5 : player.cutting ? .91 + cutApproach * .65 : .68;
      driveYaw = wishYaw + clamp(correction, -clearance, clearance);
    }
    if (reversal?.phase === 'plant' || reversal?.phase === 'pull') {
      driveYaw = reversal.heading;
      player.cutting = false;
      player.collecting = false;
      player.recovering = false;
      player.retrievingBall = false;
      const along = forward(driveYaw);
      const lead = (ball[0] - player.x) * along[0] + (ball[2] - player.z) * along[1];
      const incoming = velocity[0] * along[0] + velocity[2] * along[1];
      desiredSpeed = reversal.action.withBall
        ? reversal.action.anchor ? 0 : clamp(incoming + (lead - .43) * 5.5, 0, Math.min(2.1, pace + .42))
        : Math.min(speed, .66);
    } else if (reversal) {
      driveYaw = reversal.heading;
      player.cutting = false;
      player.collecting = false;
      player.recovering = false;
      player.retrievingBall = false;
      desiredSpeed = reversal.action.withBall
        ? Math.min(speed, mix(.55, Math.min(speed, 3.25), smooth((reversal.progress - .24) / .76)))
        : Math.min(speed, mix(.75, Math.min(speed, 2.85), smooth((reversal.progress - .36) / .64)));
    }
    if (lateralCut) {
      player.cutting = !lateralCut.touched;
      player.collecting = false;
      player.recovering = false;
      player.retrievingBall = false;
      const settling = !lateralCut.touched && lateralCut.elapsed < lateralCut.strike + .05;
      if (settling) {
        const front = forward(lateralCut.from);
        const lead = (ball[0] - player.x) * front[0] + (ball[2] - player.z) * front[1];
        const rolling = velocity[0] * front[0] + velocity[2] * front[1];
        driveYaw = lateralCut.from;
        desiredSpeed = clamp(rolling + (lead - .43) * 6, 0, Math.max(3.35, pace));
      } else {
        driveYaw = wishYaw;
        desiredSpeed = speed;
      }
    }
    if (!reversal && curvePace < speed) desiredSpeed = Math.min(desiredSpeed, curvePace);
    const error = angle(driveYaw - velocityYaw);
    const severity = turnSeverity(error);
    let goalSpeed = reversal ? desiredSpeed :
      exiting ? Math.min(desiredSpeed, speed * (1 - .70 * severity)) : desiredSpeed * (1 - .82 * severity);
    const defensiveRunning=!controlled&&!!player.settings&&(speed>1.6||pace>1.6);
    if(defensiveRunning&&pace<1.5){
      const alignment=Math.abs(angle(driveYaw-player.yaw));
      goalSpeed*=mix(.08,1,smooth((1.35-alignment)/1.0));
    }
    const pivoting = recentCut && state.sinceTouch < .38 &&
      inputTurn > 1.72 && Math.abs(angle(wishYaw - recentCut.heading)) < .33;
    const brakingRate = lateralCut ? 19 :
      reversal ? (reversal.action.withBall ? 23.5 : 15.8) + 4.0 * severity :
      intent ? 8.8 + 4.9 * severity + (pivoting ? 1.2 : 0) : controlled && !player.collecting ? 16.8 : 12;
    const driveRate = (sprint ? 7.4 : 6.6) * (1 - .29 * severity) * accelerationScale * (reversal?.phase === 'pivot' ? 1.55 : 1);
    const nextSpeed = pace + clamp(goalSpeed - pace, -brakingRate * dt, driveRate * dt);
    const defensiveAgility=!controlled&&player.settings?1.18+(player.settings.intelligence??0)*.16:1;
    const grip = (exiting ? exitGrip(pace) : normalGrip(pace) * (player.cutting ? 1.18 : pivoting ? 1.24 : 1))*defensiveAgility;
    const heading = reversal && reversal.phase !== 'plant' ? reversal.heading :
      pace < .16 ? driveYaw : velocityYaw + clamp(error, -grip * dt, grip * dt);
    const flow = forward(heading);
    const x = clamp(player.x + flow[0] * nextSpeed * dt, -limits.side, limits.side);
    const z = clamp(player.z + flow[1] * nextSpeed * dt, playerFrontLimit(player), limits.back);
    player.vx = (x - player.x) / dt;
    player.vz = (z - player.z) / dt;
    player.x = x;
    player.z = z;

    const actual = Math.hypot(player.vx, player.vz);
    const turnRate = mix(16, 10.6, smooth(actual / 5.6));
    const anticipation = mix(.19, .12, smooth(actual / 5.6));
    const torsoTarget = intent || player.collecting
      ? heading + clamp(angle(driveYaw - heading) * .35, -anticipation, anticipation) : heading;
    if(defensiveRunning){
      player.yaw+=clamp(angle(torsoTarget-player.yaw),-dt*12,dt*12);
    }
    else if (facing !== undefined) player.yaw = facing;
    else if (reversal && reversal.phase !== 'plant') player.yaw += angle(heading - player.yaw);
    else if (player.retrievingBall) player.yaw += clamp(angle(driveYaw - player.yaw), -11.8 * dt, 11.8 * dt);
    else if (intent || player.collecting || actual > .30) {
      const lag = angle(torsoTarget - player.yaw);
      player.yaw += lag * (1 - Math.exp(-dt * turnRate));
      const divergence = angle(player.yaw - heading);
      player.yaw += clamp(divergence, -.43, .43) - divergence;
    }
    player.dribbleIntent = intent;
    player.travelYaw = heading;
    if (intent) player.dribbleHeading = wishYaw;
    player.dribbleAcceleration = intent && controlled && !player.collecting && !player.cutting
      ? clamp(speed - actual, 0, sprint ? 1.65 : .80) * (1 - smooth((inputTurn - .20) / .48)) * (1 - smooth((commandTurn - .52) / .79)) : 0;

    const acceleration = [(player.vx - oldX) / dt, (player.vz - oldZ) / dt];
    const front = forward(player.yaw), side = left(player.yaw);
    const longitudinal = acceleration[0] * front[0] + acceleration[1] * front[1];
    const lateral = acceleration[0] * side[0] + acceleration[1] * side[1];
    const load = clamp((pace + actual) / 4.2, .25, 1);
    const old = player.inertiaPose ?? { pitch: 0, roll: 0, crouch: 0, twist: 0 };
    const weight = 1 - Math.exp(-dt * 11.5);
    const turnLoad = clamp(Math.abs(lateral) * .0025, 0, .022);
    player.inertiaPose = {
      pitch: mix(old.pitch, clamp(longitudinal * .012 + actual * .014, -.10, .16), weight),
      roll: mix(old.roll, clamp(-lateral * .038 * load, -.32, .32), weight),
      crouch: mix(old.crouch, (clamp(-longitudinal * .004, 0, .030) + turnLoad) * load, weight),
      twist: mix(old.twist, clamp(angle(torsoTarget - player.yaw) * .28, -.30, .30), weight),
      accel: mix(old.accel ?? 0, clamp(longitudinal, -12, 12), weight),
      latAccel: mix(old.latAccel ?? 0, clamp(lateral, -12, 12), weight)
    };
    return actual;
  }

  function shotContact(key) {
    const clip = clips[key];
    if (key === 'penalty') return { time: 22.3 / clip.fps, foot: 'RightFoot' };
    const frame = clip.origin === 'FIFA16' ? shotFrames[key] : undefined;
    return {
      time: frame !== undefined ? Math.min(clip.duration, frame / clip.fps) : clip.contact ?? clip.duration * .45,
      foot: key === 'shotSide' && frame !== undefined ? 'RightFoot' : clip.dominantFoot || 'LeftFoot'
    };
  }

  function footLocation(player, index, lead = 0, yaw = player.yaw) {
    const side = left(yaw), front = forward(yaw);
    const stance = mix(.139, .111, smooth((Math.hypot(player.vx || 0, player.vz || 0) - 1.3) / 3.4));
    const width = index === 0 ? stance : -stance;
    return [player.x + side[0] * width + lead * front[0], ankleHeight,
      player.z + side[1] * width + lead * front[1]];
  }

  function newState(player, ankles) {
    const origin = [player.x, 0, player.z];
    return {
      feet: feet.map((foot, index) => {
        const sample = ankles?.[index];
        const point = sample && distance(sample, origin) < .67 ? [sample[0], ankleHeight, sample[2]]
          : footLocation(player, index, -.035);
        return { foot, point, yaw: player.yaw, pitch: 0, roll: 0, toeFlex: 0 };
      }),
      step: null, next: null, amplitude: 0, sinceTouch: Infinity, bodyYaw: player.yaw,
      touchHeading: player.dribbleHeading ?? player.yaw,
      upperTime: walkLandings[1], upperWeight: 0, supportShift: 0, forwardLean: 0
    };
  }

  function predictBall(ball, velocity, seconds) {
    const pace = Math.hypot(velocity[0], velocity[2]);
    const travelTime = pace > .001
      ? Math.max(0, seconds - .5 * (.62 + .018 * pace * pace) * seconds * seconds / pace) : 0;
    return [ball[0] + velocity[0] * travelTime, Math.max(.11, ball[1] + velocity[1] * seconds),
      ball[2] + velocity[2] * travelTime];
  }

  function carryInterval(player, pace) {
    return player.dribbleSprint ? mix(.13, .34, smooth((pace - 3.15) / 2.30)) : .13;
  }

  function planContact(player, state, step, ball, velocity, pace, remaining = step.duration * step.strike) {
    const moving = player.dribbleIntent;
    const recovering = player.retrievingBall;
    const receiving = player.receiving;
    const cut = moving && !recovering && (player.cutting || player.collecting);
    const sprint = player.dribbleSprint;
    if (ball[1] > .23 || !receiving && state.sinceTouch < (cut ? (sprint ? .090 : .075) : .13)) return null;
    if (!moving && !recovering && Math.hypot(velocity[0], velocity[2]) < .32) return null;

    const body = { x: player.x + player.vx * remaining, z: player.z + player.vz * remaining, yaw: step.yaw };
    const predicted = predictBall(ball, velocity, remaining);
    const front = forward(step.yaw), side = left(step.yaw);
    const delta = [predicted[0] - body.x, predicted[2] - body.z];
    const ahead = delta[0] * front[0] + delta[1] * front[1];
    const lateral = delta[0] * side[0] + delta[1] * side[1];
    if (ahead < (cut ? -.35 : -.24) || ahead > (cut ? (sprint ? .88 : .72) : .87) || Math.abs(lateral) > (cut ? (sprint ? .65 : .55) : .44)) return null;
    if ((step.index === 0 ? lateral : -lateral) < (cut ? -.19 : -.13)) return null;

    const wish = moving ? player.dribbleHeading ?? player.yaw : step.yaw;
    const change = angle(wish - step.yaw);
    const ballForward = velocity[0] * front[0] + velocity[2] * front[1];
    const kind = receiving ? 'receive' : recovering || !moving ? 'trap' : cut ? 'cut' : 'carry';
    if (kind === 'carry' && ahead > .45 && ballForward > pace + .20) return null;
    const heading = cut ? wish : step.yaw + clamp(change, -.38, .38);
    const push = forward(heading);
    const correction = Math.abs(angle(wish - (state.touchHeading ?? step.yaw)));
    const curving = cut && Math.abs(player.dribbleCurve ?? 0) > .60;
    const guide = cut && (curving || correction < (sprint ? 1.04 : .87)) && ahead > .13 && Math.abs(lateral) < .40;
    const sole = (kind === 'trap' || cut) && !guide;
    const footSide = step.index === 0 ? 1 : -1;
    const outward = change * footSide;
    const outside = outward > .16 || outward > -.14 && lateral * footSide > (sprint ? .063 : .118);
    const surface = sole ? null : outside ? 'outside' : 'inside';
    const forwardRoll = ahead > .21 && Math.abs(lateral) < .34 && ballForward >= pace - .68;
    const runCarry = kind === 'carry' && sprint && pace > 3.65;
    if (runCarry && forwardRoll && state.sinceTouch + remaining < carryInterval(player, pace)) return null;
    const contactYaw = step.yaw + (sole
      ? clamp(change, -.60, .60) * (cut ? .58 : 0)
      : clamp(change, -.80, .80) * (guide ? .38 : .23) + footSide * (outside ? -.21 : .39));
    const boot = forward(contactYaw);
    const bootSide = left(contactYaw);
    const across = sole ? 0 : footSide * (outside ? .063 : -.071);
    const behind = sole ? 0 : guide ? .105 : .119;
    const point = [predicted[0] - push[0] * behind - bootSide[0] * across - boot[0] * .127, sole ? (cut ? .218 : .236) : .139,
      predicted[2] - push[1] * behind - bootSide[1] * across - boot[1] * .127];
    const hip = footLocation(body, step.index);
    if (distance(point, hip) > mix(cut ? .51 : .46, cut ? .66 : .57, smooth(pace / 5.5))) return null;
    return { foot: feet[step.index], point, kind, heading, contactYaw, sole, surface, used: false };
  }

  function stepTiming(pace) {
    if (pace < 1.65) return mix(.42, .34, smooth(pace / 1.65));
    return mix(.34, .217, clamp((pace - 1.65) / 3.95, 0, 1));
  }

  function landingPoint(player, index, yaw, pace, remaining, extraLead = 0) {
    const supportTime = mix(.12, .073, smooth(pace / 5.6));
    const end = { x: player.x + player.vx * remaining, z: player.z + player.vz * remaining, yaw };
    const stand = footLocation({ ...end, vx: player.vx, vz: player.vz }, index, -.028, yaw);
    const reach = Math.hypot(player.vx, player.vz) * supportTime + extraLead;
    const travel = pace > .16 ? yawOf(player.vx, player.vz) : yaw;
    const advance = forward(yaw + clamp(angle(travel - yaw), -.27, .27));
    stand[0] = clamp(stand[0] + advance[0] * reach, -limits.side-.24, limits.side+.24);
    stand[2] = clamp(stand[2] + advance[1] * reach, playerFrontLimit(player) - .25, limits.back + .24);
    return stand;
  }

  function startStep(player, state, pace, ball, velocity, controlled) {
    const side = left(player.yaw);
    const ballLateral = (ball[0] - player.x) * side[0] + (ball[2] - player.z) * side[1];
    const front = forward(player.yaw);
    const progress = state.feet.map(foot => (foot.point[0] - player.x) * front[0] + (foot.point[2] - player.z) * front[1]);
    const preferred = controlled && Math.abs(ballLateral) > .035 ? Number(ballLateral < 0)
      : Number(progress[1] < progress[0]);
    const curveCut = controlled && player.cutting && Math.abs(player.dribbleCurve ?? 0) > .55;
    const index = state.next ?? preferred;
    const setting = pace < .23;
    const walk = 1 - smooth((pace - .75) / 1.75);
    const run = smooth((pace - 1.55) / 3.75);
    const duration = setting ? .26 : stepTiming(pace) * (1 - walk * smooth(Math.abs(angle(player.yaw - state.bodyYaw))) * .18)
      * (controlled ? 1 : 1 - run * .04);
    const foot = state.feet[index], support = state.feet[1 - index];
    const step = {
      roll: smooth((pace - .14) / .75),
      flight: smooth((pace - 3.05) / 2.20) * (controlled ? .62 : 1),
      run, pushPower: smooth((pace - 3.35) / 2.15), extraLead: (controlled ? .032 : .060) * run,
      startRoll: foot.roll, startFlex: foot.toeFlex, supportPitch: support.pitch, supportRoll: support.roll,
      index, duration, strike: curveCut ? .52 : controlled && player.cutting ? .59 : .71, age: 0, start: [...foot.point], startYaw: foot.yaw, startPitch: foot.pitch,
      yaw: foot.yaw + angle(player.yaw - foot.yaw),
      target: landingPoint(player, index, player.yaw, pace, duration, (controlled ? .032 : .060) * run),
      walk, profile: setting ? null : runningProfile(pace, controlled, curveCut ? 1 : Math.abs(angle(player.yaw - state.bodyYaw))),
      lift: setting ? .060 : mix(.097, .249, smooth(pace / 5.4)) * (1 - walk * .34)
    };
    if (controlled) {
      step.contact = planContact(player, state, step, ball, velocity, pace);
      if (!step.contact && (state.next === null || setting || player.cutting && state.sinceTouch > (curveCut ? .095 : .15)
        && distance(state.feet[index].point, footLocation(player, index)) < .47)) {
        const opposite = { ...step, index: 1 - index };
        opposite.contact = planContact(player, state, opposite, ball, velocity, pace);
        if (opposite.contact) {
          const other = state.feet[opposite.index];
          opposite.start = [...other.point];
          opposite.startYaw = other.yaw;
          opposite.yaw = other.yaw + angle(step.yaw - other.yaw);
          opposite.startPitch = other.pitch;
          opposite.startRoll = other.roll;
          opposite.startFlex = other.toeFlex;
          opposite.supportPitch = foot.pitch;
          opposite.supportRoll = foot.roll;
          opposite.target = landingPoint(player, opposite.index, opposite.yaw, pace, duration);
          return opposite;
        }
      }
    }
    if (controlled && player.cutting && !step.contact && !setting) {
      step.duration *= .85;
      step.target = landingPoint(player, index, step.yaw, pace, step.duration);
    }
    return step;
  }

  function alignHeadingWithFoot(player, point, index, yaw, release) {
    const dx = point[0] - player.x, dz = point[2] - player.z;
    const reach = Math.hypot(dx, dz);
    if (reach < .17) return yaw;
    const side = left(yaw), front = forward(yaw);
    const sign = index === 0 ? 1 : -1;
    const lateral = (dx * side[0] + dz * side[1]) * sign;
    const along = dx * front[0] + dz * front[1];
    const aligned = clamp(lateral, .018, .246);
    const delta = Math.asin(clamp(aligned / reach, -.99, .99)) - Math.asin(clamp(lateral / reach, -.99, .99));
    const strength = smooth(Math.abs(along) / .23) * (1 - release * .54);
    return yaw - clamp(delta * Math.sign(along) * sign, -.28, .28) * strength;
  }

  function keepSwingOnSide(point, support, player, index, yaw, contact) {
    const side = left(yaw);
    const sign = index === 0 ? 1 : -1;
    const lateral = p => ((p[0] - player.x) * side[0] + (p[2] - player.z) * side[1]) * sign;
    const value = lateral(point);
    const supportSide = lateral(support);
    const maximum = contact ? .43 : clamp(supportSide + .415, .114, .233);
    const minimum = Math.min(maximum - .014, Math.max(contact ? -.071 : .022, supportSide + .074));
    const correction = (clamp(value, minimum, maximum) - value) * sign;
    return [point[0] + side[0] * correction, point[1], point[2] + side[1] * correction];
  }

  function startPivotStep(player, state, turn, initialIndex = state.next ?? 0) {
    const index = initialIndex;
    const foot = state.feet[index], support = state.feet[1 - index];
    const yaw = player.yaw + clamp(angle(turn.action.target - player.yaw), -.65, .65);
    const duration = mix(.165, .19, smooth((turn.action.speed - 1.8) / 3.6));
    return {
      index, duration, strike: .72, age: 0, start: [...foot.point], startYaw: foot.yaw,
      startPitch: foot.pitch, startRoll: foot.roll, startFlex: foot.toeFlex,
      supportPitch: support.pitch, supportRoll: support.roll, yaw: foot.yaw + angle(yaw - foot.yaw),
      target: footLocation(player, index, .06, yaw), walk: .76, lift: .093, pivot: true
    };
  }

  function limitSwing(previous, point, pace, dt, reaching) {
    const dx = point[0] - previous[0], dy = point[1] - previous[1], dz = point[2] - previous[2];
    const length = Math.hypot(dx, dz);
    const rate = reaching ? 16.2 + pace * .35 : 9.3 + pace * .81;
    const scale = length > 0 ? Math.min(1, rate * dt / length) : 1;
    return [previous[0] + dx * scale, previous[1] + clamp(dy, -(reaching ? 7.4 : 5.4) * dt, (reaching ? 7.4 : 5.4) * dt), previous[2] + dz * scale];
  }

  function swingFoot(foot, step, pose) {
    const u = clamp(step.age / step.duration, 0, 1);
    const strike = step.strike;
    const { contact } = step;
    const runDrive = step.run ?? 0;
    const pushCarry = 1 - smooth((u - .06) / .38);
    const swingFollow = Math.max(step.startPitch ?? 0, mix(.38, .82, runDrive)) * pushCarry;
    const pitch = mix(
      swingFollow + Math.sin(u * Math.PI) * (-.14 + .42 * u),
      swingFollow * .65 + Math.sin(Math.PI * u) * .24 - smooth((u - .56) / .44) * .26,
      step.walk
    );
    const release = 1 - smooth(u / .48);
    foot.roll = (step.startRoll ?? 0) * release;
    foot.toeFlex = (step.startFlex ?? 0) * release;
    step.swingYaw = step.startYaw + angle(step.yaw-step.startYaw)*smooth(u);
    const landingPitch = mix(-.20, -.28, step.walk);
    if (contact) {
      const after = u > strike;
      const entry = step.entry?.phase ?? 0;
      const progress = after ? (u - strike) / (1 - strike) : clamp((u - entry) / (strike - entry), 0, 1);
      const from = after ? contact.point : step.entry?.point ?? step.start;
      const to = after ? step.target : contact.point;
      const kick = forward(contact.heading);
      const drive = contact.kind === 'trap' ? .026 : contact.kind === 'cut' ? (after ? .20 : .075) :
        clamp(distance(step.start, contact.point) * .42, .055, .22);
      const u2 = progress * progress, u3 = u2 * progress;
      const tangent = after ? u3 - 2 * u2 + progress : u3 - u2;
      const follow = drive * (after ? (1 - strike) / (strike - entry) : 1) * tangent;
      foot.point = interpolate(from, to, smooth(progress));
      if(!after&&step.entry?.velocity){
        const seconds=step.duration*Math.max(.04,strike-entry);
        const tangent=step.entry.velocity.map(value=>value*seconds);
        const length=Math.hypot(...tangent),limit=Math.max(.04,distance(from,to)*.65);
        const weight=length>limit?limit/length:1;
        const hermite=progress*(1-progress)*(1-progress);
        foot.point=foot.point.map((value,index)=>value+tangent[index]*weight*hermite);
      }
      foot.point[0] += kick[0] * follow;
      foot.point[2] += kick[1] * follow;
      const lift = after ? mix(.050, .028, step.walk) : step.lift;
      foot.point[1] += Math.sin(Math.PI * progress) ** 2 * lift;
      foot.pitch = mix(step.startPitch, pitch * .62, smooth(u * 2.6));
      if (after && contact.used) {
        const landing = smooth((progress - .20) / .80) * (step.roll ?? 0);
        foot.roll += landing;
        foot.pitch = mix(foot.pitch, landingPitch, landing);
      }
      if (contact.kind === 'cut' || contact.surface) {
        const weight = smooth((u - Math.max(0, entry - .085)) / .20) * (1 - smooth((u - strike) / (1 - strike)));
        step.swingYaw += angle(contact.contactYaw - step.swingYaw) * weight;
      }
      if (!contact.used && u >= Math.max(.25, strike - .33) && u <= .96) pose.touch = contact;
    } else {
      const advance = (step.run ?? 0) * (step.profile ? .86 : .56);
      const progress = smooth(u + advance * u * (1 - u));
      const clearance = Math.sin(Math.PI * (u + (step.run ?? 0) * .32 * u * (1 - u))) ** 2;
      const lift = step.profile ? mix(clearance, profileLift(step.profile, u), .24) : clearance;
      foot.point = interpolate(step.start, step.target, progress);
      foot.point[1] += lift * step.lift;
      const strike = smooth((u - .59) / .41);
      foot.roll += (step.roll ?? 0) * strike;
      foot.pitch = mix(step.startPitch, pitch, smooth(u * 2.4));
      foot.pitch = mix(foot.pitch, landingPitch, strike * (step.roll ?? 0));
    }
  }

  function reversalPose(player, state, turn, ball, velocity, pace, dt, ankles) {
    const { action } = turn;
    const index = action.index, supportIndex = 1 - index;
    const foot = state.feet[index], support = state.feet[supportIndex];
    const planted = turn.phase === 'plant';
    const pulling = turn.phase === 'pull';
    const pivoting = turn.phase === 'pivot';
    const side = index === 0 ? 1 : -1;
    const across = [-action.pullAxis[1] * side, action.pullAxis[0] * side];
    if (!action.pose) {
      const origin = [player.x, 0, player.z];
      const ankle = i => ankles?.[i] && distance(ankles[i], origin) < .86 ? ankles[i] : state.feet[i].point;
      const supportPoint = footLocation(player, supportIndex, .01 + Math.min(.52, pace * pace / 47), action.from);
      const spacing = (ball[0] - supportPoint[0]) * across[0] + (ball[2] - supportPoint[2]) * across[1];
      const widening = clamp(.258 - spacing, .055, .19);
      supportPoint[0] -= across[0] * widening;
      supportPoint[2] -= across[1] * widening;
      supportPoint[0] = clamp(supportPoint[0], -limits.side-.21, limits.side+.21);
      supportPoint[2] = clamp(supportPoint[2], playerFrontLimit(player) - .22, limits.back + .22);
      action.pose = { start: [...ankle(index)], supportStart: [...ankle(supportIndex)], supportPoint,
        supportYaw: support.yaw };
      state.step = null;
      state.next = supportIndex;
    }
    const plan = action.pose;
    const plant = clamp(action.age / action.plantDuration, 0, 1);
    const progress = turn.progress;
    const yaw = turn.heading;
    const direction = forward(yaw);
    const lift = pivoting ? smooth((progress - .17) / .79) : 0;
    let footPlant;
    if (pivoting) {
      if (!plan.release) {
        plan.release = [...(ankles?.[index] ?? foot.point)];
        plan.releasePitch = foot.pitch;
      }
      const landing = footLocation(player, index, action.manual ? -.020 : .095, action.target);
      foot.point = interpolate(plan.release, landing, lift);
      const swing = smooth(progress / .24) * (1 - smooth((progress - .60) / .40));
      const dx = foot.point[0] - ball[0], dz = foot.point[2] - ball[2];
      const along = dx * action.pullAxis[0] + dz * action.pullAxis[1];
      const lateral = dx * across[0] + dz * across[1];
      const clearLane = swing * (1 - smooth((Math.abs(along) - .085) / .22)) * clamp(.17 - lateral, 0, .15);
      foot.point[0] += across[0] * clearLane;
      foot.point[2] += across[1] * clearLane;
      foot.point[1] += swing * (action.manual ? .085 : .158);
      foot.pitch = mix(plan.releasePitch, 0, smooth(progress / .32)) + Math.sin(Math.PI * lift) * .28;
    } else {
      let target = predictBall(ball, velocity, action.anchor ? 0 : clamp(action.plantDuration - action.age, 0, .080));
      let maxPace = 3.7;
      if (pulling) {
        if (!plan.pullStart) {
          plan.pullStart = [...ball];
          const lead = (ball[0] - player.x) * direction[0] + (ball[2] - player.z) * direction[1];
          plan.pullDistance = action.manual ? clamp(lead - .25, .085, .40) : clamp(.44 + (lead - .43) * .64, .38, .62);
          plan.exitPace = action.manual ? .12 : clamp((lead + .58 - plan.pullDistance) / .30 + .45, 2.35, 3.85);
        }
        const curve = action.manual ? smooth(progress) : progress * progress * (2 - progress);
        const travel = plan.pullDistance * curve;
        target = [plan.pullStart[0] + action.pullAxis[0] * travel, .11,
          plan.pullStart[2] + action.pullAxis[1] * travel];
        const remaining = (target[0] - ball[0]) * action.pullAxis[0] + (target[2] - ball[2]) * action.pullAxis[1];
        const gap = Math.max(0, remaining - .093);
        target[0] -= action.pullAxis[0] * gap;
        target[2] -= action.pullAxis[1] * gap;
        maxPace = mix(action.manual ? 3.9 : 4.65, plan.exitPace, smooth((progress - .72) / .28));
      }
      const releaseHeight = pulling ? smooth((progress - .81) / .19) * .027 : 0;
      const marker = [clamp(target[0], -limits.side-.19, limits.side+.19), Math.max(.11, target[1]) + .137 + releaseHeight,
        clamp(target[2], playerFrontLimit(player) - .24, limits.back + .17)];
      const reach = [marker[0] - direction[0] * .127, marker[1] + .041, marker[2] - direction[1] * .127];
      foot.point = pulling ? reach : interpolate(plan.start, reach, smooth((plant - .14) / .86));
      if (planted) {
        foot.point[1] = mix(plan.start[1], reach[1], smooth(plant / .64)) + Math.sin(Math.PI * plant) * .085;
      }
      foot.pitch = planted ? -.13 * Math.sin(Math.PI * plant) : -.08 * Math.sin(Math.PI * progress);
      const weight = pulling ? 1 : smooth((plant - .42) / .50);
      if (weight > 0) footPlant = { foot: foot.foot, point: marker, weight, boot: true };
      if (pulling || plant >= .78) {
        player.touchPending = { foot: foot.foot, kind: 'soleTurn', turn: action, maxPace };
      }
    }
    foot.yaw += angle(yaw - foot.yaw) * (1 - Math.exp(-dt * 27));
    foot.roll = 0;
    foot.toeFlex = 0;
    const supportWeight = smooth(plant / .68);
    support.point = interpolate(plan.supportStart, plan.supportPoint, supportWeight);
    support.point[1] += Math.sin(Math.PI * supportWeight) * .026;
    const passed = (ball[0] - plan.supportPoint[0]) * action.pullAxis[0] + (ball[2] - plan.supportPoint[2]) * action.pullAxis[1];
    const turnSupport = pivoting ? smooth((progress - .18) / .72) * smooth((passed - .11) / .24) : 0;
    support.yaw = plan.supportYaw + angle(action.from - plan.supportYaw) * supportWeight * .72 + action.delta * turnSupport;
    support.pitch = pivoting ? .38 * Math.sin(Math.PI * progress) : 0;
    support.roll = pivoting ? smooth(progress / .27) * (1 - lift) : 0;
    support.toeFlex = support.pitch * .75;
    state.bodyYaw = yaw;
    state.upperWeight = mix(state.upperWeight, .14, 1 - Math.exp(-dt * 14));
    state.forwardLean *= Math.exp(-dt * 12);
    const balance = planted ? smooth(plant) : pivoting ? 1 - smooth(progress) : 1;
    if (clips.solePull?.userEdited) {
      const dur = clips.solePull.duration || 1.3;
      const frac = planted ? clamp(plant * .22, 0, .22) : pivoting ? clamp(.22 + progress * .68, .22, .90) : .95;
      return {
        clip: 'solePull', poseName: 'reversal', time: frac * dur, loop: false, fade: .14, grounded: true, bodyYaw: yaw, footPlant
      };
    }
    const pose = {
      clip: 'idle', poseName: 'locomotion', time: 0, loop: false, fade: .15, grounded: true, bodyYaw: yaw, footPlant,
      ankleTargets: state.feet.map((item, i) => ({
        ...item, legExtension: 0, kneeBend: .43, groundWeight: i === supportIndex ? 1 : lift,
        sole: [item.point[0], item.point[1] - ankleHeight + .008, item.point[2]]
      })),
      pelvis: { height: .925 - balance * .095, lateral: -side * balance * .068,
        forward: -.028 * balance, rotation: [.14 * balance, side * balance * .14, -side * balance * .16] },
      offsets: { Spine: [-.055 * balance, side * balance * .22, -side * balance * .14],
        Spine2: [0, side * balance * .12, 0] }
    };
    if (!action.manual && action.speed > 1.25 && clips.runningToTurn) {
      const runSide = Math.sign(action.delta) || 1;
      const dur = clips.runningToTurn.duration || 2.27;
      const turnRatio = clamp(Math.abs(action.delta) / Math.PI, .55, 1);
      const startT = .36, endT = mix(.92, Math.min(1.56, dur), turnRatio), midT = mix(startT, endT, .48);
      const playT = planted ? mix(startT, mix(startT, midT, .75), plant) : pulling ? mix(mix(startT, midT, .75), midT, progress) : mix(midT, endT, progress);
      pose.upperBlend = [{ clip: 'runningToTurn', time: playT, weight: .82 * (.35 + .65 * balance), opposite: runSide < 0 }];
    } else if (walkReference) {
      pose.upperBody = { clip: 'jog', time: state.upperTime, weight: state.upperWeight };
    }
    return pose;
  }

  function lateralFakePose(player, state, cut, ball, velocity, pace, dt, ankles) {
    const { side, from, heading, elapsed, strike, touchedAt } = cut;
    const impact = touchedAt ?? strike;
    const release = smooth((elapsed - impact) / .24);
    const delta = angle(heading - from);
    const windupT = clamp(elapsed / Math.max(.14, strike), 0, 1);
    const hasChip = Boolean(clips.chipFake);
    // Chip.fbx (mirror:false) winds up RightFoot and cuts to side > 0 in world space (model has +PI yaw),
    // so mirror when cutting to side < 0.
    const mirror = side < 0;
    // Keep body facing approach during windup, then rotate smoothly into heading during exit
    const turnT = cut.touched ? mix(.22, 1, smooth(clamp((elapsed - impact) / .18, 0, 1))) : smooth(clamp((windupT - .75) / .25, 0, 1)) * .22;
    const yaw = from + delta * turnT;
    state.bodyYaw = yaw;
    state.amplitude *= Math.exp(-dt * 14);
    state.upperWeight *= Math.exp(-dt * 12);
    state.step = null;
    const origin = [player.x, 0, player.z];
    for (let i = 0; i < state.feet.length; i++) {
      const sample = ankles?.[i];
      state.feet[i].point = sample && distance(sample, origin) < .67
        ? [sample[0], ankleHeight, sample[2]]
        : footLocation(player, i, -.035, yaw);
      state.feet[i].yaw = yaw;
      state.feet[i].pitch = 0;
      state.feet[i].roll = 0;
      state.feet[i].toeFlex = 0;
    }
    if (!cut.touched && elapsed >= strike * .78) {
      const footName = hasChip ? (mirror ? 'LeftFoot' : 'RightFoot') : (mirror ? 'RightFoot' : 'LeftFoot');
      player.touchPending = { foot: footName, kind: 'cut', heading, lateral: true };
    }
    const contactPhase = elapsed - impact;
    const contactWeight = smooth((contactPhase + .105) / .105) * (1 - smooth((contactPhase - .012) / .064));
    const pose = { loop: false, grounded: true, bodyYaw: yaw, mirror };
    if (contactWeight > 0) {
      const across = left(from);
      const lateralOffset = -.13 * side;
      const point = cut.contactPoint ?? [ball[0] + across[0] * lateralOffset, Math.max(.075, ball[1] - .014),
        ball[2] + across[1] * lateralOffset];
      if (cut.touched) cut.contactPoint = point;
      pose.footPlant = { foot: hasChip ? 'RightFoot' : 'LeftFoot', point, weight: contactWeight, boot: true };
      pose.ballContacts = [{ category: 'dribble', limb: hasChip ? 'RightFoot' : 'LeftFoot',
        point: [point[0] - across[0] * lateralOffset, ball[1], point[2] - across[1] * lateralOffset],
        normal: [-across[0] * side, 0, -across[1] * side], weight: contactWeight, maxCorrection: .32 }];
    }
    if (clips.fakeCut?.userEdited) {
      const dur = clips.fakeCut.duration || 1.1;
      const playT = clamp(elapsed * 1.12, 0, dur);
      return {
        ...pose, clip: 'fakeCut', poseName: 'lateralFake', time: playT, fade: .08
      };
    }
    if (hasChip) {
      const contactT = clips.chipFake.contact || 0.533;
      const playT = !cut.touched && elapsed <= impact
        ? mix(0.20, contactT, windupT)
        : clamp(contactT + (elapsed - impact) * 1.35, contactT, Math.min(clips.chipFake.duration, 1.05));
      return {
        ...pose, clip: 'chipFake', poseName: 'lateralFake', time: playT, fade: .08
      };
    }
    if (!cut.touched && elapsed <= impact) {
      // Phase 1: Real FIFA 16 finesseRun windup (0.00s -> 0.14s: plant foot grounded, kicking heel high behind, snaps down to ball)
      const kickClip = clips.finesseRun ? 'finesseRun' : 'kick';
      const kickTime = mix(0, .14, windupT);
      return {
        ...pose, clip: kickClip, poseName: 'lateralFakeWindup', time: kickTime, fade: .08
      };
    }
    // Phase 2: Real FIFA 16 insideRight cut + push-off (0.00s -> 0.28s: cutting foot plants & pushes off into the new direction)
    const cutClip = clips.insideRight ? 'insideRight' : 'dribbleSide';
    const cutTime = mix(0, .28, release);
    return {
      ...pose, clip: cutClip, poseName: 'lateralFakeExit', time: cutTime, fade: .07
    };
  }

  function locomotion(player, { dt, ball, velocity, controlled, recoverable, ankles, suspended, lateralCut }) {
    player.touchPending = null;
    if (suspended) {
      states.delete(player);
      return { clip: 'idle', time: 0, loop: false, grounded: true };
    }
    let state = states.get(player);
    if (!state) {
      state = newState(player, ankles);
      states.set(player, state);
    }
    state.sinceTouch += dt;
    state.sprinting = false;
    const pace = Math.hypot(player.vx || 0, player.vz || 0);
    if (controlled && lateralCut) return lateralFakePose(player, state, lateralCut, ball, velocity, pace, dt, ankles);
    const turn = player.turningAround;
    if (controlled && turn?.action.withBall && turn.phase !== 'exit') {
      return reversalPose(player, state, turn, ball, velocity, pace, dt, ankles);
    }
    const canTouch = controlled || player.receiving || recoverable && player.retrievingBall;
    const pivoting = turn?.phase === 'pivot';
    if (pivoting && state.pivotTurn !== turn.action) {
      const active = state.step;
      const next = active && active.age < active.duration * .72 ? active.index : state.next;
      state.pivotTurn = turn.action;
      state.step = startPivotStep(player, state, turn, next ?? (turn.action.delta > 0 ? 1 : 0));
    } else if (!pivoting) {
      state.pivotTurn = null;
    }
    const origin = [player.x, 0, player.z];
    const ballPace = Math.hypot(velocity[0], velocity[2]);
    const collect = controlled && !player.dribbleIntent && pace < .36 && ballPace > .37
      && distance(ball, origin) < .66 && state.sinceTouch > .20;
    const settle = state.feet.map((foot, i) => distance(foot.point, footLocation(player, i, -.035)));
    const idle = !player.dribbleIntent && pace < .14;
    const ready = pace > .16 || player.cutting || player.collecting || collect || player.contactRecovery?.elapsed < .42;
    if (!state.step && (ready || Math.max(...settle) > .19)) {
      if (idle && !collect) state.next = Number(settle[1] > settle[0]);
      const step = pivoting ? startPivotStep(player, state, turn) : startStep(player, state, pace, ball, velocity, canTouch);
      if (!collect || step.contact || Math.max(...settle) > .19) state.step = step;
    }

    const pose = { clip: 'idle', poseName: 'locomotion', time: 0, loop: false, fade: .18, grounded: true };
    let swing = 0;
    let supportSide = 0;
    let turnPhase = 0;
    let flight = 0;
    const activeStep = state.step;
    const swingIndex = activeStep?.index;
    const previousAnkle = activeStep ? [...state.feet[swingIndex].point] : null;
    if (state.step) {
      const step = state.step;
      step.age = Math.min(step.age + dt, step.duration);
      const u = step.age / step.duration;
      const active = state.feet[step.index];
      const support = state.feet[1 - step.index];
      if (u < .79) {
        const closeControl = controlled && !player.dribbleSprint;
        const response = 1 - Math.exp(-dt * (closeControl ? 23 : 20));
        step.yaw += angle(player.yaw - step.yaw) * response;
        const end = step.pivot && pivoting
          ? footLocation(player, step.index, .062, step.yaw)
          : landingPoint(player, step.index, step.yaw, pace, step.duration - step.age, step.extraLead);
        step.target = interpolate(step.target, end, response);
        const wantsCut = !player.retrievingBall && (player.cutting || player.collecting && player.dribbleIntent);
        const curveCut = wantsCut && Math.abs(player.dribbleCurve ?? 0) > .60;
        const cutWindow = curveCut ? .70 : player.spawnControl?.cutUntil !== undefined ? .72 : closeControl ? .67 : .60;
        const canAdoptCut = wantsCut && step.contact?.kind !== 'cut' && u < cutWindow;
        const canRescheduleCut = curveCut && canAdoptCut && !step.contact && u + Math.max(.17, .051 / step.duration) < .78;
        const canAdoptTrap = player.retrievingBall && step.contact?.kind !== 'trap' && u < .63;
        const canAdoptReceive = player.receiving && step.contact?.kind !== 'receive' && u < .64;
        const canRefresh = step.contact ? u < step.strike - (step.contact.kind === 'cut' ? .07 : .17) : u < .40;
        if (!step.pivot && canTouch && !step.contact?.used && (u < step.strike || canRescheduleCut) && (canAdoptCut || canAdoptTrap || canAdoptReceive || canRefresh)) {
          const curveTouch = curveCut && canAdoptCut;
          const rise = Math.max(curveTouch ? .17 : .215, .051 / step.duration);
          const changeTouch = canAdoptCut || canAdoptTrap || canAdoptReceive;
          const strike = changeTouch ? Math.min(.78, Math.max(curveTouch ? .54 : .61, u + rise)) : step.strike;
          const updated = planContact(player, state, step, ball, velocity, pace, step.duration * (strike - u));
          if (updated) {
            if (!step.contact || changeTouch) {
              step.entry = { phase: u, point: [...active.point], velocity: [...(step.footVelocity??[0,0,0])] };
              step.strike = strike;
              step.contact = updated;
            } else {
              step.contact.point = interpolate(step.contact.point, updated.point, response);
              step.contact.heading += angle(updated.heading - step.contact.heading) * response;
              step.contact.contactYaw += angle(updated.contactYaw - step.contact.contactYaw) * response;
              if(!step.contact.surface||Math.abs(angle(updated.contactYaw-step.contact.contactYaw))>.12||step.contact.kind!==updated.kind)step.contact.surface = updated.surface;
              step.contact.sole = updated.sole;
              if (step.contact.kind !== 'cut') step.contact.kind = updated.kind;
            }
          }
        }
      }
      supportSide = step.index === 0 ? -1 : 1;
      turnPhase = smooth((u - .16) / .60);
      swing = Math.sin((u - .5) * Math.PI) * (step.index === 0 ? 1 : -1);
      const heel = smooth((u - .53) / .47) * smooth(pace / 2.8);
      const walkingHeel = mix(Math.min(0, support.pitch), 0, 1 - Math.exp(-dt * 20))
        + .30 * smooth((u - .59) / .41) * smooth(pace / 1.13);
      const legacyPitch = mix(heel * .48, walkingHeel, step.walk);
      flight = (step.flight ?? 0) * (step.contact?.kind === 'carry' ? .54 : step.contact ? 0 : 1);
      const supportEnd = mix(1, .77, flight);
      const pushStart = mix(.34, .18, step.run ?? 0);
      const toeOff = smooth((u - pushStart) / (supportEnd - pushStart));
      const airborne = flight * smooth((u - supportEnd) / Math.max(.05, 1 - supportEnd));
      const heelStrike = Math.min(0, step.supportPitch ?? 0) * (1 - smooth(u / .25));
      const roll = (step.roll ?? 0) * (step.contact ? .88 : 1);
      support.roll = mix(step.supportRoll ?? 0, roll, smooth(u / .20)) * (1 - airborne * .06);
      const pushPitch = mix(1.05, 1.55, step.pushPower ?? 0);
      support.pitch = mix(legacyPitch, heelStrike + pushPitch * toeOff, support.roll);
      support.toeFlex = Math.min(1.18, Math.max(0, support.pitch) * (.32 + .76 * toeOff)) * (1 - airborne * .35);
      if (flight > 0) support.point[1] = ankleHeight + airborne * .062;
      if (walkReference) {
        const from = walkLandings[1 - step.index], to = walkLandings[step.index];
        const interval = (to - from + walkReference.duration) % walkReference.duration;
        state.upperTime = (from + u * interval) % walkReference.duration;
      }
      if (!state.phaseTimes) state.phaseTimes = {};
      const phaseFollow = 1 - Math.exp(-dt * 24);
      for (const [key, ref] of Object.entries(cyclicRefs)) {
        const dur = ref.clip.duration;
        const from = ref.landings[1 - step.index], to = ref.landings[step.index];
        const interval = (to - from + dur) % dur;
        const target = (from + u * interval) % dur;
        const cur = state.phaseTimes[key];
        if (cur === undefined) {
          state.phaseTimes[key] = target;
        } else {
          let diff = target - cur;
          if (diff > dur * .5) diff -= dur;
          else if (diff < -dur * .5) diff += dur;
          state.phaseTimes[key] = ((cur + diff * phaseFollow) % dur + dur) % dur;
        }
      }
      if (step.contact && !canTouch) step.contact = null;
      swingFoot(active, step, pose);
      if(dt>0&&previousAnkle)step.footVelocity=active.point.map((value,index)=>clamp((value-previousAnkle[index])/dt,-10,10));
      if (u >= 1) {
        if (!step.roll || (step.contact && !step.contact.used)) active.pitch = step.contact ? 0 : -.24 * step.walk;
        state.next = 1 - step.index;
        state.step = null;
      }
    } else {
      const settleRoll = 1 - Math.exp(-dt * 18);
      for (const foot of state.feet) {
        foot.pitch = mix(foot.pitch, 0, settleRoll);
        foot.toeFlex = mix(foot.toeFlex, 0, settleRoll);
        foot.roll = mix(foot.roll, 0, settleRoll);
      }
    }

    const load = clamp(pace / 3.1, 0, 1);
    state.amplitude = mix(state.amplitude, swing * load, 1 - Math.exp(-dt * 19));
    const rhythm = state.amplitude;
    const run = smooth((pace - 1.55) / 3.75);
    const lean = player.inertiaPose ?? { pitch: 0, roll: 0, crouch: 0, twist: 0 };
    const walk = 1 - smooth((pace - .75) / 1.75);
    const yawDelta = angle(player.yaw - state.bodyYaw);
    const reversing = player.turningAround?.phase === 'pivot';
    const turning = Math.abs(yawDelta);
    const turnLimit = reversing ? 20 : mix(13.6, mix(10.8, 14.4, turnPhase), walk);
    let bodyYaw = state.bodyYaw + clamp(yawDelta, -turnLimit * dt, turnLimit * dt);
    let cutReach = 0;
    const cut = activeStep?.contact?.kind === 'cut' ? activeStep.contact : null;
    if (activeStep) {
      const active = state.feet[swingIndex];
      const support = state.feet[1 - swingIndex];
      const phase = activeStep.age / activeStep.duration;
      const heelUp = reversing ? smooth((phase + .15) / .42) : smooth((phase - .31) / .69);
      const supportAligned = alignHeadingWithFoot(player, support.point, 1 - swingIndex, bodyYaw, heelUp);
      const stanceWeight = reversing ? .13 : mix(.63, .23, smooth(turning / .60));
      let aligned = bodyYaw + angle(supportAligned - bodyYaw) * stanceWeight;
      if (cut) {
        cutReach = smooth((phase - Math.max(.18, activeStep.strike - .29)) / .19) *
          (1 - smooth((phase - activeStep.strike) / .21));
        const aiming = alignHeadingWithFoot(player, cut.point, swingIndex, aligned, 0);
        aligned += angle(aiming - aligned) * cutReach * (cut.used ? .17 : .69);
      }
      bodyYaw = state.bodyYaw + clamp(angle(aligned - state.bodyYaw), -turnLimit * dt, turnLimit * dt);
      const supportTwist = angle(bodyYaw - support.yaw);
      const plantedLimit = reversing ? .28 : mix(.70, .42, smooth(turning / .70));
      const pivot = supportTwist - clamp(supportTwist, -plantedLimit, plantedLimit);
      const pivotRate = reversing ? 18.0 : mix(5.2, 11.8, smooth(turning / .69)) * (.37 + .63 * heelUp);
      support.yaw += clamp(pivot, -dt * pivotRate, dt * pivotRate);
      const swingTwist = clamp(angle(activeStep.swingYaw - bodyYaw), -.87, .87);
      active.yaw += clamp(angle(bodyYaw + swingTwist - active.yaw), -dt * 10.5, dt * 10.5);
      const onSide = keepSwingOnSide(active.point, support.point, player, swingIndex, bodyYaw,
        activeStep.contact && Math.abs(activeStep.age / activeStep.duration - activeStep.strike) < .22);
      active.point = limitSwing(previousAnkle, onSide, pace, dt, activeStep.contact && !activeStep.contact.used);
    }
    state.bodyYaw = bodyYaw;
    pose.poseName = 'locomotion';
    pose.fade = .18;
    pose.bodyYaw = state.bodyYaw;
    state.supportShift = mix(state.supportShift, supportSide * load, 1 - Math.exp(-dt * 12));
    state.upperWeight = mix(state.upperWeight, smooth(pace / 1.45), 1 - Math.exp(-dt * 9));
    // Continuous multi-reference procedural blending (zero hard clip swaps, zero flicker)
    const bw = state.blendW ?? (state.blendW = { walk: 0, jog: 0, sprint: 0, diag: 0, accel: 0, turn: 0, diagSide: 1, turnSide: 1 });
    const ease = 1 - Math.exp(-dt * 8.5);
    const travelYaw = player.travelYaw ?? player.yaw;
    const steerDelta = angle((player.dribbleHeading ?? travelYaw) - bodyYaw);
    const diagSteer = smooth((Math.abs(steerDelta) - .20) / .55) * (1 - smooth((Math.abs(steerDelta) - 1.45) / .50));
    const diagPath = smooth((Math.min(Math.abs(Math.sin(travelYaw)), Math.abs(Math.cos(travelYaw))) - .28) / .28);
    const wantWalk = smooth((pace - .10) / .42) * (1 - smooth((pace - 1.95) / 1.15));
    const wantJog = smooth((pace - 1.35) / 1.10) * (1 - smooth((pace - 3.25) / 1.25));
    const wantSprint = smooth((pace - 2.75) / 1.45);
    const wantDiag = !controlled && !player.dribbleSprint && wantWalk * Math.max(diagSteer, diagPath * .65);
    const accelMag = lean.accel ?? 0;
    const wantAccel = smooth((accelMag - 1.0) / 3.6) * (1 - smooth((pace - 4.0) / 1.15)) * (player.dribbleSprint ? 1 : .40);
    const activeTurn = turn && !turn.action.withBall && turn.phase !== 'exit';
    const turnEnv = activeTurn
      ? (turn.phase === 'plant' ? smooth(turn.progress) : Math.sin(Math.PI * clamp(.22 + turn.progress * .78, 0, 1)))
      : 0;
    bw.walk = mix(bw.walk, wantWalk * (1 - wantDiag * .65), ease);
    bw.diag = mix(bw.diag, wantDiag, ease);
    bw.jog = mix(bw.jog, wantJog, ease);
    bw.sprint = mix(bw.sprint, wantSprint, ease);
    bw.accel = mix(bw.accel, wantAccel, 1 - Math.exp(-dt * 10));
    bw.turn = mix(bw.turn, turnEnv, 1 - Math.exp(-dt * 12));
    if (wantDiag > .15) bw.diagSide = diagSteer > .15 ? (Math.sign(steerDelta) || 1) : (Math.sin(travelYaw) > 0 ? -1 : 1);
    if (activeTurn) bw.turnSide = Math.sign(turn.action.delta) || 1;
    const pt = state.phaseTimes ?? {};
    const layers = [];
    if (clips.standardWalk && bw.walk > .01) layers.push({ clip: 'standardWalk', time: pt.standardWalk ?? 0, weight: bw.walk });
    if (clips.walkingLeftTurn && bw.diag > .01) layers.push({ clip: 'walkingLeftTurn', time: pt.walkingLeftTurn ?? 0, weight: bw.diag, opposite: bw.diagSide < 0 });
    if (clips.jog && bw.jog > .01) layers.push({ clip: 'jog', time: pt.jog ?? state.upperTime ?? 0, weight: bw.jog });
    if (clips.sprint && bw.sprint > .01) layers.push({ clip: 'sprint', time: pt.sprint ?? 0, weight: bw.sprint });
    if (clips.idleToSprint && bw.accel > .01) {
      const aTime = clamp(mix(.12, .74, smooth(pace / 3.8)), 0, clips.idleToSprint.duration);
      layers.push({ clip: 'idleToSprint', time: aTime, weight: bw.accel * .28 });
    }
    if (bw.turn > .01) {
      const walkTurn = (turn?.action?.speed ?? pace) <= 2.85 && Boolean(clips.walkingTurn180);
      const tClipKey = walkTurn ? 'walkingTurn180' : (clips.changeDirection ? 'changeDirection' : 'walkingTurn180');
      const tClip = clips[tClipKey];
      if (tClip) {
        const tProg = activeTurn ? (turn.phase === 'plant' ? turn.progress * .45 : .45 + turn.progress * .55) : .5;
        const tTime = walkTurn ? tProg * tClip.duration : mix(.36, Math.min(1.56, tClip.duration), tProg);
        layers.push({ clip: tClipKey, time: tTime, weight: bw.turn * .52, opposite: walkTurn ? bw.turnSide > 0 : bw.turnSide < 0 });
      }
    }
    if (layers.length) pose.upperBlend = layers;
    else if (walkReference) pose.upperBody = { clip: 'jog', time: state.upperTime, weight: state.upperWeight };
    const phase = activeStep ? clamp(activeStep.age / activeStep.duration, 0, 1) : 0;
    const extension = activeStep && !activeStep.pivot
      ? smooth((pace - .24) / .9) * (1 - smooth((turning - .25) / .72)) * (1 - cutReach * .91) : 0;
    const loadResponse = Math.sin(Math.PI * clamp(phase / .46, 0, 1)) ** 2;
    const release = flight * smooth((phase - .61) / .31);
    pose.ankleTargets = state.feet.map((foot,index) => {
      const direction = forward(foot.yaw);
      const pivot = foot.pitch >= 0 ? .164 : -.074;
      const shift = pivot * (1 - Math.cos(foot.pitch)) * walk;
      const swinging = index === swingIndex;
      const profile = swinging && !activeStep?.contact ? activeStep?.profile : null;
      const landing = smooth((phase - .69) / .31) * (!activeStep?.contact || activeStep.contact.used ? 1 : 0);
      const pushOff = smooth((phase - .39) / .47);
      const legExtension = extension * (swinging ? landing : mix(.48, 1, pushOff) * (1 - release * .7));
      const kneeBend = swinging ? mix(.32, .28, walk) : mix(.37, .19, pushOff) + loadResponse * mix(.48, .30, walk);
      const groundWeight = swinging ? landing : 1 - release;
      const runningSwing = profile && {
        low: profile.low, high: profile.high, blend: profile.blend, phase,
        weight: mix(.31, .60, run) * smooth((phase - .025) / .21) * (1 - smooth((phase - .42) / .34))
      };
      const surfaceContact = swinging && activeStep.contact?.surface;
      const touching = surfaceContact ? 1 - smooth(Math.abs(phase - activeStep.strike) / .29) : 0;
      const bank = surfaceContact === 'outside' ? .13 : -.075;
      return {
        ...foot, runningSwing, legExtension, kneeBend, groundWeight, bank: bank * touching * (index === 0 ? 1 : -1),
        sole: [foot.point[0], foot.point[1] - ankleHeight + (controlled ? .008 : .012), foot.point[2]],
        point: [foot.point[0] + direction[0] * shift, foot.point[1] + pivot * Math.sin(foot.pitch),
          foot.point[2] + direction[1] * shift]
      };
    });
    const headingDifference = angle((player.travelYaw ?? player.yaw) - state.bodyYaw);
    const twistLoad = pivoting ? Math.sin(Math.PI * turn.progress) * Math.sign(turn.action.delta) : 0;
    const balanceRoll = lean.roll - clamp(Math.sin(headingDifference) * load * .09, -.09, .09) - twistLoad * .16 - bw.diag * bw.diagSide * .055;
    const cutOffset = cut ? [cut.point[0] - player.x, cut.point[2] - player.z] : [0, 0];
    const cutProjection = direction => cutOffset[0] * direction[0] + cutOffset[1] * direction[1];
    const runningLean = smooth((pace - .85) / 4.58) * (1 - cutReach * .25);
    const forwardLean = state.forwardLean = mix(state.forwardLean, runningLean, 1 - Math.exp(-dt * 10.5));
    const walkLift = bw.walk * .032;
    const accelDrop = bw.accel * .018;
    const turnDrop = bw.turn * ((turn?.action?.speed ?? pace) > 2.85 ? .045 : .020);
    const strideBounce = activeStep ? -Math.sin(Math.PI * phase) * mix(.008, .026, run) * load : 0;
    const rawHeight = .925 + walkLift - run * .012 - lean.crouch - cutReach * .025 - Math.abs(twistLoad) * .025 - accelDrop - turnDrop +
      strideBounce + Math.cos(Math.abs(rhythm) * Math.PI) * .014 * load;
    const rawLat = balanceRoll * .12 + state.supportShift * .022 + cutReach * clamp(cutProjection(left(bodyYaw)) * .24, -.058, .058);
    const rawFwd = lean.pitch * .105 + forwardLean * .045 + bw.accel * .042 + cutReach * clamp(cutProjection(forward(bodyYaw)) * .19, -.043, .085);
    const rawPitch = clamp(lean.pitch * .38 + forwardLean * .075 + bw.accel * .035,-.08,.18);
    const rawRoll = balanceRoll * .62 + rhythm * .024;
    const ps = state.pelvisSmooth ?? (state.pelvisSmooth = { h: rawHeight, l: rawLat, f: rawFwd, p: rawPitch, r: rawRoll });
    const pEase = 1 - Math.exp(-dt * 15);
    ps.h = mix(ps.h, rawHeight, pEase);
    ps.l = mix(ps.l, rawLat, pEase);
    ps.f = mix(ps.f, rawFwd, pEase);
    ps.p = mix(ps.p, rawPitch, pEase);
    ps.r = mix(ps.r, rawRoll, pEase);
    pose.pelvis = {
      height: ps.h,
      lateral: ps.l,
      forward: ps.f,
      rotation: [ps.p, rhythm * .11, ps.r]
    };
    pose.offsets = {
      Spine: [lean.pitch * .18 + forwardLean * .025 + bw.accel * .025, -rhythm * .13 + lean.twist + yawDelta * .15, balanceRoll * .31],
      Spine2: [-lean.pitch * .10 + forwardLean * .038, -rhythm * .075 + twistLoad * .25, -balanceRoll * .10]
    };
    const recovery = player.contactRecovery;
    if (recovery) {
      recovery.elapsed += dt;
      const progress = clamp(recovery.elapsed / recovery.duration, 0, 1);
      const weight = 1 - smooth(progress);
      const balance = Math.sin(progress * Math.PI * 2) * weight * recovery.side;
      pose.fade = .36;
      pose.pelvis.height -= .055 * weight;
      pose.pelvis.lateral += .025 * balance;
      pose.pelvis.rotation[0] += .13 * weight;
      pose.pelvis.rotation[2] += .06 * balance;
      pose.offsets.Spine[0] += .08 * weight;
      pose.offsets.LeftArm = [-.18 * weight, 0, -.20 * weight - .12 * balance];
      pose.offsets.RightArm = [-.18 * weight, 0, .20 * weight - .12 * balance];
      pose.offsets.LeftForeArm = [-.24 * weight, 0, 0];
      pose.offsets.RightForeArm = [-.24 * weight, 0, 0];
      if (progress >= 1) player.contactRecovery = null;
    }
    if (activeStep?.contact && canTouch) {
      const contact = activeStep.contact;
      const remaining = Math.max(0, activeStep.duration * activeStep.strike - activeStep.age);
      if (!contact.used) activeStep.contactBall = predictBall(ball, velocity, Math.min(.10, remaining));
      const phase = activeStep.age / activeStep.duration;
      const weight = smooth((phase - activeStep.strike + .30) / .25) * (1 - smooth((phase - activeStep.strike) / .18));
      if (activeStep.contactBall && contact.kind !== 'soleTurn') {
        pose.ballContacts = [{ category: 'dribble', limb: feet[activeStep.index], point: activeStep.contactBall,
          normal: [Math.sin(contact.heading), 0, Math.cos(contact.heading)], weight, maxCorrection: .28 }];
      }
    }
    player.touchPending = pose.touch ?? null;
    return pose;
  }

  function contactPoint(player, ball) {
    const direction = forward(player.yaw);
    return [ball[0] - direction[0] * .16, Math.max(.055, ball[1] - .035), ball[2] - direction[1] * .16];
  }

  function cutExit(player, touch, ball) {
    const heading = Number.isFinite(touch.heading) ? touch.heading : player.dribbleHeading ?? player.yaw;
    const targetSpeed = player.dribbleTargetSpeed || Math.max(1.18, Math.hypot(player.vx || 0, player.vz || 0));
    let pace = Math.hypot(player.vx || 0, player.vz || 0);
    let yaw = player.travelYaw ?? player.yaw;
    const turn = Math.abs(angle(heading - yaw));
    if (touch.lateral) {
      const direction = forward(heading);
      const distance = clamp(.31 + pace * .038, .31, .43);
      return { heading, duration: .22, pace: Math.max(1.42, pace), turn,
        target: [ball[0] + direction[0] * distance, ball[2] + direction[1] * distance] };
    }
    const sprint = player.dribbleSprint;
    const curveRate = player.dribbleCurve ?? 0;
    const curveWeight = smooth((Math.abs(curveRate) - .45) / 1.5);
    const duration = mix(mix(sprint ? .24 : .19, sprint ? .43 : .33, smooth(turn / 2.8)), .18, curveWeight);
    const step = duration / 8;
    const offset = [0, 0];
    for (let i = 0; i < 8; i++) {
      const error = angle(heading + curveRate * (i + .5) * step - yaw);
      const severity = turnSeverity(error);
      const goal = targetSpeed * (1 - .70 * severity);
      pace += clamp(goal - pace, -(8.8 + 4.9 * severity) * step, 6.6 * (1 - .29 * severity) * step);
      const grip = exitGrip(pace);
      yaw += clamp(error, -grip * step, grip * step);
      const travel = forward(yaw);
      offset[0] += travel[0] * pace * step;
      offset[1] += travel[1] * pace * step;
    }
    const exitHeading = heading + curveRate * duration;
    const front = forward(exitHeading), side = left(exitHeading);
    const lateral = (ball[0] - player.x) * side[0] + (ball[2] - player.z) * side[1];
    const footSide = touch.foot === 'LeftFoot' ? 1 : -1;
    const oldSide = left(player.travelYaw ?? player.yaw);
    const oldFootSide = footSide * (oldSide[0] * side[0] + oldSide[1] * side[1]);
    const lane = Math.abs(lateral) > .095 ? Math.sign(lateral) : Math.sign(oldFootSide) || footSide;
    const pivot = smooth((turn - 1.02) / 1.53);
    const lead = mix(sprint ? .326 + pace * .014 : .270 + pace * .014, .17, curveWeight);
    const width = lane * mix(sprint ? .061 : .032, sprint ? .224 : .16, pivot) * (1 - curveWeight * .65);
    const target = [player.x + offset[0] + front[0] * lead + side[0] * width,
      player.z + offset[1] + front[1] * lead + side[1] * width];
    if (sprint && turn > .60) {
      const dx = target[0] - ball[0], dz = target[1] - ball[2];
      const advance = Math.max(.10, dx * front[0] + dz * front[1]);
      const drift = dx * side[0] + dz * side[1];
      const limit = .033 + advance * mix(.34, .19, smooth((turn - .60) / 1.05));
      const correction = clamp(drift, -limit, limit) - drift;
      target[0] += side[0] * correction;
      target[1] += side[1] * correction;
    }
    return { heading, duration, pace, turn, target };
  }

  function acceptTouch(player, touch, exit) {
    touch.used = true;
    const state = states.get(player);
    if (!state) return;
    if (touch.kind === 'soleTurn') touch.turn.anchor = true;
    state.sinceTouch = 0;
    if (Number.isFinite(touch.heading)) state.touchHeading = touch.heading;
    player.recovering = false;
    player.retrievingBall = false;
    player.receiving = false;
    state.exit = exit;
    if (state.step?.contact?.foot === touch.foot) state.step.contact.used = true;
  }

  function incidentalTouch(player, foot, hit) {
    const state = states.get(player);
    if (!state || player.turningAround?.action.withBall || player.brakeOnRelease ||
        state.sinceTouch < (player.cutting ? .08 : .145)) return null;
    if (!state.step) {
      if (state.sprinting && player.dribbleIntent && hit.approach > .14 &&
          state.sinceTouch >= carryInterval(player, Math.hypot(player.vx, player.vz))) {
        return { foot, kind: 'carry', heading: player.dribbleHeading ?? player.yaw };
      }
      return null;
    }
    const step = state.step;
    const active = feet[step.index] === foot && !step.contact?.used;
    const sole = hit.spatialNormal[1] < -.32 && hit.approach3D > .19;
    if (player.retrievingBall) return active && (sole || hit.approach > .16)
      ? { foot, kind: 'trap', heading: player.yaw, sole } : null;
    if ((player.cutting || player.collecting) && player.dribbleIntent && (active || state.sinceTouch > .15) &&
        (sole || hit.approach > (player.dribbleSprint ? .15 : .12))) {
      return { foot, kind: 'cut', heading: player.dribbleHeading ?? player.yaw, sole };
    }
    if (!active) return null;
    if (sole && player.collecting) return { foot, kind: 'trap', heading: player.yaw, sole };
    if (!player.dribbleIntent || player.collecting || player.cutting || hit.approach <= .26 ||
        state.sinceTouch < carryInterval(player, Math.hypot(player.vx, player.vz))) return null;
    return { foot, kind: 'carry', heading: player.dribbleHeading ?? player.yaw };
  }

  function lockCharge(player, heading) {
    const state = states.get(player);
    if (state) {
      state.reversal = null;
      state.exit = null;
      state.touchHeading = heading;
      state.commandCurve = 0;
      if (state.step) state.step.contact = null;
    }
    player.turningAround = null;
    player.touchPending = null;
    player.dribbleCurve = 0;
    player.cutting = false;
    player.collecting = false;
    player.recovering = false;
    player.retrievingBall = false;
    player.receiving = false;
    player.brakeOnRelease = false;
    player.dribbleAcceleration = 0;
    player.inertiaPose = null;
  }

  function reset(player) {
    states.delete(player);
    player.contactRecovery = null;
    player.inertiaPose = null;
    player.travelYaw = player.yaw;
    player.dribbleIntent = false;
    player.dribbleHeading = player.yaw;
    player.spawnControl = null;
    player.collecting = false;
    player.cutting = false;
    player.recovering = false;
    player.retrievingBall = false;
    player.receiving = false;
    player.dribbleAcceleration = 0;
    player.dribbleTargetSpeed = 0;
    player.dribbleCurve = 0;
    player.dribbleSprint = false;
    player.brakeOnRelease = false;
    player.lostDribble = false;
    player.turningAround = null;
  }

  function chestReception(actor,action,pose,ball,velocity,dt){
    if(action.kind!=='chest'||action.touched)return pose;
    const rx=velocity[0]-(actor.vx??0),rz=velocity[2]-(actor.vz??0);
    const bx=ball[0]-actor.x,bz=ball[2]-actor.z;
    const incoming=Math.hypot(rx,rz)>.75?Math.atan2(rx,rz):Math.atan2(-bx,-bz);
    action.receiveYaw=incoming;
    const body=pose.bodyYaw??actor.yaw;
    const twist=clamp(angle(incoming-body),-.62,.62);
    action.yaw=body;
    const offsets={...pose.offsets};
    for(const [name,share] of [['Spine',.25],['Spine1',.40],['Spine2',.35]]){
      const old=offsets[name]??[0,0,0];offsets[name]=[old[0],old[1]+twist*share,old[2]];
    }
    return {...pose,bodyYaw:body,offsets,lookTarget:ball};
  }

  function defensiveWindow(actor){
    const step=states.get(actor)?.step;
    if(!step)return null;
    const phase=step.age/step.duration;
    return {foot:feet[step.index],phase,available:phase>.12&&phase<.72,
      remaining:Math.max(.045,step.duration*(.60-phase))};
  }

  function advanceAir(actor,dt){
    const f=actor.aerialFlight;
    if(!f)return;
    f.age+=dt;
    if(f.age>=f.takeoff+f.duration){
      f.airborne=false;f.landed=true;
      states.delete(actor);
      actor.contactRecovery={elapsed:0,duration:.24,side:Math.sign(f.vx)||1};
      actor.aerialFlight=null;
    }
  }

  function aerialPose(actor,action,{time,contact,start=0,rate=1,height=0,end,dt,base,yaw=actor.yaw,kind=action.kind}){
    rate=Math.max(.1,rate);
    let f=action.flight;
    if(!f){
      const until=Math.max(0,(contact-time)/rate),gravity=9.81;
      const vy=height>.025?Math.min(Math.sqrt(2*gravity*height),gravity*Math.max(0,until-.06)):0;
      const ascent=vy/gravity;
      f=action.flight={clip:action.clip,kind:action.kind,contact,origin:time,rate,gravity,vy,takeoff:Math.max(.06,until-ascent),
        duration:2*ascent,age:0,airborne:false,launched:false,landed:false,vx:0,vz:0,yaw};
    }
    f.age=Math.max(f.age,(time-f.origin)/f.rate);
    const airTime=f.age-f.takeoff;
    const airborne=f.vy>0&&airTime>=0&&airTime<f.duration;
    if(airborne&&!f.launched){
      f.launched=true;
      f.vx=actor.vx||0;f.vz=actor.vz||0;f.yaw=yaw;
      const target=action.headerPlan?.target??action.flightTarget;
      const remaining=(contact-time)/rate;
      if(target&&remaining>.055){
        const vx=(target[0]-actor.x)/remaining,vz=(target[1]-actor.z)/remaining;
        const speed=Math.hypot(f.vx,f.vz),needed=Math.hypot(vx,vz);
        const impulse=Math.hypot(vx-f.vx,vz-f.vz);
        if(needed<=6.6&&impulse<=2.2+speed*.15){f.vx=vx;f.vz=vz;actor.vx=vx;actor.vz=vz;}
      }
      actor.aerialFlight=f;
    }
    if(f.launched&&!airborne&&!f.landed){
      f.landed=true;
      states.delete(actor);
      actor.contactRecovery={elapsed:0,duration:.24,side:f.vx*Math.cos(f.yaw)-f.vz*Math.sin(f.yaw)>=0?1:-1};
    }
    f.airborne=airborne;
    const lift=airborne?Math.max(0,f.vy*airTime-.5*f.gravity*airTime*airTime):0;
    const landingAge=f.launched?Math.max(0,airTime-f.duration):Infinity;
    const landing=f.landed?1-smooth(landingAge/.24):0;
    f.done=(!f.launched||f.landed&&landingAge>=.24)&&time>=end;
    if(f.done&&actor.aerialFlight===f)actor.aerialFlight=null;
    const pose={clip:action.clip,time,loop:false,fade:.10,bodyYaw:airborne?f.yaw:yaw,
      airborne,grounded:!airborne,extraY:lift,ballistic:true,bodyContactTime:contact,bodyStartTime:start,
      aerialPhase:airborne?(airTime<f.duration*.5?'rise':'fall'):f.landed?'landing':'prepare',
      landingWeight:landing};
    if(!airborne&&base){
      const elapsed=Math.max(0,(time-f.origin)/rate);
      const untilContact=Math.max(0,(contact-time)/rate);
      const anticipation=smooth(elapsed/.10)*smooth((.34-untilContact)/.24);
      const out=1-smooth((time-contact)/Math.max(.16,(end-contact)*.8));
      const settle=action.touched?1-smooth(Math.max(0,(time-(action.touchTime??=time))/rate)/.24):1;
      const weight=anticipation*out*settle;
      const pelvis=base.pelvis&&landing>0?{...base.pelvis,height:base.pelvis.height-.035*landing,
        rotation:base.pelvis.rotation.map((value,index)=>value+(index===0?.055*landing:0))}:base.pelvis;
      return {...base,pelvis,bodyYaw:base.bodyYaw??yaw,bodyContactTime:contact,bodyStartTime:start,landingWeight:landing,
        aerialPhase:pose.aerialPhase,actionLayer:{clip:action.clip,time,weight,foot:'RightFoot',
          upperWeight:1,legWeight:kind==='knee'?1-smooth((Math.hypot(actor.vx??0,actor.vz??0)-1.5)/2):0}};
    }
    return pose;
  }

  function passRecovery(actor,pose,action,dt){
    action.age+=dt;
    const clip=clips[action.clip],strike=shotContact(action.clip);
    const duration=action.duration??.3;
    const weight=smooth(action.age/.045)*(1-smooth((action.age-duration+.14)/.14));
    if(action.age>=duration){actor.teamAction=null;return pose;}
    const start=Math.max(0,strike.time-.065),end=Math.min(clip.duration-.001,strike.time+.18);
    return {...pose,bodyContactTime:strike.time,bodyStartTime:start,bodyFoot:strike.foot,actionLayer:{clip:action.clip,time:mix(start,end,clamp(action.age/duration,0,1)),
      weight,foot:strike.foot},lookTarget:action.lookTarget};
  }
  const limits=footballPlayLimits;
  return { move, locomotion, chestReception, defensiveWindow, advanceAir, aerialPose, passRecovery, shotContact, contactPoint, cutExit, acceptTouch, incidentalTouch, lockCharge, reset, limits };
};
