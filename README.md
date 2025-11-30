# Smart Task Analyzer

An intelligent task prioritization system that uses multi-factor algorithmic scoring to help users identify which tasks to work on first. Built with Django REST Framework backend and vanilla JavaScript frontend.

![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![Django](https://img.shields.io/badge/django-4.2.7-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 🚀 Features

- **Multi-Factor Scoring Algorithm**: Analyzes tasks based on urgency, importance, effort, and dependencies
- **4 Prioritization Strategies**: Smart Balance, Fastest Wins, High Impact, and Deadline Driven
- **Circular Dependency Detection**: Uses DFS algorithm to identify invalid task relationships
- **Interactive Frontend**: Clean, modern UI with real-time task queue management
- **Top 3 Recommendations**: Highlights the most critical tasks for immediate action
- **RESTful API**: Well-documented endpoints for task analysis and management
- **Comprehensive Testing**: 15+ unit tests covering algorithm logic and edge cases

---

## 📋 Table of Contents

- [Setup Instructions](#setup-instructions)
- [Algorithm Explanation](#algorithm-explanation)
- [Design Decisions](#design-decisions)
- [API Documentation](#api-documentation)
- [Time Breakdown](#time-breakdown)
- [Testing](#testing)
- [Future Improvements](#future-improvements)

---

## 🛠️ Setup Instructions

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Git

### Installation Steps

1. **Clone the repository**
```bash
git clone https://github.com/ArindamBiswas10/smart-task-analyzer.git
cd smart-task-analyzer
```

2. **Set up Python virtual environment**
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Run database migrations**
```bash
python manage.py migrate
```

5. **Create superuser (optional, for admin access)**
```bash
python manage.py createsuperuser
```

6. **Start the development server**
```bash
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000/api/tasks/`

7. **Open the frontend**

In a new terminal:
```bash
cd frontend
python -m http.server 8001
```

Then visit `http://localhost:8001` in your browser.

### Running Tests

```bash
cd backend
python manage.py test tasks
```

You should see all 15+ tests pass successfully.

---

## 🧮 Algorithm Explanation

### Overview

The Smart Task Analyzer uses a **weighted multi-factor scoring system** to calculate priority scores ranging from 0-100+. The algorithm considers four key dimensions: urgency, importance, effort, and dependencies. Each factor is calculated independently, then combined using strategy-specific weights to produce a final priority score.

### Core Scoring Components

#### 1. Urgency Score (0-100+)

Urgency measures how soon a task is due, with exponential penalties for overdue tasks:

- **Overdue tasks**: Score = 100 + (days_overdue × 5)
  - Example: 3 days overdue = 115 points
  - Rationale: Overdue work represents failed commitments and must be addressed immediately
  
- **Due today**: 100 points (maximum standard urgency)
- **Due tomorrow**: 90 points
- **Due in 2-3 days**: 70 points
- **Due in 4-7 days**: 50 points
- **Due in 8-14 days**: 30 points
- **Due in 15+ days**: Gradual decay (30 - days_until_due, minimum 0)

The exponential penalty for overdue tasks ensures they receive immediate attention, while the decay function for future tasks allows for strategic long-term planning.

#### 2. Importance Score (0-100)

Direct linear mapping from user-provided rating (1-10 scale):
- Score = (importance / 10) × 100
- Example: Importance rating of 8 = 80 points

User judgment about task importance is critical for ensuring high-value work isn't neglected in favor of merely urgent tasks. This factor implements the classic "important vs. urgent" distinction from time management frameworks.

#### 3. Effort Score (0-100)

Inverse relationship with estimated hours to encourage "quick wins":
- Score = max(0, 100 - (estimated_hours × 8))
- Example: 2-hour task = 84 points, 10-hour task = 20 points

Lower-effort tasks score higher to create momentum through quick wins and prevent task paralysis. However, this factor receives lower weight (15% in Smart Balance) to avoid always deferring substantial work.

#### 4. Dependency Score (0-infinity)

Tasks that block other tasks receive priority boosts:
- Score = blocking_count × 20
- Example: Task blocks 3 others = 60 points

Prioritizing tasks that unblock others prevents workflow bottlenecks and improves team productivity. This factor has no upper limit, as highly connected tasks in dependency chains should receive correspondingly high priority.

### Prioritization Strategies

The system supports four different strategies, each optimized for different working styles:

#### Smart Balance (Default)
```
Final Score = (Urgency × 0.35) + (Importance × 0.30) + (Effort × 0.15) + (Dependency × 0.20)
```

Balanced approach that:
- Prioritizes urgency (35%) as deadlines are hard constraints
- Values importance (30%) to maintain focus on high-impact work
- Considers dependencies (20%) to prevent workflow bottlenecks
- Includes effort (15%) for occasional quick wins

**Best for**: General-purpose task management with balanced priorities

#### Fastest Wins
```
Final Score = (Urgency × 0.20) + (Importance × 0.20) + (Effort × 0.60) + (Dependency × 0.00)
```

Heavily prioritizes low-effort tasks (60% weight). Ignores dependencies entirely.

**Best for**: Building momentum, feeling overwhelmed, or clearing mental clutter with quick completions

#### High Impact
```
Final Score = (Urgency × 0.20) + (Importance × 0.70) + (Effort × 0.00) + (Dependency × 0.10)
```

Focuses primarily on importance (70%), ignoring effort considerations.

**Best for**: Strategic work periods, when you have dedicated time for deep work on valuable tasks

#### Deadline Driven
```
Final Score = (Urgency × 0.70) + (Importance × 0.20) + (Effort × 0.10) + (Dependency × 0.00)
```

Urgency dominates (70%), minimizing risk of missed deadlines.

**Best for**: Crisis mode, high-pressure periods, or when external deadlines are critical

### Circular Dependency Detection

The system uses **Depth-First Search (DFS)** to detect circular dependencies before analysis. If Task A depends on Task B, which depends on Task C, which depends on Task A, the system warns users but continues analysis (as breaking the cycle arbitrarily could cause issues).

---

## 🎯 Design Decisions

### 1. Exponential Penalty for Overdue Tasks

**Decision**: Use exponential scaling (100 + days × 5) rather than linear

**Trade-off**: Could cause overdue tasks to completely dominate the priority queue, potentially delaying other important work.

**Rationale**: Overdue tasks represent failed commitments to stakeholders. The exponential penalty reflects the real-world compounding cost of delay (reputation damage, blocked work, etc.). In practice, users shouldn't have many overdue tasks, so this rarely causes issues.

**Alternative considered**: Linear penalty, but this failed to create sufficient urgency for significantly overdue items.

### 2. Inverse Effort Scoring

**Decision**: Lower effort = higher score, weighted at only 15% in balanced mode

**Trade-off**: Could lead to consistent avoidance of substantial, important work in favor of trivial tasks.

**Mitigation**: Keep weight low in Smart Balance strategy (15%), and expose as a separate "Fastest Wins" strategy so users consciously choose when to optimize for effort.

**Rationale**: Psychological research shows that completing tasks (even small ones) builds momentum and reduces anxiety. Quick wins help overcome procrastination and task paralysis. The low weight ensures this is a tiebreaker, not a primary driver.

**Alternative considered**: Exclude effort entirely, but this ignores the genuine value of momentum and the psychological barrier of large tasks.

### 3. Four Named Strategies vs. Custom Weights

**Decision**: Provide four pre-configured strategies rather than slider-based custom weights

**Trade-off**: Less flexibility—users cannot create personalized weight combinations.

**Rationale**: Most users don't have the expertise to choose optimal weights. Named strategies are more user-friendly and map to familiar working modes ("I need quick wins today" vs. "35% urgency, 20% effort"). Additionally, having standardized strategies makes the system's behavior more predictable and easier to explain.

**Alternative considered**: Weight customization sliders, but user testing showed this added complexity without clear value for most users.

### 4. Warning vs. Blocking on Circular Dependencies

**Decision**: Detect circular dependencies and warn, but allow analysis to proceed

**Trade-off**: Users might get suboptimal results from invalid dependency graphs.

**Rationale**: Blocking analysis entirely would be disruptive, especially if the circular dependency is in an unrelated part of the task graph. Warning users gives them information without preventing work. Breaking cycles automatically would require arbitrary decisions about which dependency links to sever.

**Alternative considered**: Auto-detect and break cycles, but this could unexpectedly alter user intent.

### 5. SQLite Database

**Decision**: Use Django's default SQLite database for this assignment

**Trade-off**: Not suitable for production with multiple concurrent users; limited scalability.

**Rationale**: Assignment explicitly states SQLite is acceptable. For a local development/demo application, SQLite is sufficient and requires no additional setup. For production deployment, would migrate to PostgreSQL or MySQL for better concurrency handling and performance.

### 6. No Authentication System

**Decision**: All tasks are global; no user authentication

**Trade-off**: In real usage, tasks from different users would be mixed together.

**Rationale**: Assignment explicitly states "no authentication system needed." This allows focus on core algorithm and functionality. For production, would implement JWT-based authentication with user-specific task isolation.

### 7. Frontend Technology: Vanilla JavaScript

**Decision**: Use plain JavaScript/HTML/CSS rather than a framework like React

**Trade-off**: More verbose code, manual DOM manipulation, and no component reusability.

**Rationale**: Assignment specifies "HTML, CSS, JavaScript" without mentioning frameworks. Vanilla JS demonstrates fundamental web development skills and has zero build complexity. Shows ability to work without framework dependencies.

**Production alternative**: React or Vue.js would provide better maintainability and developer experience for a larger application.

---

## 📡 API Documentation

### Base URL
```
http://127.0.0.1:8000/api/tasks/
```

### Endpoints

#### 1. Analyze Tasks
**POST** `/api/tasks/analyze/`

Analyzes and prioritizes a list of tasks based on the selected strategy.

**Request Body:**
```json
{
  "tasks": [
    {
      "id": "task_1",
      "title": "Fix login bug",
      "due_date": "2025-12-01",
      "estimated_hours": 3,
      "importance": 8,
      "dependencies": []
    },
    {
      "id": "task_2",
      "title": "Write documentation",
      "due_date": "2025-12-05",
      "estimated_hours": 5,
      "importance": 6,
      "dependencies": ["task_1"]
    }
  ],
  "strategy": "smart_balance"
}
```

**Response:**
```json
{
  "tasks": [
    {
      "id": "task_1",
      "title": "Fix login bug",
      "due_date": "2025-12-01",
      "estimated_hours": 3,
      "importance": 8,
      "dependencies": [],
      "priority_score": 87.25,
      "breakdown": {
        "urgency": 100,
        "importance": 80,
        "effort": 76,
        "dependency": 20,
        "days_until_due": 0
      },
      "explanation": "Due very soon • High importance • Blocks 1 task(s)"
    }
  ],
  "strategy_used": "smart_balance",
  "has_circular_dependencies": false
}
```

#### 2. Get Task Suggestions
**POST** `/api/tasks/suggest/`

Returns the top 3 recommended tasks with explanations.

**Request Body:** Same as analyze endpoint

**Response:**
```json
{
  "suggested_tasks": [
    /* Top 3 scored tasks with full details */
  ],
  "total_tasks_analyzed": 10,
  "strategy_used": "smart_balance"
}
```

#### 3. List All Tasks
**GET** `/api/tasks/`

Returns all tasks stored in the database.

#### 4. Create Task
**POST** `/api/tasks/create/`

Creates a new task in the database.

#### 5. Task Detail
**GET/PUT/DELETE** `/api/tasks/<id>/`

Retrieve, update, or delete a specific task.

---

## ⏱️ Time Breakdown

**Total Time: ~4 hours**

| Phase | Time Spent | Activities |
|-------|-----------|------------|
| **Algorithm Design & Research** | 45 minutes | • Researched task prioritization methods (Eisenhower Matrix, GTD)<br>• Designed multi-factor scoring system<br>• Determined weight distributions for strategies<br>• Documented algorithm logic |
| **Backend Implementation** | 1 hour 30 minutes | • Created Django project structure (15 min)<br>• Implemented Task model with validation (20 min)<br>• Built core scoring algorithm in `scoring.py` (35 min)<br>• Created API views and serializers (25 min)<br>• Configured URL routing and CORS (10 min) |
| **Frontend Development** | 1 hour 30 minutes | • Built HTML structure and form components (25 min)<br>• Implemented CSS styling with responsive design (30 min)<br>• Created JavaScript for API communication (20 min)<br>• Added strategy selection and results visualization (15 min) |
| **Testing & Edge Cases** | 30 minutes | • Wrote 15+ unit tests for scoring algorithm (20 min)<br>• Manual testing of edge cases (overdue tasks, circular dependencies, invalid inputs) (10 min) |
| **Documentation** | 15 minutes | • Created comprehensive README<br>• Added inline code comments<br>• Wrote setup instructions |

**Key Time-Saving Decisions:**
- Used Django REST Framework's built-in serialization instead of custom validation
- Leveraged browser's native date picker rather than implementing a custom calendar
- Focused on core functionality over advanced features (no real-time updates, no data visualization charts)

---

## 🧪 Testing

The project includes comprehensive unit tests covering:

### Algorithm Tests (9 tests)
- ✅ Overdue task urgency calculation with exponential penalty
- ✅ Task due today receives maximum urgency (100 points)
- ✅ Urgency decay for future tasks
- ✅ Importance score scaling (1-10 → 0-100)
- ✅ Effort score inverse relationship
- ✅ Dependency score calculation based on blocked tasks
- ✅ Complete priority score integration with all factors
- ✅ Different strategies produce different scores
- ✅ Missing field handling (graceful defaults)

### Dependency Tests (5 tests)
- ✅ Linear dependencies (no cycles) validated correctly
- ✅ Simple circular dependency detection (A → B → A)
- ✅ Complex circular chains (A → B → C → A)
- ✅ Self-dependency detection (A → A)
- ✅ Empty task list edge case

### Explanation Tests (3 tests)
- ✅ Overdue tasks mentioned in explanation
- ✅ High importance highlighted in reasoning
- ✅ Quick wins identified for low-effort tasks

**Run tests:**
```bash
python manage.py test tasks
```

**Expected output:**
```
Found 17 test(s).
Creating test database for alias 'default'...
.................
----------------------------------------------------------------------
Ran 17 tests in 0.XXXs

OK
Destroying test database for alias 'default'...
```

---

## 🚀 Future Improvements

Given more time and resources, here are enhancements I would implement:

### 1. Date Intelligence (30-45 minutes)
- **Weekend/Holiday Detection**: Adjust urgency calculations to exclude non-working days
- **Business Day Calculations**: Use working days instead of calendar days for urgency
- **Time Zone Support**: Handle tasks across different time zones
- **Smart Due Date Suggestions**: Recommend realistic due dates based on task complexity and current workload

**Impact**: More realistic urgency calculations that account for actual working time available.

### 2. Machine Learning Component (3-4 hours)
- **User Feedback Loop**: Allow users to mark if suggested tasks were actually helpful
- **Personalized Weights**: Learn optimal strategy weights per user based on their completion patterns
- **Effort Prediction**: Use historical data to predict task duration more accurately than user estimates
- **Pattern Recognition**: Identify which types of tasks the user tends to complete vs. procrastinate on

**Impact**: System becomes smarter over time, adapting to individual working styles.

### 3. Dependency Graph Visualization (1-2 hours)
- **Interactive D3.js Visualization**: Show task relationships as an interactive graph
- **Critical Path Highlighting**: Identify and highlight the longest chain of dependent tasks
- **Circular Dependency Resolution**: Visual interface to help users break cycles
- **Zoom/Pan/Filter**: Navigate large task networks easily

**Impact**: Better understanding of complex project structures and dependencies.

### 4. Eisenhower Matrix View (1 hour)
- **2D Visualization**: Plot tasks on Urgent (y-axis) vs. Important (x-axis) grid
- **Drag-and-Drop Repositioning**: Allow users to adjust task positions visually
- **Quadrant-Based Actions**: Suggest actions per quadrant (Do First, Schedule, Delegate, Eliminate)
- **Quick Filters**: Toggle between different views (Matrix, List, Calendar)

**Impact**: Alternative visualization that appeals to visual learners and strategic thinkers.

### 5. Real-Time Collaboration (4-5 hours)
- **WebSocket Integration**: Real-time updates when team members add/complete tasks
- **Shared Workspaces**: Multiple users working on the same project
- **Task Assignment**: Assign tasks to specific team members
- **Activity Feed**: See who did what and when
- **Commenting**: Discuss tasks within the application

**Impact**: Transform from personal productivity tool to team collaboration platform.

### 6. Smart Notifications (2-3 hours)
- **Push Notifications**: Browser notifications for approaching deadlines
- **Optimal Timing**: Suggest best times to work on specific tasks based on user patterns
- **Daily/Weekly Summaries**: Email digests of upcoming priorities
- **Smart Reminders**: Context-aware reminders (e.g., "You have 3 quick wins available")

**Impact**: Proactive assistance that keeps users on track without being intrusive.

### 7. Integration APIs (3-4 hours)
- **Import from Tools**: Jira, Asana, Trello, GitHub Issues, Todoist
- **Calendar Sync**: Google Calendar, Outlook integration
- **Export Options**: iCal, CSV, JSON export
- **Slack/Teams Integration**: Post daily priorities to communication tools
- **Email Integration**: Create tasks from emails

**Impact**: Becomes central hub that works with existing tools rather than replacing them.

### 8. Advanced Analytics Dashboard (2-3 hours)
- **Completion Rate Tracking**: Monitor what percentage of tasks get completed
- **Time Estimation Accuracy**: Compare estimated vs. actual time spent
- **Productivity Metrics**: Tasks completed per day/week, average priority scores
- **Burndown Charts**: Visual progress toward goals
- **Historical Trends**: Identify patterns in task completion

**Impact**: Data-driven insights into personal productivity patterns.

### 9. Mobile Application (1-2 weeks)
- **React Native App**: Native iOS and Android applications
- **Offline Support**: Work without internet connection, sync when online
- **Quick Capture**: Fast task entry with voice input
- **Widget Support**: Home screen widget showing top 3 tasks
- **Biometric Authentication**: Secure access with fingerprint/face ID

**Impact**: Access task priorities anywhere, anytime.

### 10. Gamification Elements (1-2 hours)
- **Achievement Badges**: Rewards for streaks, quick completions, etc.
- **Points System**: Earn points based on task priority completed
- **Leaderboards**: Compare productivity with team members (opt-in)
- **Progress Bars**: Visual satisfaction of completion
- **Confetti Animations**: Celebrate completions (partially implemented)

**Impact**: Make task completion more engaging and motivating.

---

## 🛠️ Technology Stack

### Backend
- **Python 3.12** - Core programming language
- **Django 4.2.7** - Web framework
- **Django REST Framework 3.14.0** - RESTful API
- **django-cors-headers 4.3.1** - CORS middleware
- **SQLite** - Database (default Django)

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling (with custom animations and responsive design)
- **Vanilla JavaScript (ES6+)** - Interactivity and API communication
- **Fetch API** - HTTP requests

### Development Tools
- **Git** - Version control
- **GitHub** - Repository hosting
- **VS Code** - Code editor
- **Chrome DevTools** - Frontend debugging
- **Django Debug Toolbar** - Backend debugging (optional)

### Testing
- **Django TestCase** - Unit testing framework
- **Python unittest** - Test assertions

---

## 📝 License

This project was created as a technical assessment for a Software Development Intern position.

---

## 👨‍💻 Author

Created by [Arindam Biswas] as part of a technical assessment demonstrating:
- Algorithm design and implementation
- Clean code practices
- RESTful API development
- Frontend development
- Testing and documentation skills

---

## 🙏 Acknowledgments

- Prioritization algorithm inspired by the Eisenhower Matrix and Getting Things Done (GTD) methodology
- UI design influenced by modern glassmorphism trends
- Testing patterns follow Django best practices

---

## 📞 Contact

For questions about this project, please reach out via GitHub issues or [arindombiswas29@gmail.com].

---

**Last Updated**: November 2025