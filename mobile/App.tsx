import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, BackHandler, AppState } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { BeVietnamPro_400Regular } from '@expo-google-fonts/be-vietnam-pro/400Regular';
import { BeVietnamPro_500Medium } from '@expo-google-fonts/be-vietnam-pro/500Medium';
import { BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro/600SemiBold';
import { BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro/700Bold';
import { BeVietnamPro_800ExtraBold } from '@expo-google-fonts/be-vietnam-pro/800ExtraBold';
import { Engine, Role, loadEngine } from './src/engine';
import { c, font, ui } from './src/ui/theme';
import { Icon } from './src/ui/Icon';
import { NativeWorkflow } from './src/ui/NativeWorkflow';
import { Dashboard, Discover } from './src/screens/Home';
import { Chats } from './src/screens/Chats';

function MobileApp({ engine }: { engine: Engine }) {
  const [, setVersion] = useState(0);
  const [menu, setMenu] = useState(false), [spaces, setSpaces] = useState(false);
  const scroll = useRef<React.ElementRef<typeof ScrollView>>(null);
  const insets = useSafeAreaInsets();
  useEffect(() => engine.subscribe(() => setVersion(version => version + 1)), [engine]);
  const state = engine.state(), snapshot = engine.snapshot(), landlord = state.role === 'landlord';
  const nav: string[][] = engine.core.nav[state.role as Role];
  const primary = landlord ? ['dashboard', 'properties', 'chats', 'invoices'] : ['discover', 'favorites', 'chats', 'contracts'];
  const active = ['detail', 'room-detail'].includes(state.view) ? landlord ? 'properties' : 'discover' : state.view;
  const me = engine.core.person(engine.core.userId());
  const unread = state.notifications.filter((n: any) => n.userId === engine.core.userId() && !n.read).length;
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [state.view, state.role]);
  useEffect(() => {
    const event = AppState.addEventListener('change', next => {
      engine.document.visibilityState = next === 'active' ? 'visible' : 'hidden';
      if (next === 'active') engine.refresh();
    });
    return () => event.remove();
  }, [engine]);
  useEffect(() => {
    const event = BackHandler.addEventListener('hardwareBackPress', () => {
      if (snapshot.dialog) { engine.close(); return true; }
      if (menu || spaces) { setMenu(false); setSpaces(false); return true; }
      if (state.view === 'chats' && state.chatMobileOpen) { engine.action('back-chats'); return true; }
      if (state.view !== primary[0]) { engine.action('navigate', primary[0]); return true; }
      return false;
    });
    return () => event.remove();
  }, [engine, state.view, state.chatMobileOpen, menu, spaces, snapshot.dialog]);
  function go(id: string) { setMenu(false); engine.action('navigate', id); }
  return <View style={s.stage}><SafeAreaView edges={['top']} style={s.app}><StatusBar style="dark" />
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Chuyển vai trò" onPress={() => setSpaces(true)} style={ui.row}><View style={s.logo}><Icon name="building-2" color={c.white} size={22} /></View><View><Text style={s.wordmark}>trọ<Text style={{ color: c.coral }}>day</Text><Text style={s.wordmarkDot}>.</Text></Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Text style={s.roleLabel}>{landlord ? 'Không gian chủ trọ' : 'Không gian người thuê'}</Text><Icon name="chevron-down" size={10} color={c.muted} /></View></View></Pressable><View style={[ui.row, { gap: 13 }]}><Pressable accessibilityRole="button" accessibilityLabel={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`} onPress={() => engine.action('notifications')} style={s.bell}><Icon name="bell" size={23} color={c.ink} />{unread > 0 && <View style={s.badge}><Text style={s.badgeText}>{unread > 9 ? '9+' : unread}</Text></View>}</Pressable><Pressable accessibilityRole="button" accessibilityLabel="Tài khoản của bạn" onPress={() => go('profile')} style={[s.account, landlord && { backgroundColor: c.peach }]}><Text style={[s.accountText, landlord && { color: c.coral }]}>{me.initials}</Text></Pressable></View></View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {state.view === 'chats' ? <Chats engine={engine} /> : <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={ui.body} showsVerticalScrollIndicator={false}>
        {state.view === 'discover' ? <Discover engine={engine} /> : state.view === 'favorites' ? <Discover key="favorites" favorites engine={engine} /> : state.view === 'dashboard' && landlord ? <Dashboard engine={engine} /> : <NativeWorkflow key={state.view} node={snapshot.main} engine={engine} />}
      </ScrollView>}
    </KeyboardAvoidingView>
    <View style={[s.bottomNav, { paddingBottom: Math.max(insets.bottom, 10) }]}>{primary.map(id => {
      const item = nav.find(item => item[0] === id)!;
      return <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: active === id }} onPress={() => go(id)} style={s.navItem}><View style={[s.navIcon, active === id && s.navIconActive]}><Icon name={item[2]} color={active === id ? c.teal : '#95A09B'} size={22} /></View><Text style={[s.navLabel, active === id && s.navLabelActive]}>{id === 'dashboard' ? 'Trang chủ' : item[1]}</Text></Pressable>;
    })}<Pressable accessibilityRole="tab" accessibilityLabel="Tất cả tiện ích" accessibilityState={{ selected: !primary.includes(active) }} onPress={() => setMenu(true)} style={s.navItem}><View style={[s.navIcon, !primary.includes(active) && s.navIconActive]}><Icon name="more" color={!primary.includes(active) ? c.teal : '#95A09B'} size={22} /></View><Text style={[s.navLabel, !primary.includes(active) && s.navLabelActive]}>Tiện ích</Text></Pressable></View>
    <Modal visible={!!snapshot.dialog} transparent animationType="slide" onRequestClose={() => engine.close()}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalBackdrop}><Pressable accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={() => engine.close()} accessibilityLabel="Đóng biểu mẫu" /><View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}><View style={s.handle} /><View style={s.modalHeader}><Text style={[ui.section, { flex: 1 }]}>{snapshot.dialog?.querySelector('.dialog-header h2')?.textContent || 'Chi tiết'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => engine.close()} style={s.close}><Icon name="x" size={21} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 4 }}><NativeWorkflow node={snapshot.dialog} engine={engine} /></ScrollView></View>{!!snapshot.toast && <View style={[s.toast, { bottom: 12 }]}><Text style={s.toastText}>{snapshot.toast}</Text></View>}</KeyboardAvoidingView></Modal>
    <Modal visible={menu || spaces} transparent animationType="slide" onRequestClose={() => { setMenu(false); setSpaces(false); }}><View style={s.modalBackdrop}><Pressable accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={() => { setMenu(false); setSpaces(false); }} accessibilityLabel="Đóng" /><SafeAreaView edges={['bottom']} style={s.sheet}><View style={s.handle} /><View style={s.modalHeader}><View style={{ flex: 1 }}><Text style={ui.section}>{spaces ? 'Bạn dùng Trọday với vai trò nào?' : 'Tiện ích của bạn'}</Text><Text style={[ui.muted, { marginTop: 4 }]}>{spaces ? 'Chọn không gian phù hợp để bắt đầu.' : 'Mọi thứ bạn cần, ngay trong Trọday.'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Đóng" style={s.close} onPress={() => { setMenu(false); setSpaces(false); }}><Icon name="x" size={21} /></Pressable></View><ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 15 }}>{spaces ? <>
      {([['tenant', 'Người thuê', 'Tìm phòng, kết nối và quản lý việc thuê', 'key-round'], ['landlord', 'Chủ trọ', 'Quản lý nhà trọ và chăm sóc người thuê', 'building-2']] as const).map(([role, label, description, glyph]) => <Pressable key={role} accessibilityRole="button" accessibilityState={{ selected: state.role === role }} onPress={() => { engine.close(); engine.action('switch-role', role); setSpaces(false); setMenu(false); }} style={[ui.card, ui.row, state.role === role && { borderColor: c.teal, backgroundColor: c.soft }]}><View style={ui.iconBox}><Icon name={glyph} /></View><View style={{ flex: 1 }}><Text style={[ui.text, { fontFamily: font.semibold }]}>{label}</Text><Text style={[ui.muted, { marginTop: 3 }]}>{description}</Text></View><Icon name={state.role === role ? 'check' : 'arrow-right'} size={18} /></Pressable>)}<Text style={[ui.muted, { textAlign: 'center', fontSize: 10 }]}>Bản demo · Dữ liệu lưu riêng trên thiết bị</Text>
      </> : <><View style={s.menuGrid}>{nav.map(([id, label, glyph]) => <Pressable key={id} accessibilityRole="button" onPress={() => go(id)} style={[s.menuTile, state.view === id && { backgroundColor: c.soft, borderColor: '#B5CCBC' }]}><Icon name={glyph} size={25} /><Text style={[ui.text, { fontFamily: font.medium, fontSize: 12 }]}>{label}</Text></Pressable>)}</View><Pressable accessibilityRole="button" onPress={() => setSpaces(true)} style={[ui.secondary, { marginTop: 5 }]}><Icon name="repeat-2" size={18} /><Text style={s.menuLink}>Chuyển vai trò</Text></Pressable></>}</ScrollView></SafeAreaView></View></Modal>
    {!!snapshot.toast && !snapshot.dialog && <View pointerEvents="none" style={[s.toast, { bottom: 90 + insets.bottom }]}><Text style={s.toastText}>{snapshot.toast}</Text></View>}
  </SafeAreaView></View>;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold });
  const [engine, setEngine] = useState<Engine | null>(null), [error, setError] = useState('');
  useEffect(() => { let active = true; let instance: Engine | undefined;
    loadEngine(message => { if (active) setError(message); }).then(value => { instance = value; if (active) setEngine(value); else value.dispose(); }).catch(() => { if (active) setError('Không đọc được dữ liệu trên thiết bị. Hãy đóng và mở lại app.'); });
    return () => { active = false; instance?.dispose(); };
  }, []);
  if (!engine || !fontsLoaded && !fontError) return <SafeAreaProvider><View style={[ui.screen, { alignItems: 'center', justifyContent: 'center', gap: 18, padding: 30 }]}><View style={s.logo}><Icon name="building-2" color={c.white} /></View><ActivityIndicator color={c.teal} /><Text style={{ color: c.muted, textAlign: 'center' }}>{error || 'Đang mở Trọday...'}</Text></View></SafeAreaProvider>;
  return <SafeAreaProvider><MobileApp engine={engine} />{!!error && <View style={s.errorBanner}><Text style={s.toastText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => setError('')} accessibilityLabel="Đóng"><Icon name="x" color={c.white} size={18} /></Pressable></View>}</SafeAreaProvider>;
}

