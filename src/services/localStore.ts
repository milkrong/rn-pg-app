import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "nurture:";

export async function saveJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
}

export async function loadJson<T>(key: string): Promise<T | null> {
  const value = await AsyncStorage.getItem(`${PREFIX}${key}`);
  return value ? (JSON.parse(value) as T) : null;
}
