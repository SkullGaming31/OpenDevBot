param(
	[Parameter(Mandatory = $true)]
	[string]$ExecutablePath
)

$ErrorActionPreference = 'Stop'
$executable = (Resolve-Path -LiteralPath $ExecutablePath).Path
$workingDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "opendevbot-smoke-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $workingDirectory | Out-Null
$process = $null

function Get-FreePort {
	$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
	try {
		$listener.Start()
		return $listener.LocalEndpoint.Port
	} finally {
		$listener.Stop()
	}
}

try {
	$apiPort = Get-FreePort
	do { $debugPort = Get-FreePort } while ($debugPort -eq $apiPort)
	$profile = Join-Path $workingDirectory 'profile'
	$startInfo = [System.Diagnostics.ProcessStartInfo]::new()
	$startInfo.FileName = $executable
	$startInfo.WorkingDirectory = $workingDirectory
	$startInfo.UseShellExecute = $false
	$startInfo.Environment.Clear()
	foreach ($name in @('SystemRoot', 'SystemDrive', 'WINDIR', 'PATH', 'PATHEXT', 'COMSPEC', 'PROCESSOR_ARCHITECTURE', 'TEMP', 'TMP')) {
		if ([Environment]::GetEnvironmentVariable($name)) {
			$startInfo.Environment[$name] = [Environment]::GetEnvironmentVariable($name)
		}
	}
	$startInfo.Environment['APPDATA'] = $workingDirectory
	$startInfo.Environment['LOCALAPPDATA'] = $workingDirectory
	$startInfo.Environment['USERPROFILE'] = $workingDirectory
	$startInfo.Environment['ENVIRONMENT'] = 'test'
	$startInfo.Environment['ENABLE_CHAT'] = 'false'
	$startInfo.Environment['ENABLE_EVENTSUB'] = 'false'
	$startInfo.Environment['DISCORD_WEBHOOK_DRY_RUN'] = 'true'
	$startInfo.Environment['PORT'] = "$apiPort"
	foreach ($argument in @(
		"--user-data-dir=$profile",
		"--remote-debugging-port=$debugPort",
		'--disable-background-networking',
		'--disable-component-update',
		'--disable-sync',
		'--no-proxy-server',
		'--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1'
	)) {
		$startInfo.ArgumentList.Add($argument)
	}

	$process = [System.Diagnostics.Process]::Start($startInfo)
	if (-not $process) { throw 'Failed to launch the packaged application' }
	$deadline = [DateTime]::UtcNow.AddSeconds(60)
	$healthy = $false
	$dashboard = $false
	$lastError = $null
	do {
		$process.Refresh()
		if ($process.HasExited) { throw "Packaged application exited early with code $($process.ExitCode)" }
		try {
			$health = Invoke-RestMethod -Uri "http://127.0.0.1:$apiPort/health" -TimeoutSec 2
			$healthy = $health.status -eq 'ok' -and $health.db -eq $true
			$targets = Invoke-RestMethod -Uri "http://127.0.0.1:$debugPort/json" -TimeoutSec 2
			$dashboard = @($targets | Where-Object { $_.type -eq 'page' -and $_.url -like '*public/admin/dashboard.html' }).Count -gt 0
		} catch {
			$lastError = $_.Exception.Message
		}
		if (-not $healthy -or -not $dashboard) { Start-Sleep -Milliseconds 500 }
	} while ((-not $healthy -or -not $dashboard) -and [DateTime]::UtcNow -lt $deadline)
	if (-not $healthy) { throw "Packaged application did not report a healthy SQLite API. Last error: $lastError" }
	if (-not $dashboard) { throw "Packaged application did not load the dashboard window. Last error: $lastError" }
	node (Join-Path $PSScriptRoot 'check-offline-render.js') $debugPort
	if ($LASTEXITCODE -ne 0) { throw 'Packaged dashboard or logs window did not render offline' }

	$css = Invoke-WebRequest -Uri "http://127.0.0.1:$apiPort/assets/css/admin.css" -TimeoutSec 5
	if ($css.StatusCode -ne 200 -or -not $css.Content) { throw 'Packaged admin assets were not served' }
	$admin = Invoke-WebRequest -Uri "http://127.0.0.1:$apiPort/admin/eventsubs" -TimeoutSec 5 -SkipHttpErrorCheck
	if ($admin.StatusCode -ne 401) { throw 'Packaged admin endpoint allowed an unauthenticated request' }
	if (-not (Test-Path -LiteralPath (Join-Path $profile 'opendevbot.sqlite'))) {
		throw 'Packaged application did not create its isolated SQLite database'
	}
	Write-Output 'PASS: packaged app started with an isolated profile, healthy SQLite API, dashboard, and admin assets'
} finally {
	if ($process) {
		$process.Refresh()
		if (-not $process.HasExited) {
			$process.Kill()
			$process.WaitForExit()
		}
		$process.Dispose()
	}
	Remove-Item -LiteralPath $workingDirectory -Recurse -Force
}
