# Pacman Game - Thuật toán Pathfinding

Dự án Pacman Game sử dụng 3 thuật toán tìm đường khác nhau cho các ma để đuổi Pacman.

---

## 1. BFS (Breadth-First Search)

### **Được sử dụng bởi:** Ma hồng (Pinky)

### **Nguyên lý hoạt động:**
- Duyệt tất cả các vị trí ở cùng khoảng cách từ điểm bắt đầu trước khi đi xa hơn
- Sử dụng **Queue (FIFO)** để lưu các vị trí cần xét
- Luôn tìm được **đường đi ngắn nhất** trong lưới không có trọng số

### **Mã nguồn** (pathfinding.ts):
```typescript
export function bfs(start: Point, target: Point, map: string[][], blockedPositions?: Set<string>): Point | null {
  const queue: { point: Point; firstMove: Point }[] = [];
  const visited = new Set<string>();
  
  const key = (p: Point) => `${p.x},${p.y}`;
  visited.add(key(start));

  // Bước 1: Thêm tất cả các lối đi khả thi từ vị trí bắt đầu
  for (const dir of Object.values(DIRECTIONS)) {
    const next = { x: start.x + dir.x, y: start.y + dir.y };
    if (canMove(next, map) && (!blockedPositions || !blockedPositions.has(key(next)))) {
      queue.push({ point: next, firstMove: next });
      visited.add(key(next));
    }
  }

  // Bước 2: Duyệt queue
  while (queue.length > 0) {
    const { point, firstMove } = queue.shift()!; // FIFO
    
    // Bước 3: Nếu tìm được mục tiêu
    if (point.x === target.x && point.y === target.y) {
      return firstMove; // Trả về bước đầu tiên
    }

    // Bước 4: Thêm các vị trí tiếp theo vào queue
    for (const dir of Object.values(DIRECTIONS)) {
      const next = { x: point.x + dir.x, y: point.y + dir.y };
      const k = key(next);
      if (canMove(next, map) && !visited.has(k) && (!blockedPositions || !blockedPositions.has(k))) {
        visited.add(k);
        queue.push({ point: next, firstMove });
      }
    }
  }
  return null; // Không tìm được đường
}
```

### **Ưu điểm:**
✅ Tìm được đường ngắn nhất  
✅ Thuật toán đơn giản, dễ hiểu  
✅ Hoạt động tốt trên lưới không có trọng số

### **Nhược điểm:**
❌ Duyệt tất cả các vị trí cùng khoảng cách (không có heuristic)  
❌ Chậm hơn A* trong các không gian lớn

### **Độ phức tạp:**
- **Thời gian:** O(V + E) - V là số vị trí, E là số cạnh
- **Không gian:** O(V) - lưu queue và visited

---

## 2. Dijkstra's Algorithm

### **Được sử dụng bởi:** Ma xanh (Inky)

### **Nguyên lý hoạt động:**
- Mở rộng từ BFS bằng cách **sắp xếp queue theo khoảng cách**
- Tìm được đường đi ngắn nhất ngay cả khi có trọng số khác nhau
- Trong game này, vì tất cả các cạnh có trọng số = 1, nên tương tự BFS

