/**
 * Maa App - Application Constants
 * Centralized configuration for colors, dimensions, labels, and foodKeywords
 */

// ─── Color Palette ───────────────────────────────────────────────────────────
export const Colors = {
  primary: '#FF6B9D',       // Pink
  primaryLight: '#FF8FB8',
  primaryDark: '#E0547F',
  success: '#4CAF50',       // Green
  successLight: '#81C784',
  warning: '#FF9800',       // Orange
  warningLight: '#FFB74D',
  danger: '#F44336',        // Red
  dangerLight: '#E57373',
  info: '#2196F3',          // Blue
  infoLight: '#64B5F6',

  // Backgrounds
  background: '#FFF5F7',
  cardBackground: '#FFFFFF',
  surfaceLight: '#FFF0F3',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#555555',
  textLight: '#888888',
  textOnPrimary: '#FFFFFF',

  // Status
  statusGood: '#4CAF50',
  statusMedium: '#FF9800',
  statusLow: '#F44336',

  // Misc
  border: '#E0E0E0',
  shadow: 'rgba(0,0,0,0.1)',
  overlay: 'rgba(0,0,0,0.5)',
  white: '#FFFFFF',
  black: '#000000',
};

// ─── API Configuration ────────────────────────────────────────────────────────
export const API_CONFIG = {
  SERPAPI_KEY: process.env.EXPO_PUBLIC_SERPAPI_KEY || '',
};

