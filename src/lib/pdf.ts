import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface ResultPdfData {
  applicantName: string;
  email: string;
  applicantReferenceNumber?: string;
  categoryName: string;
  positionTitle: string;
  examTitle: string;
  examDate: string;
  rawScore: number;
  totalPoints: number;
  percentage: number;
  result: "passed" | "failed";
  attemptNumber: number;
  resultReferenceNumber: string;
  verificationUrl: string;
}

export async function generateResultPdf(data: ResultPdfData): Promise<{ blob: Blob; filename: string }> {
  const docPdf = new jsPDF({ unit: "pt", format: "a4" });
  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, { margin: 1, width: 160 });

  docPdf.setFontSize(18);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("Hiring Examination Result", 40, 50);

  docPdf.setFontSize(10);
  docPdf.setFont("helvetica", "normal");
  docPdf.text(`Generated: ${new Date().toLocaleString()}`, 40, 68);
  docPdf.line(40, 78, 555, 78);

  let y = 110;
  const row = (label: string, value: string) => {
    docPdf.setFont("helvetica", "bold");
    docPdf.text(`${label}:`, 40, y);
    docPdf.setFont("helvetica", "normal");
    docPdf.text(value, 200, y);
    y += 22;
  };

  row("Applicant Name", data.applicantName);
  row("Email Address", data.email);
  if (data.applicantReferenceNumber) row("Reference Number", data.applicantReferenceNumber);
  row("Hiring Category", data.categoryName);
  row("Position", data.positionTitle);
  row("Examination", data.examTitle);
  row("Examination Date", data.examDate);
  row("Raw Score", `${data.rawScore} out of ${data.totalPoints}`);
  row("Percentage", `${data.percentage}%`);
  row("Result", data.result === "passed" ? "Passed" : "Failed");
  row("Attempt Number", String(data.attemptNumber));
  row("Result Reference No.", data.resultReferenceNumber);

  docPdf.addImage(qrDataUrl, "PNG", 420, 100, 110, 110);
  docPdf.setFontSize(8);
  docPdf.text("Scan to verify", 440, 222);

  const filename = `${data.applicantName.replace(/\s+/g, "-")}_${data.categoryName.replace(/\s+/g, "-")}_Exam-Result.pdf`;
  const blob = docPdf.output("blob");
  return { blob, filename };
}

export interface ApplicantHistoryPdfData {
  applicantName: string;
  email: string;
  applicantReferenceNumber?: string;
  attempts: {
    categoryName: string;
    positionTitle: string;
    percentage: number;
    result: "passed" | "failed";
    examDate: string;
    attemptNumber: number;
  }[];
}

export function generateApplicantHistoryPdf(data: ApplicantHistoryPdfData): { blob: Blob; filename: string } {
  const docPdf = new jsPDF({ unit: "pt", format: "a4" });
  docPdf.setFontSize(18);
  docPdf.setFont("helvetica", "bold");
  docPdf.text("Complete Examination History", 40, 50);
  docPdf.setFontSize(10);
  docPdf.setFont("helvetica", "normal");
  docPdf.text(`${data.applicantName} — ${data.email}`, 40, 68);
  if (data.applicantReferenceNumber) docPdf.text(`Reference: ${data.applicantReferenceNumber}`, 40, 82);
  docPdf.line(40, 92, 555, 92);

  let y = 120;
  const passed = data.attempts.filter((a) => a.result === "passed").length;
  const avg = data.attempts.length
    ? Math.round(data.attempts.reduce((s, a) => s + a.percentage, 0) / data.attempts.length)
    : 0;

  docPdf.text(`Total Examinations: ${data.attempts.length}`, 40, y);
  y += 16;
  docPdf.text(`Passed: ${passed} / Failed: ${data.attempts.length - passed}`, 40, y);
  y += 16;
  docPdf.text(`Overall Average Score: ${avg}%`, 40, y);
  y += 30;

  data.attempts.forEach((attempt, i) => {
    docPdf.setFont("helvetica", "bold");
    docPdf.text(`${i + 1}. ${attempt.categoryName}`, 40, y);
    docPdf.setFont("helvetica", "normal");
    y += 16;
    docPdf.text(
      `Position: ${attempt.positionTitle}  Score: ${attempt.percentage}%  Result: ${attempt.result}  Date: ${attempt.examDate}  Attempt #${attempt.attemptNumber}`,
      56,
      y
    );
    y += 26;
  });

  const filename = `${data.applicantName.replace(/\s+/g, "-")}_Complete-Examination-History.pdf`;
  const blob = docPdf.output("blob");
  return { blob, filename };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
