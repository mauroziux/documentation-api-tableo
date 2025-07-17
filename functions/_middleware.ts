import type { PagesFunction } from '@cloudflare/workers-types';

interface Env {
  CFP_password: string;
}

async function getLoginForm(errorMessage = '') {
  // In a real-world scenario, you'd fetch this from a file or a template engine.
  // For this example, we'll keep it simple.
  const loginHtml = await import('./login.html');
  let html = loginHtml.default;

  if (errorMessage) {
    html = html.replace('<!-- ERROR_MESSAGE -->', `<p class="error-message">${errorMessage}</p>`);
  } else {
    html = html.replace('<!-- ERROR_MESSAGE -->', '');
  }

  return html;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  console.log('[Middleware] Hit');
  const { request, env, next } = context;
  const url = new URL(request.url);
  console.log(`[Middleware] Request URL: ${url.pathname}`);

  const PROTECTED_PATHS = ['/docs', '/docs/index.html', '/'];

  if (PROTECTED_PATHS.includes(url.pathname)) {
    console.log(`[Middleware] Path is protected: ${url.pathname}`);
    const cookie = request.headers.get('cookie');
    console.log(`[Middleware] Cookie: ${cookie}`);
    const hasAccessCookie = cookie && cookie.includes('access_granted=true');
    console.log(`[Middleware] Has access cookie: ${hasAccessCookie}`);

    if (hasAccessCookie) {
      console.log('[Middleware] Access cookie found, proceeding.');
      return next();
    }

    if (request.method === 'POST') {
      console.log('[Middleware] Handling POST request.');
      const formData = await request.formData();
      const submittedPassword = formData.get('password');
      const PASSWORD = env.CFP_password;

      if (submittedPassword === PASSWORD) {
        console.log('[Middleware] Password correct. Redirecting.');
        const response = new Response('Redirecting...', {
          status: 302,
          headers: {
            'Location': url.pathname,
            'Set-Cookie': 'access_granted=true; Path=/; Max-Age=3600; HttpOnly; SameSite=Lax',
          },
        });
        return response;
      } else {
        console.log('[Middleware] Incorrect password.');
        const html = await getLoginForm('Incorrect password, please try again.');
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' },
          status: 401,
        });
      }
    }

    console.log('[Middleware] Showing login form.');
    const html = await getLoginForm();
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
      status: 401,
    });
  }

  console.log(`[Middleware] Path not protected: ${url.pathname}`);
  return next();
};