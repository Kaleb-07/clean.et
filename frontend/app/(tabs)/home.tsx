import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  FlatList,
  Dimensions,
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
  MapPin,
  Bell,
  ArrowRight,
  Shirt,
  Droplets,
  Layers,
  Leaf,
  Zap,
} from "lucide-react-native";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import API from "../../src/api/client";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCategories } from "../../hooks/useCategories";
import { useBookings, Booking } from "../../hooks/useBookings";
import { useColors } from "../../hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CLEANING_TIPS = [
  {
    id: 1,
    Icon: Droplets,
    gradient: ["#3B82F6", "#2563EB"] as const,
    title: "Rinse Before Washing",
    desc: "Always pre-rinse your car to loosen dirt and avoid scratching the paint.",
  },
  {
    id: 2,
    Icon: Layers,
    gradient: ["#10B981", "#059669"] as const,
    title: "Two-Bucket Method",
    desc: "Use one bucket for soapy water and another for rinsing your mitt — prevents swirl marks.",
  },
  {
    id: 3,
    Icon: Building2,
    gradient: ["#8B5CF6", "#6D28D9"] as const,
    title: "Top-Down Building Wash",
    desc: "Always clean windows and facades from top to bottom to prevent re-contamination.",
  },
  {
    id: 4,
    Icon: Leaf,
    gradient: ["#059669", "#047857"] as const,
    title: "Eco-Friendly Agents",
    desc: "Our crew uses biodegradable cleaning agents that are safe for drains and the environment.",
  },
  {
    id: 5,
    Icon: Calendar,
    gradient: ["#F59E0B", "#D97706"] as const,
    title: "Book in Advance",
    desc: "Schedule your wash at least 24 hours ahead to guarantee your preferred time slot.",
  },
];

const BANNER_SLIDES = [
  {
    id: 1,
    title: "On-Demand Car Washing 24/7",
    subtitle: "Mobile Doorstep Rigs & Bay Stations",
    cta: "Book Wash →",
    tag: "SPECIAL 20% OFF",
    image: require("../../assets/myimage/banner-carwash.jpg"),
    sectorId: 1,
  },
  {
    id: 2,
    title: "Enterprise Building Cleaning",
    subtitle: "Deep Interior & Facade Window Glass",
    cta: "Explore Sectors →",
    tag: "VERIFIED CREW",
    image: require("../../assets/myimage/banner-building.jpg"),
    sectorId: 5,
  },
  {
    id: 3,
    title: "Valet Pickup & Drop-Off",
    subtitle: "We Pick, Clean & Return Your Car Spotless",
    cta: "Schedule Valet →",
    tag: "VALET DISPATCH",
    image: require("../../assets/myimage/banner-valet.jpg"),
    sectorId: 3,
  },
];

const SECTOR_METADATA: Record<
  string,
  { description: string; duration: string; startingPrice: string; image: any }
