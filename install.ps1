#Requires -Version 5.1
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$src = $PSScriptRoot
$homeDir = if ($HOME) { $HOME } else { $env:USERPROFILE }
$config = if ($env:XDG_CONFIG_HOME) {
  Join-Path $env:XDG_CONFIG_HOME "opencode"
} else {
  Join-Path $homeDir ".config\opencode"
}
$dest = Join-Path $config "plugins\context-limit"

function Test-PluginDirectory {
  param([Parameter(Mandatory)][string]$Path)

  $manifest = Join-Path $Path "package.json"
  if (-not (Test-Path -LiteralPath $manifest -PathType Leaf)) {
    return $false
  }

  try {
    $json = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json
    return $json.name -eq "opencode-context-limit"
  } catch {
    return $false
  }
}

function Invoke-Build {
  $bun = Get-Command bun -ErrorAction SilentlyContinue
  if ($bun) {
    Push-Location $src
    try {
      & $bun.Source install
      if ($LASTEXITCODE -ne 0) { throw "bun install failed with exit code $LASTEXITCODE" }
      & $bun.Source run build
      if ($LASTEXITCODE -ne 0) { throw "bun run build failed with exit code $LASTEXITCODE" }
    } finally {
      Pop-Location
    }
    return
  }

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($npm) {
    Push-Location $src
    try {
      & $npm.Source install
      if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }
      & $npm.Source run build
      if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE" }
    } finally {
      Pop-Location
    }
    return
  }

  Write-Warning "bun or npm is required to build the desktop GUI part"
}

Invoke-Build

$bundle = Join-Path $src "dist\gui-experimental.cjs"
if (-not (Test-Path -LiteralPath $bundle -PathType Leaf)) {
  throw "Missing $bundle; the desktop GUI part was not built"
}

New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null

$existing = Get-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue
if ($existing) {
  if (Test-PluginDirectory -Path $dest) {
    Remove-Item -LiteralPath $dest -Recurse -Force
  } else {
    throw "Destination exists and does not look like this plugin: $dest. Remove it manually if you want to replace it."
  }
}

New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $src "src") -Destination $dest -Recurse -Force
Copy-Item -LiteralPath (Join-Path $src "dist") -Destination $dest -Recurse -Force
Copy-Item -LiteralPath (Join-Path $src "package.json") -Destination $dest -Force
Copy-Item -LiteralPath (Join-Path $src "README.md") -Destination $dest -Force

Write-Host "Installed: $dest (copy of $src)"
Write-Host "Restart OpenCode."
Write-Host "TUI: Ctrl+P -> Context window, or /context-limit."
Write-Host "Desktop: use /context-limit (or /limit), or the command palette."
