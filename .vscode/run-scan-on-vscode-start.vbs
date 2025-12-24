' run-scan-on-vscode-start.vbs
' Watches for Code.exe (VS Code) starting and runs `npm run scan` in the repo.
' To autorun at login: create a shortcut to this script in your Startup folder (shell:startup).
'
Option Explicit
Dim wsh, svc, col, proc
Set wsh = CreateObject("WScript.Shell")
Set svc = GetObject("winmgmts:\\.\root\cimv2")
Dim repoPath
repoPath = "C:\Users\GREG GAMING PC\Documents\santhij is gay\website\greg-webdev.github.io"
Dim logFile
logFile = repoPath & "\\actions\\monitor-run.log"

Sub Log(msg)
  On Error Resume Next
  Dim f
  Set f = CreateObject("Scripting.FileSystemObject").OpenTextFile(logFile, 8, True)
  f.WriteLine Now() & " - " & msg
  f.Close
End Sub

Function IsProcessRunning(name)
  Dim q, colProcs
  q = "Select * from Win32_Process where Name='" & name & "'"
  Set colProcs = svc.ExecQuery(q)
  IsProcessRunning = (colProcs.Count > 0)
End Function

Sub RunScan()
  On Error Resume Next
  Log "Triggering npm run scan"
  ' Use cmd to open a window and run the commands so you can see output.
  Dim cmd
  cmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command " & _
        """Set-Location -LiteralPath '" & repoPath & "'; npm run scan"""
  ' Run hidden (0) or normal window (1) - choose 1 so you can see progress
  wsh.Run cmd, 1, False
End Sub

' If VS Code is already running when this script starts, trigger a scan immediately
If IsProcessRunning("Code.exe") Then
  Log "VS Code appears to be running at script start - running scan"
  RunScan
End If

' Watch for new Code.exe process creation and run scan when it occurs
Dim query, watcher
query = "Select * from __InstanceCreationEvent Within 2 Where TargetInstance ISA 'Win32_Process' and TargetInstance.Name = 'Code.exe'"
Set watcher = svc.ExecNotificationQuery(query)
Log "Watcher started - waiting for Code.exe creation events"

Do
  On Error Resume Next
  Dim evt
  Set evt = watcher.NextEvent()
  If Not evt Is Nothing Then
    Log "Detected Code.exe start - running scan"
    RunScan
  End If
Loop
