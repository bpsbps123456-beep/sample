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
  const [isDirty, setIsDirty] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const channelRef = useRef<any>(null);

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
      channel.unsubscribe();
    };
  }, [worksheetId]);

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
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, rect.width, rect.height);
    initializedRef.current = true;
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

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    // 캔버스 버퍼와 실제 표시 크기 비율을 동적으로 계산하여 좌표 보정
    const ratio = window.devicePixelRatio || 1;
    const scaleX = canvas.width / rect.width / ratio;
    const scaleY = canvas.height / rect.height / ratio;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;

    // 만약 캔버스 크기가 초기화되지 않았다면 지연 초기화 시도
    const canvas = canvasRef.current;
    if (canvas && canvas.width === 0) {
      initCanvas();
    }

    const context = getContext();
    const point = getPoint(event);
    if (!context || !point) return;

    // 포인터를 캔버스에 고정 — 캔버스 밖으로 나가도 그리기 유지
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch (e) {
      console.error("Pointer capture failed", e);
    }

    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.strokeStyle = tool === "pen" ? "#111827" : "#ffffff";
    context.lineWidth = tool === "pen" ? 3 : 14;
    setIsDirty(true);
    setUploadError("");

    // 실시간 브로드캐스트: 시작점 전송 (정규화된 좌표)
    if (channelRef.current && canvas) {
      const rect = canvas.getBoundingClientRect();
      channelRef.current.send({
        type: "broadcast",
        event: "stroke",
        payload: {
          studentName,
          componentId,
          tool,
          x: point.x / rect.width,
          y: point.y / rect.height,
          isStart: true,
          color: tool === "pen" ? "#111827" : "#ffffff",
          width: tool === "pen" ? 3 : 14
        }
      });
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) {
      return;
    }

    const context = getContext();
    const point = getPoint(event);
    if (!context || !point) {
      return;
    }

    context.lineTo(point.x, point.y);
    context.stroke();

    // 실시간 브로드캐스트: 중간점 전송
    if (channelRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        channelRef.current.send({
          type: "broadcast",
          event: "stroke",
          payload: {
            studentName,
            componentId,
            x: point.x / rect.width,
            y: point.y / rect.height
          }
        });
      }
    }
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
      handleUpload();
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
    handleUpload();
  }

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
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 pb-3 pt-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setTool("pen")}
            className={`rounded-full px-3 py-1.5 ${tool === "pen" ? "bg-slate-950 text-white" : "bg-slate-100"}`}
          >
            펜
          </button>
          <button
            type="button"
            onClick={() => setTool("eraser")}
            className={`rounded-full px-3 py-1.5 ${tool === "eraser" ? "bg-slate-950 text-white" : "bg-slate-100"}`}
          >
            지우개
          </button>
          <button type="button" onClick={handleClear} className="rounded-full bg-slate-100 px-3 py-1.5">
            모두 지우기
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isUploading ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
              실시간 동기화 중...
            </div>
          ) : isDirty ? (
            <div className="text-[11px] font-medium text-orange-500">
              저장되지 않은 변경사항 있음
            </div>
          ) : value ? (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
              <span className="text-[14px]">✓</span>
              선생님께 전달됨
            </div>
          ) : null}
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
        onContextMenu={(e) => e.preventDefault()}
        className={`w-full touch-none bg-white ${disabled ? "cursor-not-allowed opacity-70" : "cursor-crosshair"}`}
        style={{ aspectRatio: '3/2', maxHeight: '52vh' }}
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
