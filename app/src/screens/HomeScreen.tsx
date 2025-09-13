import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList, TextInput } from 'react-native';
import { useAuthStore } from '../state/useAuthStore';
import { createBinder } from '../lib/api';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../App';


export default function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) {
const { user } = useAuthStore();
const [name, setName] = useState('Traders');
const [binders, setBinders] = useState<{ id: string; name: string }[]>([]);


useEffect(() => {
// TODO: load binders for user
}, []);


return (
<View style={{ flex: 1, padding: 16, gap: 16 }}>
<Text style={{ fontSize: 20 }}>Hello {user?.email}</Text>
<View style={{ flexDirection: 'row', gap: 8 }}>
<TextInput value={name} onChangeText={setName} placeholder="Binder name" style={{ borderWidth: 1, padding: 8, flex: 1 }} />
<Button title="Create" onPress={async () => {
if (!user) return;
const id = await createBinder(user.uid, name);
setBinders((b) => [{ id, name }, ...b]);
}} />
</View>


<FlatList data={binders} keyExtractor={(b) => b.id}
renderItem={({ item }) => (
<View style={{ padding: 12, borderWidth: 1, marginBottom: 8 }}>
<Text style={{ fontWeight: '600' }}>{item.name}</Text>
<Button title="Open" onPress={() => navigation.navigate('BinderGrid', { binderId: item.id })} />
</View>
)}
/>
</View>
);
}