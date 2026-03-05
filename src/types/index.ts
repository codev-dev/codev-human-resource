// ============================================================================
// HCM Application — Core Type Definitions
// ============================================================================

// ---------------------------------------------------------------------------
// User & Authentication
// ---------------------------------------------------------------------------

export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  password: string; // plain text for prototype
  name: string;
  role: UserRole;
  department: string;
  isLocked: boolean;
}

// ---------------------------------------------------------------------------
// Employee
// ---------------------------------------------------------------------------

export interface Employee {
  id: string;
  employeeId: string; // e.g. "EMP-001"
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  hireDate: string;
  currentSalary: number;
  status: 'active' | 'inactive' | 'probation';
  supervisorId: string;
  clientId: string;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

export type EvalType = 'regularization' | 'annual';
export type EvalStatus =
  | 'due'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'submitted'
  | 'hr_review'
  | 'approved'
  | 'rejected';
export type QuestionType = 'rating' | 'text' | 'dropdown' | 'yes_no';

export interface EvalQuestion {
  id: string;
  text: string;
  type: QuestionType;
  category: string;
  options?: string[]; // for dropdown
  maxRating?: number; // for rating scale
  weight: number;
}

export interface EvalTemplate {
  id: string;
  name: string;
  type: EvalType;
  questions: EvalQuestion[];
  publicLinkId?: string; // unique slug for shareable public form link
  publicLinkActive?: boolean;
}

// ---------------------------------------------------------------------------
// Public Form Submissions (from shared eval links)
// ---------------------------------------------------------------------------

export interface PublicFormSubmission {
  id: string;
  templateId: string;
  respondentName: string;
  respondentEmail: string;
  respondentEmployeeId?: string;
  answers: EvalAnswer[];
  totalScore: number;
  maxScore: number;
  submittedAt: string;
}

export interface EvalAnswer {
  questionId: string;
  value: string | number | boolean;
  score: number;
}

export interface Evaluation {
  id: string;
  employeeId: string;
  evaluatorId: string;
  templateId: string;
  type: EvalType;
  status: EvalStatus;
  answers: EvalAnswer[];
  totalScore: number;
  maxScore: number;
  dueDate: string;
  startedDate?: string;
  submittedDate?: string;
  reviewedDate?: string;
  reviewerId?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Salary Increase
// ---------------------------------------------------------------------------

export type IncreaseStage =
  | 'initiated'
  | 'client_approval'
  | 'csm_negotiation'
  | 'finance_approval'
  | 'hr_review'
  | 'supervisor_notified'
  | 'payroll_updated';

export type IncreaseStatus = 'pending' | 'approved' | 'rejected';

export interface NegotiationEntry {
  id: string;
  proposedPercentage: number;
  date: string;
  notes: string;
  addedBy: string;
}

export interface StageEntry {
  stage: IncreaseStage;
  status: 'completed' | 'active' | 'pending' | 'blocked';
  enteredDate: string;
  completedDate?: string;
  ownerId?: string;
  ownerName?: string;
}

export interface IncreaseRequest {
  id: string;
  requestId: string; // e.g. "INC-2026-001"
  employeeId: string;
  requestedBy: string;
  currentSalary: number;
  proposedSalary: number;
  increasePercentage: number;
  effectiveDate: string;
  notes: string;
  linkedEvalId?: string;

  // Stage tracking
  currentStage: IncreaseStage;
  stageHistory: StageEntry[];

  // Client approval
  clientApprovalStatus: IncreaseStatus;
  clientApprovalDate?: string;
  clientNotes?: string;

  // CSM Negotiation
  negotiations: NegotiationEntry[];
  agreedPercentage?: number;
  negotiationLocked: boolean;

  // Finance approval
  financeApprovalStatus: IncreaseStatus;
  financeApproverId?: string;
  financeApprovalDate?: string;
  financeComment?: string;

  // HR (Sam) approval
  hrApprovalStatus: IncreaseStatus;
  hrApproverId?: string;
  hrApprovalDate?: string;
  hrComment?: string;

  // Supervisor notification
  supervisorNotified: boolean;
  supervisorNotifiedDate?: string;
  employeeNotifiedDate?: string;

  // Payroll
  payrollSubmitted: boolean;
  payrollSubmittedDate?: string;
  payrollSubmittedBy?: string;
  newSalaryConfirmed?: number;

  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Salary History
// ---------------------------------------------------------------------------

export interface SalaryHistory {
  id: string;
  employeeId: string;
  previousSalary: number;
  newSalary: number;
  increasePercentage: number;
  effectiveDate: string;
  requestId?: string;
}

// ---------------------------------------------------------------------------
// eNPS (Employee Net Promoter Score)
// ---------------------------------------------------------------------------

export interface ENPSSurvey {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  closedAt?: string;
  status: 'active' | 'closed';
}

export interface ENPSInvite {
  id: string;
  surveyId: string;
  employeeEmail: string;
  linkId: string;
  answered: boolean;
  sentAt: string;
  answeredAt?: string;
}

export interface ENPSResponse {
  id: string;
  surveyId: string;
  score: number;
  comment?: string;
  submittedAt: string;
}