### **Mã nguồn** (pathfinding.ts):
```typescript
export function dijkstra(start: Point, target: Point, map: string[][], blockedPositions?: Set<string>): Point | null {
  const distances: Record<string, number> = {};
  const firstMoves: Record<string, Point> = {};
  const queue: Point[] = [];
  
  const key = (p: Point) => `${p.x},${p.y}`;
  distances[key(start)] = 0;

  // Bước 1: Khởi tạo các lối đi từ start
  for (const dir of Object.values(DIRECTIONS)) {
    const next = { x: start.x + dir.x, y: start.y + dir.y };
    if (canMove(next, map) && (!blockedPositions || !blockedPositions.has(key(next)))) {
      const k = key(next);
      distances[k] = 1; // Khoảng cách từ start
      firstMoves[k] = next;
      queue.push(next);
    }
  }

  // Bước 2: Duyệt từ vị trí có khoảng cách nhỏ nhất
  while (queue.length > 0) {
    queue.sort((a, b) => (distances[key(a)] || Infinity) - (distances[key(b)] || Infinity));
    const current = queue.shift()!;
    const currentDist = distances[key(current)];

    // Bước 3: Nếu tìm được mục tiêu
    if (current.x === target.x && current.y === target.y) {
      return firstMoves[key(current)];
    }

    // Bước 4: Cập nhật khoảng cách cho các vị trí tiếp theo
    for (const dir of Object.values(DIRECTIONS)) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      const k = key(next);
      const newDist = currentDist + 1;

      if (canMove(next, map) && (!blockedPositions || !blockedPositions.has(k)) && 
          (distances[k] === undefined || newDist < distances[k])) {
        distances[k] = newDist;
        firstMoves[k] = firstMoves[key(current)];
        queue.push(next);
      }
    }
  }
  return null;
}
```

### **Ưu điểm:**
✅ Tìm được đường ngắn nhất với mọi loại trọng số  
✅ Linh hoạt hơn BFS

### **Nhược điểm:**
❌ Phải sắp xếp queue mỗi lần (chậm hơn nếu không dùng priority queue)  
❌ Vẫn không có heuristic như A*

### **Độ phức tạp:**
- **Thời gian:** O((V + E) log V) với priority queue
- **Không gian:** O(V)

---

## 3. A* Search Algorithm

### **Được sử dụng bởi:** Ma đỏ (Blinky)

### **Nguyên lý hoạt động:**
- Kết hợp Dijkstra với **heuristic** (Manhattan distance)
- Ưu tiên duyệt các vị trí gần hơn với mục tiêu
- **f(n) = g(n) + h(n)** 
  - `g(n)`: Khoảng cách từ start đến n
  - `h(n)`: Ước tính khoảng cách từ n đến target (Manhattan distance)
  - `f(n)`: Ước tính tổng đường đi

### **Mã nguồn** (pathfinding.ts):
```typescript
export function aStar(start: Point, target: Point, map: string[][], blockedPositions?: Set<string>): Point | null {
  const openSet: Point[] = [];
  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  const firstMoves: Record<string, Point> = {};

  const key = (p: Point) => `${p.x},${p.y}`;
  const h = (p: Point) => Math.abs(p.x - target.x) + Math.abs(p.y - target.y); // Heuristic: Manhattan distance

  // Bước 1: Khởi tạo start
  gScore[key(start)] = 0;
  fScore[key(start)] = h(start);

  // Bước 2: Khởi tạo các lối đi từ start
  for (const dir of Object.values(DIRECTIONS)) {
    const next = { x: start.x + dir.x, y: start.y + dir.y };
    if (canMove(next, map) && (!blockedPositions || !blockedPositions.has(key(next)))) {
      const k = key(next);
      gScore[k] = 1;
      fScore[k] = 1 + h(next); // f(n) = g(n) + h(n)
      firstMoves[k] = next;
      openSet.push(next);
    }
  }

  // Bước 3: Duyệt từ vị trí có f-score nhỏ nhất
  while (openSet.length > 0) {
    openSet.sort((a, b) => (fScore[key(a)] || Infinity) - (fScore[key(b)] || Infinity));
    const current = openSet.shift()!;

    // Bước 4: Nếu tìm được mục tiêu
    if (current.x === target.x && current.y === target.y) {
      return firstMoves[key(current)];
    }

    // Bước 5: Mở rộng các vị trí tiếp theo
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
```

### **Ưu điểm:**
✅ **Nhanh nhất** - duyệt ít vị trí nhất nhờ heuristic  
✅ Vẫn tìm được đường ngắn nhất  
✅ Phù hợp với trò chơi thời gian thực

### **Nhược điểm:**
❌ Heuristic phải được thiết kế tốt  
❌ Phức tạp hơn BFS và Dijkstra

### **Độ phức tạp:**
- **Thời gian:** O((V + E) log V) trong trường hợp tốt nhất
- **Không gian:** O(V)

