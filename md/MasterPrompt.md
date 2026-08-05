# Master Prompt: Hiring Examination Management System

Act as a senior full-stack React and Firebase developer. Build a complete, secure, responsive hiring examination management system.

The application will allow administrators and Talent Acquisition staff to create hiring categories or job positions, prepare multiple-choice examinations, invite applicants, monitor examination results, search applicant records, and download individual or consolidated PDF reports.

## 1. Project Overview

Create a web-based examination system for hiring purposes.

Example hiring categories or positions:

* ICT Hiring
* Software Developer
* Network Administrator
* Accounting Staff
* Human Resources Assistant
* Customer Service Representative

Each category must have its own dashboard, examination, applicants, and examination results.

When a category is newly created, its dashboard must display zero values until applicants take the examination.

## 2. Technology Stack

Use the following technologies:

### Frontend

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router
* React Hook Form
* Zod validation
* Lucide React icons
* Recharts for dashboard charts
* jsPDF or React PDF for generating PDF reports

### Backend and Firebase Services

* Firebase Authentication
* Cloud Firestore
* Firebase Storage
* Firebase Cloud Functions
* Firebase Hosting

Use Firebase Cloud Functions for secure examination scoring and PDF-related backend operations when necessary.

Do not expose correct answers, Firebase Admin credentials, or privileged operations in the frontend.

## 3. User Roles

The system must have the following staff roles:

### Administrator

The administrator can:

* Create and manage staff accounts.
* Assign Administrator or Talent Acquisition roles.
* Create, edit, archive, and delete hiring categories.
* Create and manage examinations.
* Publish or unpublish examinations.
* View all applicants and results.
* Download individual and consolidated reports.
* Manage application settings.
* View audit logs.

### Talent Acquisition

Talent Acquisition users can:

* Create and manage hiring categories.
* Create and edit examinations.
* Publish examinations.
* View category dashboards.
* Search applicants.
* View examination results.
* Download PDF reports.

Talent Acquisition users must not be allowed to manage administrator accounts or modify system-level settings.

### Applicant

Applicants do not need access to the staff dashboard.

Applicants can:

* Open an examination using a secure examination link or examination code.
* Enter their personal information.
* Read and accept examination instructions.
* Answer the examination questions.
* Submit the examination.
* View their score after submission.
* Automatically download their examination result as a PDF.

Use Firebase Anonymous Authentication for applicant examination sessions, or another secure temporary session approach.

## 4. Authentication and Authorization

Create a secure login page for Administrator and Talent Acquisition users.

Support:

* Email and password authentication.
* Forgot-password functionality.
* Password reset.
* Logout.
* Protected routes.
* Role-based access control.

Store staff roles using Firebase custom claims or a protected Firestore user profile.

Example roles:

```ts
type UserRole = "admin" | "talent_acquisition";
```

Create Firestore security rules that prevent unauthorized access.

Applicants must not be able to:

* Access the staff dashboard.
* Read correct examination answers.
* Read other applicants’ information.
* Change their submitted result.
* Submit the same examination repeatedly unless permitted by staff.

## 5. Main Application Routes

Create the following routes:

```txt
/login
/forgot-password

/admin/dashboard
/admin/categories
/admin/categories/new
/admin/categories/:categoryId
/admin/categories/:categoryId/dashboard
/admin/categories/:categoryId/exam
/admin/categories/:categoryId/applicants
/admin/categories/:categoryId/results
/admin/users
/admin/settings
/admin/audit-logs

/exam/:examCode
/exam/:examCode/instructions
/exam/:examCode/take
/exam/:examCode/result/:attemptId
```

Use protected routes for all staff pages.

## 6. Staff Dashboard

Create a main dashboard that displays:

* Total hiring categories.
* Total published examinations.
* Total applicants.
* Total completed examinations.
* Average examination score.
* Pass rate.
* Recent examination attempts.
* Applicants per category chart.
* Pass and fail distribution chart.

Add filters for:

* Hiring category.
* Date range.
* Examination status.
* Applicant result.

## 7. Hiring Category Module

Allow Administrator and Talent Acquisition users to create hiring categories or job positions.

Category fields:

* Category name.
* Position title.
* Department.
* Description.
* Hiring status.
* Passing score.
* Examination duration.
* Maximum examination attempts.
* Start date.
* Closing date.
* Created by.
* Created date.

Example category:

```txt
Category Name: ICT Hiring
Position: IT Support Specialist
Department: Information and Communications Technology
Passing Score: 70%
Duration: 30 minutes
Maximum Attempts: 1
Status: Active
```

