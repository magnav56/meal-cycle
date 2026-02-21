import { describe, it, expect } from "vitest";
import {
  TRAY_STATUSES,
  DIET_OPTIONS,
  CLINICAL_STATE_OPTIONS,
  ALLERGY_OPTIONS,
} from "@/lib/types";

describe("type constants", () => {
  it("TRAY_STATUSES has the correct lifecycle order", () => {
    expect(TRAY_STATUSES).toEqual([
      "Preparation Started",
      "Accuracy Validated",
      "En Route",
      "Delivered",
      "Retrieved",
    ]);
  });

  it("DIET_OPTIONS includes all expected diets", () => {
    expect(DIET_OPTIONS).toContain("Regular");
    expect(DIET_OPTIONS).toContain("Vegetarian");
    expect(DIET_OPTIONS).toContain("Diabetic");
    expect(DIET_OPTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it("CLINICAL_STATE_OPTIONS matches database CHECK constraint", () => {
    expect(CLINICAL_STATE_OPTIONS).toContain("Stable");
    expect(CLINICAL_STATE_OPTIONS).toContain("Critical");
    expect(CLINICAL_STATE_OPTIONS).toContain("NPO");
    expect(CLINICAL_STATE_OPTIONS.length).toBe(6);
  });

  it("ALLERGY_OPTIONS covers common allergens", () => {
    const expected = ["Shellfish", "Gluten", "Dairy", "Peanuts", "Soy", "Eggs", "Fish"];
    for (const allergen of expected) {
      expect(ALLERGY_OPTIONS).toContain(allergen);
    }
  });
});
