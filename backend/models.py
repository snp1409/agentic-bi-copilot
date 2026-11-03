from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime
from database import Base

class SpotifyTrack(Base):
    __tablename__ = "spotify_tracks"

    id = Column(Integer, primary_key=True, index=True)
    track_name = Column(String(255), nullable=False)
    artist = Column(String(255), nullable=False)
    genre = Column(String(100), nullable=False)
    total_streams = Column(Integer, nullable=False)  # Raw integer count
    popularity_score = Column(Integer, nullable=False)

class SpotifyRevenue(Base):
    __tablename__ = "spotify_revenue"

    id = Column(Integer, primary_key=True, index=True)
    plan_type = Column(String(100), nullable=False) # e.g., Premium Individual, Family Plan, Ad-Supported
    region = Column(String(100), nullable=False)    # e.g., North America, Europe, Asia Pacific
    monthly_revenue = Column(Float, nullable=False)  # Financial metric ($)
    subscriber_count = Column(Integer, nullable=False)

class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True)
    sender = Column(String(20))
    message_content = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)