import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Colors } from "@/constants/colors";
import { Species } from "@/context/PetsContext";

interface PetAvatarProps {
  photoUri?: string;
  species: Species;
  size?: number;
  color?: string;
}

export function PetAvatar({ photoUri, species, size = 56, color }: PetAvatarProps) {
  const bgColor = color || Colors.primaryLight;

  if (photoUri) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image
          source={{ uri: photoUri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      </View>
    );
  }

  const iconName = species === "cat" ? "paw" : species === "dog" ? "paw" : "paw";
  const iconSize = size * 0.5;

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor },
      ]}
    >
      <MaterialCommunityIcons name={iconName} size={iconSize} color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
});
