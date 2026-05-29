"use client";

import Link from "next/link";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { X, GitCompare, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function CompareBucket() {
  const { colleges, removeCollege, clearAll } = useComparisonStore();
  const [isMinimized, setIsMinimized] = useState(false);

  if (colleges.length === 0) return null;

  const slugsQuery = colleges.map(c => c.slug).join(",");

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-slide-up">
      <div className="overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl shadow-slate-200/20 dark:shadow-black/40">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-blue-50 text-blue-600 rounded-md dark:bg-blue-950/40 dark:text-blue-400">
              <GitCompare className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Compare Colleges ({colleges.length}/3)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => clearAll()}
              className="text-xs font-semibold text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content Section */}
        {!isMinimized && (
          <div className="p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            {/* List of Selected Colleges */}
            <div className="flex flex-wrap items-center gap-2.5 flex-grow">
              {colleges.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg dark:bg-slate-800 dark:border-slate-700/50"
                >
                  <img
                    src={c.logoUrl || `https://picsum.photos/seed/${c.slug}_logo/50/50`}
                    alt={c.name}
                    className="w-5 h-5 rounded-md object-cover"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 line-clamp-1 max-w-[120px]">
                    {c.name.replace(/(Indian Institute of Technology |National Institute of Technology |All India Institute of Medical Sciences |Indian Institute of Management )/g, "")}
                  </span>
                  <button
                    onClick={() => removeCollege(c.slug)}
                    className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {colleges.length < 3 && (
                <div className="text-2xs font-semibold text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg flex items-center justify-center">
                  + Add {3 - colleges.length} more
                </div>
              )}
            </div>

            {/* Compare Action Button */}
            <div className="shrink-0">
              {colleges.length >= 2 ? (
                <Link
                  href={`/compare?colleges=${slugsQuery}`}
                  className="inline-flex items-center justify-center px-4.5 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all w-full text-center"
                >
                  Compare Now
                </Link>
              ) : (
                <button
                  disabled
                  className="px-4.5 py-2.5 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-800 dark:text-slate-500 rounded-xl cursor-not-allowed w-full"
                >
                  Select 2+ Colleges
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
