import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSuperAdmin } from "../../hooks/useSuperAdmin";
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

  const {
    tenants,
    generateFilteredReport,
    exportFilteredReportCsv,
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
      setReportData(res.data);
    } catch (e: any) {
      console.log("SuperAdmin report fetch fallback to local bookings API:", e);
      try {
        const bRes = await API.get("/bookings");
        const bookingsList = Array.isArray(bRes.data) ? bRes.data : (bRes.data?.data ?? []);
        const completed = bookingsList.filter((b: any) => b.status === "completed");
        const gmv = completed.reduce((sum: number, b: any) => sum + Number(b.price || b.service?.price || 0), 0);

        setReportData({
          period_title: "Sector Financial Statement",
          commission_rate: 10,
          currency: "ETB",
          summary: {
            gmv: gmv,
            platform_commission: gmv * 0.1,
            net_vendor_disbursed: gmv * 0.9,
            completed_jobs: completed.length,
          },
          items: bookingsList.map((b: any) => ({
            id: b.id,
            service_name: b.service?.name || "Service Offering",
            department: b.tenant?.business_name || "Cleaning Sector",
            customer_name: b.customer?.name || b.customer?.user?.name || "Client Account",
            date: b.booking_date || "Today",
            gross_amount: b.price || b.service?.price || 0,
            net_payout: (b.price || b.service?.price || 0) * 0.9,
          })),
        });
      } catch (err: any) {
        Alert.alert("Report Error", "Failed to compile sector report data.");
      }
    } finally {
      setLoading(false);
    }
  }, [timeframe, selectedYear, selectedMonth, startDate, endDate, selectedTenantId, selectedCategory, generateFilteredReport]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = async () => {
    setExportingCsv(true);
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
      const csv = await exportFilteredReportCsv(params);
      const filename = `cleanet_report_${timeframe}_${selectedYear}_${Date.now()}.csv`;
      downloadCsvFile(csv, filename);
    } catch (e: any) {
      Alert.alert("Export Error", e?.message || "Failed to export CSV report.");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
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
      const html = await getFilteredReportHtml(params);
      openPrintableReceipt(html);
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
          <Text style={styles.headerTitle}>📊 Executive Reports & Analytics</Text>
          <Text style={styles.headerSubtitle}>
            Custom Financial Statements, Department GMV & Sector Performance
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchReport}>
          <Ionicons name="refresh" size={18} color="#60A5FA" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ── FILTER TOOLBAR CARD ── */}
        <Animated.View entering={FadeInDown.duration(300)} style={styles.filterCard}>
          <Text style={styles.filterCardTitle}>🎯 Filter Parameters</Text>

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

          {/* Department / Division filter */}
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

          {/* Sector Category filter */}
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
                Platform Commission Rate: {reportData?.commission_rate || 10}% &bull; Base Currency: {reportData?.currency || "ETB"}
              </Text>
            </View>

            {/* KPI STATS CARDS GRID */}
            <View style={styles.kpiGrid}>
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
            </View>

            {/* EXPORT ACTION TOOLBAR */}
            <View style={styles.exportToolbar}>
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: "#064E3B", borderColor: "#10B98155" }]}
                onPress={handleExportCsv}
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

            {/* DEPARTMENT BREAKDOWN */}
            {reportData?.department_breakdown?.length > 0 && (
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
              <Text style={styles.sectionCardTitle}>📋 Itemized Transactions Preview</Text>
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
                      <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 13 }}>{item.service_name}</Text>
                      <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                        {item.department} &bull; {item.customer_name} &bull; {item.date}
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 13 }}>
                        ETB {Number(item.gross_amount).toLocaleString()}
                      </Text>
                      <Text style={{ color: "#34D399", fontSize: 11, fontWeight: "700" }}>
                        Net: ETB {Number(item.net_payout).toLocaleString()}
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
  filterCardTitle: { fontSize: 15, fontWeight: "800", color: "#F8FAFC", marginBottom: 12 },
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
