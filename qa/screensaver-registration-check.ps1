param([Parameter(Mandatory=$true)][string]$ScreenSaverPath)
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
. (Join-Path $root 'ScreenSaver.Common.ps1')
$temporary=Join-Path ([IO.Path]::GetTempPath()) ('Milo Screensaver QA '+[Guid]::NewGuid().ToString('N'))
$key='HKCU:\Software\MiloMaroon\InstallerQA\'+[Guid]::NewGuid().ToString('N')
try {
    New-Item -ItemType Directory -Path $temporary | Out-Null
    $scr=Join-Path $temporary 'Milo Maroon With Spaces.scr'
    Copy-Item -LiteralPath $ScreenSaverPath -Destination $scr
    & (Join-Path $root 'tools/Set-ScreenSaverName.ps1') -Executable $scr
    if([MiloScreenSaverResource]::Read($scr) -ne 'Milo Maroon'){throw 'Windows description string 1 is missing'}
    $null=Register-MiloScreenSaver -ScreenSaver ('"'+$scr+'"') -RegistryPath $key
    $selected=(Get-ItemProperty -LiteralPath $key).'SCRNSAVE.EXE'
    if($selected -ne $scr -or $selected.Contains('"')){throw 'Quoted/spaced-path regression'}
    $prior=[pscustomobject]@{previousScreensaver='C:\Windows\System32\PhotoScreensaver.scr';previousActive='0'}
    Restore-MiloScreenSaver -ScreenSaver $scr -Backup $prior -RegistryPath $key
    $restored=Get-ItemProperty -LiteralPath $key
    if($restored.'SCRNSAVE.EXE' -ne $prior.previousScreensaver -or $restored.ScreenSaveActive -ne '0'){throw 'Restore regression'}
    Write-Host 'Windows name, quoted/spaced path and previous-state restoration passed. Desktop settings were not changed.'
}finally{
    if(Test-Path -LiteralPath $key){Remove-Item -LiteralPath $key -Recurse -Force}
    if(Test-Path -LiteralPath $temporary){Remove-Item -LiteralPath $temporary -Recurse -Force}
}
