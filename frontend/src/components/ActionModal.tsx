import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react-native';

interface ActionModalProps {
  visible: boolean;
  type?: 'success' | 'warning' | 'info' | 'danger';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export default function ActionModal({
  visible,
  type = 'info',
  title,
  message,
  confirmText = 'Done',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}: ActionModalProps) {

  const colors = {
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  };

  const Icon = type === 'success' ? CheckCircle2 : type === 'warning' || type === 'danger' ? AlertTriangle : Info;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <BlurView intensity={10} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Compact Card Containers */}
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${colors[type]}15` }]}>
            <Icon color={colors[type]} size={22} />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonContainer}>
            {onCancel && (
              <Pressable style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.confirmBtn, { backgroundColor: colors[type] }]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmBtnText}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    width: '80%',           // Use percentage instead of Dimensions
    maxWidth: 280,          // Hard cap the size on large screens
    backgroundColor: '#1e1e2d', // Solid background for reliable rendering
    borderRadius: 20,
    padding: 20,            // Padding applied directly to the container
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,           // Smaller, tighter font
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  message: {
    color: '#94a3b8',
    fontSize: 12,           // Smaller, tighter font
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,    // Thinner button
    borderRadius: 10,       // Tighter border radius
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,           // Smaller text
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 13,
  },
});
