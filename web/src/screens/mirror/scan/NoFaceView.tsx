import { useNavigate } from 'react-router';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Mira } from '../../../components/Mira';
import { Screen } from '../../../components/Screen';
import type { AnalysisFailure } from '../../../lib/face/analyze';

const COPY: Record<AnalysisFailure, { title: string; fixes: [string, string, string] }> = {
  no_face: {
    title: 'I could not see your face clearly',
    fixes: ['Face a window or a lamp, not away from it', 'Hold the phone about an arm away', 'Push hair back and take off glasses'],
  },
  unreadable: {
    title: 'I could not see your face clearly',
    fixes: ['Face a window or a lamp, not away from it', 'Hold the phone about an arm away', 'Push hair back and take off glasses'],
  },
  multiple_faces: {
    title: 'I can see more than one face',
    fixes: ['Make sure only you are in the frame', 'Move away from posters or photos behind you', 'Fill the oval with just your face'],
  },
  off_angle: {
    title: 'Look straight at me',
    fixes: ['Face the camera head-on, chin level', 'Keep both ears equally visible', 'Hold the phone at eye height'],
  },
  too_far: {
    title: 'Come a little closer',
    fixes: ['Fill the oval with your face', 'Hold the phone about an arm away, not further', 'Crop the photo closer if you upload one'],
  },
};

export interface NoFaceViewProps {
  reason: AnalysisFailure;
  onRetake: () => void;
  onUpload: () => void;
}

export function NoFaceView({ reason, onRetake, onUpload }: NoFaceViewProps) {
  const navigate = useNavigate();
  const { title, fixes } = COPY[reason];
  return (
    <Screen
      footer={
        <>
          <Button fullWidth onClick={onRetake}>
            Retake photo
          </Button>
          <Button variant="outline" fullWidth onClick={onUpload}>
            Upload a different photo
          </Button>
          <Button variant="ghost" fullWidth onClick={() => navigate('/', { replace: true })}>
            Skip for now
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center pt-8 text-center">
        <Mira expression="worried" size="lg" />
        <h1 className="mt-6 font-display text-h2 font-semibold">{title}</h1>
        <p className="mt-2 text-body text-cocoa-soft">
          Nothing is saved yet. Try once more and I will read your features properly.
        </p>
      </div>
      <Card className="mt-6">
        <ul className="flex flex-col gap-3">
          {fixes.map((fix) => (
            <li key={fix} className="flex items-start gap-3 text-label">
              <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-pill bg-gold" />
              {fix}
            </li>
          ))}
        </ul>
      </Card>
    </Screen>
  );
}
