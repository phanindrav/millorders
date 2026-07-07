import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ReportsPanel() {
  const [view, setView] = useState('agent');
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [agentReport, setAgentReport] = useState([]);
  const [itemSummary, setItemSummary] = useState([]);
  const [itemDetails, setItemDetails] = useState([]);
  const [dailyReport, setDailyReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const apiBase = 'http://localhost:3000';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('jwtToken');
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const loadAgents = async () => {
    try {
      const response = await fetch(`${apiBase}/api/agents`, { headers: getAuthHeaders() });
      const data = await response.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load agents for reports', error);
    }
  };

  const loadAgentReport = async (agentId = selectedAgentId) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/reports/agent-summary/${agentId}`, { headers: getAuthHeaders() });
      const data = await response.json();
      setAgentReport(Array.isArray(data.details) ? data.details : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'Unable to load agent report.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadItemReport = async (agentId = selectedAgentId) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/reports/item-summary/${agentId}`, { headers: getAuthHeaders() });
      const data = await response.json();
      setItemSummary(Array.isArray(data.summary) ? data.summary : []);
      setItemDetails(Array.isArray(data.details) ? data.details : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'Unable to load item summary.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadDailyReport = async (date = selectedDate) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/reports/daily-report/${date}`, { headers: getAuthHeaders() });
      const data = await response.json();
      setDailyReport(Array.isArray(data.orders) ? data.orders : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'Unable to load daily report.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (view === 'agent') {
      loadAgentReport(selectedAgentId);
    }
  }, [view, selectedAgentId]);

  useEffect(() => {
    if (view === 'items') {
      loadItemReport(selectedAgentId);
    }
  }, [view, selectedAgentId]);

  useEffect(() => {
    if (view === 'daily') {
      loadDailyReport(selectedDate);
    }
  }, [view, selectedDate]);

  const agentSummaryRows = useMemo(() => {
    const map = new Map();
    agentReport.forEach((row) => {
      const key = `${row.ItemName || '—'}::${row.Brand || '—'}`;
      if (!map.has(key)) {
        map.set(key, {
          item: row.ItemName || '—',
          brand: row.Brand || '—',
          bags: 0,
          kgs: 0,
          quintals: 0,
        });
      }
      const entry = map.get(key);
      entry.bags += Number(row.Bags || 0);
      entry.kgs += Number(row.Kgs || 0);
      entry.quintals += Number(row.Quintals || 0);
    });

    return Array.from(map.values()).sort((a, b) => b.quintals - a.quintals);
  }, [agentReport]);

  const dailyTotals = useMemo(() => {
    return dailyReport.reduce(
      (totals, row) => ({
        bags: totals.bags + Number(row.Bags || 0),
        quintals: totals.quintals + Number(row.Quintals || 0),
        amount: totals.amount + Number(row.Amount || 0),
      }),
      { bags: 0, quintals: 0, amount: 0 }
    );
  }, [dailyReport]);

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h5">Operational reports</Typography>
              <Typography variant="body2" color="text.secondary">
                Review active orders, inventory distribution and daily delivery summaries in one place.
              </Typography>
            </Box>
            <Chip label="Live analytics" color="primary" variant="outlined" />
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Tabs value={view} onChange={(_, nextView) => setView(nextView)} variant="scrollable" scrollButtons="auto">
            <Tab value="agent" label="Agent report" icon={<AssessmentRoundedIcon />} iconPosition="start" />
            <Tab value="items" label="Item summary" icon={<Inventory2RoundedIcon />} iconPosition="start" />
            <Tab value="daily" label="Daily delivery" icon={<CalendarTodayRoundedIcon />} iconPosition="start" />
          </Tabs>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
            <TextField
              select
              label="Agent"
              value={selectedAgentId}
              onChange={(event) => setSelectedAgentId(event.target.value)}
              sx={{ minWidth: { xs: '100%', md: 220 } }}
            >
              <MenuItem value="all">All agents</MenuItem>
              {agents.map((agent) => (
                <MenuItem key={agent.AgentId} value={String(agent.AgentId)}>
                  {agent.AgentName}
                </MenuItem>
              ))}
            </TextField>

            {view === 'daily' ? (
              <TextField
                label="Delivery date"
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            ) : (
              <Button variant="outlined" onClick={() => (view === 'agent' ? loadAgentReport(selectedAgentId) : loadItemReport(selectedAgentId))}>
                Refresh
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {loading ? (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress size={24} />
              <Typography color="text.secondary">Preparing report data…</Typography>
            </Stack>
          </CardContent>
        </Card>
      ) : view === 'agent' ? (
        <Grid container spacing={2.5}>
          <Grid item xs={12} lg={5}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="h6">Agent activity summary</Typography>
                    <Typography variant="body2" color="text.secondary">Aggregated pending order quantities</Typography>
                  </Box>
                  <Chip label={`${agentSummaryRows.length} items`} color="primary" variant="outlined" />
                </Stack>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Brand</TableCell>
                        <TableCell align="right">Bags</TableCell>
                        <TableCell align="right">Kgs</TableCell>
                        <TableCell align="right">Qtls</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {agentSummaryRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No agent activity for the selected filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        agentSummaryRows.map((row, index) => (
                          <TableRow key={`${row.item}-${row.brand}-${index}`} hover>
                            <TableCell>{row.item}</TableCell>
                            <TableCell>{row.brand}</TableCell>
                            <TableCell align="right">{row.bags}</TableCell>
                            <TableCell align="right">{formatNumber(row.kgs)}</TableCell>
                            <TableCell align="right">{formatNumber(row.quintals)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={7}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Order details</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Order</TableCell>
                        <TableCell>Shop</TableCell>
                        <TableCell>Item</TableCell>
                        <TableCell align="right">Qtls</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {agentReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No order detail rows available yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        agentReport.map((row) => (
                          <TableRow key={`${row.OrderId}-${row.ItemName}-${row.Brand}`} hover>
                            <TableCell>{row.OrderId}</TableCell>
                            <TableCell>{row.ShopName || '—'}</TableCell>
                            <TableCell>{`${row.ItemName || '—'} • ${row.Brand || '—'}`}</TableCell>
                            <TableCell align="right">{formatNumber(row.Quintals)}</TableCell>
                            <TableCell align="right">{formatNumber(row.Amount)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : view === 'items' ? (
        <Grid container spacing={2.5}>
          <Grid item xs={12} lg={5}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Item distribution</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Brand</TableCell>
                        <TableCell align="right">Bags</TableCell>
                        <TableCell align="right">Qtls</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {itemSummary.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No inventory summary available.
                          </TableCell>
                        </TableRow>
                      ) : (
                        itemSummary.map((row, index) => (
                          <TableRow key={`${row.ItemName}-${row.Brand}-${index}`} hover>
                            <TableCell>{row.ItemName || '—'}</TableCell>
                            <TableCell>{row.Brand || '—'}</TableCell>
                            <TableCell align="right">{row.Bags || 0}</TableCell>
                            <TableCell align="right">{formatNumber(row.Quintals)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} lg={7}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Detailed breakdown</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item</TableCell>
                        <TableCell>Brand</TableCell>
                        <TableCell align="right">Kgs</TableCell>
                        <TableCell align="right">Qtls</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {itemDetails.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No detailed inventory rows available.
                          </TableCell>
                        </TableRow>
                      ) : (
                        itemDetails.map((row, index) => (
                          <TableRow key={`${row.ItemName}-${row.Brand}-${row.Kgs}-${index}`} hover>
                            <TableCell>{row.ItemName || '—'}</TableCell>
                            <TableCell>{row.Brand || '—'}</TableCell>
                            <TableCell align="right">{formatNumber(row.Kgs)}</TableCell>
                            <TableCell align="right">{formatNumber(row.Quintals)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6">Daily delivery report</Typography>
                <Typography variant="body2" color="text.secondary">Delivered orders for {selectedDate}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Chip label={`Bags ${dailyTotals.bags}`} color="primary" variant="outlined" />
                <Chip label={`Qtls ${formatNumber(dailyTotals.quintals)}`} color="success" variant="outlined" />
              </Stack>
            </Stack>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Agent</TableCell>
                    <TableCell>Shop</TableCell>
                    <TableCell>Item</TableCell>
                    <TableCell align="right">Bags</TableCell>
                    <TableCell align="right">Qtls</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailyReport.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No delivery rows found for that date.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dailyReport.map((row, index) => (
                      <TableRow key={`${row.OrderId}-${row.ItemName}-${index}`} hover>
                        <TableCell>{row.AgentName || '—'}</TableCell>
                        <TableCell>{row.ShopName || '—'}</TableCell>
                        <TableCell>{`${row.ItemName || '—'} • ${row.Brand || '—'}`}</TableCell>
                        <TableCell align="right">{row.Bags || 0}</TableCell>
                        <TableCell align="right">{formatNumber(row.Quintals)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

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

export default ReportsPanel;
