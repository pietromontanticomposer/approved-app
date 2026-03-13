"use client";

import type { CSSProperties } from "react";

type DisplayNamePromptProps = {
  isOpen: boolean;
  value: string;
  saving?: boolean;
  error?: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export default function DisplayNamePrompt({
  isOpen,
  value,
  saving = false,
  error = null,
  onChange,
  onSubmit,
}: DisplayNamePromptProps) {
  if (!isOpen) return null;

  const lang =
    typeof window !== "undefined"
      ? (((window as any).i18n && typeof (window as any).i18n.getLanguage === "function"
          ? (window as any).i18n.getLanguage()
          : localStorage.getItem("app-language")) || "it")
      : "it";
  const bi = (it: string, en: string) => (lang === "en" ? en : it);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle} role="dialog" aria-modal="true" aria-labelledby="display-name-title">
        <div style={eyebrowStyle}>{bi("Profilo", "Profile")}</div>
        <h2 id="display-name-title" style={titleStyle}>
          {bi("Scegli il tuo nome utente", "Choose your username")}
        </h2>
        <p style={copyStyle}>
          {bi(
            "Questo nome verra mostrato nell'app al posto della tua email. Potrai cambiarlo in seguito nelle impostazioni.",
            "This name will be shown in the app instead of your email. You can change it later in settings."
          )}
        </p>
        <input
          autoFocus
          type="text"
          value={value}
          maxLength={40}
          placeholder={bi("Es. Airborne Studio", "E.g. Airborne Studio")}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          style={inputStyle}
        />
        {error ? <div style={errorStyle}>{error}</div> : null}
        <button type="button" onClick={onSubmit} disabled={saving} style={buttonStyle}>
          {saving ? bi("Salvataggio...", "Saving...") : bi("Continua", "Continue")}
        </button>
      </div>
    </div>
  );
}

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1200,
  background: "rgba(2, 6, 23, 0.78)",
  backdropFilter: "blur(10px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
};

const modalStyle: CSSProperties = {
  width: "100%",
  maxWidth: "460px",
  borderRadius: "24px",
  padding: "28px",
  background: "linear-gradient(180deg, #07152f 0%, #0d1d3d 100%)",
  border: "1px solid rgba(96, 165, 250, 0.22)",
  boxShadow: "0 28px 80px rgba(2, 6, 23, 0.46)",
  color: "#eff6ff",
};

const eyebrowStyle: CSSProperties = {
  fontSize: "11px",
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "rgba(147, 197, 253, 0.78)",
  marginBottom: "10px",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: "30px",
  lineHeight: 1.05,
  marginBottom: "12px",
};

const copyStyle: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.6,
  color: "rgba(219, 234, 254, 0.82)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  marginTop: "20px",
  borderRadius: "16px",
  border: "1px solid rgba(147, 197, 253, 0.26)",
  background: "rgba(7, 21, 47, 0.92)",
  color: "#eff6ff",
  padding: "14px 16px",
  fontSize: "15px",
  outline: "none",
};

const errorStyle: CSSProperties = {
  marginTop: "12px",
  color: "#fca5a5",
  fontSize: "13px",
};

const buttonStyle: CSSProperties = {
  width: "100%",
  marginTop: "18px",
  border: "none",
  borderRadius: "16px",
  background: "linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)",
  color: "#eff6ff",
  padding: "14px 16px",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
};
