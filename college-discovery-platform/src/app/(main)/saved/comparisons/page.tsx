"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { GitCompare, Trash2, ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface SavedComparison {
  id: string;
  name: string;
  collegeSlugs: string[];
  createdAt: string;
}

export default function SavedComparisonsPage() {
  const { data: session, status: authStatus } = useSession();
  const queryClient = useQueryClient();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: comparisons = [], isLoading, isError } = useQuery<SavedComparison[]>({
    queryKey: ["saved-comparisons"],
    queryFn: async () => {
      const res = await fetch("/api/saved/comparisons");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load comparisons");
      return json.data;
    },
    enabled: !!session,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/saved/comparisons/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        showToast("Comparison deleted successfully! 🗑️");
        queryClient.invalidateQueries({ queryKey: ["saved-comparisons"] });
      } else {
        showToast(data.error || "Failed to delete comparison");
      }
    },
    onError: () => {
      showToast("An error occurred. Please try again.");
    },
  });

  if (authStatus === "loading" || (session && isLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-650 mb-3" />
        <span className="text-sm font-semibold">Loading saved comparisons...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[70vh] relative">
      
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 bg-slate-900/90 text-white rounded-xl shadow-lg border border-slate-800 text-xs font-semibold animate-slide-in backdrop-blur-sm">
          {toastMessage}
        </div>
      )}

      <div className="flex items-center gap-2 mb-8">
        <GitCompare className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Saved Comparisons</h1>
      </div>

      {comparisons.length > 0 ? (
        <div className="space-y-4">
          {comparisons.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/80 hover:border-blue-500/20 rounded-xl p-5 dark:bg-slate-900 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-4"
            >
              <div>
                <h3 className="text-sm font-black text-slate-850 dark:text-white leading-snug">
                  {item.name}
                </h3>
                <p className="text-3xs text-slate-400 mt-1 font-medium">
                  {item.collegeSlugs.length} colleges compared • Saved on{" "}
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/compare?colleges=${item.collegeSlugs.join(",")}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-650 rounded-lg dark:bg-blue-950/40 dark:text-blue-400 transition-colors"
                >
                  View Set <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this comparison set?")) {
                      deleteMutation.mutate(item.id);
                    }
                  }}
                  className="p-2 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-655 hover:bg-red-50 dark:border-slate-800 dark:hover:border-red-950/20 rounded-lg transition-colors"
                  title="Delete Comparison"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-md mx-auto text-center py-20 space-y-4">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 dark:bg-slate-900 mx-auto">
            <GitCompare className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Saved Comparisons</h2>
          <p className="text-xs text-slate-400">Select colleges and hit 'Save Set' to save your comparisons here.</p>
          <Link href="/" className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl transition-all shadow-sm">
            Compare Colleges <Sparkles className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
