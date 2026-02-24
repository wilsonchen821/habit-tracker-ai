# 🎯 Habit Tracker AI

An intelligent habit tracking application that uses AI to analyze your habits and provide personalized insights.

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-green.svg)
![GLM](https://img.shields.io/badge/AI-GLM_4.7-purple.svg)

## ✨ Features

- **Daily Habit Tracking**: Log your habits daily with simple checkboxes
- **AI-Powered Insights**: Get personalized recommendations based on your habit patterns
- **Streak Tracking**: Monitor your streaks and stay motivated
- **Statistics Dashboard**: View completion rates and overall progress
- **Beautiful UI**: Clean, responsive web interface
- **Local Storage**: All data stored locally in SQLite

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- GLM API key (for AI insights)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/wilsonchen821/habit-tracker-ai.git
cd habit-tracker-ai
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure GLM API key:

Option 1: Set environment variable
```bash
export GLM_API_KEY="your-api-key-here"
```

Option 2: Add to config file (~/.claude/config.json)
```json
{
  "providers": {
    "glm": {
      "apiKey": "your-api-key-here"
    }
  }
}
```

4. Run the application:
```bash
python main.py
```

5. Open your browser and navigate to:
```
http://localhost:8000
```

## 📖 Usage

### Creating Habits

1. Click the "+ Add Habit" button
2. Enter a habit name (e.g., "Exercise", "Read", "Code")
3. Choose a color
4. Click "Add Habit"

### Tracking Habits

- Check the checkbox next to each habit when you complete it
- Your streak will update automatically
- View your recent activity in the dashboard

### AI Insights

- Click "Refresh" to generate new insights
- AI analyzes your:
  - Strengths and patterns
  - Day-of-week trends
  - Personalized recommendations
  - Motivational notes

## 🏗️ Architecture

```
habit-tracker-ai/
├── main.py              # FastAPI application
├── database.py          # SQLite database operations
├── ai.py                # GLM AI integration
├── requirements.txt     # Python dependencies
├── templates/            # HTML templates
│   └── index.html
├── static/              # Static assets
│   ├── style.css
│   └── app.js
└── README.md
```

## 🧠 How It Works

1. **Data Collection**: Habits and completions are stored in SQLite
2. **Pattern Analysis**: AI analyzes your habit data over time
3. **Personalized Insights**: GLM AI generates custom recommendations
4. **Visualization**: Web interface displays statistics and streaks

## 🔧 API Endpoints

### Habits
- `GET /api/habits` - Get all habits
- `POST /api/habits` - Create a new habit
- `DELETE /api/habits/{id}` - Delete a habit

### Logs
- `POST /api/logs` - Log a habit completion
- `GET /api/habits/{id}/logs` - Get habit logs

### Stats & Insights
- `GET /api/stats` - Get statistics
- `GET /api/streaks` - Get current streaks
- `GET /api/insights` - Get AI-powered insights

## 📊 Use Cases

- **Personal Development**: Build consistent daily routines
- **Fitness Tracking**: Monitor workout habits
- **Learning Goals**: Track study sessions and reading
- **Work Habits**: Maintain productivity routines
- **Health Monitoring**: Track medication, diet, or sleep habits

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with [FastAPI](https://fastapi.tiangolo.com/)
- AI powered by [GLM](https://open.bigmodel.cn/)
- Inspired by the need for intelligent habit tracking

---

Made with ❤️ by [Wilson Chen](https://github.com/wilsonchen821)
