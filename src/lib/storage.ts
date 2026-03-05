// ============================================================================
// localStorage Persistence Layer
// ============================================================================
//
// Provides generic CRUD operations backed by localStorage. On first load (or
// when a key is missing), the store is seeded from the seed-data module.
// ============================================================================

import type {
  User,
  Employee,
  Evaluation,
  EvalTemplate,
  IncreaseRequest,
  Notification,
  SalaryHistory,
  PublicFormSubmission,
  ENPSSurvey,
  ENPSInvite,
  ENPSResponse,
} from '@/types';

import {
  seedUsers,
  seedEmployees,
  seedEvaluations,
  seedEvalTemplates,
  seedIncreaseRequests,
  seedNotifications,
  seedSalaryHistory,
  seedENPSSurveys,
  seedENPSInvites,
  seedENPSResponses,
} from '@/data/seed-data';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const KEYS = {
  users: 'hcm_users',
  employees: 'hcm_employees',
  evaluations: 'hcm_evaluations',
  evalTemplates: 'hcm_eval_templates',
  increaseRequests: 'hcm_increase_requests',
  notifications: 'hcm_notifications',
  salaryHistory: 'hcm_salary_history',
  publicSubmissions: 'hcm_public_submissions',
  enpsSurveys: 'hcm_enps_surveys',
  enpsInvites: 'hcm_enps_invites',
  enpsResponses: 'hcm_enps_responses',
} as const;

type StorageKey = (typeof KEYS)[keyof typeof KEYS];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function read<T>(key: StorageKey): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    console.error(`[storage] Failed to parse key "${key}". Returning empty array.`);
    return [];
  }
}

