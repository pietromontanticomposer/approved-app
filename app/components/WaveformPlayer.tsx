"use client";

import React, { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

type WaveformPlayerProps = {
  url: string;
  onTimeUpdate?: (time: number) => void;
};

export default function WaveformPlayer({
  url,
  onTimeUpdate,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<WaveSurfer | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  useEffect(() => {
    if (!containerRef.current || !url) return;

    // distruggi wave precedente
    if (waveRef.current) {
      waveRef.current.destroy();
      waveRef.current = null;
    }

    const ws = WaveSurfer.create({
      container: containerRef.current,
      height: 80,
      waveColor: "rgba(148,163,184,0.8)",
      progressColor: "#38bdf8",
      cursorColor: "#f97316",
      barWidth: 2,
      barGap: 1,
      normalize: true,
      responsive: true,
    });

    waveRef.current = ws;
    setDuration(0);
    setCurrentTime(0);

    ws.load(url);

    ws.on("ready", () => {
      const dur = ws.getDuration();
      setDuration(dur);
    });

    ws.on("audioprocess", () => {
      const t = ws.getCurrentTime();
      setCurrentTime(t);
      onTimeUpdate && onTimeUpdate(t);
    });

    ws.on("seek", () => {
      const t = ws.getCurrentTime();
      setCurrentTime(t);
      onTimeUpdate && onTimeUpdate(t);
    });

    return () => {
      try {
        ws.destroy();
      } catch {}
      waveRef.current = null;
    };
  }, [url]);

  return (
    <div className="waveform-wrapper">
      <div ref={containerRef} id="waveform"></div>
      <div className="wave-timers">
        <span>{formatTime(currentTime)}</span> /{" "}
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
