import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5 text-primary" />
            Settings
          </CardTitle>
          <CardDescription>Application configuration and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Coming soon -- system settings, data reset, and configuration options.</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPage;