function write<T>(key: StorageKey, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Generic CRUD
// ---------------------------------------------------------------------------

export function getAll<T>(key: StorageKey): T[] {
  return read<T>(key);
}

export function getById<T extends { id: string }>(key: StorageKey, id: string): T | undefined {
  return read<T>(key).find((item) => item.id === id);
}

export function create<T extends { id: string }>(key: StorageKey, item: T): T {
  const items = read<T>(key);
  items.push(item);
  write(key, items);
  return item;
}

export function update<T extends { id: string }>(key: StorageKey, id: string, partial: Partial<T>): T | undefined {
  const items = read<T>(key);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return undefined;
  items[index] = { ...items[index], ...partial };
  write(key, items);
  return items[index];
}

export function remove(key: StorageKey, id: string): boolean {
  const items = read<{ id: string }>(key);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return false;
  items.splice(index, 1);
  write(key, items);
  return true;
}

// ---------------------------------------------------------------------------
// Initialization — seed data if localStorage is empty
// ---------------------------------------------------------------------------

function seedIfMissing<T>(key: StorageKey, data: T[]): void {
  if (!localStorage.getItem(key)) {
    write(key, data);
  }
}

export function initializeData(): void {
  seedIfMissing<User>(KEYS.users, seedUsers);
  seedIfMissing<Employee>(KEYS.employees, seedEmployees);
  seedIfMissing<Evaluation>(KEYS.evaluations, seedEvaluations);
  seedIfMissing<EvalTemplate>(KEYS.evalTemplates, seedEvalTemplates);
  seedIfMissing<IncreaseRequest>(KEYS.increaseRequests, seedIncreaseRequests);
  seedIfMissing<Notification>(KEYS.notifications, seedNotifications);
  seedIfMissing<SalaryHistory>(KEYS.salaryHistory, seedSalaryHistory);
  seedIfMissing<ENPSSurvey>(KEYS.enpsSurveys, seedENPSSurveys);
  seedIfMissing<ENPSInvite>(KEYS.enpsInvites, seedENPSInvites);
  seedIfMissing<ENPSResponse>(KEYS.enpsResponses, seedENPSResponses);
}

/**
 * Completely wipe all HCM data from localStorage and re-seed. Useful for
 * resetting the demo back to its original state.
 */
export function resetData(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  initializeData();
}

// ---------------------------------------------------------------------------
// Typed convenience accessors
// ---------------------------------------------------------------------------

export const storage = {
  // Users
  getUsers: () => getAll<User>(KEYS.users),
  getUser: (id: string) => getById<User>(KEYS.users, id),
  createUser: (user: User) => create(KEYS.users, user),
  updateUser: (id: string, data: Partial<User>) => update<User>(KEYS.users, id, data),
  removeUser: (id: string) => remove(KEYS.users, id),

  // Employees
  getEmployees: () => getAll<Employee>(KEYS.employees),
  getEmployee: (id: string) => getById<Employee>(KEYS.employees, id),
  createEmployee: (emp: Employee) => create(KEYS.employees, emp),
  updateEmployee: (id: string, data: Partial<Employee>) => update<Employee>(KEYS.employees, id, data),
  removeEmployee: (id: string) => remove(KEYS.employees, id),

  // Evaluations
  getEvaluations: () => getAll<Evaluation>(KEYS.evaluations),
  getEvaluation: (id: string) => getById<Evaluation>(KEYS.evaluations, id),
  createEvaluation: (ev: Evaluation) => create(KEYS.evaluations, ev),
  updateEvaluation: (id: string, data: Partial<Evaluation>) => update<Evaluation>(KEYS.evaluations, id, data),
  removeEvaluation: (id: string) => remove(KEYS.evaluations, id),

  // Eval Templates
  getEvalTemplates: () => getAll<EvalTemplate>(KEYS.evalTemplates),
  getEvalTemplate: (id: string) => getById<EvalTemplate>(KEYS.evalTemplates, id),
  createEvalTemplate: (tmpl: EvalTemplate) => create(KEYS.evalTemplates, tmpl),
  updateEvalTemplate: (id: string, data: Partial<EvalTemplate>) => update<EvalTemplate>(KEYS.evalTemplates, id, data),
  removeEvalTemplate: (id: string) => remove(KEYS.evalTemplates, id),

  // Increase Requests
  getIncreaseRequests: () => getAll<IncreaseRequest>(KEYS.increaseRequests),
  getIncreaseRequest: (id: string) => getById<IncreaseRequest>(KEYS.increaseRequests, id),
  createIncreaseRequest: (req: IncreaseRequest) => create(KEYS.increaseRequests, req),
  updateIncreaseRequest: (id: string, data: Partial<IncreaseRequest>) =>
    update<IncreaseRequest>(KEYS.increaseRequests, id, data),
  removeIncreaseRequest: (id: string) => remove(KEYS.increaseRequests, id),

  // Notifications
  getNotifications: () => getAll<Notification>(KEYS.notifications),
  getNotification: (id: string) => getById<Notification>(KEYS.notifications, id),
  createNotification: (n: Notification) => create(KEYS.notifications, n),
  updateNotification: (id: string, data: Partial<Notification>) => update<Notification>(KEYS.notifications, id, data),
  removeNotification: (id: string) => remove(KEYS.notifications, id),

  // Salary History
  getSalaryHistory: () => getAll<SalaryHistory>(KEYS.salaryHistory),
  getSalaryHistoryById: (id: string) => getById<SalaryHistory>(KEYS.salaryHistory, id),
  createSalaryHistory: (sh: SalaryHistory) => create(KEYS.salaryHistory, sh),
  updateSalaryHistory: (id: string, data: Partial<SalaryHistory>) =>
    update<SalaryHistory>(KEYS.salaryHistory, id, data),
  removeSalaryHistory: (id: string) => remove(KEYS.salaryHistory, id),

  // Public Form Submissions
  getPublicSubmissions: () => getAll<PublicFormSubmission>(KEYS.publicSubmissions),
  getPublicSubmission: (id: string) => getById<PublicFormSubmission>(KEYS.publicSubmissions, id),
  createPublicSubmission: (sub: PublicFormSubmission) => create(KEYS.publicSubmissions, sub),
  removePublicSubmission: (id: string) => remove(KEYS.publicSubmissions, id),

  // eNPS Surveys
  getENPSSurveys: () => getAll<ENPSSurvey>(KEYS.enpsSurveys),
  getENPSSurvey: (id: string) => getById<ENPSSurvey>(KEYS.enpsSurveys, id),
  createENPSSurvey: (s: ENPSSurvey) => create(KEYS.enpsSurveys, s),
  updateENPSSurvey: (id: string, data: Partial<ENPSSurvey>) => update<ENPSSurvey>(KEYS.enpsSurveys, id, data),
  removeENPSSurvey: (id: string) => remove(KEYS.enpsSurveys, id),

  // eNPS Invites
  getENPSInvites: () => getAll<ENPSInvite>(KEYS.enpsInvites),
  getENPSInvite: (id: string) => getById<ENPSInvite>(KEYS.enpsInvites, id),
  createENPSInvite: (inv: ENPSInvite) => create(KEYS.enpsInvites, inv),
  updateENPSInvite: (id: string, data: Partial<ENPSInvite>) => update<ENPSInvite>(KEYS.enpsInvites, id, data),
  removeENPSInvite: (id: string) => remove(KEYS.enpsInvites, id),

  // eNPS Responses
  getENPSResponses: () => getAll<ENPSResponse>(KEYS.enpsResponses),
  getENPSResponse: (id: string) => getById<ENPSResponse>(KEYS.enpsResponses, id),
  createENPSResponse: (r: ENPSResponse) => create(KEYS.enpsResponses, r),
  removeENPSResponse: (id: string) => remove(KEYS.enpsResponses, id),
} as const;

export { KEYS };
