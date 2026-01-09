import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
// import { useSelection } from '../../../context/SelectionContext';
import { useAuth } from '../../../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { supabase } from '../../../../backend/supabaseClient';

const ICON_SIZE = 28;

export default function ViewListings() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const currentId = params.id || 'vegetable1';
  const [listings, setListings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const stallId = Number(currentId);
        if (!Number.isFinite(stallId)) {
          setListings([]);
          setLoading(false);
          return;
        }
        const { data, error } = await supabase
          .from('listing')
          .select('listing_id, price, is_available, pns_id, product_and_services(name, pns_category, pns_image)')
          .eq('stall_id', stallId);
        if (error) throw error;
        const mapped = (data || []).map(row => ({
          listing_id: row.listing_id,
          name: row.product_and_services?.name || 'Item',
          category: row.product_and_services?.pns_category || '',
          image: row.product_and_services?.pns_image && /^https?:\/\//i.test(row.product_and_services?.pns_image)
            ? { uri: row.product_and_services.pns_image }
            : require('../../../assets/image.png'),
          price: String(row.price ?? ''),
          availability: row.is_available ? 'Available' : 'Not Available',
        }));
        if (mounted) setListings(mapped);
      } catch (e) {
        console.warn('[ViewListings] load error:', e);
        if (mounted) setError('Failed to load listings.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [currentId]);
  const { logout } = useAuth();

  // Modal state
  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const [selectedCategories, setSelectedCategories] = React.useState([]);
  const [editModalVisible, setEditModalVisible] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState(null);
  const [editingName, setEditingName] = React.useState('');
  const [editingPrice, setEditingPrice] = React.useState('');
  const [editingAvailability, setEditingAvailability] = React.useState('Available');

  // Allow numeric with a single decimal point
  const cleanDecimal = (val) => {
    if (!val) return '';
    let s = String(val).replace(/[^0-9.]/g, '');
    // If starts with dot, prefix 0
    if (s.startsWith('.')) s = '0' + s;
    const parts = s.split('.');
    // Keep only first dot
    const integer = parts[0];
    const fraction = parts.length > 1 ? parts.slice(1).join('').replace(/\./g, '') : '';
    return fraction.length > 0 ? `${integer}.${fraction}` : integer;
  };

  const handleBack = () => router.back();
  const handleAddListings = () =>
    router.push({
      pathname: '/modules/storeManagement/screens/AddListings',
      params: { id: currentId },
    });

  const handleEdit = (index) => {
    const listing = listings[index];
    setEditingIndex(index);
    setEditingName(listing.name);
    setEditingPrice(listing.price || '');
    setEditingAvailability(listing.availability || 'Available');
    setEditModalVisible(true);
  };

  const saveEdit = () => {
    if (editingIndex !== null) {
      const cleanPrice = cleanDecimal(editingPrice || '');
      const l = listings[editingIndex];
      (async () => {
        try {
          const { error } = await supabase
            .from('listing')
            .update({
              price: Number(cleanPrice || 0),
              is_available: editingAvailability === 'Available',
            })
            .eq('listing_id', l.listing_id);
          if (error) throw error;
          setListings(prev => prev.map((it, i) => i === editingIndex ? { ...it, price: cleanPrice, availability: editingAvailability } : it));
          cancelEdit();
        } catch (e) {
          console.warn('[ViewListings] save edit error:', e);
        }
      })();
    }
  };

  const cancelEdit = () => {
    setEditModalVisible(false);
    setEditingIndex(null);
    setEditingName('');
    setEditingPrice('');
    setEditingAvailability('Available');
  };

  const handleLogout = () => {
    logout();
    router.replace('/screens/loginScreen');
  };

  const CATEGORY_SET = React.useMemo(() => {
    const map = new Map();
    (listings || []).forEach(l => {
      const cat = (l.category || '').trim();
      if (!cat) return;
      const key = cat.toLowerCase();
      if (!map.has(key)) {
        const display = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
        map.set(key, display);
      }
    });
    const arr = Array.from(map.values());
    return arr.length > 0 ? arr : ['Vegetable','Meat','Fruit','Fish','Poultry','Grocery','Pasalubong'];
  }, [listings]);
  const toggleCategory = (c) => {
    setSelectedCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };
  const clearFilters = () => { setSearchText(''); setSelectedCategories([]); };

  const filteredListings = listings.filter(l => {
    const selectedNorm = selectedCategories.map(s => String(s).toLowerCase());
    const matchCat =
      selectedCategories.length === 0 ||
      selectedNorm.includes(String(l.category || '').toLowerCase());
    const txt = searchText.trim().toLowerCase();
    const matchTxt = txt === '' || l.name?.toLowerCase().includes(txt) || l.category?.toLowerCase().includes(txt);
    return matchCat && matchTxt;
  });

  return (
    <View style={styles.root}>
      {/* Animated Sidebar (reused) */}
      <Sidebar onAccountPress={() => { /* no-op on this page */ }} />

      {/* Main Content */}
      <View style={styles.main}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Feather name="arrow-left" size={22} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>

        <View style={styles.searchFilterRow}>
          <View style={styles.searchInputContainer}>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search listing"
              placeholderTextColor="#666"
              style={styles.realSearchInput}
            />
            <Image source={require('../../../assets/search.png')} style={styles.searchIcon} />
          </View>
          <TouchableOpacity style={styles.filterRow} onPress={() => setShowCategoryModal(true)}>
            <Image source={require('../../../assets/filter-menu.png')} style={styles.filterIcon} />
            <Text style={styles.filterText}>Filter by category</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listingsRow}>
            {loading ? (
              <Text style={{ color: '#666' }}>Loading...</Text>
            ) : error ? (
              <Text style={{ color: '#c0392b' }}>{error}</Text>
            ) : filteredListings.length === 0 ? (
              <View style={styles.centerContent}>
                <Text style={styles.noListingsText}>No listings match your filters.</Text>
                <TouchableOpacity
                  style={styles.addListingsButton}
                  onPress={handleAddListings}
                >
                  <Text style={styles.addListingsButtonText}>Add Listings</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredListings.map((listing, idx) => (
                <View key={idx} style={styles.card}>
                  <Image source={listing.image} style={styles.cardImage} />
                  <Text style={styles.cardName}>{listing.name}</Text>
                  <Text style={styles.cardCategory}>{listing.category}</Text>
                  {listing.price && (
                    <Text style={styles.cardPrice}>₱{listing.price}</Text>
                  )}
                  {listing.availability && (
                    <Text
                      style={[
                        styles.cardAvailability,
                        listing.availability === 'Available'
                          ? styles.available
                          : styles.unavailable,
                      ]}
                    >
                      {listing.availability}
                    </Text>
                  )}
                  <View style={styles.cardButtonRow}>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => {
                        const l = listings[idx];
                        (async () => {
                          try {
                            const { error } = await supabase
                              .from('listing')
                              .delete()
                              .eq('listing_id', l.listing_id);
                            if (error) throw error;
                            setListings(prev => prev.filter((_, i) => i !== idx));
                          } catch (e) {
                            console.warn('[ViewListings] delete error:', e);
                          }
                        })();
                      }}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEdit(idx)}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
        </View>
      </View>

      {/* Category Filter Modal */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCategoryModal(false)}
        >
          <View style={styles.categoryModalBox}>
            <Text style={styles.categoryModalTitle}>Filter by category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORY_SET.map(c => {
                const active = selectedCategories.includes(c);
                return (
                  <TouchableOpacity key={c} style={[styles.categoryButton, active && styles.categoryButtonActive]} onPress={() => toggleCategory(c)}>
                    <Text style={[styles.categoryButtonText, active && styles.categoryButtonTextActive]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.filterActionsRow}>
              <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}><Text style={styles.clearBtnText}>Clear</Text></TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setShowCategoryModal(false)}><Text style={styles.applyBtnText}>Apply</Text></TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelEdit}
      >
        <View style={styles.editModalOverlay}>
          <View style={styles.editModalBox}>
            <Text style={styles.editModalTitle}>Edit Product</Text>

            <Text style={styles.editLabel}>Product Name</Text>
            <TextInput
              style={styles.editInput}
              value={editingName}
              onChangeText={setEditingName}
              placeholder="Enter product name"
            />

            <Text style={styles.editLabel}>Price (₱)</Text>
            <TextInput
              style={styles.editInput}
              value={editingPrice}
              onChangeText={(txt) => setEditingPrice(cleanDecimal(txt))}
              placeholder="Enter price"
              keyboardType="numeric"
            />

            <Text style={styles.editLabel}>Availability</Text>
            <View style={styles.availabilityContainer}>
              <TouchableOpacity
                style={[
                  styles.availabilityOption,
                  editingAvailability === 'Available' &&
                    styles.selectedAvailability,
                ]}
                onPress={() => setEditingAvailability('Available')}
              >
                <Text
                  style={[
                    styles.availabilityText,
                    editingAvailability === 'Available' &&
                      styles.selectedAvailabilityText,
                  ]}
                >
                  Available
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.availabilityOption,
                  editingAvailability === 'Not Available' &&
                    styles.selectedAvailability,
                ]}
                onPress={() => setEditingAvailability('Not Available')}
              >
                <Text
                  style={[
                    styles.availabilityText,
                    editingAvailability === 'Not Available' &&
                      styles.selectedAvailabilityText,
                  ]}
                >
                  Not Available
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.editModalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveChangesButton} onPress={saveEdit}>
                <Text style={styles.saveChangesButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#222',
  },

  /* Sidebar styles removed in favor of shared component */

  /* Main */
  main: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    marginLeft: 2,
  },
  backButton: { marginRight: 14, padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#222' },

  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInputContainer: {
    backgroundColor: '#E3F0DF',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flex: 1,
    marginRight: 8,
    position: 'relative',
  },
  searchInput: { fontSize: 15, color: '#222' },
  realSearchInput: { flex: 1, fontSize: 15, color: '#222' },
  searchIcon: { position: 'absolute', right: 16, top: 10, width: 18, height: 18 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterIcon: { width: 22, height: 22, marginRight: 6, tintColor: '#222' },
  filterText: { fontSize: 14, color: '#333' },

  listingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginTop: 32,
  },
  card: {
    width: 200,
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    marginRight: 32,
    marginBottom: 24,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cardImage: {
    width: 160,
    height: 100,
    borderRadius: 6,
    marginBottom: 8,
  },
  cardName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
    color: '#222',
    alignSelf: 'flex-start',
  },
  cardCategory: {
    color: '#888',
    fontSize: 13,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  cardPrice: {
    fontWeight: '600',
    fontSize: 15,
    color: '#6BA06B',
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  cardAvailability: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  available: { backgroundColor: '#D4EDDA', color: '#155724' },
  unavailable: { backgroundColor: '#F8D7DA', color: '#721C24' },

  cardButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
    gap: 8,
  },
  removeButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    minWidth: 70,
  },
  removeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#6BA06B',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    minWidth: 70,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },

  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    marginTop: 32,
  },
  noListingsText: { color: '#888', fontSize: 16, marginBottom: 16 },
  addListingsButton: {
    backgroundColor: '#6BA06B',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  addListingsButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  /* Category Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryModalBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    width: 400,
    padding: 32,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  categoryModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
    marginBottom: 24,
    textAlign: 'center',
  },
  categoryGrid: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    minHeight: 45,
    justifyContent: 'center',
    width: '48%',
  },
  categoryButtonText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '400',
    textAlign: 'center',
  },
  categoryButtonActive: { backgroundColor: '#6BA06B' },
  categoryButtonTextActive: { color: '#fff', fontWeight: '600' },
  filterActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  clearBtn: { flex: 1, backgroundColor: '#f0f0f0', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  clearBtnText: { color: '#444', fontWeight: '600', fontSize: 15 },
  applyBtn: { flex: 1, backgroundColor: '#6BA06B', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  closeButton: {
    backgroundColor: '#888',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignSelf: 'center',
    minWidth: 100,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },

  /* Edit Modal */
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 350,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
    marginBottom: 20,
    textAlign: 'center',
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
    marginBottom: 8,
    marginTop: 12,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  availabilityContainer: { flexDirection: 'row', gap: 12, marginTop: 8 },
  availabilityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  selectedAvailability: {
    backgroundColor: '#6BA06B',
    borderColor: '#6BA06B',
  },
  availabilityText: { fontSize: 14, fontWeight: '500', color: '#666' },
  selectedAvailabilityText: { color: '#fff' },
  editModalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#666' },
  saveChangesButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#6BA06B',
    alignItems: 'center',
  },
  saveChangesButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});