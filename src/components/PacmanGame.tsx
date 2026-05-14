import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TILE_SIZE, 
  MAP_LAYOUT, 
  COLORS, 
  DIRECTIONS, 
  Direction 
} from '../constants/gameConstants';
import { bfs, dijkstra, aStar, canMove, Point } from '../utils/pathfinding';
import { Trophy, Heart, Play, RefreshCw } from 'lucide-react';

interface Entity {
  pos: { x: number; y: number };
  target: Point;
  dir: Direction;
  nextDir: Direction;
}

interface Ghost extends Entity {
  id: string;
  color: string;
  strategy: 'A_STAR' | 'BFS' | 'DIJKSTRA' | 'RANDOM';
  isFrightened: boolean;
  spawnPos: Point;
}

const GHOST_CONFIGS = [
  { id: 'blinky', color: COLORS.BLINKY, strategy: 'A_STAR' as const },
  { id: 'pinky', color: COLORS.PINKY, strategy: 'BFS' as const },
  { id: 'inky', color: COLORS.INKY, strategy: 'DIJKSTRA' as const },
];

const GHOST_PRIORITY = new Map(GHOST_CONFIGS.map((ghost, index) => [ghost.id, index] as const));

const GHOST_HOME_POSITIONS: Record<string, Point> = {
  blinky: { x: 9, y: 1 },
  pinky: { x: 8, y: 1 },
  inky: { x: 10, y: 1 },
};

const GRID = MAP_LAYOUT.map(row => row.split(''));

