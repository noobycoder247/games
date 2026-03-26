import { useEffect, useRef } from 'react';
import { updatePhysics } from '../engine/physics';
import type { FlagBall } from '../engine/physics';
import { getRandomCountries, getFlagUrl } from '../utils/flags';

interface FlagBattleProps {
  onGameOver?: (winnerCode: string) => void;
  onUpdateStats: (alive: number, leaderboardDeltas: Record<string, number>) => void;
  isPaused: boolean;
  selectedCountries?: string[];
}

const ARENA_RADIUS = 300;
const BALL_RADIUS = 20;
const INITIAL_BALLS = 40;
const SPEED = 3;

export function FlagBattle({ onGameOver, onUpdateStats, isPaused, selectedCountries }: FlagBattleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<FlagBall[]>([]);
  const requestRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);
  const isGameOverRef = useRef<boolean>(false);

  // Preload images into a map for fast drawing
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    // Initialize balls
    const countries = selectedCountries && selectedCountries.length > 0
      ? selectedCountries
      : getRandomCountries(INITIAL_BALLS);
      
    ballsRef.current = countries.map((countryCode, i) => {
      // Spawn within a smaller radius so they don't spawn outside
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (ARENA_RADIUS - BALL_RADIUS - 10);
      const angleVel = Math.random() * Math.PI * 2;

      // Start fetching image
      if (!imagesRef.current.has(countryCode)) {
        const img = new Image();
        img.src = getFlagUrl(countryCode);
        imagesRef.current.set(countryCode, img);
      }

      return {
        id: `ball-${i}`,
        countryCode,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        vx: Math.cos(angleVel) * SPEED,
        vy: Math.sin(angleVel) * SPEED,
        radius: BALL_RADIUS,
        isAlive: true,
        wins: 0,
        cooldown: 0
      };
    });

    onUpdateStats(countries.length, {});
  }, []);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // Draw Arena
    ctx.beginPath();
    const gapStart = rotationRef.current + Math.PI / 2 + 0.2;
    const gapEnd = rotationRef.current + Math.PI / 2 - 0.2 + Math.PI * 2;
    ctx.arc(cx, cy, ARENA_RADIUS, gapStart, gapEnd);
    ctx.strokeStyle = '#0ff'; // Cyan glow
    ctx.lineWidth = 6;
    ctx.shadowColor = '#0ff';
    ctx.shadowBlur = 15;
    ctx.stroke();
    // reset shadow for other elements
    ctx.shadowBlur = 0;

    // Draw Balls
    for (const ball of ballsRef.current) {
      if (!ball.isAlive) continue;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + ball.x, cy + ball.y, ball.radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip(); // Clip to circle

      // Draw Flag Image
      const img = imagesRef.current.get(ball.countryCode);
      if (img && img.complete) {
        // Draw the image scaled to fit the circle
        // The image itself is rectangular, so we center it
        ctx.drawImage(
          img,
          cx + ball.x - ball.radius * 1.5,
          cy + ball.y - ball.radius,
          ball.radius * 3,
          ball.radius * 2
        );
      } else {
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '12px Arial';
        ctx.fillText(ball.countryCode.toUpperCase(), cx + ball.x, cy + ball.y);
      }

      ctx.restore();

      // Draw ball border
      ctx.beginPath();
      ctx.arc(cx + ball.x, cy + ball.y, ball.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  const loop = () => {
    if (!isPaused) {
      rotationRef.current += 0.01;
      const { nextBalls, winnersDeltas } = updatePhysics(
        ballsRef.current,
        ARENA_RADIUS,
        1,
        canvasRef.current ? canvasRef.current.height / 2 : 400,
        canvasRef.current ? canvasRef.current.width / 2 : 400,
        rotationRef.current
      );
      ballsRef.current = nextBalls;

      const aliveCount = nextBalls.filter(b => !b.hasExited).length;
      
      if (Object.keys(winnersDeltas).length > 0 || aliveCount !== ballsRef.current.filter(b => !b.hasExited).length) {
        onUpdateStats(aliveCount, winnersDeltas);
      }

      if (aliveCount <= 1 && !isGameOverRef.current) {
        isGameOverRef.current = true;
        const winner = nextBalls.find(b => !b.hasExited);
        if (onGameOver) {
          onGameOver(winner ? winner.countryCode : '');
        }
      }
    }

    draw();
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPaused]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={1000}
        style={{ maxWidth: '100%', height: 'auto', outline: 'none' }}
      />
    </div>
  );
}
