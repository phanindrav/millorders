import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

function AgentsPanel() {
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [form, setForm] = useState({ AgentName: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwtToken');
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const apiBase = 'http://localhost:3000';

  const loadData = async () => {
    try {
      const response = await fetch(`${apiBase}/api/agents`, { headers: getAuthHeaders() });
      const data = await response.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'Unable to load agents.', severity: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return agents;
    return agents.filter((agent) => (agent.AgentName || '').toLowerCase().includes(q));
  }, [agents, search]);

  const openCreateDialog = () => {
    setEditingAgent(null);
    setForm({ AgentName: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (agent) => {
    setEditingAgent(agent);
    setForm({ AgentName: agent.AgentName || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const url = editingAgent ? `/api/agents/${editingAgent.AgentId}` : '/api/agents';
      const method = editingAgent ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Unable to save agent.');
      await loadData();
      setDialogOpen(false);
      setSnackbar({ open: true, message: editingAgent ? 'Agent updated.' : 'Agent created.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleDelete = async (agent) => {
    if (!window.confirm(`Delete ${agent.AgentName}?`)) return;
    try {
      const response = await fetch(`${apiBase}/api/agents/${agent.AgentId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Unable to delete agent.');
      await loadData();
      setSnackbar({ open: true, message: 'Agent deleted.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h5">Agent management</Typography>
              <Typography variant="body2" color="text.secondary">
                Maintain the partner network that drives orders and shop assignments.
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddCircleOutlineRoundedIcon />} onClick={openCreateDialog}>
              Add agent
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
            <TextField label="Search agents" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: { md: 320 } }} />
            <Chip label={`${filteredAgents.length} agents`} color="primary" variant="outlined" />
          </Stack>

          {filteredAgents.length === 0 ? (
            <Alert severity="info">No agents found for the current search.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {filteredAgents.map((agent) => (
                <Paper key={agent.AgentId} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
                    <Box>
                      <Typography variant="subtitle1">{agent.AgentName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Agent ID: {agent.AgentId}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => openEditDialog(agent)}>
                        Edit
                      </Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleDelete(agent)}>
                        Delete
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingAgent ? 'Edit agent' : 'Add agent'}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Agent name"
                  fullWidth
                  required
                  value={form.AgentName}
                  onChange={(event) => setForm((prev) => ({ ...prev, AgentName: event.target.value }))}
                />
              </Grid>
            </Grid>
            <DialogActions sx={{ px: 0, pt: 2 }}>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained">
                Save
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AgentsPanel;
