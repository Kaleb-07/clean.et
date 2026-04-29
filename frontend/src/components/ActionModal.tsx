import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
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
        
        <View style={styles.content}>
          <BlurView intensity={90} tint="dark" style={styles.modalBody}>
            <View style={[styles.iconContainer, { backgroundColor: `${colors[type]}15` }]}>
              <Icon color={colors[type]} size={24} />
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
          </BlurView>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  content: {
    width: Dimensions.get('window').width * 0.8,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
  },
});
