import type { Category } from '@/types/transaction'

/** Fallback when no rule matches */
export const UNCATEGORIZED_ID = 'other-uncategorized'

const C = {
  housing: '#4f46e5',
  transportation: '#0891b2',
  groceries: '#16a34a',
  foodDining: '#ea580c',
  healthcare: '#dc2626',
  shopping: '#9333ea',
  entertainment: '#e11d48',
  education: '#2563eb',
  financial: '#6b7280',
  family: '#d97706',
  communications: '#0d9488',
  pets: '#c2410c',
  other: '#64748b',
  income: '#15803d',
} as const

function parent(
  id: string,
  name: string,
  color: string,
  icon: string
): Category {
  return { id, name, color, icon, isSystem: true, parentId: null }
}

function child(
  id: string,
  name: string,
  parentId: string,
  color: string,
  icon: string
): Category {
  return { id, name, color, icon, isSystem: true, parentId }
}

/**
 * Household transaction classifications — parent + subcategory tree.
 * Colors from the household palette (children inherit parent color).
 */
export const DEFAULT_CATEGORIES: Category[] = [
  // ── Housing ──────────────────────────────────────────────
  parent('housing', 'Housing', C.housing, '🏠'),
  child('housing-mortgage-rent', 'Mortgage / Rent', 'housing', C.housing, '🔑'),
  child('housing-hoa', 'HOA Fees', 'housing', C.housing, '🏘️'),
  child('housing-property-tax', 'Property Taxes', 'housing', C.housing, '📜'),
  child('housing-insurance', 'Home Insurance', 'housing', C.housing, '🛡️'),
  child('housing-repairs', 'Home Repairs', 'housing', C.housing, '🔧'),
  child('housing-electric', 'Electricity', 'housing', C.housing, '⚡'),
  child('housing-gas', 'Gas / Natural Gas', 'housing', C.housing, '🔥'),
  child('housing-water', 'Water / Sewer', 'housing', C.housing, '💧'),
  child('housing-trash', 'Trash / Recycling', 'housing', C.housing, '🗑️'),
  child('housing-internet', 'Internet / Broadband', 'housing', C.housing, '🌐'),
  child('housing-cable', 'Cable / Satellite TV', 'housing', C.housing, '📡'),
  child('housing-phone', 'Phone (Home)', 'housing', C.housing, '☎️'),

  // ── Transportation ───────────────────────────────────────
  parent('transportation', 'Transportation', C.transportation, '🚗'),
  child('transport-auto-payment', 'Auto Payment', 'transportation', C.transportation, '🚙'),
  child('transport-auto-insurance', 'Auto Insurance', 'transportation', C.transportation, '📋'),
  child('transport-fuel', 'Fuel / Gas', 'transportation', C.transportation, '⛽'),
  child('transport-transit', 'Public Transit', 'transportation', C.transportation, '🚇'),
  child('transport-parking', 'Parking', 'transportation', C.transportation, '🅿️'),
  child('transport-tolls', 'Tolls', 'transportation', C.transportation, '🛣️'),
  child('transport-maintenance', 'Vehicle Maintenance', 'transportation', C.transportation, '🛠️'),
  child('transport-registration', 'Vehicle Registration', 'transportation', C.transportation, '🏷️'),
  child('transport-rideshare', 'Rideshare', 'transportation', C.transportation, '🚕'),

  // ── Groceries ────────────────────────────────────────────
  parent('groceries', 'Groceries', C.groceries, '🛒'),
  child('groceries-stores', 'Grocery Stores', 'groceries', C.groceries, '🏪'),
  child('groceries-farmers', 'Farmers Markets', 'groceries', C.groceries, '🥬'),
  child('groceries-bulk', 'Bulk Stores', 'groceries', C.groceries, '📦'),
  child('groceries-specialty', 'Specialty Food', 'groceries', C.groceries, '🧀'),
  child('groceries-online', 'Online Grocery', 'groceries', C.groceries, '📱'),

  // ── Food & Dining ────────────────────────────────────────
  parent('food-dining', 'Food & Dining', C.foodDining, '🍽️'),
  child('dining-fast-food', 'Fast Food', 'food-dining', C.foodDining, '🍔'),
  child('dining-casual', 'Casual Dining', 'food-dining', C.foodDining, '🥗'),
  child('dining-fine', 'Fine Dining', 'food-dining', C.foodDining, '🍷'),
  child('dining-coffee', 'Coffee Shops', 'food-dining', C.foodDining, '☕'),
  child('dining-bars', 'Bars / Nightlife', 'food-dining', C.foodDining, '🍻'),

  // ── Healthcare ───────────────────────────────────────────
  parent('healthcare', 'Healthcare', C.healthcare, '💊'),
  child('health-medical', 'Medical', 'healthcare', C.healthcare, '🩺'),
  child('health-dental', 'Dental', 'healthcare', C.healthcare, '🦷'),
  child('health-vision', 'Vision', 'healthcare', C.healthcare, '👓'),
  child('health-pharmacy', 'Pharmacy', 'healthcare', C.healthcare, '💊'),
  child('health-insurance', 'Health Insurance', 'healthcare', C.healthcare, '🏥'),
  child('health-therapy', 'Therapy / Mental Health', 'healthcare', C.healthcare, '🧠'),
  child('health-fitness', 'Fitness', 'healthcare', C.healthcare, '🏋️'),

  // ── Shopping ─────────────────────────────────────────────
  parent('shopping', 'Shopping', C.shopping, '👗'),
  child('shop-clothing', 'Clothing', 'shopping', C.shopping, '👕'),
  child('shop-electronics', 'Electronics', 'shopping', C.shopping, '💻'),
  child('shop-home-goods', 'Home Goods', 'shopping', C.shopping, '🛋️'),
  child('shop-hardware', 'Hardware', 'shopping', C.shopping, '🔩'),
  child('shop-department', 'Department Stores', 'shopping', C.shopping, '🏬'),
  child('shop-online', 'Online Shopping', 'shopping', C.shopping, '📦'),
  child('shop-personal-care', 'Personal Care', 'shopping', C.shopping, '💇'),
  child('shop-gifts', 'Gifts', 'shopping', C.shopping, '🎀'),

  // ── Entertainment ────────────────────────────────────────
  parent('entertainment', 'Entertainment', C.entertainment, '🎬'),
  child('ent-streaming', 'Streaming Services', 'entertainment', C.entertainment, '📺'),
  child('ent-movies', 'Movies', 'entertainment', C.entertainment, '🍿'),
  child('ent-sports', 'Sports', 'entertainment', C.entertainment, '⚽'),
  child('ent-hobbies', 'Hobbies', 'entertainment', C.entertainment, '🎮'),
  child('ent-subscriptions', 'Subscriptions', 'entertainment', C.entertainment, '📰'),
  child('ent-airlines', 'Airlines', 'entertainment', C.entertainment, '✈️'),
  child('ent-hotels', 'Hotels / Lodging', 'entertainment', C.entertainment, '🏨'),
  child('ent-vacation-rentals', 'Vacation Rentals', 'entertainment', C.entertainment, '🏡'),
  child('ent-cruises', 'Cruise Lines', 'entertainment', C.entertainment, '🚢'),
  child('ent-theme-parks', 'Theme Parks', 'entertainment', C.entertainment, '🎢'),
  child('ent-travel-insurance', 'Travel Insurance', 'entertainment', C.entertainment, '🧳'),

  // ── Education ────────────────────────────────────────────
  parent('education', 'Education', C.education, '📚'),
  child('edu-tuition', 'Tuition', 'education', C.education, '🎓'),
  child('edu-books', 'Books', 'education', C.education, '📖'),
  child('edu-courses', 'Courses', 'education', C.education, '💻'),
  child('edu-childcare', 'Childcare', 'education', C.education, '👶'),
  child('edu-supplies', 'School Supplies', 'education', C.education, '✏️'),

  // ── Financial ────────────────────────────────────────────
  parent('financial', 'Financial', C.financial, '💰'),
  child('fin-bank-fees', 'Bank Fees', 'financial', C.financial, '🏦'),
  child('fin-investments', 'Investments', 'financial', C.financial, '📈'),
  child('fin-insurance', 'Insurance', 'financial', C.financial, '🛡️'),
  child('fin-taxes', 'Taxes', 'financial', C.financial, '🧾'),
  child('fin-loans', 'Loans', 'financial', C.financial, '📄'),
  child('fin-credit-cards', 'Credit Card Payments', 'financial', C.financial, '💳'),
  child('fin-subscriptions', 'Subscriptions', 'financial', C.financial, '☁️'),

  // ── Family ───────────────────────────────────────────────
  parent('family', 'Family', C.family, '👨‍👩‍👧'),
  child('family-childcare', 'Childcare', 'family', C.family, '🧒'),
  child('family-activities', "Kids' Activities", 'family', C.family, '🎨'),
  child('family-baby', 'Baby Supplies', 'family', C.family, '🍼'),
  child('family-education', 'Education', 'family', C.family, '📚'),

  // ── Communications ───────────────────────────────────────
  parent('communications', 'Communications', C.communications, '📞'),
  child('comm-mobile', 'Mobile Phone', 'communications', C.communications, '📱'),
  child('comm-internet', 'Home Internet', 'communications', C.communications, '🌐'),
  child('comm-home-phone', 'Home Phone', 'communications', C.communications, '☎️'),

  // ── Pets ─────────────────────────────────────────────────
  parent('pets', 'Pets', C.pets, '🐾'),
  child('pets-vet', 'Veterinary', 'pets', C.pets, '🏥'),
  child('pets-food', 'Pet Food', 'pets', C.pets, '🦴'),
  child('pets-insurance', 'Pet Insurance', 'pets', C.pets, '🐕'),
  child('pets-grooming', 'Pet Grooming', 'pets', C.pets, '✂️'),

  // ── Other / Uncategorized ────────────────────────────────
  parent('other', 'Other / Uncategorized', C.other, '🎁'),
  child('other-misc', 'Miscellaneous', 'other', C.other, '📎'),
  child(UNCATEGORIZED_ID, 'Uncategorized', 'other', C.other, '❓'),
  child('other-refunds', 'Refunds', 'other', C.other, '↩️'),
  child('other-atm', 'Cash Withdrawals', 'other', C.other, '🏧'),
  child('other-transfers', 'Transfers', 'other', C.other, '🔀'),

  // ── Income ───────────────────────────────────────────────
  parent('income', 'Income', C.income, '💵'),
  child('income-salary', 'Salary / Wages', 'income', C.income, '💼'),
  child('income-freelance', 'Freelance', 'income', C.income, '🖥️'),
  child('income-investment', 'Investment Income', 'income', C.income, '📊'),
  child('income-benefits', 'Government Benefits', 'income', C.income, '🏛️'),
  child('income-refunds', 'Refunds', 'income', C.income, '💸'),
  child('income-gifts', 'Gifts Received', 'income', C.income, '🎁'),
  child('income-rental', 'Rental Income', 'income', C.income, '🏠'),
  child('income-other', 'Other Income', 'income', C.income, '💰'),
]

export const DB_NAME = 'budgett-db'
/** Bump when default category taxonomy changes */
export const DB_VERSION = 3

export const STORE_TRANSACTIONS = 'transactions'
export const STORE_CATEGORIES = 'categories'
export const STORE_RULES = 'rules'
export const STORE_BUDGETS = 'budgets'
export const STORE_SETTINGS = 'settings'
