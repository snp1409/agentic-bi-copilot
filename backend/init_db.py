from database import engine, Base, SessionLocal
from models import SaleRecord, EmployeeRecord
from mock_db import MOCK_SALES, MOCK_EMPLOYEES

def migrate_and_populate():
    print("🚀 Initializing Agentic BI Database Migration...")
    
    # Create tables inside your MySQL instance automatically
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully.")

    db = SessionLocal()
    try:
        # Check if data already exists to prevent duplicate stacking
        if db.query(SaleRecord).count() == 0:
            print("📦 Seeding Sales records into MySQL...")
            for sale in MOCK_SALES:
                record = SaleRecord(
                    product=sale["product"],
                    revenue=float(sale["revenue"]),
                    date=sale.get("date", "2026-06")
                )
                db.add(record)
            db.commit()
            print("🚀 Sales data successfully seeded!")

        if db.query(EmployeeRecord).count() == 0:
            print("📦 Seeding Employee records into MySQL...")
            for emp in MOCK_EMPLOYEES:
                record = EmployeeRecord(
                    name=emp["name"],
                    department=emp["department"],
                    role=emp.get("role", "Engineer")
                )
                db.add(record)
            db.commit()
            print("🚀 Employee data successfully seeded!")

    except Exception as e:
        print(f"❌ Error during database population: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    migrate_and_populate()