---

## 4. Cách sử dụng trong Game

### **Trong PacmanGame.tsx** (dòng ~273):
```typescript
// Lấy vị trí hiện tại của ma và Pacman
const ghostIntPos = { x: Math.round(g.pos.x), y: Math.round(g.pos.y) };
const pacIntPos = { x: Math.round(p.pos.x), y: Math.round(p.pos.y) };

// Lấy danh sách vị trí của các ma khác (để tránh va chạm)
const otherGhostPositions = new Set<string>();
game.ghosts.forEach(gh => {
  if (gh.id !== g.id) {
    otherGhostPositions.add(`${Math.round(gh.pos.x)},${Math.round(gh.pos.y)}`);
  }
});

// Lựa chọn thuật toán theo chiến lược của ma
let next: Point | null = null;

if (g.strategy === 'A_STAR') 
  next = aStar(ghostIntPos, pacIntPos, GRID, otherGhostPositions);
else if (g.strategy === 'BFS') 
  next = bfs(ghostIntPos, pacIntPos, GRID, otherGhostPositions);
else if (g.strategy === 'DIJKSTRA') 
  next = dijkstra(ghostIntPos, pacIntPos, GRID, otherGhostPositions);
else {
  // Random movement
  const valid = Object.values(DIRECTIONS).filter(d => {
    const nextPos = { x: ghostIntPos.x + d.x, y: ghostIntPos.y + d.y };
    return canMove(nextPos, GRID) && !getGhostAtPosition(nextPos.x, nextPos.y, g.id);
  });
  if (valid.length > 0) {
    next = { x: ghostIntPos.x + valid[Math.floor(Math.random() * valid.length)].x, 
             y: ghostIntPos.y + valid[Math.floor(Math.random() * valid.length)].y };
  }
}

// Cập nhật hướng di chuyển
if (next) {
  g.dir = { x: next.x - g.pos.x, y: next.y - g.pos.y };
  g.target = next;
}
```

### **Cấu hình các ma:**
```typescript
const GHOST_CONFIGS = [
  { id: 'blinky', color: COLORS.BLINKY, strategy: 'A_STAR' },    // Ma đỏ - thông minh nhất
  { id: 'pinky', color: COLORS.PINKY, strategy: 'BFS' },         // Ma hồng - đơn giản
  { id: 'inky', color: COLORS.INKY, strategy: 'DIJKSTRA' },      // Ma xanh - trung bình
];
```

---

## 5. So sánh 3 thuật toán

| Tiêu chí | BFS | Dijkstra | A* |
|---------|-----|----------|-----|
| **Thuật toán** | Pinky | Inky | Blinky |
| **Độ phức tạp** | O(V+E) | O((V+E) log V) | O((V+E) log V) |
| **Tìm đường ngắn nhất** | ✅ | ✅ | ✅ |
| **Heuristic** | ❌ | ❌ | ✅ (Manhattan) |
| **Tốc độ** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Độ phức tạp code** | ⭐ | ⭐⭐ | ⭐⭐⭐ |

---

## 6. Kết luận

- **BFS** phù hợp khi cần đơn giản và chắc chắn tìm được đường
- **Dijkstra** phù hợp khi có trọng số khác nhau
- **A*** là lựa chọn tối ưu cho trò chơi thời gian thực với heuristic tốt

Trong dự án này, ma đỏ (A*) sẽ là đối thủ khó nhất vì nó tìm đường nhanh nhất!

---

## 7. Chi tiết: Cách Con Ma Áp dụng Thuật toán

### **Luồng thực thi từng frame:**

```
Frame 1: Kiểm tra → Gọi thuật toán → Cập nhật hướng
   ↓
Frame 2-5: Di chuyển dần dần tới target
   ↓
Frame 6: Đến target → Gọi lại thuật toán → Tìm target mới
   ↓
Lặp lại...
```

### **Bước 1: Kiểm tra xem ma đã đến target chưa**

