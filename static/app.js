// API Base URL
const API_BASE = '/api';

// DOM Elements
const addHabitBtn = document.getElementById('add-habit-btn');
const addHabitModal = document.getElementById('add-habit-modal');
const addHabitForm = document.getElementById('add-habit-form');
const modalClose = document.querySelectorAll('.modal-close');
const refreshInsightsBtn = document.getElementById('refresh-insights');
const insightsBox = document.getElementById('insights');

// Goal-related elements
const addGoalBtn = document.getElementById('add-goal-btn');
const addGoalModal = document.getElementById('add-goal-modal');
const addGoalForm = document.getElementById('add-goal-form');
const calendarGrid = document.getElementById('calendar');
const weekLabel = document.getElementById('week-label');
const prevWeekBtn = document.getElementById('prev-week');
const nextWeekBtn = document.getElementById('next-week');

// Current week offset (0 = current week)
let weekOffset = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadInsights();
    loadWeeklyGoals();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    // Add habit button
    addHabitBtn.addEventListener('click', () => {
        addHabitModal.classList.add('active');
    });

    // Add goal button
    addGoalBtn.addEventListener('click', () => {
        addGoalModal.classList.add('active');
    });

    // Close modals
    modalClose.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });

    // Close modal on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });

    // Add habit form
    addHabitForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addHabit();
    });

    // Add goal form
    addGoalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addGoal();
    });

    // Habit checkboxes
    document.addEventListener('change', async (e) => {
        if (e.target.type === 'checkbox' && e.target.dataset.habitId) {
            const habitId = parseInt(e.target.dataset.habitId);
            const completed = e.target.checked;
            await logHabit(habitId, completed);
        }
    });

    // Delete habit buttons
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const habitId = parseInt(e.target.dataset.habitId);
            if (confirm('Are you sure you want to delete this habit?')) {
                await deleteHabit(habitId);
            }
        }
    });

    // Refresh insights
    refreshInsightsBtn.addEventListener('click', loadInsights);

    // Week navigation
    prevWeekBtn.addEventListener('click', () => {
        weekOffset--;
        updateWeekDisplay();
    });

    nextWeekBtn.addEventListener('click', () => {
        weekOffset++;
        updateWeekDisplay();
    });
}

// API Functions
async function addHabit() {
    const name = document.getElementById('habit-name').value.trim();
    const color = document.getElementById('habit-color').value;

    if (!name) {
        alert('Please enter a habit name');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/habits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
        });

        if (response.ok) {
            addHabitForm.reset();
            addHabitModal.classList.remove('active');
            location.reload();
        } else {
            alert('Failed to add habit');
        }
    } catch (error) {
        console.error('Error adding habit:', error);
        alert('Failed to add habit');
    }
}

async function deleteHabit(habitId) {
    try {
        const response = await fetch(`${API_BASE}/habits/${habitId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            location.reload();
        } else {
            alert('Failed to delete habit');
        }
    } catch (error) {
        console.error('Error deleting habit:', error);
        alert('Failed to delete habit');
    }
}

async function logHabit(habitId, completed) {
    try {
        const response = await fetch(`${API_BASE}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ habit_id: habitId, completed })
        });

        if (response.ok) {
            updateStreakDisplay(habitId);
        } else {
            alert('Failed to log habit');
        }
    } catch (error) {
        console.error('Error logging habit:', error);
        alert('Failed to log habit');
    }
}

async function addGoal() {
    const habitId = parseInt(document.getElementById('goal-habit').value);
    const goalDate = document.getElementById('goal-date').value;
    const targetCount = parseInt(document.getElementById('goal-target').value);
    const notes = document.getElementById('goal-notes').value.trim();

    if (!habitId || !goalDate || !targetCount) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/goals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                habit_id: habitId,
                goal_date: goalDate,
                target_count: targetCount,
                notes: notes
            })
        });

        if (response.ok) {
            addGoalForm.reset();
            addGoalModal.classList.remove('active');
            loadWeeklyGoals();
        } else {
            alert('Failed to add goal');
        }
    } catch (error) {
        console.error('Error adding goal:', error);
        alert('Failed to add goal');
    }
}

async function deleteGoal(goalId) {
    if (!confirm('Are you sure you want to delete this goal?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/goals/${goalId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadWeeklyGoals();
        } else {
            alert('Failed to delete goal');
        }
    } catch (error) {
        console.error('Error deleting goal:', error);
        alert('Failed to delete goal');
    }
}

async function loadInsights() {
    insightsBox.innerHTML = 'Loading insights...';

    try {
        const response = await fetch(`${API_BASE}/insights`);
        const data = await response.json();

        if (data.insights) {
            // Format insights with markdown-like styling
            let formatted = data.insights
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/^- /gm, '• ');

            insightsBox.innerHTML = formatted;
        } else {
            insightsBox.innerHTML = 'Unable to load insights. Please try again.';
        }
    } catch (error) {
        console.error('Error loading insights:', error);
        insightsBox.innerHTML = 'Unable to load insights. Please try again.';
    }
}

async function loadWeeklyGoals() {
    try {
        const response = await fetch(`${API_BASE}/goals/weekly`);
        const data = await response.json();

        // Clear existing goals from calendar
        document.querySelectorAll('.day-goals').forEach(day => {
            day.innerHTML = '';
        });

        // Add goals to calendar
        data.goals.forEach(goal => {
            const dayElement = document.getElementById(`day-goals-${goal.goal_date}`);
            if (dayElement) {
                const goalCard = createGoalCard(goal);
                dayElement.appendChild(goalCard);
            }
        });
    } catch (error) {
        console.error('Error loading weekly goals:', error);
    }
}

function createGoalCard(goal) {
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.style.borderLeft = `3px solid ${goal.habit_color}`;

    const achieved = goal.achieved;
    const progress = goal.progress * 100;

    card.innerHTML = `
        <div class="goal-header">
            <span class="goal-name">${goal.habit_name}</span>
            <button class="btn-delete-goal" data-goal-id="${goal.id}">&times;</button>
        </div>
        <div class="goal-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%; background-color: ${goal.habit_color}"></div>
            </div>
            <span class="goal-count">${goal.completed}/${goal.target}</span>
        </div>
        <div class="goal-status ${achieved ? 'achieved' : ''}">
            ${achieved ? '✓ Achieved!' : 'In progress'}
        </div>
    `;

    // Delete goal button handler
    const deleteBtn = card.querySelector('.btn-delete-goal');
    deleteBtn.addEventListener('click', () => deleteGoal(goal.id));

    return card;
}

function updateStreakDisplay(habitId) {
    // Reload page to update streaks
    setTimeout(() => {
        location.reload();
    }, 500);
}

function updateWeekDisplay() {
    // Calculate week label
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (weekOffset === 0) {
        weekLabel.textContent = 'This Week';
    } else if (weekOffset === -1) {
        weekLabel.textContent = 'Last Week';
    } else if (weekOffset === 1) {
        weekLabel.textContent = 'Next Week';
    } else {
        weekLabel.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    // Reload to get goals for new week
    location.reload();
}
