export const metadata = {
  title: 'MirajTutor - Contact',
  description: 'Get in touch with the MirajTutor team. We\'d love to hear from you.',
}

export default function Contact() {
  return (
    <div className="bg-[#0A0A0F] text-white overflow-x-hidden pt-16">

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden min-h-[50vh] flex items-center">
        <div className="absolute top-[-5%] right-[-5%] w-[450px] h-[450px] rounded-full bg-amber-500/6 blur-[140px] animate-breathe-wide pointer-events-none"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full bg-amber-400/5 blur-[120px] animate-breathe-wide pointer-events-none" style={{animationDelay: '-5s'}}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F]/80 via-transparent to-[#0A0A0F]/30 pointer-events-none"></div>
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '28px 28px'}}></div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="opacity-0 animate-fade-up">
            <span className="inline-flex items-center gap-2 backdrop-blur-2xl bg-white/[0.03] text-amber-200/90 text-sm font-semibold px-5 py-2.5 rounded-full border border-white/[0.06]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-ring"></span>
              Get in Touch
            </span>
          </div>
          <div className="opacity-0 animate-fade-up delay-1 max-w-4xl mx-auto mt-8">
            <h1 className="font-serif font-black leading-[1.04] tracking-tight" style={{fontSize: 'clamp(2.5rem, 5.5vw, 5.5rem)'}}>
              <span className="text-amber-100">We&apos;d love to hear</span><br />
              <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">from you.</span>
            </h1>
          </div>
        </div>
      </section>

      {/* Form + Info */}
      <section className="relative pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-8 lg:gap-12">

            {/* Form */}
            <div className="md:col-span-3 backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-8 lg:p-10 opacity-0 animate-fade-up">
              <form className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-amber-200/70 mb-1.5">First Name</label>
                    <input type="text" placeholder="Rahul" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-amber-100 placeholder-amber-200/30 focus:outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-amber-200/70 mb-1.5">Last Name</label>
                    <input type="text" placeholder="Sharma" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-amber-100 placeholder-amber-200/30 focus:outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-200/70 mb-1.5">Email</label>
                  <input type="email" placeholder="rahul@example.com" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-amber-100 placeholder-amber-200/30 focus:outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-200/70 mb-1.5">Subject</label>
                  <input type="text" placeholder="How can we help?" className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-amber-100 placeholder-amber-200/30 focus:outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-amber-200/70 mb-1.5">Message</label>
                  <textarea rows="5" placeholder="Tell us more..." className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-amber-100 placeholder-amber-200/30 focus:outline-none focus:border-amber-400/40 focus:ring-2 focus:ring-amber-400/10 transition-all resize-none"></textarea>
                </div>
                <button className="w-full rounded-full bg-white text-[#0A0A0F] py-3.5 text-sm font-bold hover:bg-white/90 hover:-translate-y-0.5 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/15">
                  Send Message
                  <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 12L3.75 9.75M6 12l2.25-2.25M6 12V3m-3 9h18"/></svg>
                </button>
              </form>
            </div>

            {/* Info */}
            <div className="md:col-span-2 space-y-6">
              <div className="backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-8 opacity-0 animate-fade-up delay-2">
                <h3 className="text-lg font-bold text-amber-100 mb-6">Contact Info</h3>
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-100">Email</p>
                      <p className="text-sm text-amber-200/50">hello@mirajtutor.app</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-100">Location</p>
                      <p className="text-sm text-amber-200/50">Bangalore, India</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-amber-100">Response Time</p>
                      <p className="text-sm text-amber-200/50">Usually within 24 hours</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-2xl bg-white/[0.02] rounded-3xl border border-white/[0.04] p-8 opacity-0 animate-fade-up delay-3">
                <h3 className="text-lg font-bold text-amber-100 mb-5">Follow Us</h3>
                <div className="flex gap-4">
                  <a href="#" className="w-11 h-11 rounded-xl bg-amber-400/10 flex items-center justify-center hover:bg-amber-400/20 hover:-translate-y-0.5 transition-all"><svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/></svg></a>
                  <a href="#" className="w-11 h-11 rounded-xl bg-amber-400/10 flex items-center justify-center hover:bg-amber-400/20 hover:-translate-y-0.5 transition-all"><svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>
                  <a href="#" className="w-11 h-11 rounded-xl bg-amber-400/10 flex items-center justify-center hover:bg-amber-400/20 hover:-translate-y-0.5 transition-all"><svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg></a>
                  <a href="#" className="w-11 h-11 rounded-xl bg-amber-400/10 flex items-center justify-center hover:bg-amber-400/20 hover:-translate-y-0.5 transition-all"><svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></a>
                </div>
              </div>
            </div>

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
