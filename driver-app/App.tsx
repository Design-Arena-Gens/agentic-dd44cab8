import "react-native-gesture-handler";

import { NavigationContainer, useFocusEffect } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { BarCodeScanner } from "expo-barcode-scanner";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import useSWR, { KeyedMutator } from "swr";

const Stack = createNativeStackNavigator();
const API_BASE =
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
  "https://agentic-dd44cab8.vercel.app";

const fetcher = <T,>(url: string): Promise<T> =>
  fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error("Failed to fetch");
    }
    return response.json() as Promise<T>;
  });

type OrderStatus = "pending" | "accepted" | "picked_up" | "in_transit" | "delivered" | "returned";

type Order = {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  address: string;
  cashDue: number;
  cashCollected: number;
  status: OrderStatus;
  timeline: Array<{ status: OrderStatus; timestamp: string; note?: string }>;
};

type OrdersResponse = {
  orders: Order[];
};

type DriverSession = {
  driverId: string;
  otp: string;
};

type RootStackParamList = {
  Login: undefined;
  Tasks: { session: DriverSession };
  TaskDetail: { session: DriverSession; order: Order; mutate: KeyedMutator<OrdersResponse> };
};

function LoginScreen({ navigation }: { navigation: any }) {
  const [driverId, setDriverId] = useState("DRV-1001");
  const [otp, setOtp] = useState("1234");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!driverId || !otp) {
      Alert.alert("Missing details", "Enter driver ID and OTP");
      return;
    }
    setLoading(true);
    try {
      if (otp !== "1234") {
        throw new Error("Invalid OTP");
      }
      navigation.replace("Tasks", { session: { driverId, otp } });
    } catch (error) {
      Alert.alert("Authentication failed", (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#05060a", padding: 24, justifyContent: "center" }}>
      <StatusBar style="light" />
      <View style={{ marginBottom: 32 }}>
        <Text style={{ color: "#34d399", fontSize: 12, letterSpacing: 4, textTransform: "uppercase" }}>
          Lekya Logistics
        </Text>
        <Text style={{ color: "white", fontSize: 28, marginTop: 12, fontWeight: "600" }}>
          Driver Console Login
        </Text>
        <Text style={{ color: "#94a3b8", marginTop: 8 }}>
          Authenticate using your driver ID and OTP provided by dispatch.
        </Text>
      </View>
      <View style={{ gap: 20 }}>
        <View>
          <Text style={{ color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>Driver ID</Text>
          <TextInput
            value={driverId}
            onChangeText={setDriverId}
            placeholder="DRV-1001"
            autoCapitalize="characters"
            style={{
              backgroundColor: "#0f172a",
              color: "white",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#1e293b",
            }}
          />
        </View>
        <View>
          <Text style={{ color: "#e2e8f0", marginBottom: 8, fontSize: 14 }}>OTP</Text>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="1234"
            secureTextEntry
            keyboardType="number-pad"
            style={{
              backgroundColor: "#0f172a",
              color: "white",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#1e293b",
            }}
          />
        </View>
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: "#34d399",
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#064e3b", fontWeight: "600", letterSpacing: 2 }}>ENTER CONSOLE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function useDriverLocation(session: DriverSession) {
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const syncLocation = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== Location.PermissionStatus.GRANTED) {
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        if (cancelled) return;
        await fetch(`${API_BASE}/api/drivers/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            driverId: session.driverId,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        }).catch(() => undefined);
      };

      syncLocation();
      const interval = setInterval(syncLocation, 15000);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, [session.driverId])
  );
}

function TasksScreen({ navigation, route }: { navigation: any; route: { params: { session: DriverSession } } }) {
  const { session } = route.params;
  const { data, isLoading, mutate } = useSWR<OrdersResponse>(
    `${API_BASE}/api/orders?driverId=${session.driverId}`,
    fetcher
  );

  useDriverLocation(session);

  const orders = data?.orders ?? [];
  const [cashVisible, setCashVisible] = useState(false);
  const [cashValue, setCashValue] = useState("");

  const handleCashSubmit = () => {
    setCashVisible(true);
  };

  const submitCash = async () => {
    const amount = Number(cashValue);
    if (!amount || Number.isNaN(amount)) {
      Alert.alert("Invalid input", "Enter a numeric amount");
      return;
    }
    await fetch(`${API_BASE}/api/cash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId: session.driverId, amount }),
    });
    Alert.alert("Submitted", "Dispatch team will verify your cash drop.");
    setCashVisible(false);
    setCashValue("");
    mutate();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#05060a" }}>
      <StatusBar style="light" />
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ color: "#34d399", fontSize: 12, letterSpacing: 4 }}>Active Tasks</Text>
            <Text style={{ color: "white", fontSize: 28, fontWeight: "600", marginTop: 6 }}>{session.driverId}</Text>
          </View>
          <TouchableOpacity
            onPress={handleCashSubmit}
            style={{
              backgroundColor: "#22d3ee",
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: "#0f172a", fontSize: 12, fontWeight: "600", letterSpacing: 1 }}>
              CASH HANDOVER
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 20 }}>
          <Text style={{ color: "#94a3b8" }}>Loading assignments...</Text>
        </View>
      ) : null}

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate("TaskDetail", { session, order: item, mutate })}
            style={{
              backgroundColor: "#0f172a",
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: "#1e293b",
            }}
          >
            <Text style={{ color: "#e2e8f0", fontSize: 18, fontWeight: "600" }}>{item.reference}</Text>
            <Text style={{ color: "#94a3b8", marginTop: 4 }}>{item.customerName}</Text>
            <Text style={{ color: "#64748b", marginTop: 4 }}>{item.address}</Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 12,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#22d3ee", fontWeight: "600" }}>₦{item.cashDue.toLocaleString()}</Text>
              <Text style={{
                color: item.status === "delivered" ? "#34d399" : "#facc15",
                fontSize: 12,
                letterSpacing: 1,
              }}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ padding: 20 }}>
            <Text style={{ color: "#94a3b8" }}>No active assignments yet. Refresh shortly.</Text>
          </View>
        }
      />
      {cashVisible ? (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "rgba(15,23,42,0.92)",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#0f172a",
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: "#1e293b",
              gap: 12,
            }}
          >
            <Text style={{ color: "#34d399", fontSize: 12, letterSpacing: 2 }}>CASH HANDED IN</Text>
            <Text style={{ color: "#e2e8f0", fontSize: 16 }}>
              Enter the cash amount delivered to finance during this shift.
            </Text>
            <TextInput
              value={cashValue}
              onChangeText={setCashValue}
              keyboardType="number-pad"
              placeholder="e.g. 50000"
              placeholderTextColor="#475569"
              style={{
                backgroundColor: "#020617",
                color: "white",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#1e293b",
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setCashVisible(false);
                  setCashValue("");
                }}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#1e293b",
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#94a3b8", letterSpacing: 2 }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitCash}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  backgroundColor: "#34d399",
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#064e3b", letterSpacing: 2, fontWeight: "600" }}>SUBMIT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function TaskDetailScreen({ navigation, route }: { navigation: any; route: { params: RootStackParamList["TaskDetail"] } }) {
  const { order, session, mutate } = route.params;
  const [scanning, setScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ title: order.reference });
    }, [navigation, order.reference])
  );

  const nextActions = useMemo(() => {
    switch (order.status) {
      case "pending":
        return ["accepted"];
      case "accepted":
        return ["picked_up"];
      case "picked_up":
        return ["in_transit"];
      case "in_transit":
        return ["delivered", "returned"];
      default:
        return [];
    }
  }, [order.status]);

  const requestScanner = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === "granted");
    setScanning(status === "granted");
  };

  const handleScan = ({ data }: { data: string }) => {
    setScanning(false);
    Alert.alert("Barcode captured", data);
  };

  const updateStatus = async (status: OrderStatus) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/orders/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, status }),
      });
      if (!response.ok) {
        throw new Error("Failed to update order");
      }
      await mutate();
      Alert.alert("Status updated", `Order now ${status}`);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", (error as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#05060a" }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ backgroundColor: "#0f172a", borderRadius: 16, padding: 18, borderColor: "#1e293b", borderWidth: 1 }}>
          <Text style={{ color: "#38bdf8", fontSize: 12, letterSpacing: 2 }}>CUSTOMER</Text>
          <Text style={{ color: "white", fontSize: 20, fontWeight: "600", marginTop: 8 }}>{order.customerName}</Text>
          <Text style={{ color: "#94a3b8", marginTop: 4 }}>{order.customerPhone}</Text>
          <Text style={{ color: "#cbd5f5", marginTop: 12 }}>{order.address}</Text>
        </View>

        <View style={{ backgroundColor: "#0f172a", borderRadius: 16, padding: 18, borderColor: "#1e293b", borderWidth: 1 }}>
          <Text style={{ color: "#38bdf8", fontSize: 12, letterSpacing: 2 }}>CASH</Text>
          <Text style={{ color: "white", fontSize: 24, fontWeight: "600", marginTop: 8 }}>₦{order.cashDue.toLocaleString()}</Text>
          <Text style={{ color: "#94a3b8", marginTop: 4 }}>Collected ₦{order.cashCollected.toLocaleString()}</Text>
        </View>

        <View style={{ backgroundColor: "#0f172a", borderRadius: 16, padding: 18, borderColor: "#1e293b", borderWidth: 1 }}>
          <Text style={{ color: "#38bdf8", fontSize: 12, letterSpacing: 2, marginBottom: 12 }}>TIMELINE</Text>
          {order.timeline.map((item) => (
            <View key={`${item.status}-${item.timestamp}`} style={{ marginBottom: 12 }}>
              <Text style={{ color: "#e2e8f0", fontWeight: "600" }}>{item.status.toUpperCase()}</Text>
              <Text style={{ color: "#94a3b8" }}>{new Date(item.timestamp).toLocaleString()}</Text>
              {item.note ? <Text style={{ color: "#64748b" }}>{item.note}</Text> : null}
            </View>
          ))}
        </View>

        {nextActions.length ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: "#34d399", fontSize: 12, letterSpacing: 2 }}>NEXT ACTION</Text>
            {nextActions.map((status) => (
              <TouchableOpacity
                key={status}
                disabled={submitting}
                onPress={() => updateStatus(status as OrderStatus)}
                style={{
                  backgroundColor: "#34d399",
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: "center",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                <Text style={{ color: "#064e3b", fontWeight: "700", letterSpacing: 3 }}>{status.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={requestScanner}
              style={{
                backgroundColor: "#22d3ee",
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#082f49", fontWeight: "700", letterSpacing: 2 }}>SCAN PACKAGE BARCODE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{
            backgroundColor: "#0f172a",
            borderRadius: 16,
            padding: 18,
            borderWidth: 1,
            borderColor: "#1e293b",
          }}>
            <Text style={{ color: "#34d399", fontSize: 16, fontWeight: "600" }}>Task Completed</Text>
            <Text style={{ color: "#94a3b8", marginTop: 6 }}>
              No further action required. Cash reconciliation auto-updates after confirmation.
            </Text>
          </View>
        )}

        {scanning && hasPermission ? (
          <View style={{ height: 300, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#22d3ee" }}>
            <BarCodeScanner onBarCodeScanned={handleScan} style={{ flex: 1 }} />
          </View>
        ) : null}
        {scanning && hasPermission === false ? (
          <Text style={{ color: "#f87171" }}>Camera permission denied. Enable camera access in settings.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "white",
          headerTitleStyle: { fontWeight: "600" },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Tasks" component={TasksScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} options={{ title: "Task" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
