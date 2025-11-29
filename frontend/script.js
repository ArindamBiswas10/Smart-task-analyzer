

let tasks = [];
let analyzedResults = null;
const API_BASE_URL = 'http://127.0.0.1:8000/api/tasks';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Ready!');
    console.log('results-list exists:', !!document.getElementById('results-list'));
    console.log('results-section exists:', !!document.getElementById('results-section'));
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('due_date').value = today;
    
    document.getElementById('importance').addEventListener('input', (e) => {
        document.getElementById('importance-value').textContent = e.target.value;
    });
    
    loadTasksFromStorage();
});



document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadTasksFromStorage();
});

function initializeApp() {
    const today = new Date().toISOString().split('T')[0];
    const dueDateInput = document.getElementById('due_date');
    if (dueDateInput) {
        dueDateInput.value = today;
    }
    
    const importanceSlider = document.getElementById('importance');
    if (importanceSlider) {
        importanceSlider.addEventListener('input', (e) => {
            updateImportanceDisplay(e.target.value);
        });
    }
    
    initConfetti();
}

function updateImportanceDisplay(value) {
    const badge = document.getElementById('importance-value');
    if (!badge) return;
    
    badge.textContent = value;
    const hue = ((value - 1) / 9) * 120;
    badge.style.background = `hsl(${120 - hue}, 70%, 50%)`;
}



function addTask() {
    const titleInput = document.getElementById('title');
    const dueDateInput = document.getElementById('due_date');
    const hoursInput = document.getElementById('estimated_hours');
    const importanceInput = document.getElementById('importance');
    const depsInput = document.getElementById('dependencies');
    
    if (!titleInput || !dueDateInput || !hoursInput || !importanceInput) {
        console.error('Form elements not found');
        return;
    }
    
    const title = titleInput.value.trim();
    const due_date = dueDateInput.value;
    const estimated_hours = parseFloat(hoursInput.value);
    const importance = parseInt(importanceInput.value);
    const dependencies = depsInput ? depsInput.value.split(',').map(d => d.trim()).filter(d => d) : [];
    
    if (!title) {
        showAlert('Please enter a task title', 'error');
        return;
    }
    
    if (!due_date) {
        showAlert('Please select a due date', 'error');
        return;
    }
    
    if (!estimated_hours || estimated_hours <= 0) {
        showAlert('Please enter valid estimated hours (greater than 0)', 'error');
        return;
    }
    
    const task = {
        id: `task_${Date.now()}`,
        title,
        due_date,
        estimated_hours,
        importance,
        dependencies
    };
    
    tasks.push(task);
    updateTaskCount();
    displayTaskQueue();
    clearForm();
    saveTasksToStorage();
    showAlert(`✓ Task "${title}" added successfully!`, 'success');
    
    console.log('Task added:', task);
}

function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1) {
        const taskTitle = tasks[taskIndex].title;
        tasks.splice(taskIndex, 1);
        updateTaskCount();
        displayTaskQueue();
        saveTasksToStorage();
        showAlert(`Task "${taskTitle}" removed`, 'info');
    }
}

function clearAllTasks() {
    if (tasks.length === 0) return;
    
    if (confirm(`Are you sure you want to clear all ${tasks.length} tasks?`)) {
        tasks = [];
        updateTaskCount();
        displayTaskQueue();
        saveTasksToStorage();
        
        const resultsSection = document.getElementById('results-section');
        const topThreeSection = document.getElementById('top-three-section');
        
        if (resultsSection) resultsSection.classList.add('hidden');
        if (topThreeSection) topThreeSection.classList.add('hidden');
        
        showAlert('All tasks cleared', 'info');
    }
}

