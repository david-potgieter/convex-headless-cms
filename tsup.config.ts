import { defineConfig } from 'tsup'
import { readdirSync } from 'fs'
import { basename } from 'path'

const componentEntries = Object.fromEntries(
  readdirSync('src/component')
    .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.startsWith('_'))
    .map(f => [basename(f, '.ts'), `src/component/${f}`]),
)

export default defineConfig({
  entry: {
    index: 'src/client/index.ts',
    ...componentEntries,
  },
  format: ['esm'],
  splitting: false,
  dts: {
    entry: {
      index: 'src/client/index.ts',
      'convex.config': 'src/component/convex.config.ts',
    },
  },
  sourcemap: true,
  clean: true,
  external: ['convex'],
})
