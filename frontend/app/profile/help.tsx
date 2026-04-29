import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Platform, Modal, TextInput, Linking, LayoutAnimation,
  UIManager,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft, HelpCircle, Phone, Mail, MessageCircle,
  ChevronDown, ChevronUp, X, Search, Send,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import ActionModal from "../../src/components/ActionModal";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const ALL_FAQS = [
  { q: "How do I cancel a booking?", a: "Go to the Bookings tab, select your active wash, tap the booking card, and choose 'Cancel Booking'. Cancellations are free up to 30 minutes before your appointment." },
  { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards (Visa, Mastercard) and local mobile money through Chapa. Cash on site is also available." },
  { q: "How long does a premium wash take?", a: "A premium wash typically takes 45–60 minutes depending on vehicle size and selected add-ons. You will receive a notification when your car is ready." },
  { q: "Can I reschedule my appointment?", a: "Yes! Open the Bookings tab, tap your booking, and choose 'Reschedule'. You can move it up to 1 hour before the appointment time." },
  { q: "Is my car safe during the wash?", a: "Absolutely. Our team is fully trained and insured. We document vehicle condition before and after each wash for your peace of mind." },
  { q: "Do you offer subscription plans?", a: "Yes, we offer weekly and monthly subscription plans with significant discounts. Visit the Services tab to explore plans." },
  { q: "How do I update my payment method?", a: "Go to Profile → Payment Methods. You can add, edit, or remove cards from there at any time." },
];

export default function HelpScreen() {
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") Haptics.impactAsync(style).catch(() => {});
  };

  const filteredFaqs = ALL_FAQS.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFaq = (index: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleCall = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL("tel:+251911000000").catch(() =>
      console.log("Phone not available on this device")
    );
  };

  const handleEmail = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL("mailto:support@carwash.com?subject=Support%20Request").catch(() =>
      console.log("Mail not available on this device")
    );
  };

  const handleChat = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setChatModalVisible(true);
  };

  const handleSendMessage = () => {
    if (!subject.trim() || !message.trim()) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    // Simulate sending
    console.log("Support message sent:", { subject, message });
    setChatModalVisible(false);
    setSubject("");
    setMessage("");
    setShowSuccess(true);
  };

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#ffffff" size={28} />
        </Pressable>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <HelpCircle size={44} color="#ffffff" />
          </View>
          <Text style={styles.heroTitle}>How can we help?</Text>
          <Text style={styles.heroDesc}>
            Search our FAQ or get in touch with our support team directly.
          </Text>
        </View>

        {/* CONTACT CARDS */}
        <View style={styles.contactRow}>
          <Pressable style={styles.contactCard} onPress={handleCall}>
            <View style={[styles.contactIcon, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
              <Phone size={22} color="#10b981" />
            </View>
            <Text style={styles.contactLabel}>Call Us</Text>
            <Text style={styles.contactSub}>+251 911 000 000</Text>
          </Pressable>

          <Pressable style={styles.contactCard} onPress={handleEmail}>
            <View style={[styles.contactIcon, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
              <Mail size={22} color="#3b82f6" />
            </View>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactSub}>support@carwash.com</Text>
          </Pressable>

          <Pressable style={styles.contactCard} onPress={handleChat}>
            <View style={[styles.contactIcon, { backgroundColor: "rgba(109,40,217,0.15)" }]}>
              <MessageCircle size={22} color="#8b5cf6" />
            </View>
            <Text style={styles.contactLabel}>Message</Text>
            <Text style={styles.contactSub}>Send a ticket</Text>
          </Pressable>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search questions..."
            placeholderTextColor="#475569"
          />
        </View>

        {/* FAQ ACCORDION */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

        {filteredFaqs.length === 0 ? (
          <View style={styles.emptySearch}>
            <Text style={styles.emptyText}>No results for "{searchQuery}"</Text>
          </View>
        ) : (
          filteredFaqs.map((faq, index) => (
            <BlurView key={index} intensity={20} tint="dark" style={styles.faqCard}>
              <Pressable style={styles.faqQuestion} onPress={() => toggleFaq(index)}>
                <Text style={styles.questionText}>{faq.q}</Text>
                {expandedIndex === index
                  ? <ChevronUp size={18} color="#6d28d9" />
                  : <ChevronDown size={18} color="#64748b" />}
              </Pressable>
              {expandedIndex === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.answerText}>{faq.a}</Text>
                </View>
              )}
            </BlurView>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── SEND MESSAGE MODAL ── */}
      <Modal visible={chatModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.formContainer}>
            <BlurView intensity={90} tint="dark" style={styles.formContent}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Send Us a Message</Text>
                <Pressable onPress={() => setChatModalVisible(false)}>
                  <X color="#94a3b8" size={24} />
                </Pressable>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Subject</Text>
                <TextInput
                  style={styles.textInput}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="What is your issue about?"
                  placeholderTextColor="#475569"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Message</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Describe your issue in detail..."
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <Pressable
                style={[styles.sendBtn, (!subject || !message) && styles.sendBtnDisabled]}
                onPress={handleSendMessage}
              >
                <Send size={18} color="#ffffff" />
                <Text style={styles.sendBtnText}>Send Message</Text>
              </Pressable>
            </BlurView>
          </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL */}
      <ActionModal
        visible={showSuccess}
        type="success"
        title="Message Sent!"
        message="Our support team has received your message and will respond within 24 hours."
        confirmText="Got it"
        onConfirm={() => setShowSuccess(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  backButton: { padding: 8 },
  content: { padding: 20 },

  hero: { alignItems: "center", marginBottom: 32 },
  heroIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: "#6d28d9", justifyContent: "center", alignItems: "center", marginBottom: 16, shadowColor: "#6d28d9", shadowOpacity: 0.4, shadowRadius: 20, elevation: 12 },
  heroTitle: { color: "#ffffff", fontSize: 22, fontWeight: "bold", marginBottom: 8 },
  heroDesc: { color: "#94a3b8", fontSize: 14, textAlign: "center", lineHeight: 22 },

  contactRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  contactCard: { flex: 1, alignItems: "center", padding: 16, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", gap: 8 },
  contactIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  contactLabel: { color: "#ffffff", fontWeight: "bold", fontSize: 13 },
  contactSub: { color: "#64748b", fontSize: 10, textAlign: "center" },

  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", gap: 12 },
  searchInput: { flex: 1, color: "#ffffff", fontSize: 15 },

  sectionTitle: { color: "#64748b", fontSize: 12, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, marginLeft: 4 },

  faqCard: { borderRadius: 20, overflow: "hidden", marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  faqQuestion: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 18 },
  questionText: { color: "#ffffff", fontSize: 15, fontWeight: "600", flex: 1, marginRight: 12 },
  faqAnswer: { paddingHorizontal: 18, paddingBottom: 18, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  answerText: { color: "#94a3b8", fontSize: 14, lineHeight: 22, paddingTop: 14 },

  emptySearch: { padding: 40, alignItems: "center" },
  emptyText: { color: "#475569", fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  formContainer: { borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  formContent: { padding: 32, paddingBottom: 50 },
  formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
  formTitle: { fontSize: 22, fontWeight: "bold", color: "#ffffff" },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 8, marginLeft: 4 },
  textInput: { backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, padding: 16, color: "#ffffff", fontSize: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  textArea: { height: 120 },
  sendBtn: { flexDirection: "row", backgroundColor: "#6d28d9", paddingVertical: 16, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 10 },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
});
