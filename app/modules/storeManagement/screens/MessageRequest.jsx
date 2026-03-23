import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { supabase } from '../../../../backend/supabaseClient';

export default function MessageRequest() {
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Compose form
  const [productName, setProductName] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [productImage, setProductImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState(null);

  // Stall owner info
  const [stallOwnerId, setStallOwnerId] = useState(null);
  const [stalls, setStalls] = useState([]);
  const [selectedStallId, setSelectedStallId] = useState(null);

  // Resolve stall_owner_id and load stalls
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

      if (!mounted) return;
      setStallOwnerId(ownerId);

      if (ownerId) {
        const { data: stallData } = await supabase
          .from('stall')
          .select('stall_id, stall_name')
          .eq('stall_owner_id', ownerId);
        if (mounted && stallData) {
          setStalls(stallData);
          if (stallData.length > 0) setSelectedStallId(stallData[0].stall_id);
        }
      }
    }

    resolve();
    return () => { mounted = false; };
  }, [user]);

  // Fetch messages
  useEffect(() => {
    if (!stallOwnerId) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('message_request')
        .select('*')
        .eq('stall_owner_id', stallOwnerId)
        .order('created_at', { ascending: false });

      if (!error && mounted) setMessages(data || []);
      if (mounted) setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [stallOwnerId]);

  const handleAddPicture = async () => {
    setUploadingImage(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'image',
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const uri = result.assets[0].uri;
        const fileName = `msg_${Date.now()}.jpg`;
        const response = await fetch(uri);
        const blob = await response.blob();
        if (blob.size > 1024 * 1024) {
          alert('Image must be 1MB or smaller.');
          setUploadingImage(false);
          return;
        }
        const { error } = await supabase.storage
          .from('pns-images')
          .upload(fileName, blob, { contentType: 'image/jpeg' });
        if (error) {
          alert('Upload failed: ' + error.message);
          setUploadingImage(false);
          return;
        }
        const { data: urlData } = supabase.storage
          .from('pns-images')
          .getPublicUrl(fileName);
        setProductImage(urlData.publicUrl);
      }
    } catch (e) {
      alert('Upload failed: ' + e.message);
    }
    setUploadingImage(false);
  };

  const handleSend = async () => {
    if (!productName.trim()) {
      alert('Please enter a product name.');
      return;
    }
    if (!selectedStallId) {
      alert('Please select a stall.');
      return;
    }

    setSending(true);
    const { error } = await supabase.from('message_request').insert([
      {
        stall_owner_id: stallOwnerId,
        stall_id: selectedStallId,
        subject: productName.trim(),
        message: messageBody.trim() || null,
        status: 'pending',
        attached_images: productImage ? JSON.stringify([productImage]) : null,
      },
    ]);

    if (error) {
      alert('Failed to send message: ' + error.message);
      setSending(false);
      return;
    }

    // Refresh messages
    const { data } = await supabase
      .from('message_request')
      .select('*')
      .eq('stall_owner_id', stallOwnerId)
      .order('created_at', { ascending: false });

    setMessages(data || []);
    setProductName('');
    setMessageBody('');
    setProductImage('');
    setShowComposeModal(false);
    setSending(false);
  };

  const openDetail = (msg) => {
    setSelectedMessage(msg);
    setShowDetailModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA726';
      case 'read': return '#42A5F5';
      case 'resolved': return '#66BB6A';
      default: return '#999';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'pending': return '#FFF3E0';
      case 'read': return '#E3F2FD';
      case 'resolved': return '#E8F5E9';
      default: return '#F5F5F5';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <View style={styles.root}>
      <Sidebar onAccountPress={() => {}} />

      <View style={styles.main}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Message Requests</Text>
        </View>
        <Text style={styles.subtitle}>
          Send a request to the admin for product changes or updates.
        </Text>
        <View style={styles.divider} />

        <TouchableOpacity style={styles.composeButton} onPress={() => setShowComposeModal(true)}>
          <Feather name="edit" size={18} color="#fff" />
          <Text style={styles.composeButtonText}>New Request</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#6BA06B" style={{ marginTop: 40 }} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="mail" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Tap "New Request" to send a message to the admin.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.messageList} showsVerticalScrollIndicator={false}>
            {messages.map((msg) => (
              <TouchableOpacity
                key={msg.message_id}
                style={styles.messageCard}
                onPress={() => openDetail(msg)}
              >
                <View style={styles.messageCardHeader}>
                  <Text style={styles.messageSubject} numberOfLines={1}>
                    {msg.subject}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(msg.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(msg.status) }]}>
                      {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.messagePreview} numberOfLines={2}>
                  {msg.message}
                </Text>
                <Text style={styles.messageDate}>{formatDate(msg.created_at)}</Text>
                {msg.admin_reply && (
                  <View style={styles.replyPreview}>
                    <Feather name="corner-down-right" size={14} color="#6BA06B" />
                    <Text style={styles.replyPreviewText} numberOfLines={1}>
                      Admin replied
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Compose Modal */}
      <Modal visible={showComposeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setShowComposeModal(false)} />
          <View style={styles.composeBox}>
            <Text style={styles.composeTitle}>New Message Request</Text>

            {stalls.length > 1 && (
              <>
                <Text style={styles.label}>Stall</Text>
                <View style={styles.stallSelector}>
                  {stalls.map((s) => (
                    <TouchableOpacity
                      key={s.stall_id}
                      style={[
                        styles.stallOption,
                        selectedStallId === s.stall_id && styles.stallOptionActive,
                      ]}
                      onPress={() => setSelectedStallId(s.stall_id)}
                    >
                      <Text
                        style={[
                          styles.stallOptionText,
                          selectedStallId === s.stall_id && styles.stallOptionTextActive,
                        ]}
                      >
                        {s.stall_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>Product Name</Text>
            <TextInput
              style={styles.input}
              value={productName}
              onChangeText={setProductName}
              placeholder="e.g. Carrots"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Product Image</Text>
            <TouchableOpacity style={styles.productImageBox} onPress={handleAddPicture} disabled={uploadingImage}>
              {productImage ? (
                <>
                  <Image source={{ uri: productImage }} style={styles.productImagePreview} resizeMode="cover" />
                  <View style={styles.productImageOverlay}>
                    <Feather name="camera" size={18} color="#fff" />
                    <Text style={styles.productImageOverlayText}>Change</Text>
                  </View>
                </>
              ) : (
                <View style={styles.productImagePlaceholder}>
                  <Feather name="image" size={28} color="#bbb" />
                  <Text style={styles.productImagePlaceholderText}>
                    {uploadingImage ? 'Uploading...' : 'Tap to upload image'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Message <Text style={{ color: '#999', fontWeight: '400' }}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={messageBody}
              onChangeText={setMessageBody}
              placeholder="Describe the changes you need..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <View style={styles.composeActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowComposeModal(false);
                  setProductName('');
                  setMessageBody('');
                  setProductImage('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, sending && { opacity: 0.6 }]}
                onPress={handleSend}
                disabled={sending}
              >
                <Feather name="send" size={16} color="#fff" />
                <Text style={styles.sendBtnText}>
                  {sending ? 'Sending...' : 'Send'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdrop} onPress={() => setShowDetailModal(false)} />
          <View style={styles.detailBox}>
            {selectedMessage && (
              <>
                <View style={styles.detailHeader}>
                  <Text style={styles.detailSubject}>{selectedMessage.subject}</Text>
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
                <Text style={styles.detailDate}>
                  {formatDate(selectedMessage.created_at)}
                </Text>
                <View style={styles.detailDivider} />
                <Text style={styles.detailBody}>{selectedMessage.message}</Text>

                {selectedMessage.admin_reply && (
                  <View style={styles.replySection}>
                    <View style={styles.replySectionHeader}>
                      <Feather name="corner-down-right" size={16} color="#6BA06B" />
                      <Text style={styles.replySectionTitle}>Admin Reply</Text>
                    </View>
                    <Text style={styles.replyBody}>{selectedMessage.admin_reply}</Text>
                    {selectedMessage.replied_at && (
                      <Text style={styles.replyDate}>
                        {formatDate(selectedMessage.replied_at)}
                      </Text>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.closeDetailBtn}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.closeDetailBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      {/* Image Preview Modal */}
      <Modal visible={!!previewImageUri} transparent animationType="fade">
        <Pressable
          style={styles.previewOverlay}
          onPress={() => setPreviewImageUri(null)}
        >
          <Image
            source={{ uri: previewImageUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.previewClose}
            onPress={() => setPreviewImageUri(null)}
          >
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
        </Pressable>
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

  composeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6BA06B',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginBottom: 24,
    gap: 8,
  },
  composeButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, color: '#999', marginTop: 16, fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#bbb', marginTop: 6 },

  messageList: { flex: 1 },
  messageCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  messageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  messageSubject: { fontSize: 16, fontWeight: '600', color: '#222', flex: 1, marginRight: 12 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  messagePreview: { fontSize: 14, color: '#666', marginBottom: 6 },
  messageDate: { fontSize: 12, color: '#aaa' },
  replyPreview: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  replyPreviewText: { fontSize: 13, color: '#6BA06B', fontWeight: '500' },

  /* Modals */
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  /* Compose */
  composeBox: {
    backgroundColor: '#fff', borderRadius: 16, width: 480, padding: 32,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  composeTitle: { fontSize: 20, fontWeight: '600', color: '#222', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15,
    backgroundColor: '#F9F9F9', color: '#222',
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  stallSelector: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  stallOption: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8,
    borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f9f9f9',
  },
  stallOptionActive: { backgroundColor: '#6BA06B', borderColor: '#6BA06B' },
  stallOptionText: { fontSize: 14, color: '#666' },
  stallOptionTextActive: { color: '#fff', fontWeight: '600' },
  composeActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#f0f0f0', alignItems: 'center',
  },
  cancelBtnText: { color: '#666', fontWeight: '600', fontSize: 15 },
  sendBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#6BA06B', alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  /* Detail */
  detailBox: {
    backgroundColor: '#fff', borderRadius: 16, width: 500, padding: 32,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 8, maxHeight: '80%',
  },
  detailHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  detailSubject: { fontSize: 20, fontWeight: '600', color: '#222', flex: 1, marginRight: 12 },
  detailDate: { fontSize: 13, color: '#aaa', marginBottom: 12 },
  detailDivider: { height: 1, backgroundColor: '#e0e0e0', marginBottom: 16 },
  detailBody: { fontSize: 15, color: '#333', lineHeight: 22 },

  replySection: {
    marginTop: 20, backgroundColor: '#F0F7EF', borderRadius: 10,
    padding: 16, borderLeftWidth: 3, borderLeftColor: '#6BA06B',
  },
  replySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  replySectionTitle: { fontSize: 14, fontWeight: '600', color: '#6BA06B' },
  replyBody: { fontSize: 14, color: '#333', lineHeight: 20 },
  replyDate: { fontSize: 12, color: '#aaa', marginTop: 8 },

  closeDetailBtn: {
    marginTop: 24, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#f0f0f0', alignItems: 'center',
  },
  closeDetailBtnText: { color: '#444', fontWeight: '600', fontSize: 15 },

  /* Pictures */
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

  /* Product image upload */
  productImageBox: {
    width: '100%', height: 180, borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#e0e0e0',
    marginBottom: 4, position: 'relative',
  },
  productImagePreview: { width: '100%', height: '100%' },
  productImageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 6,
  },
  productImageOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  productImagePlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  productImagePlaceholderText: { color: '#aaa', fontSize: 13 },

  /* Full-size preview */
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
});
