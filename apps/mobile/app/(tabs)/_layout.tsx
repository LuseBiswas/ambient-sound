import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#0f0f0f', borderTopColor: '#1e1e1e' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#555',
        headerStyle: { backgroundColor: '#0f0f0f' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="broadcast"
        options={{
          title: 'Broadcast',
          tabBarLabel: 'Broadcast',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📡</Text>,
        }}
      />
      <Tabs.Screen
        name="monitor"
        options={{
          title: 'Monitor',
          tabBarLabel: 'Listen',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🎧</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}
