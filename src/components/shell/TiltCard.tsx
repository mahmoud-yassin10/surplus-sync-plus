import { useRef, type PointerEvent, type ReactNode } from "react";

/**
 * Pointer-driven 3D tilt wrapper. GPU-safe (transform only), respects
 * reduced-motion and avoids coarse/touch pointers where tilt feels noisy.
 * Adds a soft glare highlight that tracks the cursor for a premium feel.
 */
export function TiltCard({
  children,
  className = "",
  max = 7,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  function isPointerTiltAllowed(e: PointerEvent<HTMLDivElement>): boolean {
    if (e.pointerType !== "mouse") return false;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
    return (
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !window.matchMedia("(pointer: coarse)").matches
    );
  }

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    if (!isPointerTiltAllowed(e)) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotX = (0.5 - py) * max * 2;
    const rotY = (px - 0.5) * max * 2;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      node.style.transform = `perspective(900px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(
        2,
      )}deg) translateZ(0)`;
      if (glareRef.current) {
        glareRef.current.style.background = `radial-gradient(420px circle at ${(px * 100).toFixed(
          1,
        )}% ${(py * 100).toFixed(1)}%, oklch(1 0 0 / 0.16), transparent 45%)`;
        glareRef.current.style.opacity = "1";
      }
    });
  }

  function reset() {
    const node = ref.current;
    if (!node) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    node.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    if (glareRef.current) glareRef.current.style.opacity = "0";
  }

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      onPointerCancel={reset}
      className={`tilt-3d relative ${className}`}
    >
      {glare && (
        <div
          ref={glareRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300"
        />
      )}
      {children}
    </div>
  );
}
