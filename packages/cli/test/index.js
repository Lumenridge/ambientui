/**
 * WHY THIS FILE EXISTS. `node --test packages/cli/test/` is the documented
 * way to run these tests, and recent Node versions treat a directory given
 * to --test as a module path rather than a folder to search — so Node
 * resolves it to this index file. It loads every suite; the package's own
 * `npm test` passes the files by glob and does not need it.
 */
import "./plan.test.mjs"
import "./doctor-fixtures.test.mjs"
import "./lifecycle.test.mjs"
