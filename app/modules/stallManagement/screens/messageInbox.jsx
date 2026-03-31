import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../../backend/supabaseClient";
import { transform } from "@babel/core";

export default function MessageInbox() {
  const router = useRouter();
  const { logout } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, pending, read, resolved
  const [searchText, setSearchText] = useState("");

  // Detail / Reply
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  // Sidebar state (matching admin sidebar pattern)
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("messages");
  const [showProductSubmenu, setShowProductSubmenu] = useState(false);

  const expandSidebar = () => setSidebarExpanded(true);
  const collapseSidebar = () => {
    setSidebarExpanded(false);
    setShowProductSubmenu(false);
  };
  const toggleProductSubmenu = () => setShowProductSubmenu(!showProductSubmenu);
  const handleLogout = () => {
    logout();
    router.replace("/screens/loginScreen");
  };

  // Fetch all messages with stall owner and stall info
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("message_request")
        .select("*, stall_owner(first_name, last_name), stall(stall_name)")
        .order("created_at", { ascending: false });

      if (!error && mounted) setMessages(data || []);
      if (mounted) setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshMessages = async () => {
    const { data } = await supabase
      .from("message_request")
      .select("*, stall_owner(first_name, last_name), stall(stall_name)")
      .order("created_at", { ascending: false });
    setMessages(data || []);
  };

  const openDetail = async msg => {
    setSelectedMessage(msg);
    setReplyText("");
    setShowDetailModal(true);

    // Mark as read if pending
    if (msg.status === "pending") {
      await supabase
        .from("message_request")
        .update({ status: "read" })
        .eq("message_id", msg.message_id);
      refreshMessages();
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      alert("Please enter a reply.");
      return;
    }

    setReplying(true);
    const { error } = await supabase
      .from("message_request")
      .update({
        admin_reply: replyText.trim(),
        status: "resolved",
        replied_at: new Date().toISOString(),
      })
      .eq("message_id", selectedMessage.message_id);

    if (error) {
      alert("Failed to send reply: " + error.message);
      setReplying(false);
      return;
    }

    await refreshMessages();
    setReplying(false);
    setShowDetailModal(false);
  };

  const getStatusColor = status => {
    switch (status) {
      case "pending":
        return "#FFA726";
      case "read":
        return "#42A5F5";
      case "resolved":
        return "#66BB6A";
      default:
        return "#999";
    }
  };

  const getStatusBg = status => {
    switch (status) {
      case "pending":
        return "#FFF3E0";
      case "read":
        return "#E3F2FD";
      case "resolved":
        return "#E8F5E9";
      default:
        return "#F5F5F5";
    }
  };

  const formatDate = dateStr => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getOwnerName = msg => {
    if (msg.stall_owner) {
      const fn = msg.stall_owner.first_name || "";
      const ln = msg.stall_owner.last_name || "";
      return (fn + " " + ln).trim() || "Stall Owner";
    }
    return "Stall Owner";
  };

  const filteredMessages = messages.filter(m => {
    const matchFilter = filter === "all" || m.status === filter;
    const txt = searchText.trim().toLowerCase();
    const matchSearch =
      !txt ||
      m.subject?.toLowerCase().includes(txt) ||
      m.message?.toLowerCase().includes(txt) ||
      getOwnerName(m).toLowerCase().includes(txt);
    return matchFilter && matchSearch;
  });

  const pendingCount = messages.filter(m => m.status === "pending").length;

  // Admin sidebar (same pattern as adminInterface.jsx)
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
            onPress={() =>
              router.push("/modules/stallManagement/screens/qualityGuide")
            }
          >
            <Text style={styles.submenuText}>Quality Guide</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submenuItem}
            onPress={() =>
              router.push("/modules/stallManagement/screens/listing")
            }
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
        <Feather name="mail" size={24} color="#fff" />
        {sidebarExpanded && (
          <View style={styles.messageMenuRow}>
            <Text style={styles.menuText}>Messages</Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
        )}
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

      <View style={styles.content}>
        <Text style={styles.title}>Message Inbox</Text>
        <Text style={styles.subtitleText}>
          View and respond to stall owner requests.
        </Text>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {["all", "pending", "read", "resolved"].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  filter === f && styles.filterTabTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "pending" && pendingCount > 0
                  ? ` (${pendingCount})`
                  : ""}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
            <Feather name="search" size={18} color="#999" />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#1976D2"
            style={{ marginTop: 40 }}
          />
        ) : filteredMessages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No messages found</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.messageList}
            showsVerticalScrollIndicator={false}
          >
            {filteredMessages.map(msg => (
              <TouchableOpacity
                key={msg.message_id}
                style={[
                  styles.messageCard,
                  msg.status === "pending" && styles.messageCardPending,
                ]}
                onPress={() => openDetail(msg)}
              >
                <View style={styles.messageCardTopRow}>
                  <View style={styles.messageCardLeft}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>
                        {getOwnerName(msg).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ownerName}>{getOwnerName(msg)}</Text>
                      <Text style={styles.stallName}>
                        {msg.stall?.stall_name || "Unknown Stall"}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusBg(msg.status) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(msg.status) },
                        ]}
                      >
                        {msg.status.charAt(0).toUpperCase() +
                          msg.status.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>
                      {formatDate(msg.created_at)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.subjectText} numberOfLines={1}>
                  {msg.product_name}
                </Text>
                <Text style={styles.previewText} numberOfLines={2}>
                  {msg.message}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Detail / Reply Modal */}
      <Modal visible={showDetailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setShowDetailModal(false)}
          />
          <View style={styles.detailBox}>
            {selectedMessage && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.detailHeader}>
                  <View>
                    <Text style={styles.detailOwner}>
                      {getOwnerName(selectedMessage)}
                    </Text>
                    <Text style={styles.detailStall}>
                      {selectedMessage.stall?.stall_name || "Unknown Stall"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBg(selectedMessage.status) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(selectedMessage.status) },
                      ]}
                    >
                      {selectedMessage.status.charAt(0).toUpperCase() +
                        selectedMessage.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.detailSubject}>
                  {selectedMessage.product_name}
                </Text>
                <Text style={styles.detailDate}>
                  {formatDate(selectedMessage.created_at)}
                </Text>
                <View style={styles.detailDivider} />
                <Text style={styles.detailBody}>{selectedMessage.message}</Text>

                {selectedMessage.product_image && (
                  <Image
                    source={{ uri: selectedMessage.product_image }}
                    style={styles.detailImage}
                    resizeMode="cover"
                  />
                )}

                {selectedMessage.admin_reply ? (
                  <View style={styles.replySection}>
                    <Text style={styles.replySectionTitle}>Your Reply</Text>
                    <Text style={styles.replyBody}>
                      {selectedMessage.admin_reply}
                    </Text>
                    {selectedMessage.replied_at && (
                      <Text style={styles.replyDate}>
                        {formatDate(selectedMessage.replied_at)}
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={styles.replyForm}>
                    <Text style={styles.replyFormTitle}>
                      Reply to this request
                    </Text>
                    <TextInput
                      style={styles.replyInput}
                      value={replyText}
                      onChangeText={setReplyText}
                      placeholder="Type your reply..."
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                    <View style={styles.replyActions}>
                      <TouchableOpacity
                        style={styles.cancelReplyBtn}
                        onPress={() => setShowDetailModal(false)}
                      >
                        <Text style={styles.cancelReplyText}>Close</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.sendReplyBtn,
                          replying && { opacity: 0.6 },
                        ]}
                        onPress={handleReply}
                        disabled={replying}
                      >
                        <Feather name="send" size={16} color="#fff" />
                        <Text style={styles.sendReplyText}>
                          {replying ? "Sending..." : "Send Reply"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row", backgroundColor: "#f9f9f9" },

  /* Sidebar (matching admin pattern) */
  sidebar: {
    width: 60,
    backgroundColor: "#1976D2",
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "flex-start",
    height: "100%",
    transition: "width 0.3s",
  },
  sidebarExpanded: { width: 220, alignItems: "flex-start" },
  logoContainer: { marginBottom: 40, width: "100%" },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: { width: 24, height: 24, resizeMode: "contain" },
  menuItem: {
    width: "100%",
    height: 44,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  menuText: { color: "white", marginLeft: 15, fontSize: 16 },
  productServicesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
  },
  arrowIcon: { width: 12, height: 12, marginLeft: 10, tintColor: "white" },
  submenu: {
    width: "100%",
    backgroundColor: "#1e88e5",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 15,
  },
  submenuItem: { paddingVertical: 10, paddingHorizontal: 15 },
  submenuText: { color: "white", fontSize: 14 },
  activeMenuItem: { backgroundColor: "rgba(255, 255, 255, 0.2)" },
  sidebarBottom: {
    position: "absolute",
    bottom: 130,
    width: "100%",
    alignItems: "center",
  },
  messageMenuRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  badge: {
    backgroundColor: "#FF5252",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    paddingHorizontal: 5,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  /* Content */
  content: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: "#333" },
  subtitleText: { fontSize: 14, color: "#666", marginTop: 4, marginBottom: 20 },

  /* Filters */
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  filterTabActive: { backgroundColor: "#1976D2" },
  filterTabText: { fontSize: 14, color: "#666", fontWeight: "500" },
  filterTabTextActive: { color: "#fff" },
  searchBox: {
    flex: 1,
    maxWidth: 300,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    marginLeft: "auto",
  },
  searchInput: { flex: 1, height: "100%", fontSize: 14 },

  /* Messages */
  emptyContainer: { alignItems: "center", marginTop: 80 },
  emptyText: { fontSize: 18, color: "#999", marginTop: 16, fontWeight: "600" },
  messageList: { flex: 1 },
  messageCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  messageCardPending: { borderLeftWidth: 3, borderLeftColor: "#FFA726" },
  messageCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  messageCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1976D2",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  ownerName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    textTransform: "capitalize",
  },
  stallName: { fontSize: 13, color: "#888" },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: "600" },
  dateText: { fontSize: 12, color: "#aaa", marginTop: 4 },
  subjectText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  previewText: { fontSize: 14, color: "#666" },

  /* Detail Modal */
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  detailBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: 540,
    maxHeight: "85%",
    padding: 32,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  detailOwner: { fontSize: 16, fontWeight: "600", color: "#222" },
  detailStall: { fontSize: 13, color: "#888", marginTop: 2 },
  detailSubject: {
    fontSize: 20,
    fontWeight: "600",
    color: "#222",
    marginTop: 8,
  },
  detailDate: { fontSize: 13, color: "#aaa", marginTop: 4, marginBottom: 12 },
  detailDivider: { height: 1, backgroundColor: "#e0e0e0", marginBottom: 16 },
  detailBody: { fontSize: 15, color: "#333", lineHeight: 22 },

  replySection: {
    marginTop: 20,
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#66BB6A",
  },
  replySectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#66BB6A",
    marginBottom: 8,
  },
  replyBody: { fontSize: 14, color: "#333", lineHeight: 20 },
  replyDate: { fontSize: 12, color: "#aaa", marginTop: 8 },

  replyForm: { marginTop: 24 },
  replyFormTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#F9F9F9",
    minHeight: 100,
    textAlignVertical: "top",
  },
  replyActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelReplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  cancelReplyText: { color: "#666", fontWeight: "600", fontSize: 15 },
  sendReplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#1976D2",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  sendReplyText: { color: "#fff", fontWeight: "600", fontSize: 15 },

  detailImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginTop: 16,
  },
});
