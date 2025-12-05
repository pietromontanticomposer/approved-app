export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
        Test Approved su Vercel
      </h1>
      <p>Se vedi questa pagina, il routing funziona.</p>
      <p>Supabase lo rimettiamo dopo.</p>
    </main>
  );
}
