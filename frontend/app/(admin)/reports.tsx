import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSuperAdmin } from "../../hooks/useSuperAdmin";
import { useAuth } from "../../contexts/AuthContext";
import { downloadCsvFile, openPrintableReceipt } from "../../src/utils/exportHelpers";
import API from "../../src/api/client";

interface DownloadedStatement {
  id: string;
  title: string;
  filename: string;
  type: "csv" | "pdf";
  timestamp: string;
  recordsCount: number;
  totalAmount: number;
  summary: string;
  csvContent?: string;
  pdfHtml?: string;
}

interface SectorItem {
  id: string;
  title: string;
}

const MONTHS = [
  { id: 1, name: "Jan" },
  { id: 2, name: "Feb" },
  { id: 3, name: "Mar" },
  { id: 4, name: "Apr" },
  { id: 5, name: "May" },
  { id: 6, name: "Jun" },
  { id: 7, name: "Jul" },
  { id: 8, name: "Aug" },
  { id: 9, name: "Sep" },
  { id: 10, name: "Oct" },
  { id: 11, name: "Nov" },
  { id: 12, name: "Dec" },
];

const YEARS = [2024, 2025, 2026, 2027];

const DEFAULT_SECTORS: SectorItem[] = [
  { id: "all", title: "All Sectors" },
  { id: "car-washing", title: "🚗 Car Wash" },
  { id: "building-cleaning", title: "🏢 Building Clean" },
  { id: "laundry", title: "👕 Laundry" },
  { id: "hvac", title: "❄️ HVAC" },
];

const STORAGE_DOWNLOAD_HISTORY_KEY = "@clean_et_download_history";

