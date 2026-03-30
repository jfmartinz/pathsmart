import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

export default function StallPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("settings");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showProductSubmenu, setShowProductSubmenu] = useState(false);

  // No stalls available in this example
  const stalls = [];

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
    // Navigate back to the login page
    router.push("/screens/loginScreen");
  };

  const handleSearch = text => {
    setSearchTerm(text);
    // Add search logic here
  };

  const handleChangePage = page => {
    setCurrentPage(page);
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
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
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
        <Text style={styles.title}>Manage Stalls</Text>
        <Text style={styles.description}>
          Admin can manage list of stalls in NCPM in this section
        </Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for stall name"
            value={searchTerm}
            onChangeText={handleSearch}
          />
          <TouchableOpacity style={styles.searchButton}>
            <Image
              source={require("../../../assets/search.png")}
              style={styles.logoImage}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Stalls</Text>

        <View style={styles.stallsList}>
          {stalls.length > 0 ? (
            stalls.map((stall, index) => (
              <View key={index} style={styles.stallItem}>
                <Text>{stall.name}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              {/* Empty state for stalls list */}
            </View>
          )}
        </View>

        <View style={styles.pagination}>
          <TouchableOpacity
            style={[
              styles.pageButton,
              currentPage === 1 && styles.activePageButton,
            ]}
            onPress={() => handleChangePage(1)}
          >
            <Text
              style={[
                styles.pageButtonText,
                currentPage === 1 && styles.activePageButtonText,
              ]}
            >
              1
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pageButton,
              currentPage === 2 && styles.activePageButton,
            ]}
            onPress={() => handleChangePage(2)}
          >
            <Text
              style={[
                styles.pageButtonText,
                currentPage === 2 && styles.activePageButtonText,
              ]}
            >
              2
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pageButton,
              currentPage === 3 && styles.activePageButton,
            ]}
            onPress={() => handleChangePage(3)}
          >
            <Text
              style={[
                styles.pageButtonText,
                currentPage === 3 && styles.activePageButtonText,
              ]}
            >
              3
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pageButton,
              currentPage === 4 && styles.activePageButton,
            ]}
            onPress={() => handleChangePage(4)}
          >
            <Text
              style={[
                styles.pageButtonText,
                currentPage === 4 && styles.activePageButtonText,
              ]}
            >
              4
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => {
              currentPage < 4 && handleChangePage(currentPage + 1);
            }}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoImage: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    padding: 0,
    backgroundColor: "#ffffff",
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
  searchContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    height: 40,
    marginBottom: 24,
    width: "60%",
    alignSelf: "flex-end",
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    height: 40,
  },
  searchButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  stallsList: {
    flex: 1,
    marginVertical: 20,
  },
  stallItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    paddingBottom: 20,
  },
  pageButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
    marginHorizontal: 4,
    borderRadius: 4,
  },
  activePageButton: {
    backgroundColor: "#5c9a6c",
  },
  pageButtonText: {
    color: "#333",
  },
  activePageButtonText: {
    color: "#fff",
  },
  nextButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  nextButtonText: {
    color: "#333",
    fontWeight: "500",
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
  mainContent: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
});
