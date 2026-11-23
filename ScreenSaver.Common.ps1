function Register-MiloScreenSaver {
    param([Parameter(Mandatory=$true)][string]$ScreenSaver,[switch]$OpenSettings,[string]$RegistryPath='HKCU:\Control Panel\Desktop')
    # SCRNSAVE.EXE is a filename, not a quoted command line. Rundll32's
    # InstallScreenSaver callback can retain the literal quotes around a path.
    if($OpenSettings){
        foreach($policy in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Policies\System','HKLM:\Software\Microsoft\Windows\CurrentVersion\Policies\System')){
            $rules=Get-ItemProperty -LiteralPath $policy -ErrorAction SilentlyContinue
            if($rules.NoDispCPL -eq 1 -or $rules.NoDispScrSavPage -eq 1){throw 'Your Windows administrator has disabled Screen Saver Settings. No policy was changed. You can still run Milo Maroon as a normal application; ask your administrator about screensaver registration.'}
        }
    }
    $full=[IO.Path]::GetFullPath($ScreenSaver.Trim().Trim('"'))
    if([IO.Path]::GetExtension($full) -ne '.scr' -or -not(Test-Path -LiteralPath $full -PathType Leaf)){throw 'The complete screensaver file is missing.'}
    if(-not(Test-Path -LiteralPath $RegistryPath)){New-Item -Path $RegistryPath -Force | Out-Null}
    New-ItemProperty -Path $RegistryPath -Name 'SCRNSAVE.EXE' -Value $full -PropertyType String -Force | Out-Null
    New-ItemProperty -Path $RegistryPath -Name 'ScreenSaveActive' -Value '1' -PropertyType String -Force | Out-Null
    if((Get-ItemProperty -LiteralPath $RegistryPath -Name 'SCRNSAVE.EXE').'SCRNSAVE.EXE' -ne $full){throw 'Windows screensaver registration did not match the installed file.'}
    if($OpenSettings){Start-Process -FilePath "$env:WINDIR\System32\control.exe" -ArgumentList 'desk.cpl,,@screensaver' -WindowStyle Normal}
    return $full
}

function Restore-MiloScreenSaver {
    param([string]$ScreenSaver,[object]$Backup,[string]$RegistryPath='HKCU:\Control Panel\Desktop')
    $selected=(Get-ItemProperty -LiteralPath $RegistryPath -Name 'SCRNSAVE.EXE' -ErrorAction SilentlyContinue).'SCRNSAVE.EXE'
    if(-not $selected -or $selected.Trim('"') -ne [IO.Path]::GetFullPath($ScreenSaver).Trim('"')){return}
    if($Backup.previousScreensaver){Set-ItemProperty -LiteralPath $RegistryPath -Name 'SCRNSAVE.EXE' -Value $Backup.previousScreensaver}
    else{Remove-ItemProperty -LiteralPath $RegistryPath -Name 'SCRNSAVE.EXE' -ErrorAction SilentlyContinue}
    if($null -ne $Backup.PSObject.Properties['previousActive']){
        if($null -ne $Backup.previousActive){Set-ItemProperty -LiteralPath $RegistryPath -Name 'ScreenSaveActive' -Value $Backup.previousActive}
        else{Remove-ItemProperty -LiteralPath $RegistryPath -Name 'ScreenSaveActive' -ErrorAction SilentlyContinue}
    }
}
