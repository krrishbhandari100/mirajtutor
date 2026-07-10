"use client"
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import { ToastContainer, toast, Slide } from 'react-toastify';


const Page = () => {
  const [first_name, setFirst_name] = useState("");
  const [last_name, setLast_name] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSumit = async (e)=>{
    e.preventDefault();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: first_name,
        last_name: last_name,
        email: email,
        password: password
      })
    });
    const data = await response.json();
    if(data.jwt){
      router.push('/login');
    }
    else {
      toast.error(data.msg, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Slide,
      });
    }
  }
  return (
    <>
    <ToastContainer />
    <div className="flex min-h-screen bg-[#0A0A0F]">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden bg-[#0A0A0F]">
        <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full bg-amber-500/6 blur-[120px] animate-breathe-wide pointer-events-none"></div>
        <div className="absolute bottom-[5%] right-[15%] w-[350px] h-[350px] rounded-full bg-amber-400/5 blur-[100px] animate-breathe-wide pointer-events-none" style={{ animationDelay: '-5s' }}></div>
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle,#fff 1px,transparent 1px)', backgroundSize: '28px 28px' }}></div>
        <div className="relative text-center max-w-md px-12">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-6 h-6 rounded-full bg-amber-400 animate-pulse-ring"></div>
            <span className="text-[10px] font-mono tracking-[0.35em] uppercase text-amber-300/60">Free forever</span>
          </div>
          <h2 className="text-3xl font-serif font-bold text-amber-100 mb-4">Start learning in your language</h2>
          <p className="text-amber-200/60 text-sm leading-relaxed">Hindi, Tamil, Bengali, and more. MirajTutor speaks the way you learn best.</p>
        </div>
      </div>
      {/* Right form panel */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-amber-100">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-amber-200/50">
              Start your journey toward faster, personalized learning.
            </p>
          </div>

          <form onSubmit={handleSumit} className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-amber-200/70">First Name</label>
                <input
                  type="text" 
                  placeholder="Rahul"
                  onChange={(e)=>setFirst_name(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-amber-100 placeholder-amber-200/30 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-4 focus:ring-amber-400/10"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-amber-200/70">Last Name</label>
                <input 
                  type="text" 
                  placeholder="Sharma"
                  onChange={(e)=>setLast_name(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-amber-100 placeholder-amber-200/30 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-4 focus:ring-amber-400/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-amber-200/70">Email Address</label>
              <input 
                type="email" 
                placeholder="rahul@example.com"
                  onChange={(e)=>setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-amber-100 placeholder-amber-200/30 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-4 focus:ring-amber-400/10"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-amber-200/70">Password</label>
              <input 
                type="password" 
                placeholder="Min. 8 characters"
                onChange={(e)=>setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-amber-100 placeholder-amber-200/30 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-4 focus:ring-amber-400/10"
              />
            </div>

            <button className="flex w-full items-center justify-center rounded-full bg-white py-3.5 text-sm font-bold text-[#0A0A0F] transition-all hover:bg-white/90 active:scale-[0.98] shadow-lg shadow-amber-500/15">
              Create Account
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/[0.06]"></div>
              <span className="mx-4 flex-shrink text-xs font-semibold uppercase text-amber-200/40">Or use Google</span>
              <div className="flex-grow border-t border-white/[0.06]"></div>
            </div>
          </form>

          <p className="text-center text-sm text-amber-200/50">
            Already have an account?{' '}
            <a href="/login" className="font-bold text-amber-400/70 hover:text-amber-400">Sign in</a>
          </p>
        </div>
      </div>
    </div>
    </>
  )
}

export default Page
