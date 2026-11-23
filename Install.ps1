$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
try {
    $source = $PSScriptRoot
    if (-not (Test-Path -LiteralPath (Join-Path $source 'Castaway.Modern.scr'))) {
        $source = Join-Path $source 'release-v28'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $source 'Castaway.Modern.scr')) -or -not (Test-Path -LiteralPath (Join-Path $source 'app\index.html'))) {
        throw 'The complete release-v28 folder is required. No files were copied.'
    }
    $destination = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'CastawayModern\Application-v28'
    if ((Test-Path -LiteralPath $destination) -and -not (Test-Path -LiteralPath (Join-Path $destination '.castaway-modern'))) {
        throw 'The installation folder already exists and is not a managed Castaway installation. No files were replaced.'
    }
    if ([IO.Path]::GetFullPath($source).TrimEnd('\') -ne [IO.Path]::GetFullPath($destination).TrimEnd('\')) {
        New-Item -ItemType Directory -Force -Path $destination | Out-Null
        Set-Content -LiteralPath (Join-Path $destination '.castaway-modern') -Value 'Castaway Modern 2.0'
        Get-ChildItem -LiteralPath $source | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse -Force }
    }
    $screensaver = Join-Path $destination 'Castaway.Modern.scr'
    . (Join-Path $destination 'ScreenSaver.Common.ps1')
    $backup=Join-Path $destination '.milo-screensaver-backup.json'
    if(-not(Test-Path -LiteralPath $backup)){$desktop=Get-ItemProperty 'HKCU:\Control Panel\Desktop';@{previousScreensaver=$desktop.'SCRNSAVE.EXE';previousActive=$desktop.ScreenSaveActive} | ConvertTo-Json | Set-Content -LiteralPath $backup -Encoding UTF8}
    if (-not (Test-Path -LiteralPath $screensaver)) { throw 'Castaway.Modern.scr is missing. Use the complete release folder.' }
    $null=Register-MiloScreenSaver -ScreenSaver $screensaver -OpenSettings
} catch {
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Castaway setup') | Out-Null
    exit 1
}
