# Updated Public Examination Link and Availability Requirements

## 1. Google Forms–Style Examination Link

After an Administrator or Talent Acquisition user successfully creates and publishes an examination, automatically generate a unique public examination link similar to Google Forms.

Example:

```txt
https://your-domain.com/exam/category_name-X7K92P
```

The generated link must:

* Be unique to the examination.
* Be accessible without a staff account.
* Be easy to copy and share with applicants.
* Open a public applicant registration page.
* Never expose the examination ID, answer key, or correct answers.
* Continue using the same URL when the examination is temporarily closed and reopened.
* Show an appropriate message when the examination is unavailable.

After publishing an examination, display a sharing panel containing:

* Examination title.
* Hiring category.
* Position.
* Public examination URL.
* Examination code.
* Copy Link button.
* Open Link button.
* QR code for the examination link.
* Current examination status.
* Opening and closing schedule.
* Time limit per applicant.

Example sharing panel:

```txt
ICT Hiring Examination

Public Link:
https://your-domain.com/exam/ICT-HIRING-X7K92P

Status: Open
Time Limit: 30 minutes
Questions: 10
Passing Score: 70%

[Copy Link] [Open Link] [Download QR Code] [Close Examination]
```

## 2. Public Applicant Registration Form

When an applicant opens the public examination link, do not immediately show the examination questions.

First, display an applicant registration form.

The following fields are required:

* Full name.
* Contact number.
* Email address.

Recommended form fields:

```ts
interface ApplicantRegistrationForm {
  fullName: string;
  contactNumber: string;
  email: string;
}
```

Optionally include:

* Applicant reference number.
* Position applied for.
* Current address.
* Consent confirmation.

The applicant must not be allowed to continue unless the required fields are completed and valid.

Validation requirements:

* Full name must contain at least two characters.
* Contact number must contain only valid telephone characters.
* Email must use a valid email format.
* Leading and trailing spaces must be removed.
* Email addresses must be converted to lowercase before saving.
* Duplicate attempts must be checked using the normalized email address and examination ID.
* Validation must run on both the frontend and Firebase Cloud Functions.

Display the examination information above the form:

```txt
ICT Hiring Examination
Position: IT Support Specialist
Number of Questions: 10
Time Limit: 30 minutes
Passing Score: 70%

Please enter your information before starting.
```

Include the following consent checkbox:

```txt
I confirm that the information I provided is correct. I understand that the examination timer will begin after I click Start Examination.
```

The Start Examination button must remain disabled until:

* All required information is valid.
* The consent checkbox is selected.
* The examination is currently open.
* The applicant has not exceeded the maximum number of attempts.

## 3. Examination Availability Controls

Administrator and Talent Acquisition users must be able to control whether an examination can receive responses.

Use the following examination statuses:

```ts
type ExamAvailabilityStatus =
  | "draft"
  | "open"
  | "closed"
  | "scheduled"
  | "expired"
  | "archived";
```

### Draft

* The examination is still being edited.
* The public link must not accept applicants.
* Only staff can preview it.

### Open

* Applicants can open the public link.
* Applicants can register and start the examination.
* New responses are accepted.

### Closed

* The public link remains valid.
* Applicants cannot register or start a new examination.
* Existing submitted results remain available to staff.
* The examination can be reopened by authorized staff.

### Scheduled

* The examination has an opening date in the future.
* The public page must display when the examination will open.
* Applicants cannot start before the opening date.

### Expired

* The examination closing date has passed.
* New applicants cannot begin the examination.
* Staff may change the schedule and reopen it.

### Archived

* The examination is retained for historical reporting.
* It cannot accept new responses.
* Staff can still view previous applicant results.

## 4. Close and Reopen Examination

Add a Close Examination button to the examination management page.

When staff click Close Examination:

1. Display a confirmation dialog.
2. Require an optional reason for closing.
3. Change the examination status to `closed`.
4. Stop accepting new applicant registrations.
5. Keep the existing public link unchanged.
6. Preserve all applicant records and results.

Confirmation example:

```txt
Close Examination?

New applicants will not be able to start this examination. Applicants who already submitted their answers will not be affected.

Reason, optional:
________________________________

[Cancel] [Close Examination]
```

When an examination is closed, the public page must display:

```txt
This examination is currently closed.

The organization is not accepting new responses for this examination. Please contact the recruitment team for more information.
```

Add a Reopen Examination button for closed or expired examinations.

When staff reopen an examination:

* Change its status to `open`.
* Allow new applicants to register.
* Continue using the original public link.
* Preserve all previous results.
* Write the action to the audit log.

Before reopening, staff may update:

