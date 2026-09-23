import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, Modal, TextInput, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Plus, CreditCard, Trash2, CheckCircle2, Pencil, X, BarChart2, DollarSign, FileText } from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";
import { useAuth } from "../../contexts/AuthContext";
import { useSuperAdmin } from "../../hooks/useSuperAdmin";

interface Card {
  id: string;
  type: string;
  last4: string;
  expiry: string;
  color: string;
  isDefault: boolean;
}

export default function PaymentsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { payouts, analytics } = useSuperAdmin();
  const isSuperAdmin = user?.role === "super_admin";
  
  // Modal States
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState(false);
  
  // Card Form Modal State
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [cardType, setCardType] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");

  const [cards, setCards] = useState<Card[]>([
    { id: "1", type: "Telebirr Enterprise", last4: "8899", expiry: "Active Gateway", color: "#10B981", isDefault: true },
    { id: "2", type: "CBE Commercial Account", last4: "4242", expiry: "Active Settlement", color: "#3B82F6", isDefault: false },
  ]);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(admin)/(tabs)/Profile");
    }
  };

  const openAddModal = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditingCard(null);
    setCardType("");
    setCardLast4("");
    setCardExpiry("");
    setCardModalVisible(true);
  };

  const openEditModal = (card: Card) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditingCard(card);
    setCardType(card.type);
    setCardLast4(card.last4);
    setCardExpiry(card.expiry);
    setCardModalVisible(true);
  };

  const handleSaveCard = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    
    if (!cardType || !cardLast4 || !cardExpiry) {
      const msg = "Please fill in all fields.";
      Platform.OS === "web" ? window.alert(msg) : Alert.alert("Error", msg);
      return;
    }

    if (editingCard) {
      setCards(prev => prev.map(c => c.id === editingCard.id ? {
        ...c,
        type: cardType,
        last4: cardLast4,
        expiry: cardExpiry
      } : c));
    } else {
      const newCard: Card = {
        id: Math.random().toString(),
        type: cardType,
        last4: cardLast4,
        expiry: cardExpiry,
        color: "#6366f1",
        isDefault: cards.length === 0
      };
      setCards(prev => [...prev, newCard]);
    }

    setCardModalVisible(false);
    setSuccessModal(true);
  };

  const handleDelete = (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedId(id);
    setConfirmDeleteVisible(true);
  };

  const confirmDelete = () => {
    if (selectedId) {
      setCards(prev => prev.filter(c => c.id !== selectedId));
    }
    setConfirmDeleteVisible(false);
    setSelectedId(null);
  };

  return (
    <LinearGradient colors={["#0B0F19", "#111827", "#1E1B4B"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ChevronLeft color="#ffffff" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isSuperAdmin ? "Financial Settlements & Payments" : "Payment Methods"}
        </Text>
        <Pressable onPress={openAddModal} style={styles.addButton}>
          <Plus color="#ffffff" size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* SUPER ADMIN EXECUTIVE SETTLEMENTS BANNER */}
        {isSuperAdmin && (
          <View style={styles.adminBanner}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <DollarSign size={24} color="#34D399" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFF", fontWeight: "800", fontSize: 16 }}>
                  Division Financial Settlements
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 1 }}>
                  Manage Gross Merchandise Revenue (GMV) & Vendor Settlements
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={styles.adminBannerBtnPrimary}
                onPress={() => router.push("/(admin)/reports")}
              >
                <BarChart2 size={16} color="#FFF" />
                <Text style={styles.adminBannerBtnText}>View Financial Reports</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adminBannerBtnSecondary}
                onPress={() => router.push("/(admin)/tenants")}
              >
                <FileText size={16} color="#34D399" />
                <Text style={[styles.adminBannerBtnText, { color: "#34D399" }]}>Division Payouts</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          {isSuperAdmin ? "Active Payment Gateways & Accounts" : "Saved Cards"}
        </Text>

        <View style={styles.cardList}>
          {cards.map((card) => (
            <BlurView key={card.id} intensity={20} tint="dark" style={styles.cardWrapper}>
              <View style={[styles.card, { borderColor: card.color }]}>
                <View style={styles.cardHeader}>
                  <CreditCard size={28} color={card.color} />
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <Pressable onPress={() => openEditModal(card)}>
                      <Pencil size={18} color="#94a3b8" />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(card.id)}>
                      <Trash2 size={18} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>

                <Text style={styles.cardNumber}>•••• •••• •••• {card.last4}</Text>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.cardLabel}>{card.type}</Text>
                    <Text style={styles.cardValue}>{card.expiry}</Text>
                  </View>

                  {card.isDefault && (
                    <View style={styles.defaultBadge}>
                      <CheckCircle2 size={12} color="#10b981" />
                      <Text style={styles.defaultText}>Active Gateway</Text>
                    </View>
                  )}
                </View>
              </View>
            </BlurView>
          ))}
        </View>
      </ScrollView>

      {/* Delete Modal */}
      <ActionModal
        visible={confirmDeleteVisible}
        type="danger"
        title="Remove Payment Account?"
        message="Are you sure you want to remove this account from your active gateways?"
        confirmText="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />

      {/* Add / Edit Card Modal */}
      <Modal visible={cardModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingCard ? "Edit Account" : "Add Payment Method"}</Text>
              <Pressable onPress={() => setCardModalVisible(false)}>
                <X color="#94a3b8" size={24} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account / Card Provider</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Telebirr / CBE / Visa"
                placeholderTextColor="#475569"
                value={cardType}
                onChangeText={setCardType}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account Number (Last 4 Digits)</Text>
              <TextInput
                style={styles.input}
                placeholder="1234"
                placeholderTextColor="#475569"
                keyboardType="numeric"
                maxLength={4}
                value={cardLast4}
                onChangeText={setCardLast4}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expiry / Settlement Status</Text>
              <TextInput
                style={styles.input}
                placeholder="12/26 or Active"
                placeholderTextColor="#475569"
                value={cardExpiry}
                onChangeText={setCardExpiry}
              />
            </View>

            <Pressable style={styles.saveCardBtn} onPress={handleSaveCard}>
              <Text style={styles.saveCardBtnText}>Save Account</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <ActionModal
        visible={successModal}
        type="success"
        title="Account Saved"
        message="Payment method details have been successfully updated."
        confirmText="Great"
        onConfirm={() => setSuccessModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
  backButton: { padding: 8 },
  addButton: { padding: 8 },
  content: { padding: 20 },
  adminBanner: {
    backgroundColor: "#0F172A",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  adminBannerBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  adminBannerBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#064E3B",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: "#10B98155",
  },
  adminBannerBtnText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: 14 },
  cardList: { gap: 14 },
  cardWrapper: { borderRadius: 20, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  card: { padding: 20, borderRadius: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  cardNumber: { fontSize: 20, fontWeight: "bold", color: "#ffffff", letterSpacing: 2, marginBottom: 20 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  cardLabel: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase" },
  cardValue: { fontSize: 14, color: "#ffffff", fontWeight: "600", marginTop: 2 },
  defaultBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(16,185,129,0.15)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  defaultText: { color: "#10b981", fontSize: 10, fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#1E293B", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "#334155" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#ffffff" },
  inputGroup: { marginBottom: 16 },
  label: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12, color: "#ffffff", borderWidth: 0, borderColor: "transparent" },
  saveCardBtn: { backgroundColor: "#10B981", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  saveCardBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 15 },
});
