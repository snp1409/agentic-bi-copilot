from database import engine
from sqlalchemy import text

def drop_old_tables():
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS sales;"))
        conn.execute(text("DROP TABLE IF EXISTS employees;"))
        conn.commit()
    print("✅ Successfully removed legacy 'sales' and 'employees' tables from MySQL!")

if __name__ == "__main__":
    drop_old_tables()