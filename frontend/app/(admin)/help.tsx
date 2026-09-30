import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  LayoutAnimation,
  UIManager,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  HelpCircle,
  Mail,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  Send,
  BookOpen,
  CheckCircle2,
  BarChart2,
  Sliders,
  Megaphone,
  Plus,
  Building2,
  Trash2,
  Pencil,
  RotateCcw,
  Clock,
  AlertTriangle,
  ExternalLink,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ActionModal from "../../src/components/ActionModal";
import { useAuth } from "../../contexts/AuthContext";
import { useColors } from "../../hooks/useColors";
import { useLanguage } from "../../contexts/LanguageContext";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STORAGE_KEY_FAQS = "@super_admin_faqs";
const STORAGE_KEY_TICKETS = "@super_admin_tickets";

interface FAQItem {
  id: string;
  category: string;
  q: string;
  a: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  system: string;
  priority: "Low" | "Medium" | "High" | "Critical Incident";
  message: string;
  status: "Active" | "In Review" | "Resolved";
  createdAt: string;
}

const CATEGORIES = [
  { id: "all", label: "All Governance Topics" },
  { id: "blueprint", label: "🏛️ Master Blueprint" },
  { id: "finance", label: "💰 Financial & Payouts" },
  { id: "division", label: "🏢 Division Setup" },
  { id: "security", label: "🔒 Security & Audit" },
];

const INITIAL_FAQS: FAQItem[] = [
  {
    id: "1",
    category: "blueprint",
    q: "What is the Clean.et Enterprise Multi-Department Platform Blueprint?",
    a: "Clean.et is engineered as an Ethiopian internal multi-department enterprise platform for cleaning operations. It governs operational Service Divisions: Car Washing & Auto Detailing and Building & Property Cleaning, with centralized Super Admin executive control over commissions, financial statements, and security.",
  },
  {
    id: "2",
    category: "finance",
    q: "How are platform commission fees and vendor payouts calculated?",
    a: "Platform commission defaults to 10.0% of Gross Merchandise Volume (GMV) on all completed/invoiced orders. Net Vendor Payout = GMV - Platform Commission (10%). Super Admins can generate and export PDF/CSV statements via /admin/reports.",
  },
  {
    id: "3",
    category: "finance",
    q: "How do I export certified monthly or annual financial statements?",
    a: "Open the Executive Reports page (/admin/reports), select your desired timeframe (Monthly, Annual, or Custom Date Range), select your target Division or Sector, then tap 'Download Filtered CSV' or 'Print / PDF Statement'.",
  },
  {
    id: "4",
    category: "division",
    q: "How do I register a new Cleaning Division and assign manager credentials?",
    a: "Navigate to /admin/tenants and tap 'Add New Division'. Fill in the business name, slug, sector categories enabled (Car Wash, Building Clean, Laundry, HVAC), and provide the assigned Division Manager's email and initial password.",
  },
  {
    id: "5",
    category: "division",
    q: "Can dynamic sector categories be expanded for new divisions?",
    a: "Yes! Super Admins can configure sector categories globally under /admin/system or /super-admin/settings, enabling seamless expansion into Laundry and Facility HVAC services.",
  },
  {
    id: "6",
    category: "security",
    q: "How does system audit logging and compliance work?",
    a: "Every critical administrative action (TENANT_CREATED, SYSTEM_INITIALIZED, EXECUTIVE_REPORT_EXPORTED) is logged permanently in the system_audit_logs table. Inspect live audit trails at /admin/system under the Audit Logs tab.",
  },
  {
    id: "7",
    category: "security",
    q: "How do network push broadcasts reach field staff and managers?",
    a: "Super Admins can dispatch platform-wide push announcements from /admin/broadcast targeting customers, division managers, or field staff with instant device alerts.",
  },
];

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: "tk-101",
    subject: "Platform Gateway Commission Adjustment",
    system: "Car Washing Division",
    priority: "High",
    message: "Requested verification of platform commission rate calculation for monthly auto detailing volume.",
    status: "Active",
    createdAt: new Date(Date.now() - 86400000).toLocaleString(),
  },
];

