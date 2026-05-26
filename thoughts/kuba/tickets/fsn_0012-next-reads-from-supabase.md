# Nextjs app to read directly from Supabase, no REST API from ponder

## Current state

- supabase package for ponder indexer `packages/supabase-ponder`
- supabase config `packages/supabase-ponder/supabase/config.toml`
- REST api root exposed by ponder `packages/ponder/src/api/index.ts`
- REST api consumers in Nextjs app:
  - `packages/web/src/activity/fetch-activity.ts`
  - `packages/web/src/vault-directory/fetch-vaults.ts`
  - all files that use apiClient `packages/web/src/lib/api-client.ts`

## Expected

- Claude Code in this project supports `supabase-app-db` MCP server
- Project uses `"@supabase/supabase-js": "catalog:"` to access supabase data
- Drop REST api
- leave GraphQl studio for development preview - dont consume data via graphQl, only studio for data preview
- ponder only index data and saves in supabase
- All data are featched on server side, requests to supabase are not exposed on frontend
- @supabase/supabase-js client should be type safe
- generate types for supabase models automaticaly by script or some command
- Analyze how it's done in $ARGUMENTS
- Nextjs (packages/web) and mastra use the same shared client