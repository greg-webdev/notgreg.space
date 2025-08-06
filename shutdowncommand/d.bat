@echo off
set /p "choice=Do you want to 'shutdown' or 'msg'? "

if /i "%choice%"=="msg" goto :send_msg
if /i "%choice%"=="shutdown" goto :initiate_shutdown

echo Invalid choice. Please type 'shutdown' or 'msg'.
goto :eof

:send_msg
set /p "username=Enter your username: "
msg %username% hello
goto :eof

:initiate_shutdown
set /p "comment=Enter a comment for the shutdown: "
REM Open a new CMD window and display the command, prompting the user to execute it manually.
start cmd /k "echo. & echo The shutdown command is ready. Press Control+c to copy and Control+v to paste the following command, then press ENTER to execute it: & echo. & echo shutdown -s /t 20 /c "%comment%" /hybrid & echo. & pause"
goto :eof
