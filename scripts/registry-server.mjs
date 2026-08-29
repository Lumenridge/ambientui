#!/usr/bin/env node
/**
 * Serves a built registry directory over localhost, as its own PROCESS.
 *
 * It cannot live inside verify-install.mjs: that script drives npm and
 * shadcn with execFileSync, which blocks the event loop — so an in-process
 * server accepts the connection and then never answers, and the CLI reports
 * a headers timeout that looks like a network problem and is not one.
 *
 *   node scripts/registry-server.mjs <dir> <port>
 */
import { createServer } from "node:http"
import { existsSync, readFileSync, statSync } from "node:fs"
import { extname, join, resolve } from "node:path"

const dir = resolve(process.argv[2])
const port = Number(process.argv[3] ?? 4321)
const TYPES = { ".json": "application/json", ".svg": "image/svg+xml" }

createServer((req, res) => {
  const file = join(dir, decodeURIComponent((req.url ?? "/").split("?")[0]))
  if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found")
    return
  }
  const body = readFileSync(file)
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "text/plain",
    "content-length": body.length,
  })
  res.end(body)
}).listen(port, "127.0.0.1", () => console.log(`registry on :${port}`))
