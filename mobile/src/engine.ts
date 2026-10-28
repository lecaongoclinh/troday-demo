import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { createRuntime } from './runtime/runtime.cjs';

export const STATE_KEY = '@troday/mobile/state/v1';
const FILE_KEY = '@troday/mobile/proofs/v1';
export type Role = 'tenant' | 'landlord';
export type NativeNode = any;
export type Engine = ReturnType<typeof createRuntime>;

export async function loadEngine(onError: (message: string) => void): Promise<Engine> {
  const saved = await AsyncStorage.getItem(STATE_KEY);
  let writeQueue: Promise<unknown> = Promise.resolve();
  const files: Record<string, any> = JSON.parse(await AsyncStorage.getItem(FILE_KEY) || '{}');
  const persistFiles = () => AsyncStorage.setItem(FILE_KEY, JSON.stringify(files));
  const engine = createRuntime({
    savedState: saved,
    onPersist(value: string) {
      writeQueue = writeQueue.then(() => AsyncStorage.setItem(STATE_KEY, value)).catch(() => onError('Chưa lưu được dữ liệu trên thiết bị. Hãy kiểm tra dung lượng.'));
    },
    proofStore: {
      async save(entries: any[], ownerId: string) {
        const created: string[] = [];
        try {
          const result = [];
          for (const { file, documentType } of entries) {
            const id = `proof-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const uri = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}` : file.uri;
            if (FileSystem.documentDirectory) await FileSystem.copyAsync({ from: file.uri, to: uri });
            files[id] = { id, ownerId, documentType, name: file.name, size: file.size, type: file.type, uri };
            created.push(id); result.push({ ...files[id], uri: undefined });
          }
          await persistFiles(); return result;
        } catch (error) {
          for (const id of created) { if (files[id]?.uri && Platform.OS !== 'web') await FileSystem.deleteAsync(files[id].uri, { idempotent: true }).catch(() => {}); delete files[id]; }
          await persistFiles(); throw error;
        }
      },
      async get(id: string) { return files[id] ? { ...files[id], blob: { uri: files[id].uri } } : null; },
      async remove(ids: string[]) {
        for (const id of ids) { if (files[id]?.uri && Platform.OS !== 'web') await FileSystem.deleteAsync(files[id].uri, { idempotent: true }); delete files[id]; }
        await persistFiles();
      }
    },
    async onExport(blob: { text(): Promise<string> }, name: string) {
      try {
        const content = await blob.text();
        if (Platform.OS === 'web') {
          const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
          const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
        } else {
          const uri = `${FileSystem.cacheDirectory}${name}`;
          await FileSystem.writeAsStringAsync(uri, content);
          await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Xuất danh sách cư trú' });
        }
      } catch { onError('Không xuất được danh sách. Vui lòng thử lại.'); }
    }
  });
  return engine;
}

export function money(value: number) { return new Intl.NumberFormat('vi-VN').format(value || 0) + ' đ'; }
export function compactMoney(value: number) { return (value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' triệu'; }
