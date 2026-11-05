# ==============================================================================
# Automated Antideploy Deployment Script for ECG Arrhythmia Analysis
# ==============================================================================
param (
    [string]$AppName = "ecg-arrhythmia-analysis",
    [string]$Subdomain = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " ECG Arrhythmia Analysis — Antideploy Automated Deployer" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Check Antideploy Connectivity
# ------------------------------------------------------------------------------
Write-Host "`n[1/6] Verifying connectivity to Antideploy API..." -ForegroundColor Yellow
try {
    $apiCheck = Invoke-RestMethod -Uri "https://antideploy.com/api/v1" -Method Get -TimeoutSec 15
    Write-Host "✓ Antideploy API reachable ($($apiCheck.name) $($apiCheck.version))." -ForegroundColor Green
} catch {
    Write-Error "Cannot reach https://antideploy.com/api/v1. Please verify your internet connection."
    exit 1
}

# ------------------------------------------------------------------------------
# 2. Check or Acquire Token
# ------------------------------------------------------------------------------
Write-Host "`n[2/6] Checking Antideploy credentials..." -ForegroundColor Yellow
$configDir = Join-Path $env:USERPROFILE ".antideploy"
$configFile = Join-Path $configDir "config.json"
$token = $null

if (Test-Path $configFile) {
    try {
        $cfg = Get-Content $configFile -Raw | ConvertFrom-Json
        $token = $cfg.token
        if ($token) {
            Write-Host "✓ Found existing token in $configFile" -ForegroundColor Green
        }
    } catch {
        $token = $null
    }
}

if (-not $token) {
    Write-Host "No existing token found. Initiating device code authorization..." -ForegroundColor Cyan
    $body = @{ clientName = "Antigravity IDE" } | ConvertTo-Json
    $deviceRes = Invoke-RestMethod -Uri "https://antideploy.com/api/v1/device/code" -Method Post -ContentType "application/json" -Body $body

    Write-Host "`n----------------------------------------------------------" -ForegroundColor Yellow
    Write-Host " ACTION REQUIRED: Please authorize Antideploy" -ForegroundColor Yellow
    Write-Host " Open URL : $($deviceRes.verificationUriComplete)" -ForegroundColor Green
    Write-Host " Code     : $($deviceRes.userCode)" -ForegroundColor Green
    Write-Host " Confirm the code reads $($deviceRes.userCode), then click Approve." -ForegroundColor Yellow
    Write-Host " (If you have no account, the link lets you sign in with Google or GitHub)" -ForegroundColor Cyan
    Write-Host "----------------------------------------------------------`n" -ForegroundColor Yellow

    # Attempt to open browser automatically
    try { Start-Process $deviceRes.verificationUriComplete } catch {}

    $deviceCode = $deviceRes.deviceCode
    $interval = [Math]::Max(5, [int]$deviceRes.interval)
    Write-Host "Waiting for approval (polling every $interval seconds)..." -ForegroundColor Gray

    while ($true) {
        Start-Sleep -Seconds $interval
        try {
            $pollBody = @{ deviceCode = $deviceCode } | ConvertTo-Json
            $tokenRes = Invoke-RestMethod -Uri "https://antideploy.com/api/v1/device/token" -Method Post -ContentType "application/json" -Body $pollBody
            if ($tokenRes.token) {
                $token = $tokenRes.token
                if (-not (Test-Path $configDir)) {
                    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
                }
                @{ token = $token } | ConvertTo-Json | Set-Content $configFile -Encoding utf8
                Write-Host "✓ Authorization approved! Connected account: $($tokenRes.account.label)" -ForegroundColor Green
                break
            }
        } catch {
            $errDetail = $_.Exception.Response
            if ($errDetail -and $errDetail.StatusCode -eq 400) {
                # Read response stream if available
                $reader = New-Object System.IO.StreamReader($errDetail.GetResponseStream())
                $errJson = $reader.ReadToEnd() | ConvertFrom-Json
                if ($errJson.error -eq "authorization_pending") {
                    Write-Host "." -NoNewline -ForegroundColor Gray
                    continue
                } elseif ($errJson.error -eq "access_denied") {
                    Write-Error "Authorization was refused by user."
                    exit 1
                } elseif ($errJson.error -eq "expired_token") {
                    Write-Error "Authorization code expired. Please re-run the script."
                    exit 1
                }
            }
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
}

$headers = @{
    "Authorization" = "Bearer $token"
}

# ------------------------------------------------------------------------------
# 3. Create or Locate Application
# ------------------------------------------------------------------------------
Write-Host "`n[3/6] Setting up application in Antideploy..." -ForegroundColor Yellow
$projectRoot = Split-Path -Parent $PSScriptRoot
$antideployConfigFile = Join-Path $projectRoot ".antideploy.json"
$appId = $null

if (Test-Path $antideployConfigFile) {
    try {
        $savedConfig = Get-Content $antideployConfigFile -Raw | ConvertFrom-Json
        $appId = $savedConfig.applicationId
        Write-Host "✓ Using existing application ID: $appId" -ForegroundColor Green
    } catch {
        $appId = $null
    }
}

if (-not $appId) {
    $createPayload = @{ name = $AppName }
    if ($Subdomain) { $createPayload["subdomain"] = $Subdomain }
    $createBody = $createPayload | ConvertTo-Json

    try {
        $appRes = Invoke-RestMethod -Uri "https://antideploy.com/api/v1/applications" -Method Post -Headers $headers -ContentType "application/json" -Body $createBody
        $appId = $appRes.applicationId
        @{ applicationId = $appId; name = $appRes.name; subdomain = $appRes.subdomain } | ConvertTo-Json | Set-Content $antideployConfigFile -Encoding utf8
        Write-Host "✓ Application created: $appId (Address: https://$($appRes.subdomain).antideploy.app)" -ForegroundColor Green
    } catch {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $errJson = $reader.ReadToEnd() | ConvertFrom-Json
        if ($errJson.applicationId) {
            $appId = $errJson.applicationId
            @{ applicationId = $appId; name = $AppName } | ConvertTo-Json | Set-Content $antideployConfigFile -Encoding utf8
            Write-Host "✓ Reusing existing application: $appId" -ForegroundColor Green
        } else {
            Write-Error "Failed to create application: $($errJson.message)"
            exit 1
        }
    }
}

# ------------------------------------------------------------------------------
# 4. Prepare Bundle (< 28 MB archive ceiling)
# ------------------------------------------------------------------------------
Write-Host "`n[4/6] Packaging application bundle (respecting 28 MB ceiling)..." -ForegroundColor Yellow

$tempArchive = Join-Path $env:TEMP "ecg_deploy_$(Get-Random).tar.gz"
$stagingDir = Join-Path $env:TEMP "ecg_staging_$(Get-Random)"

if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null

Write-Host "Staging core files..." -ForegroundColor Gray
# Copy root files
Copy-Item (Join-Path $projectRoot "Procfile") $stagingDir -Force
Copy-Item (Join-Path $projectRoot "requirements.txt") $stagingDir -Force
Copy-Item (Join-Path $projectRoot "runtime.txt") $stagingDir -Force
Copy-Item (Join-Path $projectRoot "README.md") $stagingDir -Force
if (Test-Path (Join-Path $projectRoot ".antideploy.json")) {
    Copy-Item (Join-Path $projectRoot ".antideploy.json") $stagingDir -Force
}

# Copy backend (excluding .venv, test cache, uploads, raw large npz)
$backendStage = Join-Path $stagingDir "backend"
New-Item -ItemType Directory -Path $backendStage -Force | Out-Null
Copy-Item (Join-Path $projectRoot "backend\app") $backendStage -Recurse -Force
Copy-Item (Join-Path $projectRoot "backend\models") $backendStage -Recurse -Force
Copy-Item (Join-Path $projectRoot "backend\requirements.txt") $backendStage -Force

# Stage processed ml_results and metadata
$processedStage = Join-Path $backendStage "data\processed"
New-Item -ItemType Directory -Path $processedStage -Force | Out-Null
Copy-Item (Join-Path $projectRoot "backend\data\processed\ml_results") $processedStage -Recurse -Force
Copy-Item (Join-Path $projectRoot "backend\data\processed\*.json") $processedStage -Force
Copy-Item (Join-Path $projectRoot "backend\data\processed\*.md") $processedStage -Force

# Stage 6 representative preloaded MIT-BIH records (covers DS1, DS2, Normal, PVCs, APCs)
# Each record is ~1.95 MB => 6 records = ~11.7 MB (leaves plenty of headroom under 28 MB ceiling)
$mitbihStage = Join-Path $backendStage "data\mitbih"
New-Item -ItemType Directory -Path $mitbihStage -Force | Out-Null
$demoRecords = @("100", "101", "103", "105", "117", "200")
foreach ($rec in $demoRecords) {
    Get-ChildItem -Path (Join-Path $projectRoot "backend\data\mitbih") -Filter "$rec.*" | ForEach-Object {
        Copy-Item $_.FullName $mitbihStage -Force
    }
}
Copy-Item (Join-Path $projectRoot "backend\data\mitbih\RECORDS") $mitbihStage -Force -ErrorAction SilentlyContinue

# Ensure uploads directory structure exists
$uploadsStage = Join-Path $backendStage "data\uploads"
New-Item -ItemType Directory -Path $uploadsStage -Force | Out-Null
Set-Content (Join-Path $uploadsStage ".gitkeep") -Value "" -Encoding utf8

# Build latest frontend bundle if npm is available
Write-Host "Building latest frontend bundle..." -ForegroundColor Gray
$frontendDir = Join-Path $projectRoot "frontend"
try {
    Push-Location $frontendDir
    npm.cmd run build | Out-Null
} catch {
    Write-Host "Note: Could not run npm build directly; using existing frontend/dist." -ForegroundColor Gray
} finally {
    Pop-Location
}

# Copy frontend/dist built static assets
$frontendStage = Join-Path $stagingDir "frontend"
New-Item -ItemType Directory -Path $frontendStage -Force | Out-Null
if (Test-Path (Join-Path $projectRoot "frontend\dist")) {
    Copy-Item (Join-Path $projectRoot "frontend\dist") $frontendStage -Recurse -Force
    Write-Host "✓ Staged built frontend static bundle." -ForegroundColor Green
} else {
    Write-Warning "frontend/dist not found. Please build frontend first with 'npm run build'."
}

# Tar and compress using native tar if available
Write-Host "Compressing archive to $tempArchive..." -ForegroundColor Gray
Push-Location $stagingDir
try {
    tar -czf $tempArchive *
} finally {
    Pop-Location
}

$archiveBytes = (Get-Item $tempArchive).Length
$archiveMB = [Math]::Round($archiveBytes / 1MB, 2)
Write-Host "✓ Bundle packaged: $archiveMB MB (Ceiling: 28.00 MB)" -ForegroundColor Green

if ($archiveBytes -ge 29360128) {
    Write-Error "Archive ($archiveMB MB) exceeds Antideploy limit of 28 MB. Please exclude additional records."
    exit 1
}

# ------------------------------------------------------------------------------
# 5. Push Archive to Antideploy
# ------------------------------------------------------------------------------
Write-Host "`n[5/6] Pushing bundle to Antideploy..." -ForegroundColor Yellow
$deployUrl = "https://antideploy.com/api/v1/deploy?applicationId=$appId"

# Use curl.exe for multipart upload of tarball
$deployResJson = curl.exe -sS -X POST $deployUrl -H "Authorization: Bearer $token" -F "archive=@$tempArchive"
$deployRes = $deployResJson | ConvertFrom-Json

if ($deployRes.taskId) {
    $taskId = $deployRes.taskId
    Write-Host "✓ Deployment queued (Task ID: $taskId)" -ForegroundColor Green
} else {
    Write-Error "Deployment rejected: $deployResJson"
    exit 1
}

# Clean staging files
Remove-Item $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $tempArchive -Force -ErrorAction SilentlyContinue

# ------------------------------------------------------------------------------
# 6. Poll Deployment & Run Live Verification
# ------------------------------------------------------------------------------
Write-Host "`n[6/6] Watching deployment progress..." -ForegroundColor Yellow
$watchUrl = "https://antideploy.com/api/v1/deployments/$taskId"
$liveUrl = $null

while ($true) {
    Start-Sleep -Seconds 5
    $poll = Invoke-RestMethod -Uri $watchUrl -Method Get -Headers $headers
    $status = $poll.status
    Write-Host "Status: $status | Step: $($poll.currentStep || 'building')..." -ForegroundColor Cyan

    if ($status -eq "succeeded") {
        $liveUrl = $poll.url
        Write-Host "`n==========================================================" -ForegroundColor Green
        Write-Host " SUCCESS: APPLICATION IS LIVE!" -ForegroundColor Green
        Write-Host " Live URL: $liveUrl" -ForegroundColor Yellow
        Write-Host " Account : $($poll.account.label)" -ForegroundColor Cyan
        Write-Host "==========================================================" -ForegroundColor Green
        break
    } elseif ($status -eq "failed") {
        Write-Host "`nDEPLOYMENT FAILED!" -ForegroundColor Red
        Write-Host "Error: $($poll.error)" -ForegroundColor Red
        if ($poll.deployment.buildLog) {
            Write-Host "`n--- Build Log ---" -ForegroundColor Yellow
            Write-Host $poll.deployment.buildLog -ForegroundColor Gray
        }
        if ($poll.deployment.runtimeLog) {
            Write-Host "`n--- Runtime Log ---" -ForegroundColor Yellow
            Write-Host $poll.deployment.runtimeLog -ForegroundColor Gray
        }
        exit 1
    }
}

# ------------------------------------------------------------------------------
# Live Verification Suite
# ------------------------------------------------------------------------------
if ($liveUrl) {
    Write-Host "`nExecuting Live Post-Deployment Verification Suite..." -ForegroundColor Cyan

    # 1. Health
    Write-Host "`n[Check 1] Verifying /api/health ..." -ForegroundColor Yellow
    try {
        $health = Invoke-RestMethod -Uri "$liveUrl/api/health" -Method Get
        Write-Host "  ✓ Status: $($health.status) | Model Loaded: $($health.model_loaded)" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Health check failed: $_" -ForegroundColor Red
    }

    # 2. Model Info
    Write-Host "`n[Check 2] Verifying /api/model/info ..." -ForegroundColor Yellow
    try {
        $model = Invoke-RestMethod -Uri "$liveUrl/api/model/info" -Method Get
        Write-Host "  ✓ Model: $($model.model_type) | Features: $($model.feature_dimension) | Classes: $($model.class_labels -join ',')" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Model info check failed: $_" -ForegroundColor Red
    }

    # 3. Benchmark
    Write-Host "`n[Check 3] Verifying /api/experiments/benchmark ..." -ForegroundColor Yellow
    try {
        $bench = Invoke-RestMethod -Uri "$liveUrl/api/experiments/benchmark" -Method Get
        Write-Host "  ✓ DS2 Accuracy: $($bench.metrics.accuracy * 100)% | ROC-AUC: $($bench.metrics.roc_auc) | F1: $($bench.metrics.macro_f1)" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Benchmark check failed: $_" -ForegroundColor Red
    }

    # 4. Records
    Write-Host "`n[Check 4] Verifying /api/ecg/records ..." -ForegroundColor Yellow
    try {
        $recs = Invoke-RestMethod -Uri "$liveUrl/api/ecg/records" -Method Get
        Write-Host "  ✓ Preloaded records discovered: $($recs.records.Count) records ($($recs.records -join ', '))" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Record list check failed: $_" -ForegroundColor Red
    }

    # 5. Signal Waveform
    Write-Host "`n[Check 5] Verifying /api/ecg/100/signal ..." -ForegroundColor Yellow
    try {
        $sig = Invoke-RestMethod -Uri "$liveUrl/api/ecg/100/signal?start_sample=0&end_sample=1000" -Method Get
        Write-Host "  ✓ Signal streaming active: $($sig.lead) lead, $($sig.samples.Count) samples returned" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Waveform signal check failed: $_" -ForegroundColor Red
    }

    # 6. Beat Analysis and Prediction
    Write-Host "`n[Check 6] Verifying Beat Analysis & Prediction on Record 100 ..." -ForegroundColor Yellow
    try {
        $analysis = Invoke-RestMethod -Uri "$liveUrl/api/analysis/100" -Method Post
        Write-Host "  ✓ Record 100 Analyzed: $($analysis.valid_beats_analyzed) beats classified" -ForegroundColor Green
        $beat = Invoke-RestMethod -Uri "$liveUrl/api/analysis/100/beats/1" -Method Get
        Write-Host "  ✓ Beat 1 Prediction: Class $($beat.predicted_class) (Confidence: $($beat.confidence * 100)%)" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Beat analysis check failed: $_" -ForegroundColor Red
    }

    # 7. Frontend Homepage
    Write-Host "`n[Check 7] Verifying Frontend Root HTML / ..." -ForegroundColor Yellow
    try {
        $html = Invoke-WebRequest -Uri $liveUrl -Method Get
        Write-Host "  ✓ Frontend SPA root served successfully (HTTP $($html.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "  ✗ Frontend check failed: $_" -ForegroundColor Red
    }

    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host " ALL POST-DEPLOYMENT CHECKS COMPLETED!" -ForegroundColor Green
    Write-Host " Live Demo: $liveUrl" -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Green
}