function bulkAddTasks() {
    const jsonInput = document.getElementById('json-input');
    if (!jsonInput) return;
    
    const jsonText = jsonInput.value.trim();
    
    if (!jsonText) {
        showAlert('Please paste JSON data first', 'error');
        return;
    }
    
    try {
        const parsed = JSON.parse(jsonText);
        const tasksArray = Array.isArray(parsed) ? parsed : [parsed];
        
        let addedCount = 0;
        tasksArray.forEach((task, idx) => {
            if (task.title && task.due_date && task.estimated_hours) {
                tasks.push({
                    id: task.id || `task_${Date.now()}_${idx}`,
                    title: task.title,
                    due_date: task.due_date,
                    estimated_hours: parseFloat(task.estimated_hours),
                    importance: parseInt(task.importance) || 5,
                    dependencies: task.dependencies || []
                });
                addedCount++;
            }
        });
        
        if (addedCount > 0) {
            updateTaskCount();
            displayTaskQueue();
            saveTasksToStorage();
            jsonInput.value = '';
            showAlert(`✓ Successfully imported ${addedCount} task(s)`, 'success');
        } else {
            showAlert('No valid tasks found in JSON', 'warning');
        }
        
        console.log('Bulk tasks added:', addedCount);
    } catch (error) {
        showAlert('Invalid JSON format. Please check your input.', 'error');
        console.error('JSON parse error:', error);
    }
}



async function analyzeTasks() {
    if (tasks.length === 0) {
        showAlert('Please add at least one task to analyze', 'warning');
        return;
    }
    
    const strategyInput = document.querySelector('input[name="strategy"]:checked');
    const strategy = strategyInput ? strategyInput.value : 'smart_balance';
    
    const analyzeBtn = document.querySelector('.btn-analyze');
    const btnText = document.getElementById('analyze-btn-text');
    
    if (analyzeBtn) analyzeBtn.disabled = true;
    if (btnText) {
        btnText.innerHTML = '<span class="loading-spinner"></span> Analyzing...';
    }
    
    const resultsSection = document.getElementById('results-section');
    const resultsList = document.getElementById('results-list');
    if (resultsSection) {
        resultsSection.classList.remove('hidden');
        if (resultsList) {
            resultsList.innerHTML = '<div style="text-align:center;padding:40px;color:#667eea;">Analyzing your tasks...</div>';
        } else {
            const cardBody = resultsSection.querySelector('.card-body');
            if (cardBody) {
                cardBody.innerHTML = '<div id="results-list"><div style="text-align:center;padding:40px;color:#667eea;">Analyzing your tasks...</div></div>';
            }
        }
    }
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        console.log('Sending analysis request:', { tasks: tasks.length, strategy });
        
        const response = await fetch(`${API_BASE_URL}/analyze/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tasks: tasks,
                strategy: strategy
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Response received:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error || errorData.details || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('Analysis results received:', data);
        
        if (!data || !data.tasks) {
            throw new Error('Invalid response format: missing tasks data');
        }
        
        analyzedResults = data;
        
        if (data.has_circular_dependencies) {
            showAlert('⚠️ Warning: Circular dependencies detected in your tasks', 'warning');
        }
        
        displayResults(data.tasks);
        displayTopThree(data.tasks.slice(0, 3));
        
        const analyzedCount = document.getElementById('analyzed-count');
        if (analyzedCount) {
            analyzedCount.textContent = data.tasks.length;
        }
        
        launchConfetti();
        
        showAlert(`✓ Successfully analyzed ${data.tasks.length} tasks using ${formatStrategyName(strategy)}`, 'success');
        
    } catch (error) {
        console.error('Analysis error:', error);
        
        let errorMessage = error.message;
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. The server may be taking too long to respond.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = `Cannot connect to backend server. Make sure it's running at ${API_BASE_URL}`;
        }
        
        showAlert(`Failed to analyze tasks: ${errorMessage}`, 'error');
        
        if (resultsSection) {
            const cardBody = resultsSection.querySelector('.card-body');
            if (cardBody) {
                cardBody.innerHTML = `
                    <div style="text-align:center;padding:40px;color:#ef4444;">
                        <p style="font-size:18px;margin-bottom:10px;">❌ Analysis Failed</p>
                        <p style="color:#6b7280;font-size:14px;">${errorMessage}</p>
                        <p style="color:#6b7280;font-size:12px;margin-top:10px;">Check the browser console for more details.</p>
                    </div>
                `;
            }
        }
    } finally {
        if (analyzeBtn) analyzeBtn.disabled = false;
        if (btnText) btnText.textContent = 'Analyze Tasks';
    }
}



