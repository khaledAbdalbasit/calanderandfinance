import type { Config, Context } from '@netlify/edge-functions';
import { getUser } from '@netlify/identity';

export default async function requireLogin(request: Request, context: Context) {
  // Identity verifies the session with the account service, rather than trusting
  // the presence of a browser cookie or decoding an unverified JWT.
  const user = await getUser();
  if (!user) {
    const headers = { 'Cache-Control': 'private, no-store' };
    if (new URL(request.url).pathname.endsWith('.json')) {
      return Response.json({ error: 'Authentication required' }, { status: 401, headers });
    }
    return new Response(null, {
      status: 302,
      headers: { ...headers, Location: new URL('/', request.url).href },
    });
  }
  const response = await context.next();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const config: Config = {
  path: '/learning-plan*',
};
