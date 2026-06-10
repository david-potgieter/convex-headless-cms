import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/client/index.ts',
    'convex.config': 'src/component/convex.config.ts',
    schema: 'src/component/schema.ts',
    entries: 'src/component/entries.ts',
    blocks: 'src/component/blocks.ts',
    publish: 'src/component/publish.ts',
    schedule: 'src/component/schedule.ts',
    search: 'src/component/search.ts',
    i18n: 'src/component/i18n.ts',
    settings: 'src/component/settings.ts',
    uploads: 'src/component/uploads.ts',
    assets: 'src/component/assets.ts',
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
