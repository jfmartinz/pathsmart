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
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
        // Step 1: fetch listings for this stall
        // Try with listing_image first; if the column doesn't exist yet fall back without it
        let listingRows = null;
        let listingErr = null;
        ({ data: listingRows, error: listingErr } = await supabase
          .from('listing')
          .select('listing_id, price, is_available, listing_image, pns_id')
          .eq('stall_id', stallId));

        if (listingErr) {
          // listing_image column might not exist yet — retry without it
          console.warn('[ViewListings] first fetch error (retrying without listing_image):', listingErr.message);
          ({ data: listingRows, error: listingErr } = await supabase
            .from('listing')
            .select('listing_id, price, is_available, pns_id')
            .eq('stall_id', stallId));
        }
        if (listingErr) throw listingErr;

        // Step 2: fetch matching products by pns_id
        const pnsIds = (listingRows || []).map(r => r.pns_id).filter(Boolean);
        let productsMap = {};
        if (pnsIds.length > 0) {
          const { data: products } = await supabase
            .from('product_and_services')
            .select('pns_id, name, pns_category, pns_image')
            .in('pns_id', pnsIds);
          (products || []).forEach(p => { productsMap[p.pns_id] = p; });
        }

        const mapped = (listingRows || []).map(row => {
          const product = productsMap[row.pns_id] || {};
          // Prefer listing_image (owner's own), fallback to product image
          const imgUrl = row.listing_image || product.pns_image;
          return {
            listing_id: row.listing_id,
            name: product.name || 'Item',
            category: product.pns_category || '',
            image: imgUrl && /^https?:\/\//i.test(imgUrl)
              ? { uri: imgUrl }
              : require('../../../assets/image.png'),
            imageUrl: imgUrl || '',
            price: String(row.price ?? ''),
            availability: row.is_available ? 'Available' : 'Not Available',
          };
        });
        if (mounted) setListings(mapped);
      } catch (e) {
        console.warn('[ViewListings] load error:', e);
        if (mounted) setError('Failed to load listings: ' + (e?.message || JSON.stringify(e)));
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

  // ── New Request modal (product form) ───────────────────────────────
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [reqProductName, setReqProductName] = React.useState('');
  const [reqProductImage, setReqProductImage] = React.useState('');
  const [reqBody, setReqBody] = React.useState('');
  const [reqSending, setReqSending] = React.useState(false);
  const [reqUploadingImage, setReqUploadingImage] = React.useState(false);
  const [reqPreviewUri, setReqPreviewUri] = React.useState(null);
  const { user } = useAuth();

  const openAddModal = () => {
    setReqProductName('');
    setReqProductImage('');
    setReqBody('');
    setShowAddModal(true);
  };

  const handleReqProductImageUpload = async () => {
    setReqUploadingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'image', allowsEditing: true, quality: 1 });
      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        const fileName = `req_${Date.now()}.jpg`;
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 1024 * 1024) { alert('Image must be 1MB or smaller.'); setReqUploadingImage(false); return; }
        const { error } = await supabase.storage.from('pns-images').upload(fileName, blob, { contentType: 'image/jpeg' });
        if (error) { alert('Upload failed: ' + error.message); setReqUploadingImage(false); return; }
        const { data: urlData } = supabase.storage.from('pns-images').getPublicUrl(fileName);
        setReqProductImage(urlData.publicUrl);
      }
    } catch (e) { alert('Upload failed: ' + e.message); }
    setReqUploadingImage(false);
  };

  const handleReqSend = async () => {
    if (!reqProductName.trim()) { alert('Please enter a product name.'); return; }
    setReqSending(true);
    try {
      let ownerId = user?.stall_owner_id;
      if (!ownerId && user?.stall_owner_account_id) {
        const { data } = await supabase.from('stall_owner').select('stall_owner_id').eq('stall_owner_account_id', user.stall_owner_account_id).maybeSingle();
        if (data) ownerId = data.stall_owner_id;
      }
      const { error } = await supabase.from('message_request').insert([{
        stall_owner_id: ownerId,
        stall_id: Number(currentId) || null,
        subject: reqProductName.trim(),
        message: reqBody.trim() || null,
        status: 'pending',
        attached_images: reqProductImage ? JSON.stringify([reqProductImage]) : null,
      }]);
      if (error) throw error;
      setShowAddModal(false);
      alert('Request sent!');
    } catch (e) { alert('Failed to send: ' + e.message); }
    setReqSending(false);
  };
  const [editingName, setEditingName] = React.useState('');
  const [editingPrice, setEditingPrice] = React.useState('');
  const [editingAvailability, setEditingAvailability] = React.useState('Available');
  const [editingImage, setEditingImage] = React.useState('');
  const [uploadingImage, setUploadingImage] = React.useState(false);

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
    setEditingImage(listing.imageUrl || '');
    setEditModalVisible(true);
  };

  const handleImageUpload = async () => {
    setUploadingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'image',
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const fileName = `listing_${Date.now()}.jpg`;
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 1024 * 1024) {
          alert('Image size must be less than or equal to 1MB.');
          setUploadingImage(false);
          return;
        }
        const { error } = await supabase.storage
          .from('pns-images')
          .upload(fileName, blob, { contentType: 'image/jpeg' });
        if (error) {
          alert('Image upload failed: ' + error.message);
          setUploadingImage(false);
          return;
        }
        const { data: urlData } = supabase.storage
          .from('pns-images')
          .getPublicUrl(fileName);
        setEditingImage(urlData.publicUrl);
      }
    } catch (e) {
      alert('Image upload failed: ' + e.message);
    }
    setUploadingImage(false);
  };

  const saveEdit = () => {
    if (editingIndex !== null) {
      const cleanPrice = cleanDecimal(editingPrice || '');
      const l = listings[editingIndex];
      (async () => {
        try {
          const baseData = {
            price: Number(cleanPrice || 0),
            is_available: editingAvailability === 'Available',
          };

          // Try with listing_image first; if that column doesn't exist, retry without it
          let error;
          if (editingImage) {
            ({ error } = await supabase
              .from('listing')
              .update({ ...baseData, listing_image: editingImage })
              .eq('listing_id', l.listing_id));
            if (error && /column|listing_image/i.test(error.message)) {
              // Column likely doesn't exist — fall back to updating without it
              ({ error } = await supabase
                .from('listing')
                .update(baseData)
                .eq('listing_id', l.listing_id));
            }
          } else {
            ({ error } = await supabase
              .from('listing')
              .update(baseData)
              .eq('listing_id', l.listing_id));
          }

          if (error) {
            alert('Failed to save changes: ' + error.message);
            return;
          }

          setListings(prev => prev.map((it, i) => i === editingIndex ? {
            ...it,
            price: cleanPrice,
            availability: editingAvailability,
            image: editingImage ? { uri: editingImage } : it.image,
            imageUrl: editingImage || it.imageUrl,
          } : it));
          cancelEdit();
        } catch (e) {
          alert('Failed to save changes: ' + e.message);
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
    setEditingImage('');
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

        <TouchableOpacity style={styles.newRequestBtn} onPress={openAddModal}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.newRequestBtnText}>New Request</Text>
        </TouchableOpacity>

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

      {/* New Request Compose Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.addModalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setShowAddModal(false)} />
          <View style={styles.addModalBox}>
            <Text style={styles.addModalTitle}>New Message Request</Text>

            <Text style={styles.composeLabel}>Product Name</Text>
            <TextInput
              style={styles.composeInput}
              value={reqProductName}
              onChangeText={setReqProductName}
              placeholder="e.g. Carrots"
              placeholderTextColor="#999"
            />

            <Text style={styles.composeLabel}>Product Image</Text>
            <TouchableOpacity style={styles.reqImageBox} onPress={handleReqProductImageUpload} disabled={reqUploadingImage}>
              {reqProductImage ? (
                <>
                  <Image source={{ uri: reqProductImage }} style={styles.reqImagePreview} resizeMode="cover" />
                  <TouchableOpacity style={styles.reqImageOverlay} onPress={handleReqProductImageUpload} disabled={reqUploadingImage}>
                    <Feather name="camera" size={18} color="#fff" />
                    <Text style={styles.reqImageOverlayText}>Change</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.reqImagePlaceholder}>
                  <Feather name="image" size={28} color="#bbb" />
                  <Text style={styles.reqImagePlaceholderText}>{reqUploadingImage ? 'Uploading...' : 'Tap to upload image'}</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.composeLabel}>Message <Text style={{ color: '#999', fontWeight: '400' }}>(optional)</Text></Text>
            <TextInput
              style={[styles.composeInput, styles.composeTextArea]}
              value={reqBody}
              onChangeText={setReqBody}
              placeholder="Describe the changes you need..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.addModalActions}>
              <TouchableOpacity style={styles.cancelBtn2} onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelBtn2Text}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addConfirmBtn, reqSending && { opacity: 0.6 }]}
                onPress={handleReqSend}
                disabled={reqSending}
              >
                <Feather name="send" size={15} color="#fff" />
                <Text style={styles.addConfirmBtnText}>{reqSending ? 'Sending...' : 'Send'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image full-size preview */}
      <Modal visible={!!reqPreviewUri} transparent animationType="fade">
        <Pressable style={styles.previewOverlay} onPress={() => setReqPreviewUri(null)}>
          <Image source={{ uri: reqPreviewUri }} style={styles.previewImage} resizeMode="contain" />
          <TouchableOpacity style={styles.previewClose} onPress={() => setReqPreviewUri(null)}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

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

            {/* Product Image Upload */}
            <Text style={styles.editLabel}>Product Image</Text>
            <TouchableOpacity
              style={styles.imageUploadArea}
              onPress={handleImageUpload}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <View style={styles.imageUploadPlaceholder}>
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              ) : editingImage ? (
                <Image source={{ uri: editingImage }} style={styles.editPreviewImage} />
              ) : (
                <View style={styles.imageUploadPlaceholder}>
                  <Feather name="camera" size={24} color="#888" />
                  <Text style={styles.imageUploadText}>Tap to upload image</Text>
                </View>
              )}
            </TouchableOpacity>

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

  newRequestBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#6BA06B', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 18,
    alignSelf: 'flex-start', marginBottom: 16, gap: 8,
  },
  newRequestBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  /* New request compose modal */
  addModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  addModalBox: {
    backgroundColor: '#fff', borderRadius: 16, width: 480, padding: 32,
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  addModalTitle: { fontSize: 20, fontWeight: '600', color: '#222', marginBottom: 20, textAlign: 'center' },
  composeLabel: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6, marginTop: 12 },
  composeInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
    backgroundColor: '#F9F9F9', color: '#222',
  },
  composeTextArea: { minHeight: 110, textAlignVertical: 'top' },
  thumbRow: { marginBottom: 10 },
  thumbWrap: { position: 'relative', width: 80, height: 80 },
  thumbImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f0f0f0' },
  thumbRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  addPicturesBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#6BA06B', borderRadius: 8,
    paddingVertical: 10, gap: 8, marginTop: 4, marginBottom: 4,
  },
  addPicturesBtnText: { color: '#6BA06B', fontWeight: '600', fontSize: 14 },
  reqImageBox: {
    width: '100%', height: 180, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#e0e0e0',
    marginBottom: 4, position: 'relative',
  },
  reqImagePreview: { width: '100%', height: '100%' },
  reqImageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 6,
  },
  reqImageOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  reqImagePlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  reqImagePlaceholderText: { color: '#aaa', fontSize: 13 },
  addModalActions: {
    flexDirection: 'row', gap: 12, marginTop: 20,
  },
  cancelBtn2: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#f0f0f0', alignItems: 'center',
  },
  cancelBtn2Text: { color: '#666', fontWeight: '600', fontSize: 15 },
  addConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#6BA06B', alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  addConfirmBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center', alignItems: 'center',
  },
  previewImage: { width: '90%', height: '80%' },
  previewClose: {
    position: 'absolute', top: 20, right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20,
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },

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

  /* Image upload in edit modal */
  imageUploadArea: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  imageUploadPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadText: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
  },
  uploadingText: {
    fontSize: 14,
    color: '#888',
  },
  editPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 8,
  },
});