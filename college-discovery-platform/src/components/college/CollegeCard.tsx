"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { useAuthModalStore } from "@/stores/useAuthModalStore";
import { Heart, Star, School, MapPin, IndianRupee, BookOpen, Layers } from "lucide-react";
import { useState } from "react";
import { cn, formatRating, formatFeeRange, getOwnershipColor, getOwnershipLabel } from "@/lib/utils";
import type { College } from "@/types";

interface CollegeCardProps {
  college: College;
}

export default function CollegeCard({ college }: CollegeCardProps) {
  const { data: session } = useSession();
  const { openLogin } = useAuthModalStore();
  const { addCollege, removeCollege, isInComparison, colleges: comparedColleges } = useComparisonStore();
  
  const [isSaved, setIsSaved] = useState(college.isSaved || false);
  const [isSaving, setIsSaving] = useState(false);

  const isCompared = isInComparison(college.slug);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session) {
      openLogin();
      return;
    }

    setIsSaving(true);
    // Optimistic Update
    setIsSaved(!isSaved);

    try {
      const res = await fetch("/api/saved/colleges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collegeId: college.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rollback on error
        setIsSaved(isSaved);
      }
    } catch (error) {
      console.error("Save college error:", error);
      setIsSaved(isSaved);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompareToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      if (comparedColleges.length >= 3) {
        alert("You can compare a maximum of 3 colleges at once.");
        e.target.checked = false;
        return;
      }
      addCollege(college);
    } else {
      removeCollege(college.slug);
    }
  };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden bg-white border border-slate-200/80 hover:border-blue-500/30 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 dark:bg-slate-900 dark:border-slate-800/80 dark:hover:border-blue-500/40">
      
      {/* Top Image & Saved Overlay */}
      <div className="relative aspect-[16/9] w-full bg-slate-100 overflow-hidden dark:bg-slate-800">
        <img
          src={college.images?.[0] || `https://picsum.photos/seed/${college.slug}/600/400`}
          alt={college.name}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        
        {/* Heart Icon Toggle */}
        <button
          onClick={handleSaveToggle}
          disabled={isSaving}
          className="absolute right-3.5 top-3.5 p-2 bg-white/90 backdrop-blur-sm rounded-full text-slate-500 hover:text-red-500 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:text-red-500 shadow-sm hover:scale-110 active:scale-95 transition-all"
          title="Save college"
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isSaved ? "fill-red-500 text-red-500" : ""
            )}
          />
        </button>

        {/* Ownership Badge */}
        <span
          className={cn(
            "absolute left-3.5 top-3.5 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-md border shadow-sm",
            getOwnershipColor(college.ownership)
          )}
        >
          {getOwnershipLabel(college.ownership)}
        </span>
      </div>

      {/* Card Content */}
      <div className="flex-grow p-5 flex flex-col justify-between">
        <div>
          {/* Rating */}
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="flex items-center gap-0.5 text-amber-500">
              <Star className="w-4.5 h-4.5 fill-current" />
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {formatRating(college.rating)}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              ({college.reviewCount} {college.reviewCount === 1 ? "Review" : "Reviews"})
            </span>
            {college.established && (
              <>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  Est. {college.established}
                </span>
              </>
            )}
          </div>

          {/* Name & Slug Link */}
          <Link href={`/college/${college.slug}`} className="block group/link">
            <h3 
              className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover/link:text-blue-600 dark:group-hover/link:text-blue-400 transition-colors"
              title={college.name}
            >
              {college.name}
            </h3>
          </Link>

          {/* Location details */}
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="line-clamp-1">{college.city}, {college.state}</span>
          </div>

          {/* Fee details */}
          <div className="flex items-center gap-1.5 mt-3 text-sm font-semibold text-slate-800 dark:text-slate-300">
            <IndianRupee className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{formatFeeRange(college.feesMin, college.feesMax)}</span>
          </div>

          {/* Courses preview */}
          {college.courses && college.courses.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>POPULAR COURSES</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {college.courses.slice(0, 3).map((c) => (
                  <span
                    key={c.id}
                    className="px-2 py-0.5 text-xs font-medium bg-slate-50 text-slate-600 border border-slate-100 rounded-md dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50"
                  >
                    {c.name.replace(/(B\.Tech in |B\.E\. in |B\.A\. \(Hons\) in |B\.Sc\. \(Hons\) in |PGP in )/g, "")}
                  </span>
                ))}
                {college.courses.length > 3 && (
                  <span className="px-1.5 py-0.5 text-2xs font-semibold text-slate-400">
                    +{college.courses.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Average package preview if available */}
          {college.placements && (
            <div className="mt-3.5 flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg dark:bg-slate-800/50 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Avg Package:</span>
              <span className="font-bold text-slate-800 dark:text-emerald-400">
                ₹{(college.placements.averagePackage / 100000).toFixed(1)} LPA
              </span>
            </div>
          )}
        </div>

        {/* Action Row */}
        <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isCompared}
              onChange={handleCompareToggle}
              className="w-4.5 h-4.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-opacity-25 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Add to Compare
            </span>
          </label>

          <Link
            href={`/college/${college.slug}`}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex items-center gap-1 group/btn"
          >
            View Details
            <span className="group-hover/btn:translate-x-0.5 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
