import { useState } from 'react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Mira } from '../../components/Mira';
import { Screen } from '../../components/Screen';
import { authErrorMessage } from '../../lib/authErrors';
import { saveTextFile } from '../../lib/download';
import { formatBytes, type ExportFile } from '../../lib/privacy';
import { FormAlert } from '../onboarding/FormAlert';

export function ExportReadyView({ file, onBack }: { file: ExportFile; onBack: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function download() {
    setError(null);
    try {
      await saveTextFile(file.fileName, file.text);
      setSaved(true);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button fullWidth onClick={() => void download()}>{saved ? 'Download again' : 'Download file'}</Button>
          <Button variant="ghost" fullWidth onClick={onBack}>Back to privacy</Button>
        </>
      }
    >
      <div className="flex flex-col items-center pt-6 text-center">
        <Mira expression="streak" size="lg" />
        <h1 className="mt-4 font-display text-h2 font-semibold">Your data is ready</h1>
        <p className="mt-1 text-label text-cocoa-soft">{file.fileName} · {formatBytes(file.bytes)}</p>
      </div>

      <Card className="mt-6">
        <h2 className="text-label font-bold">What is inside</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {file.contents.map((c) => (
            <li key={c} className="flex items-start gap-3 text-label">
              <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-pill bg-gold" />
              {c}
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-4 text-micro text-cocoa-soft">
        Made on your phone — nothing is emailed anywhere. Closet photo links inside the file expire in 24 hours.
      </p>
      {saved && <p role="status" className="mt-3 text-center text-label text-success">Saved ✦</p>}
      {error && <div className="mt-3"><FormAlert message={error} /></div>}
    </Screen>
  );
}
