"use client";

import React, { useRef } from "react";

type CommentInputProps = {
  currentTime: number;
  onAddComment: (text: string) => void;
};

export default function CommentInput({
  currentTime,
  onAddComment,
}: CommentInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function handleFocus() {
    if (!inputRef.current) return;

    const prefix = `${formatTime(currentTime)}, `;
    if (!inputRef.current.value.startsWith(prefix)) {
      inputRef.current.value = prefix;
      inputRef.current.setSelectionRange(
        inputRef.current.value.length,
        inputRef.current.value.length
      );
    }
  }

  function handleAddClick() {
    if (!inputRef.current) return;
    const text = inputRef.current.value.trim();
    if (text) {
      onAddComment(text);
      inputRef.current.value = "";
    }
  }

  return (
    <div className="comment-input">
      <input
        ref={inputRef}
        type="text"
        placeholder="Add a comment (auto timecode)…"
        onFocus={handleFocus}
      />
      <button className="primary-btn small" onClick={handleAddClick}>
        Send
      </button>
    </div>
  );
}
