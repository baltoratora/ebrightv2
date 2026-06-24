// Same-origin WebSocket entry point for multiplayer rooms.
// Forwards the upgrade to the GameRoom Durable Object (hosted in the
// baltoratora-rooms Worker, bound as ROOMS in ../../../wrangler.toml), so the
// client can connect to wss://<site>/api/room/<code> without a separate origin.

interface Env {
  ROOMS: DurableObjectNamespace;
}

export const onRequest: PagesFunction<Env> = async ({ request, params, env }) => {
  if (request.headers.get("Upgrade") !== "websocket") {
    return new Response("expected websocket", { status: 426 });
  }
  const code = String(params.code).toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{3,12}$/.test(code)) {
    return new Response("bad room code", { status: 400 });
  }
  return env.ROOMS.getByName(code).fetch(request);
};
