import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Loader2, CheckCircle } from 'lucide-react';
import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Field,
  FieldLabel,
  FieldError,
} from '@/components/ui/field';
import type { Employee } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateEmployeeId(): string {
  const employees = storage.getEmployees();
  const maxNum = employees.reduce((max, emp) => {
    const match = emp.employeeId.match(/^EMP-(\d+)$/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
}

function generateId(): string {
  return `emp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department: string;
  position: string;
  hireDate: string;
  currentSalary: string;
  status: Employee['status'];
  supervisorId: string;
  clientId: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
  position?: string;
  hireDate?: string;
  currentSalary?: string;
  supervisorId?: string;
}

const DEPARTMENTS = ['Engineering', 'Design', 'Marketing', 'Finance', 'Operations', 'Human Resources', 'Client Services'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddEmployeePage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const users = useMemo(() => storage.getUsers(), []);

  // Redirect non-admin
  if (currentUser?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/employees')}>
          <ArrowLeft className="size-4" data-icon="inline-start" />
          Back to Employees
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Access Denied</p>
            <p className="mt-1 text-sm text-muted-foreground">Only administrators can add new employees.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // State
  const [form, setForm] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    employeeId: generateEmployeeId(),
    department: '',
    position: '',
    hireDate: '',
    currentSalary: '',
    status: 'active',
    supervisorId: '',
    clientId: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }, []);

  const validate = useCallback((): FormErrors => {
    const errs: FormErrors = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required.';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required.';
    if (!form.email.trim()) {
      errs.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!form.department) errs.department = 'Department is required.';
    if (!form.position.trim()) errs.position = 'Position is required.';
    if (!form.hireDate) errs.hireDate = 'Hire date is required.';
    if (!form.currentSalary || Number(form.currentSalary) <= 0) {
      errs.currentSalary = 'Please enter a valid salary amount.';
    }
    if (!form.supervisorId) errs.supervisorId = 'Supervisor is required.';
    return errs;
  }, [form]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const errs = validate();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }

      setIsSubmitting(true);

      // Simulate brief loading for UX feedback
      setTimeout(() => {
        const newEmployee: Employee = {
          id: generateId(),
          employeeId: form.employeeId,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          department: form.department,
          position: form.position.trim(),
          hireDate: form.hireDate,
          currentSalary: Number(form.currentSalary),
          status: form.status,
          supervisorId: form.supervisorId,
          clientId: form.clientId.trim(),
        };

        storage.createEmployee(newEmployee);
        setIsSubmitting(false);
        setSuccess(true);

        // Redirect after brief success state
        setTimeout(() => {
          navigate(`/employees/${newEmployee.id}`);
        }, 1000);
      }, 400);
    },
    [form, validate, navigate]
  );

  if (success) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center space-y-3">
          <CheckCircle className="mx-auto size-12 text-emerald-500" />
          <p className="text-lg font-semibold">Employee Created Successfully</p>
          <p className="text-sm text-muted-foreground">Redirecting to employee profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="w-fit -ml-2" onClick={() => navigate('/employees')}>
        <ArrowLeft className="size-4" data-icon="inline-start" />
        Back to Employees
      </Button>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <UserPlus className="size-6 text-primary" />
          Add Employee
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Create a new employee record in the system.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
            <CardDescription>Fill in the details below. Fields marked with * are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* First Name */}
              <Field data-invalid={!!errors.firstName}>
                <FieldLabel htmlFor="firstName">First Name *</FieldLabel>
                <Input
                  id="firstName"
                  placeholder="e.g. Alex"
                  value={form.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
              </Field>

              {/* Last Name */}
              <Field data-invalid={!!errors.lastName}>
                <FieldLabel htmlFor="lastName">Last Name *</FieldLabel>
                <Input
                  id="lastName"
                  placeholder="e.g. Reyes"
                  value={form.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
              </Field>

              {/* Email */}
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email *</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. alex.reyes@opscorp.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  aria-invalid={!!errors.email}
                />
                {errors.email && <FieldError>{errors.email}</FieldError>}
              </Field>

              {/* Employee ID - auto-generated */}
              <Field>
                <FieldLabel htmlFor="employeeId">Employee ID</FieldLabel>
                <Input
                  id="employeeId"
                  value={form.employeeId}
                  disabled
                  className="opacity-60"
                />
              </Field>

              {/* Department */}
              <Field data-invalid={!!errors.department}>
                <FieldLabel>Department *</FieldLabel>
                <Select
                  value={form.department}
                  onValueChange={(v) => updateField('department', v)}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.department}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.department && <FieldError>{errors.department}</FieldError>}
              </Field>

              {/* Position */}
              <Field data-invalid={!!errors.position}>
                <FieldLabel htmlFor="position">Position *</FieldLabel>
                <Input
                  id="position"
                  placeholder="e.g. Senior Developer"
                  value={form.position}
                  onChange={(e) => updateField('position', e.target.value)}
                  aria-invalid={!!errors.position}
                />
                {errors.position && <FieldError>{errors.position}</FieldError>}
              </Field>

              {/* Hire Date */}
              <Field data-invalid={!!errors.hireDate}>
                <FieldLabel htmlFor="hireDate">Hire Date *</FieldLabel>
                <Input
                  id="hireDate"
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => updateField('hireDate', e.target.value)}
                  aria-invalid={!!errors.hireDate}
                />
                {errors.hireDate && <FieldError>{errors.hireDate}</FieldError>}
              </Field>

              {/* Starting Salary */}
              <Field data-invalid={!!errors.currentSalary}>
                <FieldLabel htmlFor="salary">Starting Salary (USD) *</FieldLabel>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g. 65000"
                  value={form.currentSalary}
                  onChange={(e) => updateField('currentSalary', e.target.value)}
                  aria-invalid={!!errors.currentSalary}
                />
                {errors.currentSalary && <FieldError>{errors.currentSalary}</FieldError>}
              </Field>

              {/* Status */}
              <Field>
                <FieldLabel>Status</FieldLabel>
                <Select
                  value={form.status}
                  onValueChange={(v) => updateField('status', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="probation">Probation</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {/* Supervisor */}
              <Field data-invalid={!!errors.supervisorId}>
                <FieldLabel>Supervisor *</FieldLabel>
                <Select
                  value={form.supervisorId}
                  onValueChange={(v) => updateField('supervisorId', v)}
                >
                  <SelectTrigger className="w-full" aria-invalid={!!errors.supervisorId}>
                    <SelectValue placeholder="Select supervisor" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.department})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.supervisorId && <FieldError>{errors.supervisorId}</FieldError>}
              </Field>

              {/* Client ID */}
              <Field>
                <FieldLabel htmlFor="clientId">Client ID</FieldLabel>
                <Input
                  id="clientId"
                  placeholder="e.g. client-acme"
                  value={form.clientId}
                  onChange={(e) => updateField('clientId', e.target.value)}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/employees')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="size-4" data-icon="inline-start" />
                Create Employee
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AddEmployeePage;
