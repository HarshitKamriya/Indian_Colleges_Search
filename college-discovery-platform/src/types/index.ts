// College types
export interface College {
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
  courses?: Course[];
  placements?: Placement | null;
  reviews?: Review[];
  isSaved?: boolean;
}

export interface Course {
  id: string;
  name: string;
  stream: string;
  duration: string;
  fees: number;
  eligibility: string;
  collegeId: string;
}

export interface Placement {
  id: string;
  highestPackage: number;
  averagePackage: number;
  medianPackage: number;
  placementRate: number;
  topRecruiters: string[];
  collegeId: string;
}

export interface Review {
  id: string;
  rating: number;
  content: string;
  author: string;
  createdAt: string;
  collegeId: string;
}

export interface SavedComparison {
  id: string;
  userId: string;
  name: string;
  collegeSlugs: string[];
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CollegesResponse {
  colleges: College[];
  nextCursor: string | null;
  totalCount: number;
}

// Filter types
export interface CollegeFilters {
  search: string;
  states: string[];
  cities: string[];
  streams: string[];
  minFee: number;
  maxFee: number;
  minRating: number;
  ownership: string[];
  accreditation: string[];
  sortBy: SortOption;
}

export type SortOption =
  | "relevance"
  | "rating_desc"
  | "fees_asc"
  | "fees_desc"
  | "placement_desc";

// Auth types
export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}
