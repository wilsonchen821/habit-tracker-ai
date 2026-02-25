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

// Day goals modal
const dayGoalsModal = document.getElementById('day-goals-modal');
const dayModalTitle = document.getElementById('day-modal-title');
const dayGoalsList = document.getElementById('day-goals-list');
const addGoalFromDayBtn = document.getElementById('add-goal-from-day');

// My Habits section
const myHabitsSection = document.querySelector('.my-habits-section');
const myHabitsList = document.getElementById('my-habits-list');

// Current week offset (0 = current week)
let weekOffset = 0;
let selectedDate = null;
let habits = [];
let selectedHabit = null;
let isInitialized = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Loaded');
    loadInsights();
    fetchHabits().then(() => {
        renderMyHabits();
        navigateToWeek(0);
        setupEventListeners();
        isInitialized = true;
        console.log('Initialization complete');
    });
});

// Fetch habits
async function fetchHabits() {
    try {
        const response = await fetch(`${API_BASE}/habits`);
        const data = await response.json();
        habits = data.habits || [];
        console.log('Habits loaded:', habits);
    } catch (error) {
        console.error('Error fetching habits:', error);
    }
}

// Render My Habits section
function renderMyHabits() {
    if (!myHabitsList) {
        console.error('My Habits list container not found');
        return;
    }

    myHabitsList.innerHTML = '';

    if (habits.length === 0) {
        myHabitsList.innerHTML = '<div class="empty-state"><p>No habits yet. Add your first habit! 🚀</p></div>';
        return;
    }

    // Get streaks and today's logs
    const streaksMap = {};
    window.streaks && window.streaks.forEach(s => {
        streaksMap[s.id] = s.current_streak;
    });

    const todayLogsMap = {};
    window.todayLogs && Object.keys(window.todayLogs).forEach(habitId => {
        todayLogsMap[habitId] = window.todayLogs[habitId];
    });

    habits.forEach(habit => {
        const habitCard = document.createElement('div');
        habitCard.className = 'habit-card-inline';
        habitCard.style.borderLeft = `4px solid ${habit.color}`;
        habitCard.dataset.habitId = habit.id;

        const streak = streaksMap[habit.id];
        const todayLog = todayLogsMap[habit.id];

        habitCard.innerHTML = `
            <div class="habit-header-inline">
                <span class="habit-name-inline">${habit.name}</span>
                <button class="btn-delete-inline" data-habit-id="${habit.id}">Delete</button>
            </div>
            <div class="habit-streak-inline">
                ${streak && streak > 0 ? `<span class="streak-badge">🔥 ${streak} day streak</span>` : ''}
            </div>
            <div class="habit-status-inline">
                <label class="checkbox">
                    <input type="checkbox" data-habit-id="${habit.id}"
                        ${todayLog && todayLog.completed ? 'checked' : ''}>
                    <span>Completed today</span>
                </label>
            </div>
        `;

        // Add event listener for delete button
        const deleteBtn = habitCard.querySelector('.btn-delete-inline');
        deleteBtn.addEventListener('click', async (e) => {
            const habitId = parseInt(e.target.dataset.habitId);
            if (confirm('Are you sure you want to delete this habit?')) {
                await deleteHabit(habitId);
            }
        });

        // Add event listener for checkbox
        const checkbox = habitCard.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', async (e) => {
            const habitId = parseInt(e.target.dataset.habitId);
            const completed = e.target.checked;
            await logHabit(habitId, completed);
        });

        myHabitsList.appendChild(habitCard);
    });
}

// Event Listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Add habit button
    if (addHabitBtn) {
        addHabitBtn.addEventListener('click', () => {
            console.log('Add habit button clicked');
            addHabitModal.classList.add('active');
        });
    }

    // Add goal button
    if (addGoalBtn) {
        addGoalBtn.addEventListener('click', () => {
            console.log('Add goal button clicked');
            addGoalModal.classList.add('active');
        });
    }

    // Close modals
    modalClose.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
            }
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
    if (addHabitForm) {
        addHabitForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addHabit();
        });
    }

    // Add goal form
    if (addGoalForm) {
        addGoalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await addGoal();
        });
    }

    // Refresh insights
    if (refreshInsightsBtn) {
        refreshInsightsBtn.addEventListener('click', loadInsights);
    }

    // Week navigation
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', () => {
            console.log('Previous week clicked, current offset:', weekOffset);
            weekOffset--;
            navigateToWeek(weekOffset);
        });
    }

    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', () => {
            console.log('Next week clicked, current offset:', weekOffset);
            weekOffset++;
            navigateToWeek(weekOffset);
        });
    }

    // Calendar day clicks
    if (calendarGrid) {
        calendarGrid.addEventListener('click', (e) => {
            const dayCard = e.target.closest('.calendar-day');
            if (dayCard) {
                const dateStr = dayCard.dataset.date;
                console.log('Calendar day clicked:', dateStr);
                openDayGoals(dateStr);
            }
        });
    }

    // Add goal from day modal
    if (addGoalFromDayBtn) {
        addGoalFromDayBtn.addEventListener('click', () => {
            if (selectedDate) {
                console.log('Add goal from day clicked, date:', selectedDate);
                const goalDateInput = document.getElementById('goal-date');
                if (goalDateInput) {
                    goalDateInput.value = selectedDate;
                }
                dayGoalsModal.classList.remove('active');
                addGoalModal.classList.add('active');
            }
        });
    }
}

