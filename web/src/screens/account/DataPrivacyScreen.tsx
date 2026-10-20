import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useAuth, useProfile } from '../../lib/auth/context';
import { authErrorMessage } from '../../lib/authErrors';
import type { DeleteScope } from '../../lib/database.types';
import { buildExport, deleteMyData, storedSummary, type ExportFile } from '../../lib/privacy';
import { FormAlert } from '../onboarding/FormAlert';
import { DeleteCard } from './DeleteCard';
import { ExportReadyView } from './ExportReadyView';

type Summary = Awaited<ReturnType<typeof storedSummary>>;

export function DataPrivacyScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const { state } = useAuth();
  const email = state.status === 'ready' ? state.session.user.email : undefined;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [scope, setScope] = useState<DeleteScope | null>(null);
  const [exported, setExported] = useState<ExportFile | null>(null);
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    storedSummary(profile.id).then(setSummary).catch(() => setSummary(null));
  }, [profile.id, refresh]);

  async function exportData() {
    setBusy('export');
    setError(null);
    try {
      setExported(await buildExport(profile.id, email));
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete(s: DeleteScope) {
    setBusy('delete');
    setError(null);
    try {
      await deleteMyData(profile.id, s);
      if (s === 'all') return navigate('/welcome', { replace: true }); // account is gone
      setDone(s === 'scans' ? 'Your Aura Card and scan data are deleted.' : 'Your closet, photos and wear log are deleted.');
      setScope(null);
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (exported) return <ExportReadyView file={exported} onBack={() => setExported(null)} />;

  return (
    <Screen footer={<Button fullWidth disabled={busy !== null} onClick={() => void exportData()}>
      {busy === 'export' ? 'Preparing your file…' : 'Export my data'}
    </Button>}>
      <ScreenHeader title="Data and privacy" backTo="/profile" />

      <Card>
        <h2 className="text-body font-bold">What AURA stores about you</h2>
        <dl className="mt-3 flex flex-col gap-2 text-label">
          <Row label="Face measurements" value={summary ? `${summary.scans} scan${summary.scans === 1 ? '' : 's'} · 5 ratios each` : '…'} />
          <Row label="Color values" value="skin and eyes" />
          <Row label="Closet photos" value={summary ? `${summary.items} items` : '…'} />
          <Row label="Wear log" value={summary ? `${summary.wears} entries` : '…'} />
          <Row label="What you typed in" value="measurements, style quiz, goals, trips" />
          <Row label="Selfies" value={<span className="font-bold text-success">none</span>} />
        </dl>
      </Card>

      <Card tone="sand" flat className="mt-4">
        <h2 className="text-body font-bold">Export your data</h2>
        <p className="mt-1 text-caption text-cocoa-soft">A JSON file with your card, closet, looks and wear log, made on your phone.</p>
      </Card>

      <DeleteCard className="mt-4" scope={scope} onScope={(s) => { setDone(null); setScope(s); }}
        busy={busy === 'delete'} onConfirm={(s) => void confirmDelete(s)} />

      {done && <p role="status" className="mt-3 text-center text-label text-success">{done}</p>}
      {error && <div className="mt-3"><FormAlert message={error} /></div>}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-cocoa-soft">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