Category statuses:

* Draft
* Active
* Closed
* Archived

After creating a category, redirect the user to the category dashboard.

## 8. Category Dashboard

Every category must have its own dashboard.

A newly created category must display:

```txt
Total Applicants: 0
Completed Examinations: 0
Passed Applicants: 0
Failed Applicants: 0
Average Score: 0
Pass Rate: 0%
```

The category dashboard must update automatically after applicants complete the examination.

Display:

* Total applicants.
* Applicants who started the examination.
* Completed examinations.
* Passed applicants.
* Failed applicants.
* Average score.
* Highest score.
* Lowest score.
* Pass rate.
* Recent applicants.
* Score distribution chart.
* Examination completion chart.

Include these tabs:

* Overview
* Examination
* Applicants
* Results
* Settings

## 9. Examination Builder

Each hiring category must have an Examination tab.

For the MVP, every examination must contain exactly 10 multiple-choice questions.

Create an examination builder that allows staff to:

* Add a question.
* Edit a question.
* Delete a question.
* Reorder questions.
* Add answer options.
* Select the correct answer.
* Assign points.
* Preview the examination.
* Save the examination as a draft.
* Publish the examination.
* Unpublish the examination.

Each question must contain:

* Question number.
* Question text.
* Two to six answer options.
* One correct answer.
* Point value.
* Optional explanation for staff.
* Required or optional status.

Example question structure:

```ts
interface ExamQuestion {
  id: string;
  order: number;
  questionText: string;
  options: {
    id: string;
    text: string;
  }[];
  correctOptionId: string;
  points: number;
}
```

Validate that:

* The examination has exactly 10 questions before publishing.
* Every question has at least two answer options.
* Every question has one selected correct answer.
* Empty questions and answer options cannot be saved.
* The total possible score is calculated automatically.

Do not send `correctOptionId` to the applicant’s browser.

Create a Firebase Cloud Function that returns a sanitized examination containing only:

* Question ID.
* Question number.
* Question text.
* Answer options.
* Point value when appropriate.

## 10. Examination Publishing

When an examination is published:

* Generate a unique examination code.
* Generate a shareable examination URL.
* Allow staff to copy the URL.
* Allow staff to activate or deactivate the examination.
* Display the examination opening and closing dates.
* Prevent access after the closing date.
* Prevent access when the examination is inactive.

Example URL:

```txt
https://your-domain.com/exam/ICT-2026-A7X2
```

## 11. Applicant Information Form

Before starting the examination, require the applicant to provide:

* First name.
* Middle name, optional.
* Last name.
* Email address.
* Mobile number.
* Applicant reference number, optional.
* Hiring category.
* Position applied for.

Add a consent checkbox:

```txt
I confirm that the information I provided is correct and that I will complete this examination without unauthorized assistance.
```

Use Zod and React Hook Form for validation.

Prevent duplicate attempts using a combination of:

* Category ID.
* Examination ID.
* Applicant email address.
* Applicant reference number.
* Maximum attempt settings.

## 12. Applicant Examination Interface

Create a clean and distraction-free examination page.

Display:

* Category name.
* Position title.
* Applicant name.
* Examination progress.
* Current question number.
* Remaining examination time.
* Answer options.
* Previous and Next buttons.
* Question navigation panel.
* Submit Examination button.

Requirements:

* Save answers automatically.
* Preserve progress after accidental page refresh.
* Show unanswered questions.
* Warn the applicant before leaving the page.
* Automatically submit when the timer reaches zero.
* Require confirmation before final submission.
* Disable changes after successful submission.

Make the interface responsive for desktop, tablet, and mobile devices.

## 13. Examination Scoring

Scoring must happen securely in Firebase Cloud Functions.

When an applicant submits:

1. Send the applicant’s selected answers to a secure Cloud Function.
2. Retrieve the correct answers on the server.
3. Calculate the raw score.
4. Calculate the percentage.
5. Determine whether the applicant passed or failed.
6. Save the result in Firestore.
7. Return only the final result to the applicant.

Example calculation:

```ts
percentage = (earnedPoints / totalPoints) * 100;
```

Result status:

```ts
const status = percentage >= passingScore ? "Passed" : "Failed";
```

The applicant must not receive the correct answers after submission unless that feature is explicitly enabled by an administrator.

## 14. Applicant Result Page

After submission, display:

