"use client";
import { useEffect, useRef } from 'react';


export default function TalkingTutor({ avatarPath, onReady }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    console.log('🎬 TalkingTutor useEffect triggered with avatarPath:', avatarPath);
    containerRef.current.innerHTML = '';

    let head = null;

    async function init() {
      try{
        console.log('🚀 Attempting to import talkinghead.mjs from /talkinghead.mjs');
        // For Next.js compatibility, we'll import from the public folder
        // The talkinghead.mjs file has been copied to /public/talkinghead.mjs
        const TalkingHeadModule = await import('./talkinghead.mjs');
        console.log('✅ TalkingHead module imported successfully');
        const { TalkingHead } = TalkingHeadModule;
        const audioCtx = new AudioContext({ sampleRate: 44100 });
        console.log('🔊 AudioContext created with sampleRate:', audioCtx.sampleRate);

        head = new TalkingHead(containerRef.current, {
          audioCtx: audioCtx,
          lipsyncModules: ['en'], // Let TalkingHead load the module from lipsyncModulesPath
          lipsyncLang: 'en',
          lipsyncModulesPath: '/lipsync/', // Use absolute path from public folder
          pcmModulesPath: '/modules/',     // Use absolute path from public folder
          // Position them nicely in front of the board
          cameraDistance: 2.8,
          cameraView: 'upper', // Focuses on the torso/head
          ambientLight: 3.0,
          avatarIdleEyeContact: 0.85,      // 80% eye contact when idle
          avatarSpeakingEyeContact: 0.9,  // 90% eye contact when speaking
        });
        console.log('🤖 TalkingHead instance created');

        console.log('🎭 Attempting to show avatar with URL:', avatarPath);
        await head.showAvatar({ url: avatarPath, body: 'F', avatarMood: "angry" });
        console.log('✅ Avatar shown successfully');
        
        console.log('▶️ Starting TalkingHead engine...');
        await head.start();
        console.log('✅ TalkingHead engine started');

        // Explicitly enable lipsync after initialization
        console.log('🔍 Checking lipsync methods on head object:', Object.keys(head));
        // Log all methods that contain 'lip' or 'Lip' in their name
        const lipMethods = Object.keys(head).filter(key => 
          key.toLowerCase().includes('lip') && typeof head[key] === 'function'
        );
        console.log('🔍 Found lip-related methods:', lipMethods);
        
        if (typeof head.enableLipSync === 'function') {
          await head.enableLipSync(true);
          console.log('✅ Lipsync enabled via enableLipSync');
        } else if (typeof head.setLipSyncEnabled === 'function') {
          head.setLipSyncEnabled(true);
          console.log('✅ Lipsync enabled via setLipSyncEnabled');
        } else if (typeof head.setLipSync === 'function') {
          head.setLipSync(true);
          console.log('✅ Lipsync enabled via setLipSync');
        } else if (typeof head.activateLipSync === 'function') {
          await head.activateLipSync(true);
          console.log('✅ Lipsync enabled via activateLipSync');
        } else {
          console.log('⚠️ Could not find standard lipsync enable method');
          // Try to set it via properties if available
          if (typeof head.lipSyncEnabled !== 'undefined') {
            head.lipSyncEnabled = true;
            console.log('✅ Lipsync enabled via property setting');
          } else if (typeof head.enableLipSync !== 'undefined') {
            head.enableLipSync = true;
            console.log('✅ Lipsync enabled via property setting (enableLipSync)');
          }
        }
        
        console.log('🎯 Calling onReady callback with head instance');
        if (onReady) onReady(head);
        console.log('✅ TalkingTutor initialization complete');
      } catch (e) {
        console.error("❌ Engine failed to start:", e);
        console.error("Error details:", e);
      }
    }

    init();

    return () => {
      console.log('🧹 TalkingTutor cleanup function called');
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [avatarPath]);

  return (
    // 1. THE BLACKBOARD: Add a background image URL to this parent div. 
    // (Make sure to save an image named 'blackboard.jpg' in your public folder!)
    <div className="w-full h-[600px] rounded-[2rem] overflow-hidden relative shadow-2xl bg-slate-800 bg-[url('/blackboard.jpg')] bg-cover bg-center">

      {/* 2. THE LOCK: Added 'pointer-events-none' to stop the 360 spin */}
      <div
        ref={containerRef}
        className="pointer-events-none"
        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
      />

      {/* Optional: A cool overlay to make the blackboard look more realistic */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none shadow-inner" />
    </div>
  );
}