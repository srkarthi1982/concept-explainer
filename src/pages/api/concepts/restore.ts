import type { APIRoute } from "astro";
import { and, db, eq } from "astro:db";
import { Concepts } from "../../../../db/tables";
import { getUserOrThrow } from "../../../lib/concept-auth";

export const POST: APIRoute = async (context) => {
  const user = getUserOrThrow(context);
  const form = await context.request.formData();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return new Response("Invalid id", { status: 400 });

  await db
    .update(Concepts)
    .set({ status: "active", archivedAt: null, updatedAt: new Date() })
    .where(and(eq(Concepts.id, id), eq(Concepts.userId, user.id)));

  return context.redirect("/app?section=concepts");
};