* Opening date.
* Closing date.
* Time limit.
* Maximum attempts.
* Passing score.

Only Administrators and Talent Acquisition users may close or reopen examinations.

## 5. Opening and Closing Schedule

Allow staff to configure an optional availability schedule.

Fields:

```ts
interface ExamSchedule {
  openingDate?: Timestamp;
  closingDate?: Timestamp;
  timezone: string;
}
```

Default timezone:

```txt
Asia/Manila
```

Staff can choose:

* Open immediately.
* Open on a specific date and time.
* Close manually.
* Close automatically on a specific date and time.

Example:

```txt
Opening Date: August 10, 2026 at 8:00 AM
Closing Date: August 15, 2026 at 5:00 PM
Timezone: Asia/Manila
```

System behavior:

* Before the opening date, show a scheduled message.
* Between the opening and closing dates, accept applicants.
* After the closing date, stop accepting new applicants.
* Use Firebase server timestamps instead of relying only on the applicant’s device clock.
* Authorized staff can reopen an expired examination by changing the schedule or manually setting it to open.

## 6. Examination Time Limit

Allow staff to configure a time limit for each examination.

Example time-limit choices:

* No time limit.
* 10 minutes.
* 15 minutes.
* 20 minutes.
* 30 minutes.
* 45 minutes.
* 60 minutes.
* Custom duration.

Store the duration in minutes:

```ts
interface ExamTimingSettings {
  hasTimeLimit: boolean;
  durationMinutes: number | null;
}
```

The timer must begin only after:

1. The applicant completes the required registration form.
2. The applicant accepts the examination instructions.
3. The applicant clicks Start Examination.
4. A secure examination attempt is created by Firebase Cloud Functions.

Do not start the timer when the applicant merely opens the public link.

## 7. Secure Timer Implementation

When the applicant starts the examination, save:

```ts
interface ExamAttemptTiming {
  startedAt: Timestamp;
  expiresAt: Timestamp | null;
  submittedAt?: Timestamp;
}
```

Calculate the expiration time on the server:

```ts
expiresAt = startedAt + durationMinutes;
```

Use Firebase server time as the authoritative time source.

The frontend countdown is only for display. Firebase Cloud Functions must verify whether the attempt has expired before accepting a submission.

This prevents an applicant from gaining additional time by:

* Changing the computer clock.
* Refreshing the page.
* Closing and reopening the browser.
* Opening the examination in another tab.
* Modifying frontend JavaScript.

## 8. Applicant Timer Interface

During the examination, display a visible countdown timer.

Example:

```txt
Time Remaining: 24:36
```

Timer behavior:

* Display hours, minutes, and seconds when necessary.
* Keep counting after page refresh.
* Restore the correct remaining time from `expiresAt`.
* Show a warning when five minutes remain.
* Show a stronger warning when one minute remains.
* Automatically submit the current saved answers when the timer reaches zero.
* Prevent answer changes after expiration.
* Redirect the applicant to the result page after successful automatic submission.

Warning examples:

```txt
You have five minutes remaining.
```

```txt
You have one minute remaining. Review your answers and submit the examination.
```

When time expires:

```txt
Time is up. Your saved answers are being submitted automatically.
```

## 9. Handling Closed Exams and Active Attempts

When staff close an examination, provide a setting for handling applicants who have already started.

Options:

```ts
type CloseExamBehavior =
  | "allow_active_attempts_to_finish"
  | "submit_active_attempts_immediately";
```

Use `allow_active_attempts_to_finish` as the default.

### Allow Active Attempts to Finish

* Prevent new applicants from starting.
* Allow applicants with active attempts to continue until their timer expires.
* Accept their final submissions.

### Submit Active Attempts Immediately

* Prevent new applicants from starting.
* Automatically submit the saved answers of active applicants.
* Mark the submission reason as `exam_closed_by_staff`.
* Require a confirmation warning before staff select this option.

## 10. Updated Examination Document

Update the examination Firestore document:

```ts
interface ExamDocument {
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

  availabilityStatus:
    | "draft"
    | "open"
    | "closed"
    | "scheduled"
    | "expired"
    | "archived";

  hasTimeLimit: boolean;
  durationMinutes: number | null;

  openingDate?: Timestamp;
  closingDate?: Timestamp;
  timezone: string;

  maximumAttempts: number;
  closeExamBehavior:
    | "allow_active_attempts_to_finish"
    | "submit_active_attempts_immediately";

  closedAt?: Timestamp;
  closedBy?: string;
  closingReason?: string;

  publishedAt?: Timestamp;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 11. Updated Public Routes

Use these public examination routes:

```txt
/exam/:publicCode
/exam/:publicCode/register
/exam/:publicCode/instructions
/exam/:publicCode/take/:attemptId
/exam/:publicCode/result/:attemptId
```

Example flow:

```txt
/exam/ICT-HIRING-X7K92P
        ↓
