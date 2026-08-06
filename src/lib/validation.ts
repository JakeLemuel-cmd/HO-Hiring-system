import { z } from "zod";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeFullName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required."),
  status: z.enum(["draft", "active", "closed", "archived"]).default("draft"),
});

/** Per-exam-set settings — a category can hold multiple exam sets, each for a different role. */
export const examSetSchema = z.object({
  title: z.string().trim().min(1, "Title is required."),
  positionTitle: z.string().trim().min(1, "Position title is required."),
  department: z.string().trim().min(1, "Department is required."),
  passingScore: z.coerce.number().min(0).max(100),
  durationMinutes: z.coerce.number().min(1, "Duration must be greater than zero."),
  maximumAttempts: z.coerce.number().min(1),
});

export const questionTypeEnum = z.enum(["multiple_choice", "true_false", "fill_blank", "essay"]);

export const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string().trim().min(1, "Option text is required."),
});

export const examQuestionSchema = z
  .object({
    id: z.string(),
    order: z.number(),
    type: questionTypeEnum.default("multiple_choice"),
    questionText: z.string().trim().min(1, "Question text is required."),
    options: z.array(questionOptionSchema).max(6).default([]),
    correctOptionId: z.string().optional().default(""),
    correctAnswerText: z.string().optional().default(""),
    points: z.coerce.number().min(1),
    explanation: z.string().optional(),
    isRequired: z.boolean().default(true),
  })
  .superRefine((q, ctx) => {
    if (q.type === "essay") return;
    if (q.type === "fill_blank") {
      if (!q.correctAnswerText.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter the correct answer.",
          path: ["correctAnswerText"],
        });
      }
      return;
    }
    if (q.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least two options are required.",
        path: ["options"],
      });
    }
    if (q.options.some((o) => !o.text.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Option text is required.", path: ["options"] });
    }
    if (!q.options.some((o) => o.id === q.correctOptionId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "The correct answer must match one of the options.",
        path: ["correctOptionId"],
      });
    }
  });

export const publishExamSchema = z.object({
  questions: z.array(examQuestionSchema).min(1, "At least one question is required before publishing."),
});

export const examBuilderSetupSchema = z.object({
  title: z.string().trim().min(1, "Exam title is required."),
  questionType: questionTypeEnum,
  numberOfQuestions: z.coerce
    .number()
    .int("Enter a whole number.")
    .min(1, "Enter at least 1 question.")
    .max(100, "A maximum of 100 questions is supported."),
});

const phoneRegex = /^09\d{9}$/;

export const applicantRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must contain at least two characters."),
  contactNumber: z
    .string()
    .trim()
    .regex(phoneRegex, "Enter an 11-digit contact number starting with 09 (e.g. )."),
  email: z.string().trim().email("Enter a valid email address."),
  applicantReferenceNumber: z.string().trim().optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must confirm the consent statement to continue." }),
  }),
});

export type ApplicantRegistrationInput = z.infer<typeof applicantRegistrationSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ExamSetInput = z.infer<typeof examSetSchema>;
export type ExamQuestionInput = z.infer<typeof examQuestionSchema>;
export type ExamBuilderSetupInput = z.infer<typeof examBuilderSetupSchema>;
