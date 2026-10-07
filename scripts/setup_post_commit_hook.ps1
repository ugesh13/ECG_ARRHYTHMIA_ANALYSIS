# Setup Git Post-Commit Hook for Automatic Push to GitHub
# Target: https://github.com/ugesh13/ECG_ARRHYTHMIA_ANALYSIS.git

$hookDir = ".git/hooks"
$hookFile = "$hookDir/post-commit"

if (-not (Test-Path ".git")) {
    Write-Error "No .git directory found. Please run 'git init' first."
    exit 1
}

if (-not (Test-Path $hookDir)) {
    New-Item -ItemType Directory -Path $hookDir -Force | Out-Null
}

$hookContent = @"
#!/bin/sh
echo "--> Auto-pushing commit to origin..."
git push origin HEAD
"@

Set-Content -Path $hookFile -Value $hookContent -NoNewline -Encoding utf8
Write-Host "Post-commit hook installed successfully at $hookFile!" -ForegroundColor Green
Write-Host "Every time you commit changes, Git will automatically push them to GitHub." -ForegroundColor Cyan
