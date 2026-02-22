# /deliver

Pick up a task from TASKS.md and deliver it end-to-end.

## Steps

1. Read TASKS.md and find the first unchecked task in "Pending"
2. Move the task to "In Progress" section
3. Announce which task is being worked on
4. Implement the task:
   - Read relevant source files
   - Make necessary code changes
   - Test via JavaScript in browser (use `game.getState()`, etc.)
5. Update TASKS.md: move task to "Completed" with checkmark
6. Run /deploy to push and verify deployment
7. Summarize what was done

## Task Format in TASKS.md

```markdown
- [ ] **T1** - Task description here
```

When complete:
```markdown
- [x] **T1** - Task description here
```

## Testing

Use browser automation to verify changes:
```javascript
game.getState()  // Check game state
game.autoTurn()  // Test gameplay
```

Take a screenshot only if visual verification is critical.

## Example Flow

```
Reading TASKS.md...
Picking up: T1 - Remove target indicator
Moving to In Progress...

Implementing...
- Edited src/render.js: removed prediction circle drawing
- Tested: game renders without target circle

Moving to Completed...
Running /deploy...
Deploy complete!

✓ Delivered T1: Remove target indicator
```
