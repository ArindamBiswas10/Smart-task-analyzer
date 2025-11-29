"""Core priority scoring algorithm"""
from datetime import datetime, date
from typing import List, Dict, Any


class TaskScorer:
    """Handles task priority scoring"""
    
    # Define strategy weights
    STRATEGY_WEIGHTS = {
        'smart_balance': {
            'urgency': 0.35,
            'importance': 0.30,
            'effort': 0.15,
            'dependency': 0.20
        },
        'fastest_wins': {
            'urgency': 0.20,
            'importance': 0.20,
            'effort': 0.60,
            'dependency': 0.00
        },
        'high_impact': {
            'urgency': 0.20,
            'importance': 0.70,
            'effort': 0.00,
            'dependency': 0.10
        },
        'deadline_driven': {
            'urgency': 0.70,
            'importance': 0.20,
            'effort': 0.10,
            'dependency': 0.00
        }
    }


    @staticmethod
    def calculate_urgency_score(due_date) -> float:
        """Calculate urgency based on days until due"""
        
        # Convert string to date if needed
        if isinstance(due_date, str):
            due_date = datetime.strptime(due_date, '%Y-%m-%d').date()
        
        today = date.today()
        days_until_due = (due_date - today).days
        
        # Overdue tasks get exponentially higher scores
        if days_until_due < 0:
            return 100 + abs(days_until_due) * 5
        elif days_until_due == 0:
            return 100
        elif days_until_due == 1:
            return 90
        elif days_until_due <= 3:
            return 70
        elif days_until_due <= 7:
            return 50
        elif days_until_due <= 14:
            return 30
        else:
            return max(0, 30 - days_until_due)
        
    @staticmethod
    def calculate_importance_score(importance: int) -> float:
        """Convert 1-10 importance to 0-100 score"""
        return (importance / 10) * 100

    @staticmethod
    def calculate_effort_score(estimated_hours: float) -> float:
        """Lower effort = higher score (quick wins)"""
        return max(0, 100 - (estimated_hours * 8))

    @staticmethod
    def calculate_dependency_score(task_id: Any, all_tasks: List[Dict]) -> float:
        """Score based on how many tasks this blocks"""
        blocking_count = 0
        for task in all_tasks:
            dependencies = task.get('dependencies', [])
            if task_id in dependencies:
                blocking_count += 1
        return blocking_count * 20
    
    @classmethod
    def calculate_priority_score(cls, task: Dict, all_tasks: List[Dict], 
                                 strategy: str = 'smart_balance') -> Dict:
        """Calculate comprehensive priority score"""
        
        # Validate strategy
        if strategy not in cls.STRATEGY_WEIGHTS:
            strategy = 'smart_balance'
        
        weights = cls.STRATEGY_WEIGHTS[strategy]
        
        # Calculate component scores
        urgency = cls.calculate_urgency_score(task['due_date'])
        importance = cls.calculate_importance_score(task['importance'])
        effort = cls.calculate_effort_score(task['estimated_hours'])
        dependency = cls.calculate_dependency_score(task.get('id'), all_tasks)
        
        # Calculate weighted final score
        final_score = (
            urgency * weights['urgency'] +
            importance * weights['importance'] +
            effort * weights['effort'] +
            dependency * weights['dependency']
        )
        
        # Calculate days until due for context
        if isinstance(task['due_date'], str):
            due_date = datetime.strptime(task['due_date'], '%Y-%m-%d').date()
        else:
            due_date = task['due_date']
        days_until_due = (due_date - date.today()).days
        
        return {
            'score': round(final_score, 2),
            'breakdown': {
                'urgency': round(urgency, 2),
                'importance': round(importance, 2),
                'effort': round(effort, 2),
                'dependency': round(dependency, 2),
                'days_until_due': days_until_due
            }
        }
    

    @staticmethod
    def generate_explanation(task: Dict, scoring: Dict, strategy: str) -> str:
        """Generate human-readable explanation"""
        breakdown = scoring['breakdown']
        reasons = []
        
        if breakdown['days_until_due'] < 0:
            reasons.append(f"Overdue by {abs(breakdown['days_until_due'])} days")
        elif breakdown['days_until_due'] <= 1:
            reasons.append("Due very soon")
        
        if task['importance'] >= 8:
            reasons.append("High importance")
        
        if task['estimated_hours'] <= 2:
            reasons.append("Quick win")
        
        if breakdown['dependency'] > 0:
            blocked = int(breakdown['dependency'] / 20)
            reasons.append(f"Blocks {blocked} task(s)")
        
        if not reasons:
            reasons.append("Balanced priority")
        
        return " • ".join(reasons)
    
class DependencyAnalyzer:
    """Handles dependency analysis"""
    
    @staticmethod
    def detect_circular_dependencies(tasks: List[Dict]) -> bool:
        """Detect circular dependencies using DFS"""
        visited = set()
        rec_stack = set()
        
        def has_cycle(task_id: Any, task_dict: Dict) -> bool:
            if task_id in rec_stack:
                return True
            if task_id in visited:
                return False
            
            visited.add(task_id)
            rec_stack.add(task_id)
            
            current_task = task_dict.get(task_id)
            if current_task:
                dependencies = current_task.get('dependencies', [])
                for dep_id in dependencies:
                    if has_cycle(dep_id, task_dict):
                        return True
            
            rec_stack.remove(task_id)
            return False
        
        task_dict = {task['id']: task for task in tasks if 'id' in task}
        
        for task in tasks:
            if 'id' in task and task['id'] not in visited:
                if has_cycle(task['id'], task_dict):
                    return True
        
        return False