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
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';

function ShopsPanel() {
  const [shops, setShops] = useState([]);
  const [agents, setAgents] = useState([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [form, setForm] = useState({ ShopName: '', Place: '', Address: '', PhoneNumber: '', GST: '', AgentId: '' });
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
      const [shopsResponse, agentsResponse] = await Promise.all([
        fetch(`${apiBase}/api/shops`, { headers: getAuthHeaders() }),
        fetch(`${apiBase}/api/agents`, { headers: getAuthHeaders() }),
      ]);
      const [shopsData, agentsData] = await Promise.all([shopsResponse.json(), agentsResponse.json()]);
      setShops(Array.isArray(shopsData) ? shopsData : []);
      setAgents(Array.isArray(agentsData) ? agentsData : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'Unable to load shops.', severity: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredShops = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((shop) => `${shop.ShopName || ''} ${shop.Place || ''} ${shop.AgentName || ''}`.toLowerCase().includes(q));
  }, [shops, search]);

  const openCreateDialog = () => {
    setEditingShop(null);
    setForm({ ShopName: '', Place: '', Address: '', PhoneNumber: '', GST: '', AgentId: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (shop) => {
    setEditingShop(shop);
    setForm({
      ShopName: shop.ShopName || '',
      Place: shop.Place || '',
      Address: shop.Address || '',
      PhoneNumber: shop.PhoneNumber || '',
      GST: shop.GST || '',
      AgentId: shop.AgentId || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const url = editingShop ? `/api/shops/${editingShop.ShopId}` : '/api/shops';
      const method = editingShop ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Unable to save shop.');
      await loadData();
      setDialogOpen(false);
      setSnackbar({ open: true, message: editingShop ? 'Shop updated.' : 'Shop created.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleDelete = async (shop) => {
    if (!window.confirm(`Delete ${shop.ShopName}?`)) return;
    try {
      const response = await fetch(`${apiBase}/api/shops/${shop.ShopId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Unable to delete shop.');
      await loadData();
      setSnackbar({ open: true, message: 'Shop deleted.', severity: 'success' });
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
              <Typography variant="h5">Shop management</Typography>
              <Typography variant="body2" color="text.secondary">Create, edit, and maintain shops for each agent.</Typography>
            </Box>
            <Button variant="contained" startIcon={<AddCircleOutlineRoundedIcon />} onClick={openCreateDialog}>Add shop</Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <TextField label="Search shops" fullWidth value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2 }} />
          <Stack spacing={1.5}>
            {filteredShops.map((shop) => (
              <Paper key={shop.ShopId} variant="outlined" sx={{ p: 2 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
                  <Box>
                    <Typography variant="subtitle1">{shop.ShopName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {shop.Place || '—'} • {shop.Address || '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Agent: {shop.AgentName || 'Unassigned'} • Phone: {shop.PhoneNumber || '—'} • GST: {shop.GST || '—'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => openEditDialog(shop)}>Edit</Button>
                    <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleDelete(shop)}>Delete</Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingShop ? 'Edit shop' : 'Add shop'}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField label="Shop name" fullWidth required value={form.ShopName} onChange={(event) => setForm((prev) => ({ ...prev, ShopName: event.target.value }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Place" fullWidth value={form.Place} onChange={(event) => setForm((prev) => ({ ...prev, Place: event.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Address" fullWidth value={form.Address} onChange={(event) => setForm((prev) => ({ ...prev, Address: event.target.value }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Phone number" fullWidth value={form.PhoneNumber} onChange={(event) => setForm((prev) => ({ ...prev, PhoneNumber: event.target.value }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="GST" fullWidth value={form.GST} onChange={(event) => setForm((prev) => ({ ...prev, GST: event.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField select label="Agent" fullWidth value={form.AgentId} onChange={(event) => setForm((prev) => ({ ...prev, AgentId: event.target.value }))}>
                  {agents.map((agent) => (
                    <MenuItem key={agent.AgentId} value={agent.AgentId}>
                      {agent.AgentName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <DialogActions sx={{ px: 0, pt: 2 }}>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained">Save</Button>
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

export default ShopsPanel;
