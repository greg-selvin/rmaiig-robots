# Project agent guidance

## Code comments

- Do not add comments to code. Keep implementation intent clear through naming and structure; add prose to project documentation when needed.

## Hosting: Vercel

- Vercel project: `rmaiig-robots`
- Vercel project ID: `prj_yS7gIFe0JS1dDFLWZ3gZkQdbJ1KA`
- Vercel team ID: `team_S6oIzGzC8bJ0lK31uEexxXUG`
- Production domain: `rmaiig-robots.vercel.app`
- Use the Vercel MCP tools for this project when available. Select the project by its verified ID or name and confirm deployment state before claiming changes are live.
- The repository is connected to Vercel through GitHub `main`. After completing an authorized update, do not leave it only in the working tree: review and commit the scoped changes, merge them to `main` when developed on another branch, and push/release through the configured production workflow.
- Before release, inspect the complete change set (including untracked files), preserve unrelated user work, and run the repository's required build and checks. Resolve any pending schema migration ordering or drift before releasing code that depends on those changes.
- After pushing or releasing, inspect the Vercel deployment and build result, confirm the production alias points to the new deployment, and verify the changed behavior on `https://rmaiig-robots.vercel.app`. Report separately what was committed, merged, deployed, and verified.

## Database: Supabase

- Use the project-specific Supabase MCP server `supabase_rmaiig` for database and project operations in this workspace. Its tools are exposed as `mcp__supabase_rmaiig__*` in Codex.
- Supabase project ref: `cflbpkajrhtnxpaxkpmp`
- Project URL: `https://cflbpkajrhtnxpaxkpmp.supabase.co`
- This MCP connection is scoped to the RMAIIG Robots project; do not substitute another Supabase project or a generic Supabase connection.
- Inspect current schema and migration state before changing the database. Prefer repository migrations for tracked schema changes, and verify remote state after deployment.
- Before release, compare local migration files and their versions with the production migration history using this project-specific MCP; do not assume a successful Vercel deployment means database migrations were applied.

## Secrets and verification

- Never copy API keys, service-role keys, tokens, passwords, or other credentials into this file or other tracked files.
- Read secrets only from approved environment or secret-management integrations, and never print them in command output.
- Distinguish local source changes, committed changes, deployments, and verified production behavior in status reports.

## Existing working-tree changes

- Before editing, committing, or reviewing changes in this checkout, inspect `git status --short --branch` and compare the current branch and commit with the requested target (such as a reviewed commit or `origin/main`).
- Preserve every pre-existing modified, staged, and untracked file. Do not reset, clean, stash, overwrite, or include it in a commit unless the user explicitly asks.
- Treat existing uncommitted changes as unattributed unless repository evidence establishes their source. Do not call them user changes, agent changes, or unrelated work based only on their presence; describe the paths and actual overlap with the task instead.
- If the checkout is dirty or diverged and the requested work can be isolated, use a separate worktree based on the exact requested commit or branch. If isolation is unavailable, make only narrowly scoped edits after inspecting the affected files and preserve all other changes.
- In status reports, explain why a dirty or divergent checkout affects the requested work, and distinguish pre-existing changes from changes made during the current task.