Applicant information form
        ↓
Examination instructions
        ↓
Start examination and timer
        ↓
Answer 10 questions
        ↓
Submit or automatic submission
        ↓
Result page and automatic PDF download
```

## 12. Updated Cloud Functions

Create the following secure Firebase Cloud Functions:

```txt
getPublicExamInformation
registerExamApplicant
validateApplicantAttempt
startExamAttempt
getSanitizedExamQuestions
saveExamAnswers
getExamServerTime
submitExamAttempt
autoSubmitExpiredAttempt
closeExam
reopenExam
updateExamSchedule
getExamAvailability
```

### `getPublicExamInformation`

Return only public information:

* Examination title.
* Hiring category.
* Position.
* Instructions.
* Number of questions.
* Time limit.
* Passing score when staff permit it.
* Availability status.
* Opening date.
* Closing date.

Do not return:

* Correct answers.
* Internal examination IDs when unnecessary.
* Staff information.
* Other applicant records.

### `startExamAttempt`

This function must:

1. Confirm the examination is open.
2. Confirm the current server time is within the allowed schedule.
3. Validate the applicant’s name, contact number, and email.
4. Check duplicate and maximum-attempt rules.
5. Create or locate the applicant record.
6. Create the examination attempt.
7. Set `startedAt` using the server timestamp.
8. Calculate `expiresAt`.
9. Return the attempt ID and sanitized examination data.

### `closeExam`

This function must:

* Verify that the requester is an Administrator or Talent Acquisition user.
* Set the examination status to `closed`.
* Save the staff user who closed it.
* Save the closing date and optional reason.
* Apply the selected active-attempt behavior.
* Write an audit log.

### `reopenExam`

This function must:

* Verify staff authorization.
* Validate the new opening and closing schedule.
* Set the status to `open` or `scheduled`.
* Keep the same public code and URL.
* Write an audit log.

## 13. Examination Management Interface

Inside the staff Examination tab, add an Availability and Timing section.

Display:

```txt
Examination Availability

Status: Open

Public Link:
https://your-domain.com/exam/ICT-HIRING-X7K92P

Opening:
August 10, 2026 at 8:00 AM

Closing:
August 15, 2026 at 5:00 PM

Time Limit:
30 minutes

Active Applicants:
4

[Copy Link] [Preview] [Edit Schedule] [Close Examination]
```

For a closed examination:

```txt
Status: Closed

This examination is not accepting new responses.

[Reopen Examination] [Edit Schedule] [View Previous Results]
```

## 14. Audit Log Requirements

Record the following events:

* Examination published.
* Public examination link generated.
* Examination opened.
* Examination closed.
* Examination reopened.
* Examination schedule updated.
* Time limit updated.
* Applicant registered.
* Applicant started the examination.
* Examination automatically submitted because time expired.
* Active attempt submitted because staff closed the examination.

Example:

```ts
interface ExamAuditLog {
  action:
    | "exam_published"
    | "exam_opened"
    | "exam_closed"
    | "exam_reopened"
    | "schedule_updated"
    | "time_limit_updated"
    | "applicant_registered"
    | "attempt_started"
    | "attempt_submitted"
    | "attempt_auto_submitted";

  examId: string;
  categoryId: string;
  performedBy?: string;
  applicantId?: string;
  attemptId?: string;
  description: string;
  createdAt: Timestamp;
}
```

## 15. Required Final Workflow

The completed system must support the following workflow:

1. An Administrator or Talent Acquisition user creates a hiring category.
2. The staff member creates an examination with 10 multiple-choice questions.
3. The staff member sets a passing score and examination time limit.
4. The staff member publishes the examination.
5. The system creates a unique Google Forms–style public link.
6. The staff member copies and sends the link to applicants.
7. The applicant opens the link without logging into the staff system.
8. The applicant enters their required full name, contact number, and email address.
9. The system validates whether the examination is open.
10. The applicant reads the instructions and clicks Start Examination.
11. The examination timer begins.
12. The applicant completes and submits the examination.
13. If time expires, the system automatically submits the saved answers.
14. The applicant sees the final score and pass-or-fail result.
15. The applicant’s result PDF downloads automatically.
16. Staff can close the examination to stop accepting responses.
17. Staff can reopen the examination without generating a new link.
18. All previous applicant results remain available after closing or reopening the examination.
