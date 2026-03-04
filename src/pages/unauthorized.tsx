import { useNavigate, Link } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center py-20">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldX className="size-8" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription className="text-base">
            You do not have permission to access this page. If you believe this is an error, please contact your system administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-4" />
            Go Back
          </Button>
          <Button asChild>
            <Link to="/dashboard">
              <Home className="size-4" />
              Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default UnauthorizedPage;
