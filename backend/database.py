import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# --- MYSQL CONNECTION SETTINGS ---
# Replace 'your_mysql_password' with your real local MySQL Workbench password!
DB_USER = "root"
DB_PASSWORD = "suryaSQL1234"  
DB_HOST = "127.0.0.1"
DB_PORT = "3306"
DB_NAME = "agentic_bi_db"

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create the SQLAlchemy execution core engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Session factory for handling transactional changes safely
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base template for database model maps
Base = declarative_base()

# Context manager dependency utility to yield a clean database session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()