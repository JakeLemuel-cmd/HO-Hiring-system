import type { QuestionType } from "@/types";

export interface PartScore {
  label: string;
  earned: number;
  total: number;
  /** True when this part contains essay questions that haven't been manually scored yet. */
  pending?: boolean;
}

interface GradableQuestion {
  id: string;
  type: QuestionType;
  points: number;
  correctOptionId?: string;
  correctAnswerText?: string;
}

/** Splits a graded attempt into its Part 1 / Part 2 / ... score breakdown, mirroring the
 *  same auto-grading rules used at submission time (fill_blank matched case-insensitively;
 *  essay questions use the manually assigned score, defaulting to 0 until graded). */
export function computePartBreakdown(
  questions: GradableQuestion[],
  answers: Record<string, string>,
  essayScores?: Record<string, number>
): PartScore[] {
  return groupIntoParts(questions).map((part, i) => {
    const total = part.reduce((sum, q) => sum + q.points, 0);
    const pending = part[0].type === "essay" && part.some((q) => essayScores?.[q.id] === undefined);
    const earned = part.reduce((sum, q) => {
      if (q.type === "essay") return sum + (essayScores?.[q.id] ?? 0);
      const given = answers[q.id];
      const isCorrect =
        q.type === "fill_blank"
          ? typeof given === "string" && given.trim().toLowerCase() === (q.correctAnswerText ?? "").trim().toLowerCase()
          : given === q.correctOptionId;
      return sum + (isCorrect ? q.points : 0);
    }, 0);
    return { label: `Part ${i + 1}: ${QUESTION_TYPE_LABELS[part[0].type]}`, earned, total, pending };
  });
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True or False",
  fill_blank: "Fill in the Blank",
  essay: "Essay",
};

export const QUESTION_TYPE_DIRECTIONS: Record<QuestionType, string> = {
  multiple_choice:
    "DIRECTIONS: Read each question carefully and select the single best answer from the choices provided.",
  true_false:
    'DIRECTIONS: Read each statement carefully. Determine whether the statement is factually correct or incorrect. If the statement is correct, select "True." If the statement is incorrect, select "False."',
  fill_blank:
    "DIRECTIONS: Read each sentence carefully. Identify the missing word or words needed to complete the statement correctly, and write your answer clearly on the blank line provided.",
  essay:
    "DIRECTIONS: Read the prompt carefully. Write a well-organized essay that directly addresses all parts of the question, supporting your arguments with specific examples and evidence.",
};

/** Groups questions into parts by contiguous runs of the same type — each generated
 *  batch (e.g. 10 Multiple Choice, then 5 True or False) becomes its own numbered part. */
export function groupIntoParts<T extends { type: QuestionType }>(questions: T[]): T[][] {
  const parts: T[][] = [];
  for (const q of questions) {
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart[0].type === q.type) {
      lastPart.push(q);
    } else {
      parts.push([q]);
    }
  }
  return parts;
}
