$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$python = 'C:\Users\timfr\AppData\Local\Programs\Python\Python312\python.exe'

Push-Location (Join-Path $repoRoot 'services\forecast')
try {
  & $python -m stokz_forecast.cli daily-refresh
}
finally {
  Pop-Location
}
