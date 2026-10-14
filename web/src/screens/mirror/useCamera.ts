import { useEffect, useRef, useState } from 'react';

export type Facing = 'user' | 'environment';
export type CameraState = 'starting' | 'live' | 'denied' | 'unavailable' | 'error';

/** Live camera preview. The stream is stopped on unmount and whenever `facing` changes. */
export function useCamera(facing: Facing) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>('starting');

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      return;
    }
    let stream: MediaStream | null = null;
    let cancelled = false;
    setState('starting');

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then(async (s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const video = videoRef.current;
        if (video) {
          video.srcObject = s;
          await video.play().catch(() => undefined);
        }
        setState('live');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') setState('denied');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setState('unavailable');
        else setState('error');
      });

    const video = videoRef.current;
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
    };
  }, [facing]);

  return { videoRef, state };
}
