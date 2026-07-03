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

            <button type="button" className="flex w-full items-center justify-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.02] py-3 text-sm font-semibold text-amber-200/70 transition-all hover:bg-white/[0.05]">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
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
