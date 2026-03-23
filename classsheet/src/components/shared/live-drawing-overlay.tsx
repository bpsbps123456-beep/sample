"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface LiveDrawingOverlayProps {
  worksheetId: string;
  studentName: string;
  componentId: string;
}

export function LiveDrawingOverlay({
  worksheetId,
  studentName,
  componentId,
}: LiveDrawingOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Resize canvas to match display size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      context.scale(ratio, ratio);
      context.lineCap = "round";
      context.lineJoin = "round";
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    // Listen to drawing broadcast
    const channel = supabase.channel(`drawing:${worksheetId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on("broadcast", { event: "stroke" }, (payload: any) => {
        const data = payload.payload;
        
        // Filter by student and component
        if (data.studentName !== studentName || data.componentId !== componentId) return;

        const rect = canvas.getBoundingClientRect();
        const x = data.x * rect.width;
        const y = data.y * rect.height;

        if (data.isClear) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }

        if (data.isStart) {
          context.beginPath();
          context.moveTo(x, y);
          context.strokeStyle = data.color || "#111827";
          context.lineWidth = data.width || 3;
        } else if (data.isEnd) {
          context.stroke();
        } else {
          context.lineTo(x, y);
          context.stroke();
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      channel.unsubscribe();
    };
  }, [worksheetId, studentName, componentId]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
