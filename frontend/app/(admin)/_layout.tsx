import { Stack } from "expo-router";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="booking-details" />
      <Stack.Screen name="broadcast" />
      <Stack.Screen name="customers" />
      <Stack.Screen name="help" />
      <Stack.Screen name="invoice-details" />
      <Stack.Screen name="invoices" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="services" />
      <Stack.Screen name="staff" />
      <Stack.Screen name="tenants" />
    </Stack>
  );
}
