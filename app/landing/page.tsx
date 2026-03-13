"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

type LandingScreenshotProps = {
  src: string;
  alt: string;
  fallbackLabel: string;
  fallbackHint?: string;
  sizes?: string;
  priority?: boolean;
  imageStyle?: CSSProperties;
};

function LandingScreenshot({
  src,
  alt,
  fallbackLabel,
  fallbackHint,
  sizes = "100vw",
  priority = false,
  imageStyle,
}: LandingScreenshotProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 24,
        color: "#64748b",
        fontSize: 14
      }}>
        <div>
          <div>{fallbackLabel}</div>
          {fallbackHint ? (
            <div style={{ fontSize: 13, marginTop: 8, opacity: 0.7 }}>
              {fallbackHint}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      unoptimized
      sizes={sizes}
      style={{ objectFit: "cover", ...imageStyle }}
      onError={() => setFailed(true)}
    />
  );
}

export function LandingContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  // App colors from globals.css
  const colors = {
    bgCore: "#020617",
    bgDeep: "#0b0f1a",
    bgInk: "#0f172a",
    surface: "#0a0f1a",
    surface2: "#0f172a",
    surface3: "#111827",
    border: "#1e293b",
    borderStrong: "#334155",
    borderSoft: "rgba(59, 130, 246, 0.15)",
    text: "#e5e7eb",
    textStrong: "#f8fafc",
    textMuted: "#cbd5e1",
    textSubtle: "#9ca3af",
    textWeak: "#64748b",
    accent: "#3b82f6",
    accentStrong: "#2563eb",
    accentDark: "#1d4ed8",
    accentBright: "#0ea5e9",
  };

  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      color: colors.text,
      background: colors.bgCore,
      minHeight: "100vh",
      lineHeight: 1.6
    }}>
      {/* Header */}
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "rgba(2, 6, 23, 0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${colors.border}`,
        zIndex: 1000,
        padding: "16px 0"
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <span style={{
              fontSize: 24,
              fontWeight: 700,
              color: colors.accent
            }}>
              Approved
            </span>
            <nav style={{ display: "flex", gap: 32 }}>
              <a href="#funzioni" style={{ color: colors.textMuted, textDecoration: "none", fontSize: 15 }}>Funzioni</a>
              <a href="#pricing" style={{ color: colors.textMuted, textDecoration: "none", fontSize: 15 }}>Prezzi</a>
              <a href="#faq" style={{ color: colors.textMuted, textDecoration: "none", fontSize: 15 }}>FAQ</a>
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="/login" style={{ color: colors.textMuted, textDecoration: "none", fontSize: 15 }}>Login</a>
            <a href="/register" style={{
              background: colors.accentStrong,
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 500
            }}>
              Prova gratis
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{
        paddingTop: 140,
        paddingBottom: 80,
        background: `radial-gradient(900px 520px at 12% 8%, rgba(59, 130, 246, 0.18), transparent 55%),
                     radial-gradient(720px 420px at 88% 16%, rgba(99, 102, 241, 0.14), transparent 60%),
                     linear-gradient(180deg, ${colors.bgInk}, ${colors.bgCore})`
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h1 style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 24,
            color: colors.textStrong
          }}>
            Chiudi le revisioni musicali.<br />
            <span style={{ color: colors.accent }}>
              Approvazione finale in 1 click.
            </span>
          </h1>
          <p style={{
            fontSize: 20,
            color: colors.textMuted,
            maxWidth: 600,
            margin: "0 auto 32px"
          }}>
            Commenti precisi sulla timeline audio, versioni tracciate, link al cliente senza registrazione.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/register" style={{
              background: `linear-gradient(135deg, ${colors.accentStrong}, ${colors.accentDark})`,
              color: "#fff",
              padding: "16px 32px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 17,
              fontWeight: 600,
              boxShadow: "0 4px 20px rgba(59, 130, 246, 0.35)"
            }}>
              Prova gratis
            </a>
            <a href="#demo" style={{
              background: colors.surface2,
              color: colors.accent,
              padding: "16px 32px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 17,
              fontWeight: 600,
              border: `1px solid ${colors.border}`
            }}>
              Guarda demo (30s)
            </a>
          </div>
          <p style={{ marginTop: 16, fontSize: 14, color: colors.textWeak }}>
            Nessuna carta richiesta
          </p>

          {/* App Screenshot Placeholder */}
          <div style={{
            marginTop: 60,
            background: colors.surface,
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            maxWidth: 1000,
            margin: "60px auto 0",
            boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
            overflow: "hidden"
          }}>
            {/* Screenshot dell'app - sostituire con immagine reale */}
            <div style={{
              aspectRatio: "16/9",
              background: `linear-gradient(135deg, ${colors.bgInk}, ${colors.bgDeep})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative"
            }}>
              {/* Placeholder per screenshot */}
              <LandingScreenshot
                src="/screenshots/app-main.svg"
                alt="Approved - Interface principale"
                priority
                sizes="(max-width: 1000px) 100vw, 1000px"
                fallbackLabel="Screenshot app principale"
                fallbackHint="Anteprima principale dell'app"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ti riconosci? */}
      <section style={{ padding: "80px 0", background: colors.bgDeep }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: colors.textStrong
          }}>
            Ti riconosci?
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16
          }}>
            {[
              { icon: "🔄", text: "Revisioni infinite che non finiscono mai" },
              { icon: "💬", text: "Feedback sparsi tra email, WhatsApp, Slack" },
              { icon: "📁", text: "Versioni confuse: v2_final_FINAL_ok.wav" },
              { icon: "🤷", text: '"Ma io non avevo approvato questa versione"' },
              { icon: "⏰", text: "Ore perse a cercare l'ultimo commento" },
              { icon: "⚠️", text: "Rischio contenziosi senza traccia scritta" },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.surface2,
                border: `1px solid ${colors.border}`,
                padding: 20,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 16
              }}>
                <span style={{ fontSize: 24 }}>{item.icon}</span>
                <span style={{ color: colors.textMuted, fontSize: 15 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Come funziona */}
      <section id="funzioni" style={{ padding: "80px 0", background: colors.bgCore }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: colors.textStrong
          }}>
            Come funziona
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 24
          }}>
            {[
              { step: "1", verb: "Carica", desc: "Trascina il tuo file audio. WAV, MP3, AIFF.", screenshot: "/screenshots/step-upload.svg" },
              { step: "2", verb: "Condividi", desc: "Genera un link. Il cliente non deve registrarsi.", screenshot: "/screenshots/step-share.svg" },
              { step: "3", verb: "Commenta", desc: "Feedback precisi sulla timeline. Niente più 'al minuto 2 circa'.", screenshot: "/screenshots/step-comment.svg" },
              { step: "4", verb: "Approva", desc: "Un click. Data e ora registrate. Fine revisioni.", screenshot: "/screenshots/step-approve.svg" },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                padding: 24,
                borderRadius: 16,
                textAlign: "center"
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  background: `linear-gradient(135deg, ${colors.accentStrong}, ${colors.accentDark})`,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 20,
                  margin: "0 auto 20px"
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: colors.textStrong }}>
                  {item.verb}
                </h3>
                <p style={{ color: colors.textMuted, fontSize: 15, marginBottom: 16 }}>
                  {item.desc}
                </p>
                {/* Mini screenshot placeholder */}
                <div style={{
                  background: colors.bgInk,
                  borderRadius: 8,
                  height: 100,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: `1px solid ${colors.border}`,
                  overflow: "hidden",
                  position: "relative"
                }}>
                  <LandingScreenshot
                    src={item.screenshot}
                    alt={item.verb}
                    sizes="(max-width: 768px) 100vw, 220px"
                    fallbackLabel={item.verb}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <a href="/register" style={{
              background: `linear-gradient(135deg, ${colors.accentStrong}, ${colors.accentDark})`,
              color: "#fff",
              padding: "16px 32px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 17,
              fontWeight: 600,
              display: "inline-block",
              boxShadow: "0 4px 20px rgba(59, 130, 246, 0.35)"
            }}>
              Prova gratis
            </a>
          </div>
        </div>
      </section>

      {/* Prima / Dopo */}
      <section style={{ padding: "80px 0", background: colors.bgDeep }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: colors.textStrong
          }}>
            Prima vs Dopo
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Prima */}
            <div style={{
              background: "rgba(220, 38, 38, 0.08)",
              padding: 32,
              borderRadius: 16,
              border: "1px solid rgba(220, 38, 38, 0.25)"
            }}>
              <h3 style={{ color: "#f87171", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                PRIMA
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "File su Dropbox, link via WhatsApp",
                  "Feedback via email, vocali, SMS",
                  "6+ giorni per una revisione",
                  '"Quale versione era quella giusta?"',
                  "Zero traccia dell'approvazione",
                ].map((item, i) => (
                  <li key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                    color: colors.textMuted,
                    fontSize: 15
                  }}>
                    <span style={{ color: "#f87171" }}>✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Dopo */}
            <div style={{
              background: "rgba(34, 197, 94, 0.08)",
              padding: 32,
              borderRadius: 16,
              border: "1px solid rgba(34, 197, 94, 0.25)"
            }}>
              <h3 style={{ color: "#4ade80", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
                DOPO
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "1 link, tutto in un posto",
                  "Commenti sulla timeline, precisi al secondo",
                  "2 giorni, ciclo completo",
                  "Versioni ordinate, confronto facile",
                  "Click 'APPROVATO', log esportabile",
                ].map((item, i) => (
                  <li key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 12,
                    color: colors.textMuted,
                    fontSize: 15
                  }}>
                    <span style={{ color: "#4ade80" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Screenshots */}
      <section style={{ padding: "80px 0", background: colors.bgCore }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 16,
            color: colors.textStrong
          }}>
            L'app in azione
          </h2>
          <p style={{ textAlign: "center", color: colors.textMuted, marginBottom: 48 }}>
            Interfaccia pensata per compositori e music supervisor
          </p>

          {/* Screenshot grande con descrizione */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "center",
            marginBottom: 64
          }}>
            <div>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: colors.textStrong, marginBottom: 16 }}>
                Timeline audio con waveform
              </h3>
              <p style={{ color: colors.textMuted, fontSize: 16, marginBottom: 16 }}>
                Visualizza la forma d'onda, clicca per aggiungere commenti al secondo esatto. I marker sono visibili a colpo d'occhio.
              </p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {["Waveform interattiva", "Marker colorati", "Navigazione precisa"].map((item, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: colors.textMuted }}>
                    <span style={{ color: colors.accent }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{
              background: colors.surface,
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              aspectRatio: "16/10",
              position: "relative"
            }}>
              <LandingScreenshot
                src="/screenshots/feature-waveform.svg"
                alt="Timeline con waveform"
                sizes="(max-width: 768px) 100vw, 550px"
                fallbackLabel="Screenshot: feature-waveform"
              />
            </div>
          </div>

          {/* Screenshot 2 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "center",
            marginBottom: 64
          }}>
            <div style={{
              background: colors.surface,
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              aspectRatio: "16/10",
              order: -1,
              position: "relative"
            }}>
              <LandingScreenshot
                src="/screenshots/feature-comments.svg"
                alt="Sistema commenti"
                sizes="(max-width: 768px) 100vw, 550px"
                fallbackLabel="Screenshot: feature-comments"
              />
            </div>
            <div>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: colors.textStrong, marginBottom: 16 }}>
                Commenti contestuali
              </h3>
              <p style={{ color: colors.textMuted, fontSize: 16, marginBottom: 16 }}>
                Ogni commento è legato a un punto preciso della timeline. Clicca sul commento per saltare a quel punto.
              </p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {["Timecode automatico", "Risposte threaded", "Notifiche in tempo reale"].map((item, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: colors.textMuted }}>
                    <span style={{ color: colors.accent }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Screenshot 3 */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "center"
          }}>
            <div>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: colors.textStrong, marginBottom: 16 }}>
                Condivisione senza account
              </h3>
              <p style={{ color: colors.textMuted, fontSize: 16, marginBottom: 16 }}>
                Genera un link per il cliente. Può ascoltare, commentare e approvare inserendo solo un nickname.
              </p>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {["Link monouso", "Nessuna registrazione", "Approvazione tracciata"].map((item, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: colors.textMuted }}>
                    <span style={{ color: colors.accent }}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{
              background: colors.surface,
              borderRadius: 12,
              border: `1px solid ${colors.border}`,
              overflow: "hidden",
              aspectRatio: "16/10",
              position: "relative"
            }}>
              <LandingScreenshot
                src="/screenshots/feature-share.svg"
                alt="Condivisione link"
                sizes="(max-width: 768px) 100vw, 550px"
                fallbackLabel="Screenshot: feature-share"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats + Testimonials */}
      <section style={{ padding: "80px 0", background: colors.bgDeep }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 32,
            marginBottom: 48
          }}>
            {[
              { number: "8", label: "Compositori nel pilot" },
              { number: "25+", label: "Progetti testati" },
              { number: "200+", label: "Cicli di revisione completati" },
            ].map((item, i) => (
              <div key={i}>
                <div style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: colors.accent
                }}>
                  {item.number}
                </div>
                <div style={{ color: colors.textMuted, fontSize: 15 }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {[
              { name: "Luca M.", role: "Compositore", quote: "Ho dimezzato il tempo delle revisioni. Il cliente approva direttamente, niente più email infinite." },
              { name: "Sara B.", role: "Music Supervisor", quote: "Finalmente so esattamente quale versione è stata approvata e quando. Documentazione perfetta." },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                padding: 32,
                borderRadius: 16,
                textAlign: "left"
              }}>
                <p style={{ color: colors.textMuted, fontSize: 16, marginBottom: 20, fontStyle: "italic" }}>
                  "{item.quote}"
                </p>
                <div>
                  <div style={{ fontWeight: 600, color: colors.textStrong }}>{item.name}</div>
                  <div style={{ color: colors.textWeak, fontSize: 14 }}>{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cosa ottieni */}
      <section style={{ padding: "80px 0", background: colors.bgCore }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: colors.textStrong
          }}>
            Cosa ottieni
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24
          }}>
            {[
              {
                icon: "📂",
                title: "Organizza",
                desc: "Timeline audio con waveform, versioni ordinate, tutto in un progetto."
              },
              {
                icon: "🔗",
                title: "Condividi",
                desc: "Link per il cliente. Nessuna registrazione richiesta. Commenta con un nickname."
              },
              {
                icon: "✅",
                title: "Chiudi",
                desc: "Approvazione tracciata con data e ora. Export PDF del log completo."
              },
            ].map((item, i) => (
              <div key={i} style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                padding: 32,
                borderRadius: 16,
                textAlign: "center"
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: colors.textStrong }}>
                  {item.title}
                </h3>
                <p style={{ color: colors.textMuted, fontSize: 15 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differenze vs alternative */}
      <section style={{ padding: "80px 0", background: colors.bgDeep }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: colors.textStrong
          }}>
            Perché Approved?
          </h2>
          <div style={{
            background: colors.surface,
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            overflow: "hidden"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: colors.surface2 }}>
                  <th style={{ padding: 20, textAlign: "left", fontWeight: 600, color: colors.textStrong }}>Funzione</th>
                  <th style={{ padding: 20, textAlign: "center", fontWeight: 600, color: colors.accent }}>Approved</th>
                  <th style={{ padding: 20, textAlign: "center", fontWeight: 600, color: colors.textWeak }}>Frame.io</th>
                  <th style={{ padding: 20, textAlign: "center", fontWeight: 600, color: colors.textWeak }}>Dropbox Replay</th>
                  <th style={{ padding: 20, textAlign: "center", fontWeight: 600, color: colors.textWeak }}>Notetracks</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Timeline audio", approved: true, frameio: false, dropbox: true, notetracks: true },
                  { feature: "Focus su musica", approved: true, frameio: false, dropbox: false, notetracks: true },
                  { feature: "Approvazione tracciata", approved: true, frameio: false, dropbox: false, notetracks: false },
                  { feature: "Export log approvazione", approved: true, frameio: false, dropbox: false, notetracks: false },
                  { feature: "Cliente senza login", approved: true, frameio: false, dropbox: false, notetracks: false },
                ].map((row, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${colors.border}` }}>
                    <td style={{ padding: 16, color: colors.textMuted }}>{row.feature}</td>
                    <td style={{ padding: 16, textAlign: "center", color: row.approved ? "#4ade80" : "#f87171" }}>
                      {row.approved ? "✓" : "✕"}
                    </td>
                    <td style={{ padding: 16, textAlign: "center", color: row.frameio ? "#4ade80" : "#f87171" }}>
                      {row.frameio ? "✓" : "✕"}
                    </td>
                    <td style={{ padding: 16, textAlign: "center", color: row.dropbox ? "#4ade80" : "#f87171" }}>
                      {row.dropbox ? "✓" : "✕"}
                    </td>
                    <td style={{ padding: 16, textAlign: "center", color: row.notetracks ? "#4ade80" : "#f87171" }}>
                      {row.notetracks ? "✓" : "✕"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "80px 0", background: colors.bgCore }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 16,
            color: colors.textStrong
          }}>
            Prezzi semplici
          </h2>
          <p style={{ textAlign: "center", color: colors.textMuted, marginBottom: 48 }}>
            Il cliente che approva accede gratis via link.
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24
          }}>
            {[
              {
                name: "Free",
                price: "0",
                period: "per sempre",
                features: ["1 progetto", "2 cue per progetto", "500 MB storage", "Link condivisione"],
                cta: "Inizia gratis",
                highlighted: false
              },
              {
                name: "Pro",
                price: "10",
                period: "/mese",
                features: ["Progetti illimitati", "Cue illimitate", "25 GB storage", "Notifiche avanzate", "Export PDF approvazioni"],
                cta: "Inizia gratis",
                highlighted: true,
                badge: "Piu scelto"
              },
              {
                name: "Team",
                price: "30",
                period: "/mese",
                features: ["Tutto di Pro", "5 membri team", "API access", "Analytics", "Supporto prioritario"],
                cta: "Inizia gratis",
                highlighted: false
              },
            ].map((plan, i) => (
              <div key={i} style={{
                background: plan.highlighted ? `linear-gradient(135deg, ${colors.accentStrong}, ${colors.accentDark})` : colors.surface,
                border: plan.highlighted ? "none" : `1px solid ${colors.border}`,
                padding: 32,
                borderRadius: 16,
                position: "relative",
                transform: plan.highlighted ? "scale(1.05)" : "none",
                boxShadow: plan.highlighted ? "0 20px 40px rgba(59, 130, 246, 0.25)" : "none"
              }}>
                {plan.badge && (
                  <div style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#fbbf24",
                    color: "#1a1a2e",
                    padding: "4px 16px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {plan.badge}
                  </div>
                )}
                <h3 style={{
                  fontSize: 24,
                  fontWeight: 700,
                  marginBottom: 8,
                  color: plan.highlighted ? "#fff" : colors.textStrong
                }}>
                  {plan.name}
                </h3>
                <div style={{ marginBottom: 24 }}>
                  <span style={{
                    fontSize: 48,
                    fontWeight: 800,
                    color: plan.highlighted ? "#fff" : colors.textStrong
                  }}>
                    {plan.price}€
                  </span>
                  <span style={{ color: plan.highlighted ? "rgba(255,255,255,0.8)" : colors.textWeak }}>
                    {plan.period}
                  </span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px" }}>
                  {plan.features.map((feature, j) => (
                    <li key={j} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 12,
                      color: plan.highlighted ? "rgba(255,255,255,0.9)" : colors.textMuted,
                      fontSize: 14
                    }}>
                      <span style={{ color: plan.highlighted ? "#fff" : colors.accent }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <a href="/register" style={{
                  display: "block",
                  textAlign: "center",
                  background: plan.highlighted ? "#fff" : `linear-gradient(135deg, ${colors.accentStrong}, ${colors.accentDark})`,
                  color: plan.highlighted ? colors.accentStrong : "#fff",
                  padding: "14px 24px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 15
                }}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: "80px 0", background: colors.bgDeep }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: colors.textStrong
          }}>
            Domande frequenti
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              {
                q: "Il cliente deve registrarsi?",
                a: "No. Generi un link e il cliente accede inserendo solo un nickname. Nessuna email, nessun account."
              },
              {
                q: "Cos'è l'approvazione tracciata?",
                a: "Quando il cliente clicca 'Approva', registriamo data, ora e versione. Hai una prova documentale dell'approvazione che puoi esportare in PDF."
              },
              {
                q: "Posso bloccare modifiche dopo l'approvazione?",
                a: "Si. Una volta approvato, il progetto viene bloccato. Puoi sempre creare una nuova versione se necessario."
              },
              {
                q: "Posso esportare il documento di approvazione?",
                a: "Si. Esporti un PDF con tutti i dettagli: versione approvata, data/ora, commenti, chi ha approvato."
              },
              {
                q: "Quali formati audio supportate?",
                a: "WAV, MP3, AIFF, FLAC, OGG. Supportiamo anche video per sync con immagini."
              },
              {
                q: "Posso usarlo in team?",
                a: "Si, con il piano Team. Aggiungi collaboratori, assegna ruoli, gestisci i permessi."
              },
            ].map((faq, i) => (
              <div key={i} style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 12,
                overflow: "hidden"
              }}>
                <button
                  onClick={() => toggleFaq(i)}
                  style={{
                    width: "100%",
                    padding: "20px 24px",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 16,
                    fontWeight: 600,
                    color: colors.textStrong
                  }}
                >
                  {faq.q}
                  <span style={{
                    transform: openFaq === i ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                    color: colors.textWeak
                  }}>
                    ▼
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 20px", color: colors.textMuted, fontSize: 15 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{
        padding: "80px 0",
        background: `linear-gradient(135deg, ${colors.accentStrong}, ${colors.accentDark})`,
        textAlign: "center"
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{ fontSize: 36, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
            Pronto a chiudere le revisioni?
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", marginBottom: 32, fontSize: 18 }}>
            Inizia gratis. Nessuna carta richiesta.
          </p>
          <a href="/register" style={{
            background: "#fff",
            color: colors.accentStrong,
            padding: "16px 40px",
            borderRadius: 10,
            textDecoration: "none",
            fontSize: 18,
            fontWeight: 600,
            display: "inline-block",
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
          }}>
            Prova gratis
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: "40px 0",
        background: colors.bgCore,
        borderTop: `1px solid ${colors.border}`
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 20
        }}>
          <div>
            <span style={{
              fontSize: 20,
              fontWeight: 700,
              color: colors.accent
            }}>
              Approved
            </span>
            <span style={{ marginLeft: 16, fontSize: 14, color: colors.textWeak }}>
              © 2026. Tutti i diritti riservati.
            </span>
          </div>
          <div style={{ display: "flex", gap: 24, fontSize: 14 }}>
            <a href="/terms" style={{ color: colors.textWeak, textDecoration: "none" }}>Termini</a>
            <a href="/privacy" style={{ color: colors.textWeak, textDecoration: "none" }}>Privacy</a>
            <a href="/contact" style={{ color: colors.textWeak, textDecoration: "none" }}>Contatti</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return <LandingContent />;
}
