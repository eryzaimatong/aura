import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { ageBracketFromDob, formatDobInput, parseDob } from '../../lib/ageBracket';
import { isAgeBlocked, markAgeBlocked, type SignupFlowState } from './flowState';

const FORM_ID = 'age-form';

/**
 * Hard rule 4: the date of birth lives only in this component's state.
 * It is turned into a bracket here and dropped when the screen unmounts.
 */
export function AgeCheckScreen() {
  const navigate = useNavigate();
  const [dob, setDob] = useState('');
  const [error, setError] = useState<string | undefined>();

  if (isAgeBlocked()) return <Navigate to="/age/blocked" replace />;

  const complete = dob.replace(/\D/g, '').length === 8;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const date = parseDob(dob);
    if (!date) return setError('That date doesn’t exist. Check the day and month.');
    const bracket = ageBracketFromDob(date);
    if (!bracket) return setError('That date is in the future.');

    if (bracket === 'under_13') {
      markAgeBlocked();
      return navigate('/age/blocked', { replace: true });
    }
    if (bracket === '13_17') return navigate('/age/guardian', { state: { bracket } });
    const next: SignupFlowState = { bracket, guardianOk: false };
    navigate('/signup', { state: next });
  }

  return (
    <Screen
      footer={
        <Button type="submit" form={FORM_ID} fullWidth disabled={!complete}>
          Continue
        </Button>
      }
    >
      <div className="flex flex-col items-center text-center">
        <Mira expression="hello" size="md" />
        <h1 className="mt-4 font-display text-h1 font-semibold">How old are you?</h1>
        <p className="mt-2 text-body text-cocoa-soft">
          Aura analyzes a photo of your face, so we ask before anything else.
        </p>
      </div>

      <form id={FORM_ID} onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <Input
          label="Date of birth"
          placeholder="DD / MM / YYYY"
          inputMode="numeric"
          autoComplete="off"
          value={dob}
          error={error}
          onChange={(e) => {
            setDob(formatDobInput(e.target.value));
            setError(undefined);
          }}
        />
      </form>

      <Card tone="sand" flat className="mt-4">
        <p className="text-label font-bold">If you are under 18</p>
        <p className="mt-1 text-caption text-cocoa-soft">
          A parent or guardian has to give consent before any scan. Sharing, the shop and the community stay switched
          off.
        </p>
      </Card>
      <p className="mt-4 text-caption text-cocoa-soft">We store your age bracket, never your birth date.</p>
    </Screen>
  );
}
