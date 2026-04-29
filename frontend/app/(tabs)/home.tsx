import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

import API from "../../src/api/client";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  const [services, setServices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const res = await API.get("/services");
      setServices(res.data.data);
      setFiltered(res.data.data);
    } catch (e) {
      console.log(e);
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
  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  /* BOOK */
  const handleBook = (id: number) => {
    router.push(`/booking/${id}`);
  };

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>Our Services</Text>
          <Text style={styles.subtitle}>Choose your perfect wash</Text>
        </View>

        {/* SEARCH */}
        <View style={styles.search}>
          <Ionicons name="search" size={18} color="#aaa" />
          <TextInput
            placeholder="Search services..."
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
            style={{ color: "#fff", marginLeft: 8, flex: 1 }}
          />
        </View>

        {/* SERVICES */}
        <View style={styles.list}>
          {filtered.map((item: any, index) => (
            <Animated.View key={item.id} entering={FadeInUp.delay(index * 80)}>
              <BlurView intensity={30} tint="dark" style={styles.card}>
                {/* IMAGE */}
                <Image
                  source={require("../../assets/myimage/wash-premium.png")}
                  style={styles.image}
                />

                {/* CONTENT */}
                <View style={styles.content}>
                  <View style={styles.row}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.price}>${item.price}</Text>
                  </View>

                  <Text style={styles.desc}>{item.description}</Text>

                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => handleBook(item.id)}
                  >
                    <Text style={styles.buttonText}>Book Now</Text>
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
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "bold",
  },
  subtitle: {
    color: "#aaa",
    marginTop: 6,
  },

  search: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  list: {
    paddingHorizontal: 16,
    gap: 16,
  },

  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  image: {
    width: "100%",
    height: 140,
  },

  content: {
    padding: 16,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  name: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  price: {
    color: "#8b5cf6",
    fontWeight: "bold",
  },

  desc: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 12,
  },

  button: {
    backgroundColor: "#6d28d9",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
