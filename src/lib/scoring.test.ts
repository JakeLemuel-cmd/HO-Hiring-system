import { describe, expect, it } from "vitest";
import { calculateResult } from "@/lib/scoring";

describe("calculateResult", () => {
  it("passes when percentage meets the passing score", () => {
    expect(calculateResult(8, 10, 70)).toEqual({ percentage: 80, result: "passed" });
  });

  it("fails when percentage is below the passing score", () => {
    expect(calculateResult(6, 10, 70)).toEqual({ percentage: 60, result: "failed" });
  });

  it("handles a zero total points examination without dividing by zero", () => {
    expect(calculateResult(0, 0, 70)).toEqual({ percentage: 0, result: "failed" });
  });
});
