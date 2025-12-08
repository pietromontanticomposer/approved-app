"use client";

import { useState } from "react";

type NewProjectButtonProps = {
  onCreated?: (project: any) => void;
};

export function NewProjectButton({ onCreated }: NewProjectButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;

    setLoading(true);

    try {
      const defaultTitle = new Date().toLocaleString("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: defaultTitle,
          description: null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create project: ${res.status}`);
      }

      const json = await res.json();
      const project = json.project ?? json;

      if (onCreated && project) {
        onCreated(project);
      }
    } catch (err) {
      console.error("[NewProjectButton] create error", err);
      alert("Cannot create project right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      className="primary-btn full"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? "Creating…" : "+ New project"}
    </button>
  );
}
