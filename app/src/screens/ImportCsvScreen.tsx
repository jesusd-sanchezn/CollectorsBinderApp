import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Appbar, Button, Card, Title, Paragraph, ProgressBar } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

interface ImportCsvScreenProps {
  navigation: any;
}

export default function ImportCsvScreen({ navigation }: ImportCsvScreenProps) {
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setSelectedFile(result);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const importCsv = async () => {
    if (!selectedFile || selectedFile.canceled) {
      Alert.alert('Error', 'Please select a CSV file first');
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    try {
      // Read the CSV file
      const csvContent = await FileSystem.readAsStringAsync(selectedFile.assets[0].uri);
      
      // Parse CSV (basic implementation)
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',');
      
      setImportProgress(0.3);

      // Process each line
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const cardData = {
            name: values[0]?.trim(),
            set: values[1]?.trim(),
            rarity: values[2]?.trim(),
            quantity: parseInt(values[3]?.trim()) || 1,
            price: parseFloat(values[4]?.trim()) || 0,
          };

          // TODO: Save to Firestore
          console.log('Importing card:', cardData);
          
          setImportProgress(0.3 + (i / lines.length) * 0.7);
        }
      }

      setImportProgress(1);
      Alert.alert('Success', 'CSV imported successfully!');
      
      // Navigate back to home
      setTimeout(() => {
        navigation.navigate('Home');
      }, 1000);

    } catch (error) {
      Alert.alert('Error', 'Failed to import CSV file');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Import CSV" />
      </Appbar.Header>

      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title>Import Card Collection</Title>
            <Paragraph style={styles.description}>
              Select a CSV file containing your card collection data. The CSV should have columns for:
              Name, Set, Rarity, Quantity, and Price.
            </Paragraph>

            <Button
              mode="outlined"
              onPress={pickDocument}
              style={styles.pickButton}
              disabled={isImporting}
            >
              {selectedFile && !selectedFile.canceled 
                ? selectedFile.assets[0].name 
                : 'Select CSV File'
              }
            </Button>

            {isImporting && (
              <View style={styles.progressContainer}>
                <Paragraph>Importing cards...</Paragraph>
                <ProgressBar progress={importProgress} style={styles.progressBar} />
                <Paragraph>{Math.round(importProgress * 100)}%</Paragraph>
              </View>
            )}

            <Button
              mode="contained"
              onPress={importCsv}
              disabled={!selectedFile || selectedFile.canceled || isImporting}
              style={styles.importButton}
            >
              Import Cards
            </Button>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    elevation: 4,
  },
  description: {
    marginBottom: 16,
    color: '#666',
  },
  pickButton: {
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    marginVertical: 8,
  },
  importButton: {
    marginTop: 8,
  },
});
