import type { APIRoute } from "astro";
import { and, db, eq } from "astro:db";
import { Concepts } from "../../../../db/tables";
import { getUserOrThrow } from "../../../lib/concept-auth";

export const POST: APIRoute = async (context) => {
  const user = getUserOrThrow(context);
  const form = await context.request.formData();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return new Response("Invalid id", { status: 400 });

  const title = String(form.get("title") ?? "").trim();
  const explanation = String(form.get("explanation") ?? "").trim();

  if (!title || !explanation) return new Response("Title and explanation required", { status: 400 });

  await db
    .update(Concepts)
    .set({
      title,
      subject: String(form.get("subject") ?? "").trim() || undefined,
      topic: String(form.get("topic") ?? "").trim() || undefined,
      explanation,
      exampleText: String(form.get("exampleText") ?? "").trim() || undefined,
      notes: String(form.get("notes") ?? "").trim() || undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(Concepts.id, id), eq(Concepts.userId, user.id)));

  return context.redirect(`/app/concepts/${id}`);
};
