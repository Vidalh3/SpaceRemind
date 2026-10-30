# Handoff: SpaceRemind

Newest first.

## 2026-10-30 | Claude Code (brain setup, no project code changed)
**Current state, reconstructed from files and git history:** 8 commits, the last on 2026-05-29, on GitHub. There's a large body of uncommitted work, dated up to 2026-06-28: Android via Capacitor, Google sign-in, shared spaces (`src/api/spaces.js`), Settings, and many edited views.

**Broken or unfinished:**
- 24 uncommitted changes, none of them reviewed.
- `android/` and `builds/` are untracked. Check what they'd add before committing. The built bundle with the Firebase key under `android/` is already git-ignored.

**Next steps:**
1. Review the uncommitted work with the user and split it into commits.
2. Confirm whether the updated `firestore.rules` has been deployed.

**Files touched:** AGENTS.md, CLAUDE.md, GEMINI.md, HANDOFF.md. Not committed.
