"use client"
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import { Slide, ToastContainer, toast } from 'react-toastify';

const page = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e)=>{
      e.preventDefault();
      const response = await fetch("http://localhost:8000/login", {
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
    <div className="flex min-h-screen bg-white">
      <ToastContainer />
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter your details to access your tutor rooms.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">Email Address</label>
                <input 
                  type="email" 
                  placeholder="name@company.com"
                  onChange={(e)=>setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-700">Password</label>
                  <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Forgot?</a>
                </div>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  onChange={(e)=>setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                />
              </div>
            </div>

            <button className="flex w-full items-center justify-center rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.98]">
              Sign In
            </button>

            {/* Social Login Divider */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="mx-4 flex-shrink text-xs font-semibold uppercase text-slate-400">Or continue with</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button type="button" className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <a href="#" className="font-bold text-indigo-600 hover:text-indigo-500">Sign up for free</a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default page
