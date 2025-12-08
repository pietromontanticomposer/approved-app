// @ts-nocheck
"use client";

import React, { useEffect, useRef } from "react";

type MediaType = "audio" | "video";

export type CueForPreview = {
  id: string;
  projectId: string;
  name: string;
  mediaType: MediaType;
  objectUrl: string;
  duration: number;
};

type FilePreviewProps = {
  cue: CueForPreview | null;
  currentTime: number;
  duration: number;
  onSeek?: (timeInSeconds: number) => void;
};

export default function FilePreview({
  cue,
  currentTime,
  duration,
  onSeek,
}: FilePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peaksRef = useRef<Float32Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Funzione per disegnare la waveform in stile "wavesurfer"
  function drawWaveform(
    peaks: Float32Array,
    currentTimeSec: number,
    totalDurationSec: number
  ) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width || 800;
    const height = canvas.height || 120;
    const mid = height / 2;

    ctx.clearRect(0, 0, width, height);

    // sfondo scuro
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);

    // linea centrale
    ctx.strokeStyle = "#1f2937";
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(width, mid);
    ctx.stroke();

    // waveform "base" (tipo wavesurfer, barre sottili)
    const barWidth = 2;
    const gap = 1;
    const totalBars = Math.floor(width / (barWidth + gap));

    ctx.fillStyle = "#4b5563"; // grigio-blu base

    for (let i = 0; i < totalBars; i++) {
      const x = i * (barWidth + gap);
      const idx = Math.floor((i / totalBars) * peaks.length);
      const v = peaks[idx] || 0;
      const h = v * (height * 0.9);

      ctx.fillRect(x, mid - h / 2, barWidth, h);
    }

    // progress
    const progressRatio =
      totalDurationSec > 0
        ? Math.max(0, Math.min(1, currentTimeSec / totalDurationSec))
        : 0;

    const progressBars = Math.floor(totalBars * progressRatio);

    ctx.fillStyle = "#38bdf8"; // azzurro tipo wavesurfer progress

    for (let i = 0; i < progressBars; i++) {
      const x = i * (barWidth + gap);
      const idx = Math.floor((i / totalBars) * peaks.length);
      const v = peaks[idx] || 0;
      const h = v * (height * 0.9);

      ctx.fillRect(x, mid - h / 2, barWidth, h);
    }

    // cursore arancione
    const cursorX = progressRatio * width;

    ctx.strokeStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(cursorX + 0.5, 0);
    ctx.lineTo(cursorX + 0.5, height);
    ctx.stroke();
  }

  // Decode audio e calcolo dei peaks quando cambia il file
  useEffect(() => {
    const canvas = canvasRef.current;

    // pulizia iniziale
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    // se non c'è cue audio, reset
    if (!cue || cue.mediaType !== "audio") {
      peaksRef.current = null;
      return;
    }

    let cancelled = false;

    async function loadAndAnalyze() {
      if (typeof window === "undefined") return;
      if (!canvasRef.current) return;

      // chiudi eventuale AudioContext precedente
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }
        audioContextRef.current = null;
      }

      const AudioCtx =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.error("[FilePreview] AudioContext non supportato");
        return;
      }

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      try {
        const res = await fetch(cue.objectUrl);
        if (!res.ok) {
          console.error("[FilePreview] fetch blob error", res.status);
          return;
        }

        const arrayBuf = await res.arrayBuffer();
        if (cancelled) return;

        const audioBuf: AudioBuffer = await audioCtx.decodeAudioData(arrayBuf);
        if (cancelled || !canvasRef.current) return;

        const raw = audioBuf.getChannelData(0);
        const width = canvasRef.current.width || 800;
        const samples = width;
        const blockSize = Math.max(1, Math.floor(raw.length / samples));
        const peaks = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
          const start = i * blockSize;
          const end = Math.min(start + blockSize, raw.length);
          let max = 0;
          for (let j = start; j < end; j++) {
            const v = Math.abs(raw[j]);
            if (v > max) max = v;
          }
          peaks[i] = max;
        }

        peaksRef.current = peaks;

        // durata iniziale: se il player non l'ha ancora, uso cue.duration
        const totalDuration =
          duration && duration > 0 ? duration : cue.duration || 0;

        drawWaveform(peaks, currentTime, totalDuration);
      } catch (err) {
        console.error("[FilePreview] decode error", err);
      }
    }

    loadAndAnalyze();

    return () => {
      cancelled = true;
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          // ignore
        }
        audioContextRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cue?.id, cue?.mediaType, cue?.objectUrl]);

  // Ridisegna quando cambia currentTime / duration
  useEffect(() => {
    if (!cue || cue.mediaType !== "audio") return;
    const peaks = peaksRef.current;
    if (!peaks) return;

    const totalDuration =
      duration && duration > 0 ? duration : cue.duration || 0;

    drawWaveform(peaks, currentTime, totalDuration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, duration, cue?.id]);

  function handleSeekFromPointer(
    event: React.MouseEvent<HTMLCanvasElement>
  ) {
    if (!onSeek || !cue) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));

    const totalDuration =
      duration && duration > 0 ? duration : cue.duration || 0;
    if (
      !totalDuration ||
      !Number.isFinite(totalDuration) ||
      totalDuration <= 0
    )
      return;

    const time = ratio * totalDuration;
    onSeek(time);
  }

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    handleSeekFromPointer(event);
  }

  function handleContextMenu(event: React.MouseEvent<HTMLCanvasElement>) {
    event.preventDefault();
    handleSeekFromPointer(event);
  }

  // Stati non audio

  if (!cue) {
    return (
      <div
        className="player-placeholder"
        style={{ width: "100%", minHeight: 120 }}
      >
        Create a project and drop a file to see the player.
      </div>
    );
  }

  if (cue.mediaType === "video") {
    return (
      <video
        src={cue.objectUrl}
        controls
        playsInline
        style={{
          width: "100%",
          maxHeight: 260,
          borderRadius: 8,
          backgroundColor: "black",
        }}
      />
    );
  }

  // Audio con waveform custom (stile wavesurfer, ma senza libreria)
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={120}
      style={{
        width: "100%",
        height: 120,
        display: "block",
        borderRadius: 8,
        backgroundColor: "#020617",
        cursor: "pointer",
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    />
  );
}