// Navigate to a specific week
async function navigateToWeek(offset) {
    console.log('Navigate to week, offset:', offset);
    weekOffset = offset;

    const startDate = getWeekStartDate(offset);
    console.log('Week start date:', startDate);
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        weekDates.push(date);
    }

    const endDate = weekDates[6];
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Update week label
    updateWeekLabel(offset, startDate, endDate);

    // Rebuild calendar grid with new dates
    rebuildCalendarGrid(weekDates);

    // Fetch and display goals
    try {
        const response = await fetch(`${API_BASE}/goals?start_date=${startDateStr}&end_date=${endDateStr}`);
        const data = await response.json();
        console.log('Goals loaded:', data.goals);

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
        console.error('Error loading week goals:', error);
    }
}

// Rebuild calendar grid with new dates
function rebuildCalendarGrid(weekDates) {
    console.log('Rebuilding calendar grid for dates:', weekDates);
    calendarGrid.innerHTML = '';
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    weekDates.forEach((date, index) => {
        const dayCard = document.createElement('div');
        dayCard.className = 'calendar-day clickable';
        dayCard.dataset.date = date.toISOString().split('T')[0];

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';

        const dayName = document.createElement('div');
        dayName.className = 'day-name';
        dayName.textContent = dayNames[index];

        const dayDateEl = document.createElement('div');
        dayDateEl.className = 'day-date';
        dayDateEl.textContent = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

        dayHeader.appendChild(dayName);
        dayHeader.appendChild(dayDateEl);

        const dayGoals = document.createElement('div');
        dayGoals.className = 'day-goals';
        dayGoals.id = `day-goals-${date.toISOString().split('T')[0]}`;

        dayCard.appendChild(dayHeader);
        dayCard.appendChild(dayGoals);
        calendarGrid.appendChild(dayCard);
    });
}

// Update week label
function updateWeekLabel(offset, startDate, endDate) {
    const options = { month: 'short', day: 'numeric' };
    const startStr = startDate.toLocaleDateString('en-US', options);
    const endStr = endDate.toLocaleDateString('en-US', options);

    if (offset === 0) {
        weekLabel.textContent = 'This Week';
    } else if (offset === -1) {
        weekLabel.textContent = 'Last Week';
    } else if (offset === 1) {
        weekLabel.textContent = 'Next Week';
    } else {
        weekLabel.textContent = `${startStr} - ${endStr}`;
    }
}

// Get week start date
function getWeekStartDate(offset) {
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Get Monday of the current week
    const currentWeekMonday = new Date(today);
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekMonday.setDate(today.getDate() - daysToMonday);
    
    // Apply week offset
    const targetMonday = new Date(currentWeekMonday);
    targetMonday.setDate(currentWeekMonday.getDate() + (offset * 7));
    
    console.log('Calculated week start date:', targetMonday, 'with offset:', offset);
    return targetMonday;
}

// Open day goals modal
async function openDayGoals(dateStr) {
    selectedDate = dateStr;
    const date = new Date(dateStr);

    // Update modal title
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    dayModalTitle.textContent = date.toLocaleDateString('en-US', options);

    // Load goals for this date
    try {
        const response = await fetch(`${API_BASE}/goals?start_date=${dateStr}&end_date=${dateStr}`);
        const data = await response.json();
        console.log('Day goals loaded:', data.goals);

        // Clear existing goals
        dayGoalsList.innerHTML = '';

        if (data.goals.length === 0) {
            dayGoalsList.innerHTML = '<p class="empty-state">No goals for this day</p>';
        } else {
            // Add goal progress to each goal
            const goalsWithProgress = await Promise.all(data.goals.map(async goal => {
                try {
                    const progressResp = await fetch(`${API_BASE}/goals/${goal.id}/progress`);
                    const progressData = await progressResp.json();
                    return { ...goal, ...progressData };
                } catch {
                    return goal;
                }
            }));

            goalsWithProgress.forEach(goal => {
                const goalCard = createGoalCard(goal, true);
                dayGoalsList.appendChild(goalCard);
            });
        }

        dayGoalsModal.classList.add('active');
    } catch (error) {
        console.error('Error loading day goals:', error);
    }
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
            fetchHabits().then(() => {
                renderMyHabits();
            });
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
            // Update checkbox in My Habits section
            const checkbox = myHabitsList.querySelector(`input[data-habit-id="${habitId}"]`);
            if (checkbox) {
                checkbox.checked = completed;
            }
            
            // Reload page after a short delay to update streaks
            setTimeout(() => {
                location.reload();
            }, 500);
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
            // Reload current week
            navigateToWeek(weekOffset);
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
            // Refresh current view
            if (selectedDate) {
                openDayGoals(selectedDate);
            } else {
                navigateToWeek(weekOffset);
            }
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

function createGoalCard(goal, inModal = false) {
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.style.borderLeft = `3px solid ${goal.habit_color}`;

    const achieved = goal.achieved;
    const progress = (goal.progress || 0) * 100;

    card.innerHTML = `
        <div class="goal-header">
            <span class="goal-name">${goal.habit_name}</span>
            <button class="btn-delete-goal" data-goal-id="${goal.id}">&times;</button>
        </div>
        <div class="goal-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%; background-color: ${goal.habit_color}"></div>
            </div>
            <span class="goal-count">${goal.completed || 0}/${goal.target || 1}</span>
        </div>
        <div class="goal-status ${achieved ? 'achieved' : ''}">
            ${achieved ? '✓ Achieved!' : 'In progress'}
        </div>
    `;

    // Delete goal button handler
    const deleteBtn = card.querySelector('.btn-delete-goal');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteGoal(goal.id));
    }

    return card;
}
