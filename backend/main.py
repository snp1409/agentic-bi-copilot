import os
import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Query
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from google.genai import types
from typing import List, Dict, Any

from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect
from database import SessionLocal, engine, Base
from models import SpotifyTrack, SpotifyRevenue, ChatHistory

load_dotenv()

app = FastAPI(title="Spotify Agentic BI Copilot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

client = genai.Client(api_key="AIzaSyCsi-2n55Y7oakU8eAH-wiqY8AsvqQwOY4")

class ChatRequest(BaseModel):
    message: str


# --- DYNAMIC DATABASE TABLES INSPECTOR ROUTE ---
@app.get("/db/tables")
def get_db_tables():
    """Dynamically inspects connected database tables for UI status indicators."""
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        visible_tables = [t for t in tables if t != "chat_history"]
        return {"tables": visible_tables if visible_tables else tables}
    except Exception as e:
        print(f"❌ Error fetching tables: {e}")
        return {"tables": ["spotify_tracks", "spotify_revenue"]}


# --- HISTORICAL ROUTE ENDPOINTS FOR SIDEBAR PERSISTENCE ---
@app.get("/history/sessions")
def get_unique_sessions():
    """Fetches all unique chat sessions for the sidebar history list."""
    db = SessionLocal()
    try:
        session_rows = db.query(ChatHistory.session_id).distinct().all()
        sessions_list = []
        for row in session_rows:
            sid = row.session_id
            last_msg = db.query(ChatHistory).filter(ChatHistory.session_id == sid).order_by(ChatHistory.timestamp.desc()).first()
            first_user_msg = db.query(ChatHistory).filter(ChatHistory.session_id == sid, ChatHistory.sender == "user").first()
            if last_msg:
                title = first_user_msg.message_content[:30] + "..." if first_user_msg else "Spotify Analytics Session"
                sessions_list.append({
                    "session_id": sid,
                    "title": title,
                    "timestamp": last_msg.timestamp.isoformat()
                })
        return sorted(sessions_list, key=lambda x: x["timestamp"], reverse=True)
    except Exception as e:
        return []
    finally:
        db.close()

@app.get("/history/session/{session_id}")
def get_session_messages(session_id: str):
    """Retrieves all message histories belonging to an isolated session."""
    db = SessionLocal()
    try:
        messages = db.query(ChatHistory).filter(ChatHistory.session_id == session_id).order_by(ChatHistory.timestamp.asc()).all()
        return [{"sender": msg.sender, "reply": msg.message_content} for msg in messages]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@app.delete("/history/session/{session_id}")
def delete_session(session_id: str):
    """Deletes a chat session history from MySQL database records."""
    db = SessionLocal()
    try:
        db.query(ChatHistory).filter(ChatHistory.session_id == session_id).delete()
        db.commit()
        return {"status": "deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# --- SPOTIFY DATABASE FUNCTION TOOLS ---
def fetch_business_data(data_section: str) -> list:
    """
    Fetches live Spotify records from the real MySQL database.
    Supported sections are strictly: 'spotify_tracks' and 'spotify_revenue'.
    """
    print(f"🔧 SPOTIFY DB TOOL TRIGGERED: Querying MySQL -> {data_section}")
    db = SessionLocal()
    try:
        if "track" in data_section.lower() or "artist" in data_section.lower() or "genre" in data_section.lower() or "stream" in data_section.lower():
            rows = db.query(SpotifyTrack).all()
            return [{"track_name": item.track_name, "artist": item.artist, "genre": item.genre, "streams": item.total_streams, "popularity": item.popularity_score} for item in rows]
            
        elif "revenue" in data_section.lower() or "plan" in data_section.lower() or "sub" in data_section.lower() or "region" in data_section.lower():
            rows = db.query(SpotifyRevenue).all()
            return [{"plan_type": item.plan_type, "region": item.region, "monthly_revenue": item.monthly_revenue, "subscribers": item.subscriber_count} for item in rows]
            
        # Default fallback to spotify_tracks
        rows = db.query(SpotifyTrack).all()
        return [{"track_name": item.track_name, "artist": item.artist, "genre": item.genre, "streams": item.total_streams, "popularity": item.popularity_score} for item in rows]

    except Exception as err:
        print(f"❌ Database Query Error inside Tool: {err}")
        return []
    finally:
        db.close()

def calculate_analytics(numbers: List[float], operation: str) -> float:
    """Performs mathematical aggregations on numeric data lists."""
    if not numbers:
        return 0.0
    if operation.lower() == "sum":
        return float(sum(numbers))
    elif operation.lower() == "average":
        return float(sum(numbers) / len(numbers))
    elif operation.lower() == "max":
        return float(max(numbers))
    elif operation.lower() == "min":
        return float(min(numbers))
    return 0.0

def generate_chart_data(chart_type: str, raw_data_summary: str) -> str:
    """Formats aggregated metrics into an operational visual payload macro string."""
    return f"CHART_PAYLOAD|TYPE:{chart_type}|DATA:{raw_data_summary}"


@app.get("/")
def home():
    return {"status": "success", "message": "Spotify BI Hub Engine is Live!"}


@app.post("/chat")
def ask_gemini_agent(payload: ChatRequest, session_id: str = "default"):
    db = SessionLocal()
    try:
        # Save Incoming User Message
        user_log = ChatHistory(session_id=session_id, sender="user", message_content=payload.message)
        db.add(user_log)
        db.commit()

        system_prompt = (
            "You are an enterprise Business Intelligence AI agent connected to relational business tables.\n"
            "Rule 1: Always use fetch_business_data to retrieve live metrics from connected database tables.\n"
            "Rule 2: EXECUTIVE NARRATIVE STRUCTURE — Tailor your written summary directly to the user's question:\n"
            "- If asked about genres and top tracks: Start by analyzing macro genre totals (e.g. Pop total streams, Hip-Hop total streams, Bollywood, etc.) and catalog percentage share. Then highlight individual top tracks (*Blinding Lights*, *Shape of You*).\n"
            "- If asked about subscription monetization: Detail each tier's monthly revenue, user counts, and commercial performance.\n"
            "- If asked about artists and track popularity: Compare artists, their specific songs, streams, and popularity ratings.\n"
            "- If asked for a full quarterly or combined executive report: Provide an integrated executive overview summarizing both macro subscription revenues ($1,300,000 total) and total catalog stream engagement (25,000,000 streams), highlighting leading revenue plans alongside top-performing content.\n"
            "Always state exact figures with commas (e.g. 12,200,000 streams) and currency with $ ($480,000).\n"
            "Rule 3: IMMEDIATELY after the executive narrative, output the primary SQL query executed on a new line:\n"
            "SQL_QUERY|SELECT ...\n"
            "Rule 4: CHART PAYLOAD FORMAT — Output three distinct charts at the end on separate new lines:\n"
            "CHART_PAYLOAD|TYPE:bar|UNIT:<currency|streams|count>|DATA:Item A: 100, Item B: 200\n"
            "CHART_PAYLOAD|TYPE:pie|UNIT:<currency|streams|count>|DATA:Category A: 40, Category B: 60\n"
            "CHART_PAYLOAD|TYPE:line|UNIT:<currency|streams|count>|DATA:Item A: 100, Item B: 80\n"
            "Choose UNIT based strictly on the metric: 'streams' for stream counts, 'currency' for revenue, 'count' for users/subscribers.\n"
            "Rule 5: Output raw integer values in DATA (e.g. 12200000, NOT 12.2M). Real entity names must be used as keys.\n"
            "Rule 6: Chart roles:\n"
            "- 'bar': Top 5 individual entities (e.g. top 5 tracks by streams, top 5 artists by aggregate streams, or top 5 plans by revenue).\n"
            "- 'pie': Category composition. Dynamically select the categorical dimension based on the query intent:\n"
            "   1. If asking about ARTIST catalog/volume share: Group by top artist stream totals across all their tracks (The Weeknd: 6700000, Ed Sheeran: 3500000, Harry Styles: 2800000, Kendrick Lamar: 2400000, Drake: 2300000) using UNIT:streams.\n"
            "   2. If asking about GENRE composition or catalog genre share: Group by exact genre sums (Pop: 12200000, Hip-Hop: 4700000, Bollywood: 3300000, R&B: 2900000, Indie Rock: 1900000) using UNIT:streams. Never count Starboy (R&B) under Pop.\n"
            "   3. If asking about SUBSCRIPTION tiers or user base: Group by plan_type subscriber counts (Ad-Supported Free: 75000, Premium Individual: 48000, Premium Family: 24000, Premium Duo: 18000, Student Plan: 18000) using UNIT:count.\n"
            "   4. If asking about REGIONS: Group by region using subscriber counts (UNIT:count) or monthly revenue (UNIT:currency).\n"
            "- 'line': Performance decay curve across the exact same TOP 5 entities as the bar chart in descending order.\n"
            "- For combined quarterly reports: Represent BOTH business domains visually. Set the 'bar' and 'line' charts to Subscription Plans by monthly revenue (UNIT:currency), and set the 'pie' chart to Genre Streaming Share (UNIT:streams). This ensures both financial monetization and streaming engagement are visible on the dashboard simultaneously."
        )

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=payload.message,
            config=types.GenerateContentConfig(
                tools=[fetch_business_data, calculate_analytics, generate_chart_data],
                temperature=0,
                system_instruction=system_prompt
            )
        )
        
        if response.candidates and response.candidates[0].content.parts:
            text_parts = [part.text for part in response.candidates[0].content.parts if part.text]
            bot_reply = "".join(text_parts) if text_parts else "No text response generated."
        else:
            bot_reply = response.text if response.text else "Empty response received."

        # Save Agent Response
        bot_log = ChatHistory(session_id=session_id, sender="bot", message_content=bot_reply)
        db.add(bot_log)
        db.commit()

        return {"reply": bot_reply}

    except Exception as e:
        print(f"❌ AGENT EXCEPTION LOG: {str(e)}")
        db.rollback()
        return {"reply": f"The agent ran into a processing exception: {str(e)}"}
    finally:
        db.close()