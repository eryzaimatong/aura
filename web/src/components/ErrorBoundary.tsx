import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';
import { Mira } from './Mira';
import { Screen } from './Screen';

interface State {
  error: Error | null;
}

/** A screen that failed to download (lazy routes on a flaky connection) rather than a bug. */
function isChunkLoadError(err: Error): boolean {
  return /dynamically imported module|Importing a module script failed|Failed to fetch|ChunkLoadError/i.test(err.message);
}

/**
 * Catches anything that throws while rendering, so a bug shows a calm screen with a way
 * out instead of a blank app. Nothing is reported anywhere: no crash data leaves the phone.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const offline = isChunkLoadError(error);
    return (
      <Screen centered footer={
        <>
          <Button fullWidth onClick={() => window.location.reload()}>Try again</Button>
          <Button variant="ghost" fullWidth onClick={() => window.location.assign('/')}>Go home</Button>
        </>
      }>
        <Mira expression="worried" size="lg" />
        <h1 className="mt-6 font-display text-h2 font-semibold">{offline ? 'Mira couldn’t load this page' : 'Something went wrong'}</h1>
        <p className="mt-2 text-body text-cocoa-soft">
          {offline
            ? 'Your connection may have dropped. Check it, then try again.'
            : 'This screen hit a snag. Your data is safe. Try again, or head home.'}
        </p>
        {import.meta.env.DEV && <pre className="mt-4 max-w-full overflow-x-auto whitespace-pre-wrap text-left text-micro text-danger">{error.message}</pre>}
      </Screen>
    );
  }
}
