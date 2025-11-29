"""API views for task analysis"""
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .serializers import (
    AnalyzeRequestSerializer,
    TaskSerializer
)
from .scoring import TaskScorer, DependencyAnalyzer
from .models import Task


@api_view(['POST'])
def analyze_tasks(request):
    """
    POST /api/tasks/analyze/
    
    Analyze and prioritize tasks based on strategy
    """
    # Validate request
    serializer = AnalyzeRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid request data', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    validated_data = serializer.validated_data
    tasks = validated_data['tasks']
    strategy = validated_data.get('strategy', 'smart_balance')
    
    # Add IDs to tasks without them
    for idx, task in enumerate(tasks):
        if 'id' not in task or task['id'] is None:
            task['id'] = f'task_{idx}'
    
    # Check for circular dependencies
    has_circular = DependencyAnalyzer.detect_circular_dependencies(tasks)
    
    # Calculate scores for all tasks
    scored_tasks = []
    for task in tasks:
        scoring = TaskScorer.calculate_priority_score(task, tasks, strategy)
        explanation = TaskScorer.generate_explanation(task, scoring, strategy)
        
        scored_task = {
            **task,
            'priority_score': scoring['score'],
            'breakdown': scoring['breakdown'],
            'explanation': explanation
        }
        scored_tasks.append(scored_task)
    
    # Sort by score (highest first)
    scored_tasks.sort(key=lambda x: x['priority_score'], reverse=True)
    
    return Response({
        'tasks': scored_tasks,
        'strategy_used': strategy,
        'has_circular_dependencies': has_circular
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
def suggest_tasks(request):
    """
    POST /api/tasks/suggest/
    
    Get top 3 task recommendations
    """
    # Validate request
    serializer = AnalyzeRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'error': 'Invalid request data', 'details': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    validated_data = serializer.validated_data
    tasks = validated_data['tasks']
    strategy = validated_data.get('strategy', 'smart_balance')
    
    # Add IDs to tasks
    for idx, task in enumerate(tasks):
        if 'id' not in task or task['id'] is None:
            task['id'] = f'task_{idx}'
    
    # Calculate scores
    scored_tasks = []
    for task in tasks:
        scoring = TaskScorer.calculate_priority_score(task, tasks, strategy)
        explanation = TaskScorer.generate_explanation(task, scoring, strategy)
        
        scored_task = {
            **task,
            'priority_score': scoring['score'],
            'breakdown': scoring['breakdown'],
            'explanation': explanation
        }
        scored_tasks.append(scored_task)
    
    # Sort and get top 3
    scored_tasks.sort(key=lambda x: x['priority_score'], reverse=True)
    top_three = scored_tasks[:3]
    
    return Response({
        'suggested_tasks': top_three,
        'total_tasks_analyzed': len(tasks),
        'strategy_used': strategy
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def list_tasks(request):
    """GET /api/tasks/ - List all tasks"""
    tasks = Task.objects.all()
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
def create_task(request):
    """POST /api/tasks/create/ - Create new task"""
    serializer = TaskSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'DELETE'])
def task_detail(request, pk):
    """GET/PUT/DELETE /api/tasks/<id>/ - Manage specific task"""
    try:
        task = Task.objects.get(pk=pk)
    except Task.DoesNotExist:
        return Response(
            {'error': 'Task not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = TaskSerializer(task)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = TaskSerializer(task, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)