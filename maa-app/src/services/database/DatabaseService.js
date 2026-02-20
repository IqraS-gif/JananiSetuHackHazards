/**
 * DatabaseService.js
 * Maa App – Comprehensive SQLite database service
 * Provides all CRUD operations, initialization, and seeding.
 */

import * as SQLite from 'expo-sqlite';
import foodsData from '../../../database/seed-data/foods.json';
import requirementsData from '../../../database/seed-data/requirements.json';
import { ANCSchedule } from '../../constants';

const DB_NAME = 'maa_app_fresh.db';
let db = null;
let dbPromise = null;

/**
 * Opens (or creates) the database and returns the connection.
 * Uses a promise-based singleton pattern to avoid race conditions.
 */
export async function getDatabase() {
    if (db) return db;
    if (dbPromise) return dbPromise;

    console.log('[DB] Opening database...');
    dbPromise = (async () => {
        try {
            const database = await SQLite.openDatabaseAsync(DB_NAME);
            db = database;
            console.log('[DB] Database opened successfully');
            return database;
        } catch (e) {
            console.error("[DB] Failed to open database:", e);
            dbPromise = null; // Reset on failure
            throw e;
        }
    })();

    return dbPromise;
}

/**
 * Full initialization: create tables → seed data.
 * Safe to call multiple times – uses IF NOT EXISTS.
 */
