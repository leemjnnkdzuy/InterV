# Script to add Windows Defender exclusions for InterV project development
# Run this script in an elevated PowerShell (Run as Administrator)

Write-Host "Checking Administrator privileges..." -ForegroundColor Cyan
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script must be run as Administrator." -ForegroundColor Red
    Write-Host "Please right-click PowerShell, select 'Run as Administrator', then execute:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File `"$PSScriptRoot\add-defender-exclusions.ps1`"" -ForegroundColor Yellow
    exit 1
}

$projectPath = (Resolve-Path "$PSScriptRoot\..").Path
Write-Host "Adding Windows Defender exclusion for project directory: $projectPath" -ForegroundColor Green
Add-MpPreference -ExclusionPath $projectPath -ErrorAction SilentlyContinue

Write-Host "Adding Windows Defender exclusions for dev processes (node.exe, python.exe)..." -ForegroundColor Green
Add-MpPreference -ExclusionProcess "node.exe" -ErrorAction SilentlyContinue
Add-MpPreference -ExclusionProcess "python.exe" -ErrorAction SilentlyContinue

Write-Host "`nWindows Defender exclusions applied successfully!" -ForegroundColor Cyan
Write-Host "Current Exclusion Paths:" -ForegroundColor White
(Get-MpPreference).ExclusionPath
Write-Host "`nCurrent Exclusion Processes:" -ForegroundColor White
(Get-MpPreference).ExclusionProcess
