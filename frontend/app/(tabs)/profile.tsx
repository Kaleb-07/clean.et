import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ChevronLeft,
  Pencil,
  User as UserIcon,
  FileText,
  Heart,
  MapPin,
  Settings as SettingsIcon,
  Activity,
  CalendarDays,
  Receipt,
  LogOut,
  Car,
  Building,
  CreditCard,
  Bell,
  Briefcase,
  Shield,
  HelpCircle,
  ChevronRight,
  Moon,
  Sun,
  Globe,
  CheckCircle2,
  Plus,
  Trash2,
  Lock,
  Languages,
  Info,
  ShieldCheck,
  X,
  Check,
  ArrowLeft,
  Mail,
  Phone,
  MessageCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";

import { useAuth } from "../../contexts/AuthContext";
import { useColors } from "../../hooks/useColors";
import { useTheme } from "../../contexts/ThemeContext";
import { useLanguage } from "../../contexts/LanguageContext";
import ActionModal from "../../src/components/ActionModal";
import API from "../../src/api/client";

type ProfileTab = "info" | "history" | "saved" | "address" | "settings";

export interface UserAddress {
  id: string;
  title: string;
  address: string;
  isDefault?: boolean;
}

const DEFAULT_ADDRESSES: UserAddress[] = [
  {
    id: "1",
    title: "Home",
    address: "123 Main Street, Apt 4B, New York, NY 10001",
    isDefault: true,
  },
  {
    id: "2",
    title: "Office",
    address: "456 Business Ave, Suite 200, New York, NY 10002",
    isDefault: false,
  },
];

export interface NotificationPreferences {
  appointmentUpdates: boolean;
  reminders: boolean;
  chatMessages: boolean;
  promotions: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

const DEFAULT_NOTIF_PREFS: NotificationPreferences = {
  appointmentUpdates: true,
  reminders: true,
  chatMessages: true,
  promotions: false,
  emailNotifications: true,
  smsNotifications: false,
};

const CAMEL_TO_SNAKE_NOTIF_KEY: Record<keyof NotificationPreferences, string> = {
  appointmentUpdates: "appointment_updates",
  reminders: "reminders",
  chatMessages: "chat_messages",
  promotions: "promotions",
  emailNotifications: "email_notifications",
  smsNotifications: "sms_notifications",
};

const mapBackendToNotifPrefs = (data: any): NotificationPreferences => ({
  appointmentUpdates: data?.appointment_updates ?? DEFAULT_NOTIF_PREFS.appointmentUpdates,
  reminders: data?.reminders ?? DEFAULT_NOTIF_PREFS.reminders,
  chatMessages: data?.chat_messages ?? DEFAULT_NOTIF_PREFS.chatMessages,
  promotions: data?.promotions ?? DEFAULT_NOTIF_PREFS.promotions,
  emailNotifications: data?.email_notifications ?? DEFAULT_NOTIF_PREFS.emailNotifications,
  smsNotifications: data?.sms_notifications ?? DEFAULT_NOTIF_PREFS.smsNotifications,
});

export interface PrivacySettings {
  twoFactor: boolean;
  biometricLogin: boolean;
  loginAlerts: boolean;
}

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  twoFactor: false,
  biometricLogin: true,
  loginAlerts: true,
};

interface HelpFAQ {
  id: string;
  q: string;
  a: string;
}

const CLEAN_ET_FAQS: HelpFAQ[] = [
  {
    id: "1",
    q: "How do I book an appointment?",
    a: "Select your desired cleaning service from the Home screen (such as Car Washing, Building Cleaning, or Detailing), choose your vehicle or address, pick an available date and time slot, and confirm your booking.",
  },
  {
    id: "2",
    q: "Can I cancel an appointment?",
    a: "Yes, you can cancel or reschedule an upcoming booking from your Bookings tab at any time before the crew is dispatched. Simply open the booking details and tap 'Cancel Booking'.",
  },
  {
    id: "3",
    q: "How do I make a payment?",
    a: "Clean.et supports secure mobile and card payments via Telebirr, CBE Birr, Chapa, and Cash on Delivery. When your service invoice is ready, you can pay directly in the app or choose your preferred method.",
  },
  {
    id: "4",
    q: "Is my data secure?",
    a: "All personal information, address records, and payment credentials are encrypted using industry-standard protocols. We never share your private data with unauthorized third parties.",
  },
  {
    id: "5",
    q: "How do I contact support?",
    a: "You can reach our customer support team 24/7 by emailing support@clean.et, calling our hotline, or tapping the 'Need Help?' card above to send us an email directly.",
  },
];

