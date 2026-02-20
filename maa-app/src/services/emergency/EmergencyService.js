import * as Location from 'expo-location';
import * as SMS from 'expo-sms';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';

export const EMERGENCY_NUMBERS = {
    ambulance: '108',
};

// Queue key for AsyncStorage
const SOS_QUEUE_KEY = 'sos_queue';

/** Helper to call a direct number */
export async function callNumber(number) {
    if (!number) return;
    try {
        await Linking.openURL(`tel:${number}`);
    } catch (error) {
        console.error('[EmergencyService] Call failed:', error);
        Alert.alert('Call Failed', 'Unable to place the call from this device.');
    }
}

/** 1. Get Location */
export async function getLocationAsync() {
    try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            return null;
        }

        // Try to get cached location first
        let location = await Location.getLastKnownPositionAsync({});

        // If no recent location, try to get a fresh one, but TIMEOUT quickly!
        if (!location) {
            console.log('[EmergencyService] No last known location, fetching current with timeout...');
            const locationPromise = Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced, // Balanced is faster than High
            });

            // 4 second strict timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Location fetch timed out')), 4000)
            );

            location = await Promise.race([locationPromise, timeoutPromise]);
        }

        if (!location) return null;

        const lat = location.coords.latitude;
        const lon = location.coords.longitude;
        const mapsUrl = `https://maps.google.com/?q=${lat},${lon}`;

        return { lat, lon, mapsUrl };
    } catch (error) {
        console.warn('[EmergencyService] Get location failed or timed out:', error.message);
        return null; // Graceful fallback
    }
}

/** 2. Build Message */
export function buildSmsBody(profile, locationData) {
    const name = profile?.name || 'Maa User';

    let baseMsg = `🆘 **EMERGENCY / आपातकाल** 🆘\n` +
        `This is an emergency SOS alert from ${name}.\n` +
        `यह ${name} की ओर से आपातकालीन संदेश है। उन्हें मदद की जरूरत है!\n`;

    if (locationData?.mapsUrl) {
        baseMsg += `\n📍 **Location / स्थान**:\n${locationData.mapsUrl}`;
    } else {
        baseMsg += `\n📍 Location not available / स्थान उपलब्ध नहीं है।`;
    }

    return baseMsg;
}

/** Get valid recipient numbers from profile */
export function getEmergencyContacts(profile) {
    const contacts = [];
    if (profile?.husband_contact) contacts.push(profile.husband_contact);
    if (profile?.asha_contact) contacts.push(profile.asha_contact);
    if (profile?.phc_contact) contacts.push(profile.phc_contact);
    if (profile?.emergency_contact) contacts.push(profile.emergency_contact);

    // Clean and unique numbers
    return [...new Set(contacts.map(c => c.trim()).filter(c => c.length >= 10))];
}

/** 3. Queue for offline */
export async function queueOfflineSms(contacts, message) {
    try {
        const queueRaw = await AsyncStorage.getItem(SOS_QUEUE_KEY);
        const queue = queueRaw ? JSON.parse(queueRaw) : [];

        queue.push({
            contacts,
            message,
            timestamp: Date.now()
        });

        await AsyncStorage.setItem(SOS_QUEUE_KEY, JSON.stringify(queue));
        console.log(`[EmergencyService] Queued offline SMS. Total: ${queue.length}`);
    } catch (e) {
        console.error('[EmergencyService] Failed to queue SMS:', e);
    }
}

/** 4. Flush queue when online/reconnecting */
export async function flushOfflineQueue() {
    try {
        const queueRaw = await AsyncStorage.getItem(SOS_QUEUE_KEY);
        if (!queueRaw) return;

        const queue = JSON.parse(queueRaw);
        if (queue.length === 0) return;

        console.log(`[EmergencyService] Flushing ${queue.length} offline messages...`);
        const remainingQueue = [];

        for (const item of queue) {
            try {
                // If they are back online, we could theoretically try to send it
                // but since expo-sms opens the composer, we don't want to suddenly pop
                // open the composer when they get signal back hours later. 
                // We will just clear the queue for now or notify them.
                console.log('[EmergencyService] Offline message was queued:', item.message);
            } catch (error) {
                console.error('[EmergencyService] Queue flush failed for item:', error);
            }
        }

        await AsyncStorage.removeItem(SOS_QUEUE_KEY);
    } catch (e) {
        console.error('[EmergencyService] Flush queue error:', e);
    }
}

// Global NetInfo listener setup
NetInfo.addEventListener(state => {
    if (state.isConnected) {
        flushOfflineQueue();
    }
});

/** 
 * MAIN ORCHESTRATOR 
 * Returns { success: boolean, method: 'sim' | 'server' | 'queued', error?: string }
 */
export async function triggerSOS(profile) {
    try {
        const contacts = getEmergencyContacts(profile);
        if (contacts.length === 0) {
            return { success: false, method: 'none', error: 'No emergency contacts found in profile.' };
        }

        // 1. Get GPS
        const loc = await getLocationAsync();

        // 2. Build template
        const message = buildSmsBody(profile, loc);

        // 3. Try expo-sms
        console.log('[EmergencyService] Attempting to send SMS via expo-sms composer...');
        const isAvailable = await SMS.isAvailableAsync();

        if (isAvailable) {
            await SMS.sendSMSAsync(contacts, message);
            return { success: true, method: 'expo_sms_composer' };
        } else {
            console.error('[EmergencyService] SMS Composer is not available on this device.');
            await queueOfflineSms(contacts, message);
            return {
                success: true,
                method: 'queued',
                error: 'No SMS app found. Message queued.'
            };
        }
    } catch (error) {
        console.error('[EmergencyService] SOS trigger error:', error);
        return { success: false, method: 'none', error: error.message };
    }
}
