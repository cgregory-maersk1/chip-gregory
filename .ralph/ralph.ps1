# Ralph loop - PowerShell port (no Git Bash needed).
# Usage:  .\.ralph\ralph.ps1 -Iterations 5
param(
    [Parameter(Mandatory = $true)]
    [int]$Iterations
)

$ErrorActionPreference = 'Stop'

$prompt = @'
study ./.ralph/prd.json

1. Find the highest-priority item to work on (ignore anything with passes: true) and work only on that item. This should be the one YOU decide has the highest priority - not necessarily the first item in the list.
2. Check that the types check via 'npm run check' (if available) and that the tests pass via 'npm run test' (if available).
3. Update the PRD with the work that was done.
4. Append your progress to the progress.md file. Use this to leave a note for the next person working in the codebase.
5. Make a git commit of that feature.

ONLY WORK ON A SINGLE FEATURE.
If, while implementing the feature, you notice the PRD is complete, output <PROMISE>COMPLETE</PROMISE>.

If you need additional permissions to complete a task, first double-check that you don't already have the permission. If you have the necessary permission, then proceed to use it. Else print the permissions you need along with <PROMISE>NEED_PERMISSIONS</PROMISE> and exit. I will add them to the .claude/settings.local.json file and re-run.
'@

for ($i = 1; $i -le $Iterations; $i++) {
    Write-Host "--------------------------------"
    Write-Host "Iteration $i"
    Write-Host "--------------------------------"

    $result = claude --permission-mode acceptEdits -p $prompt | Out-String

    Write-Host $result
    Write-Host ""

    if ($result -match '<PROMISE>NEED_PERMISSIONS</PROMISE>') {
        Write-Host "Need permissions - add them to .claude/settings.local.json and re-run."
        exit 1
    }
    if ($result -match '<PROMISE>COMPLETE</PROMISE>') {
        Write-Host "PRD complete, exiting."
        exit 0
    }
}
