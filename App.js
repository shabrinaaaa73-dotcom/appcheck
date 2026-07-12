import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Linking,
  StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = '@checkin_history';

// Bonus A: baca versi app dari app.json via expo-constants
const APP_VERSION =
  Constants.expoConfig?.version ??
  Constants.manifest?.version ??
  '1.0.0';

const COLORS = {
  bg: '#0B1220',
  bgAlt: '#111A2E',
  card: '#161F36',
  cardBorder: '#232E4C',
  primary: '#22C55E',
  primaryDark: '#16A34A',
  accent: '#38BDF8',
  text: '#F1F5F9',
  textMuted: '#8B96AE',
  textFaint: '#4B587A',
  danger: '#F87171',
};

export default function App() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [primingVisible, setPrimingVisible] = useState(false);

  // ----- Level 2: Persistensi -> load data saat app dibuka -----
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch (e) {
      console.log('Gagal memuat riwayat:', e);
    }
  };

  const saveHistory = async (newHistory) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.log('Gagal menyimpan riwayat:', e);
    }
  };

  // ----- Level 3 bonus: priming screen sebelum dialog izin sistem -----
  const startCheckIn = () => {
    setPrimingVisible(true);
  };

  const proceedAfterPriming = async () => {
    setPrimingVisible(false);
    await handleCheckIn();
  };

  // ----- Permission flow: kamera -----
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Izin Kamera Ditolak',
        'Aplikasi butuh akses kamera untuk foto selfie check-in. Aktifkan izin ini di Pengaturan.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  };

  // ----- Permission flow: lokasi -----
  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Izin Lokasi Ditolak',
        'Aplikasi butuh akses lokasi untuk mencatat koordinat check-in. Aktifkan izin ini di Pengaturan.',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    return true;
  };

  // ----- Level 2: Kamera + Galeri (pilih sumber foto) -----
  const pickImage = async () => {
    return new Promise((resolve) => {
      Alert.alert('Ambil Foto Selfie', 'Pilih sumber foto', [
        {
          text: 'Kamera',
          onPress: async () => {
            const ok = await requestCameraPermission();
            if (!ok) return resolve(null);
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.6,
            });
            if (result.canceled) return resolve(null);
            resolve(result.assets[0].uri);
          },
        },
        {
          text: 'Galeri',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(
                'Izin Galeri Ditolak',
                'Aplikasi butuh akses galeri untuk memilih foto.',
                [
                  { text: 'Batal', style: 'cancel' },
                  { text: 'Buka Pengaturan', onPress: () => Linking.openSettings() },
                ]
              );
              return resolve(null);
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.6,
            });
            if (result.canceled) return resolve(null);
            resolve(result.assets[0].uri);
          },
        },
        { text: 'Batal', style: 'cancel', onPress: () => resolve(null) },
      ]);
    });
  };

  // ----- Alur utama check-in: foto + lokasi (Level 2: Kamera + Lokasi) -----
  const handleCheckIn = async () => {
    const uri = await pickImage();
    if (!uri) return;

    setLoading(true);
    try {
      const locOk = await requestLocationPermission();
      if (!locOk) {
        setLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = position.coords;

      // Level 3 bonus: reverse geocoding -> nama tempat
      let address = 'Lokasi tidak diketahui';
      try {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (places && places.length > 0) {
          const p = places[0];
          address = [p.name, p.street, p.city, p.region]
            .filter(Boolean)
            .join(', ');
        }
      } catch (e) {
        console.log('Reverse geocode gagal:', e);
      }

      const record = {
        id: Date.now().toString(),
        uri,
        latitude,
        longitude,
        address,
        timestamp: new Date().toISOString(),
      };

      const newHistory = [record, ...history];
      setHistory(newHistory);
      await saveHistory(newHistory);
    } catch (e) {
      Alert.alert('Terjadi Kesalahan', 'Gagal mengambil lokasi. Pastikan GPS aktif.');
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  // ----- Level 2: Buka di Maps -----
  const openInMaps = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  const deleteRecord = (id) => {
    Alert.alert('Hapus Check-in', 'Yakin ingin menghapus riwayat ini?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const newHistory = history.filter((h) => h.id !== id);
          setHistory(newHistory);
          await saveHistory(newHistory);
        },
      },
    ]);
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };
  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.uri }} style={styles.thumb} />
      <View style={styles.cardInfo}>
        <View style={styles.cardTopRow}>
          <Ionicons name="location" size={13} color={COLORS.primary} />
          <Text style={styles.cardAddress} numberOfLines={2}>
            {item.address}
          </Text>
        </View>
        <Text style={styles.cardCoord}>
          {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
        </Text>
        <View style={styles.timeChip}>
          <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
          <Text style={styles.timeChipText}>
            {formatDate(item.timestamp)} · {formatTime(item.timestamp)}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.mapBtn}
            activeOpacity={0.75}
            onPress={() => openInMaps(item.latitude, item.longitude)}
          >
            <Ionicons name="map-outline" size={14} color={COLORS.accent} />
            <Text style={styles.mapBtnText}>Buka di Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            activeOpacity={0.75}
            onPress={() => deleteRecord(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (primingVisible) {
    return (
      <SafeAreaView style={styles.primingContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.primingIconWrap}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primingIconCircle}
          >
            <Ionicons name="shield-checkmark" size={40} color="#052E14" />
          </LinearGradient>
        </View>
        <Text style={styles.primingTitle}>Sebelum Check-in</Text>
        <Text style={styles.primingText}>
          Aplikasi akan meminta dua izin berikut agar check-in-mu tercatat
          dengan akurat. Datamu hanya disimpan di perangkat ini.
        </Text>

        <View style={styles.permRow}>
          <View style={styles.permIconBox}>
            <Ionicons name="camera" size={20} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.permTitle}>Kamera</Text>
            <Text style={styles.permDesc}>Untuk mengambil foto selfie check-in</Text>
          </View>
        </View>

        <View style={styles.permRow}>
          <View style={styles.permIconBox}>
            <Ionicons name="location" size={20} color={COLORS.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.permTitle}>Lokasi</Text>
            <Text style={styles.permDesc}>Untuk mencatat koordinat & alamat check-in</Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={proceedAfterPriming} style={{ width: '100%', marginTop: 28 }}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Lanjutkan</Text>
            <Ionicons name="arrow-forward" size={18} color="#052E14" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setPrimingVisible(false)} style={{ marginTop: 14 }}>
          <Text style={styles.cancelText}>Batal</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[COLORS.bgAlt, COLORS.bg]}
        style={styles.header}
      >
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>Check-in App</Text>
            <Text style={styles.headerSubtitle}>Selfie + Lokasi Absensi</Text>
          </View>
          <View style={styles.headerBadge}>
            <Ionicons name="checkmark-done" size={22} color={COLORS.primary} />
          </View>
        </View>

        {history.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{history.length}</Text>
              <Text style={styles.statLabel}>Total Check-in</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{formatDate(history[0].timestamp)}</Text>
              <Text style={styles.statLabel}>Terakhir</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <TouchableOpacity activeOpacity={0.85} onPress={startCheckIn} disabled={loading} style={styles.checkInBtnWrap}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.checkInBtn}
        >
          {loading ? (
            <ActivityIndicator color="#052E14" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#052E14" />
              <Text style={styles.checkInBtnText}>Check-in Sekarang</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="images-outline" size={36} color={COLORS.textFaint} />
          </View>
          <Text style={styles.emptyText}>Belum ada riwayat check-in</Text>
          <Text style={styles.emptySubText}>Riwayat check-in kamu akan muncul di sini</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Bonus A: App Version Display */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Check-in App · v{APP_VERSION}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.text, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  statNumber: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },

  checkInBtnWrap: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  checkInBtnText: { color: '#052E14', fontSize: 15.5, fontWeight: '700' },

  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    marginBottom: 12,
  },
  thumb: { width: 84, height: 84, borderRadius: 14, backgroundColor: '#232E4C' },
  cardInfo: { flex: 1, marginLeft: 13, justifyContent: 'center' },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  cardAddress: { color: COLORS.text, fontSize: 13.5, fontWeight: '700', flex: 1, lineHeight: 18 },
  cardCoord: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, marginLeft: 17 },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 7,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeChipText: { color: COLORS.textMuted, fontSize: 10.5 },
  cardActions: { flexDirection: 'row', marginTop: 10, alignItems: 'center', gap: 8 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56,189,248,0.12)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  mapBtnText: { color: COLORS.accent, fontSize: 11.5, fontWeight: '700' },
  deleteBtn: {
    padding: 8,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderRadius: 10,
  },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  emptySubText: { color: COLORS.textMuted, fontSize: 12.5, marginTop: 5, textAlign: 'center' },

  footer: { paddingVertical: 12, alignItems: 'center' },
  footerText: { color: COLORS.textFaint, fontSize: 11, letterSpacing: 0.5 },

  primingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  primingIconWrap: {
    shadowColor: COLORS.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    marginBottom: 22,
  },
  primingIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primingTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 10 },
  primingText: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 26,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  permIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  permDesc: { color: COLORS.textMuted, fontSize: 11.5, marginTop: 2 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  primaryBtnText: { color: '#052E14', fontSize: 15.5, fontWeight: '700' },
  cancelText: { color: COLORS.textFaint, fontSize: 13.5 },
});