export async function initDatabase() {
    try {
        console.log('[DB] Starting initialization...');
        const database = await getDatabase();
        console.log('[DB] Database opened');
        await createTables(database);
        console.log('[DB] Tables created');

        // Migration: Add report_uri column to vitals_logs and weight_tracking if missing
        try {
            await database.runAsync('ALTER TABLE vitals_logs ADD COLUMN report_uri TEXT');
            console.log('[DB] Added report_uri to vitals_logs');
        } catch (e) { /* already exists */ }
        try {
            await database.runAsync('ALTER TABLE vitals_logs ADD COLUMN hba1c REAL');
        } catch (e) { /* already exists */ }
        try {
            await database.runAsync('ALTER TABLE vitals_logs ADD COLUMN fbs REAL');
        } catch (e) { /* already exists */ }
        try {
            await database.runAsync('ALTER TABLE vitals_logs ADD COLUMN ppbs REAL');
        } catch (e) { /* already exists */ }
        try {
            await database.runAsync('ALTER TABLE vitals_logs ADD COLUMN age INTEGER');
        } catch (e) { /* already exists */ }
        try {
            await database.runAsync('ALTER TABLE vitals_logs ADD COLUMN gender TEXT');
            console.log('[DB] Added diabetes columns to vitals_logs');
        } catch (e) { /* already exists */ }
        try {
            await database.runAsync('ALTER TABLE weight_tracking ADD COLUMN report_uri TEXT');
            console.log('[DB] Added report_uri to weight_tracking');
        } catch (e) { /* already exists */ }

        // MIGRATION: Multi-patient support for Doctor/ASHA module
        const tablesToUpdate = ['vitals_logs', 'weight_tracking', 'symptom_logs', 'kick_logs', 'swelling_log'];
        for (const table of tablesToUpdate) {
            try {
                await database.runAsync(`ALTER TABLE ${table} ADD COLUMN patient_id TEXT DEFAULT 'user_001'`);
                console.log(`[DB] Added patient_id to ${table}`);
            } catch (e) { /* already exists */ }
        }

        // NEW TABLE: Doctor Instructions
        await database.runAsync(`
            CREATE TABLE IF NOT EXISTS doctor_instructions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                doctor_id TEXT,
                instruction TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('[DB] Doctor instructions table ready');

        await seedFoodData(database);
        console.log('[DB] Foods seeded');
        await seedNutritionRequirements(database);
        console.log('[DB] Requirements seeded');
        await seedANCSchedule(database);
        console.log('[DB] ANC seeded');
        await seedSupplementSchedule(database);
        console.log('[DB] Supplements seeded');
        console.log('[DB] Database initialized successfully');
        return database;
    } catch (error) {
        console.error('[DB] Initialization error:', error);
        throw error;
    }
}

/**
 * Create all tables – SINGLE runAsync calls per table
 */
async function createTables(database) {
    const run = async (sql) => {
        await database.runAsync(sql);
    };

    await run(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age INTEGER,
        lmp_date TEXT,
        due_date TEXT,
        pregnancy_week INTEGER,
        height_cm REAL,
        start_weight_kg REAL,
        current_weight_kg REAL,
        language TEXT DEFAULT 'hi',
        asha_contact TEXT,
        emergency_contact TEXT,
        husband_contact TEXT,
        phc_contact TEXT,
        ration_category TEXT,
        nfsa_status INTEGER DEFAULT 0,
        state TEXT,
        jdy_bank INTEGER DEFAULT 0,
        aadhaar_linked INTEGER DEFAULT 0,
        pmmvy_claimed TEXT,
        jsy_registered INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS foods (
        id TEXT PRIMARY KEY,
        name_en TEXT NOT NULL,
        name_hi TEXT,
        calories REAL,
        protein REAL,
        carbs REAL,
        fats REAL,
        fiber REAL,
        iron REAL,
        calcium REAL,
        folate REAL,
        vitamin_a REAL,
        vitamin_c REAL,
        category TEXT,
        safety_status TEXT DEFAULT 'safe',
        image_path TEXT,
        source TEXT DEFAULT 'app'
      )
    `);

    await run('CREATE INDEX IF NOT EXISTS idx_foods_name_en ON foods(name_en)');
    await run('CREATE INDEX IF NOT EXISTS idx_foods_name_hi ON foods(name_hi)');
    await run('CREATE INDEX IF NOT EXISTS idx_foods_category ON foods(category)');

    await run(`
      CREATE TABLE IF NOT EXISTS meal_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meal_type TEXT,
        log_date TEXT DEFAULT (date('now')),
        log_time TEXT DEFAULT (time('now')),
        total_calories REAL,
        total_protein REAL,
        total_iron REAL,
        total_calcium REAL,
        total_folate REAL,
        total_carbs REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS meal_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meal_log_id INTEGER,
        food_id TEXT,
        quantity_g REAL,
        portion_multiplier REAL DEFAULT 1.0,
        calories REAL,
        protein REAL,
        iron REAL,
        calcium REAL,
        folate REAL,
        carbs REAL DEFAULT 0,
        FOREIGN KEY (meal_log_id) REFERENCES meal_logs(id),
        FOREIGN KEY (food_id) REFERENCES foods(id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS daily_summary (
        date TEXT PRIMARY KEY,
        total_calories REAL DEFAULT 0,
        total_protein REAL DEFAULT 0,
        total_iron REAL DEFAULT 0,
        total_calcium REAL DEFAULT 0,
        total_folate REAL DEFAULT 0,
        total_carbs REAL DEFAULT 0,
        water_glasses INTEGER DEFAULT 0,
        supplements_taken INTEGER DEFAULT 0,
        mood TEXT,
        symptoms TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS supplement_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplement_type TEXT,
        taken_at TEXT DEFAULT CURRENT_TIMESTAMP,
        date TEXT DEFAULT (date('now'))
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS supplement_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplement_type TEXT,
        frequency_per_day INTEGER,
        start_week INTEGER,
        end_week INTEGER,
        details_en TEXT,
        details_hi TEXT
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS weight_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT DEFAULT (date('now')),
        weight_kg REAL,
        week_of_pregnancy INTEGER,
        notes TEXT,
        report_uri TEXT
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS nutrition_requirements (
        trimester INTEGER PRIMARY KEY,
        min_calories REAL,
        min_protein REAL,
        min_iron REAL,
        min_calcium REAL,
        min_folate REAL,
        hydration_liters REAL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS anc_schedule (
        visit_number INTEGER PRIMARY KEY,
        recommended_week INTEGER,
        description_en TEXT,
        description_hi TEXT,
        checkups_list TEXT,
        is_completed INTEGER DEFAULT 0,
        completed_date TEXT,
        notes TEXT
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS kick_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        count INTEGER NOT NULL,
        duration_min INTEGER,
        date TEXT DEFAULT (date('now')),
        time TEXT DEFAULT (time('now')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS symptom_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symptom_id TEXT NOT NULL,
        severity TEXT, -- mild, moderate, severe
        notes TEXT,
        date TEXT DEFAULT (date('now')),
        time TEXT DEFAULT (time('now')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS vitals_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        systolic INTEGER,
        diastolic INTEGER,
        blood_sugar REAL,
        pulse INTEGER,
        notes TEXT,
        report_uri TEXT,
        hba1c REAL,
        fbs REAL,
        ppbs REAL,
        age INTEGER,
        gender TEXT,
        date TEXT DEFAULT (date('now')),
        time TEXT DEFAULT (time('now')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS eye_assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        risk_level TEXT,
        risk_score REAL,
        confidence REAL,
        method TEXT,
        age REAL,
        family_history INTEGER,
        log_mar REAL,
        log_cs REAL,
        vfi REAL,
        amsler_distortion INTEGER,
        recommendations TEXT,
        assessed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS swelling_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        risk_level TEXT NOT NULL,
        swelling_level TEXT,
        preeclampsia_flag INTEGER DEFAULT 0,
        recommendation_en TEXT,
        recommendation_hi TEXT,
        observations_json TEXT,
        confidence REAL DEFAULT 0.5,
        scanned_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS visit_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id TEXT NOT NULL,
        visit_date TEXT DEFAULT (date('now')),
        raw_notes TEXT,
        summary_json TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // MIGRATIONS
    try {
        const tableInfo = await database.getAllAsync("PRAGMA table_info(foods)");
        const hasSource = tableInfo.some(col => col.name === 'source');
        if (!hasSource) {
            console.log('[DB] Migrating: Adding source column to foods table');
            await run('ALTER TABLE foods ADD COLUMN source TEXT DEFAULT "app"');
        }

        const ancInfo = await database.getAllAsync("PRAGMA table_info(anc_schedule)");
        const hasReport = ancInfo.some(col => col.name === 'report_uri');
        if (!hasReport) {
            console.log('[DB] Migrating: Adding report_uri column to anc_schedule');
            await run('ALTER TABLE anc_schedule ADD COLUMN report_uri TEXT');
        }

        const hasImagePath = tableInfo.some(col => col.name === 'image_path');
        if (!hasImagePath) {
            console.log('[DB] Migrating: Adding image_path column to foods table');
            await run('ALTER TABLE foods ADD COLUMN image_path TEXT');
        }

        const mealLogInfo = await database.getAllAsync("PRAGMA table_info(meal_logs)");
        const hasMealCarbs = mealLogInfo.some(col => col.name === 'total_carbs');
        if (!hasMealCarbs) {
            console.log('[DB] Migrating: Adding total_carbs to meal_logs');
            await run('ALTER TABLE meal_logs ADD COLUMN total_carbs REAL DEFAULT 0');
        }

        const mealItemInfo = await database.getAllAsync("PRAGMA table_info(meal_items)");
        const hasItemCarbs = mealItemInfo.some(col => col.name === 'carbs');
        if (!hasItemCarbs) {
            console.log('[DB] Migrating: Adding carbs to meal_items');
            await run('ALTER TABLE meal_items ADD COLUMN carbs REAL DEFAULT 0');
        }

        const summaryInfo = await database.getAllAsync("PRAGMA table_info(daily_summary)");
        const hasSummaryCarbs = summaryInfo.some(col => col.name === 'total_carbs');
        if (!hasSummaryCarbs) {
            console.log('[DB] Migrating: Adding total_carbs to daily_summary');
            await run('ALTER TABLE daily_summary ADD COLUMN total_carbs REAL DEFAULT 0');
        }

        const userInfo = await database.getAllAsync("PRAGMA table_info(user_profile)");
        const hasHba1c = userInfo.some(col => col.name === 'hba1c');
        if (!hasHba1c) {
            console.log('[DB] Migrating: Adding hba1c to user_profile');
            await run('ALTER TABLE user_profile ADD COLUMN hba1c REAL DEFAULT 5.4');
        }

        const hasHusbandContact = userInfo.some(col => col.name === 'husband_contact');
        if (!hasHusbandContact) {
            console.log('[DB] Migrating: Adding husband_contact to user_profile');
            await run('ALTER TABLE user_profile ADD COLUMN husband_contact TEXT');
        }

        const hasPhcContact = userInfo.some(col => col.name === 'phc_contact');
        if (!hasPhcContact) {
            console.log('[DB] Migrating: Adding phc_contact to user_profile');
            await run('ALTER TABLE user_profile ADD COLUMN phc_contact TEXT');
        }

        const hasRationCategory = userInfo.some(col => col.name === 'ration_category');
        if (!hasRationCategory) {
            console.log('[DB] Migrating: Adding ration and entitlement columns to user_profile');
            await run('ALTER TABLE user_profile ADD COLUMN ration_category TEXT');
            await run('ALTER TABLE user_profile ADD COLUMN nfsa_status INTEGER DEFAULT 0');
            await run('ALTER TABLE user_profile ADD COLUMN state TEXT');
            await run('ALTER TABLE user_profile ADD COLUMN jdy_bank INTEGER DEFAULT 0');
            await run('ALTER TABLE user_profile ADD COLUMN aadhaar_linked INTEGER DEFAULT 0');
            await run('ALTER TABLE user_profile ADD COLUMN pmmvy_claimed TEXT');
            await run('ALTER TABLE user_profile ADD COLUMN jsy_registered INTEGER DEFAULT 0');
        }
    } catch (e) {
        console.error('[DB] Migration error:', e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEEDING
// ═══════════════════════════════════════════════════════════════════════════════

async function seedFoodData(database) {
    const totalItems = foodsData.length;
    const dbCountResult = await database.getFirstAsync('SELECT COUNT(*) as cnt FROM foods');
    const dbCount = dbCountResult?.cnt || 0;

    if (dbCount >= totalItems) {
        console.log(`[DB] Foods table up to date (${dbCount}/${totalItems}). Skipping seed.`);
        return;
    }

    console.log(`[DB] Seeding ${totalItems - dbCount} new foods (${dbCount} existing)...`);
    const start = Date.now();
    const existing = new Set();
    if (dbCount > 0) {
        const rows = await database.getAllAsync('SELECT id FROM foods');
        rows.forEach(r => existing.add(r.id));
    }
    const toInsert = foodsData.filter(f => !existing.has(f.id));

    if (toInsert.length === 0) return;

    const CHUNK_SIZE = 250;
    const COLS = 17;
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
        const chunk = toInsert.slice(i, i + CHUNK_SIZE);
        const placeholders = chunk.map(() => `(${Array(COLS).fill('?').join(',')})`).join(',');
        const values = [];
        chunk.forEach(food => {
            values.push(
                food.id, food.name_en, food.name_hi,
                food.calories, food.protein, food.carbs, food.fats, food.fiber,
                food.iron, food.calcium, food.folate,
                food.vitamin_a ?? 0, food.vitamin_c ?? 0,
                food.category, food.safety_status, food.image_path,
                food.source ?? 'app'
            );
        });
        await database.withTransactionAsync(async () => {
            await database.runAsync(
                `INSERT OR IGNORE INTO foods
                 (id, name_en, name_hi, calories, protein, carbs, fats, fiber,
                  iron, calcium, folate, vitamin_a, vitamin_c, category,
                  safety_status, image_path, source)
                 VALUES ${placeholders}`,
                values
            );
        });
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`[DB] Seeded ${toInsert.length} foods in ${elapsed}s.`);
}

async function seedNutritionRequirements(database) {
    const count = await database.getFirstAsync('SELECT COUNT(*) as cnt FROM nutrition_requirements');
    if (count && count.cnt > 0) return;
    for (const req of requirementsData) {
        await database.runAsync(
            `INSERT INTO nutrition_requirements (trimester, min_calories, min_protein, min_iron, min_calcium, min_folate, hydration_liters)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [req.trimester, req.min_calories, req.min_protein, req.min_iron, req.min_calcium, req.min_folate, req.hydration_liters]
        );
    }
}

