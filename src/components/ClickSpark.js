import { useRef, useEffect, useCallback } from 'react';

const ClickSpark = ({
  sparkColor  = '#fff',
  sparkSize   = 10,
  sparkRadius = 15,
  sparkCount  = 8,
  duration    = 400,
  easing      = 'ease-out',
  extraScale  = 1.0,
  children,
}) => {
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);

  /* Keep canvas bitmap synced to viewport size */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  const easeFunc = useCallback(t => {
    switch (easing) {
      case 'linear':      return t;
      case 'ease-in':     return t * t;
      case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default:            return t * (2 - t); /* ease-out */
    }
  }, [easing]);

  /* Animation loop */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const draw = ts => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sparksRef.current = sparksRef.current.filter(spark => {
        const elapsed = ts - spark.startTime;
        if (elapsed >= duration) return false;

        const progress    = elapsed / duration;
        const eased       = easeFunc(progress);
        const distance    = eased * sparkRadius * extraScale;
        const lineLength  = sparkSize * (1 - eased);

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.globalAlpha = 1 - eased * 0.4;
        ctx.strokeStyle = sparkColor;
        ctx.lineWidth   = 2;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        return true;
      });

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [sparkColor, sparkSize, sparkRadius, duration, easeFunc, extraScale]);

  /* Capture-phase listener — fires before any child stopPropagation */
  useEffect(() => {
    const handleClick = e => {
      if (!e.target.closest('button, a, [role="button"]')) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      /* Canvas is position:fixed so clientX/Y map directly */
      const x   = e.clientX;
      const y   = e.clientY;
      const now = performance.now();

      const newSparks = Array.from({ length: sparkCount }, (_, i) => ({
        x,
        y,
        angle:     (2 * Math.PI * i) / sparkCount,
        startTime: now,
      }));

      sparksRef.current.push(...newSparks);
    };

    /* Use capture phase so it fires even if a child calls stopPropagation */
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [sparkCount]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position:      'fixed',
          top:           0,
          left:          0,
          width:         '100vw',
          height:        '100vh',
          pointerEvents: 'none',
          zIndex:        99999,
        }}
      />
      {children}
    </>
  );
};

export default ClickSpark;