// ─── Dimensions ──────────────────────────────────────────────────────────────
export const Dimensions = {
  touchTarget: 60,            // Minimum 60x60 for accessibility
  borderRadius: 16,
  cardPadding: 16,
  screenPadding: 16,
  iconSize: 32,
  iconSizeLarge: 48,
  fontSizeBody: 18,
  fontSizeSubtitle: 16,
  fontSizeHeading: 28,
  fontSizeTitle: 36,
  fontSizeSmall: 14,
  buttonHeight: 60,
  cardMinHeight: 80,
};

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// ─── Typography ───────────────────────────────────────────────────────────────
export const Typography = {
  h1: { fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '800' },
  h3: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '700' },
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600' },
  tiny: { fontSize: 10, fontWeight: '600' },
};

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const Shadows = {
  low: {
    elevation: 2,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  medium: {
    elevation: 4,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  high: {
    elevation: 8,
    shadowColor: 'rgba(0,0,0,0.18)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
};

// ─── Bilingual Labels ────────────────────────────────────────────────────────
export const Labels = {
  // Tabs
  home: { hi: 'होम', en: 'Home' },
  food: { hi: 'खाना', en: 'Food' },
  health: { hi: 'स्वास्थ्य', en: 'Health' },
  learn: { hi: 'सीखें', en: 'Learn' },
  profile: { hi: 'प्रोफ़ाइल', en: 'Profile' },
  eye: { hi: 'आंखें', en: 'Eye' },
  setu: { hi: 'सेतु', en: 'Setu' },

  // Dashboard
  welcome: { hi: 'नमस्ते', en: 'Hello' },
  pregnancyWeek: { hi: 'गर्भावस्था सप्ताह', en: 'Pregnancy Week' },
  emergency: { hi: 'आपातकाल', en: 'Emergency' },

  // Status Cards
  nutrition: { hi: 'पोषण', en: 'Nutrition' },
  water: { hi: 'पानी', en: 'Water' },
  supplements: { hi: 'दवाइयाँ', en: 'Supplements' },

  // Action Buttons
  logMeal: { hi: 'खाना लिखें', en: 'Log Meal' },
  logWater: { hi: 'पानी लिखें', en: 'Log Water' },
  markSupplement: { hi: 'दवाई ली', en: 'Mark Supplement' },
  logWeight: { hi: 'वज़न लिखें', en: 'Log Weight' },

  // Meal Types
  breakfast: { hi: 'नाश्ता', en: 'Breakfast' },
  lunch: { hi: 'दोपहर का खाना', en: 'Lunch' },
  dinner: { hi: 'रात का खाना', en: 'Dinner' },
  snack: { hi: 'नाश्ता/स्नैक', en: 'Snack' },

  // Meal Input Methods
  voiceInput: { hi: 'बोलकर बताएं', en: 'Voice Input' },
  imageGrid: { hi: 'तस्वीर चुनें', en: 'Pick from Images' },
  quickMeals: { hi: 'जल्दी चुनें', en: 'Quick Meals' },

  // Portions
  small: { hi: 'छोटा (1 कटोरी)', en: 'Small (1 katori)' },
  medium: { hi: 'मध्यम (2 कटोरी)', en: 'Medium (2 katori)' },
  large: { hi: 'बड़ा (3 कटोरी)', en: 'Large (3 katori)' },

  // Categories
  all: { hi: 'सभी', en: 'All' },
  grain: { hi: 'अनाज', en: 'Grains' },
  protein: { hi: 'प्रोटीन', en: 'Proteins' },
  vegetable: { hi: 'सब्ज़ी', en: 'Vegetables' },
  fruit: { hi: 'फल', en: 'Fruits' },
  dairy: { hi: 'डेरी', en: 'Dairy' },
  snackCat: { hi: 'नाश्ता', en: 'Snacks' },
  drink: { hi: 'पेय', en: 'Drinks' },

  // Safety
  safe: { hi: 'सुरक्षित', en: 'Safe' },
  limit: { hi: 'सीमित', en: 'Limit' },
  avoid: { hi: 'न खाएं', en: 'Avoid' },

  // Misc
  save: { hi: 'सेव करें', en: 'Save' },
  cancel: { hi: 'रद्द करें', en: 'Cancel' },
  next: { hi: 'आगे', en: 'Next' },
  back: { hi: 'पीछे', en: 'Back' },
  done: { hi: 'हो गया', en: 'Done' },
  addMore: { hi: 'और जोड़ें', en: 'Add More' },
  today: { hi: 'आज', en: 'Today' },
  recommendations: { hi: 'सुझाव', en: 'Recommendations' },
  nextANC: { hi: 'अगली जाँच', en: 'Next Checkup' },
  ashaWorker: { hi: 'आशा कार्यकर्ता', en: 'ASHA Worker' },
  saveMeal: { hi: 'खाना सेव करें', en: 'Save Meal' },
  mealSaved: { hi: 'खाना सेव हो गया!', en: 'Meal Saved!' },
};

// ─── Voice Input Keywords → Food ID Mapping ──────────────────────────────────
export const FoodKeywords = {
  'चावल': 'rice_white', 'rice': 'rice_white', 'chawal': 'rice_white',
  'रोटी': 'wheat_roti', 'roti': 'wheat_roti', 'chapati': 'wheat_roti', 'chapatti': 'wheat_roti',
  'दाल': 'dal_moong', 'dal': 'dal_moong', 'lentils': 'dal_moong',
  'मूंग': 'dal_moong', 'moong': 'dal_moong',
  'तूर': 'dal_toor', 'toor': 'dal_toor', 'arhar': 'dal_toor',
  'मसूर': 'dal_masoor', 'masoor': 'dal_masoor',
  'चना': 'dal_chana', 'chana': 'dal_chana',
  'उड़द': 'dal_urad', 'urad': 'dal_urad',
  'राजमा': 'rajma', 'rajma': 'rajma', 'kidney': 'rajma',
  'छोले': 'chhole', 'chole': 'chhole', 'chickpea': 'chhole',
  'पनीर': 'paneer', 'paneer': 'paneer', 'cottage': 'paneer',
  'दूध': 'milk_cow', 'milk': 'milk_cow', 'doodh': 'milk_cow',
  'दही': 'curd', 'curd': 'curd', 'dahi': 'curd', 'yogurt': 'curd',
  'छाछ': 'buttermilk', 'buttermilk': 'buttermilk', 'chaas': 'buttermilk',
  'घी': 'ghee', 'ghee': 'ghee',
  'अंडा': 'egg_boiled', 'egg': 'egg_boiled', 'anda': 'egg_boiled',
  'चिकन': 'chicken', 'chicken': 'chicken', 'murgi': 'chicken',
  'मटन': 'mutton', 'mutton': 'mutton', 'meat': 'mutton',
  'मछली': 'fish_rohu', 'fish': 'fish_rohu', 'machli': 'fish_rohu',
  'पालक': 'spinach', 'spinach': 'spinach', 'palak': 'spinach',
  'आलू': 'potato', 'potato': 'potato', 'aloo': 'potato',
  'टमाटर': 'tomato', 'tomato': 'tomato', 'tamatar': 'tomato',
  'गाजर': 'carrot', 'carrot': 'carrot', 'gajar': 'carrot',
  'भिंडी': 'lady_finger', 'bhindi': 'lady_finger', 'okra': 'lady_finger',
  'लौकी': 'bottle_gourd', 'lauki': 'bottle_gourd', 'gourd': 'bottle_gourd',
  'करेला': 'bitter_gourd', 'karela': 'bitter_gourd',
  'मेथी': 'methi_leaves', 'methi': 'methi_leaves', 'fenugreek': 'methi_leaves',
  'कद्दू': 'pumpkin', 'pumpkin': 'pumpkin', 'kaddu': 'pumpkin',
  'गोभी': 'cauliflower', 'cauliflower': 'cauliflower', 'gobhi': 'cauliflower',
  'मटर': 'green_peas', 'matar': 'green_peas', 'peas': 'green_peas',
  'केला': 'banana', 'banana': 'banana', 'kela': 'banana',
  'आम': 'mango', 'mango': 'mango', 'aam': 'mango',
  'सेब': 'apple', 'apple': 'apple', 'seb': 'apple',
  'संतरा': 'orange', 'orange': 'orange', 'santra': 'orange',
  'अमरूद': 'guava', 'guava': 'guava', 'amrood': 'guava',
  'अनार': 'pomegranate', 'pomegranate': 'pomegranate', 'anaar': 'pomegranate',
  'पपीता': 'papaya_ripe', 'papaya': 'papaya_ripe',
  'पराठा': 'paratha', 'paratha': 'paratha', 'pratha': 'paratha',
  'पोहा': 'poha', 'poha': 'poha',
  'उपमा': 'upma', 'upma': 'upma',
  'इडली': 'idli', 'idli': 'idli',
  'डोसा': 'dosa', 'dosa': 'dosa',
  'ओट्स': 'oats', 'oats': 'oats',
  'दलिया': 'daliya', 'daliya': 'daliya', 'porridge': 'daliya',
  'खिचड़ी': 'khichdi', 'khichdi': 'khichdi', 'khichri': 'khichdi',
  'गुड़': 'jaggery', 'jaggery': 'jaggery', 'gur': 'jaggery',
  'मूंगफली': 'peanuts', 'peanut': 'peanuts', 'mungfali': 'peanuts',
  'बादाम': 'almond', 'almond': 'almond', 'badam': 'almond',
  'काजू': 'cashew', 'cashew': 'cashew', 'kaju': 'cashew',
  'अखरोट': 'walnut', 'walnut': 'walnut', 'akhrot': 'walnut',
  'बिरयानी': 'biryani_veg', 'biryani': 'biryani_veg',
  'समोसा': 'samosa', 'samosa': 'samosa',
  'पकोड़ा': 'pakora', 'pakora': 'pakora',
  'चाय': 'tea_milk', 'tea': 'tea_milk', 'chai': 'tea_milk',
  'कॉफी': 'coffee', 'coffee': 'coffee',
  'लस्सी': 'lassi_sweet', 'lassi': 'lassi_sweet',
  'नींबू': 'nimbu_pani', 'nimbu': 'nimbu_pani', 'lemon': 'lemon', 'nimbu pani': 'nimbu_pani',
  'नारियल पानी': 'coconut_water', 'coconut water': 'coconut_water', 'nariyal pani': 'coconut_water',
  'सांभर': 'sambar', 'sambar': 'sambar', 'sambhar': 'sambar',
  'रायता': 'raita', 'raita': 'raita',
  'आलू गोभी': 'aloo_gobi', 'aloo gobi': 'aloo_gobi',
  'पालक पनीर': 'palak_paneer', 'palak paneer': 'palak_paneer',
  'साग': 'saag', 'saag': 'saag',
  'स्प्राउट्स': 'sprouts_moong', 'sprouts': 'sprouts_moong',
  'आँवला': 'amla', 'amla': 'amla',
  'सौंफ': 'saunf', 'saunf': 'saunf', 'fennel': 'saunf',
  'पिज़ा': 'pizza', 'pizza': 'pizza', 'pizaa': 'pizza', 'पिज़्ज़ा': 'pizza',
  'बर्गर': 'burger', 'burger': 'burger',
  'पास्ता': 'pasta', 'pasta': 'pasta',
};

// ─── Quick Meal Presets ──────────────────────────────────────────────────────
export const QuickMeals = [
  {
    id: 'north_breakfast',
    name_hi: 'उत्तर भारतीय नाश्ता',
    name_en: 'North Indian Breakfast',
    emoji: '🥞',
    foods: [
      { food_id: 'paratha', portion: 1.0 },
      { food_id: 'curd', portion: 0.5 },
      { food_id: 'pickle', portion: 0.5 },
    ],
  },
  {
    id: 'south_breakfast',
    name_hi: 'दक्षिण भारतीय नाश्ता',
    name_en: 'South Indian Breakfast',
    emoji: '🫓',
    foods: [
      { food_id: 'idli', portion: 1.0 },
      { food_id: 'sambar', portion: 1.0 },
      { food_id: 'coconut_chutney', portion: 0.5 },
    ],
  },
  {
    id: 'standard_lunch',
    name_hi: 'सामान्य दोपहर का खाना',
    name_en: 'Standard Lunch',
    emoji: '🍛',
    foods: [
      { food_id: 'wheat_roti', portion: 1.0 },
      { food_id: 'rice_white', portion: 0.5 },
      { food_id: 'dal_moong', portion: 1.0 },
      { food_id: 'aloo_gobi', portion: 1.0 },
    ],
  },
  {
    id: 'light_dinner',
    name_hi: 'हलका रात का खाना',
    name_en: 'Light Dinner',
    emoji: '🌙',
    foods: [
      { food_id: 'khichdi', portion: 1.0 },
      { food_id: 'curd', portion: 0.5 },
    ],
  },
  {
    id: 'healthy_snack',
    name_hi: 'पौष्टिक नाश्ता',
    name_en: 'Healthy Snack',
    emoji: '🥜',
    foods: [
      { food_id: 'sprouts_moong', portion: 1.0 },
      { food_id: 'banana', portion: 1.0 },
      { food_id: 'almond', portion: 0.5 },
    ],
  },
  {
    id: 'iron_rich_meal',
    name_hi: 'आयरन भरपूर खाना',
    name_en: 'Iron Rich Meal',
    emoji: '💪',
    foods: [
      { food_id: 'spinach', portion: 1.0 },
      { food_id: 'wheat_roti', portion: 1.0 },
      { food_id: 'dal_masoor', portion: 1.0 },
      { food_id: 'jaggery', portion: 0.5 },
    ],
  },
];

// ─── ANC Schedule ────────────────────────────────────────────────────────────
export const ANCSchedule = [
  { visit: 1, week: 12, en: 'First Visit - Registration & Blood Tests', hi: 'पहली जाँच - पंजीकरण और खून की जाँच', checkups: ['Blood test', 'Urine test', 'Weight', 'BP', 'Ultrasound'] },
  { visit: 2, week: 16, en: 'Second Visit - Growth Check', hi: 'दूसरी जाँच - विकास जाँच', checkups: ['Weight', 'BP', 'Uterus height', 'Hemoglobin'] },
  { visit: 3, week: 20, en: 'Third Visit - Anomaly Scan', hi: 'तीसरी जाँच - विस्तृत अल्ट्रासाउंड', checkups: ['Anomaly scan', 'Weight', 'BP'] },
  { visit: 4, week: 24, en: 'Fourth Visit - Glucose Test', hi: 'चौथी जाँच - शुगर जाँच', checkups: ['GCT', 'Weight', 'BP', 'Hemoglobin'] },
  { visit: 5, week: 28, en: 'Fifth Visit - Third Trimester Start', hi: 'पाँचवीं जाँच - तीसरी तिमाही शुरू', checkups: ['Weight', 'BP', 'Baby position', 'TT vaccine'] },
  { visit: 6, week: 32, en: 'Sixth Visit - Growth Scan', hi: 'छठी जाँच - विकास स्कैन', checkups: ['Ultrasound', 'Weight', 'BP', 'Baby heartbeat'] },
  { visit: 7, week: 36, en: 'Seventh Visit - Birth Plan', hi: 'सातवीं जाँच - प्रसव योजना', checkups: ['Baby position', 'Weight', 'BP', 'NST'] },
  { visit: 8, week: 38, en: 'Eighth Visit - Final Check', hi: 'आठवीं जाँच - अंतिम जाँच', checkups: ['Baby position', 'Weight', 'BP', 'Cervix check'] },
];

// ─── Supplement Types ────────────────────────────────────────────────────────
export const SupplementTypes = [
  { id: 'iron', name_hi: 'आयरन', name_en: 'Iron + Folic Acid', emoji: '💊', color: Colors.danger },
  { id: 'calcium', name_hi: 'कैल्शियम', name_en: 'Calcium', emoji: '🦴', color: Colors.info },
  { id: 'folic_acid', name_hi: 'फोलिक एसिड', name_en: 'Folic Acid', emoji: '💚', color: Colors.success },
];
