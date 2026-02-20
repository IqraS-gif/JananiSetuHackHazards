/**
 * ImageService.js
 * Maa App – Service for fetching food images via SerpApi and caching in SQLite.
 */

import { API_CONFIG } from '../constants';
import { updateFoodImage } from './database/DatabaseService';

const SERPAPI_URL = 'https://serpapi.com/search.json';

/**
 * Clean food name for better search results.
 */
function cleanFoodName(name) {
    return name
        .replace(/\(.*\)/g, '')
        .replace(/[0-9%().]/g, '')
        .trim();
}

/**
 * Fetch a high-quality food image URL from SerpApi.
 * @param {string} foodNameEn 
 * @param {string} foodNameHi
 */
export async function fetchFoodImageFromSerp(foodNameEn, foodNameHi) {
    if (!API_CONFIG.SERPAPI_KEY) {
        console.warn('[ImageService] ⚠️ SerpApi key missing in API_CONFIG!');
        return null;
    }

    const cleanEn = cleanFoodName(foodNameEn);
    const cleanHi = foodNameHi ? foodNameHi.split(',')[0].trim() : '';

    console.log(`[ImageService] 🌐 Starting SerpApi search for: "${cleanEn}" / "${cleanHi}"`);

    // Try multiple query variations
    const queryVariations = [
        `${cleanEn} ${cleanHi} Indian dish food`.trim(),
        `${cleanEn} food recipe`.trim(),
    ].filter(q => q.length > 5);

    for (const query of queryVariations) {
        try {
            console.log(`[ImageService] 🔍 Querying SerpApi: "${query}"`);
            const params = new URLSearchParams({
                engine: 'google_images',
                q: query,
                api_key: API_CONFIG.SERPAPI_KEY,
                num: '3',
                gl: 'in',
                safe: 'active'
            });

            const response = await fetch(`${SERPAPI_URL}?${params.toString()}`);
            const data = await response.json();

            if (data.images_results && data.images_results.length > 0) {
                const url = data.images_results[0].thumbnail || data.images_results[0].original;
                console.log(`[ImageService] ✨ Found image for "${query}": ${url.substring(0, 50)}...`);
                return url;
            }
            console.log(`[ImageService] 😶 No results for query: "${query}"`);
        } catch (error) {
            console.error(`[ImageService] ❌ Error for query "${query}":`, error);
        }
    }
    console.warn(`[ImageService] 🛑 All variations failed for: ${foodNameEn}`);
    return null;
}

/**
 * Get image URL for a food item. Checks cache first, otherwise fetches and updates cache.
 * Now strictly downloads and stores images in local FileSystem.
 * @param {object} food 
 */
export async function getAndCacheFoodImage(food) {
    const FileSystem = require('expo-file-system/legacy');
    
    // 1. Return immediately if it's already a saved local file
    if (food.image_path && food.image_path.startsWith('file://')) {
        // Quick verification it exists
        const fileInfo = await FileSystem.getInfoAsync(food.image_path);
        if (fileInfo.exists) {
            console.log(`[ImageService] 🟢 Local Cache HIT for ${food.name_en}`);
            return food.image_path;
        }
        console.log(`[ImageService] 🟡 Local file missing, need to re-fetch: ${food.name_en}`);
    }

    console.log(`[ImageService] 🟡 Fetching & Caching locally for ${food.name_en}...`);

    let sourceUrl = null;
    let isFresh = false;

    // 2. If we have an HTTP URL in DB but it's not downloaded yet
    if (food.image_path && food.image_path.startsWith('http')) {
        sourceUrl = food.image_path;
    } else {
        // 3. Otherwise fetch a new one from SerpApi
        sourceUrl = await fetchFoodImageFromSerp(food.name_en, food.name_hi);
        isFresh = true;
    }

    if (sourceUrl) {
        // 4. Download forcefully to local app storage
        try {
            const ext = sourceUrl.split('.').pop().split('?')[0] || 'jpg';
            const fileName = `food_img_${food.id}_${Date.now()}.${ext.length > 4 ? 'jpg' : ext}`;
            const localUri = `${FileSystem.documentDirectory}${fileName}`;
            
            console.log(`[ImageService] 📥 Downloading to local storage: ${food.name_en}`);
            
            let downloaded = await FileSystem.downloadAsync(sourceUrl, localUri);
            
            // 5. If the cached DB URL is dead (e.g. 404/403), fetch a FRESH image!
            if (downloaded.status !== 200 && !isFresh) {
                console.warn(`[ImageService] ⚠️ Cached URL dead (${downloaded.status}) for ${food.name_en}. Fetching fresh!`);
                try { await FileSystem.deleteAsync(localUri, { idempotent: true }); } catch (e) {}
                
                sourceUrl = await fetchFoodImageFromSerp(food.name_en, food.name_hi);
                if (sourceUrl) {
                    const freshLocalUri = `${FileSystem.documentDirectory}food_img_${food.id}_fresh_${Date.now()}.jpg`;
                    downloaded = await FileSystem.downloadAsync(sourceUrl, freshLocalUri);
                }
            }
            
            if (downloaded && downloaded.status === 200) {
                // Save the local file:// path to database so it's permanently offline
                await updateFoodImage(food.id, downloaded.uri);
                console.log(`[ImageService] ✅ Successfully stored locally: ${food.name_en}`);
                return downloaded.uri;
            } else {
                console.warn(`[ImageService] ⚠️ Final download failed. Falling back to HTTP.`);
                return sourceUrl; // Fallback to the HTTP URL if local saving failed
            }
        } catch (e) {
            console.error(`[ImageService] ❌ Local storage cache failed for ${food.id}:`, e);
            return sourceUrl; // Fallback to HTTP if local save fails
        }
    }

    console.warn(`[ImageService] 🟠 No image could be found/cached for ${food.name_en}`);
    return null;
}
