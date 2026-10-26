import { describe, expect, it } from 'vitest';
import { emptyBoard, dropBlock, newLab, readLabSave, isOver, hammer, rearrange, randomLevel, MAX_LEVEL } from './merge-lab';

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
  it('keeps drops in the intended low-level pool', () => { expect(randomLevel(1, () => 0)).toBe(1); expect(randomLevel(44, () => .999)).toBe(6); });
});
