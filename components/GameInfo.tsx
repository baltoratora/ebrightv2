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
    <details className="game-info">
      <summary>How to play <span aria-hidden="true">+</span></summary>
      <div className="gi-content">
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
    </div>
    </details>
  );
}
