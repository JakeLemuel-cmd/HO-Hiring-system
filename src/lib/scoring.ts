/** Mirrors the pass/fail calculation performed authoritatively in Cloud Functions (functions/src/attempts.ts). */
export function calculateResult(earnedPoints: number, totalPoints: number, passingScore: number) {
  const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const result: "passed" | "failed" = percentage >= passingScore ? "passed" : "failed";
  return { percentage, result };
}
