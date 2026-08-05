---
name: hiring-exam-ui-design
description: Design and implement a polished hiring examination web application using React, Vite, TypeScript, Tailwind CSS, and shadcn/ui. Use when creating or revising admin dashboards, Talent Acquisition workflows, examination builders, public applicant forms, timed exam pages, result screens, tables, dialogs, filters, empty states, and responsive layouts for the hiring exam system. Enforce consistent design tokens, accessible component composition, restrained visual styling, complete interaction states, and production-quality responsive behavior. Avoid generic AI-generated or “vibe-coded” interfaces such as excessive gradients, oversized cards, random colors, inconsistent spacing, decorative clutter, and unstructured page layouts.
---

# Hiring Examination UI Design
Build a modern, professional hiring examination interface that feels intentionally designed for an HR operations product. Use shadcn/ui as the component foundation and Tailwind CSS for layout and controlled customization.

## Core stack
Use:

- React with Vite and TypeScript
- Tailwind CSS
- shadcn/ui components
- Lucide React icons
- React Router
- React Hook Form with Zod
- TanStack Table for data-heavy tables
- Recharts only when charts improve decisions
- Firebase Authentication, Firestore, Cloud Functions, and Storage

Read the existing `components.json`, Tailwind configuration, CSS variables, aliases, icon library, and installed shadcn/ui components before generating UI code. Preserve the project's selected shadcn base library and style.

## Design direction
Create an enterprise HR application rather than a landing page or design showcase.

Use these qualities:

- Calm, neutral, and professional visual language
- Strong information hierarchy
- Compact but comfortable density
- Clear page titles, descriptions, actions, and status indicators
- Restrained use of the brand accent color
- Consistent spacing, radii, typography, and borders
- Useful empty, loading, error, success, and disabled states
- Responsive behavior designed deliberately for desktop, tablet, and mobile

Do not create a “vibe-coded” design.

Avoid:

- Random gradients or glowing backgrounds
- Glassmorphism unless explicitly requested
- Excessive shadows and floating panels
- A card around every section
- Very large rounded corners on all elements
- Oversized hero headings inside operational pages
- Decorative blobs, abstract illustrations, or unrelated stock imagery
- Emojis as interface icons
- Random accent colors for each metric
- Inconsistent button styles or spacing values
- Unnecessary animations, hover movement, or bouncing effects
- Dense pages with no hierarchy
- Placeholder text presented as finished content

## shadcn/ui usage rules
Prefer shadcn/ui components over hand-built equivalents when an appropriate component exists.

Use:

- `Button` for actions
- `Input`, `Textarea`, `Label`, `Checkbox`, `RadioGroup`, `Select`, and `Switch` for fields
- shadcn form primitives with React Hook Form and Zod for validated forms
- `Dialog` for focused create or edit flows
- `AlertDialog` for destructive or high-impact confirmation
- `Sheet` for mobile navigation, filters, or secondary detail panels
- `Tabs` for category sections such as Overview, Examination, Applicants, Results, and Settings
- `Table` with TanStack Table for sortable, filterable, paginated datasets
- `Badge` for statuses
- `DropdownMenu` for compact row actions
- `Popover`, `Calendar`, and date-picker composition for schedules
- `Tooltip` for unfamiliar icon-only controls
- `Breadcrumb` for nested staff pages
- `Pagination` for long datasets
- `Progress` for exam completion
- `Skeleton` or `Spinner` for loading states
- `Empty` or a project-level `EmptyState` component for zero-data screens
- `Sonner` for non-blocking feedback
- `Alert` for persistent warnings or failures
- `Separator` to structure related content without adding unnecessary cards
- `Sidebar` for the authenticated staff application shell when appropriate

Do not blindly wrap every component in `Card`. Use cards for distinct summaries or grouped content. Use plain sections, separators, and aligned content rows for the rest.

## Visual system
Use CSS variables and semantic tokens rather than hard-coded colors.

Prefer:

- `bg-background`
- `text-foreground`
- `text-muted-foreground`
- `border-border`
- `bg-muted`
- `bg-card`
- `text-destructive`
- `ring-ring`
- semantic status styles implemented through reusable variants

Keep the main background neutral. Use the primary color for selected navigation, primary actions, progress, links, and important focus states—not for every container.

Use a restrained radius system:

- Small controls: `rounded-md`
- Standard panels and dialogs: `rounded-lg`
- Avoid widespread `rounded-2xl` or `rounded-3xl`

Use subtle borders more often than heavy shadows. Reserve stronger elevation for dialogs, menus, sheets, and sticky layers.

Use a consistent spacing rhythm based on Tailwind's standard scale. Prefer gaps such as `gap-2`, `gap-3`, `gap-4`, `gap-6`, and `gap-8`. Avoid arbitrary pixel values unless required by a measured layout constraint.

## Typography
Use one clean sans-serif family already configured in the project.

Default hierarchy:

