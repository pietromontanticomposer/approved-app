"use client";

import React, { useState } from "react";
import ProjectPlayer from "./components/ProjectPlayer";
import CommentInput from "./components/CommentInput";

export default function ProjectView() {
  const [currentTime, setCurrentTime] = useState(0);

  // Supponiamo che ctx.version.media.url e ctx.version.media.type provengano dal tuo stato esistente
  const ctx = getActiveContext(); // la tua funzione esistente del CodePen React
  const mediaUrl = ctx?.version.media?.url || null;
  const mediaType = ctx?.version.media?.type || null;

  const [comments, setComments] = useState(ctx?.version.comments || []);

  function handleTimeUpdate(time: number) {
    setCurrentTime(time);
  }

  function handleAddComment(text: string) {
    const newComment = {
      id: Date.now().toString(),
      time: currentTime,
      text,
    };

    ctx?.version.comments.push(newComment);
    setComments([...ctx!.version.comments]); 
    // Aggiorna la lista commenti nella UI
  }

  return (
    <>
      {/* Qui non tocchiamo nulla del tuo HTML originale */}
      <ProjectPlayer
        mediaUrl={mediaUrl}
        mediaType={mediaType}
        onTimeUpdate={handleTimeUpdate}
      />

      <div className="comments-card">
        {/* Qui mostri i commenti */}
        <ul className="comments-list">
          {comments.map((c) => (
            <li key={c.id}>
              <span className="timecode">
                {Math.floor(c.time / 60)
                  .toString()
                  .padStart(2, "0")}
                :
                {Math.floor(c.time % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>{" "}
              {c.text}
            </li>
          ))}
        </ul>
      </div>

      <CommentInput
        currentTime={currentTime}
        onAddComment={handleAddComment}
      />
    </>
  );
}