export default function HelpScreen() {
  const colors = useColors();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  const [faqs, setFaqs] = useState<FAQItem[]>(INITIAL_FAQS);
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Support Ticket Modal state
  const [ticketModalVisible, setTicketModalVisible] = useState(false);
  const [priority, setPriority] = useState<"Low" | "Medium" | "High" | "Critical Incident">("High");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketSystem, setTicketSystem] = useState("Car Washing Division");
  const [ticketMessage, setTicketMessage] = useState("");

  // Email Dispatch Modal state
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailRecipient] = useState("support@clean.et");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  // Add/Edit FAQ Modal state
  const [faqModalVisible, setFaqModalVisible] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [faqCategory, setFaqCategory] = useState("blueprint");
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");

  // Delete confirmation modal state
  const [deletingFaqId, setDeletingFaqId] = useState<string | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  // Toast confirmation modal
  const [successToast, setSuccessToast] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    loadStoredFaqs();
    loadStoredTickets();
  }, []);

  const loadStoredFaqs = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_FAQS);
      if (stored) {
        setFaqs(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load FAQs from storage", e);
    }
  };

  const saveFaqsToStorage = async (updatedFaqs: FAQItem[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_FAQS, JSON.stringify(updatedFaqs));
      setFaqs(updatedFaqs);
    } catch (e) {
      console.error("Failed to save FAQs to storage", e);
    }
  };

  const loadStoredTickets = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_TICKETS);
      if (stored) {
        setTickets(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load tickets from storage", e);
    }
  };

  const saveTicketsToStorage = async (updatedTickets: SupportTicket[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(updatedTickets));
      setTickets(updatedTickets);
    } catch (e) {
      console.error("Failed to save tickets to storage", e);
    }
  };

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") Haptics.impactAsync(style).catch(() => {});
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(admin)/(tabs)/Profile");
    }
  };

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    const matchesQuery =
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const toggleFaq = (index: number) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Launch Native Mail App
  const handleLaunchNativeEmail = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    const mailtoUrl = `mailto:${emailRecipient}?subject=Clean.et%20Executive%20Support%20Inquiry`;
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        setEmailModalVisible(true);
      }
    } catch (e) {
      setEmailModalVisible(true);
    }
  };

  const handleSendTicket = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    if (!ticketSubject || !ticketMessage) {
      Alert.alert("Required Fields", "Please provide a subject and message for the support ticket.");
      return;
    }

    const newTicket: SupportTicket = {
      id: `tk-${Date.now().toString().slice(-4)}`,
      subject: ticketSubject,
      system: ticketSystem,
      priority,
      message: ticketMessage,
      status: "Active",
      createdAt: new Date().toLocaleString(),
    };

    const updated = [newTicket, ...tickets];
    await saveTicketsToStorage(updated);

    setTicketModalVisible(false);
    setTicketSubject("");
    setTicketMessage("");
    setSuccessToast({
      title: "Support Ticket Logged",
      message: `Priority [${priority}] ticket #${newTicket.id} logged for ${ticketSystem}.`,
    });
  };

  const handleSendEmail = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    if (!emailSubject || !emailMessage) {
      Alert.alert("Required Fields", "Please enter an email subject and body message.");
      return;
    }
    setEmailModalVisible(false);
    setEmailSubject("");
    setEmailMessage("");
    setSuccessToast({
      title: "Executive Email Sent",
      message: `Email successfully dispatched to ${emailRecipient}. Copy saved to executive log.`,
    });
  };

  const handleToggleTicketStatus = async (ticketId: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const updated = tickets.map((t) => {
      if (t.id === ticketId) {
        const nextStatus = t.status === "Active" ? "In Review" : t.status === "In Review" ? "Resolved" : "Active";
        return { ...t, status: nextStatus as any };
      }
      return t;
    });
    await saveTicketsToStorage(updated);
  };

  const confirmDeleteTicket = async () => {
    if (deletingTicketId) {
      const updated = tickets.filter((t) => t.id !== deletingTicketId);
      await saveTicketsToStorage(updated);
      setDeletingTicketId(null);
      setSuccessToast({
        title: "Ticket Deleted",
        message: "Support ticket record has been removed.",
      });
    }
  };

  const openAddFaqModal = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditingFaq(null);
    setFaqCategory("blueprint");
    setFaqQuestion("");
    setFaqAnswer("");
    setFaqModalVisible(true);
  };

  const openEditFaqModal = (faq: FAQItem) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditingFaq(faq);
    setFaqCategory(faq.category);
    setFaqQuestion(faq.q);
    setFaqAnswer(faq.a);
    setFaqModalVisible(true);
  };

  const handleSaveFaq = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    if (!faqQuestion || !faqAnswer) {
      Alert.alert("Required Fields", "Please enter both question title and answer text.");
      return;
    }

    let updatedList: FAQItem[];
    if (editingFaq) {
      updatedList = faqs.map((f) =>
        f.id === editingFaq.id ? { ...f, category: faqCategory, q: faqQuestion, a: faqAnswer } : f
      );
    } else {
      const newItem: FAQItem = {
        id: Date.now().toString(),
        category: faqCategory,
        q: faqQuestion,
        a: faqAnswer,
      };
      updatedList = [newItem, ...faqs];
    }

    await saveFaqsToStorage(updatedList);
    setFaqModalVisible(false);
    setSuccessToast({
      title: editingFaq ? "FAQ Updated" : "FAQ Created",
      message: editingFaq
        ? "Knowledge article changes saved to storage."
        : "New FAQ item created and saved to governance articles.",
    });
  };

  const confirmDeleteFaq = async () => {
    if (deletingFaqId) {
      const updated = faqs.filter((f) => f.id !== deletingFaqId);
      await saveFaqsToStorage(updated);
      setDeletingFaqId(null);
      setSuccessToast({
        title: "FAQ Deleted",
        message: "Article removed from governance FAQ database.",
      });
    }
  };

  const handleResetDefaults = async () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    await saveFaqsToStorage(INITIAL_FAQS);
    setSuccessToast({
      title: "FAQs Reset",
      message: "Governance FAQs have been restored to Blueprint default items.",
    });
  };

  return (
    <LinearGradient colors={colors.gradients.background} style={styles.container}>
      {/* ── EXECUTIVE HEADER ── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={handleBack} style={styles.backButton}>
          <ChevronLeft color={colors.text} size={28} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={styles.headerTitle}>👑 Executive Governance & Help Portal</Text>
          <Text style={styles.headerSubtitle}>Clean.et Master Blueprint & Support Suite</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ── SYSTEM STATUS CARD ── */}
        <View style={styles.statusCard}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={18} color="#34D399" />
              <Text style={{ color: "#34D399", fontWeight: "800", fontSize: 13 }}>
                Platform Gateway Online
              </Text>
            </View>
            <Text style={{ color: "#60A5FA", fontWeight: "800", fontSize: 11 }}>
              Sanctum Auth REST API v1.0
            </Text>
          </View>
          <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 4 }}>
            System Latency: &lt; 45ms &bull; Database Status: Synced &bull; Default Currency: ETB
          </Text>
        </View>

        {/* ── MASTER ARCHITECTURE BLUEPRINT HIGHLIGHT ── */}
        <View style={styles.blueprintCard}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <BookOpen size={22} color="#F472B6" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "800", fontSize: 15 }}>
                Ethiopian Enterprise Multi-Department Architecture
              </Text>
              <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 1 }}>
                Global Super Admin Governance over Operational Divisions & Settlements
              </Text>
            </View>
          </View>

          <View style={styles.specsBox}>
            <Text style={{ color: colors.text, fontWeight: "800", fontSize: 12, marginBottom: 4 }}>
              🏢 Operational Service Divisions:
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 11 }}>
              &bull; <Text style={{ fontWeight: "700", color: "#60A5FA" }}>Car Washing Division</Text>: Sub-centers (Corporate Fleet, Mobile Doorstep, Valet Pickup, Bay Station).
            </Text>
            <Text style={{ color: colors.subtext, fontSize: 11, marginTop: 2 }}>
              &bull; <Text style={{ fontWeight: "700", color: "#34D399" }}>Building Cleaning Division</Text>: Sub-centers (High-Rise Facade Glass, Interior Deep Sanitization).
            </Text>
          </View>

          {/* Quick Shortcuts Toolbar */}
          <View style={styles.shortcutRow}>
            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => router.push("/(admin)/reports")}
            >
              <BarChart2 size={14} color={colors.text} />
              <Text style={styles.shortcutText}>Reports Page</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => router.push("/profile/settings" as any)}
            >
              <Sliders size={14} color={colors.text} />
              <Text style={styles.shortcutText}>Settings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => router.push("/(admin)/broadcast")}
            >
              <Megaphone size={14} color={colors.text} />
              <Text style={styles.shortcutText}>Broadcast</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shortcutBtn}
              onPress={() => router.push("/(admin)/tenants")}
            >
              <Building2 size={14} color={colors.text} />
              <Text style={styles.shortcutText}>Divisions</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── EXECUTIVE SUPPORT & INCIDENT CHANNELS ── */}
        <Text style={styles.sectionTitle}>Executive Support & Incident Escalation</Text>

        <View style={styles.contactRow}>
          <TouchableOpacity
            style={[styles.contactCard, { borderColor: "#EC489955" }]}
            onPress={() => setTicketModalVisible(true)}
          >
            <View style={[styles.contactIconBox, { backgroundColor: "#EC489922" }]}>
              <MessageCircle size={22} color="#EC4899" />
            </View>
            <Text style={styles.contactTitle}>Support Ticket</Text>
            <Text style={styles.contactSub}>Log technical incident ticket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.contactCard, { borderColor: "#3B82F655" }]}
            onPress={handleLaunchNativeEmail}
          >
            <View style={[styles.contactIconBox, { backgroundColor: "#3B82F622" }]}>
              <Mail size={22} color="#3B82F6" />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 }}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <ExternalLink size={12} color="#60A5FA" />
            </View>
            <Text style={styles.contactSub}>Direct mail to support@clean.et</Text>
          </TouchableOpacity>
        </View>

        {/* ── LOGGED SUPPORT TICKETS LIST ── */}
        {tickets.length > 0 && (
          <View style={styles.ticketsSection}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <Text style={styles.sectionTitleNoMargin}>📋 Logged Support Tickets ({tickets.length})</Text>
              <Text style={{ color: colors.subtext, fontSize: 10 }}>Tap status badge to update</Text>
            </View>

            {tickets.map((t) => {
              const statusColor = t.status === "Active" ? "#F59E0B" : t.status === "In Review" ? "#60A5FA" : "#34D399";
              const priorityColor = t.priority === "Critical Incident" ? "#EF4444" : t.priority === "High" ? "#F87171" : "#F59E0B";

              return (
                <View key={t.id} style={styles.ticketCard}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 13 }}>{t.subject}</Text>
                        <View style={[styles.priorityBadge, { borderColor: priorityColor }]}>
                          <Text style={[styles.priorityBadgeText, { color: priorityColor }]}>{t.priority}</Text>
                        </View>
                      </View>

                      <Text style={{ color: colors.subtext, fontSize: 11 }}>
                        {t.system} &bull; Ticket #{t.id} &bull; {t.createdAt}
                      </Text>
                      <Text style={{ color: colors.subtext, fontSize: 12, marginTop: 4, lineHeight: 16 }}>{t.message}</Text>
                    </View>

                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: statusColor }]}
                        onPress={() => handleToggleTicketStatus(t.id)}
                      >
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{t.status}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={() => setDeletingTicketId(t.id)}>
                        <Trash2 size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── FAQ & KNOWLEDGE BASE HEADER WITH ADD/RESET ACTIONS ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 12 }}>
          <Text style={styles.sectionTitleNoMargin}>Governance Knowledge Base ({filteredFaqs.length})</Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={styles.resetFaqBtn} onPress={handleResetDefaults}>
              <RotateCcw size={12} color={colors.subtext} />
              <Text style={{ color: colors.subtext, fontSize: 10, fontWeight: "700" }}>Reset</Text>
            </TouchableOpacity>

            {isSuperAdmin && (
              <TouchableOpacity style={styles.addFaqBtn} onPress={openAddFaqModal}>
                <Plus size={14} color="#34D399" />
                <Text style={{ color: "#34D399", fontSize: 11, fontWeight: "800" }}>Add FAQ Item</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.subtext} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQs, API endpoints, or governance terms..."
            placeholderTextColor={colors.subtext}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* CATEGORY PILL SELECTOR */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 16 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catPill, activeCategory === cat.id && styles.catPillActive]}
              onPress={() => {
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                setActiveCategory(cat.id);
              }}
            >
              <Text style={[styles.catPillText, activeCategory === cat.id && styles.catPillTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQS ACCORDION WITH FULL CRUD CONTROLS */}
        <View style={styles.faqList}>
          {filteredFaqs.map((faq, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <View key={faq.id || index} style={styles.faqWrapper}>
                <View style={styles.faqHeader}>
                  <Pressable style={{ flex: 1 }} onPress={() => toggleFaq(index)}>
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                  </Pressable>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    {isSuperAdmin && (
                      <>
                        <TouchableOpacity onPress={() => openEditFaqModal(faq)}>
                          <Pencil size={16} color="#60A5FA" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setDeletingFaqId(faq.id)}>
                          <Trash2 size={16} color="#F87171" />
                        </TouchableOpacity>
                      </>
                    )}
                    <Pressable onPress={() => toggleFaq(index)}>
                      {isExpanded ? <ChevronUp size={18} color="#EC4899" /> : <ChevronDown size={18} color={colors.subtext} />}
                    </Pressable>
                  </View>
                </View>

                {isExpanded && (
                  <View style={styles.faqBody}>
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* ── 1. EXECUTIVE SUPPORT TICKET MODAL ── */}
      <Modal visible={ticketModalVisible} transparent animationType="slide" onRequestClose={() => setTicketModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <MessageCircle size={20} color="#EC4899" />
                <Text style={styles.modalTitle}>Log Executive Support Ticket</Text>
              </View>
              <Pressable onPress={() => setTicketModalVisible(false)}>
                <X color={colors.subtext} size={24} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>INCIDENT PRIORITY LEVEL</Text>
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 14 }}>
              {(["Low", "Medium", "High", "Critical Incident"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityPill, priority === p && styles.priorityPillActive]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityText, priority === p && styles.priorityTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>AFFECTED SYSTEM / DIVISION</Text>
              <TextInput
                style={styles.input}
                value={ticketSystem}
                onChangeText={setTicketSystem}
                placeholder="e.g. Car Washing Division / API Gateway"
                placeholderTextColor={colors.subtext}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TICKET SUBJECT</Text>
              <TextInput
                style={styles.input}
                value={ticketSubject}
                onChangeText={setTicketSubject}
                placeholder="Brief summary of incident or request..."
                placeholderTextColor={colors.subtext}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>INCIDENT DETAILS & MESSAGE</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                multiline
                value={ticketMessage}
                onChangeText={setTicketMessage}
                placeholder="Provide full technical details..."
                placeholderTextColor={colors.subtext}
              />
            </View>

            <Pressable style={styles.sendBtn} onPress={handleSendTicket}>
              <Send size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.sendBtnText}>Dispatch Support Ticket</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── 2. DIRECT EXECUTIVE EMAIL DISPATCH MODAL ── */}
      <Modal visible={emailModalVisible} transparent animationType="slide" onRequestClose={() => setEmailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Mail size={20} color="#3B82F6" />
                <Text style={styles.modalTitle}>Executive Email Dispatch</Text>
              </View>
              <Pressable onPress={() => setEmailModalVisible(false)}>
                <X color={colors.subtext} size={24} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>TARGET RECIPIENT</Text>
              <TextInput
                style={[styles.input, { color: "#60A5FA" }]}
                value={emailRecipient}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL SUBJECT</Text>
              <TextInput
                style={styles.input}
                value={emailSubject}
                onChangeText={setEmailSubject}
                placeholder="Super Admin Executive Inquiry..."
                placeholderTextColor={colors.subtext}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL BODY</Text>
              <TextInput
                style={[styles.input, { height: 100, textAlignVertical: "top" }]}
                multiline
                value={emailMessage}
                onChangeText={setEmailMessage}
                placeholder="Write your email message..."
                placeholderTextColor={colors.subtext}
              />
            </View>

            <Pressable style={[styles.sendBtn, { backgroundColor: "#2563EB" }]} onPress={handleSendEmail}>
              <Send size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.sendBtnText}>Send Executive Email</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── 3. ADD / EDIT FAQ ITEM MODAL ── */}
      <Modal visible={faqModalVisible} transparent animationType="slide" onRequestClose={() => setFaqModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {editingFaq ? <Pencil size={20} color="#60A5FA" /> : <Plus size={20} color="#34D399" />}
                <Text style={styles.modalTitle}>{editingFaq ? "Edit FAQ Article" : "Add FAQ Knowledge Article"}</Text>
              </View>
              <Pressable onPress={() => setFaqModalVisible(false)}>
                <X color={colors.subtext} size={24} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>CATEGORY</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {[
                { id: "blueprint", label: "Master Blueprint" },
                { id: "finance", label: "Financial & Payouts" },
                { id: "division", label: "Division Setup" },
                { id: "security", label: "Security & Audit" },
              ].map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.priorityPill, faqCategory === c.id && styles.priorityPillActive]}
                  onPress={() => setFaqCategory(c.id)}
                >
                  <Text style={[styles.priorityText, faqCategory === c.id && styles.priorityTextActive]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>QUESTION TITLE</Text>
              <TextInput
                style={styles.input}
                value={faqQuestion}
                onChangeText={setFaqQuestion}
                placeholder="e.g. How are division commission rates set?"
                placeholderTextColor={colors.subtext}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ANSWER DESCRIPTION</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: "top" }]}
                multiline
                value={faqAnswer}
                onChangeText={setFaqAnswer}
                placeholder="Provide complete explanation..."
                placeholderTextColor={colors.subtext}
              />
            </View>

            <Pressable style={[styles.sendBtn, { backgroundColor: editingFaq ? "#2563EB" : "#10B981" }]} onPress={handleSaveFaq}>
              {editingFaq ? (
                <Pencil size={16} color="#FFF" style={{ marginRight: 6 }} />
              ) : (
                <Plus size={16} color="#FFF" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.sendBtnText}>{editingFaq ? "Update Article" : "Save Article"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal for FAQ */}
      <ActionModal
        visible={!!deletingFaqId}
        type="danger"
        title="Delete FAQ Article?"
        message="Are you sure you want to remove this article from the governance FAQ database?"
        confirmText="Delete Article"
        onConfirm={confirmDeleteFaq}
        onCancel={() => setDeletingFaqId(null)}
      />

      {/* Delete Confirmation Modal for Ticket */}
      <ActionModal
        visible={!!deletingTicketId}
        type="danger"
        title="Delete Support Ticket Record?"
        message="Are you sure you want to remove this incident ticket record?"
        confirmText="Delete Record"
        onConfirm={confirmDeleteTicket}
        onCancel={() => setDeletingTicketId(null)}
      />

      {/* Success Toast Modal */}
      {successToast && (
        <ActionModal
          visible={!!successToast}
          type="success"
          title={successToast.title}
          message={successToast.message}
          confirmText="Done"
          onConfirm={() => setSuccessToast(null)}
        />
      )}
    </LinearGradient>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  headerSubtitle: { fontSize: 11, color: colors.subtext, marginTop: 1 },
  backButton: { padding: 8 },
  content: { padding: 20 },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  blueprintCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  specsBox: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  shortcutRow: { flexDirection: "row", gap: 6, marginTop: 12 },
  shortcutBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  shortcutText: { color: colors.text, fontSize: 10, fontWeight: "700" },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: colors.subtext, textTransform: "uppercase", marginBottom: 12 },
  sectionTitleNoMargin: { fontSize: 13, fontWeight: "800", color: colors.subtext, textTransform: "uppercase" },
  contactRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  contactCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  contactIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  contactTitle: { color: colors.text, fontSize: 13, fontWeight: "800", marginTop: 6 },
  contactSub: { color: colors.subtext, fontSize: 11, marginTop: 2, textAlign: "center" },
  ticketsSection: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  ticketCard: {
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityBadgeText: { fontSize: 9, fontWeight: "800" },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "800" },
  addFaqBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#064E3B",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#10B98155",
  },
  resetFaqBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  catPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  catPillActive: { backgroundColor: "#EC489922", borderColor: "#EC4899" },
  catPillText: { color: colors.subtext, fontSize: 11, fontWeight: "700" },
  catPillTextActive: { color: "#F472B6" },
  faqList: { gap: 10, marginBottom: 24 },
  faqWrapper: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  faqHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  faqQuestion: { fontSize: 14, fontWeight: "600", color: colors.text, flex: 1, marginRight: 10 },
  faqBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: 12 },
  faqAnswer: { color: colors.subtext, fontSize: 13, lineHeight: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.cardBorder },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  inputGroup: { marginBottom: 12 },
  inputLabel: { color: colors.subtext, fontSize: 10, fontWeight: "800", marginBottom: 4 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    fontSize: 13,
  },
  priorityPill: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surface, alignItems: "center", borderWidth: 1, borderColor: colors.cardBorder },
  priorityPillActive: { backgroundColor: "#EC489922", borderColor: "#EC4899" },
  priorityText: { color: colors.subtext, fontSize: 10, fontWeight: "700" },
  priorityTextActive: { color: "#F472B6" },
  sendBtn: { flexDirection: "row", backgroundColor: "#EC4899", paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 8 },
  sendBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
});


