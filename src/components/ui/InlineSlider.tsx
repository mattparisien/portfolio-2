function InlineSlider({
  label,
  value,
  displayValue,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-black/40 select-none">{label}</span>
        <span className="text-[11px] font-semibold tabular-nums text-black/60 select-none">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="toolbar-slider w-full"
        style={{
          background: `linear-gradient(to right, #111 ${pct}%, #e0e0e0 ${pct}%)`,
        }}
      />
    </div>
  );
}

export default InlineSlider;