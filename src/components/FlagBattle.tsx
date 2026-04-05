import { useEffect, useRef } from 'react';
import { updatePhysics } from '../engine/physics';
import type { FlagBall } from '../engine/physics';
import { COUNTRY_CODES, getFlagUrl } from '../utils/flags';

interface FlagBattleProps {
  onGameOver?: (winnerCode: string) => void;
  onUpdateStats: (alive: number, leaderboardDeltas: Record<string, number>, totalAtStart?: number) => void;
  onSurvivorsUpdate?: (survivors: string[]) => void;
  isPaused: boolean;
  selectedCountries?: string[];
  lastAddedCountry?: { code: string; userName?: string; timestamp: number } | null;
  speed?: number;
}


export function FlagBattle({ 
  onGameOver, 
  onUpdateStats, 
  onSurvivorsUpdate, 
  isPaused, 
  selectedCountries,
  lastAddedCountry = null,
  speed = 2
}: FlagBattleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<FlagBall[]>([]);
  const requestRef = useRef<number>(0);
  const rotationRef = useRef<number>(0);
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
      : COUNTRY_CODES;

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
        cooldown: 0
      };
    });

    onUpdateStats(countries.length, {}, countries.length);
  }, []);

  // Handle dynamic additions from YouTube Chat
  useEffect(() => {
    if (!lastAddedCountry) return;

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
    const dist = Math.random() * (dynamicRadius * 0.5);

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
      cooldown: 0
    });

    const aliveCount = ballsRef.current.filter(b => !b.hasExited).length;
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

    // Draw Arena
    ctx.beginPath();
    const gapStart = rotationRef.current + Math.PI / 2 + 0.2;
    const gapEnd = rotationRef.current + Math.PI / 2 - 0.2 + Math.PI * 2;
    ctx.arc(cx, cy, dynamicRadius, gapStart, gapEnd);
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

      // Draw User Name if available
      if (ball.userName) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(ball.userName, cx + ball.x, cy + ball.y - ball.radius - 12);
        ctx.shadowBlur = 0;
      }
    }
  };

  const loop = () => {
    if (!isPaused) {
      const speedFactor = speed / 2;
      rotationRef.current += 0.01 * speedFactor;
      const previousAliveCount = ballsRef.current.filter(b => !b.hasExited).length;

      const canvasH = canvasRef.current ? canvasRef.current.height : window.innerHeight;
      const canvasW = canvasRef.current ? canvasRef.current.width : window.innerWidth;
      const isDesktop = window.innerWidth > 768;
      const cyOffset = isDesktop ? canvasH * 0.05 : 0;
      const dynamicRadius = Math.min(canvasW, canvasH) * (isDesktop ? 0.35 : 0.45);
      const dynamicBallRadius = Math.max(12, dynamicRadius * (isDesktop ? 0.055 : 0.066));

      // Smoothly update ball radii mapping if screen resizes dynamically
      ballsRef.current.forEach(b => b.radius = dynamicBallRadius);

      const { nextBalls, winnersDeltas } = updatePhysics(
        ballsRef.current,
        dynamicRadius,
        speed / 2,
        canvasH / 2 + cyOffset, // floor relative to cy
        canvasW / 2,
        rotationRef.current,
        isDesktop ? 100 : 60 // maxFloorBalls
      );
      ballsRef.current = nextBalls;

      const currentAliveCount = nextBalls.filter(b => !b.hasExited).length;

      if (Object.keys(winnersDeltas).length > 0 || currentAliveCount !== previousAliveCount) {
        onUpdateStats(currentAliveCount, winnersDeltas);
        if (onSurvivorsUpdate) {
          const survivorCodes = nextBalls
            .filter(b => !b.hasExited && b.isAlive)
            .map(b => b.countryCode);
          onSurvivorsUpdate(survivorCodes);
        }
      }

      if (currentAliveCount <= 1 && !isGameOverRef.current) {
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
        style={{ width: '100%', height: '100%', display: 'block', outline: 'none' }}
      />
    </div>
  );
}