* Applicant’s full name.
* Hiring category.
* Position.
* Examination title.
* Examination date.
* Raw score.
* Total possible score.
* Percentage.
* Passed or Failed result.
* Attempt number.
* Time used.
* Unique result reference number.

Example:

```txt
Applicant: Juan Dela Cruz
Category: ICT Hiring
Position: IT Support Specialist
Score: 8 out of 10
Percentage: 80%
Result: Passed
```

Provide a Download Result PDF button.

Automatically trigger the result PDF download after the result page loads.

Also keep the download button available in case the automatic download is blocked by the browser.

## 15. Individual Result PDF

Generate a professional PDF containing:

* Company logo.
* Company name.
* Document title: Examination Result.
* Applicant’s full name.
* Email address.
* Applicant reference number.
* Category.
* Position.
* Examination title.
* Examination date.
* Completion time.
* Raw score.
* Percentage.
* Passed or Failed status.
* Attempt number.
* Result reference number.
* Verification QR code or verification URL.
* Generated date and time.

Use a clean printable layout.

Suggested filename:

```txt
Juan-Dela-Cruz_ICT-Hiring_Exam-Result.pdf
```

## 16. Applicant Search

Create a global applicant search page for staff.

Allow searching by:

* First name.
* Last name.
* Full name.
* Email address.
* Applicant reference number.
* Position.
* Hiring category.
* Result reference number.

Display search results in a table with:

* Applicant name.
* Email.
* Categories taken.
* Number of examinations taken.
* Latest score.
* Latest result.
* Latest examination date.
* View Details button.
* Download Report button.

Include filters for:

* Category.
* Position.
* Passed or failed.
* Date range.
* Examination status.

## 17. Applicant Profile and Multiple-Category History

When an applicant has taken examinations for multiple categories, create a single applicant profile that displays all examination history.

Example:

```txt
Applicant: Juan Dela Cruz

1. ICT Hiring
   Position: IT Support Specialist
   Score: 80%
   Result: Passed
   Date: August 5, 2026

2. Accounting Hiring
   Position: Accounting Assistant
   Score: 65%
   Result: Failed
   Date: August 10, 2026
```

The applicant profile must provide:

* Download Individual Result for each attempt.
* Download Complete Applicant History PDF.
* View examination details.
* View category details.

Match applicant records primarily using normalized email addresses and applicant reference numbers.

Do not rely only on names because different applicants may have identical names.

## 18. Consolidated Applicant PDF

Create a consolidated PDF containing all examinations completed by the selected applicant.

The PDF must include:

* Applicant information.
* Total examinations taken.
* Categories applied for.
* Position for each category.
* Score for each examination.
* Pass or fail status.
* Examination dates.
* Attempt numbers.
* Overall average score.
* Summary of passed and failed examinations.

Suggested filename:

```txt
Juan-Dela-Cruz_Complete-Examination-History.pdf
```

## 19. Applicants Table

Inside each hiring category, create an Applicants tab.

Table columns:

* Applicant name.
* Email.
* Mobile number.
* Applicant reference number.
* Examination status.
* Score.
* Percentage.
* Result.
* Attempt number.
* Started date.
* Completed date.
* Actions.

Examination statuses:

* Not Started
* In Progress
* Completed
* Expired
* Disqualified

Actions:

* View applicant.
* View result.
* Download PDF.
* Allow retake.
* Mark as disqualified.
* Archive applicant record.

Add pagination, search, filters, sorting, and CSV export.

## 20. Firestore Data Model

Use a scalable Firestore structure similar to the following:

```txt
users/{userId}

categories/{categoryId}

categories/{categoryId}/exams/{examId}

categories/{categoryId}/exams/{examId}/questions/{questionId}

applicants/{applicantId}

examAttempts/{attemptId}

examAttempts/{attemptId}/answers/{answerId}

auditLogs/{logId}

settings/general
```

### User Document