function displayTaskQueue() {
    const queueSection = document.getElementById('task-queue');
    const queueList = document.getElementById('queue-list');
    
    if (!queueSection || !queueList) return;
    
    if (tasks.length === 0) {
        queueSection.classList.add('hidden');
        return;
    }
    
    queueSection.classList.remove('hidden');
    
    queueList.innerHTML = tasks.map(task => `
        <div class="queue-item">
            <div class="queue-item-info">
                <div class="queue-item-title">${escapeHtml(task.title)}</div>
                <div class="queue-item-meta">
                    Due: ${formatDate(task.due_date)} • 
                    ${task.estimated_hours}h • 
                    Importance: ${task.importance}/10
                </div>
            </div>
            <div class="queue-item-actions">
                <button class="btn-delete" onclick="deleteTask('${task.id}')" title="Delete task">
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function displayResults(scoredTasks) {
    const resultsSection = document.getElementById('results-section');
    const resultsList = document.getElementById('results-list');
    
    if (!resultsSection || !resultsList) {
        console.error('Results elements not found in HTML');
        return;
    }
    
    if (!scoredTasks || scoredTasks.length === 0) {
        resultsList.innerHTML = '<p style="text-align:center;color:#6b7280;">No tasks to display</p>';
        return;
    }
    
    resultsList.innerHTML = scoredTasks.map((task, idx) => {
        const priorityClass = getPriorityClass(task.priority_score);
        const priorityLabel = getPriorityLabel(task.priority_score);
        
        return `
            <div class="task-card ${priorityClass}">
                <div class="task-header">
                    <div class="task-title-section">
                        <div>
                            <span class="task-rank">#${idx + 1}</span>
                            <span class="task-title">${escapeHtml(task.title)}</span>
                        </div>
                        <div class="task-explanation">
                            ${escapeHtml(task.explanation)}
                        </div>
                    </div>
                    <div class="task-score-section">
                        <div class="task-score">${Math.round(task.priority_score)}</div>
                        <div class="task-priority-label">${priorityLabel}</div>
                    </div>
                </div>
                
                <div class="task-details">
                    <div class="detail-item">
                        <span class="detail-label">Due Date</span>
                        <span class="detail-value">${formatDate(task.due_date)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Est. Hours</span>
                        <span class="detail-value">${task.estimated_hours}h</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Importance</span>
                        <span class="detail-value">${task.importance}/10</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Time Until Due</span>
                        <span class="detail-value">${formatDaysUntilDue(task.breakdown.days_until_due)}</span>
                    </div>
                </div>
                
                <div class="task-breakdown">
                    📊 Score breakdown: 
                    Urgency ${Math.round(task.breakdown.urgency)} • 
                    Importance ${Math.round(task.breakdown.importance)} • 
                    Effort ${Math.round(task.breakdown.effort)} • 
                    Dependency ${Math.round(task.breakdown.dependency)}
                </div>
            </div>
        `;
    }).join('');
    
    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayTopThree(topTasks) {
    const topThreeSection = document.getElementById('top-three-section');
    const topThreeList = document.getElementById('top-three-list');
    
    if (!topThreeSection || !topThreeList) return;
    
    if (!topTasks || topTasks.length === 0) {
        topThreeSection.classList.add('hidden');
        return;
    }
    
    const medals = ['🥇', '🥈', '🥉'];
    
    topThreeList.innerHTML = topTasks.map((task, idx) => `
        <div class="top-task">
            <div class="top-task-rank">${medals[idx] || idx + 1}</div>
            <div class="top-task-info">
                <div class="top-task-title">${escapeHtml(task.title)}</div>
                <div class="top-task-reason">${escapeHtml(task.explanation)}</div>
            </div>
        </div>
    `).join('');
    
    topThreeSection.classList.remove('hidden');
}



function getPriorityClass(score) {
    if (score >= 80) return 'priority-critical';
    if (score >= 60) return 'priority-high';
    if (score >= 40) return 'priority-medium';
    return 'priority-low';
}

function getPriorityLabel(score) {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        return dateString;
    }
}

function formatDaysUntilDue(days) {
    if (days < 0) {
        return `${Math.abs(days)} days overdue`;
    } else if (days === 0) {
        return 'Today!';
    } else if (days === 1) {
        return 'Tomorrow';
    } else {
        return `${days} days`;
    }
}

function formatStrategyName(strategy) {
    const names = {
        'smart_balance': 'Smart Balance',
        'fastest_wins': 'Fastest Wins',
        'high_impact': 'High Impact',
        'deadline_driven': 'Deadline Driven'
    };
    return names[strategy] || strategy;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateTaskCount() {
    const totalTasks = document.getElementById('total-tasks');
    const taskCount = document.getElementById('task-count');
    
    if (totalTasks) totalTasks.textContent = tasks.length;
    if (taskCount) taskCount.textContent = tasks.length;
}

function clearForm() {
    const titleInput = document.getElementById('title');
    const hoursInput = document.getElementById('estimated_hours');
    const importanceInput = document.getElementById('importance');
    const depsInput = document.getElementById('dependencies');
    
    if (titleInput) titleInput.value = '';
    if (hoursInput) hoursInput.value = '';
    if (importanceInput) {
        importanceInput.value = 5;
        updateImportanceDisplay(5);
    }
    if (depsInput) depsInput.value = '';
}

function showAlert(message, type = 'info') {
    const container = document.getElementById('alert-container');
    if (!container) {
        console.log(`Alert (${type}):`, message);
        return;
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    alert.innerHTML = `
        <span style="font-size:20px">${icons[type] || 'ℹ'}</span>
        <span>${message}</span>
    `;
    
    container.appendChild(alert);
    
    setTimeout(() => {
        alert.style.animation = 'slideOutRight 0.4s ease-out';
        setTimeout(() => alert.remove(), 400);
    }, 5000);
}

function saveTasksToStorage() {
    try {
        localStorage.setItem('smart_task_analyzer_tasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Failed to save tasks to localStorage:', error);
    }
}

function loadTasksFromStorage() {
    try {
        const saved = localStorage.getItem('smart_task_analyzer_tasks');
        if (saved) {
            tasks = JSON.parse(saved);
            updateTaskCount();
            displayTaskQueue();
            console.log('Loaded tasks from storage:', tasks.length);
        }
    } catch (error) {
        console.error('Failed to load tasks from localStorage:', error);
    }
}

function exportResults() {
    if (!analyzedResults) {
        showAlert('No results to export. Please analyze tasks first.', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(analyzedResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `task-analysis-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showAlert('✓ Results exported successfully!', 'success');
}

let confettiCanvas, confettiCtx, confettiParticles;

function initConfetti() {
    confettiCanvas = document.getElementById('confetti-canvas');
    if (!confettiCanvas) {
        console.log('Confetti canvas not found');
        return;
    }
    
    confettiCtx = confettiCanvas.getContext('2d');
    confettiParticles = [];
    
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    
    window.addEventListener('resize', () => {
        if (confettiCanvas) {
            confettiCanvas.width = window.innerWidth;
            confettiCanvas.height = window.innerHeight;
        }
    });
}

function launchConfetti() {
    if (!confettiCanvas || !confettiCtx) return;
    
    const colors = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
    
    for (let i = 0; i < 100; i++) {
        confettiParticles.push({
            x: Math.random() * confettiCanvas.width,
            y: -20,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 2,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            gravity: 0.15
        });
    }
    
    animateConfetti();
}

function animateConfetti() {
    if (!confettiCanvas || !confettiCtx || confettiParticles.length === 0) return;
    
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    confettiParticles = confettiParticles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;
        
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        confettiCtx.restore();
        
        return p.y < confettiCanvas.height;
    });
    
    if (confettiParticles.length > 0) {
        requestAnimationFrame(animateConfetti);
    }
}

document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        addTask();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        analyzeTasks();
    }
});