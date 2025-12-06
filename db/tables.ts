import { column, defineTable, NOW } from "astro:db";

/**
 * A concept the user wants to explain or understand.
 * Example: "Big-O Notation", "Photosynthesis", "Pointers in C".
 */
export const Concepts = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    // Owner from parent Users.id
    ownerId: column.text(),

    title: column.text(),
    description: column.text({ optional: true }),

    // Optional classification
    subject: column.text({ optional: true }), // e.g. "Computer Science"
    topic: column.text({ optional: true }),   // e.g. "Algorithms"
    tags: column.text({ optional: true }),

    difficulty: column.text({
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    }),

    // For UI status (draft vs ready)
    status: column.text({
      enum: ["draft", "published", "archived"],
      default: "draft",
    }),

    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

/**
 * Step-by-step explanation of a concept.
 * Example: Step 1 = Intuition, Step 2 = Formal definition, etc.
 */
export const ConceptSteps = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    conceptId: column.number({ references: () => Concepts.columns.id }),

    // Order of steps in the UI
    stepNumber: column.number({ default: 1 }),

    // Optional label like "Intuition", "Example", etc.
    stepType: column.text({
      enum: ["intro", "intuition", "definition", "example", "analogy", "summary", "other"],
      default: "other",
    }),

    heading: column.text({ optional: true }),
    content: column.text(),

    // Optional example or analogy separated from main content
    example: column.text({ optional: true }),
    analogy: column.text({ optional: true }),

    createdAt: column.date({ default: NOW }),
  },
});

/**
 * Quick checks / questions related to the concept.
 * Useful for "Did you understand?" at the end.
 */
export const ConceptChecks = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    conceptId: column.number({ references: () => Concepts.columns.id }),

    // Simple question
    question: column.text(),

    // Possible answers stored as JSON (for MCQ) or null for open text.
    options: column.json({ optional: true }),

    // Correct answer: string or array (same pattern as Quiz).
    correctAnswer: column.json({ optional: true }),

    // Explanation for the answer
    explanation: column.text({ optional: true }),

    // Type of check
    type: column.text({
      enum: ["single_choice", "multiple_choice", "true_false", "short_text"],
      default: "single_choice",
    }),

    createdAt: column.date({ default: NOW }),
  },
});

/**
 * AI generation jobs: explanations, analogies, simplifications, etc.
 */
export const ConceptJobs = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),

    conceptId: column.number({
      references: () => Concepts.columns.id,
      optional: true,
    }),

    ownerId: column.text(),

    jobType: column.text({
      enum: ["explain_like_5", "step_breakdown", "analogy", "summary", "other"],
      default: "step_breakdown",
    }),

    // What did we send to AI?
    input: column.json({ optional: true }),

    // What did we get back?
    output: column.json({ optional: true }),

    status: column.text({
      enum: ["pending", "completed", "failed"],
      default: "completed",
    }),

    createdAt: column.date({ default: NOW }),
  },
});

export const conceptExplainerTables = {
  Concepts,
  ConceptSteps,
  ConceptChecks,
  ConceptJobs,
} as const;
