# Atualiza o SALAMANDRA (código) a partir da pasta do GOOGLE DRIVE (canal privado),
# SEM tocar no banco de dados. Assim o repositório do GitHub pode ficar PRIVADO.
# Sincroniza: public\ (a página + vendor), backend\ (código + dependências + segredos.json), seed\.
# NÃO mexe em: runtime\ (Node embutido), o banco (LOCALAPPDATA), backups, launchers.
#
# Origem: procura automaticamente a pasta "SALAMANDRA-WINDOWS" no Google Drive
# (Meu Drive / My Drive) em qualquer letra de unidade. Para fixar manualmente,
# crie um arquivo "origem-atualizacao.txt" nesta pasta com o caminho completo, ex.:
#   G:\Meu Drive\SALAMANDRA-WINDOWS
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Sync-Dir($de, $para, $extra) {
  $args = @($de, $para, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS', '/NP') + $extra
  robocopy @args | Out-Null
  if ($LASTEXITCODE -ge 8) { throw "falha ao copiar para $para (codigo $LASTEXITCODE)" }
}

function Achar-Origem($root) {
  # 1) caminho fixado pelo operador
  $cfg = Join-Path $root 'origem-atualizacao.txt'
  if (Test-Path $cfg) {
    $p = (Get-Content $cfg -Raw).Trim()
    if ($p -and (Test-Path (Join-Path $p 'public\app-online.html'))) { return $p }
  }
  # 2) auto-detecção: varre as unidades atrás de <letra>:\(Meu Drive|My Drive)\SALAMANDRA-WINDOWS
  foreach ($d in [System.IO.DriveInfo]::GetDrives()) {
    foreach ($md in @('Meu Drive','My Drive')) {
      try {
        $p = Join-Path $d.RootDirectory.FullName (Join-Path $md 'SALAMANDRA-WINDOWS')
        if (($p -ne $root) -and (Test-Path (Join-Path $p 'public\app-online.html'))) { return $p }
      } catch {}
    }
  }
  return $null
}

try {
  $origem = Achar-Origem $root
  if (-not $origem) { throw 'nao encontrei a pasta SALAMANDRA-WINDOWS no Google Drive (o Drive esta instalado/sincronizado nesta maquina?)' }
  Write-Host "Atualizando a partir do Drive: $origem"

  Sync-Dir (Join-Path $origem 'public')  (Join-Path $root 'public')  @()
  Sync-Dir (Join-Path $origem 'backend') (Join-Path $root 'backend') @('/XD','pgdata')
  Sync-Dir (Join-Path $origem 'seed')    (Join-Path $root 'seed')    @()

  $b = Select-String -Path (Join-Path $root 'public\app-online.html') -Pattern 'build \d\d/\d\d/\d\d\d\d' | Select-Object -First 1
  $ver = if ($b) { $b.Matches[0].Value } else { '' }
  Write-Host ''
  Write-Host ("ATUALIZACAO CONCLUIDA (via Drive).  $ver") -ForegroundColor Green
}
catch {
  Write-Host ''
  Write-Host ('SEM ATUALIZAR: ' + $_.Exception.Message) -ForegroundColor Yellow
  Write-Host 'O servidor vai iniciar com a versao ATUAL (a que ja esta na maquina).' -ForegroundColor Yellow
}