> = {
  "standard-bay-wash": {
    description:
      "Standard professional wash at our fully-equipped bays. Perfect for a quick and thorough shine.",
    duration: "30-45 min",
    startingPrice: "From 400 ETB",
    image: require("../../assets/myimage/wash-premium.png"),
  },
  "home-to-home": {
    description:
      "Mobile washing service at your doorstep. We bring the equipment, water, and power to you.",
    duration: "45-60 min",
    startingPrice: "From 1,000 ETB",
    image: require("../../assets/myimage/wash-basic.png"),
  },
  "pickup-drop-off": {
    description:
      "Valet washing service. We pick up your car, wash it at our facility, and return it spotless.",
    duration: "60-90 min",
    startingPrice: "From 775 ETB",
    image: require("../../assets/myimage/wash-premium.png"),
  },
  "corporate-fleet": {
    description:
      "Tailored recurring fleet wash solutions for corporate cars, trucks, and vans.",
    duration: "Varies",
    startingPrice: "Custom Quote",
    image: require("../../assets/myimage/wash-basic.png"),
  },
  "interior-cleaning": {
    description:
      "Deep interior building sanitization. Carpet vacuuming, surface cleaning, and dust elimination.",
    duration: "2-4 hours",
    startingPrice: "From 15 ETB/sqm",
    image: require("../../assets/myimage/wash-basic.png"),
  },
  "exterior-cleaning": {
    description:
      "Professional facade and window washing. Specialized crews using certified safety equipment.",
    duration: "4-8 hours",
    startingPrice: "From 2,000 ETB",
    image: require("../../assets/myimage/wash-premium.png"),
  },
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const colors = useColors();
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    reload: reloadCategories,
  } = useCategories();
  const {
    bookings,
    isLoading: bookingsLoading,
    reload: reloadBookings,
  } = useBookings();

  const [activeCategoryId, setActiveCategoryId] = useState<number | "all">(
    "all",
  );
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<{ name: string; email?: string } | null>(
    null,
  );
  const [liveServices, setLiveServices] = useState<any[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    loadUser();
    loadLiveServices();
    loadUnreadCount();
  }, []);

  // Auto-slide banner effect
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % BANNER_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
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

  const loadUnreadCount = async () => {
    try {
      const res = await API.get("/notifications/unread-count");
      setUnreadNotifications(res.data.unread_count ?? 0);
    } catch {
      // silently fail
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await Promise.all([
      reloadCategories(),
      reloadBookings(),
      loadLiveServices(),
      loadUnreadCount(),
    ]);
    setRefreshing(false);
  }, [reloadCategories, reloadBookings]);

  const handleBook = (id: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(`/booking/${id}`);
  };

  const handleBookLiveService = (service: any) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const targetSectorId = service.sector_id || (service.category === "building-cleaning" ? 5 : 1);
    router.push(`/booking/${targetSectorId}`);
  };

  // Find active booking for client
  const activeBooking = useMemo(() => {
    return bookings.find(
      (b) =>
        b.status === "in_progress" ||
        b.status === "driver_assigned" ||
        b.status === "confirmed" ||
        b.status === "pending",
    );
  }, [bookings]);

  const activeCategorySlug = useMemo(() => {
    if (activeCategoryId === "all") return "all";
    const found = categories.find((c) => c.id === activeCategoryId);
    return found ? found.slug : "all";
  }, [categories, activeCategoryId]);

  const filteredLiveServices = useMemo(() => {
    return liveServices.filter((s: any) => {
      const matchesCategory =
        activeCategorySlug === "all" ||
        s.category === activeCategorySlug;
      const matchesSearch =
        !search.trim() ||
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
        (s.sub_center && s.sub_center.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [liveServices, activeCategorySlug, search]);

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
      s.name?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [sectors, search]);

  const currentBanner = BANNER_SLIDES[activeSlide];

  return (
    <LinearGradient
      colors={colors.gradients.background}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top + 10, 50),
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
        {/* ── 1. HEADER ROW (Avatar + Location + Greeting | Notification Bell) ── */}
        <Animated.View
          entering={FadeInDown.delay(100)}
          style={styles.headerRow}
        >
          <View style={styles.userSection}>
            <View
              style={[
                styles.avatarBox,
                {
                  backgroundColor: colors.accentLight,
                  borderColor: colors.secondary,
                },
              ]}
            >
              {user?.name ? (
                <Text
                  style={[styles.avatarInitial, { color: colors.secondary }]}
                >
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Text style={{ fontSize: 18 }}>🧑‍💼</Text>
              )}
            </View>

            <View>
              <View style={styles.locationRow}>
                <MapPin size={12} color={colors.secondary} />
                <Text style={[styles.locationText, { color: colors.subtext }]}>
                  Addis Ababa, Ethiopia
                </Text>
              </View>
              <Text style={[styles.greetingText, { color: colors.text }]}>
                {t("hi_greeting")}, {user?.name || "Amanda"} 👋
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              router.push("/profile/notifications");
            }}
            style={({ pressed }) => [
              styles.notificationBtn,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Bell size={20} color={colors.text} />
            {unreadNotifications > 0 && (
              <View
                style={[styles.badgeCircle, { backgroundColor: colors.danger }]}
              >
                <Text style={styles.badgeCountText}>{unreadNotifications}</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>

        {/* ── 2. SEARCH INPUT TAB ── */}
        <Animated.View
          entering={FadeInDown.delay(150)}
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.card,
              borderWidth: 0,
              borderColor: "transparent",
            },
          ]}
        >
          <Search size={18} color={colors.subtext} />
          <TextInput
            placeholder={t("search_services")}
            placeholderTextColor={colors.subtext}
            value={search}
            onChangeText={setSearch}
            style={[
              styles.searchInput,
              {
                color: colors.text,
                borderWidth: 0,
                outlineStyle: "none",
              } as any,
            ]}
          />
        </Animated.View>

        {/* ── 3. RECTANGULAR HERO SLIDER BANNER ── */}
        <Animated.View
          entering={FadeInDown.delay(200)}
          style={styles.sliderContainer}
        >
          <Pressable
            onPress={() => handleBook(currentBanner.sectorId)}
            style={({ pressed }) => [
              styles.bannerCard,
              pressed && { opacity: 0.95 },
            ]}
          >
            <Image
              source={currentBanner.image}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />

            <LinearGradient
              colors={["rgba(11, 15, 25, 0.2)", "rgba(11, 15, 25, 0.85)"]}
              style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.bannerContent}>
              <View
                style={[
                  styles.bannerTag,
                  { backgroundColor: colors.secondary },
                ]}
              >
                <Text style={styles.bannerTagText}>{currentBanner.tag}</Text>
              </View>

              <Text style={styles.bannerTitle}>{currentBanner.title}</Text>
              <Text style={styles.bannerSubtitle}>
                {currentBanner.subtitle}
              </Text>

              <View
                style={[
                  styles.bannerCtaBtn,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.bannerCtaText}>{currentBanner.cta}</Text>
              </View>
            </View>

            {/* Pagination Dots (. . —) at Bottom Right */}
            <View style={styles.paginationBox}>
              {BANNER_SLIDES.map((_, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => setActiveSlide(idx)}
                  style={[
                    styles.dotItem,
                    idx === activeSlide
                      ? [
                          styles.dotActive,
                          { backgroundColor: colors.secondary },
                        ]
                      : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          </Pressable>
        </Animated.View>

        {/* ── ACTIVE BOOKING TRACKER HERO BANNER (IF ANY) ── */}
        {activeBooking && (
          <Animated.View
            entering={FadeInUp.delay(220)}
            style={{ marginHorizontal: 20, marginBottom: 20 }}
          >
            <BlurView
              intensity={35}
              tint={colors.isDark ? "dark" : "light"}
              style={[
                styles.activeBookingCard,
                { borderColor: colors.secondary, backgroundColor: colors.card },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.secondary,
                    }}
                  />
                  <Text
                    style={{
                      color: colors.secondary,
                      fontSize: 12,
                      fontWeight: "700",
                      textTransform: "uppercase",
                    }}
                  >
                    Active Booking • {activeBooking.status.replace("_", " ")}
                  </Text>
                </View>
                <Text style={{ color: colors.subtext, fontSize: 12 }}>
                  #{activeBooking.id}
                </Text>
              </View>

              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
              >
                {activeBooking.sector?.name ||
                  activeBooking.service?.name ||
                  "Clean.et Service"}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Calendar size={13} color={colors.subtext} />
                  <Text style={{ color: colors.subtext, fontSize: 13 }}>
                    {activeBooking.booking_date}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Clock size={13} color={colors.subtext} />
                  <Text style={{ color: colors.subtext, fontSize: 13 }}>
                    {activeBooking.booking_time}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web")
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push(`/booking/status/${activeBooking.id}`);
                }}
                style={({ pressed }) => [
                  styles.trackButton,
                  { backgroundColor: colors.secondary },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Navigation size={15} color="#FFFFFF" />
                <Text style={styles.trackButtonText}>
                  Track Live Order Status
                </Text>
                <ChevronRight size={16} color="#FFFFFF" />
              </Pressable>
            </BlurView>
          </Animated.View>
        )}

        {/* ── 4. CATEGORY SELECTOR CARDS ── */}
        <Animated.View entering={FadeInUp.delay(240)}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Explore Service Categories
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>
              Select sector to filter offerings
            </Text>
          </View>

          <View style={styles.categoryContainer}>
            {[
              {
                id: "all" as const,
                name: "All Services",
                slug: "all",
                Icon: Sparkles,
              },
              ...categories.map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                Icon:
                  c.slug === "car-washing"
                    ? Car
                    : c.slug === "building-cleaning"
                      ? Building2
                      : Shirt,
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
                    tint={colors.isDark ? "dark" : "light"}
                    style={[
                      styles.categoryCard,
                      {
                        borderColor: isActive
                          ? colors.primary
                          : colors.cardBorder,
                        backgroundColor: isActive
                          ? colors.primaryLight
                          : colors.isDark
                            ? "rgba(255, 255, 255, 0.03)"
                            : colors.surface,
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
                      <Icon
                        size={22}
                        color={isActive ? "#FFFFFF" : colors.subtext}
                      />
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
        </Animated.View>

        {/* LOADING & ERROR */}
        {categoriesLoading && !refreshing && (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 40 }}
          />
        )}

        {categoriesError && (
          <Text style={[styles.errorText, { color: colors.danger }]}>
            {categoriesError}
          </Text>
        )}

        {/* ── 5. UNIFIED SECTOR DIVISION SERVICES LIST ── */}
        <View style={styles.servicesList}>
          {/* Primary Core Car Wash & Building Cleaning Sector Services */}
          {filteredSectors.map((item: any, index) => {
            const meta = SECTOR_METADATA[item.slug] || {
              description:
                "Professional cleaning service custom-tailored to your exact specifications.",
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
              <Animated.View
                key={item.id}
                entering={FadeInUp.delay(index * 60)}
              >
                <BlurView
                  intensity={25}
                  tint={colors.isDark ? "dark" : "light"}
                  style={[
                    styles.card,
                    {
                      borderColor: colors.cardBorder,
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  {/* IMAGE */}
                  <Image
                    source={meta.image}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />

                  {/* CONTENT */}
                  <View style={styles.cardContent}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: colors.accentLight,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: colors.secondary,
                        }}
                      >
                        <Text
                          style={{
                            color: colors.secondary,
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {subCenterTag}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>
                        {item.name}
                      </Text>
                      <Text
                        style={[styles.cardPrice, { color: colors.secondary }]}
                      >
                        {meta.startingPrice}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.cardDescription,
                        { color: colors.subtext },
                      ]}
                      numberOfLines={2}
                    >
                      {meta.description}
                    </Text>

                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Clock size={14} color={colors.subtext} />
                        <Text
                          style={[styles.metaText, { color: colors.subtext }]}
                        >
                          {meta.duration}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <ShieldCheck size={14} color={colors.secondary} />
                        <Text
                          style={[styles.metaText, { color: colors.secondary }]}
                        >
                          Verified Division
                        </Text>
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
                      <Text style={styles.bookButtonText}>
                        Book Sector Service
                      </Text>
                      <ChevronRight size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </BlurView>
              </Animated.View>
            );
          })}

          {/* Dynamic Live Services Posted by Sector/Division Admin */}
          {filteredLiveServices.length > 0 && (
            <View style={{ marginTop: 24, marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 }]}>
                  ⚡ Posted Division Custom Services ({filteredLiveServices.length})
                </Text>
                <View style={{ backgroundColor: "#10B98122", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "#10B98155" }}>
                  <Text style={{ color: colors.isDark ? "#34D399" : "#059669", fontSize: 10, fontWeight: "800" }}>SECTOR POSTED</Text>
                </View>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.subtext, marginTop: 2 }]}>
                Real-time custom offerings posted directly from division stations
              </Text>
            </View>
          )}

          {filteredLiveServices.map((service: any, index: number) => {
            const hasCustomImage = service.image && typeof service.image === "string" && service.image.length > 10;
            const imageSource = hasCustomImage
              ? { uri: service.image }
              : require("../../assets/myimage/wash-premium.png");

            const formattedSubCenter = service.sub_center
              ? service.sub_center.replace(/-/g, " ").toUpperCase()
              : "DIVISION OFFERING";

            return (
              <Animated.View
                key={`live-svc-${service.id}`}
                entering={FadeInUp.delay(index * 50)}
              >
                <BlurView
                  intensity={25}
                  tint={colors.isDark ? "dark" : "light"}
                  style={[
                    styles.card,
                    {
                      borderColor: "#10B98155",
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <Image
                    source={imageSource}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />

                  <View style={styles.cardContent}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      <View
                        style={{
                          backgroundColor: "#10B98122",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: "#10B98166",
                        }}
                      >
                        <Text
                          style={{
                            color: colors.isDark ? "#34D399" : "#059669",
                            fontSize: 11,
                            fontWeight: "800",
                          }}
                        >
                          {service.tenant_name ? `${service.tenant_name.toUpperCase()} • ` : ""}{formattedSubCenter}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>
                        {service.name}
                      </Text>
                      <Text
                        style={[styles.cardPrice, { color: colors.secondary }]}
                      >
                        ETB {Number(service.price).toLocaleString("en-ET", { minimumFractionDigits: 2 })}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.cardDescription,
                        { color: colors.subtext },
                      ]}
                      numberOfLines={2}
                    >
                      {service.description || "Professional division cleaning service tailored to your standards."}
                    </Text>

                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Clock size={14} color={colors.subtext} />
                        <Text
                          style={[styles.metaText, { color: colors.subtext }]}
                        >
                          {service.duration || 45} mins
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <ShieldCheck size={14} color={colors.secondary} />
                        <Text
                          style={[styles.metaText, { color: colors.secondary }]}
                        >
                          {service.tenant_name || "Verified Division"}
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.bookButton,
                        { backgroundColor: colors.primary },
                        pressed && styles.bookButtonPressed,
                      ]}
                      onPress={() => handleBookLiveService(service)}
                    >
                      <Text style={styles.bookButtonText}>
                        Book Sector Service
                      </Text>
                      <ChevronRight size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                </BlurView>
              </Animated.View>
            );
          })}
        </View>

        {/* ── CLEANING TIPS CAROUSEL ── */}
        <CleaningTipsSection colors={colors} />

        {/* ── PROMO BANNER ── */}
        <PromoOfferBanner
          colors={colors}
          onPress={() => router.push("/booking")}
        />

        {/* ENTERPRISE TRUST BADGES FOOTER */}
        <Animated.View
          entering={FadeInUp.delay(300)}
          style={styles.trustFooter}
        >
          <Text style={[styles.trustTitle, { color: colors.subtext }]}>
            CLEAN.ET ENTERPRISE GUARANTEE
          </Text>
          <View style={styles.trustGrid}>
            <View style={styles.trustItem}>
              <ShieldCheck size={20} color={colors.secondary} />
              <Text style={[styles.trustItemText, { color: colors.text }]}>
                Verified Crew
              </Text>
            </View>
            <View style={styles.trustItem}>
              <Sparkles size={20} color={colors.primary} />
              <Text style={[styles.trustItemText, { color: colors.text }]}>
                Pure Eco Wash
              </Text>
            </View>
            <View style={styles.trustItem}>
              <Award size={20} color={colors.secondary} />
              <Text style={[styles.trustItemText, { color: colors.text }]}>
                Transparent ETB
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

// ─── CLEANING TIPS CAROUSEL COMPONENT ───────────────────────────────────────
function CleaningTipsSection({
  colors,
}: {
  colors: ReturnType<typeof import("../../hooks/useColors").useColors>;
}) {
  const flatRef = useRef<FlatList>(null);
  const [activeTip, setActiveTip] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTip((prev) => {
        const next = (prev + 1) % CLEANING_TIPS.length;
        flatRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const innerWidth = SCREEN_WIDTH - 40 - 32; // card width minus padding

  return (
    <Animated.View entering={FadeInUp.delay(310)} style={styles.tipsSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Cleaning Tips
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.subtext }]}>
          Pro care advice from our crew
        </Text>
      </View>

      {/* Single outer card — FlatList + dots live inside */}
      <View
        style={[
          styles.tipOuterCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            marginHorizontal: 20,
          },
        ]}
      >
        <FlatList
          ref={flatRef}
          data={CLEANING_TIPS}
          horizontal
          pagingEnabled
          scrollEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => String(item.id)}
          getItemLayout={(_, index) => ({
            length: innerWidth,
            offset: innerWidth * index,
            index,
          })}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / innerWidth);
            setActiveTip(idx);
          }}
          renderItem={({ item }) => {
            const IconComponent = item.Icon;
            return (
              <View style={[styles.tipInnerRow, { width: innerWidth }]}>
                {/* Enterprise gradient icon box */}
                <LinearGradient
                  colors={item.gradient}
                  style={styles.tipIconBox}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <IconComponent size={22} color="#FFFFFF" strokeWidth={2} />
                </LinearGradient>
                {/* Text */}
                <View style={styles.tipTextBlock}>
                  <Text style={[styles.tipTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.tipDesc, { color: colors.subtext }]}>
                    {item.desc}
                  </Text>
                </View>
              </View>
            );
          }}
          snapToInterval={innerWidth}
          decelerationRate="fast"
        />

        {/* Dots INSIDE the card at the bottom */}
        <View style={styles.tipDots}>
          {CLEANING_TIPS.map((_, idx) => (
            <Pressable
              key={idx}
              onPress={() => {
                flatRef.current?.scrollToIndex({ index: idx, animated: true });
                setActiveTip(idx);
              }}
              style={[
                styles.tipDot,
                idx === activeTip
                  ? [styles.tipDotActive, { backgroundColor: colors.primary }]
                  : styles.tipDotInactive,
              ]}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

// ─── PROMO OFFER BANNER COMPONENT ────────────────────────────────────────────
function PromoOfferBanner({
  colors,
  onPress,
}: {
  colors: ReturnType<typeof import("../../hooks/useColors").useColors>;
  onPress: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Animated.View
      entering={FadeInUp.delay(350)}
      style={styles.promoBannerWrapper}
    >
      <LinearGradient
        colors={[colors.primary, "#1D4ED8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.promoBanner}
      >
        {/* Decorative circle */}
        <View
          style={[
            styles.promoCircle,
            { backgroundColor: "rgba(16,185,129,0.2)" },
          ]}
        />
        <View
          style={[
            styles.promoCircleSmall,
            { backgroundColor: "rgba(255,255,255,0.08)" },
          ]}
        />

        {/* Badge */}
        <View
          style={[
            styles.promoBadge,
            {
              backgroundColor: "rgba(255,255,255,0.15)",
              borderColor: "rgba(255,255,255,0.35)",
            },
          ]}
        >
          <Text style={{ fontSize: 13 }}>⚡</Text>
          <Text style={[styles.promoBadgeText, { color: "#FFFFFF" }]}>
            LIMITED OFFER
          </Text>
        </View>

        {/* Headline */}
        <Text style={styles.promoHeadline}>
          Get 20% Off Your{"\n"}First Booking
        </Text>
        <Text
          style={[styles.promoSubtitle, { color: "rgba(255,255,255,0.72)" }]}
        >
          Book any sector service and save instantly — verified crews,
          transparent ETB pricing.
        </Text>

        {/* CTA Button */}
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.promoBtn,
            {
              backgroundColor: "rgba(255,255,255,0.12)",
              borderColor: "rgba(255,255,255,0.35)",
            },
            pressed && { opacity: 0.75 },
          ]}
        >
          <Text style={styles.promoBtnText}>{t("book_now")} →</Text>
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "800",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "500",
  },
  greetingText: {
    fontSize: 20,
    fontWeight: "800",
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badgeCircle: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0,
    borderColor: "transparent",
  },
  searchInput: {
    marginLeft: 10,
    flex: 1,
    fontSize: 14,
    borderWidth: 0,
  },
  sliderContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  bannerCard: {
    height: 170,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: 16,
    position: "relative",
  },
  bannerContent: {
    zIndex: 2,
    alignItems: "flex-start",
  },
  bannerTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  bannerTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  bannerSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginBottom: 10,
  },
  bannerCtaBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerCtaText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  paginationBox: {
    position: "absolute",
    right: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 3,
  },
  dotItem: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
  },
  dotInactive: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  categoryContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  categoryCardWrapper: {
    flex: 1,
  },
  categoryCard: {
    height: 80,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  categoryIconWrapper: {
    marginBottom: 4,
    zIndex: 1,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: "700",
    zIndex: 1,
    textAlign: "center",
    lineHeight: 14,
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
  errorText: {
    textAlign: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    fontSize: 14,
  },
  servicesList: {
    paddingHorizontal: 20,
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
    marginHorizontal: 20,
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

  // ── Cleaning Tips ──
  tipsSection: {
    marginBottom: 24,
  },
  tipOuterCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    overflow: "hidden",
  },
  tipInnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingBottom: 4,
  },
  tipIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tipTextBlock: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  tipDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  tipDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
  },
  tipDot: {
    height: 6,
    borderRadius: 3,
  },
  tipDotActive: {
    width: 20,
  },
  tipDotInactive: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
  },

  // ── Promo Banner ──
  promoBannerWrapper: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 22,
    overflow: "hidden",
  },
  promoBanner: {
    borderRadius: 22,
    padding: 24,
    overflow: "hidden",
    position: "relative",
  },
  promoCircle: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(59,130,246,0.18)",
    right: -40,
    top: -40,
  },
  promoCircleSmall: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(16,185,129,0.12)",
    right: 30,
    bottom: -20,
  },
  promoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  promoBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  promoHeadline: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginBottom: 10,
  },
  promoSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  promoBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  promoBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
