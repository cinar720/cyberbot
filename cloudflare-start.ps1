$ErrorActionPreference = 'SilentlyContinue'
$cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$config = 'C:\Users\fsaka\.cloudflared\config.yml'

if ((Test-Path $cloudflared) -and (Test-Path $config) -and -not (Get-Process cloudflared -ErrorAction SilentlyContinue)) {
  $tunnel = Start-Process -FilePath $cloudflared -ArgumentList "--config `"$config`" tunnel run cyberbot" -WorkingDirectory 'C:\Users\fsaka\Desktop\CyberBOT' -WindowStyle Hidden -PassThru
  $tunnel.PriorityClass = 'BelowNormal'
}
