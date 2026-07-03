export default function Home() {
  return (
    <main className="bg-[#0A0A0F] text-white overflow-x-hidden">

      {/* ====== HERO ====== */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0F]">

        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F]/90 via-transparent to-[#0A0A0F]/50 pointer-events-none z-[2]"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0F]/60 via-transparent to-[#0A0A0F]/60 pointer-events-none z-[2]"></div>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-gradient-to-t from-amber-500/5 to-transparent blur-[80px] pointer-events-none z-[1]"></div>

        {/* THE ORB */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[3] pointer-events-none select-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-b from-amber-500/8 via-amber-600/5 to-transparent blur-[120px] animate-breathe-ambient"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] rounded-full bg-amber-500/10 blur-[100px] animate-breathe-outer"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full bg-gradient-to-br from-amber-300/40 via-amber-400/30 to-amber-500/20 blur-[60px] animate-breathe-mid"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] rounded-full bg-gradient-to-br from-amber-200/60 via-amber-300/50 to-amber-400/30 blur-[30px] animate-breathe-core"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[56px] h-[56px] rounded-full bg-gradient-to-br from-white via-amber-100 to-amber-300 blur-[8px] animate-breathe-core" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[16px] h-[16px] rounded-full bg-white blur-[4px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[6px] h-[6px] rounded-full bg-white"></div>
        </div>

        {/* EMBER PARTICLES */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 z-[3] pointer-events-none select-none">
          <div className="ember w-[3px] h-[3px] text-amber-300/80 animate-ember-A d-0" style={{ top: '-30px', left: '90px' }}></div>
          <div className="ember w-[2px] h-[2px] text-amber-200/60 animate-ember-B d-1" style={{ top: '-50px', left: '-70px' }}></div>
          <div className="ember w-[2.5px] h-[2.5px] text-white/50 animate-ember-C d-2" style={{ top: '40px', left: '-90px' }}></div>
          <div className="ember w-[2px] h-[2px] text-amber-400/70 animate-ember-D d-3" style={{ top: '60px', left: '80px' }}></div>
          <div className="ember w-[3px] h-[3px] text-amber-300/60 animate-ember-E d-4" style={{ top: '-80px', left: '40px' }}></div>
          <div className="ember w-[2px] h-[2px] text-amber-200/50 animate-ember-F d-5" style={{ top: '70px', left: '-50px' }}></div>
          <div className="ember w-[2px] h-[2px] text-amber-400/50 animate-ember-F d-6" style={{ top: '-100px', left: '160px' }}></div>
          <div className="ember w-[2.5px] h-[2.5px] text-white/40 animate-ember-A d-7" style={{ top: '-120px', left: '-130px' }}></div>
          <div className="ember w-[2px] h-[2px] text-amber-300/50 animate-ember-B d-0" style={{ top: '100px', left: '-140px' }}></div>
          <div className="ember w-[3px] h-[3px] text-amber-200/50 animate-ember-C d-1" style={{ top: '130px', left: '120px' }}></div>
          <div className="ember w-[2px] h-[2px] text-amber-400/40 animate-ember-D d-2" style={{ top: '-140px', left: '80px' }}></div>
          <div className="ember w-[2.5px] h-[2.5px] text-white/40 animate-ember-E d-3" style={{ top: '140px', left: '-60px' }}></div>
          <div className="ember w-[1.5px] h-[1.5px] text-amber-300/30 animate-ember-B d-4" style={{ top: '-180px', left: '240px' }}></div>
          <div className="ember w-[1.5px] h-[1.5px] text-amber-200/30 animate-ember-C d-5" style={{ top: '200px', left: '-200px' }}></div>
          <div className="ember w-[1.5px] h-[1.5px] text-amber-200/70 animate-ember-A d-6" style={{ top: '-200px', left: '-180px' }}></div>
          <div className="ember w-[1.5px] h-[1.5px] text-amber-400/25 animate-ember-D d-7" style={{ top: '180px', left: '220px' }}></div>
          <div className="ember w-[2px] h-[2px] text-amber-300/25 animate-ember-E d-0" style={{ top: '-160px', left: '-240px' }}></div>
          <div className="ember w-[1.5px] h-[1.5px] text-amber-200/25 animate-ember-F d-1" style={{ top: '220px', left: '160px' }}></div>
        </div>

        {/* CONTENT */}
        <div className="relative z-[5] flex flex-col items-center text-center px-6 max-w-5xl mx-auto pt-32 pb-32">
          <div className="mb-10 opacity-0 animate-fade-up">
            <span className="inline-flex items-center gap-2.5 backdrop-blur-2xl bg-white/[0.03] text-amber-200/90 text-sm font-semibold px-5 py-2.5 rounded-full border border-white/[0.06] shadow-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-ring"></span>
              AI-Powered Voice Tutor
            </span>
          </div>

          <div className="opacity-0 animate-fade-up delay-1 max-w-5xl">
            <h1 className="font-serif font-black leading-[1.04] tracking-tight"
                style={{ fontSize: 'clamp(2.8rem, 7.5vw, 7.5rem)' }}>
              <span className="text-amber-100">Learn anything</span><br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent animate-shimmer-text">
                in the voice always<br className="hidden sm:block" /> ready to explain.
              </span>
            </h1>
          </div>

          <div className="mt-6 max-w-lg mx-auto opacity-0 animate-fade-up delay-2">
            <p className="text-amber-200/80 leading-relaxed" style={{ fontSize: 'clamp(1rem, 1.2vw, 1.2rem)' }}>
              Upload your textbooks, clone a voice you love, and let your AI Tutor
              explain complex topics in a way you actually understand.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-10 opacity-0 animate-fade-up delay-3">
            <a href="/signup" className="group relative rounded-full bg-white px-8 py-4 text-base font-bold text-[#0A0A0F] hover:bg-white/90 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 inline-flex items-center gap-2 shadow-2xl shadow-amber-500/20 overflow-hidden">
              <span className="relative z-10">Start Tutoring Now</span>
              <svg className="w-5 h-5 relative z-10 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/30 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-700"></div>
            </a>
            <a href="/about" className="group rounded-full backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] px-8 py-4 text-base font-bold text-amber-200/90 hover:bg-white/[0.06] hover:border-amber-400/30 hover:text-amber-200 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 inline-flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-300/70" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Watch the Demo
            </a>
          </div>
        </div>

        {/* PHONE MOCKUP */}
        <div className="relative z-[4] -mt-10 mb-10 opacity-0 animate-fade-up delay-5">
          <div className="mx-auto max-w-[240px] sm:max-w-[260px]">
            <div className="rounded-[2.2rem] border border-white/[0.06] bg-[#0A0A0F]/80 backdrop-blur-xl p-[6px] shadow-2xl shadow-amber-500/5">
              <div className="rounded-[1.8rem] bg-gradient-to-b from-[#121218] to-[#0A0A0F] overflow-hidden">
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-[100px] h-[22px] bg-[#0A0A0F] rounded-full border border-white/[0.04]"></div>
                </div>
                <div className="px-5 pb-8 pt-2 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 mb-4 shadow-lg shadow-amber-500/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#0A0A0F]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/></svg>
                  </div>
                  <div className="space-y-2 w-full">
                    <div className="flex justify-start">
                      <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[80%]">
                        <div className="h-1.5 bg-white/20 rounded-full w-24 mb-1.5"></div>
                        <div className="h-1.5 bg-white/10 rounded-full w-16"></div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="bg-amber-500/20 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]">
                        <div className="h-1.5 bg-amber-300/30 rounded-full w-28 mb-1.5"></div>
                        <div className="h-1.5 bg-amber-300/20 rounded-full w-20"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-[2px] mt-4 h-4">
                    {[6,10,14,16,14,10,6].map((h, i) => (
                      <div key={i} className="w-[2px] bg-amber-400/30 rounded-full animate-bounce" style={{ animationDuration: `${1 + i * 0.05}s`, height: `${h}px`, animationDelay: `${i * 0.1}s` }}></div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-center pb-3">
                  <div className="w-[120px] h-[4px] bg-white/10 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[5] opacity-0 animate-fade-up delay-7">
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-mono tracking-[0.35em] uppercase text-amber-300/60">Scroll</span>
            <svg className="w-4 h-4 text-amber-300/60 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
          </div>
        </div>

      </section>

      {/* ====== FEATURES ====== */}
      <section className="relative py-32 bg-[#0A0A0F] border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20 opacity-0 animate-fade-up">
            <span className="text-[10px] font-mono tracking-[0.45em] uppercase text-amber-300/60">The Experience</span>
            <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold mt-6 mb-4">
              <span className="bg-gradient-to-r from-amber-200 via-white to-amber-300 bg-clip-text text-transparent">
                From curiosity to clarity
              </span>
            </h2>
            <p className="text-amber-200/70 text-lg">Everything you need, nothing you don&apos;t.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <div className="group backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-8 lg:p-10 hover:bg-white/[0.04] hover:border-white/[0.08] hover:-translate-y-2 transition-all duration-500 opacity-0 animate-fade-up delay-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"/></svg>
              </div>
              <h3 className="text-xl font-bold text-amber-100 mb-3">Upload PDFs</h3>
              <p className="text-amber-200/70 leading-relaxed text-sm">Drop your textbooks. Our AI reads every page — diagrams, formulas, and margin notes.</p>
              <div className="mt-6 pt-6 border-t border-white/[0.03]">
                <span className="text-amber-300/60 text-xs font-mono tracking-wider">01</span>
              </div>
            </div>

            <div className="group backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-8 lg:p-10 hover:bg-white/[0.04] hover:border-white/[0.08] hover:-translate-y-2 transition-all duration-500 opacity-0 animate-fade-up delay-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-300/20 to-amber-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-7 h-7 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/></svg>
              </div>
              <h3 className="text-xl font-bold text-amber-100 mb-3">Voice Tutor</h3>
              <p className="text-amber-200/70 leading-relaxed text-sm">Ask with your voice. Get answers that feel like conversation with a patient expert.</p>
              <div className="mt-6 pt-6 border-t border-white/[0.03]">
                <span className="text-amber-300/60 text-xs font-mono tracking-wider">02</span>
              </div>
            </div>

            <div className="group backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-8 lg:p-10 hover:bg-white/[0.04] hover:border-white/[0.08] hover:-translate-y-2 transition-all duration-500 opacity-0 animate-fade-up delay-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-200/20 to-amber-400/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-7 h-7 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"/></svg>
              </div>
              <h3 className="text-xl font-bold text-amber-100 mb-3">11 Languages</h3>
              <p className="text-amber-200/70 leading-relaxed text-sm">Hindi, Tamil, Bengali, Marathi &amp; more. Voice-first, accent-perfect, local.</p>
              <div className="mt-6 pt-6 border-t border-white/[0.03]">
                <span className="text-amber-300/60 text-xs font-mono tracking-wider">03</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="border-t border-white/[0.03] bg-[#0A0A0F] py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center">
                <span className="text-[#0A0A0F] font-bold text-xs">M</span>
              </div>
              <span className="text-sm font-bold text-amber-200/70">MirajTutor</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs font-semibold text-amber-200/70 hover:text-amber-200/60 transition-colors">Privacy</a>
              <a href="#" className="text-xs font-semibold text-amber-200/70 hover:text-amber-200/60 transition-colors">Terms</a>
              <a href="/contact" className="text-xs font-semibold text-amber-200/70 hover:text-amber-200/60 transition-colors">Contact</a>
            </div>
            <p className="text-xs text-amber-300/40">&copy; 2026 MirajTutor. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </main>
  );
}
