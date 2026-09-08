import React, { useState, useEffect, useCallback } from "react";
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
import { useSuperAdmin } from "../../hooks/useSuperAdmin";
import { useAuth } from "../../contexts/AuthContext";
import { downloadCsvFile, openPrintableReceipt } from "../../src/utils/exportHelpers";
import API from "../../src/api/client";

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

const SECTORS = [
  { id: "all", title: "All Sectors" },
  { id: "car-washing", title: "🚗 Car Wash" },
  { id: "building-cleaning", title: "🏢 Building Clean" },
  { id: "laundry", title: "👕 Laundry" },
  { id: "hvac", title: "❄️ HVAC" },
];

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

  // Filters State
  const [timeframe, setTimeframe] = useState<"monthly" | "annual" | "custom">("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | number>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Report Data State
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
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

        const res = await generateFilteredReport(params);
        setReportData({
          ...res.data,
          is_super_admin: true,
        });
      } else {
        // Sector / Division Admin local report fetch (scoped to their tenant)
        const [bRes, stRes, srvRes] = await Promise.allSettled([
          API.get("/bookings"),
          API.get("/staff"),
          API.get("/services"),
        ]);

        const bookingsList = bRes.status === "fulfilled"
          ? (Array.isArray(bRes.value.data) ? bRes.value.data : (bRes.value.data?.data ?? []))
          : [];
        const staffList = stRes.status === "fulfilled"
          ? (Array.isArray(stRes.value.data) ? stRes.value.data : (stRes.value.data?.data ?? []))
          : [];
        const servicesList = srvRes.status === "fulfilled"
          ? (Array.isArray(srvRes.value.data) ? srvRes.value.data : (srvRes.value.data?.data ?? []))
          : [];

        // Apply Timeframe Date Filters
        const filteredBookings = bookingsList.filter((b: any) => {
          if (!b.booking_date) return true;
          const bDate = new Date(b.booking_date);
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
            return bDate >= start && bDate <= end;
          }
          return true;
        });

        const completed = filteredBookings.filter((b: any) => b.status === "completed");
        const gmv = completed.reduce((sum: number, b: any) => sum + Number(b.price || b.service?.price || 0), 0);

        setReportData({
          period_title: `${divisionTitle} Financial Statement`,
          sector_name: divisionTitle,
          is_super_admin: false,
          currency: "ETB",
          summary: {
            gmv: gmv,
            completed_jobs: completed.length,
            total_jobs: filteredBookings.length,
            staff_count: staffList.length,
            services_count: servicesList.length,
          },
          items: filteredBookings.map((b: any) => ({
            id: b.id,
            service_name: b.service?.name || "Service Offering",
            sub_center: (b.service as any)?.sub_center || "station-center",
            customer_name: b.customer?.name || b.customer?.user?.name || "Client Account",
            phone: b.customer?.phone || b.customer?.user?.phone || "",
            date: b.booking_date || "Today",
            status: b.status || "pending",
            gross_amount: b.price || b.service?.price || 0,
          })),
        });
      }
    } catch (e: any) {
      console.log("Report fetch error:", e);
      Alert.alert("Report Error", "Failed to compile sector report data.");
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

  const handleExportFullLedgerCSV = async () => {
    setExportingCsv(true);
    try {
      const bRes = await API.get("/bookings");
      const bookingsList = Array.isArray(bRes.data) ? bRes.data : (bRes.data?.data ?? []);
      if (bookingsList.length === 0) {
        return Alert.alert("No Data", "There are no bookings recorded to export.");
      }

      const headers = ["Booking ID", "Customer Name", "Customer Phone", "Service Offering", "Sub-Center Station", "Price (ETB)", "Status", "Date", "Time Slot", "Address"];
      const rows = bookingsList.map((b: any) => [
        `#${b.id}`,
        `"${b.customer?.name || b.customer?.user?.name || "Client"}"`,
        `"${b.customer?.phone || b.customer?.user?.phone || ""}"`,
        `"${b.service?.name || "Service Clean"}"`,
        `"${(b.service as any)?.sub_center || "corporate-fleet"}"`,
        b.price || b.service?.price || 0,
        b.status || "pending",
        b.booking_date || "Today",
        b.booking_time || "",
        `"${b.address || ""}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const filename = `cleanet_${divisionTitle.toLowerCase().replace(/\s+/g, "_")}_ledger_${Date.now()}.csv`;
      downloadCsvFile(csvContent, filename);
      Alert.alert("🎉 CSV Download Triggered", `Full ledger exported as ${filename}`);
    } catch (e: any) {
      Alert.alert("Export Error", e?.message || "Failed to export ledger CSV.");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportSubCenterCSV = async () => {
    try {
      const bRes = await API.get("/bookings");
      const bookingsList = Array.isArray(bRes.data) ? bRes.data : (bRes.data?.data ?? []);
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
          if (b.status === "completed") {
            const p = Number(b.price || b.service?.price || 0);
            subCenterStats[sub].rev += p;
            totalRev += p;
          }
        }
      });

      const headers = ["Station ID", "Sub-Center Branch Title", "Total Orders", "Gross Revenue (ETB)", "Revenue Contribution %"];
      const rows = Object.entries(subCenterStats).map(([key, item]) => {
        const pct = totalRev > 0 ? Math.round((item.rev / totalRev) * 100) : 0;
        return [key, `"${item.label}"`, item.count, item.rev, `${pct}%`];
      });

      const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const filename = `cleanet_${divisionTitle.toLowerCase().replace(/\s+/g, "_")}_subcenters_${Date.now()}.csv`;
      downloadCsvFile(csvContent, filename);
      Alert.alert("🎉 CSV Download Triggered", `Sub-Center performance statement exported as ${filename}`);
    } catch (e: any) {
      Alert.alert("Export Error", "Failed to export sub-center CSV.");
    }
  };

  const handleExportCrewAuditCSV = async () => {
    try {
      const stRes = await API.get("/staff");
      const staffList = Array.isArray(stRes.data) ? stRes.data : (stRes.data?.data ?? []);
      const headers = ["Technician ID", "Technician Full Name", "Designation", "Availability Status"];
      const rows = staffList.map((s: any) => [
        `TECH-#${s.id}`,
        `"${s.user?.name || "Technician"}"`,
        `"${s.role_title || "Field Tech"}"`,
        `"${s.availability_status || "available"}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const filename = `cleanet_${divisionTitle.toLowerCase().replace(/\s+/g, "_")}_crew_audit_${Date.now()}.csv`;
      downloadCsvFile(csvContent, filename);
      Alert.alert("🎉 CSV Download Triggered", `Crew roster audit log exported as ${filename}`);
    } catch (e: any) {
      Alert.alert("Export Error", "Failed to export crew audit CSV.");
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
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
        const html = await getFilteredReportHtml(params);
        openPrintableReceipt(html);
      } else {
        // Sector Admin PDF export
        const dateStr = new Date().toLocaleDateString("en-ET", { day: "2-digit", month: "long", year: "numeric" });
        const items = reportData?.items || [];
        const gmv = reportData?.summary?.gmv || 0;
        const completedJobs = reportData?.summary?.completed_jobs || 0;
        const staffCount = reportData?.summary?.staff_count || 0;

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Executive Statement - ${divisionTitle}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 30px; color: #1E293B; background: #FFF; }
              .header { border-bottom: 2px solid #10B981; padding-bottom: 15px; margin-bottom: 20px; }
              .title { font-size: 24px; font-weight: bold; color: #064E3B; margin: 0; }
              .subtitle { font-size: 14px; color: #64748B; margin-top: 4px; }
              .kpi-row { display: flex; gap: 15px; margin-bottom: 25px; }
              .kpi-card { flex: 1; border: 1px solid #CBD5E1; padding: 12px; border-radius: 8px; background: #F8FAFC; }
              .kpi-label { font-size: 11px; color: #64748B; font-weight: bold; text-transform: uppercase; }
              .kpi-val { font-size: 18px; font-weight: bold; color: #059669; margin-top: 4px; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th { background: #0F172A; color: #FFF; text-align: left; padding: 8px; font-size: 12px; }
              td { border-bottom: 1px solid #E2E8F0; padding: 8px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">🏢 ${divisionTitle.toUpperCase()}</div>
              <div class="subtitle">Sector Executive Financial Statement & Performance Audit &bull; ${dateStr}</div>
            </div>

            <div class="kpi-row">
              <div class="kpi-card">
                <div class="kpi-label">Gross GMV Revenue</div>
                <div class="kpi-val">ETB ${Number(gmv).toLocaleString("en-ET", { minimumFractionDigits: 2 })}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">Completed Jobs</div>
                <div class="kpi-val" style="color: #2563EB;">${completedJobs} Orders</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-label">On-Duty Technicians</div>
                <div class="kpi-val" style="color: #7C3AED;">${staffCount} Crew Members</div>
              </div>
            </div>

            <h3>📋 Sector Booking Ledger Statements</h3>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Service Offering</th>
                  <th>Sub-Center Station</th>
                  <th>Status</th>
                  <th>Gross Amount</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((b: any) => `
                  <tr>
                    <td>#${b.id}</td>
                    <td>${b.customer_name}</td>
                    <td>${b.service_name}</td>
                    <td>${(b.sub_center || "station").replace("-", " ").toUpperCase()}</td>
                    <td>${(b.status || "pending").toUpperCase()}</td>
                    <td>ETB ${Number(b.gross_amount).toLocaleString("en-ET", { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </body>
          </html>
        `;

        openPrintableReceipt(html);
      }
    } catch (e: any) {
      Alert.alert("Export Error", e?.message || "Failed to generate printable report.");
    } finally {
      setExportingPdf(false);
    }
  };

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
            {isSuperAdmin
              ? "👑 Enterprise Governance & Reports"
              : `🏢 ${divisionTitle} Financial Reports`}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isSuperAdmin
              ? "Platform-Wide Revenue, Multi-Tenant Payout Audits & Sector Statements"
              : `Financial Intelligence, Booking Ledgers & CSV Exports for ${divisionTitle}`}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchReport}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── FILTER TOOLBAR CARD ── */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.filterCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={styles.filterCardTitle}>🎯 Filter Parameters</Text>
            {!isSuperAdmin && (
              <View style={styles.scopeBadge}>
                <Ionicons name="location-sharp" size={12} color="#34D399" />
                <Text style={styles.scopeBadgeText}>{divisionTitle}</Text>
              </View>
            )}
          </View>

          {/* Timeframe selector */}
          <Text style={styles.inputLabel}>TIMEFRAME MODE</Text>
          <View style={styles.pillRow}>
            {(["monthly", "annual", "custom"] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.pillBtn, timeframe === mode && styles.pillBtnActive]}
                onPress={() => setTimeframe(mode)}
              >
                <Text style={[styles.pillText, timeframe === mode && styles.pillTextActive]}>
                  {mode.toUpperCase()}
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
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
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
          )}

          {/* Super Admin Only: Department & Sector Category Selectors */}
          {isSuperAdmin && (
            <>
              <Text style={styles.inputLabel}>SERVICE DIVISION / DEPARTMENT</Text>
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

              <Text style={styles.inputLabel}>SECTOR CATEGORY</Text>
              <View style={styles.pillRow}>
                {SECTORS.map((s) => (
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
              </View>
            </>
          )}
        </Animated.View>

        {/* ── REPORT CONTENT ── */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={{ color: "#94A3B8", marginTop: 10, fontSize: 13 }}>Compiling report data...</Text>
          </View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* Report Header Title */}
            <View style={styles.reportHeaderCard}>
              <Text style={styles.reportTitle}>{reportData?.period_title || "Executive Report"}</Text>
              <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 2 }}>
                {isSuperAdmin
                  ? `Platform Commission Rate: ${reportData?.commission_rate || 10}% • Currency: ${reportData?.currency || "ETB"}`
                  : `Exclusive Sector Financial Statement for ${divisionTitle}`}
              </Text>
            </View>

            {/* KPI STATS CARDS GRID */}
            <View style={styles.kpiGrid}>
              {isSuperAdmin ? (
                <>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>GROSS GMV REVENUE</Text>
                    <Text style={styles.kpiValue}>
                      ETB {Number(reportData?.summary?.gmv || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={[styles.kpiCard, { borderColor: "#EF444455" }]}>
                    <Text style={[styles.kpiLabel, { color: "#F87171" }]}>PLATFORM COMMISSION</Text>
                    <Text style={[styles.kpiValue, { color: "#F87171" }]}>
                      ETB {Number(reportData?.summary?.platform_commission || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={[styles.kpiCard, { borderColor: "#10B98155" }]}>
                    <Text style={styles.kpiLabel}>NET DISBURSED</Text>
                    <Text style={[styles.kpiValue, { color: "#34D399" }]}>
                      ETB {Number(reportData?.summary?.net_vendor_disbursed || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>COMPLETED JOBS</Text>
                    <Text style={[styles.kpiValue, { color: "#60A5FA" }]}>
                      {reportData?.summary?.completed_jobs || 0}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.kpiCard}>
                    <Text style={styles.kpiLabel}>SECTOR GROSS REVENUE</Text>
                    <Text style={styles.kpiValue}>
                      ETB {Number(reportData?.summary?.gmv || 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                    </Text>
                  </View>

                  <View style={[styles.kpiCard, { borderColor: "#3B82F655" }]}>
                    <Text style={[styles.kpiLabel, { color: "#60A5FA" }]}>COMPLETED ORDERS</Text>
                    <Text style={[styles.kpiValue, { color: "#60A5FA" }]}>
                      {reportData?.summary?.completed_jobs || 0} / {reportData?.summary?.total_jobs || 0}
                    </Text>
                  </View>

                  <View style={[styles.kpiCard, { borderColor: "#A78BFA55" }]}>
                    <Text style={[styles.kpiLabel, { color: "#A78BFA" }]}>ON-DUTY CREW</Text>
                    <Text style={[styles.kpiValue, { color: "#A78BFA" }]}>
                      {reportData?.summary?.staff_count || 0} Techs
                    </Text>
                  </View>

                  <View style={[styles.kpiCard, { borderColor: "#F59E0B55" }]}>
                    <Text style={[styles.kpiLabel, { color: "#FBBF24" }]}>SERVICE OFFERINGS</Text>
                    <Text style={[styles.kpiValue, { color: "#FBBF24" }]}>
                      {reportData?.summary?.services_count || 0} Active
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* 📥 EXPORT STATEMENTS GRID */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>
                📥 Download {isSuperAdmin ? "Platform" : divisionTitle} Report Statements
              </Text>
              
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={handleExportFullLedgerCSV}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#34D39955", gap: 10 }}
                >
                  <Ionicons name="document-text" size={20} color="#34D399" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>
                      📄 {isSuperAdmin ? "Full Platform" : `${divisionTitle}`} Financial Ledger (.CSV)
                    </Text>
                    <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>Itemized CSV report with client details, prices & status logs.</Text>
                  </View>
                  <Ionicons name="download-outline" size={18} color="#34D399" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleExportSubCenterCSV}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#60A5FA55", gap: 10 }}
                >
                  <Ionicons name="business" size={20} color="#60A5FA" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>🏬 Sub-Center Station Analytics (.CSV)</Text>
                    <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>Branch-by-branch revenue contribution & order volume.</Text>
                  </View>
                  <Ionicons name="download-outline" size={18} color="#60A5FA" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleExportCrewAuditCSV}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#0F172A", padding: 12, borderRadius: 10, borderWidth: 1, borderColor: "#A78BFA55", gap: 10 }}
                >
                  <Ionicons name="construct" size={20} color="#A78BFA" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>👷 Field Crew Fulfillment Audit (.CSV)</Text>
                    <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>Technician availability, designations & certifications log.</Text>
                  </View>
                  <Ionicons name="download-outline" size={18} color="#A78BFA" />
                </TouchableOpacity>
              </View>
            </View>

            {/* EXPORT ACTION TOOLBAR */}
            <View style={styles.exportToolbar}>
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: "#064E3B", borderColor: "#10B98155" }]}
                onPress={handleExportFullLedgerCSV}
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
                style={[styles.exportBtn, { backgroundColor: "#1E3A8A", borderColor: "#3B82F655" }]}
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

            {/* SUPER ADMIN ONLY: DEPARTMENT BREAKDOWN */}
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
                        ETB {Number(dept.gmv).toLocaleString()}
                      </Text>
                      <Text style={{ color: "#A7F3D0", fontSize: 10, fontWeight: "700" }}>
                        Net: ETB {Number(dept.net_disbursed).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ITEMIZED TRANSACTIONS PREVIEW TABLE */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionCardTitle}>
                📋 Itemized {isSuperAdmin ? "Platform" : divisionTitle} Booking Ledger
              </Text>
              {reportData?.items?.length === 0 ? (
                <View style={{ padding: 20, alignItems: "center" }}>
                  <Ionicons name="document-text-outline" size={36} color="#475569" />
                  <Text style={{ color: "#94A3B8", marginTop: 8, fontSize: 12 }}>
                    No completed transactions found for the selected filter parameters.
                  </Text>
                </View>
              ) : (
                reportData?.items?.map((item: any) => (
                  <View key={item.id} style={styles.tableRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>#{item.id} • {item.service_name}</Text>
                      <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                        👤 {item.customer_name} &bull; 🗓️ {item.date} &bull; 🏷️ {(item.status || "pending").toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: "#34D399", fontWeight: "800", fontSize: 13 }}>
                        ETB {Number(item.gross_amount || item.gross_amount === 0 ? item.gross_amount : 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                ))
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
  scrollContent: { padding: 16 },
  filterCard: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  filterCardTitle: { fontSize: 15, fontWeight: "800", color: "#F8FAFC" },
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
  inputLabel: { fontSize: 10, fontWeight: "800", color: "#94A3B8", marginTop: 10, marginBottom: 4 },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pillBtn: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  pillBtnActive: { backgroundColor: "#10B98122", borderColor: "#10B981" },
  pillText: { color: "#94A3B8", fontSize: 11, fontWeight: "700" },
  pillTextActive: { color: "#34D399" },
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
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  reportTitle: { fontSize: 18, fontWeight: "800", color: "#10B981" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  kpiCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  kpiLabel: { fontSize: 10, color: "#94A3B8", fontWeight: "800" },
  kpiValue: { fontSize: 16, fontWeight: "800", color: "#F8FAFC", marginTop: 4 },
  exportToolbar: { flexDirection: "row", gap: 10, marginBottom: 16 },
  exportBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
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
  sectionCardTitle: { fontSize: 14, fontWeight: "800", color: "#F8FAFC", marginBottom: 12 },
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
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
});
