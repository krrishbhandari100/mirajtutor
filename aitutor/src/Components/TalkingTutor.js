"use client";

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VISEMES } from 'wawa-lipsync';

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
  const startTimeRef = useRef(0);
  const visemeTimelineRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;

    setIsReady(false);
    setError(null);
    containerRef.current.innerHTML = '';

    initAvatarSystem().then(() => {
      setIsReady(true);
      if (onReady) {
        onReady({
          speakAudio: speakAudio,
          stop: stopSpeaking,
          cancelSpeech: cancelSpeaking
        });
      }
    }).catch(err => {
      console.error('❌ Failed to initialize avatar system:', err);
      setError(err.message);
    });

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      if (audioSourceRef.current) {
        try { audioSourceRef.current.stop(); } catch (e) { }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
      }
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [avatarPath]);

  const initAvatarSystem = async () => {
    console.log('🚀 Initializing avatar system with three.js + wawa-lipsync');

    // Initialize three.js scene
    await initThreeJS();
    await loadAvatarModel(avatarPath);
    initAudioSystem();
    startAnimationLoop();

    console.log('✅ Avatar system initialized successfully');
  };

  const initThreeJS = () => {
    return new Promise((resolve, reject) => {
      try {
        sceneRef.current = new THREE.Scene();
        // sceneRef.current.background = new THREE.Color(0x1a1a1a);

        cameraRef.current = new THREE.PerspectiveCamera(
          45,
          containerRef.current.clientWidth / containerRef.current.clientHeight,
          0.1,
          1000
        );
        cameraRef.current.position.set(0, 1.5, 3);
        cameraRef.current.lookAt(0, 1, 0);

        rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        rendererRef.current.setClearColor(0x000000, 0);
        containerRef.current.appendChild(rendererRef.current.domElement);

        // 1. Soft ambient light (base illumination)
        const ambientLight = new THREE.AmbientLight(0xfff5e6, 0.4); // Warm tint
        sceneRef.current.add(ambientLight);

        // 2. Hemisphere light for natural sky/ground gradient
        const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x080820, 0.5); // Sky/ground
        sceneRef.current.add(hemiLight);

        // 3. Key light (main directional - warm sunlight from upper right)
        const keyLight = new THREE.DirectionalLight(0xfff4e6, 1.2); // Warm white
        keyLight.position.set(5, 8, 5);
        keyLight.castShadow = false; // Disable shadows for performance
        sceneRef.current.add(keyLight);

        // 4. Fill light (softer light from left side to fill shadows)
        const fillLight = new THREE.DirectionalLight(0xe6f0ff, 0.6); // Cool blue tint
        fillLight.position.set(-4, 4, 3);
        sceneRef.current.add(fillLight);

        // 5. Rim light (backlight for edge definition)
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
        rimLight.position.set(-2, 5, -5);
        sceneRef.current.add(rimLight);

        // 6. Bottom fill (prevents dark chin/jaw area)
        const bottomLight = new THREE.DirectionalLight(0xffeedd, 0.3);
        bottomLight.position.set(0, -3, 2);
        sceneRef.current.add(bottomLight);

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  };

  const loadAvatarModel = (url) => {
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

          modelRef.current.position.x -= center.x;
          modelRef.current.position.y -= center.y;
          modelRef.current.position.z -= center.z;

          const maxDim = Math.max(size.x, size.y, size.z);
          const scaleFactor = 1.8 / maxDim;
          modelRef.current.scale.setScalar(scaleFactor);
          modelRef.current.position.y += size.y * 0.4;

          console.log('🤖 Avatar model loaded');
          resolve();
        },
        null,
        (error) => {
          reject(new Error(`Failed to load model: ${error.message}`));
        }
      );
    });
  };

  const initAudioSystem = () => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.gain.value = 0.8;
      gainNodeRef.current.connect(audioContextRef.current.destination);
      console.log('🔊 Audio system initialized');
    } catch (err) {
      console.error('❌ Failed to initialize audio system:', err);
      throw err;
    }
  };

  // const initWawaLipsync = () => {
  //   try {
  //     wawaLipsyncRef.current = new WawaLipsync();
  //     console.log('👄 Wawa-lipsync initialized');
  //   } catch (err) {
  //     console.error('❌ Failed to initialize wawa-lipsync:', err);
  //     throw err;
  //   }
  // };

  const startAnimationLoop = () => {
    const animate = (timestamp) => {
      // Update visemes during playback
      if (isPlayingRef.current && audioContextRef.current && visemeTimelineRef.current.length > 0) {
        const elapsed = (timestamp - startTimeRef.current) / 1000;
        const visemes = getInterpolatedVisemes(elapsed);
        applyVisemesToModel(visemes);
      }

      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const getInterpolatedVisemes = (time) => {
    const timeline = visemeTimelineRef.current;
    if (!timeline || timeline.length === 0) return {};

    // Find surrounding keyframes
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

    // Interpolate
    const t = (time - before.time) / (after.time - before.time);
    const result = {};

    const allKeys = new Set([...Object.keys(before.visemes), ...Object.keys(after.visemes)]);

    allKeys.forEach(key => {
      const v1 = before.visemes[key] || 0;
      const v2 = after.visemes[key] || 0;
      result[key] = v1 + (v2 - v1) * t;
    });

    return result;
  };

  const applyVisemesToModel = (visemes) => {
    if (!modelRef.current) return;

    modelRef.current.traverse((child) => {
      if (child.isMesh && child.morphTargetInfluences) {
        Object.entries(visemes).forEach(([viseme, weight]) => {
          // Try direct mapping
          if (child.morphTargetDictionary && child.morphTargetDictionary[viseme] !== undefined) {
            child.morphTargetInfluences[child.morphTargetDictionary[viseme]] = weight;
          }

          // Try common mappings
          const mappings = {
            'jawOpen': ['DD', 'open'],
            'mouthClose': ['PP', 'close'],
            'funnel': ['FF', 'wide'],
            'sil': ['neutral', 'rest']
          };

          if (mappings[viseme]) {
            mappings[viseme].forEach(name => {
              if (child.morphTargetDictionary && child.morphTargetDictionary[name] !== undefined) {
                child.morphTargetInfluences[child.morphTargetDictionary[name]] = weight;
              }
            });
          }
        });
      }
    });
  };

  const speakAudio = async (audioObject, options, callback) => {
    if (!audioObject || !audioObject.audio) {
      console.warn('⚠️ No audio data provided');
      return;
    }

    try {
      console.log('🎵 Starting audio playback with lip sync');

      stopSpeaking();

      // const audioBuffer = await audioContextRef.current.decodeAudioData(audioObject.audio);
      const audioBuffer = audioObject.audio;

      // Generate viseme timeline from word data
      if (audioObject.words && audioObject.wtimes && audioObject.wdurations) {
        generateVisemeTimeline(audioObject.words, audioObject.wtimes, audioObject.wdurations);
      } else {
        generateSimpleVisemeTimeline(audioBuffer);
      }

      // Play audio
      audioSourceRef.current = audioContextRef.current.createBufferSource();
      audioSourceRef.current.buffer = audioBuffer;
      audioSourceRef.current.connect(gainNodeRef.current);

      const startTime = audioContextRef.current.currentTime + 0.01;
      audioSourceRef.current.start(startTime);

      isPlayingRef.current = true;
      startTimeRef.current = startTime * 1000;

      console.log(`▶️ Playing audio (${audioBuffer.duration.toFixed(2)}s)`);

      audioSourceRef.current.onended = () => {
        isPlayingRef.current = false;
        callback && callback(null);
      };

    } catch (err) {
      console.error('❌ speakAudio error:', err);
      throw err;
    }
  };

  const generateVisemeTimeline = (words, wtimes, wdurations) => {
    visemeTimelineRef.current = [];

    // wawa-lipsync VISEMES mapping - typically like:
    // { A: 'AA', E: 'EH', I: 'IH', O: 'OH', U: 'UH', B: 'PP', F: 'FF', etc. }

    words.forEach((word, i) => {
      const startTime = wtimes[i] || 0;
      const duration = wdurations[i] || 0.3;
      const endTime = startTime + duration;

      // Simple word-to-viseme mapping using VISEMES
      // This maps the first character(s) to corresponding viseme
      let viseme = 'sil';
      const lowerWord = word.toLowerCase();

      // Map to viseme using VISEMES (or fallback to common visemes)
      if (VISEMES) {
        // Try to find a matching viseme for the word
        const firstChar = lowerWord[0];
        if (VISEMES[firstChar]) {
          viseme = VISEMES[firstChar];
        } else {
          // Try vowel pattern matching
          if (/[aeiou]/i.test(lowerWord)) viseme = 'AA';
          else if (/[bpm]/i.test(lowerWord)) viseme = 'PP';
          else if (/[fvw]/i.test(lowerWord)) viseme = 'FF';
          else if (/[dtnl]/i.test(lowerWord)) viseme = 'DD';
          else if (/[kg]/i.test(lowerWord)) viseme = 'kk';
          else if (/[syz]/i.test(lowerWord)) viseme = 'SS';
          else if (/[r]/i.test(lowerWord)) viseme = 'RR';
        }
      }

      // Add viseme keyframes
      visemeTimelineRef.current.push({ time: startTime, visemes: { [viseme]: 1.0 } });
      visemeTimelineRef.current.push({ time: endTime, visemes: { [viseme]: 0.0 } });
    });

    visemeTimelineRef.current.sort((a, b) => a.time - b.time);
    console.log(`📊 Generated ${visemeTimelineRef.current.length} viseme keyframes using VISEMES`);
  };

  const generateSimpleVisemeTimeline = (audioBuffer) => {
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
        visemes: { 'jawOpen': jawOpen, 'sil': 1.0 - jawOpen }
      });
    }
  };

  const stopSpeaking = () => {
    if (isPlayingRef.current && audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (e) { }
      isPlayingRef.current = false;
    }
  };

  const cancelSpeaking = () => {
    stopSpeaking();
    visemeTimelineRef.current = [];
  };

  return (
    <div className="w-full h-[600px] rounded-[2rem] overflow-hidden relative shadow-2xl bg-slate-800 bg-[url('/blackboard.jpg')] bg-cover bg-center">
      <div
        ref={containerRef}
        className="pointer-events-none"
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      />
      <div className="absolute inset-0 bg-black/20 pointer-events-none shadow-inner" />
    </div>
  );
}