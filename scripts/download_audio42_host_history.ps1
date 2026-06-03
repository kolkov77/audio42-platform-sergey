param(
    [string]$RemoteUser = "root",
    [string]$RemoteHost = "5.35.88.251",
    [string]$OutDir = "$PSScriptRoot\..\host-history"
)

$ErrorActionPreference = "Stop"

$resolvedOutDir = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Force -Path $resolvedOutDir | Out-Null

$remote = "$RemoteUser@$RemoteHost"

Write-Host "Audio42 host history download"
Write-Host "Remote: $remote"
Write-Host "Output: $resolvedOutDir"
Write-Host ""
Write-Host "This script reads selected history/snapshot paths and creates a temporary archive in /tmp on the host."
Write-Host "It does not deploy or modify production web roots."
Write-Host ""

$remoteScript = @'
set -eu

STAMP="$(date +%Y%m%d-%H%M%S)"
WORK="/tmp/audio42-host-history-$STAMP"
ARCHIVE="/tmp/audio42-host-history-$STAMP.tgz"

mkdir -p "$WORK"

{
  echo "# Audio42 Host History Manifest"
  echo "Host: $(hostname)"
  echo "Date: $(date -Is)"
  echo ""
  echo "## Important paths"

  for p in \
    /root/audio42-frontend-releases \
    /root/audio42-protected-recovery \
    /root/audio42-ops/VERSION_LOG.md \
    /var/www/audio42.onff.ru/index.html \
    /var/www/audio42.onff.ru/assets \
    /var/www/audio42-golden-preview-20260518
  do
    echo ""
    if [ -e "$p" ]; then
      echo "### FOUND: $p"
      find "$p" -maxdepth 3 -printf "%M %s %TY-%Tm-%Td %TH:%TM %p\n" 2>/dev/null | sort | head -500
    else
      echo "### MISSING: $p"
    fi
  done

  echo ""
  echo "## index.html backups"
  ls -lah /var/www/audio42.onff.ru/index.html.bak-* 2>/dev/null || true

  echo ""
  echo "## Codex bundles"
  ls -lah /var/www/audio42.onff.ru/assets/index-Codex* 2>/dev/null || true

  echo ""
  echo "## audio42 overlay assets"
  ls -lah /var/www/audio42.onff.ru/assets/audio42-* 2>/dev/null || true
} > "$WORK/MANIFEST.txt"

tar -czf "$ARCHIVE" --ignore-failed-read \
  "$WORK/MANIFEST.txt" \
  /root/audio42-ops/VERSION_LOG.md \
  /root/audio42-frontend-releases \
  /root/audio42-protected-recovery \
  /var/www/audio42.onff.ru/index.html \
  /var/www/audio42.onff.ru/index.html.bak-* \
  /var/www/audio42.onff.ru/assets/index-Codex* \
  /var/www/audio42.onff.ru/assets/audio42-* \
  /var/www/audio42-golden-preview-20260518 2>/dev/null || true

echo "__AUDIO42_ARCHIVE__=$ARCHIVE"
echo "__AUDIO42_MANIFEST__=$WORK/MANIFEST.txt"
'@

Write-Host "Creating remote archive..."
$remoteOutput = $remoteScript | ssh $remote "bash -s"
$remoteOutput | Tee-Object -FilePath (Join-Path $resolvedOutDir "remote-create-output.txt")

$archiveLine = $remoteOutput | Where-Object { $_ -like "__AUDIO42_ARCHIVE__=*" } | Select-Object -Last 1
if (-not $archiveLine) {
    throw "Remote archive path was not reported. See remote-create-output.txt."
}

$remoteArchive = $archiveLine -replace "^__AUDIO42_ARCHIVE__=", ""
$localArchive = Join-Path $resolvedOutDir ([System.IO.Path]::GetFileName($remoteArchive))

Write-Host ""
Write-Host "Downloading $remoteArchive ..."
scp "${remote}:$remoteArchive" "$localArchive"

Write-Host ""
Write-Host "Downloaded:"
Get-Item -LiteralPath $localArchive | Select-Object FullName, Length, LastWriteTime

Write-Host ""
Write-Host "Next step: unpack and analyze the archive before pushing any source changes."
