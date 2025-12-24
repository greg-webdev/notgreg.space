Run-scan-on-VSCode-start instructions

1) Where the script is

   `.vscode/run-scan-on-vscode-start.vbs` — a script that:
   - Runs a one-off `npm run scan` when it detects VS Code (`Code.exe`) is launched
   - If VS Code is already running when the script starts it will run a scan immediately
   - Logs its runs to `actions/monitor-run.log`

2) Make it autorun when you log in

   - Press Win+R, paste `shell:startup` and press Enter to open your Startup folder
   - Create a shortcut to the `.vscode\run-scan-on-vscode-start.vbs` script in that folder
   - The script will start at login and monitor VS Code launches

3) Run now manually

   - Double-click `.vscode\run-scan-on-vscode-start.vbs` to start the watcher right away

4) Notes

   - The script launches PowerShell to run `npm run scan`; make sure Node/npm are installed and in PATH
   - If you prefer no visible window, change `wsh.Run cmd, 1, False` to `wsh.Run cmd, 0, False` in the VBS (runs hidden)
   - To stop the script, kill `wscript.exe` or `cscript.exe` from Task Manager (it runs as the VBScript host)
