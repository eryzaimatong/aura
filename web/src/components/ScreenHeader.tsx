import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';

export interface ScreenHeaderProps {
  title: string;
  /** Where the back button goes. Defaults to the previous history entry. */
  backTo?: string;
}

/** Round back button + Fredoka title, as on the Mirror and settings screens. */
export function ScreenHeader({ title, backTo }: ScreenHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  // Opened directly with no in-app history: go Home rather than out of the app.
  const goBack = () => {
    if (backTo) navigate(backTo);
    else if (location.key === 'default') navigate('/', { replace: true });
    else navigate(-1);
  };
  return (
    <header className="mb-6 flex items-center gap-3">
      <button
        type="button"
        aria-label="Back"
        onClick={goBack}
        className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-paper text-cocoa shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <h1 className="font-display text-h2 font-semibold">{title}</h1>
    </header>
  );
}
