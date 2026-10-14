import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Checkbox } from '../../components/Checkbox';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import type { SignupFlowState } from './flowState';

/** 13–17 only: a parent or guardian agrees before the account is made. */
export function GuardianScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [agreed, setAgreed] = useState(false);

  const cameFromAgeCheck =
    typeof location.state === 'object' && location.state !== null && 'bracket' in location.state;
  if (!cameFromAgeCheck) return <Navigate to="/age" replace />;

  function handleContinue() {
    const next: SignupFlowState = { bracket: '13_17', guardianOk: true };
    navigate('/signup', { state: next });
  }

  return (
    <Screen
      footer={
        <>
          <Button fullWidth disabled={!agreed} onClick={handleContinue}>
            Continue
          </Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/age', { replace: true })}>
            Back
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center">
        <Mira expression="shy" size="md" />
        <h1 className="mt-4 font-display text-h1 font-semibold">Ask a grown-up first</h1>
        <p className="mt-2 text-body text-cocoa-soft">
          You’re under 18, so a parent or guardian needs to read this with you.
        </p>
      </div>

      <Card className="mt-8 flex flex-col gap-3">
        <p className="text-label font-bold">What changes for under-18s</p>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-caption text-cocoa-soft">
          <li>Your selfie is analyzed on this phone and never uploaded.</li>
          <li>Sharing your Aura Card is switched off.</li>
          <li>The shop and the community are switched off.</li>
          <li>You or your guardian can delete everything at any time.</li>
        </ul>
      </Card>

      <Checkbox checked={agreed} onChange={setAgreed} className="mt-4">
        My parent or guardian has read this and agrees to me using AURA.
      </Checkbox>
    </Screen>
  );
}