- Page title: `text-2xl font-semibold tracking-tight`
- Section title: `text-lg font-semibold`
- Card or panel title: `text-base font-medium`
- Body: `text-sm` or `text-base`
- Supporting text: `text-sm text-muted-foreground`
- Table metadata: `text-xs text-muted-foreground`

Do not use excessive bold text. Use weight, spacing, alignment, and color together to establish hierarchy.

## Application shell
Create a consistent authenticated staff shell with:

- Responsive sidebar
- Organization or system name
- Navigation grouped by function
- Active route state
- Compact top header
- Breadcrumbs when nesting is deeper than one level
- User menu with role and logout action
- Mobile sidebar using `Sheet`

Suggested navigation:

- Dashboard
- Hiring Categories
- Applicants
- Examination Results
- Staff Users, administrator only
- Audit Logs
- Settings

Do not place unrelated global actions in the sidebar. Keep contextual actions in the page header.

## Page-header pattern
Every operational page should have:

1. Breadcrumbs when needed
2. A clear title
3. A one-sentence supporting description
4. One primary action at most
5. Secondary actions in a dropdown or button group
6. Filters below the header, not mixed into the title row

Example structure:

```tsx
<div className="space-y-6">
  <PageHeader
    title="ICT Hiring"
    description="Manage the examination, applicants, and results for this hiring category."
    action={<Button>Create examination</Button>}
  />
  <Tabs>{/* category content */}</Tabs>
</div>
```

## Dashboard pattern
Use dashboard cards only for a small set of decision-relevant metrics.

For a new category, display truthful zero states:

- Total applicants: 0
- Completed exams: 0
- Passed: 0
- Failed: 0
- Average score: 0%
- Pass rate: 0%

Do not render misleading empty charts. Replace charts with a meaningful empty state until sufficient data exists.

Metric cards should include:

- Short label
- Primary value
- Optional supporting context
- One consistent icon style
- No invented growth percentages

Use charts only for trends or distributions that cannot be understood faster in a table or summary.

## Hiring-category pages
Use category tabs:

- Overview
- Examination
- Applicants
- Results
- Settings

Keep the category identity visible in the page header. Display availability status, position, department, and schedule as concise metadata rather than separate decorative cards.

For a category with no applicants, use a centered but compact empty state with one clear action or explanation. Do not fill the page with placeholder charts.

## Examination builder
Design the examination builder as a focused editor.

Use:

- Sticky top action bar for Save draft, Preview, and Publish
- Question list with clear numbering
- One expanded question editor at a time when space is limited
- Reorder handle with accessible keyboard alternative
- `Textarea` for the question
- Reusable option rows with radio selection for the correct answer
- Add option and remove option controls
- Point-value field
- Validation summary before publishing
- Progress such as `8 of 10 questions complete`

Do not show the correct-answer control to applicants.

For destructive actions such as deleting a question or unpublishing an exam, use `AlertDialog`.

## Public examination link
After publishing, show a share panel with:

- Examination title
- Public URL
- Examination code
- Open or closed status
- Opening and closing schedule
- Time limit
- Copy link action
- Open public page action
- QR-code action when implemented
- Close or reopen examination action

Use an `Input` or read-only field for the URL with an adjacent copy button. Provide immediate feedback using Sonner.

Keep the same public link when an exam is closed and reopened.

## Applicant registration page
Make the public page simpler than the staff application.

Use a centered content column with a practical maximum width. Do not use the staff sidebar.

Before showing questions, require:

- Full name
- Contact number
- Email address
- Consent checkbox

Display the examination title, position, number of questions, time limit, availability, and concise instructions above the form.

Use clear validation messages below each field. Disable Start Examination until all required fields are valid and consent is selected.

When the examination is closed, scheduled, or expired, replace the form with a status message and relevant schedule information. Do not merely disable the submit button without explaining why.

## Applicant exam-taking page
Prioritize focus and readability.

Use:

- Compact exam header
- Visible remaining time
- Progress indicator
- Current question number
- Question text
- Large, accessible answer targets
- Previous and Next actions
- Question navigator on desktop
- Sheet-based navigator on mobile
- Submit Examination action separated from ordinary navigation

Keep the timer sticky and visible. Use warning styling at five minutes and destructive styling near expiration, but do not animate aggressively.

Ensure answers remain clear at 200% zoom and on narrow mobile screens.

Use a confirmation dialog before manual submission. When time expires, communicate automatic submission clearly.

## Results page
Display:

- Applicant name
- Examination and category
- Score and total possible score
- Percentage
- Passed or failed status
- Completion date and time
- Result reference number
- Download PDF action

Use one prominent result summary. Do not use confetti or celebratory effects unless explicitly requested. Passing and failing states should remain professional and respectful.

If automatic PDF download is blocked, keep a visible manual download button and explain the next step.

## Data tables
Build reusable data tables with TanStack Table and shadcn `Table`.

Support only useful controls:

- Search
- Relevant filters
- Sorting
- Pagination
- Column visibility when datasets are wide
- Row actions

