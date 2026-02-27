from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta
import os

from database import (
    init_db, create_habit, get_habits, delete_habit,
    log_habit, get_habit_logs, get_all_logs, get_stats, get_habit_streaks,
    create_goal, get_goals, delete_goal, get_goal_progress, get_weekly_goals
)
from ai import get_ai_client, get_active_provider

# Initialize app
app = FastAPI(title="Habit Tracker AI")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# Models
class HabitCreate(BaseModel):
    name: str
    color: str = "#007bff"

class HabitLog(BaseModel):
    habit_id: int
    completed: bool
    notes: Optional[str] = None
    date: Optional[str] = None  # Allow specific date logging
class GoalCreate(BaseModel):
    habit_id: int
    goal_date: str  # YYYY-MM-DD
    target_count: int = 1
    notes: Optional[str] = None

# Routes
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """Render main dashboard."""
    habits = get_habits()
    streaks = get_habit_streaks()
    stats = get_stats(days=30)
    logs = get_all_logs(days=7)  # Last 7 days

    # Get today's logs
    today = date.today().isoformat()
    today_logs = {log["habit_id"]: log for log in logs if log["date"] == today}

    # Get weekly goals
    weekly_goals = get_weekly_goals()

    # Get calendar data for this week
    today_date = date.today()
    start_of_week = today_date - timedelta(days=today_date.weekday())
    week_dates = [(start_of_week + timedelta(days=i)) for i in range(7)]

    return templates.TemplateResponse("index.html", {
        "request": request,
        "habits": habits,
        "streaks": streaks,
        "stats": stats,
        "logs": logs,
        "today_logs": today_logs,
        "today": today,
        "weekly_goals": weekly_goals,
        "week_dates": week_dates
    })

# API Routes - Habits
@app.post("/api/habits")
async def create_habit_endpoint(habit: HabitCreate):
    """Create a new habit."""
    habit_id = create_habit(habit.name, habit.color)
    return {"id": habit_id, "name": habit.name, "color": habit.color}

@app.get("/api/habits")
async def get_habits_endpoint():
    """Get all habits."""
    return {"habits": get_habits()}

@app.delete("/api/habits/{habit_id}")
async def delete_habit_endpoint(habit_id: int):
    """Delete a habit."""
    success = delete_habit(habit_id)
    if not success:
        raise HTTPException(status_code=404, detail="Habit not found")
    return {"success": True}

# API Routes - Logs
@app.post("/api/logs")
async def log_habit_endpoint(log: HabitLog):
    """Log a habit completion."""
    log_habit(log.habit_id, log.completed, log.notes)
    return {"success": True}

@app.get("/api/habits/{habit_id}/logs")
async def get_habit_logs_endpoint(habit_id: int, days: int = 30):
    """Get habit logs."""
    return {"logs": get_habit_logs(habit_id, days)}

# API Routes - Goals (NEW)
@app.post("/api/goals")
async def create_goal_endpoint(goal: GoalCreate):
    """Create a new goal."""
    goal_id = create_goal(goal.habit_id, goal.goal_date, goal.target_count, goal.notes)
    return {"id": goal_id, "message": "Goal created successfully"}

@app.get("/api/goals")
async def get_goals_endpoint(habit_id: Optional[int] = None, start_date: Optional[str] = None, end_date: Optional[str] = None):
    """Get goals, optionally filtered."""
    return {"goals": get_goals(habit_id, start_date, end_date)}

@app.get("/api/goals/weekly")
async def get_weekly_goals_endpoint():
    """Get goals for current week."""
    return {"goals": get_weekly_goals()}

@app.get("/api/goals/{goal_id}/progress")
async def get_goal_progress_endpoint(goal_id: int):
    """Get progress for a specific goal."""
    progress = get_goal_progress(goal_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Goal not found")
    return progress

@app.delete("/api/goals/{goal_id}")
async def delete_goal_endpoint(goal_id: int):
    """Delete a goal."""
    success = delete_goal(goal_id)
    if not success:
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"success": True}

# API Routes - Stats & Insights
@app.get("/api/stats")
async def get_stats_endpoint(habit_id: Optional[int] = None, days: int = 30):
    """Get statistics."""
    return get_stats(habit_id, days)

@app.get("/api/streaks")
async def get_streaks_endpoint():
    """Get current streaks."""
    return {"streaks": get_habit_streaks()}

@app.get("/api/insights")
async def get_insights_endpoint():
    """Get AI-powered insights."""
    try:
        client = get_glm_client()

        # Gather data for AI analysis
        habit_data = {
            "habits": get_habits(),
            "stats": get_stats(days=30),
            "logs": get_all_logs(days=30),
            "streaks": get_habit_streaks(),
            "weekly_goals": get_weekly_goals()
        }

        insights = await client.get_habit_insights(habit_data)
        return {"insights": insights}
    except Exception as e:
        return {
            "insights": "Unable to generate insights. Please check your API configuration.",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
