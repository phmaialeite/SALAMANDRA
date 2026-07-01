# Atualiza o SALAMANDRA (codigo) a partir do GitHub, SEM tocar no banco de dados.
# Sincroniza: public\ (a pagina + vendor), backend\ (codigo + dependencias), seed\.
# NAO mexe em: runtime\ (Node embutido), o banco (fica em LOCALAPPDATA), backups, launchers.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$url  = 'https://github.com/phmaialeite/SALAMANDRA/archive/refs/heads/main.zip'
$zip  = Join-Path $env:TEMP 'salamandra-main.zip'
$out  = Join-Path $env:TEMP 'salamandra-update'

function Sync-Dir($de, $para, $extra) {
  # robocopy: copia so o que mudou; codigos 0..7 = sucesso, 8+ = falha
  $args = @($de, $para, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS', '/NP') + $extra
  robocopy @args | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "falha ao copiar para $para (codigo $LASTEXITCODE)" }
}

try {
  Write-Host 'Baixando a versao mais nova do GitHub...'
  Invoke-WebRequest $url -OutFile $zip -UseBasicParsing
  if (Test-Path $out) { Remove-Item $out -Recurse -Force }
  Expand-Archive $zip -DestinationPath $out -Force
  $src = Join-Path $out 'SALAMANDRA-main'
  if (-not (Test-Path (Join-Path $src 'public\app-online.html'))) { throw 'pacote baixado incompleto' }

  Write-Host 'Aplicando a atualizacao (o banco NAO e tocado)...'
  Sync-Dir (Join-Path $src 'public')  (Join-Path $root 'public')  @()
  Sync-Dir (Join-Path $src 'backend') (Join-Path $root 'backend') @('/XD','pgdata')
  Sync-Dir (Join-Path $src 'seed')    (Join-Path $root 'seed')    @()

  Remove-Item $zip -Force
  Remove-Item $out -Recurse -Force

  $b = Select-String -Path (Join-Path $root 'public\app-online.html') -Pattern 'build \d\d/\d\d/\d\d\d\d' | Select-Object -First 1
  $ver = if ($b) { $b.Matches[0].Value } else { '' }
  Write-Host ''
  Write-Host ("ATUALIZACAO CONCLUIDA.  $ver") -ForegroundColor Green
}
catch {
  Write-Host ''
  Write-Host ('FALHA NA ATUALIZACAO: ' + $_.Exception.Message) -ForegroundColor Yellow
  Write-Host 'Sem problema: o servidor vai iniciar com a versao ATUAL (a que ja esta na maquina).' -ForegroundColor Yellow
}
