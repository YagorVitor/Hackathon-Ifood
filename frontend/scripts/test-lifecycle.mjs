import { buildSync } from 'esbuild'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
const dir = mkdtempSync(join(tmpdir(), 'despensa-lifecycle-test-'))
try {
  const output = join(dir, 'lifecycle.cjs')
  buildSync({ entryPoints: ['tests/lifecycle.test.ts'], outfile: output, bundle: true, platform: 'node', format: 'cjs', external: ['react', 'react-dom', 'react-test-renderer'] })
  const result = spawnSync(process.execPath, [output], { stdio: 'inherit', env: { ...process.env, NODE_PATH: resolve('node_modules') } })
  process.exitCode = result.status ?? 1
} finally { rmSync(dir, { recursive: true, force: true }) }
