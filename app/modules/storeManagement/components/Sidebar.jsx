import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';

const SIDEBAR_WIDTH_COLLAPSED = 60;
const SIDEBAR_WIDTH_EXPANDED = 220;
const ICON_SIZE = 24;

export default function Sidebar({ onAccountPress }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = React.useState(false);

  const expandSidebar = () => setSidebarExpanded(true);
  const collapseSidebar = () => setSidebarExpanded(false);
  const toggleSidebar = () => setSidebarExpanded(prev => !prev);

  const handleLogout = () => {
    logout();
    router.replace('/screens/loginScreen');
  };

  const handleGoToDashboard = () => {
    // Navigate to the Store Management dashboard screen
    // Keeping lower-case to match the file name `dashboard.jsx`.
    router.replace('/modules/storeManagement/screens/dashboard');
  };

  return (
    <View
      style={[styles.sidebar, sidebarExpanded && styles.sidebarExpanded]}
      onMouseEnter={expandSidebar}
      onMouseLeave={collapseSidebar}
    >
      <View style={styles.topGroup}>
        <TouchableOpacity
          onPress={Platform.OS === 'web' ? undefined : toggleSidebar}
          activeOpacity={0.7}
          style={styles.logoContainer}
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={[styles.sidebarIcon, styles.logoIcon]}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onAccountPress}>
          <Image
            source={require('../../../assets/user-account.png')}
            style={styles.sidebarIcon}
          />
          {sidebarExpanded && <Text style={styles.menuText}>Account</Text>}
        </TouchableOpacity>

        {/* Dashboard Navigation */}
        <TouchableOpacity
          style={[styles.iconBtn, styles.dashboardBtn]}
          onPress={handleGoToDashboard}
        >
          <Feather name="grid" size={ICON_SIZE} color="#fff" />
          {sidebarExpanded && <Text style={styles.menuText}>Dashboard</Text>}
        </TouchableOpacity>

        {/* Stall Profiles Navigation */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/modules/storeManagement/screens/StallProfiles')}
        >
          <Feather name="home" size={ICON_SIZE} color="#fff" />
          {sidebarExpanded && <Text style={styles.menuText}>Stall Profiles</Text>}
        </TouchableOpacity>

        {/* Messages Navigation */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/modules/storeManagement/screens/MessageRequest')}
        >
          <Feather name="mail" size={ICON_SIZE} color="#fff" />
          {sidebarExpanded && <Text style={styles.menuText}>Messages</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.middleGroup}>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Image
            source={require('../../../assets/logout.png')}
            style={styles.sidebarIcon}
          />
          {sidebarExpanded && <Text style={styles.menuText}>Logout</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH_COLLAPSED,
    backgroundColor: '#1976D2',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: '100%',
    transition: 'width 0.3s ease',
  },
  sidebarExpanded: {
    width: SIDEBAR_WIDTH_EXPANDED,
    alignItems: 'flex-start',
  },
  topGroup: {
    alignItems: 'center',
    width: '100%',
  },
  middleGroup: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 24,
  },
  logoContainer: {
    marginBottom: 28,
    width: '100%',
    alignItems: 'center',
  },
  iconBtn: {
    marginVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    width: '100%',
  },
  menuItem: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  sidebarIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    resizeMode: 'contain',
  },
  dashboardIcon: {
    tintColor: '#FFFFFF',
  },
  logoIcon: {
    width: ICON_SIZE + 6,
    height: ICON_SIZE + 6,
  },
  menuText: {
    color: 'white',
    marginLeft: 15,
    fontSize: 16,
  },
  // Extra spacing so Dashboard isn't too close to Account
  dashboardBtn: {
    marginTop: 18,
  },
});
