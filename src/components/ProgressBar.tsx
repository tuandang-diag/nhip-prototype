export function ProgressBar({
  value,
  max,
  label
}: {
  value: number;
  max: number;
  label: string;
}) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="progress-block">
      <div className="progress-label">
        <span>{label}</span>
        <strong>{percent}%</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
