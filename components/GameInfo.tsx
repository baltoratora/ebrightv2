interface Control {
  key: string;
  desc: string;
}

export function GameInfo({
  controls,
  tips,
}: {
  controls: Control[];
  tips?: string[];
}) {
  return (
    <aside className="game-info">
      <div className="gi-section">
        <div className="gi-heading">Controls</div>
        <ul className="gi-list">
          {controls.map(({ key, desc }) => (
            <li key={key} className="gi-row">
              <kbd className="gi-key">{key}</kbd>
              <span className="gi-desc">{desc}</span>
            </li>
          ))}
        </ul>
      </div>
      {tips && tips.length > 0 && (
        <div className="gi-section">
          <div className="gi-heading">Tips</div>
          <ul className="gi-tips">
            {tips.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
