"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useAuthModalStore } from "@/stores/useAuthModalStore";
import { School, Heart, GitCompare, LogOut, User as UserIcon, Menu, X, LogIn } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const { data: session } = useSession();
  const { openLogin, openSignup } = useAuthModalStore();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on path change
  useEffect(() => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Discover", icon: School },
    { href: "/saved", label: "Saved Colleges", icon: Heart, protected: true },
    { href: "/saved/comparisons", label: "Saved Comparisons", icon: GitCompare, protected: true },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex items-center justify-center w-9 h-9 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <School className="w-5 h-5 fill-current" />
              </div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Uni<span className="text-blue-600 dark:text-blue-400">Discover</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              if (link.protected && !session) return null;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200",
                    isActive
                      ? "text-blue-600 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-950/20"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  )}
                >
                  <link.icon className="w-4.5 h-4.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Auth Buttons / Profile Menu */}
          <div className="hidden md:flex items-center gap-4">
            {session ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl transition-all"
                >
                  <img
                    src={session.user?.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${session.user?.name || "avatar"}`}
                    alt={session.user?.name || "avatar"}
                    className="w-8 h-8 rounded-full border border-slate-200 bg-white dark:border-slate-800"
                  />
                  <div className="text-left hidden lg:block pr-1">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                      {session.user?.name}
                    </p>
                    <p className="text-3xs text-slate-400 dark:text-slate-500 truncate max-w-[120px]">
                      {session.user?.email}
                    </p>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2.5 w-52 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-xl shadow-xl shadow-slate-100/50 dark:shadow-black/60 animate-scale-up">
                    <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {session.user?.name}
                      </p>
                      <p className="text-2xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {session.user?.email}
                      </p>
                    </div>
                    
                    <div className="p-1">
                      <Link
                        href="/saved"
                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Heart className="w-4.5 h-4.5 text-slate-400" />
                        Saved Colleges
                      </Link>
                      <Link
                        href="/saved/comparisons"
                        className="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <GitCompare className="w-4.5 h-4.5 text-slate-400" />
                        Saved Comparisons
                      </Link>
                    </div>

                    <div className="p-1 border-t border-slate-100 dark:border-slate-850">
                      <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                      >
                        <LogOut className="w-4.5 h-4.5" />
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={openLogin}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-900 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <LogIn className="w-4.5 h-4.5" />
                  Sign In
                </button>
                <button
                  onClick={openSignup}
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 px-4 pt-2 pb-6 space-y-3 shadow-lg">
          {navLinks.map((link) => {
            if (link.protected && !session) return null;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors",
                  isActive
                    ? "text-blue-600 bg-blue-50/50 dark:text-blue-400 dark:bg-blue-950/20"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/50"
                )}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
            {session ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-4 py-2">
                  <img
                    src={session.user?.image || `https://api.dicebear.com/7.x/adventurer/svg?seed=${session.user?.name || "avatar"}`}
                    alt="avatar"
                    className="w-9 h-9 rounded-full border"
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {session.user?.name}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                      {session.user?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 px-4">
                <button
                  onClick={openLogin}
                  className="py-2.5 text-sm font-bold border rounded-lg text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900/50 text-center"
                >
                  Sign In
                </button>
                <button
                  onClick={openSignup}
                  className="py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-center"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
