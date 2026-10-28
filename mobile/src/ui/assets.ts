import type { ImageSourcePropType } from 'react-native';
const photos: Record<string, ImageSourcePropType> = {
  r1: require('../../../assets/r1.webp'), r2: require('../../../assets/r2.webp'),
  r3: require('../../../assets/r3.webp'), r4: require('../../../assets/r4.webp'),
  r5: require('../../../assets/r5.webp'), r6: require('../../../assets/r6.webp')
};
export function photoSource(value: string): ImageSourcePropType {
  const match = /assets\/(r[1-6])\.(webp|png)/.exec(value || '');
  return match ? photos[match[1]] : value ? { uri: value } : photos.r1;
}
