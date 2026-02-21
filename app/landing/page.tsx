"use client";

import { useState } from "react";

export function LandingContent() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "#1a1a2e",
      background: "#ffffff",
      minHeight: "100vh",
      lineHeight: 1.6
    }}>
      {/* Header */}
      <header style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid #eee",
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
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Approved
            </span>
            <nav style={{ display: "flex", gap: 32 }}>
              <a href="#funzioni" style={{ color: "#666", textDecoration: "none", fontSize: 15 }}>Funzioni</a>
              <a href="#pricing" style={{ color: "#666", textDecoration: "none", fontSize: 15 }}>Prezzi</a>
              <a href="#faq" style={{ color: "#666", textDecoration: "none", fontSize: 15 }}>FAQ</a>
            </nav>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <a href="/login" style={{ color: "#666", textDecoration: "none", fontSize: 15 }}>Login</a>
            <a href="/register" style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
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
        background: "linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%)"
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h1 style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: 24,
            color: "#1a1a2e"
          }}>
            Chiudi le revisioni musicali.<br />
            <span style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>
              Approvazione finale in 1 click.
            </span>
          </h1>
          <p style={{
            fontSize: 20,
            color: "#666",
            maxWidth: 600,
            margin: "0 auto 32px"
          }}>
            Commenti precisi sulla timeline audio, versioni tracciate, link al cliente senza registrazione.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/register" style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              padding: "16px 32px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 17,
              fontWeight: 600,
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)"
            }}>
              Prova gratis
            </a>
            <a href="#demo" style={{
              background: "#fff",
              color: "#6366f1",
              padding: "16px 32px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 17,
              fontWeight: 600,
              border: "2px solid #e5e7eb"
            }}>
              Guarda demo (30s)
            </a>
          </div>
          <p style={{ marginTop: 16, fontSize: 14, color: "#999" }}>
            Nessuna carta richiesta
          </p>

          {/* Hero Mockup */}
          <div style={{
            marginTop: 60,
            background: "#1a1a2e",
            borderRadius: 16,
            padding: 24,
            maxWidth: 900,
            margin: "60px auto 0",
            boxShadow: "0 25px 50px rgba(0,0,0,0.15)"
          }}>
            <div style={{ display: "flex", gap: 20 }}>
              {/* Sidebar */}
              <div style={{ width: 200, background: "#252542", borderRadius: 10, padding: 16 }}>
                <div style={{ color: "#8b5cf6", fontWeight: 600, marginBottom: 16, fontSize: 14 }}>PROGETTO</div>
                <div style={{ color: "#fff", fontWeight: 500, marginBottom: 20 }}>Film Score - Ep.3</div>
                <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>VERSIONI</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ background: "#3a3a5c", padding: "8px 12px", borderRadius: 6, color: "#888", fontSize: 13 }}>v1 - Bozza</div>
                  <div style={{ background: "#3a3a5c", padding: "8px 12px", borderRadius: 6, color: "#888", fontSize: 13 }}>v2 - Revisione</div>
                  <div style={{ background: "#6366f1", padding: "8px 12px", borderRadius: 6, color: "#fff", fontSize: 13, fontWeight: 500 }}>v3 - Finale</div>
                </div>
              </div>

              {/* Main content */}
              <div style={{ flex: 1 }}>
                {/* Player */}
                <div style={{ background: "#252542", borderRadius: 10, padding: 20, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <div style={{ color: "#fff", fontWeight: 600 }}>Main Theme v3</div>
                      <div style={{ color: "#888", fontSize: 13 }}>03:24</div>
                    </div>
                    <div style={{
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#fff",
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6
                    }}>
                      <span>APPROVATO</span>
                    </div>
                  </div>
                  {/* Timeline */}
                  <div style={{
                    height: 60,
                    background: "linear-gradient(90deg, #3a3a5c 0%, #4a4a7c 50%, #3a3a5c 100%)",
                    borderRadius: 8,
                    position: "relative",
                    overflow: "hidden"
                  }}>
                    {/* Waveform simulation */}
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 10px" }}>
                      {[...Array(50)].map((_, i) => (
                        <div key={i} style={{
                          width: 3,
                          height: `${20 + Math.random() * 30}px`,
                          background: "#6366f1",
                          borderRadius: 2,
                          opacity: 0.7
                        }} />
                      ))}
                    </div>
                    {/* Markers */}
                    <div style={{ position: "absolute", top: 4, left: "25%", background: "#f59e0b", width: 8, height: 8, borderRadius: "50%" }} />
                    <div style={{ position: "absolute", top: 4, left: "60%", background: "#f59e0b", width: 8, height: 8, borderRadius: "50%" }} />
                  </div>
                </div>

                {/* Comments */}
                <div style={{ background: "#252542", borderRadius: 10, padding: 16 }}>
                  <div style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>COMMENTI</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ background: "#f59e0b", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500 }}>0:48</div>
                      <div>
                        <div style={{ color: "#fff", fontSize: 13 }}>Alza leggermente gli archi qui</div>
                        <div style={{ color: "#888", fontSize: 11 }}>Marco R. - Cliente</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ background: "#f59e0b", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500 }}>2:15</div>
                      <div>
                        <div style={{ color: "#fff", fontSize: 13 }}>Perfetto, approvo questa versione!</div>
                        <div style={{ color: "#888", fontSize: 11 }}>Marco R. - Cliente</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badge */}
                <div style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div style={{
                    background: "#10b981",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500
                  }}>
                    Cliente senza login
                  </div>
                  <div style={{ color: "#888", fontSize: 12 }}>
                    Approvato il 21 Feb 2026, 14:32
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Perché ti serve */}
      <section style={{ padding: "80px 0", background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: "#1a1a2e"
          }}>
            Ti riconosci?
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24
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
                background: "#f8f9ff",
                padding: 24,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 16
              }}>
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                <span style={{ color: "#444", fontSize: 15 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Come funziona */}
      <section id="funzioni" style={{ padding: "80px 0", background: "#f8f9ff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: "#1a1a2e"
          }}>
            Come funziona
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 24
          }}>
            {[
              { step: "1", verb: "Carica", desc: "Trascina il tuo file audio. WAV, MP3, AIFF." },
              { step: "2", verb: "Condividi", desc: "Genera un link. Il cliente non deve registrarsi." },
              { step: "3", verb: "Commenta", desc: "Feedback precisi sulla timeline. Niente più 'al minuto 2 circa'." },
              { step: "4", verb: "Approva", desc: "Un click. Data e ora registrate. Fine revisioni." },
            ].map((item, i) => (
              <div key={i} style={{
                background: "#fff",
                padding: 32,
                borderRadius: 16,
                textAlign: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
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
                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: "#1a1a2e" }}>
                  {item.verb}
                </h3>
                <p style={{ color: "#666", fontSize: 15 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 48 }}>
            <a href="/register" style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              padding: "16px 32px",
              borderRadius: 10,
              textDecoration: "none",
              fontSize: 17,
              fontWeight: 600,
              display: "inline-block",
              boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)"
            }}>
              Prova gratis
            </a>
          </div>
        </div>
      </section>

      {/* Prima / Dopo */}
      <section style={{ padding: "80px 0", background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: "#1a1a2e"
          }}>
            Prima vs Dopo
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {/* Prima */}
            <div style={{
              background: "#fef2f2",
              padding: 32,
              borderRadius: 16,
              border: "2px solid #fecaca"
            }}>
              <h3 style={{ color: "#dc2626", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
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
                    color: "#7f1d1d",
                    fontSize: 15
                  }}>
                    <span style={{ color: "#dc2626" }}>✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Dopo */}
            <div style={{
              background: "#f0fdf4",
              padding: 32,
              borderRadius: 16,
              border: "2px solid #bbf7d0"
            }}>
              <h3 style={{ color: "#16a34a", fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
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
                    color: "#14532d",
                    fontSize: 15
                  }}>
                    <span style={{ color: "#16a34a" }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Proof */}
      <section style={{ padding: "80px 0", background: "#f8f9ff" }}>
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
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>
                  {item.number}
                </div>
                <div style={{ color: "#666", fontSize: 15 }}>{item.label}</div>
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
                background: "#fff",
                padding: 32,
                borderRadius: 16,
                textAlign: "left",
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
              }}>
                <p style={{ color: "#444", fontSize: 16, marginBottom: 20, fontStyle: "italic" }}>
                  "{item.quote}"
                </p>
                <div>
                  <div style={{ fontWeight: 600, color: "#1a1a2e" }}>{item.name}</div>
                  <div style={{ color: "#888", fontSize: 14 }}>{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cosa ottieni */}
      <section style={{ padding: "80px 0", background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: "#1a1a2e"
          }}>
            Cosa ottieni
          </h2>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 32
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
                background: "#f8f9ff",
                padding: 32,
                borderRadius: 16,
                textAlign: "center"
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{item.icon}</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: "#1a1a2e" }}>
                  {item.title}
                </h3>
                <p style={{ color: "#666", fontSize: 15 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differenze vs alternative */}
      <section style={{ padding: "80px 0", background: "#f8f9ff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: "#1a1a2e"
          }}>
            Perché Approved?
          </h2>
          <div style={{
            background: "#fff",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f9ff" }}>
                  <th style={{ padding: 20, textAlign: "left", fontWeight: 600, color: "#1a1a2e" }}>Funzione</th>
                  <th style={{ padding: 20, textAlign: "center", fontWeight: 600, color: "#1a1a2e" }}>Approved</th>
                  <th style={{ padding: 20, textAlign: "center", fontWeight: 600, color: "#888" }}>Frame.io</th>
                  <th style={{ padding: 20, textAlign: "center", fontWeight: 600, color: "#888" }}>Dropbox Replay</th>
                  <th style={{ padding: 20, textAlign: "center", fontWeight: 600, color: "#888" }}>Notetracks</th>
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
                  <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: 16, color: "#444" }}>{row.feature}</td>
                    <td style={{ padding: 16, textAlign: "center", color: row.approved ? "#16a34a" : "#dc2626" }}>
                      {row.approved ? "✓" : "✕"}
                    </td>
                    <td style={{ padding: 16, textAlign: "center", color: row.frameio ? "#16a34a" : "#dc2626" }}>
                      {row.frameio ? "✓" : "✕"}
                    </td>
                    <td style={{ padding: 16, textAlign: "center", color: row.dropbox ? "#16a34a" : "#dc2626" }}>
                      {row.dropbox ? "✓" : "✕"}
                    </td>
                    <td style={{ padding: 16, textAlign: "center", color: row.notetracks ? "#16a34a" : "#dc2626" }}>
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
      <section id="pricing" style={{ padding: "80px 0", background: "#fff" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 16,
            color: "#1a1a2e"
          }}>
            Prezzi semplici
          </h2>
          <p style={{ textAlign: "center", color: "#666", marginBottom: 48 }}>
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
                background: plan.highlighted ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#f8f9ff",
                padding: 32,
                borderRadius: 16,
                position: "relative",
                transform: plan.highlighted ? "scale(1.05)" : "none",
                boxShadow: plan.highlighted ? "0 20px 40px rgba(99, 102, 241, 0.3)" : "none"
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
                  color: plan.highlighted ? "#fff" : "#1a1a2e"
                }}>
                  {plan.name}
                </h3>
                <div style={{ marginBottom: 24 }}>
                  <span style={{
                    fontSize: 48,
                    fontWeight: 800,
                    color: plan.highlighted ? "#fff" : "#1a1a2e"
                  }}>
                    {plan.price}€
                  </span>
                  <span style={{ color: plan.highlighted ? "rgba(255,255,255,0.8)" : "#888" }}>
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
                      color: plan.highlighted ? "rgba(255,255,255,0.9)" : "#666",
                      fontSize: 14
                    }}>
                      <span style={{ color: plan.highlighted ? "#fff" : "#6366f1" }}>✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <a href="/register" style={{
                  display: "block",
                  textAlign: "center",
                  background: plan.highlighted ? "#fff" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: plan.highlighted ? "#6366f1" : "#fff",
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
      <section id="faq" style={{ padding: "80px 0", background: "#f8f9ff" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px" }}>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 48,
            color: "#1a1a2e"
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
                background: "#fff",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
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
                    color: "#1a1a2e"
                  }}
                >
                  {faq.q}
                  <span style={{
                    transform: openFaq === i ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s"
                  }}>
                    ▼
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: "0 24px 20px", color: "#666", fontSize: 15 }}>
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
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
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
            color: "#6366f1",
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
        background: "#1a1a2e",
        color: "#888"
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
              color: "#fff"
            }}>
              Approved
            </span>
            <span style={{ marginLeft: 16, fontSize: 14 }}>
              © 2026. Tutti i diritti riservati.
            </span>
          </div>
          <div style={{ display: "flex", gap: 24, fontSize: 14 }}>
            <a href="/terms" style={{ color: "#888", textDecoration: "none" }}>Termini</a>
            <a href="/privacy" style={{ color: "#888", textDecoration: "none" }}>Privacy</a>
            <a href="/contact" style={{ color: "#888", textDecoration: "none" }}>Contatti</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function LandingPage() {
  return <LandingContent />;
}
