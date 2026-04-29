import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, Modal, TextInput } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ChevronLeft, Plus, CreditCard, Trash2, CheckCircle2, Pencil, X } from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";

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
    { id: "1", type: "Visa", last4: "4242", expiry: "12/26", color: "#6366f1", isDefault: true },
    { id: "2", type: "Mastercard", last4: "8888", expiry: "09/25", color: "#ec4899", isDefault: false },
  ]);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(style).catch(() => {});
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
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert("Error", msg);
      return;
    }

    if (editingCard) {
      // Update existing
      setCards(prev => prev.map(c => c.id === editingCard.id ? {
        ...c,
        type: cardType,
        last4: cardLast4,
        expiry: cardExpiry
      } : c));
    } else {
      // Add new
      const newCard: Card = {
        id: Math.random().toString(),
        type: cardType,
        last4: cardLast4,
        expiry: cardExpiry,
        color: cardType.toLowerCase().includes("visa") ? "#3b82f6" : "#8b5cf6",
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
      setConfirmDeleteVisible(false);
      setSelectedId(null);
    }
  };

  const handleSetDefault = (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setCards(prev => prev.map(c => ({
      ...c,
      isDefault: c.id === id
    })));
  };

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#ffffff" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Payments</Text>
        <Pressable onPress={openAddModal} style={styles.addButton}>
          <Plus color="#ffffff" size={24} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Saved Cards</Text>
        
        {cards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No payment methods saved.</Text>
          </View>
        ) : (
          cards.map((card) => (
            <BlurView key={card.id} intensity={20} tint="dark" style={[styles.cardItem, card.isDefault && styles.defaultCard]}>
              <View style={styles.cardHeader}>
                <Pressable style={styles.cardInfoPressable} onPress={() => handleSetDefault(card.id)}>
                  <View style={[styles.cardIconBox, { backgroundColor: `${card.color}20` }]}>
                    <CreditCard color={card.color} size={24} />
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.cardName}>{card.type} •••• {card.last4}</Text>
                      {card.isDefault && <CheckCircle2 size={16} color="#10b981" />}
                    </View>
                    <Text style={styles.cardExpiry}>Expires {card.expiry}</Text>
                  </View>
                </Pressable>
                
                <View style={styles.actionButtons}>
                  <Pressable style={styles.actionBtn} onPress={() => openEditModal(card)}>
                    <Pencil color="#94a3b8" size={18} />
                  </Pressable>
                  <Pressable style={styles.actionBtn} onPress={() => handleDelete(card.id)}>
                    <Trash2 color="#ef4444" size={18} />
                  </Pressable>
                </View>
              </View>
            </BlurView>
          ))
        )}

        <Pressable style={styles.addMethodBtn} onPress={openAddModal}>
          <Plus color="#a78bfa" size={20} />
          <Text style={styles.addMethodText}>Add New Payment Method</Text>
        </Pressable>
      </ScrollView>

      {/* Card Form Modal (Add/Edit) */}
      <Modal visible={cardModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.formContainer}>
            <BlurView intensity={90} tint="dark" style={styles.formContent}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>{editingCard ? "Edit Card" : "Add New Card"}</Text>
                <Pressable onPress={() => setCardModalVisible(false)} style={styles.closeBtn}>
                  <X color="#94a3b8" size={24} />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Card Provider (Visa, Mastercard, etc.)</Text>
                <TextInput
                  style={styles.textInput}
                  value={cardType}
                  onChangeText={setCardType}
                  placeholder="e.g. Visa"
                  placeholderTextColor="#475569"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 2 }]}>
                  <Text style={styles.inputLabel}>Last 4 Digits</Text>
                  <TextInput
                    style={styles.textInput}
                    value={cardLast4}
                    onChangeText={(val) => setCardLast4(val.substring(0, 4))}
                    placeholder="1234"
                    placeholderTextColor="#475569"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Expiry</Text>
                  <TextInput
                    style={styles.textInput}
                    value={cardExpiry}
                    onChangeText={setCardExpiry}
                    placeholder="MM/YY"
                    placeholderTextColor="#475569"
                    maxLength={5}
                  />
                </View>
              </View>

              <Pressable style={styles.saveBtn} onPress={handleSaveCard}>
                <Text style={styles.saveBtnText}>{editingCard ? "Update Card" : "Save Card"}</Text>
              </Pressable>
            </BlurView>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <ActionModal
        visible={confirmDeleteVisible}
        type="danger"
        title="Delete Card?"
        message="Are you sure you want to remove this payment method? This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />

      {/* Success Modal */}
      <ActionModal
        visible={successModal}
        type="success"
        title={editingCard ? "Card Updated" : "Card Added"}
        message={editingCard ? "Your payment method has been successfully updated." : "Your new payment method has been successfully saved to your profile."}
        confirmText="Perfect"
        onConfirm={() => setSuccessModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  backButton: { padding: 8 },
  addButton: { padding: 8 },
  content: { padding: 24 },
  sectionTitle: { color: "#94a3b8", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", marginBottom: 16, letterSpacing: 1 },
  cardItem: { borderRadius: 24, overflow: "hidden", marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  defaultCard: { borderColor: "rgba(16, 185, 129, 0.4)", backgroundColor: "rgba(16, 185, 129, 0.05)" },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 16 },
  cardInfoPressable: { flex: 1, flexDirection: "row", alignItems: "center" },
  cardIconBox: { width: 46, height: 46, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardName: { color: "#ffffff", fontSize: 16, fontWeight: "bold", marginBottom: 2 },
  cardExpiry: { color: "#64748b", fontSize: 13 },
  actionButtons: { flexDirection: "row", gap: 4 },
  actionBtn: { padding: 10 },
  addMethodBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: "rgba(109, 40, 217, 0.08)",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(109, 40, 217, 0.5)",
  },
  addMethodText: { color: "#a78bfa", fontWeight: "bold", fontSize: 15 },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyText: { color: "#475569", fontSize: 16 },
  
  // MODAL STYLES
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  formContainer: { borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  formContent: { padding: 32, paddingBottom: 50 },
  formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 32 },
  formTitle: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },
  closeBtn: { padding: 4 },
  inputGroup: { marginBottom: 24 },
  inputLabel: { color: "#94a3b8", fontSize: 14, fontWeight: "600", marginBottom: 8, marginLeft: 4 },
  textInput: { backgroundColor: "rgba(255, 255, 255, 0.05)", borderRadius: 16, padding: 16, color: "#ffffff", fontSize: 16, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.1)" },
  row: { flexDirection: "row", gap: 16 },
  saveBtn: { backgroundColor: "#6d28d9", padding: 18, borderRadius: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#ffffff", fontWeight: "bold", fontSize: 17 },
});
