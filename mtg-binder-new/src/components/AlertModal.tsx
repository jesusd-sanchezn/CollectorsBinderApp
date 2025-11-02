import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { Layout, Text, Button, Card } from '@ui-kitten/components';

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  type?: 'success' | 'danger' | 'warning';
  onClose: () => void;
}

export default function AlertModal({ visible, title, message, type = 'danger', onClose }: AlertModalProps) {
  const getStatus = () => {
    switch (type) {
      case 'success':
        return 'success';
      case 'danger':
        return 'danger';
      case 'warning':
        return 'warning';
      default:
        return 'danger';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Layout style={styles.modalOverlay}>
        <Card style={styles.alertCard}>
          <Text category="h5" style={styles.alertTitle}>{title}</Text>
          <Text category="s1" style={styles.alertMessage}>{message}</Text>
          <Button
            status={getStatus()}
            onPress={onClose}
            style={styles.alertButton}
          >
            OK
          </Button>
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
  alertCard: {
    width: '80%',
    maxWidth: 400,
    padding: 20,
  },
  alertTitle: {
    marginBottom: 10,
    textAlign: 'center',
  },
  alertMessage: {
    marginBottom: 20,
    textAlign: 'center',
  },
  alertButton: {
    marginTop: 10,
  },
});

