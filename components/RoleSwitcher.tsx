import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { IconSymbol } from './ui/icon-symbol';
import { useTranslation } from '@/services/localization';

export function RoleSwitcher() {
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const getRoleName = () => {
    if (pathname.includes('/caregiver')) return t('roleCaregiverTitle');
    if (pathname.includes('/doctor')) return t('roleDoctorTitle');
    return t('roleElderTitle');
  };

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
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <IconSymbol name="person.crop.circle.badge.exclamationmark" size={20} color="#fff" />
        <Text style={styles.buttonText}>{getRoleName()}</Text>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('switchTitle')}</Text>
            <Text style={styles.modalSub}>{t('switchSub')}</Text>

            <TouchableOpacity
              style={[styles.roleCard, pathname === '/' && styles.activeCard]}
              onPress={() => navigateToRole('elder')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#E6F4FE' }]}>
                <IconSymbol name="house.fill" size={24} color="#0070F3" />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>{t('roleElderTitle')}</Text>
                <Text style={styles.roleDescription}>{t('roleElderDesc')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, pathname.includes('/caregiver') && styles.activeCard]}
              onPress={() => navigateToRole('caregiver')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#FDF2F8' }]}>
                <IconSymbol name="paperplane.fill" size={24} color="#D01C8B" />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>{t('roleCaregiverTitle')}</Text>
                <Text style={styles.roleDescription}>{t('roleCaregiverDesc')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleCard, pathname.includes('/doctor') && styles.activeCard]}
              onPress={() => navigateToRole('doctor')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
                <IconSymbol name="chevron.left.forwardslash.chevron.right" size={24} color="#10B981" />
              </View>
              <View style={styles.roleInfo}>
                <Text style={styles.roleTitle}>{t('roleDoctorTitle')}</Text>
                <Text style={styles.roleDescription}>{t('roleDoctorDesc')}</Text>
              </View>
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
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4.84,
    elevation: 5,
    zIndex: 9999,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 20,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeCard: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
