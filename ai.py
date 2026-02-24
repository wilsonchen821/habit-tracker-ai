import json
import httpx
from typing import List, Dict, Any

class GLMClient:
    """GLM API client for habit insights."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://open.bigmodel.cn/api/anthropic/v1/messages"

    async def get_habit_insights(self, habit_data: Dict[str, Any]) -> str:
        """Generate AI insights from habit data."""
        prompt = self._build_insight_prompt(habit_data)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": "glm-4.7",
                        "max_tokens": 1000,
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ]
                    }
                )

                if response.status_code == 200:
                    result = response.json()
                    return result.get("content", [{}])[0].get("text", "No insights generated")
                else:
                    print(f"GLM API error: {response.status_code} - {response.text}")
                    return "Unable to generate insights at this time."

        except Exception as e:
            print(f"Error calling GLM API: {e}")
            return "Unable to generate insights at this time."

    def _build_insight_prompt(self, habit_data: Dict[str, Any]) -> str:
        """Build the prompt for AI analysis."""
        habits = habit_data.get("habits", [])
        stats = habit_data.get("stats", {})
        logs = habit_data.get("logs", [])
        streaks = habit_data.get("streaks", [])
        weekly_goals = habit_data.get("weekly_goals", [])

        prompt = """You are a helpful habit coach. Analyze the user's habit tracking data and provide personalized insights.

DATA:
"""

        # Add habit names
        if habits:
            habit_names = ", ".join([h["name"] for h in habits])
            prompt += f"\nActive habits: {habit_names}\n"

        # Add overall stats
        if stats:
            prompt += f"\nOverall completion rate: {stats.get('completion_rate', 0)}%\n"
            prompt += f"Total logged activities: {stats.get('total_logs', 0)}\n"
            prompt += f"Completed activities: {stats.get('completed', 0)}\n"

        # Add streaks
        if streaks:
            prompt += "\nCurrent streaks:\n"
            for s in streaks:
                if s.get("current_streak", 0) > 0:
                    prompt += f"- {s['name']}: {s['current_streak']} days\n"

        # Add recent activity patterns
        if logs:
            prompt += "\nRecent activity patterns:\n"
            for log in logs[:10]:  # Last 10 activities
                date = log.get("date", "")
                habit = log.get("habit_name", "Unknown")
                completed = "✓" if log.get("completed") else "✗"
                prompt += f"- {date}: {completed} {habit}\n"

        # Add weekly goals
        if weekly_goals:
            prompt += "\nWeekly goals:\n"
            for goal in weekly_goals:
                habit_name = goal.get("habit_name", "Unknown")
                goal_date = goal.get("goal_date", "")
                target = goal.get("target", 0)
                completed = goal.get("completed", 0)
                achieved = "✓" if goal.get("achieved") else "✗"
                prompt += f"- {goal_date}: {achieved} {habit_name} (Target: {completed}/{target})\n"

        prompt += """
TASK:
Based on this data, provide a concise, actionable analysis. Include:

1. **Strengths**: What patterns show good consistency?
2. **Patterns**: Any noticeable trends (day-of-week, time-based)?
3. **Goal Progress**: How well are you meeting your weekly goals?
4. **Recommendations**: 2-3 specific suggestions to improve goal achievement.
5. **Encouragement**: A brief motivational note.

Keep it friendly, concise, and action-oriented. Avoid generic advice.

Format your response with clear headings and bullet points."""

        return prompt

# Singleton client
_glm_client = None

def get_glm_client() -> GLMClient:
    """Get or create the GLM client singleton."""
    global _glm_client
    if _glm_client is None:
        import os
        api_key = os.getenv("GLM_API_KEY")
        if not api_key:
            # Try to read from config file
            try:
                import json
                with open(os.path.expanduser("~/.claude/config.json"), "r") as f:
                    config = json.load(f)
                    api_key = config.get("providers", {}).get("glm", {}).get("apiKey")
            except:
                pass

        if not api_key:
            raise ValueError("GLM_API_KEY not found in environment or config")

        _glm_client = GLMClient(api_key)
    return _glm_client
