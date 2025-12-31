export default function StatCard(props: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card stat">
      <div className="muted">{props.title}</div>
      <div className="stat-value">{props.value}</div>
      {props.hint ? <div className="muted small">{props.hint}</div> : null}
    </div>
  );
}
