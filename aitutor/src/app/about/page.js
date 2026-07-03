export const metadata = {
  title: 'MirajTutor - About',
  description: 'We believe learning should feel like conversation. MirajTutor makes personalized AI tutoring accessible to every Indian student.',
}

export default function About() {
  return (
    <div className="bg-[#0A0A0F] text-white overflow-x-hidden pt-16">

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden min-h-[60vh] flex items-center">
        <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] rounded-full bg-amber-500/8 blur-[140px] animate-breathe-wide pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-amber-600/6 blur-[120px] animate-breathe-wide pointer-events-none" style={{animationDelay: '-3s'}}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F]/80 via-transparent to-[#0A0A0F]/30 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '28px 28px'}}></div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="opacity-0 animate-fade-up">
            <span className="inline-flex items-center gap-2 backdrop-blur-2xl bg-white/[0.03] text-amber-200/90 text-sm font-semibold px-5 py-2.5 rounded-full border border-white/[0.06]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-ring"></span>
              Our Story
            </span>
          </div>
          <div className="opacity-0 animate-fade-up delay-1 max-w-4xl mx-auto mt-8">
            <h1 className="font-serif font-black leading-[1.04] tracking-tight" style={{fontSize: 'clamp(2.8rem, 6vw, 6rem)'}}>
              <span className="text-amber-100">We believe learning</span><br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">should feel like conversation.</span>
            </h1>
          </div>
          <div className="opacity-0 animate-fade-up delay-2 max-w-2xl mx-auto mt-6">
            <p className="text-amber-200/70 leading-relaxed text-lg">MirajTutor was born from a simple idea: that the best teacher is one who listens, adapts, and speaks your language — literally.</p>
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="relative py-24 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-8">
          <div className="backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-10 hover:bg-white/[0.04] hover:border-amber-400/20 hover:-translate-y-1 transition-all duration-500 opacity-0 animate-fade-up">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/15 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></svg>
            </div>
            <h3 className="text-2xl font-bold text-amber-100 mb-4">Our Mission</h3>
            <p className="text-amber-200/70 leading-relaxed">Make personalized AI tutoring accessible to every Indian student in their native language. No jargon, no friction — just a voice that explains until it clicks.</p>
          </div>
          <div className="backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-10 hover:bg-white/[0.04] hover:border-amber-400/20 hover:-translate-y-1 transition-all duration-500 opacity-0 animate-fade-up delay-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/15 flex items-center justify-center mb-6">
              <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"/></svg>
            </div>
            <h3 className="text-2xl font-bold text-amber-100 mb-4">Our Vision</h3>
            <p className="text-amber-200/70 leading-relaxed">A world where language is never a barrier to understanding. Where every student has a patient, knowledgeable tutor available 24/7 in their mother tongue.</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative py-20 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center opacity-0 animate-fade-up delay-1">
              <div className="text-4xl sm:text-5xl font-black text-amber-300 mb-1">11</div>
              <div className="text-sm font-medium text-amber-200/50">Indian Languages</div>
              <div className="w-10 h-0.5 bg-amber-400/30 mx-auto mt-3"></div>
            </div>
            <div className="text-center opacity-0 animate-fade-up delay-2">
              <div className="text-4xl sm:text-5xl font-black text-amber-300 mb-1">10K+</div>
              <div className="text-sm font-medium text-amber-200/50">Active Learners</div>
              <div className="w-10 h-0.5 bg-amber-400/30 mx-auto mt-3"></div>
            </div>
            <div className="text-center opacity-0 animate-fade-up delay-3">
              <div className="text-4xl sm:text-5xl font-black text-amber-300 mb-1">99%</div>
              <div className="text-sm font-medium text-amber-200/50">Speech Accuracy</div>
              <div className="w-10 h-0.5 bg-amber-400/30 mx-auto mt-3"></div>
            </div>
            <div className="text-center opacity-0 animate-fade-up delay-4">
              <div className="text-4xl sm:text-5xl font-black text-amber-300 mb-1">100%</div>
              <div className="text-sm font-medium text-amber-200/50">Private &amp; Local</div>
              <div className="w-10 h-0.5 bg-amber-400/30 mx-auto mt-3"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="relative py-24 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 opacity-0 animate-fade-up">
            <span className="text-[10px] font-mono tracking-[0.45em] uppercase text-amber-300/60">What guides us</span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold mt-6 mb-4">
              <span className="bg-gradient-to-r from-amber-200 via-white to-amber-300 bg-clip-text text-transparent">Our Values</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.04] p-8 hover:bg-white/[0.04] hover:border-amber-400/20 hover:-translate-y-1.5 transition-all duration-500 opacity-0 animate-fade-up delay-2">
              <div className="w-12 h-12 rounded-xl bg-amber-400/15 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/></svg>
              </div>
              <h3 className="text-lg font-bold text-amber-100 mb-2">Privacy First</h3>
              <p className="text-amber-200/60 text-sm leading-relaxed">Your data stays on your device. We never train on your conversations or sell your information.</p>
            </div>
            <div className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.04] p-8 hover:bg-white/[0.04] hover:border-amber-400/20 hover:-translate-y-1.5 transition-all duration-500 opacity-0 animate-fade-up delay-3">
              <div className="w-12 h-12 rounded-xl bg-amber-400/15 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>
              </div>
              <h3 className="text-lg font-bold text-amber-100 mb-2">Inclusive by Design</h3>
              <p className="text-amber-200/60 text-sm leading-relaxed">Built for India&apos;s linguistic diversity. Voice-first interface works for readers and non-readers alike.</p>
            </div>
            <div className="backdrop-blur-2xl bg-white/[0.02] rounded-2xl border border-white/[0.04] p-8 hover:bg-white/[0.04] hover:border-amber-400/20 hover:-translate-y-1.5 transition-all duration-500 opacity-0 animate-fade-up delay-4">
              <div className="w-12 h-12 rounded-xl bg-amber-400/15 flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/></svg>
              </div>
              <h3 className="text-lg font-bold text-amber-100 mb-2">Teaching, Not Telling</h3>
              <p className="text-amber-200/60 text-sm leading-relaxed">We don&apos;t just give answers. We explain concepts, ask questions, and adapt to each learner&apos;s pace.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="max-w-3xl mx-auto opacity-0 animate-fade-up">
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-amber-100 mb-6">Ready to meet your AI tutor?</h2>
            <p className="text-amber-200/60 text-lg mb-10">Start learning in your language today. It&apos;s free, private, and always patient.</p>
            <a href="/signup" className="inline-flex items-center gap-2 rounded-full bg-white text-[#0A0A0F] px-8 py-4 text-base font-bold hover:bg-white/90 hover:-translate-y-1 active:scale-[0.97] transition-all duration-300 shadow-2xl shadow-amber-500/20">
              Get Started Free
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
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

    </div>
  );
}
