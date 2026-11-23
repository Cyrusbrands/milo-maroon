param([switch]$RunVisualChecks)
$ErrorActionPreference='Stop'
Push-Location $PSScriptRoot
try {
    node tools/check-source.mjs
    if($LASTEXITCODE -ne 0){throw 'Source checks failed'}
    node tools/fetch-assets.mjs --verify
    if($LASTEXITCODE -ne 0){throw 'Run npm run assets before building'}
    if($RunVisualChecks){
        foreach($test in @('smoke-check.mjs','seafaring-check.mjs','ecology-check.mjs','audio-integration-check.mjs','world-upgrade-check.mjs','hand-visibility-check.mjs','correction-check.mjs')){
            node (Join-Path qa $test)
            if($LASTEXITCODE -ne 0){throw ('Visual check failed: '+$test)}
        }
    }
    $env:DOTNET_CLI_HOME=Join-Path $PSScriptRoot '.build-home'
    $env:NUGET_PACKAGES=Join-Path $PSScriptRoot '.build-home/.nuget/packages'
    dotnet publish native/Castaway.Modern.csproj -p:NuGetAudit=false -c Release -r win-x64 --self-contained true -o release-v28
    if($LASTEXITCODE -ne 0){throw 'Native build failed'}
    & tools/Set-ScreenSaverName.ps1 -Executable release-v28/Castaway.Modern.exe
    Copy-Item release-v28/Castaway.Modern.exe release-v28/Castaway.Modern.scr -Force
    Copy-Item Install.ps1,Uninstall.ps1,ScreenSaver.Common.ps1,LICENSE,ASSET-LICENSE.md,THIRD-PARTY-NOTICES.md -Destination release-v28 -Force
    $sdk=Join-Path $env:NUGET_PACKAGES 'microsoft.web.webview2/1.0.4314.35'
    Copy-Item (Join-Path $sdk 'LICENSE.txt') release-v28/WEBVIEW2-LICENSE.txt -Force
    Copy-Item (Join-Path $sdk 'NOTICE.txt') release-v28/WEBVIEW2-NOTICE.txt -Force
    Set-Content release-v28/Start.cmd '@echo off','start "" "%~dp0Castaway.Modern.exe"'
    Set-Content release-v28/Install.cmd '@echo off','powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install.ps1"'
    Set-Content release-v28/Uninstall.cmd '@echo off','powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Uninstall.ps1"'
    Set-Content release-v28/Preview-Screensaver.cmd '@echo off','start "" "%~dp0Castaway.Modern.scr" /s'
}finally{Pop-Location}
