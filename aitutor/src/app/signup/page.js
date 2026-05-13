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
    const response = await fetch("http://localhost:8000/signup", {
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
    <div className="flex min-h-screen bg-white">

      {/* --- RIGHT SIDE: Signup Form --- */}
      <div className="flex w-full items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Start your journey toward faster, personalized learning.
            </p>
          </div>

          <form onSubmit={handleSumit} className="mt-8 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700">First Name</label>
                <input
                  type="text" 
                  placeholder="Rahul"
                  onChange={(e)=>setFirst_name(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Last Name</label>
                <input 
                  type="text" 
                  placeholder="Sharma"
                  onChange={(e)=>setLast_name(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Email Address</label>
              <input 
                type="email" 
                placeholder="rahul@example.com"
                  onChange={(e)=>setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700">Password</label>
              <input 
                type="password" 
                placeholder="Min. 8 characters"
                onChange={(e)=>setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm transition-all focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <button className="flex w-full items-center justify-center rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-[0.98]">
              Create Account
            </button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="mx-4 flex-shrink text-xs font-semibold uppercase text-slate-400">Or use Google</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button type="button" className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
              Sign up with Google
            </button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <a href="/login" className="font-bold text-indigo-600 hover:text-indigo-500">Sign in</a>
          </p>
        </div>
      </div>
    </div>
    </>
  )
}

export default Page
