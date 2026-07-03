import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import API from "../../src/api/client";
import { useAuth } from "../../contexts/AuthContext";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
}

interface ActiveSub {
  id: number;
  plan: string;
  status: string;
  renews_at: string | null;
}

const PROVIDER_OPTIONS = [
  { id: "telebirr", label: "Telebirr", icon: "phone-portrait-outline" as const, color: "#f59e0b" },
  { id: "cbe", label: "CBE Birr", icon: "card-outline" as const, color: "#3b82f6" },
];

// ─── PLAN CARD ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrentTier,
  onUpgrade,
}: {
  plan: Plan;
  isCurrentTier: boolean;
  onUpgrade: (plan: Plan) => void;
}) {
  const isPremium = plan.id === "premium";

  return (
    <Animated.View entering={FadeInDown.delay(isPremium ? 150 : 0)}>
      <BlurView
        intensity={25}
        tint="dark"
        style={[styles.planCard, isPremium && styles.planCardPremium]}
      >
        {isPremium && (
          <LinearGradient
            colors={["#7c3aed22", "#4f46e522"]}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>
              <Text style={styles.planPriceBig}>
                {plan.currency} {plan.price.toLocaleString()}
              </Text>
              <Text style={styles.planPeriod}> / month</Text>
            </Text>
          </View>
          {isPremium && (
            <View style={styles.popularBadge}>
              <Ionicons name="star" size={10} color="#fbbf24" />
              <Text style={styles.popularText}>Popular</Text>
            </View>
          )}
        </View>

        <View style={styles.featuresList}>
          {plan.features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={16} color={isPremium ? "#a78bfa" : "#10b981"} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => onUpgrade(plan)}
          disabled={isCurrentTier}
          style={({ pressed }) => [
            styles.upgradeBtn,
            isPremium && styles.upgradeBtnPremium,
            isCurrentTier && styles.upgradeBtnDisabled,
            pressed && !isCurrentTier && { opacity: 0.8 },
          ]}
        >
          <Text style={[styles.upgradeBtnText, isCurrentTier && { color: "#475569" }]}>
            {isCurrentTier ? "Current Plan" : `Get ${plan.name}`}
          </Text>
        </Pressable>
      </BlurView>
    </Animated.View>
  );
}

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSub, setActiveSub] = useState<ActiveSub | null>(null);
  const [loading, setLoading] = useState(true);

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, meRes] = await Promise.all([
        API.get("/subscriptions/plans"),
        API.get("/me"),
      ]);
      setPlans(plansRes.data ?? []);

      const customerSub = meRes.data?.data?.active_subscription;
      setActiveSub(customerSub ?? null);
    } catch (e) {
      console.log("Subscription load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpgrade = (plan: Plan) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPlan(plan);
    setSelectedProvider(null);
    setPaymentModal(true);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !selectedProvider) {
      Alert.alert("Payment Method Required", "Please select a payment method to continue.");
      return;
    }

    setSubscribing(true);
    try {
      const subRes = await API.post("/subscriptions/subscribe", {
        plan: selectedPlan.id,
        billing_cycle: "monthly",
      });
      const invoice = subRes.data?.invoice;

      // Immediately initiate payment for the generated invoice
      const payRes = await API.post("/payments", {
        invoice_id: invoice.id,
        provider: selectedProvider,
      });

      setPaymentModal(false);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        "Subscription Initiated! 🎉",
        `Your ${selectedPlan.name} subscription invoice has been created. Your plan will activate once payment is confirmed by our team.`,
        [{ text: "OK", onPress: () => loadData() }]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Could not initiate subscription. Please try again.");
    } finally {
      setSubscribing(false);
    }
  };

  const currentTier = activeSub?.plan ?? "none";

  if (loading) {
    return (
      <LinearGradient colors={["#07070f", "#0f1028"]} style={styles.center}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#07070f", "#0f1028", "#1a1445"]} style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>My Subscription</Text>
          <Text style={styles.headerSub}>Upgrade for exclusive benefits</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }}>
        {/* Current Status Card */}
        <Animated.View entering={FadeInUp.duration(500)}>
          <BlurView intensity={30} tint="dark" style={styles.statusCard}>
            <LinearGradient
              colors={activeSub?.status === "active" ? ["#10b98122", "#059669aa"] : ["#1e293b44", "#0f172a44"]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.statusRow}>
              <View style={[styles.statusIcon, { backgroundColor: activeSub?.status === "active" ? "rgba(16,185,129,0.2)" : "rgba(100,116,139,0.2)" }]}>
                <Ionicons
                  name={activeSub?.status === "active" ? "shield-checkmark" : "shield-outline"}
                  size={22}
                  color={activeSub?.status === "active" ? "#10b981" : "#64748b"}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>
                  {activeSub?.status === "active"
                    ? `${activeSub.plan.charAt(0).toUpperCase() + activeSub.plan.slice(1)} Plan`
                    : "Free Tier"}
                </Text>
                <Text style={styles.statusDesc}>
                  {activeSub?.status === "active"
                    ? `Renews ${activeSub.renews_at ? new Date(activeSub.renews_at).toLocaleDateString("en-ET", { day: "2-digit", month: "long", year: "numeric" }) : "soon"}`
                    : "No active subscription"}
                </Text>
              </View>
              <View style={[styles.statusPill, { borderColor: activeSub?.status === "active" ? "#10b98155" : "#64748b55" }]}>
                <View style={[styles.statusDot, { backgroundColor: activeSub?.status === "active" ? "#10b981" : "#64748b" }]} />
                <Text style={[styles.statusPillText, { color: activeSub?.status === "active" ? "#10b981" : "#64748b" }]}>
                  {activeSub?.status === "active" ? "Active" : "Free"}
                </Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>

        {/* Plans */}
        <Text style={styles.sectionTitle}>Choose Your Plan</Text>
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrentTier={currentTier === plan.id}
            onUpgrade={handleUpgrade}
          />
        ))}
      </ScrollView>

      {/* Payment Method Modal */}
      <Modal
        visible={paymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={60} tint="dark" style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Subscribe to {selectedPlan?.name}
            </Text>
            <Text style={styles.modalAmount}>
              ETB {selectedPlan?.price.toLocaleString()} / month
            </Text>

            <Text style={styles.modalLabel}>Select Payment Method</Text>
            {PROVIDER_OPTIONS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setSelectedProvider(p.id)}
                style={[
                  styles.providerBtn,
                  selectedProvider === p.id && styles.providerBtnActive,
                ]}
              >
                <Ionicons name={p.icon} size={20} color={selectedProvider === p.id ? "#fff" : p.color} />
                <Text style={[styles.providerLabel, selectedProvider === p.id && { color: "#fff" }]}>
                  {p.label}
                </Text>
                {selectedProvider === p.id && (
                  <Ionicons name="checkmark-circle" size={18} color="#10b981" style={{ marginLeft: "auto" }} />
                )}
              </Pressable>
            ))}

            <Pressable
              onPress={handleSubscribe}
              disabled={subscribing || !selectedProvider}
              style={({ pressed }) => [
                styles.confirmBtn,
                (!selectedProvider || subscribing) && styles.confirmBtnDisabled,
                pressed && selectedProvider && !subscribing && { opacity: 0.85 },
              ]}
            >
              {subscribing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm Subscription</Text>
              )}
            </Pressable>

            <Pressable onPress={() => setPaymentModal(false)} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </Pressable>
          </BlurView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  headerSub: { color: "#64748b", fontSize: 12, marginTop: 2 },

  statusCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    marginBottom: 28,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  statusTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  statusDesc: { color: "#64748b", fontSize: 12, marginTop: 2 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: "700" },

  sectionTitle: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 14,
    paddingLeft: 2,
  },

  planCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    marginBottom: 16,
  },
  planCardPremium: {
    borderColor: "rgba(139,92,246,0.4)",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  planName: { color: "#fff", fontSize: 18, fontWeight: "700" },
  planPrice: { marginTop: 4 },
  planPriceBig: { color: "#a78bfa", fontSize: 22, fontWeight: "800" },
  planPeriod: { color: "#64748b", fontSize: 13 },
  popularBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251,191,36,0.15)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.3)",
  },
  popularText: { color: "#fbbf24", fontSize: 10, fontWeight: "700" },

  featuresList: { gap: 10, marginBottom: 20 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { color: "#cbd5e1", fontSize: 13, flex: 1 },

  upgradeBtn: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  upgradeBtnPremium: {
    backgroundColor: "#7c3aed",
    borderColor: "#8b5cf6",
  },
  upgradeBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: "rgba(255,255,255,0.05)",
  },
  upgradeBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  modalAmount: { color: "#a78bfa", fontSize: 15, fontWeight: "600", marginBottom: 24 },
  modalLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  providerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 10,
  },
  providerBtnActive: {
    borderColor: "rgba(139,92,246,0.5)",
    backgroundColor: "rgba(139,92,246,0.15)",
  },
  providerLabel: { color: "#cbd5e1", fontSize: 14, fontWeight: "600" },
  confirmBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  confirmBtnDisabled: {
    backgroundColor: "rgba(124,58,237,0.3)",
  },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelLink: { alignItems: "center", marginTop: 16, paddingVertical: 4 },
  cancelLinkText: { color: "#475569", fontSize: 13 },
});
