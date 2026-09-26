/** Running editorial marker: "01 — Áreas". */
export function SectionMarker({ index, label }: { index: string; label: string }) {
  return (
    <p className="eyebrow flex items-center gap-3">
      <span className="tabular-nums text-ink">{index}</span>
      <span aria-hidden="true" className="h-px w-6 bg-rule" />
      <span>{label}</span>
    </p>
  );
}
