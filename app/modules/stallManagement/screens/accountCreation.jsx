import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../../backend/supabaseClient";
import AccountCreationModal from "../components/accountCreationModal";
import bcrypt from "bcryptjs";

export default function AccountCreation() {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("users");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showProductSubmenu, setShowProductSubmenu] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const { logout } = useAuth();

  function generateUsername(first, last, existingUsernames) {
    let base = `${first}_${last}`.toLowerCase().replace(/\s+/g, "");
    let username = base;
    let count = 1;
    while (existingUsernames.includes(username)) {
      username = `${base}${count}`;
      count++;
    }
    return username;
  }

  function generatePassword(length = 8) {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pass = "";
    for (let i = 0; i < length; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  }

  const handleCreateAccount = async () => {
    if (!firstName || !lastName) {
      alert("First and Last names are required");
      return;
    }

    // Fetch existing usernames
    const { data: existing, error } = await supabase
      .from("stall_owner_account")
      .select("username");
    if (error) {
      alert("Error fetching usernames");
      return;
    }
    const existingUsernames = existing.map(u => u.username);

    // Generate username and password
    let username = generateUsername(firstName, lastName, existingUsernames);
    const password = generatePassword();

    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);

    let insertError;
    let attempt = 0;
    let newAccountId = null;

    do {
      const { data: accountData, error: accError } = await supabase
        .from("stall_owner_account")
        .insert([
          {
            username,
            password: hashedPassword,
          },
        ])
        .select("stall_owner_account_id") // get the generated ID back
        .single();

      insertError = accError;
      if (!accError) {
        newAccountId = accountData.stall_owner_account_id; // capture the ID
      }

      if (insertError && insertError.message.includes("duplicate key value")) {
        attempt++;
        username = generateUsername(firstName, lastName, [
          ...existingUsernames,
          username,
        ]);
      }
    } while (
      insertError &&
      insertError.message.includes("duplicate key value") &&
      attempt < 50
    );

    if (insertError) {
      alert(`Error creating account: ${insertError.message}`);
      return;
    }

    // Insert into stall_owner, linking the FK
    const { error: checkError } = await supabase.from("stall_owner").insert([
      {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        stall_owner_account_id: newAccountId,
      },
    ]);
    if (checkError) {
      alert(`Error creating stall owner: ${checkError.message}`);
      return;
    }

    setCredentials({ username, password });
    setModalVisible(true);
  };

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
        <Text style={styles.title}>Account Creation</Text>
        <Text style={styles.description}>
          Automatically create accounts for stall owners.
        </Text>

        <Text style={styles.sectionTitle}>Personal Information</Text>

        <View style={styles.inputContainer}>
          <View style={styles.iconContainer}>
            <Image
              source={require("../../../assets/user-icon.png")}
              style={styles.logoImage}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.iconContainer}>
            <Image
              source={require("../../../assets/user-icon.png")}
              style={styles.logoImage}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Middle Name"
            value={middleName}
            onChangeText={setMiddleName}
          />
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.iconContainer}>
            <Image
              source={require("../../../assets/user-icon.png")}
              style={styles.logoImage}
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateAccount}
        >
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>

        <AccountCreationModal
          visible={modalVisible}
          credentials={credentials}
          onContinue={() => {
            setModalVisible(false);
            setFirstName("");
            setMiddleName("");
            setLastName("");
          }}
        />
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
    backgroundColor: "#fff",
    height: "100vh",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#000",
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 36,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#000",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    height: 50,
    width: 500,
  },
  iconContainer: {
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  inputIcon: {
    fontSize: 18,
    color: "#666",
  },
  input: {
    flex: 1,
    width: "100%",
    height: 50,
    paddingVertical: 8,
  },
  createButton: {
    backgroundColor: "#5c9a6c",
    borderRadius: 5,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
    width: 500,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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
