import { describe, expect, it } from 'vitest';
import { emptyBoard, dropBlock, newLab, readLabSave, isOver, hammer, rearrange, randomLevel, spawnOdds, advanceQueue, spawnCeiling, RESCUE_ROLL_LIMIT, MAX_LEVEL } from './merge-lab';

describe('Merge Lab', () => {
  it('resolves a secondary column after the primary merge without another drop', () => {
    const board = emptyBoard();
    board[7][1] = 1; board[6][1] = 4;
    board[7][0] = 4;
    const result = dropBlock(board, 2, 1)!;
    expect(result.board[7][1]).toBe(5);
    expect(result.board[7][0]).toBe(0);
    expect(result.board[7][2]).toBe(2);
    expect(result.merges).toBe(2);
    expect(result.points).toBe(70);
    expect(result.levels).toEqual([1, 2, 5]);
  });
  it('keeps resolving multiple falling specimens by identity as columns move', () => {
    const board = emptyBoard();
    board[7][1] = 1; board[6][1] = 4; board[5][1] = 6;
    board[7][0] = 4; board[6][0] = 8; board[5][0] = 6;
    const result = dropBlock(board, 2, 1)!;
    expect(result.board[7][1]).toBe(5);
    expect(result.board[6][0]).toBe(7);
    expect(result.board[7][2]).toBe(2);
    expect(result.merges).toBe(3);
    expect(result.points).toBe(140);
    expect(result.levels).toEqual([1, 2, 5, 7]);
    expect(board[6][1]).toBe(4);
  });
  it('resolves a falling triple in another column', () => {
    const board = emptyBoard();
    board[7][0] = 9;
    board[7][1] = 4; board[6][1] = 1; board[5][1] = 4;
    board[7][2] = 9; board[6][2] = 4;
    const result = dropBlock(board, 0, 1)!;
    expect(result.board[7][1]).toBe(6);
    expect(result.biggest).toBe(3);
    expect(result.merges).toBe(2);
    expect(result.points).toBe(140);
  });
  it('credits merges caused by clearing a supporting block', () => {
    const board = emptyBoard();
    board[7][1] = 1; board[6][1] = 4; board[7][0] = 4;
    const result = hammer(board, 7, 1);
    expect(result.merges).toBe(1);
    expect(result.points).toBe(50);
    expect(result.levels).toEqual([5]);
    expect(result.board[7][1]).toBe(5);
  });
  it('does not activate an omni underneath a terminal-level block', () => {
    const board = emptyBoard(); board[7][1] = -1;
    const result = dropBlock(board, 1, MAX_LEVEL)!;
    expect(result.board[7][1]).toBe(-1);
    expect(result.merges).toBe(0);
  });
  it('leaves no mergeable neighbours or floating blocks across seeded rounds', () => {
    let seed = 271828;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let round = 0; round < 30; round++) {
      let board = emptyBoard();
      for (let move = 0; move < 150 && !isOver(board); move++) {
        const col = Math.floor(random() * 5);
        const result = dropBlock(board, col, random() < .08 ? -1 : randomLevel(12, random))!;
        board = result.board;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) {
          const level = board[r][c];
          if (!level) continue;
          if (r < 7) expect(board[r + 1][c]).not.toBe(0);
          if (level <= 0 || level === MAX_LEVEL) continue;
          if (r < 7) { expect(board[r + 1][c]).not.toBe(level); expect(board[r + 1][c]).not.toBe(-1); }
          if (c < 4) expect(board[r][c + 1]).not.toBe(level);
        }
      }
    }
  });
  it('drops to the floor without mutating the original', () => { const b = emptyBoard(); const r = dropBlock(b, 2, 1)!; expect(r.board[7][2]).toBe(1); expect(b[7][2]).toBe(0); });
  it('merges a pair into the dropped target', () => { const b = emptyBoard(); b[7][1] = 1; const r = dropBlock(b, 2, 1)!; expect(r.board[7][2]).toBe(2); expect(r.board[7][1]).toBe(0); expect(r.points).toBe(20); });
  it('merges a triple by two levels', () => { const b = emptyBoard(); b[7][1] = b[7][3] = 1; const r = dropBlock(b, 2, 1)!; expect(r.board[7][2]).toBe(3); expect(r.biggest).toBe(3); });
  it('merges at most a quad by three levels', () => { const b = emptyBoard(); b[7][1] = b[7][2] = b[7][3] = 1; b[6][1] = b[6][3] = 1; const r = dropBlock(b, 2, 1)!; expect(r.board[7][2]).toBe(4); expect(r.biggest).toBe(4); });
  it('chains after gravity settles the dropped target', () => { const b = emptyBoard(); b[7][2] = 1; b[7][3] = 2; const r = dropBlock(b, 2, 1)!; expect(r.board[7][2]).toBe(3); expect(r.merges).toBe(2); expect(r.points).toBe(50); });
  it('does not merge diagonals', () => { const b = emptyBoard(); b[7][1] = 2; b[6][1] = 1; expect(dropBlock(b, 2, 1)!.merges).toBe(0); });
  it('ends above the warning line only after merges resolve', () => { const b = emptyBoard(); for (let r = 1; r < 8; r++) b[r][0] = r % 2 + 2; expect(isOver(dropBlock(b, 0, 1)!.board)).toBe(true); expect(isOver(dropBlock(b, 0, b[1][0])!.board)).toBe(false); });
  it('rejects full columns and invalid drops', () => { const b = emptyBoard(); b.forEach(r => { r[0] = 2; }); expect(dropBlock(b, 0, 1)).toBeNull(); expect(dropBlock(b, 5, 1)).toBeNull(); expect(dropBlock(b, 1, 45)).toBeNull(); });
  it('lets an omni match above but not sideways', () => { const b = emptyBoard(); b[7][2] = -1; b[7][1] = 3; expect(dropBlock(b, 3, 3)!.board[7][2]).toBe(-1); const r = dropBlock(b, 2, 1)!; expect(r.board[7][2]).toBe(2); });
  it('caps at level 44', () => { const b = emptyBoard(); b[7][1] = 43; b[7][3] = 43; expect(dropBlock(b, 2, 43)!.board[7][2]).toBe(MAX_LEVEL); b[7][1] = 44; expect(dropBlock(b, 2, 44)!.merges).toBe(0); });
  it('clears and settles a column', () => { const b = emptyBoard(); b[7][2] = 1; b[6][2] = 4; expect(hammer(b, 7, 2).board[7][2]).toBe(4); expect(b[7][2]).toBe(1); });
  it('rearranges a 3×3 region without changing the source', () => { const b = emptyBoard(); b[7][0] = 1; b[7][1] = 1; b[7][2] = 3; const r = rearrange(b, 7, 1); expect(r.merges).toBeGreaterThan(0); expect(b[7][1]).toBe(1); });
  it('validates saves and rejects corrupt or floating boards', () => { const s = newLab(); expect(readLabSave(s)).toEqual(s); expect(readLabSave({ ...s, coins: -1 })).toBeNull(); expect(readLabSave({ ...s, over: true })).toBeNull(); expect(readLabSave({ ...s, discovered: [99] })).toBeNull(); expect(readLabSave({ ...s, next: 0 })).toBeNull(); expect(readLabSave({ ...s, tools: {} })).toBeNull(); s.board[3][2] = 1; expect(readLabSave(s)).toBeNull(); });
  it('retires level 1 from normal rolls at round peak 7', () => {
    const chance = (peak: number) => spawnOdds(peak).find(item => item.level === 1)?.probability ?? 0;
    expect(chance(1)).toBe(1);
    expect(chance(4)).toBeCloseTo(3 / 7);
    expect(chance(5)).toBeCloseTo(.2);
    expect(chance(6)).toBeCloseTo(1 / 12);
    expect(chance(7)).toBe(0);
    for (let peak = 8; peak <= MAX_LEVEL; peak++) expect(chance(peak)).toBe(0);
    expect(spawnOdds(9).some(item => item.level === 2)).toBe(false);
  });
  it('keeps the growing ceiling two levels below the peak, with a level-1 starter exception', () => {
    for (const peak of [5, 7, 10, 20, 44]) expect(randomLevel(peak, () => .999)).toBe(peak - 2);
  });
  it('normalizes every peak distribution and samples only positive weights', () => {
    for (let peak = 1; peak <= MAX_LEVEL; peak++) {
      const pool = spawnOdds(peak);
      expect(pool.reduce((total, item) => total + item.probability, 0)).toBeCloseTo(1);
      expect(pool.every(item => item.weight > 0 && item.level <= MAX_LEVEL)).toBe(true);
      for (let i = 0; i < 100; i++) expect(pool.some(item => item.level === randomLevel(peak, () => i / 100))).toBe(true);
    }
    expect(randomLevel(5, () => .19)).toBe(1);
    expect(randomLevel(5, () => .2)).toBe(2);
    expect(randomLevel(5, () => .61)).toBe(3);
    expect(randomLevel(44, () => .999)).toBe(42);
  });
  it('advances the two advertised previews in order and appends one new draw', () => {
    const save = { ...newLab(), next: 1, upcoming: [2, 3] as [number, number] };
    expect(advanceQueue(save, 5, true, () => .99)).toEqual({ next: 2, upcoming: [3, 3], rescueWait: 0 });
    expect(advanceQueue(save, 5, false, () => .99)).toEqual({ next: 1, upcoming: [2, 3], rescueWait: 0 });
    expect(save.upcoming).toEqual([2, 3]);
  });
  it('replaces retired previews immediately without reordering eligible ones', () => {
    const save = { ...newLab(), next: 1, upcoming: [1, 3] as [number, number] };
    expect(advanceQueue(save, 7, false, () => 0)).toEqual({ next: 2, upcoming: [2, 3], rescueWait: 0 });
    expect(advanceQueue(save, 7, true, () => 0)).toEqual({ next: 2, upcoming: [3, 2], rescueWait: 0 });
  });
  it('reserves cleanup chance only for retired levels still on the board', () => {
    const board = emptyBoard(); board[7][0] = 1; board[7][4] = 7;
    expect(spawnOdds(7, board).find(item => item.level === 1)?.probability).toBe(.25);
    expect(spawnOdds(7, board).every(item => item.level <= 5)).toBe(true);
    board[7][0] = 0;
    expect(spawnOdds(7, board).some(item => item.level === 1)).toBe(false);
    board[7][0] = 1; board[7][1] = 2;
    expect(spawnOdds(9, board).filter(item => item.level <= 2).map(item => item.probability)).toEqual([.125, .125]);
  });
  it('guarantees a stranded level enters the previews within four new draws', () => {
    const board = emptyBoard(); board[7][0] = 1;
    let save = { ...newLab(), board, roundHighest: 7, next: 3, upcoming: [4, 5] as [number, number] };
    for (let i = 1; i <= RESCUE_ROLL_LIMIT; i++) {
      save = { ...save, ...advanceQueue(save, 7, true, () => .999) };
      if (i < RESCUE_ROLL_LIMIT) expect([save.next, ...save.upcoming]).not.toContain(1);
    }
    expect(save.upcoming[1]).toBe(1);
    expect(save.rescueWait).toBe(0);
    const first = advanceQueue(save, 7, true, () => .999);
    const second = advanceQueue({ ...save, ...first }, 7, true, () => .999);
    expect(second.next).toBe(1);
  });
  it('does not reroll an eligible cleanup preview on tool use or reload', () => {
    const board = emptyBoard(); board[7][0] = 1;
    const save = { ...newLab(), board, roundHighest: 7, next: 3, upcoming: [1, 5] as [number, number] };
    expect(advanceQueue(save, 7, false, () => .999)).toEqual({ next: 3, upcoming: [1, 5], rescueWait: 0 });
    expect(readLabSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
  });
  it('reads the resolved board rather than the old board when cleanup is removed', () => {
    const board = emptyBoard(); board[7][0] = 1;
    const save = { ...newLab(), board, roundHighest: 7, next: 3, upcoming: [1, 5] as [number, number], rescueWait: 3 };
    expect(advanceQueue(save, 7, false, () => .999, emptyBoard())).toEqual({ next: 3, upcoming: [5, 5], rescueWait: 0 });
  });
  it('migrates overpowered previews and persists the cleanup wait', () => {
    const board = emptyBoard(); board[7][0] = 1;
    const save = { ...newLab(), board, roundHighest: 7, next: 7, upcoming: [6, 5] as [number, number], rescueWait: 3 };
    const restored = readLabSave(save)!;
    expect([restored.next, ...restored.upcoming].every(level => level <= spawnCeiling(7))).toBe(true);
    expect(restored.upcoming[1]).toBe(5);
    const waiting = { ...save, next: 3, upcoming: [4, 5] as [number, number] };
    expect(readLabSave(JSON.parse(JSON.stringify(waiting)))?.rescueWait).toBe(3);
    expect(readLabSave({ ...waiting, rescueWait: -1 })).toBeNull();
    expect(readLabSave({ ...waiting, rescueWait: 4 })).toBeNull();
  });
  it('saves the exact preview order and round peak independently of collection', () => {
    const save = { ...newLab(), roundHighest: 7, next: 2, upcoming: [3, 4] as [number, number], discovered: [1, 7, 44] };
    expect(readLabSave(JSON.parse(JSON.stringify(save)))).toEqual(save);
    expect(newLab(() => 0).roundHighest).toBe(1);
    expect(readLabSave({ ...save, roundHighest: 45 })).toBeNull();
    expect(readLabSave({ ...save, upcoming: [2] })).toBeNull();
    expect(readLabSave({ ...save, upcoming: [0, 2] })).toBeNull();
  });
  it('upgrades older saves without discarding the board or discoveries', () => {
    const legacy: Record<string, unknown> = { ...newLab(), discovered: [1, 44] };
    delete legacy.roundHighest; delete legacy.upcoming;
    const restored = readLabSave(legacy)!;
    expect(restored.board).toEqual(legacy.board);
    expect(restored.discovered).toEqual([1, 44]);
    expect(restored.roundHighest).toBe(1);
    expect(restored.upcoming).toHaveLength(2);
  });
});
