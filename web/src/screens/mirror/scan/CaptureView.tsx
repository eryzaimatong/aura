import { useState, type ReactNode } from 'react';
import { SwitchCamera, Upload } from 'lucide-react';
import { Chip } from '../../../components/Chip';
import { Screen } from '../../../components/Screen';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { frameToCanvas } from '../../../lib/face/capture';
import { cx } from '../../../lib/cx';
import { useCamera, type CameraState, type Facing } from '../useCamera';
import { FaceOval } from './FaceOval';

const TIPS = {
  window: { label: 'Face a window', line: 'Natural light gives the most accurate color reading' },
  makeup: { label: 'No makeup', line: 'Bare skin lets Mira read your true undertone' },
  hair: { label: 'Hair back', line: 'Mira needs to see your forehead and jawline' },
} as const;
type Tip = keyof typeof TIPS;

const CAMERA_MESSAGES: Partial<Record<CameraState, string>> = {
  starting: 'Opening the camera…',
  denied: 'Camera access is off. Allow it in your browser settings, or upload a photo instead.',
  unavailable: 'No camera found on this device. You can upload a photo instead.',
  error: 'The camera didn’t start. Try again, or upload a photo instead.',
};

export interface CaptureViewProps {
  onCaptured: (canvas: HTMLCanvasElement) => void;
  onUpload: () => void;
}

export function CaptureView({ onCaptured, onUpload }: CaptureViewProps) {
  const [facing, setFacing] = useState<Facing>('user');
  const [tip, setTip] = useState<Tip>('window');
  const { videoRef, state } = useCamera(facing);
  const message = CAMERA_MESSAGES[state];

  async function shoot() {
    const video = videoRef.current;
    const canvas = video ? await frameToCanvas(video) : null;
    if (canvas) onCaptured(canvas);
  }

  return (
    <Screen>
      <ScreenHeader title="Take your selfie" backTo="/" />

      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-tint-lilac">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Camera preview"
          className={cx('size-full object-cover', facing === 'user' && '-scale-x-100', state !== 'live' && 'invisible')}
        />
        <FaceOval dimmed={state === 'live'} />
        {message && (
          <p role="status" className="absolute inset-x-6 bottom-6 rounded-sm bg-paper/90 p-3 text-center text-label text-cocoa">
            {message}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(TIPS) as Tip[]).map((t) => (
          <Chip key={t} selected={tip === t} onClick={() => setTip(t)}>
            {TIPS[t].label}
          </Chip>
        ))}
      </div>
      <p className="mt-4 text-center font-mira text-h3 text-cocoa-soft">{TIPS[tip].line} ✦</p>

      <div className="mt-auto flex items-center justify-between px-4 pt-6">
        <SideButton label="Upload" onClick={onUpload} icon={<Upload size={20} />} />
        <button
          type="button"
          aria-label="Take photo"
          disabled={state !== 'live'}
          onClick={() => void shoot()}
          className="size-20 rounded-pill border-[6px] border-paper bg-gold shadow-card transition-transform active:scale-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-deep"
        />
        <SideButton
          label="Flip"
          onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}
          icon={<SwitchCamera size={20} />}
          disabled={state === 'unavailable'}
        />
      </div>
    </Screen>
  );
}

function SideButton({ label, icon, onClick, disabled }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-16 flex-col items-center gap-1 text-label text-cocoa-soft disabled:opacity-40"
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}
