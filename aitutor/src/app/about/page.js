import React from 'react'

export const metadata = {
  title: 'MirajTutor - About',
  description: 'This is about page',
}

const page = () => {
  return (
    <div className="bg-white pt-24 pb-16">
      <div className="container mx-auto px-6">
        {/* --- Section 1: The Vision --- */}
        <div className="max-w-3xl">
          <h2 className="text-indigo-600 font-bold tracking-widest uppercase text-sm mb-4">Our Vision</h2>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 leading-tight">
            Education should sound like <span className="text-indigo-600 underline decoration-indigo-200">you</span>.
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-8">
            AI Tutor was born out of a simple frustration: learning from static textbooks is hard. We believe everyone deserves a private, patient tutor that understands their unique learning style and speaks in a voice that keeps them engaged.
          </p>
        </div>

        {/* --- Section 2: Why Local? (The Professional Edge) --- */}
        <div className="grid md:grid-cols-2 gap-12 my-20 items-center">
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-none h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">1</div>
              <div>
                <h4 className="font-bold text-slate-900">Zero-Shot Voice Cloning</h4>
                <p className="text-sm text-slate-500">Clone any voice with just 10 seconds of audio using F5-TTS technology.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-none h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">2</div>
              <div>
                <h4 className="font-bold text-slate-900">Contextual Intelligence</h4>
                <p className="text-sm text-slate-500">Your tutor reads your documents and remembers your previous sessions perfectly.</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- Section 3: The Tech Stack --- */}
        <div className="border-t border-slate-100 pt-16">
          <h3 className="text-center text-slate-400 font-semibold text-sm uppercase tracking-widest mb-10">Our Modern Stack</h3>
          <div className="flex flex-wrap justify-center gap-12 grayscale opacity-60">
            {['Next.js', 'FastAPI', 'PostgreSQL', 'Ollama', 'Tailwind'].map((tech) => (
              <span key={tech} className="text-2xl font-black text-slate-800">{tech}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default page
