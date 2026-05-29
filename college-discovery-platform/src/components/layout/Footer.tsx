import Link from "next/link";
import { School } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200/80 dark:bg-slate-950 dark:border-slate-900/80 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Logo / Branding */}
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600/10 text-blue-600 rounded-lg dark:text-blue-450">
              <School className="w-4.5 h-4.5 fill-current" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Uni<span className="text-blue-600 dark:text-blue-400">Discover</span> Platform
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-400 dark:text-slate-500">
            <Link href="/" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Search Colleges
            </Link>
            <span>•</span>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Github
            </a>
            <span>•</span>
            <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Privacy Policy
            </a>
            <span>•</span>
            <a href="#" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              Terms of Use
            </a>
          </div>

          {/* Copyright */}
          <div className="text-xs text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} UniDiscover. All rights reserved.
          </div>

        </div>
      </div>
    </footer>
  );
}
