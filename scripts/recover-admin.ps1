<#
.SYNOPSIS
  Create one demo super_admin on a Lamies host without a shell (Render Free),
  through POST /api/auth/recover-admin in "create" mode (server/adminRecovery.mjs).

.DESCRIPTION
  Run the steps in order, from the project folder, in Windows PowerShell:

    .\scripts\recover-admin.ps1 prepare   generate ADMIN_RECOVERY_SECRET (32 secure random
                                          bytes, base64url), keep it DPAPI-encrypted for this
                                          Windows user outside the project, compute
                                          ADMIN_RECOVERY_UNTIL from now, and put the secret on
                                          the clipboard (excluded from clipboard history and
                                          cloud sync) to paste into Render -> Environment.
    .\scripts\recover-admin.ps1 copy      put the secret on the clipboard again.
    .\scripts\recover-admin.ps1 check     is the route open for this secret? Sends the secret
                                          with a too-short password: 400 means open, and
                                          nothing is created or used up.
    .\scripts\recover-admin.ps1 create    ask for the new password (hidden), create the
                                          administrator, then sign in and confirm /admin access.
    .\scripts\recover-admin.ps1 verify    sign in again and confirm /admin access (read-only).
    .\scripts\recover-admin.ps1 cleanup   delete the local secret and state; run it after the
                                          three variables are removed from Render.

  "create" mode only: an email that already has an account is refused (409) and
  nothing changes. The script never sets ADMIN_RECOVERY_MODE.
  The secret and the password are never printed, logged, or written to the project,
  and are sent only to the Lamies server (no redirects followed).
#>
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet('prepare', 'copy', 'check', 'create', 'verify', 'cleanup')]
  [string]$Step,
  [string]$BaseUrl = 'https://lamies.onrender.com',
  [ValidateRange(1, 47)]
  [int]$Hours = 24,
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Add-Type -AssemblyName System.Security

$RecoveryPath = '/api/auth/recover-admin'
$StateDir = Join-Path $env:LOCALAPPDATA 'lamies-admin-recovery'
$SecretFile = Join-Path $StateDir 'secret.dpapi'
$StateFile = Join-Path $StateDir 'state.json'
$Entropy = [Text.Encoding]::UTF8.GetBytes('lamies-admin-recovery/v1')

# Only the Lamies production server; plain-HTTP localhost is allowed for local tests.
function Assert-Server([string]$url) {
  $u = $null
  if (-not [Uri]::TryCreate($url, [UriKind]::Absolute, [ref]$u)) { throw "Not a URL: $url" }
  $prod = $u.Scheme -eq 'https' -and $u.Host -eq 'lamies.onrender.com' -and $u.IsDefaultPort
  $local = $u.Host -in @('127.0.0.1', 'localhost')
  if (-not ($prod -or $local) -or $u.PathAndQuery -ne '/' -or $u.UserInfo) {
    throw "Refusing server $url. Allowed: https://lamies.onrender.com (or localhost for testing)."
  }
  $u.GetLeftPart([UriPartial]::Authority)
}

function Get-State {
  if (-not (Test-Path $StateFile) -or -not (Test-Path $SecretFile)) {
    throw 'Nothing prepared. Run: .\scripts\recover-admin.ps1 prepare'
  }
  $s = Get-Content $StateFile -Raw | ConvertFrom-Json
  $s.baseUrl = Assert-Server $s.baseUrl
  $s
}

# DPAPI through .NET directly, so no cmdlet ever receives the plain secret.
function Save-Secret([string]$secret) {
  $plain = [Text.Encoding]::UTF8.GetBytes($secret)
  try {
    $enc = [Security.Cryptography.ProtectedData]::Protect($plain, $Entropy, 'CurrentUser')
    [IO.File]::WriteAllText($SecretFile, [Convert]::ToBase64String($enc))
  } finally { [Array]::Clear($plain, 0, $plain.Length) }
}
function Get-Secret {
  $enc = [Convert]::FromBase64String([IO.File]::ReadAllText($SecretFile).Trim())
  $plain = [Security.Cryptography.ProtectedData]::Unprotect($enc, $Entropy, 'CurrentUser')
  try { [Text.Encoding]::UTF8.GetString($plain) } finally { [Array]::Clear($plain, 0, $plain.Length) }
}

