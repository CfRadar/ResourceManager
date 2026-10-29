export function DemoTag({ label = 'DEMO' }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase bg-amber-100 text-amber-800 border border-amber-300 select-none shadow-2xs"
      title="Demonstration feature; no real financial or institutional consequence"
    >
      {label}
    </span>
  );
}
