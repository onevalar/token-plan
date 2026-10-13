$ErrorActionPreference = 'Stop'
$installer = (Get-ChildItem "$env:RUNNER_TEMP/installers/TokenPlan-Setup-*.exe" | Select-Object -First 1).FullName
$target = Join-Path $env:RUNNER_TEMP 'TokenPlan Install Check'
foreach ($round in 1..2) {
    $setup = Start-Process -FilePath $installer -ArgumentList @('/S', "/D=$target") -Wait -PassThru
    if ($setup.ExitCode -ne 0) { throw "Installer failed: $($setup.ExitCode)" }
    foreach ($file in @('TokenPlan.Desktop.exe', 'TokenPlan.Core.dll', 'THIRD-PARTY-NOTICES.txt', 'Uninstall.exe')) {
        if (!(Test-Path (Join-Path $target $file))) { throw "Missing installed file: $file" }
    }
    python script/verify_packaged_icon.py desktop "$target"
    if ($LASTEXITCODE -ne 0) { throw 'Installed transparent icon verification failed' }
    $app = Start-Process -FilePath (Join-Path $target 'TokenPlan.Desktop.exe') -ArgumentList '--fixture' -PassThru
    Start-Sleep -Seconds 8
    $app.Refresh()
    if ($app.HasExited) { throw "Installed fixture exited unexpectedly: $($app.ExitCode)" }
    Stop-Process -Id $app.Id -Force
    $app.WaitForExit()
    Write-Output "PASS: install/upgrade round $round and fixture startup"
}
$uninstall = Start-Process -FilePath (Join-Path $target 'Uninstall.exe') -ArgumentList '/S' -Wait -PassThru
$deadline = (Get-Date).AddSeconds(30)
while ((Test-Path (Join-Path $target 'TokenPlan.Desktop.exe')) -and (Get-Date) -lt $deadline) { Start-Sleep -Seconds 1 }
if (Test-Path (Join-Path $target 'TokenPlan.Desktop.exe')) { throw 'Uninstall left the program executable behind' }
Write-Output 'PASS: uninstall removed installed program'
