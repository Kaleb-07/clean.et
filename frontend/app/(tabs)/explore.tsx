import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  RefreshControl,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Search,
  X,
  SlidersHorizontal,
  Car,
  Building2,
  Sparkles,
  Star,
  Clock,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useColors } from "../../hooks/useColors";
import { useCategories } from "../../hooks/useCategories";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface ExploreServiceItem {
  id: string;
  sectorId: number;
  categorySlug: "car-washing" | "building-cleaning";
  categoryName: string;
  sectorName: string;
  title: string;
  subtitle: string;
  description: string;
  price: string;
  priceNum: number;
  duration: string;
  rating: number;
  reviewCount: number;
  badge?: string;
  popular?: boolean;
  features: string[];
}

const EXPLORE_SERVICES: ExploreServiceItem[] = [
  {
    id: "cw-1",
    sectorId: 1,
    categorySlug: "car-washing",
    categoryName: "Car Wash",
    sectorName: "Mobile Car Wash",
    title: "Premium Mobile Doorstep Wash",
    subtitle: "Full exterior foam wash, tire gloss & windshield polish",
    description: "Our professional mobile rig visits your home or office with high-pressure deionized water, eco-shampoo, and microfiber detailing.",
    price: "450 ETB",
    priceNum: 450,
    duration: "45 min",
    rating: 4.9,
    reviewCount: 342,
    badge: "Most Popular",
    popular: true,
    features: ["Pre-rinse & Snow Foam", "Hand-dry with Plush Microfiber", "Tire Dress & Rim Polish", "Door Jambs Cleared"],
  },
  {
    id: "cw-2",
    sectorId: 1,
    categorySlug: "car-washing",
    categoryName: "Car Wash",
    sectorName: "Mobile Car Wash",
    title: "Interior Deep Sanitization & Steam",
    subtitle: "Upholstery extraction, dash restoration & UV shield",
    description: "Thorough vacuuming, high-temp steam cleaning on carpets and seats, AC duct sterilization, and premium leather conditioning.",
    price: "850 ETB",
    priceNum: 850,
    duration: "90 min",
    rating: 4.95,
    reviewCount: 218,
    badge: "Health & Hygiene",
    popular: true,
    features: ["Hot Water Extraction", "Steam Sanitization (Kills 99.9% Bacteria)", "Leather Feed & Mat Wash", "AC Odor Eliminator"],
  },
  {
    id: "cw-3",
    sectorId: 1,
    categorySlug: "car-washing",
    categoryName: "Car Wash",
    sectorName: "Mobile Car Wash",
    title: "Ceramic Seal & Paint Protection",
    subtitle: "Hydrophobic shield, machine glaze & high-gloss shine",
    description: "Clay bar decontamination followed by machine polymer sealing to protect paint against road grime, sun oxidation, and dust.",
    price: "1,600 ETB",
    priceNum: 1600,
    duration: "120 min",
    rating: 4.88,
    reviewCount: 96,
    features: ["Clay Bar Decontamination", "Machine Swirl Minimization", "6-Month Hydrophobic Seal", "Glass Rain Repellent"],
  },
  {
    id: "bc-1",
    sectorId: 2,
    categorySlug: "building-cleaning",
    categoryName: "Building Cleaning",
    sectorName: "Commercial & Residential",
    title: "Full Residential Deep Clean",
    subtitle: "Living room, bedrooms, bathrooms & kitchen degreasing",
    description: "Comprehensive home turnover by vetted cleaning specialists using industrial-grade HEPA filtration and non-toxic sanitizers.",
    price: "1,800 ETB",
    priceNum: 1800,
    duration: "3 - 4 hrs",
    rating: 4.92,
    reviewCount: 184,
    badge: "Best Value",
    popular: true,
    features: ["Tile & Grout Deep Scrub", "Kitchen Appliance Degreasing", "Full Window Glazing", "Bathroom Descaling & Disinfection"],
  },
  {
    id: "bc-2",
    sectorId: 2,
    categorySlug: "building-cleaning",
    categoryName: "Building Cleaning",
    sectorName: "Commercial & Residential",
    title: "Commercial Facade & Glass Wash",
    subtitle: "High-reach pure water pole window washing",
    description: "Safe and streak-free facade washing for corporate buildings, banks, and retail storefronts with pure demineralized water poles.",
    price: "3,200 ETB",
    priceNum: 3200,
    duration: "Half Day",
    rating: 4.85,
    reviewCount: 79,
    features: ["Water-Fed Pole Reach Up to 4 Stories", "Spot-Free Demineralized Rinse", "Frame & Mullion Detailing", "OSHA Compliant Crew"],
  },
  {
    id: "cw-4",
    sectorId: 3,
    categorySlug: "car-washing",
    categoryName: "Car Wash",
    sectorName: "Valet Pickup & Drop-Off",
    title: "Valet Pickup, Detailing & Return",
    subtitle: "We pick up your vehicle, detail it at our facility & return it spotless",
    description: "Ideal for busy professionals. Insured valet drivers collect your car, perform an executive exterior + interior detail, and deliver it back to your doorstep.",
    price: "775 ETB",
    priceNum: 775,
    duration: "60 - 90 min",
    rating: 4.91,
    reviewCount: 148,
    badge: "Valet Dispatch",
    popular: true,
    features: ["Fully Insured Valet Drivers", "Complete Exterior Hand Wash", "Interior Vacuum & Dust-Off", "Guaranteed On-Time Return"],
  },
  {
    id: "bc-3",
    sectorId: 2,
    categorySlug: "building-cleaning",
    categoryName: "Building Cleaning",
    sectorName: "Commercial & Residential",
    title: "Corporate Office Deep Sanitization",
    subtitle: "Desks, high-touch points, conference rooms & floor scrubbing",
    description: "Scheduled evening or weekend commercial cleaning for tech hubs, NGOs, and corporate suites across Addis Ababa.",
    price: "2,400 ETB",
    priceNum: 2400,
    duration: "2 - 3 hrs",
    rating: 4.88,
    reviewCount: 112,
    features: ["High-Touch Surface Sterilization", "Industrial HEPA Vacuuming", "Trash Removal & Restroom Scrub", "Eco-friendly Odor Neutralizer"],
  },
];

