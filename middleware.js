import { verifyToken, parseCookies, COOKIE_NAME } from './lib/auth.js';

// Protege las rutas de la aplicación. Si no hay sesión válida,
// redirige al login (/).
export const config = {
  matcher: ['/app.html', '/app'],
};

export default async function middleware(request) {
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const token = cookies[COOKIE_NAME];
  const loginUrl = new URL('/', request.url);

  if (!token) {
    return Response.redirect(loginUrl, 302);
  }

  try {
    await verifyToken(token);
    return; // Sesión válida: continúa y sirve la página.
  } catch {
    return Response.redirect(loginUrl, 302);
  }
}