export default function PacmanGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [status, setStatus] = useState<'START' | 'PLAYING' | 'GAMEOVER' | 'WIN'>('START');
  
  const gameRef = useRef({
    pacman: { 
      pos: { x: 9, y: 13 }, 
      target: { x: 9, y: 13 }, 
      dir: DIRECTIONS.RIGHT, 
      nextDir: DIRECTIONS.RIGHT 
    },
    ghosts: [] as Ghost[],
    pellets: new Set<string>(),
    powerPellets: new Set<string>(),
    frightenedTimer: 0,
    spawns: { pacman: { x: 9, y: 13 }, ghost: { x: 9, y: 1 } }
  });

  const initGame = useCallback(() => {
    // Cancel any pending animation frame
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    const pellets = new Set<string>();
    const powerPellets = new Set<string>();
    let pacmanSpawn = { x: 9, y: 13 };
    let ghostSpawn = { x: 9, y: 1 };

    MAP_LAYOUT.forEach((row, y) => {
      row.split('').forEach((tile, x) => {
        if (tile === '.') pellets.add(`${x},${y}`);
        if (tile === 'O') powerPellets.add(`${x},${y}`);
        if (tile === 'P') pacmanSpawn = { x, y };
        if (tile === 'G') ghostSpawn = { x, y };
      });
    });

    gameRef.current = {
      pacman: { 
        pos: { ...pacmanSpawn }, 
        target: { ...pacmanSpawn }, 
        dir: DIRECTIONS.RIGHT, 
        nextDir: DIRECTIONS.RIGHT 
      },
      ghosts: GHOST_CONFIGS.map(config => ({
        ...config,
        pos: { ...GHOST_HOME_POSITIONS[config.id] },
        target: { ...GHOST_HOME_POSITIONS[config.id] },
        dir: DIRECTIONS.UP,
        nextDir: DIRECTIONS.UP,
        spawnPos: { ...GHOST_HOME_POSITIONS[config.id] },
        isFrightened: false,
      })),
      pellets,
      powerPellets,
      frightenedTimer: 0,
      spawns: { pacman: pacmanSpawn, ghost: ghostSpawn }
    };

    setScore(0);
    setLives(3);
    setStatus('START');
  }, []);

  // Setup background cache
  useEffect(() => {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = MAP_LAYOUT[0].length * TILE_SIZE;
    bgCanvas.height = MAP_LAYOUT.length * TILE_SIZE;
    const ctx = bgCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      MAP_LAYOUT.forEach((row, y) => {
        row.split('').forEach((tile, x) => {
          if (tile === '#') {
            ctx.fillStyle = COLORS.WALL;
            ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            ctx.strokeStyle = '#1e1b9b';
            ctx.lineWidth = 1;
            ctx.strokeRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          }
        });
      });
      bgCanvasRef.current = bgCanvas;
    }
    initGame();
  }, [initGame]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const keyMap: Record<string, Direction> = {
      ArrowUp: DIRECTIONS.UP, ArrowDown: DIRECTIONS.DOWN, ArrowLeft: DIRECTIONS.LEFT, ArrowRight: DIRECTIONS.RIGHT,
      w: DIRECTIONS.UP, s: DIRECTIONS.DOWN, a: DIRECTIONS.LEFT, d: DIRECTIONS.RIGHT,
    };
    if (keyMap[e.key]) gameRef.current.pacman.nextDir = keyMap[e.key];
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const game = gameRef.current;

    // Background
    if (bgCanvasRef.current) ctx.drawImage(bgCanvasRef.current, 0, 0);
    else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); }

    // Pellets
    ctx.fillStyle = COLORS.PELLET;
    game.pellets.forEach(k => {
      const [x, y] = k.split(',').map(Number);
      ctx.beginPath(); ctx.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 2, 0, Math.PI * 2); ctx.fill();
    });
    game.powerPellets.forEach(k => {
      const [x, y] = k.split(',').map(Number);
      ctx.beginPath(); ctx.arc(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2, 5, 0, Math.PI * 2); ctx.fill();
    });

    // Pacman
    const p = game.pacman;
    ctx.save();
    ctx.translate(p.pos.x * TILE_SIZE + TILE_SIZE / 2, p.pos.y * TILE_SIZE + TILE_SIZE / 2);
    let angle = 0;
    if (p.dir === DIRECTIONS.LEFT) angle = Math.PI;
    if (p.dir === DIRECTIONS.UP) angle = -Math.PI / 2;
    if (p.dir === DIRECTIONS.DOWN) angle = Math.PI / 2;
    ctx.rotate(angle);
    ctx.fillStyle = COLORS.PACMAN;
    const mouthOpen = Math.abs(Math.sin(Date.now() * 0.01)) * 0.2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, TILE_SIZE / 2 - 2, mouthOpen * Math.PI, (2 - mouthOpen) * Math.PI); ctx.fill();
    ctx.restore();

    // Ghosts
    game.ghosts.forEach(g => {
      ctx.fillStyle = g.isFrightened ? COLORS.FRIGHTENED : g.color;
      const gx = g.pos.x * TILE_SIZE + TILE_SIZE / 2;
      const gy = g.pos.y * TILE_SIZE + TILE_SIZE / 2;
      ctx.beginPath(); ctx.arc(gx, gy - 2, TILE_SIZE / 2 - 2, Math.PI, 0);
      ctx.lineTo(gx + TILE_SIZE / 2 - 2, gy + TILE_SIZE / 2 - 2);
      ctx.lineTo(gx - TILE_SIZE / 2 + 2, gy + TILE_SIZE / 2 - 2);
      ctx.fill();
      // Eyes (only if not frightened)
      if (!g.isFrightened) {
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(gx - 4, gy - 4, 3, 0, Math.PI * 2); ctx.arc(gx + 4, gy - 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(gx - 4 + g.dir.x * 2, gy - 4 + g.dir.y * 2, 1.5, 0, Math.PI * 2); ctx.arc(gx + 4 + g.dir.x * 2, gy - 4 + g.dir.y * 2, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    });
  }, []);

  const gameLoop = useCallback(() => {
    if (status !== 'PLAYING') return;
    
    const game = gameRef.current;
    const speed = 0.05;

    const isGhostBlockingPosition = (x: number, y: number, ghostId: string) => {
      const currentPriority = GHOST_PRIORITY.get(ghostId) ?? Number.MAX_SAFE_INTEGER;
      return game.ghosts.some(gh => {
        if (gh.id === ghostId) return false;
        const otherPriority = GHOST_PRIORITY.get(gh.id) ?? Number.MAX_SAFE_INTEGER;
        if (otherPriority > currentPriority) return false;
        const dist = Math.sqrt(Math.pow(gh.pos.x - x, 2) + Math.pow(gh.pos.y - y, 2));
        return dist < 0.45;
      });
    };

    // Helper function to check if a ghost is at a position
    const getGhostAtPosition = (x: number, y: number, excludeGhostId?: string) => {
      return game.ghosts.find(gh => {
        if (excludeGhostId && gh.id === excludeGhostId) return false;
        const dist = Math.sqrt(Math.pow(gh.pos.x - x, 2) + Math.pow(gh.pos.y - y, 2));
        return dist < 0.5;
      });
    };

    // 1. Pacman Logic
    const p = game.pacman;
    const pAtTarget = Math.abs(p.pos.x - p.target.x) < speed && Math.abs(p.pos.y - p.target.y) < speed;
    if (pAtTarget) {
      p.pos = { ...p.target };
      if (canMove({ x: p.pos.x + p.nextDir.x, y: p.pos.y + p.nextDir.y }, GRID)) p.dir = p.nextDir;
      const nextMove = { x: p.pos.x + p.dir.x, y: p.pos.y + p.dir.y };
      if (canMove(nextMove, GRID)) {
        p.target = nextMove;
      } else {
        p.target = { ...p.pos };
      }
      
      const key = `${Math.round(p.pos.x)},${Math.round(p.pos.y)}`;
      if (game.pellets.has(key)) { game.pellets.delete(key); setScore(s => s + 10); }
      if (game.powerPellets.has(key)) { game.powerPellets.delete(key); setScore(s => s + 50); game.frightenedTimer = 400; game.ghosts.forEach(g => g.isFrightened = true); }
    } else {
      p.pos.x += p.dir.x * speed;
      p.pos.y += p.dir.y * speed;
    }
    // Tunnel
    if (p.pos.x < 0) { p.pos.x = GRID[0].length - 1; p.target.x = GRID[0].length - 1; }
    if (p.pos.x >= GRID[0].length) { p.pos.x = 0; p.target.x = 0; }

    // 2. Ghost Logic
    let collisionOccurred = false;
    game.ghosts.forEach(g => {
      const gAtTarget = Math.abs(g.pos.x - g.target.x) < speed && Math.abs(g.pos.y - g.target.y) < speed;
      if (gAtTarget) {
        g.pos = { ...g.target };
        const ghostIntPos = { x: Math.round(g.pos.x), y: Math.round(g.pos.y) };
        const pacIntPos = { x: Math.round(p.pos.x), y: Math.round(p.pos.y) };
        
        // Get positions of other ghosts
        const otherGhostPositions = new Set<string>();
        game.ghosts.forEach(gh => {
          if (gh.id !== g.id) {
            otherGhostPositions.add(`${Math.round(gh.pos.x)},${Math.round(gh.pos.y)}`);
          }
        });
        
        let next: Point | null = null;

        if (g.isFrightened) {
          const valid = Object.values(DIRECTIONS).filter(d => {
            const nextPos = { x: ghostIntPos.x + d.x, y: ghostIntPos.y + d.y };
            return canMove(nextPos, GRID) && !getGhostAtPosition(nextPos.x, nextPos.y, g.id);
          });
          if (valid.length > 0) {
            next = { x: ghostIntPos.x + valid[Math.floor(Math.random() * valid.length)].x, y: ghostIntPos.y + valid[Math.floor(Math.random() * valid.length)].y };
          } else {
            next = { x: ghostIntPos.x, y: ghostIntPos.y };
          }
        } else {
          if (g.strategy === 'A_STAR') next = aStar(ghostIntPos, pacIntPos, GRID, otherGhostPositions);
          else if (g.strategy === 'BFS') next = bfs(ghostIntPos, pacIntPos, GRID, otherGhostPositions);
          else if (g.strategy === 'DIJKSTRA') next = dijkstra(ghostIntPos, pacIntPos, GRID, otherGhostPositions);
          else {
            const valid = Object.values(DIRECTIONS).filter(d => {
              const nextPos = { x: ghostIntPos.x + d.x, y: ghostIntPos.y + d.y };
              return canMove(nextPos, GRID) && !getGhostAtPosition(nextPos.x, nextPos.y, g.id);
            });
            if (valid.length > 0) {
              next = { x: ghostIntPos.x + valid[Math.floor(Math.random() * valid.length)].x, y: ghostIntPos.y + valid[Math.floor(Math.random() * valid.length)].y };
            } else {
              next = { x: ghostIntPos.x, y: ghostIntPos.y };
            }
          }
        }
        if (next) {
          g.dir = { x: next.x - g.pos.x, y: next.y - g.pos.y };
          g.target = next;
        }
      } else {
        const gSpeed = g.isFrightened ? speed * 0.6 : speed * 0.8;
        const nextX = g.pos.x + g.dir.x * gSpeed;
        const nextY = g.pos.y + g.dir.y * gSpeed;

        if (!isGhostBlockingPosition(nextX, nextY, g.id)) {
          g.pos.x = nextX;
          g.pos.y = nextY;
        } else {
          g.target = { ...g.pos };
        }
      }

      // Collision with Pacman
      const dist = Math.sqrt(Math.pow(g.pos.x - p.pos.x, 2) + Math.pow(g.pos.y - p.pos.y, 2));
      if (dist < 0.6 && !collisionOccurred) {
        collisionOccurred = true;
        if (g.isFrightened) { 
          g.pos = { ...g.spawnPos }; 
          g.target = { ...g.spawnPos }; 
          setScore(s => s + 200); 
        } else {
          setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setStatus('GAMEOVER');
            }
            return newLives;
          });
          // Reset positions
          p.pos = { ...game.spawns.pacman }; 
          p.target = { ...game.spawns.pacman };
          p.dir = DIRECTIONS.RIGHT;
          game.ghosts.forEach(gh => { 
            gh.pos = { ...gh.spawnPos }; 
            gh.target = { ...gh.spawnPos }; 
            gh.dir = DIRECTIONS.UP;
          });
        }
      }
    });

    if (game.frightenedTimer > 0) {
      game.frightenedTimer--;
      if (game.frightenedTimer === 0) game.ghosts.forEach(g => g.isFrightened = false);
    }
    
    if (game.pellets.size === 0 && game.powerPellets.size === 0) {
      setStatus('WIN');
      return;
    }

    draw();
    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [status, draw]);

  useEffect(() => {
    // Cancel any existing animation frame
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    // Start new animation frame if playing
    if (status === 'PLAYING') {
      animationFrameId.current = requestAnimationFrame(gameLoop);
    } else {
      // Draw once when not playing (for menu/game over screens)
      draw();
    }

    // Cleanup on unmount or status change
    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    };
  }, [status, gameLoop, draw]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-white p-4 font-sans select-none">
      <div className="w-full max-w-[456px] flex justify-between items-center mb-4 bg-neutral-900/50 p-4 rounded-2xl border border-neutral-800 shadow-xl">
        <div className="flex items-center gap-3">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="text-xl font-mono font-bold tracking-tighter">{score.toString().padStart(6, '0')}</span>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart key={i} className={`w-6 h-6 transition-colors ${i < lives ? 'text-red-500 fill-red-500' : 'text-neutral-800'}`} />
          ))}
        </div>
      </div>

      <div className="relative group">
        <canvas ref={canvasRef} width={MAP_LAYOUT[0].length * TILE_SIZE} height={MAP_LAYOUT.length * TILE_SIZE} className="rounded-xl border-4 border-neutral-800 shadow-2xl bg-black" />
        <AnimatePresence>
          {status !== 'PLAYING' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm">
              <h1 className="text-5xl font-black mb-8 italic tracking-tighter uppercase text-yellow-500">
                {status === 'START' ? 'AI PACMAN' : status === 'GAMEOVER' ? 'GAME OVER' : 'VICTORY'}
              </h1>
              <button onClick={status === 'START' ? () => setStatus('PLAYING') : initGame} className="bg-yellow-500 hover:bg-yellow-400 text-black px-10 py-5 rounded-full font-black flex items-center gap-3 transition-transform active:scale-95 shadow-lg shadow-yellow-500/20">
                {status === 'START' ? <Play className="fill-current w-6 h-6" /> : <RefreshCw className="w-6 h-6" />}
                {status === 'START' ? 'INSERT COIN' : 'TRY AGAIN'}
              </button>
              {status === 'START' && (
                <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-2 opacity-50 text-[10px] font-mono tracking-widest text-center">
                  <div className="flex items-center gap-2">BLINKY <span className="text-red-500">A*</span></div>
                  <div className="flex items-center gap-2">PINKY <span className="text-pink-400">BFS</span></div>
                  <div className="flex items-center gap-2">INKY <span className="text-cyan-400">DIJKSTRA</span></div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 opacity-40">
        <div className="flex gap-4 text-[10px] font-bold tracking-[0.2em] uppercase">
          <div className="flex gap-2 items-center"><div className="px-2 py-1 bg-neutral-800 rounded">WASD</div> <span>Move</span></div>
          <div className="flex gap-2 items-center"><div className="px-2 py-1 bg-neutral-800 rounded">ARROWS</div> <span>Move</span></div>
        </div>
      </div>
    </div>
  );
}
