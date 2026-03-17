/**
 * Unit tests for src/lib/utils.ts
 *
 * Tests cover:
 * - cn(): Tailwind class merging utility
 * - formatDuration(): duration formatting
 */
import { describe, it, expect } from "vitest";
import { cn, formatDuration } from "@/lib/utils";

// ============================================================
// cn()
// ============================================================

describe("cn()", () => {
  it("merges simple class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting Tailwind classes", () => {
    // tailwind-merge should keep the last conflicting utility
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles conditional classes via clsx", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("handles undefined and null inputs", () => {
    expect(cn("base", undefined, null, "end")).toBe("base end");
  });

  it("handles empty call", () => {
    expect(cn()).toBe("");
  });

  it("handles array inputs", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  it("merges conflicting Tailwind text colors", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("preserves non-conflicting utilities", () => {
    const result = cn("p-4", "mt-2", "bg-red-500");
    expect(result).toContain("p-4");
    expect(result).toContain("mt-2");
    expect(result).toContain("bg-red-500");
  });
});

// ============================================================
// formatDuration()
// ============================================================

describe("formatDuration()", () => {
  it("returns '--:--' for undefined", () => {
    expect(formatDuration(undefined)).toBe("--:--");
  });

  it("returns '--:--' for null", () => {
    expect(formatDuration(null as unknown as undefined)).toBe("--:--");
  });

  it("returns '--:--' for 0", () => {
    expect(formatDuration(0)).toBe("--:--");
  });

  it("formats seconds-only duration", () => {
    expect(formatDuration(45)).toBe("0:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("2:05");
  });

  it("pads seconds with leading zero", () => {
    expect(formatDuration(61)).toBe("1:01");
  });

  it("formats exact minutes", () => {
    expect(formatDuration(120)).toBe("2:00");
  });

  it("formats large durations (over 1 hour)", () => {
    // 1 hour 5 minutes 30 seconds = 3930s
    expect(formatDuration(3930)).toBe("65:30");
  });

  it("returns string input as-is", () => {
    expect(formatDuration("already formatted")).toBe("already formatted");
  });

  it("returns string '0' as-is", () => {
    expect(formatDuration("0")).toBe("0");
  });

  it("handles 1 second", () => {
    expect(formatDuration(1)).toBe("0:01");
  });

  it("handles 59 seconds", () => {
    expect(formatDuration(59)).toBe("0:59");
  });

  it("handles fractional seconds (floor)", () => {
    expect(formatDuration(59.9)).toBe("0:59");
  });
});
