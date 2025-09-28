#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
cPanel Startup Script
Bu script cPanel'de uygulamanızı başlatmak için kullanılır.
"""

import os
import sys
import logging
from pathlib import Path

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/home/sabrialp/logs/qr_api.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def setup_environment():
    """Setup environment variables and paths"""
    try:
        # Get current directory
        current_dir = Path(__file__).parent.absolute()
        logger.info(f"Current directory: {current_dir}")
        
        # Load environment variables
        from dotenv import load_dotenv
        env_file = current_dir / '.env'
        
        if env_file.exists():
            load_dotenv(env_file)
            logger.info(f"✅ Environment variables loaded from {env_file}")
        else:
            logger.warning(f"⚠️ .env file not found at {env_file}")
            
        # Set environment to production if not set
        if not os.getenv('ENVIRONMENT'):
            os.environ['ENVIRONMENT'] = 'production'
            
        # Log environment info
        logger.info(f"Environment: {os.getenv('ENVIRONMENT')}")
        logger.info(f"Database: {os.getenv('DB_NAME', 'Not set')}")
        logger.info(f"Frontend URL: {os.getenv('FRONTEND_URL', 'Not set')}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error setting up environment: {e}")
        return False

def initialize_database():
    """Initialize database and create tables if needed"""
    try:
        logger.info("🗄️ Initializing database...")
        
        # Import database components
        from database import init_db, engine
        from sqlalchemy import text
        
        # Test database connection
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("✅ Database connection successful")
        
        # Initialize database
        init_db()
        logger.info("✅ Database initialization completed")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Database initialization error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return False

def main():
    """Main startup function"""
    logger.info("🚀 Starting QR Virtual Card Backend...")
    
    # Setup environment
    if not setup_environment():
        logger.error("❌ Environment setup failed")
        sys.exit(1)
    
    # Initialize database
    if not initialize_database():
        logger.error("❌ Database initialization failed")
        sys.exit(1)
    
    logger.info("✅ QR Virtual Card Backend startup completed successfully!")

if __name__ == "__main__":
    main()