```typescript
// Nếu ma gần target (trong GHOST_SPEED)
const gAtTarget = Math.abs(g.pos.x - g.target.x) < GHOST_SPEED && 
                  Math.abs(g.pos.y - g.target.y) < GHOST_SPEED;

if (gAtTarget) {
  // → Thực thi Bước 2
}
```

**Ví dụ:** Ma hồng ở (8, 5), target là (8, 6)
- Nếu GHOST_SPEED = 0.3, và khoảng cách < 0.3 → Coi như đã đến

---

### **Bước 2: Khi ma đến target, gọi thuật toán pathfinding**

```typescript
// Lấy vị trí nguyên số (grid position)
const ghostIntPos = { x: Math.round(g.pos.x), y: Math.round(g.pos.y) };
const pacIntPos = { x: Math.round(p.pos.x), y: Math.round(p.pos.y) };

// Lấy danh sách vị trí ma khác (để tránh va chạm)
const otherGhostPositions = new Set<string>();
game.ghosts.forEach(gh => {
  if (gh.id !== g.id) {
    otherGhostPositions.add(`${Math.round(gh.pos.x)},${Math.round(gh.pos.y)}`);
  }
});

// Gọi thuật toán theo chiến lược
let next: Point | null = null;
if (g.strategy === 'A_STAR') 
  next = aStar(ghostIntPos, pacIntPos, GRID, otherGhostPositions);
else if (g.strategy === 'BFS') 
  next = bfs(ghostIntPos, pacIntPos, GRID, otherGhostPositions);
else if (g.strategy === 'DIJKSTRA') 
  next = dijkstra(ghostIntPos, pacIntPos, GRID, otherGhostPositions);
```

**Ví dụ:** Ma hồng (Pinky) dùng BFS
- **Input:** 
  - Ma ở (8, 5)
  - Pacman ở (5, 7)
  - Các ma khác ở: {(9, 1), (10, 1)}
- **Output:** BFS trả về điểm tiếp theo là (8, 6) hoặc (7, 5)

---

### **Bước 3: Cập nhật hướng di chuyển**

```typescript
if (next) {
  // Tính vector hướng (dx, dy)
  g.dir = { x: next.x - g.pos.x, y: next.y - g.pos.y };
  // Set target mới để di chuyển
  g.target = next;
}
```

**Ví dụ:**
- Ma ở (8, 5), thuật toán trả về next = (8, 6)
- `g.dir = { x: 8-8, y: 6-5 } = { x: 0, y: 1 }` (di chuyển xuống)
- `g.target = { x: 8, y: 6 }`

---

### **Bước 4: Di chuyển ma liên tục**

```typescript
else {
  // Nếu chưa đến target, di chuyển dần dần
  const nextX = g.pos.x + g.dir.x * GHOST_SPEED;
  const nextY = g.pos.y + g.dir.y * GHOST_SPEED;

  if (!isGhostBlockingPosition(nextX, nextY, g.id)) {
    g.pos.x = nextX;
    g.pos.y = nextY;
  } else {
    g.target = { ...g.pos }; // Dừng nếu chạm tường
  }
}
```

**Ví dụ với GHOST_SPEED = 0.3:**
- Frame 1: pos = (8.0, 5.0)
- Frame 2: pos = (8.0, 5.3)
- Frame 3: pos = (8.0, 5.6)
- Frame 4: pos = (8.0, 5.9)
- Frame 5: pos = (8.0, 6.2) → Vượt qua target
- → Coi như đến, gọi lại thuật toán

---

### **Ví dụ thực tế: Ma hồng (BFS) đuổi Pacman**

