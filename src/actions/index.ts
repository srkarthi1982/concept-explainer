import type { ActionAPIContext } from "astro:actions";
import { ActionError, defineAction } from "astro:actions";
import { z } from "astro:schema";
import { Concepts, and, db, desc, eq } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const user = (context.locals as App.Locals | undefined)?.user;
  if (!user) {
    throw new ActionError({ code: "UNAUTHORIZED", message: "Sign in required." });
  }
  return user;
}

function normalizeOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const server = {
  createConcept: defineAction({
    input: z.object({
      title: z.string().min(1, "Title is required"),
      subject: z.string().optional(),
      topic: z.string().optional(),
      explanation: z.string().min(1, "Explanation is required"),
      exampleText: z.string().optional(),
      notes: z.string().optional(),
      isImportant: z.coerce.boolean().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const now = new Date();

      const [concept] = await db
        .insert(Concepts)
        .values({
          userId: user.id,
          title: input.title.trim(),
          subject: normalizeOptional(input.subject),
          topic: normalizeOptional(input.topic),
          explanation: input.explanation.trim(),
          exampleText: normalizeOptional(input.exampleText),
          notes: normalizeOptional(input.notes),
          isImportant: input.isImportant ?? false,
          status: "active",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return { concept };
    },
  }),

  updateConcept: defineAction({
    input: z.object({
      id: z.coerce.number().int(),
      title: z.string().min(1).optional(),
      subject: z.string().optional(),
      topic: z.string().optional(),
      explanation: z.string().min(1).optional(),
      exampleText: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["active", "archived"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const [existing] = await db
        .select()
        .from(Concepts)
        .where(and(eq(Concepts.id, input.id), eq(Concepts.userId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({ code: "NOT_FOUND", message: "Concept not found." });
      }

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (typeof input.title !== "undefined") updates.title = input.title.trim();
      if (typeof input.subject !== "undefined") updates.subject = normalizeOptional(input.subject);
      if (typeof input.topic !== "undefined") updates.topic = normalizeOptional(input.topic);
      if (typeof input.explanation !== "undefined") updates.explanation = input.explanation.trim();
      if (typeof input.exampleText !== "undefined") updates.exampleText = normalizeOptional(input.exampleText);
      if (typeof input.notes !== "undefined") updates.notes = normalizeOptional(input.notes);
      if (typeof input.status !== "undefined") {
        updates.status = input.status;
        updates.archivedAt = input.status === "archived" ? new Date() : null;
      }

      const [concept] = await db
        .update(Concepts)
        .set(updates)
        .where(and(eq(Concepts.id, input.id), eq(Concepts.userId, user.id)))
        .returning();

      return { concept };
    },
  }),

  archiveConcept: defineAction({
    input: z.object({ id: z.coerce.number().int() }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [concept] = await db
        .update(Concepts)
        .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(Concepts.id, input.id), eq(Concepts.userId, user.id)))
        .returning();

      if (!concept) throw new ActionError({ code: "NOT_FOUND", message: "Concept not found." });
      return { concept };
    },
  }),

  restoreConcept: defineAction({
    input: z.object({ id: z.coerce.number().int() }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [concept] = await db
        .update(Concepts)
        .set({ status: "active", archivedAt: null, updatedAt: new Date() })
        .where(and(eq(Concepts.id, input.id), eq(Concepts.userId, user.id)))
        .returning();

      if (!concept) throw new ActionError({ code: "NOT_FOUND", message: "Concept not found." });
      return { concept };
    },
  }),

  toggleConceptImportant: defineAction({
    input: z.object({ id: z.coerce.number().int() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const [existing] = await db
        .select()
        .from(Concepts)
        .where(and(eq(Concepts.id, input.id), eq(Concepts.userId, user.id)))
        .limit(1);

      if (!existing) throw new ActionError({ code: "NOT_FOUND", message: "Concept not found." });

      const [concept] = await db
        .update(Concepts)
        .set({ isImportant: !existing.isImportant, updatedAt: new Date() })
        .where(and(eq(Concepts.id, input.id), eq(Concepts.userId, user.id)))
        .returning();

      return { concept };
    },
  }),

  listConcepts: defineAction({
    input: z
      .object({
        query: z.string().optional(),
        status: z.enum(["active", "archived"]).optional(),
        subject: z.string().optional(),
        topic: z.string().optional(),
        importantOnly: z.coerce.boolean().optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);
      const all = await db
        .select()
        .from(Concepts)
        .where(eq(Concepts.userId, user.id))
        .orderBy(desc(Concepts.updatedAt));

      const query = input?.query?.trim().toLowerCase();
      const concepts = all.filter((concept) => {
        const searchOk = query
          ? [concept.title, concept.subject, concept.topic, concept.explanation, concept.notes]
              .filter(Boolean)
              .some((entry) => String(entry).toLowerCase().includes(query))
          : true;
        const statusOk = input?.status ? concept.status === input.status : true;
        const subjectOk = input?.subject ? concept.subject === input.subject : true;
        const topicOk = input?.topic ? concept.topic === input.topic : true;
        const importantOk = input?.importantOnly ? concept.isImportant : true;
        return searchOk && statusOk && subjectOk && topicOk && importantOk;
      });

      const summary = {
        total: all.length,
        active: all.filter((concept) => concept.status === "active").length,
        important: all.filter((concept) => concept.isImportant).length,
        archived: all.filter((concept) => concept.status === "archived").length,
      };

      return { concepts, summary };
    },
  }),

  getConceptDetail: defineAction({
    input: z.object({ id: z.coerce.number().int() }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const [concept] = await db
        .select()
        .from(Concepts)
        .where(and(eq(Concepts.id, input.id), eq(Concepts.userId, user.id)))
        .limit(1);

      if (!concept) throw new ActionError({ code: "NOT_FOUND", message: "Concept not found." });
      return { concept };
    },
  }),
};
