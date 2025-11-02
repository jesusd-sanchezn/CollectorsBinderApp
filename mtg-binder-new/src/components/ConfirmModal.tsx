import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { Layout, Text, Button, Card } from '@ui-kitten/components';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmStatus?: 'success' | 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ 
  visible, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  confirmStatus = 'danger',
  onConfirm, 
  onCancel 
}: ConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Layout style={styles.modalOverlay}>
        <Card style={styles.confirmCard}>
          <Text category="h5" style={styles.confirmTitle}>{title}</Text>
          <Text category="s1" style={styles.confirmMessage}>{message}</Text>
          <Layout style={styles.buttonContainer}>
            <Button
              appearance="ghost"
              status="basic"
              onPress={onCancel}
              style={styles.cancelButton}
            >
              {cancelText}
            </Button>
            <Button
              status={confirmStatus}
              onPress={onConfirm}
              style={styles.confirmButton}
            >
              {confirmText}
            </Button>
          </Layout>
        </Card>
      </Layout>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  confirmCard: {
    width: '80%',
    maxWidth: 400,
    padding: 20,
  },
  confirmTitle: {
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmMessage: {
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});

