import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../../../backend/supabaseClient";
import AddListingModal from "../components/addListingModal";
import EditListingModal from "../components/editListingModal";
import { useAuth } from "../../../context/AuthContext";

// Create a new product/service in Supabase
async function createProduct(product) {
  const { data, error } = await supabase
    .from("product_and_services")
    .insert([product]);
  return { data, error };
}

export default function ListingPage() {
  const router = useRouter();
  const ITEMS_PER_PAGE = 5;
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("listing");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [showProductSubmenu, setShowProductSubmenu] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pns, setPns] = useState([]);
  const [isAdding, setIsAdding] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const { logout } = useAuth();

  const filteredProducts = pns.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [form, setForm] = useState({
    image: "",
    name: "",
    bicol_name: "",
    tagalog_name: "",
    category: "",
    type: "",
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("product_and_services")
      .select("*");
    if (!error && data) {
      setPns(data);
    }
  };

  const expandSidebar = () => {
    setSidebarExpanded(true);
  };
  const collapseSidebar = () => {
    setSidebarExpanded(false);
    setShowProductSubmenu(false);
  };
  const toggleProductSubmenu = () => {
    setShowProductSubmenu(!showProductSubmenu);
  };
  // Function to handle logout
  const handleLogout = () => {
    logout();
    router.replace("/screens/loginScreen");
  };
  const handleAddProduct = () => {
    setShowAddModal(true);
  };
  const handleSearch = text => {
    setSearchTerm(text);
  };
  const handleChangePage = page => {
    setCurrentPage(page);
  };
  const handleCloseModal = () => {
    setShowAddModal(false);
    setForm({
      image: "",
      name: "",
      bicol_name: "",
      tagalog_name: "",
      category: "",
    });
  };
  // Delete a product and its associated listings
  const handleDeleteProduct = async id => {
    // First, get the product to find its image URL
    const { data: productData, error: fetchError } = await supabase
      .from("product_and_services")
      .select("pns_image")
      .eq("pns_id", id)
      .single();

    if (fetchError) {
      console.error("Failed to fetch product for image deletion:", fetchError);
      return;
    }

    // Delete all listings that reference this product
    const { error: listingError } = await supabase
      .from("listing")
      .delete()
      .eq("pns_id", id);

    if (listingError) {
      console.error("Failed to delete related listings:", listingError);
      return;
    }

    // Delete the image from Supabase Storage if it exists
    if (productData && productData.pns_image) {
      try {
        // Extract the file name from the public URL
        const urlParts = productData.pns_image.split("/");
        const fileName = urlParts[urlParts.length - 1];
        await supabase.storage.from("pns-images").remove([fileName]);
      } catch (e) {
        console.error("Failed to delete image from storage:", e);
      }
    }

    // Then, delete the product itself
    const { error: productError } = await supabase
      .from("product_and_services")
      .delete()
      .eq("pns_id", id);

    if (productError) {
      console.error("Delete failed:", productError);
    } else {
      fetchProducts(); // Refresh the list
    }
  };
  // Update product details
  const handleUpdateProduct = async updatedProduct => {
    // Optimistically update local state
    setPns(prev =>
      prev.map(item =>
        item.pns_id === updatedProduct.pns_id
          ? { ...item, ...updatedProduct }
          : item
      )
    );
    setShowEditModal(false);

    const { error } = await supabase
      .from("product_and_services")
      .update(updatedProduct)
      .eq("pns_id", updatedProduct.pns_id);

    if (error) {
      // Revert local state and show error
      fetchProducts(); // fallback to server state
      alert("Update failed: " + error.message);
    } else {
      fetchProducts(); // Optionally refresh from server
    }
  };

  // Add new product
  const handleAddProductSubmit = async () => {
    const exists = pns.some(
      item => item.name.trim().toLowerCase() === form.name.trim().toLowerCase()
    );
    if (exists) {
      alert("A product or service with this name already exists.");
      return;
    }

    if (isAdding) return;
    setIsAdding(true);

    // Validate required fields
    if (!form.name || !form.category || !form.image) {
      alert("Name, Category, and Image are required fields.");
      return;
    }
    const newProduct = {
      pns_image: form.image,
      name: form.name,
      bicol_name: form.bicol_name,
      tagalog_name: form.tagalog_name,
      pns_category: form.category,
      type: form.type,
    };
    // Insert product only after image is uploaded and form.image is set
    const { error } = await createProduct(newProduct);
    if (error) {
      alert("Failed to add product: " + error.message);
      return;
    }
    // Only fetch products after insert is confirmed
    await fetchProducts();
    handleCloseModal();
    setIsAdding(false);
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

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <View style={styles.container}>
      {renderSidebar()}
      <View style={styles.mainContent}>
        <Text style={styles.title}>Listing Creation</Text>
        <Text style={styles.description}>
          Add a predefined products that stall owners can choose from to include
          in their listings
        </Text>

        <View style={styles.contentSection}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Products</Text>
            <View style={styles.searchSection}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search a product or service"
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
          </View>
          <TouchableOpacity
            style={styles.addButton}
            disabled={isAdding}
            onPress={handleAddProduct}
          >
            <Text style={styles.addButtonIcon}>+</Text>
            <Text style={styles.addButtonText}>Add new product or service</Text>
          </TouchableOpacity>
          {showAddModal && (
            <AddListingModal
              onClose={handleCloseModal}
              onSubmit={handleAddProductSubmit}
              form={form}
              setForm={setForm}
            />
          )}

          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableHeaderCell}>Image</Text>
              <Text style={styles.tableHeaderCell}>Product Name</Text>
              <Text style={styles.tableHeaderCell}>Category</Text>
              <Text style={styles.tableHeaderCell}>Type</Text>
              <Text style={styles.tableHeaderCell}>Actions</Text>
            </View>
            {filteredProducts.length === 0 ? (
              <View style={{ alignItems: "center", marginTop: 100 }}>
                <Text style={{ color: "#999", fontSize: 16 }}>
                  Nothing to show.
                </Text>
              </View>
            ) : (
              paginatedProducts.map((item, idx) => (
                <View style={styles.tableRow} key={item.id || idx}>
                  <View style={styles.tableCell}>
                    <Image
                      source={
                        item.pns_image && item.pns_image.trim() !== ""
                          ? { uri: item.pns_image }
                          : require("../../../assets/image.png")
                      }
                      style={styles.productImage}
                    />
                  </View>
                  <View style={styles.tableCell}>
                    <Text style={styles.productName}>{item.name}</Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text style={styles.productCategory}>
                      {item.pns_category}
                    </Text>
                  </View>
                  <View style={styles.tableCell}>
                    <Text style={styles.productCategory}>{item.type}</Text>
                  </View>
                  <View style={[styles.tableCell, styles.actionsCell]}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => {
                        setSelectedProduct(item);
                        setShowEditModal(true);
                      }}
                    >
                      <Image
                        source={require("../../../assets/edit-icon.svg")}
                        style={styles.actionIcon}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteProduct(item.pns_id)}
                    >
                      <Image
                        source={require("../../../assets/delete-icon.svg")}
                        style={styles.actionIcon}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            {/* Edit modal pop-up */}
            {showEditModal && (
              <EditListingModal
                onClose={() => setShowEditModal(false)}
                onSubmit={handleUpdateProduct}
                form={selectedProduct}
                setForm={setSelectedProduct}
              />
            )}
          </View>

          {/* Fixed Pagination Controls */}
          <View style={styles.pagination}>
            {filteredProducts.length > 0 && (
              <View style={styles.wrapper}>
                {/* Previous Button */}
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => handleChangePage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <Text style={styles.nextButtonText}>Previous</Text>
                </TouchableOpacity>
                {/* Page Buttons */}
                {Array.from(
                  {
                    length: Math.ceil(filteredProducts.length / ITEMS_PER_PAGE),
                  },
                  (_, pageIdx) => (
                    <TouchableOpacity
                      key={pageIdx + 1}
                      style={[
                        styles.pageButton,
                        currentPage === pageIdx + 1 && styles.activePageButton,
                      ]}
                      onPress={() => handleChangePage(pageIdx + 1)}
                    >
                      <Text
                        style={[
                          styles.pageButtonText,
                          currentPage === pageIdx + 1 &&
                            styles.activePageButtonText,
                        ]}
                      >
                        {pageIdx + 1}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
                {/* Next Button */}
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => handleChangePage(currentPage + 1)}
                  disabled={
                    currentPage >=
                    Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
                  }
                >
                  <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tableContainer: {
    marginTop: 20,
    width: "100%",
  },
  tableHeaderRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  tableHeaderCell: {
    flex: 1,
    fontWeight: "500",
    fontSize: 16,
    color: "#333",
  },
  tableRow: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 12,
  },
  tableCell: {
    flex: 1,
    textTransform: "capitalize",
  },
  productImage: {
    width: 60,
    height: 40,
    borderRadius: 6,
    resizeMode: "cover",
  },
  productName: {
    fontSize: 15,
    color: "#222",
    fontWeight: "500",
  },
  productCategory: {
    fontSize: 14,
    color: "#444",
  },
  actionsCell: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    backgroundColor: "#5c9a6c",
    padding: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  deleteButton: {
    backgroundColor: "#e57373",
    padding: 8,
    borderRadius: 4,
  },
  actionIcon: {
    width: 18,
    height: 18,
    tintColor: "#fff",
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
  pagination: {
    zIndex: -1,
    position: "absolute",
    bottom: 0,
    right: 0,
    left: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginTop: 24, // optional, for spacing
  },
  wrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
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
    minWidth: 70,
    alignItems: "center",
  },
  nextButtonText: {
    color: "#333",
    fontWeight: "500",
    textDecorationLine: "underline",
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
  sidebarBottom: {
    position: "absolute",
    bottom: 130,
    width: "100%",
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
  mainContent: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
  },
  input: {
    marginBottom: 16,
  },
});