function ConvertTo-JsonString([string]$s) {
  $sb = New-Object Text.StringBuilder
  [void]$sb.Append('"')
  foreach ($c in $s.ToCharArray()) {
    switch ($c) {
      '"' { [void]$sb.Append('\"') }
      '\' { [void]$sb.Append('\\') }
      default {
        if ([int]$c -lt 0x20) { [void]$sb.Append(('\u{0:x4}' -f [int]$c)) } else { [void]$sb.Append($c) }
      }
    }
  }
  [void]$sb.Append('"')
  $sb.ToString()
}
function New-JsonBody([hashtable]$fields) {
  $parts = foreach ($k in $fields.Keys) { (ConvertTo-JsonString $k) + ':' + (ConvertTo-JsonString ([string]$fields[$k])) }
  [Text.Encoding]::UTF8.GetBytes('{' + ($parts -join ',') + '}')
}

function Set-SecretClipboard([string]$value) {
  if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
    throw 'The clipboard needs an STA shell. Run: powershell -STA -File .\scripts\recover-admin.ps1 copy'
  }
  Add-Type -AssemblyName System.Windows.Forms
  $data = New-Object System.Windows.Forms.DataObject
  $data.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $value)
  # Keep the secret out of Windows clipboard history (Win+V) and cloud clipboard.
  $data.SetData('ExcludeClipboardContentFromMonitorProcessing', (New-Object IO.MemoryStream(, [byte[]](1, 0, 0, 0))))
  $data.SetData('CanIncludeInClipboardHistory', (New-Object IO.MemoryStream(, [byte[]](0, 0, 0, 0))))
  $data.SetData('CanUploadToCloudClipboard', (New-Object IO.MemoryStream(, [byte[]](0, 0, 0, 0))))
  [System.Windows.Forms.Clipboard]::SetDataObject($data, $true)
}

function Copy-SecretUntilEnter {
  $secret = Get-Secret
  try { Set-SecretClipboard $secret } finally { $secret = $null }
  Write-Host 'ADMIN_RECOVERY_SECRET is on the clipboard (not shown).' -ForegroundColor Yellow
  [void](Read-Host 'Paste it into Render as the value of ADMIN_RECOVERY_SECRET, then press Enter here to clear the clipboard')
  [System.Windows.Forms.Clipboard]::Clear()
  Write-Host 'Clipboard cleared.'
}

function Invoke-Api {
  param([string]$Method, [string]$Path, [hashtable]$Body = $null, $Session = $null, [hashtable]$Headers = @{})
  $params = @{
    Uri = $script:Base + $Path; Method = $Method; UseBasicParsing = $true; TimeoutSec = 120
    Headers = $Headers; MaximumRedirection = 0
  }
  if ($null -ne $Body) {
    # [byte[]] matters: a function's array output is unrolled into object[], which
    # Windows PowerShell would send as space-separated numbers.
    $params.Body = [byte[]](New-JsonBody $Body)
    $params.ContentType = 'application/json; charset=utf-8'
  }
  if ($null -ne $Session) { $params.WebSession = $Session }
  try {
    $r = Invoke-WebRequest @params
    $status = [int]$r.StatusCode
    if ($status -ge 300) { throw "The server answered with a redirect ($status); refusing to follow it." }
    return [pscustomobject]@{ Status = $status; Content = [string]$r.Content }
  } catch [System.Net.WebException] {
    $resp = $_.Exception.Response
    if ($null -eq $resp) { throw "Could not reach $($script:Base) ($($_.Exception.Status))." }
    $status = [int]$resp.StatusCode
    if ($status -ge 300 -and $status -lt 400) { throw "The server answered with a redirect ($status); refusing to follow it." }
    $text = ''
    try { $reader = New-Object IO.StreamReader($resp.GetResponseStream(), [Text.Encoding]::UTF8); $text = $reader.ReadToEnd(); $reader.Dispose() } catch {}
    return [pscustomobject]@{ Status = $status; Content = $text }
  } finally {
    $params = $null
  }
}

