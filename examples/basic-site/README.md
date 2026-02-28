# basic-site (ai-memory test fixture)

Minimal site to test the `ai-memory` CLI with almost no setup.

## Run site

```bash
npm install
npm start
```

Then open: `http://localhost:3000`

## Test ai-memory flow

From this folder:

```bash
# one-time repo init for commit-based sync
git init
git add .
git commit -m "initial site"

# initialize memory + install post-commit hook
ai-memory init

# make a change and commit
echo "// test change" >> public/app.js
git add .
git commit -m "test memory sync"

# inspect generated memory files
ls .ai-memory
cat .ai-memory/project-summary.md
cat .ai-memory/change-log.json
```
