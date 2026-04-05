import { useEffect, useRef } from 'react';
import { updateColliderPhysics } from '../engine/colliderPhysics';
import type { ColliderBall } from '../engine/colliderPhysics';
import { POPULAR_15_COUNTRIES, getFlagUrl } from '../utils/flags';

interface FlagColliderProps {
  onGameOver?: (winnerCode: string) => void;
  onUpdateStats: (alive: number, leaderboardDeltas: Record<string, number>, totalAtStart?: number) => void;
  onSurvivorsUpdate?: (survivors: string[]) => void;
  isPaused: boolean;
  selectedCountries?: string[];
  enableDangerCircle?: boolean;
  enableSafeArch?: boolean;
  pointsDeduction?: number;
  enableBomb?: boolean;
  enableMovingBomb?: boolean;
  lastAddedCountry?: { code: string; userName?: string; timestamp: number } | null;
  speed?: number;
}


export function FlagCollider({ 
  onGameOver, 
  onUpdateStats, 
  onSurvivorsUpdate, 
  isPaused, 
  selectedCountries, 
  enableDangerCircle = true, 
  enableSafeArch = true,
  pointsDeduction = 10,
  enableBomb = true,
  enableMovingBomb = false,
  lastAddedCountry = null,
  speed = 2
}: FlagColliderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<ColliderBall[]>([]);
  const requestRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);
  const framesRef = useRef<number>(0);
  const isGameOverRef = useRef<boolean>(false);

  // Preload images into a map for fast drawing
  const imagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        // Match exact real screen-space layout footprint assigned by CSS (.game-layer flex box)
        canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
        canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Initialize balls
    const canvas = canvasRef.current;
    const cw = canvas && canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
    const ch = canvas && canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
    const isDesktop = window.innerWidth > 768;
    const dynamicRadius = Math.min(cw, ch) * (isDesktop ? 0.35 : 0.45);
    const dynamicBallRadius = Math.max(12, dynamicRadius * (isDesktop ? 0.055 : 0.066));

    const countries = selectedCountries && selectedCountries.length > 0
      ? selectedCountries
      : POPULAR_15_COUNTRIES;

    ballsRef.current = countries.map((countryCode, i) => {
      // Spawn within a smaller radius so they don't spawn outside
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (dynamicRadius - dynamicBallRadius - 10);
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
        vx: Math.cos(angleVel) * speed,
        vy: Math.sin(angleVel) * speed,
        radius: dynamicBallRadius,
        isAlive: true,
        wins: 0,
        health: 100,
        cooldown: 90 // 1.5 seconds spawn invincibility
      };
    });

    onUpdateStats(countries.length, {}, countries.length);
  }, []);

  // Handle dynamic additions from YouTube Chat
  useEffect(() => {
    if (!lastAddedCountry) return;

    // Check if ball already exists (optional: allow multiples? Let's allow one for now or just spawn anyway)
    // Most streamers like it if multiple people can join, but here we keep it to unique for simplicity or per-request
    
    const countryCode = lastAddedCountry.code;
    
    // Preload image
    if (!imagesRef.current.has(countryCode)) {
      const img = new Image();
      img.src = getFlagUrl(countryCode);
      imagesRef.current.set(countryCode, img);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const isDesktop = window.innerWidth > 768;
    const dynamicRadius = Math.min(cw, ch) * (isDesktop ? 0.35 : 0.45);
    const dynamicBallRadius = Math.max(12, dynamicRadius * (isDesktop ? 0.055 : 0.066));

    // Spawn at center or random
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (dynamicRadius * 0.5); // Spawn in inner half

    ballsRef.current.push({
      id: `ball-chat-${lastAddedCountry.timestamp}`,
      countryCode,
      userName: lastAddedCountry.userName,
      x: Math.cos(angle) * dist,
      y: Math.sin(angle) * dist,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: dynamicBallRadius,
      isAlive: true,
      wins: 0,
      health: 100,
      cooldown: 90
    });

    const aliveCount = ballsRef.current.filter(b => b.isAlive && !b.isBomb).length;
    onUpdateStats(aliveCount, {});
  }, [lastAddedCountry]);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const isDesktop = window.innerWidth > 768;
    const cy = canvas.height / 2 - (isDesktop ? canvas.height * 0.05 : 0);
    const dynamicRadius = Math.min(canvas.width, canvas.height) * (isDesktop ? 0.35 : 0.45);
    const aliveCount = ballsRef.current.filter(b => b.isAlive && !b.isBomb).length;

    // Draw Arena
    ctx.beginPath();
    ctx.arc(cx, cy, dynamicRadius, 0, Math.PI * 2);
    if (enableDangerCircle) {
      ctx.strokeStyle = '#ff0000'; // Neon red glow for Collider arena
      ctx.lineWidth = 6;
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 15;
    } else {
      ctx.strokeStyle = '#ffffff'; // White neon circle
      ctx.lineWidth = 4;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
    }
    ctx.stroke();

    // Calculate dynamic safe arc length
    const timeFactor = 2 / speed;
    const shrinkDuration = 3600 * timeFactor; 
    const progress = Math.min(1, framesRef.current / shrinkDuration);
    const safeRatio = 1.0 - (0.9 * progress); // 100% down to 10%
    const safeArcLength = Math.PI * 2 * safeRatio;

    // Draw Safe Arc
    if (enableSafeArch && enableDangerCircle) {
      ctx.beginPath();
      ctx.arc(cx, cy, dynamicRadius, rotationRef.current, rotationRef.current + safeArcLength);
      ctx.strokeStyle = '#00ffcc'; // Neon cyan/green safe zone
      ctx.lineWidth = 10;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 20;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // reset shadow for other elements
    ctx.lineCap = 'butt';
    ctx.shadowBlur = 0;

    // Draw Bomb at center if conditions met
    if (enableBomb && aliveCount <= 5 && !isGameOverRef.current) {
      const bombRadius = Math.max(20, dynamicRadius * 0.08);
      ctx.save();
      ctx.font = `${bombRadius * 1.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Pulsing effect for the bomb
      const pulse = 1 + Math.sin(framesRef.current * 0.1) * 0.1;
      ctx.translate(cx, cy);
      ctx.scale(pulse, pulse);
      ctx.fillText("💣", 0, 0);
      
      // Optional: Red glow around bomb
      ctx.beginPath();
      ctx.arc(0, 0, bombRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.restore();
    }

    // Draw Balls
    for (const ball of ballsRef.current) {
      if (!ball.isAlive) continue;

      if (ball.isBomb) {
        // Draw Moving Bomb
        ctx.save();
        ctx.translate(cx + ball.x, cy + ball.y);
        const pulse = 1 + Math.sin(framesRef.current * 0.15) * 0.1;
        ctx.scale(pulse, pulse);
        ctx.font = `${ball.radius * 1.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("💣", 0, 0);
        
        ctx.beginPath();
        ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + ball.x, cy + ball.y, ball.radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip(); // Clip to circle

      // Draw Flag Image
      const img = imagesRef.current.get(ball.countryCode);
      if (img && img.complete) {
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

      // Health background
      ctx.beginPath();
      ctx.arc(cx + ball.x, cy + ball.y, ball.radius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw health bar (circular around flag)
      const healthRatio = Math.max(0, ball.health) / 100;
      if (healthRatio > 0) {
        ctx.beginPath();
        ctx.arc(cx + ball.x, cy + ball.y, ball.radius + 4, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * healthRatio), false);
        ctx.strokeStyle = healthRatio > 0.5 ? '#0f0' : healthRatio > 0.25 ? '#ff0' : '#f00'; // Green -> Yellow -> Red
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.lineCap = 'butt';
      }

      // Draw ball border
      ctx.beginPath();
      ctx.arc(cx + ball.x, cy + ball.y, ball.radius, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw revolving sword
      ctx.save();
      ctx.translate(cx + ball.x, cy + ball.y);
      
      // Use fixed offset from ID or code to ensure consistent but varied speeds/offsets
      const idHash = ball.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const swordRotation = (framesRef.current * 0.05) + (idHash * 0.1); 
      ctx.rotate(swordRotation);
      
      ctx.translate(ball.radius + 15, 0);
      ctx.rotate((Math.PI * 5) / 4); // Adjust emoji so handle (tail) points inward to the flag

      ctx.font = `${Math.max(16, ball.radius * 1.2)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText("🗡️", 0, 0); 
      ctx.restore();

      // Draw User Name if available
      if (ball.userName) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(ball.userName, cx + ball.x, cy + ball.y - ball.radius - 15);
        ctx.shadowBlur = 0;
      }
    }
  };

  const loop = () => {
    if (!isPaused) {
      framesRef.current++;
      const speedFactor = speed / 2;
      rotationRef.current += 0.015 * speedFactor; // rotate safe zone
      const aliveFlags = ballsRef.current.filter(b => b.isAlive && !b.isBomb);
      const previousAliveCount = aliveFlags.length;

      const canvasH = canvasRef.current ? canvasRef.current.height : window.innerHeight;
      const canvasW = canvasRef.current ? canvasRef.current.width : window.innerWidth;
      const isDesktop = window.innerWidth > 768;
      const dynamicRadius = Math.min(canvasW, canvasH) * (isDesktop ? 0.35 : 0.45);
      const dynamicBallRadius = Math.max(12, dynamicRadius * (isDesktop ? 0.055 : 0.066));

      // Smoothly update ball radii mapping if screen resizes dynamically
      ballsRef.current.forEach(b => b.radius = dynamicBallRadius);

      const timeFactor = 2 / speed;
      const shrinkDuration = 3600 * timeFactor;
      const progress = Math.min(1, framesRef.current / shrinkDuration);
      const safeRatio = 1.0 - (0.9 * progress);
      const safeArcLength = Math.PI * 2 * safeRatio;

      // Spawn Moving Bomb Flag if survivors <= 5
      if (enableMovingBomb && previousAliveCount <= 5 && !ballsRef.current.some(b => b.isBomb)) {
        const angle = Math.random() * Math.PI * 2;
        ballsRef.current.push({
          id: 'moving-bomb',
          countryCode: 'bomb',
          x: 0,
          y: 0,
          vx: Math.cos(angle) * speed * 1.5,
          vy: Math.sin(angle) * speed * 1.5,
          radius: dynamicBallRadius * 1.2,
          isAlive: true,
          wins: 0,
          health: 100,
          cooldown: 0,
          isBomb: true
        });
      }

      const { nextBalls, winnersDeltas } = updateColliderPhysics(
        ballsRef.current,
        dynamicRadius,
        speed / 2,
        rotationRef.current,
        safeArcLength,
        enableDangerCircle,
        enableSafeArch,
        pointsDeduction
      );
      
      // Static Bomb Collision Check (center is 0,0)
      if (enableBomb && previousAliveCount <= 5) {
        const bombRadius = Math.max(20, dynamicRadius * 0.08);
        for (const b of nextBalls) {
          if (!b.isAlive || b.isBomb) continue;
          const distToCenter = Math.hypot(b.x, b.y);
          if (distToCenter < b.radius + bombRadius) {
            b.isAlive = false;
            b.health = 0;
          }
        }
      }

      ballsRef.current = nextBalls;

      const currentAliveCount = nextBalls.filter(b => b.isAlive && !b.isBomb).length;

      if (Object.keys(winnersDeltas).length > 0 || currentAliveCount !== previousAliveCount) {
        onUpdateStats(currentAliveCount, winnersDeltas);
        if (onSurvivorsUpdate) {
          const survivorCodes = nextBalls
            .filter(b => b.isAlive && !b.isBomb)
            .map(b => b.countryCode);
          onSurvivorsUpdate(survivorCodes);
        }
      }

      if (currentAliveCount <= 1 && !isGameOverRef.current) {
        isGameOverRef.current = true;
        const winner = nextBalls.find(b => b.isAlive && !b.isBomb);
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
        style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
      />
    </div>
  );
}
