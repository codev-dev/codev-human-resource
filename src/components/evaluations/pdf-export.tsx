// ============================================================================
// PDF Export Component (Stories 6.1-6.4)
// ============================================================================
//
// Generates a professional PDF report for completed/approved evaluations using
// jspdf and jspdf-autotable.
// ============================================================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import type { Evaluation, Employee, EvalTemplate, User } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PdfExportProps {
  evaluation: Evaluation;
  employee: Employee;
  template: EvalTemplate;
  evaluator?: User;
  reviewer?: User;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getRatingLabel(percentage: number): string {
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 75) return 'Good';
  if (percentage >= 60) return 'Needs Improvement';
  return 'Poor';
}

function formatEvalType(type: string): string {
  return type === 'regularization' ? 'Regularization' : 'Annual';
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAnswerValue(value: string | number | boolean): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------

async function generatePdf({
  evaluation,
  employee,
  template,
  evaluator,
  reviewer,
}: PdfExportProps): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default;

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ---- Colors ----
  const primaryColor: [number, number, number] = [180, 60, 30];
  const darkGray: [number, number, number] = [51, 51, 51];
  const medGray: [number, number, number] = [120, 120, 120];
  const lightBg: [number, number, number] = [245, 245, 245];

  // ---- Header (Story 6.3) ----
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('CoDev HRM', margin, 16);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Performance Evaluation Report', margin, 26);

  doc.setFontSize(9);
  doc.text(formatDate(new Date().toISOString()), pageWidth - margin, 26, { align: 'right' });

  y = 46;

  // ---- Eval Title ----
  doc.setTextColor(...darkGray);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(template.name, margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...medGray);
  doc.text(`${formatEvalType(evaluation.type)} Evaluation  |  Status: ${formatStatus(evaluation.status)}`, margin, y);
  y += 10;

  // ---- Employee Info Section ----
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'F');

  doc.setTextColor(...darkGray);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const empInfoLeft = [
    `Name: ${employee.firstName} ${employee.lastName}`,
    `Employee ID: ${employee.employeeId}`,
    `Department: ${employee.department}`,
  ];
  const empInfoRight = [
    `Position: ${employee.position}`,
    `Hire Date: ${formatDate(employee.hireDate)}`,
    `Status: ${employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}`,
  ];

  empInfoLeft.forEach((line, i) => {
    doc.text(line, margin + 4, y + 14 + i * 5);
  });
  empInfoRight.forEach((line, i) => {
    doc.text(line, margin + contentWidth / 2, y + 14 + i * 5);
  });

  y += 38;

  // ---- Evaluation Info Section ----
  doc.setFillColor(...lightBg);
  doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Evaluation Details', margin + 4, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const evalInfoLeft = [
    `Evaluator: ${evaluator?.name ?? 'Unknown'}`,
    `Submitted: ${formatDate(evaluation.submittedDate)}`,
  ];
  const evalInfoRight = [
    `Reviewer: ${reviewer?.name ?? 'N/A'}`,
    `Reviewed: ${formatDate(evaluation.reviewedDate)}`,
  ];

  evalInfoLeft.forEach((line, i) => {
    doc.text(line, margin + 4, y + 14 + i * 5);
  });
  evalInfoRight.forEach((line, i) => {
    doc.text(line, margin + contentWidth / 2, y + 14 + i * 5);
  });

  y += 28;

  // ---- Score Summary ----
  const percentage = evaluation.maxScore > 0
    ? Math.round((evaluation.totalScore / evaluation.maxScore) * 100)
    : 0;
  const ratingLabel = getRatingLabel(percentage);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  doc.text('Overall Score', margin, y + 5);

  // Score bar background
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(margin + 30, y + 1, 80, 5, 2, 2, 'F');

  // Score bar fill
  const barColor: [number, number, number] =
    percentage >= 90 ? [16, 185, 129] :
    percentage >= 75 ? [59, 130, 246] :
    percentage >= 60 ? [245, 158, 11] :
    [239, 68, 68];
  doc.setFillColor(...barColor);
  doc.roundedRect(margin + 30, y + 1, Math.max((percentage / 100) * 80, 2), 5, 2, 2, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`${percentage}%`, margin + 115, y + 5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...medGray);
  doc.text(`${evaluation.totalScore} / ${evaluation.maxScore}  (${ratingLabel})`, margin + 128, y + 5);

  y += 14;

  // ---- Scores by Category (autoTable) ----
  const categories = [...new Set(template.questions.map((q) => q.category))];

  for (const category of categories) {
    const categoryQuestions = template.questions.filter((q) => q.category === category);
    const tableBody: (string | number)[][] = [];

    for (const question of categoryQuestions) {
      const answer = evaluation.answers.find((a) => a.questionId === question.id);
      const answerText = answer ? formatAnswerValue(answer.value) : 'N/A';
      const score = answer ? answer.score : 0;
      const maxForQuestion = question.weight;

      tableBody.push([question.text, answerText, `${score}`, `${maxForQuestion}`]);
    }

    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text(category, margin, y + 4);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Question', 'Answer', 'Score', 'Max']],
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: darkGray,
      },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.5 },
        1: { cellWidth: contentWidth * 0.25 },
        2: { cellWidth: contentWidth * 0.12, halign: 'center' },
        3: { cellWidth: contentWidth * 0.13, halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable?.finalY + 6 ?? y + 30;
  }

  // ---- Summary Section ----
  if (y > 250) {
    doc.addPage();
    y = margin;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...darkGray);
  doc.text('Summary', margin, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Total Score: ${evaluation.totalScore} / ${evaluation.maxScore}`, margin, y);
  y += 5;
  doc.text(`Percentage: ${percentage}%`, margin, y);
  y += 5;
  doc.text(`Rating: ${ratingLabel}`, margin, y);
  y += 5;
  doc.text(`Status: ${formatStatus(evaluation.status)}`, margin, y);
  y += 5;

  if (evaluation.rejectionReason) {
    y += 3;
    doc.setTextColor(200, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.text('Rejection Reason:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const splitReason = doc.splitTextToSize(evaluation.rejectionReason, contentWidth);
    doc.text(splitReason, margin, y);
    y += splitReason.length * 4 + 3;
  }

  // ---- Signature Block (Story 6.3) ----
  if (y > 240) {
    doc.addPage();
    y = margin;
  }

  y += 10;

  doc.setTextColor(...darkGray);
  doc.setDrawColor(100, 100, 100);

  // Evaluator signature
  doc.line(margin, y + 10, margin + 65, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Evaluator Signature', margin, y + 15);
  doc.text(evaluator?.name ?? 'N/A', margin, y + 20);
  doc.text(`Date: ${formatDate(evaluation.submittedDate)}`, margin, y + 25);

  // Approver signature
  doc.line(pageWidth - margin - 65, y + 10, pageWidth - margin, y + 10);
  doc.text('Approver Signature', pageWidth - margin - 65, y + 15);
  doc.text(reviewer?.name ?? 'N/A', pageWidth - margin - 65, y + 20);
  doc.text(`Date: ${formatDate(evaluation.reviewedDate)}`, pageWidth - margin - 65, y + 25);

  // ---- Footer ----
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...medGray);
    doc.text(
      `CoDev HRM  |  Confidential  |  Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' },
    );
  }

  // ---- Download ----
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`Evaluation_${employee.employeeId}_${dateStr}.pdf`);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PdfExportButton(props: PdfExportProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const canExport = ['approved', 'rejected', 'completed'].includes(props.evaluation.status);

  if (!canExport) return null;

  async function handleExport() {
    setIsGenerating(true);
    try {
      await generatePdf(props);
    } catch (error) {
      console.error('[PdfExport] Failed to generate PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isGenerating}>
      {isGenerating ? (
        <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
      ) : (
        <FileDown className="size-4" data-icon="inline-start" />
      )}
      {isGenerating ? 'Generating...' : 'Export to PDF'}
    </Button>
  );
}

export default PdfExportButton;
