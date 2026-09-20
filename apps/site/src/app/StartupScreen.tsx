import { Button } from '@autotests-simulator/ui';

export function StartupScreen({ failed = false }: { failed?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <p className="mb-4 text-sm font-semibold text-primary">Kote’s</p>
        {failed ? (
          <>
            <div role="alert">
              <h1 className="text-2xl font-bold tracking-tight">Kote’s couldn’t start</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Please try again. If the problem continues, check your connection and browser
                settings.
              </p>
            </div>
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </>
        ) : (
          <p role="status" className="text-sm text-muted-foreground">
            Opening Kote’s…
          </p>
        )}
      </div>
    </main>
  );
}