Keep desktop tables readable. On mobile, either:

- Preserve horizontal scrolling with important columns first, or
- Render a deliberately designed compact row/card representation

Do not simply hide critical applicant data on mobile.

Use status badges consistently:

- Draft: neutral
- Open or Passed: positive
- Scheduled or In Progress: informational
- Closed or Expired: muted or warning
- Failed or Disqualified: destructive

Never rely on color alone; include text labels and icons when useful.

## Forms
Use React Hook Form and Zod.

Every form must include:

- Visible labels
- Helpful descriptions only when needed
- Inline validation
- Disabled and submitting states
- Server-error handling
- Unsaved-change protection for long editors
- Confirmation for destructive or irreversible actions

Use dialogs only for short forms. Use full pages or sheets for complex forms with many sections.

## Responsive behavior
Design desktop and mobile intentionally.

Desktop:

- Use a persistent sidebar
- Allow dense tables and split panes where useful
- Keep key page actions visible

Tablet:

- Collapse secondary panels
- Preserve readable content widths
- Move filters into a sheet when the toolbar wraps poorly

Mobile:

- Use a sheet-based navigation menu
- Stack page-header actions
- Keep primary buttons full width only where it improves task completion
- Avoid fixed-width dialogs wider than the viewport
- Keep tap targets at least comfortably touchable
- Prevent horizontal page overflow

Do not treat responsive design as merely adding `md:` classes after desktop implementation. Specify how each complex component changes across breakpoints.

## Accessibility
Meet these minimum requirements:

- Use semantic HTML
- Associate labels and controls
- Preserve visible focus rings
- Support keyboard navigation
- Provide accessible names for icon-only buttons
- Use `aria-live` for important timer or submission messages when appropriate
- Ensure dialogs and sheets manage focus correctly
- Do not communicate status through color alone
- Maintain sufficient contrast
- Respect reduced-motion preferences

Use Lucide icons with text for unfamiliar actions. Use icon-only buttons only when the meaning is conventional and a tooltip or accessible label is present.

## Interaction states
Implement all relevant states before calling a page complete:

- Initial loading
- Background refresh
- Empty
- Populated
- Validation error
- Server error
- Permission denied
- Offline or interrupted connection
- Disabled
- Submitting
- Success
- Closed exam
- Scheduled exam
- Expired exam
- Timer warning
- Timer expired

Do not leave raw Firebase errors visible. Convert them into concise user-facing messages.

## Code organization
Prefer reusable product-level components such as:

- `AppSidebar`
- `AppHeader`
- `PageHeader`
- `StatCard`
- `EmptyState`
- `DataTable`
- `StatusBadge`
- `FilterBar`
- `CategoryTabs`
- `QuestionEditor`
- `ExamAvailabilityPanel`
- `ExamTimer`
- `QuestionNavigator`
- `ApplicantRegistrationForm`
- `ResultSummary`
- `PdfDownloadButton`

Keep primitive shadcn components in `src/components/ui`. Put composed application components in domain or shared component folders. Do not heavily modify primitive files unless project-wide behavior requires it.

## Implementation workflow
Follow this sequence:

1. Inspect the existing project structure, `components.json`, installed shadcn components, theme variables, and routing.
2. Map the page's information hierarchy and primary user task.
3. Select existing shadcn primitives before building custom controls.
4. Define reusable variants for statuses, buttons, badges, and panels.
5. Implement the desktop structure.
6. Define and implement tablet and mobile transformations.
7. Add loading, empty, error, validation, disabled, and success states.
8. Test keyboard navigation and focus behavior.
9. Review the screen for visual consistency and remove decorative clutter.
10. Verify the page against the quality gate below.

## Quality gate
Do not consider the UI complete unless all answers are yes:

- Does the page have one obvious primary task?
- Is the information hierarchy understandable within a few seconds?
- Are shadcn components composed rather than unnecessarily recreated?
- Are spacing and typography consistent?
- Are colors semantic and restrained?
- Are cards used only for meaningful grouping?
- Are all important states implemented?
- Does the layout work at mobile, tablet, and desktop widths?
- Are forms accessible and validated?
- Are destructive actions confirmed?
- Are tables usable with realistic data?
- Are empty states honest and useful?
- Does the result look like a deliberate HR product rather than an AI template?
- Are correct examination answers and privileged Firebase operations kept out of applicant-facing code?

## Output expectations
When generating code:

- Produce complete TypeScript components, not pseudocode
- Include imports
- Use project aliases consistently
- Reuse installed components
- State any new shadcn components or packages that must be added
- Avoid inline styles
- Avoid unexplained arbitrary Tailwind values
- Keep components reasonably sized and extract repeated patterns
- Preserve existing business logic and Firebase security boundaries

When generating a UI specification instead of code, include:

- Page purpose
- Information hierarchy
- Desktop layout
- Mobile behavior
- shadcn component mapping
- Interaction states
- Accessibility notes
- Acceptance criteria
