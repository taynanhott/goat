(() => {
  'use strict';

  function createMatchAudio(clip, ambience, getContext) {
    const ambienceVolume = .16;
    const overlap = 1.05;
    const cheerTimeout = 2850;
    const tracks = [ambience, ambience.cloneNode()];
    let context, filtered = false, cheer, crowdEnabled = true;
    let ambienceTimer, activeTrack = 0, blending = false, mix = 0, retryAt = 0;

    function setAmbienceLevels() {
      const volume = cheer ? ambienceVolume*.4 : ambienceVolume;
      tracks[activeTrack].volume = volume*Math.cos(mix*Math.PI/2);
      tracks[1-activeTrack].volume = volume*Math.sin(mix*Math.PI/2);
    }

    function advanceAmbience() {
      const current = tracks[activeTrack], next = tracks[1-activeTrack];
      const remaining = current.ended ? 0 : current.duration-current.currentTime;
      if (!(remaining<=overlap)) return;
      if (!blending) {
        if (performance.now()<retryAt) return;
        blending = true;
        const timer = ambienceTimer;
        next.currentTime = .18+Math.random()*.24;
        next.play().catch(() => {
          if (ambienceTimer!==timer) return;
          blending = false;
          retryAt = performance.now()+500;
        });
      }
      if (next.paused || next.readyState<2) return;
      if (remaining<=.035) {
        current.pause();
        activeTrack = 1-activeTrack;
        blending = false;
        mix = 0;
      } else {
        mix = Math.min(1,Math.max(0,1-remaining/overlap));
      }
      setAmbienceLevels();
    }

    function start(withCrowd = true) {
      stop();
      crowdEnabled = withCrowd;
      try {
        context = getContext();
        context.resume().catch(() => {});
        if (!filtered && !ambience.src.startsWith('file:')) {
          const filter = context.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 1200;
          filter.Q.value = .65;
          filter.connect(context.destination);
          for (const track of tracks) context.createMediaElementSource(track).connect(filter);
          filtered = true;
        }
      } catch {}
      if (!crowdEnabled || ambienceTimer!=null) return;
      setAmbienceLevels();
      ambienceTimer = setInterval(advanceAmbience,30);
      tracks[activeTrack].play().catch(() => {});
    }

    function stopCheer() {
      if (!cheer) return;
      cheer = null;
      clip.onended = clip.onerror = null;
      clip.pause();
      if (clip.readyState) clip.currentTime = 0;
      setAmbienceLevels();
    }

    function playCheer(volume = .7) {
      if (!crowdEnabled) return;
      stopCheer();
      const playing = cheer = { expires: performance.now()+cheerTimeout };
      const complete = () => { if (cheer === playing) stopCheer(); };
      setAmbienceLevels();
      clip.volume = volume;
      clip.onended = complete;
      clip.onerror = complete;
      clip.play().catch(complete);
    }

    function cheering() {
      if (cheer && performance.now()>cheer.expires) stopCheer();
      return !!cheer;
    }

    function whistle() {
      if (context?.state !== 'running') return;
      const time = context.currentTime;
      const gain = context.createGain();
      gain.gain.setValueAtTime(.001,time);
      gain.gain.linearRampToValueAtTime(.09,time+.035);
      gain.gain.linearRampToValueAtTime(.06,time+.24);
      gain.gain.exponentialRampToValueAtTime(.001,time+.38);
      gain.connect(context.destination);
      for (const pitch of [2570,2720]) {
        const tone = context.createOscillator();
        tone.frequency.setValueAtTime(pitch,time);
        tone.frequency.linearRampToValueAtTime(pitch+145,time+.10);
        tone.frequency.linearRampToValueAtTime(pitch-70,time+.38);
        tone.connect(gain);
        tone.start();
        tone.stop(time+.39);
      }
    }

    function stop() {
      stopCheer();
      clearInterval(ambienceTimer);
      ambienceTimer = null;
      for (const track of tracks) {
        track.pause();
        if (track.readyState) track.currentTime = 0;
      }
      activeTrack = 0;
      blending = false;
      mix = retryAt = 0;
    }

    return { start, stop, playCheer, stopCheer, cheering, whistle };
  }

  window.createMatchAudio = createMatchAudio;
})();
