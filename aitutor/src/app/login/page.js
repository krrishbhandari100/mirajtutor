"use client"
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import { Slide, ToastContainer, toast } from 'react-toastify';

const Page = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e)=>{
      e.preventDefault();
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          password: password,
        })
      });
      const data = await response.json();
      console.log(data)
      if(data['jwt']){
        localStorage.setItem('token', data['jwt']);
        router.push('/dashboard');
      }
      else {
        toast.error(data.message, {
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
    <div className="flex min-h-screen bg-[#0A0A0F]">
      <ToastContainer />
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden bg-[#0A0A0F]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/8 blur-[120px] animate-breathe-wide pointer-events-none"></div>
        <div className="absolute bottom-[15%] right-[10%] w-[300px] h-[300px] rounded-full bg-amber-400/5 blur-[100px] animate-breathe-wide pointer-events-none" style={{ animationDelay: '-4s' }}></div>
        <div className="relative text-center max-w-md px-12">
          <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
            <span className="text-[#0A0A0F] font-black text-2xl">M</span>
          </div>
          <h2 className="text-3xl font-serif font-bold text-amber-100 mb-4">Welcome back to MirajTutor</h2>
          <p className="text-amber-200/60 text-sm leading-relaxed">Your AI tutor remembers everything. Pick up right where you left off.</p>
        </div>
      </div>
      {/* Right form panel */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-amber-100">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-amber-200/50">
              Enter your details to access your tutor rooms.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-amber-200/70">Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  onChange={(e)=>setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-amber-100 placeholder-amber-200/30 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-4 focus:ring-amber-400/10"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-amber-200/70">Password</label>
                  <a href="#" className="text-xs font-semibold text-amber-400/70 hover:text-amber-400">Forgot?</a>
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  onChange={(e)=>setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-amber-100 placeholder-amber-200/30 transition-all focus:border-amber-400/40 focus:outline-none focus:ring-4 focus:ring-amber-400/10"
                />
              </div>
            </div>

            <button className="flex w-full items-center justify-center rounded-full bg-white py-3.5 text-sm font-bold text-[#0A0A0F] transition-all hover:bg-white/90 active:scale-[0.98] shadow-lg shadow-amber-500/15">
              Sign In
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-white/[0.06]"></div>
              <span className="mx-4 flex-shrink text-xs font-semibold uppercase text-amber-200/40">Or continue with</span>
              <div className="flex-grow border-t border-white/[0.06]"></div>
            </div>

          </form>

          <p className="text-center text-sm text-amber-200/50">
            Don&apos;t have an account?{' '}
            <a href="/signup" className="font-bold text-amber-400/70 hover:text-amber-400">Sign up for free</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Page
