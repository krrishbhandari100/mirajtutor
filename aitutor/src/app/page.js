import Header from "@/Components/Header";
import Image from "next/image";

export const metadata = {
  title: 'MirajTutor - Home',
  description: 'This is home page',
}

export default function Home() {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48">
      {/* Background Glow Effect */}
      <div className="absolute top-0 left-1/2 -z-10 h-[600px] w-full -translate-x-1/2 bg-[radial-gradient(60%_50%_at_50%_0%,#4f46e51a_0%,#ffffff_100%)]" />

      <div className="container mx-auto px-6 text-center">
        {/* Badge */}
        

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl">
          Learn anything in the <br />
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            voice always ready to explain.
          </span>
        </h1>

        {/* Sub-headline */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
          Upload your textbooks, clone a voice you love, and let your AI Tutor 
          explain complex topics in a way you actually understand. 100% private, 100% local.
        </p>

        {/* Main Actions */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button className="rounded-full bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-indigo-200 transition-all hover:bg-indigo-700 hover:-translate-y-1 active:scale-95">
            Start Tutoring Now
          </button>
          <button className="rounded-full border border-slate-200 bg-white px-8 py-4 text-base font-bold text-slate-700 transition-all hover:bg-slate-50">
            Watch the Demo
          </button>
        </div>

        {/* Quick Stats */}
        <div className="mt-20 grid grid-cols-2 gap-8 md:grid-cols-4 border-t border-slate-100 pt-10">
          {[
            ['100%', 'Local Data'],
            ['0ms', 'Voice Lag'],
            ['FREE', 'Forever'],
            ['HD', 'Audio Quality'],
          ].map(([val, label]) => (
            <div key={label}>
              <div className="text-2xl font-bold text-slate-900">{val}</div>
              <div className="text-sm font-medium text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
