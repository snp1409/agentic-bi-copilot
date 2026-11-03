from database import SessionLocal, engine, Base
from models import SpotifyTrack, SpotifyRevenue

def seed_database():
    print("🧹 Re-creating database tables for Spotify Analytics...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Real Spotify Top Tracks & Streams Data
        tracks_data = [
            SpotifyTrack(track_name="Blinding Lights", artist="The Weeknd", genre="Pop", total_streams=3800000, popularity_score=95),
            SpotifyTrack(track_name="Shape of You", artist="Ed Sheeran", genre="Pop", total_streams=3500000, popularity_score=92),
            SpotifyTrack(track_name="Starboy", artist="The Weeknd", genre="R&B", total_streams=2900000, popularity_score=90),
            SpotifyTrack(track_name="As It Was", artist="Harry Styles", genre="Pop", total_streams=2800000, popularity_score=91),
            SpotifyTrack(track_name="Not Like Us", artist="Kendrick Lamar", genre="Hip-Hop", total_streams=2400000, popularity_score=94),
            SpotifyTrack(track_name="Cruel Summer", artist="Taylor Swift", genre="Pop", total_streams=2100000, popularity_score=93),
            SpotifyTrack(track_name="GOD'S PLAN", artist="Drake", genre="Hip-Hop", total_streams=2300000, popularity_score=88),
            SpotifyTrack(track_name="Jai Ho", artist="A.R. Rahman", genre="Bollywood", total_streams=1500000, popularity_score=85),
            SpotifyTrack(track_name="Kesariya", artist="Arijit Singh", genre="Bollywood", total_streams=1800000, popularity_score=89),
            SpotifyTrack(track_name="Sweater Weather", artist="The Neighbourhood", genre="Indie Rock", total_streams=1900000, popularity_score=87),
        ]

        # Spotify Regional Revenue & Subscription Tier Data
        revenue_data = [
            SpotifyRevenue(plan_type="Premium Individual", region="North America", monthly_revenue=480000.0, subscriber_count=48000),
            SpotifyRevenue(plan_type="Premium Family", region="Europe", monthly_revenue=360000.0, subscriber_count=24000),
            SpotifyRevenue(plan_type="Premium Duo", region="Asia Pacific", monthly_revenue=220000.0, subscriber_count=18000),
            SpotifyRevenue(plan_type="Ad-Supported Free", region="Latin America", monthly_revenue=150000.0, subscriber_count=75000),
            SpotifyRevenue(plan_type="Student Plan", region="North America", monthly_revenue=90000.0, subscriber_count=18000),
        ]

        db.add_all(tracks_data)
        db.add_all(revenue_data)
        db.commit()
        print("✅ Successfully seeded database with real Spotify Tracks & Revenue records!")

    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()