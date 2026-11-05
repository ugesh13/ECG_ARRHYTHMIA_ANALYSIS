# ==============================================================================
# Commit and Push Vercel Single-Project Deployment Setup to GitHub
# Target: https://github.com/ugesh13/ECG_ARRHYTHMIA_ANALYSIS.git (main branch)
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Committing Vercel Single-Project Configuration to GitHub" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Stage ONLY reviewed deployment and demo files
$filesToStage = @(
    "vercel.json",
    ".vercelignore",
    ".gitignore",
    "package.json",
    "requirements.txt",
    "api/index.py",
    "api/requirements.txt",
    "backend/app/main.py",
    "backend/app/core/config.py",
    "frontend/src/components/UploadCard.jsx",
    "frontend/src/pages/Records.jsx",
    "frontend/src/components/AppShell.jsx",
    "backend/data/mitbih/100.*",
    "backend/data/mitbih/101.*",
    "backend/data/mitbih/103.*",
    "backend/data/mitbih/105.*",
    "backend/data/mitbih/117.*",
    "backend/data/mitbih/200.*",
    "scripts/deploy_vercel.ps1"
)

Write-Host "Staging reviewed Vercel deployment files..." -ForegroundColor Yellow
foreach ($pattern in $filesToStage) {
    git add $pattern
}

# 2. Check git status of staged files
Write-Host "`nStaged files:" -ForegroundColor Cyan
git diff --name-only --cached

# 3. Commit staged files
$commitMsg = "fix: resolve blank production site and API routing for single-project Vercel deployment"
Write-Host "`nCommitting..." -ForegroundColor Yellow
git commit -m $commitMsg

# 4. Push to origin main
Write-Host "`nPushing to origin main..." -ForegroundColor Yellow
git push origin main

# 5. Output latest commit ID
$commitId = git rev-parse HEAD
Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " PUSH SUCCESSFUL!" -ForegroundColor Green
Write-Host " Commit ID: $commitId" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green
