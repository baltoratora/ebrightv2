'use client';

import { useEffect, useRef, useState } from 'react';
import { COLS, ROWS, MAX_LEVEL, type LabSave, type Tool, type MergeResult, newLab, readLabSave, tileName, landingRow, dropBlock, advanceQueue, spawnOdds, isOver, hammer, rearrange } from '@/lib/merge-lab';

const SAVE_KEY = 'ebright.merge-lab.v1';
type Panel = 'guide' | 'collection' | 'rewards' | 'shop' | 'restart' | null;
const TIERS = ['Bubble', 'Ice', 'Crystal', 'Golden'];
const SPRITES = ['gene', 'microbe', 'sponge', 'jellyfish', 'fish', 'mudskipper', 'axolotl', 'lizard', 'dinosaur', 'egg', 'chick'];
const TOOLS: { id: Tool; icon: string; name: string; cost: number; description: string }[] = [
  { id: 'hammer', icon: '🔨', name: 'Clear specimen', cost: 150, description: 'Remove one block. The column settles.' },
  { id: 'shuffle', icon: '🌀', name: 'Rearrange', cost: 250, description: 'Sort a 3×3 area, then trigger merges.' },
  { id: 'omni', icon: '🫧', name: 'Omni-gene', cost: 200, description: 'Drop a wild block. It merges only with a block above it.' },
];
function Specimen({ level, small = false }: { level: number; small?: boolean }) {
  return <span className={`ml-specimen ml-tier-${level < 0 ? 'omni' : Math.floor((level - 1) / 11)} ${small ? 'ml-small' : ''}`} aria-label={tileName(level)}><span className="ml-creature" aria-hidden="true" style={{ backgroundImage: `url('/merge-lab/${level < 0 ? 'omni' : SPRITES[(level - 1) % 11]}.webp')` }} /><b>{level < 0 ? '✧' : level}</b></span>;
}
export function MergeLab() {
  const [save, setSave] = useState<LabSave>(newLab);
  const [ready, setReady] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [selected, setSelected] = useState(2);
  const [tool, setTool] = useState<Tool | null>(null);
  const [message, setMessage] = useState('A little life starts with one drop.');
  const [storageError, setStorageError] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const modal = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try { const raw = localStorage.getItem(SAVE_KEY); const restored = raw ? readLabSave(JSON.parse(raw)) : null; if (restored) setSave(restored); else setPanel('guide'); } catch { setStorageError(true); }
    setReady(true);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { setStorageError(true); } } }, [ready, save]);
  useEffect(() => {
    if (!panel) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(null);
      if (e.key === 'Tab') {
        const buttons = modal.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previous?.focus(); };
  }, [panel]);
  const highest = Math.max(...save.discovered);
  const preview = tool === 'omni' ? -1 : save.next;
  const upcoming = tool === 'omni' ? [save.next, save.upcoming[0]] : save.upcoming;
  function commitResult(result: MergeResult, spent?: Tool) {
    const discovered = [...new Set([...save.discovered, ...result.levels])].sort((a, b) => a - b);
    const score = save.score + result.points;
    const roundHighest = Math.max(save.roundHighest, ...result.levels);
    setSave({ ...save, board: result.board, score, best: Math.max(save.best, score), coins: save.coins + Math.floor(result.points / 10), discovered, over: isOver(result.board), roundHighest, ...advanceQueue(save, roundHighest, !spent), tools: spent ? { ...save.tools, [spent]: save.tools[spent] - 1 } : save.tools });
    setMessage(result.merges ? `${result.biggest === 4 ? 'Quad merge!' : result.biggest === 3 ? 'Triple merge!' : 'New life!'} +${result.points} points${result.merges > 1 ? ` · ${result.merges}× chain` : ''}` : 'Keep growing. Bring matching neighbours together.');
    setTool(null);
    lock.current = true; setBusy(true);
    timer.current = setTimeout(() => { lock.current = false; setBusy(false); }, 240);
  }
  function drop(column: number) {
    if (!ready || panel || save.over || lock.current || (tool && tool !== 'omni')) return;
    const result = dropBlock(save.board, column, preview);
    if (result) commitResult(result, tool === 'omni' ? 'omni' : undefined);
  }
  function applyTool(row: number, col: number) {
    if (lock.current || save.over || !tool || !save.tools[tool]) return;
    if (tool === 'hammer') {
      if (!save.board[row][col]) { setMessage('Choose a specimen to clear.'); return; }
      commitResult(hammer(save.board, row, col), 'hammer');
    } else if (tool === 'shuffle') commitResult(rearrange(save.board, row, col), 'shuffle');
  }
  function restart() {
    setSave({ ...newLab(), best: save.best, coins: save.coins, discovered: save.discovered, claimed: save.claimed, tools: save.tools });
    setTool(null); setPanel(null); setMessage('A fresh experiment. Your collection and rewards are safe.');
  }
  function buy(id: Tool, cost: number) {
    if (save.coins < cost) return;
    setSave({ ...save, coins: save.coins - cost, tools: { ...save.tools, [id]: save.tools[id] + 1 } }); setMessage('Supply added to your workbench.');
  }
  function claim(level: number) {
    if (!save.discovered.includes(level) || save.claimed.includes(level)) return;
    setSave({ ...save, coins: save.coins + level * 20, claimed: [...save.claimed, level] });
  }
  const titles = { guide: 'A field guide to little life', collection: 'Your cabinet of curiosities', rewards: 'First discoveries', shop: 'The supply cupboard', restart: 'Start a fresh experiment?' };
  return <section className="ml" aria-label="Merge Lab game" aria-busy={!ready}>
    <header className="ml-hero"><div><span className="ml-eyebrow">THE LITTLE EVOLUTION EXPERIMENT</span><h2>Merge <i>Lab</i><span>✦</span></h2><p>Drop a little. Discover a lot.</p></div><button className="ml-help" onClick={() => setPanel('guide')} aria-label="How to play">?</button></header>
    <div className="ml-layout"><aside className="ml-aside"><div className="ml-notebook"><span className="ml-eyebrow">RESEARCH NOTES · NO. 01</span><h3>Life finds<br />a way <i>up.</i></h3><p>One gene becomes a whole world. Match your specimens and see what comes next.</p><div className="ml-progress"><span>DISCOVERED</span><strong>{save.discovered.length}<small> / 44</small></strong><div><i style={{ width: `${save.discovered.length / 44 * 100}%` }} /></div></div><button onClick={() => setPanel('collection')}>Open collection <span>↗</span></button></div><div className="ml-tip"><span>✧ FIELD TIP</span><p>Touching two matching neighbours? That’s a triple merge, jumping <b>two levels</b>.</p></div></aside>
    <div className="ml-play"><div className="ml-stats"><div><span>ROUND SCORE</span><strong>{save.score.toLocaleString()}</strong></div><div><span>PERSONAL BEST</span><strong>{save.best.toLocaleString()}</strong></div><button onClick={() => setPanel('shop')} aria-label={`Open shop, ${save.coins} coins`}><span>◉</span> {save.coins.toLocaleString()}</button></div>
      <div className="ml-tray"><div><span className="ml-eyebrow">DROP NOW</span><strong>{tileName(preview)}</strong></div><Specimen level={preview} small /><div className="ml-upcoming" aria-label="Next two blocks in order">{upcoming.map((level, i) => <div key={i}><small>Next {i + 1}</small>{ready ? <Specimen level={level} small /> : <span className="ml-queue-loading">…</span>}</div>)}</div></div>
      <div className="ml-board-frame"><div className="ml-warning"><span>KEEP BELOW THE LINE</span><span>⚑</span></div>
        <div className={`ml-board ${busy ? 'ml-pulse' : ''}`} style={{ '--cols': COLS, '--rows': ROWS } as React.CSSProperties} tabIndex={0} role="group" aria-label="Merge board. Arrow keys choose a column; Enter or Space drops a block." onKeyDown={e => { if (panel) return; if (['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(e.key)) e.preventDefault(); if (e.key === 'ArrowLeft') setSelected(c => Math.max(0, c - 1)); if (e.key === 'ArrowRight') setSelected(c => Math.min(COLS - 1, c + 1)); if (e.key === 'Enter' || e.key === ' ') drop(selected); }}>
          {save.board.flatMap((line, r) => line.map((level, c) => <div className={`ml-cell ${r === 0 ? 'ml-danger' : ''} ${c === selected ? 'ml-selected' : ''}`} key={`${r}-${c}`}>
            {level !== 0 ? <Specimen level={level} /> : (r === landingRow(save.board, selected) && c === selected && !save.over && !tool ? <span className="ml-ghost" aria-hidden="true">✧</span> : null)}
          </div>))}
          <div className="ml-column-controls">{Array.from({ length: COLS }, (_, c) => <button key={c} disabled={!ready || save.over || busy || !!panel || (!!tool && tool !== 'omni')} aria-label={`Drop ${tileName(preview)} into column ${c + 1}`} onPointerEnter={() => setSelected(c)} onFocus={() => setSelected(c)} onClick={() => { setSelected(c); drop(c); }} />)}</div>
          {(tool === 'hammer' || tool === 'shuffle') && <div className="ml-cell-controls">{save.board.flatMap((line, r) => line.map((level, c) => <button key={`${r}-${c}`} aria-label={`${tool === 'hammer' ? 'Clear' : 'Rearrange around'} row ${r + 1}, column ${c + 1}${level ? `, ${tileName(level)}` : ', empty'}`} onClick={() => applyTool(r, c)} />))}</div>}
          {save.over && <div className="ml-gameover"><span>✦</span><h3>Every ending<br />is a beginning.</h3><p>Your experiment reached the warning line.<br />Round score: {save.score.toLocaleString()}</p><button onClick={restart}>Start a new experiment ↗</button><button className="ml-secondary" onClick={() => setPanel('collection')}>View your discoveries</button></div>}
        </div>
      </div>
      <details className="ml-odds"><summary>Round peak: Lv. {save.roundHighest} · Block odds</summary><p>{spawnOdds(save.roundHighest).map(item => `Lv. ${item.level}: ${(item.probability * 100).toFixed(1)}%`).join(" · ")}</p><small>New milestones retire zero-chance previews. Other blocks keep their order.</small></details>
      <p className="ml-message" role="status" aria-live="polite">{message}</p>
      <div className="ml-tools" aria-label="Lab tools">{TOOLS.map(t => <button key={t.id} disabled={!ready || save.over || busy || !save.tools[t.id]} className={tool === t.id ? 'ml-active' : ''} aria-pressed={tool === t.id} onClick={() => { setTool(tool === t.id ? null : t.id); setMessage(tool === t.id ? 'Tool cancelled.' : t.description); }}><span>{t.icon}<b>{save.tools[t.id]}</b></span><small>{t.id === 'hammer' ? 'Clear' : t.id === 'shuffle' ? 'Rearrange' : 'Omni-gene'}</small></button>)}</div>
      {tool && <button className="ml-cancel" onClick={() => { setTool(null); setMessage('Tool cancelled.'); }}>Cancel tool</button>}
      <footer className="ml-footer"><button onClick={() => setPanel('rewards')}>♧ Rewards {save.discovered.some(n => !save.claimed.includes(n)) && <i />}</button><button onClick={() => setPanel('collection')}>▦ Collection</button><button onClick={() => setPanel('restart')}>↻ New round</button></footer>
      {storageError && <p className="ml-storage" role="alert">Browser saving is unavailable. Progress will last for this visit only.</p>}
    </div>
    <aside className="ml-right"><div className="ml-next-life"><span className="ml-eyebrow">LATEST DISCOVERY</span><Specimen level={highest} /><h3>{tileName(highest)}</h3><span>LEVEL {highest} · {TIERS[Math.floor((highest - 1) / 11)].toUpperCase()}</span></div><div className="ml-rules"><h3>The art of merging</h3><p><b>02</b> Matching pair <span>+1 level</span></p><p><b>03</b> Triple merge <span>+2 levels</span></p><p><b>04</b> Quad merge <span>+3 levels</span></p><small>The dropped block is the target. Only touching blocks above, below, left or right can merge.</small></div><p className="ml-save-note">{ready ? '◌ Progress saved on this device' : 'Opening your notebook…'}</p></aside></div>
    {panel && <div className="ml-overlay" onClick={e => { if (e.target === e.currentTarget) setPanel(null); }}><div className="ml-modal" role="dialog" aria-modal="true" aria-labelledby="ml-dialog-title" ref={modal}><header><div><span className="ml-eyebrow">MERGE LAB</span><h3 id="ml-dialog-title">{titles[panel]}</h3></div><button ref={closeButton} aria-label="Close dialog" onClick={() => setPanel(null)}>×</button></header><div className="ml-modal-body">
      {panel === 'guide' && <><div className="ml-guide-demo"><Specimen level={1} /><b>+</b><Specimen level={1} /><b>→</b><Specimen level={2} /></div><ol className="ml-guide"><li><b>Pick a column. Drop a specimen.</b><p>Tap any column to drop. On a keyboard, focus the board, choose with ← → and press Enter or Space.</p></li><li><b>Bring matching life together.</b><p>The dropped block merges with up to three matching neighbours. A pair gains 1 level, a triple gains 2, a quad gains 3. Gravity can create chain reactions. As your round peak rises, weaker blocks become less likely: level 1 disappears at peak level 7. The next two previews advance in order; retired levels are replaced at milestones.</p></li><li><b>Make room for discovery.</b><p>The top row is the danger zone. If any specimen stays above the dashed line after a move resolves, the round ends.</p></li><li><b>A little help from the workbench.</b><p>Clear removes a block. Rearrange sorts a 3×3 area and resolves matches. An Omni-gene waits for a block directly above it, then matches that block’s level.</p></li><li><b>Keep your discoveries.</b><p>44 levels across Bubble, Ice, Crystal and Golden collections. Earn coins by merging, claim each discovery reward once, and buy tools with those coins. New rounds keep your collection, coins and tools.</p></li></ol><button className="ml-primary" onClick={() => setPanel(null)}>Let’s grow something ↗</button></>}
      {panel === 'collection' && <><p className="ml-intro">{save.discovered.length} of 44 specimens discovered. What will you find next?</p>{TIERS.map((tier, t) => <section key={tier}><h4 className="ml-tier-title">{tier} collection</h4><div className="ml-collection">{Array.from({ length: 11 }, (_, i) => t * 11 + i + 1).map(level => <div key={level} className={!save.discovered.includes(level) ? 'ml-locked' : ''}><small>Lv. {level}</small>{save.discovered.includes(level) ? <Specimen level={level} /> : <span className="ml-unknown">?</span>}<b>{save.discovered.includes(level) ? tileName(level) : 'Undiscovered'}</b></div>)}</div></section>)}</>}
      {panel === 'rewards' && <><p className="ml-intro">Every first discovery has a little reward. Yours to keep between rounds.</p>{Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map(level => <div className="ml-reward" key={level}><Specimen level={level} small /><div><b>{tileName(level)}</b><small>First reach level {level} · ◉ {level * 20}</small></div><button disabled={!save.discovered.includes(level) || save.claimed.includes(level)} onClick={() => claim(level)}>{save.claimed.includes(level) ? 'Claimed' : save.discovered.includes(level) ? 'Claim' : 'Locked'}</button></div>)}</>}
      {panel === 'shop' && <><p className="ml-intro">Your balance: <b>◉ {save.coins.toLocaleString()}</b>. Earn coins from merges and discovery rewards.</p>{TOOLS.map(t => <div className="ml-shop-item" key={t.id}><span>{t.icon}</span><div><h4>{t.name}</h4><p>{t.description}</p><small>In your cupboard: {save.tools[t.id]}</small></div><button disabled={save.coins < t.cost} onClick={() => buy(t.id, t.cost)}>◉ {t.cost}<small>Buy one</small></button></div>)}</>}
      {panel === 'restart' && <><p className="ml-intro">Your current board and round score will reset. Your best score, discoveries, coins, claimed rewards and remaining tools carry over.</p><button className="ml-primary" onClick={restart}>Start a new round</button><button className="ml-cancel" onClick={() => setPanel(null)}>Keep experimenting</button></>}
    </div></div></div>}
  </section>;
}