const CATEGORY_FILTERS = [
  { id: "all", label: "All Services", icon: Sparkles },
  { id: "car-washing", label: "Car Wash", icon: Car },
  { id: "building-cleaning", label: "Building", icon: Building2 },
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { categories } = useCategories();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<"popular" | "price_asc" | "rating">("popular");

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => {
      setRefreshing(false);
    }, 700);
  }, []);

  const filteredServices = useMemo(() => {
    return EXPLORE_SERVICES.filter((item) => {
      // Category filter
      if (selectedCategory !== "all" && item.categorySlug !== selectedCategory) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesSub = item.subtitle.toLowerCase().includes(query);
        const matchesCategory = item.categoryName.toLowerCase().includes(query);
        const matchesFeatures = item.features.some((f) => f.toLowerCase().includes(query));
        return matchesTitle || matchesSub || matchesCategory || matchesFeatures;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "price_asc") return a.priceNum - b.priceNum;
      if (sortBy === "rating") return b.rating - a.rating;
      return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
    });
  }, [selectedCategory, searchQuery, sortBy]);

  const handleBookService = (item: ExploreServiceItem) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({
      pathname: "/booking/[sectorId]",
      params: {
        sectorId: String(item.sectorId),
        categoryName: item.categoryName,
        sectorName: item.sectorName,
      },
    } as any);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ── HEADER ── */}
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: insets.top + (Platform.OS === "ios" ? 8 : 16),
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerTopRow}>
          <View>
            <Text style={[styles.headerSubtitle, { color: colors.primary }]}>
              DISCOVER CLEAN.ET
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Explore Services
            </Text>
          </View>

          <View
            style={[
              styles.headerBadge,
              {
                backgroundColor: colors.primaryLight,
                borderColor: colors.isDark ? "rgba(59, 130, 246, 0.3)" : "rgba(37, 99, 235, 0.2)",
              },
            ]}
          >
            <Sparkles size={14} color={colors.primary} />
            <Text style={[styles.headerBadgeText, { color: colors.primary }]}>Addis Ababa</Text>
          </View>
        </View>

        {/* ── SEARCH BAR ── */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.inputBg,
              borderWidth: 0,
              borderColor: "transparent",
            },
          ]}
        >
          <Search size={19} color={colors.subtext} />
          <TextInput
            style={[styles.searchInput, { color: colors.text, borderWidth: 0, outlineStyle: "none" } as any]}
            placeholder="Search mobile car wash, building, sofa..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={8}
              style={styles.clearBtn}
            >
              <X size={16} color={colors.subtext} />
            </Pressable>
          ) : null}
        </View>

        {/* ── CATEGORY FILTER PILLS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsScroll}
          style={styles.categoryPillsContainer}
        >
          {CATEGORY_FILTERS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.selectionAsync();
                  }
                  setSelectedCategory(cat.id);
                }}
                style={[
                  styles.filterPill,
                  isSelected
                    ? {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      }
                    : {
                        backgroundColor: colors.isDark ? colors.surface : "#F1F5F9",
                        borderColor: colors.border,
                      },
                ]}
              >
                <Icon
                  size={15}
                  color={isSelected ? "#FFFFFF" : colors.subtext}
                />
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isSelected ? "#FFFFFF" : colors.subtext,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── MAIN SCROLLABLE CONTENT ── */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── PROMO BANNER ── */}
        <View style={styles.promoCardContainer}>
          <LinearGradient
            colors={colors.isDark ? ["#1E3A8A", "#2563EB"] : ["#2563EB", "#1D4ED8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.promoCard}
          >
            <View style={styles.promoContent}>
              <View style={styles.promoTag}>
                <Zap size={12} color={colors.primary} fill={colors.primary} />
                <Text style={[styles.promoTagText, { color: colors.primary }]}>SPECIAL PROMO</Text>
              </View>
              <Text style={styles.promoTitle}>Doorstep Steam Detailing Combo</Text>
              <Text style={styles.promoSubtitle}>Get 20% off your first full exterior + interior steam booking</Text>
              
              <Pressable
                onPress={() => {
                  router.push({
                    pathname: "/booking/[sectorId]",
                    params: { sectorId: "1", categoryName: "Car Wash", sectorName: "Mobile Car Wash" },
                  } as any);
                }}
                style={styles.promoBtn}
              >
                <Text style={[styles.promoBtnText, { color: colors.primary }]}>Claim Offer</Text>
                <ArrowRight size={14} color={colors.primary} />
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        {/* ── RESULTS HEADER & COUNT ── */}
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsCountText, { color: colors.text }]}>
            {filteredServices.length} {filteredServices.length === 1 ? "Service" : "Services"} Available
          </Text>

          <View style={styles.sortRow}>
            <Pressable
              onPress={() => {
                setSortBy((prev) => (prev === "popular" ? "price_asc" : prev === "price_asc" ? "rating" : "popular"));
              }}
              style={[
                styles.sortButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <SlidersHorizontal size={13} color={colors.subtext} />
              <Text style={[styles.sortButtonText, { color: colors.text }]}>
                {sortBy === "popular" ? "Popular" : sortBy === "price_asc" ? "Price: Low to High" : "Top Rated"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── SERVICE CARDS ── */}
        {filteredServices.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Search size={44} color={colors.subtext} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No services matched</Text>
            <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
              Try adjusting your search terms or filter selection.
            </Text>
            <Pressable
              onPress={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              style={[styles.emptyResetBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.emptyResetBtnText}>Reset All Filters</Text>
            </Pressable>
          </View>
        ) : (
          filteredServices.map((service) => (
            <View
              key={service.id}
              style={[
                styles.serviceCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  shadowColor: colors.isDark ? "#000000" : "#64748B",
                },
              ]}
            >
              {/* Badge & Category */}
              <View style={styles.cardTopRow}>
                <View style={[styles.categoryTag, { backgroundColor: colors.primaryLight }]}>
                  {service.categorySlug === "car-washing" ? (
                    <Car size={13} color={colors.primary} />
                  ) : (
                    <Building2 size={13} color={colors.secondary} />
                  )}
                  <Text style={[styles.categoryTagText, { color: colors.text }]}>
                    {service.sectorName}
                  </Text>
                </View>

                {service.badge ? (
                  <View style={[styles.badgePill, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.badgePillText, { color: colors.primary }]}>{service.badge}</Text>
                  </View>
                ) : null}
              </View>

              {/* Title & Subtitle */}
              <Text style={[styles.serviceTitle, { color: colors.text }]}>
                {service.title}
              </Text>
              <Text style={[styles.serviceSubtitle, { color: colors.subtext }]}>
                {service.subtitle}
              </Text>

              {/* Features List */}
              <View style={styles.featuresList}>
                {service.features.map((feat, fIdx) => (
                  <View key={fIdx} style={styles.featureItem}>
                    <CheckCircle2 size={13} color={colors.secondary} />
                    <Text style={[styles.featureText, { color: colors.subtext }]}>
                      {feat}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Divider */}
              <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

              {/* Footer: Rating, Duration, Price & Action */}
              <View style={styles.cardFooter}>
                <View style={styles.metaRow}>
                  <View style={styles.ratingBox}>
                    <Star size={13} color="#F59E0B" fill="#F59E0B" />
                    <Text style={[styles.ratingVal, { color: colors.text }]}>{service.rating}</Text>
                    <Text style={[styles.ratingCount, { color: colors.subtext }]}>
                      ({service.reviewCount})
                    </Text>
                  </View>

                  <View style={styles.metaDot} />

                  <View style={styles.durationBox}>
                    <Clock size={13} color={colors.subtext} />
                    <Text style={[styles.durationVal, { color: colors.subtext }]}>
                      {service.duration}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionContainer}>
                  <View style={styles.priceContainer}>
                    <Text style={[styles.pricePrefix, { color: colors.subtext }]}>
                      from
                    </Text>
                    <Text style={[styles.priceVal, { color: colors.text }]}>
                      {service.price}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => handleBookService(service)}
                    style={({ pressed }) => [
                      styles.bookBtn,
                      { backgroundColor: colors.primary },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={styles.bookBtnText}>Book Now</Text>
                    <ChevronRight size={15} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
    borderWidth: 0,
  },
  clearBtn: {
    padding: 4,
  },
  categoryPillsContainer: {
    marginTop: 2,
  },
  categoryPillsScroll: {
    gap: 8,
    paddingRight: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  promoCardContainer: {
    borderRadius: 18,
    overflow: "hidden",
  },
  promoCard: {
    padding: 18,
    borderRadius: 18,
  },
  promoContent: {
    gap: 6,
  },
  promoTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  promoTagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  promoTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
  },
  promoSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 17,
  },
  promoBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 6,
  },
  promoBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsCountText: {
    fontSize: 15,
    fontWeight: "700",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  serviceCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
  },
  serviceSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  featuresList: {
    gap: 4,
    marginTop: 2,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featureText: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardDivider: {
    height: 1,
    width: "100%",
    marginVertical: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingVal: {
    fontSize: 13,
    fontWeight: "700",
  },
  ratingCount: {
    fontSize: 11,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#94A3B8",
  },
  durationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationVal: {
    fontSize: 12,
  },
  actionContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  pricePrefix: {
    fontSize: 10,
    fontWeight: "500",
  },
  priceVal: {
    fontSize: 14,
    fontWeight: "800",
  },
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bookBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyContainer: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  emptyResetBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  emptyResetBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
