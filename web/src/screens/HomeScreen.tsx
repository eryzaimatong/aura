import { useState } from 'react';
import { Camera, IdCard, Shirt } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Mira } from '../components/Mira';
import { Screen } from '../components/Screen';
import { isMinor } from '../lib/ageBracket';
import { useAuth, useProfile } from '../lib/auth/context';

/** Placeholder until the real Home (greeting, tip, today's outfit, tiles, nav). */
export function HomeScreen() {
  const profile = useProfile();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Screen
      footer={
        <>
          <Button fullWidth icon={<Camera size={18} />} onClick={() => navigate('/mirror')}>
            Scan my face
          </Button>
          <Button variant="outline" fullWidth icon={<IdCard size={18} />} onClick={() => navigate('/mirror/card')}>
            My Aura Card
          </Button>
          <Button variant="outline" fullWidth icon={<Shirt size={18} />} onClick={() => navigate('/closet')}>
            My closet
          </Button>
          <Button
            variant="ghost"
            fullWidth
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void signOut();
            }}
          >
            Log out
          </Button>
        </>
      }
    >
      <Mira expression="hello" size="md" />
      <h1 className="mt-4 font-display text-h1 font-semibold">Hi, {profile.display_name}</h1>
      <p className="mt-1 font-mira text-h3 text-cocoa-soft">you’re in. the rest of the vanity is on its way.</p>

      <Card className="mt-6 flex flex-col gap-2">
        <p className="text-label font-bold">Your account</p>
        <Row label="Age bracket" value={profile.age_bracket.replace('_', '–').replace('–plus', '+')} />
        <Row label="Plan" value={profile.plan} />
        {isMinor(profile.age_bracket) && (
          <Row label="Guardian consent" value={profile.guardian_ok ? 'given' : 'missing'} />
        )}
      </Card>
      {isMinor(profile.age_bracket) && (
        <p className="mt-3 text-caption text-cocoa-soft">Sharing and the shop stay off on under-18 accounts.</p>
      )}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-label">
      <span className="text-cocoa-soft">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
