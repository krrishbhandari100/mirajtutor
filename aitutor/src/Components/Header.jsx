"use client"
import { jwtDecode } from 'jwt-decode';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Cleaned up imports
import React, { useState, useEffect } from 'react';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  // Define handleLogout so it can be used in useEffect and the button
  const handleLogout = () => {
    localStorage.removeItem("token");
    setUser(null);
    router.push('/'); // Redirect to home after logout
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (decoded.expires < currentTime) {
          handleLogout();
          return;
        }

        const displayName = decoded.email.split('@')[0];
        setUser({ 
          name: displayName, 
          email: decoded.email 
        });

      } catch (error) {
        setUser(null);
      }
    } else {
      setUser(null); // Clear user if no token exists (e.g., after manual deletion)
      
    }
  }, [pathname]);

  return (
    <nav className="top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">

        {/* LEFT: Branding */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-indigo-600 flex items-center justify-center shadow-indigo-200 shadow-lg">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            MirajTutor
          </span>
        </div>

        {/* MIDDLE: Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {['Home', 'About', 'Services', 'Contact'].map((link) => (
            <Link
              key={link}
              href={`/${link === 'Home' ? '' : link.toLowerCase()}`}
              className="text-sm font-semibold text-slate-600 transition-colors hover:text-indigo-600"
            >
              {link}
            </Link>
          ))}
        </div>

        {/* RIGHT: Conditional Auth Section */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            /* --- LOGGED IN STATE --- */
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-700">
                Hey, <span className="text-indigo-600 font-bold">{user.name}</span>
              </span>
              <button 
                onClick={handleLogout}
                className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          ) : (
            /* --- GUEST STATE --- */
            <>
              <Link href={'/login'}>
                <button className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-4 py-2">
                  Login
                </button>
              </Link>
              <Link href={'/signup'}>
                <button className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95">
                  Sign Up Free
                </button>
              </Link>
            </>
          )}
        </div>

        {/* MOBILE TOGGLE */}
        <button
          className="md:hidden text-slate-600 p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-4">
          {['Home', 'About', 'Services', 'Contact'].map((link) => (
            <Link key={link} href={`/${link.toLowerCase()}`} className="text-sm font-semibold text-slate-600">
              {link}
            </Link>
          ))}
          <hr className="border-slate-100" />
          <div className="flex flex-col gap-3">
            {user ? (
                <button onClick={handleLogout} className="w-full rounded-lg bg-red-50 py-3 text-sm font-bold text-red-600">Logout</button>
            ) : (
                <>
                <Link href={'/login'}><button className="text-sm font-semibold text-slate-600 text-left">Login</button></Link>
                <Link href={'/signup'}><button className="w-full rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white">Sign Up Free</button></Link>
                </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Header;