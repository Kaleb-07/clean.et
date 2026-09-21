import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Clock,
  ChevronRight,
  Search,
  Car,
  Building2,
  Sparkles,
  ShieldCheck,
  Navigation,
  Award,
  Calendar,
} from "lucide-react-native";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import API from "../../src/api/client";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCategories } from "../../hooks/useCategories";
import { useBookings, Booking } from "../../hooks/useBookings";
import { useColors } from "../../hooks/useColors";

const SECTOR_METADATA: Record<string, { description: string; duration: string; startingPrice: string; image: any }> = {
  'standard-bay-wash': {
    description: "Standard professional wash at our fully-equipped bays. Perfect for a quick and thorough shine.",
    duration: "30-45 min",
    startingPrice: "From 400 ETB",
    image: require("../../assets/myimage/wash-premium.png"),
  },
  'home-to-home': {
    description: "Mobile washing service at your doorstep. We bring the equipment, water, and power to you.",
    duration: "45-60 min",
    startingPrice: "From 1,000 ETB",
    image: require("../../assets/myimage/wash-basic.png"),
  },
  'pickup-drop-off': {
    description: "Valet washing service. We pick up your car, wash it at our facility, and return it spotless.",
    duration: "60-90 min",
    startingPrice: "From 775 ETB",
    image: require("../../assets/myimage/wash-premium.png"),
  },
  'corporate-fleet': {
    description: "Tailored recurring fleet wash solutions for corporate cars, trucks, and vans.",
    duration: "Varies",
    startingPrice: "Custom Quote",
    image: require("../../assets/myimage/wash-basic.png"),
  },
  'interior-cleaning': {
    description: "Deep interior building sanitization. Carpet vacuuming, surface cleaning, and dust elimination.",
    duration: "2-4 hours",
    startingPrice: "From 15 ETB/sqm",
    image: require("../../assets/myimage/wash-basic.png"),
  },
  'exterior-cleaning': {
    description: "Professional facade and window washing. Specialized crews using certified safety equipment.",
    duration: "4-8 hours",
    startingPrice: "From 2,000 ETB",
    image: require("../../assets/myimage/wash-premium.png"),
  },
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const colors = useColors();
  const { categories, loading: categoriesLoading, error: categoriesError, reload: reloadCategories } = useCategories();
  const { bookings, isLoading: bookingsLoading, reload: reloadBookings } = useBookings();

  const [activeCategoryId, setActiveCategoryId] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [liveServices, setLiveServices] = useState<any[]>([]);

  useEffect(() => {
    loadUser();
    loadLiveServices();
  }, []);

  const loadUser = async () => {
    try {
      const res = await API.get("/me");
      const payload = res.data.data || res.data;
      setUser(payload.user || payload);
    } catch (e) {
      console.log("Error loading user:", e);
    }
  };

  const loadLiveServices = async () => {
    try {
      const res = await API.get("/services");
      setLiveServices(res.data.data ?? []);
    } catch (e) {
      console.log("Error loading live services:", e);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await Promise.all([reloadCategories(), reloadBookings(), loadLiveServices()]);
    setRefreshing(false);
  }, [reloadCategories, reloadBookings]);

  const handleBook = (id: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(`/booking/${id}`);
  };

  // Find active booking for client
  const activeBooking = useMemo(() => {
    return bookings.find(
      (b) => b.status === "in_progress" || b.status === "driver_assigned" || b.status === "confirmed" || b.status === "pending"
    );
  }, [bookings]);

  // Compute sectors based on selection (All vs Specific Category)
  const sectors = useMemo(() => {
    if (activeCategoryId === "all") {
      return categories.flatMap((c) => c.sectors || []);
    }
    const found = categories.find((c) => c.id === activeCategoryId);
    return found ? found.sectors : [];
  }, [categories, activeCategoryId]);

  const filteredSectors = useMemo(() => {
    return sectors.filter((s) =>
      s.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [sectors, search]);

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 60),
          paddingBottom: insets.bottom + 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
      >
        {/* ENTERPRISE HERO HEADER */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={[styles.greeting, { color: colors.text }]}>Hello, {user?.name || "Valued Client"}</Text>
              <Text style={[styles.subtitle, { color: colors.subtext }]}>Clean.et Division Service Hub</Text>
            </View>
            <View style={[styles.badgePill, { backgroundColor: colors.accentLight, borderColor: colors.secondary }]}>
              <Sparkles size={14} color={colors.secondary} />
              <Text style={[styles.badgeText, { color: colors.secondary }]}>ENTERPRISE</Text>
            </View>
          </View>
        </Animated.View>

        {/* ACTIVE BOOKING TRACKER HERO BANNER (IF ANY) */}
        {activeBooking && (
          <Animated.View entering={FadeInUp.delay(150)} style={{ marginHorizontal: 24, marginBottom: 24 }}>
            <BlurView intensity={35} tint="dark" style={[styles.activeBookingCard, { borderColor: colors.secondary, backgroundColor: colors.card }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary }} />
                  <Text style={{ color: colors.secondary, fontSize: 12, fontWeight: "700", textTransform: "uppercase" }}>
                    Active Booking • {activeBooking.status.replace("_", " ")}
                  </Text>
                </View>
                <Text style={{ color: colors.subtext, fontSize: 12 }}>#{activeBooking.id}</Text>
              </View>

              <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold", marginBottom: 4 }}>
                {activeBooking.sector?.name || activeBooking.service?.name || "Clean.et Service"}
              </Text>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Calendar size={13} color={colors.subtext} />
                  <Text style={{ color: colors.subtext, fontSize: 13 }}>{activeBooking.booking_date}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Clock size={13} color={colors.subtext} />
                  <Text style={{ color: colors.subtext, fontSize: 13 }}>{activeBooking.booking_time}</Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/booking/status/${activeBooking.id}`);
                }}
                style={({ pressed }) => [
                  styles.trackButton,
                  { backgroundColor: colors.secondary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Navigation size={15} color="#FFFFFF" />
                <Text style={styles.trackButtonText}>Track Live Order Status</Text>
                <ChevronRight size={16} color="#FFFFFF" />
              </Pressable>
            </BlurView>
          </Animated.View>
        )}

        {/* CATEGORY SELECTOR CARDS */}
        <View style={styles.categoryContainer}>
          {[
            { id: "all" as const, name: "All Services", slug: "all", Icon: Sparkles },
            ...categories.map((c) => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              Icon: c.slug === "car-washing" ? Car : Building2,
            })),
          ].map((cat) => {
            const isActive = cat.id === activeCategoryId;
            const Icon = cat.Icon;
            return (
              <Pressable
                key={String(cat.id)}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setActiveCategoryId(cat.id);
                }}
                style={styles.categoryCardWrapper}
              >
                <BlurView
                  intensity={isActive ? 45 : 20}
                  tint="dark"
                  style={[
                    styles.categoryCard,
                    {
                      borderColor: isActive ? colors.primary : colors.cardBorder,
                      backgroundColor: isActive ? colors.primaryLight : "rgba(255, 255, 255, 0.03)",
                    },
                  ]}
                >
                  {isActive && (
                    <LinearGradient
                      colors={colors.gradients.primary}
                      style={StyleSheet.absoluteFillObject}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  <View style={styles.categoryIconWrapper}>
                    <Icon size={24} color={isActive ? "#FFFFFF" : colors.subtext} />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: isActive ? "#FFFFFF" : colors.subtext },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </BlurView>
              </Pressable>
            );
          })}
        </View>

        {/* SEARCH & FILTER */}
        <BlurView intensity={20} tint="dark" style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <Search size={18} color={colors.subtext} />
          <TextInput
            placeholder="Search sector services..."
            placeholderTextColor={colors.subtext}
            value={search}
            onChangeText={setSearch}
            style={[styles.searchInput, { color: colors.text, outlineStyle: "none" } as any]}
          />
        </BlurView>

        {/* LOADING & ERROR */}
        {categoriesLoading && !refreshing && (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        )}

        {categoriesError && (
          <Text style={[styles.errorText, { color: colors.danger }]}>{categoriesError}</Text>
        )}

        {/* UNIFIED SECTOR DIVISION SERVICES */}
        <View style={styles.servicesList}>
          {filteredSectors.map((item: any, index) => {
            const meta = SECTOR_METADATA[item.slug] || {
              description: "Professional cleaning service custom-tailored to your exact specifications.",
              duration: "Flexible",
              startingPrice: "From 400 ETB",
              image: require("../../assets/myimage/wash-premium.png"),
            };

            const subCenterTag =
              item.slug === "home-to-home"
                ? "MOBILE DOORSTEP"
                : item.slug === "pickup-drop-off"
                ? "VALET PICKUP"
                : item.slug === "corporate-fleet"
                ? "CORPORATE FLEET"
                : item.slug === "standard-bay-wash"
                ? "BAY STATION"
                : item.slug === "exterior-cleaning"
                ? "FACADE GLASS"
                : item.slug === "interior-cleaning"
                ? "INTERIOR DEEP"
                : "DIVISION SECTOR";

            return (
              <Animated.View key={item.id} entering={FadeInUp.delay(index * 60)}>
                <BlurView intensity={25} tint="dark" style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
                  {/* IMAGE */}
                  <Image source={meta.image} style={styles.cardImage} resizeMode="cover" />

                  {/* CONTENT */}
                  <View style={styles.cardContent}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <View style={{ backgroundColor: colors.accentLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.secondary }}>
                        <Text style={{ color: colors.secondary, fontSize: 11, fontWeight: "700" }}>
                          {subCenterTag}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.cardPrice, { color: colors.secondary }]}>{meta.startingPrice}</Text>
                    </View>

                    <Text style={[styles.cardDescription, { color: colors.subtext }]} numberOfLines={2}>
                      {meta.description}
                    </Text>

                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Clock size={14} color={colors.subtext} />
                        <Text style={[styles.metaText, { color: colors.subtext }]}>{meta.duration}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <ShieldCheck size={14} color={colors.secondary} />
                        <Text style={[styles.metaText, { color: colors.secondary }]}>Verified Division</Text>
                      </View>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.bookButton,
                        { backgroundColor: colors.primary },
                        pressed && styles.bookButtonPressed,
                      ]}
                      onPress={() => handleBook(item.id)}
                    >
                      <Text style={styles.bookButtonText}>Book Sector Service</Text>
                      <ChevronRight size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </BlurView>
              </Animated.View>
            );
          })}
        </View>

        {/* ENTERPRISE TRUST BADGES FOOTER */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.trustFooter}>
          <Text style={[styles.trustTitle, { color: colors.subtext }]}>CLEAN.ET ENTERPRISE GUARANTEE</Text>
          <View style={styles.trustGrid}>
            <View style={styles.trustItem}>
              <ShieldCheck size={20} color={colors.secondary} />
              <Text style={[styles.trustItemText, { color: colors.text }]}>Verified Crew</Text>
            </View>
            <View style={styles.trustItem}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={[styles.trustItemText, { color: colors.text }]}>Pure Eco Wash</Text>
            </View>
            <View style={styles.trustItem}>
              <Award size={20} color={colors.secondary} />
              <Text style={[styles.trustItemText, { color: colors.text }]}>Transparent ETB</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  activeBookingCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  trackButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  categoryContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  categoryCardWrapper: {
    flex: 1,
  },
  categoryCard: {
    height: 84,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  categoryIconWrapper: {
    marginBottom: 6,
    zIndex: 1,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "600",
    zIndex: 1,
    textAlign: "center",
    lineHeight: 15,
  },
  errorText: {
    textAlign: "center",
    marginHorizontal: 24,
    marginBottom: 16,
    fontSize: 14,
  },
  searchContainer: {
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0,
  },
  searchInput: {
    marginLeft: 10,
    flex: 1,
    fontSize: 15,
    borderWidth: 0,
  },
  servicesList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 16,
  },
  cardImage: {
    width: "100%",
    height: 150,
  },
  cardContent: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: "bold",
    marginLeft: 8,
  },
  cardDescription: {
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: "500",
  },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 13,
    borderRadius: 12,
    gap: 8,
  },
  bookButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  trustFooter: {
    marginTop: 20,
    marginHorizontal: 24,
    alignItems: "center",
  },
  trustTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  trustGrid: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trustItemText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

