import { buildSync } from 'esbuild'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
const dir = mkdtempSync(join(tmpdir(), 'despensa-accessibility-test-'))
try {
  const output = join(dir, 'accessibility.cjs')
  buildSync({ entryPoints: ['tests/accessibility.test.ts'], outfile: output, bundle: true, platform: 'node', format: 'cjs' })
  const result = spawnSync(process.execPath, [output], { stdio: 'inherit' })
  process.exitCode = result.status ?? 1
} finally { rmSync(dir, { recursive: true, force: true }) }
