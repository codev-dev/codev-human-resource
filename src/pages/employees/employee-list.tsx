import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Briefcase,
  Mail,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { storage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';
import { ReadOnlyBanner } from '@/components/auth/read-only-banner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Employee } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortField = 'employeeId' | 'name' | 'department' | 'position' | 'status' | 'hireDate' | 'currentSalary';
type SortDir = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<Employee['status'], { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400',
  },
  probation: {
    label: 'Probation',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getFullName(emp: Employee): string {
  return `${emp.firstName} ${emp.lastName}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmployeeListPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = currentUser?.role === 'admin';
  const isViewer = currentUser?.role === 'viewer';

  // Data
  const employees = useMemo(() => storage.getEmployees(), []);

  // Derived filter options
  const departments = useMemo(() => [...new Set(employees.map((e) => e.department))].sort(), [employees]);
  const positions = useMemo(() => [...new Set(employees.map((e) => e.position))].sort(), [employees]);

  // State
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('employeeId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Filter + search + sort
  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    let result = employees.filter((emp) => {
      if (query) {
        const matchesSearch =
          getFullName(emp).toLowerCase().includes(query) ||
          emp.employeeId.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      if (filterDept !== 'all' && emp.department !== filterDept) return false;
      if (filterStatus !== 'all' && emp.status !== filterStatus) return false;
      if (filterPosition !== 'all' && emp.position !== filterPosition) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'employeeId':
          cmp = a.employeeId.localeCompare(b.employeeId);
          break;
        case 'name':
          cmp = getFullName(a).localeCompare(getFullName(b));
          break;
        case 'department':
          cmp = a.department.localeCompare(b.department);
          break;
        case 'position':
          cmp = a.position.localeCompare(b.position);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'hireDate':
          cmp = new Date(a.hireDate).getTime() - new Date(b.hireDate).getTime();
          break;
        case 'currentSalary':
          cmp = a.currentSalary - b.currentSalary;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [employees, search, filterDept, filterStatus, filterPosition, sortField, sortDir]);

  // Sorting
  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="size-3.5 text-muted-foreground/50" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="size-3.5 text-primary" />
    ) : (
      <ArrowDown className="size-3.5 text-primary" />
    );
  }

  function clearFilters() {
    setSearch('');
    setFilterDept('all');
    setFilterStatus('all');
    setFilterPosition('all');
  }

  const hasActiveFilters = search || filterDept !== 'all' || filterStatus !== 'all' || filterPosition !== 'all';

  return (
    <div className="space-y-6">
      <ReadOnlyBanner />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Users className="size-6 text-primary" />
            Employees
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} of {employees.length} employee{employees.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <Button asChild>
            <Link to="/employees/new">
              <Plus className="size-4" data-icon="inline-start" />
              Add Employee
            </Link>
          </Button>
        )}
      </div>

      {/* Search + Filters */}
      <Card>
        <CardContent className="pt-0 -mt-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Department filter */}
            <Select value={filterDept} onValueChange={setFilterDept}>
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="probation">Probation</SelectItem>
              </SelectContent>
            </Select>

            {/* Position filter */}
            <Select value={filterPosition} onValueChange={setFilterPosition}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Position" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {positions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table — desktop */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <ThCell field="employeeId" label="Employee ID" onSort={handleSort} icon={<SortIcon field="employeeId" />} />
                    <ThCell field="name" label="Name" onSort={handleSort} icon={<SortIcon field="name" />} />
                    <ThCell field="department" label="Department" onSort={handleSort} icon={<SortIcon field="department" />} />
                    <ThCell field="position" label="Position" onSort={handleSort} icon={<SortIcon field="position" />} />
                    <ThCell field="status" label="Status" onSort={handleSort} icon={<SortIcon field="status" />} />
                    <ThCell field="hireDate" label="Hire Date" onSort={handleSort} icon={<SortIcon field="hireDate" />} />
                    {!isViewer && (
                      <ThCell field="currentSalary" label="Salary" onSort={handleSort} icon={<SortIcon field="currentSalary" />} align="right" />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={isViewer ? 6 : 7} className="py-12 text-center text-muted-foreground">
                        No employees match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((emp) => {
                      const cfg = STATUS_CONFIG[emp.status];
                      return (
                        <tr
                          key={emp.id}
                          onClick={() => navigate(`/employees/${emp.id}`)}
                          className="cursor-pointer border-b last:border-b-0 transition-colors hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 font-medium text-primary">{emp.employeeId}</td>
                          <td className="px-4 py-3 font-medium">{getFullName(emp)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{emp.department}</td>
                          <td className="px-4 py-3 text-muted-foreground">{emp.position}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className={cfg.className}>
                              {cfg.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(emp.hireDate)}</td>
                          {!isViewer && (
                            <td className="px-4 py-3 text-right font-medium tabular-nums">
                              {formatCurrency(emp.currentSalary)}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards — mobile */}
      <div className="grid gap-3 md:hidden">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No employees match your search criteria.
            </CardContent>
          </Card>
        ) : (
          filtered.map((emp) => {
            const cfg = STATUS_CONFIG[emp.status];
            return (
              <Card
                key={emp.id}
                className="cursor-pointer transition-colors hover:bg-muted/20"
                onClick={() => navigate(`/employees/${emp.id}`)}
              >
                <CardHeader className="pb-0 -mb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{getFullName(emp)}</CardTitle>
                      <CardDescription className="mt-0.5">{emp.employeeId}</CardDescription>
                    </div>
                    <Badge variant="secondary" className={cfg.className}>
                      {cfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Briefcase className="size-3.5 shrink-0" />
                      <span className="truncate">{emp.position}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="size-3.5 shrink-0" />
                      <span className="truncate">{emp.department}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{emp.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="size-3.5 shrink-0" />
                      <span>{formatDate(emp.hireDate)}</span>
                    </div>
                    {!isViewer && (
                      <div className="flex items-center gap-1.5 font-medium col-span-2">
                        <DollarSign className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>{formatCurrency(emp.currentSalary)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: table header cell
// ---------------------------------------------------------------------------

function ThCell({
  field,
  label,
  onSort,
  icon,
  align = 'left',
}: {
  field: SortField;
  label: string;
  onSort: (f: SortField) => void;
  icon: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`cursor-pointer select-none whitespace-nowrap px-4 py-3 font-medium text-muted-foreground ${align === 'right' ? 'text-right' : 'text-left'}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {icon}
      </span>
    </th>
  );
}

export default EmployeeListPage;
