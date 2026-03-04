import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog } from 'lucide-react';

export function UserManagementPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="size-5 text-primary" />
            User Management
          </CardTitle>
          <CardDescription>Manage user accounts, roles, and access permissions.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Coming soon -- user table with role assignment, lock/unlock, and creation form.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default UserManagementPage;
