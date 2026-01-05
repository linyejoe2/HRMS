import React, { useState, useMemo } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Box } from '@mui/material';
import { KanbanTask } from '../../services/kanbanService';
import { TaskCard } from './TaskCard';
import { MonthTaskGroup } from './MonthTaskGroup';
import { getMonthKey, isCurrentMonth } from '../../utils/dateUtils';

interface DoneColumnTasksProps {
  tasks: KanbanTask[];
  onEditTask: (task: KanbanTask) => void;
  onDeleteTask: (task: KanbanTask) => void;
}

export const DoneColumnTasks: React.FC<DoneColumnTasksProps> = ({
  tasks,
  onEditTask,
  onDeleteTask
}) => {
  // State to track which month groups are expanded
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  // Group tasks: current month vs all previous months
  const { currentMonthTasks, groupedTasks } = useMemo(() => {
    const current: KanbanTask[] = [];
    const grouped: Record<string, KanbanTask[]> = {};

    tasks.forEach(task => {
      if (isCurrentMonth(task.createdAt)) {
        current.push(task);
      } else {
        const monthKey = getMonthKey(task.createdAt);
        if (!grouped[monthKey]) {
          grouped[monthKey] = [];
        }
        grouped[monthKey].push(task);
      }
    });

    return { currentMonthTasks: current, groupedTasks: grouped };
  }, [tasks]);

  // Handle month group toggle
  const handleToggle = (monthKey: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthKey]: !prev[monthKey]
    }));
  };

  // Sort month keys in descending order (newest first)
  const sortedMonthKeys = useMemo(() => {
    return Object.keys(groupedTasks).sort((a, b) => b.localeCompare(a));
  }, [groupedTasks]);

  return (
    <Box>
      {/* Previous months - grouped and collapsed */}
      {sortedMonthKeys.map(monthKey => (
        <MonthTaskGroup
          key={monthKey}
          monthLabel={monthKey}
          tasks={groupedTasks[monthKey]}
          isExpanded={expandedMonths[monthKey] || false}
          onToggle={() => handleToggle(monthKey)}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />
      ))}

      {/* Current month tasks - shown individually at the bottom */}
      {currentMonthTasks.length > 0 && (
        <SortableContext
          items={currentMonthTasks.map(t => t._id)}
          strategy={verticalListSortingStrategy}
        >
          {currentMonthTasks.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>
      )}
    </Box>
  );
};
