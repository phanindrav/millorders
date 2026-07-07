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

function ItemsPanel() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ Name: '', Brand: '' });
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
      const response = await fetch(`${apiBase}/api/items`, { headers: getAuthHeaders() });
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'Unable to load inventory items.', severity: 'error' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => `${item.Name || ''} ${item.Brand || ''}`.toLowerCase().includes(q));
  }, [items, search]);

  const openCreateDialog = () => {
    setEditingItem(null);
    setForm({ Name: '', Brand: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setForm({ Name: item.Name || '', Brand: item.Brand || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const url = editingItem ? `/api/items/${editingItem.ItemId}` : '/api/items';
      const method = editingItem ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Unable to save item.');
      await loadData();
      setDialogOpen(false);
      setSnackbar({ open: true, message: editingItem ? 'Item updated.' : 'Item created.', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message, severity: 'error' });
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.Name}?`)) return;
    try {
      const response = await fetch(`${apiBase}/api/items/${item.ItemId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Unable to delete item.');
      await loadData();
      setSnackbar({ open: true, message: 'Item deleted.', severity: 'success' });
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
              <Typography variant="h5">Inventory items</Typography>
              <Typography variant="body2" color="text.secondary">
                Keep the rice and brand catalog organized for order entry and reporting.
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddCircleOutlineRoundedIcon />} onClick={openCreateDialog}>
              Add item
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
            <TextField label="Search items" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ minWidth: { md: 320 } }} />
            <Chip label={`${filteredItems.length} items`} color="primary" variant="outlined" />
          </Stack>

          {filteredItems.length === 0 ? (
            <Alert severity="info">No inventory items found for the current search.</Alert>
          ) : (
            <Stack spacing={1.5}>
              {filteredItems.map((item) => (
                <Paper key={item.ItemId} variant="outlined" sx={{ p: 2 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={1.5}>
                    <Box>
                      <Typography variant="subtitle1">{item.Name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Brand: {item.Brand || '—'} • Item ID: {item.ItemId}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => openEditDialog(item)}>
                        Edit
                      </Button>
                      <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => handleDelete(item)}>
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
        <DialogTitle>{editingItem ? 'Edit item' : 'Add item'}</DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField label="Item name" fullWidth required value={form.Name} onChange={(event) => setForm((prev) => ({ ...prev, Name: event.target.value }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField label="Brand" fullWidth value={form.Brand} onChange={(event) => setForm((prev) => ({ ...prev, Brand: event.target.value }))} />
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

export default ItemsPanel;