function Wait-Awake {
  Write-Host "Contacting $($script:Base) (a sleeping Render Free service can take about a minute)..."
  $r = Invoke-Api GET '/api/auth/me'
  if ($r.Status -ne 200) { throw "The service answered $($r.Status) to /api/auth/me." }
}

function Test-AdminLogin([string]$email, [securestring]$password) {
  $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $plain = [Net.NetworkCredential]::new('', $password).Password
  try {
    $r = Invoke-Api POST '/api/auth/login' @{ email = $email; password = $plain } $session
  } finally { $plain = $null }
  if ($r.Status -ne 200) { Write-Host "Sign-in failed ($($r.Status))." -ForegroundColor Red; return $false }
  $j = $r.Content | ConvertFrom-Json
  $ok = $true
  if ($j.user.role -eq 'super_admin') { Write-Host 'Sign-in OK; role: super_admin.' -ForegroundColor Green }
  else { Write-Host "Signed in, but the role is '$($j.user.role)', not super_admin." -ForegroundColor Red; $ok = $false }
  # Read-only check of an administrator API used by /admin.
  $a = Invoke-Api GET '/api/admin/nodes' $null $session
  if ($a.Status -eq 200) { Write-Host 'Administrator API (/api/admin/nodes, read-only): 200 OK.' -ForegroundColor Green }
  else { Write-Host "Administrator API answered $($a.Status)." -ForegroundColor Red; $ok = $false }
  # End only this script's own session.
  [void](Invoke-Api POST '/api/auth/logout' @{} $session @{ 'X-CSRF-Token' = [string]$j.csrfToken })
  return $ok
}

