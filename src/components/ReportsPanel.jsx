import React, { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
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
  Tooltip,
} from '@mui/material';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import CalendarTodayRoundedIcon from '@mui/icons-material/CalendarTodayRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
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

function shiftDate(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function formatDate(dateStr) {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? 'st' :
    day % 10 === 2 && day !== 12 ? 'nd' :
    day % 10 === 3 && day !== 13 ? 'rd' : 'th';

  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${day}${suffix} ${month}, ${date.getFullYear()}`;
}

function ReportsPanel() {
  const [view, setView] = useState('agent');
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('all');
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [agentReport, setAgentReport] = useState([]);
  const [itemSummary, setItemSummary] = useState([]);
  const [itemDetails, setItemDetails] = useState([]);
  const [riceTypes, setRiceTypes] = useState([]);
  const [selectedRiceId, setSelectedRiceId] = useState('all');
  const [riceReportName, setRiceReportName] = useState('All Rice');
  const [riceDetailRows, setRiceDetailRows] = useState([]);
  const [dailyReport, setDailyReport] = useState([]);
  const [checkReport, setCheckReport] = useState([]);
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
      const summaryRows = Array.isArray(data.summary) ? data.summary : [];
      setItemSummary(
        summaryRows.sort((a, b) => Number(b.Quintals || 0) - Number(a.Quintals || 0))
      );
      setItemDetails(Array.isArray(data.details) ? data.details : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'Unable to load item summary.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadRiceSummaryReport = async (riceId = selectedRiceId) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/rice-report/${encodeURIComponent(riceId)}`, { headers: getAuthHeaders() });
      const data = await response.json();
      setRiceTypes(Array.isArray(data.items) ? data.items : []);
      setRiceReportName(data.riceName || 'All Rice');
      setRiceDetailRows(Array.isArray(data.details) ? data.details : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'Unable to load rice summary.', severity: 'error' });
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

  const changeSelectedDate = (days) => {
    setSelectedDate((currentDate) => shiftDate(currentDate, days));
  };

  const loadCheckReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/reports/check-report/`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load check report');
      setCheckReport(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setSnackbar({ open: true, message: 'Unable to load check report.', severity: 'error' });
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
    if (view === 'allAgents') {
      const reportAgentId = selectedAgentId === 'all' ? 'all' : selectedAgentId;
      loadAgentReport(reportAgentId);
    }
  }, [view, selectedAgentId]);

  useEffect(() => {
    if (view === 'items') {
      loadItemReport(selectedAgentId);
    }
  }, [view, selectedAgentId]);

  useEffect(() => {
    if (view === 'riceSummary') {
      loadRiceSummaryReport(selectedRiceId);
    }
  }, [view, selectedRiceId]);

  useEffect(() => {
    if (view === 'daily') {
      loadDailyReport(selectedDate);
    }
  }, [view, selectedDate]);

  useEffect(() => {
    if (view === 'check') {
      loadCheckReport();
    }
  }, [view]);

  const agentItemSummaryRows = useMemo(() => {
    const map = new Map();
    agentReport.forEach((row) => {
      const item = row.ItemName || '—';
      const current = map.get(item) || { item, quintals: 0 };
      current.quintals += Number(row.Quintals || 0);
      map.set(item, current);
    });

    return Array.from(map.values()).sort((a, b) => b.quintals - a.quintals);
  }, [agentReport]);

  const agentItemGrandTotal = useMemo(() => {
    return agentItemSummaryRows.reduce(
      (totals, row) => ({
        quintals: totals.quintals + Number(row.quintals || 0),
      }),
      { quintals: 0 }
    );
  }, [agentItemSummaryRows]);

  const agentBrandSummaryRows = useMemo(() => {
    const grouped = new Map();

    agentReport.forEach((row) => {
      const item = row.ItemName || '—';
      const brand = row.Brand || '—';
      const kgs = Number(row.Kgs || 0);
      const key = `${item}::${brand}::${kgs}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          item,
          brand,
          kgs,
          bags: 0,
          quintals: 0,
        });
      }

      const entry = grouped.get(key);
      entry.bags += Number(row.Bags || 0);
      entry.quintals += Number(row.Quintals || 0);
    });

    const itemGroups = new Map();
    grouped.forEach((entry) => {
      if (!itemGroups.has(entry.item)) {
        itemGroups.set(entry.item, []);
      }
      itemGroups.get(entry.item).push(entry);
    });

    const flattened = [];
    itemGroups.forEach((values, item) => {
      const itemTotalQuintals = values.reduce((sum, entry) => sum + Number(entry.quintals || 0), 0);

      values.forEach((entry, index) => {
        flattened.push({
          item,
          itemTotalQuintals,
          showItem: index === 0,
          itemRowSpan: values.length,
          brand: entry.brand,
          bags: entry.bags,
          kgs: entry.kgs,
          quintals: entry.quintals,
        });
      });
    });

    return flattened.sort((a, b) => Number(b.itemTotalQuintals || 0) - Number(a.itemTotalQuintals || 0));
  }, [agentReport]);

  const agentBrandGrandTotal = useMemo(() => {
    return agentBrandSummaryRows.reduce(
      (totals, row) => ({
        bags: totals.bags + Number(row.bags || 0),
        kgs: totals.kgs + Number(row.kgs || 0),
        quintals: totals.quintals + Number(row.quintals || 0),
      }),
      { bags: 0, kgs: 0, quintals: 0 }
    );
  }, [agentBrandSummaryRows]);

  const handlePrintAgentSummary = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const currentAgentName = agents.find((agent) => String(agent.AgentId) === String(selectedAgentId))?.AgentName || 'All Agents';

    const itemRows = agentItemSummaryRows.length
      ? agentItemSummaryRows
          .map(
            (row) => `
              <tr>
                <td>${row.item || '—'}</td>
                <td style="text-align:right;">${formatNumber(row.quintals)}</td>
              </tr>
            `
          )
          .join('') + `
              <tr style="font-weight:700; background:#f6f6f6;">
                <td>Grand Total</td>
                <td style="text-align:right;">${formatNumber(agentItemGrandTotal.quintals)}</td>
              </tr>
            `
      : `
          <tr>
            <td colspan="2" style="text-align:center; padding: 18px;">No agent activity for the selected filter.</td>
          </tr>
        `;

    const brandRows = agentBrandSummaryRows.length
      ? agentBrandSummaryRows
          .map(
            (row) => `
              <tr>
                ${row.showItem ? `<td rowspan="${row.itemRowSpan}" style="vertical-align:top; font-weight:700;">${row.item || '—'} (${formatNumber(row.itemTotalQuintals)} qtls)</td>` : ''}
                <td>${row.brand || '—'}</td>
                <td style="text-align:right;">${formatNumber(row.kgs)}</td>
                <td style="text-align:right;">${row.bags || 0}</td>
                <td style="text-align:right;">${formatNumber(row.quintals)}</td>
              </tr>
            `
          )
          .join('') + `
              <tr style="font-weight:700; background:#f6f6f6;">
                <td colspan="2">Grand Total</td>
                <td style="text-align:right;">${formatNumber(agentBrandGrandTotal.kgs)}</td>
                <td style="text-align:right;">${agentBrandGrandTotal.bags}</td>
                <td style="text-align:right;">${formatNumber(agentBrandGrandTotal.quintals)}</td>
              </tr>
            `
      : `
          <tr>
            <td colspan="5" style="text-align:center; padding: 18px;">No brand-wise breakdown available.</td>
          </tr>
        `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Agent Activity Summary</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 28px;
              color: #111;
            }
            h2, h3 {
              margin: 0 0 10px 0;
            }
            .summary-title {
              margin-bottom: 18px;
            }
            .item-summary {
              page-break-after: always;
            }
            .brand-summary {
              page-break-before: always;
              page-break-inside: avoid;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 0 0 26px 0;
              page-break-inside: avoid;
            }
            th, td {
              border: 1px solid #333;
              padding: 7px 9px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f3f3f3;
              font-weight: 700;
            }
            .muted {
              color: #444;
            }
          </style>
        </head>
        <body>
          <div class="summary-title">
            <h2>Agent Activity Summary</h2>
            <div class="muted">${currentAgentName}</div>
          </div>

          <section class="item-summary">
            <h3>Item Summary</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align:right;">Quintals</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
            </table>
          </section>

          <section class="brand-summary">
            <h3>Brand-wise Breakdown</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Brand</th>
                  <th style="text-align:right;">Kgs</th>
                  <th style="text-align:right;">Total Bags</th>
                  <th style="text-align:right;">Quintals</th>
                </tr>
              </thead>
              <tbody>
                ${brandRows}
              </tbody>
            </table>
          </section>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handleShareAgentSummaryWhatsApp = () => {
    const phoneNumber = '919866959496';
    const currentAgentName = agents.find((agent) => String(agent.AgentId) === String(selectedAgentId))?.AgentName || 'All Agents';

    const itemSummaryText = agentItemSummaryRows.length
      ? agentItemSummaryRows
          .map((row) => `${row.item || '—'}: ${formatNumber(row.quintals)} Qtl`)
          .join('\n') + `\nGrand Total: ${formatNumber(agentItemGrandTotal.quintals)} Qtl`
      : 'No item summary available.';

    const brandSummaryText = agentBrandSummaryRows.length
      ? agentBrandSummaryRows
          .map((row) => `${row.item || '—'} / ${row.brand || '—'} = Kgs ${formatNumber(row.kgs)} | Bags ${row.bags || 0} | Qtl ${formatNumber(row.quintals)}`)
          .join('\n') + `\nGrand Total: Kgs ${formatNumber(agentBrandGrandTotal.kgs)} | Bags ${agentBrandGrandTotal.bags} | Qtl ${formatNumber(agentBrandGrandTotal.quintals)}`
      : 'No brand-wise breakdown available.';

    const message = [
      'Agent Activity Summary',
      `Agent: ${currentAgentName}`,
      '',
      'Item Summary',
      itemSummaryText,
      '',
      'Brand-wise Breakdown',
      brandSummaryText,
    ].join('\n');

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const brandSummaryTableRef = useRef(null);

  const handleCaptureBrandSummary = async () => {
    if (!brandSummaryTableRef.current) return;

    try {
      const canvas = await html2canvas(brandSummaryTableRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = 'brand-wise-breakdown.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to capture brand breakdown table', error);
      setSnackbar({ open: true, message: 'Unable to capture the brand-wise table.', severity: 'error' });
    }
  };

  const allAgentSections = useMemo(() => {
    const grouped = new Map();

    agentReport.forEach((row) => {
      const agentName = row.AgentName || 'Unknown Agent';
      if (!grouped.has(agentName)) {
        grouped.set(agentName, []);
      }
      grouped.get(agentName).push(row);
    });

    return Array.from(grouped.entries())
      .map(([agentName, rows]) => {
        const rowCounts = {};
        const totalsByOrder = {};
        let grandTotalQuintals = 0;
        let grandTotalAmount = 0;

        rows.forEach((row) => {
          const orderId = row.OrderId;
          rowCounts[orderId] = (rowCounts[orderId] || 0) + 1;

          if (!totalsByOrder[orderId]) {
            totalsByOrder[orderId] = { quintals: 0, amount: 0 };
          }

          totalsByOrder[orderId].quintals += Number(row.Quintals || 0);
          totalsByOrder[orderId].amount += Number(row.Amount || 0);
          grandTotalQuintals += Number(row.Quintals || 0);
          grandTotalAmount += Number(row.Amount || 0);
        });

        return {
          agentName,
          rows,
          rowCounts,
          totalsByOrder,
          grandTotalQuintals,
          grandTotalAmount,
        };
      })
      .sort((a, b) => a.agentName.localeCompare(b.agentName));
  }, [agentReport]);

  const selectedAgentName = useMemo(() => {
    if (selectedAgentId === 'all') return 'All agents';
    return agents.find((agent) => String(agent.AgentId) === String(selectedAgentId))?.AgentName || 'Selected agent';
  }, [agents, selectedAgentId]);

  const riceGrandTotals = useMemo(() => {
    return riceDetailRows.reduce(
      (totals, row) => ({
        bags: totals.bags + Number(row.Bags || 0),
        kgs: totals.kgs + Number(row.Kgs || 0),
        quintals: totals.quintals + Number(row.Quintals || 0),
        amount: totals.amount + Number(row.Amount || 0),
      }),
      { bags: 0, kgs: 0, quintals: 0, amount: 0 }
    );
  }, [riceDetailRows]);

  const riceBrandSummaryRows = useMemo(() => {
    const grouped = new Map();

    riceDetailRows.forEach((row) => {
      const itemName = row.ItemName || '—';
      const brand = row.Brand || '—';
      const kgsValue = Number(row.Kgs || 0);
      const key = `${itemName}::${brand}::${kgsValue}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          itemName,
          brand,
          kgs: kgsValue,
          bags: 0,
          quintals: 0,
        });
      }

      const entry = grouped.get(key);
      entry.bags += Number(row.Bags || 0);
      entry.quintals += Number(row.Quintals || 0);
    });

    return Array.from(grouped.values()).sort((a, b) => a.itemName.localeCompare(b.itemName) || a.brand.localeCompare(b.brand) || Number(a.kgs) - Number(b.kgs));
  }, [riceDetailRows]);

  const riceBrandGrandTotal = useMemo(() => {
    return riceBrandSummaryRows.reduce(
      (totals, row) => ({
        bags: totals.bags + Number(row.bags || 0),
        kgs: totals.kgs + Number(row.kgs || 0),
        quintals: totals.quintals + Number(row.quintals || 0),
      }),
      { bags: 0, kgs: 0, quintals: 0 }
    );
  }, [riceBrandSummaryRows]);

  const dailyTotals = useMemo(() => {
    return dailyReport.reduce(
      (totals, row) => ({
        bags: totals.bags + Number(row.Bags || 0),
        kgs: totals.kgs + Number(row.Kgs || 0),
        quintals: totals.quintals + Number(row.Quintals || 0),
        amount: totals.amount + Number(row.Amount || 0),
      }),
      { bags: 0, kgs: 0, quintals: 0, amount: 0 }
    );
  }, [dailyReport]);

  const groupedDailyRows = useMemo(() => {
    const agentMap = new Map();

    dailyReport.forEach((row) => {
      const agentKey = String(row.AgentId ?? row.AgentName ?? 'Unknown');
      if (!agentMap.has(agentKey)) {
        agentMap.set(agentKey, {
          agentName: row.AgentName || '—',
          shops: new Map(),
        });
      }

      const agentEntry = agentMap.get(agentKey);
      const shopKey = `${row.OrderId ?? '0'}|${row.ShopName ?? '—'}|${row.Place ?? '—'}`;

      if (!agentEntry.shops.has(shopKey)) {
        agentEntry.shops.set(shopKey, {
          orderId: row.OrderId || '—',
          shopName: row.ShopName || '—',
          place: row.Place || '—',
          items: [],
        });
      }

      agentEntry.shops.get(shopKey).items.push(row);
    });

    const flattened = [];
    agentMap.forEach((agentEntry) => {
      const shops = Array.from(agentEntry.shops.values());
      const totalAgentRows = shops.reduce((sum, shop) => sum + shop.items.length, 0);

      shops.forEach((shop) => {
        shop.items.forEach((item, itemIndex) => {
          flattened.push({
            agentName: agentEntry.agentName,
            showAgent: itemIndex === 0 && shop === shops[0],
            agentRowSpan: totalAgentRows,
            orderId: shop.orderId,
            shopName: shop.shopName,
            place: shop.place,
            showShop: itemIndex === 0,
            shopRowSpan: shop.items.length,
            itemName: item.ItemName || '—',
            brand: item.Brand || '—',
            bags: item.Bags || 0,
            kgs: item.Kgs || 0,
            quintals: item.Quintals || 0,
            rate: item.Rate || 0,
            amount: item.Amount || 0,
          });
        });
      });
    });

    return flattened;
  }, [dailyReport]);

  const dailyTypeTotals = useMemo(() => {
    const map = new Map();

    dailyReport.forEach((row) => {
      const type = row.TypeName || row.Type || '—';
      const current = map.get(type) || { type, totalQuintals: 0, totalAmount: 0 };
      current.totalQuintals += Number(row.Quintals || 0);
      current.totalAmount += Number(row.Amount || 0);
      map.set(type, current);
    });

    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [dailyReport]);

  const dailyTypeGrandTotal = useMemo(() => {
    return dailyTypeTotals.reduce(
      (totals, row) => ({
        quintals: totals.quintals + Number(row.totalQuintals || 0),
        amount: totals.amount + Number(row.totalAmount || 0),
      }),
      { quintals: 0, amount: 0 }
    );
  }, [dailyTypeTotals]);

  const groupedCheckRows = useMemo(() => {
    const groups = new Map();

    checkReport.forEach((row) => {
      const groupKey = `${row.Date || ''}|${row.OrderId || ''}|${row.ShopName || ''}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey).push(row);
    });

    return Array.from(groups.values()).flatMap((rows) => rows.map((row, index) => ({
      ...row,
      showGroup: index === 0,
      groupRowSpan: rows.length,
    })));
  }, [checkReport]);

  const handlePrintAllAgentsReport = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const reportTitle = selectedAgentId === 'all' ? 'All Agents Report' : `${selectedAgentName} Report`;

    const allAgentHtml = allAgentSections.length
      ? allAgentSections
          .map((section) => {
            let lastOrderId = null;

            const rowsHtml = section.rows
              .map((row) => {
                const currentOrderId = row.OrderId;
                const isFirstRowOfOrder = lastOrderId !== currentOrderId;
                lastOrderId = currentOrderId;

                return `
                  <tr>
                    ${isFirstRowOfOrder ? `<td rowspan="${section.rowCounts[currentOrderId]}" style="vertical-align:top; font-weight:700; background:#f7f7f7; font-size:10px;">${row.ShopName || '—'}${row.Place ? `, ${row.Place}` : ''}<br />${row.PhoneNumber || ''}<br /><span style="font-weight:600;">Order: ${row.OrderId}</span> - ${formatDate(row.Date)}<br />Qtls: ${formatNumber(section.totalsByOrder[currentOrderId]?.quintals || 0)}, ₹: ${Number(section.totalsByOrder[currentOrderId]?.amount || 0).toLocaleString('en-IN')}</td>` : ''}
                    <td style="font-size:10px;">${row.ItemName || '—'} - ${row.Brand || '—'}${row.Notes ? `<br /><i>${row.Notes}</i>` : ''}</td>
                    <td style="text-align:right; font-size:10px;">${row.Bags || 0}</td>
                    <td style="text-align:right; font-size:10px;">${formatNumber(row.Kgs)}</td>
                    <td style="text-align:right; font-size:10px;">${formatNumber(row.Quintals)}</td>
                    <td style="text-align:right; font-size:10px;">${row.Rate || 0}</td>
                  </tr>
                `;
              })
              .join('');

            return `
              <div style="margin-bottom:10px;">
                <h3 style="margin:0 0 6px 0; line-height:1.2;">${section.agentName}</h3>
                <table style="width:100%; border-collapse:collapse; margin:0 0 8px 0; font-size:10px;">
                  <thead>
                    <tr>
                      <th style="border:1px solid #333; padding:6px 8px; text-align:left; background:#f3f3f3; font-size:10px;">Order</th>
                      <th style="border:1px solid #333; padding:6px 8px; text-align:left; background:#f3f3f3; font-size:10px;">Item - Brand</th>
                      <th style="border:1px solid #333; padding:6px 8px; text-align:right; background:#f3f3f3; font-size:10px;">Bags</th>
                      <th style="border:1px solid #333; padding:6px 8px; text-align:right; background:#f3f3f3; font-size:10px;">Kgs</th>
                      <th style="border:1px solid #333; padding:6px 8px; text-align:right; background:#f3f3f3; font-size:10px;">Qtls</th>
                      <th style="border:1px solid #333; padding:6px 8px; text-align:right; background:#f3f3f3; font-size:10px;">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                    <tr style="font-weight:700; background:#f6f6f6;">
                      <td colspan="4" style="border:1px solid #333; padding:6px 8px; text-align:right; font-size:10px;">Grand Total</td>
                      <td style="border:1px solid #333; padding:6px 8px; text-align:right; font-size:10px;">${formatNumber(section.grandTotalQuintals)}</td>
                      <td style="border:1px solid #333; padding:6px 8px; text-align:right; font-size:10px;">&nbsp;</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `;
          })
          .join('')
      : '<p>No data available for the selected filter.</p>';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 12px 18px;
              color: #111;
              font-size: 10px;
            }
            h2, h3 {
              margin: 0 0 6px 0;
              font-size: 14px;
              line-height: 1.2;
            }
            .header {
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 0 0 8px 0;
              page-break-inside: avoid;
              font-size: 10px;
            }
            th, td {
              border: 1px solid #333;
              padding: 6px 8px;
              text-align: left;
              vertical-align: top;
              font-size: 10px;
            }
            th {
              background: #f3f3f3;
              font-weight: 700;
            }
            .muted { color: #444; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>${reportTitle}</h2>
            <div class="muted">${selectedAgentId === 'all' ? 'Grouped order-wise report for all agents' : `Agent: ${selectedAgentName}`}</div>
          </div>
          ${allAgentHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handlePrintCheckReport = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const rowsHtml = groupedCheckRows.length
      ? groupedCheckRows.map((row) => `
          <tr>
            ${row.showGroup ? `<td rowspan="${row.groupRowSpan}">${formatDate(row.Date)}</td>` : ''}
            ${row.showGroup ? `<td rowspan="${row.groupRowSpan}">${row.OrderId || '—'}</td>` : ''}
            ${row.showGroup ? `<td rowspan="${row.groupRowSpan}">${row.ShopName || '—'}${row.Place ? `, ${row.Place}` : ''}</td>` : ''}
            <td>${row.ItemName || '—'} - ${row.Brand || '—'}</td>
            <td style="text-align:right;">${row.Bags || 0}</td>
            <td style="text-align:right;">${formatNumber(row.Kgs)}</td>
            <td style="text-align:right;">${formatNumber(row.Quintals)}</td>
            <td style="text-align:right;">${formatNumber(row.Rate)}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="8" style="text-align:center;">No records found.</td></tr>';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Check Report</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #111; font-size: 10px; }
            h2 { margin: 0 0 10px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 5px 7px; text-align: left; }
            th { background: #f3f3f3; font-weight: 700; }
          </style>
        </head>
        <body>
          <h2>Check Report</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Order Id</th>
                <th>Shop</th>
                <th>Item - Brand</th>
                <th style="text-align:right;">Bags</th>
                <th style="text-align:right;">Kgs</th>
                <th style="text-align:right;">Quintals</th>
                <th style="text-align:right;">Rate</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handlePrintRiceSummary = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const riceRows = riceDetailRows.length
      ? riceDetailRows
          .map(
            (row) => `
              <tr>
                <td>${formatDate(row.Date)}</td>
                <td>${row.OrderId || '—'}</td>
                <td>${row.ShopName || '—'}${row.Place ? `, ${row.Place}` : ''}<br />${row.PhoneNumber || ''}</td>
                <td>${row.ItemName || '—'}-${row.Brand || '—'}${row.Notes ? `<br /><i>${row.Notes}</i>` : ''}</td>
                <td style="text-align:right;">${row.Bags || 0}</td>
                <td style="text-align:right;">${formatNumber(row.Kgs)}</td>
                <td style="text-align:right;">${formatNumber(row.Quintals)}</td>
                <td style="text-align:right;">${formatNumber(row.Rate)} : ${row.Condition || ''}</td>
              </tr>
            `
          )
          .join('') + `
            <tr style="font-weight:700; background:#f6f6f6;">
              <td colspan="6">Grand Total</td>
              <td style="text-align:right;">${formatNumber(riceGrandTotals.quintals)}</td>
              <td style="text-align:right;">&nbsp;</td>
            </tr>
          `
      : `
          <tr>
            <td colspan="8" style="text-align:center; padding: 18px;">No records found.</td>
          </tr>
        `;

    const brandRows = riceBrandSummaryRows.length
      ? riceBrandSummaryRows
          .map(
            (row) => `
              <tr>
                <td>${row.itemName || '—'} - ${row.brand || '—'}</td>
                <td style="text-align:right;">${formatNumber(row.kgs)}</td>
                <td style="text-align:right;">${row.bags || 0}</td>
                <td style="text-align:right;">${formatNumber(row.quintals)}</td>
              </tr>
            `
          )
          .join('') + `
              <tr style="font-weight:700; background:#f6f6f6;">
                <td>Grand Total</td>
                <td style="text-align:right;">${formatNumber(riceBrandGrandTotal.kgs)}</td>
                <td style="text-align:right;">${riceBrandGrandTotal.bags}</td>
                <td style="text-align:right;">${formatNumber(riceBrandGrandTotal.quintals)}</td>
              </tr>
            `
      : `
          <tr>
            <td colspan="4" style="text-align:center; padding: 18px;">No item-brand breakdown available.</td>
          </tr>
        `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rice Summary</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 28px;
              color: #111;
            }
            h2, h3 {
              margin: 0 0 10px 0;
            }
            .header {
              margin-bottom: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 0 0 26px 0;
              page-break-inside: avoid;
            }
            th, td {
              border: 1px solid #333;
              padding: 7px 9px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f3f3f3;
              font-weight: 700;
            }
            .muted {
              color: #444;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Rice Summary</h2>
            <div class="muted">Showing: ${riceReportName}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Order Id</th>
                <th>Shop</th>
                <th>Item-Brand</th>
                <th style="text-align:right;">Bags</th>
                <th style="text-align:right;">Kgs</th>
                <th style="text-align:right;">Quintals</th>
                <th style="text-align:right;">Rate</th>
              </tr>
            </thead>
            <tbody>
              ${riceRows}
            </tbody>
          </table>

          <h3>Item-Brand Summary</h3>
          <table>
            <thead>
              <tr>
                <th>Item-Brand</th>
                <th style="text-align:right;">Kgs</th>
                <th style="text-align:right;">Total Bags</th>
                <th style="text-align:right;">Total Quintals</th>
              </tr>
            </thead>
            <tbody>
              ${brandRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handlePrintDailyReport = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) {
      window.print();
      return;
    }

    const dailyRows = groupedDailyRows.length
      ? groupedDailyRows
          .map((row, index) => {
            const agentCell = row.showAgent
              ? `<td rowspan="${row.agentRowSpan}" style="vertical-align:top; font-weight:700;">${row.agentName || '—'}</td>`
              : '';
            const shopCell = row.showShop
              ? `<td rowspan="${row.shopRowSpan}" style="vertical-align:top;">${row.shopName || '—'}<br />${row.place || '—'}</td>`
              : '';
            return `
              <tr>
                ${agentCell}
                ${shopCell}
                <td>${row.itemName || '—'} • ${row.brand || '—'}</td>
                <td style="text-align:right;">${row.bags || 0}</td>
                <td style="text-align:right;">${formatNumber(row.kgs)}</td>
                <td style="text-align:right;">${formatNumber(row.quintals)}</td>
                <td style="text-align:right;">${formatNumber(row.rate)}</td>
                <td style="text-align:right;">${formatNumber(row.amount)}</td>
              </tr>
            `;
          })
          .join('') + `
            <tr style="font-weight:700; background:#f6f6f6;">
              <td colspan="3">Grand Total</td>
              <td style="text-align:right;">${dailyTotals.bags}</td>
              <td style="text-align:right;">${formatNumber(dailyTotals.kgs)}</td>
              <td style="text-align:right;">${formatNumber(dailyTotals.quintals)}</td>
              <td style="text-align:right;">&nbsp;</td>
              <td style="text-align:right;">${formatNumber(dailyTotals.amount)}</td>
            </tr>
          `
      : `
          <tr>
            <td colspan="8" style="text-align:center; padding: 18px;">No delivery rows found for that date.</td>
          </tr>
        `;

    const typeRows = dailyTypeTotals.length
      ? dailyTypeTotals
          .map(
            (row, index) => `
              <tr>
                <td>${row.type || '—'}</td>
                <td style="text-align:right;">${formatNumber(row.totalQuintals)}</td>
                <td style="text-align:right;">${formatNumber(row.totalAmount)}</td>
              </tr>
            `
          )
          .join('') + `
              <tr style="font-weight:700; background:#f6f6f6;">
                <td>Grand Total</td>
                <td style="text-align:right;">${formatNumber(dailyTypeGrandTotal.quintals)}</td>
                <td style="text-align:right;">${formatNumber(dailyTypeGrandTotal.amount)}</td>
              </tr>
            `
      : `
          <tr>
            <td colspan="3" style="text-align:center; padding: 18px;">No type totals available.</td>
          </tr>
        `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Delivery Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 28px;
              color: #111;
            }
            h2, h3 {
              margin: 0 0 10px 0;
            }
            .header {
              margin-bottom: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 0 0 26px 0;
              page-break-inside: avoid;
            }
            th, td {
              border: 1px solid #333;
              padding: 7px 9px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #f3f3f3;
              font-weight: 700;
            }
            .muted {
              color: #444;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Daily Delivery Report</h2>
            <div class="muted">Date: ${selectedDate}</div>
          </div>

          <h3>Delivery Summary</h3>
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Order / Shop</th>
                <th>Item & Brand</th>
                <th style="text-align:right;">Bags</th>
                <th style="text-align:right;">Kgs</th>
                <th style="text-align:right;">Qtls</th>
                <th style="text-align:right;">Rate</th>
                <th style="text-align:right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${dailyRows}
            </tbody>
          </table>

          <h3>Type Summary</h3>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th style="text-align:right;">Quintals</th>
                <th style="text-align:right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${typeRows}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

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
            <Tab value="allAgents" label="All agents report" icon={<AssessmentRoundedIcon />} iconPosition="start" />
            <Tab value="riceSummary" label="Rice summary" icon={<Inventory2RoundedIcon />} iconPosition="start" />
            <Tab value="check" label="Check report" icon={<AssessmentRoundedIcon />} iconPosition="start" />
            <Tab value="daily" label="Daily delivery" icon={<CalendarTodayRoundedIcon />} iconPosition="start" />
          </Tabs>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
            {view === 'riceSummary' ? (
              <TextField
                select
                label="Rice Type"
                value={selectedRiceId}
                onChange={(event) => setSelectedRiceId(event.target.value)}
                sx={{ minWidth: { xs: '100%', md: 220 } }}
              >
                <MenuItem value="all">All Rice</MenuItem>
                {riceTypes.map((rice) => (
                  <MenuItem key={rice.RiceId} value={String(rice.RiceId)}>
                    {rice.Name}
                  </MenuItem>
                ))}
              </TextField>
            ) : view !== 'daily' && view !== 'check' ? (
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
            ) : null}

            {view === 'daily' ? (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Tooltip title="Previous day">
                  <IconButton onClick={() => changeSelectedDate(-1)} aria-label="Previous day">
                    <ChevronLeftRoundedIcon />
                  </IconButton>
                </Tooltip>
                <TextField
                  label="Delivery date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <Tooltip title="Next day">
                  <IconButton onClick={() => changeSelectedDate(1)} aria-label="Next day">
                    <ChevronRightRoundedIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            ) : view === 'check' ? (
              <Button variant="outlined" onClick={loadCheckReport}>Refresh</Button>
            ) : (
              <Button variant="outlined" onClick={() => {
                if (view === 'agent') {
                  loadAgentReport(selectedAgentId);
                } else if (view === 'allAgents') {
                  const reportAgentId = selectedAgentId === 'all' ? 'all' : selectedAgentId;
                  loadAgentReport(reportAgentId);
                } else if (view === 'items') {
                  loadItemReport(selectedAgentId);
                } else if (view === 'riceSummary') {
                  loadRiceSummaryReport(selectedRiceId);
                } else if (view === 'check') {
                  loadCheckReport();
                }
              }}>
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
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6">Agent activity summary</Typography>
                <Typography variant="body2" color="text.secondary">Item totals and brand-wise quantity summary</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={handlePrintAgentSummary}>Print report</Button>
                <Button variant="contained" color="success" onClick={handleShareAgentSummaryWhatsApp}>WhatsApp</Button>
              </Stack>
            </Stack>

            <Box id="agent-summary-print-area" sx={{ maxWidth: 920, mx: 'auto' }}>
              <Card variant="outlined" sx={{ mb: 2, maxWidth: 900, mx: 'auto' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Item summary</Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ '& .MuiTableCell-root': { px: 1.25, py: 0.75, fontSize: '0.8rem' } }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell width="20%">Item</TableCell>
                          <TableCell width="20%" align="right">Quintals</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {agentItemSummaryRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              No agent activity for the selected filter.
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {agentItemSummaryRows.map((row, index) => (
                              <TableRow key={`${row.item}-${index}`} hover>
                                <TableCell>{row.item}</TableCell>
                                <TableCell align="right">{formatNumber(row.quintals)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
                              <TableCell sx={{ fontWeight: 700 }}>Grand Total</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(agentItemGrandTotal.quintals)}</TableCell>
                            </TableRow>
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ maxWidth: 900, mx: 'auto' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Brand-wise breakdown</Typography>
                    <Button variant="outlined" size="small" onClick={handleCaptureBrandSummary}>Capture table</Button>
                  </Stack>
                  <TableContainer component={Paper} variant="outlined" ref={brandSummaryTableRef} sx={{ '& .MuiTableCell-root': { px: 1.25, py: 0.75, fontSize: '0.8rem' } }}>
                    <Table size="small" sx={{ tableLayout: 'fixed' }}>
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell>Brand</TableCell>
                          <TableCell align="right">Kgs</TableCell>
                          <TableCell align="right">Total Bags</TableCell>
                          <TableCell align="right">Quintals</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {agentBrandSummaryRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                              No brand-wise breakdown available.
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {agentBrandSummaryRows.map((row, index) => (
                              <TableRow key={`${row.item}-${row.brand}-${row.kgs}-${index}`} hover>
                                {row.showItem ? (
                                  <TableCell rowSpan={row.itemRowSpan} sx={{ verticalAlign: 'top', fontWeight: 600 }}>
                                    {row.item}
                                    <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8rem', ml: 1 }}>
                                      ({formatNumber(row.itemTotalQuintals)} qtls)
                                    </Box>
                                  </TableCell>
                                ) : null}
                                <TableCell>{row.brand}</TableCell>
                                <TableCell align="right">{formatNumber(row.kgs)}</TableCell>
                                <TableCell align="right">{row.bags}</TableCell>
                                <TableCell align="right">{formatNumber(row.quintals)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
                              <TableCell colSpan={2} sx={{ fontWeight: 700 }}>Grand Total</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(agentBrandGrandTotal.kgs)}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>{agentBrandGrandTotal.bags}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(agentBrandGrandTotal.quintals)}</TableCell>
                            </TableRow>
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Box>
          </CardContent>
        </Card>
      ) : view === 'allAgents' ? (
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6">{selectedAgentId === 'all' ? 'All agents report' : `${selectedAgentName} report`}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedAgentId === 'all'
                    ? 'Grouped order-wise breakdown for every agent'
                    : `Order-wise data for ${selectedAgentName}`}
                </Typography>
              </Box>
              <Button variant="outlined" onClick={handlePrintAllAgentsReport}>Print report</Button>
            </Stack>

            <Box sx={{ display: 'grid', gap: 2 }}>
              {allAgentSections.length === 0 ? (
                <Card variant="outlined">
                  <CardContent>
                    <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                      {selectedAgentId === 'all' ? 'No data available for all agents.' : `No data available for ${selectedAgentName}.`}
                    </Typography>
                  </CardContent>
                </Card>
              ) : (
                allAgentSections.map((section) => (
                  <Card key={section.agentName} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
                        {section.agentName} - {formatDate(new Date().toISOString())}
                      </Typography>

                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ minWidth: 180 }}>Order</TableCell>
                              <TableCell>Item - Brand</TableCell>
                              <TableCell align="right">Bags</TableCell>
                              <TableCell align="right">Kgs</TableCell>
                              <TableCell align="right">Qtls</TableCell>
                              <TableCell align="right">Rate : Condition</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(() => {
                              let lastOrderId = null;
                              return section.rows.map((row, index) => {
                                const currentOrderId = row.OrderId;
                                const isFirstRowOfOrder = lastOrderId !== currentOrderId;
                                lastOrderId = currentOrderId;

                                return (
                                  <TableRow key={`${section.agentName}-${currentOrderId}-${row.ItemName}-${index}`}>
                                    {isFirstRowOfOrder ? (
                                      <TableCell rowSpan={section.rowCounts[currentOrderId]} sx={{ verticalAlign: 'top', fontWeight: 600, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                                        <Box component="span" sx={{ display: 'block', fontWeight: 700 }}>{row.ShopName}{row.Place ? ` - ${row.Place}` : ''}</Box>
                                        {row.PhoneNumber ? <Box component="span" sx={{ display: 'block' }}>{row.PhoneNumber}</Box> : null}
                                        <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                                          Order: <b>{row.OrderId}</b> - {formatDate(row.Date)}
                                        </Box>
                                        <Box component="span" sx={{ display: 'block' }}>
                                          Qtls: {formatNumber(section.totalsByOrder[currentOrderId]?.quintals || 0)}, ₹: {Number(section.totalsByOrder[currentOrderId]?.amount || 0).toLocaleString('en-IN')}
                                        </Box>
                                      </TableCell>
                                    ) : null}

                                    <TableCell>
                                      {row.ItemName} - {row.Brand}
                                      {row.Notes ? <Box component="span" sx={{ display: 'block', fontStyle: 'italic', color: 'text.secondary' }}>{row.Notes}</Box> : null}
                                    </TableCell>
                                    <TableCell align="right">{row.Bags}</TableCell>
                                    <TableCell align="right">{formatNumber(row.Kgs)}</TableCell>
                                    <TableCell align="right">{formatNumber(row.Quintals)}</TableCell>
                                    <TableCell align="right">{row.Rate} : {row.Condition}</TableCell>
                                  </TableRow>
                                );
                              });
                            })()}
                          </TableBody>
                          <TableHead>
                            <TableRow>
                              <TableCell colSpan={4} align="right" sx={{ fontWeight: 700 }}>Grand Total</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(section.grandTotalQuintals)}</TableCell>
                              <TableCell />
                            </TableRow>
                          </TableHead>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                ))
              )}
            </Box>
          </CardContent>
        </Card>
      ) : view === 'check' ? (
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6">Check report</Typography>
                <Typography variant="body2" color="text.secondary">Open orders awaiting delivery</Typography>
              </Box>
              <Button variant="outlined" onClick={handlePrintCheckReport}>Print report</Button>
            </Stack>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Order Id</TableCell>
                    <TableCell>Shop</TableCell>
                    <TableCell>Item - Brand</TableCell>
                    <TableCell align="right">Bags</TableCell>
                    <TableCell align="right">Kgs</TableCell>
                    <TableCell align="right">Quintals</TableCell>
                    <TableCell align="right">Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupedCheckRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>No records found.</TableCell>
                    </TableRow>
                  ) : groupedCheckRows.map((row, index) => (
                    <TableRow key={`${row.OrderId}-${row.ItemName}-${row.Brand}-${index}`} hover>
                      {row.showGroup ? <TableCell rowSpan={row.groupRowSpan} sx={{ verticalAlign: 'top' }}>{formatDate(row.Date)}</TableCell> : null}
                      {row.showGroup ? <TableCell rowSpan={row.groupRowSpan} sx={{ verticalAlign: 'top' }}>{row.OrderId}</TableCell> : null}
                      {row.showGroup ? <TableCell rowSpan={row.groupRowSpan} sx={{ verticalAlign: 'top' }}>{row.ShopName || '—'}{row.Place ? `, ${row.Place}` : ''}</TableCell> : null}
                      <TableCell>{row.ItemName || '—'} - {row.Brand || '—'}</TableCell>
                      <TableCell align="right">{row.Bags || 0}</TableCell>
                      <TableCell align="right">{formatNumber(row.Kgs)}</TableCell>
                      <TableCell align="right">{formatNumber(row.Quintals)}</TableCell>
                      <TableCell align="right">{formatNumber(row.Rate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      ) : view === 'riceSummary' ? (
        <Card variant="outlined">
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6">Rice Summary</Typography>
                <Typography variant="body2" color="text.secondary">Showing: {riceReportName}</Typography>
              </Box>
              <Button variant="outlined" onClick={handlePrintRiceSummary}>Print report</Button>
            </Stack>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Order Id</TableCell>
                    <TableCell>Shop</TableCell>
                    <TableCell>Item-Brand</TableCell>
                    <TableCell align="right">Bags</TableCell>
                    <TableCell align="right">Kgs</TableCell>
                    <TableCell align="right">Quintals</TableCell>
                    <TableCell align="right">Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {riceDetailRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {riceDetailRows.map((row, index) => (
                        <TableRow key={`${row.OrderId}-${row.ItemName}-${row.Brand}-${index}`} hover>
                          <TableCell>{formatDate(row.Date)}</TableCell>
                          <TableCell>{row.OrderId}</TableCell>
                          <TableCell>
                            {row.ShopName}
                            {row.Place ? `, ${row.Place}` : ''}
                            {row.PhoneNumber ? <Box component="div" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>{row.PhoneNumber}</Box> : null}
                          </TableCell>
                          <TableCell>
                            {row.ItemName}-{row.Brand}
                            {row.Notes ? <Box component="div" sx={{ fontStyle: 'italic', color: 'text.secondary', mt: 0.5 }}>{row.Notes}</Box> : null}
                          </TableCell>
                          <TableCell align="right">{row.Bags || 0}</TableCell>
                          <TableCell align="right">{formatNumber(row.Kgs)}</TableCell>
                          <TableCell align="right">{formatNumber(row.Quintals)}</TableCell>
                          <TableCell align="right">{formatNumber(row.Rate)} : {row.Condition || ''}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
                        <TableCell colSpan={6} sx={{ fontWeight: 700 }}>Grand Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(riceGrandTotals.quintals)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Card variant="outlined" sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>Item-Brand Summary</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Item-Brand</TableCell>
                        <TableCell align="right">Kgs</TableCell>
                        <TableCell align="right">Total Bags</TableCell>
                        <TableCell align="right">Total Quintals</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {riceBrandSummaryRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No item-brand breakdown available.
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {riceBrandSummaryRows.map((row, index) => (
                            <TableRow key={`${row.itemName}-${row.brand}-${index}`} hover>
                              <TableCell>{row.itemName} - {row.brand}</TableCell>
                              <TableCell align="right">{formatNumber(row.kgs)}</TableCell>
                              <TableCell align="right">{row.bags}</TableCell>
                              <TableCell align="right">{formatNumber(row.quintals)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Grand Total</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(riceBrandGrandTotal.kgs)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{riceBrandGrandTotal.bags}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(riceBrandGrandTotal.quintals)}</TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
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
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Chip label={`Bags ${dailyTotals.bags}`} color="primary" variant="outlined" />
                <Chip label={`Qtls ${formatNumber(dailyTotals.quintals)}`} color="success" variant="outlined" />
                <Button variant="outlined" onClick={handlePrintDailyReport}>
                  Print report
                </Button>
              </Stack>
            </Stack>
            <Box id="daily-delivery-report-print-area">
              <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Agent</TableCell>
                    <TableCell>Order / Shop</TableCell>
                    <TableCell>Item & Brand</TableCell>
                    <TableCell align="right">Bags</TableCell>
                    <TableCell align="right">Kgs</TableCell>
                    <TableCell align="right">Qtls</TableCell>
                    <TableCell align="right">Rate</TableCell>
                    <TableCell align="right">Total Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dailyReport.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                        No delivery rows found for that date.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {groupedDailyRows.map((row, index) => (
                        <TableRow key={`${row.orderId}-${row.itemName}-${row.brand}-${index}`} hover>
                          {row.showAgent ? (
                            <TableCell rowSpan={row.agentRowSpan} sx={{ verticalAlign: 'top', fontWeight: 600 }}>
                              {row.agentName}
                            </TableCell>
                          ) : null}
                          {row.showShop ? (
                            <TableCell rowSpan={row.shopRowSpan} sx={{ verticalAlign: 'top' }}>
                              <Box component="div" sx={{ fontWeight: 600 }}>#{row.orderId}</Box>
                              <Box component="div">{row.shopName || '—'}</Box>
                              <Box component="div" color="text.secondary">{row.place || '—'}</Box>
                            </TableCell>
                          ) : null}
                          <TableCell>{`${row.itemName} • ${row.brand}`}</TableCell>
                          <TableCell align="right">{row.bags || 0}</TableCell>
                          <TableCell align="right">{formatNumber(row.kgs)}</TableCell>
                          <TableCell align="right">{formatNumber(row.quintals)}</TableCell>
                          <TableCell align="right">{formatNumber(row.rate)}</TableCell>
                          <TableCell align="right">{formatNumber(row.amount)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
                        <TableCell colSpan={3} sx={{ fontWeight: 700 }}>Grand Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{dailyTotals.bags}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(dailyTotals.kgs)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(dailyTotals.quintals)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(dailyTotals.amount)}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
              </TableContainer>

              <Card variant="outlined" sx={{ mt: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>Type summary</Typography>
                  <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell align="right">Quintals</TableCell>
                        <TableCell align="right">Total Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dailyTypeTotals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No type totals available.
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                          {dailyTypeTotals.map((row, index) => (
                            <TableRow key={`${row.type}-${index}`} hover>
                              <TableCell>{row.type}</TableCell>
                              <TableCell align="right">{formatNumber(row.totalQuintals)}</TableCell>
                              <TableCell align="right">{formatNumber(row.totalAmount)}</TableCell>
                            </TableRow>
                          ))}
                          <TableRow sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
                            <TableCell sx={{ fontWeight: 700 }}>Grand Total</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(dailyTypeGrandTotal.quintals)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatNumber(dailyTypeGrandTotal.amount)}</TableCell>
                          </TableRow>
                        </>
                      )}
                    </TableBody>
                  </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Box>
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
