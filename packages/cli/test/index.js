/**
 * WHY THIS FILE EXISTS. Node resolves a directory passed to --test
 * (`node --test packages/cli/test/`) to this index, so it loads every suite.
 * `npm test` passes the files by glob and does not need it.
 */
import "./plan.test.mjs"
import "./doctor-fixtures.test.mjs"
import "./lifecycle.test.mjs"