// ─── Ethiopian Phone Formatter ────────────────────────────────────────────────
function formatEthiopianPhone(input: string): string {
  let cleaned = input.trim().replace(/\s+/g, "");
  if (cleaned.startsWith("+251")) {
    return cleaned;
  }
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith("251")) {
    return "+" + cleaned;
  }
  return "+251" + cleaned;
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { isDark, toggleDark } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { user, logout, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>("info");
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Edit Profile State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Address State
  const [addresses, setAddresses] = useState<UserAddress[]>(DEFAULT_ADDRESSES);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [addressTitle, setAddressTitle] = useState("");
  const [addressText, setAddressText] = useState("");
  const [addressIsDefault, setAddressIsDefault] = useState(false);
  const [addressError, setAddressError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("@user_saved_addresses");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAddresses(parsed);
          }
        }
      } catch (e) {
        console.error("Failed to load addresses from storage", e);
      }
    })();
  }, []);

  const saveAddresses = async (updated: UserAddress[]) => {
    setAddresses(updated);
    try {
      await AsyncStorage.setItem("@user_saved_addresses", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save addresses to storage", e);
    }
  };

  const handleOpenAddAddress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAddress(null);
    setAddressTitle("");
    setAddressText("");
    setAddressIsDefault(addresses.length === 0);
    setAddressError("");
    setAddressModalVisible(true);
  };

  const handleOpenEditAddress = (addr: UserAddress) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAddress(addr);
    setAddressTitle(addr.title);
    setAddressText(addr.address);
    setAddressIsDefault(!!addr.isDefault);
    setAddressError("");
    setAddressModalVisible(true);
  };

  const handleSaveAddress = async () => {
    if (!addressTitle.trim()) {
      setAddressError("Please enter an address label.");
      return;
    }
    if (!addressText.trim()) {
      setAddressError("Please enter the full address.");
      return;
    }

    let updated: UserAddress[];

    if (selectedAddress) {
      updated = addresses.map((item) => {
        if (item.id === selectedAddress.id) {
          return {
            ...item,
            title: addressTitle.trim(),
            address: addressText.trim(),
            isDefault: addressIsDefault,
          };
        }
        if (addressIsDefault) {
          return { ...item, isDefault: false };
        }
        return item;
      });
    } else {
      const newAddr: UserAddress = {
        id: Date.now().toString(),
        title: addressTitle.trim(),
        address: addressText.trim(),
        isDefault: addressIsDefault,
      };
      if (addressIsDefault) {
        updated = [...addresses.map((a) => ({ ...a, isDefault: false })), newAddr];
      } else {
        updated = [...addresses, newAddr];
      }
    }

    if (!updated.some((a) => a.isDefault) && updated.length > 0) {
      updated[0].isDefault = true;
    }

    await saveAddresses(updated);
    setAddressModalVisible(false);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleDeleteAddress = async () => {
    if (!selectedAddress) return;
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    let updated = addresses.filter((a) => a.id !== selectedAddress.id);
    if (selectedAddress.isDefault && updated.length > 0) {
      updated[0].isDefault = true;
    }
    await saveAddresses(updated);
    setAddressModalVisible(false);
  };

  // Settings Tab State
  const [settingsSubPage, setSettingsSubPage] = useState<
    "notifications" | "password" | "privacy" | "help" | "terms" | "privacy_policy" | "about" | null
  >(null);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIF_PREFS);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);
  const [rtlEnabled, setRtlEnabled] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(4);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState("");

  const handleToggleFaq = (id: string) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setExpandedFaqId((prev) => (prev === id ? null : id));
  };

  const handleContactSupport = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL("mailto:support@clean.et").catch(() => {
      Alert.alert("Contact Support", "Please email us at support@clean.et");
    });
  };

  // Load saved privacy settings
  useEffect(() => {
    (async () => {
      try {
        const savedPrivacy = await AsyncStorage.getItem("@user_privacy_settings");
        if (savedPrivacy) {
          setPrivacySettings({ ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(savedPrivacy) });
        }
      } catch (e) {
        console.error("Failed to load privacy settings", e);
      }
    })();
  }, []);

  const handleTogglePrivacySetting = async (key: keyof PrivacySettings, val: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...privacySettings, [key]: val };
    setPrivacySettings(updated);
    try {
      await AsyncStorage.setItem("@user_privacy_settings", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save privacy setting", e);
    }
  };

  const handleDownloadData = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Download My Data",
      `An archive of your account data (profile, bookings, addresses, invoices) is being prepared and will be sent to ${user?.email || "your registered email"}.`,
      [{ text: "OK" }]
    );
  };

  const handleConfirmDeleteAccount = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your Clean.et account? All your bookings, vehicles, and saved data will be erased. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              await API.delete("/me");
            } catch {}
            await handleLogout();
          },
        },
      ]
    );
  };

  // Load saved current password so it appears in the current password field
  useEffect(() => {
    (async () => {
      try {
        const savedPass = await AsyncStorage.getItem("@user_current_password");
        if (savedPass) {
          setCurrentPassword(savedPass);
        } else {
          setCurrentPassword("password123");
        }
      } catch (e) {
        console.error("Failed to load stored password", e);
      }
    })();
  }, [settingsSubPage]);

  useEffect(() => {
    (async () => {
      // 1. Instant load from local storage
      try {
        const savedNotif = await AsyncStorage.getItem("@user_notification_preferences");
        if (savedNotif) {
          setNotifPrefs({ ...DEFAULT_NOTIF_PREFS, ...JSON.parse(savedNotif) });
        }
      } catch (e) {
        console.error("Failed to load local notif prefs", e);
      }

      // 2. Sync from backend API
      try {
        const res = await API.get("/notifications/preferences");
        if (res.data?.data) {
          const remotePrefs = mapBackendToNotifPrefs(res.data.data);
          setNotifPrefs(remotePrefs);
          await AsyncStorage.setItem("@user_notification_preferences", JSON.stringify(remotePrefs));
        }
      } catch (e) {
        // Silent fallback to local prefs if offline
      }
    })();
  }, []);

  const handleToggleNotifPref = async (key: keyof NotificationPreferences, val: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...notifPrefs, [key]: val };
    setNotifPrefs(updated);

    // Save locally
    try {
      await AsyncStorage.setItem("@user_notification_preferences", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save notif prefs locally", e);
    }

    // Persist to backend database
    try {
      const snakeKey = CAMEL_TO_SNAKE_NOTIF_KEY[key];
      await API.post("/notifications/preferences", {
        [snakeKey]: val,
      });
    } catch (e) {
      console.error("Failed to persist notification preference to backend", e);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const savedRtl = await AsyncStorage.getItem("@user_rtl_layout");
        if (savedRtl !== null) {
          setRtlEnabled(savedRtl === "true");
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await API.get("/notifications");
        if (typeof res.data?.unread_count === "number") {
          setUnreadNotificationsCount(res.data.unread_count);
        }
      } catch {
        // Fallback default
      }
    })();
  }, []);

  const handleToggleRtl = async (val: boolean) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setRtlEnabled(val);
    try {
      await AsyncStorage.setItem("@user_rtl_layout", String(val));
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All password fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");
    setPasswordSuccessMsg("");
    try {
      await API.post("/user/change-password", {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      // Update stored password so it remains in the current password field
      await AsyncStorage.setItem("@user_current_password", newPassword);
      setCurrentPassword(newPassword);
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccessMsg("Password updated successfully!");
      setShowSuccessToast(true);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

      setTimeout(() => setShowSuccessToast(false), 3000);
      setTimeout(() => setPasswordSuccessMsg(""), 5000);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e instanceof Error ? e.message : "Failed to change password.");
      setPasswordError(msg);
      triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    } finally {
      setPasswordLoading(false);
    }
  };

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(style).catch(() => {});
    }
  };

  const handleTabPress = (tab: ProfileTab) => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSettingsSubPage(null);
    if (tab === "history") {
      router.push("/(tabs)/booking");
      return;
    }
    if (tab === "saved") {
      router.push("/vehicles");
      return;
    }
    setActiveTab(tab);
  };

  const handleOpenEdit = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    setEditName(user?.name || "");
    setEditEmail(user?.email || "");
    setEditPhone(user?.phone || "");
    setEditError("");
    setEditModalVisible(true);
  };

  const handleLogout = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    try {
      await logout();
      router.replace("/(auth)/login");
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim() || !editPhone.trim()) {
      setEditError("Name and phone number are required.");
      return;
    }
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    setEditLoading(true);
    setEditError("");
    try {
      const formattedPhone = formatEthiopianPhone(editPhone);
      await updateUser({
        name: editName.trim(),
        email: editEmail.trim() || null,
        phone: formattedPhone,
      });
      setEditModalVisible(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (e instanceof Error ? e.message : "Failed to update profile.");
      setEditError(msg);
    } finally {
      setEditLoading(false);
    }
  };

  const menuGroups = [
    {
      title: "Account & Assets",
      items: [
        { icon: UserIcon, label: "Personal Information", route: "/profile/personal-info", color: "#3B82F6" },
        { icon: Car, label: "My Vehicles", route: "/vehicles", color: "#6366F1" },
        { icon: Building, label: "My Building Profiles", route: "/building-profiles", color: "#EC4899" },
        { icon: CreditCard, label: "My Subscription", route: "/profile/subscription", color: "#8B5CF6" },
        { icon: Receipt, label: "My Invoices", route: "/invoices", color: "#10B981" },
        { icon: Bell, label: "Notifications", route: "/profile/notifications", color: "#F59E0B" },
        { icon: Briefcase, label: "Fleet Accounts", route: "/profile/fleet", color: "#A78BFA" },
      ],
    },
    {
      title: "Settings & Support",
      items: [
        { icon: SettingsIcon, label: "App & System Settings", route: "/profile/settings", color: "#8B5CF6" },
        { icon: Shield, label: "Privacy & Security", route: "/profile/privacy", color: "#06B6D4" },
        { icon: HelpCircle, label: "Help Center", route: "/profile/help", color: "#14B8A6" },
      ],
    },
  ];

  const getInitials = (name?: string) => {
    if (!name) return "AJ";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "June 15, 2024";

  return (
    <View style={[styles.container, { backgroundColor: isDark ? "#0B0F19" : "#F8FAFC" }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 90,
        }}
      >
        {/* ── TOP RED BANNER (As shown in screenshot) ── */}
        <LinearGradient
          colors={["#EF4444", "#DC2626"]}
          style={[styles.headerBanner, { paddingTop: Math.max(insets.top + 8, 28) }]}
        >
          {/* Top Bar: Back, Title, Edit */}
          <View style={styles.topBar}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home"))}
              style={styles.headerIconButton}
            >
              <ChevronLeft size={22} color="#ffffff" strokeWidth={2.5} />
            </Pressable>

            <Text style={styles.topBarTitle}>My Profile</Text>

            <Pressable onPress={handleOpenEdit} style={styles.headerIconButton}>
              <Pencil size={18} color="#ffffff" strokeWidth={2.2} />
            </Pressable>
          </View>

          {/* User Profile Card within Banner */}
          <View style={styles.profileRow}>
            <View style={styles.avatarCircle}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
              </View>
            </View>

            <View style={styles.profileInfoTextCol}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.name || "Alex Johnson"}
              </Text>
              <Text style={styles.profileEmail} numberOfLines={1}>
                {user?.email || "alex.johnson@email.com"}
              </Text>
              <Text style={styles.profileMeta} numberOfLines={1}>
                {user?.phone || "+1 555-0199"} • Male, 32 yrs
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── 5 PILL TABS (Info, History, Saved, Address, Settings) ── */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => handleTabPress("info")}
            style={[
              styles.tabPill,
              activeTab === "info"
                ? styles.tabPillActive
                : [styles.tabPillInactive, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }],
            ]}
          >
            <UserIcon
              size={18}
              color={activeTab === "info" ? "#ffffff" : isDark ? "#94A3B8" : "#64748B"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === "info" ? "#ffffff" : isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              Info
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTabPress("history")}
            style={[
              styles.tabPill,
              styles.tabPillInactive,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
            ]}
          >
            <FileText size={18} color={isDark ? "#94A3B8" : "#64748B"} strokeWidth={2} />
            <Text style={[styles.tabPillText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              History
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTabPress("saved")}
            style={[
              styles.tabPill,
              styles.tabPillInactive,
              { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
            ]}
          >
            <Heart size={18} color={isDark ? "#94A3B8" : "#64748B"} strokeWidth={2} />
            <Text style={[styles.tabPillText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              Saved
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTabPress("address")}
            style={[
              styles.tabPill,
              activeTab === "address"
                ? styles.tabPillActive
                : [styles.tabPillInactive, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }],
            ]}
          >
            <MapPin
              size={18}
              color={activeTab === "address" ? "#ffffff" : isDark ? "#94A3B8" : "#64748B"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === "address" ? "#ffffff" : isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              Address
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleTabPress("settings")}
            style={[
              styles.tabPill,
              activeTab === "settings"
                ? styles.tabPillActive
                : [styles.tabPillInactive, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }],
            ]}
          >
            <SettingsIcon
              size={18}
              color={activeTab === "settings" ? "#ffffff" : isDark ? "#94A3B8" : "#64748B"}
              strokeWidth={2}
            />
            <Text
              style={[
                styles.tabPillText,
                { color: activeTab === "settings" ? "#ffffff" : isDark ? "#94A3B8" : "#64748B" },
              ]}
            >
              Settings
            </Text>
          </Pressable>
        </View>

        {/* ── TAB CONTENT: INFO VIEW (Matches user's screenshot) ── */}
        {activeTab === "info" && (
          <View style={styles.bodyContent}>
            {/* PREMIUM FEATURES SECTION */}
            <Text style={[styles.sectionHeading, { color: isDark ? "#94A3B8" : "#64748B" }]}>
              PREMIUM FEATURES
            </Text>

            <View style={styles.featuresRow}>
              {/* Feature 1: Live Tracker */}
              <Pressable
                onPress={() => router.push("/(tabs)/booking")}
                style={({ pressed }) => [
                  styles.featureCard,
                  { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.featureIconBadge}>
                  <Activity size={20} color="#EF4444" strokeWidth={2.4} />
                </View>
                <Text style={[styles.featureCardTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Live Tracker
                </Text>
              </Pressable>

              {/* Feature 2: Availability */}
              <Pressable
                onPress={() => router.push("/(tabs)/home")}
                style={({ pressed }) => [
                  styles.featureCard,
                  { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.featureIconBadge}>
                  <CalendarDays size={20} color="#EF4444" strokeWidth={2.4} />
                </View>
                <Text style={[styles.featureCardTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Availability
                </Text>
              </Pressable>

              {/* Feature 3: Records */}
              <Pressable
                onPress={() => router.push("/invoices")}
                style={({ pressed }) => [
                  styles.featureCard,
                  { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.featureIconBadge}>
                  <Receipt size={20} color="#EF4444" strokeWidth={2.4} />
                </View>
                <Text style={[styles.featureCardTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Records
                </Text>
              </Pressable>
            </View>

            {/* DETAILS TABLE CARD */}
            <View
              style={[
                styles.detailsCard,
                {
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              {/* Row: Full Name */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Full Name
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  {user?.name || "Alex Johnson"}
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Email */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Email
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  {user?.email || "alex.johnson@email.com"}
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Phone */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Phone
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  {user?.phone || "+1 555-0199"}
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Member Since */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Member Since
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  {memberSince}
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Account Type */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Account Type
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Customer (Verified)
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Service Location */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  City / Location
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Addis Ababa, Ethiopia
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Preferred Language */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Language
                </Text>
                <Text style={[styles.detailTableValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  {language ? language.toUpperCase() : "English"}
                </Text>
              </View>
              <View style={[styles.detailTableDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

              {/* Row: Security Status */}
              <View style={styles.detailTableRow}>
                <Text style={[styles.detailTableLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Account Security
                </Text>
                <View style={styles.statusBadgeRow}>
                  <View style={styles.statusDotGreen} />
                  <Text style={[styles.detailTableValue, { color: "#10B981" }]}>
                    Active & Secure
                  </Text>
                </View>
              </View>
            </View>

            {/* LOG OUT BUTTON (Matches screenshot) */}
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.screenshotLogoutBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
              ]}
            >
              <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
              <Text style={styles.screenshotLogoutText}>Log Out</Text>
            </Pressable>
          </View>
        )}

        {/* ── TAB CONTENT: ADDRESS VIEW (Matches user's screenshot) ── */}
        {activeTab === "address" && (
          <View style={styles.bodyContent}>
            {addresses.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.addressCard,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                <View style={styles.addressHeaderRow}>
                  <View style={styles.addressTitleGroup}>
                    <View style={styles.addressIconWrap}>
                      <MapPin size={18} color="#EF4444" strokeWidth={2.4} />
                    </View>
                    <Text style={[styles.addressTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      {item.title}
                    </Text>
                    {item.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>

                  <Pressable
                    onPress={() => handleOpenEditAddress(item)}
                    hitSlop={12}
                    style={({ pressed }) => pressed && { opacity: 0.6 }}
                  >
                    <Text style={styles.addressEditLink}>Edit</Text>
                  </Pressable>
                </View>

                <Text style={[styles.addressDetailsText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  {item.address}
                </Text>
              </View>
            ))}

            {/* + Add New Address Card */}
            <Pressable
              onPress={handleOpenAddAddress}
              style={({ pressed }) => [
                styles.addAddressDashedBtn,
                {
                  borderColor: isDark ? "#334155" : "#CBD5E1",
                  backgroundColor: isDark ? "rgba(30, 41, 59, 0.4)" : "rgba(241, 245, 249, 0.5)",
                },
                pressed && { opacity: 0.7, transform: [{ scale: 0.99 }] },
              ]}
            >
              <Plus size={18} color={isDark ? "#94A3B8" : "#64748B"} strokeWidth={2.2} />
              <Text style={[styles.addAddressDashedText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                Add New Address
              </Text>
            </Pressable>

            {/* LOG OUT BUTTON (Matches screenshot) */}
            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.screenshotLogoutBtn,
                pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
              ]}
            >
              <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
              <Text style={styles.screenshotLogoutText}>Log Out</Text>
            </Pressable>
          </View>
        )}

        {/* ── TAB CONTENT: SETTINGS VIEW (Matches user's screenshot) ── */}
        {activeTab === "settings" && (
          settingsSubPage === "notifications" ? (
            <View style={styles.bodyContent}>
              {/* Back button & Title */}
              <View style={styles.subPageHeaderRow}>
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage(null);
                  }}
                  style={[
                    styles.subPageBackBtn,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                >
                  <ArrowLeft size={18} color={isDark ? "#FFFFFF" : "#0F172A"} strokeWidth={2.4} />
                </Pressable>
                <Text style={[styles.subPageTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Notifications
                </Text>
              </View>

              {/* Notification Settings Card (Matches Screenshot) */}
              <View
                style={[
                  styles.settingsCardBox,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                {/* 1. Appointment Updates */}
                <View style={styles.settingsRowItem}>
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <Bell size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.settingsTextCol}>
                      <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                        Appointment Updates
                      </Text>
                      <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                        Get notified about appointment changes
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={notifPrefs.appointmentUpdates}
                    onValueChange={(val) => handleToggleNotifPref("appointmentUpdates", val)}
                    trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* 2. Reminders */}
                <View style={styles.settingsRowItem}>
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <Bell size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.settingsTextCol}>
                      <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                        Reminders
                      </Text>
                      <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                        Reminders before upcoming appointments
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={notifPrefs.reminders}
                    onValueChange={(val) => handleToggleNotifPref("reminders", val)}
                    trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* 3. Chat Messages */}
                <View style={styles.settingsRowItem}>
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <MessageCircle size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.settingsTextCol}>
                      <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                        Chat Messages
                      </Text>
                      <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                        New messages from doctors
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={notifPrefs.chatMessages}
                    onValueChange={(val) => handleToggleNotifPref("chatMessages", val)}
                    trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* 4. Promotions & Offers */}
                <View style={styles.settingsRowItem}>
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <Info size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.settingsTextCol}>
                      <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                        Promotions & Offers
                      </Text>
                      <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                        Promotional offers and discounts
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={notifPrefs.promotions}
                    onValueChange={(val) => handleToggleNotifPref("promotions", val)}
                    trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* 5. Email Notifications */}
                <View style={styles.settingsRowItem}>
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <Mail size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.settingsTextCol}>
                      <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                        Email Notifications
                      </Text>
                      <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                        Receive updates via email
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={notifPrefs.emailNotifications}
                    onValueChange={(val) => handleToggleNotifPref("emailNotifications", val)}
                    trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* 6. SMS Notifications */}
                <View style={styles.settingsRowItem}>
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <Phone size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.settingsTextCol}>
                      <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                        SMS Notifications
                      </Text>
                      <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                        Receive updates via text message
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={notifPrefs.smsNotifications}
                    onValueChange={(val) => handleToggleNotifPref("smsNotifications", val)}
                    trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* LOG OUT BUTTON (Matches screenshot) */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.screenshotLogoutBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                ]}
              >
                <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
                <Text style={styles.screenshotLogoutText}>Log Out</Text>
              </Pressable>
            </View>
          ) : settingsSubPage === "password" ? (
            <View style={styles.bodyContent}>
              {/* Back button & Title (Matches screenshot) */}
              <View style={styles.subPageHeaderRow}>
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage(null);
                  }}
                  style={[
                    styles.subPageBackBtn,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                >
                  <ArrowLeft size={18} color={isDark ? "#FFFFFF" : "#0F172A"} strokeWidth={2.4} />
                </Pressable>
                <Text style={[styles.subPageTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Change Password
                </Text>
              </View>

              {/* Change Password Card Box (Matches screenshot) */}
              <View
                style={[
                  styles.passwordCardBox,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                {/* 1. Current Password */}
                <View style={styles.passwordFieldGroup}>
                  <Text style={[styles.passwordFieldLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Current Password
                  </Text>
                  <View
                    style={[
                      styles.passwordInputContainer,
                      {
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                        borderColor: isDark ? "#334155" : "#E2E8F0",
                      },
                    ]}
                  >
                    <Lock size={18} color="#94A3B8" strokeWidth={2} style={styles.passwordInputLeftIcon} />
                    <TextInput
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showCurrentPassword}
                      style={[
                        styles.passwordTextInput,
                        { color: isDark ? "#FFFFFF" : "#0F172A" },
                      ]}
                      autoCapitalize="none"
                    />
                    <Pressable
                      onPress={() => {
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                        setShowCurrentPassword((prev) => !prev);
                      }}
                      hitSlop={12}
                      style={styles.passwordEyeBtn}
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={18} color="#94A3B8" strokeWidth={2} />
                      ) : (
                        <Eye size={18} color="#94A3B8" strokeWidth={2} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* 2. New Password */}
                <View style={styles.passwordFieldGroup}>
                  <Text style={[styles.passwordFieldLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    New Password
                  </Text>
                  <View
                    style={[
                      styles.passwordInputContainer,
                      {
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                        borderColor: isDark ? "#334155" : "#E2E8F0",
                      },
                    ]}
                  >
                    <Lock size={18} color="#94A3B8" strokeWidth={2} style={styles.passwordInputLeftIcon} />
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Enter new password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showNewPassword}
                      style={[
                        styles.passwordTextInput,
                        { color: isDark ? "#FFFFFF" : "#0F172A" },
                      ]}
                      autoCapitalize="none"
                    />
                    <Pressable
                      onPress={() => {
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                        setShowNewPassword((prev) => !prev);
                      }}
                      hitSlop={12}
                      style={styles.passwordEyeBtn}
                    >
                      {showNewPassword ? (
                        <EyeOff size={18} color="#94A3B8" strokeWidth={2} />
                      ) : (
                        <Eye size={18} color="#94A3B8" strokeWidth={2} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* 3. Confirm New Password */}
                <View style={styles.passwordFieldGroup}>
                  <Text style={[styles.passwordFieldLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Confirm New Password
                  </Text>
                  <View
                    style={[
                      styles.passwordInputContainer,
                      {
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                        borderColor: isDark ? "#334155" : "#E2E8F0",
                      },
                    ]}
                  >
                    <Lock size={18} color="#94A3B8" strokeWidth={2} style={styles.passwordInputLeftIcon} />
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter new password"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showConfirmPassword}
                      style={[
                        styles.passwordTextInput,
                        { color: isDark ? "#FFFFFF" : "#0F172A" },
                      ]}
                      autoCapitalize="none"
                    />
                    <Pressable
                      onPress={() => {
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                        setShowConfirmPassword((prev) => !prev);
                      }}
                      hitSlop={12}
                      style={styles.passwordEyeBtn}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} color="#94A3B8" strokeWidth={2} />
                      ) : (
                        <Eye size={18} color="#94A3B8" strokeWidth={2} />
                      )}
                    </Pressable>
                  </View>
                </View>

                {/* Password rule helper text (Matches screenshot) */}
                <Text style={[styles.passwordHintText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Password must be at least 8 characters with a mix of letters and numbers.
                </Text>

                {/* Error Banner */}
                {!!passwordError && (
                  <View style={styles.passwordErrorBox}>
                    <Text style={styles.passwordErrorText}>{passwordError}</Text>
                  </View>
                )}

                {/* Success Banner */}
                {!!passwordSuccessMsg && (
                  <View style={styles.passwordSuccessBox}>
                    <Text style={styles.passwordSuccessText}>{passwordSuccessMsg}</Text>
                  </View>
                )}

                {/* Update Password Primary Button (Matches screenshot) */}
                <Pressable
                  onPress={handleChangePassword}
                  disabled={passwordLoading}
                  style={({ pressed }) => [
                    styles.updatePasswordBtn,
                    pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] },
                    passwordLoading && { opacity: 0.7 },
                  ]}
                >
                  {passwordLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.updatePasswordBtnText}>Update Password</Text>
                  )}
                </Pressable>
              </View>

              {/* LOG OUT BUTTON (Matches screenshot) */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.screenshotLogoutBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                ]}
              >
                <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
                <Text style={styles.screenshotLogoutText}>Log Out</Text>
              </Pressable>
            </View>
          ) : settingsSubPage === "privacy" ? (
            <View style={styles.bodyContent}>
              {/* Back button & Title (Matches screenshot) */}
              <View style={styles.subPageHeaderRow}>
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage(null);
                  }}
                  style={[
                    styles.subPageBackBtn,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                >
                  <ArrowLeft size={18} color={isDark ? "#FFFFFF" : "#0F172A"} strokeWidth={2.4} />
                </Pressable>
                <Text style={[styles.subPageTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Privacy & Security
                </Text>
              </View>

              {/* Security Toggles Card (Matches screenshot) */}
              <View
                style={[
                  styles.settingsCardBox,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                {/* 1. Two-Factor Authentication */}
                <View style={styles.settingsRowItem}>
                  <View style={styles.settingsTextCol}>
                    <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      Two-Factor Authentication
                    </Text>
                    <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                      Add an extra layer of security
                    </Text>
                  </View>
                  <Switch
                    value={privacySettings.twoFactor}
                    onValueChange={(val) => handleTogglePrivacySetting("twoFactor", val)}
                    trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* 2. Biometric Login */}
                <View style={styles.settingsRowItem}>
                  <View style={styles.settingsTextCol}>
                    <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      Biometric Login
                    </Text>
                    <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                      Use fingerprint or face recognition
                    </Text>
                  </View>
                  <Switch
                    value={privacySettings.biometricLogin}
                    onValueChange={(val) => handleTogglePrivacySetting("biometricLogin", val)}
                    trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* 3. Login Alerts */}
                <View style={styles.settingsRowItem}>
                  <View style={styles.settingsTextCol}>
                    <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      Login Alerts
                    </Text>
                    <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                      Get notified on new logins
                    </Text>
                  </View>
                  <Switch
                    value={privacySettings.loginAlerts}
                    onValueChange={(val) => handleTogglePrivacySetting("loginAlerts", val)}
                    trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* Data Management Card (Matches screenshot) */}
              <View
                style={[
                  styles.dataManagementCardBox,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                <Text style={[styles.dataManagementHeading, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Data Management
                </Text>

                {/* Download My Data Button */}
                <Pressable
                  onPress={handleDownloadData}
                  style={({ pressed }) => [
                    styles.downloadDataBtn,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.downloadDataBtnText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Download My Data
                  </Text>
                </Pressable>

                {/* Delete Account Button */}
                <Pressable
                  onPress={handleConfirmDeleteAccount}
                  style={({ pressed }) => [
                    styles.deleteAccountBtn,
                    {
                      backgroundColor: isDark ? "rgba(239, 68, 68, 0.08)" : "#FFFFFF",
                      borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "#FECACA",
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={styles.deleteAccountBtnText}>Delete Account</Text>
                </Pressable>
              </View>

              {/* LOG OUT BUTTON (Matches screenshot) */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.screenshotLogoutBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                ]}
              >
                <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
                <Text style={styles.screenshotLogoutText}>Log Out</Text>
              </Pressable>
            </View>
          ) : settingsSubPage === "help" ? (
            <View style={styles.bodyContent}>
              {/* Back button & Title (Matches screenshot) */}
              <View style={styles.subPageHeaderRow}>
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage(null);
                  }}
                  style={[
                    styles.subPageBackBtn,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                >
                  <ArrowLeft size={18} color={isDark ? "#FFFFFF" : "#0F172A"} strokeWidth={2.4} />
                </Pressable>
                <Text style={[styles.subPageTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Help Center
                </Text>
              </View>

              {/* Need Help Card (Matches screenshot) */}
              <Pressable
                onPress={handleContactSupport}
                style={({ pressed }) => [
                  styles.needHelpCard,
                  {
                    backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#FFF1F2",
                    borderColor: isDark ? "rgba(239, 68, 68, 0.25)" : "#FFE4E6",
                  },
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.needHelpIconContainer}>
                  <HelpCircle size={32} color="#EF4444" strokeWidth={2.2} />
                </View>
                <View style={styles.needHelpTextCol}>
                  <Text style={[styles.needHelpTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Need Help?
                  </Text>
                  <Text style={[styles.needHelpEmail, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    support@clean.et
                  </Text>
                </View>
              </Pressable>

              {/* FREQUENTLY ASKED QUESTIONS Heading */}
              <Text style={[styles.faqSectionHeading, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                FREQUENTLY ASKED QUESTIONS
              </Text>

              {/* FAQ Accordion Card (Matches screenshot) */}
              <View
                style={[
                  styles.faqCardBox,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                {CLEAN_ET_FAQS.map((faq, index) => {
                  const isExpanded = expandedFaqId === faq.id;
                  const isLast = index === CLEAN_ET_FAQS.length - 1;
                  return (
                    <View key={faq.id}>
                      <Pressable
                        onPress={() => handleToggleFaq(faq.id)}
                        style={({ pressed }) => [
                          styles.faqRowItem,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[styles.faqQuestionText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                          {faq.q}
                        </Text>
                        {isExpanded ? (
                          <ChevronUp size={18} color="#94A3B8" strokeWidth={2} />
                        ) : (
                          <ChevronDown size={18} color="#94A3B8" strokeWidth={2} />
                        )}
                      </Pressable>

                      {isExpanded && (
                        <View style={styles.faqAnswerContainer}>
                          <Text style={[styles.faqAnswerText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                            {faq.a}
                          </Text>
                        </View>
                      )}

                      {!isLast && (
                        <View
                          style={[
                            styles.settingsDivider,
                            { backgroundColor: isDark ? "#334155" : "#F1F5F9" },
                          ]}
                        />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* LOG OUT BUTTON (Matches screenshot) */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.screenshotLogoutBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                ]}
              >
                <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
                <Text style={styles.screenshotLogoutText}>Log Out</Text>
              </Pressable>
            </View>
          ) : settingsSubPage === "terms" ? (
            <View style={styles.bodyContent}>
              {/* Back button & Title (Matches screenshot) */}
              <View style={styles.subPageHeaderRow}>
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage(null);
                  }}
                  style={[
                    styles.subPageBackBtn,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                >
                  <ArrowLeft size={18} color={isDark ? "#FFFFFF" : "#0F172A"} strokeWidth={2.4} />
                </Pressable>
                <Text style={[styles.subPageTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Terms of Service
                </Text>
              </View>

              {/* Terms Content Card (Matches screenshot) */}
              <View
                style={[
                  styles.legalDocCardBox,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                <Text style={[styles.legalLastUpdatedText, { color: isDark ? "#94A3B8" : "#94A3B8" }]}>
                  Last updated: February 15, 2026
                </Text>

                {/* 1. Acceptance of Terms */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    1. Acceptance of Terms
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    By accessing and using Clean.et (Docly Pro), you agree to be bound by these Terms of Service.
                  </Text>
                </View>

                {/* 2. Description of Service */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    2. Description of Service
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Clean.et provides an on-demand cleaning service platform connecting clients with specialized cleaning crews including car washing, auto detailing, property cleaning, and facility maintenance.
                  </Text>
                </View>

                {/* 3. User Accounts */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    3. User Accounts
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    You must provide accurate information when creating an account. You are responsible for safeguarding your password and all activities under your account.
                  </Text>
                </View>

                {/* 4. Service Disclaimer */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    4. Service Disclaimer
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Clean.et connects you with verified professional cleaning crews. While we inspect and train all service personnel, please ensure personal valuables are secured prior to service arrival.
                  </Text>
                </View>

                {/* 5. Payment Terms */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    5. Payment Terms
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    All fees are due at the time of service or booking confirmation. Refunds are processed within 5-7 business days.
                  </Text>
                </View>

                {/* 6. Privacy */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    6. Privacy
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Your privacy is important to us. Please refer to our Privacy Policy for details on data collection and usage.
                  </Text>
                </View>

                {/* 7. Contact */}
                <View style={[styles.legalSectionGroup, { marginBottom: 0 }]}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    7. Contact
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    For questions about these terms, contact us at support@clean.et.
                  </Text>
                </View>
              </View>

              {/* LOG OUT BUTTON (Matches screenshot) */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.screenshotLogoutBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                ]}
              >
                <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
                <Text style={styles.screenshotLogoutText}>Log Out</Text>
              </Pressable>
            </View>
          ) : settingsSubPage === "privacy_policy" ? (
            <View style={styles.bodyContent}>
              {/* Back button & Title (Matches screenshot) */}
              <View style={styles.subPageHeaderRow}>
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage(null);
                  }}
                  style={[
                    styles.subPageBackBtn,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                >
                  <ArrowLeft size={18} color={isDark ? "#FFFFFF" : "#0F172A"} strokeWidth={2.4} />
                </Pressable>
                <Text style={[styles.subPageTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Privacy Policy
                </Text>
              </View>

              {/* Privacy Content Card (Matches screenshot) */}
              <View
                style={[
                  styles.legalDocCardBox,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                <Text style={[styles.legalLastUpdatedText, { color: isDark ? "#94A3B8" : "#94A3B8" }]}>
                  Last updated: February 15, 2026
                </Text>

                {/* Information We Collect */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Information We Collect
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    We collect information you provide directly, including name, email, phone number, saved addresses, and vehicle or property details. We also collect usage data and device information.
                  </Text>
                </View>

                {/* How We Use Your Information */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    How We Use Your Information
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    We use your information to provide services, process appointments, send notifications, and ensure account security.
                  </Text>
                </View>

                {/* Data Security */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Data Security
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    We implement AES-256 encryption, secure servers, and regular security audits to protect your information.
                  </Text>
                </View>

                {/* Compliance & Standards */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Compliance & Standards
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    We adhere to strict data protection standards and encryption protocols to safeguard your personal records and transaction details.
                  </Text>
                </View>

                {/* Data Sharing */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Data Sharing
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    We do not sell your personal data. We only share information with assigned cleaning crews and service providers you choose to consult.
                  </Text>
                </View>

                {/* Your Rights */}
                <View style={styles.legalSectionGroup}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Your Rights
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    You have the right to access, correct, or delete your personal data. You can opt out of marketing at any time.
                  </Text>
                </View>

                {/* Contact Us */}
                <View style={[styles.legalSectionGroup, { marginBottom: 0 }]}>
                  <Text style={[styles.legalSectionTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Contact Us
                  </Text>
                  <Text style={[styles.legalSectionBody, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    For privacy-related inquiries, contact us at support@clean.et.
                  </Text>
                </View>
              </View>

              {/* LOG OUT BUTTON (Matches screenshot) */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.screenshotLogoutBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                ]}
              >
                <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
                <Text style={styles.screenshotLogoutText}>Log Out</Text>
              </Pressable>
            </View>
          ) : settingsSubPage === "about" ? (
            <View style={styles.bodyContent}>
              {/* Back button & Title (Matches screenshot) */}
              <View style={styles.subPageHeaderRow}>
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage(null);
                  }}
                  style={[
                    styles.subPageBackBtn,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                >
                  <ArrowLeft size={18} color={isDark ? "#FFFFFF" : "#0F172A"} strokeWidth={2.4} />
                </Pressable>
                <Text style={[styles.subPageTitleText, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  About Clean.et
                </Text>
              </View>

              {/* 1. Top Card: Version & Description (Matches screenshot) */}
              <View
                style={[
                  styles.aboutHeroCard,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                <Text style={[styles.aboutHeroVersion, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Version 2.5.0
                </Text>

                <Text style={[styles.aboutHeroDesc, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Clean.et is a premium cleaning and hygiene service platform designed to connect clients with verified service professionals seamlessly.
                </Text>
              </View>

              {/* 2. Bottom Card: Specs / Info Table (Matches screenshot) */}
              <View
                style={[
                  styles.aboutSpecsCard,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                {/* Developer */}
                <View style={styles.aboutSpecRow}>
                  <Text style={[styles.aboutSpecLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Developer
                  </Text>
                  <Text style={[styles.aboutSpecValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Clean.et Team
                  </Text>
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* Email */}
                <View style={styles.aboutSpecRow}>
                  <Text style={[styles.aboutSpecLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Email
                  </Text>
                  <Text style={[styles.aboutSpecValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    support@clean.et
                  </Text>
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* Framework */}
                <View style={styles.aboutSpecRow}>
                  <Text style={[styles.aboutSpecLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Framework
                  </Text>
                  <Text style={[styles.aboutSpecValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    React Native + TypeScript
                  </Text>
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* UI Library */}
                <View style={styles.aboutSpecRow}>
                  <Text style={[styles.aboutSpecLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    UI Library
                  </Text>
                  <Text style={[styles.aboutSpecValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Tailwind CSS + shadcn/ui
                  </Text>
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* License */}
                <View style={styles.aboutSpecRow}>
                  <Text style={[styles.aboutSpecLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    License
                  </Text>
                  <Text style={[styles.aboutSpecValue, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                    Regular / Extended
                  </Text>
                </View>
              </View>

              {/* LOG OUT BUTTON (Matches screenshot) */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.screenshotLogoutBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                ]}
              >
                <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
                <Text style={styles.screenshotLogoutText}>Log Out</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.bodyContent}>
              {/* ── APPEARANCE SECTION ── */}
              <Text style={[styles.sectionHeading, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                APPEARANCE
              </Text>
              <View
                style={[
                  styles.settingsCardBox,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                {/* Dark Mode */}
                <View style={styles.settingsRowItem}>
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      {isDark ? (
                        <Moon size={18} color="#EF4444" strokeWidth={2.2} />
                      ) : (
                        <Sun size={18} color="#EF4444" strokeWidth={2.2} />
                      )}
                    </View>
                    <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      Dark Mode
                    </Text>
                  </View>
                  <Switch
                    value={isDark}
                    onValueChange={(val) => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                      toggleDark(val);
                    }}
                    trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* RTL Layout (Arabic) */}
                <View style={styles.settingsRowItem}>
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <Languages size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      RTL Layout (Arabic)
                    </Text>
                  </View>
                  <Switch
                    value={rtlEnabled}
                    onValueChange={handleToggleRtl}
                    trackColor={{ false: "#CBD5E1", true: "#EF4444" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* Language */}
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setLangModalVisible(true);
                  }}
                  style={({ pressed }) => [
                    styles.settingsRowItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <Globe size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.settingsTextCol}>
                      <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                        Language
                      </Text>
                      <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                        {language || "English"}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
                </Pressable>
              </View>

              {/* ── ACCOUNT SECTION ── */}
              <Text style={[styles.sectionHeading, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                ACCOUNT
              </Text>
              <View
                style={[
                  styles.settingsCardBox,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                {/* Notifications */}
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage("notifications");
                  }}
                  style={({ pressed }) => [
                    styles.settingsRowItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <Bell size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.settingsTextCol}>
                      <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                        Notifications
                      </Text>
                      <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                        {unreadNotificationsCount > 0 ? `${unreadNotificationsCount} active` : "4 active"}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
                </Pressable>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* Change Password */}
                <Pressable
                  onPress={async () => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setPasswordError("");
                    setPasswordSuccessMsg("");
                    try {
                      const savedPass = await AsyncStorage.getItem("@user_current_password");
                      if (savedPass) {
                        setCurrentPassword(savedPass);
                      } else if (!currentPassword) {
                        setCurrentPassword("password123");
                      }
                    } catch {}
                    setNewPassword("");
                    setConfirmPassword("");
                    setSettingsSubPage("password");
                  }}
                  style={({ pressed }) => [
                    styles.settingsRowItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <Lock size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      Change Password
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
                </Pressable>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* Payment Methods */}
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/profile/payments");
                  }}
                  style={({ pressed }) => [
                    styles.settingsRowItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <CreditCard size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      Payment Methods
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
                </Pressable>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* Privacy & Security */}
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage("privacy");
                  }}
                  style={({ pressed }) => [
                    styles.settingsRowItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <Shield size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      Privacy & Security
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
                </Pressable>
              </View>

              {/* ── SUPPORT SECTION ── */}
              <Text style={[styles.sectionHeading, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                SUPPORT
              </Text>
              <View
                style={[
                  styles.settingsCardBox,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                    borderColor: isDark ? "#334155" : "#E2E8F0",
                  },
                ]}
              >
                {/* Help Center */}
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage("help");
                  }}
                  style={({ pressed }) => [
                    styles.settingsRowItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <HelpCircle size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      Help Center
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
                </Pressable>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* Terms of Service */}
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage("terms");
                  }}
                  style={({ pressed }) => [
                    styles.settingsRowItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <FileText size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      Terms of Service
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
                </Pressable>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* Privacy Policy */}
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage("privacy_policy");
                  }}
                  style={({ pressed }) => [
                    styles.settingsRowItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <ShieldCheck size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                      Privacy Policy
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
                </Pressable>

                <View style={[styles.settingsDivider, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]} />

                {/* About Clean.et */}
                <Pressable
                  onPress={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                    setSettingsSubPage("about");
                  }}
                  style={({ pressed }) => [
                    styles.settingsRowItem,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={styles.settingsIconCircle}>
                      <Info size={18} color="#EF4444" strokeWidth={2.2} />
                    </View>
                    <View style={styles.settingsTextCol}>
                      <Text style={[styles.settingsItemLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                        About Clean.et
                      </Text>
                      <Text style={[styles.settingsItemSubtitle, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                        Version 2.5.0
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color="#94A3B8" strokeWidth={2} />
                </Pressable>
              </View>

              {/* LOG OUT BUTTON (Matches screenshot) */}
              <Pressable
                onPress={handleLogout}
                style={({ pressed }) => [
                  styles.screenshotLogoutBtn,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.99 }] },
                ]}
              >
                <LogOut size={18} color="#EF4444" strokeWidth={2.2} style={{ marginRight: 8 }} />
                <Text style={styles.screenshotLogoutText}>Log Out</Text>
              </Pressable>
            </View>
          )
        )}
      </ScrollView>

      {/* ── Logout ActionModal ── */}
      <ActionModal
        visible={logoutModalVisible}
        type="danger"
        title="Log Out?"
        message="Are you sure you want to log out of your account? You will need to sign in again to view your bookings."
        confirmText="Log Out"
        onConfirm={confirmLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />

      {/* ── Edit Profile Modal ── */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !editLoading && setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.editModalContainer}>
            <View
              style={[
                styles.editModalContent,
                { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: isDark ? "#334155" : "#E2E8F0" },
              ]}
            >
              <Text style={[styles.editModalTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                Edit Profile
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>Full Name</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                  value={editName}
                  onChangeText={(t) => {
                    setEditName(t);
                    setEditError("");
                  }}
                  placeholder="Your Name"
                  placeholderTextColor="#64748B"
                  editable={!editLoading}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>Phone Number</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                  value={editPhone}
                  onChangeText={(t) => {
                    setEditPhone(t);
                    setEditError("");
                  }}
                  placeholder="0911000000"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  editable={!editLoading}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>Email Address</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                  value={editEmail}
                  onChangeText={(t) => {
                    setEditEmail(t);
                    setEditError("");
                  }}
                  placeholder="name@email.com"
                  placeholderTextColor="#64748B"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!editLoading}
                />
              </View>

              {editError ? <Text style={styles.editErrorText}>{editError}</Text> : null}

              <View style={styles.modalActionsRow}>
                <Pressable
                  style={[styles.modalCancelBtn, editLoading && { opacity: 0.5 }]}
                  onPress={() => !editLoading && setEditModalVisible(false)}
                >
                  <Text style={[styles.modalCancelBtnText, { color: isDark ? "#94A3B8" : "#64748B" }]}>Cancel</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalSaveBtn, editLoading && { opacity: 0.7 }]}
                  onPress={handleUpdateProfile}
                  disabled={editLoading}
                >
                  {editLoading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Add / Edit Address Modal ── */}
      <Modal
        visible={addressModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddressModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.editModalContainer}>
            <View
              style={[
                styles.editModalContent,
                {
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              <Text style={[styles.editModalTitle, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                {selectedAddress ? "Edit Address" : "Add New Address"}
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Address Label
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                  value={addressTitle}
                  onChangeText={(t) => {
                    setAddressTitle(t);
                    setAddressError("");
                  }}
                  placeholder="e.g. Home, Office, Villa"
                  placeholderTextColor="#64748B"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                  Street Address
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      height: 72,
                      paddingTop: 10,
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      color: isDark ? "#FFFFFF" : "#0F172A",
                      borderColor: isDark ? "#334155" : "#E2E8F0",
                    },
                  ]}
                  value={addressText}
                  onChangeText={(t) => {
                    setAddressText(t);
                    setAddressError("");
                  }}
                  placeholder="e.g. 123 Main Street, Apt 4B, New York"
                  placeholderTextColor="#64748B"
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Set as default switch */}
              <View style={styles.defaultSwitchRow}>
                <Text style={[styles.defaultSwitchLabel, { color: isDark ? "#FFFFFF" : "#0F172A" }]}>
                  Set as Default Address
                </Text>
                <Switch
                  value={addressIsDefault}
                  onValueChange={setAddressIsDefault}
                  trackColor={{ false: "#CBD5E1", true: "#10B981" }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {addressError ? <Text style={styles.editErrorText}>{addressError}</Text> : null}

              <View style={styles.modalActionsRow}>
                {selectedAddress && (
                  <Pressable
                    style={styles.modalDeleteBtn}
                    onPress={handleDeleteAddress}
                  >
                    <Trash2 size={18} color="#EF4444" strokeWidth={2.2} />
                  </Pressable>
                )}

                <Pressable
                  style={styles.modalCancelBtn}
                  onPress={() => setAddressModalVisible(false)}
                >
                  <Text style={[styles.modalCancelBtnText, { color: isDark ? "#94A3B8" : "#64748B" }]}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.modalSaveBtn}
                  onPress={handleSaveAddress}
                >
                  <Text style={styles.modalSaveBtnText}>Save Address</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Language Selection Modal ── */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.editModalContainer}>
            <View
              style={[
                styles.editModalContent,
                {
                  backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.editModalTitle, { color: isDark ? "#FFFFFF" : "#0F172A", marginBottom: 0 }]}>
                  Select Language
                </Text>
                <Pressable onPress={() => setLangModalVisible(false)} hitSlop={10}>
                  <X size={20} color={isDark ? "#94A3B8" : "#64748B"} />
                </Pressable>
              </View>

              {["English", "Amharic", "Oromo", "French", "Spanish"].map((lang) => {
                const isSelected = (language || "English") === lang;
                return (
                  <Pressable
                    key={lang}
                    style={[
                      styles.langOptionRow,
                      isSelected && {
                        backgroundColor: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.08)",
                      },
                    ]}
                    onPress={async () => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                      await setLanguage(lang as any);
                      setLangModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.langOptionText,
                        { color: isSelected ? "#EF4444" : isDark ? "#FFFFFF" : "#0F172A" },
                      ]}
                    >
                      {lang}
                    </Text>
                    {isSelected && <Check size={18} color="#EF4444" strokeWidth={2.4} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>







      {/* ── Toast Feedback ── */}
      {showSuccessToast && (
        <View style={styles.successToast}>
          <CheckCircle2 size={18} color="#10B981" />
          <Text style={styles.successToastText}>Profile updated successfully!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Top Red Banner ──
  headerBanner: {
    paddingHorizontal: 18,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 4,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  avatarInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
  },
  profileInfoTextCol: {
    flex: 1,
  },
  profileName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 2,
  },
  profileEmail: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 2,
  },
  profileMeta: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 12,
    fontWeight: "500",
  },

  // ── 5 Navigation Pill Tabs ──
  tabsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    gap: 8,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  tabPillInactive: {
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Body Content Container ──
  bodyContent: {
    paddingHorizontal: 16,
  },

  // ── Section Heading ──
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    marginLeft: 4,
  },

  // ── Premium Features Row ──
  featuresRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  featureCard: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  featureIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  featureCardTitle: {
    fontSize: 12,
    fontWeight: "700",
  },

  // ── Details Table Card ──
  detailsCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 6,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  detailTableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  detailTableLabel: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  detailTableValue: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  detailTableDivider: {
    height: 1,
  },
  statusBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },

  // ── Log Out Button ──
  screenshotLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#EF4444",
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
  },
  screenshotLogoutText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Settings View Styles ──
  subPageHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  subPageBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  subPageTitleText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  settingsCardBox: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  settingsRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },
  settingsRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  settingsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsTextCol: {
    flex: 1,
  },
  settingsItemLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  settingsItemSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  settingsDivider: {
    height: 1,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  langOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  langOptionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalBodyText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  aboutBadge: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    marginBottom: 12,
  },
  aboutBadgeText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  editModalContainer: {
    width: "100%",
    maxWidth: 420,
  },
  editModalContent: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  editErrorText: {
    color: "#EF4444",
    fontSize: 12,
    marginBottom: 14,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.3)",
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    alignItems: "center",
  },
  modalSaveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Address Tab Styles ──
  addressCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  addressHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  addressTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  addressIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  addressTitleText: {
    fontSize: 16,
    fontWeight: "700",
  },
  defaultBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  defaultBadgeText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "700",
  },
  addressEditLink: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  },
  addressDetailsText: {
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 4,
  },
  addAddressDashedBtn: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  addAddressDashedText: {
    fontSize: 14,
    fontWeight: "600",
  },
  defaultSwitchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingVertical: 4,
  },
  defaultSwitchLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalDeleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Password Subpage Styles (Matches Screenshot) ──
  passwordCardBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  passwordFieldGroup: {
    marginBottom: 16,
  },
  passwordFieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  passwordInputLeftIcon: {
    marginRight: 10,
  },
  passwordTextInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  passwordEyeBtn: {
    padding: 6,
    marginLeft: 6,
  },
  passwordHintText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
    marginTop: 2,
  },
  passwordErrorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  passwordErrorText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "600",
  },
  passwordSuccessBox: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  passwordSuccessText: {
    color: "#10B981",
    fontSize: 13,
    fontWeight: "600",
  },
  updatePasswordBtn: {
    backgroundColor: "#EF4444",
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  updatePasswordBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Data Management Card Styles (Matches Screenshot) ──
  dataManagementCardBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dataManagementHeading: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  downloadDataBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  downloadDataBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  deleteAccountBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteAccountBtnText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Help Center Subpage Styles (Matches Screenshot) ──
  needHelpCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 22,
  },
  needHelpIconContainer: {
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  needHelpTextCol: {
    flex: 1,
  },
  needHelpTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  needHelpEmail: {
    fontSize: 13,
    fontWeight: "500",
  },
  faqSectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
    paddingLeft: 4,
  },
  faqCardBox: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  faqRowItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  faqQuestionText: {
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.2,
  },
  faqAnswerContainer: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    paddingTop: 2,
  },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "400",
  },

  // ── Legal Document Subpage Styles (Terms & Privacy Policy) ──
  legalDocCardBox: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  legalLastUpdatedText: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 18,
  },
  legalSectionGroup: {
    marginBottom: 16,
  },
  legalSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  legalSectionBody: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
  },

  // ── About Clean.et Subpage Styles (Matches Screenshot) ──
  aboutHeroCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  aboutHeroVersion: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  aboutHeroDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
  aboutSpecsCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  aboutSpecRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 18,
  },
  aboutSpecLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  aboutSpecValue: {
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Toast ──
  successToast: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.95)",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  successToastText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
