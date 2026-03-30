import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import QualityGuideLayout from "../components/qualityGuideLayout";
import { supabase } from "../../../../backend/supabaseClient";

export default function QualityGuidePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("quality-guide");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showProductSubmenu, setShowProductSubmenu] = useState(true); // Start with submenu open since we're in Product/Services
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("product_and_services")
        .select("pns_id, name, pns_image, pns_category, type")
        .eq("type", "product");
      if (!error) setProducts(data || []);
    };
    fetchProducts();
  }, []);

  // Function to handle sidebar hover
  const expandSidebar = () => {
    setSidebarExpanded(true);
  };

  // Function to collapse sidebar
  const collapseSidebar = () => {
    setSidebarExpanded(false);
    setShowProductSubmenu(false);
  };

  // Function to toggle product submenu
  const toggleProductSubmenu = () => {
    setShowProductSubmenu(!showProductSubmenu);
  };

  // Function to handle logout
  const handleLogout = () => {
    logout();
    router.replace("/screens/loginScreen");
  };

  // Render the sidebar menu
  const renderSidebar = () => (
    <View
      style={[styles.sidebar, sidebarExpanded && styles.sidebarExpanded]}
      onMouseEnter={expandSidebar}
      onMouseLeave={collapseSidebar}
    >
      <View style={styles.logoContainer}>
        <View style={styles.logoBox}>
          <Image
            source={require("../../../assets/logo.png")}
            style={styles.logoImage}
          />
        </View>
      </View>
      <TouchableOpacity
        style={[styles.menuItem, activeTab === "map" && styles.activeMenuItem]}
        onPress={() => {
          setActiveTab("map");
          router.push("/modules/stallManagement/screens/adminInterface");
        }}
      >
        <Image
          source={require("../../../assets/map.png")}
          style={styles.logoImage}
        />
        {sidebarExpanded && <Text style={styles.menuText}>Map</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.menuItem,
          activeTab === "users" && styles.activeMenuItem,
        ]}
        onPress={() => {
          setActiveTab("users");
          router.push("/modules/stallManagement/screens/accountCreation");
        }}
      >
        <Image
          source={require("../../../assets/account-creation.png")}
          style={styles.logoImage}
        />
        {sidebarExpanded && (
          <Text style={styles.menuText}>Account Creation</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.menuItem,
          activeTab === "dashboard" && styles.activeMenuItem,
        ]}
        onPress={toggleProductSubmenu}
      >
        <Image
          source={require("../../../assets/PnS.png")}
          style={styles.logoImage}
        />
        {sidebarExpanded && (
          <View style={styles.productServicesContainer}>
            <Text style={styles.menuText}>Product/Services</Text>
            <Image
              source={require("../../../assets/dropdown-arrow.png")}
              style={[
                styles.arrowIcon,
                {
                  transform: [
                    { rotate: showProductSubmenu ? "0deg" : "270deg" },
                  ],
                },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>
      {sidebarExpanded && showProductSubmenu && (
        <View style={styles.submenu}>
          <TouchableOpacity
            style={styles.submenuItem}
            onPress={() => {
              setActiveTab("quality-guide");
              router.push("/modules/stallManagement/screens/qualityGuide");
            }}
          >
            <Text style={styles.submenuText}>Quality Guide</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submenuItem}
            onPress={() => {
              setActiveTab("listing");
              router.push("/modules/stallManagement/screens/listing");
            }}
          >
            <Text style={styles.submenuText}>Listing Creation</Text>
          </TouchableOpacity>
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.menuItem,
          activeTab === "settings" && styles.activeMenuItem,
        ]}
        onPress={() => {
          setActiveTab("settings");
          router.push("/modules/stallManagement/screens/stall");
        }}
      >
        <Image
          source={require("../../../assets/stall.png")}
          style={styles.logoImage}
        />
        {sidebarExpanded && <Text style={styles.menuText}>Stalls</Text>}
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.menuItem,
          activeTab === "messages" && styles.activeMenuItem,
        ]}
        onPress={() => {
          setActiveTab("messages");
          router.push("/modules/stallManagement/screens/messageInbox");
        }}
      >
        <Ionicons name="mail" size={24} color="#fff" />
        {sidebarExpanded && <Text style={styles.menuText}>Messages</Text>}
      </TouchableOpacity>
      <View style={styles.sidebarBottom}>
        <TouchableOpacity
          style={[
            styles.menuItem,
            activeTab === "user-account" && styles.activeMenuItem,
          ]}
          onPress={() => {
            setActiveTab("user-account");
            router.push("/modules/stallManagement/screens/account");
          }}
        >
          <Image
            source={require("../../../assets/user-account.png")}
            style={styles.logoImage}
          />
          {sidebarExpanded && <Text style={styles.menuText}>Account</Text>}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => handleLogout()}
        >
          <Image
            source={require("../../../assets/logout.png")}
            style={styles.logoImage}
          />
          {sidebarExpanded && <Text style={styles.menuText}>Logout</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderSidebar()}
      <View style={styles.mainContent}>
        <Text style={styles.title}>Quality Guide</Text>
        <Text style={styles.description}>
          Establish clear and consistent product guidelines and standards.
        </Text>

        <View style={styles.contentSection}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Products</Text>
          </View>

          {/* Quality Guide Layout */}
          <QualityGuideLayout
            visible={showModal}
            products={products}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    padding: 0,
    backgroundColor: "#ffffff",
  },
  mainContent: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  description: {
    fontSize: 16,
    color: "#666",
    marginBottom: 32,
  },
  contentSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  searchSection: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    width: "60%",
    height: 40,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
  },
  searchButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchIcon: {
    fontSize: 18,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5c9a6c",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  addButtonIcon: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 6,
  },
  addButtonText: {
    color: "white",
    fontSize: 14,
  },
  productsList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    color: "#999",
    fontSize: 16,
  },
  logoImage: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  sidebar: {
    width: 60,
    backgroundColor: "#1976D2",
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "flex-start",
    height: "100%",
    transition: "width 0.3s",
  },
  sidebarExpanded: {
    width: 220,
    alignItems: "flex-start",
  },
  logoContainer: {
    marginBottom: 40,
    width: "100%",
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItem: {
    width: "100%",
    height: 44,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  activeMenuItem: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  menuText: {
    color: "white",
    marginLeft: 15,
    fontSize: 16,
  },
  productServicesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  arrowIcon: {
    width: 12,
    height: 12,
    marginLeft: 10,
    tintColor: "white",
  },
  submenu: {
    width: "100%",
    backgroundColor: "#1e88e5",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 15,
  },
  submenuItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  submenuText: {
    color: "white",
    fontSize: 14,
  },
  sidebarBottom: {
    position: "absolute",
    bottom: 130,
    width: "100%",
    alignItems: "center",
  },
});
