"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import CollegeCard from "@/components/college/CollegeCard";
import { Heart, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function SavedCollegesPage() {
  const { data: session, status: authStatus } = useSession();

  const { data: colleges = [], isLoading, isError } = useQuery({
    queryKey: ["saved-colleges"],
    queryFn: async () => {
      const res = await fetch("/api/saved/colleges");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load saved colleges");
      return json.data;
    },
    enabled: !!session,
  });

  if (authStatus === "loading" || (session && isLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-650 mb-3" />
        <span className="text-sm font-semibold">Loading saved colleges...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[70vh]">
      <div className="flex items-center gap-2 mb-8">
        <Heart className="w-6 h-6 text-red-500 fill-red-500" />
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Your Saved Colleges</h1>
      </div>

      {colleges.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {colleges.map((college: any) => (
            <CollegeCard key={college.id} college={college} />
          ))}
        </div>
      ) : (
        <div className="max-w-md mx-auto text-center py-20 space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 dark:bg-slate-900 mx-auto">
            <Heart className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Saved Colleges</h2>
          <p className="text-xs text-slate-400">Explore colleges and click the heart icon on any card to save it here.</p>
          <Link href="/" className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl transition-all shadow-sm">
            Browse Colleges <Sparkles className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
