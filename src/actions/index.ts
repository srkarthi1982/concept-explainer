import type { ActionAPIContext } from "astro:actions";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { db, eq, and, Concepts, ConceptSteps, ConceptChecks, ConceptJobs } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

export const server = {
  createConcept: defineAction({
    input: z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().optional(),
      subject: z.string().optional(),
      topic: z.string().optional(),
      tags: z.string().optional(),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [concept] = await db
        .insert(Concepts)
        .values({
          ownerId: user.id,
          title: input.title,
          description: input.description,
          subject: input.subject,
          topic: input.topic,
          tags: input.tags,
          difficulty: input.difficulty ?? "beginner",
          status: input.status ?? "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { concept };
    },
  }),

  updateConcept: defineAction({
    input: z.object({
      id: z.number().int(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      subject: z.string().optional(),
      topic: z.string().optional(),
      tags: z.string().optional(),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      status: z.enum(["draft", "published", "archived"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const { id, ...rest } = input;

      const [existing] = await db
        .select()
        .from(Concepts)
        .where(and(eq(Concepts.id, id), eq(Concepts.ownerId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Concept not found.",
        });
      }

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (typeof value !== "undefined") {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return { concept: existing };
      }

      const [concept] = await db
        .update(Concepts)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(Concepts.id, id), eq(Concepts.ownerId, user.id)))
        .returning();

      return { concept };
    },
  }),

  archiveConcept: defineAction({
    input: z.object({
      id: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [concept] = await db
        .update(Concepts)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(Concepts.id, input.id), eq(Concepts.ownerId, user.id)))
        .returning();

      if (!concept) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Concept not found.",
        });
      }

      return { concept };
    },
  }),

  listMyConcepts: defineAction({
    input: z
      .object({
        status: z.enum(["draft", "published", "archived"]).optional(),
        subject: z.string().optional(),
        topic: z.string().optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);

      const concepts = await db
        .select()
        .from(Concepts)
        .where(eq(Concepts.ownerId, user.id));

      const filtered = concepts.filter((concept) => {
        const matchesStatus = input?.status ? concept.status === input.status : true;
        const matchesSubject = input?.subject ? concept.subject === input.subject : true;
        const matchesTopic = input?.topic ? concept.topic === input.topic : true;
        return matchesStatus && matchesSubject && matchesTopic;
      });

      return { concepts: filtered };
    },
  }),

  getConceptWithDetails: defineAction({
    input: z.object({
      id: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [concept] = await db
        .select()
        .from(Concepts)
        .where(and(eq(Concepts.id, input.id), eq(Concepts.ownerId, user.id)))
        .limit(1);

      if (!concept) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Concept not found.",
        });
      }

      const steps = await db
        .select()
        .from(ConceptSteps)
        .where(eq(ConceptSteps.conceptId, input.id));

      const checks = await db
        .select()
        .from(ConceptChecks)
        .where(eq(ConceptChecks.conceptId, input.id));

      return { concept, steps, checks };
    },
  }),

  saveStep: defineAction({
    input: z.object({
      id: z.number().int().optional(),
      conceptId: z.number().int(),
      stepNumber: z.number().int().min(1).optional(),
      stepType: z
        .enum(["intro", "intuition", "definition", "example", "analogy", "summary", "other"])
        .optional(),
      heading: z.string().optional(),
      content: z.string().min(1, "Content is required"),
      example: z.string().optional(),
      analogy: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [concept] = await db
        .select()
        .from(Concepts)
        .where(and(eq(Concepts.id, input.conceptId), eq(Concepts.ownerId, user.id)))
        .limit(1);

      if (!concept) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Concept not found.",
        });
      }

      const baseValues = {
        conceptId: input.conceptId,
        stepNumber: input.stepNumber ?? 1,
        stepType: input.stepType ?? "other",
        heading: input.heading,
        content: input.content,
        example: input.example,
        analogy: input.analogy,
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(ConceptSteps)
          .where(eq(ConceptSteps.id, input.id))
          .limit(1);

        if (!existing || existing.conceptId !== input.conceptId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Step not found.",
          });
        }

        const [step] = await db
          .update(ConceptSteps)
          .set(baseValues)
          .where(eq(ConceptSteps.id, input.id))
          .returning();

        return { step };
      }

      const [step] = await db.insert(ConceptSteps).values(baseValues).returning();
      return { step };
    },
  }),

  deleteStep: defineAction({
    input: z.object({
      id: z.number().int(),
      conceptId: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [concept] = await db
        .select()
        .from(Concepts)
        .where(and(eq(Concepts.id, input.conceptId), eq(Concepts.ownerId, user.id)))
        .limit(1);

      if (!concept) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Concept not found.",
        });
      }

      const [deleted] = await db
        .delete(ConceptSteps)
        .where(and(eq(ConceptSteps.id, input.id), eq(ConceptSteps.conceptId, input.conceptId)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Step not found.",
        });
      }

      return { step: deleted };
    },
  }),

  saveCheck: defineAction({
    input: z.object({
      id: z.number().int().optional(),
      conceptId: z.number().int(),
      question: z.string().min(1, "Question is required"),
      options: z.any().optional(),
      correctAnswer: z.any().optional(),
      explanation: z.string().optional(),
      type: z
        .enum(["single_choice", "multiple_choice", "true_false", "short_text"])
        .optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [concept] = await db
        .select()
        .from(Concepts)
        .where(and(eq(Concepts.id, input.conceptId), eq(Concepts.ownerId, user.id)))
        .limit(1);

      if (!concept) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Concept not found.",
        });
      }

      const baseValues = {
        conceptId: input.conceptId,
        question: input.question,
        options: input.options,
        correctAnswer: input.correctAnswer,
        explanation: input.explanation,
        type: input.type ?? "single_choice",
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(ConceptChecks)
          .where(eq(ConceptChecks.id, input.id))
          .limit(1);

        if (!existing || existing.conceptId !== input.conceptId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Check not found.",
          });
        }

        const [check] = await db
          .update(ConceptChecks)
          .set(baseValues)
          .where(eq(ConceptChecks.id, input.id))
          .returning();

        return { check };
      }

      const [check] = await db.insert(ConceptChecks).values(baseValues).returning();
      return { check };
    },
  }),

  deleteCheck: defineAction({
    input: z.object({
      id: z.number().int(),
      conceptId: z.number().int(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [concept] = await db
        .select()
        .from(Concepts)
        .where(and(eq(Concepts.id, input.conceptId), eq(Concepts.ownerId, user.id)))
        .limit(1);

      if (!concept) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Concept not found.",
        });
      }

      const [deleted] = await db
        .delete(ConceptChecks)
        .where(and(eq(ConceptChecks.id, input.id), eq(ConceptChecks.conceptId, input.conceptId)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Check not found.",
        });
      }

      return { check: deleted };
    },
  }),

  createJob: defineAction({
    input: z.object({
      conceptId: z.number().int().optional(),
      jobType: z.enum(["explain_like_5", "step_breakdown", "analogy", "summary", "other"]).optional(),
      input: z.any().optional(),
      output: z.any().optional(),
      status: z.enum(["pending", "completed", "failed"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      if (input.conceptId) {
        const [concept] = await db
          .select()
          .from(Concepts)
          .where(and(eq(Concepts.id, input.conceptId), eq(Concepts.ownerId, user.id)))
          .limit(1);

        if (!concept) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Concept not found.",
          });
        }
      }

      const [job] = await db
        .insert(ConceptJobs)
        .values({
          conceptId: input.conceptId,
          ownerId: user.id,
          jobType: input.jobType ?? "step_breakdown",
          input: input.input,
          output: input.output,
          status: input.status ?? "pending",
          createdAt: new Date(),
        })
        .returning();

      return { job };
    },
  }),

  updateJob: defineAction({
    input: z.object({
      id: z.number().int(),
      output: z.any().optional(),
      status: z.enum(["pending", "completed", "failed"]).optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [existing] = await db
        .select()
        .from(ConceptJobs)
        .where(and(eq(ConceptJobs.id, input.id), eq(ConceptJobs.ownerId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Job not found.",
        });
      }

      const updateData: Record<string, unknown> = {};
      if (typeof input.output !== "undefined") updateData.output = input.output;
      if (typeof input.status !== "undefined") updateData.status = input.status;

      if (Object.keys(updateData).length === 0) {
        return { job: existing };
      }

      const [job] = await db
        .update(ConceptJobs)
        .set(updateData)
        .where(eq(ConceptJobs.id, input.id))
        .returning();

      return { job };
    },
  }),

  listJobs: defineAction({
    input: z
      .object({
        conceptId: z.number().int().optional(),
        status: z.enum(["pending", "completed", "failed"]).optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);

      let concepts = await db
        .select()
        .from(Concepts)
        .where(eq(Concepts.ownerId, user.id));

      if (input?.conceptId) {
        concepts = concepts.filter((c) => c.id === input.conceptId);
        if (concepts.length === 0) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Concept not found.",
          });
        }
      }

      const allowedConceptIds = new Set(concepts.map((c) => c.id));

      const jobs = await db
        .select()
        .from(ConceptJobs)
        .where(eq(ConceptJobs.ownerId, user.id));

      const filtered = jobs.filter((job) => {
        const matchesConcept = job.conceptId ? allowedConceptIds.has(job.conceptId) : true;
        const matchesStatus = input?.status ? job.status === input.status : true;
        return matchesConcept && matchesStatus;
      });

      return { jobs: filtered };
    },
  }),
};
