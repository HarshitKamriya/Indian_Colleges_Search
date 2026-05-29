import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`;
  }
  return `₹${amount}`;
}

export function formatFeeRange(min: number, max: number): string {
  return `${formatCurrency(min)} - ${formatCurrency(max)}/yr`;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function getOwnershipColor(ownership: string): string {
  switch (ownership) {
    case "GOVERNMENT":
      return "bg-green-100 text-green-800 border-green-200";
    case "PRIVATE":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "DEEMED":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "AUTONOMOUS":
      return "bg-orange-100 text-orange-800 border-orange-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getOwnershipLabel(ownership: string): string {
  switch (ownership) {
    case "GOVERNMENT":
      return "Government";
    case "PRIVATE":
      return "Private";
    case "DEEMED":
      return "Deemed";
    case "AUTONOMOUS":
      return "Autonomous";
    default:
      return ownership;
  }
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
