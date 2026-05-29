"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { useAuthModalStore } from "@/stores/useAuthModalStore";
import { 
  Star, Heart, GitCompare, Globe, Calendar, Award, BookOpen, 
  TrendingUp, MessageSquare, ChevronRight, Search, ChevronDown, 
  ChevronUp, IndianRupee, Briefcase, MapPin, Building, ArrowRight, ExternalLink, Loader2 
} from "lucide-react";
import { cn, formatRating, formatCurrency, getOwnershipColor, getOwnershipLabel } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

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

interface Review {
  id: string;
  rating: number;
  content: string;
  author: string;
  createdAt: string;
}

interface CollegeDetails {
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
  description: string | null;
  website: string | null;
  established: number | null;
  logoUrl: string | null;
  images: string[];
  courses: Course[];
  placements: Placement | null;
  reviews: Review[];
  isSaved: boolean;
  ratingDistribution: Record<string, number>;
}

export default function CollegeDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const { data: session } = useSession();
  const { openLogin } = useAuthModalStore();
  const { addCollege, removeCollege, isInComparison, colleges: comparedColleges } = useComparisonStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "courses" | "placements" | "reviews">("overview");
  const [courseSearch, setCourseSearch] = useState("");
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  
  // Reviews Pagination & Sorting State
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewSort, setReviewSort] = useState<"recent" | "rating_desc" | "rating_asc">("recent");

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Fetch College Detail Data
  const { data: college, isLoading, isError, refetch } = useQuery<CollegeDetails>({
    queryKey: ["college", slug],
    queryFn: async () => {
      const res = await fetch(`/api/colleges/${slug}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load college details");
      return json.data;
    },
  });

  // Fetch Paginated Reviews
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ["college-reviews", slug, reviewPage, reviewSort],
    queryFn: async () => {
      const res = await fetch(`/api/colleges/${slug}/reviews?page=${reviewPage}&sortBy=${reviewSort}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load reviews");
      return json.data;
    },
    enabled: activeTab === "reviews",
  });

  // Save/Unsave Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/saved/colleges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collegeId: college?.id }),
      });
      return res.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["college", slug] });
      const previousCollege = queryClient.getQueryData(["college", slug]);
      
      // Optimistic update
      queryClient.setQueryData(["college", slug], (old: any) => ({
        ...old,
        isSaved: !old.isSaved,
      }));

      return { previousCollege };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(["college", slug], context?.previousCollege);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["college", slug] });
      queryClient.invalidateQueries({ queryKey: ["saved-colleges"] });
    },
  });

  const handleSaveToggle = () => {
    if (!session) {
      openLogin();
      return;
    }
    saveMutation.mutate();
  };

  const isCompared = college ? isInComparison(college.slug) : false;

  const handleCompareToggle = () => {
    if (!college) return;
    if (isCompared) {
      removeCollege(college.slug);
    } else {
      if (comparedColleges.length >= 3) {
        alert("You can compare a maximum of 3 colleges at once.");
        return;
      }
      addCollege({
        id: college.id,
        name: college.name,
        slug: college.slug,
        location: college.location,
        city: college.city,
        state: college.state,
        ownership: college.ownership,
        accreditation: college.accreditation,
        rating: college.rating,
        reviewCount: college.reviewCount,
        feesMin: college.feesMin,
        feesMax: college.feesMax,
        description: college.description,
        website: college.website,
        established: college.established,
        logoUrl: college.logoUrl,
        images: college.images,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <span className="text-sm font-semibold">Loading college details...</span>
      </div>
    );
  }

  if (isError || !college) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-red-500">Failed to load college details</h2>
        <p className="text-xs text-slate-400 mt-2">The college might not exist or there was a database error.</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Filter courses based on inner search
  const filteredCourses = college.courses?.filter(c => 
    c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.stream.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.eligibility.toLowerCase().includes(courseSearch.toLowerCase())
  ) || [];

  // Recharts Chart Data Preparation (Placement Salary Packages distribution)
  const avgPkg = college.placements?.averagePackage || 0;
  const highPkg = college.placements?.highestPackage || 0;
  
  const chartData = [
    { name: "0-5LPA", students: avgPkg < 500000 ? 65 : 20, fill: "#3B82F6" },
    { name: "5-10LPA", students: avgPkg >= 500000 && avgPkg < 1000000 ? 55 : (avgPkg < 500000 ? 25 : 35), fill: "#10B981" },
    { name: "10-15LPA", students: avgPkg >= 1000000 && avgPkg < 1800000 ? 60 : (avgPkg < 1000000 ? 8 : 28), fill: "#F59E0B" },
    { name: "15LPA+", students: highPkg >= 1500000 ? (avgPkg >= 1800000 ? 65 : 25) : 0, fill: "#EF4444" }
  ];

  // Rating breakdown stats list
  const ratingDistArray = Object.entries(college.ratingDistribution)
    .map(([stars, count]) => ({
      stars: parseInt(stars),
      count,
      percent: college.reviewCount > 0 ? (count / college.reviewCount) * 100 : 0
    }))
    .sort((a, b) => b.stars - a.stars);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* Premium Hero Header Section */}
      <div className="relative py-12 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white overflow-hidden border-b border-slate-800">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:30px_30px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            
            {/* College Identity */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-2 rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                <img
                  src={college.logoUrl || `https://picsum.photos/seed/${college.slug}_logo/150/150`}
                  alt={college.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("px-2.5 py-0.5 text-3xs font-bold uppercase tracking-wider rounded-md border", getOwnershipColor(college.ownership))}>
                    {getOwnershipLabel(college.ownership)}
                  </span>
                  {college.accreditation && (
                    <span className="px-2.5 py-0.5 text-3xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-550/20 rounded-md">
                      {college.accreditation}
                    </span>
                  )}
                </div>
                
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black mt-2 leading-tight">
                  {college.name}
                </h1>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {college.location}, {college.city}, {college.state}
                  </span>
                  {college.established && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Established {college.established}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Ratings and Quick Action Buttons */}
            <div className="flex flex-row md:flex-col items-start md:items-end justify-between w-full md:w-auto gap-4 pt-4 md:pt-0 border-t border-slate-800 md:border-t-0">
              
              {/* Rating representation */}
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center bg-emerald-500 text-white font-black text-lg px-3 py-1.5 rounded-xl shadow-sm shadow-emerald-500/20">
                  {formatRating(college.rating)}
                  <Star className="w-4 h-4 fill-current ml-1" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-200">Verified Rating</div>
                  <div className="text-3xs text-slate-400 mt-0.5">Based on {college.reviewCount} reviews</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleSaveToggle}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border transition-all active:scale-95",
                    college.isSaved
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-650/20"
                      : "bg-white/10 border-white/10 text-white hover:bg-white/20"
                  )}
                >
                  <Heart className={cn("w-4 h-4", college.isSaved ? "fill-current" : "")} />
                  {college.isSaved ? "Saved" : "Save"}
                </button>

                <button
                  onClick={handleCompareToggle}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border transition-all active:scale-95",
                    isCompared
                      ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-650/20"
                      : "bg-white/10 border-white/10 text-white hover:bg-white/20"
                  )}
                >
                  <GitCompare className="w-4 h-4" />
                  {isCompared ? "In Compare" : "Compare"}
                </button>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* Sticky Tab Navigation Menu */}
      <div className="sticky top-16 z-30 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto no-scrollbar">
            {[
              { id: "overview", label: "Overview", icon: Building },
              { id: "courses", label: "Courses", icon: BookOpen },
              { id: "placements", label: "Placements", icon: TrendingUp },
              { id: "reviews", label: "Reviews", icon: MessageSquare }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  // Reset scroll state if needed
                }}
                className={cn(
                  "flex items-center gap-2 py-4 px-1 text-sm font-bold border-b-2 whitespace-nowrap transition-all duration-200",
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-350 dark:text-slate-400 dark:hover:text-white"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Content column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* College Gallery Carousel */}
              {college.images && college.images.length > 0 && (
                <div className="bg-white border rounded-2xl p-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide">
                    Campus Gallery
                  </h3>
                  
                  <div className="relative aspect-[16/9] w-full bg-slate-100 rounded-xl overflow-hidden dark:bg-slate-800">
                    <img
                      src={college.images[activeImageIndex]}
                      alt="College Campus"
                      className="w-full h-full object-cover animate-fade-in"
                    />
                  </div>

                  <div className="flex gap-2.5 mt-3.5 overflow-x-auto no-scrollbar">
                    {college.images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImageIndex(i)}
                        className={cn(
                          "relative aspect-[16/9] w-20 rounded-lg overflow-hidden shrink-0 border-2 transition-all",
                          activeImageIndex === i ? "border-blue-600 scale-95" : "border-transparent opacity-70 hover:opacity-100"
                        )}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="bg-white border rounded-2xl p-6 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3.5 uppercase tracking-wide">
                  About College
                </h3>
                
                <div className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed space-y-4">
                  {college.description ? (
                    <div>
                      <p>
                        {descriptionExpanded || college.description.length <= 300
                          ? college.description
                          : `${college.description.slice(0, 300)}...`}
                      </p>
                      {college.description.length > 300 && (
                        <button
                          onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-350 mt-3.5 flex items-center gap-1"
                        >
                          {descriptionExpanded ? (
                            <>Show Less <ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <>Read Full Description <ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400">No description available for this college.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Right Information stats sidebar */}
            <div className="space-y-6">
              
              {/* Key Highlights Grid */}
              <div className="bg-white border rounded-2xl p-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide">
                  Key Statistics
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-850/50 rounded-xl">
                    <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Courses</span>
                    <div className="text-lg font-black text-slate-800 dark:text-white mt-1">
                      {college.courses?.length || 0}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-850/50 rounded-xl">
                    <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Avg Package</span>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {college.placements ? `₹${(college.placements.averagePackage / 100000).toFixed(1)}L` : "N/A"}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-850/50 rounded-xl">
                    <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Placement %</span>
                    <div className="text-lg font-black text-blue-650 dark:text-blue-400 mt-1">
                      {college.placements ? `${college.placements.placementRate}%` : "N/A"}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-850/50 rounded-xl">
                    <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">Est. Year</span>
                    <div className="text-lg font-black text-slate-850 dark:text-white mt-1">
                      {college.established || "N/A"}
                    </div>
                  </div>
                </div>

                {college.website && (
                  <a
                    href={college.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full mt-5 py-2.5 border border-slate-200 hover:border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-bold text-slate-700 dark:text-slate-355 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Globe className="w-4 h-4" />
                    Visit Official Website
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

            </div>

          </div>
        )}

        {/* COURSES TAB */}
        {activeTab === "courses" && (
          <div className="bg-white border rounded-2xl p-6 dark:bg-slate-900 dark:border-slate-800 shadow-sm space-y-6">
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Offered Courses ({filteredCourses.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Explore fees, eligibility, and duration for each degree.</p>
              </div>

              {/* Inner courses search */}
              <div className="relative max-w-sm w-full">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Search course title or stream..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-750 dark:text-white"
                />
              </div>
            </div>

            {/* Courses Table */}
            {filteredCourses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Course Details</th>
                      <th className="py-3 px-4">Stream</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Annual Fees</th>
                      <th className="py-3 px-4">Eligibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCourses.map((c) => {
                      const isExpanded = expandedCourseId === c.id;
                      return (
                        <>
                          <tr
                            key={c.id}
                            onClick={() => setExpandedCourseId(isExpanded ? null : c.id)}
                            className="border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-850 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                          >
                            <td className="py-4 px-4 font-bold text-slate-850 dark:text-white flex items-center gap-2">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                              {c.name}
                            </td>
                            <td className="py-4 px-4 font-medium text-slate-550 dark:text-slate-400">
                              {c.stream}
                            </td>
                            <td className="py-4 px-4 font-medium text-slate-550 dark:text-slate-400">
                              {c.duration}
                            </td>
                            <td className="py-4 px-4 font-bold text-slate-800 dark:text-emerald-400">
                              {formatCurrency(c.fees)}
                            </td>
                            <td className="py-4 px-4 font-semibold text-slate-700 dark:text-slate-300">
                              {c.eligibility}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50/60 dark:bg-slate-900/50">
                              <td colSpan={5} className="py-4 px-8 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-b border-slate-100 dark:border-slate-850">
                                <h4 className="font-bold text-slate-850 dark:text-white mb-1.5">Course Overview</h4>
                                This program focuses on building comprehensive skills in {c.name.toLowerCase()} within the {c.stream.toLowerCase()} field.
                                Students are trained in both core principles and practical lab assignments over a duration of {c.duration}.
                                Admission is strictly merit-based, evaluating eligibility markers like: <strong>{c.eligibility}</strong>.
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">No courses match your query.</div>
            )}

          </div>
        )}

        {/* PLACEMENTS TAB */}
        {activeTab === "placements" && (
          <div className="space-y-6">
            
            {/* Stats Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: "Highest Package", val: college.placements ? formatCurrency(college.placements.highestPackage) : "N/A", desc: "Top student offer", color: "text-red-500 bg-red-50 dark:bg-red-950/20" },
                { label: "Average Package", val: college.placements ? formatCurrency(college.placements.averagePackage) : "N/A", desc: "Average student batch offer", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" },
                { label: "Median Package", val: college.placements ? formatCurrency(college.placements.medianPackage) : "N/A", desc: "Middle student offer", color: "text-blue-500 bg-blue-50 dark:bg-blue-950/20" },
                { label: "Placement Rate %", val: college.placements ? `${college.placements.placementRate}%` : "N/A", desc: "Total placed students ratio", color: "text-purple-500 bg-purple-50 dark:bg-purple-950/20" }
              ].map((item, idx) => (
                <div key={idx} className="bg-white border rounded-2xl p-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-3xs font-bold uppercase tracking-wider text-slate-400">{item.label}</span>
                    <div className="text-xl font-black text-slate-800 dark:text-white mt-1.5">{item.val}</div>
                    <span className="text-3xs text-slate-450 dark:text-slate-500 mt-1 block">{item.desc}</span>
                  </div>
                  <div className={cn("p-3 rounded-xl shrink-0", item.color)}>
                    <Briefcase className="w-6 h-6" />
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Recharts Packages Bar Chart */}
              <div className="lg:col-span-2 bg-white border rounded-2xl p-6 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wide">
                  Placement Salary Distribution (% of Students)
                </h3>
                
                <div className="h-64 w-full">
                  {college.placements ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: "transparent" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-850 text-xs">
                                  <p className="font-bold">{payload[0].name}</p>
                                  <p className="mt-1 text-blue-450 font-semibold">{payload[0].value}% of students</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="students" radius={[6, 6, 0, 0]} barSize={44}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400">No placements data available</div>
                  )}
                </div>
              </div>

              {/* Top Recruiters */}
              <div className="bg-white border rounded-2xl p-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide">
                  Top Recruiters
                </h3>
                {college.placements?.topRecruiters && college.placements.topRecruiters.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3.5">
                    {college.placements.topRecruiters.map((rec, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-center p-4 border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900 rounded-xl text-center text-xs font-bold text-slate-700 dark:text-slate-300"
                      >
                        {rec}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">No recruiter data listed.</div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* REVIEWS TAB */}
        {activeTab === "reviews" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            
            {/* Reviews metrics sidebar */}
            <div className="space-y-6">
              <div className="bg-white border rounded-2xl p-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wide">
                  Review Breakdown
                </h3>
                
                {/* Large score display */}
                <div className="flex items-center gap-3.5 pb-5 border-b border-slate-100 dark:border-slate-850">
                  <span className="text-4xl font-black text-slate-800 dark:text-white">
                    {formatRating(college.rating)}
                  </span>
                  <div className="text-left">
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "w-4 h-4",
                            i < Math.round(college.rating) ? "fill-current" : ""
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-2xs text-slate-400 mt-1 block">Based on {college.reviewCount} total reviews</span>
                  </div>
                </div>

                {/* Star histogram */}
                <div className="mt-5 space-y-3">
                  {ratingDistArray.map((row) => (
                    <div key={row.stars} className="flex items-center gap-3.5 text-xs text-slate-550 dark:text-slate-400">
                      <span className="w-3 font-semibold shrink-0">{row.stars}</span>
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                      <div className="flex-grow h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                      <span className="w-6 text-right font-medium shrink-0">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Reviews feed column */}
            <div className="lg:col-span-2 space-y-5">
              
              {/* Sort header controls */}
              <div className="bg-white border rounded-2xl px-5 py-3.5 dark:bg-slate-900 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 flex-wrap">
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Student Feed
                </span>
                
                <div className="flex items-center gap-2">
                  <span className="text-3xs uppercase tracking-wider text-slate-400 font-bold">Sort:</span>
                  <select
                    value={reviewSort}
                    onChange={(e) => {
                      setReviewSort(e.target.value as any);
                      setReviewPage(1);
                    }}
                    className="text-xs font-bold border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 dark:bg-slate-850 dark:border-slate-750 dark:text-slate-300"
                  >
                    <option value="recent">Most Recent</option>
                    <option value="rating_desc">Highest Rated</option>
                    <option value="rating_asc">Lowest Rated</option>
                  </select>
                </div>
              </div>

              {/* Reviews Cards Feed */}
              {reviewsLoading ? (
                <div className="flex items-center justify-center py-10 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Fetching reviews...
                </div>
              ) : reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviewsData.reviews.map((rev: Review) => (
                    <div
                      key={rev.id}
                      className="bg-white border rounded-2xl p-5 dark:bg-slate-900 dark:border-slate-800 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 font-bold rounded-full flex items-center justify-center text-xs dark:bg-slate-800 dark:text-blue-400">
                            {rev.author.split(" ").map(w => w[0]).join("").toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-white">{rev.author}</div>
                            <div className="text-4xs text-slate-400 mt-0.5">
                              {new Date(rev.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                            </div>
                          </div>
                        </div>

                        {/* Rating stars display */}
                        <div className="flex items-center gap-0.5 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg">
                          <span className="text-xs font-black mr-1">{rev.rating}</span>
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </div>

                      <p className="text-xs text-slate-650 dark:text-slate-350 leading-relaxed">
                        {rev.content}
                      </p>
                    </div>
                  ))}

                  {/* Pagination control footer */}
                  {reviewsData.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-5">
                      <button
                        onClick={() => setReviewPage(prev => Math.max(prev - 1, 1))}
                        disabled={reviewPage === 1}
                        className="px-3.5 py-2 border border-slate-200 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-slate-400">
                        Page <strong>{reviewPage}</strong> of <strong>{reviewsData.totalPages}</strong>
                      </span>
                      <button
                        onClick={() => setReviewPage(prev => Math.min(prev + 1, reviewsData.totalPages))}
                        disabled={reviewPage === reviewsData.totalPages}
                        className="px-3.5 py-2 border border-slate-200 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}

                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 bg-white border border-dashed rounded-2xl">
                  No student reviews have been posted yet.
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
