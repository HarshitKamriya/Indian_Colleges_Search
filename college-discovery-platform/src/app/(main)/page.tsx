"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import SearchBar from "@/components/search/SearchBar";
import CollegeCard from "@/components/college/CollegeCard";
import { SlidersHorizontal, ArrowUpDown, ChevronDown, ChevronUp, Loader2, Sparkles, FilterX } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// Static filters metadata derived from seed database
const AVAILABLE_STATES = [
  "Delhi", "Maharashtra", "Tamil Nadu", "Karnataka", "West Bengal", 
  "Telangana", "Rajasthan", "Gujarat", "Uttar Pradesh", "Madhya Pradesh", 
  "Punjab", "Bihar", "Kerala", "Assam", "Jharkhand", "Odisha"
].sort();

const STATE_TO_CITIES: Record<string, string[]> = {
  "Delhi": ["New Delhi", "Delhi"],
  "Maharashtra": ["Mumbai", "Pune"],
  "Tamil Nadu": ["Chennai", "Tiruchirappalli", "Vellore", "Coimbatore"],
  "Karnataka": ["Mangaluru", "Bengaluru", "Manipal"],
  "West Bengal": ["Kharagpur", "Kolkata"],
  "Telangana": ["Warangal", "Hyderabad"],
  "Rajasthan": ["Jodhpur", "Pilani", "Jaipur"],
  "Gujarat": ["Ahmedabad"],
  "Uttar Pradesh": ["Kanpur", "Lucknow"],
  "Madhya Pradesh": ["Indore", "Bhopal"],
  "Punjab": ["Chandigarh"],
  "Bihar": ["Patna"],
  "Kerala": ["Kochi"],
  "Assam": ["Guwahati"],
  "Jharkhand": ["Ranchi"],
  "Odisha": ["Bhubaneswar"]
};

const AVAILABLE_STREAMS = ["Engineering", "Medical", "Management", "Arts", "Science"];
const AVAILABLE_OWNERSHIPS = ["GOVERNMENT", "PRIVATE", "DEEMED", "AUTONOMOUS"];
const AVAILABLE_ACCREDITATIONS = ["NAAC A++", "NAAC A+", "NAAC A", "MCI Approved", "EQUIS Accredited", "AACSB & AMBA Accredited"];
const AVAILABLE_EXAMS = [
  "JEE Advanced", "JEE Main", "GATE", "NET", "NEET UG", "AIIMS Exam", 
  "CAT", "GMAT/GRE", "BITSAT", "VITEEE", "SRMJEEE", "MET", "CUET"
].sort();

import { Suspense } from "react";

function DiscoveryPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter UI Collapsible states
  const [openSections, setOpenSections] = useState({
    location: true,
    streams: true,
    fees: true,
    rating: true,
    ownership: true,
    accreditation: false,
    exams: false,
  });

  // Local Filter state sync'd with URL search parameters
  const getArrayFromUrl = (key: string) => {
    const vals = searchParams.getAll(key);
    const valsBrackets = searchParams.getAll(`${key}[]`);
    return [...vals, ...valsBrackets].filter(Boolean);
  };

  const search = searchParams.get("search") || "";
  const minFee = parseInt(searchParams.get("minFee") || "0");
  const maxFee = parseInt(searchParams.get("maxFee") || "3500000"); // 35L per year max slider limit
  const minRating = parseFloat(searchParams.get("minRating") || "0");
  const sortBy = searchParams.get("sortBy") || "rating_desc";
  
  const selectedStates = getArrayFromUrl("states");
  const selectedCities = getArrayFromUrl("cities");
  const selectedStreams = getArrayFromUrl("streams");
  const selectedOwnerships = getArrayFromUrl("ownership");
  const selectedAccreditations = getArrayFromUrl("accreditation");
  const selectedExams = getArrayFromUrl("exams");

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  const observerTarget = useRef<HTMLDivElement>(null);

  // Sync state changes with URL query parameters
  const updateUrl = (updates: Record<string, string | string[] | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Clear cursor pagination
    params.delete("cursor");

    Object.entries(updates).forEach(([key, val]) => {
      params.delete(key);
      params.delete(`${key}[]`);
      
      if (val === null || val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) {
        return;
      }
      
      if (Array.isArray(val)) {
        val.forEach(v => params.append(`${key}[]`, v));
      } else {
        params.set(key, String(val));
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleArrayToggle = (key: string, list: string[], value: string) => {
    const newList = list.includes(value) ? list.filter(item => item !== value) : [...list, value];
    
    const updates: Record<string, string[]> = { [key]: newList };
    
    // Clear cascading cities if state removed
    if (key === "states") {
      const remainingCities = selectedCities.filter(city => {
        return newList.some(state => STATE_TO_CITIES[state]?.includes(city));
      });
      updates["cities"] = remainingCities;
    }
    
    updateUrl(updates);
  };

  const handleClearFilters = () => {
    router.push(pathname);
    setMobileFiltersOpen(false);
  };

  // Get eligible cities based on selected states
  const getEligibleCities = () => {
    if (selectedStates.length === 0) {
      return Object.values(STATE_TO_CITIES).flat().sort();
    }
    return selectedStates.flatMap(state => STATE_TO_CITIES[state] || []).sort();
  };

  // TanStack Infinite Query hook
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: [
      "colleges",
      search,
      selectedStates,
      selectedCities,
      selectedStreams,
      selectedOwnerships,
      selectedAccreditations,
      selectedExams,
      minFee,
      maxFee,
      minRating,
      sortBy,
    ],
    queryFn: async ({ pageParam = null }) => {
      const apiParams = new URLSearchParams();
      if (search) apiParams.set("search", search);
      if (minFee > 0) apiParams.set("minFee", String(minFee));
      if (maxFee < 3500000) apiParams.set("maxFee", String(maxFee));
      if (minRating > 0) apiParams.set("minRating", String(minRating));
      apiParams.set("sortBy", sortBy);
      if (pageParam) apiParams.set("cursor", String(pageParam));

      selectedStates.forEach(s => apiParams.append("states[]", s));
      selectedCities.forEach(c => apiParams.append("cities[]", c));
      selectedStreams.forEach(st => apiParams.append("streams[]", st));
      selectedOwnerships.forEach(o => apiParams.append("ownership[]", o));
      selectedAccreditations.forEach(a => apiParams.append("accreditation[]", a));
      selectedExams.forEach(e => apiParams.append("exams[]", e));

      const res = await fetch(`/api/colleges?${apiParams.toString()}`);
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || "Failed to fetch colleges");
      return json.data;
    },
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const colleges = data?.pages.flatMap(page => page.colleges) || [];
  const totalCount = data?.pages[0]?.totalCount || 0;

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const renderFilterSidebar = () => {
    return (
      <div className="space-y-5 p-5 bg-white border border-slate-200/80 rounded-2xl dark:bg-slate-900 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-850">
          <div className="flex items-center gap-2 font-bold text-slate-850 dark:text-white">
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>Filters</span>
          </div>
          <button
            onClick={handleClearFilters}
            className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <FilterX className="w-3.5 h-3.5" />
            Clear All
          </button>
        </div>

        {/* Location Section */}
        <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
          <button
            onClick={() => toggleSection("location")}
            className="flex items-center justify-between w-full font-bold text-sm text-slate-850 dark:text-white py-1"
          >
            <span>Location</span>
            {openSections.location ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {openSections.location && (
            <div className="mt-3.5 space-y-4">
              {/* States Multi-Select */}
              <div>
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400 mb-2">States</label>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
                  {AVAILABLE_STATES.map((state) => (
                    <label key={state} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedStates.includes(state)}
                        onChange={() => handleArrayToggle("states", selectedStates, state)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-350 dark:border-slate-800"
                      />
                      <span>{state}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Cities Multi-Select (Cascading) */}
              <div>
                <label className="block text-3xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Cities {selectedStates.length > 0 && `(Filtered)`}
                </label>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1.5 custom-scrollbar">
                  {getEligibleCities().map((city) => (
                    <label key={city} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedCities.includes(city)}
                        onChange={() => handleArrayToggle("cities", selectedCities, city)}
                        className="w-4 h-4 rounded text-blue-600 border-slate-350 dark:border-slate-800"
                      />
                      <span>{city}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Streams Section */}
        <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
          <button
            onClick={() => toggleSection("streams")}
            className="flex items-center justify-between w-full font-bold text-sm text-slate-850 dark:text-white py-1"
          >
            <span>Course Streams</span>
            {openSections.streams ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {openSections.streams && (
            <div className="mt-3 space-y-2">
              {AVAILABLE_STREAMS.map((stream) => (
                <label key={stream} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedStreams.includes(stream)}
                    onChange={() => handleArrayToggle("streams", selectedStreams, stream)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-355 dark:border-slate-800"
                  />
                  <span>{stream}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Fees Range Slider Section */}
        <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
          <button
            onClick={() => toggleSection("fees")}
            className="flex items-center justify-between w-full font-bold text-sm text-slate-850 dark:text-white py-1"
          >
            <span>Annual Fees</span>
            {openSections.fees ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {openSections.fees && (
            <div className="mt-3.5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="w-full">
                  <span className="text-3xs font-bold text-slate-400 uppercase">Min</span>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{formatCurrency(minFee)}</div>
                </div>
                <div className="w-full text-right">
                  <span className="text-3xs font-bold text-slate-400 uppercase">Max</span>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {maxFee >= 3500000 ? "No Limit" : formatCurrency(maxFee)}
                  </div>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="3500000"
                step="50000"
                value={maxFee}
                onChange={(e) => updateUrl({ maxFee: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          )}
        </div>

        {/* Rating Filter Section */}
        <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
          <button
            onClick={() => toggleSection("rating")}
            className="flex items-center justify-between w-full font-bold text-sm text-slate-850 dark:text-white py-1"
          >
            <span>Minimum Rating</span>
            {openSections.rating ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {openSections.rating && (
            <div className="mt-3 flex items-center justify-between gap-1.5">
              {[0, 3, 3.5, 4, 4.5].map((stars) => (
                <button
                  key={stars}
                  onClick={() => updateUrl({ minRating: stars })}
                  className={cn(
                    "flex-grow px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all",
                    minRating === stars
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-450 dark:hover:bg-slate-800"
                  )}
                >
                  {stars === 0 ? "All" : `${stars}★`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ownership Section */}
        <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
          <button
            onClick={() => toggleSection("ownership")}
            className="flex items-center justify-between w-full font-bold text-sm text-slate-850 dark:text-white py-1"
          >
            <span>Ownership</span>
            {openSections.ownership ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {openSections.ownership && (
            <div className="mt-3 space-y-2">
              {AVAILABLE_OWNERSHIPS.map((own) => (
                <label key={own} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedOwnerships.includes(own)}
                    onChange={() => handleArrayToggle("ownership", selectedOwnerships, own)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-355 dark:border-slate-800"
                  />
                  <span>{own.charAt(0) + own.slice(1).toLowerCase()}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Accreditation Section */}
        <div className="border-b border-slate-100 dark:border-slate-850 pb-4">
          <button
            onClick={() => toggleSection("accreditation")}
            className="flex items-center justify-between w-full font-bold text-sm text-slate-850 dark:text-white py-1"
          >
            <span>Accreditation</span>
            {openSections.accreditation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {openSections.accreditation && (
            <div className="mt-3 space-y-2">
              {AVAILABLE_ACCREDITATIONS.map((acc) => (
                <label key={acc} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedAccreditations.includes(acc)}
                    onChange={() => handleArrayToggle("accreditation", selectedAccreditations, acc)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-355 dark:border-slate-800"
                  />
                  <span>{acc}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Exams Section */}
        <div className="pb-1">
          <button
            onClick={() => toggleSection("exams")}
            className="flex items-center justify-between w-full font-bold text-sm text-slate-850 dark:text-white py-1"
          >
            <span>Exams Accepted</span>
            {openSections.exams ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {openSections.exams && (
            <div className="mt-3.5 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {AVAILABLE_EXAMS.map((exam) => (
                <label key={exam} className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selectedExams.includes(exam)}
                    onChange={() => handleArrayToggle("exams", selectedExams, exam)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-355 dark:border-slate-800"
                  />
                  <span>{exam}</span>
                </label>
              ))}
            </div>
          )}
        </div>

      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* Premium Hero Search Area */}
      <div className="relative py-14 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
        
        {/* Glowing orb decoration */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-400 backdrop-blur-sm animate-pulse">
            <Sparkles className="w-3.5 h-3.5" />
            Discover Colleges, Shape Your Future
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
            Find Your Ideal College
          </h1>
          <p className="mt-3 text-base text-slate-350 max-w-xl font-medium">
            Search across 39,000+ courses, compare placements, read verified student reviews, and find details instantly.
          </p>
          
          {/* Big Search Input */}
          <div className="mt-8 w-full max-w-2xl">
            <SearchBar
              initialValue={search}
              onSearch={(val) => updateUrl({ search: val })}
              placeholder="Search by college name, city, state, or course stream..."
            />
          </div>
        </div>
      </div>

      {/* Main Results Listing section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="flex flex-col lg:flex-row items-start gap-8">
          
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-72 shrink-0 sticky top-20">
            {renderFilterSidebar()}
          </aside>

          {/* Results Area */}
          <div className="flex-grow w-full">
            
            {/* Controls Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4 flex-wrap">
              <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {status === "loading" ? (
                  <span>Loading colleges...</span>
                ) : (
                  <span>
                    Showing <strong className="text-slate-900 dark:text-white">{totalCount}</strong> colleges matching filters
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                
                {/* Mobile Filter Button */}
                <button
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-250 bg-white rounded-xl text-xs font-bold text-slate-650 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters
                </button>

                {/* Sort Option Dropdown */}
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                  <select
                    value={sortBy}
                    onChange={(e) => updateUrl({ sortBy: e.target.value })}
                    className="text-xs font-bold border border-slate-250 bg-white rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300"
                  >
                    {search && <option value="relevance">Relevance</option>}
                    <option value="rating_desc">Highest Rated</option>
                    <option value="fees_asc">Fees (Low to High)</option>
                    <option value="fees_desc">Fees (High to Low)</option>
                    <option value="placement_desc">Top Placements</option>
                  </select>
                </div>

              </div>
            </div>

            {/* Error State */}
            {status === "error" && (
              <div className="py-14 text-center">
                <p className="text-sm font-semibold text-red-500">Failed to load colleges. Please try refreshing.</p>
              </div>
            )}

            {/* Colleges Grid */}
            {colleges.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {colleges.map((college) => (
                  <CollegeCard key={college.id} college={college} />
                ))}
              </div>
            ) : status !== "loading" ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 dark:bg-slate-900 mb-4">
                  <FilterX className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No colleges matched your filters</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
                  Try adjusting or clearing some of your filters to see more colleges.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-lg transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : null}

            {/* Skeleton Loading State */}
            {status === "loading" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white border rounded-xl overflow-hidden p-0 h-[400px] flex flex-col justify-between dark:bg-slate-900 dark:border-slate-800 animate-pulse">
                    <div className="w-full aspect-[16/9] bg-slate-200 dark:bg-slate-850" />
                    <div className="p-5 space-y-3.5 flex-grow">
                      <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded w-1/3" />
                      <div className="h-6 bg-slate-200 dark:bg-slate-850 rounded w-5/6" />
                      <div className="h-4 bg-slate-200 dark:bg-slate-850 rounded w-1/2" />
                      <div className="h-8 bg-slate-100 dark:bg-slate-850/50 rounded w-full mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Infinite Scroll trigger target */}
            <div ref={observerTarget} className="mt-8 flex justify-center min-h-[40px]">
              {isFetchingNextPage && (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-650" />
                  Loading more colleges...
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer / Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs lg:hidden animate-fade-in">
          <div className="w-full max-w-sm h-full bg-white dark:bg-slate-950 flex flex-col animate-slide-left shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-850">
              <span className="font-bold text-slate-850 dark:text-white">Filters</span>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400"
              >
                Close
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 custom-scrollbar">
              {renderFilterSidebar()}
            </div>
            
            <div className="p-4 border-t border-slate-100 dark:border-slate-850 grid grid-cols-2 gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={handleClearFilters}
                className="py-2.5 text-xs font-bold border border-slate-250 bg-white hover:bg-slate-50 rounded-lg text-center dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-350"
              >
                Clear All
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-center"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function DiscoveryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>}>
      <DiscoveryPageContent />
    </Suspense>
  );
}
