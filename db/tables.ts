import { column, defineTable, NOW } from "astro:db";

export const Concepts = defineTable({
  columns: {
    id: column.number({ primaryKey: true, autoIncrement: true }),
    userId: column.text(),
    title: column.text(),
    subject: column.text({ optional: true }),
    topic: column.text({ optional: true }),
    explanation: column.text(),
    exampleText: column.text({ optional: true }),
    notes: column.text({ optional: true }),
    isImportant: column.boolean({ default: false }),
    status: column.text({ enum: ["active", "archived"], default: "active" }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
    archivedAt: column.date({ optional: true }),
  },
});

export const conceptExplainerTables = {
  Concepts,
} as const;
