import sqlite3
from datetime import datetime, date, timedelta
from typing import List, Dict, Any
import json

# Database setup
DB_PATH = "habits.db"

def init_db():
    """Initialize database with tables."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Habits table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS habits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT DEFAULT '#007bff',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Habit logs table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS habit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            date DATE NOT NULL,
            completed BOOLEAN DEFAULT 0,
            notes TEXT,
            FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE,
            UNIQUE(habit_id, date)
        )
    """)

    # Goals table (NEW)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            goal_date DATE NOT NULL,
            target_count INTEGER DEFAULT 1,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (habit_id) REFERENCES habits (id) ON DELETE CASCADE
        )
    """)

    conn.commit()
    conn.close()

def get_connection():
    """Get a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Habit operations
def create_habit(name: str, color: str = '#007bff') -> int:
    """Create a new habit."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO habits (name, color) VALUES (?, ?)",
        (name, color)
    )
    habit_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return habit_id

def get_habits() -> List[Dict[str, Any]]:
    """Get all habits."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM habits ORDER BY name")
    habits = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return habits

def delete_habit(habit_id: int) -> bool:
    """Delete a habit."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM habits WHERE id = ?", (habit_id,))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

# Habit log operations
def log_habit(habit_id: int, completed: bool, notes: str = None) -> bool:
    """Log a habit completion for today."""
    today = date.today().isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO habit_logs (habit_id, date, completed, notes)
        VALUES (?, ?, ?, ?)
    """, (habit_id, today, completed, notes))
    conn.commit()
    conn.close()
    return True

def get_habit_logs(habit_id: int, days: int = 30) -> List[Dict[str, Any]]:
    """Get habit logs for last N days."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM habit_logs
        WHERE habit_id = ? AND date >= date('now', ?)
        ORDER BY date DESC
    """, (habit_id, f'-{days} days'))
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return logs

def get_all_logs(days: int = 30) -> List[Dict[str, Any]]:
    """Get all habit logs for analysis."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT hl.*, h.name as habit_name, h.color as habit_color
        FROM habit_logs hl
        JOIN habits h ON hl.habit_id = h.id
        WHERE hl.date >= date('now', ?)
        ORDER BY hl.date DESC, h.name
    """, (f'-{days} days',))
    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return logs

# Goal operations (NEW)
def create_goal(habit_id: int, goal_date: str, target_count: int = 1, notes: str = None) -> int:
    """Create a new goal."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO goals (habit_id, goal_date, target_count, notes)
        VALUES (?, ?, ?, ?)
    """, (habit_id, goal_date, target_count, notes))
    goal_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return goal_id

def get_goals(habit_id: int = None, start_date: str = None, end_date: str = None) -> List[Dict[str, Any]]:
    """Get goals, optionally filtered by habit and date range."""
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT g.*, h.name as habit_name, h.color as habit_color
        FROM goals g
        JOIN habits h ON g.habit_id = h.id
        WHERE 1=1
    """
    params = []

    if habit_id:
        query += " AND g.habit_id = ?"
        params.append(habit_id)

    if start_date:
        query += " AND g.goal_date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND g.goal_date <= ?"
        params.append(end_date)

    query += " ORDER BY g.goal_date ASC"

    cursor.execute(query, params)
    goals = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return goals

def delete_goal(goal_id: int) -> bool:
    """Delete a goal."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM goals WHERE id = ?", (goal_id,))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def get_goal_progress(goal_id: int) -> Dict[str, Any]:
    """Get progress towards a goal."""
    conn = get_connection()
    cursor = conn.cursor()

    # Get goal details
    cursor.execute("""
        SELECT g.*, h.name as habit_name
        FROM goals g
        JOIN habits h ON g.habit_id = h.id
        WHERE g.id = ?
    """, (goal_id,))
    goal = dict(cursor.fetchone())

    if not goal:
        return None

    # Count completed logs for this habit on goal date
    cursor.execute("""
        SELECT COUNT(*) as completed_count
        FROM habit_logs
        WHERE habit_id = ? AND date = ?
    """, (goal['habit_id'], goal['goal_date']))

    result = cursor.fetchone()
    completed = result['completed_count'] if result else 0
    target = goal['target_count']
    progress = min(completed / target, 1.0) if target > 0 else 1.0

    conn.close()

    return {
        'goal': goal,
        'completed': completed,
        'target': target,
        'progress': round(progress, 2),
        'achieved': completed >= target
    }

def get_weekly_goals() -> List[Dict[str, Any]]:
    """Get goals for the current week."""
    today = date.today()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT g.*, h.name as habit_name, h.color as habit_color
        FROM goals g
        JOIN habits h ON g.habit_id = h.id
        WHERE g.goal_date >= ? AND g.goal_date <= ?
        ORDER BY g.goal_date ASC
    """, (start_of_week.isoformat(), end_of_week.isoformat()))

    goals = [dict(row) for row in cursor.fetchall()]

    # Add progress to each goal
    for i, goal in enumerate(goals):
        progress = get_goal_progress(goal['id'])
        goals[i]['completed'] = progress['completed']
        goals[i]['target'] = progress['target']
        goals[i]['progress'] = progress['progress']
        goals[i]['achieved'] = progress['achieved']

    conn.close()
    return goals

def get_stats(habit_id: int = None, days: int = 30) -> Dict[str, Any]:
    """Get habit statistics."""
    conn = get_connection()
    cursor = conn.cursor()

    if habit_id:
        cursor.execute("""
            SELECT COUNT(*) as total_logs,
                   SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
                   AVG(CASE WHEN completed = 1 THEN 1.0 ELSE 0.0 END) as completion_rate
            FROM habit_logs
            WHERE habit_id = ? AND date >= date('now', ?)
        """, (habit_id, f'-{days} days'))
    else:
        cursor.execute("""
            SELECT COUNT(*) as total_logs,
                   SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
                   AVG(CASE WHEN completed = 1 THEN 1.0 ELSE 0.0 END) as completion_rate
            FROM habit_logs
            WHERE date >= date('now', ?)
        """, (f'-{days} days',))

    stats = dict(cursor.fetchone())
    conn.close()

    stats['completion_rate'] = round(stats['completion_rate'] or 0, 2)
    return stats

def get_habit_streaks() -> List[Dict[str, Any]]:
    """Get current streaks for all habits."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        WITH ranked_logs AS (
            SELECT
                habit_id,
                date,
                completed,
                ROW_NUMBER() OVER (PARTITION BY habit_id ORDER BY date DESC) as rn
            FROM habit_logs
            WHERE completed = 1
        ),
        streaks AS (
            SELECT
                habit_id,
                COUNT(*) as current_streak
            FROM ranked_logs
            WHERE date = date('now', '-' || (rn - 1) || ' days')
            GROUP BY habit_id
        )
        SELECT
            h.id,
            h.name,
            h.color,
            COALESCE(s.current_streak, 0) as current_streak
        FROM habits h
        LEFT JOIN streaks s ON h.id = s.habit_id
        ORDER BY s.current_streak DESC
    """)

    streaks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return streaks
