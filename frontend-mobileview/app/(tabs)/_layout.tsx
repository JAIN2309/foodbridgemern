import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useAppSelector, useAppDispatch } from '../../src/hooks/useRedux';
import { logoutUser } from '../../src/store/authSlice';

export default function TabsLayout() {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const router = useRouter();

  // Debug: Log user role
  console.log('Current user role:', user?.role);
  console.log('Full user object:', user);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    router.replace('/login');
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563eb',
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 16 }}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      {/* All users see same simple navigation: Dashboard + Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
