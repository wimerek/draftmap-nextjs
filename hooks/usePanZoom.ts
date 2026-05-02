"use client";
/**
 * hooks/usePanZoom.ts
 *
 * Pan/zoom camera hook for DraftChart.
 *
 * Architecture:
 *   - cameraRef: useRef — holds x, y, scale. Mutated directly on every event,
 *     never triggers React re-renders by itself.
 *   - stageRef: attached to the <div> wrapping the <svg>. The hook mutates
 *     stageRef.current.style.transform directly for panning — zero React overhead.
 *   - zoomLevel (0–4) and isOverview (scale < 0.88) are React state; they update
 *     only when camera.scale crosses a discrete threshold. These are the only
 *     camera-related values that trigger SVG sub-component re-renders.
 *
 * Phase 2c (Session C).
 */

import { useRef, useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Camera {
  x: number;
  y: number;
  scale: number;
  minScale: number;
  maxScale: number;
}

export interface UsePanZoomResult {
  viewportRef: React.RefObject<HTMLDivElement>;
  stageRef: React.RefObject<HTMLDivElement>;
  /** 0–4 discrete zoom level (React state — triggers SVG re-render on threshold crossing) */
  zoomLevel: number;
  /** true when scale < 0.88 — dots are centered in columns, no role lanes */
  isOverview: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  /** Fit the current SVG to fill the viewport width. Call after data loads or view changes. */
  fitToView: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const INITIAL_CAMERA: Camera = {
  scale: 1,
  minScale: 0.55,
  maxScale: 2.4,
  x: 40,
  y: 40,
};

const ROLES_THRESHOLD = 0.88; // scale below which role lanes are hidden
const ZOOM_DEBOUNCE_MS = 120;

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeZoomLevel(scale: number): number {
  if (scale < 0.8)  return 0;
  if (scale < 1.0)  return 1;
  if (scale < 1.35) return 2;
  if (scale < 1.8)  return 3;
  return 4;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePanZoom(): UsePanZoomResult {
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef    = useRef<HTMLDivElement>(null);
  const cameraRef   = useRef<Camera>({ ...INITIAL_CAMERA });

  // React state — updated only on threshold crossings
  const [zoomLevel, setZoomLevel] = useState<number>(() =>
    computeZoomLevel(INITIAL_CAMERA.scale)
  );
  const [isOverview, setIsOverview] = useState<boolean>(
    INITIAL_CAMERA.scale < ROLES_THRESHOLD
  );

  // Interaction state (refs — not React state)
  const isDragging     = useRef(false);
  const dragStart      = useRef({ x: 0, y: 0 });
  const cameraStart    = useRef({ x: 0, y: 0 });
  const pinchStartDist = useRef<number | null>(null);
  const zoomTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Core: apply transform directly to stage DOM node (no React re-render) ──

  const applyTransformDirect = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const { x, y, scale } = cameraRef.current;
    stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }, []);

  const clampCamera = useCallback(() => {
    const viewport = viewportRef.current;
    const stage    = stageRef.current;
    if (!viewport || !stage) return;

    const camera  = cameraRef.current;
    const vRect   = viewport.getBoundingClientRect();
    const svgEl   = stage.querySelector("svg");
    const svgW    = svgEl ? parseFloat(svgEl.getAttribute("width") || "0") : 0;
    const svgH    = svgEl ? parseFloat(svgEl.getAttribute("height") || "0") : 0;

    const scaledW = svgW * camera.scale;
    const scaledH = svgH * camera.scale;
    const pad = 120;

    let minX = vRect.width  - scaledW - pad;
    let maxX = pad;
    let minY = vRect.height - scaledH - pad;
    let maxY = pad;

    if (scaledW + pad * 2 < vRect.width)  { minX = maxX = (vRect.width  - scaledW) / 2; }
    if (scaledH + pad * 2 < vRect.height) { minY = maxY = (vRect.height - scaledH) / 2; }

    camera.x = Math.min(maxX, Math.max(minX, camera.x));
    camera.y = Math.min(maxY, Math.max(minY, camera.y));
  }, []);

  const clampAndApply = useCallback(() => {
    clampCamera();
    applyTransformDirect();
  }, [clampCamera, applyTransformDirect]);

  // Debounced React state update — only fires when scale crosses a threshold
  const scheduleZoomStateUpdate = useCallback(() => {
    if (zoomTimer.current) clearTimeout(zoomTimer.current);
    zoomTimer.current = setTimeout(() => {
      const scale = cameraRef.current.scale;
      const newLevel    = computeZoomLevel(scale);
      const newOverview = scale < ROLES_THRESHOLD;
      setZoomLevel(prev  => prev  !== newLevel    ? newLevel    : prev);
      setIsOverview(prev => prev  !== newOverview  ? newOverview : prev);
    }, ZOOM_DEBOUNCE_MS);
  }, []);

  // ── Zoom at a viewport point ──────────────────────────────────────────────

  const zoomAtPoint = useCallback((nextScale: number, clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const camera = cameraRef.current;
    const rect = viewport.getBoundingClientRect();

    const pointX = clientX - rect.left;
    const pointY = clientY - rect.top;

    const worldX = (pointX - camera.x) / camera.scale;
    const worldY = (pointY - camera.y) / camera.scale;

    camera.scale = Math.max(camera.minScale, Math.min(camera.maxScale, nextScale));
    camera.x = pointX - worldX * camera.scale;
    camera.y = pointY - worldY * camera.scale;

    clampAndApply();
    scheduleZoomStateUpdate();
  }, [clampAndApply, scheduleZoomStateUpdate]);

  // ── Exposed zoom buttons ──────────────────────────────────────────────────

  const zoomIn = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const r = viewport.getBoundingClientRect();
    zoomAtPoint(cameraRef.current.scale * 1.2, r.left + r.width / 2, r.top + r.height / 2);
  }, [zoomAtPoint]);

  const zoomOut = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const r = viewport.getBoundingClientRect();
    zoomAtPoint(cameraRef.current.scale * 0.8, r.left + r.width / 2, r.top + r.height / 2);
  }, [zoomAtPoint]);


  // ── Fit chart to viewport width ───────────────────────────────────────────

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    const stage    = stageRef.current;
    if (!viewport || !stage) return;

    const svgEl = stage.querySelector("svg");
    if (!svgEl) return;

    const svgW   = parseFloat(svgEl.getAttribute("width")  || "0");
    const vRect  = viewport.getBoundingClientRect();
    if (!svgW || !vRect.width) return;

    const camera     = cameraRef.current;
    const sidePad    = 48; // px of breathing room on each side
    const targetScale = (vRect.width - sidePad * 2) / svgW;
    const scale      = Math.min(Math.max(camera.minScale, targetScale), camera.maxScale);

    // Center horizontally; start 30px from the top
    camera.scale = scale;
    camera.x     = (vRect.width - svgW * scale) / 2;
    camera.y     = 30;

    applyTransformDirect();
    scheduleZoomStateUpdate();
  }, [applyTransformDirect, scheduleZoomStateUpdate]);

  // ── Event listener registration ───────────────────────────────────────────

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Apply initial transform
    clampAndApply();

    // ── Mouse drag ────────────────────────────────────────────────────────
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      viewport.classList.add("dragging");
      dragStart.current   = { x: e.clientX, y: e.clientY };
      cameraStart.current = { x: cameraRef.current.x, y: cameraRef.current.y };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      cameraRef.current.x = cameraStart.current.x + (e.clientX - dragStart.current.x);
      cameraRef.current.y = cameraStart.current.y + (e.clientY - dragStart.current.y);
      clampAndApply();
    };
    const onMouseUp = () => {
      isDragging.current = false;
      viewport.classList.remove("dragging");
    };

    // ── Scroll wheel zoom ─────────────────────────────────────────────────
    let cursorOver = false;
    const onMouseEnter = () => { cursorOver = true; };
    const onMouseLeave = () => { cursorOver = false; };
    const onWheel = (e: WheelEvent) => {
      if (!cursorOver) return;
      e.preventDefault();
      zoomAtPoint(cameraRef.current.scale * (e.deltaY < 0 ? 1.12 : 0.88), e.clientX, e.clientY);
    };

    // ── Touch: pan + pinch ────────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        isDragging.current = false;
        pinchStartDist.current = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        );
        e.preventDefault();
      } else if (e.touches.length === 1) {
        isDragging.current  = true;
        dragStart.current   = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        cameraStart.current = { x: cameraRef.current.x,  y: cameraRef.current.y  };
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDist.current !== null) {
        const dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY,
        );
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        zoomAtPoint(cameraRef.current.scale * (dist / pinchStartDist.current), cx, cy);
        pinchStartDist.current = dist;
        e.preventDefault();
      } else if (e.touches.length === 1 && isDragging.current) {
        const prevX = cameraRef.current.x;
        const prevY = cameraRef.current.y;
        cameraRef.current.x = cameraStart.current.x + (e.touches[0].clientX - dragStart.current.x);
        cameraRef.current.y = cameraStart.current.y + (e.touches[0].clientY - dragStart.current.y);
        clampAndApply();
        const moved = Math.abs(cameraRef.current.x - prevX) > 0.5 || Math.abs(cameraRef.current.y - prevY) > 0.5;
        if (moved) e.preventDefault();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinchStartDist.current = null;
      if (e.touches.length === 0) isDragging.current = false;
    };

    // Attach
    viewport.addEventListener("mousedown", onMouseDown);
    viewport.addEventListener("mouseenter", onMouseEnter);
    viewport.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("wheel", onWheel, { passive: false });
    viewport.addEventListener("touchstart", onTouchStart, { passive: false });
    viewport.addEventListener("touchmove",  onTouchMove,  { passive: false });
    viewport.addEventListener("touchend",   onTouchEnd);

    return () => {
      viewport.removeEventListener("mousedown", onMouseDown);
      viewport.removeEventListener("mouseenter", onMouseEnter);
      viewport.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("wheel", onWheel);
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove",  onTouchMove);
      viewport.removeEventListener("touchend",   onTouchEnd);
      if (zoomTimer.current) clearTimeout(zoomTimer.current);
    };
  }, [clampAndApply, zoomAtPoint]);

  return { viewportRef, stageRef, zoomLevel, isOverview, zoomIn, zoomOut, fitToView };
}