```ts
interface UserDocument {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "talent_acquisition";
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Category Document

```ts
interface CategoryDocument {
  id: string;
  name: string;
  positionTitle: string;
  department: string;
  description: string;
  passingScore: number;
  durationMinutes: number;
  maximumAttempts: number;
  status: "draft" | "active" | "closed" | "archived";
  openingDate?: Timestamp;
  closingDate?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Examination Document

```ts
interface ExamDocument {
  id: string;
  categoryId: string;
  title: string;
  instructions: string;
  examCode: string;
  questionCount: number;
  totalPoints: number;
  status: "draft" | "published" | "inactive";
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Applicant Document

```ts
interface ApplicantDocument {
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
```

### Examination Attempt Document

```ts
interface ExamAttemptDocument {
  id: string;
  applicantId: string;
  categoryId: string;
  examId: string;
  attemptNumber: number;
  status:
    | "not_started"
    | "in_progress"
    | "completed"
    | "expired"
    | "disqualified";
  startedAt?: Timestamp;
  submittedAt?: Timestamp;
  durationSeconds?: number;
  earnedPoints?: number;
  totalPoints?: number;
  percentage?: number;
  result?: "passed" | "failed";
  resultReferenceNumber?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 21. Firebase Cloud Functions

Create secure Cloud Functions for:

* Creating staff accounts.
* Assigning staff roles.
* Retrieving a sanitized published examination.
* Starting an examination attempt.
* Saving examination progress.
* Submitting and scoring an examination.
* Checking duplicate attempts.
* Allowing an authorized retake.
* Generating unique result reference numbers.
* Generating or preparing PDF result data.
* Creating dashboard statistics.
* Writing audit logs.

Suggested callable functions:

```txt
createStaffUser
updateStaffRole
getPublicExam
startExamAttempt
saveExamProgress
submitExamAttempt
allowApplicantRetake
getApplicantHistory
generateResultReport
generateApplicantHistoryReport
```

Use Firebase Admin SDK inside Cloud Functions.

## 22. Firestore Security Requirements

Implement Firestore security rules with these principles:

* Only authenticated staff can access staff dashboard records.
* Only administrators can manage staff roles.
* Talent Acquisition users can manage categories, examinations, applicants, and results.
* Applicants can access only their active attempt.
* Applicants cannot read examination answer keys.
* Submitted attempts cannot be modified by applicants.
* Correct answers must only be accessed through Cloud Functions.
* Audit logs cannot be edited or deleted by normal users.
* System settings can only be modified by administrators.

## 23. Audit Logging

Record important staff actions, including:

* Staff login.
* Category creation.
* Category update.
* Examination creation.
* Examination publication.
* Question changes.
* Applicant retake authorization.
* Applicant disqualification.
* PDF report generation.
* Staff account creation or role update.

Audit log fields:

```ts
interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: Timestamp;
}
```

## 24. UI and Design Requirements

Create a professional hiring and human resources interface.

Use:

* Responsive sidebar navigation.
* Top navigation bar.
* Breadcrumbs.
* Dashboard statistic cards.
* Tables with pagination.
* Empty states.
* Loading skeletons.
* Confirmation dialogs.
* Toast notifications.
* Form validation messages.
* Accessible labels and keyboard navigation.

Use Tailwind CSS for all styling.

Do not use inline CSS.

The design must work on:

* Desktop.
* Tablet.
* Mobile.

### Empty State Example

For a newly created category:

```txt
No applicants yet

Applicants who complete the ICT Hiring examination will appear here.

Total Applicants: 0
Completed: 0
Passed: 0
Failed: 0
```

## 25. Suggested Project Structure

```txt
src/
├── app/
│   ├── router.tsx
│   └── providers.tsx
├── components/
│   ├── common/
│   ├── forms/
│   ├── layout/
│   ├── tables/
│   └── charts/
├── features/
│   ├── auth/
│   ├── users/
│   ├── categories/
│   ├── exams/
│   ├── applicants/
│   ├── attempts/
│   ├── reports/
│   ├── dashboard/
│   └── audit-logs/
├── hooks/
├── layouts/
├── lib/
│   ├── firebase.ts
│   ├── validation.ts
│   ├── permissions.ts
│   └── pdf.ts
├── pages/
├── services/
│   ├── auth.service.ts
│   ├── category.service.ts
│   ├── exam.service.ts
│   ├── applicant.service.ts
│   ├── result.service.ts
│   └── report.service.ts
├── types/
├── utils/
└── main.tsx

functions/
├── src/
│   ├── auth/
│   ├── exams/
│   ├── scoring/
│   ├── applicants/
│   ├── reports/
│   ├── audit/
│   └── index.ts
└── package.json
```

## 26. Reusable Components

Create reusable components such as:

```txt
AppSidebar
AppHeader
ProtectedRoute
RoleGuard
PageHeader
StatCard
EmptyState
DataTable
SearchInput
FilterBar
StatusBadge
ConfirmDialog
CategoryForm
ExamBuilder
QuestionEditor
OptionEditor
ExamTimer
QuestionNavigator
ApplicantForm
ResultSummary
ApplicantHistory
PDFDownloadButton
LoadingSkeleton
ErrorState
```

## 27. State and Data Handling

Use:

* React Context for the authenticated user and role.
* Firebase listeners for real-time dashboard statistics where appropriate.
* Custom hooks for Firestore operations.
* React Hook Form for forms.
* Zod for frontend validation.
* Server-side validation inside Cloud Functions.

Suggested hooks:

```txt
useAuth
useCurrentUser
useRole
useCategories
useCategory
useExam
useExamBuilder
useApplicants
useApplicantHistory
useExamAttempt
useCategoryStatistics
```

## 28. Error Handling

Handle the following conditions:

* Invalid examination code.
* Inactive examination.
* Examination not yet open.
* Examination already closed.
* Duplicate attempt.
* Maximum attempts reached.
* Internet connection interruption.
* Failed answer autosave.
* Failed examination submission.
* PDF download blocked.
* Unauthorized staff access.
* Missing or deleted category.
* Missing examination questions.

Show understandable error messages and provide safe retry actions.

Never display raw Firebase errors directly to users.

## 29. Validation Rules

Apply validation for:

* Required category name.
* Required position title.
* Passing score between 0 and 100.
* Examination duration greater than zero.
* Exactly 10 questions before publication.
* Two to six options per question.
* One correct option per question.
* Valid applicant email.
* Valid mobile number.
* Applicant consent.
* Complete applicant identity before starting.
* Valid examination submission payload.

## 30. Testing Requirements

Add tests for:

* Authentication.
* Role-based route protection.
* Category creation.
* Empty category dashboard.
* Examination question validation.
* Examination publishing.
* Sanitized examination retrieval.
* Duplicate attempt prevention.
* Timer expiration.
* Examination scoring.
* Pass or fail calculation.
* Applicant search.
* Individual PDF generation.
* Consolidated applicant-history PDF generation.

Use:

* Vitest.
* React Testing Library.
* Firebase Emulator Suite.

## 31. Required Deliverables

Generate the project in the following order:

1. Project setup and dependency installation.
2. Firebase configuration.
3. TypeScript interfaces.
4. Authentication and role-based access.
5. Application layout and routes.
6. Hiring category management.
7. Category dashboard with zero-data empty state.
8. Examination builder with exactly 10 questions.
9. Examination publishing and public link.
10. Applicant information and examination pages.
11. Secure Cloud Function scoring.
12. Applicant result page.
13. Automatic individual PDF download.
14. Applicant search.
15. Multiple-category applicant history.
16. Consolidated PDF report.
17. Firestore security rules.
18. Audit logs.
19. Tests.
20. Deployment instructions.

## 32. Development Rules

Follow these requirements throughout development:

* Use TypeScript strict mode.
* Use modular and reusable components.
* Avoid large page components.
* Keep Firebase logic inside services and hooks.
* Add loading, empty, success, and error states.
* Use server timestamps.
* Normalize applicant email addresses.
* Do not identify applicants using names alone.
* Do not store sensitive credentials in the source code.
* Use environment variables for Firebase configuration.
* Never expose examination correct answers to applicants.
* Score examinations only through secure Cloud Functions.
* Validate authorization on both the frontend and backend.
* Use Firestore transactions where duplicate submissions or race conditions are possible.
* Add meaningful comments only where business logic is not obvious.
* Generate complete working code rather than placeholder components.

## 33. Expected Final Result

The completed application must allow this full workflow:

1. An Administrator or Talent Acquisition user logs in.
2. The staff member creates an `ICT Hiring` category.
3. The category dashboard initially displays zero applicants and zero examination results.
4. The staff member opens the Examination tab.
5. The staff member creates 10 multiple-choice questions.
6. Each question contains configurable answer options and one correct answer.
7. The staff member publishes the examination.
8. The system generates a secure examination link and code.
9. An applicant opens the link and enters their personal information.
10. The applicant completes the examination.
11. The system securely scores the answers.
12. The applicant sees their score and pass or fail status.
13. The applicant’s individual result PDF downloads automatically.
14. The staff dashboard updates its applicant statistics.
15. Staff can search for the applicant by name, email, or reference number.
16. When the applicant takes examinations under multiple hiring categories, all results appear in one applicant history.
17. Staff can download a consolidated PDF containing all examination results for that applicant.

Build the system as a production-ready MVP with clean architecture, responsive design, secure Firebase rules, and clear setup and deployment documentation.
