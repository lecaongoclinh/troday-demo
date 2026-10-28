import { StyleSheet } from 'react-native';

export const c = {
  ink: '#1A302D', muted: '#7C8987', teal: '#145C50', dark: '#104B42', lime: '#D9EEA1',
  soft: '#EAF2EE', page: '#F7F8FA', line: '#E8EDEA', white: '#FFFFFF', coral: '#C67A59',
  peach: '#F7EBE2', red: '#B44E51', redSoft: '#FAE9E9', yellow: '#FBF1D5', blue: '#E9EFF8'
};
export const font = { regular: 'BeVietnamPro_400Regular', medium: 'BeVietnamPro_500Medium', semibold: 'BeVietnamPro_600SemiBold', bold: 'BeVietnamPro_700Bold', heavy: 'BeVietnamPro_800ExtraBold' };
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.page },
  body: { padding: 20, paddingBottom: 30, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontFamily: font.bold, fontSize: 24, lineHeight: 34, color: c.ink, letterSpacing: -.7 },
  section: { fontFamily: font.bold, fontSize: 18, lineHeight: 27, color: c.ink, letterSpacing: -.4 },
  text: { fontFamily: font.regular, fontSize: 13, lineHeight: 21, color: c.ink },
  muted: { fontFamily: font.regular, fontSize: 12, lineHeight: 20, color: c.muted },
  eyebrow: { fontFamily: font.semibold, fontSize: 10, letterSpacing: 1.5, color: c.muted },
  card: { backgroundColor: c.white, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: c.line, gap: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.soft },
  primary: { minHeight: 48, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: c.teal, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  primaryText: { color: c.white, fontFamily: font.semibold, fontSize: 13 },
  secondary: { minHeight: 44, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  input: { backgroundColor: c.white, borderWidth: 1, borderColor: '#DDE6E1', borderRadius: 13, paddingHorizontal: 14, minHeight: 50, paddingVertical: 12, fontFamily: font.regular, fontSize: 14, color: c.ink },
  chip: { borderRadius: 8, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5, backgroundColor: c.soft },
  chipText: { fontFamily: font.semibold, color: c.teal, fontSize: 10 },
});
