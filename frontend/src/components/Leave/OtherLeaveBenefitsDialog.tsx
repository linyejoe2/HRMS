import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface LeaveBenefitSection {
  title: string;
  content: React.ReactNode;
}

// TODO: fill in the real wording for each leave type's entitlement rules.
const leaveBenefitSections: LeaveBenefitSection[] = [
  { title: '婚假', content: '給假八日，可自結婚之日前十日起三個月內請畢。但經公司同意者，得於一年內請畢。' },
  { title: '喪假', content: '1.父母、養父母、繼父母、配偶喪亡者：8日。2.(外)祖父母、子女、配偶之父母、配偶之養父母或繼父母喪亡者：6日。3.(外)曾祖父母、兄弟姐妹、配偶之(外)祖父母喪亡者：3日。' },
  { title: '產假', content: '1.產假8星期（曆日計）。2.妊娠3個月以上流產者，產假4星期。3.妊娠2個月以上未滿3個月流產者，產假1星期。4.妊娠未滿2個月流產者，產假5日。' },
  { title: '陪產假', content: '給假7日。陪產假應於配偶分娩之當日及前後合計15日內請假。' },
  { title: '生理假', content: '每月1日，全年不逾3日不併入病假，其餘併入病假。不須提供證明。' },
  { title: '安胎假', content: '懷孕期間需安胎休養者，併入住院傷病假計算。' },
  { title: '育嬰留職停薪', content: '子女三歲前可申請，最長2年，同時撫育多名子女者合併計算，以最幼子女為準。' }
];

interface OtherLeaveBenefitsDialogProps {
  open: boolean;
  onClose: () => void;
}

const OtherLeaveBenefitsDialog: React.FC<OtherLeaveBenefitsDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        其他假別權益說明
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {leaveBenefitSections.map((section, index) => (
            <Box key={section.title}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {section.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                {section.content}
              </Typography>
              {index < leaveBenefitSections.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OtherLeaveBenefitsDialog;
