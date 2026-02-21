import { describe, it, expect } from "vitest";
import { cn, formatDateTime, formatTime } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional classes", () => {
    const isHidden = false;
    const isVisible = true;
    expect(cn("base", isHidden && "hidden", isVisible && "visible")).toBe("base visible");
  });

  it("deduplicates conflicting tailwind classes", () => {
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });
});

describe("formatDateTime", () => {
  it('returns "—" for null', () => {
    expect(formatDateTime(null)).toBe("—");
  });

  it('returns "—" for undefined', () => {
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("formats a valid ISO string", () => {
    const result = formatDateTime("2025-06-15T14:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("—");
  });
});

describe("formatTime", () => {
  it('returns "—" for null', () => {
    expect(formatTime(null)).toBe("—");
  });

  it("formats a valid ISO string to time only", () => {
    const result = formatTime("2025-06-15T14:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("—");
  });
});
