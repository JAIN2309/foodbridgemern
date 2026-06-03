import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  Users, CheckCircle, XCircle, MapPin, Clock, TrendingUp,
  Package, ShieldCheck, Utensils, AlertCircle, BarChart3
} from 'lucide-react';
import api from '../../services/api';
import DonationCard from '../../components/common/DonationCard';
import 'leaflet/dist/leaflet.css';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [activeDonations, setActiveDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [donationHistory, setDonationHistory] = useState([]);
  const [historyStats, setHistoryStats] = useState({});
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  const [historyPagination, setHistoryPagination] = useState({ total: 0, pages: 1 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit] = useState(10);
  const [usersPagination, setUsersPagination] = useState({ total: 0, pages: 1 });
  const [usersLoading, setUsersLoading] = useState(false);

  const VALID_TABS = ['overview', 'verify', 'map', 'analytics', 'users', 'history'];
  const [confirmDialog, setConfirmDialog] = useState({ open: false, userId: null, approved: null, userName: '' });
  const [statusConfirm, setStatusConfirm] = useState({ open: false, userId: null, userName: '', currentActive: true });
  const [detailDrawer, setDetailDrawer] = useState({ open: false, user: null, data: null, loading: false });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [analyticsStats, setAnalyticsStats] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (tabParam && !VALID_TABS.includes(tabParam)) {
      setActiveTab('overview');
    }
    
    checkBackendHealth();
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    // Listen for sidebar navigation events
    const handleTabChange = (event) => {
      setActiveTab(event.detail);
    };
    
    const handleForceUpdate = (event) => {
      setActiveTab(event.detail);
    };
    
    window.addEventListener('dashboardTabChange', handleTabChange);
    window.addEventListener('forceTabUpdate', handleForceUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('dashboardTabChange', handleTabChange);
      window.removeEventListener('forceTabUpdate', handleForceUpdate);
    };
  }, [location.search, roleFilter]);

  const checkBackendHealth = async () => {
    try {
      const response = await api.get('/users/health');
    } catch (error) {
      console.error('Backend health check failed:', error);
    }
  };

  const fetchUsersPage = async (page, role = roleFilter, search = searchQuery) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: usersLimit, role });
      if (search) params.set('search', search);
      const res = await api.get(`/users/all?${params}`);
      setAllUsers(res.data?.users || []);
      setUsersPagination(res.data?.pagination || { total: 0, pages: 1 });
    } catch (err) {
      console.error('Users fetch error:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersPage(usersPage);
  }, [usersPage]);

  useEffect(() => {
    setUsersPage(1);
    fetchUsersPage(1, roleFilter, searchQuery);
  }, [roleFilter, searchQuery]);

  const fetchHistoryPage = async (page) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/donations/admin/history?page=${page}&limit=${historyLimit}`);
      setDonationHistory(res.data?.donations || []);
      setHistoryPagination(res.data?.pagination || { total: 0, pages: 1 });
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (historyPage > 1) fetchHistoryPage(historyPage);
  }, [historyPage]);

  const fetchData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [pendingRes, statsRes, donationsRes, usersRes, historyRes] = await Promise.all([
        api.get('/users/pending'),
        api.get('/users/stats'),
        api.get('/users/donations/all'),
        api.get(`/users/all?page=1&limit=${usersLimit}&role=${roleFilter}`),
        api.get(`/donations/admin/history?page=1&limit=${historyLimit}`)
      ]);
      
      setPendingUsers(pendingRes.data || []);
      setStats(statsRes.data || {});
      setActiveDonations(donationsRes.data || []);
      setAllUsers(usersRes.data?.users || []);
      setUsersPagination(usersRes.data?.pagination || { total: 0, pages: 1 });
      setUsersPage(1);
      setDonationHistory(historyRes.data?.donations || []);
      setHistoryStats(historyRes.data?.statistics || {});
      setHistoryPagination(historyRes.data?.pagination || { total: 0, pages: 1 });
      setHistoryPage(1);
      setDataLoaded(true);
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message;
      setApiError(errorMsg);
      toast.error(`Failed to fetch data: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openConfirm = (userId, approved, userName) =>
    setConfirmDialog({ open: true, userId, approved, userName });

  const closeConfirm = () =>
    setConfirmDialog({ open: false, userId: null, approved: null, userName: '' });

  const openStatusConfirm = (user) =>
    setStatusConfirm({ open: true, userId: user._id, userName: user.organization_name, currentActive: user.is_active !== false });

  const confirmToggleStatus = async () => {
    const { userId, currentActive } = statusConfirm;
    setStatusConfirm(s => ({ ...s, open: false }));
    try {
      await api.put(`/users/${userId}/status`, { is_active: !currentActive });
      toast.success(!currentActive ? t('dashboard.admin.userActivated') : t('dashboard.admin.userDeactivated'));
      fetchUsersPage(usersPage);
      fetchData();
    } catch {
      toast.error(t('dashboard.admin.statusChangeFailed'));
    }
  };

  const openDetailDrawer = async (user) => {
    setDetailDrawer({ open: true, user, data: null, loading: true });
    try {
      const res = await api.get(`/users/${user._id}/detail`);
      setDetailDrawer(d => ({ ...d, data: res.data, loading: false }));
    } catch {
      setDetailDrawer(d => ({ ...d, loading: false }));
    }
  };

  const fetchAnalytics = async (start, end) => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set('startDate', start);
      if (end)   params.set('endDate',   end);
      const query = params.toString() ? `?${params}` : '';
      const res = await api.get(`/users/stats${query}`);
      setAnalyticsStats(res.data);
    } catch { /* keep previous */ } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchExportData = async () => {
    const params = new URLSearchParams();
    if (dateRange.start) params.set('startDate', dateRange.start);
    if (dateRange.end)   params.set('endDate',   dateRange.end);
    const query = params.toString() ? `?${params}` : '';
    const res = await api.get(`/users/export/analytics${query}`);
    return res.data;
  };

  const generateCSV = (d) => {
    const period = d.period.is_all_time ? 'All time' : `${d.period.start} to ${d.period.end || 'today'}`;
    const c = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const row = (...cells) => cells.map(c).join(',');
    const blank = () => '';

    const sections = [
      row('FOODBRIDGE ANALYTICS EXPORT'), row(`Period: ${period}`), row(`Generated: ${new Date(d.generated_at).toLocaleString()}`), blank(),

      row('SECTION 1: DONATION STATUS SUMMARY'),
      row('Metric', 'Count', 'Notes'),
      row('Total Donations',    d.summary.donations.total,     ''),
      row('Available',          d.summary.donations.available, 'Waiting to be claimed'),
      row('Reserved',           d.summary.donations.reserved,  'Claimed — pickup pending'),
      row('Completed',          d.summary.donations.collected, 'Successfully collected'),
      row('Expired',            d.summary.donations.expired,   'Pickup window passed'),
      row('Completion Rate',    `${d.summary.donations.completion_rate}%`, '(Collected / Total)'),
      blank(),

      row('SECTION 2: PLATFORM IMPACT'),
      row('Metric', 'Value'),
      row('Meals Served',       d.summary.impact.meals_served),
      row('Meals Pending',      d.summary.impact.meals_pending),
      row('Food Saved (kg)',     `${d.summary.impact.kg_saved} kg`),
      blank(),

      row('SECTION 3: PICKUP TYPE ANALYTICS'),
      row('Type', 'Count', 'Percentage', 'Avg Kg'),
      row('Instant',    d.summary.pickup.instant,   `${d.summary.pickup.instant_pct}%`,   ''),
      row('Scheduled',  d.summary.pickup.scheduled, `${d.summary.pickup.scheduled_pct}%`, ''),
      blank(),

      row('SECTION 4: USER STATISTICS'),
      row('Metric', 'Count'),
      row('Total Users',        d.summary.users.total),
      row('Verified',           d.summary.users.verified),
      row('Pending Approval',   d.summary.users.pending),
      row('Donors',             d.summary.users.donors),
      row('NGOs',               d.summary.users.ngos),
      blank(),

      row('SECTION 5: DAILY BREAKDOWN', `(${d.period.daily_from} to ${d.period.daily_to})`),
      row('Date', 'Total', 'Collected', 'Reserved', 'Expired', 'Kg', 'Serves'),
      ...d.daily_breakdown.map(x => row(x.date, x.total, x.collected, x.reserved, x.expired, x.kg, x.serves)),
      blank(),

      row('SECTION 6: FOOD CATEGORIES'),
      row('Category', 'Donations', 'Kg', 'Serves'),
      ...d.food_categories.map(x => row(x.category || 'Unknown', x.count, x.kg, x.serves)),
      blank(),

      row('SECTION 7: TOP NGOs BY COLLECTIONS'),
      row('Rank', 'NGO Name', 'Claimed', 'Collected', 'Success Rate', 'Kg Saved', 'Meals Delivered'),
      ...d.top_ngos.map((x, i) => row(i + 1, x.name, x.claimed, x.collected, `${x.success_rate ?? 0}%`, x.kg_saved, x.serves)),
      blank(),

      row('SECTION 8: TOP DONORS BY DONATIONS POSTED'),
      row('Rank', 'Donor Name', 'Posted', 'Collected', 'Kg Donated', 'Serves'),
      ...d.top_donors.map((x, i) => row(i + 1, x.name, x.posted, x.collected, x.kg, x.serves)),
      blank(),

      row('SECTION 9: RELEASE / CANCELLATION REASONS'),
      row('Reason', 'Count'),
      ...d.release_reasons.map(x => row(x.reason, x.count)),
    ];

    const csv = sections.join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `foodbridge-analytics-${d.period.start || 'all'}-to-${d.period.end || new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePDF = (d) => {
    const period = d.period.is_all_time ? 'All time' : `${d.period.start} → ${d.period.end || 'today'}`;
    const r = (label, value, extra = '') =>
      `<tr><td>${label}</td><td class="val">${value}</td>${extra ? `<td class="note">${extra}</td>` : ''}</tr>`;
    const th = (...cols) => `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
    const td = (...cols) => `<tr>${cols.map(c => `<td>${c}</td>`).join('')}</tr>`;

    const bar = (pct, color) =>
      `<div style="background:#e5e7eb;border-radius:4px;height:8px;margin-top:3px"><div style="background:${color};height:8px;border-radius:4px;width:${pct}%"></div></div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>FoodBridge Report</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;padding:28px;color:#111;font-size:12px;line-height:1.5}
      .header{background:linear-gradient(135deg,#15803d,#22c55e);color:#fff;padding:20px 24px;border-radius:12px;margin-bottom:20px}
      .header h1{font-size:20px;font-weight:800;margin-bottom:2px}
      .header .sub{font-size:11px;opacity:.85}
      .kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
      .kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
      .kpi .v{font-size:22px;font-weight:800;color:#16a34a}
      .kpi .l{font-size:10px;color:#6b7280;margin-top:2px}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
      h2{font-size:13px;font-weight:700;color:#374151;border-bottom:2px solid #16a34a;padding-bottom:5px;margin:16px 0 8px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th{background:#f3f4f6;padding:7px 8px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;color:#6b7280;border:1px solid #e5e7eb}
      td{padding:6px 8px;border:1px solid #e5e7eb}
      tr:nth-child(even) td{background:#fafafa}
      .val{font-weight:700;color:#16a34a;text-align:right}
      .note{color:#9ca3af;font-size:10px;font-style:italic}
      .rank{font-weight:700;color:#374151;text-align:center}
      .badge{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700}
      .green{background:#dcfce7;color:#15803d}
      .blue{background:#dbeafe;color:#1d4ed8}
      .amber{background:#fef3c7;color:#b45309}
      .red{background:#fee2e2;color:#b91c1c}
      .footer{margin-top:20px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:10px}
      @media print{body{padding:12px}}
    </style></head><body>

    <div class="header">
      <h1>🌱 FoodBridge Analytics Report</h1>
      <div class="sub">Period: <strong>${period}</strong> &nbsp;·&nbsp; Generated: ${new Date(d.generated_at).toLocaleString()} &nbsp;·&nbsp; Daily trend: ${d.period.daily_from} to ${d.period.daily_to}</div>
    </div>

    <div class="kpi-grid">
      <div class="kpi"><div class="v">${d.summary.donations.total}</div><div class="l">Total Donations</div></div>
      <div class="kpi"><div class="v" style="color:#16a34a">${d.summary.donations.collected}</div><div class="l">Collected</div>${bar(d.summary.donations.completion_rate,'#16a34a')}</div>
      <div class="kpi"><div class="v" style="color:#0891b2">${d.summary.impact.meals_served}</div><div class="l">Meals Served</div></div>
      <div class="kpi"><div class="v" style="color:#7c3aed">${d.summary.impact.kg_saved} kg</div><div class="l">Food Saved</div></div>
    </div>

    <div class="grid2">
      <div>
        <h2>Donation Status</h2>
        <table>
          ${th('Status','Count','% of Total')}
          ${td('<span class="badge green">Available</span>',   d.summary.donations.available, `${d.summary.donations.total ? Math.round(d.summary.donations.available/d.summary.donations.total*100) : 0}%`)}
          ${td('<span class="badge amber">Reserved</span>',    d.summary.donations.reserved,  `${d.summary.donations.total ? Math.round(d.summary.donations.reserved/d.summary.donations.total*100) : 0}%`)}
          ${td('<span class="badge green">Collected</span>',   d.summary.donations.collected, `${d.summary.donations.completion_rate}%`)}
          ${td('<span class="badge red">Expired</span>',       d.summary.donations.expired,   `${d.summary.donations.total ? Math.round(d.summary.donations.expired/d.summary.donations.total*100) : 0}%`)}
        </table>

        <h2>Platform Impact</h2>
        <table>
          ${th('Metric','Value')}
          ${r('Meals Served',        d.summary.impact.meals_served)}
          ${r('Meals Pending',       d.summary.impact.meals_pending,   'in available/reserved')}
          ${r('Kg Food Saved',       `${d.summary.impact.kg_saved} kg`)}
        </table>

        <h2>User Statistics</h2>
        <table>
          ${th('Metric','Count')}
          ${r('Total Users',         d.summary.users.total)}
          ${r('Verified',            d.summary.users.verified)}
          ${r('Pending Approval',    d.summary.users.pending)}
          ${r('Donors',              d.summary.users.donors)}
          ${r('NGOs',                d.summary.users.ngos)}
        </table>
      </div>
      <div>
        <h2>Pickup Type Analysis</h2>
        <table>
          ${th('Type','Count','Share')}
          ${td('⚡ Instant',   d.summary.pickup.instant,   `${d.summary.pickup.instant_pct}%`)}
          ${td('📅 Scheduled', d.summary.pickup.scheduled, `${d.summary.pickup.scheduled_pct}%`)}
        </table>
        ${bar(d.summary.pickup.instant_pct,'#f59e0b')}
        <p style="font-size:10px;color:#9ca3af;margin-top:4px">⚡ Instant ${d.summary.pickup.instant_pct}% &nbsp; 📅 Scheduled ${d.summary.pickup.scheduled_pct}%</p>

        <h2>Food Categories</h2>
        <table>
          ${th('Category','Donations','Kg','Serves')}
          ${d.food_categories.map(x => td(x.category||'Unknown', x.count, x.kg, x.serves)).join('')}
        </table>

        <h2>Release Reasons (Top 10)</h2>
        <table>
          ${th('Reason','Count')}
          ${d.release_reasons.map(x => td(x.reason, x.count)).join('')}
        </table>
      </div>
    </div>

    <h2>Daily Breakdown (${d.period.daily_from} → ${d.period.daily_to})</h2>
    <table>
      ${th('Date','Posted','Collected','Reserved','Expired','Kg Saved','Serves')}
      ${d.daily_breakdown.map(x => td(x.date,`<strong>${x.total}</strong>`,`<span class="badge green">${x.collected}</span>`,x.reserved,`<span class="badge red">${x.expired}</span>`,x.kg,x.serves)).join('')}
    </table>

    <div class="grid2">
      <div>
        <h2>Top 10 NGOs by Collections</h2>
        <table>
          ${th('#','NGO','Claimed','Collected','Success %','Kg Saved')}
          ${d.top_ngos.map((x,i) => td(`<span class="rank">${i+1}</span>`, x.name, x.claimed, `<strong>${x.collected}</strong>`, `${x.success_rate??0}%`, x.kg_saved)).join('')}
        </table>
      </div>
      <div>
        <h2>Top 10 Donors by Donations</h2>
        <table>
          ${th('#','Donor','Posted','Collected','Kg Donated')}
          ${d.top_donors.map((x,i) => td(`<span class="rank">${i+1}</span>`, x.name, `<strong>${x.posted}</strong>`, x.collected, x.kg)).join('')}
        </table>
      </div>
    </div>

    <div class="footer">FoodBridge &nbsp;·&nbsp; Reducing food waste, one donation at a time &nbsp;·&nbsp; foodbridge.app</div>
    </body></html>`;

    const win = window.open('', '_blank', 'width=1000,height=780');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try { generateCSV(await fetchExportData()); }
    catch { toast.error('Export failed'); }
    finally { setExportLoading(false); }
  };

  const handleExportPDF = async () => {
    setExportLoading(true);
    try { generatePDF(await fetchExportData()); }
    catch { toast.error('Export failed'); }
    finally { setExportLoading(false); }
  };

  const handleVerifyUser = async () => {
    const { userId, approved } = confirmDialog;
    closeConfirm();
    setIsLoading(true);
    try {
      await api.put(`/users/${userId}/verify`, { approved });
      toast.success(approved ? t('dashboard.admin.approveSuccess') : t('dashboard.admin.rejectSuccess'));
      fetchData();
    } catch (error) {
      toast.error(t('dashboard.admin.verifyFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'reserved': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800 dark:text-gray-100';
    }
  };

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.admin.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500">{t('dashboard.admin.subtitle')}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('dashboard.admin.autoRefresh')}</p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <span>{t('dashboard.admin.refreshData')}</span>
          )}
        </button>
      </div>

      {/* API Error Alert */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <h3 className="text-red-800 font-medium">{t('dashboard.admin.apiError')}</h3>
              <p className="text-red-700 text-sm mt-1">
                {apiError}. {t('dashboard.admin.apiErrorDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 mt-2">{t('dashboard.admin.loadingData')}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">{t('dashboard.admin.totalUsers')}</p>
              <p className="text-lg font-semibold">{stats.users?.total || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">{t('dashboard.admin.verifiedUsers')}</p>
              <p className="text-lg font-semibold">{stats.users?.verified || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">{t('dashboard.admin.pendingApproval')}</p>
              <p className="text-lg font-semibold">{stats.users?.pending || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">{t('dashboard.admin.mealsServed')}</p>
              <p className="text-lg font-semibold">{stats.meals_served || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/30">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.overview')}
            </button>
            <button
              onClick={() => setActiveTab('verify')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'verify'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.verifyUsers')} ({pendingUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'map'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.liveMap')}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.analytics')}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.usersList')} ({usersPagination.total})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.history')} ({donationHistory.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {!VALID_TABS.includes(activeTab) && setActiveTab('overview')}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">{t('dashboard.admin.donationStats')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.total')}:</span>
                      <span className="font-semibold">{stats.donations?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.activeNow')}:</span>
                      <span className="font-semibold">{stats.donations?.active || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.completed')}:</span>
                      <span className="font-semibold">{stats.donations?.completed || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">{t('dashboard.admin.userStats')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.total')}:</span>
                      <span className="font-semibold">{stats.users?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.verified')}:</span>
                      <span className="font-semibold">{stats.users?.verified || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.pending')}:</span>
                      <span className="font-semibold">{stats.users?.pending || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">{t('dashboard.admin.recentActivity')}</h3>
                <div className="space-y-3">
                  {activeDonations.slice(0, 5).map((donation) => (
                    <div key={donation._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src={donation.photo_url}
                          alt="Food"
                          className="w-10 h-10 rounded object-cover"
                        />
                        <div>
                          <p className="font-medium">
                            {donation.food_items.map(item => item.name).join(', ')}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                            By {donation.donor_id?.organization_name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(donation.status)}`}>
                        {donation.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verify' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('dashboard.admin.pendingVerifications')}</h3>
              {pendingUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">{t('dashboard.admin.noPendingVerifications')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <div key={user._id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{user.organization_name}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              user.role === 'donor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role.toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500">
                            <div>
                              <p><strong>{t('dashboard.admin.email')}:</strong> {user.email}</p>
                              <p><strong>{t('dashboard.admin.contact')}:</strong> {user.contact_person}</p>
                              <p><strong>{t('dashboard.admin.phone')}:</strong> {user.phone}</p>
                            </div>
                            <div>
                              <p><strong>{t('dashboard.admin.license')}:</strong> {user.license_number}</p>
                              <p><strong>{t('dashboard.admin.address')}:</strong> {user.address}</p>
                              <p><strong>{t('dashboard.admin.registered')}:</strong> {new Date(user.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => openConfirm(user._id, true, user.organization_name)}
                            disabled={isLoading}
                            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t('dashboard.admin.approve')}
                          </button>
                          <button
                            onClick={() => openConfirm(user._id, false, user.organization_name)}
                            disabled={isLoading}
                            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            {t('dashboard.admin.reject')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'map' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('dashboard.admin.liveDonationMap')}</h3>
              <div className="h-96 rounded-lg overflow-hidden">
                <MapContainer
                  center={[28.6139, 77.2090]} // Default to Delhi
                  zoom={10}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {activeDonations.map((donation) => (
                    <Marker
                      key={donation._id}
                      position={[
                        donation.donor_id?.location?.coordinates?.[1] || 0,
                        donation.donor_id?.location?.coordinates?.[0] || 0
                      ]}
                    >
                      <Popup>
                        <div className="p-2">
                          <h4 className="font-medium">
                            {donation.food_items.map(item => item.name).join(', ')}
                          </h4>
                          <p className="text-sm">
                            By {donation.donor_id?.organization_name || 'Unknown'}
                          </p>
                          <p className="text-sm">
                            Serves {donation.quantity_serves} people
                          </p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${getStatusColor(donation.status)}`}>
                            {donation.status}
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (() => {
            const display = analyticsStats || stats;
            return (
            <div className="space-y-6">
              {/* Header row: title + date range filter + export buttons */}
              <div className="flex flex-col md:flex-row md:items-end gap-3">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{t('dashboard.admin.platformAnalytics')}</h3>
                  {display?.date_range?.start && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      📅 {t('dashboard.admin.filteredPeriod')}: {display.date_range.start} → {display.date_range.end || t('dashboard.admin.today')}
                    </p>
                  )}
                </div>

                {/* Date range inputs */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <input type="date" value={dateRange.start}
                      onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
                      className="text-xs bg-transparent text-gray-700 dark:text-gray-300 outline-none w-28" />
                    <span className="text-gray-400 text-xs">—</span>
                    <input type="date" value={dateRange.end}
                      onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
                      className="text-xs bg-transparent text-gray-700 dark:text-gray-300 outline-none w-28" />
                  </div>
                  <button
                    onClick={() => fetchAnalytics(dateRange.start, dateRange.end)}
                    disabled={analyticsLoading}
                    className="px-3 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    {analyticsLoading ? '⟳' : t('dashboard.admin.applyFilter')}
                  </button>
                  {analyticsStats && (
                    <button
                      onClick={() => { setAnalyticsStats(null); setDateRange({ start: '', end: '' }); }}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      {t('dashboard.admin.clearFilter')}
                    </button>
                  )}
                </div>

                {/* Export buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={handleExportCSV}
                    disabled={exportLoading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {exportLoading
                      ? <span className="animate-spin">⟳</span>
                      : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    }
                    ⬇ CSV
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={exportLoading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {exportLoading
                      ? <span className="animate-spin">⟳</span>
                      : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    }
                    📄 PDF
                  </button>
                </div>
              </div>

              {/* Key metric cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <p className="text-xs text-blue-600 font-medium">{t('dashboard.admin.totalDonations')}</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{display.donations?.total ?? 0}</p>
                  <p className="text-xs text-blue-400 mt-1">{display.donations?.active ?? 0} {t('dashboard.admin.activeNow').toLowerCase()}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Utensils className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-green-600 font-medium">{t('dashboard.admin.mealsServed')}</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{display.meals_served ?? 0}</p>
                  <p className="text-xs text-green-400 mt-1">{display.meals_pending ?? 0} pending</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <p className="text-xs text-purple-600 font-medium">{t('dashboard.admin.completionRate')}</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{display.donations?.completion_rate ?? 0}%</p>
                  <p className="text-xs text-purple-400 mt-1">{display.donations?.completed ?? 0} {t('dashboard.admin.completed').toLowerCase()}</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-orange-600" />
                    <p className="text-xs text-orange-600 font-medium">{t('dashboard.admin.verificationRate')}</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">{display.users?.verification_rate ?? 0}%</p>
                  <p className="text-xs text-orange-400 mt-1">{display.users?.verified ?? 0} / {display.users?.total ?? 0} users</p>
                </div>
              </div>

              {/* Donation status breakdown */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-5">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> {t('dashboard.admin.donationBreakdown')}
                </h4>
                {(() => {
                  const items = [
                    { label: t('dashboard.admin.active'),    value: display.donations?.active    ?? 0, color: 'bg-blue-500' },
                    { label: t('dashboard.admin.reserved'),  value: display.donations?.reserved  ?? 0, color: 'bg-yellow-500' },
                    { label: t('dashboard.admin.completed'), value: display.donations?.completed ?? 0, color: 'bg-green-500' },
                    { label: t('dashboard.admin.expired'),   value: display.donations?.expired   ?? 0, color: 'bg-red-400' },
                  ];
                  const total = display.donations?.total || 1;
                  return (
                    <div className="space-y-3">
                      {items.map(({ label, value, color }) => (
                        <div key={label}>
                          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">
                            <span>{label}</span>
                            <span className="font-medium">{value} <span className="text-gray-400 dark:text-gray-500 font-normal">({Math.round((value / total) * 100)}%)</span></span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div className={`${color} h-2.5 rounded-full transition-all duration-500`}
                              style={{ width: `${Math.round((value / total) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Pickup Analytics Section */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-5">
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> {t('dashboard.admin.pickupAnalytics')}
                </h4>

                {/* Donation status pipeline tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label: t('dashboard.admin.available'),        value: display.donations?.active    ?? 0, icon: '🟢', bg: 'bg-green-50 dark:bg-green-900/20',   text: 'text-green-700 dark:text-green-300',  sub: t('dashboard.admin.waitingPickup') },
                    { label: t('dashboard.admin.instantActive'),    value: display.pickup?.instant_active ?? 0, icon: '⚡', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300',  sub: t('dashboard.admin.within30min') },
                    { label: t('dashboard.admin.upcomingScheduled'),value: display.pickup?.upcoming_scheduled ?? 0, icon: '📅', bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', sub: t('dashboard.admin.futureScheduled') },
                    { label: t('dashboard.admin.completed'),        value: display.donations?.completed ?? 0, icon: '✅', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', sub: t('dashboard.admin.allTime') },
                  ].map(({ label, value, icon, bg, text, sub }) => (
                    <div key={label} className={`${bg} rounded-xl p-3 border border-white/50`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-lg">{icon}</span>
                        <span className={`text-xl font-bold ${text}`}>{value}</span>
                      </div>
                      <p className={`text-xs font-semibold ${text}`}>{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Instant vs Scheduled split */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">{t('dashboard.admin.pickupTypeSplit')}</p>
                  {(() => {
                    const inst  = display.pickup?.instant   ?? 0;
                    const sched = display.pickup?.scheduled ?? 0;
                    const tot   = display.pickup?.total || 1;
                    const instPct  = Math.round((inst  / tot) * 100);
                    const schedPct = Math.round((sched / tot) * 100);
                    return (
                      <div className="space-y-3">
                        {/* Stacked bar */}
                        <div className="w-full h-4 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden flex">
                          <div className="bg-amber-400 h-full transition-all duration-700" style={{ width: `${instPct}%` }} title={`Instant: ${instPct}%`} />
                          <div className="bg-blue-500 h-full transition-all duration-700" style={{ width: `${schedPct}%` }} title={`Scheduled: ${schedPct}%`} />
                        </div>
                        {/* Legend */}
                        <div className="flex gap-6">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">⚡ {t('dashboard.admin.instantPickup')}</span>
                            <span className="text-sm font-bold text-amber-600">{inst} <span className="text-xs font-normal text-gray-400">({instPct}%)</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">📅 {t('dashboard.admin.scheduledPickup')}</span>
                            <span className="text-sm font-bold text-blue-600">{sched} <span className="text-xs font-normal text-gray-400">({schedPct}%)</span></span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{t('dashboard.admin.pickupTypeNote')} {tot}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* User breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-5">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" /> {t('dashboard.admin.userBreakdown')}
                  </h4>
                  <div className="space-y-3">
                    {[
                      { label: t('dashboard.admin.donorOnly'),  value: display.users?.donors  ?? 0, color: 'bg-blue-500' },
                      { label: t('dashboard.admin.ngoOnly'),    value: display.users?.ngos    ?? 0, color: 'bg-green-500' },
                      { label: t('dashboard.admin.pending'),    value: display.users?.pending ?? 0, color: 'bg-yellow-400' },
                    ].map(({ label, value, color }) => {
                      const total = (display.users?.total || 1);
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">
                            <span>{label}</span>
                            <span className="font-medium">{value}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div className={`${color} h-2.5 rounded-full transition-all duration-500`}
                              style={{ width: `${Math.round((value / total) * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-5">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {t('dashboard.admin.platformHealth')}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">
                        <span>{t('dashboard.admin.donationSuccessRate')}</span>
                        <span className="font-semibold text-green-600">{display.donations?.completion_rate ?? 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${display.donations?.completion_rate ?? 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 mb-1">
                        <span>{t('dashboard.admin.userVerificationRate')}</span>
                        <span className="font-semibold text-blue-600">{display.users?.verification_rate ?? 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${display.users?.verification_rate ?? 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-lg font-medium">{t('dashboard.admin.allUsers')}</h3>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder={t('dashboard.admin.searchUsers')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
                  />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('dashboard.admin.allRoles')}</option>
                    <option value="donor">{t('dashboard.admin.donorOnly')}</option>
                    <option value="ngo">{t('dashboard.admin.ngoOnly')}</option>
                    <option value="admin">{t('dashboard.admin.adminOnly')}</option>
                  </select>
                  <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {dataLoaded ? `${usersPagination.total} ${t('dashboard.admin.usersFound')}` : t('dashboard.admin.loading')}
                  </div>
                </div>
              </div>
              {!dataLoaded || usersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-2">{t('dashboard.admin.loadingUsers')}</p>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 dark:text-gray-500">{t('dashboard.admin.noUsersFound')}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {t('dashboard.admin.noUsersDesc')}
                    <br />• {t('dashboard.admin.backendNotRunning')}
                    <br />• {t('dashboard.admin.noRegistrations')}
                    <br />• {t('dashboard.admin.dbIssue')}
                  </p>
                  <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    {t('dashboard.admin.retryLoading')}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.admin.organization')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.admin.role')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.admin.contact')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.admin.status')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.admin.accountStatus')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.admin.lastLogin')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.admin.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {allUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-4">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{user.organization_name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{user.contact_person}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'donor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{user.phone}</div>
                          </td>
                          {/* Verification status */}
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.is_verified ? t('dashboard.admin.verified') : t('dashboard.admin.pending')}
                            </span>
                          </td>
                          {/* Active / Deactivated */}
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                              user.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${user.is_active !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              {user.is_active !== false ? t('dashboard.admin.accountActive') : t('dashboard.admin.accountDeactivated')}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                            {user.last_login
                              ? new Date(user.last_login).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                              : <span className="text-gray-300 italic">Never</span>}
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openDetailDrawer(user)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
                              >
                                {t('dashboard.admin.moreInfo')}
                              </button>
                              <button
                                onClick={() => openStatusConfirm(user)}
                                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                                  user.is_active !== false
                                    ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                                    : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                {user.is_active !== false ? t('dashboard.admin.deactivate') : t('dashboard.admin.activate')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Users pagination */}
                  {usersPagination.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                      <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        {t('dashboard.admin.page')} {usersPage} {t('dashboard.admin.of')} {usersPagination.pages}
                        &nbsp;·&nbsp; {usersPagination.total} {t('dashboard.admin.total').toLowerCase()}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                          disabled={usersPage === 1}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          ← {t('dashboard.admin.prev')}
                        </button>
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, usersPagination.pages) }, (_, i) => {
                            let p;
                            if (usersPagination.pages <= 5) p = i + 1;
                            else if (usersPage <= 3) p = i + 1;
                            else if (usersPage >= usersPagination.pages - 2) p = usersPagination.pages - 4 + i;
                            else p = usersPage - 2 + i;
                            return (
                              <button
                                key={p}
                                onClick={() => setUsersPage(p)}
                                className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                                  p === usersPage
                                    ? 'bg-blue-600 text-white font-semibold'
                                    : 'border border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-500'
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setUsersPage(p => Math.min(usersPagination.pages, p + 1))}
                          disabled={usersPage === usersPagination.pages}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {t('dashboard.admin.next')} →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {t('dashboard.admin.history')}
                  <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
                    ({historyPagination.total} {t('dashboard.admin.total').toLowerCase()})
                  </span>
                </h3>
              </div>

              {historyLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                  <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm">{t('dashboard.admin.loading')}</p>
                </div>
              ) : donationHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 dark:text-gray-500">{t('dashboard.admin.noDonationHistory')}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {donationHistory.map((donation) => (
                      <DonationCard
                        key={donation._id}
                        donation={donation}
                        showDonor={true}
                        showNGO={true}
                      />
                    ))}
                  </div>

                  {/* Pagination controls */}
                  {historyPagination.pages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                        {t('dashboard.admin.page')} {historyPage} {t('dashboard.admin.of')} {historyPagination.pages}
                        &nbsp;·&nbsp; {historyPagination.total} {t('dashboard.admin.total').toLowerCase()}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          ← {t('dashboard.admin.prev')}
                        </button>

                        {/* Page number pills */}
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, historyPagination.pages) }, (_, i) => {
                            let p;
                            if (historyPagination.pages <= 5) {
                              p = i + 1;
                            } else if (historyPage <= 3) {
                              p = i + 1;
                            } else if (historyPage >= historyPagination.pages - 2) {
                              p = historyPagination.pages - 4 + i;
                            } else {
                              p = historyPage - 2 + i;
                            }
                            return (
                              <button
                                key={p}
                                onClick={() => setHistoryPage(p)}
                                className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                                  p === historyPage
                                    ? 'bg-blue-600 text-white font-semibold'
                                    : 'border border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-500'
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => setHistoryPage(p => Math.min(historyPagination.pages, p + 1))}
                          disabled={historyPage === historyPagination.pages}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          {t('dashboard.admin.next')} →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Confirmation Dialog */}
    {confirmDialog.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeConfirm}
        />

        {/* Dialog */}
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
            confirmDialog.approved ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {confirmDialog.approved
              ? <CheckCircle className="w-7 h-7 text-green-600" />
              : <XCircle className="w-7 h-7 text-red-600" />
            }
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
            {confirmDialog.approved
              ? t('dashboard.admin.confirmApproveTitle')
              : t('dashboard.admin.confirmRejectTitle')
            }
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-600 dark:text-gray-400 dark:text-gray-500 text-center mb-1">
            {confirmDialog.approved
              ? t('dashboard.admin.confirmApproveMsg')
              : t('dashboard.admin.confirmRejectMsg')
            }
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 text-center mb-6">
            "{confirmDialog.userName}"
          </p>

          {!confirmDialog.approved && (
            <p className="text-xs text-red-500 text-center mb-4 bg-red-50 rounded-lg px-3 py-2">
              {t('dashboard.admin.confirmRejectWarning')}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={closeConfirm}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('dashboard.admin.cancel')}
            </button>
            <button
              onClick={handleVerifyUser}
              className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors ${
                confirmDialog.approved
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {confirmDialog.approved
                ? t('dashboard.admin.confirmApprove')
                : t('dashboard.admin.confirmReject')
              }
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Activate / Deactivate Confirm */}
    {statusConfirm.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setStatusConfirm(s => ({ ...s, open: false }))} />
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${statusConfirm.currentActive ? 'bg-red-100' : 'bg-emerald-100'}`}>
            <span className="text-2xl">{statusConfirm.currentActive ? '🚫' : '✅'}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-1">
            {statusConfirm.currentActive ? t('dashboard.admin.confirmDeactivateTitle') : t('dashboard.admin.confirmActivateTitle')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-1">
            {statusConfirm.currentActive ? t('dashboard.admin.confirmDeactivateMsg') : t('dashboard.admin.confirmActivateMsg')}
          </p>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 text-center mb-3">"{statusConfirm.userName}"</p>
          {statusConfirm.currentActive && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center mb-4">
              {t('dashboard.admin.deactivateWarning')}
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStatusConfirm(s => ({ ...s, open: false }))}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {t('dashboard.admin.cancel')}
            </button>
            <button onClick={confirmToggleStatus}
              className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors ${statusConfirm.currentActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {statusConfirm.currentActive ? t('dashboard.admin.confirmDeactivate') : t('dashboard.admin.confirmActivate')}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* User Detail Drawer */}
    {detailDrawer.open && (
      <>
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setDetailDrawer(d => ({ ...d, open: false }))} />
        <div className={`fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col transition-transform duration-300 ${detailDrawer.open ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">{detailDrawer.user?.organization_name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{detailDrawer.user?.role?.toUpperCase()} · {detailDrawer.user?.contact_person}</p>
            </div>
            <button onClick={() => setDetailDrawer(d => ({ ...d, open: false }))}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {detailDrawer.loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Account status badges */}
              <div className="flex gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full ${detailDrawer.user?.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {detailDrawer.user?.is_verified ? '✓ Verified' : '⏳ Pending Verification'}
                </span>
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full ${detailDrawer.user?.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${detailDrawer.user?.is_active !== false ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  {detailDrawer.user?.is_active !== false ? t('dashboard.admin.accountActive') : t('dashboard.admin.accountDeactivated')}
                </span>
                <span className={`inline-flex px-3 py-1.5 text-xs font-semibold rounded-full ${detailDrawer.user?.role === 'donor' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {detailDrawer.user?.role?.toUpperCase()}
                </span>
              </div>

              {/* Contact info */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2.5">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">{t('dashboard.admin.contactInfo')}</h4>
                {[
                  { icon: '📧', label: 'Email', value: detailDrawer.data?.user?.email || detailDrawer.user?.email },
                  { icon: '📱', label: 'Phone', value: `+91 ${detailDrawer.data?.user?.phone || detailDrawer.user?.phone}` },
                  { icon: '📍', label: 'Address', value: detailDrawer.data?.user?.address || detailDrawer.user?.address },
                  { icon: '🪪', label: 'License', value: detailDrawer.data?.user?.license_number || detailDrawer.user?.license_number },
                ].map(({ icon, label, value }) => value ? (
                  <div key={label} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0">{icon}</span>
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-gray-800 dark:text-gray-200 break-all">{value}</p>
                    </div>
                  </div>
                ) : null)}
              </div>

              {/* Timeline */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">{t('dashboard.admin.timeline')}</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Joined</span>
                  <span className="text-gray-800 dark:text-gray-200">{detailDrawer.user?.createdAt ? new Date(detailDrawer.user.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Login</span>
                  <span className="text-gray-800 dark:text-gray-200">{detailDrawer.user?.last_login ? new Date(detailDrawer.user.last_login).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}</span>
                </div>
              </div>

              {/* Activity stats */}
              {detailDrawer.data?.stats && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">{t('dashboard.admin.activityStats')}</h4>
                  {detailDrawer.user?.role === 'donor' ? (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Posted', value: detailDrawer.data.stats.posted_total, color: 'text-blue-600' },
                        { label: 'Collected', value: detailDrawer.data.stats.posted_collected, color: 'text-green-600' },
                        { label: 'Kg Donated', value: `${detailDrawer.data.stats.posted_kg} kg`, color: 'text-purple-600' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center bg-white dark:bg-gray-700 rounded-lg p-3">
                          <p className={`text-xl font-bold ${color}`}>{value}</p>
                          <p className="text-xs text-gray-400 mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Claimed', value: detailDrawer.data.stats.claimed_total, color: 'text-blue-600' },
                        { label: 'Collected', value: detailDrawer.data.stats.claimed_collected, color: 'text-green-600' },
                        { label: 'Kg Saved', value: `${detailDrawer.data.stats.claimed_kg} kg`, color: 'text-purple-600' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center bg-white dark:bg-gray-700 rounded-lg p-3">
                          <p className={`text-xl font-bold ${color}`}>{value}</p>
                          <p className="text-xs text-gray-400 mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Trust score */}
              {detailDrawer.data?.user?.trust_score != null && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-gray-400 uppercase">Trust Score</h4>
                    <span className="text-lg font-bold text-amber-600">⭐ {detailDrawer.data.user.trust_score}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, detailDrawer.data.user.trust_score)}%` }} />
                  </div>
                </div>
              )}

              {/* Quick action */}
              <button
                onClick={() => { setDetailDrawer(d => ({ ...d, open: false })); openStatusConfirm(detailDrawer.user); }}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${detailDrawer.user?.is_active !== false ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
              >
                {detailDrawer.user?.is_active !== false ? `🚫 ${t('dashboard.admin.deactivate')} Account` : `✅ ${t('dashboard.admin.activate')} Account`}
              </button>
            </div>
          )}
        </div>
      </>
    )}
    </>
  );
};

export default AdminDashboard;