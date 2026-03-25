import type { APIContext } from "astro";

export function getUserOrThrow(context: APIContext) {
  const user = (context.locals as App.Locals | undefined)?.user;
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return user;
}
