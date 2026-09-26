/**
 * "Contorno em continuidade" — an original mark built from two asymmetric
 * arcs that almost close into a figure of continuity. It is not the
 * client's logo: the lobes are unequal, open, and meet only by implication.
 *
 * Desktop: the large arc lives in the visual field; the small one leans
 * out of it toward the editorial column.
 * Mobile: a separate vertical composition — the small arc rises toward the
 * CTA above it, the large one settles into the field below.
 */

export function SignatureDesktop({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`overflow-visible ${className}`}
      viewBox="0 0 600 720"
      preserveAspectRatio="xMinYMin meet"
    >
      {/* Large arc: the right lobe, crossing the meeting point and trailing on. */}
      <path
        className="curve draw"
        pathLength={1}
        style={{ ["--delay" as string]: "160ms" }}
        d="M120 470 C 220 330, 380 120, 560 110 C 720 100, 770 300, 704 460 C 640 620, 430 704, 300 646 C 222 610, 168 544, 120 470 C 92 428, 62 400, 30 386"
      />
      {/* Small arc: the left lobe, open, reaching toward the text. */}
      <path
        className="curve draw"
        pathLength={1}
        style={{ ["--delay" as string]: "420ms" }}
        d="M4 376 C -40 358, -110 368, -150 408 C -190 450, -172 520, -122 540 C -80 556, -10 536, 62 500"
      />
      {/* The meeting point, held open. */}
      <circle cx="120" cy="470" r="2.75" fill="var(--ochre)" className="reveal" style={{ ["--delay" as string]: "900ms" }} />
    </svg>
  );
}

export function SignatureMobile({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`overflow-visible ${className}`}
      viewBox="0 0 400 480"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Large arc: the lower lobe, crossing upward and trailing. */}
      <path
        className="curve draw"
        pathLength={1}
        style={{ ["--delay" as string]: "140ms" }}
        d="M150 170 C 220 230, 390 258, 424 360 C 460 466, 360 546, 240 524 C 140 504, 100 382, 128 256 C 136 218, 144 190, 150 170 C 156 150, 164 130, 172 114"
      />
      {/* Small arc: the upper lobe, open, rising toward the CTA. */}
      <path
        className="curve draw"
        pathLength={1}
        style={{ ["--delay" as string]: "380ms" }}
        d="M186 92 C 212 40, 196 -28, 136 -40 C 76 -52, 36 -4, 56 46 C 68 76, 90 98, 112 122"
      />
      <circle cx="150" cy="170" r="2.75" fill="var(--ochre)" className="reveal" style={{ ["--delay" as string]: "860ms" }} />
    </svg>
  );
}

/** Only a fragment returns at the close: part of the large arc, nothing more. */
export function SignatureFragment({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`overflow-visible ${className}`}
      viewBox="0 0 420 300"
      preserveAspectRatio="xMaxYMax meet"
    >
      <path className="curve" d="M8 296 C 70 210, 160 64, 280 60 C 380 56, 424 150, 414 236" />
    </svg>
  );
}
