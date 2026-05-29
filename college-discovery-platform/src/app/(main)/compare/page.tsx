"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthModalStore } from "@/stores/useAuthModalStore";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { 
  GitCompare, Trash2, Share2, Heart, Award, IndianRupee, 
  TrendingUp, MessageSquare, ShieldCheck, MapPin, Sparkles, Loader2, ArrowLeft, Star
} from "lucide-react";
import { cn, formatRating, formatCurrency, getOwnershipLabel } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";

interface Course {
  id: string;
  name: string;
  stream: string;
  duration: string;
  fees: number;
  eligibility: string;
}

interface Placement {
  id: string;
  highestPackage: number;
  averagePackage: number;
  medianPackage: number;
  placementRate: number;
  topRecruiters: string[];
}

interface College {
  id: string;
  name: string;
  slug: string;
  location: string;
  city: string;
  state: string;
  ownership: "GOVERNMENT" | "PRIVATE" | "DEEMED" | "AUTONOMOUS";
  accreditation: string | null;
  rating: number;
  reviewCount: number;
  feesMin: number;
  feesMax: number;
  logoUrl: string | null;
  established: number | null;
  courses: Course[];
  placements: Placement | null;
  isSaved: boolean;
}

import { Suspense } from "react";

function ComparePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { openLogin } = useAuthModalStore();
  const queryClient = useQueryClient();

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSavingComparison, setIsSavingComparison] = useState(false);

  // Read colleges from query param "colleges" (comma-separated list of slugs)
  const collegesQuery = searchParams.get("colleges") || "";
  const slugsList = collegesQuery.split(",").map(s => s.trim()).filter(Boolean);

  // Fetch comparison data
  const { data: colleges = [], isLoading, isError, refetch } = useQuery<College[]>({
    queryKey: ["compare-colleges", collegesQuery],
    queryFn: async () => {
      if (slugsList.length === 0) return [];
      const res = await fetch(`/api/compare?slugs=${collegesQuery}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load comparison data");
      return json.data;
    },
    enabled: slugsList.length >= 2,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Copy shareable link
  const handleShare = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    showToast("Shareable link copied to clipboard! 📋");
  };

  // Save comparison profile to database
  const handleSaveComparison = async () => {
    if (!session) {
      openLogin();
      return;
    }

    setIsSavingComparison(true);
    try {
      const res = await fetch("/api/saved/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collegeSlugs: slugsList }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Comparison saved successfully! ⭐");
        queryClient.invalidateQueries({ queryKey: ["saved-comparisons"] });
      } else {
        showToast(data.error || "Failed to save comparison");
      }
    } catch (error) {
      console.error(error);
      showToast("An error occurred. Please try again.");
    } finally {
      setIsSavingComparison(false);
    }
  };

  // Remove a college from query string
  const handleRemoveCollege = (slugToRemove: string) => {
    const updatedSlugs = slugsList.filter(s => s !== slugToRemove);
    if (updatedSlugs.length < 2) {
      // Direct back to home if count goes below 2
      router.push("/");
    } else {
      router.push(`/compare?colleges=${updatedSlugs.join(",")}`);
    }
  };

  if (slugsList.length < 2) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 dark:bg-slate-900 mx-auto">
          <GitCompare className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Comparison Bucket Empty</h2>
        <p className="text-xs text-slate-400">Select at least 2 colleges from the listing page to compare them side-by-side.</p>
        <Link href="/" className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl transition-all shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Go Discover Colleges
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-650 mb-3" />
        <span className="text-sm font-semibold">Comparing selected colleges...</span>
      </div>
    );
  }

  if (isError || colleges.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-lg font-bold text-red-500">Failed to load comparison</h2>
        <p className="text-xs text-slate-400">Please make sure the college slugs in your URL are valid.</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-lg">
          Try Again
        </button>
      </div>
    );
  }

  // Row Highlights Calculations
  const ratings = colleges.map(c => c.rating);
  const maxRating = Math.max(...ratings);
  const minRating = Math.min(...ratings);

  const avgPkgs = colleges.map(c => c.placements?.averagePackage || 0);
  const maxAvgPkg = Math.max(...avgPkgs);
  const minAvgPkg = Math.min(...avgPkgs);

  const highPkgs = colleges.map(c => c.placements?.highestPackage || 0);
  const maxHighPkg = Math.max(...highPkgs);
  const minHighPkg = Math.min(...highPkgs);

  const rates = colleges.map(c => c.placements?.placementRate || 0);
  const maxRate = Math.max(...rates);
  const minRate = Math.min(...rates);

  const minFees = colleges.map(c => c.feesMin);
  const lowestMinFee = Math.min(...minFees);
  const highestMinFee = Math.max(...minFees);

  const getHighlightClass = (val: number, max: number, min: number, order: "asc" | "desc") => {
    if (max === min) return "";
    if (order === "desc") {
      if (val === max) return "bg-green-50/70 text-green-800 dark:bg-green-950/20 dark:text-green-400 border border-green-150/40";
      if (val === min) return "bg-red-50/70 text-red-800 dark:bg-red-950/20 dark:text-red-450 border border-red-150/40";
    } else {
      if (val === min) return "bg-green-50/70 text-green-800 dark:bg-green-950/20 dark:text-green-400 border border-green-150/40";
      if (val === max) return "bg-red-50/70 text-red-800 dark:bg-red-950/20 dark:text-red-450 border border-red-150/40";
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 relative">
      
      {/* Toast Notice */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 px-4 py-3 bg-slate-900/90 text-white rounded-xl shadow-lg border border-slate-800 text-xs font-semibold animate-slide-in backdrop-blur-sm">
          {toastMessage}
        </div>
      )}

      {/* Top Banner section */}
      <div className="bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800/80 py-8 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <GitCompare className="w-6 h-6 text-blue-600" />
              Side-by-Side Comparison
            </h1>
            <p className="text-xs text-slate-400 mt-1">Make direct comparisons to analyze values, fees, course options, and placements.</p>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={handleShare}
              className="flex-grow md:flex-grow-0 inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 border border-slate-250 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 dark:bg-slate-850 dark:border-slate-750 dark:text-slate-355 rounded-xl transition-all"
            >
              <Share2 className="w-4 h-4 text-slate-450" />
              Share Matrix
            </button>
            <button
              onClick={handleSaveComparison}
              disabled={isSavingComparison}
              className="flex-grow md:flex-grow-0 inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {isSavingComparison ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />}
              Save Set
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Grid Matrix */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="overflow-hidden bg-white border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-x-auto custom-scrollbar">
          
          <table className="w-full border-collapse text-left min-w-[700px]">
            <thead>
              
              {/* Sticky Columns Header row */}
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                <th className="py-6 px-6 font-black text-slate-400 text-xs uppercase tracking-wider w-1/4">
                  Comparison Matrix
                </th>
                
                {colleges.map((c) => (
                  <th key={c.id} className="py-6 px-6 relative w-1/3 group">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white border p-1 rounded-xl shrink-0 flex items-center justify-center shadow-xs">
                        <img src={c.logoUrl || `https://picsum.photos/seed/${c.slug}_logo/100/100`} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className="pr-6">
                        <h3 className="text-sm font-black text-slate-850 dark:text-white line-clamp-2 leading-tight">
                          {c.name}
                        </h3>
                        <p className="text-3xs text-slate-400 mt-1 font-medium">{c.city}, {c.state}</p>
                      </div>
                    </div>

                    {/* Column Delete Button */}
                    <button
                      onClick={() => handleRemoveCollege(c.slug)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-650 dark:bg-slate-800 dark:hover:bg-red-950/40 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove from comparison"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-xs">

              {/* SECTION: BASIC INFO */}
              <tr className="bg-slate-50/40 dark:bg-slate-950/10 border-b border-slate-150 dark:border-slate-800">
                <td colSpan={colleges.length + 1} className="py-3 px-6 font-bold text-slate-400 uppercase tracking-wider text-2xs">
                  Basic Info
                </td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-850">
                <td className="py-4.5 px-6 font-bold text-slate-500 dark:text-slate-400">Ownership</td>
                {colleges.map(c => (
                  <td key={c.id} className="py-4.5 px-6 font-semibold text-slate-800 dark:text-slate-200">
                    {getOwnershipLabel(c.ownership)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-850">
                <td className="py-4.5 px-6 font-bold text-slate-500 dark:text-slate-400">Established</td>
                {colleges.map(c => (
                  <td key={c.id} className="py-4.5 px-6 font-semibold text-slate-800 dark:text-slate-200">
                    {c.established || "N/A"}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-850">
                <td className="py-4.5 px-6 font-bold text-slate-500 dark:text-slate-400">Accreditation</td>
                {colleges.map(c => (
                  <td key={c.id} className="py-4.5 px-6 font-semibold text-slate-800 dark:text-slate-200">
                    {c.accreditation ? (
                      <span className="inline-flex items-center gap-1 text-2xs px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-md dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                        <Award className="w-3.5 h-3.5" />
                        {c.accreditation}
                      </span>
                    ) : "N/A"}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-850">
                <td className="py-4.5 px-6 font-bold text-slate-500 dark:text-slate-400">Rating</td>
                {colleges.map(c => (
                  <td
                    key={c.id}
                    className={cn(
                      "py-4.5 px-6 font-bold",
                      getHighlightClass(c.rating, maxRating, minRating, "desc")
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500 shrink-0" />
                      <span>{formatRating(c.rating)}</span>
                      <span className="text-3xs text-slate-400">({c.reviewCount})</span>
                    </div>
                  </td>
                ))}
              </tr>

              {/* SECTION: FEES */}
              <tr className="bg-slate-50/40 dark:bg-slate-950/10 border-b border-slate-150 dark:border-slate-800">
                <td colSpan={colleges.length + 1} className="py-3 px-6 font-bold text-slate-400 uppercase tracking-wider text-2xs">
                  Annual Fees
                </td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-850">
                <td className="py-4.5 px-6 font-bold text-slate-500 dark:text-slate-400">Minimum Annual Fee</td>
                {colleges.map(c => (
                  <td
                    key={c.id}
                    className={cn(
                      "py-4.5 px-6 font-bold",
                      getHighlightClass(c.feesMin, highestMinFee, lowestMinFee, "asc")
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>{formatCurrency(c.feesMin)}</span>
                    </div>
                  </td>
                ))}
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-850">
                <td className="py-4.5 px-6 font-bold text-slate-500 dark:text-slate-400">Fees Range Indicator</td>
                {colleges.map(c => {
                  const percent = Math.min(((c.feesMax - c.feesMin) / 2500000) * 100 + 10, 100);
                  return (
                    <td key={c.id} className="py-4.5 px-6">
                      <div className="w-full max-w-[160px] space-y-1.5">
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                        <div className="text-3xs text-slate-400 font-medium">
                          {formatCurrency(c.feesMin)} to {formatCurrency(c.feesMax)}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* SECTION: PLACEMENTS */}
              <tr className="bg-slate-50/40 dark:bg-slate-950/10 border-b border-slate-150 dark:border-slate-800">
                <td colSpan={colleges.length + 1} className="py-3 px-6 font-bold text-slate-400 uppercase tracking-wider text-2xs">
                  Placement Packages
                </td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-850">
                <td className="py-4.5 px-6 font-bold text-slate-500 dark:text-slate-400">Highest Package Offer</td>
                {colleges.map(c => {
                  const val = c.placements?.highestPackage || 0;
                  return (
                    <td
                      key={c.id}
                      className={cn(
                        "py-4.5 px-6 font-bold",
                        val > 0 ? getHighlightClass(val, maxHighPkg, minHighPkg, "desc") : ""
                      )}
                    >
                      {val > 0 ? (
                        <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{formatCurrency(val)}</span>
                        </div>
                      ) : "N/A"}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-850">
                <td className="py-4.5 px-6 font-bold text-slate-500 dark:text-slate-400">Average Package Offer</td>
                {colleges.map(c => {
                  const val = c.placements?.averagePackage || 0;
                  return (
                    <td
                      key={c.id}
                      className={cn(
                        "py-4.5 px-6 font-bold",
                        val > 0 ? getHighlightClass(val, maxAvgPkg, minAvgPkg, "desc") : ""
                      )}
                    >
                      {val > 0 ? (
                        <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{formatCurrency(val)}</span>
                        </div>
                      ) : "N/A"}
                    </td>
                  );
                })}
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-850">
                <td className="py-4.5 px-6 font-bold text-slate-500 dark:text-slate-400">Placement Rate %</td>
                {colleges.map(c => {
                  const val = c.placements?.placementRate || 0;
                  return (
                    <td
                      key={c.id}
                      className={cn(
                        "py-4.5 px-6 font-bold",
                        val > 0 ? getHighlightClass(val, maxRate, minRate, "desc") : ""
                      )}
                    >
                      {val > 0 ? (
                        <div className="w-full max-w-[160px] space-y-1.5">
                          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${val}%` }} />
                          </div>
                          <span className="text-3xs font-semibold text-slate-400">{val}% of batch placed</span>
                        </div>
                      ) : "N/A"}
                    </td>
                  );
                })}
              </tr>

              {/* SECTION: POPULAR COURSES */}
              <tr className="bg-slate-50/40 dark:bg-slate-950/10 border-b border-slate-150 dark:border-slate-800">
                <td colSpan={colleges.length + 1} className="py-3 px-6 font-bold text-slate-400 uppercase tracking-wider text-2xs">
                  Popular Course Tags
                </td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-850">
                <td className="py-4.5 px-6 font-bold text-slate-500 dark:text-slate-400">Key Programs</td>
                {colleges.map(c => (
                  <td key={c.id} className="py-4.5 px-6">
                    <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                      {c.courses?.slice(0, 4).map(course => (
                        <span
                          key={course.id}
                          className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md dark:bg-slate-800 dark:border-slate-700/60 font-semibold text-slate-650 dark:text-slate-300"
                        >
                          {course.name.replace(/(B\.Tech in |B\.E\. in |B\.A\. \(Hons\) in |B\.Sc\. \(Hons\) in |PGP in )/g, "")}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
          
        </div>
      </div>
      
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>}>
      <ComparePageContent />
    </Suspense>
  );
}
