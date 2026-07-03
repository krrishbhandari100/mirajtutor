'use client';

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation';

const Header = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            setIsLoggedIn(true);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        router.push('/');
    };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0A0A0F]/70 backdrop-blur-2xl border-b border-white/[0.03]">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:shadow-amber-400/50 group-hover:scale-105 transition-all duration-300">
                    <span className="text-[#0A0A0F] font-bold text-lg">M</span>
                </div>
                <div className="hidden sm:block">
                    <span className="text-xl font-bold tracking-tight text-amber-100">MirajTutor</span>
                </div>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
                <Link href="/" className="text-sm font-semibold text-amber-300/60 hover:text-amber-200/80 transition-colors">Home</Link>
                <Link href="/about" className="text-sm font-semibold text-amber-300/60 hover:text-amber-200/80 transition-colors">About</Link>
                <Link href="/services" className="text-sm font-semibold text-amber-300/60 hover:text-amber-200/80 transition-colors">Services</Link>
                <Link href="/contact" className="text-sm font-semibold text-amber-300/60 hover:text-amber-200/80 transition-colors">Contact</Link>
            </nav>
            <div className="flex items-center gap-3">
                {!isLoggedIn ? (
                    <>
                        <Link href="/login" className="hidden sm:block text-sm font-semibold text-amber-200/70 hover:text-amber-200 transition-colors px-3 py-2">Login</Link>
                        <Link href="/signup" className="rounded-full bg-white text-[#0A0A0F] px-5 py-2.5 text-sm font-bold hover:bg-white/90 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-lg">Sign Up Free</Link>
                    </>
                ) : (
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center gap-2 bg-white/[0.03] text-amber-200/80 px-4 py-2 rounded-xl font-semibold text-sm hover:bg-white/[0.06] transition-all border border-white/[0.06]">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-[#0A0A0F] text-xs font-bold">U</div>
                            <span>My Account</span>
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-[#0A0A0F]/95 backdrop-blur-2xl rounded-xl shadow-2xl border border-white/[0.06] py-2">
                                <Link href="/dashboard" className="block px-4 py-2 text-sm text-amber-200/70 hover:bg-white/[0.03] font-medium">Dashboard</Link>
                                <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 font-medium">Logout</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <button onClick={()=>setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-amber-200/70">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>
        </div>
        {isMenuOpen && (
            <div className="md:hidden bg-[#0A0A0F]/95 backdrop-blur-2xl border-t border-white/[0.03] px-6 py-4 space-y-3">
                <Link href="/" className="block text-sm font-semibold text-amber-200/70">Home</Link>
                <Link href="/about" className="block text-sm font-semibold text-amber-200/70">About</Link>
                <Link href="/services" className="block text-sm font-semibold text-amber-200/70">Services</Link>
                <Link href="/contact" className="block text-sm font-semibold text-amber-200/70">Contact</Link>
            </div>
        )}
    </header>
  )
}

export default Header