switch ($Step) {
  'prepare' {
    $server = Assert-Server $BaseUrl
    if ((Test-Path $SecretFile) -and -not $Force) {
      throw 'A secret is already prepared. Use "copy" to paste it again, or "prepare -Force" to replace it (then replace it in Render too).'
    }
    $email = (Read-Host 'Email of the NEW demo administrator (an address with no account on Lamies)').Trim().ToLowerInvariant()
    if ($email -notmatch '^\S+@\S+\.\S+$') { throw 'That is not an email address.' }
    $confirm = Read-Host "Type yes to confirm '$email' is a NEW address, not the previous administrator's"
    if ($confirm -ne 'yes') { throw 'Not confirmed; nothing was generated.' }

    $bytes = New-Object byte[] 32
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $secret = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
    [Array]::Clear($bytes, 0, $bytes.Length)
    if ($secret.Length -ne 43) { throw 'Unexpected secret length.' }

    New-Item -ItemType Directory -Force $StateDir | Out-Null
    try { Save-Secret $secret } finally { $secret = $null }
    $until = (Get-Date).ToUniversalTime().AddHours($Hours).ToString('yyyy-MM-ddTHH:mm:ssZ')
    [pscustomobject]@{ baseUrl = $server; email = $email; until = $until; preparedAt = (Get-Date).ToUniversalTime().ToString('o') } |
      ConvertTo-Json | Set-Content -Encoding utf8 $StateFile

    Write-Host ''
    Write-Host 'In Render -> your Lamies service -> Environment, add exactly these three variables:' -ForegroundColor Cyan
    Write-Host "  ADMIN_RECOVERY_EMAIL   $email"
    Write-Host "  ADMIN_RECOVERY_UNTIL   $until   ($Hours h from now)"
    Write-Host '  ADMIN_RECOVERY_SECRET  (from the clipboard, next)'
    Write-Host 'Do NOT add ADMIN_RECOVERY_MODE (the default is create).'
    Write-Host ''
    Copy-SecretUntilEnter
    Write-Host 'Then click Save -> "Save and deploy". When the deploy is live, run: .\scripts\recover-admin.ps1 check'
  }
  'copy' {
    [void](Get-State)
    Copy-SecretUntilEnter
  }
  'check' {
    $state = Get-State
    $script:Base = $state.baseUrl
    if ([DateTime]::Parse($state.until).ToUniversalTime() -le (Get-Date).ToUniversalTime()) { throw "ADMIN_RECOVERY_UNTIL ($($state.until)) has passed. Run prepare -Force." }
    Wait-Awake
    $secret = Get-Secret
    try { $r = Invoke-Api POST $RecoveryPath @{ secret = $secret; password = 'x' } }
    finally { $secret = $null }
    # 400 alone could be a malformed request; "open" needs the password-length
    # error (12-200), which the server gives only after it accepted the secret.
    $status = $r.Status
    if ($status -eq 400 -and -not ($r.Content -match '12' -and $r.Content -match '200')) { $status = -400 }
    switch ($status) {
      -400 { Write-Host 'Unexpected 400: the server did not understand the request; nothing is confirmed.' -ForegroundColor Red }
      400 { Write-Host "Recovery status: open (for $($state.email) until $($state.until); create mode). Nothing was changed." -ForegroundColor Green }
      404 { Write-Host 'Recovery status: closed. Either the deploy with the variables is not live yet, a value is invalid, the time passed, it was already used, or 5 wrong secrets closed it. Render -> Logs shows a line starting "Admin recovery".' -ForegroundColor Yellow }
      403 { Write-Host 'Recovery status: open, but the secret in Render differs from this one (this counted as 1 of 5 wrong attempts). Do not retry: run "copy", re-paste ADMIN_RECOVERY_SECRET in Render, deploy, then check.' -ForegroundColor Red }
      429 { Write-Host 'Too many requests; wait one minute.' -ForegroundColor Yellow }
      default { Write-Host "Unexpected answer: $($r.Status)." -ForegroundColor Red }
    }
  }
  'create' {
    $state = Get-State
    $script:Base = $state.baseUrl
    Write-Host "Creating super_admin $($state.email) on $($state.baseUrl) (create mode: an existing account is never changed)."
    $p1 = Read-Host 'New password (12-200 characters; hidden)' -AsSecureString
    $p2 = Read-Host 'Repeat the password' -AsSecureString
    $a = [Net.NetworkCredential]::new('', $p1).Password
    $b = [Net.NetworkCredential]::new('', $p2).Password
    try {
      if ($a -cne $b) { throw 'The two passwords differ; nothing was sent.' }
      if ($a.Length -lt 12 -or $a.Length -gt 200) { throw 'The password must be 12-200 characters; nothing was sent.' }
      Wait-Awake
      $secret = Get-Secret
      try { $r = Invoke-Api POST $RecoveryPath @{ secret = $secret; password = $a } }
      finally { $secret = $null }
    } finally { $a = $null; $b = $null; $p2 = $null }
    switch ($r.Status) {
      200 { Write-Host 'Administrator created. The route is now closed.' -ForegroundColor Green }
      409 { throw 'An account with this email already exists; nothing changed. Choose another email (prepare -Force).' }
      404 { throw 'The route is closed (not deployed yet, expired, already used, or closed). Run "check".' }
      403 { throw 'Wrong secret (counted as 1 of 5). Run "copy", re-paste it in Render, deploy, then "check".' }
      400 { throw 'The server refused the password length.' }
      429 { throw 'Too many requests; wait one minute and run create again.' }
      default { throw "Unexpected answer: $($r.Status). Nothing is confirmed; run check." }
    }
    Write-Host 'Verifying sign-in...'
    $ok = Test-AdminLogin $state.email $p1
    $p1 = $null
    if ($ok) { Write-Host "Done. Open $($state.baseUrl)/admin and sign in as $($state.email)." -ForegroundColor Green }
  }
  'verify' {
    $state = Get-State
    $script:Base = $state.baseUrl
    $p = Read-Host "Password for $($state.email) (hidden)" -AsSecureString
    Wait-Awake
    [void](Test-AdminLogin $state.email $p)
    $p = $null
  }
  'cleanup' {
    if (-not $Force) {
      $answer = Read-Host 'Have you removed ADMIN_RECOVERY_SECRET, ADMIN_RECOVERY_EMAIL and ADMIN_RECOVERY_UNTIL from Render? (yes/no)'
      if ($answer -ne 'yes') { Write-Host 'Nothing deleted.'; return }
    }
    if (Test-Path $StateDir) { Remove-Item -Recurse -Force $StateDir }
    Write-Host 'Local recovery secret and state deleted.'
  }
}
