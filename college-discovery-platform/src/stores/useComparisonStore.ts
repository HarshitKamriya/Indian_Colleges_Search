import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { College } from "@/types";

interface ComparisonStore {
  colleges: College[];
  addCollege: (college: College) => void;
  removeCollege: (slug: string) => void;
  clearAll: () => void;
  isInComparison: (slug: string) => boolean;
}

export const useComparisonStore = create<ComparisonStore>()(
  persist(
    (set, get) => ({
      colleges: [],
      addCollege: (college) => {
        const { colleges } = get();
        if (colleges.length >= 3) return;
        if (colleges.find((c) => c.slug === college.slug)) return;
        set({ colleges: [...colleges, college] });
      },
      removeCollege: (slug) =>
        set({ colleges: get().colleges.filter((c) => c.slug !== slug) }),
      clearAll: () => set({ colleges: [] }),
      isInComparison: (slug) => !!get().colleges.find((c) => c.slug === slug),
    }),
    {
      name: "comparison-storage",
    }
  )
);
