import dotenv from 'dotenv';
import app from './app';
import connectDB from './config/database';
import { config } from './config';
import { cronService } from './services';

// Load environment variables
dotenv.config();

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize departments (seed data)

    // Create upload directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync(config.uploadPath)) {
      fs.mkdirSync(config.uploadPath, { recursive: true });
    }

    // Start server
    const server = app.listen(config.port, () => {
      console.log(`🚀 HRMS Server running on port ${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`📊 Health check: http://localhost:${config.port}/api/health`);
      
      if (config.nodeEnv === 'development') {
        console.log(`🗄️  Legacy DB Explorer: http://localhost:${config.port}/db`);
      }
      
      // Start automated attendance file scanning
      cronService.startFileScanning();
      cronService.startAutoCreateAttendance();
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);

      // Stop cron jobs
      cronService.stopFileScanning();

      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();