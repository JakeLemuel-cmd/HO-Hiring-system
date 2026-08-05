import { describe, expect, it } from "vitest";
import {
  applicantRegistrationSchema,
  categorySchema,
  normalizeEmail,
  normalizeFullName,
  publishExamSchema,
  examQuestionSchema,
} from "@/lib/validation";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  Juan@Example.COM  ")).toBe("juan@example.com");
  });
});

describe("normalizeFullName", () => {
  it("collapses whitespace and lowercases", () => {
    expect(normalizeFullName("  Juan   Dela  Cruz ")).toBe("juan dela cruz");
  });
});

describe("categorySchema", () => {
  it("requires a passing score between 0 and 100", () => {
    const result = categorySchema.safeParse({
      name: "ICT Hiring",
      positionTitle: "IT Support",
      department: "ICT",
      passingScore: 150,
      durationMinutes: 30,
      maximumAttempts: 1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid category", () => {
    const result = categorySchema.safeParse({
      name: "ICT Hiring",
      positionTitle: "IT Support",
      department: "ICT",
      passingScore: 70,
      durationMinutes: 30,
      maximumAttempts: 1,
    });
    expect(result.success).toBe(true);
  });
});

function makeQuestion(overrides: Record<string, unknown> = {}) {
  return {
    id: "q1",
    order: 1,
    questionText: "What is 2+2?",
    options: [
      { id: "a", text: "3" },
      { id: "b", text: "4" },
    ],
    correctOptionId: "b",
    points: 1,
    isRequired: true,
    ...overrides,
  };
}

describe("examQuestionSchema", () => {
  it("rejects a correct answer that does not match any option", () => {
    const result = examQuestionSchema.safeParse(makeQuestion({ correctOptionId: "z" }));
    expect(result.success).toBe(false);
  });

  it("accepts a well-formed question", () => {
    const result = examQuestionSchema.safeParse(makeQuestion());
    expect(result.success).toBe(true);
  });
});

describe("publishExamSchema", () => {
  it("rejects an empty question list", () => {
    const result = publishExamSchema.safeParse({ questions: [] });
    expect(result.success).toBe(false);
  });

  it("accepts any positive number of well-formed questions", () => {
    const questions = Array.from({ length: 5 }, (_, i) => makeQuestion({ id: `q${i}`, order: i + 1 }));
    const result = publishExamSchema.safeParse({ questions });
    expect(result.success).toBe(true);
  });
});

describe("applicantRegistrationSchema", () => {
  it("requires consent to be true", () => {
    const result = applicantRegistrationSchema.safeParse({
      fullName: "Juan Dela Cruz",
      contactNumber: "09171234567",
      email: "juan@example.com",
      consent: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid registration", () => {
    const result = applicantRegistrationSchema.safeParse({
      fullName: "Juan Dela Cruz",
      contactNumber: "09171234567",
      email: "juan@example.com",
      consent: true,
    });
    expect(result.success).toBe(true);
  });
});
