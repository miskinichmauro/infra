export default {
  async fetch(request, env, ctx) {
    try {
      const response = await fetch(request);
      if (response.status >= 500) {
        return maintenancePage();
      }
      return response;
    } catch (err) {
      return maintenancePage();
    }
  },
};

function maintenancePage() {
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gluten Free Py — En mantenimiento</title>
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    font-family: Arial, Helvetica, sans-serif; background:#f9fafb; color:#0f172a; text-align:center; padding:24px; }
  .card { max-width:480px; background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:40px 32px; }
  .logo { font-size:24px; font-weight:700; margin-bottom:16px; }
  .logo span { color:#f59e0b; }
  h1 { font-size:20px; margin:0 0 12px; }
  p { font-size:14px; color:#6b7280; line-height:1.6; margin:0; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">Gluten<span> Free</span></div>
    <h1>Sitio en mantenimiento</h1>
    <p>Este es un ambiente de pruebas y el servidor está apagado en este momento. Volvé a intentarlo más tarde.</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}
