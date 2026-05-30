"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { LipsyncEn } from './lipsync-en.mjs';

const lipsync = new LipsyncEn();

const VISEME_TARGETS = [
  'viseme_sil','viseme_PP','viseme_FF','viseme_TH','viseme_DD','viseme_kk',
  'viseme_CH','viseme_SS','viseme_nn','viseme_RR','viseme_aa','viseme_E',
  'viseme_I','viseme_O','viseme_U'
];

export default function TalkingTutor({ avatarPath, onReady }) {
  const containerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const modelRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioSourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isPlayingRef = useRef(false);
  const audioStartTimeRef = useRef(0);
  const visemeTimelineRef = useRef([]);

  function getInterpolatedVisemes(time) {
    const timeline = visemeTimelineRef.current;
    if (!timeline || timeline.length === 0) return {};

    let before = timeline[0];
    let after = timeline[timeline.length - 1];

    for (let i = 0; i < timeline.length - 1; i++) {
      if (time >= timeline[i].time && time <= timeline[i + 1].time) {
        before = timeline[i];
        after = timeline[i + 1];
        break;
      }
    }

    if (time <= before.time) return before.visemes;
    if (time >= after.time) return after.visemes;

    const t = (time - before.time) / (after.time - before.time);
    const result = {};
    const allKeys = new Set([...Object.keys(before.visemes), ...Object.keys(after.visemes)]);

    allKeys.forEach(key => {
      const v1 = before.visemes[key] || 0;
      const v2 = after.visemes[key] || 0;
      result[key] = v1 + (v2 - v1) * t;
    });

    return result;
  }

  function applyVisemesToModel(visemes) {
    if (!modelRef.current) return;

    modelRef.current.traverse((child) => {
      if (!child.isMesh || !child.morphTargetDictionary || !child.morphTargetInfluences) return;

      const dict = child.morphTargetDictionary;
      const influences = child.morphTargetInfluences;

      VISEME_TARGETS.forEach(name => {
        const idx = dict[name];
        if (idx !== undefined) influences[idx] = 0;
      });
      if (dict['mouthOpen'] !== undefined) influences[dict['mouthOpen']] = 0;

      Object.entries(visemes).forEach(([key, weight]) => {
        const w = Math.max(0, Math.min(1, weight || 0));
        const idx = dict[key];
        if (idx !== undefined) influences[idx] = w;
      });
    });
  }

  function startAnimationLoop() {
    const animate = () => {
      if (isPlayingRef.current && audioContextRef.current && visemeTimelineRef.current.length > 0) {
        const elapsed = audioContextRef.current.currentTime - audioStartTimeRef.current;
        const visemes = getInterpolatedVisemes(elapsed);
        applyVisemesToModel(visemes);
      }
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
  }

  function initAudioSystem() {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0.8;
      gainNodeRef.current.connect(audioContextRef.current.destination);
    } catch (err) {
      console.error('Failed to initialize audio system:', err);
      throw err;
    }
  }

  function initThreeJS() {
    sceneRef.current = new THREE.Scene();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    sceneRef.current.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(4, 8, 6);
    sceneRef.current.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xaaccff, 0.6);
    fillLight.position.set(-5, 5, 4);
    sceneRef.current.add(fillLight);

    cameraRef.current = new THREE.PerspectiveCamera(50, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 100);
    cameraRef.current.position.set(0, 2.1, 4.0);
    cameraRef.current.lookAt(0, 0.7, 0);

    rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current.shadowMap.enabled = true;

    containerRef.current.appendChild(rendererRef.current.domElement);
  }

  function loadAvatarModel(url) {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          modelRef.current = gltf.scene || gltf.scenes[0];
          sceneRef.current.add(modelRef.current);

          const box = new THREE.Box3().setFromObject(modelRef.current);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          modelRef.current.position.set(0, 0, 0);
          modelRef.current.position.x -= center.x;
          modelRef.current.position.z -= center.z;
          modelRef.current.position.y = -center.y - 2.7;

          const maxDim = Math.max(size.x, size.y, size.z);
          modelRef.current.scale.setScalar(5.8 / maxDim);

          modelRef.current.traverse((child) => {
            if (!child.isMesh || !child.geometry?.morphAttributes?.position) return;
            const targetNames = child.userData?.targetNames;
            if (!targetNames) return;
            const dict = {};
            targetNames.forEach((name, i) => {
              dict[name] = i;
            });
            child.morphTargetDictionary = dict;
          });

          modelRef.current.traverse((child) => {
            if (!child.isMesh) return;
            if (child.name === 'Wolf3D_Head' || child.name === 'Wolf3D_Body') {
              if (child.material) {
                const mat = child.material;
                mat.color.setHex(0xF5D0C5);
                if (Array.isArray(mat)) mat.forEach(m => m.color.setHex(0xF5D0C5));
              }
            }
          });

          const poses = {
            'LeftShoulder': { x: 1.597, y: -0.012, z: -1.816 },
            'LeftArm': { x: 0.618, y: 1.274, z: 0.266 },
            'LeftForeArm': { x: -0.395, y: 0.097, z: 1.342 },
            'LeftHand': { x: -0.816, y: 0.057, z: 0.976 },
            'LeftHandThumb1': { x: 0.42, y: -0.23, z: 1.172 },
            'LeftHandThumb2': { x: -0.027, y: -0.361, z: -0.122 },
            'LeftHandThumb3': { x: 0.076, y: -0.125, z: 0.371 },
            'LeftHandIndex1': { x: -0.158, y: 0.045, z: -0.033 },
            'LeftHandIndex2': { x: 0.391, y: -0.051, z: -0.025 },
            'LeftHandIndex3': { x: 0.317, y: -0.058, z: -0.07 },
            'LeftHandMiddle1': { x: 0.486, y: -0.066, z: -0.014 },
            'LeftHandMiddle2': { x: 0.718, y: -0.055, z: -0.07 },
            'LeftHandMiddle3': { x: 0.453, y: -0.019, z: -0.013 },
            'LeftHandRing1': { x: 0.591, y: -0.241, z: -0.11 },
            'LeftHandRing2': { x: 0.531, y: -0.019, z: -0.059 },
            'LeftHandRing3': { x: 0.517, y: -0.016, z: -0.057 },
            'LeftHandPinky1': { x: 0.494, y: -0.233, z: -0.101 },
            'LeftHandPinky2': { x: 0.32, y: -0.016, z: -0.061 },
            'LeftHandPinky3': { x: 0.317, y: -0.016, z: -0.057 },
            'RightShoulder': { x: 1.597, y: 0.012, z: 1.816 },
            'RightArm': { x: 0.618, y: -1.274, z: -0.266 },
            'RightForeArm': { x: -0.395, y: -0.097, z: -1.342 },
            'RightHand': { x: -0.816, y: -0.057, z: -0.976 },
            'RightHandThumb1': { x: 0.42, y: 0.23, z: -1.172 },
            'RightHandThumb2': { x: -0.027, y: 0.361, z: 0.122 },
            'RightHandThumb3': { x: 0.076, y: 0.125, z: -0.371 },
            'RightHandIndex1': { x: -0.158, y: -0.045, z: 0.033 },
            'RightHandIndex2': { x: 0.391, y: 0.051, z: 0.025 },
            'RightHandIndex3': { x: 0.317, y: 0.058, z: 0.07 },
            'RightHandMiddle1': { x: 0.486, y: 0.066, z: 0.014 },
            'RightHandMiddle2': { x: 0.718, y: 0.055, z: 0.07 },
            'RightHandMiddle3': { x: 0.453, y: 0.019, z: 0.013 },
            'RightHandRing1': { x: 0.591, y: 0.241, z: 0.11 },
            'RightHandRing2': { x: 0.531, y: 0.019, z: 0.059 },
            'RightHandRing3': { x: 0.517, y: 0.016, z: 0.057 },
            'RightHandPinky1': { x: 0.494, y: 0.233, z: 0.101 },
            'RightHandPinky2': { x: 0.32, y: 0.016, z: 0.061 },
            'RightHandPinky3': { x: 0.317, y: 0.016, z: 0.057 },
          };

          modelRef.current.traverse((child) => {
            if (!child.isBone) return;
            const pose = poses[child.name];
            if (pose) {
              child.rotation.set(pose.x, pose.y, pose.z);
            }
          });

          resolve();
        },
        null,
        (error) => reject(error)
      );
    });
  }

  function generateVisemeTimeline(words, wtimes, wdurations) {
    visemeTimelineRef.current = [];

    words.forEach((word, i) => {
      const wordStart = (wtimes[i] || 0);
      const wordDur = (wdurations[i] || 0.25);
      const result = lipsync.wordsToVisemes(word);

      if (result.visemes.length > 0) {
        const totalDur = result.times[result.times.length - 1] +
          result.durations[result.durations.length - 1];
        const scale = totalDur > 0 ? wordDur / totalDur : 1;

        result.visemes.forEach((viseme, j) => {
          const t = wordStart + result.times[j] * scale;
          const d = result.durations[j] * scale;
          const visemeKey = 'viseme_' + viseme;

          visemeTimelineRef.current.push({
            time: t,
            visemes: { [visemeKey]: 1.0, mouthOpen: 0.6 }
          });
          visemeTimelineRef.current.push({
            time: t + d * 0.7,
            visemes: { [visemeKey]: 0.4, mouthOpen: 0.2 }
          });
        });
      }
    });
  }

  function generateSimpleVisemeTimeline(audioBuffer) {
    visemeTimelineRef.current = [];
    const sampleRate = audioBuffer.sampleRate;
    const data = audioBuffer.getChannelData(0);
    const chunkSize = Math.floor(sampleRate / 10);

    for (let i = 0; i < data.length; i += chunkSize) {
      const time = i / sampleRate;
      let sum = 0;
      for (let j = 0; j < chunkSize && i + j < data.length; j++) {
        sum += data[i + j] * data[i + j];
      }
      const rms = Math.sqrt(sum / chunkSize);
      const jawOpen = Math.min(rms * 4, 1.0);

      visemeTimelineRef.current.push({
        time,
        visemes: { mouthOpen: jawOpen }
      });
    }
  }

  const stopSpeaking = useCallback(() => {
    if (isPlayingRef.current && audioSourceRef.current) {
      try { gainNodeRef.current.gain.setValueAtTime(0, audioContextRef.current.currentTime); } catch (e) { }
      try { audioSourceRef.current.stop(); } catch (e) {
        try { audioSourceRef.current.disconnect(); } catch (e2) { }
      }
      isPlayingRef.current = false;
    }
    applyVisemesToModel({});
  }, []);

  const cancelSpeaking = useCallback(() => {
    stopSpeaking();
    visemeTimelineRef.current = [];
    applyVisemesToModel({});
  }, [stopSpeaking]);

  const speakAudio = useCallback(async (audioObject, options, callback) => {
    if (!audioObject || !audioObject.audio) {
      console.warn('No audio data provided');
      return;
    }

    try {
      stopSpeaking();

      const audioBuffer = audioObject.audio;

      if (audioObject.words && audioObject.wtimes && audioObject.wdurations) {
        generateVisemeTimeline(audioObject.words, audioObject.wtimes, audioObject.wdurations);
      } else {
        generateSimpleVisemeTimeline(audioBuffer);
      }

      audioSourceRef.current = audioContextRef.current.createBufferSource();
      audioSourceRef.current.buffer = audioBuffer;
      audioSourceRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.gain.setValueAtTime(0.8, audioContextRef.current.currentTime);

      const startTime = audioContextRef.current.currentTime + 0.01;
      audioSourceRef.current.start(startTime);

      audioStartTimeRef.current = startTime;
      isPlayingRef.current = true;

      await new Promise((resolve) => {
        audioSourceRef.current.onended = () => {
          isPlayingRef.current = false;
          applyVisemesToModel({});
          callback && callback(null);
          resolve();
        };
      });

    } catch (err) {
      console.error('speakAudio error:', err);
      throw err;
    }
  }, [stopSpeaking]);

  function initAvatarSystem() {
    initThreeJS();
    return loadAvatarModel(avatarPath).then(() => {
      initAudioSystem();
      startAnimationLoop();
    });
  }

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    container.innerHTML = '';

    initAvatarSystem().then(() => {
      if (cancelled) return;
      setIsReady(true);
      if (onReady) {
        onReady({
          speakAudio,
          stop: stopSpeaking,
          stopSpeaking,
          cancelSpeech: cancelSpeaking,
          get audioCtx() { return audioContextRef.current; },
          get audio() { return audioSourceRef.current; },
        });
      }
    }).catch(err => {
      if (cancelled) return;
      console.error('Failed to initialize avatar system:', err);
      setError(err.message);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrameRef.current);
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch (e) { }
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (rendererRef.current && container) {
        container.removeChild(rendererRef.current.domElement);
      }
    };
  }, [avatarPath, onReady, speakAudio, stopSpeaking, cancelSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      className="pointer-events-none w-full h-full rounded-[2rem] overflow-hidden shadow-2xl"
      style={{ position: 'absolute', top: 0, left: 0 }}
    />
  );
}
