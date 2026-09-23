import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  Switch,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  CheckCircle2,
  Info,
  Check,
  MapPin,
  HelpCircle,
  TrendingUp,
  RefreshCw,
  Car,
  Building2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInRight, FadeIn, ZoomIn } from "react-native-reanimated";

import { useCategories } from "../../hooks/useCategories";
import { useBookings } from "../../hooks/useBookings";
import { useVehicles } from "../../hooks/useVehicles";
import { useBuildingProfiles } from "../../hooks/useBuildingProfiles";
import { useLanguage } from "../../contexts/LanguageContext";
import { useColors } from "../../hooks/useColors";
import type { SectorField } from "../../constants/categories";

const TIME_SLOTS = [
  "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM",
  "04:00 PM", "05:00 PM", "06:00 PM"
];

export default function DynamicBookingScreen() {
  const { sectorId } = useLocalSearchParams<{ sectorId: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { categories, loading: categoriesLoading, estimatePrice } = useCategories();
  const { addBooking } = useBookings();
  const { t } = useLanguage();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [requirementData, setRequirementData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Price calculation state
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [estimatingPrice, setEstimatingPrice] = useState(false);

  // Recurring Bookings state
  const [recurring, setRecurring] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState("weekly");

  // Vehicle & Building Profile hooks
  const { vehicles } = useVehicles();
  const { profiles: buildingProfiles } = useBuildingProfiles();
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedBuildingProfileId, setSelectedBuildingProfileId] = useState<number | null>(null);

  // Find active sector & category in tree
  const { sector, categorySlug } = useMemo(() => {
    for (const cat of categories) {
      const found = cat.sectors.find(s => String(s.id) === String(sectorId));
      if (found) return { sector: found, categorySlug: cat.slug };
    }
    return { sector: null, categorySlug: "" };
  }, [categories, sectorId]);

  // Generate next 14 days
  const dates = useMemo(() => {
    const list = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  // Update dynamic fields state with defaults if not present
  useEffect(() => {
    if (sector?.requirement_schema?.fields) {
      const defaults: Record<string, any> = {};
      sector.requirement_schema.fields.forEach(field => {
        if (field.type === "boolean") {
          defaults[field.key] = false;
        } else if (field.type === "select" && field.options && field.options.length > 0) {
          defaults[field.key] = field.options[0];
        } else {
          defaults[field.key] = "";
        }
      });
      setRequirementData(defaults);
    }
  }, [sector]);

  // Recalculate price when dynamic requirements change
  useEffect(() => {
    if (!sector) return;

    // Check if required fields are filled
    const fields = sector.requirement_schema?.fields || [];
    const missingRequired = fields.some(
      field => field.required && (requirementData[field.key] === undefined || requirementData[field.key] === "")
    );

    if (missingRequired) {
      setEstimatedPrice(null);
      return;
    }

    // Call API for price estimation
    const getEstimate = async () => {
      setEstimatingPrice(true);
      try {
        const res = await estimatePrice(sector.id, requirementData);
        setEstimatedPrice(res.price);
      } catch (err) {
        console.warn("Estimation failed:", err);
      } finally {
        setEstimatingPrice(false);
      }
    };

    // Debounce estimation calls slightly
    const timer = setTimeout(getEstimate, 400);
    return () => clearTimeout(timer);
  }, [requirementData, sector, estimatePrice]);

  const handleFieldChange = (key: string, value: any) => {
    setRequirementData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleBooking = async () => {
    if (!selectedTime) {
      Alert.alert("Selection Required", "Please select a time slot for your service.");
      return;
    }

    // Double check required fields
    const fields = sector?.requirement_schema?.fields || [];
    const missingField = fields.find(
      field => field.required && (requirementData[field.key] === undefined || requirementData[field.key] === "")
    );

    if (missingField) {
      Alert.alert("Input Required", `Please specify a value for: ${missingField.label}`);
      return;
    }

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsSubmitting(true);
    try {
      // Format date as YYYY-MM-DD
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      await addBooking({
        sectorId: sectorId!,
        date: dateStr,
        timeSlot: selectedTime,
        requirementData: requirementData,
        vehicleId: selectedVehicleId ?? undefined,
        buildingProfileId: selectedBuildingProfileId ?? undefined,
        recurring: recurring,
        recurrenceRule: recurring ? recurrenceRule : undefined,
      });

      setShowSuccess(true);
    } catch (e: any) {
      console.error("Booking error:", e);
      const msg = e.response?.data?.message || e.message || "Failed to create booking";
      Alert.alert("Booking Failed", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSelected = (date: Date) => 
    date.toDateString() === selectedDate.toDateString();

  if (categoriesLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!sector) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Info size={48} color="#ef4444" />
        <Text style={[styles.errorText, { color: colors.text }]}>Sector not found</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <ScrollView 
        contentContainerStyle={{ 
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: insets.bottom + 40 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{sector.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* SERVICE INFO & PRICING */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.section}>
          <BlurView intensity={20} tint={colors.isDark ? "dark" : "light"} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.serviceHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.serviceName, { color: colors.text }]}>{sector.name}</Text>
                <Text style={[styles.description, { color: colors.subtext }]}>
                  Configure your cleaning details below to receive a live price estimate.
                </Text>
              </View>
              <View style={styles.priceContainer}>
                {estimatingPrice ? (
                  <ActivityIndicator size="small" color="#8b5cf6" />
                ) : (
                  <Text style={styles.price}>
                    {estimatedPrice !== null ? `${estimatedPrice} ETB` : "---"}
                  </Text>
                )}
                <Text style={[styles.priceLabel, { color: colors.subtext }]}>Estimated Price</Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>


        {/* VEHICLE SELECTION (Car Washing) */}
        {categorySlug === "car-washing" && vehicles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Car size={18} color="#8b5cf6" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Vehicle</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectGrid}>
              {vehicles.map((v) => {
                const isSelectedV = selectedVehicleId === v.id;
                const vName = [v.make, v.model].filter(Boolean).join(" ") || v.vehicle_class;
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => {
                      setSelectedVehicleId(v.id);
                      if (v.vehicle_class) {
                        handleFieldChange("vehicle_class", v.vehicle_class);
                      }
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.selectChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelectedV && styles.selectChipActive
                    ]}
                  >
                    <Text style={[styles.selectChipText, { color: colors.subtext }, isSelectedV && styles.textActive]}>
                      🚗 {vName} {v.plate_number ? `(${v.plate_number})` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* BUILDING PROFILE SELECTION (Building Cleaning) */}
        {categorySlug === "building-cleaning" && buildingProfiles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Building2 size={18} color="#8b5cf6" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Building Profile</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectGrid}>
              {buildingProfiles.map((bp) => {
                const isSelectedBp = selectedBuildingProfileId === bp.id;
                return (
                  <Pressable
                    key={bp.id}
                    onPress={() => {
                      setSelectedBuildingProfileId(bp.id);
                      if (bp.area_sqm) handleFieldChange("total_area", bp.area_sqm);
                      if (bp.floor_count) handleFieldChange("floor_count", bp.floor_count);
                      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.selectChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      isSelectedBp && styles.selectChipActive
                    ]}
                  >
                    <Text style={[styles.selectChipText, { color: colors.subtext }, isSelectedBp && styles.textActive]}>
                      🏢 {bp.name} ({bp.floor_count}F, {bp.area_sqm} sqm)
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* DYNAMIC FORM FIELDS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color="#8b5cf6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Cleaning Details</Text>
          </View>
          
          <BlurView intensity={15} tint={colors.isDark ? "dark" : "light"} style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {sector.requirement_schema?.fields?.map((field: SectorField) => {
              const val = requirementData[field.key];
              
              return (
                <View key={field.key} style={styles.fieldContainer}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {field.label} {field.required && <Text style={{ color: "#8b5cf6" }}>*</Text>}
                  </Text>
                  
                  {field.type === "select" && (
                    <View style={styles.selectGrid}>
                      {field.options?.map(opt => {
                        const isSelectedOpt = val === opt;
                        // Prettify select text
                        const label = opt.replace(/_/g, " ").toUpperCase();
                        
                        return (
                          <Pressable
                            key={opt}
                            onPress={() => {
                              handleFieldChange(field.key, opt);
                              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            style={[
                              styles.selectChip,
                              { backgroundColor: colors.surface, borderWidth: 0, borderColor: "transparent" },
                              isSelectedOpt && styles.selectChipActive
                            ]}
                          >
                            <Text style={[styles.selectChipText, { color: colors.subtext }, isSelectedOpt && styles.textActive]}>
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {field.type === "boolean" && (
                    <View style={[styles.switchRow, { backgroundColor: colors.surface, borderWidth: 0, borderColor: "transparent" }]}>
                      <Text style={[styles.switchLabel, { color: colors.text }]}>Yes / No</Text>
                      <Switch
                        value={!!val}
                        onValueChange={(checked) => handleFieldChange(field.key, checked)}
                        trackColor={{ false: colors.isDark ? "#1f2041" : "#E2E8F0", true: "#8b5cf6" }}
                        thumbColor={val ? "#ffffff" : "#a3a3a3"}
                      />
                    </View>
                  )}

                  {field.type === "number" && (
                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderWidth: 0, borderColor: "transparent" }]}>
                      <TextInput
                        keyboardType="numeric"
                        placeholder="Enter value"
                        placeholderTextColor={colors.placeholder}
                        style={[styles.textInput, { color: colors.text, borderWidth: 0, outlineStyle: "none" } as any]}
                        value={val !== undefined ? String(val) : ""}
                        onChangeText={(text) => handleFieldChange(field.key, text === "" ? "" : Number(text))}
                      />
                    </View>
                  )}

                  {(field.type === "text" || field.type === "address") && (
                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderWidth: 0, borderColor: "transparent" }]}>
                      {field.type === "address" && <MapPin size={16} color={colors.subtext} style={{ marginRight: 8 }} />}
                      <TextInput
                        placeholder={field.type === "address" ? "Enter address details" : "Enter details"}
                        placeholderTextColor={colors.placeholder}
                        style={[styles.textInput, { color: colors.text, borderWidth: 0, outlineStyle: "none" } as any]}
                        value={val || ""}
                        onChangeText={(text) => handleFieldChange(field.key, text)}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </BlurView>
        </View>

        {/* DATE SELECTOR */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CalendarIcon size={18} color="#8b5cf6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Date</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateList}
          >
            {dates.map((date, i) => (
              <Animated.View key={i.toString()} entering={FadeInRight.delay(i * 50)}>
                <Pressable
                  onPress={() => {
                    setSelectedDate(date);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.dateItem,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    isSelected(date) && styles.dateItemActive
                  ]}
                >
                  <Text style={[styles.dayName, { color: colors.subtext }, isSelected(date) && styles.textActive]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dayNumber, { color: colors.text }, isSelected(date) && styles.textActive]}>
                    {date.getDate()}
                  </Text>
                  {isSelected(date) && <View style={styles.activeDot} />}
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        {/* TIME SELECTOR */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color="#8b5cf6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Time</Text>
          </View>
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((time) => (
              <Pressable
                key={time}
                onPress={() => {
                  setSelectedTime(time);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.timeItem,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedTime === time && styles.timeItemActive
                ]}
              >
                <Text style={[styles.timeText, { color: colors.text }, selectedTime === time && styles.textActive]}>
                  {time}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* RECURRING BOOKING OPTIONS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <RefreshCw size={18} color="#8b5cf6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recurring Booking</Text>
          </View>
          <BlurView intensity={15} tint={colors.isDark ? "dark" : "light"} style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Repeat booking automatically</Text>
                <Text style={[styles.recurHelpText, { color: colors.subtext }]}>Schedule future bookings on the same cycle</Text>
              </View>
              <Switch
                value={recurring}
                onValueChange={(checked) => {
                  setRecurring(checked);
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                trackColor={{ false: colors.isDark ? "#1f2041" : "#E2E8F0", true: "#8b5cf6" }}
                thumbColor={recurring ? "#ffffff" : "#a3a3a3"}
              />
            </View>

            {recurring && (
              <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 16 }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Select Recurrence Cycle</Text>
                <View style={styles.selectGrid}>
                  {[
                    { key: "weekly", label: "Every Week" },
                    { key: "biweekly", label: "Every 2 Weeks" },
                    { key: "monthly", label: "Every Month" }
                  ].map((rule) => {
                    const isSelectedRule = recurrenceRule === rule.key;
                    return (
                      <Pressable
                        key={rule.key}
                        onPress={() => {
                          setRecurrenceRule(rule.key);
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[
                          styles.selectChip,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          isSelectedRule && styles.selectChipActive
                        ]}
                      >
                        <Text style={[styles.selectChipText, { color: colors.subtext }, isSelectedRule && styles.textActive]}>
                          {rule.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            )}
          </BlurView>
        </View>


        {/* SUMMARY & SUBMIT */}
        <View style={styles.footer}>
          {selectedTime && (
            <Animated.View
              entering={FadeInDown}
              style={[
                styles.summaryBox,
                {
                  backgroundColor: colors.isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5",
                  borderColor: colors.isDark ? "rgba(16, 185, 129, 0.2)" : "#A7F3D0"
                }
              ]}
            >
              <CheckCircle2 size={16} color="#10b981" />
              <Text style={styles.summaryText}>
                Scheduled for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {selectedTime}
              </Text>
            </Animated.View>
          )}

          <Pressable
            onPress={handleBooking}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.bookBtn,
              (pressed || isSubmitting) && { opacity: 0.8, transform: [{ scale: 0.98 }] }
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.bookBtnText}>Confirm Booking</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* SUCCESS MODAL */}
      <Modal transparent visible={showSuccess} animationType="fade" aria-hidden={false}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={50} tint={colors.isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <Animated.View entering={ZoomIn} style={[styles.successModal, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.successIcon}>
              <Check size={40} color="#ffffff" />
            </View>
            <Text style={[styles.successTitle, { color: colors.text }]}>Booking Successful!</Text>
            <Text style={[styles.successMessage, { color: colors.subtext }]}>
              Your cleaning appointment has been scheduled and sent to our staff.
            </Text>
            <Pressable 
              style={styles.doneButton}
              onPress={() => {
                setShowSuccess(false);
                router.replace("/(tabs)/booking");
              }}
            >
              <Text style={styles.doneButtonText}>View My Bookings</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0b0b1f",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#0b0b1f",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    color: "#ffffff",
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#6d28d9",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  serviceCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  serviceName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: "#a3a3a3",
    lineHeight: 20,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  priceLabel: {
    fontSize: 12,
    color: "#a3a3a3",
    marginTop: 2,
  },
  formCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    gap: 20,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  selectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  selectChipActive: {
    backgroundColor: "#6d28d9",
    borderColor: "#8b5cf6",
  },
  selectChipText: {
    color: "#a3a3a3",
    fontSize: 12,
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 0,
    borderColor: "transparent",
  },
  switchLabel: {
    color: "#a3a3a3",
    fontSize: 14,
  },
  recurHelpText: {
    color: "#5a5b7c",
    fontSize: 11,
    marginTop: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 0,
    borderColor: "transparent",
  },
  textInput: {
    flex: 1,
    height: 48,
    color: "#ffffff",
    fontSize: 15,
    borderWidth: 0,
  },
  dateList: {
    gap: 12,
    paddingRight: 20,
  },
  dateItem: {
    width: 64,
    height: 80,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  dateItemActive: {
    backgroundColor: "#6d28d9",
    borderColor: "#8b5cf6",
  },
  dayName: {
    fontSize: 12,
    color: "#a3a3a3",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
  },
  textActive: {
    color: "#ffffff",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ffffff",
    position: "absolute",
    bottom: 8,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    minWidth: '30%',
    alignItems: 'center',
  },
  timeItemActive: {
    backgroundColor: "#6d28d9",
    borderColor: "#8b5cf6",
  },
  timeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  summaryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  summaryText: {
    color: "#10b981",
    fontSize: 13,
    fontWeight: "500",
  },
  bookBtn: {
    backgroundColor: "#6d28d9",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6d28d9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bookBtnText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successModal: {
    width: "100%",
    backgroundColor: "#1a1b3a",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#a3a3a3",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  doneButton: {
    backgroundColor: "#6d28d9",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
  },
  doneButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
