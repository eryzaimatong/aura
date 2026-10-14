import { useId } from 'react';

/** Dashed guide oval over the camera box; dims the area outside it once the camera is live. */
export function FaceOval({ dimmed }: { dimmed: boolean }) {
  const maskId = useId();
  return (
    <svg aria-hidden="true" viewBox="0 0 100 125" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
      <defs>
        {/* Luminance mask, not a visible colour: white keeps the dim layer, black cuts the oval out. */}
        <mask id={maskId}>
          <rect width="100" height="125" fill="white" />
          <ellipse cx="50" cy="58" rx="30" ry="40" fill="black" />
        </mask>
      </defs>
      {dimmed && <rect width="100" height="125" mask={`url(#${maskId})`} className="fill-cocoa/35" />}
      {/* Non-scaling stroke: width and dashes are in screen pixels, so the oval stays crisp at any size. */}
      <ellipse
        cx="50"
        cy="58"
        rx="30"
        ry="40"
        className="fill-none stroke-paper"
        strokeWidth={2.5}
        strokeDasharray="10 8"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
