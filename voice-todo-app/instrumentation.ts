/**
 * Next.js Instrumentation Hook
 * 
 * This file is automatically called when the Next.js server starts.
 * Currently not used but kept for future server-side initialization needs.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('Server initialized');
  }
}
