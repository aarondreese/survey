param(
  [string]$AppRoot = "D:\development\HMS\survey",
  [string]$RemoteUser = "root",
  [string]$RemoteHost = "192.168.1.209",
  [string]$RemotePath = "/var/www/survey",
  [string]$Pm2ProcessName = "survey-app",
  [int]$Port = 3001,
  [switch]$SkipBuild,
  [switch]$SkipPm2Restart
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' not found in PATH."
  }
}

function Invoke-Checked {
  param(
    [Parameter(Mandatory = $true)][scriptblock]$Command,
    [Parameter(Mandatory = $true)][string]$FailureMessage
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$FailureMessage (exit code $LASTEXITCODE)"
  }
}

Require-Command "scp"
Require-Command "ssh"
Require-Command "tar"
Require-Command "npm"

if (-not (Test-Path $AppRoot)) {
  throw "App root not found: $AppRoot"
}

Write-Host "==> Using app root: $AppRoot"
Push-Location $AppRoot

try {
  if (-not $SkipBuild) {
    Write-Host "==> Installing dependencies and building standalone output..."

    & npm ci
    if ($LASTEXITCODE -ne 0) {
      if ($LASTEXITCODE -eq -4048) {
        Write-Warning "npm ci failed with EPERM file lock on Windows. Retrying with npm install..."
        Invoke-Checked { npm install } "npm install failed"
      }
      else {
        throw "npm ci failed (exit code $LASTEXITCODE)"
      }
    }

    Invoke-Checked { npm run build } "npm run build failed"
  }
  else {
    Write-Host "==> Skipping build (-SkipBuild used)"
  }

  # Validate expected build artifacts
  if (-not (Test-Path ".next\standalone")) { throw "Missing .next\standalone. Ensure next.config.ts has output='standalone' and build succeeded." }
  if (-not (Test-Path ".next\static")) { throw "Missing .next\static. Build output incomplete." }

  $stageDir = Join-Path $env:TEMP "survey-standalone-stage"
  $archivePath = Join-Path $env:TEMP "survey-standalone.tgz"

  Write-Host "==> Preparing staging directory..."
  if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
  if (Test-Path $archivePath) { Remove-Item $archivePath -Force }
  New-Item -ItemType Directory -Path $stageDir | Out-Null

  # 1) Copy standalone server bundle to stage root
  Copy-Item ".next\standalone\*" $stageDir -Recurse -Force

  # 2) Copy static assets into stage\.next\static
  New-Item -ItemType Directory -Path (Join-Path $stageDir ".next") -Force | Out-Null
  Copy-Item ".next\static" (Join-Path $stageDir ".next") -Recurse -Force

  # 3) Copy public assets
  if (Test-Path "public") {
    Copy-Item "public" $stageDir -Recurse -Force
  }

  # migrations are handled outside this deploy flow; skip copying migration files

  # Optional metadata files
  if (Test-Path "package.json") { Copy-Item "package.json" (Join-Path $stageDir "package.json") -Force }

  Write-Host "==> Creating archive: $archivePath"
  Invoke-Checked { tar -czf $archivePath -C $stageDir . } "Failed to create deployment archive"

  $remote = "$RemoteUser@$RemoteHost"
  $remoteArchive = "$RemotePath/survey-standalone.tgz"
  $sshControlPath = Join-Path $env:TEMP "survey-ssh-control-$RemoteUser-$RemoteHost-$Port"
  $sshMultiplexOptions = @(
    "-o", "ControlMaster=auto",
    "-o", "ControlPersist=10m",
    "-o", "ControlPath=$sshControlPath"
  )
  $sshOptions = @()
  $useSharedSshSession = $false

  if (Test-Path $sshControlPath) {
    Remove-Item $sshControlPath -Force -ErrorAction SilentlyContinue
  }

  Write-Host "==> Establishing shared SSH session (if supported)..."
  & ssh @sshMultiplexOptions $remote "true"
  if ($LASTEXITCODE -eq 0) {
    $sshOptions = $sshMultiplexOptions
    $useSharedSshSession = $true
    Write-Host "==> Shared SSH session ready."
  }
  else {
    Write-Warning "Shared SSH session is not supported by this SSH client. Continuing without multiplexing."
    $sshOptions = @()
  }

  Write-Host "==> Ensuring remote path exists..."
  Invoke-Checked { & ssh @sshOptions $remote "mkdir -p $RemotePath" } "Failed to ensure remote path"

  Write-Host "==> Uploading archive..."
  Invoke-Checked { & scp @sshOptions $archivePath "${remote}:${remoteArchive}" } "Failed to upload deployment archive"

  Write-Host "==> Extracting on remote..."
  Invoke-Checked { & ssh @sshOptions $remote "cd $RemotePath && tar -xzf survey-standalone.tgz && rm -f survey-standalone.tgz" } "Failed to extract deployment archive on remote"

  # No external uploads/listing directories or remote migrations required for this project; skip setup.

  if (-not $SkipPm2Restart) {
    Write-Host "==> Restarting PM2 app on remote..."
    $remotePm2Cmd = @(
      "cd $RemotePath",
      "if pm2 describe $Pm2ProcessName >/dev/null 2>&1; then PORT=$Port NODE_ENV=production pm2 restart $Pm2ProcessName --update-env; else PORT=$Port NODE_ENV=production pm2 start server.js --name $Pm2ProcessName; fi",
      "pm2 save",
      "pm2 status $Pm2ProcessName"
    ) -join "; "
    Invoke-Checked { & ssh @sshOptions $remote $remotePm2Cmd } "Failed to restart PM2 app"
  }
  else {
    Write-Host "==> Skipping PM2 restart (-SkipPm2Restart used)"
  }

  if ($useSharedSshSession) {
    Write-Host "==> Closing shared SSH session..."
    & ssh @sshOptions -O exit $remote *> $null
  }

  Write-Host ""
  Write-Host "Deployment complete."
  Write-Host "Remote app path: $RemotePath"
  Write-Host "PM2 process: $Pm2ProcessName"
  Write-Host ""
  Write-Host "Make sure env vars are present on VM (DATABASE_URL, FAST_WHISPER_API_URL, etc.)."
}
finally {
  Pop-Location
}
