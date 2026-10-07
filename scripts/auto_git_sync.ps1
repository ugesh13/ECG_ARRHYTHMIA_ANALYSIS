# Auto Git Synchronization Script for ECG Arrhythmia Analysis
# Target: https://github.com/ugesh13/ECG_ARRHYTHMIA_ANALYSIS.git

param (
    [int]$IntervalSeconds = 30,
    [string]$Branch = "main"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ECG Arrhythmia Analysis - Automated Git Sync Watcher" -ForegroundColor Green
Write-Host " Target Repository : https://github.com/ugesh13/ECG_ARRHYTHMIA_ANALYSIS.git" -ForegroundColor Yellow
Write-Host " Target Branch     : $Branch" -ForegroundColor Yellow
Write-Host " Polling Interval  : $IntervalSeconds seconds" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# Set remote origin URL if not already configured
$remotes = git remote -v
if ($remotes -match "origin") {
    git remote set-url origin https://github.com/ugesh13/ECG_ARRHYTHMIA_ANALYSIS.git
} else {
    git remote add origin https://github.com/ugesh13/ECG_ARRHYTHMIA_ANALYSIS.git
}

Write-Host "Monitoring workspace for changes... (Press Ctrl+C to stop)" -ForegroundColor Cyan

while ($true) {
    try {
        $status = git status --porcelain
        if ($status) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Write-Host "[$timestamp] Changes detected! Staging and committing..." -ForegroundColor Yellow
            
            git add .
            $commitMsg = "Auto-update: $timestamp"
            git commit -m $commitMsg
            
            Write-Host "[$timestamp] Pushing to origin $Branch..." -ForegroundColor Green
            git push origin $Branch
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[$timestamp] Successfully synced to GitHub!" -ForegroundColor Green
            } else {
                Write-Host "[$timestamp] Push failed. Check your network or credentials." -ForegroundColor Red
            }
        }
    } catch {
        Write-Warning "Sync error: $_"
    }

    Start-Sleep -Seconds $IntervalSeconds
}
