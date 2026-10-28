import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, Modal, ScrollView, StyleSheet, Platform, Linking, Alert, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Engine, NativeNode } from '../engine';
import { c, font, ui } from './theme';
import { Icon } from './Icon';
import { photoSource } from './assets';

type Props = { node: NativeNode; engine: Engine };
const has = (node: NativeNode, name: string) => node.classList.contains(name);
const tone = (node: NativeNode) => has(node, 'red') ? [c.redSoft, c.red] : has(node, 'yellow') ? [c.yellow, '#8C6A21'] : has(node, 'orange') ? [c.peach, c.coral] : [c.soft, c.teal];
const clean = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();

function SelectInput({ node, engine }: Props) {
  const [open, setOpen] = useState(false);
  const options: NativeNode[] = node.querySelectorAll('option');
  const selected = options.find(option => (option.getAttribute('value') ?? option.textContent) === node.value);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={node.closest('label')?.textContent} disabled={node.disabled} onPress={() => setOpen(true)} style={[ui.input, ui.between, node.disabled && s.disabled]}>
      <Text style={[ui.text, { flex: 1 }]}>{selected?.textContent || 'Chọn thông tin'}</Text><Icon name="chevron-down" size={17} />
    </Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={s.optionBackdrop}><Pressable accessibilityRole="button" accessibilityLabel="Đóng danh sách" style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} /><SafeAreaView edges={['bottom']} style={s.optionSheet}>
        <View style={s.handle} /><View style={[ui.between, { padding: 20 }]}><Text style={ui.section}>Chọn thông tin</Text><Pressable accessibilityRole="button" onPress={() => setOpen(false)} accessibilityLabel="Đóng"><Icon name="x" /></Pressable></View>
        <ScrollView>{options.map((option, index) => <Pressable accessibilityRole="button" key={index} disabled={option.disabled} onPress={() => { engine.change(node, option.getAttribute('value') ?? option.textContent); setOpen(false); }} style={[s.option, selected === option && { backgroundColor: c.soft }]}><Text style={[ui.text, { flex: 1 }]}>{option.textContent}</Text>{selected === option && <Icon name="check" size={19} />}</Pressable>)}</ScrollView>
      </SafeAreaView></View>
    </Modal>
  </>;
}

function DateInput({ node, engine }: Props) {
  const [open, setOpen] = useState(false);
  const time = node.getAttribute('type') === 'time';
  const parsed = new Date(time ? `2000-01-01T${node.value || '12:00'}:00` : `${node.value || new Date().toISOString().slice(0, 10)}T12:00:00`);
  const value = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const onChange = (_event: unknown, date?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (!date) return;
    const pad = (part: number) => String(part).padStart(2, '0');
    engine.change(node, time ? `${pad(date.getHours())}:${pad(date.getMinutes())}` : `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`);
  };
  if (Platform.OS === 'web') return <TextInput accessibilityLabel={node.closest('label')?.textContent} style={ui.input} value={node.value} placeholder={time ? 'HH:mm' : 'YYYY-MM-DD'} onChangeText={text => engine.change(node, text)} />;
  return <><Pressable style={[ui.input, ui.between]} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={node.closest('label')?.textContent}><Text style={ui.text}>{node.value || (time ? 'Chọn giờ' : 'Chọn ngày')}</Text><Icon name="calendar-days" size={19} /></Pressable>{open && (Platform.OS === 'ios' ? <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}><View style={s.optionBackdrop}><View style={s.optionSheet}><View style={{ padding: 20, gap: 12 }}><DateTimePicker value={value} mode={time ? 'time' : 'date'} display="spinner" onChange={onChange} locale="vi-VN" themeVariant="light" /><Pressable accessibilityRole="button" style={ui.primary} onPress={() => { onChange(null, value); setOpen(false); }}><Text style={ui.primaryText}>Xong</Text></Pressable></View></View></View></Modal> : <DateTimePicker value={value} mode={time ? 'time' : 'date'} is24Hour onChange={onChange} />)}</>;
}

