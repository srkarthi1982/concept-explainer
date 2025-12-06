import { defineDb } from "astro:db";
import {
  Concepts,
  ConceptSteps,
  ConceptChecks,
  ConceptJobs,
} from "./tables";

// https://astro.build/db/config
export default defineDb({
  tables: {
    Concepts,
    ConceptSteps,
    ConceptChecks,
    ConceptJobs,
  },
});
