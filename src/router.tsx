// ============================================================================
// Application Router
// ============================================================================
//
// Defines all routes. Login/forgot-password sit outside the main layout;
// everything else is wrapped in AppLayout with RouteGuard protection.
// ============================================================================

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { RouteGuard } from '@/components/auth/route-guard';

// -- Auth pages (no layout) --------------------------------------------------
import { LoginPage } from '@/pages/login';
import { ForgotPasswordPage } from '@/pages/forgot-password';

// -- Dashboard ----------------------------------------------------------------
import { DashboardPage } from '@/pages/dashboard';

// -- Employees ----------------------------------------------------------------
import { EmployeeListPage } from '@/pages/employees/employee-list';
import { EmployeeProfilePage } from '@/pages/employees/employee-profile';
import { AddEmployeePage } from '@/pages/employees/add-employee';

// -- Evaluations --------------------------------------------------------------
import { EvalDashboardPage } from '@/pages/evaluations/eval-dashboard';
import { EvalDetailPage } from '@/pages/evaluations/eval-detail';
import { EvalFormPage } from '@/pages/evaluations/eval-form';
import { EvalTemplatesPage } from '@/pages/evaluations/eval-templates';

// -- Increase Requests --------------------------------------------------------
import { IncreaseListPage } from '@/pages/increase-requests/increase-list';
import { NewIncreasePage } from '@/pages/increase-requests/new-increase';
import { IncreaseDetailPage } from '@/pages/increase-requests/increase-detail';
import { NegotiationPage } from '@/pages/increase-requests/negotiation';

// -- Approvals ----------------------------------------------------------------
import { FinanceApprovalPage } from '@/pages/approvals/finance-approval';
import { HRApprovalPage } from '@/pages/approvals/hr-approval';

// -- Progress Tracker ---------------------------------------------------------
import { ProgressTrackerPage } from '@/pages/progress-tracker';

// -- Admin --------------------------------------------------------------------
import { UserManagementPage } from '@/pages/admin/user-management';
import { SettingsPage } from '@/pages/admin/settings';

// -- Public pages (no auth) ---------------------------------------------------
import { PublicEvalFormPage } from '@/pages/public/public-eval-form';

// -- Misc ---------------------------------------------------------------------
import { UnauthorizedPage } from '@/pages/unauthorized';

// ---------------------------------------------------------------------------
// Router definition
// ---------------------------------------------------------------------------

export const router = createBrowserRouter([
  // ---- Public routes (outside layout) ----
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  // ---- Public evaluation form (no auth required) ----
  {
    path: '/public/eval/:linkId',
    element: <PublicEvalFormPage />,
  },

  // ---- Protected routes (inside layout) ----
  {
    element: (
      <RouteGuard>
        <AppLayout />
      </RouteGuard>
    ),
    children: [
      // Redirect root to dashboard
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },

      // Employees
      {
        path: 'employees',
        element: <EmployeeListPage />,
      },
      {
        path: 'employees/new',
        element: (
          <RouteGuard allowedRoles={['admin']}>
            <AddEmployeePage />
          </RouteGuard>
        ),
      },
      {
        path: 'employees/:id',
        element: <EmployeeProfilePage />,
      },

      // Evaluations
      {
        path: 'evaluations',
        element: <EvalDashboardPage />,
      },
      {
        path: 'evaluations/templates',
        element: (
          <RouteGuard allowedRoles={['admin']}>
            <EvalTemplatesPage />
          </RouteGuard>
        ),
      },
      {
        path: 'evaluations/:id',
        element: <EvalDetailPage />,
      },
      {
        path: 'evaluations/:id/form',
        element: (
          <RouteGuard allowedRoles={['admin', 'editor']}>
            <EvalFormPage />
          </RouteGuard>
        ),
      },

      // Increase Requests
      {
        path: 'increase-requests',
        element: <IncreaseListPage />,
      },
      {
        path: 'increase-requests/new',
        element: (
          <RouteGuard allowedRoles={['admin', 'editor']}>
            <NewIncreasePage />
          </RouteGuard>
        ),
      },
      {
        path: 'increase-requests/:id',
        element: <IncreaseDetailPage />,
      },
      {
        path: 'increase-requests/:id/negotiate',
        element: (
          <RouteGuard allowedRoles={['admin', 'editor']}>
            <NegotiationPage />
          </RouteGuard>
        ),
      },

      // Approvals
      {
        path: 'approvals/finance',
        element: (
          <RouteGuard allowedRoles={['admin', 'editor']}>
            <FinanceApprovalPage />
          </RouteGuard>
        ),
      },
      {
        path: 'approvals/hr',
        element: (
          <RouteGuard allowedRoles={['admin']}>
            <HRApprovalPage />
          </RouteGuard>
        ),
      },

      // Progress Tracker
      {
        path: 'progress-tracker',
        element: <ProgressTrackerPage />,
      },

      // Admin
      {
        path: 'admin/users',
        element: (
          <RouteGuard allowedRoles={['admin']}>
            <UserManagementPage />
          </RouteGuard>
        ),
      },
      {
        path: 'admin/settings',
        element: (
          <RouteGuard allowedRoles={['admin']}>
            <SettingsPage />
          </RouteGuard>
        ),
      },

      // Unauthorized
      {
        path: 'unauthorized',
        element: <UnauthorizedPage />,
      },
    ],
  },

  // Catch-all redirect
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
