"use client";

import { useEffect, useRef } from "react";

/**
 * The hero's motion backdrop: two slow-drifting blurred gradient blobs (pure
 * CSS, cheap) plus a light canvas particle field (a few dozen drifting dots,
 * like dust under stadium floodlights) that parallaxes slightly with scroll.
 *
 * No video/photos involved -- see the note in page.tsx on why. Respects
 * prefers-reduced-motion by skipping the animation loop entirely.
 */
export function CinematicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let scrollY = window.scrollY;

    function resize() {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      width = canvasEl.clientWidth;
      height = canvasEl.clientHeight;
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const particleCount = Math.min(50, Math.floor((width * height) / 18000));
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      alpha: Math.random() * 0.5 + 0.15,
    }));

    function onScroll() {
      scrollY = window.scrollY;
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const parallax = scrollY * 0.08;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        ctx!.beginPath();
        ctx!.arc(p.x, (p.y - parallax + height * 2) % height, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(240, 192, 90, ${p.alpha})`;
        ctx!.fill();
      }
    }

    if (reduceMotion) {
      draw();
      return () => window.removeEventListener("resize", resize);
    }

    let frame: number;
    function loop() {
      draw();
      frame = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="cinema-motion absolute -top-1/4 left-1/4 h-[60vw] w-[60vw] max-h-[600px] max-w-[600px] rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--cinema-gold)", animation: "drift-a 22s ease-in-out infinite" }}
      />
      <div
        className="cinema-motion absolute top-1/3 right-0 h-[50vw] w-[50vw] max-h-[500px] max-w-[500px] rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--cinema-glow)", animation: "drift-b 26s ease-in-out infinite" }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
