// Inicio del login de Decap con GitHub. Reemplaza al proveedor OAuth de Netlify, que solo entrega
// el token a ventanas abiertas desde el dominio de Netlify (no desde blakstreetwear.web.app).
export default async (req) => {
  const url = new URL(req.url);
  const state = crypto.randomUUID();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID ?? '');
  authorize.searchParams.set('redirect_uri', `${url.origin}/.netlify/functions/callback`);
  authorize.searchParams.set('scope', url.searchParams.get('scope') ?? 'repo');
  authorize.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      'Set-Cookie': `decap_oauth_state=${state}; Path=/.netlify/functions; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
};
