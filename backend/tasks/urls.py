"""URL routing for tasks app"""
from django.urls import path
from . import views

app_name = 'tasks'

urlpatterns = [
    # Analysis endpoints
    path('analyze/', views.analyze_tasks, name='analyze_tasks'),
    path('suggest/', views.suggest_tasks, name='suggest_tasks'),
    
    # CRUD endpoints
    path('', views.list_tasks, name='list_tasks'),
    path('create/', views.create_task, name='create_task'),
    path('<int:pk>/', views.task_detail, name='task_detail'),
]