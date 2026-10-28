import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { c } from './theme';

const icons: Record<string, string> = {
  search: 'search-outline', heart: 'heart-outline', 'message-circle': 'chatbubble-ellipses-outline',
  'calendar-days': 'calendar-outline', 'calendar-plus': 'calendar-outline', 'calendar-check': 'calendar-outline',
  'file-text': 'document-text-outline', receipt: 'receipt-outline', users: 'people-outline', 'user-round': 'person-outline',
  'layout-dashboard': 'grid-outline', 'building-2': 'business-outline', 'plug-zap': 'flash-outline',
  'panel-top': 'newspaper-outline', 'contact-round': 'people-outline', 'badge-check': 'shield-checkmark-outline',
  bell: 'notifications-outline', x: 'close', plus: 'add', check: 'checkmark',
  'arrow-left': 'arrow-back', 'arrow-right': 'arrow-forward', 'chevron-down': 'chevron-down',
  'key-round': 'key-outline', pencil: 'create-outline', send: 'send-outline',
  'map-pin': 'location-outline', 'sliders-horizontal': 'options-outline', 'rotate-ccw': 'refresh-outline',
  'refresh-cw': 'refresh-outline', 'repeat-2': 'swap-horizontal-outline', 'git-branch': 'git-branch-outline',
  'shield-check': 'shield-checkmark-outline', star: 'star-outline', flag: 'flag-outline',
  download: 'download-outline', save: 'save-outline', inbox: 'file-tray-outline',
  'share-2': 'share-social-outline', 'external-link': 'open-outline', 'heart-handshake': 'heart-outline',
  'scroll-text': 'list-outline', database: 'server-outline', menu: 'menu-outline', more: 'apps-outline',
  home: 'home-outline', bed: 'bed-outline', sparkles: 'sparkles-outline', 'arrow-up-right': 'arrow-forward-outline'
};
export function Icon({ name, size = 22, color = c.teal }: { name: string; size?: number; color?: string }) {
  return <Ionicons name={(icons[name] || 'ellipse-outline') as any} size={size} color={color} />;
}
