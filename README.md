<div align="center">

# convex-headless-cms

![npm](https://img.shields.io/npm/v/convex-headless-cms)
[![Convex Component](https://www.convex.dev/components/badge/convex-headless-cms)](https://www.convex.dev/components/convex-headless-cms)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)

<strong>Headless CMS for Convex</strong>

Entry lifecycle • Content blocks • Publish workflows • i18n • Scheduled publishing • Vector & text search

[Setup](#setup) • [Usage](#usage) • [API Reference](#api-reference) • [Testing](#testing)

</div>

---

A [Convex component](https://www.convex.dev/components) providing a **headless CMS data layer**. Manage content entries through a full publish state machine, localise them across any number of locales, schedule future publishing, and search by text or semantic embedding — all backed by Convex tables with reactive queries. Your UI and auth logic stay in your app; this component owns schema and state.

## Features

- **Entry lifecycle** — draft → pending review → publish → archive state machine with direct publish shortcut
- **Content blocks** — ordered, typed block list per entry (headings, paragraphs, images, or any custom type)
- **Publish workflow** — `requestReview`, `rejectReview`, `publish`, `archive`, `unarchive` with enforced transitions
- **Scheduled publishing** — schedule an entry to go live at a future timestamp; re-scheduling cancels the prior job
- **i18n** — per-entry locale, translation groups, `createTranslation` with optional block copy
- **Public vs admin queries** — `listPublishedEntries` / `getPublishedEntryBySlug` (with `defaultLocale` fallback) for public surfaces; `listEntriesForAdmin` for the CMS dashboard
- **Text search** — full-text search on entry titles
- **Vector search** — semantic search via embeddings (1536-dim by default for OpenAI `text-embedding-3-small`)
- **File uploads** — `generateUploadUrl` via Convex file storage
- **Site settings** — typed key/value store for `siteName`, `defaultLocale`, `supportedLocales`, etc.
- **Auth hooks** — bring your own `canWrite` / `canPublish` predicates; the component never touches `ctx.auth`

## Installation

```sh
npm install convex-headless-cms
```

## Setup

### 1. Register the component

```ts
// convex/convex.config.ts
import { defineApp } from 'convex/server'
import headlessCms from 'convex-headless-cms/convex.config'

const app = defineApp()
app.use(headlessCms)

export default app
```

### 2. Create your CMS module

Wire up the component with your auth rules. The factory returns typed query, mutation, and action helpers you export from your app:

```ts
// convex/cms.ts
import { components } from './_generated/api'
import { makeHeadlessCmsAPI } from 'convex-headless-cms'
import { getAuthUserId } from '@convex-dev/auth/server'

export const {
  createEntry, updateEntry, removeEntry,
  getEntry, getEntryBySlug,
  getPublishedEntryBySlug, listPublishedEntries,
  getEntryForAdmin, listEntriesForAdmin,
  listBlocks, replaceBlocks, upsertBlock, removeBlock,
  requestReview, rejectReview, publish, archive, unarchive,
  schedulePublish, cancelSchedule,
  searchText, vectorSearch, setEmbedding,
  createTranslation, listTranslations,
  getSetting, getAllSettings, upsertSetting,
  generateUploadUrl,
} = makeHeadlessCmsAPI(components.headlessCms, {
  canWrite: async (ctx) => (await getAuthUserId(ctx)) !== null,
  canPublish: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return false
    // Check editor/admin role in your own users table
    return true
  },
})
```

### 3. Initialise site settings (optional)

```ts
// Run once from the dashboard or a seed mutation
await ctx.runMutation(api.cms.upsertSetting, { key: 'defaultLocale', value: 'en' })
await ctx.runMutation(api.cms.upsertSetting, { key: 'supportedLocales', value: ['en', 'fr', 'de'] })
await ctx.runMutation(api.cms.upsertSetting, { key: 'siteName', value: 'My Site' })
```

## Usage

### Creating an entry

```ts
const entryId = await ctx.runMutation(api.cms.createEntry, {
  contentType: 'post',
  slug: 'my-first-post',
  title: 'My First Post',
  authorId: userId,
  locale: 'en',
  tags: ['announcement'],
})
```

### Listing published entries

```ts
const { page, isDone, continueCursor } = await ctx.runQuery(api.cms.listPublishedEntries, {
  contentType: 'post',
  locale: 'en',
  paginationOpts: { numItems: 20, cursor: null },
})
```

### Getting an entry by slug (public, with locale fallback)

`getPublishedEntryBySlug` tries the requested locale first, then falls back to `defaultLocale` from site settings, then returns any published match for that slug and content type.

```ts
const entry = await ctx.runQuery(api.cms.getPublishedEntryBySlug, {
  slug: 'my-first-post',
  contentType: 'post',
  locale: 'fr', // falls back to defaultLocale if no French version exists
})
```

### Publish workflow

```ts
await ctx.runMutation(api.cms.requestReview, { entryId })  // draft → pending_review
await ctx.runMutation(api.cms.publish, { entryId })         // pending_review → published

// Or schedule for later
await ctx.runMutation(api.cms.schedulePublish, {
  entryId,
  publishAt: Date.now() + 24 * 60 * 60 * 1000,
})
```

```
draft ──requestReview──▶ pending_review ──rejectReview──▶ draft
  │                              │
  └────────────publish───────────▶ published ──archive──▶ archived
                                                              │
                                                         unarchive
                                                              ▼
                                                            draft
```

### Content blocks

```ts
await ctx.runMutation(api.cms.replaceBlocks, {
  entryId,
  blocks: [
    { type: 'heading',   content: { level: 1, text: 'Hello' },             order: 0 },
    { type: 'paragraph', content: { text: 'Body copy.' },                  order: 1 },
    { type: 'image',     content: { storageId: 'kg2abc...', alt: 'Hero' }, order: 2 },
  ],
})
```

### i18n

```ts
const frEntryId = await ctx.runMutation(api.cms.createTranslation, {
  sourceEntryId: enEntryId,
  locale: 'fr',
  authorId: userId,
  copyBlocks: true, // copies block structure for the translator to fill in
})
```

Entries created via `createTranslation` are marked with `isTranslation: true`. Use `rootOnly: true` in `listEntriesForAdmin` to show only source entries in your CMS list view — each result includes a `locales` array of all locale codes in the translation group, so you can render locale badges without extra queries:

```ts
const { page } = await ctx.runQuery(api.cms.listEntriesForAdmin, {
  contentType: 'post',
  rootOnly: true,
  paginationOpts: { numItems: 20, cursor: null },
})
// page[0].locales → ['en', 'fr', 'de']
```

### Asset library

Upload a file then register it in the asset catalog in one flow:

```ts
// 1. Get an upload URL
const uploadUrl = await ctx.runMutation(api.cms.generateUploadUrl, {})

// 2. Upload the file (e.g. from a browser)
const { storageId } = await fetch(uploadUrl, {
  method: 'POST',
  body: file,
  headers: { 'Content-Type': file.type },
}).then(r => r.json())

// 3. Register it
await ctx.runMutation(api.cms.createAsset, {
  storageId,
  name: file.name,
  type: 'image',
  mimeType: file.type,
  alt: 'Hero image',
  size: file.size,
})

// 4. List assets (URLs resolved server-side)
const { page } = await ctx.runQuery(api.cms.listAssets, {
  type: 'image',
  paginationOpts: { numItems: 50, cursor: null },
})
// page[0].url → signed retrieval URL
```

### Vector search

```ts
// Store after generating an embedding with your AI model
await ctx.runMutation(api.cms.setEmbedding, {
  entryId,
  embedding: embeddingVector, // float64[], length 1536
})

// Search by semantic similarity
const results = await ctx.runAction(api.cms.vectorSearch, {
  embedding: queryEmbedding,
  contentType: 'post',
  status: 'published',
  limit: 10,
})
```

> ⚠️ **Vector index dimension is fixed at deployment time** and cannot be changed without re-creating the Convex project. Choose your model before first deploy: `1536` for OpenAI `text-embedding-3-small` / `ada-002`, `768` for most open-source models (BGE, E5, etc.).

### Auth integrations

**`@convex-dev/auth`**
```ts
makeHeadlessCmsAPI(components.headlessCms, {
  canWrite: async (ctx) => (await getAuthUserId(ctx)) !== null,
  canPublish: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    const user = await ctx.db.get(userId!)
    return user?.role === 'editor' || user?.role === 'admin'
  },
})
```

**Clerk**
```ts
makeHeadlessCmsAPI(components.headlessCms, {
  canWrite: async (ctx) => (await ctx.auth.getUserIdentity()) !== null,
  canPublish: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    return identity?.org_role === 'admin'
  },
})
```

**Better Auth** (JWT mode — Better Auth issues a JWT that Convex verifies)
```ts
makeHeadlessCmsAPI(components.headlessCms, {
  canWrite: async (ctx) => (await ctx.auth.getUserIdentity()) !== null,
  canPublish: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    // Map your Better Auth role claim to a permission check
    return identity?.role === 'editor' || identity?.role === 'admin'
  },
})
```

## API Reference

| Method | Ctx | Description |
| --- | --- | --- |
| `createEntry(args)` | mutation | Create a new draft entry |
| `updateEntry(args)` | mutation | Update slug, title, locale, tags, metadata, or featuredImageId |
| `removeEntry({ entryId })` | mutation | Delete an entry and cascade-delete its blocks |
| `getEntry({ entryId })` | query | Fetch a single entry by id (any status) |
| `getEntryBySlug({ slug, locale? })` | query | Fetch any entry by slug |
| `getPublishedEntryBySlug({ slug, contentType, locale? })` | query | Published only; locale fallback via `defaultLocale` |
| `listPublishedEntries({ contentType?, locale?, paginationOpts })` | query | Cursor-paginated published entries |
| `getEntryForAdmin({ entryId })` | query | Fetch any entry regardless of status |
| `listEntriesForAdmin({ status?, contentType?, locale?, rootOnly?, paginationOpts })` | query | Cursor-paginated admin view — all statuses; `rootOnly: true` excludes translations; each item includes a `locales` field |
| `listBlocks({ entryId })` | query | List blocks ordered by `order` |
| `replaceBlocks({ entryId, blocks })` | mutation | Atomically replace all blocks |
| `upsertBlock(args)` | mutation | Insert or update a single block |
| `removeBlock({ blockId })` | mutation | Delete a single block |
| `requestReview({ entryId })` | mutation | draft → pending_review |
| `rejectReview({ entryId })` | mutation | pending_review → draft |
| `publish({ entryId })` | mutation | draft / pending_review → published |
| `archive({ entryId })` | mutation | published → archived |
| `unarchive({ entryId })` | mutation | archived → draft |
| `schedulePublish({ entryId, publishAt })` | mutation | Schedule a future publish; replaces any existing schedule |
| `cancelSchedule({ entryId })` | mutation | Cancel a pending scheduled publish |
| `searchText({ queryText, contentType?, status?, locale?, limit? })` | query | Full-text search on entry titles |
| `vectorSearch({ embedding, contentType?, status?, limit? })` | action | Semantic search by embedding vector |
| `setEmbedding({ entryId, embedding })` | mutation | Store a vector embedding on an entry |
| `createTranslation({ sourceEntryId, locale, authorId, copyBlocks? })` | mutation | Create a localised copy linked by translation group |
| `listTranslations({ entryId })` | query | All entries sharing the same translation group |
| `getSetting({ key })` | query | Read a single site setting |
| `getAllSettings({})` | query | Read all site settings |
| `upsertSetting({ key, value })` | mutation | Write or overwrite a site setting |
| `generateUploadUrl({})` | mutation | Get a Convex file upload URL |
| `getStorageUrl({ storageId })` | query | Resolve a storageId to a signed retrieval URL (returns `null` if the file does not exist) |
| `listAssets({ type?, paginationOpts })` | query | Paginated asset catalog; filter by `type` (`image` \| `video` \| `audio` \| `document` \| `other`); each item includes a resolved `url` |
| `createAsset({ storageId, name, type, mimeType?, alt?, size? })` | mutation | Register an uploaded file in the asset catalog |
| `updateAsset({ assetId, name?, alt? })` | mutation | Update asset name or alt text |
| `deleteAsset({ assetId })` | mutation | Remove an asset record |

## Testing

Register the component in one call:

```ts
import { convexTest } from 'convex-test'
import headlessCms from 'convex-headless-cms/test'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

function makeT() {
  const t = convexTest(schema, modules)
  headlessCms.register(t)
  return t
}
```

## Notes

- `ctx.auth` and `process.env` are unavailable inside the component — pass auth results in via `canWrite` / `canPublish`, and any env-dependent values as explicit mutation args.
- The vector index dimension defaults to `1536`. If you need a different dimension, change `dimensions` in `src/component/schema.ts` before your first deployment — it cannot be changed afterwards without re-creating the project.

## License

Apache-2.0

---

Built with ♥ for Convex | [Convex](https://www.convex.dev/) • [Components](https://docs.convex.dev/components) • [GitHub](https://github.com/david-potgieter/convex-headless-cms)
