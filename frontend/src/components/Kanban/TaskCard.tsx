import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Box,
  Tooltip
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Attachment as AttachmentIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { KanbanTask } from '../../services/kanbanService';
import dayjs from 'dayjs';

interface TaskCardProps {
  task: KanbanTask;
  onEdit: (task: KanbanTask) => void;
  onDelete: (task: KanbanTask) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        mb: 2,
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing'
        },
        '&:hover': {
          boxShadow: 3
        }
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {task.title}
        </Typography>

        {task.content && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {task.content}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          {task.files.length > 0 && (
            <Chip
              icon={<AttachmentIcon />}
              label={`${task.files.length} 個檔案`}
              size="small"
              color="default"
            />
          )}

          {task.executor && (
            <Tooltip title={`執行者: ${task.executorName}`}>
              <Chip
                icon={<PersonIcon />}
                label={task.executorName}
                size="small"
                color="primary"
              />
            </Tooltip>
          )}
        </Box>

        <Typography variant="caption" color="text.secondary">
          建立者: {task.authorName} • {dayjs(task.createdAt).format('YYYY/MM/DD HH:mm')}
        </Typography>
      </CardContent>

      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <Tooltip title="編輯">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="刪除">
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task);
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};
