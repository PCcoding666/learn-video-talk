import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a duration in seconds to a "M:SS" string.
 * If the input is already a string, returns it as-is.
 * If undefined/null/0, returns "--:--".
 */
export function formatDuration(seconds?: number | string): string {
  if (typeof seconds === "string") return seconds;
  if (!seconds) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
