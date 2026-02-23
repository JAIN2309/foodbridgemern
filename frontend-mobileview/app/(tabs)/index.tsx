import { useAppSelector } from '../../src/hooks/useRedux';
import DonorDashboard from '../../src/screens/DonorDashboard';
import NGODashboard from '../../src/screens/NGODashboard';
import AdminDashboard from '../../src/screens/AdminDashboard';
import { View, Text, StyleSheet } from 'react-native';

export default function DashboardIndex() {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (user.role === 'donor') {
    return <DonorDashboard />;
  }

  if (user.role === 'ngo') {
    return <NGODashboard />;
  }

  if (user.role === 'admin') {
    return <AdminDashboard />;
  }

  return (
    <View style={styles.container}>
      <Text>Unknown user role</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