async function seedANCSchedule(database) {
    const count = await database.getFirstAsync('SELECT COUNT(*) as cnt FROM anc_schedule');
    if (count && count.cnt > 0) return;
    for (const visit of ANCSchedule) {
        await database.runAsync(
            `INSERT INTO anc_schedule (visit_number, recommended_week, description_en, description_hi, checkups_list)
       VALUES (?, ?, ?, ?, ?)`,
            [visit.visit, visit.week, visit.en, visit.hi, JSON.stringify(visit.checkups)]
        );
    }
}

async function seedSupplementSchedule(database) {
    const count = await database.getFirstAsync('SELECT COUNT(*) as cnt FROM supplement_schedule');
    if (count && count.cnt > 0) return;
    const supplements = [
        { type: 'iron', freq: 1, start: 1, end: 40, en: 'Iron + Folic Acid tablet daily', hi: 'आयरन + फोलिक एसिड गोली रोज़' },
        { type: 'calcium', freq: 2, start: 14, end: 40, en: 'Calcium tablet twice daily', hi: 'कैल्शियम गोली दिन में दो बार' },
        { type: 'folic_acid', freq: 1, start: 1, end: 12, en: 'Folic Acid daily (first trimester)', hi: 'फोलिक एसिड रोज़ (पहली तिमाही)' },
    ];
    for (const s of supplements) {
        await database.runAsync(
            `INSERT INTO supplement_schedule (supplement_type, frequency_per_day, start_week, end_week, details_en, details_hi)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [s.type, s.freq, s.start, s.end, s.en, s.hi]
        );
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveUserProfile(profile) {
    const database = await getDatabase();
    const existing = await database.getFirstAsync('SELECT id FROM user_profile LIMIT 1');
    if (existing) {
        await database.runAsync(
            `UPDATE user_profile SET
        name = ?, age = ?, lmp_date = ?, due_date = ?, pregnancy_week = ?,
        height_cm = ?, start_weight_kg = ?, current_weight_kg = ?,
        language = ?, asha_contact = ?, emergency_contact = ?, husband_contact = ?, phc_contact = ?,
        ration_category = ?, nfsa_status = ?, state = ?, jdy_bank = ?, aadhaar_linked = ?, pmmvy_claimed = ?, jsy_registered = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
            [profile.name, profile.age, profile.lmp_date, profile.due_date, profile.pregnancy_week, profile.height_cm, profile.start_weight_kg, profile.current_weight_kg, profile.language || 'hi', profile.asha_contact, profile.emergency_contact, profile.husband_contact, profile.phc_contact, profile.ration_category || null, profile.nfsa_status ? 1 : 0, profile.state || null, profile.jdy_bank ? 1 : 0, profile.aadhaar_linked ? 1 : 0, profile.pmmvy_claimed || null, profile.jsy_registered ? 1 : 0, existing.id]
        );
        return existing.id;
    } else {
        const result = await database.runAsync(
            `INSERT INTO user_profile (name, age, lmp_date, due_date, pregnancy_week, height_cm, start_weight_kg, current_weight_kg, language, asha_contact, emergency_contact, husband_contact, phc_contact, ration_category, nfsa_status, state, jdy_bank, aadhaar_linked, pmmvy_claimed, jsy_registered)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [profile.name, profile.age, profile.lmp_date, profile.due_date, profile.pregnancy_week, profile.height_cm, profile.start_weight_kg, profile.current_weight_kg, profile.language || 'hi', profile.asha_contact, profile.emergency_contact, profile.husband_contact, profile.phc_contact, profile.ration_category || null, profile.nfsa_status ? 1 : 0, profile.state || null, profile.jdy_bank ? 1 : 0, profile.aadhaar_linked ? 1 : 0, profile.pmmvy_claimed || null, profile.jsy_registered ? 1 : 0]
        );
        return result.lastInsertRowId;
    }
}

export async function getUserProfile() {
    const database = await getDatabase();
    return await database.getFirstAsync('SELECT * FROM user_profile LIMIT 1');
}

export async function updatePregnancyWeek(week) {
    const database = await getDatabase();
    await database.runAsync('UPDATE user_profile SET pregnancy_week = ?, updated_at = CURRENT_TIMESTAMP', [week]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEAL OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveMealLog(mealData) {
    const database = await getDatabase();
    const { mealType, items } = mealData;
    let totalCalories = 0;
    let totalProtein = 0;
    let totalIron = 0;
    let totalCalcium = 0;
    let totalFolate = 0;
    let totalCarbs = 0;
    const enrichedItems = [];

    for (const item of items) {
        const food = await database.getFirstAsync('SELECT * FROM foods WHERE id = ?', [item.food_id]);
        if (!food) continue;
        const multiplier = item.portion_multiplier || 1.0;
        const cal = food.calories * multiplier;
        const pro = food.protein * multiplier;
        const iro = food.iron * multiplier;
        const cac = food.calcium * multiplier;
        const fol = food.folate * multiplier;
        const carb = (food.carbs || 0) * multiplier;

        totalCalories += cal;
        totalProtein += pro;
        totalIron += iro;
        totalCalcium += cac;
        totalFolate += fol;
        totalCarbs += carb;

        enrichedItems.push({
            food_id: item.food_id,
            quantity_g: 100 * multiplier,
            portion_multiplier: multiplier,
            calories: cal,
            protein: pro,
            iron: iro,
            calcium: cac,
            folate: fol,
            carbs: carb
        });
    }
    const result = await database.runAsync(
        `INSERT INTO meal_logs (meal_type, total_calories, total_protein, total_iron, total_calcium, total_folate, total_carbs) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [mealType, Math.round(totalCalories * 10) / 10, Math.round(totalProtein * 10) / 10, Math.round(totalIron * 10) / 10, Math.round(totalCalcium * 10) / 10, Math.round(totalFolate * 10) / 10, Math.round(totalCarbs * 10) / 10]
    );
    const mealLogId = result.lastInsertRowId;
    for (const ei of enrichedItems) {
        await database.runAsync(
            `INSERT INTO meal_items (meal_log_id, food_id, quantity_g, portion_multiplier, calories, protein, iron, calcium, folate, carbs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [mealLogId, ei.food_id, ei.quantity_g, ei.portion_multiplier, ei.calories, ei.protein, ei.iron, ei.calcium, ei.folate, ei.carbs]
        );
    }
    await updateDailySummary(database);
    return mealLogId;
}

export async function getTodayMeals() {
    const database = await getDatabase();
    try {
        const meals = await database.getAllAsync(`SELECT * FROM meal_logs WHERE log_date = date('now') ORDER BY created_at DESC`);
        for (const meal of meals) {
            meal.items = await database.getAllAsync(`SELECT mi.*, f.name_en, f.name_hi, f.image_path, f.safety_status, f.category FROM meal_items mi JOIN foods f ON mi.food_id = f.id WHERE mi.meal_log_id = ?`, [meal.id]);
        }
        return meals;
    } catch (e) {
        console.error('[DB] getTodayMeals ERROR:', e);
        throw e;
    }
}

export async function getMealHistory(startDate, endDate) {
    const database = await getDatabase();
    return await database.getAllAsync(`SELECT * FROM meal_logs WHERE log_date BETWEEN ? AND ? ORDER BY log_date DESC, created_at DESC`, [startDate, endDate]);
}

export async function deleteMeal(mealId) {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM meal_items WHERE meal_log_id = ?', [mealId]);
    await database.runAsync('DELETE FROM meal_logs WHERE id = ?', [mealId]);
    await updateDailySummary(database);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOOD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAllFoods() { return await getAllFoodsPaginated(50, 0); }
export async function getAllFoodsPaginated(limit = 50, offset = 0) {
    const database = await getDatabase();
    return await database.getAllAsync('SELECT * FROM foods ORDER BY name_en LIMIT ? OFFSET ?', [limit, offset]);
}
export async function getCommonFoods() {
    const database = await getDatabase();
    return await database.getAllAsync(`SELECT * FROM foods WHERE category IN ('grain', 'protein', 'vegetable', 'dairy', 'fruit') AND safety_status = 'safe' ORDER BY name_en`);
}
export async function getFoodsByCategory(category) { return await getFoodsByCategoryPaginated(category, 50, 0); }
export async function getFoodsByCategoryPaginated(category, limit = 50, offset = 0) {
    const database = await getDatabase();
    return await database.getAllAsync('SELECT * FROM foods WHERE category = ? ORDER BY name_en LIMIT ? OFFSET ?', [category, limit, offset]);
}
export async function searchFoods(query) { return await searchFoodsPaginated(query, 50, 0); }
export async function searchFoodsPaginated(query, limit = 50, offset = 0) {
    const database = await getDatabase();
    const q = `%${query}%`;
    return await database.getAllAsync('SELECT * FROM foods WHERE name_en LIKE ? OR name_hi LIKE ? OR id LIKE ? ORDER BY name_en LIMIT ? OFFSET ?', [q, q, q, limit, offset]);
}
export async function getFoodById(foodId) {
    const database = await getDatabase();
    return await database.getFirstAsync('SELECT * FROM foods WHERE id = ?', [foodId]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY SUMMARY & NUTRITION
// ═══════════════════════════════════════════════════════════════════════════════

async function updateDailySummary(database) {
    const today = new Date().toISOString().split('T')[0];
    const dailyTotals = await database.getFirstAsync(`
      SELECT 
        COALESCE(SUM(total_calories), 0) as total_calories, 
        COALESCE(SUM(total_protein), 0) as total_protein, 
        COALESCE(SUM(total_iron), 0) as total_iron, 
        COALESCE(SUM(total_calcium), 0) as total_calcium, 
        COALESCE(SUM(total_folate), 0) as total_folate,
        COALESCE(SUM(total_carbs), 0) as total_carbs
      FROM meal_logs 
      WHERE log_date = ?
    `, [today]);

    await database.runAsync(`
      INSERT OR REPLACE INTO daily_summary (date, total_calories, total_protein, total_iron, total_calcium, total_folate, total_carbs, water_glasses, supplements_taken, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT water_glasses FROM daily_summary WHERE date = ?), 0), COALESCE((SELECT supplements_taken FROM daily_summary WHERE date = ?), 0), CURRENT_TIMESTAMP)
    `, [today, dailyTotals.total_calories, dailyTotals.total_protein, dailyTotals.total_iron, dailyTotals.total_calcium, dailyTotals.total_folate, dailyTotals.total_carbs, today, today]);
}

export async function getDailySummary(date) {
    const database = await getDatabase();
    const d = date || new Date().toISOString().split('T')[0];
    try {
        let summary = await database.getFirstAsync('SELECT * FROM daily_summary WHERE date = ?', [d]);
        if (!summary) summary = { date: d, total_calories: 0, total_protein: 0, total_iron: 0, total_calcium: 0, total_folate: 0, water_glasses: 0, supplements_taken: 0 };
        return summary;
    } catch (e) {
        console.error('[DB] getDailySummary ERROR:', e);
        throw e;
    }
}

export async function logWater() {
    const database = await getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const existing = await database.getFirstAsync('SELECT water_glasses FROM daily_summary WHERE date = ?', [today]);
    if (existing) {
        await database.runAsync('UPDATE daily_summary SET water_glasses = water_glasses + 1, updated_at = CURRENT_TIMESTAMP WHERE date = ?', [today]);
        return existing.water_glasses + 1;
    } else {
        await database.runAsync(`INSERT INTO daily_summary (date, water_glasses) VALUES (?, 1)`, [today]);
        return 1;
    }
}

export async function getNutritionRequirements(week) {
    const database = await getDatabase();
    let trimester = 1;
    if (week > 28) trimester = 3; else if (week > 13) trimester = 2;
    return await database.getFirstAsync('SELECT * FROM nutrition_requirements WHERE trimester = ?', [trimester]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function logSupplement(type) {
    const database = await getDatabase();
    await database.runAsync('INSERT INTO supplement_logs (supplement_type) VALUES (?)', [type]);
    const today = new Date().toISOString().split('T')[0];
    const count = await database.getFirstAsync('SELECT COUNT(*) as cnt FROM supplement_logs WHERE date = ?', [today]);
    const existing = await database.getFirstAsync('SELECT * FROM daily_summary WHERE date = ?', [today]);
    if (existing) await database.runAsync('UPDATE daily_summary SET supplements_taken = ?, updated_at = CURRENT_TIMESTAMP WHERE date = ?', [count.cnt, today]);
    else await database.runAsync('INSERT INTO daily_summary (date, supplements_taken) VALUES (?, ?)', [today, count.cnt]);
    return count.cnt;
}

export async function getTodaySupplements() {
    const database = await getDatabase();
    return await database.getAllAsync(`SELECT * FROM supplement_logs WHERE date = date('now') ORDER BY taken_at DESC`);
}

export async function getSupplementAdherence(days = 7) {
    const database = await getDatabase();
    return await database.getAllAsync(`SELECT date, COUNT(*) as count, GROUP_CONCAT(supplement_type) as types FROM supplement_logs WHERE date >= date('now', '-' || ? || ' days') GROUP BY date ORDER BY date`, [days]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

export async function logWeight(weightKg, weekOfPregnancy, notes = '', reportUri = null, patientId = 'user_001') {
    const database = await getDatabase();
    const result = await database.runAsync(
        'INSERT INTO weight_tracking (weight_kg, week_of_pregnancy, notes, report_uri, patient_id) VALUES (?, ?, ?, ?, ?)',
        [weightKg, weekOfPregnancy, notes, reportUri, patientId]
    );
    // Only update profile if it's the main user
    if (patientId === 'user_001') {
        await database.runAsync('UPDATE user_profile SET current_weight_kg = ?, updated_at = CURRENT_TIMESTAMP', [weightKg]);
    }
    return result.lastInsertRowId;
}

export async function getWeightHistory(patientId = 'user_001') {
    const database = await getDatabase();
    return await database.getAllAsync(
        'SELECT * FROM weight_tracking WHERE patient_id = ? ORDER BY date DESC',
        [patientId]
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANC SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════════

export async function getANCSchedule() {
    const database = await getDatabase();
    return await database.getAllAsync('SELECT * FROM anc_schedule ORDER BY visit_number');
}

export async function getNextANC(currentWeek) {
    const database = await getDatabase();
    return await database.getFirstAsync('SELECT * FROM anc_schedule WHERE recommended_week >= ? AND is_completed = 0 ORDER BY recommended_week LIMIT 1', [currentWeek]);
}

export async function markANCCompleted(visitNumber, notes = '') {
    const database = await getDatabase();
    await database.runAsync(`UPDATE anc_schedule SET is_completed = 1, completed_date = date('now'), notes = ? WHERE visit_number = ?`, [notes, visitNumber]);
}

export async function attachReportToVisit(visitNumber, reportUri) {
    const database = await getDatabase();
    await database.runAsync(`UPDATE anc_schedule SET report_uri = ? WHERE visit_number = ?`, [reportUri, visitNumber]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW HEALTH FEATURES: KICKS, SYMPTOMS, VITALS
// ═══════════════════════════════════════════════════════════════════════════════

export async function logKicks(count, durationMin = 60, patientId = 'user_001') {
    const database = await getDatabase();
    const result = await database.runAsync(
        'INSERT INTO kick_logs (count, duration_min, patient_id) VALUES (?, ?, ?)',
        [count, durationMin, patientId]
    );
    return result.lastInsertRowId;
}

export async function getKickHistory(patientId = 'user_001', limit = 7) {
    const database = await getDatabase();
    return await database.getAllAsync(
        'SELECT * FROM kick_logs WHERE patient_id = ? ORDER BY date DESC, time DESC LIMIT ?',
        [patientId, limit]
    );
}

export async function logSymptom(symptomId, severity, notes = '', patientId = 'user_001') {
    const database = await getDatabase();
    const result = await database.runAsync(
        'INSERT INTO symptom_logs (symptom_id, severity, notes, patient_id) VALUES (?, ?, ?, ?)',
        [symptomId, severity, notes, patientId]
    );
    return result.lastInsertRowId;
}

export async function getSymptomHistory(patientId = 'user_001', limit = 10) {
    const database = await getDatabase();
    return await database.getAllAsync(
        'SELECT * FROM symptom_logs WHERE patient_id = ? ORDER BY date DESC, time DESC LIMIT ?',
        [patientId, limit]
    );
}

export async function logVitals(vitals) {
    const {
        systolic, diastolic, bloodSugar, pulse, notes = '', reportUri = null,
        hba1c = null, fbs = null, ppbs = null, age = null, gender = null,
        patientId = 'user_001'
    } = vitals;
    const database = await getDatabase();
    const result = await database.runAsync(
        `INSERT INTO vitals_logs 
        (patient_id, systolic, diastolic, blood_sugar, pulse, notes, report_uri, hba1c, fbs, ppbs, age, gender) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [patientId, systolic, diastolic, bloodSugar, pulse, notes, reportUri, hba1c, fbs, ppbs, age, gender]
    );
    return result.lastInsertRowId;
}

