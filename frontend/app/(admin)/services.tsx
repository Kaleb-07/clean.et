import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import API from "../../src/api/client";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/* ================= TYPES ================= */
type Service = {
  id: number;
  name: string;
  description: string;
  price: number;
  image?: string;
};

export default function AdminServices() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [services, setServices] = useState<Service[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<number | null>(null);

  const [successModal, setSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const res = await API.get("/services");
      setServices(res.data.data);
    } catch (e) {
      console.log(e);
    }
  };

  /* ================= SAVE (ADD / UPDATE) ================= */
 const handleSave = async () => {
   try {
     if (!form.name) {
       return Alert.alert("Error", "Name required");
     }

     const price = Number(form.price.trim());

     if (!Number.isFinite(price) || price < 0) {
       return Alert.alert("Error", "Invalid price");
     }

     const payload = {
       name: form.name,
       description: form.description,
       price,
     };

     if (editingService) {
       await API.put(`/services/${editingService.id}`, payload);
       setSuccessMessage("Service updated successfully!");
     } else {
       await API.post("/services", payload);
       setSuccessMessage("Service added successfully!");
     }

     setModalVisible(false);
     setEditingService(null);
     setForm({ name: "", description: "", price: "" });

     loadServices();
     setSuccessModal(true);
   } catch (e) {
     Alert.alert("Error", "Failed to save service");
   }
 };

  /* ================= DELETE ================= */
  const confirmDelete = async () => {
    if (!selectedDeleteId) return;

    try {
      await API.delete(`/services/${selectedDeleteId}`);
      setDeleteModal(false);
      setSuccessMessage("Service deleted successfully!");
      setSuccessModal(true);
      loadServices();
    } catch (e) {
      console.log(e);
    }
  };

  const openDelete = (id: number) => {
    setSelectedDeleteId(id);
    setDeleteModal(true);
  };

  /* ================= EDIT ================= */
  const openEdit = (item: Service) => {
    setEditingService(item);
    setForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
    });
    setModalVisible(true);
  };

  /* ================= CARD ================= */
  const renderItem = ({ item, index }: any) => (
    <Animated.View entering={FadeInDown.delay(index * 80)}>
      <View style={styles.card}>
        <View style={styles.imageBox}>
          <Ionicons name="cut" size={22} color="#8b5cf6" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.desc} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="cash-outline" size={14} color="#8b5cf6" />
            <Text style={styles.price}>${item.price}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openEdit(item)}>
            <Ionicons name="create-outline" size={22} color="#8b5cf6" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openDelete(item.id)}>
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <LinearGradient colors={["#0b0b1f", "#1a1b3a"]} style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/(admin)/(tabs)/dashboard");
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Services</Text>

        <View style={{ width: 22 }} />
      </View>

      {/* LIST */}
      <FlatList
        data={services}
        keyExtractor={(i) => i.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      />

      {/* FAB (FIXED - NOT HIDDEN) */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => {
          setEditingService(null);
          setForm({ name: "", description: "", price: "" });
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* ADD / EDIT MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingService ? "Edit Service" : "Add Service"}
            </Text>

            <TextInput
              placeholder="Name"
              value={form.name}
              onChangeText={
                (t) => setForm({ ...form, name: t }) 
              }
              style={styles.input}
              placeholderTextColor="#aaa"
            />

            <TextInput
              placeholder="Description"
              value={form.description}
              onChangeText={
                (t) => setForm({ ...form, description: t }) 
              }
              style={styles.input}
              placeholderTextColor="#aaa"
            />

            <TextInput
              placeholder="Price"
              keyboardType="numeric"
              value={form.price}
              onChangeText={(t) =>
                setForm({ ...form, price: t.replace(/[^0-9.]/g, "") })
              }
              style={styles.input}
              placeholderTextColor="#aaa"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text
                style={{ textAlign: "center", marginTop: 10, color: "#fff" }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRMATION MODAL (NEW) */}
      <Modal visible={deleteModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Delete Service?</Text>
            <Text style={styles.confirmText}>
              This action cannot be undone.
            </Text>

            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#333" }]}
                onPress={() => setDeleteModal(false)}
              >
                <Text style={{ color: "#fff" }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: "#ef4444" }]}
                onPress={confirmDelete}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal visible={successModal} transparent animationType="fade">
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmBox, { borderColor: "#22c55e" }]}>
            <Ionicons name="checkmark-circle" size={50} color="#22c55e" />
            <Text style={styles.confirmTitle}>Success</Text>
            <Text style={styles.confirmText}>{successMessage}</Text>

            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: "#22c55e" }]}
              onPress={() => setSuccessModal(false)}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  card: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
  },

  imageBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "rgba(139,92,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  title: { color: "#fff", fontWeight: "700", fontSize: 15 },
  desc: { color: "#aaa", fontSize: 12, marginTop: 2 },

  metaRow: { flexDirection: "row", marginTop: 6, alignItems: "center" },

  price: { color: "#8b5cf6", fontWeight: "700", marginLeft: 6 },

  actions: { flexDirection: "row", gap: 12 },

  fab: {
    position: "absolute",
    right: 20,
    backgroundColor: "#6d28d9",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 10,
    marginBottom: 40,
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  modalCard: {
    backgroundColor: "#1a1b3a",
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },

  modalTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
    color: "#fff",
  },

  saveBtn: {
    backgroundColor: "#6d28d9",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },

  /* CONFIRM MODALS */
  confirmOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  confirmBox: {
    width: "80%",
    backgroundColor: "#1a1b3a",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6d28d9",
  },

  confirmTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 10,
  },

  confirmText: {
    color: "#aaa",
    textAlign: "center",
    marginVertical: 10,
  },

  confirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  confirmBtn: {
    padding: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },
});
