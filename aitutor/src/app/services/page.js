export const metadata = {
  title: 'MirajTutor - Services',
  description: 'Everything you need to master any subject — voice tutoring, document understanding, and multi-language support.',
}

export default function Services() {
  return (
    <div className="bg-[#0A0A0F] text-white overflow-x-hidden pt-16">

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden min-h-[60vh] flex items-center">
        <div className="absolute top-[5%] left-[10%] w-[500px] h-[500px] rounded-full bg-amber-500/6 blur-[140px] animate-breathe-wide pointer-events-none"></div>
        <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] rounded-full bg-amber-400/5 blur-[120px] animate-breathe-wide pointer-events-none" style={{animationDelay: '-4s'}}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F]/80 via-transparent to-[#0A0A0F]/30 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '28px 28px'}}></div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="opacity-0 animate-fade-up">
            <span className="inline-flex items-center gap-2 backdrop-blur-2xl bg-white/[0.03] text-amber-200/90 text-sm font-semibold px-5 py-2.5 rounded-full border border-white/[0.06]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-ring"></span>
              What We Offer
            </span>
          </div>
          <div className="opacity-0 animate-fade-up delay-1 max-w-4xl mx-auto mt-8">
            <h1 className="font-serif font-black leading-[1.04] tracking-tight" style={{fontSize: 'clamp(2.8rem, 6vw, 6rem)'}}>
              <span className="text-amber-100">Everything you need</span><br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">to master any subject.</span>
            </h1>
          </div>
          <div className="opacity-0 animate-fade-up delay-2 max-w-2xl mx-auto mt-6">
            <p className="text-amber-200/70 leading-relaxed text-lg">From voice-first tutoring to multi-language support — MirajTutor brings the classroom of the future to your pocket.</p>
          </div>
        </div>
      </section>

      {/* Service Cards */}
      <section className="relative py-24 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            <div className="backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-8 lg:p-10 hover:bg-white/[0.04] hover:border-amber-400/20 hover:-translate-y-2 transition-all duration-500 opacity-0 animate-fade-up">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/15 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"/></svg>
              </div>
              <h3 className="text-xl font-bold text-amber-100 mb-3">Voice Tutoring</h3>
              <p className="text-amber-200/60 leading-relaxed text-sm mb-6">Natural conversation with an AI that listens, understands, and responds in real-time. No typing needed.</p>
              <ul className="space-y-2 text-sm text-amber-200/50">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Real-time speech recognition</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Natural voice synthesis</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Context-aware conversations</li>
              </ul>
            </div>
            <div className="backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-8 lg:p-10 hover:bg-white/[0.04] hover:border-amber-400/20 hover:-translate-y-2 transition-all duration-500 opacity-0 animate-fade-up delay-2">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/15 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"/></svg>
              </div>
              <h3 className="text-xl font-bold text-amber-100 mb-3">Document Understanding</h3>
              <p className="text-amber-200/60 leading-relaxed text-sm mb-6">Upload PDFs and watch your AI tutor internalize every page — text, diagrams, and formulas included.</p>
              <ul className="space-y-2 text-sm text-amber-200/50">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Vision-based page reading</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Diagrams &amp; formula aware</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Multi-page textbook support</li>
              </ul>
            </div>
            <div className="backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-8 lg:p-10 hover:bg-white/[0.04] hover:border-amber-400/20 hover:-translate-y-2 transition-all duration-500 opacity-0 animate-fade-up delay-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/15 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.627 48.627 0 0 1 12 20.904a48.627 48.627 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.57 50.57 0 0 0-2.658-.813A59.905 59.905 0 0 1 12 3.493a59.902 59.902 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342"/></svg>
              </div>
              <h3 className="text-xl font-bold text-amber-100 mb-3">Multi-Language</h3>
              <p className="text-amber-200/60 leading-relaxed text-sm mb-6">Learn in 11 Indian languages with native accents. Switch between speaking and writing languages on the fly.</p>
              <ul className="space-y-2 text-sm text-amber-200/50">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Hindi, Tamil, Bengali &amp; more</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Native script display</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Accent-perfect TTS</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-24 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 opacity-0 animate-fade-up">
            <span className="text-[10px] font-mono tracking-[0.45em] uppercase text-amber-300/60">Simple Pricing</span>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold mt-6 mb-4">
              <span className="bg-gradient-to-r from-amber-200 via-white to-amber-300 bg-clip-text text-transparent">Choose your plan</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-8 opacity-0 animate-fade-up delay-2">
              <h3 className="text-lg font-bold text-amber-100 mb-2">Free</h3>
              <div className="text-4xl font-black text-amber-300 mb-1">₹0</div>
              <p className="text-amber-200/50 text-sm mb-6">Forever</p>
              <ul className="space-y-3 text-sm text-amber-200/60 mb-8">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>1 PDF upload per session</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Voice tutoring in 11 languages</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>30-min session limit</li>
              </ul>
              <a href="/signup" className="block text-center rounded-full border border-white/15 text-amber-200/80 px-6 py-3 text-sm font-bold hover:bg-white/[0.04] transition-all">Get Started</a>
            </div>
            <div className="backdrop-blur-2xl bg-white/[0.04] rounded-3xl border border-amber-400/20 p-8 relative opacity-0 animate-fade-up delay-3">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-[#0A0A0F] text-[10px] font-bold px-4 py-1 rounded-full uppercase tracking-wider">Popular</div>
              <h3 className="text-lg font-bold text-amber-100 mb-2">Pro</h3>
              <div className="text-4xl font-black text-amber-300 mb-1">₹199</div>
              <p className="text-amber-200/50 text-sm mb-6">per month</p>
              <ul className="space-y-3 text-sm text-amber-200/60 mb-8">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Unlimited PDF uploads</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Unlimited session time</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Priority voice processing</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Custom voice cloning</li>
              </ul>
              <a href="/signup" className="block text-center rounded-full bg-white text-[#0A0A0F] px-6 py-3 text-sm font-bold hover:bg-white/90 transition-all shadow-lg">Subscribe Now</a>
            </div>
            <div className="backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-8 opacity-0 animate-fade-up delay-4">
              <h3 className="text-lg font-bold text-amber-100 mb-2">Team</h3>
              <div className="text-4xl font-black text-amber-300 mb-1">₹999</div>
              <p className="text-amber-200/50 text-sm mb-6">per month (up to 10 seats)</p>
              <ul className="space-y-3 text-sm text-amber-200/60 mb-8">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Everything in Pro</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Admin dashboard</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Usage analytics</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.5 12.75l6 6 9-13.5"/></svg>Priority support</li>
              </ul>
              <a href="/contact" className="block text-center rounded-full border border-white/15 text-amber-200/80 px-6 py-3 text-sm font-bold hover:bg-white/[0.04] transition-all">Contact Sales</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 border-t border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="opacity-0 animate-fade-up max-w-2xl mx-auto">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-amber-100 mb-4">Not sure which plan fits?</h2>
            <p className="text-amber-200/60 mb-8">Start free, upgrade when you need more. No credit card required.</p>
            <a href="/signup" className="inline-flex items-center gap-2 rounded-full bg-white text-[#0A0A0F] px-8 py-4 text-base font-bold hover:bg-white/90 hover:-translate-y-1 active:scale-[0.97] transition-all shadow-2xl shadow-amber-500/20">Try Free for 30 Days <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg></a>
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
