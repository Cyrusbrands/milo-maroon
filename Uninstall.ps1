$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$answer=[System.Windows.Forms.MessageBox]::Show('Remove Castaway Modern? Your original Johnny Castaway installation will remain.','Uninstall Castaway Modern','YesNo','Question')
if ($answer -ne 'Yes') { exit }
$destination=Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'CastawayModern\Application-v28'
$expected=[IO.Path]::GetFullPath($destination)
if ((Test-Path -LiteralPath (Join-Path $expected '.castaway-modern')) -and $expected.EndsWith('\CastawayModern\Application-v28')) {
    . (Join-Path $expected 'ScreenSaver.Common.ps1')
    $backup=Join-Path $expected '.milo-screensaver-backup.json'
    $prior=if(Test-Path -LiteralPath $backup){Get-Content -LiteralPath $backup -Raw | ConvertFrom-Json}else{[pscustomobject]@{previousScreensaver=$null}}
    Restore-MiloScreenSaver -ScreenSaver (Join-Path $expected 'Castaway.Modern.scr') -Backup $prior
    # The running copy can be locked; launch a separate owned helper for removal.
    $command="Start-Sleep -Seconds 2; Remove-Item -LiteralPath '"+$expected.Replace("'","''")+"' -Recurse -Force"
    $encoded=[Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
    Start-Process -FilePath powershell.exe -WindowStyle Hidden -ArgumentList '-NoProfile','-EncodedCommand',$encoded
    Start-Process -FilePath "$env:WINDIR\System32\control.exe" -ArgumentList 'desk.cpl,,@screensaver'
}
