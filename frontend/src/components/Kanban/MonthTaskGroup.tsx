import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Paper
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { KanbanTask } from '../../services/kanbanService';
import { TaskCard } from './TaskCard';

interface MonthTaskGroupProps {
  monthLabel: string;
  tasks: KanbanTask[];
  isExpanded: boolean;
  onToggle: () => void;
  onEditTask: (task: KanbanTask) => void;
  onDeleteTask: (task: KanbanTask) => void;
}

export const MonthTaskGroup: React.FC<MonthTaskGroupProps> = ({
  monthLabel,
  tasks,
  isExpanded,
  onToggle,
  onEditTask,
  onDeleteTask
}) => {
  return (
    <Box sx={{ mb: 1 }}>
      {/* Month Header */}
      <Paper
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          backgroundColor: '#f5f5f5',
          '&:hover': {
            backgroundColor: '#eeeeee'
          }
        }}
        onClick={onToggle}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {monthLabel}: {tasks.length} 件
        </Typography>
        <IconButton size="small" sx={{ p: 0 }}>
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Paper>

      {/* Collapsible Task List */}
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Box sx={{ mt: 1 }}>
          <SortableContext
            items={tasks.map(t => t._id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map(task => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            ))}
          </SortableContext>
        </Box>
      </Collapse>
    </Box>
  );
};
