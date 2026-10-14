import { CircleAlert } from 'lucide-react';

/** Form-level error (server/auth failures), above the fields. */
export function FormAlert({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md bg-tint-pink p-4 text-label text-danger">
      <CircleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}
