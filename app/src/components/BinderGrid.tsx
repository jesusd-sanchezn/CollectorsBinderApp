import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';


interface Props { images: (string | null)[]; onPressSlot?: (index: number) => void; }


export default function BinderGrid({ images, onPressSlot }: Props) {
return (
<View style={{ aspectRatio: 3/3, width: '100%', flexWrap: 'wrap', flexDirection: 'row' }}>
{Array.from({ length: 9 }, (_, i) => (
<TouchableOpacity key={i} style={{ width: '33.333%', aspectRatio: 1, padding: 4 }} onPress={() => onPressSlot?.(i)}>
<View style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', backgroundColor: '#fafafa' }}>
{images[i] && (
<Image source={{ uri: images[i]! }} resizeMode="cover" style={{ width: '100%', height: '100%' }} />
)}
</View>
</TouchableOpacity>
))}
</View>
);
}