const s = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#E9EFEB', alignItems: 'center' }, app: { flex: 1, width: '100%', maxWidth: 600, backgroundColor: c.page, overflow: 'hidden' },
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: c.page },
  logo: { width: 39, height: 42, borderRadius: 13, backgroundColor: c.teal, justifyContent: 'center', alignItems: 'center' }, wordmark: { color: c.ink, fontFamily: font.heavy, fontSize: 23, lineHeight: 30, letterSpacing: -1 }, wordmarkDot: { color: c.teal }, roleLabel: { fontFamily: font.regular, fontSize: 9, color: c.muted },
  bell: { width: 32, height: 38, alignItems: 'center', justifyContent: 'center' }, badge: { position: 'absolute', right: -3, top: -1, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: c.coral, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: c.page }, badgeText: { fontFamily: font.semibold, fontSize: 8, color: c.white },
  account: { width: 38, height: 38, borderRadius: 14, backgroundColor: '#E0E9DC', justifyContent: 'center', alignItems: 'center' }, accountText: { fontFamily: font.bold, fontSize: 12, color: c.teal },
  bottomNav: { flexDirection: 'row', paddingTop: 9, paddingHorizontal: 10, backgroundColor: c.white, borderTopWidth: 1, borderColor: c.line }, navItem: { flex: 1, alignItems: 'center', gap: 4 }, navIcon: { width: 47, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, navIconActive: { backgroundColor: c.soft }, navLabel: { color: '#929E97', fontFamily: font.medium, fontSize: 9 }, navLabelActive: { color: c.teal, fontFamily: font.semibold },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#15382E66' }, sheet: { width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: c.page, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '91%', overflow: 'hidden' }, handle: { width: 36, height: 4, backgroundColor: '#D0DAD2', borderRadius: 4, alignSelf: 'center', marginTop: 12, marginBottom: 5 }, modalHeader: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }, close: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#E9EEEA', alignItems: 'center', justifyContent: 'center' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, menuTile: { width: '47%', flexGrow: 1, padding: 17, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 18, gap: 11 }, menuLink: { color: c.teal, fontFamily: font.semibold, fontSize: 12 },
  toast: { position: 'absolute', left: 20, right: 20, maxWidth: 560, alignSelf: 'center', backgroundColor: c.dark, padding: 15, borderRadius: 15, zIndex: 30, elevation: 8 }, toastText: { color: c.white, fontFamily: font.medium, fontSize: 12, lineHeight: 20 },
  errorBanner: { position: 'absolute', top: 50, left: 15, right: 15, backgroundColor: c.red, padding: 15, borderRadius: 12, flexDirection: 'row', gap: 12 }
});
