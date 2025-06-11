@echo off
echo ===================================
echo Deploying Proxy Service Fixes
echo ===================================
echo.

REM Check if we're in the project root
if not exist "supabase\functions\proxy-service" (
    echo Error: Please run this script from the project root directory
    exit /b 1
)

REM Navigate to supabase directory
cd supabase

echo Deploying proxy-service edge function...
call supabase functions deploy proxy-service

if %errorlevel% equ 0 (
    echo.
    echo ===================================
    echo Deployment Successful!
    echo ===================================
    echo.
    echo The proxy service has been updated with:
    echo - Enhanced CSP headers for script execution
    echo - Improved CORS configuration
    echo - HTML modification for better compatibility
    echo - Helper scripts for URL resolution
    echo.
    echo Next steps:
    echo 1. Test the proxy with a simple website like https://wikipedia.org
    echo 2. Check the browser console for any remaining errors
    echo 3. Monitor the Edge Function logs in your Supabase dashboard
    echo.
) else (
    echo.
    echo ===================================
    echo Deployment Failed!
    echo ===================================
    echo Please check:
    echo 1. You are logged in to Supabase CLI (supabase login)
    echo 2. Your Supabase project is properly linked (supabase link)
    echo 3. You have the necessary permissions
    echo.
)

REM Return to project root
cd ..

pause 