function FileInput({ node, engine }: Props) {
  const [busy, setBusy] = useState(false);
  async function pick() {
    setBusy(true);
    try {
      const response = await DocumentPicker.getDocumentAsync({ type: node.getAttribute('accept')?.includes('image/*') ? ['image/*', 'application/pdf'] : ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], multiple: node.hasAttribute('multiple'), copyToCacheDirectory: true });
      if (!response.canceled) engine.attach(node, response.assets.map(file => ({ name: file.name, uri: file.uri, size: file.size || 0, type: file.mimeType || 'application/octet-stream' })));
    } catch { Alert.alert('Chưa chọn được tệp', 'Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <View style={{ gap: 8 }}><Pressable accessibilityRole="button" disabled={busy || node.disabled} onPress={pick} style={[s.fileInput, node.disabled && s.disabled]}>{busy ? <ActivityIndicator color={c.teal} /> : <Icon name="download" size={22} />}<Text style={[ui.text, { color: c.teal }]}>Chọn ảnh hoặc tài liệu</Text></Pressable>{node.files.map((file: any, index: number) => <View key={index} style={ui.between}><Text style={[ui.muted, { flex: 1 }]}>{file.name} · {Math.ceil(file.size / 1024)} KB</Text><Pressable accessibilityRole="button" accessibilityLabel={`Bỏ tệp ${file.name}`} onPress={() => engine.attach(node, node.files.filter((_: unknown, i: number) => i !== index))}><Icon name="x" size={18} /></Pressable></View>)}</View>;
}

function NativeInput({ node, engine }: Props) {
  const type = node.getAttribute('type');
  if (type === 'hidden') return null;
  if (node.tagName === 'SELECT') return <SelectInput node={node} engine={engine} />;
  if (type === 'date' || type === 'time') return <DateInput node={node} engine={engine} />;
  if (type === 'file') return <FileInput node={node} engine={engine} />;
  if (type === 'checkbox' || type === 'radio') return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: node.checked, disabled: node.disabled }} accessibilityLabel={clean(node.closest('label')?.textContent || (node.id && engine.document.querySelector(`label[for="${node.id}"]`)?.textContent) || node.getAttribute('name') || 'Chọn mục')} disabled={node.disabled} hitSlop={8} onPress={() => engine.change(node, !node.checked)} style={[s.checkbox, node.checked && { backgroundColor: c.teal, borderColor: c.teal }]}>{node.checked && <Icon name="check" size={17} color={c.white} />}</Pressable>;
  return <TextInput accessibilityLabel={clean(node.closest('label')?.textContent || node.getAttribute('name') || node.getAttribute('placeholder') || '')} value={node.value} onChangeText={text => engine.change(node, text)} editable={!node.disabled && !node.hasAttribute('readonly')} placeholder={node.getAttribute('placeholder') || ''} placeholderTextColor="#A2ACA7" keyboardType={type === 'number' || node.getAttribute('inputmode') === 'numeric' ? 'numeric' : type === 'email' ? 'email-address' : type === 'tel' ? 'phone-pad' : 'default'} autoCapitalize={type === 'email' ? 'none' : 'sentences'} secureTextEntry={type === 'password'} maxLength={node.getAttribute('maxlength') ? Number(node.getAttribute('maxlength')) : undefined} multiline={node.tagName === 'TEXTAREA'} textAlignVertical={node.tagName === 'TEXTAREA' ? 'top' : 'center'} style={[ui.input, node.tagName === 'TEXTAREA' && { minHeight: 110 }, node.disabled && s.disabled]} />;
}

function NativeButton({ node, engine }: Props) {
  const [busy, setBusy] = useState(false);
  const primary = has(node, 'primary') || has(node, 'warm');
  const selected = has(node, 'active') || node.getAttribute('aria-selected') === 'true';
  const glyph = node.querySelector('[data-lucide]')?.getAttribute('data-lucide');
  const label = clean(node.textContent);
  const danger = has(node, 'danger');
  async function press() {
    if (busy) return;
    setBusy(true);
    try {
      if (node.getAttribute('type') === 'submit') await engine.submit(node.form);
      else await engine.action(node.dataset.action || '', node.dataset.id || '');
    } catch { Alert.alert('Chưa hoàn tất thao tác', 'Vui lòng kiểm tra thông tin và thử lại.'); }
    finally { setBusy(false); }
  }
  return <Pressable accessibilityRole="button" accessibilityLabel={node.getAttribute('aria-label') || node.getAttribute('title') || label} accessibilityState={{ disabled: node.disabled || busy, selected }} disabled={node.disabled || busy} onPress={press} style={({ pressed }) => [primary ? ui.primary : ui.secondary, has(node, 'small') && { minHeight: 40, paddingHorizontal: 12, paddingVertical: 9 }, selected && { backgroundColor: c.soft, borderColor: c.teal }, !label && { width: 44, paddingHorizontal: 0 }, (node.disabled || busy) && s.disabled, pressed && { opacity: .7 }]}>{busy ? <ActivityIndicator size="small" color={primary ? c.white : c.teal} /> : glyph ? <Icon name={glyph} size={18} color={primary ? c.white : danger ? c.red : has(node, 'favorite-saved') ? c.red : c.teal} /> : null}{!!label && <Text style={[primary ? ui.primaryText : s.buttonText, danger && { color: c.red }]}>{label}</Text>}</Pressable>;
}

