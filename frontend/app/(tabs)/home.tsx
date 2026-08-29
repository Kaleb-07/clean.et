import React, { useEffect, useState, useCallback } from "react";
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
import { Clock, ChevronRight, Search, Car, Building2, Sparkles } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import API from "../../src/api/client";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCategories } from "../../hooks/useCategories";

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
  const { categories, loading, error, reload } = useCategories();

  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [liveServices, setLiveServices] = useState<any[]>([]);

  useEffect(() => {
    loadUser();
    loadLiveServices();
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

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
    await Promise.all([reload(), loadLiveServices()]);
    setRefreshing(false);
  }, [reload]);

  const handleBook = (id: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(`/booking/${id}`);
  };

  const activeCategory = categories.find((c) => c.id === activeCategoryId);
  const sectors = activeCategory ? activeCategory.sectors : [];
  const filteredSectors = sectors.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: Math.max(insets.top, 60),
          paddingBottom: insets.bottom + 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
          />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.name || "Guest"}</Text>
          <Text style={styles.subtitle}>Select a sector cleaning category</Text>
        </View>

        {/* CATEGORY SELECTOR CARDS */}
        <View style={styles.categoryContainer}>
          {categories.map((cat) => {
            const isActive = cat.id === activeCategoryId;
            const Icon = cat.slug === "car-washing" ? Car : Building2;
            return (
              <Pressable
                key={cat.id}
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  setActiveCategoryId(cat.id);
                }}
                style={styles.categoryCardWrapper}
              >
                <BlurView
                  intensity={isActive ? 40 : 15}
                  tint={isActive ? "light" : "dark"}
                  style={[
                    styles.categoryCard,
                    isActive && styles.categoryCardActive,
                  ]}
                >
                  <LinearGradient
                    colors={isActive ? ["#8b5cf6", "#6d28d9"] : ["transparent", "transparent"]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.categoryIconWrapper}>
                    <Icon size={24} color={isActive ? "#ffffff" : "#a3a3a3"} />
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      isActive && styles.categoryLabelActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </BlurView>
              </Pressable>
            );
          })}
        </View>

        {/* SEARCH */}
        <BlurView intensity={10} tint="dark" style={styles.searchContainer}>
          <Search size={18} color="#a3a3a3" />
          <TextInput
            placeholder="Search sectors..."
            placeholderTextColor="#a3a3a3"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </BlurView>

        {/* LOADING & ERROR */}
        {loading && !refreshing && (
          <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 40 }} />
        )}

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* SECTORS & LIVE DIVISION SERVICES */}
        <View style={styles.servicesList}>
          {/* Live Division Posted Services */}
          {liveServices
            .filter((s) => {
              const matchesCat = (s.category || "car-washing") === (activeCategory?.slug || "car-washing");
              const q = search.toLowerCase();
              return !q || (s.name || "").toLowerCase().includes(q) || (s.description || "").toLowerCase().includes(q);
            })
            .map((s, index) => {
              const defaultImg =
                activeCategory?.slug === "building-cleaning"
                  ? require("../../assets/myimage/wash-basic.png")
                  : require("../../assets/myimage/wash-premium.png");
              const imgSource = s.image ? { uri: s.image } : defaultImg;

              return (
                <Animated.View key={`live-service-${s.id}`} entering={FadeInUp.delay(index * 60)}>
                  <BlurView intensity={25} tint="dark" style={[styles.card, { borderColor: "rgba(16, 185, 129, 0.3)" }]}>
                    <Image source={imgSource} style={styles.cardImage} resizeMode="cover" />

                    <View style={styles.cardContent}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <View style={{ backgroundColor: "#10B98122", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                          <Text style={{ color: "#34D399", fontSize: 11, fontWeight: "700" }}>
                            {s.sub_center?.toUpperCase() || "DIVISION CENTER"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>{s.name}</Text>
                        <Text style={styles.cardPrice}>{parseFloat(s.price).toLocaleString()} ETB</Text>
                      </View>

                      <Text style={styles.cardDescription} numberOfLines={2}>
                        {s.description || "Official division cleaning service."}
                      </Text>

                      <View style={styles.cardMeta}>
                        <View style={styles.metaItem}>
                          <Clock size={14} color="#a3a3a3" />
                          <Text style={styles.metaText}>{s.duration || 45} mins</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Sparkles size={14} color="#10B981" />
                          <Text style={[styles.metaText, { color: "#34D399" }]}>Verified Division</Text>
                        </View>
                      </View>

                      <Pressable
                        style={({ pressed }) => [
                          styles.bookButton,
                          { backgroundColor: "#059669" },
                          pressed && styles.bookButtonPressed,
                        ]}
                        onPress={() => handleBook(s.id)}
                      >
                        <Text style={styles.bookButtonText}>Book Division Service</Text>
                        <ChevronRight size={16} color="#ffffff" />
                      </Pressable>
                    </View>
                  </BlurView>
                </Animated.View>
              );
            })}

          {filteredSectors.map((item: any, index) => {
            const meta = SECTOR_METADATA[item.slug] || {
              description: "Professional cleaning service custom-tailored to your exact specifications.",
              duration: "Flexible",
              startingPrice: "Pricing details inside",
              image: require("../../assets/myimage/wash-premium.png"),
            };

            return (
              <Animated.View key={item.id} entering={FadeInUp.delay(index * 80)}>
                <BlurView intensity={20} tint="dark" style={styles.card}>
                  {/* IMAGE */}
                  <Image source={meta.image} style={styles.cardImage} resizeMode="cover" />

                  {/* CONTENT */}
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{item.name}</Text>
                      <Text style={styles.cardPrice}>{meta.startingPrice}</Text>
                    </View>

                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {meta.description}
                    </Text>

                    <View style={styles.cardMeta}>
                      <View style={styles.metaItem}>
                        <Clock size={14} color="#a3a3a3" />
                        <Text style={styles.metaText}>{meta.duration}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Sparkles size={14} color="#a3a3a3" />
                        <Text style={styles.metaText}>Premium Care</Text>
                      </View>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.bookButton,
                        pressed && styles.bookButtonPressed,
                      ]}
                      onPress={() => handleBook(item.id)}
                    >
                      <Text style={styles.bookButtonText}>Configure Booking</Text>
                      <ChevronRight size={16} color="#ffffff" />
                    </Pressable>
                  </View>
                </BlurView>
              </Animated.View>
            );
          })}
        </View>
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
    marginBottom: 24,
  },
  greeting: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#a3a3a3",
  },
  categoryContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  categoryCardWrapper: {
    flex: 1,
  },
  categoryCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    overflow: "hidden",
  },
  categoryCardActive: {
    borderColor: "rgba(139, 92, 246, 0.3)",
  },
  categoryIconWrapper: {
    marginBottom: 8,
    zIndex: 1,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#a3a3a3",
    zIndex: 1,
    textAlign: "center",
  },
  categoryLabelActive: {
    color: "#ffffff",
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    marginHorizontal: 24,
    marginBottom: 16,
    fontSize: 14,
  },
  searchContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  searchInput: {
    color: "#ffffff",
    marginLeft: 10,
    flex: 1,
    fontSize: 16,
  },
  servicesList: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 16,
  },
  cardImage: {
    width: "100%",
    height: 160,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8b5cf6",
  },
  cardDescription: {
    fontSize: 14,
    color: "#a3a3a3",
    marginBottom: 16,
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: "#a3a3a3",
    fontWeight: "500",
  },
  bookButton: {
    backgroundColor: "#6d28d9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  bookButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  bookButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
