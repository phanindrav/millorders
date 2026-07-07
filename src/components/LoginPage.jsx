import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';

function LoginPage({ onSuccess }) {
  const [form, setForm] = useState({ username: 'admin', password: 'admin123' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to sign in.');

      onSuccess?.(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', px: 2 }}>
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 440, borderRadius: 3 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Box sx={{ p: 1.5, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <LockRoundedIcon />
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5">Sign in</Typography>
              <Typography variant="body2" color="text.secondary">
                Access the Rice Mill Management dashboard
              </Typography>
            </Box>
          </Stack>

          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : null}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Username"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                fullWidth
                required
              />
              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                fullWidth
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Login'}
              </Button>
            </Stack>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
            Default credentials: admin / admin123
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

export default LoginPage;
