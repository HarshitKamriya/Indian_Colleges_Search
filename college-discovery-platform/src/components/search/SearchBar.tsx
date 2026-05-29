"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, MapPin, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/useDebounce"; // We'll create this helper hook or just write inline debouncing.
import { cn } from "@/lib/utils";

interface Suggestion {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
}

interface SearchBarProps {
  initialValue?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ initialValue = "", onSearch, placeholder = "Search by college name, city, state, or course..." }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with initial value
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Suggestions fetch effect (debounced manually)
  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/colleges?search=${encodeURIComponent(query)}&limit=5`);
        const data = await res.json();
        if (data.success && data.data) {
          setSuggestions(data.data.colleges || []);
        }
      } catch (err) {
        console.error("Suggestions fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        handleSuggestionClick(suggestions[highlightedIndex]);
      } else {
        triggerSearch();
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setQuery(suggestion.name);
    setShowSuggestions(false);
    router.push(`/college/${suggestion.slug}`);
  };

  const triggerSearch = () => {
    setShowSuggestions(false);
    onSearch(query.trim());
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all overflow-hidden">
        <span className="pl-4 text-slate-400">
          <Search className="w-5 h-5" />
        </span>
        
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-4 text-sm bg-transparent border-0 focus:outline-none focus:ring-0 dark:text-white"
        />

        {query && (
          <button
            onClick={() => {
              setQuery("");
              onSearch("");
              setSuggestions([]);
            }}
            className="p-1 mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={triggerSearch}
          className="px-6 py-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shrink-0"
        >
          Search
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (query.trim().length >= 2 || suggestions.length > 0) && (
        <div className="absolute left-0 right-0 mt-2 z-50 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl">
          {isLoading && suggestions.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-sm text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Searching colleges...
            </div>
          ) : suggestions.length > 0 ? (
            <div className="p-1">
              {suggestions.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleSuggestionClick(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "flex items-center justify-between w-full text-left px-4 py-3 rounded-lg text-sm transition-colors",
                    index === highlightedIndex
                      ? "bg-slate-50 text-blue-600 dark:bg-slate-850 dark:text-blue-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-850/50"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-bold truncate max-w-[320px]">{item.name}</span>
                    <span className="text-2xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      {item.city}, {item.state}
                    </span>
                  </div>
                  <span className="text-3xs font-semibold uppercase tracking-wider text-slate-400 shrink-0">
                    Go to Details →
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-slate-400">
              No colleges found matching "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
