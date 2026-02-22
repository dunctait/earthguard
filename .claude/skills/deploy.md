# /deploy

Push changes to GitHub and wait for deployment to complete.

## Steps

1. Stage all changes: `git add -A`
2. Check if there are changes to commit: `git status`
3. If changes exist, commit with a brief message describing what changed
4. Push to origin: `git push`
5. Wait for GitHub Pages build to complete by polling: `gh api repos/dunctait/earthguard/pages/builds --jq '.[0].status'`
6. Poll every 10 seconds until status is "built"
7. Report success with live URL: https://dunctait.github.io/earthguard/

## Commit Message Format

Use a concise commit message. Include:
```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## Example Output

```
Staged 3 files
Committed: "Fix missile collision detection"
Pushed to origin/main
Waiting for deploy... building
Waiting for deploy... building
Deploy complete!
Live: https://dunctait.github.io/earthguard/
```
