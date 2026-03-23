import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { supabase } from '../../../../backend/supabaseClient';

export default function StallProfiles() {
  const router = useRouter();
  const { user } = useAuth();

  const [stalls, setStalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stallOwnerId, setStallOwnerId] = useState(null);

  // Detail / edit modal
  const [selectedStall, setSelectedStall] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [saving, setSaving] = useState(false);

  // Resolve owner id
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function resolve() {
      let ownerId = user.stall_owner_id;

      if (!ownerId && user.stall_owner_account_id) {
        const { data } = await supabase
          .from('stall_owner')
          .select('stall_owner_id')
          .eq('stall_owner_account_id', user.stall_owner_account_id)
          .maybeSingle();
        if (data) ownerId = data.stall_owner_id;
      }

      if (mounted) setStallOwnerId(ownerId);
    }
    resolve();
    return () => { mounted = false; };
  }, [user]);

  // Fetch stalls
  useEffect(() => {
    if (!stallOwnerId) return;
    loadStalls();
  }, [stallOwnerId]);

  const loadStalls = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stall')
      .select('stall_id, stall_name, stall_category, stall_number, stall_section, block_number, node_id, stall_owner_id')
      .eq('stall_owner_id', stallOwnerId)
      .order('stall_name', { ascending: true });

    if (!error) setStalls(data || []);
    setLoading(false);
  };

  const openDetail = (stall) => {
    setSelectedStall(stall);
    setEditName(stall.stall_name || '');
    setEditCategory(stall.stall_category || '');
    setEditing(true);
    setShowDetailModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      alert('Stall name is required.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('stall')
      .update({
        stall_name: editName.trim(),
        stall_category: editCategory.trim(),
      })
      .eq('stall_id', selectedStall.stall_id);

    if (error) {
      alert('Failed to update: ' + error.message);
    } else {
      setSelectedStall({ ...selectedStall, stall_name: editName.trim(), stall_category: editCategory.trim() });
      setEditing(false);
      await loadStalls();
    }
    setSaving(false);
  };

  const getCategoryIcon = (cat) => {
    if (!cat) return 'shopping-bag';
    const lower = cat.toLowerCase();
    if (lower.includes('barber') || lower.includes('salon')) return 'scissors';
    if (lower.includes('food') || lower.includes('eat') || lower.includes('restaurant')) return 'coffee';
    if (lower.includes('cloth') || lower.includes('wear') || lower.includes('fashion')) return 'tag';
    if (lower.includes('veg') || lower.includes('fruit') || lower.includes('grocery')) return 'box';
    return 'shopping-bag';
  };

  return (
    <View style={styles.root}>
      <Sidebar onAccountPress={() => {}} />

      <View style={styles.main}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stall Profiles</Text>
        </View>
        <Text style={styles.subtitle}>
          Manage all stalls linked to your account.
        </Text>
        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Feather name="home" size={20} color="#6BA06B" />
            <Text style={styles.summaryValue}>{stalls.length}</Text>
            <Text style={styles.summaryLabel}>Total Stalls</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#6BA06B" style={{ marginTop: 40 }} />
        ) : stalls.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="home" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No stalls found</Text>
            <Text style={styles.emptySubtext}>
              Contact the admin to assign stalls to your account.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.stallList} showsVerticalScrollIndicator={false}>
            {stalls.map((stall) => (
              <View
                key={stall.stall_id}
                style={styles.stallCard}
              >
                <View style={styles.stallIconWrap}>
                  <Feather name={getCategoryIcon(stall.stall_category)} size={24} color="#6BA06B" />
                </View>
                <View style={styles.stallInfo}>
                  <Text style={styles.stallName}>{stall.stall_name}</Text>
                  <Text style={styles.stallCategory}>{stall.stall_category || 'Uncategorized'}</Text>
                  <View style={styles.stallMetaRow}>
                    {stall.stall_number && (
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaBadgeText}>#{stall.stall_number}</Text>
                      </View>
                    )}
                    {stall.stall_section && (
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaBadgeText}>{stall.stall_section}</Text>
                      </View>
                    )}
                    {stall.block_number && (
                      <View style={styles.metaBadge}>
                        <Text style={styles.metaBadgeText}>Block {stall.block_number}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.stallActions}>
                  <TouchableOpacity
                    style={styles.manageBtn}
                    onPress={() =>
                      router.push({
                        pathname: '/modules/storeManagement/screens/ManageBusiness',
                        params: { id: String(stall.stall_id) },
                      })
                    }
                  >
                    <Text style={styles.manageBtnText}>Manage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editIconBtn}
                    onPress={() => openDetail(stall)}
                  >
                    <Feather name="edit-2" size={16} color="#6BA06B" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Stall Detail / Edit Modal */}
      <Modal visible={showDetailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setShowDetailModal(false)} />
          <View style={styles.detailBox}>
            {selectedStall && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailIconWrap}>
                    <Feather name={getCategoryIcon(selectedStall.stall_category)} size={28} color="#6BA06B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>
                      {editing ? 'Edit Stall Profile' : selectedStall.stall_name}
                    </Text>
                    {!editing && (
                      <Text style={styles.detailCategory}>
                        {selectedStall.stall_category || 'Uncategorized'}
                      </Text>
                    )}
                  </View>
                  {!editing && (
                    <TouchableOpacity onPress={() => setEditing(true)}>
                      <Feather name="edit-2" size={18} color="#6BA06B" />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.detailDivider} />

                {editing ? (
                  <>
                    <Text style={styles.label}>Stall Name</Text>
                    <TextInput
                      style={styles.input}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Stall name"
                      placeholderTextColor="#999"
                    />
                    <Text style={styles.label}>Category</Text>
                    <TextInput
                      style={styles.input}
                      value={editCategory}
                      onChangeText={setEditCategory}
                      placeholder="e.g. Food, Barbershop, Vegetables"
                      placeholderTextColor="#999"
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setEditing(false)}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                        onPress={handleSaveEdit}
                        disabled={saving}
                      >
                        <Text style={styles.saveBtnText}>
                          {saving ? 'Saving...' : 'Save'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.detailRow}>
                      <Feather name="hash" size={16} color="#888" />
                      <Text style={styles.detailLabel}>Stall Number</Text>
                      <Text style={styles.detailValue}>{selectedStall.stall_number || '—'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="map-pin" size={16} color="#888" />
                      <Text style={styles.detailLabel}>Section</Text>
                      <Text style={styles.detailValue}>{selectedStall.stall_section || '—'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="grid" size={16} color="#888" />
                      <Text style={styles.detailLabel}>Block</Text>
                      <Text style={styles.detailValue}>{selectedStall.block_number || '—'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Feather name="navigation" size={16} color="#888" />
                      <Text style={styles.detailLabel}>Node ID</Text>
                      <Text style={styles.detailValue}>{selectedStall.node_id || '—'}</Text>
                    </View>

                  </>
                )}

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#f9f9f9' },
  main: { flex: 1, backgroundColor: '#fff', padding: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  backButton: { marginRight: 14, padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#222' },
  subtitle: { color: '#666', fontSize: 14, marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 12 },

  summaryRow: { flexDirection: 'row', marginBottom: 24 },
  summaryCard: {
    backgroundColor: '#F0F7EF', borderRadius: 12, padding: 16,
    alignItems: 'center', minWidth: 120,
  },
  summaryValue: { fontSize: 28, fontWeight: '700', color: '#333', marginTop: 4 },
  summaryLabel: { fontSize: 12, color: '#888', marginTop: 2 },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#bbb', marginTop: 6, textAlign: 'center' },

  stallList: { flex: 1 },
  stallCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FAFAFA', borderRadius: 12, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#ECECEC',
  },
  stallIconWrap: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#F0F7EF', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  stallInfo: { flex: 1 },
  stallName: { fontSize: 16, fontWeight: '600', color: '#222' },
  stallCategory: { fontSize: 13, color: '#888', marginTop: 2 },
  stallMetaRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  metaBadge: {
    backgroundColor: '#E8F5E9', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  metaBadgeText: { fontSize: 11, color: '#6BA06B', fontWeight: '600' },

  stallActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editIconBtn: {
    width: 34, height: 34, borderRadius: 8,
    borderWidth: 1.5, borderColor: '#6BA06B',
    alignItems: 'center', justifyContent: 'center',
  },
  manageBtn: {
    backgroundColor: '#6BA06B', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  manageBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  /* Modal */
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  detailBox: {
    backgroundColor: '#fff', borderRadius: 16, width: 460, padding: 28,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#F0F7EF', alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  detailName: { fontSize: 20, fontWeight: '600', color: '#222' },
  detailCategory: { fontSize: 14, color: '#888', marginTop: 2 },
  detailDivider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 16 },

  detailRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10,
  },
  detailLabel: { fontSize: 14, color: '#888', width: 100 },
  detailValue: { fontSize: 14, fontWeight: '500', color: '#333', flex: 1 },

  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
    backgroundColor: '#F9F9F9', color: '#222',
  },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#f0f0f0', alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#6BA06B', alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  manageFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#6BA06B', borderRadius: 8,
    paddingVertical: 12, gap: 8, marginTop: 8,
  },
  manageFullBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  closeBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#f0f0f0', alignItems: 'center',
  },
  closeBtnText: { color: '#444', fontWeight: '600', fontSize: 15 },
});
