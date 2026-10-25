import { useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { ApiError, postScan } from '../../../lib/api';
import { track } from '../../../lib/analytics';
import { apiErrorMessage } from '../../../lib/apiErrors';
import { useProfile } from '../../../lib/auth/context';
import { analyzeCanvas, wipeCanvas, type AnalysisFailure, type ScanDiagnostics, type ScanMeasurements } from '../../../lib/face/analyze';
import { fileToCanvas } from '../../../lib/face/capture';
import type { LightingIssue } from '../../../lib/face/color';
import { AnalyzingView, type ScanStep } from './AnalyzingView';
import { CaptureView } from './CaptureView';
import { LowLightView } from './LowLightView';
import { NoFaceView } from './NoFaceView';
import { ScanErrorView } from './ScanErrorView';

type Phase =
  | { kind: 'capture' }
  | { kind: 'analyzing'; step: ScanStep }
  | { kind: 'no_face'; reason: AnalysisFailure; diagnostics?: ScanDiagnostics }
  | { kind: 'low_light'; colorConf: number; shapeConf: number; issue: LightingIssue | null }
  // Measurements (numbers only) are kept so "Try again" can resend without a new photo.
  | { kind: 'error'; message: string; retry: { measurements: ScanMeasurements; issue: LightingIssue | null } | null };

const STEP_MS = 550;
const pause = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** Capture → on-device analysis → POST numbers → Aura Card. The photo never leaves this component. */
export function ScanScreen() {
  const navigate = useNavigate();
  const profile = useProfile();
  const [phase, setPhase] = useState<Phase>({ kind: 'capture' });
  const fileInput = useRef<HTMLInputElement>(null);

  async function analyze(canvas: HTMLCanvasElement) {
    setPhase({ kind: 'analyzing', step: 0 });
    let result;
    try {
      // Paced so each step is readable; analysis itself only takes a few hundred ms.
      result = await analyzeCanvas(canvas, async (s) => {
        setPhase({ kind: 'analyzing', step: s });
        await pause(STEP_MS);
      });
    } catch {
      wipeCanvas(canvas);
      return setPhase({ kind: 'error', message: 'Mira couldn’t start the face reader. Check your connection and retake.', retry: null });
    }
    if (!result.ok) return setPhase({ kind: 'no_face', reason: result.reason, diagnostics: result.diagnostics });
    if (import.meta.env.DEV) console.info('[scan] measurements', result.measurements, 'lighting issue:', result.lightingIssue);
    await submit(result.measurements, result.lightingIssue);
  }

  async function submit(measurements: ScanMeasurements, issue: LightingIssue | null) {
    setPhase({ kind: 'analyzing', step: 3 });
    try {
      const res = await postScan(measurements);
      track(profile, 'scan_completed', { needs_quiz: res.needs_quiz });
      if (res.needs_quiz) {
        setPhase({ kind: 'low_light', colorConf: res.color_conf, shapeConf: res.card.shape_conf, issue });
      } else {
        navigate('/mirror/card', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'consent_required') return navigate('/mirror/consent', { replace: true });
      setPhase({ kind: 'error', message: apiErrorMessage(err), retry: { measurements, issue } });
    }
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    try {
      await analyze(await fileToCanvas(file));
    } catch {
      setPhase({ kind: 'error', message: 'That file couldn’t be opened as a photo. Try a JPG or PNG.', retry: null });
    }
  }

  const openPicker = () => fileInput.current?.click();
  const retake = () => setPhase({ kind: 'capture' });

  return (
    <>
      {/* Read locally with createImageBitmap — the file is never uploaded. */}
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => void handleFile(e)} />
      {phase.kind === 'capture' && <CaptureView onCaptured={(c) => void analyze(c)} onUpload={openPicker} />}
      {phase.kind === 'analyzing' && <AnalyzingView step={phase.step} />}
      {phase.kind === 'no_face' && <NoFaceView reason={phase.reason} diagnostics={phase.diagnostics} onRetake={retake} onUpload={openPicker} />}
      {phase.kind === 'low_light' && (
        <LowLightView colorConf={phase.colorConf} shapeConf={phase.shapeConf} issue={phase.issue} onRetake={retake} />
      )}
      {phase.kind === 'error' && (
        <ScanErrorView
          message={phase.message}
          onRetry={phase.retry ? () => phase.retry && void submit(phase.retry.measurements, phase.retry.issue) : undefined}
          onRetake={retake}
        />
      )}
    </>
  );
}
