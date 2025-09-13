import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import BinderGrid from '../components/BinderGrid';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';


export default function BinderGridScreen({ route }: NativeStackScreenProps<RootStackParamList, 'BinderGrid'>) {
const { binderId } = route.params;
// Demo grid placeholders – replace with Firestore binder load
const [page, setPage] = useState(0);
const [images, setImages] = useState<(string|null)[]>(Array(9).fill(null));


useEffect(() => {
// TODO: fetch binder by id and set images for page
}, [binderId, page]);


return (
<ScrollView contentContainerStyle={{ padding: 16 }}>
<Text style={{ fontSize: 18, marginBottom: 12 }}>Binder #{binderId} – Page {page+1}</Text>
<BinderGrid images={images} onPressSlot={(i) => { /* open card picker */ }} />
<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
<Button title="Prev" onPress={() => setPage((p) => Math.max(0, p-1))} />
<Button title="Next" onPress={() => setPage((p) => p+1)} />
</View>
</ScrollView>
);
}