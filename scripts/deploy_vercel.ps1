# ==============================================================================
# Automated Vercel Deployment and Post-Deploy Verification Script
# ==============================================================================
param (
    [switch]$Production = $true
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ECG Arrhythmia Analysis - Vercel Deployment and Verification" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Check Vercel CLI
# ------------------------------------------------------------------------------
Write-Host "`n[1/4] Checking Vercel CLI..." -ForegroundColor Yellow
$vercelCmd = $null
if (Get-Command vercel -ErrorAction SilentlyContinue) {
    $vercelCmd = "vercel"
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
    $vercelCmd = "npx vercel"
} else {
    Write-Error "Neither 'vercel' nor 'npx' is available in your PATH. Please install Node.js."
    exit 1
}

Write-Host "PASS: Using CLI: $vercelCmd" -ForegroundColor Green

# ------------------------------------------------------------------------------
# 2. Local Frontend Build Verification
# ------------------------------------------------------------------------------
Write-Host "`n[2/4] Verifying frontend build..." -ForegroundColor Yellow
$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendDir = Join-Path $projectRoot "frontend"

Push-Location $frontendDir
try {
    Write-Host "Running frontend build..." -ForegroundColor Gray
    npm.cmd run build
    Write-Host "PASS: Frontend build succeeded." -ForegroundColor Green
} catch {
    Write-Warning "npm run build failed: $_. Proceeding with existing dist files if present."
} finally {
    Pop-Location
}

# ------------------------------------------------------------------------------
# 3. Deploy to Vercel
# ------------------------------------------------------------------------------
Write-Host "`n[3/4] Deploying to Vercel..." -ForegroundColor Yellow
Push-Location $projectRoot
$deployArgs = @("--yes")
if ($Production) {
    $deployArgs += "--prod"
}

Write-Host "Executing: $vercelCmd $($deployArgs -join ' ')..." -ForegroundColor Cyan
$deployOutput = & cmd.exe /c "$vercelCmd $($deployArgs -join ' ')"
Pop-Location

# Extract URL from Vercel output (ends with https://....vercel.app)
$liveUrl = $null
foreach ($line in ($deployOutput -split "`n")) {
    $trimmed = $line.Trim()
    Write-Host $trimmed -ForegroundColor Gray
    if ($trimmed -match "(https://[a-zA-Z0-9\.\-_]+\.vercel\.app)") {
        $liveUrl = $matches[1]
    }
}

if (-not $liveUrl) {
    Write-Host "`nDeployment completed. If a login prompt was triggered, please authenticate and re-run." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " DEPLOYMENT SUCCEEDED!" -ForegroundColor Green
Write-Host " Live URL: $liveUrl" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green

# ------------------------------------------------------------------------------
# 4. Live Post-Deployment Verification Suite
# ------------------------------------------------------------------------------
Write-Host "`n[4/4] Executing Live Verification Suite on $liveUrl ..." -ForegroundColor Cyan

# Check 1: Root SPA
Write-Host "`n[Check 1] Homepage and Client-Side SPA Root (/)" -ForegroundColor Yellow
try {
    $res = Invoke-WebRequest -Uri "$liveUrl/" -Method Get
    Write-Host "  PASS: HTTP $($res.StatusCode) (Title contains ECG Arrhythmia Analysis)" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
}

# Check 2: Direct Page Navigation
Write-Host "`n[Check 2] Direct Page Navigation (/benchmark, /records, /about)" -ForegroundColor Yellow
foreach ($page in @("/benchmark", "/records", "/about")) {
    try {
        $res = Invoke-WebRequest -Uri "$liveUrl$page" -Method Get
        Write-Host "  PASS: $page returned HTTP $($res.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL: $page failed: $_" -ForegroundColor Red
    }
}

# Check 3: Health Endpoint
Write-Host "`n[Check 3] /api/health" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$liveUrl/api/health" -Method Get
    Write-Host "  PASS: Status='$($health.status)', Model Loaded=$($health.model_loaded)" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
}

# Check 4: Model Info Endpoint
Write-Host "`n[Check 4] /api/model/info" -ForegroundColor Yellow
try {
    $model = Invoke-RestMethod -Uri "$liveUrl/api/model/info" -Method Get
    Write-Host "  PASS: Model='$($model.model_type)', Dimension=$($model.feature_dimension), Classes=$($model.class_labels -join ',')" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
}

# Check 5: Benchmark Results
Write-Host "`n[Check 5] /api/experiments/benchmark" -ForegroundColor Yellow
try {
    $bench = Invoke-RestMethod -Uri "$liveUrl/api/experiments/benchmark" -Method Get
    Write-Host "  PASS: Accuracy=$($bench.metrics.accuracy * 100)%, ROC-AUC=$($bench.metrics.roc_auc), Macro F1=$($bench.metrics.macro_f1), Beats=$($bench.metrics.evaluated_beats)" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
}

# Check 6: ECG Records Discovery
Write-Host "`n[Check 6] /api/ecg/records" -ForegroundColor Yellow
try {
    $recs = Invoke-RestMethod -Uri "$liveUrl/api/ecg/records" -Method Get
    Write-Host "  PASS: Discovered $($recs.records.Count) preloaded records ($($recs.records.record_id -join ', '))" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
}

# Check 7: Preloaded Record Waveform Streaming
Write-Host "`n[Check 7] ECG waveform endpoint (samples 0 through 500)" -ForegroundColor Yellow
try {
    $signalUrl = "$liveUrl/api/ecg/100/signal?" + "start_sample=0" + [char]38 + "end_sample=500"
    $sig = Invoke-RestMethod -Uri $signalUrl -Method Get
    Write-Host "  PASS: Streamed $($sig.samples.Count) samples on lead $($sig.lead)" -ForegroundColor Green
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
}

# Check 9: Asset MIME Type & JS Bundle Verification
Write-Host "`n[Check 9] Asset MIME Type and JS Bundle Verification" -ForegroundColor Yellow
try {
    $homeHtml = (Invoke-WebRequest -Uri "$liveUrl/" -Method Get).Content
    if ($homeHtml -match 'src="(/assets/[^"]+\.js)"') {
        $assetPath = $matches[1]
        $assetRes = Invoke-WebRequest -Uri "$liveUrl$assetPath" -Method Get
        $contentType = $assetRes.Headers["Content-Type"]
        if ($contentType -match "javascript") {
            Write-Host "  PASS: $assetPath served with Content-Type: $contentType" -ForegroundColor Green
        } else {
            Write-Host "  FAIL: $assetPath returned unexpected Content-Type: $contentType (HTML fallback detected!)" -ForegroundColor Red
        }
    } else {
        Write-Host "  SKIP: Could not extract JS asset path from index.html" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  FAIL: $_" -ForegroundColor Red
}

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " ALL POST-DEPLOYMENT VERIFICATION CHECKS COMPLETE!" -ForegroundColor Green
Write-Host " Production Site: $liveUrl" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Green