function NativeTable({ node, engine }: Props) {
  const labels: string[] = node.querySelectorAll('thead th').map((cell: NativeNode) => cell.textContent.trim());
  return <View style={{ gap: 12 }}>{node.querySelectorAll('tbody tr').map((row: NativeNode, rowIndex: number) => <View key={rowIndex} style={ui.card}>{row.children.map((cell: NativeNode, i: number) => <View key={i} style={i === 0 || !labels[i] ? { gap: 6 } : s.tableCell}>{!!labels[i] && i > 0 && <Text style={[ui.muted, { minWidth: 82, flexShrink: 1 }]}>{labels[i]}</Text>}<View style={{ flexShrink: 1, gap: 5 }}>{cell.childNodes.map((child: NativeNode, index: number) => <NativeWorkflow key={index} node={child} engine={engine} />)}</View></View>)}</View>)}</View>;
}

const inlineTags = new Set(['STRONG', 'SMALL', 'EM', 'B', 'SPAN', 'CODE', 'A', 'BR']);
function inline(node: NativeNode, key: number): React.ReactNode {
  if (node.raw.type === 'text') return node.raw.data;
  if (node.tagName === 'BR') return '\n';
  if (node.tagName === 'I') return null;
  return <Text key={key} style={[['STRONG', 'B'].includes(node.tagName) && { fontFamily: font.semibold }, node.tagName === 'SMALL' && ui.muted, has(node, 'muted') && { color: c.muted }]}>{node.childNodes.map(inline)}</Text>;
}

export function NativeWorkflow({ node, engine }: Props): React.ReactElement | null {
  if (!node || node.hidden || node.getAttribute('aria-hidden') === 'true' && node.tagName !== 'I') return null;
  if (node.raw.type === 'text') return clean(node.raw.data) ? <Text style={[ui.text, !!node.closest('.message-row.mine') && { color: c.white }]}>{node.raw.data.trim()}</Text> : null;
  const tag = node.tagName;
  if (['SCRIPT', 'STYLE', 'THEAD', 'OPTION'].includes(tag)) return null;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return <NativeInput node={node} engine={engine} />;
  if (tag === 'BUTTON' && (has(node, 'context-event') || has(node, 'context-choice'))) return <Pressable accessibilityRole="button" accessibilityLabel={clean(node.textContent)} onPress={() => engine.action(node.dataset.action, node.dataset.id || '')} style={[ui.card, ui.row, { padding: 11, gap: 10 }]}><Image source={photoSource(node.querySelector('img')?.getAttribute('src') || '')} style={{ width: 51, height: 47, borderRadius: 10 }} /><View style={{ flex: 1, gap: 4 }}><Text numberOfLines={1} style={[ui.text, { fontFamily: font.semibold, fontSize: 11 }]}>{node.querySelector('strong')?.textContent}</Text><Text style={[ui.muted, { fontSize: 10 }]}>{node.querySelector('small')?.textContent}</Text></View><Icon name="arrow-right" size={15} /></Pressable>;
  if (tag === 'BUTTON') return <NativeButton node={node} engine={engine} />;
  if (tag === 'TABLE') return <NativeTable node={node} engine={engine} />;
  if (tag === 'I') return <Icon name={node.getAttribute('data-lucide') || ''} size={19} />;
  if (tag === 'IMG') return <Image source={photoSource(node.getAttribute('src') || '')} accessibilityLabel={node.getAttribute('alt') || ''} style={has(node, 'house-proof-preview') || has(node, 'detail-image') ? s.largeImage : node.closest('.room-row') ? s.roomImage : s.largeImage} resizeMode="cover" />;
  if (tag === 'IFRAME') return <Pressable accessibilityRole="button" style={ui.primary} onPress={async () => { try { const uri = node.getAttribute('src'); if (Platform.OS === 'web') await Linking.openURL(uri); else await Sharing.shareAsync(uri, { mimeType: 'application/pdf' }); } catch { Alert.alert('Không mở được tài liệu'); } }}><Icon name="file-text" color={c.white} /><Text style={ui.primaryText}>Mở tài liệu PDF</Text></Pressable>;
  if (has(node, 'dialog-header')) return null;
  if (has(node, 'chat-contacts') && engine.state().chatMobileOpen || has(node, 'chat-pane') && !engine.state().chatMobileOpen) return null;
  if (has(node, 'chat-context')) return null;
  if (has(node, 'avatar')) return <View style={s.avatar}><Text style={s.avatarText}>{node.textContent}</Text></View>;
  if (has(node, 'pill')) { const [backgroundColor, color] = tone(node); return <View style={[ui.chip, { backgroundColor }]}><Text style={[ui.chipText, { color }]}>{node.textContent}</Text></View>; }
  if (tag === 'A') return <Pressable accessibilityRole="button" onPress={() => Linking.openURL(node.getAttribute('href') || '')}><Text style={[ui.text, { color: c.teal }]}>{node.textContent}</Text></Pressable>;
  const textOnly = ['H1', 'H2', 'H3', 'H4', 'P', 'STRONG', 'SMALL', 'SPAN', 'EM', 'CODE'].includes(tag) && node.children.every((child: NativeNode) => inlineTags.has(child.tagName) || child.tagName === 'I');
  if (textOnly) return <Text style={[ui.text, tag === 'H1' && ui.title, ['H2', 'H3', 'H4'].includes(tag) && ui.section, tag === 'SMALL' && ui.muted, tag === 'STRONG' && { fontFamily: font.semibold }, (has(node, 'muted') || has(node, 'cell-sub')) && ui.muted, has(node, 'price') && s.price, has(node, 'cell-title') && { fontFamily: font.semibold }, !!node.closest('.message-row.mine') && { color: tag === 'SMALL' ? '#B6D0C5' : c.white }]}>{node.childNodes.map(inline)}</Text>;
  const row = ['table-actions', 'form-actions', 'heading-actions', 'room-row', 'account-row', 'segmented', 'tabs', 'roommate-tabs', 'amenity-list', 'detail-info', 'chat-compose-row', 'chat-viewing-heading', 'chat-viewing-actions'].some(name => has(node, name));
  const card = ['subtle-panel', 'flat-surface', 'detail-sidebar', 'flow-banner', 'rental-summary', 'chat-viewing-card', 'roommate-row', 'notification-item', 'shared-post-card', 'kpi', 'house-verification-summary'].some(name => has(node, name));
  const isCheckbox = has(node, 'checkbox-row') || tag === 'LABEL' && !!node.querySelector('input[type="checkbox"]');
  return <View style={[s.stack, row && s.wrapRow, card && ui.card, has(node, 'page-heading') && { marginBottom: 6, gap: 10 }, has(node, 'section-bar') && { marginTop: 12, gap: 9 }, has(node, 'list-row') && s.listRow, isCheckbox && s.checkRow, has(node, 'field') && { gap: 8, marginBottom: 5 }, has(node, 'empty-state') && s.empty, has(node, 'message-row') && { alignItems: has(node, 'mine') ? 'flex-end' : 'flex-start' }, has(node, 'message-bubble') && [s.bubble, { backgroundColor: node.closest('.mine') ? c.teal : c.white }], has(node, 'chat-pane-head') && ui.card, has(node, 'chat-composer') && ui.card]}>{node.childNodes.map((child: NativeNode, index: number) => <NativeWorkflow key={index} node={child} engine={engine} />)}</View>;
}

