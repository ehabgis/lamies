$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$env:ADMIN_EMAIL = Read-Host 'Administrator email'
$env:ADMIN_NAME = Read-Host 'Display name'
$adminSecret = Read-Host 'Password (at least 12 characters)' -AsSecureString
try {
  $env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $adminSecret).Password
  node --env-file-if-exists=.env server/bootstrap.mjs
} finally {
  Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_EMAIL -ErrorAction SilentlyContinue
  Remove-Item Env:ADMIN_NAME -ErrorAction SilentlyContinue
  Remove-Variable adminSecret -ErrorAction SilentlyContinue
}
