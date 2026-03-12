import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    setCanvasSize();

    requestAnimationFrame(() => {
      const particles: Particle[] = [];
      const particleCount = 50;
      const maxDistance = 150;
      const canvasWidth = canvas.offsetWidth;
      const canvasHeight = canvas.offsetHeight;

      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvasWidth,
          y: Math.random() * canvasHeight,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
        });
      }

      let animationFrame: number;
      const animate = () => {
        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        particles.forEach((particle, i) => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          if (particle.x < 0 || particle.x > canvas.offsetWidth) particle.vx *= -1;
          if (particle.y < 0 || particle.y > canvas.offsetHeight) particle.vy *= -1;

          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(34, 197, 94, 0.6)";
          ctx.fill();

          particles.forEach((otherParticle, j) => {
            if (i === j) return;
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < maxDistance) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              const opacity = (1 - distance / maxDistance) * 0.3;
              ctx.strokeStyle = `rgba(34, 197, 94, ${opacity})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          });
        });
        animationFrame = requestAnimationFrame(animate);
      };
      animate();

      const handleResize = () => {
        setCanvasSize();
        const newWidth = canvas.offsetWidth;
        const newHeight = canvas.offsetHeight;
        particles.forEach((particle) => {
          particle.x = Math.min(particle.x, newWidth);
          particle.y = Math.min(particle.y, newHeight);
        });
      };
      window.addEventListener("resize", handleResize);
      return () => {
        cancelAnimationFrame(animationFrame);
        window.removeEventListener("resize", handleResize);
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-20" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ mixBlendMode: "screen" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-radial from-green-500/10 via-transparent to-transparent" />
      <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-green-500/20 blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl animate-pulse-slower" />
    </div>
  );
}
