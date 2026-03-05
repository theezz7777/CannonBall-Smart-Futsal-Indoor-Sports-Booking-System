@echo off
echo ================================
echo  Starting CannonBall Backend...
echo ================================
cd /d "%~dp0"
call venv\Scripts\activate
echo Venv activated!
python app.py
pause