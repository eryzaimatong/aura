import { Link } from 'react-router';

/** Confirmation after "Wearing this" — points to where the wear shows up. */
export function WearStatus({ worn }: { worn: unknown }) {
  if (worn !== 'done') return null;
  return (
    <p role="status" className="mt-3 text-center text-label text-success">
      Logged for today ✦ <Link to="/diary" className="font-bold underline">See it in your Diary</Link>
    </p>
  );
}
