# DreamCoder Memory Monitor (non-interactive)
# Samples every 2 sec, no marker input needed.
# Output: E:\.cache\tmp\dreamcoder-mem-<timestamp>.csv

param(
    [int]$IntervalSec = 2,
    [string]$OutDir = "E:\.cache\tmp",
    [int]$MaxSamples = 60
)

$ErrorActionPreference = "Stop"

$WatchNames = @(
    'dreamcoder-desktop', 'DreamCoder', 'dreamcoder',
    'msedgewebview2', 'WebView2',
    'bun', 'node', 'claude', 'claude-code',
    'dreamcoder-sidecar', 'cargo', 'rustc', 'tauri'
)

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$csvPath = Join-Path $OutDir "dreamcoder-mem-$ts.csv"

if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

"timestamp,elapsed_sec,pid,name,ws_mb,private_mb,cmdline_excerpt" |
    Out-File -FilePath $csvPath -Encoding utf8

$startTime = Get-Date

Write-Host "[monitor] Started. CSV: $csvPath" -ForegroundColor Cyan
Write-Host "[monitor] Sampling every ${IntervalSec}s, max $MaxSamples samples." -ForegroundColor Cyan

for ($i = 0; $i -lt $MaxSamples; $i++) {
    $now = Get-Date
    $elapsed = [int]($now - $startTime).TotalSeconds
    $tsStr = $now.ToString("HH:mm:ss")

    $procs = Get-Process -ErrorAction SilentlyContinue |
        Where-Object {
            $name = $_.ProcessName
            ($WatchNames | Where-Object { $name -like "*$_*" })
        }

    $totalMb = 0.0

    foreach ($p in $procs) {
        try {
            $wsMb      = [math]::Round($p.WorkingSet64 / 1MB, 1)
            $privateMb = [math]::Round($p.PrivateMemorySize64 / 1MB, 1)

            $cmd = ""
            try {
                $ci = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.Id)" -ErrorAction SilentlyContinue
                if ($ci) { $cmd = $ci.CommandLine }
            } catch {}
            if ($cmd) {
                $cmd = $cmd.Replace(",", " ").Replace("`r", " ").Replace("`n", " ")
                if ($cmd.Length -gt 120) { $cmd = $cmd.Substring(0, 120) + "..." }
            }

            $totalMb += $privateMb

            $line = "{0},{1},{2},{3},{4},{5},`"{6}`"" -f `
                $now.ToString("o"), $elapsed, $p.Id, $p.ProcessName, `
                $wsMb, $privateMb, $cmd
            Add-Content -Path $csvPath -Value $line -Encoding utf8
        } catch {}
    }

    # Top consumers
    $top = $procs | Sort-Object PrivateMemorySize64 -Descending | Select-Object -First 5
    $topStr = ($top | ForEach-Object {
        $ws = [math]::Round($_.WorkingSet64 / 1MB, 1)
        $priv = [math]::Round($_.PrivateMemorySize64 / 1MB, 1)
        "$($_.ProcessName):ws=${ws}MB priv=${priv}MB"
    }) -join " | "

    Write-Host ("[{0}] +{1,3}s  total={2,7:F1} MB  |  {3}" -f `
        $tsStr, $elapsed, $totalMb, $topStr)

    Start-Sleep -Seconds $IntervalSec
}

Write-Host "[monitor] Done. CSV: $csvPath" -ForegroundColor Green