export default function ExecutiveReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "super_admin";
  const divisionTitle = user?.tenant?.business_name || "Sector Division";

  const {
    tenants,
    generateFilteredReport,
    getFilteredReportHtml,
  } = useSuperAdmin();

  // Dynamic Sectors list
  const [sectors, setSectors] = useState<SectorItem[]>(DEFAULT_SECTORS);

  // Filters State
  const [timeframe, setTimeframe] = useState<"monthly" | "annual" | "custom">("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | number>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Report Data State
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Search in itemized transactions
  const [searchQuery, setSearchQuery] = useState("");

  // Downloaded Statements History
  const [downloadHistory, setDownloadHistory] = useState<DownloadedStatement[]>([]);

  // Load custom sectors from AsyncStorage and tenants
  useEffect(() => {
    async function loadSectors() {
      try {
        const stored = await AsyncStorage.getItem("@clean_et_custom_sectors");
        const map = new Map<string, SectorItem>();
        DEFAULT_SECTORS.forEach((s) => map.set(s.id, s));

        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach((item: any) => {
              if (item?.id) {
                map.set(item.id, {
                  id: item.id,
                  title: item.title || item.name || item.id,
                });
              }
            });
          }
        }

        if (Array.isArray(tenants)) {
          tenants.forEach((t: any) => {
            (t.categories_enabled || []).forEach((cat: string) => {
              if (!map.has(cat)) {
                map.set(cat, {
                  id: cat,
                  title: cat
                    .split("-")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" "),
                });
              }
            });
          });
        }

        setSectors(Array.from(map.values()));
      } catch (e) {
        console.log("Error loading dynamic sectors:", e);
      }
    }
    loadSectors();
  }, [tenants]);

  // Load Download History from AsyncStorage
  useEffect(() => {
    async function loadHistory() {
      try {
        const historyJson = await AsyncStorage.getItem(STORAGE_DOWNLOAD_HISTORY_KEY);
        if (historyJson) {
          const parsed = JSON.parse(historyJson);
          if (Array.isArray(parsed)) {
            setDownloadHistory(parsed);
          }
        }
      } catch (e) {
        console.log("Error loading download history:", e);
      }
    }
    loadHistory();
  }, []);

  const addDownloadedStatement = async (statement: Omit<DownloadedStatement, "id" | "timestamp">) => {
    const newEntry: DownloadedStatement = {
      ...statement,
      id: `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toLocaleDateString("en-ET", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setDownloadHistory((prev) => {
      const updated = [newEntry, ...prev.slice(0, 19)]; // Keep latest 20
      AsyncStorage.setItem(STORAGE_DOWNLOAD_HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const clearDownloadHistory = async () => {
    Alert.alert("Clear Statement History", "Are you sure you want to clear your local download statement log?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          setDownloadHistory([]);
          await AsyncStorage.removeItem(STORAGE_DOWNLOAD_HISTORY_KEY);
        },
      },
    ]);
  };

  const removeHistoryItem = async (id: string) => {
    setDownloadHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      AsyncStorage.setItem(STORAGE_DOWNLOAD_HISTORY_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        timeframe,
        year: selectedYear,
        month: selectedMonth,
        tenant_id: selectedTenantId,
        category: selectedCategory,
      };

      if (timeframe === "custom") {
        params.start_date = startDate;
        params.end_date = endDate;
      }

      if (isSuperAdmin) {
        const res = await generateFilteredReport(params);
        // apiFetch automatically unboxes response.data.data -> res is already the payload
        const raw = (res as any)?.data ?? res;
        setReportData({
          ...raw,
          is_super_admin: true,
        });
      } else {
        // Sector Admin: attempt to fetch from backend unified endpoint first
        try {
          const res = await API.get("/reports/generate", { params });
          const raw = res.data?.data ?? res.data;
          if (raw && raw.summary) {
            setReportData({
              ...raw,
              is_super_admin: false,
            });
            setLoading(false);
            return;
          }
        } catch {
          // Fall back gracefully to scoped client calculation
        }

        const [bRes, stRes, srvRes] = await Promise.allSettled([
          API.get("/bookings"),
          API.get("/staff"),
          API.get("/services"),
        ]);

        const bookingsList =
          bRes.status === "fulfilled"
            ? Array.isArray(bRes.value.data)
              ? bRes.value.data
              : bRes.value.data?.data ?? []
            : [];
        const staffList =
          stRes.status === "fulfilled"
            ? Array.isArray(stRes.value.data)
              ? stRes.value.data
              : stRes.value.data?.data ?? []
            : [];
        const servicesList =
          srvRes.status === "fulfilled"
            ? Array.isArray(srvRes.value.data)
              ? srvRes.value.data
              : srvRes.value.data?.data ?? []
            : [];

        // Apply Timeframe & Category Filters
        const filteredBookings = bookingsList.filter((b: any) => {
          if (selectedCategory !== "all") {
            const cat = selectedCategory.toLowerCase();
            const serviceCat = (b.service?.category || b.sector?.slug || "").toLowerCase();
            if (!serviceCat.includes(cat)) return false;
          }

          const rawDate = b.booking_date || b.created_at;
          if (!rawDate) return true;
          const bDate = new Date(rawDate);
          if (isNaN(bDate.getTime())) return true;

          if (timeframe === "monthly") {
            return bDate.getFullYear() === selectedYear && bDate.getMonth() + 1 === selectedMonth;
          }
          if (timeframe === "annual") {
            return bDate.getFullYear() === selectedYear;
          }
          if (timeframe === "custom") {
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59);
            return bDate >= start && bDate <= end;
          }
          return true;
        });

        // Completed jobs include both 'completed' and 'invoiced'
        const completed = filteredBookings.filter((b: any) =>
          ["completed", "invoiced"].includes(String(b.status || "").toLowerCase())
        );
        const gmv = completed.reduce(
          (sum: number, b: any) => sum + Number(b.price || b.service?.price || 0),
          0
        );

        setReportData({
          period_title: `${divisionTitle} Financial Statement`,
          sector_name: divisionTitle,
          is_super_admin: false,
          currency: "ETB",
          summary: {
            gmv: gmv,
            completed_jobs: completed.length,
            total_jobs: filteredBookings.length,
            total_orders: filteredBookings.length,
            staff_count: staffList.length,
            services_count: servicesList.length,
          },
          items: filteredBookings.map((b: any) => ({
            id: b.id,
            service_name: b.service?.name || "Service Offering",
            sub_center: (b.service as any)?.sub_center || "station-center",
            customer_name: b.customer?.name || b.customer?.user?.name || b.user?.name || "Client Account",
            phone: b.customer?.phone || b.customer?.user?.phone || b.user?.phone || "",
            date: b.booking_date || "Today",
            booking_time: b.booking_time || "",
            address: b.requirement_data?.service_location || b.address || "",
            status: b.status || "pending",
            gross_amount: Number(b.price || b.service?.price || 0),
          })),
        });
      }
    } catch (e: any) {
      console.log("Report fetch error:", e);
      Alert.alert("Report Error", "Failed to compile sector report data. Showing cached statement.");
    } finally {
      setLoading(false);
    }
  }, [
    isSuperAdmin,
    divisionTitle,
    timeframe,
    selectedYear,
    selectedMonth,
    startDate,
    endDate,
    selectedTenantId,
    selectedCategory,
    generateFilteredReport,
  ]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Set quick custom date presets
  const applyDatePreset = (preset: "today" | "last7" | "thisMonth" | "ytd") => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "last7") {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === "ytd") {
      const firstDay = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    }
  };

  // Filtered transactions for search
  const displayedItems = useMemo(() => {
    const list = reportData?.items || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((item: any) => {
      const name = (item.customer_name || "").toLowerCase();
      const phone = (item.phone || "").toLowerCase();
      const service = (item.service_name || "").toLowerCase();
      const id = String(item.id || "");
      const status = (item.status || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || service.includes(q) || id.includes(q) || status.includes(q);
    });
  }, [reportData, searchQuery]);

  // Handle Export Filtered CSV
  const handleExportFilteredCSV = async () => {
    setExportingCsv(true);
    try {
      const items = reportData?.items || [];
      if (items.length === 0) {
        return Alert.alert("No Data", "There are no transactions in the current report view to export.");
      }

      const headers = [
        "Booking ID",
        "Date",
        "Time Slot",
        "Customer Name",
        "Customer Phone",
        "Service Offering",
        "Sub-Center",
        "Gross Amount (ETB)",
        "Status",
        "Service Address",
      ];

      const rows = items.map((item: any) => [
        `#BK-${item.id}`,
        `"${item.date || ""}"`,
        `"${item.booking_time || ""}"`,
        `"${(item.customer_name || "Client").replace(/"/g, '""')}"`,
        `"${item.phone || ""}"`,
        `"${(item.service_name || "Service").replace(/"/g, '""')}"`,
        `"${(item.sub_center || "station").replace(/"/g, '""')}"`,
        Number(item.gross_amount || 0).toFixed(2),
        `"${(item.status || "pending").toUpperCase()}"`,
        `"${(item.address || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const titleTag = (reportData?.period_title || "Statement").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const filename = `cleanet_report_${titleTag}_${Date.now()}.csv`;

      downloadCsvFile(csvContent, filename);

      const totalAmt = items.reduce((sum: number, it: any) => sum + Number(it.gross_amount || 0), 0);

      // Save to Download History
      await addDownloadedStatement({
        title: `${reportData?.period_title || "Executive Statement"} (Filtered CSV)`,
        filename,
        type: "csv",
        recordsCount: items.length,
        totalAmount: totalAmt,
        summary: `${items.length} records • Total ETB ${totalAmt.toLocaleString("en-ET", { minimumFractionDigits: 2 })}`,
        csvContent,
      });

      Alert.alert(
        "🎉 Statement Exported",
        `Downloaded as ${filename}.\n\nA permanent record has been logged in the "Downloaded Statements" section below.`
      );
    } catch (e: any) {
      Alert.alert("Export Error", e?.message || "Failed to export filtered statement CSV.");
    } finally {
      setExportingCsv(false);
    }
  };

  // Handle Export Full Platform/Division Ledger CSV
  const handleExportFullLedgerCSV = async () => {
    setExportingCsv(true);
    try {
      const bRes = await API.get("/bookings");
      const bookingsList = Array.isArray(bRes.data) ? bRes.data : bRes.data?.data ?? [];
      if (bookingsList.length === 0) {
        return Alert.alert("No Data", "There are no bookings recorded to export.");
      }

      const headers = [
        "Booking ID",
        "Customer Name",
        "Customer Phone",
        "Service Offering",
        "Sub-Center Station",
        "Price (ETB)",
        "Status",
        "Date",
        "Time Slot",
        "Address",
      ];
      const rows = bookingsList.map((b: any) => [
        `#${b.id}`,
        `"${(b.customer?.name || b.customer?.user?.name || b.user?.name || "Client").replace(/"/g, '""')}"`,
        `"${b.customer?.phone || b.customer?.user?.phone || b.user?.phone || ""}"`,
        `"${(b.service?.name || "Service Clean").replace(/"/g, '""')}"`,
        `"${(b.service?.sub_center || "station-center").replace(/"/g, '""')}"`,
        Number(b.price || b.service?.price || 0).toFixed(2),
        `"${(b.status || "pending").toUpperCase()}"`,
        b.booking_date || "Today",
        b.booking_time || "",
        `"${(b.requirement_data?.service_location || b.address || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const filename = `cleanet_${divisionTitle.toLowerCase().replace(/\s+/g, "_")}_full_ledger_${Date.now()}.csv`;
      downloadCsvFile(csvContent, filename);

      const totalAmt = bookingsList.reduce((sum: number, b: any) => sum + Number(b.price || b.service?.price || 0), 0);

      await addDownloadedStatement({
        title: `Full Master Ledger - ${divisionTitle}`,
        filename,
        type: "csv",
        recordsCount: bookingsList.length,
        totalAmount: totalAmt,
        summary: `Complete booking ledger • ${bookingsList.length} total entries`,
        csvContent,
      });

      Alert.alert(
        "🎉 Master Ledger Downloaded",
        `Exported as ${filename}.\n\nLogged in the Downloaded Statements section below.`
      );
    } catch (e: any) {
      Alert.alert("Export Error", e?.message || "Failed to export ledger CSV.");
    } finally {
      setExportingCsv(false);
    }
  };

  // Handle Export Sub-Center Station CSV
  const handleExportSubCenterCSV = async () => {
    try {
      const bRes = await API.get("/bookings");
      const bookingsList = Array.isArray(bRes.data) ? bRes.data : bRes.data?.data ?? [];
      const subCenterStats: Record<string, { label: string; rev: number; count: number }> = {
        "corporate-fleet": { label: "Corporate Fleet Wash Center", rev: 0, count: 0 },
        "mobile-doorstep": { label: "Home-to-Home Doorstep Center", rev: 0, count: 0 },
        "valet-pickup": { label: "Valet Pickup & Drop Center", rev: 0, count: 0 },
        "bay-wash": { label: "Standard Bay Station Center", rev: 0, count: 0 },
        "exterior-facade": { label: "Exterior High-Rise Glass Center", rev: 0, count: 0 },
        "interior-deep": { label: "Interior Deep Sanitization Center", rev: 0, count: 0 },
      };

      let totalRev = 0;
      bookingsList.forEach((b: any) => {
        const sub = (b.service as any)?.sub_center || "corporate-fleet";
        if (subCenterStats[sub]) {
          subCenterStats[sub].count += 1;
          if (["completed", "invoiced"].includes(String(b.status).toLowerCase())) {
            const p = Number(b.price || b.service?.price || 0);
            subCenterStats[sub].rev += p;
            totalRev += p;
          }
        }
      });

      const headers = ["Station ID", "Sub-Center Branch Title", "Total Orders", "Gross Revenue (ETB)", "Revenue Contribution %"];
      const rows = Object.entries(subCenterStats).map(([key, item]) => {
        const pct = totalRev > 0 ? Math.round((item.rev / totalRev) * 100) : 0;
        return [key, `"${item.label}"`, item.count, item.rev.toFixed(2), `${pct}%`];
      });

      const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const filename = `cleanet_${divisionTitle.toLowerCase().replace(/\s+/g, "_")}_subcenters_${Date.now()}.csv`;
      downloadCsvFile(csvContent, filename);

      await addDownloadedStatement({
        title: `Sub-Center Station Analytics - ${divisionTitle}`,
        filename,
        type: "csv",
        recordsCount: Object.keys(subCenterStats).length,
        totalAmount: totalRev,
        summary: `Performance analytics across ${Object.keys(subCenterStats).length} station branches`,
        csvContent,
      });

      Alert.alert("🎉 CSV Downloaded", `Sub-center station analytics saved to history.`);
    } catch (e: any) {
      Alert.alert("Export Error", "Failed to export sub-center CSV.");
    }
  };

  // Handle Export Crew Audit CSV
  const handleExportCrewAuditCSV = async () => {
    try {
      const stRes = await API.get("/staff");
      const staffList = Array.isArray(stRes.data) ? stRes.data : stRes.data?.data ?? [];
      const headers = ["Technician ID", "Technician Full Name", "Designation", "Availability Status", "Assigned Phone"];
      const rows = staffList.map((s: any) => [
        `TECH-#${s.id}`,
        `"${s.user?.name || s.name || "Technician"}"`,
        `"${s.role_title || s.specialization || "Field Tech"}"`,
        `"${(s.availability_status || "available").toUpperCase()}"`,
        `"${s.user?.phone || s.phone || ""}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const filename = `cleanet_${divisionTitle.toLowerCase().replace(/\s+/g, "_")}_crew_audit_${Date.now()}.csv`;
      downloadCsvFile(csvContent, filename);

      await addDownloadedStatement({
        title: `Field Crew Fulfillment Audit - ${divisionTitle}`,
        filename,
        type: "csv",
        recordsCount: staffList.length,
        totalAmount: 0,
        summary: `${staffList.length} technicians roster and compliance audit`,
        csvContent,
      });

      Alert.alert("🎉 CSV Downloaded", `Crew roster audit log saved to history.`);
    } catch (e: any) {
      Alert.alert("Export Error", "Failed to export crew audit CSV.");
    }
  };

  // Handle Export Printable / PDF Statement
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      let html = "";
      if (isSuperAdmin) {
        const params: any = {
          timeframe,
          year: selectedYear,
          month: selectedMonth,
          tenant_id: selectedTenantId,
          category: selectedCategory,
        };
        if (timeframe === "custom") {
          params.start_date = startDate;
          params.end_date = endDate;
        }
        html = await getFilteredReportHtml(params);
      } else {
        const dateStr = new Date().toLocaleDateString("en-ET", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        const items = reportData?.items || [];
        const gmv = reportData?.summary?.gmv || 0;
        const completedJobs = reportData?.summary?.completed_jobs || 0;
        const staffCount = reportData?.summary?.staff_count || 0;

        html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Executive Statement - ${divisionTitle}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 32px; color: #0F172A; background: #FFF; margin: 0; }
              .header { border-bottom: 3px solid #10B981; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
              .title { font-size: 24px; font-weight: 800; color: #064E3B; margin: 0; }
              .subtitle { font-size: 13px; color: #64748B; margin-top: 4px; }
              .kpi-row { display: flex; gap: 16px; margin-bottom: 28px; }
              .kpi-card { flex: 1; border: 1px solid #E2E8F0; padding: 14px; border-radius: 10px; background: #F8FAFC; }
              .kpi-label { font-size: 10px; color: #64748B; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
              .kpi-val { font-size: 20px; font-weight: 800; color: #059669; margin-top: 4px; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
              th { background: #0F172A; color: #FFF; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; }
              td { border-bottom: 1px solid #E2E8F0; padding: 10px; }
              .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; }
              .badge-completed { background: #DCFCE7; color: #166534; }
              .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; text-align: center; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="title">🏢 ${divisionTitle.toUpperCase()}</div>
                <div class="subtitle">Official Executive Financial Statement & Sector Audit &bull; ${dateStr}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 800; color: #059669;">Clean.et Certified Ledger</div>
                <div style="font-size: 11px; color: #64748B;">Confidential Division Record</div>
              </div>
            </div>

            <div class="kpi-row">
              <div class="kpi-card">
                <div class="kpi-label">Gross Revenue (GMV)</div>
                <div class="kpi-val">ETB ${Number(gmv).toLocaleString("en-ET", { minimumFractionDigits: 2 })}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Completed Orders</div>
                <div class="kpi-val" style="color: #2563EB;">${completedJobs} Orders</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Field Technicians</div>
                <div class="kpi-val" style="color: #7C3AED;">${staffCount} Crew</div>
              </div>
            </div>

            <h3 style="margin-bottom: 8px;">📋 Itemized Booking Ledger</h3>
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Service Offering</th>
                  <th>Sub-Center</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th style="text-align: right;">Gross (ETB)</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (b: any) => `
                  <tr>
                    <td><strong>#${b.id}</strong></td>
                    <td>${b.customer_name}</td>
                    <td>${b.phone || "-"}</td>
                    <td>${b.service_name}</td>
                    <td>${(b.sub_center || "station").replace("-", " ").toUpperCase()}</td>
                    <td>${b.date}</td>
                    <td><span class="badge badge-completed">${(b.status || "pending").toUpperCase()}</span></td>
                    <td style="text-align: right; font-weight: bold; color: #059669;">
                      ETB ${Number(b.gross_amount).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>

            <div class="footer">
              Generated via Clean.et Enterprise Multi-Tenant Platform &bull; Valid without physical signature.
            </div>
          </body>
          </html>
        `;
      }

      openPrintableReceipt(html);

      const items = reportData?.items || [];
      const gmv = reportData?.summary?.gmv || 0;

      await addDownloadedStatement({
        title: `${reportData?.period_title || "Executive Statement"} (Printable PDF)`,
        filename: `statement_${Date.now()}.pdf`,
        type: "pdf",
        recordsCount: items.length,
        totalAmount: Number(gmv),
        summary: `Printable certified PDF statement • ${items.length} itemized bookings`,
        pdfHtml: html,
      });

      Alert.alert(
        "🎉 PDF Generated",
        `Print dialog opened.\n\nLogged in the Downloaded Statements section below.`
      );
    } catch (e: any) {
      Alert.alert("Export Error", e?.message || "Failed to generate printable report.");
    } finally {
      setExportingPdf(false);
    }
  };

  // Safe KPI helper values
  const gmvValue = Number(reportData?.summary?.gmv || 0);
  const platformFeeValue = Number(reportData?.summary?.platform_commission || 0);
  const netVendorDisbursedValue = Number(reportData?.summary?.net_vendor_disbursed || 0);
  const completedJobsValue = Number(reportData?.summary?.completed_jobs || 0);
  const totalJobsValue = Number(reportData?.summary?.total_jobs || completedJobsValue);
  const staffCountValue = Number(reportData?.summary?.staff_count || 0);
  const servicesCountValue = Number(reportData?.summary?.services_count || 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(admin)/(tabs)/dashboard");
          }}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={20} color="#FFF" />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isSuperAdmin ? "👑 Enterprise Governance & Reports" : `🏢 ${divisionTitle} Reports`}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? "Platform-wide financial auditing, commission settlements & sector ledgers"
              : `Financial performance, booking ledgers & certified downloads for ${divisionTitle}`}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchReport} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <Ionicons name="refresh" size={18} color="#60A5FA" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ── FILTER TOOLBAR CARD ── */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.filterCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="options-outline" size={18} color="#10B981" />
              <Text style={styles.filterCardTitle}>Filter Parameters</Text>
            </View>
            {!isSuperAdmin ? (
              <View style={styles.scopeBadge}>
                <Ionicons name="location-sharp" size={12} color="#34D399" />
                <Text style={styles.scopeBadgeText}>{divisionTitle}</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setTimeframe("monthly");
                  setSelectedYear(new Date().getFullYear());
                  setSelectedMonth(new Date().getMonth() + 1);
                  setSelectedTenantId("all");
                  setSelectedCategory("all");
                }}
                style={styles.resetBtn}
              >
                <Ionicons name="reload" size={12} color="#94A3B8" />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Timeframe Mode Selector */}
          <Text style={styles.inputLabel}>TIMEFRAME MODE</Text>
          <View style={styles.pillRow}>
            {(["monthly", "annual", "custom"] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.pillBtn, timeframe === mode && styles.pillBtnActive]}
                onPress={() => setTimeframe(mode)}
              >
                <Text style={[styles.pillText, timeframe === mode && styles.pillTextActive]}>
                  {mode === "monthly" ? "📅 Monthly" : mode === "annual" ? "📊 Annual" : "⚡ Custom Range"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Year selector */}
          <Text style={styles.inputLabel}>SELECT YEAR</Text>
          <View style={styles.pillRow}>
            {YEARS.map((y) => (
              <TouchableOpacity
                key={y}
                style={[styles.pillBtn, selectedYear === y && styles.pillBtnActive]}
                onPress={() => setSelectedYear(y)}
              >
                <Text style={[styles.pillText, selectedYear === y && styles.pillTextActive]}>{y}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Month selector (if monthly mode) */}
          {timeframe === "monthly" && (
            <>
              <Text style={styles.inputLabel}>SELECT MONTH</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                {MONTHS.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.pillBtn, selectedMonth === m.id && styles.pillBtnActive]}
                    onPress={() => setSelectedMonth(m.id)}
                  >
                    <Text style={[styles.pillText, selectedMonth === m.id && styles.pillTextActive]}>{m.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Custom Date Inputs (if custom mode) */}
          {timeframe === "custom" && (
            <View style={{ marginTop: 6 }}>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                <TouchableOpacity onPress={() => applyDatePreset("today")} style={styles.presetBtn}>
                  <Text style={styles.presetText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => applyDatePreset("last7")} style={styles.presetBtn}>
                  <Text style={styles.presetText}>Last 7d</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => applyDatePreset("thisMonth")} style={styles.presetBtn}>
                  <Text style={styles.presetText}>This Month</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => applyDatePreset("ytd")} style={styles.presetBtn}>
                  <Text style={styles.presetText}>YTD</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>START DATE (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="2026-01-01"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>END DATE (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="2026-12-31"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Super Admin Division Selector */}
          {isSuperAdmin && (
            <>
              <Text style={styles.inputLabel}>SERVICE DIVISION / TENANT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                <TouchableOpacity
                  style={[styles.pillBtn, selectedTenantId === "all" && styles.pillBtnActive]}
                  onPress={() => setSelectedTenantId("all")}
                >
                  <Text style={[styles.pillText, selectedTenantId === "all" && styles.pillTextActive]}>
                    🏢 All Divisions
                  </Text>
                </TouchableOpacity>

                {tenants.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.pillBtn, selectedTenantId === t.id && styles.pillBtnActive]}
                    onPress={() => setSelectedTenantId(t.id)}
                  >
                    <Text style={[styles.pillText, selectedTenantId === t.id && styles.pillTextActive]}>
                      {t.business_name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Sector Category Selector (Dynamic from Super Admin created sectors) */}
          <Text style={styles.inputLabel}>SECTOR CATEGORY</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            {sectors.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.pillBtn, selectedCategory === s.id && styles.pillBtnActive]}
                onPress={() => setSelectedCategory(s.id)}
              >
                <Text style={[styles.pillText, selectedCategory === s.id && styles.pillTextActive]}>
                  {s.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── REPORT CONTENT ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={{ color: "#94A3B8", marginTop: 10, fontSize: 13, fontWeight: "600" }}>
              Compiling real-time sector intelligence...
            </Text>
          </View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* Report Header Title */}
            <View style={styles.reportHeaderCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportTitle}>{reportData?.period_title || "Executive Financial Statement"}</Text>
                  <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 3 }}>
                    {isSuperAdmin
                      ? `Platform Commission Rate: ${reportData?.commission_rate || 10}% • Currency: ${reportData?.currency || "ETB"}`
                      : `Certified Financial Statement & Operational Audit for ${divisionTitle}`}
                  </Text>
                </View>
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>AUDITED</Text>
                </View>
              </View>
            </View>

            {/* ── 4 EXECUTIVE KPI CARDS ── */}
            <View style={styles.kpiGrid}>
              {isSuperAdmin ? (
                <>
                  {/* Card 1: Gross GMV */}
                  <View style={[styles.kpiCard, { borderColor: "#10B98144" }]}>
                    <View style={styles.kpiHeaderRow}>
                      <Text style={styles.kpiLabel}>GROSS GMV REVENUE</Text>
                      <Ionicons name="cash-outline" size={16} color="#10B981" />
                    </View>
                    <Text style={styles.kpiValue}>
                      ETB {gmvValue.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={styles.kpiSub}>Total merchandise value</Text>
                  </View>

                  {/* Card 2: Commission Fee */}
                  <View style={[styles.kpiCard, { borderColor: "#EF444444" }]}>
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.kpiLabel, { color: "#F87171" }]}>PLATFORM COMMISSION</Text>
                      <Ionicons name="pie-chart-outline" size={16} color="#F87171" />
                    </View>
                    <Text style={[styles.kpiValue, { color: "#F87171" }]}>
                      ETB {platformFeeValue.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={styles.kpiSub}>{reportData?.commission_rate || 10}% Platform fee share</Text>
                  </View>

                  {/* Card 3: Net Disbursed */}
                  <View style={[styles.kpiCard, { borderColor: "#34D39944" }]}>
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.kpiLabel, { color: "#34D399" }]}>NET VENDOR DISBURSED</Text>
                      <Ionicons name="wallet-outline" size={16} color="#34D399" />
                    </View>
                    <Text style={[styles.kpiValue, { color: "#34D399" }]}>
                      ETB {netVendorDisbursedValue.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={styles.kpiSub}>Net payout to divisions</Text>
                  </View>

                  {/* Card 4: Completed Jobs */}
                  <View style={[styles.kpiCard, { borderColor: "#3B82F644" }]}>
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.kpiLabel, { color: "#60A5FA" }]}>COMPLETED JOBS</Text>
                      <Ionicons name="checkmark-done-circle-outline" size={16} color="#60A5FA" />
                    </View>
                    <Text style={[styles.kpiValue, { color: "#60A5FA" }]}>
                      {completedJobsValue} <Text style={{ fontSize: 13, color: "#94A3B8" }}>/ {totalJobsValue} Total</Text>
                    </Text>
                    <Text style={styles.kpiSub}>100% Fulfilled orders</Text>
                  </View>
                </>
              ) : (
                <>
                  {/* Sector Admin Card 1: Gross Revenue */}
                  <View style={[styles.kpiCard, { borderColor: "#10B98144" }]}>
                    <View style={styles.kpiHeaderRow}>
                      <Text style={styles.kpiLabel}>SECTOR GROSS REVENUE</Text>
                      <Ionicons name="cash-outline" size={16} color="#10B981" />
                    </View>
                    <Text style={styles.kpiValue}>
                      ETB {gmvValue.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={styles.kpiSub}>Completed & Invoiced revenue</Text>
                  </View>

                  {/* Sector Admin Card 2: Completed Orders */}
                  <View style={[styles.kpiCard, { borderColor: "#3B82F644" }]}>
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.kpiLabel, { color: "#60A5FA" }]}>FULFILLED ORDERS</Text>
                      <Ionicons name="checkmark-done-circle-outline" size={16} color="#60A5FA" />
                    </View>
                    <Text style={[styles.kpiValue, { color: "#60A5FA" }]}>
                      {completedJobsValue} <Text style={{ fontSize: 13, color: "#94A3B8" }}>/ {totalJobsValue} Jobs</Text>
                    </Text>
                    <Text style={styles.kpiSub}>Division fulfillment rate</Text>
                  </View>

                  {/* Sector Admin Card 3: Technicians */}
                  <View style={[styles.kpiCard, { borderColor: "#A78BFA44" }]}>
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.kpiLabel, { color: "#A78BFA" }]}>ACTIVE TECHNICIANS</Text>
                      <Ionicons name="construct-outline" size={16} color="#A78BFA" />
                    </View>
                    <Text style={[styles.kpiValue, { color: "#A78BFA" }]}>
                      {staffCountValue} <Text style={{ fontSize: 13, color: "#94A3B8" }}>Crew</Text>
                    </Text>
                    <Text style={styles.kpiSub}>On-duty field technicians</Text>
                  </View>

                  {/* Sector Admin Card 4: Services */}
                  <View style={[styles.kpiCard, { borderColor: "#F59E0B44" }]}>
                    <View style={styles.kpiHeaderRow}>
                      <Text style={[styles.kpiLabel, { color: "#FBBF24" }]}>SERVICE CATALOG</Text>
                      <Ionicons name="layers-outline" size={16} color="#FBBF24" />
                    </View>
                    <Text style={[styles.kpiValue, { color: "#FBBF24" }]}>
                      {servicesCountValue} <Text style={{ fontSize: 13, color: "#94A3B8" }}>Active</Text>
                    </Text>
                    <Text style={styles.kpiSub}>Deployed sector offerings</Text>
                  </View>
                </>
              )}
            </View>

            {/* ── EXPORT ACTION TOOLBAR ── */}
            <View style={styles.exportToolbar}>
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: "#064E3B", borderColor: "#10B98177" }]}
                onPress={handleExportFilteredCSV}
                disabled={exportingCsv}
              >
                {exportingCsv ? (
                  <ActivityIndicator color="#34D399" size="small" />
                ) : (
                  <Ionicons name="download-outline" size={18} color="#34D399" />
                )}
                <Text style={[styles.exportBtnText, { color: "#34D399" }]}>Download Filtered CSV</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: "#1E3A8A", borderColor: "#3B82F677" }]}
                onPress={handleExportPdf}
                disabled={exportingPdf}
              >
                {exportingPdf ? (
                  <ActivityIndicator color="#60A5FA" size="small" />
                ) : (
                  <Ionicons name="print-outline" size={18} color="#60A5FA" />
                )}
                <Text style={[styles.exportBtnText, { color: "#60A5FA" }]}>Print / PDF Statement</Text>
              </TouchableOpacity>
            </View>

            {/* ── ADDITIONAL COMPREHENSIVE EXPORTS ── */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>
                📑 Specialized Financial & Operational Statements
              </Text>

              <View style={{ gap: 8 }}>
                <TouchableOpacity onPress={handleExportFullLedgerCSV} style={styles.statementRow}>
                  <Ionicons name="document-text" size={20} color="#34D399" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statementTitle}>
                      📄 Master Financial Booking Ledger (.CSV)
                    </Text>
                    <Text style={styles.statementSub}>Complete booking log with customer names, phones, prices & status.</Text>
                  </View>
                  <Ionicons name="download-outline" size={18} color="#34D399" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleExportSubCenterCSV} style={styles.statementRow}>
                  <Ionicons name="business" size={20} color="#60A5FA" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statementTitle}>🏬 Sub-Center Station Analytics (.CSV)</Text>
                    <Text style={styles.statementSub}>Branch-by-branch revenue contribution & booking volume breakdown.</Text>
                  </View>
                  <Ionicons name="download-outline" size={18} color="#60A5FA" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleExportCrewAuditCSV} style={styles.statementRow}>
                  <Ionicons name="construct" size={20} color="#A78BFA" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statementTitle}>👷 Field Crew Fulfillment Audit (.CSV)</Text>
                    <Text style={styles.statementSub}>Technician roster, phone contacts & real-time availability status.</Text>
                  </View>
                  <Ionicons name="download-outline" size={18} color="#A78BFA" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── SUPER ADMIN ONLY: DEPARTMENT BREAKDOWN ── */}
            {isSuperAdmin && reportData?.department_breakdown?.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionCardTitle}>🏢 Division / Department Performance</Text>
                {reportData.department_breakdown.map((dept: any) => (
                  <View key={dept.tenant_id} style={styles.deptRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>{dept.department_name}</Text>
                      <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                        {dept.completed_jobs} Completed Jobs &bull; Commission Fee: ETB {Number(dept.platform_fee).toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: "#34D399", fontWeight: "800", fontSize: 14 }}>
                        ETB {Number(dept.gmv).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={{ color: "#A7F3D0", fontSize: 10, fontWeight: "700" }}>
                        Net: ETB {Number(dept.net_disbursed).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── ITEMIZED TRANSACTIONS PREVIEW TABLE ── */}
            <View style={styles.sectionCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={styles.sectionCardTitle}>
                  📋 Itemized {isSuperAdmin ? "Platform" : divisionTitle} Ledger ({displayedItems.length})
                </Text>
              </View>

              {/* Quick Search */}
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={16} color="#64748B" />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by customer, phone, service, ID..."
                  placeholderTextColor="#64748B"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {displayedItems.length === 0 ? (
                <View style={{ padding: 24, alignItems: "center" }}>
                  <Ionicons name="document-text-outline" size={40} color="#475569" />
                  <Text style={{ color: "#94A3B8", marginTop: 8, fontSize: 13, fontWeight: "600" }}>
                    No bookings found matching the current criteria.
                  </Text>
                </View>
              ) : (
                displayedItems.map((item: any) => (
                  <View key={item.id} style={styles.tableRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>
                          #{item.id} &bull; {item.service_name}
                        </Text>
                        <View style={[styles.statusTag, item.status === "invoiced" ? styles.statusInvoiced : styles.statusCompleted]}>
                          <Text style={styles.statusTagText}>{(item.status || "completed").toUpperCase()}</Text>
                        </View>
                      </View>
                      <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 3 }}>
                        👤 {item.customer_name} {item.phone ? `(${item.phone})` : ""} &bull; 🗓️ {item.date}
                      </Text>
                      {item.address ? (
                        <Text style={{ color: "#64748B", fontSize: 10, marginTop: 1 }}>
                          📍 {item.address}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: "#34D399", fontWeight: "800", fontSize: 14 }}>
                        ETB {Number(item.gross_amount || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                      </Text>
                      <Text style={{ color: "#64748B", fontSize: 10, marginTop: 1 }}>
                        {(item.sub_center || "station").replace("-", " ").toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* ── 📥 DOWNLOADED STATEMENTS & EXPORT HISTORY ── */}
            {/* User Request: "once download keep it in the page and buttom" */}
            <View style={[styles.sectionCard, { borderColor: "#10B98155", borderWidth: 1.5 }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={styles.historyBadge}>
                    <Ionicons name="folder-open" size={16} color="#10B981" />
                  </View>
                  <View>
                    <Text style={styles.sectionCardTitle}>
                      📥 Downloaded Statements & Export History
                    </Text>
                    <Text style={{ color: "#94A3B8", fontSize: 11 }}>
                      Locally preserved records of downloaded CSVs and printable receipts
                    </Text>
                  </View>
                </View>

                {downloadHistory.length > 0 && (
                  <TouchableOpacity onPress={clearDownloadHistory} style={styles.clearHistoryBtn}>
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    <Text style={styles.clearHistoryText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

              {downloadHistory.length === 0 ? (
                <View style={styles.emptyHistoryBox}>
                  <Ionicons name="cloud-download-outline" size={32} color="#334155" />
                  <Text style={styles.emptyHistoryTitle}>No Downloaded Statements Yet</Text>
                  <Text style={styles.emptyHistorySub}>
                    Any statement, full ledger, or printable PDF you export will automatically stay preserved right here for instant access.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {downloadHistory.map((stmt) => (
                    <View key={stmt.id} style={styles.historyCard}>
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                        <View style={[styles.fileTypeBadge, stmt.type === "pdf" ? styles.pdfBadge : styles.csvBadge]}>
                          <Ionicons
                            name={stmt.type === "pdf" ? "document-text" : "grid"}
                            size={16}
                            color={stmt.type === "pdf" ? "#60A5FA" : "#34D399"}
                          />
                          <Text style={[styles.fileTypeText, stmt.type === "pdf" ? { color: "#60A5FA" } : { color: "#34D399" }]}>
                            {stmt.type.toUpperCase()}
                          </Text>
                        </View>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.historyTitle}>{stmt.title}</Text>
                          <Text style={styles.historyFilename}>{stmt.filename}</Text>
                          <Text style={styles.historyMeta}>
                            🗓️ {stmt.timestamp} &bull; {stmt.summary}
                          </Text>
                        </View>

                        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                          <TouchableOpacity
                            onPress={() => {
                              if (stmt.type === "csv" && stmt.csvContent) {
                                downloadCsvFile(stmt.csvContent, stmt.filename);
                                Alert.alert("Re-downloading", `Saved ${stmt.filename} to downloads.`);
                              } else if (stmt.type === "pdf" && stmt.pdfHtml) {
                                openPrintableReceipt(stmt.pdfHtml);
                              } else {
                                Alert.alert("Statement", `${stmt.title}\n${stmt.summary}`);
                              }
                            }}
                            style={styles.reDownloadBtn}
                          >
                            <Ionicons name="download" size={14} color="#FFF" />
                            <Text style={styles.reDownloadText}>Open</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => removeHistoryItem(stmt.id)}
                            style={styles.deleteHistoryBtn}
                          >
                            <Ionicons name="close" size={14} color="#64748B" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0F19" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#1E293B",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#F8FAFC" },
  headerSubtitle: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  scrollContent: { padding: 16, paddingBottom: 40 },
  filterCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterCardTitle: { fontSize: 15, fontWeight: "800", color: "#F8FAFC" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  resetBtnText: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  scopeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B98122",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderColor: "#10B98155",
    borderWidth: 1,
    gap: 4,
  },
  scopeBadgeText: { color: "#34D399", fontSize: 10, fontWeight: "800" },
  inputLabel: { fontSize: 10, fontWeight: "800", color: "#94A3B8", marginTop: 12, marginBottom: 5 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pillBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  pillBtnActive: { backgroundColor: "#10B98122", borderColor: "#10B981" },
  pillText: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  pillTextActive: { color: "#34D399" },
  presetBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
  },
  presetText: { color: "#60A5FA", fontSize: 11, fontWeight: "700" },
  textInput: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#334155",
    fontSize: 12,
  },
  loadingBox: { padding: 40, alignItems: "center", justifyContent: "center" },
  reportHeaderCard: {
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  reportTitle: { fontSize: 17, fontWeight: "800", color: "#10B981" },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B98122",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: "#10B98155",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10B981" },
  liveText: { color: "#34D399", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    minWidth: "47%",
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  kpiHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kpiLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "800", letterSpacing: 0.5 },
  kpiValue: { fontSize: 17, fontWeight: "800", color: "#F8FAFC", marginTop: 6 },
  kpiSub: { fontSize: 10, color: "#64748B", marginTop: 2 },
  exportToolbar: { flexDirection: "row", gap: 10, marginBottom: 16 },
  exportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  exportBtnText: { fontSize: 12, fontWeight: "800" },
  sectionCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sectionCardTitle: { fontSize: 14, fontWeight: "800", color: "#F8FAFC" },
  statementRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 10,
  },
  statementTitle: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  statementSub: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  deptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0F172A",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
    gap: 8,
  },
  searchInput: { flex: 1, color: "#F8FAFC", fontSize: 12 },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  statusTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusCompleted: { backgroundColor: "#10B98122" },
  statusInvoiced: { backgroundColor: "#3B82F622" },
  statusTagText: { fontSize: 9, fontWeight: "800", color: "#34D399" },
  historyBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#10B98122",
    alignItems: "center",
    justifyContent: "center",
  },
  clearHistoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#EF444415",
    borderWidth: 1,
    borderColor: "#EF444433",
  },
  clearHistoryText: { color: "#EF4444", fontSize: 11, fontWeight: "700" },
  emptyHistoryBox: { padding: 24, alignItems: "center" },
  emptyHistoryTitle: { color: "#CBD5E1", fontSize: 13, fontWeight: "700", marginTop: 8 },
  emptyHistorySub: { color: "#64748B", fontSize: 11, textAlign: "center", marginTop: 4, lineHeight: 16 },
  historyCard: {
    backgroundColor: "#0F172A",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  fileTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minWidth: 44,
  },
  csvBadge: { backgroundColor: "#10B98115", borderWidth: 1, borderColor: "#10B98133" },
  pdfBadge: { backgroundColor: "#3B82F615", borderWidth: 1, borderColor: "#3B82F633" },
  fileTypeText: { fontSize: 9, fontWeight: "800" },
  historyTitle: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  historyFilename: { color: "#60A5FA", fontSize: 10, marginTop: 1 },
  historyMeta: { color: "#94A3B8", fontSize: 10, marginTop: 3 },
  reDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  reDownloadText: { color: "#FFF", fontSize: 10, fontWeight: "800" },
  deleteHistoryBtn: {
    padding: 5,
    borderRadius: 6,
    backgroundColor: "#1E293B",
  },
});
