export const TILE_SIZE = 24;

export interface Point {
  x: number;
  y: number;
}

export const MAP_LAYOUT = [
  "###################",
  "#........G........#",
  "#.###.#######.###.#",
  "#.................#",
  "#.###.###.###.###.#",
  "#.#...#.....#...#.#",
  "#.#.###.###.###.#.#",
  "#.................#",
  "#.#.###.###.###.#.#",
  "#.#...#.....#...#.#",
  "#.###.###.###.###.#",
  "#.................#",
  "#.###.#######.###.#",
  "#........P........#",
  "###################",
];

export const COLORS = {
  WALL: '#2421c0',
  PELLET: '#ffb8ae',
  POWER_PELLET: '#ffc0cb',
  PACMAN: '#ffff00',
  BLINKY: '#ff0000',
  PINKY: '#ffb8ff',
  INKY: '#00ffff',
  FRIGHTENED: '#2121ff',
};

export type Direction = { x: number; y: number };
export const DIRECTIONS: Record<string, Direction> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};
