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
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Clock, ChevronRight, Search } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import API from "../../src/api/client";
import { useLanguage } from "../../contexts/LanguageContext";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [services, setServices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    loadServices();
    loadUser();
  }, []);

  const loadServices = async () => {
    try {
      const res = await API.get("/services");
      setServices(res.data.data);
      setFiltered(res.data.data);
    } catch (e) {
      console.log("Error loading services:", e);
    }
  };

  const loadUser = async () => {
    try {
      const res = await API.get("/me");
      setUser(res.data.data.user);
    } catch (e) {
      console.log("Error loading user:", e);
    }
  };

  /* SEARCH */
  useEffect(() => {
    const result = services.filter((s: any) =>
      s.name?.toLowerCase().includes(search.toLowerCase()),
    );
    setFiltered(result);
  }, [search, services]);

  /* REFRESH */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await loadServices();
    setRefreshing(false);
  }, []);

  /* BOOK */
  const handleBook = (id: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(`/booking/${id}`);
  };

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
          <Text style={styles.subtitle}>Select a service for your car</Text>
        </View>

        {/* SEARCH */}
        <BlurView intensity={10} tint="dark" style={styles.searchContainer}>
          <Search size={18} color="#a3a3a3" />
          <TextInput
            placeholder="Search services..."
            placeholderTextColor="#a3a3a3"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </BlurView>

        {/* SERVICES */}
        <View style={styles.servicesList}>
          {filtered.map((item: any, index) => (
            <Animated.View key={item.id} entering={FadeInUp.delay(index * 80)}>
              <BlurView intensity={20} tint="dark" style={styles.card}>
                {/* IMAGE */}
                <Image
                  source={require("../../assets/myimage/wash-premium.png")}
                  style={styles.cardImage}
                  resizeMode="cover"
                />

                {/* CONTENT */}
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardPrice}>${item.price}</Text>
                  </View>

                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description}
                  </Text>

                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Clock size={14} color="#a3a3a3" />
                      <Text style={styles.metaText}>30-45 min</Text>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.bookButton,
                      pressed && styles.bookButtonPressed,
                    ]}
                    onPress={() => handleBook(item.id)}
                  >
                    <Text style={styles.bookButtonText}>Book Now</Text>
                    <ChevronRight size={16} color="#ffffff" />
                  </Pressable>
                </View>
              </BlurView>
            </Animated.View>
          ))}
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
    fontSize: 22,
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
