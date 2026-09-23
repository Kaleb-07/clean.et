import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
  Modal,
  Platform,
  TextInput,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Clock3,
  CircleDashed,
  XCircle,
  Phone,
  User,
  Shield,
  FileText,
  Camera,
  Upload,
  Image as ImageIcon,
} from "lucide-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as ImagePicker from "expo-image-picker";

import { useBookings } from "../../../hooks/useBookings";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useColors } from "../../../hooks/useColors";
import API from "../../../src/api/client";

function to12h(time24: string): string {
  if (!time24) return "";
  const parts = time24.split(":");
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}

export default function BookingStatusScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { getBooking, isLoading, refreshBookings, cancelBooking } = useBookings();
  const { t } = useLanguage();
  const { user } = useAuth();

  const booking = useMemo(() => getBooking(bookingId!), [bookingId, getBooking]);

  const [cancelConfirmModal, setCancelConfirmModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const canCancel = booking && ["pending", "confirmed"].includes(booking.status);

  const handleCancelBooking = async () => {
    if (!bookingId) return;
    setCancelling(true);
    try {
      await cancelBooking(bookingId);
      setCancelConfirmModal(false);
      Alert.alert("Booking Cancelled", "Your booking has been cancelled successfully.");
    } catch (e: any) {
      Alert.alert("Cancellation Failed", e?.response?.data?.message || e.message || "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  // ── Proof upload state & Refresh state ──────────────────────────────────────
  const [proofModal, setProofModal] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofNote, setProofNote] = useState("");
  const [uploading, setUploading] = useState(false);
  const [proofs, setProofs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const isStaff = user?.role === "super_admin" || user?.role === "tenant_admin" || user?.role === "staff";

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshBookings();
    } finally {
      setRefreshing(false);
    }
  }, [refreshBookings]);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setProofImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  }, []);

  const uploadProof = useCallback(async () => {
    if (!proofImage && !proofNote) {
      Alert.alert("Nothing to upload", "Please add a photo or a note.");
      return;
    }
    setUploading(true);
    try {
      const res = await API.post(`/bookings/${bookingId}/proof`, {
        photo_base64: proofImage ?? undefined,
        checklist_item: proofNote || undefined,
      });
      setProofs((prev) => [...prev, res.data.proof]);
      setProofModal(false);
      setProofImage(null);
      setProofNote("");
      Alert.alert("Proof uploaded! ✅", "Completion proof has been saved.");
    } catch (e: any) {
      Alert.alert("Upload failed", e?.response?.data?.message ?? "Try again.");
    } finally {
      setUploading(false);
    }
  }, [bookingId, proofImage, proofNote]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>Booking not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const bookingName = booking.sector?.name ?? booking.service?.name ?? "Cleaning Service";
  const categoryName = booking.sector?.category_name ?? "Clean.et Service";

  // Full 8-stage lifecycle tracker definitions
  const steps = [
    { key: "pending", label: "Received", desc: "We got your order", color: "#f59e0b", icon: CircleDashed },
    { key: "confirmed", label: "Confirmed", desc: "Booking is approved", color: "#3b82f6", icon: CheckCircle2 },
    { key: "driver_assigned", label: "Driver Assigned", desc: "Driver is selected", color: "#6366f1", icon: User },
    { key: "picked_up", label: "Picked Up", desc: "Vehicle is in transit", color: "#8b5cf6", icon: Clock3 },
    { key: "in_progress", label: "Cleaning", desc: "Service is underway", color: "#a855f7", icon: Clock3 },
    { key: "completed", label: "Completed", desc: "Cleaning completed!", color: "#10b981", icon: CheckCircle2 },
    { key: "invoiced", label: "Invoiced", desc: "Invoice is generated", color: "#14b8a6", icon: FileText },
  ];

  const isCancelled = booking.status === "cancelled";
  const currentStepIndex = steps.findIndex((s) => s.key === booking.status);

  // Initials for staff avatar
  const getInitials = (name?: string) => {
    if (!name) return "ST";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <>
    <LinearGradient colors={colors.gradients.background} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("booking_details") || "Booking Status"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8b5cf6"
            colors={["#8b5cf6"]}
          />
        }
      >
        {/* STATUS TIMELINE CARD */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.statusSection}>
          <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.serviceInfo}>
              <Text style={styles.categoryLabel}>{categoryName}</Text>
              <Text style={[styles.serviceName, { color: colors.text }]}>{bookingName}</Text>
              <Text style={[styles.bookingId, { color: colors.subtext }]}>Booking ID: #{booking.id}</Text>
            </View>

            {isCancelled ? (
              <View style={styles.cancelledBox}>
                <XCircle size={44} color="#ef4444" />
                <Text style={styles.cancelledText}>This booking has been cancelled</Text>
              </View>
            ) : (
              <View style={styles.timeline}>
                {steps.map((step, index) => {
                  const isDone = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const Icon = step.icon;

                  // Skip driver_assigned and picked_up stages if not a vehicle booking
                  if ((step.key === "driver_assigned" || step.key === "picked_up") && !booking.vehicle) {
                    return null;
                  }

                  return (
                    <View key={step.key} style={styles.timelineItem}>
                      <View style={styles.timelineLeft}>
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: colors.surface, borderColor: colors.border },
                            isDone && { backgroundColor: step.color },
                            isCurrent && [styles.activeDot, { borderColor: colors.text }],
                          ]}
                        >
                          {isDone ? (
                            <Icon size={12} color="#ffffff" />
                          ) : (
                            <View style={[styles.inactiveDotInner, { backgroundColor: colors.subtext }]} />
                          )}
                        </View>
                        {index < steps.length - 1 && (
                          <View
                            style={[
                              styles.line,
                              { backgroundColor: colors.border },
                              index < currentStepIndex && { backgroundColor: step.color },
                            ]}
                          />
                        )}
                      </View>
                      <View style={styles.timelineRight}>
                        <Text
                          style={[
                            styles.stepLabel,
                            { color: colors.subtext },
                            isDone && { color: colors.text },
                            isCurrent && { fontWeight: "bold", color: step.color },
                          ]}
                        >
                          {step.label}
                        </Text>
                        <Text style={[styles.stepDesc, { color: colors.subtext }]}>{step.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </BlurView>
        </Animated.View>

        {/* ASSIGNED STAFF CARD */}
        {booking.staff && (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.staffSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Assigned Team Member</Text>
            <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.staffCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.staffRow}>
                <View style={styles.avatarWrapper}>
                  <LinearGradient colors={["#8b5cf6", "#6366f1"]} style={styles.avatarGradient}>
                    <Text style={styles.avatarText}>{getInitials(booking.staff.name)}</Text>
                  </LinearGradient>
                </View>
                <View style={styles.staffDetails}>
                  <Text style={[styles.staffName, { color: colors.text }]}>{booking.staff.name}</Text>
                  <Text style={[styles.staffRole, { color: colors.subtext }]}>{booking.staff.role_title || "Cleaning Professional"}</Text>
                </View>
                {booking.staff.phone && (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${booking.staff!.phone}`)}
                    style={styles.callBtn}
                  >
                    <Phone size={18} color="#ffffff" />
                  </Pressable>
                )}
              </View>
            </BlurView>
          </Animated.View>
        )}

        {/* DETAILS CARD */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.detailsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("appointment_info") || "Appointment Info"}</Text>
          <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Price */}
            <View style={styles.detailRow}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(16,185,129,0.12)" }]}>
                <CheckCircle2 size={18} color="#10b981" />
              </View>
              <View>
                <Text style={[styles.detailLabel, { color: colors.subtext }]}>Price</Text>
                <Text style={[styles.detailValue, { color: "#10b981" }]}>
                  ETB {Number(booking.service?.price ?? booking.estimated_price ?? 0).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Date */}
            <View style={styles.detailRow}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(139,92,246,0.12)" }]}>
                <Calendar size={18} color="#8b5cf6" />
              </View>
              <View>
                <Text style={[styles.detailLabel, { color: colors.subtext }]}>{t("date") || "Date"}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {new Date(booking.booking_date + "T00:00:00").toLocaleDateString()}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Time */}
            <View style={styles.detailRow}>
              <View style={[styles.iconBox, { backgroundColor: "rgba(59,130,246,0.12)" }]}>
                <Clock size={18} color="#3b82f6" />
              </View>
              <View>
                <Text style={[styles.detailLabel, { color: colors.subtext }]}>{t("time") || "Time"}</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{to12h(booking.booking_time)}</Text>
              </View>
            </View>

            {/* Render Vehicle Profile Info if present */}
            {booking.vehicle && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <View style={[styles.iconBox, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
                    <Shield size={18} color="#f59e0b" />
                  </View>
                  <View>
                    <Text style={[styles.detailLabel, { color: colors.subtext }]}>Vehicle Details</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {booking.vehicle.make} {booking.vehicle.model}{" "}
                      {booking.vehicle.plate_number ? `(${booking.vehicle.plate_number})` : ""}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Render Building Profile Info if present */}
            {booking.building_profile && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.detailRow}>
                  <View style={[styles.iconBox, { backgroundColor: "rgba(236,72,153,0.12)" }]}>
                    <MapPin size={18} color="#ec4899" />
                  </View>
                  <View>
                    <Text style={[styles.detailLabel, { color: colors.subtext }]}>Building Details</Text>
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {booking.building_profile.name} · {booking.building_profile.floor_count} floors ·{" "}
                      {booking.building_profile.area_sqm} sqm
                    </Text>
                  </View>
                </View>
              </>
            )}
          </BlurView>
        </Animated.View>

        {/* ── CUSTOMER ACTION BUTTONS: CANCEL & RESCHEDULE ── */}
        {canCancel && (
          <Animated.View entering={FadeInUp.delay(250)} style={styles.actionsSection}>
            <Pressable
              onPress={() => setCancelConfirmModal(true)}
              style={styles.cancelBookingBtn}
            >
              <Text style={styles.cancelBookingBtnText}>Cancel Booking</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(`/booking/edit/${booking.id}` as any)}
              style={styles.rescheduleBookingBtn}
            >
              <Clock size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.rescheduleBookingBtnText}>Reschedule</Text>
            </Pressable>
          </Animated.View>
        )}

        {/* ── COMPLETION PROOFS ─────────────────────────────────────── */}
        {(proofs.length > 0 || (booking.completion_proofs && booking.completion_proofs.length > 0) || isStaff) && (
          <Animated.View entering={FadeInUp.delay(300)} style={styles.proofsSection}>
            <View style={styles.proofsSectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Completion Proofs</Text>
              {isStaff && (
                <Pressable onPress={() => setProofModal(true)} style={styles.addProofBtn}>
                  <Upload size={14} color="#a78bfa" />
                  <Text style={styles.addProofText}>Add Proof</Text>
                </Pressable>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[...(booking.completion_proofs ?? []), ...proofs].map((proof, i) => (
                <View key={proof.id ?? i} style={[styles.proofCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {proof.photo_url && proof.photo_url.startsWith("data:") || proof.photo_url?.startsWith("http") ? (
                    <Image source={{ uri: proof.photo_url }} style={styles.proofImage} />
                  ) : (
                    <View style={[styles.proofImage, styles.proofImagePlaceholder, { backgroundColor: colors.surface }]}>
                      <ImageIcon size={28} color={colors.subtext} />
                    </View>
                  )}
                  {proof.checklist_item ? (
                    <Text style={[styles.proofNote, { color: colors.text }]} numberOfLines={2}>{proof.checklist_item}</Text>
                  ) : null}
                  <Text style={[styles.proofDate, { color: colors.subtext }]}>
                    {proof.created_at ? new Date(proof.created_at).toLocaleDateString() : ""}
                  </Text>
                </View>
              ))}
              {[...(booking.completion_proofs ?? []), ...proofs].length === 0 && (
                <View style={[styles.proofsEmpty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Camera size={24} color={colors.subtext} />
                  <Text style={[styles.proofsEmptyText, { color: colors.subtext }]}>No proofs yet</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        )}
      </ScrollView>
    </LinearGradient>

    {/* ── PROOF UPLOAD MODAL ──────────────────────────────────────────── */}
    <Modal
      visible={proofModal}
      transparent
      animationType="slide"
      onRequestClose={() => setProofModal(false)}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={60} tint={colors.isDark ? "dark" : "light"} style={[styles.modalSheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>Upload Completion Proof</Text>

          {proofImage ? (
            <Image source={{ uri: proofImage }} style={styles.previewImage} />
          ) : null}

          <Pressable onPress={pickImage} style={styles.pickImageBtn}>
            <Camera size={18} color="#a78bfa" />
            <Text style={styles.pickImageText}>
              {proofImage ? "Change Photo" : "Select Photo"}
            </Text>
          </Pressable>

          <TextInput
            style={[styles.noteInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
            placeholder="Add a checklist note (optional)…"
            placeholderTextColor={colors.placeholder}
            value={proofNote}
            onChangeText={setProofNote}
            multiline
            numberOfLines={3}
          />

          <Pressable
            onPress={uploadProof}
            disabled={uploading}
            style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadBtnText}>Upload Proof</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setProofModal(false)} style={styles.cancelLink}>
            <Text style={[styles.cancelLinkText, { color: colors.subtext }]}>Cancel</Text>
          </Pressable>
        </BlurView>
      </View>
    </Modal>

    {/* ── CANCEL CONFIRMATION MODAL ── */}
    <Modal
      visible={cancelConfirmModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!cancelling) setCancelConfirmModal(false);
      }}
    >
      <View style={styles.cancelModalOverlay}>
        <BlurView intensity={Platform.OS === "ios" ? 40 : 100} tint={colors.isDark ? "dark" : "light"} style={[styles.cancelModalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cancelIconWrap}>
            <XCircle size={36} color="#ef4444" />
          </View>
          <Text style={[styles.cancelModalTitle, { color: colors.text }]}>Cancel Booking?</Text>
          <Text style={[styles.cancelModalMsg, { color: colors.subtext }]}>
            Are you sure you want to cancel your booking for {bookingName}? This action cannot be undone.
          </Text>

          <View style={styles.cancelModalRow}>
            <Pressable
              disabled={cancelling}
              onPress={() => setCancelConfirmModal(false)}
              style={[styles.cancelModalKeepBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelModalKeepText, { color: colors.text }]}>Keep Booking</Text>
            </Pressable>
            <Pressable
              disabled={cancelling}
              onPress={handleCancelBooking}
              style={[styles.cancelModalConfirmBtn, cancelling && { opacity: 0.7 }]}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.cancelModalConfirmText}>Yes, Cancel</Text>
              )}
            </Pressable>
          </View>
        </BlurView>
      </View>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { color: "#ffffff", fontSize: 18, marginBottom: 20 },
  backButton: { backgroundColor: "#6d28d9", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backButtonText: { color: "#ffffff", fontWeight: "bold" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  scrollContent: { padding: 20, paddingBottom: 40 },
  statusSection: { marginBottom: 24 },
  statusCard: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  serviceInfo: { marginBottom: 24 },
  categoryLabel: { color: "#8b5cf6", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 },
  serviceName: { fontSize: 24, fontWeight: "bold", color: "#ffffff", marginTop: 4 },
  bookingId: { color: "#94a3b8", fontSize: 13, marginTop: 4 },
  cancelledBox: { alignItems: "center", padding: 20, gap: 12 },
  cancelledText: { color: "#ef4444", fontSize: 16, fontWeight: "bold" },
  timeline: { gap: 0 },
  timelineItem: { flexDirection: "row", gap: 16 },
  timelineLeft: { alignItems: "center", width: 24 },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center", zIndex: 2 },
  activeDot: { borderWidth: 2, borderColor: "#ffffff" },
  inactiveDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)" },
  line: { width: 2, flex: 1, backgroundColor: "rgba(255,255,255,0.06)", marginVertical: 4 },
  timelineRight: { flex: 1, paddingBottom: 24 },
  stepLabel: { fontSize: 16, color: "#94a3b8", fontWeight: "600" },
  stepDesc: { fontSize: 12, color: "#64748b", marginTop: 2 },
  // Staff card
  staffSection: { marginBottom: 24 },
  staffCard: { borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  staffRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrapper: { width: 48, height: 48, borderRadius: 24, overflow: "hidden" },
  avatarGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#ffffff", fontWeight: "bold", fontSize: 16 },
  staffDetails: { flex: 1 },
  staffName: { fontSize: 16, fontWeight: "bold", color: "#ffffff" },
  staffRole: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#6d28d9", justifyContent: "center", alignItems: "center" },
  // Details card
  detailsSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#ffffff", marginBottom: 12, marginLeft: 4 },
  detailsCard: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 4 },
  iconBox: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  detailLabel: { fontSize: 12, color: "#64748b", textTransform: "uppercase", fontWeight: "600" },
  detailValue: { fontSize: 15, color: "#ffffff", fontWeight: "600", marginTop: 2 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginVertical: 12 },
  // Customer Actions Section
  actionsSection: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  cancelBookingBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    backgroundColor: "rgba(239,68,68,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBookingBtnText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
  rescheduleBookingBtn: {
    flex: 1.2,
    flexDirection: "row",
    paddingVertical: 15,
    borderRadius: 16,
    backgroundColor: "#6d28d9",
    alignItems: "center",
    justifyContent: "center",
  },
  rescheduleBookingBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  // Proofs
  proofsSection: { marginBottom: 24 },
  proofsSectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  addProofBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(139,92,246,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: "rgba(139,92,246,0.3)" },
  addProofText: { color: "#a78bfa", fontSize: 12, fontWeight: "700" },
  proofCard: { width: 140, marginRight: 12, borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 8 },
  proofImage: { width: "100%" as any, height: 100, borderRadius: 10, marginBottom: 8 },
  proofImagePlaceholder: { backgroundColor: "rgba(255,255,255,0.04)", justifyContent: "center", alignItems: "center" },
  proofNote: { color: "#94a3b8", fontSize: 11, marginBottom: 4 },
  proofDate: { color: "#475569", fontSize: 10 },
  proofsEmpty: { width: 140, height: 120, justifyContent: "center", alignItems: "center", gap: 8, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  proofsEmptyText: { color: "#334155", fontSize: 12 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 20 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  previewImage: { width: "100%" as any, height: 160, borderRadius: 12, marginBottom: 12 },
  pickImageBtn: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(139,92,246,0.4)", backgroundColor: "rgba(139,92,246,0.1)", marginBottom: 12 },
  pickImageText: { color: "#a78bfa", fontWeight: "600", fontSize: 14 },
  noteInput: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 14, color: "#fff", fontSize: 13, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 16, minHeight: 80, textAlignVertical: "top" },
  uploadBtn: { backgroundColor: "#7c3aed", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  uploadBtnDisabled: { backgroundColor: "rgba(124,58,237,0.4)" },
  uploadBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelLink: { alignItems: "center", marginTop: 14, paddingVertical: 4 },
  cancelLinkText: { color: "#475569", fontSize: 13 },
  // Cancel Confirmation Modal
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  cancelModalBox: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#16162e",
    overflow: "hidden",
  },
  cancelIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(239,68,68,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  cancelModalTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  cancelModalMsg: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  cancelModalRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelModalKeepBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
  },
  cancelModalKeepText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  cancelModalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#ef4444",
    alignItems: "center",
  },
  cancelModalConfirmText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export { };
