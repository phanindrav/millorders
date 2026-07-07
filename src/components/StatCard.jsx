import React from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';

function StatCard({ title, value, subtitle, icon, color = 'primary' }) {
  const Icon = icon;

  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Stack>
          <Stack
            justifyContent="center"
            alignItems="center"
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              color: `${color}.main`,
            }}
          >
            <Icon />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default StatCard;
