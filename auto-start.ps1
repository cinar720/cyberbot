$ErrorActionPreference = 'SilentlyContinue'
$projectRoot = 'C:\Users\fsaka\Desktop\CyberBOT'
$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'

Set-Location $projectRoot

if ($existingBot = Get-Process node -ErrorAction SilentlyContinue) {
  $existingBot.PriorityClass = 'BelowNormal'
} else {
  $bot = Start-Process -FilePath 'node.exe' -ArgumentList 'dist/index.js' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
  $bot.PriorityClass = 'BelowNormal'
}

if ($existingTunnel = Get-Process cloudflared -ErrorAction SilentlyContinue) {
  $existingTunnel.PriorityClass = 'BelowNormal'
} elseif (Test-Path $cloudflared) {
  $tunnel = Start-Process -FilePath $cloudflared -ArgumentList '--config C:\Users\fsaka\.cloudflared\config.yml tunnel run cyberbot' -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
  $tunnel.PriorityClass = 'BelowNormal'
}
