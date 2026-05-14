
import { DIRECTIONS } from '../constants/gameConstants';

export interface Point {
  x: number;
  y: number;
}

/**
 * Breadth-First Search (BFS)
 * Guaranteed to find the shortest path in an unweighted grid.
 */
export function bfs(start: Point, target: Point, map: string[][], blockedPositions?: Set<string>): Point | null {
  const queue: { point: Point; firstMove: Point }[] = [];
  const visited = new Set<string>();
  
  const key = (p: Point) => `${p.x},${p.y}`;
  visited.add(key(start));

  for (const dir of Object.values(DIRECTIONS)) {
    const next = { x: start.x + dir.x, y: start.y + dir.y };
    if (canMove(next, map) && (!blockedPositions || !blockedPositions.has(key(next)))) {
      queue.push({ point: next, firstMove: next });
      visited.add(key(next));
    }
  }

  while (queue.length > 0) {
    const { point, firstMove } = queue.shift()!;
    
    if (point.x === target.x && point.y === target.y) {
      return firstMove;
    }

    for (const dir of Object.values(DIRECTIONS)) {
      const next = { x: point.x + dir.x, y: point.y + dir.y };
      const k = key(next);
      if (canMove(next, map) && !visited.has(k) && (!blockedPositions || !blockedPositions.has(k))) {
        visited.add(k);
        queue.push({ point: next, firstMove });
      }
    }
  }
  return null;
}

/**
 * A* Search Algorithm
 * Uses a heuristic (Manhattan distance) to find the path efficiently.
 */
export function aStar(start: Point, target: Point, map: string[][], blockedPositions?: Set<string>): Point | null {
  const openSet: Point[] = [];
  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  const firstMoves: Record<string, Point> = {};

  const key = (p: Point) => `${p.x},${p.y}`;
  const h = (p: Point) => Math.abs(p.x - target.x) + Math.abs(p.y - target.y);

  gScore[key(start)] = 0;
  fScore[key(start)] = h(start);

  for (const dir of Object.values(DIRECTIONS)) {
    const next = { x: start.x + dir.x, y: start.y + dir.y };
    if (canMove(next, map) && (!blockedPositions || !blockedPositions.has(key(next)))) {
      const k = key(next);
      gScore[k] = 1;
      fScore[k] = 1 + h(next);
      firstMoves[k] = next;
      openSet.push(next);
    }
  }

  while (openSet.length > 0) {
    openSet.sort((a, b) => (fScore[key(a)] || Infinity) - (fScore[key(b)] || Infinity));
    const current = openSet.shift()!;

    if (current.x === target.x && current.y === target.y) {
      return firstMoves[key(current)];
    }

    for (const dir of Object.values(DIRECTIONS)) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      if (!canMove(next, map) || (blockedPositions && blockedPositions.has(key(next)))) continue;

      const k = key(next);
      const tentativeGScore = gScore[key(current)] + 1;

      if (tentativeGScore < (gScore[k] ?? Infinity)) {
        gScore[k] = tentativeGScore;
        fScore[k] = tentativeGScore + h(next);
        firstMoves[k] = firstMoves[key(current)];
        if (!openSet.some(p => p.x === next.x && p.y === next.y)) {
          openSet.push(next);
        }
      }
    }
  }
  return null;
}

export function canMove(pos: Point, map: string[][]): boolean {
  const rows = map.length;
  if (rows === 0) return false;
  const cols = map[0].length;
  
  // Wrap around logic for the "tunnel" area if needed, 
  // but for the grid search, we just check bounds and walls.
  if (pos.y < 0 || pos.y >= rows || pos.x < 0 || pos.x >= cols) return false;
  
  return map[pos.y][pos.x] !== '#';
}
