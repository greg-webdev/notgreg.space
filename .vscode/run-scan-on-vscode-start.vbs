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
  Log "Triggering npm run scan (hidden)"
  ' Run the scan hidden and append output to the monitor log so this runs in background
  Dim cmd
  cmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command " & _
        """Set-Location -LiteralPath '" & repoPath & "'; npm run scan *> '" & repoPath & "\actions\monitor-run.log'"""
  ' Run hidden (0) and do not wait for completion
  wsh.Run cmd, 0, False
End Sub

Sub RunServer()
  On Error Resume Next
  Log "Ensuring monitor server is running (background)"
  Dim q, colProcs
  q = "Select * from Win32_Process where CommandLine like '%monitor-server.js%'"
  Set colProcs = svc.ExecQuery(q)
  If colProcs.Count = 0 Then
    Log "Starting monitor server (background)"
    Dim srvCmd
    srvCmd = "powershell -NoProfile -ExecutionPolicy Bypass -Command " & _
             """Set-Location -LiteralPath '" & repoPath & "'; npm run serve-monitor *> '" & repoPath & "\actions\monitor-run.log'"""
    wsh.Run srvCmd, 0, False
  Else
    Log "Monitor server already running"
  End If
End Sub

' If VS Code is already running when this script starts, trigger a scan immediately
If IsProcessRunning("Code.exe") Then
  Log "VS Code appears to be running at script start - running scan"
  RunScan
End If

' Polling loop: run scan on Code.exe start and every 10 minutes
Log "Watcher started - polling for VS Code launch and periodic scans every 10 minutes"
' Start the monitor server in the background if it isn't already running
RunServer
Dim prevRunning
prevRunning = IsProcessRunning("Code.exe")
If prevRunning Then
  Log "VS Code was running at script start"
End If
Dim lastScan
lastScan = Now
' Run an initial scan immediately so the report is fresh
RunScan
lastScan = Now

Do
  On Error Resume Next
  ' detect Code.exe start (edge: previously running -> newly running)
  Dim currentlyRunning
  currentlyRunning = IsProcessRunning("Code.exe")
  If currentlyRunning And Not prevRunning Then
    Log "Detected Code.exe start - running scan"
    RunScan
    lastScan = Now
  End If
  prevRunning = currentlyRunning

  ' periodic scan every 10 minutes (600 seconds)
  Dim elapsedMinutes
  elapsedMinutes = DateDiff("n", lastScan, Now)
  If elapsedMinutes >= 10 Then
    Log "Periodic scan (10 minutes) - running scan"
    RunScan
    lastScan = Now
  End If

  ' sleep briefly to reduce CPU usage (20 seconds)
  WScript.Sleep 20000
Loop
