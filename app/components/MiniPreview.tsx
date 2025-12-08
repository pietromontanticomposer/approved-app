"use client";

import React, { useEffect, useRef } from "react";

type MediaType = "audio" | "video";

export type MiniCue = {
  id: string;
  projectId: string;
  name: string;
  mediaType: MediaType;
  objectUrl: string;
  duration: number;
};

type MiniPreviewProps = {
  cue: MiniCue;
};

/**
 * Mini forma d’onda / thumbnail nella lista delle cue a sinistra.
 * È solo visiva: la riproduzione vera è gestita dal player a destra.
 */
export default function MiniPreview({ cue }: MiniPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (root) {
      root.innerHTML = "";
    }

    if (!root) return;

    let ws: any | null = null;
    let cancelled = false;

    async function setup() {
      if (!containerRef.current) return;

      if (cue.mediaType === "audio") {
        try {
          const WaveSurfer = (await import("wavesurfer.js")).default;

          if (cancelled || !containerRef.current) return;

          ws = WaveSurfer.create({
            container: containerRef.current,
            height: 36,
            normalize: true,
            barWidth: 2,
            barGap: 1,
            cursorWidth: 0,
            interact: false,
            waveColor: "rgba(148,163,184,0.8)",
            progressColor: "rgba(56,189,248,1)",
          });

          ws.load(cue.objectUrl);
        } catch (err) {
          console.error("[MiniPreview] Wavesurfer error", err);
          if (containerRef.current) {
            containerRef.current.textContent = "Audio";
          }
        }
        return;
      }

      // Per ora, solo etichetta per il video.
      if (cue.mediaType === "video") {
        containerRef.current.textContent = "Video";
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (ws) {
        try {
          ws.destroy();
        } catch (err) {
          console.warn("[MiniPreview] destroy error", err);
        }
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [cue.id, cue.objectUrl, cue.mediaType]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: 36, display: "block" }}
    />
  );
}
