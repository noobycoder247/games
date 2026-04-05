export interface ColliderBall {
  id: string;
  countryCode: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isAlive: boolean;
  wins: number;
  health: number;
  cooldown: number; // to prevent multiple damages from the same collision quickly
  isBomb?: boolean;
  userName?: string;
}

function resolveCollision(b1: ColliderBall, b2: ColliderBall) {
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

export function updateColliderPhysics(
  balls: ColliderBall[],
  arenaRadius: number,
  speedMultiplier: number = 1,
  rotationAngle: number = 0,
  safeArcLength: number = Math.PI * 2,
  isDangerCircleActive: boolean = true,
  isSafeArchActive: boolean = true,
  pointsDeduction: number = 10
): { nextBalls: ColliderBall[]; winnersDeltas: Record<string, number> } {
  const nextBalls = [...balls];
  const winnersDeltas: Record<string, number> = {};

  // 1. Move
  for (const b of nextBalls) {
    if (!b.isAlive) continue;
    
    b.x += b.vx * speedMultiplier;
    b.y += b.vy * speedMultiplier;
    
    if (b.cooldown > 0) b.cooldown--;
  }

  // 2. Arena Boundary constraints (No Exit)
  for (const b of nextBalls) {
    if (!b.isAlive) continue;
    const distFromCenter = Math.hypot(b.x, b.y);
    if (distFromCenter + b.radius > arenaRadius) {
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

      // Apply wall collision damage
      if (b.cooldown === 0 && isDangerCircleActive && !b.isBomb) {
        let isSafe = false;
        
        if (!isSafeArchActive) {
          isSafe = false; // No safe arc exists
        } else if (safeArcLength >= Math.PI * 2 - 0.01) {
          isSafe = true; // Fully safe
        } else {
          const angle = Math.atan2(b.y, b.x);
          let diff = angle - (rotationAngle + safeArcLength / 2);
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;

          isSafe = Math.abs(diff) <= (safeArcLength / 2 + 0.08); // Add slight padding
        }

        if (!isSafe) {
          b.health -= pointsDeduction;
          b.cooldown = 15;
          if (b.health <= 0) b.isAlive = false;
        }
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

        // Apply health damage independently if cooldown is 0
        // If either ball is a bomb, the other ball is instantly eliminated
        if (b1.isBomb && !b2.isBomb) {
          b2.health = 0;
          b2.isAlive = false;
        } else if (b2.isBomb && !b1.isBomb) {
          b1.health = 0;
          b1.isAlive = false;
        } else if (!b1.isBomb && !b2.isBomb) {
          if (b1.cooldown === 0) {
            b1.health -= pointsDeduction;
            b1.cooldown = 15; // Set cooldown frames
            if (b1.health <= 0) b1.isAlive = false;
          }
          if (b2.cooldown === 0) {
            b2.health -= pointsDeduction;
            b2.cooldown = 15;
            if (b2.health <= 0) b2.isAlive = false;
          }
        }
      }
    }
  }

  // 4. Enforce strict uniform speed inside arena
  for (const b of nextBalls) {
    if (b.isAlive) {
      const speed = Math.hypot(b.vx, b.vy);
      if (speed !== 0) {
        b.vx = (b.vx / speed) * 2;
        b.vy = (b.vy / speed) * 2;
      }
    }
  }

  return { nextBalls, winnersDeltas };
}
