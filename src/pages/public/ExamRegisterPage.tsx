import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import { applicantRegistrationSchema, type ApplicantRegistrationInput } from "@/lib/validation";
import { getPublicExamInformation, registerAndStartAttempt } from "@/services/applicant.service";
import type { PublicExamInformation } from "@/types";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/Misc";
import { PublicExamHeader } from "@/components/common/PublicExamHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ExamRegisterPage() {
  const { publicCode } = useParams();
  const navigate = useNavigate();
  const [info, setInfo] = useState<PublicExamInformation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, dirtyFields, isSubmitted, isSubmitting },
  } = useForm<ApplicantRegistrationInput>({
    resolver: zodResolver(applicantRegistrationSchema),
    mode: "onChange",
    defaultValues: { fullName: "", contactNumber: "", email: "", applicantReferenceNumber: "" },
  });

  useEffect(() => {
    if (!publicCode) return;
    getPublicExamInformation(publicCode)
      .then(setInfo)
      .catch(() => setLoadError("This examination link is invalid or no longer available."))
      .finally(() => setLoading(false));
  }, [publicCode]);

  if (loading) return <LoadingSkeleton />;
  if (loadError || !info) {
    return (
      <div className="mx-auto max-w-md p-8">
        <ErrorState message={loadError ?? "Examination not found."} />
      </div>
    );
  }

  if (info.availabilityStatus === "closed") {
    return (
      <CenteredMessage
        title="This examination is currently closed."
        body="The organization is not accepting new responses for this examination. Please contact the recruitment team for more information."
      />
    );
  }
  if (info.availabilityStatus === "scheduled") {
    return (
      <CenteredMessage
        title="This examination has not opened yet."
        body={info.openingDate ? `It will open on ${new Date(info.openingDate).toLocaleString()}.` : "Please check back later."}
      />
    );
  }
  if (info.availabilityStatus === "expired" || info.availabilityStatus === "archived") {
    return (
      <CenteredMessage
        title="This examination is no longer accepting responses."
        body="Please contact the recruitment team for more information."
      />
    );
  }
  if (info.availabilityStatus === "draft") {
    return <CenteredMessage title="This examination is not yet published." body="Please check back later." />;
  }

  async function onSubmit(values: ApplicantRegistrationInput) {
    setSubmitError(null);
    try {
      const { attemptId } = await registerAndStartAttempt({
        publicCode: publicCode!,
        fullName: values.fullName,
        contactNumber: values.contactNumber,
        email: values.email,
        applicantReferenceNumber: values.applicantReferenceNumber,
      });
      navigate(`/exam/${publicCode}/take/${attemptId}`);
    } catch (e: any) {
      setSubmitError(e?.message ?? "Unable to start the examination. You may have already attempted it.");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center p-4 sm:p-6">
      <Card className="w-full">
        <CardHeader>
          <PublicExamHeader />
          <CardTitle>{info.title}</CardTitle>
          <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
            <p>Number of Questions: {info.questionCount}</p>
            <p>Time Limit: {info.hasTimeLimit ? `${info.durationMinutes} minutes` : "No limit"}</p>
            {info.passingScore != null && <p>Passing Score: {info.passingScore}%</p>}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <Field
              label="Full Name"
              error={(dirtyFields.fullName || isSubmitted) ? errors.fullName?.message : undefined}
              {...register("fullName")}
            />
            <Field
              label="Contact Number"
              error={(dirtyFields.contactNumber || isSubmitted) ? errors.contactNumber?.message : undefined}
              {...register("contactNumber")}
            />
            <Field
              label="Email Address"
              type="email"
              error={(dirtyFields.email || isSubmitted) ? errors.email?.message : undefined}
              {...register("email")}
            />

            <div className="flex items-start gap-2 pt-1">
              <Checkbox
                id="consent"
                checked={watch("consent") === true}
                onCheckedChange={(checked) => setValue("consent", checked === true ? true : (undefined as unknown as true))}
              />
              <Label htmlFor="consent" className="text-sm font-normal leading-snug text-muted-foreground">
                I confirm that the information I provided is correct. I understand that the examination timer will
                begin after I click Start Examination.
              </Label>
            </div>
            {errors.consent && <p className="text-xs text-destructive">{errors.consent.message}</p>}

            {submitError && (
              <Alert variant="destructive">
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Starting..." : "Start Examination"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  error,
  type = "text",
  ...rest
}: { label: string; error?: string; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} {...rest} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CenteredMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <CardContent className="pt-6">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        </CardContent>
      </Card>
    </div>
  );
}
