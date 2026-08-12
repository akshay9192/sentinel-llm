[CmdletBinding()]
param(
    [switch]$Acknowledge
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$instructionsPath = Join-Path $repositoryRoot "agents\AGENTS.md"

if (-not (Test-Path -LiteralPath $instructionsPath -PathType Leaf)) {
    Write-Error "Required repository instructions are missing: $instructionsPath"
    exit 1
}

$instructionsHash = (Get-FileHash -LiteralPath $instructionsPath -Algorithm SHA256).Hash
$relativeInstructionsPath = Resolve-Path -LiteralPath $instructionsPath -Relative

Write-Host "Repository instructions: $relativeInstructionsPath"
Write-Host "SHA-256: $instructionsHash"

if (-not $Acknowledge) {
    Write-Error (
        "Read agents/AGENTS.md in full, then rerun this command with -Acknowledge " +
        "before performing repository work."
    )
    exit 2
}

Write-Host "Acknowledged: agents/AGENTS.md was read before starting this task."
Write-Host "Remember to check for deeper AGENTS.md files before editing their scope."
