// Netlify does not provide Cloudflare's runtime module. The API route already
// handles a missing database binding by returning a clear unavailable state.
export const env = {} as {
  DB?: never;
  RECEIPTS?: never;
};
