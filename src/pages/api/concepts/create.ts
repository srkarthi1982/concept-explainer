import type { APIRoute } from "astro";
import { db } from "astro:db";
import { Concepts } from "../../../../db/tables";
import { getUserOrThrow } from "../../../lib/concept-auth";

export const POST: APIRoute = async (context) => {
  const user = getUserOrThrow(context);
  const form = await context.request.formData();
  const now = new Date();

  const title = String(form.get("title") ?? "").trim();
  const explanation = String(form.get("explanation") ?? "").trim();
  if (!title || !explanation) return new Response("Missing required fields", { status: 400 });

  await db.insert(Concepts).values({
    userId: user.id,
    title,
    subject: String(form.get("subject") ?? "").trim() || undefined,
    topic: String(form.get("topic") ?? "").trim() || undefined,
    explanation,
    exampleText: String(form.get("exampleText") ?? "").trim() || undefined,
    notes: String(form.get("notes") ?? "").trim() || undefined,
    isImportant: form.get("isImportant") === "true",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  return context.redirect("/app?section=concepts");
};
