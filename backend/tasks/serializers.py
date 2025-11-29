"""API serializers for data validation"""
from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model"""
    
    class Meta:
        model = Task
        fields = ['id', 'title', 'due_date', 'estimated_hours', 
                  'importance', 'dependencies', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_importance(self, value):
        """Ensure importance is 1-10"""
        if not 1 <= value <= 10:
            raise serializers.ValidationError(
                "Importance must be between 1 and 10"
            )
        return value

    def validate_estimated_hours(self, value):
        """Ensure positive hours"""
        if value <= 0:
            raise serializers.ValidationError(
                "Estimated hours must be greater than 0"
            )
        return value


class TaskInputSerializer(serializers.Serializer):
    """Serializer for analyzing tasks (no DB required)"""
    
    id = serializers.CharField(required=False, allow_null=True)
    title = serializers.CharField(max_length=200)
    due_date = serializers.DateField()
    estimated_hours = serializers.FloatField(min_value=0.1)
    importance = serializers.IntegerField(min_value=1, max_value=10)
    dependencies = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )


class AnalyzeRequestSerializer(serializers.Serializer):
    """Request body for analyze endpoint"""
    
    tasks = TaskInputSerializer(many=True)
    strategy = serializers.ChoiceField(
        choices=['smart_balance', 'fastest_wins', 'high_impact', 'deadline_driven'],
        default='smart_balance'
    )


class ScoredTaskSerializer(serializers.Serializer):
    """Task with calculated score"""
    
    id = serializers.CharField()
    title = serializers.CharField()
    due_date = serializers.DateField()
    estimated_hours = serializers.FloatField()
    importance = serializers.IntegerField()
    dependencies = serializers.ListField(child=serializers.CharField())
    priority_score = serializers.FloatField()
    breakdown = serializers.DictField()
    explanation = serializers.CharField()