// Vuelta de GitHub: cambia el code por un token y se lo pasa al panel que abrió el popup,
// siguiendo el protocolo de mensajes de Decap (authorizing → authorization:github:success).
const ALLOWED_ORIGINS = [
  'https://blakstreetwear.web.app',
  'https://blakstreetwear.firebaseapp.com',
  'https://blakstreetwear.netlify.app',
  'http://localhost:4200',
];

export default async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieState = /(?:^|;\s*)decap_oauth_state=([^;]+)/.exec(req.headers.get('cookie') ?? '')?.[1];

  if (!code || !state || state !== cookieState) {
    return page('error', { error: 'Estado OAuth inválido. Volvé a intentar el login.' });
  }

  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const data = await res.json();

  return data.access_token
    ? page('success', { token: data.access_token, provider: 'github' })
    : page('error', { error: data.error_description ?? 'GitHub no devolvió un token.' });
};

function page(status, content) {
  const message = `authorization:github:${status}:${JSON.stringify(content)}`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Login BLAK</title></head>
<body><p>${status === 'success' ? 'Autorizado, volviendo al panel…' : 'No se pudo iniciar sesión.'}</p>
<script>
  const allowed = ${JSON.stringify(ALLOWED_ORIGINS)};
  const message = ${JSON.stringify(message)};
  window.addEventListener('message', (e) => {
    if (!allowed.includes(e.origin)) return;
    window.opener.postMessage(message, e.origin);
  }, false);
  window.opener && window.opener.postMessage('authorizing:github', '*');
</script></body></html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': 'decap_oauth_state=; Path=/.netlify/functions; Max-Age=0',
    },
  });
}
