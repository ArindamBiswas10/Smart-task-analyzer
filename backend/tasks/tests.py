"""Comprehensive unit tests for scoring algorithm"""
from django.test import TestCase
from datetime import date, timedelta
from .scoring import TaskScorer, DependencyAnalyzer


class TaskScorerTests(TestCase):
    """Test the scoring algorithm"""
    
    def test_overdue_task_has_highest_urgency(self):
        """Overdue tasks get exponential urgency boost"""
        overdue_date = (date.today() - timedelta(days=5)).isoformat()
        urgency = TaskScorer.calculate_urgency_score(overdue_date)
        
        # Should be 100 + (5 * 5) = 125
        self.assertEqual(urgency, 125)
        self.assertGreater(urgency, 100)
    
    def test_due_today_maximum_urgency(self):
        """Tasks due today get 100 urgency"""
        today = date.today().isoformat()
        urgency = TaskScorer.calculate_urgency_score(today)
        self.assertEqual(urgency, 100)
    
    def test_urgency_decays_for_future_tasks(self):
        """Urgency decreases for tasks further away"""
        tomorrow = (date.today() + timedelta(days=1)).isoformat()
        next_week = (date.today() + timedelta(days=7)).isoformat()
        
        urgency_tomorrow = TaskScorer.calculate_urgency_score(tomorrow)
        urgency_next_week = TaskScorer.calculate_urgency_score(next_week)
        
        self.assertGreater(urgency_tomorrow, urgency_next_week)
    
    def test_importance_scaling(self):
        """Importance scales from 1-10 to 0-100"""
        self.assertEqual(TaskScorer.calculate_importance_score(1), 10)
        self.assertEqual(TaskScorer.calculate_importance_score(5), 50)
        self.assertEqual(TaskScorer.calculate_importance_score(10), 100)
    
    def test_effort_inverse_relationship(self):
        """Lower effort = higher score"""
        low_effort = TaskScorer.calculate_effort_score(1)
        high_effort = TaskScorer.calculate_effort_score(10)
        
        self.assertGreater(low_effort, high_effort)
    
    def test_dependency_scoring(self):
        """Tasks that block others get higher scores"""
        tasks = [
            {'id': 'task_1', 'dependencies': []},
            {'id': 'task_2', 'dependencies': ['task_1']},
            {'id': 'task_3', 'dependencies': ['task_1']},
        ]
        
        # task_1 blocks 2 tasks = 40 points
        score = TaskScorer.calculate_dependency_score('task_1', tasks)
        self.assertEqual(score, 40)
        
        # task_2 blocks nothing = 0 points
        score = TaskScorer.calculate_dependency_score('task_2', tasks)
        self.assertEqual(score, 0)
    
    def test_complete_scoring(self):
        """Full priority score calculation"""
        task = {
            'id': 'task_1',
            'title': 'Test task',
            'due_date': date.today().isoformat(),
            'estimated_hours': 2,
            'importance': 9,
            'dependencies': []
        }
        
        result = TaskScorer.calculate_priority_score(task, [task])
        
        self.assertIn('score', result)
        self.assertIn('breakdown', result)
        self.assertGreater(result['score'], 0)
    
    def test_different_strategies_produce_different_scores(self):
        """Strategies affect final scores"""
        task = {
            'id': 'task_1',
            'title': 'Quick task',
            'due_date': (date.today() + timedelta(days=7)).isoformat(),
            'estimated_hours': 1,
            'importance': 5,
            'dependencies': []
        }
        
        smart = TaskScorer.calculate_priority_score(task, [task], 'smart_balance')
        fastest = TaskScorer.calculate_priority_score(task, [task], 'fastest_wins')
        
        # Fastest wins prioritizes low-effort tasks
        self.assertGreater(fastest['score'], smart['score'])


class DependencyTests(TestCase):
    """Test dependency analysis"""
    
    def test_no_circular_dependencies(self):
        """Linear dependencies are OK"""
        tasks = [
            {'id': 'task_1', 'dependencies': []},
            {'id': 'task_2', 'dependencies': ['task_1']},
            {'id': 'task_3', 'dependencies': ['task_2']},
        ]
        
        has_circular = DependencyAnalyzer.detect_circular_dependencies(tasks)
        self.assertFalse(has_circular)
    
    def test_simple_circular_dependency(self):
        """Detect A -> B -> A cycle"""
        tasks = [
            {'id': 'task_1', 'dependencies': ['task_2']},
            {'id': 'task_2', 'dependencies': ['task_1']},
        ]
        
        has_circular = DependencyAnalyzer.detect_circular_dependencies(tasks)
        self.assertTrue(has_circular)
    
    def test_complex_circular_dependency(self):
        """Detect A -> B -> C -> A cycle"""
        tasks = [
            {'id': 'task_1', 'dependencies': ['task_2']},
            {'id': 'task_2', 'dependencies': ['task_3']},
            {'id': 'task_3', 'dependencies': ['task_1']},
        ]
        
        has_circular = DependencyAnalyzer.detect_circular_dependencies(tasks)
        self.assertTrue(has_circular)
    
    def test_self_dependency(self):
        """Detect task depending on itself"""
        tasks = [
            {'id': 'task_1', 'dependencies': ['task_1']},
        ]
        
        has_circular = DependencyAnalyzer.detect_circular_dependencies(tasks)
        self.assertTrue(has_circular)
    
    def test_empty_task_list(self):
        """Empty list doesn't cause errors"""
        has_circular = DependencyAnalyzer.detect_circular_dependencies([])
        self.assertFalse(has_circular)


class ExplanationTests(TestCase):
    """Test explanation generation"""
    
    def test_overdue_mentioned_in_explanation(self):
        """Overdue tasks mention being overdue"""
        task = {
            'id': 'task_1',
            'title': 'Late task',
            'due_date': (date.today() - timedelta(days=3)).isoformat(),
            'estimated_hours': 5,
            'importance': 7,
            'dependencies': []
        }
        
        scoring = TaskScorer.calculate_priority_score(task, [task])
        explanation = TaskScorer.generate_explanation(task, scoring, 'smart_balance')
        
        self.assertIn('Overdue', explanation)
    
    def test_high_importance_mentioned(self):
        """High importance tasks mention importance"""
        task = {
            'id': 'task_1',
            'title': 'Important',
            'due_date': (date.today() + timedelta(days=10)).isoformat(),
            'estimated_hours': 5,
            'importance': 9,
            'dependencies': []
        }
        
        scoring = TaskScorer.calculate_priority_score(task, [task])
        explanation = TaskScorer.generate_explanation(task, scoring, 'smart_balance')
        
        self.assertIn('importance', explanation.lower())
    
    def test_quick_win_identified(self):
        """Low-effort tasks called quick wins"""
        task = {
            'id': 'task_1',
            'title': 'Quick',
            'due_date': (date.today() + timedelta(days=5)).isoformat(),
            'estimated_hours': 1,
            'importance': 5,
            'dependencies': []
        }
        
        scoring = TaskScorer.calculate_priority_score(task, [task])
        explanation = TaskScorer.generate_explanation(task, scoring, 'smart_balance')
        
        self.assertIn('Quick win', explanation)