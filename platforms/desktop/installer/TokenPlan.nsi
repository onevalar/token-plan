; TokenPlan for Windows — per-user installer (no administrator rights needed).
; Built by script/package_windows_installer.py, which supplies these defines and the generated file lists:
;   VERSION, VIVERSION (x.x.x.x), OUTFILE, ICON, LICENSE_FILE, EST_KB, INSTALL_LIST, UNINSTALL_LIST
Unicode true
!include "MUI2.nsh"

!define APP_NAME "TokenPlan"
!define APP_EXE "TokenPlan.Desktop.exe"
!define UNINSTALL_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\TokenPlan"
!define APP_KEY "Software\TokenPlan"

Name "${APP_NAME}"
OutFile "${OUTFILE}"
RequestExecutionLevel user
InstallDir "$LOCALAPPDATA\Programs\TokenPlan"
InstallDirRegKey HKCU "${APP_KEY}" "InstallDir"
SetCompressor /SOLID lzma
SetCompressorDictSize 32
BrandingText "TokenPlan ${VERSION}"
ShowInstDetails nevershow
ShowUninstDetails nevershow

VIProductVersion "${VIVERSION}"
VIAddVersionKey "ProductName" "TokenPlan"
VIAddVersionKey "CompanyName" "onevalar"
VIAddVersionKey "FileDescription" "TokenPlan Setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "MIT License. Based on OpenUsage by Robin Ebers."

!define MUI_ICON "${ICON}"
!define MUI_UNICON "${ICON}"
!define MUI_ABORTWARNING
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; The first language is the fallback; NSIS picks the one matching the Windows display language.
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "TradChinese"
!insertmacro MUI_LANGUAGE "Japanese"
!insertmacro MUI_LANGUAGE "Korean"

; Ask TokenPlan to quit (it may only hide to the tray), then end it so its files can be replaced.
!macro CloseApp un
Function ${un}CloseApp
  nsExec::Exec 'taskkill /IM "${APP_EXE}"'
  Pop $0
  Sleep 700
  nsExec::Exec 'taskkill /F /IM "${APP_EXE}"'
  Pop $0
  Sleep 300
FunctionEnd
!macroend
!insertmacro CloseApp ""
!insertmacro CloseApp "un."

Section "TokenPlan" SecMain
  SetShellVarContext current
  Call CloseApp

  ; Upgrading in place: let the previous version remove its own files first.
  IfFileExists "$INSTDIR\Uninstall.exe" 0 +2
    ExecWait '"$INSTDIR\Uninstall.exe" /S _?=$INSTDIR'

  !include "${INSTALL_LIST}"

  SetOutPath "$INSTDIR"
  File "/oname=LICENSE.txt" "${LICENSE_FILE}"
  WriteUninstaller "$INSTDIR\Uninstall.exe"

  CreateShortcut "$SMPROGRAMS\TokenPlan.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0

  WriteRegStr HKCU "${APP_KEY}" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayName" "TokenPlan"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "Publisher" "onevalar"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "DisplayIcon" "$INSTDIR\${APP_EXE}"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "URLInfoAbout" "https://github.com/onevalar/token-plan"
  WriteRegStr HKCU "${UNINSTALL_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegStr HKCU "${UNINSTALL_KEY}" "QuietUninstallString" '"$INSTDIR\Uninstall.exe" /S'
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "NoRepair" 1
  WriteRegDWORD HKCU "${UNINSTALL_KEY}" "EstimatedSize" ${EST_KB}
SectionEnd

; Removes only what was installed (the generated list), never the whole folder. Preferences, history
; and logs live under %LOCALAPPDATA%\TokenPlan and are left in place.
Section "Uninstall"
  SetShellVarContext current
  Call un.CloseApp

  !include "${UNINSTALL_LIST}"

  Delete "$INSTDIR\LICENSE.txt"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"

  Delete "$SMPROGRAMS\TokenPlan.lnk"
  DeleteRegKey HKCU "${UNINSTALL_KEY}"
  DeleteRegKey HKCU "${APP_KEY}"
SectionEnd
