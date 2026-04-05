export interface FlagBall {
  id: string;
  countryCode: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isAlive: boolean;
  wins: number;
  cooldown: number; // cooldown frames before it can kill again
  hasExited?: boolean;
  exitOrder?: number;
  isAtRest?: boolean;
}

// Global exit tracker for culling
let globalExitCounter = 0;

// Elastic collision resolution between two balls
function resolveCollision(b1: FlagBall, b2: FlagBall) {
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const dist = Math.hypot(dx, dy) || 1;

  // Normal vector
  const nx = dx / dist;
  const ny = dy / dist;

  // Relative velocity
  const dvx = b1.vx - b2.vx;
  const dvy = b1.vy - b2.vy;

  // Velocity along the normal
  const p = 2 * (nx * dvx + ny * dvy) / 2; // Assuming equal mass = 1

  // Update velocities (elastic collision)
  b1.vx -= p * nx;
  b1.vy -= p * ny;
  b2.vx += p * nx;
  b2.vy += p * ny;

  // Separate them to avoid sticking/overlapping
  const overlap = (b1.radius + b2.radius) - dist;
  if (overlap > 0) {
    b1.x -= (nx * overlap) / 2;
    b1.y -= (ny * overlap) / 2;
    b2.x += (nx * overlap) / 2;
    b2.y += (ny * overlap) / 2;
  }
}

export function updatePhysics(
  balls: FlagBall[],
  arenaRadius: number,
  speedMultiplier: number = 1,
  floorY: number = 400,
  wallX: number = 400,
  rotationAngle: number = 0,
  maxFloorBalls: number = 50
): { nextBalls: FlagBall[]; winnersDeltas: Record<string, number> } {
  const nextBalls = [...balls];
  const winnersDeltas: Record<string, number> = {};

  // 1. Move
  for (const b of nextBalls) {
    if (!b.isAlive) continue;
    
    // Apply gravity
    if (b.hasExited && !b.isAtRest) {
      b.vy += 0.2;
    }
    
    b.x += b.vx * speedMultiplier;
    b.y += b.vy * speedMultiplier;
    
    // Walls and Floor for exited balls
    if (b.hasExited && !b.isAtRest) {
      if (b.x - b.radius < -wallX) {
        b.x = -wallX + b.radius;
        b.vx *= -0.5;
      } else if (b.x + b.radius > wallX) {
        b.x = wallX - b.radius;
        b.vx *= -0.5;
      }
      
      if (b.y + b.radius > floorY) {
        b.y = floorY - b.radius;
        b.vy *= -0.5;
        b.vx *= 0.95; // friction
        
        if (Math.abs(b.vy) < 0.5 && Math.abs(b.vx) < 0.5) {
          b.vy = 0;
          b.vx = 0;
          b.isAtRest = true;
        }
      }
    }
    
    if (b.cooldown > 0) b.cooldown--;
  }

  // 2. Arena Boundary constraints
  for (const b of nextBalls) {
    if (!b.isAlive || b.hasExited) continue;
    const distFromCenter = Math.hypot(b.x, b.y);
    if (distFromCenter + b.radius > arenaRadius) {
      const angle = Math.atan2(b.y, b.x);
      
      let diff = angle - (rotationAngle + Math.PI / 2);
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;

      if (Math.abs(diff) <= 0.2) {
        if (!b.hasExited) {
          b.hasExited = true;
          b.exitOrder = globalExitCounter++;
        }
        continue;
      }

      // It's outside the boundary, push it back in and reflect velocity
      const nx = b.x / distFromCenter;
      const ny = b.y / distFromCenter;

      // Push back
      const overlap = (distFromCenter + b.radius) - arenaRadius;
      b.x -= nx * overlap;
      b.y -= ny * overlap;

      // Reflect velocity across normal
      const dot = b.vx * nx + b.vy * ny;
      if (dot > 0) {
        b.vx -= 2 * dot * nx;
        b.vy -= 2 * dot * ny;
      }
    }
  }

  // 3. Collisions between balls
  for (let i = 0; i < nextBalls.length; i++) {
    for (let j = i + 1; j < nextBalls.length; j++) {
      const b1 = nextBalls[i];
      const b2 = nextBalls[j];

      if (!b1.isAlive || !b2.isAlive) continue;

      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const dist = Math.hypot(dx, dy);

      if (dist < b1.radius + b2.radius) {
        // Resolve physical elastic bounce
        resolveCollision(b1, b2);

        // Wake up resting balls if they get hit
        if (b1.isAtRest && b1.hasExited) b1.isAtRest = false;
        if (b2.isAtRest && b2.hasExited) b2.isAtRest = false;
      }
    }
  }

  // 4. Enforce strict uniform speed inside arena
  for (const b of nextBalls) {
    if (b.isAlive && !b.hasExited) {
      const speed = Math.hypot(b.vx, b.vy);
      if (speed !== 0) {
        b.vx = (b.vx / speed) * 2;
        b.vy = (b.vy / speed) * 2;
      }
    }
  }

  // 5. Enforce floor limit
  const exitedBalls = nextBalls.filter(b => b.hasExited && b.isAlive);
  if (exitedBalls.length > maxFloorBalls) {
    exitedBalls.sort((a, b) => (a.exitOrder || 0) - (b.exitOrder || 0));
    const toRemove = exitedBalls.length - maxFloorBalls;
    for (let i = 0; i < toRemove; i++) {
      exitedBalls[i].isAlive = false;
    }
  }

  return { nextBalls, winnersDeltas };
}
