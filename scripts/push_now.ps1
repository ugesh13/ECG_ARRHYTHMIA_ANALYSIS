# One-click Push Script for ECG Arrhythmia Analysis
# Target: https://github.com/ugesh13/ECG_ARRHYTHMIA_ANALYSIS.git

param (
    [string]$CommitMessage = "Complete Phase 15 model persistence and inference engine",
    [string]$Branch = "main"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Pushing ECG Arrhythmia Analysis codebase to GitHub..." -ForegroundColor Green
Write-Host " Target Repository : https://github.com/ugesh13/ECG_ARRHYTHMIA_ANALYSIS.git" -ForegroundColor Yellow
Write-Host " Target Branch     : $Branch" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Ensure remote is correctly set
$remotes = git remote -v
if ($remotes -match "origin") {
    git remote set-url origin https://github.com/ugesh13/ECG_ARRHYTHMIA_ANALYSIS.git
} else {
    git remote add origin https://github.com/ugesh13/ECG_ARRHYTHMIA_ANALYSIS.git
}

# 2. Stage all modifications
git add .

# 3. Check if there are changes to commit
$status = git status --porcelain
if ($status) {
    Write-Host "Committing changes with message: '$CommitMessage'..." -ForegroundColor Cyan
    git commit -m $CommitMessage
} else {
    Write-Host "No new uncommitted changes detected. Proceeding to push existing commits." -ForegroundColor Yellow
}

# 4. Ensure branch is main
git branch -M $Branch

# 5. Push to GitHub
Write-Host "Pushing to origin $Branch..." -ForegroundColor Green
git push -u origin $Branch

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Repository pushed to https://github.com/ugesh13/ECG_ARRHYTHMIA_ANALYSIS.git" -ForegroundColor Green
} else {
    Write-Host "PUSH FAILED: Please check your GitHub authentication or terminal permissions." -ForegroundColor Red
}
