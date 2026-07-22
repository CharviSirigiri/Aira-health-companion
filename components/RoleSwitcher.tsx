import { Radii, Shadows } from '@/constants/theme';
import { useTranslation } from '@/services/localization';
import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from './ui/icon-symbol';

interface RoleSwitcherProps {
  style?: any;
}

export function RoleSwitcher({ style }: RoleSwitcherProps = {}) {
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const isCaregiver = pathname.includes('/caregiver');
  const isDoctor = pathname.includes('/doctor');
  const isElder = !isCaregiver && !isDoctor;

  const getRoleConfig = () => {
    if (isCaregiver) {
      return {
        title: t('roleCaregiverTitle'),
        icon: 'paperplane.fill' as const,
        bg: '#FCE7F3',
        border: '#FBCFE8',
        iconColor: '#D01C8B',
        textColor: '#9D174D',
        badge: 'Caregiver',
      };
    }
    if (isDoctor) {
      return {
        title: t('roleDoctorTitle'),
        icon: 'chevron.left.forwardslash.chevron.right' as const,
        bg: '#DBEAFE',
        border: '#BFDBFE',
        iconColor: '#2563EB',
        textColor: '#1E40AF',
        badge: 'Doctor',
      };
    }
    return {
      title: t('roleElderTitle'),
      icon: 'house.fill' as const,
      bg: '#CCFBF1',
      border: '#99F6E4',
      iconColor: '#0D9488',
      textColor: '#0F766E',
      badge: 'Susan (70)',
    };
  };

  const currentRole = getRoleConfig();

  const navigateToRole = (role: 'elder' | 'caregiver' | 'doctor') => {
    setModalVisible(false);
    if (role === 'elder') {
      router.replace('/' as any);
    } else if (role === 'caregiver') {
      router.replace('/caregiver' as any);
    } else if (role === 'doctor') {
      router.replace('/doctor' as any);
    }
  };

  return (
    <>
      {/* Strategic Profile Switcher Pill Button */}
      <TouchableOpacity
        style={[
          styles.switcherPill,
          { backgroundColor: currentRole.bg, borderColor: currentRole.border },
          !style && { top: Math.max(insets.top + 8, 16), right: 16, position: 'absolute' },
          style,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <View style={styles.leftPillContent}>
          <View style={styles.statusDot} />
          <IconSymbol name={currentRole.icon} size={15} color={currentRole.iconColor} />
          <Text style={[styles.roleNameText, { color: currentRole.textColor }]} numberOfLines={1}>
            {currentRole.title}
          </Text>
        </View>
        <View style={[styles.chevronBadge, { backgroundColor: 'rgba(255,255,255,0.6)' }]}>
          <IconSymbol name="chevron.down" size={14} color={currentRole.iconColor} />
        </View>
      </TouchableOpacity>

      {/* Role Selection Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.modalIconBadge}>
                  <IconSymbol name="person.crop.circle.badge.exclamationmark" size={20} color="#0D9488" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{t('switchTitle')}</Text>
                  <Text style={styles.modalSub}>{t('switchSub')}</Text>
                </View>
              </View>
            </View>

            {/* Elder Role Card */}
            <TouchableOpacity
              style={[styles.roleCard, isElder && styles.activeElderCard]}
              onPress={() => navigateToRole('elder')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#CCFBF1' }]}> 
                <IconSymbol name="house.fill" size={22} color="#0D9488" />
              </View>
              <View style={styles.roleInfo}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.roleTitle}>{t('roleElderTitle')}</Text>
                  <Text style={[styles.roleBadgeTag, { backgroundColor: '#CCFBF1', color: '#0F766E' }]}>Susan (70)</Text>
                </View>
                <Text style={styles.roleDescription}>{t('roleElderDesc')}</Text>
              </View>
              {isElder && <View style={[styles.activeIndicator, { backgroundColor: '#0D9488' }]} />}
            </TouchableOpacity>

            {/* Caregiver Role Card */}
            <TouchableOpacity
              style={[styles.roleCard, isCaregiver && styles.activeCaregiverCard]}
              onPress={() => navigateToRole('caregiver')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FCE7F3' }]}> 
                <IconSymbol name="paperplane.fill" size={22} color="#D01C8B" />
              </View>
              <View style={styles.roleInfo}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.roleTitle}>{t('roleCaregiverTitle')}</Text>
                </View>
                <Text style={styles.roleDescription}>{t('roleCaregiverDesc')}</Text>
              </View>
              {isCaregiver && <View style={[styles.activeIndicator, { backgroundColor: '#D01C8B' }]} />}
            </TouchableOpacity>

            {/* Doctor Role Card */}
            <TouchableOpacity
              style={[styles.roleCard, isDoctor && styles.activeDoctorCard]}
              onPress={() => navigateToRole('doctor')}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}> 
                <IconSymbol name="chevron.left.forwardslash.chevron.right" size={22} color="#2563EB" />
              </View>
              <View style={styles.roleInfo}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.roleTitle}>{t('roleDoctorTitle')}</Text>
                  <Text style={[styles.roleBadgeTag, { backgroundColor: '#DBEAFE', color: '#1E40AF' }]}>Clinical EHR</Text>
                </View>
                <Text style={styles.roleDescription}>{t('roleDoctorDesc')}</Text>
              </View>
              {isDoctor && <View style={[styles.activeIndicator, { backgroundColor: '#2563EB' }]} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  switcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    maxWidth: 190,
    ...Shadows.sm,
    zIndex: 9999,
  },
  leftPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  roleNameText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  chevronBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: Radii.xl,
    padding: 24,
    ...Shadows.lg,
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconBadge: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    backgroundColor: '#CCFBF1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radii.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  activeElderCard: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  activeCaregiverCard: {
    borderColor: '#D01C8B',
    backgroundColor: '#FDF2F8',
  },
  activeDoctorCard: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleInfo: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleBadgeTag: {
    fontSize: 10,
    fontWeight: '800',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radii.full,
    textTransform: 'uppercase',
  },
  roleDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 6,
    borderRadius: Radii.md,
    backgroundColor: '#F1F5F9',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
});