export async function getVitalsHistory(patientId = 'user_001') {
    const database = await getDatabase();
    return await database.getAllAsync(
        'SELECT * FROM vitals_logs WHERE patient_id = ? ORDER BY date DESC, time DESC',
        [patientId]
    );
}

export async function getDoctorPatients() {
    const database = await getDatabase();
    // In a real app, this would query a 'patients' table.
    // For this demo, we'll return the profile user and some simulated data if needed.
    const profiles = await database.getAllAsync('SELECT * FROM user_profile');

    // Enrich with latest vitals and calculated risk score for Demo
    return profiles.map(p => ({
        id: `user_${p.id.toString().padStart(3, '0')}`,
        name: p.name,
        age: p.age,
        week: p.pregnancy_week,
        riskScore: Math.random() * 100, // Simulation: would be AI calculated
        lastBp: '120/80',
        lastHb: '11.2',
        lastSymptom: 'None'
    }));
}

export async function saveDoctorInstruction(patientId, doctorId, instruction) {
    const database = await getDatabase();
    await database.runAsync(
        'INSERT INTO doctor_instructions (patient_id, doctor_id, instruction) VALUES (?, ?, ?)',
        [patientId, doctorId, instruction]
    );
}

export async function getDoctorInstructions(patientId) {
    const database = await getDatabase();
    return await database.getAllAsync(
        'SELECT * FROM doctor_instructions WHERE patient_id = ? ORDER BY created_at DESC',
        [patientId]
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EYE HEALTH ASSESSMENTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveEyeAssessment({ riskLevel, riskScore, confidence, method, age, familyHistory, logMAR, logCS, vfi, amslerDistortion, recommendations }) {
    const database = await getDatabase();
    const result = await database.runAsync(`INSERT INTO eye_assessments(risk_level, risk_score, confidence, method, age, family_history, log_mar, log_cs, vfi, amsler_distortion, recommendations) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [riskLevel, riskScore, confidence, method, age, familyHistory ? 1 : 0, logMAR, logCS, vfi, amslerDistortion ? 1 : 0, JSON.stringify(recommendations ?? [])]);
    return result.lastInsertRowId;
}

export async function getEyeAssessments(limit = 10) {
    const database = await getDatabase();
    return await database.getAllAsync('SELECT * FROM eye_assessments ORDER BY assessed_at DESC LIMIT ?', [limit]);
}

/**
 * Update the image_path for a specific food item.
 */
export async function updateFoodImage(foodId, imageUrl) {
    const database = await getDatabase();
    await database.runAsync('UPDATE foods SET image_path = ? WHERE id = ?', [imageUrl, foodId]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DIABETES FEATURE EXTRACTION (FOR XGBOOST)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extracts and calculates features required for the Diabetes XGBoost model.
 * Features: ['carb_avg_7d', 'sleep_avg_3d', 'HbA1c', 'glucose_trend', 'BMI', 'trimester']
 */
export async function getDiabetesFeatures() {
    const database = await getDatabase();
    const profile = await getUserProfile();

    // 1. carb_avg_7d: Average daily carbs over last 7 days from meal_logs
    const today = new Date().toISOString().split('T')[0];
    const carbData = await database.getFirstAsync(`
        SELECT AVG(daily_carbs) as avg_carbs FROM(
            SELECT SUM(total_carbs) as daily_carbs 
            FROM meal_logs 
            WHERE log_date >= date('now', '-7 days') 
            GROUP BY log_date
        )
        `);
    const carb_avg_7d = carbData?.avg_carbs || 0;

    // 2. sleep_avg_3d: Placeholder (using 8h as default until sleep tracking is added)
    const sleep_avg_3d = 8.0;

    // 3. HbA1c: From profile or default
    const HbA1c = profile?.hba1c || 5.4;

    // 4. glucose_trend: Slope of last 5 glucose readings
    const vitals = await database.getAllAsync(`
        SELECT blood_sugar FROM vitals_logs 
        WHERE blood_sugar IS NOT NULL 
        ORDER BY created_at DESC LIMIT 5
        `);

    let glucose_trend = 0;
    if (vitals.length >= 2) {
        const values = vitals.map(v => v.blood_sugar).reverse();
        // Simple slope: (last - first) / count
        glucose_trend = (values[values.length - 1] - values[0]) / values.length;
    }

    // 5. BMI: Calculated from profile
    const weight = profile?.current_weight_kg || profile?.start_weight_kg || 60;
    const heightM = (profile?.height_cm || 160) / 100;
    const BMI = weight / (heightM * heightM);

    // 6. trimester: Derived from pregnancy week
    const week = profile?.pregnancy_week || 1;
    const trimester = Math.ceil(week / 13) || 1;

    return {
        carb_avg_7d: Math.round(carb_avg_7d * 10) / 10,
        sleep_avg_3d,
        HbA1c,
        glucose_trend: Math.round(glucose_trend * 100) / 100,
        BMI: Math.round(BMI * 10) / 10,
        trimester: Math.min(trimester, 3)
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SWELLING SCAN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Save a swelling scan result to swelling_log.
 */
export async function saveSwellingScan({ risk_level, swelling_level, preeclampsia_flag, recommendation_en, recommendation_hi, observations_en, observations_hi, confidence }) {
    const database = await getDatabase();
    const observations = JSON.stringify({ en: observations_en || [], hi: observations_hi || [] });
    const result = await database.runAsync(
        `INSERT INTO swelling_log(risk_level, swelling_level, preeclampsia_flag, recommendation_en, recommendation_hi, observations_json, confidence)
         VALUES(?, ?, ?, ?, ?, ?, ?)`,
        [risk_level, swelling_level, preeclampsia_flag ? 1 : 0, recommendation_en, recommendation_hi, observations, confidence ?? 0.5]
    );
    return result.lastInsertRowId;
}

/**
 * Retrieve past swelling scan results.
 */
export async function getSwellingHistory(limit = 10) {
    const database = await getDatabase();
    const rows = await database.getAllAsync(
        'SELECT * FROM swelling_log ORDER BY scanned_at DESC LIMIT ?',
        [limit]
    );
    return (rows || []).map(row => ({
        ...row,
        preeclampsia_flag: row.preeclampsia_flag === 1,
        observations: row.observations_json ? JSON.parse(row.observations_json) : { en: [], hi: [] },
    }));
}

/**
 * Save an ASHA visit summary to the database.
 */
export async function saveVisitSummary(patientId, rawNotes, summary) {
    const database = await getDatabase();
    const result = await database.runAsync(
        'INSERT INTO visit_history (patient_id, raw_notes, summary_json) VALUES (?, ?, ?)',
        [patientId, rawNotes, JSON.stringify(summary)]
    );
    return result.lastInsertRowId;
}

/**
 * Get visit history for a specific patient.
 */
export async function getVisitHistory(patientId) {
    const database = await getDatabase();
    const rows = await database.getAllAsync(
        'SELECT * FROM visit_history WHERE patient_id = ? ORDER BY created_at DESC',
        [patientId]
    );
    return (rows || []).map(row => ({
        ...row,
        summary: JSON.parse(row.summary_json),
        date: new Date(row.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        })
    }));
}
