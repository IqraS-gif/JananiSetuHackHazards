-- Database Schema for Maa App (SQLite)

-- User Profile
CREATE TABLE IF NOT EXISTS user_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    lmp_date TEXT, -- Last Menstrual Period
    due_date TEXT,
    pregnancy_week INTEGER,
    height_cm REAL,
    start_weight_kg REAL,
    current_weight_kg REAL,
    language TEXT DEFAULT 'hi', -- 'hi' or 'en'
    asha_contact TEXT,
    emergency_contact TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Food Database (Common Indian Foods)
CREATE TABLE IF NOT EXISTS foods (
    id TEXT PRIMARY KEY, -- e.g., 'rice_white', 'dal_moong'
    name_en TEXT NOT NULL,
    name_hi TEXT,
    calories REAL, -- kcal per 100g
    protein REAL, -- g
    carbs REAL, -- g
    fats REAL, -- g
    fiber REAL, -- g
    iron REAL, -- mg
    calcium REAL, -- mg
    folate REAL, -- mcg
    vitamin_a REAL, -- mcg
    vitamin_c REAL, -- mg
    category TEXT, -- 'grain', 'protein', 'vegetable', 'fruit', 'dairy', 'snack', 'drink'
    safety_status TEXT DEFAULT 'safe', -- 'safe', 'limit', 'avoid'
    image_path TEXT -- local asset path or require statement identifier
);

-- Meal Logs (Aggregate for a meal event)
CREATE TABLE IF NOT EXISTS meal_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_type TEXT, -- 'breakfast', 'lunch', 'dinner', 'snack'
    log_date TEXT DEFAULT (date('now')),
    log_time TEXT DEFAULT (time('now')),
    total_calories REAL,
    total_protein REAL,
    total_iron REAL,
    total_calcium REAL,
    total_folate REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Meal Items (Individual foods in a meal)
CREATE TABLE IF NOT EXISTS meal_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_log_id INTEGER,
    food_id TEXT,
    quantity_g REAL, -- Calculated based on portion
    portion_multiplier REAL DEFAULT 1.0, -- 0.5 (small), 1.0 (medium), 1.5 (large)
    calories REAL,
    protein REAL,
    iron REAL,
    calcium REAL,
    folate REAL,
    FOREIGN KEY (meal_log_id) REFERENCES meal_logs(id),
    FOREIGN KEY (food_id) REFERENCES foods(id)
);

-- Daily Summary (Pre-calculated totals for faster dashboard loading)
CREATE TABLE IF NOT EXISTS daily_summary (
    date TEXT PRIMARY KEY,
    total_calories REAL DEFAULT 0,
    total_protein REAL DEFAULT 0,
    total_iron REAL DEFAULT 0,
    total_calcium REAL DEFAULT 0,
    total_folate REAL DEFAULT 0,
    water_glasses INTEGER DEFAULT 0,
    supplements_taken INTEGER DEFAULT 0,
    mood TEXT,
    symptoms TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Supplement Logs
CREATE TABLE IF NOT EXISTS supplement_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplement_type TEXT, -- 'iron', 'calcium', 'folic_acid'
    taken_at TEXT DEFAULT CURRENT_TIMESTAMP,
    date TEXT DEFAULT (date('now'))
);

-- Supplement Schedule (What to take when)
CREATE TABLE IF NOT EXISTS supplement_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplement_type TEXT,
    frequency_per_day INTEGER,
    start_week INTEGER,
    end_week INTEGER,
    details_en TEXT,
    details_hi TEXT
);

-- Weight Tracking
CREATE TABLE IF NOT EXISTS weight_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT DEFAULT (date('now')),
    weight_kg REAL,
    week_of_pregnancy INTEGER,
    notes TEXT
);

-- Nutrition Requirements (by Trimester)
CREATE TABLE IF NOT EXISTS nutrition_requirements (
    trimester INTEGER PRIMARY KEY, -- 1, 2, 3
    min_calories REAL,
    min_protein REAL,
    min_iron REAL,
    min_calcium REAL,
    min_folate REAL,
    hydration_liters REAL
);

-- ANC Schedule (Antenatal Care Appointments)
CREATE TABLE IF NOT EXISTS anc_schedule (
    visit_number INTEGER PRIMARY KEY,
    recommended_week INTEGER,
    description_en TEXT,
    description_hi TEXT,
    checkups_list TEXT, -- JSON string of checkups
    is_completed BOOLEAN DEFAULT 0,
    completed_date TEXT,
    notes TEXT
);
