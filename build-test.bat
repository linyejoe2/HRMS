docker compose -p hrms-test -f docker-compose-test.yml --env-file .env.test up -d --build

echo.
echo ========================================
echo TEST Environment Started
echo ========================================
echo Date: %date% %time%
echo.
echo Services:
echo - NGINX:    http://localhost:5300
echo - Backend:  http://localhost:5301
echo - Frontend: http://localhost:5302
echo - MongoDB:  localhost:27020
echo.
echo Container Names:
echo - HRMS-db-test
echo - HRMS-backend-test
echo - HRMS-frontend-test
echo - HRMS-nginx-test
echo.
echo ========================================
