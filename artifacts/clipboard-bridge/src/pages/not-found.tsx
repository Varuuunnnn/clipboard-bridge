import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[hsl(var(--background))] p-6 text-[hsl(var(--foreground))]">
      <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertCircle className="h-8 w-8 text-[hsl(var(--destructive))]" />
          <h1 className="text-2xl font-bold">Page not found</h1>
        </div>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          The page you requested does not exist.
        </p>
      </div>
    </div>
  );
}
