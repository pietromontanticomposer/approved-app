"use client";

import React, { useState, useRef } from "react";
import WaveformPlayer from "./WaveformPlayer";

type ProjectPlayerProps = {
  mediaUrl: string | null;
  mediaType: "audio" | "video" | null;
  onTimeUpdate?: (time: number) => void;
};

export default function ProjectPlayer({
  mediaUrl,
  mediaType,
  onTimeUpdate,
}: ProjectPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  return (
    <div className="player-inner-container">
      {mediaUrl && mediaType === "audio" && (
        <WaveformPlayer url={mediaUrl} onTimeUpdate={onTimeUpdate} />
      )}

      {mediaUrl && mediaType === "video" && (
        <video
          ref={videoRef}
          controls
          src={mediaUrl}
          className="video-player"
        />
      )}

      {!mediaUrl && (
        <div className="player-placeholder">
          Create a project and drop a file to see the player.
        </div>
      )}
    </div>
  );
}
