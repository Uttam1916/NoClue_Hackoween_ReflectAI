## Troubleshooting: "Unable to create .git/index.lock" on Windows (PowerShell)

If you see an error like:

```
fatal: Unable to create '.../.git/index.lock': File exists.

Another git process seems to be running in this repository, e.g.
an editor opened by 'git commit'. Please make sure all processes
are terminated then try again. If it still fails, a git process
may have crashed in this repository earlier: remove the file manually to continue.
```

Follow these safe steps in PowerShell:

1. Check for running git processes (do this first — if a git process is active, do NOT remove the lock):

```powershell
Set-Location 'C:\Users\shank\Documents\Hackwoon day\NoClue_Hackoween_ReflectAI'
Get-Process -Name 'git' -ErrorAction SilentlyContinue | Select-Object Id, ProcessName
```

2. If no git processes are shown, confirm the lock file exists and remove it:

```powershell
if (Test-Path .git\index.lock) { Remove-Item -Force .git\index.lock; Write-Output 'REMOVED' } else { Write-Output 'NO_LOCK' }
```

3. Re-run staging/commit commands:

```powershell
git add .
git commit -m "<your message>"
```

Notes and safety
- Only remove `.git/index.lock` when you're sure no other git process is running. Removing the lock while a git process is active can corrupt the index.
- If this happens repeatedly, check for IDEs, background tools (watchers), or hooks that might be invoking git automatically.
- The steps above were used successfully in this repository to recover from a stale lock and stage files.

