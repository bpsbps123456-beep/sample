"use client";

import { useEffect, useRef, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { readStoredStudentEntry } from "@/lib/student-session";

interface DrawingCanvasProps {
  worksheetId: string;
  sessionCode: string;
  componentId: string;
  studentName: string;
  disabled?: boolean;
  value?: string;
  onChange: (value: string) => void;
}

type ToolMode = "pen" | "eraser";

function sanitizeSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").slice(0, 40);
}

export function DrawingCanvas({
  worksheetId,
  sessionCode,
  componentId,
  studentName,
  disabled = false,
  value,
  onChange,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const initializedRef = useRef(false);
  const [tool, setTool] = useState<ToolMode>("pen");
  const [color, setColor] = useState("#111827");
  const [lineWidth, setLineWidth] = useState(4);
  const [isDirty, setIsDirty] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const channelRef = useRef<any>(null);
  const supportsPointerEventsRef = useRef(false);
  const hydratedValueRef = useRef<string | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    // 실시간 드로잉 방송 채널 설정
    const channel = supabase.channel(`drawing:${worksheetId}`, {
      config: { broadcast: { self: false } }
    });
    
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [worksheetId]);

  useEffect(() => {
    supportsPointerEventsRef.current = typeof window !== "undefined" && "PointerEvent" in window;
  }, []);

  function paintCanvasBackground(context: CanvasRenderingContext2D, width: number, height: number) {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }

  function configureContext(context: CanvasRenderingContext2D) {
    context.lineCap = "round";
    context.lineJoin = "round";
  }

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const context = canvas.getContext("2d");
    if (!context) return false;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(ratio, ratio);
    configureContext(context);
    paintCanvasBackground(context, rect.width, rect.height);
    initializedRef.current = true;
    setCanvasReady(true);
    return true;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ResizeObserver: 캔버스가 화면에 보이게 되면(=크기가 잡히면) 초기화
    const observer = new ResizeObserver((entries) => {
      if (initializedRef.current) return;
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0 && entry.contentRect.height > 0) {
        initCanvas();
      }
    });
    observer.observe(canvas);

    // 즉시 시도도 병행
    const t = setTimeout(() => {
      if (!initializedRef.current) initCanvas();
    }, 100);

    return () => {
      observer.disconnect();
      clearTimeout(t);
    };
  }, []);

  function getContext() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    return canvas.getContext("2d");
  }

  function getPointFromClient(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    // 캔버스 버퍼와 실제 표시 크기 비율을 동적으로 계산하여 좌표 보정
    const ratio = window.devicePixelRatio || 1;
    const scaleX = canvas.width / rect.width / ratio;
    const scaleY = canvas.height / rect.height / ratio;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function broadcastStroke(point: { x: number; y: number }, payload: Record<string, unknown> = {}) {
    const canvas = canvasRef.current;
    if (!channelRef.current || !canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    channelRef.current.send({
      type: "broadcast",
      event: "stroke",
      payload: {
        studentName,
        componentId,
        x: point.x / rect.width,
        y: point.y / rect.height,
        ...payload,
      },
    });
  }

  function startStroke(clientX: number, clientY: number) {
    if (disabled) return;

    // 만약 캔버스 크기가 초기화되지 않았다면 지연 초기화 시도
    const canvas = canvasRef.current;
    if (canvas && (canvas.width === 0 || canvas.height === 0 || !initializedRef.current)) {
      initCanvas();
    }

    const context = getContext();
    const point = getPointFromClient(clientX, clientY);
    if (!context || !point) return false;

    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
    
    const strokeColor = tool === "pen" ? color : "#ffffff";
    const strokeWidth = tool === "pen" ? lineWidth : 24;
    
    context.strokeStyle = strokeColor;
    context.lineWidth = strokeWidth;
    setIsDirty(true);
    setUploadError("");

    // 실시간 브로드캐스트: 시작점 전송 (정규화된 좌표)
    broadcastStroke(point, {
      tool,
      isStart: true,
      color: strokeColor,
      width: strokeWidth,
    });

    return true;
  }

  function moveStroke(clientX: number, clientY: number) {
    if (!drawingRef.current || disabled) {
      return;
    }

    const context = getContext();
    const point = getPointFromClient(clientX, clientY);
    if (!context || !point) {
      return;
    }

    context.lineTo(point.x, point.y);
    context.stroke();

    // 실시간 브로드캐스트: 중간점 전송
    broadcastStroke(point);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const started = startStroke(event.clientX, event.clientY);
    if (!started) return;

    // 포인터를 캔버스에 고정 — 캔버스 밖으로 나가도 그리기 유지
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (e) {
      console.error("Pointer capture failed", e);
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    moveStroke(event.clientX, event.clientY);
  }

  function stopDrawing() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    
    // 실시간 브로드캐스트: 종료 알림
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "stroke",
        payload: {
          studentName,
          componentId,
          isEnd: true
        }
      });
    }

    // 선을 떼는 즉시 서버에 영구 이미지 업로드 (최신 상태 동기화)
    if (isDirty && !disabled) {
      void handleUpload();
    }
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    setIsDirty(true);
    setUploadError("");

    // 실시간 브로드캐스트: 모두 지우기 전송
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "stroke",
        payload: {
          studentName,
          componentId,
          isClear: true
        }
      });
    }

    // 지우기 즉시 업로드
    void handleUpload();
  }

  function handleMouseDown(event: React.MouseEvent<HTMLCanvasElement>) {
    if (supportsPointerEventsRef.current) return;
    event.preventDefault();
    startStroke(event.clientX, event.clientY);
  }

  function handleMouseMove(event: React.MouseEvent<HTMLCanvasElement>) {
    if (supportsPointerEventsRef.current) return;
    event.preventDefault();
    moveStroke(event.clientX, event.clientY);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLCanvasElement>) {
    if (supportsPointerEventsRef.current) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    startStroke(touch.clientX, touch.clientY);
  }

  function handleTouchMove(event: React.TouchEvent<HTMLCanvasElement>) {
    if (supportsPointerEventsRef.current) return;
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    moveStroke(touch.clientX, touch.clientY);
  }

  useEffect(() => {
    if (!canvasReady || !initializedRef.current) return;

    if (!value) {
      if (!drawingRef.current && !isDirty) {
        hydratedValueRef.current = null;
      }
      return;
    }

    if (value === hydratedValueRef.current || drawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = getContext();
    if (!canvas || !context) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    let cancelled = false;
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled) return;
      const activeContext = getContext();
      if (!activeContext) return;
      paintCanvasBackground(activeContext, rect.width, rect.height);
      activeContext.drawImage(image, 0, 0, rect.width, rect.height);
      hydratedValueRef.current = value;
      setIsDirty(false);
      setUploadError("");
    };
    image.onerror = () => {
      if (cancelled) return;
      console.warn("Failed to hydrate drawing canvas", value);
    };
    image.src = value;

    return () => {
      cancelled = true;
    };
  }, [canvasReady, isDirty, value]);

  async function handleUpload() {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setUploadError("Supabase 연결이 없어 저장할 수 없습니다.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const blob = await Promise.race([
        new Promise<Blob | null>((resolve) => {
          canvas.toBlob((result) => resolve(result), "image/png");
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
      ]);

      if (!blob) {
        throw new Error("PNG 변환에 실패했습니다. 다시 시도해 주세요.");
      }

      const filePath = [
        sanitizeSegment(sessionCode),
        sanitizeSegment(worksheetId),
        sanitizeSegment(readStoredStudentEntry()?.submissionId || readStoredStudentEntry()?.authUserId || studentName || "student"),
        sanitizeSegment(componentId),
        `${sanitizeSegment(componentId)}-${Date.now()}.png`,
      ].join("/");

      const uploadResult = await supabase.storage
        .from("drawings")
        .upload(filePath, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadResult.error) {
        throw uploadResult.error;
      }

      const { data } = supabase.storage.from("drawings").getPublicUrl(filePath);
      onChange(data.publicUrl);
      setIsDirty(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "업로드에 실패했습니다.";
      setUploadError(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-4 pt-4">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setTool("pen")}
            className={`rounded-full px-5 py-2.5 transition-all ${tool === "pen" ? "bg-slate-950 text-white" : "bg-slate-100"}`}
          >
            펜
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={`rounded-full px-5 py-2.5 transition-all ${tool === "eraser" ? "bg-slate-950 text-white" : "bg-slate-100"}`}
          >
            지우개
          </button>
          <button type="button" onClick={handleClear} className="rounded-full bg-slate-100 px-5 py-2.5 transition-colors hover:bg-slate-200">
            모두 지우기
          </button>
        </div>

        {tool === "pen" && (
          <div className="flex flex-wrap items-center gap-5 border-l-2 border-slate-200 pl-5">
            {/* 색상 팔레트 */}
            <div className="flex items-center gap-2.5">
              {[
                "#111827", // Black
                "#ef4444", // Red
                "#3b82f6", // Blue
                "#22c55e", // Green
                "#eab308", // Yellow
                "#f97316", // Orange
                "#a855f7", // Purple
              ].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`relative h-8 w-8 rounded-full transition-all duration-150 hover:scale-110 ${color === c ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-200 shadow-md" : "opacity-70 hover:opacity-100"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            {/* 굵기 선택 */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full">
              {[
                { label: "얇게", value: 2 },
                { label: "보통", value: 5 },
                { label: "굵게", value: 8 },
              ].map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setLineWidth(w.value)}
                  className={`flex h-8 w-11 items-center justify-center rounded-full text-[13px] font-bold transition-all ${lineWidth === w.value ? "bg-white text-slate-900 shadow-md scale-105" : "text-slate-400 hover:text-slate-600 hover:bg-white/50"}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
        </div>
      </div>

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => {
          try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
          stopDrawing();
        }}
        onPointerCancel={(e) => {
          try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
          stopDrawing();
        }}
        onPointerLeave={() => stopDrawing()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => stopDrawing()}
        onMouseLeave={() => stopDrawing()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => stopDrawing()}
        onTouchCancel={() => stopDrawing()}
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full touch-none bg-white ${disabled ? "cursor-not-allowed opacity-70" : "cursor-crosshair"}`}
        style={{ height: "calc(100dvh - 360px)", minHeight: "360px", touchAction: "none" }}
      />


      {uploadError ? (
        <div className="px-6 pb-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {uploadError}
          </div>
        </div>
      ) : null}
    </div>
  );
}