const s = StyleSheet.create({
  stack: { gap: 10, minWidth: 0 }, wrapRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  disabled: { opacity: .45 }, buttonText: { fontFamily: font.semibold, color: c.teal, fontSize: 12, flexShrink: 1 },
  checkbox: { width: 25, height: 25, borderRadius: 7, borderWidth: 1.5, borderColor: '#C6D6CC', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, flexWrap: 'wrap' },
  fileInput: { padding: 18, gap: 8, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#AEC9BB', alignItems: 'center', backgroundColor: c.soft },
  optionBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#102F2C66' },
  optionSheet: { maxHeight: '75%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: c.white, overflow: 'hidden' },
  option: { padding: 19, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderColor: c.line },
  handle: { height: 4, width: 38, borderRadius: 5, backgroundColor: '#D9E1DB', alignSelf: 'center', marginTop: 12 },
  tableCell: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 18, borderTopWidth: 1, borderColor: c.line, paddingTop: 11 },
  avatar: { width: 42, height: 42, borderRadius: 16, backgroundColor: c.soft, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: font.bold, fontSize: 13, color: c.teal },
  largeImage: { width: '100%', height: 230, borderRadius: 18, backgroundColor: c.soft },
  roomImage: { width: 64, height: 58, borderRadius: 12, backgroundColor: c.soft },
  price: { fontFamily: font.bold, fontSize: 22, color: c.teal },
  listRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: c.line, gap: 8 },
  empty: { padding: 28, alignItems: 'center', justifyContent: 'center', minHeight: 180 },
  bubble: { backgroundColor: c.soft, padding: 14, borderRadius: 16, maxWidth: '95%' }
});
