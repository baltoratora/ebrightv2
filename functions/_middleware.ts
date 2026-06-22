// Canonicalize the production host: redirect the *.pages.dev production URL to
// the custom domain. Preview deployments (random *.baltoratora.pages.dev) and
// the custom domain itself pass through untouched.
const CANONICAL_HOST = "demo.baltoratora.my";
const PAGES_HOST = "baltoratora.pages.dev";

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  if (url.hostname === PAGES_HOST) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
};
