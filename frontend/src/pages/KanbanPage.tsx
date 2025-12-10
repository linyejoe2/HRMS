import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Fab
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { kanbanService, KanbanTask, KanbanStatus, GroupedTasks } from '../services/kanbanService';
import { TaskCard } from '../components/Kanban/TaskCard';
import { TaskModal } from '../components/Kanban/TaskModal';

const COLUMNS: { key: KanbanStatus; label: string; color: string }[] = [
  { key: 'Backlog', label: 'Backlog', color: '#9e9e9e' },
  { key: 'To Do', label: 'To Do', color: '#2196f3' },
  { key: 'In Progress', label: 'In Progress', color: '#ff9800' },
  { key: 'Testing', label: 'Testing', color: '#9c27b0' },
  { key: 'Done', label: 'Done', color: '#4caf50' }
];

const DEPRECATED_COLUMN = { key: 'Deprecated' as const, label: 'Deprecated', color: '#f44336' };

// Droppable Column Component
interface DroppableColumnProps {
  id: string;
  children: React.ReactNode;
}

const DroppableColumn: React.FC<DroppableColumnProps> = ({ id, children }) => {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <Box ref={setNodeRef} sx={{ minHeight: '50vh' }}>
      {children}
    </Box>
  );
};

export const KanbanPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const showDeprecated = searchParams.get('deprecated') === 'true';

  const [tasks, setTasks] = useState<GroupedTasks>({});
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await kanbanService.getTasksByStatus(showDeprecated);
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [showDeprecated]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = findTaskById(active.id as string);
    setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      return;
    }

    const taskId = active.id as string;
    const newStatus = over.id as KanbanStatus;

    const task = findTaskById(taskId);

    if (task && task.status !== newStatus) {
      try {
        await kanbanService.moveTask(taskId, newStatus);
        await loadTasks();
      } catch (error) {
        console.error('Error moving task:', error);
        alert('移動任務失敗');
      }
    }

    setActiveTask(null);
  };

  const findTaskById = (id: string): KanbanTask | null => {
    for (const column of Object.values(tasks)) {
      const task = column?.find((t: KanbanTask) => t._id === id);
      if (task) return task;
    }
    return null;
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const handleEditTask = (task: KanbanTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleDeleteTask = async (task: KanbanTask) => {
    if (window.confirm(`確定要刪除任務 "${task.title}" 嗎？`)) {
      try {
        await kanbanService.deleteTask(task._id);
        await loadTasks();
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('刪除任務失敗');
      }
    }
  };

  const handleRestoreTask = async (task: KanbanTask) => {
    if (window.confirm(`確定要復原任務 "${task.title}" 嗎？`)) {
      try {
        await kanbanService.restoreTask(task._id);
        await loadTasks();
      } catch (error) {
        console.error('Error restoring task:', error);
        alert('復原任務失敗');
      }
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleModalSave = () => {
    loadTasks();
  };

  const columns = showDeprecated ? [...COLUMNS, DEPRECATED_COLUMN] : COLUMNS;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          看板管理
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateTask}>
          建立任務
        </Button>
      </Box>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <Grid container spacing={2}>
          {columns.map(column => {
            const columnTasks = tasks[column.key] || [];

            return (
              <Grid item xs={12} sm={6} md={showDeprecated ? 2.4 : 2.4} key={column.key}>
                <Paper
                  sx={{
                    p: 2,
                    minHeight: '70vh',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                      pb: 1,
                      borderBottom: `3px solid ${column.color}`
                    }}
                  >
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      {column.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: column.color, fontWeight: 'bold' }}>
                      {columnTasks.length}
                    </Typography>
                  </Box>

                  <DroppableColumn id={column.key}>
                    <SortableContext items={columnTasks.map((t: KanbanTask) => t._id)} strategy={verticalListSortingStrategy}>
                      {columnTasks.map(task => (
                        <TaskCard
                          key={task._id}
                          task={task}
                          onEdit={column.key === 'Deprecated' ? handleRestoreTask : handleEditTask}
                          onDelete={handleDeleteTask}
                        />
                      ))}
                    </SortableContext>
                  </DroppableColumn>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        <DragOverlay>
          {activeTask ? (
            <Box sx={{ transform: 'rotate(5deg)' }}>
              <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} />
            </Box>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={handleCreateTask}
      >
        <AddIcon />
      </Fab>

      <TaskModal
        open={modalOpen}
        onClose={handleModalClose}
        task={editingTask}
        onSave={handleModalSave}
      />
    </Container>
  );
};