```
Lưới game (19x15):
###################
#........G........#  (G = Ma khác)
#.###.#######.###.#
#.................#
#.###.###.###.###.#
#.#...#.....#...#.#
#.#.###.###.###.#.#
#.................#
#.#.###.###.###.#.#
#.#...#.....#...#.#
#.###.###.###.###.#
#.................#
#.###.#######.###.#
#........P........#  (P = Pacman)
###################

Vị trí hiện tại:
- Ma hồng (Pinky): (8, 12)
- Pacman: (9, 13)

Frame 250:
1. Kiểm tra: gAtTarget = true (đã đến target cũ)

2. Gọi BFS:
   bfs({ x: 8, y: 12 }, { x: 9, y: 13 }, GRID, otherGhosts)
   
   BFS tìm đường:
   Start (8,12)
   ├─ Thử UP (8,11): ✓ không tường
   ├─ Thử DOWN (8,13): ✓ không tường
   ├─ Thử LEFT (7,12): ✓ không tường
   └─ Thử RIGHT (9,12): ✓ không tường
   
   Queue: [(8,11,firstMove:(8,11)), (8,13,firstMove:(8,13)), ...]
   
   Tiếp tục duyệt từ (8,11):
   ├─ Kiểm tra (8,10): không phải target
   ├─ Thêm vào queue...
   
   Khi kiểm tra (9,12):
   ├─ Từ (9,12) có thể đi tới (9,13) 
   ├─ (9,13) == Pacman position ✓
   └─ Return firstMove = (9,12) từ start!
   
   Vậy BFS trả về: (9, 12)

3. Cập nhật hướng:
   g.dir = { x: 9-8, y: 12-12 } = { x: 1, y: 0 }  (di chuyển phải)
   g.target = { x: 9, y: 12 }

4. Di chuyển:
   Frame 251: pos = (8.3, 12)
   Frame 252: pos = (8.6, 12)
   Frame 253: pos = (8.9, 12)
   Frame 254: pos.x > 9 - 0.3 → gAtTarget = true
   
5. Frame 255: Gọi lại BFS
   bfs({ x: 9, y: 12 }, { x: 9, y: 13 }, ...)
   → Trả về (9, 13) - tiếp cận Pacman!
   
   g.dir = { x: 0, y: 1 }  (di chuyển xuống)
   g.target = { x: 9, y: 13 }

6. Di chuyển:
   Frame 256: pos = (9, 12.3)
   Frame 257: pos = (9, 12.6)
   Frame 258: pos = (9, 12.9)
   Frame 259: pos.y > 13 - 0.3 → Gần Pacman, chuẩn bị va chạm!
```

---

### **So sánh 3 chiến lược:**

#### **BFS (Ma hồng):**
```
Tìm kiếm: Duyệt từng lớp
Frame 250: Gọi BFS → Duyệt tất cả vị trí cách 1 bước, rồi cách 2 bước...
Result: Tìm được đường 8 bước tới Pacman
Speed: ⭐⭐ (bình thường)
```

#### **Dijkstra (Ma xanh):**
```
Tìm kiếm: Ưu tiên vị trí gần nhất
Frame 250: Gọi Dijkstra → Sắp xếp queue theo khoảng cách
Result: Tương tự BFS, vì tất cả cạnh = 1
Speed: ⭐⭐⭐ (hơi nhanh hơn BFS)
```

#### **A* (Ma đỏ):**
```
Tìm kiếm: Ưu tiên theo f(n) = g(n) + Manhattan distance
Frame 250: Gọi A* 
         → Ưu tiên (9, 12) vì gần Pacman hơn
         → Duyệt ít vị trí hơn
Result: Tìm được đường 8 bước nhưng nhanh hơn
Speed: ⭐⭐⭐⭐⭐ (nhanh nhất!)
```

---

### **Kết luận:**

Mỗi frame, khi ma tới target, nó:
1. **Gọi thuật toán** (BFS/Dijkstra/A*) từ vị trí ma tới vị trí Pacman
2. **Nhận bước tiếp theo** từ thuật toán
3. **Di chuyển dần dần** tới bước tiếp theo (mỗi frame di chuyển GHOST_SPEED)
4. **Lặp lại** khi đến target mới

→ Ma đỏ luôn tìm được đường tối ưu và nhanh nhất!
→ Ma xanh tìm tối ưu nhưng chậm hơn!
→ Ma hồng tìm tối ưu nhưng lâu hơn!
