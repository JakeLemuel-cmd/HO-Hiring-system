/** ISO 8601 string, as returned by Postgres `timestamptz` columns through supabase-js. */
export type Timestamp = string;

export type UserRole = "admin" | "talent_acquisition";

export interface UserDocument {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CategoryStatus = "draft" | "active" | "closed" | "archived";

export interface CategoryDocument {
  id: string;
  name: string;
  positionTitle: string;
  department: string;
  description: string;
  passingScore: number;
  durationMinutes: number;
  maximumAttempts: number;
  status: CategoryStatus;
  openingDate?: Timestamp;
  closingDate?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ExamAvailabilityStatus =
  | "draft"
  | "open"
  | "closed"
  | "scheduled"
  | "expired"
  | "archived";

export type CloseExamBehavior =
  | "allow_active_attempts_to_finish"
  | "submit_active_attempts_immediately";

export type QuestionType = "multiple_choice" | "true_false" | "fill_blank";

export interface ExamQuestionOption {
  id: string;
  text: string;
}

export interface ExamQuestion {
  id: string;
  order: number;
  type: QuestionType;
  questionText: string;
  options: ExamQuestionOption[];
  correctOptionId: string;
  /** Answer key for fill_blank questions; ignored for other types. */
  correctAnswerText: string;
  points: number;
  explanation?: string;
  isRequired: boolean;
}

/** Question shape sent to applicants — never includes the answer key. */
export interface SanitizedExamQuestion {
  id: string;
  order: number;
  type: QuestionType;
  questionText: string;
  options: ExamQuestionOption[];
  points: number;
}

export interface ExamDocument {
  id: string;
  categoryId: string;
  title: string;
  instructions: string;

  publicCode: string;
  publicSlug: string;
  publicUrl: string;

  questionCount: number;
  totalPoints: number;
  passingScore: number;

  availabilityStatus: ExamAvailabilityStatus;

  hasTimeLimit: boolean;
  durationMinutes: number | null;

  openingDate?: Timestamp;
  closingDate?: Timestamp;
  timezone: string;

  maximumAttempts: number;
  closeExamBehavior: CloseExamBehavior;

  closedAt?: Timestamp;
  closedBy?: string;
  closingReason?: string;

  publishedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ExamListItem extends ExamDocument {
  categoryName: string;
  positionTitle: string;
}

export interface PublicExamInformation {
  examId: string;
  title: string;
  categoryName: string;
  positionTitle: string;
  instructions: string;
  questionCount: number;
  hasTimeLimit: boolean;
  durationMinutes: number | null;
  passingScore: number | null;
  availabilityStatus: ExamAvailabilityStatus;
  openingDate?: string;
  closingDate?: string;
}

export interface ApplicantDocument {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  normalizedFullName: string;
  email: string;
  normalizedEmail: string;
  mobileNumber: string;
  applicantReferenceNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AttemptStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "expired"
  | "disqualified";

export interface ExamAttemptDocument {
  id: string;
  applicantId: string;
  categoryId: string;
  examId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt?: Timestamp;
  expiresAt?: Timestamp | null;
  submittedAt?: Timestamp;
  durationSeconds?: number;
  earnedPoints?: number;
  totalPoints?: number;
  percentage?: number;
  result?: "passed" | "failed";
  resultReferenceNumber?: string;
  submissionReason?: "applicant_submitted" | "time_expired" | "exam_closed_by_staff";
  answers?: Record<string, string>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type AuditAction =
  | "staff_login"
  | "category_created"
  | "category_updated"
  | "exam_created"
  | "exam_published"
  | "question_changed"
  | "applicant_retake_authorized"
  | "applicant_disqualified"
  | "pdf_generated"
  | "staff_account_created"
  | "staff_role_updated"
  | "exam_opened"
  | "exam_closed"
  | "exam_reopened"
  | "schedule_updated"
  | "time_limit_updated"
  | "applicant_registered"
  | "attempt_started"
  | "attempt_submitted"
  | "attempt_auto_submitted";

export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  categoryId?: string;
  examId?: string;
  applicantId?: string;
  attemptId?: string;
  createdAt: Timestamp;
}

export interface CategoryStatistics {
  totalApplicants: number;
  startedExaminations: number;
  completedExaminations: number;
  passedApplicants: number;
  failedApplicants: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
}

export const EMPTY_CATEGORY_STATISTICS: CategoryStatistics = {
  totalApplicants: 0,
  startedExaminations: 0,
  completedExaminations: 0,
  passedApplicants: 0,
  failedApplicants: 0,
  averageScore: 0,
  highestScore: 0,
  lowestScore: 0,
  passRate: 0,
};
