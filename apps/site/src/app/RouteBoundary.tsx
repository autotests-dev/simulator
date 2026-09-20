import { Component, type ReactNode } from 'react';
import { Button } from '@autotests-simulator/ui';

export class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <div role="alert">
          <h1 className="text-2xl font-bold">This page couldn’t load</h1>
          <p className="mt-3 text-muted-foreground">Check your connection and try again.</p>
        </div>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </main>
    );
  }
}
