import { defineDb } from "astro:db";
import { Concepts } from "./tables";

export default defineDb({
  tables: {
    Concepts,
  },
});
