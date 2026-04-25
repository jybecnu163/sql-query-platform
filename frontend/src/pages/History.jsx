import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const History = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h5">查询历史记录</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          此页面展示历史查询记录（功能开发中，可从后端接口获取）
        </Typography>
      </Paper>
    </Box>
  );
};

export default History;
