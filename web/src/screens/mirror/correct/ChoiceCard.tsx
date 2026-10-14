import { useState } from 'react';
import { Card } from '../../../components/Card';
import { Chip } from '../../../components/Chip';

export interface Choice<T extends string> {
  value: T;
  label: string;
}

export interface ChoiceCardProps<T extends string> {
  question: string;
  choices: ReadonlyArray<Choice<T>>;
  /** Shown behind a "See all" toggle (e.g. the full 12 seasons). */
  more?: ReadonlyArray<Choice<T>>;
  value: T | 'not_sure' | undefined;
  onChange: (value: T | 'not_sure') => void;
}

/** One question with chip answers, always ending in "Not sure". */
export function ChoiceCard<T extends string>({ question, choices, more, value, onChange }: ChoiceCardProps<T>) {
  const [showMore, setShowMore] = useState(() => !!more && more.some((m) => m.value === value));
  const shown = showMore && more ? [...choices, ...more.filter((m) => !choices.some((c) => c.value === m.value))] : choices;

  return (
    <Card role="group" aria-label={question}>
      <p className="text-label font-bold">{question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {shown.map((c) => (
          <Chip key={c.value} selected={value === c.value} onClick={() => onChange(c.value)}>
            {c.label}
          </Chip>
        ))}
        <Chip selected={value === 'not_sure'} onClick={() => onChange('not_sure')}>
          Not sure
        </Chip>
      </div>
      {more && !showMore && (
        <button type="button" onClick={() => setShowMore(true)} className="mt-3 text-label font-bold text-gold-deep underline">
          See all options
        </button>
      )}
    </Card>
  );
}
