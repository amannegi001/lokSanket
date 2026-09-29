import mongoose from "mongoose";
import * as path from "path";

// Load environment variables from .env.local natively without external dependencies
try {
  process.loadEnvFile(path.resolve(process.cwd(), ".env.local"));
} catch {
  // Environment variables might already be present in execution environment
}

import { Complaint, IComplaint } from "../models/Complaint";
import { IssueCluster } from "../models/IssueCluster";
import { processComplaintsPipeline } from "../lib/priority";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in .env.local");
  process.exit(1);
}

// Realistic Photo evidence URLs (synthetic civic images)
const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80",
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generates a timestamp relative to days ago
function dateDaysAgo(daysAgo: number, jitterHours: number = 24): Date {
  const now = Date.now();
  const ms = daysAgo * 24 * 60 * 60 * 1000 + randomInt(0, jitterHours) * 60 * 60 * 1000;
  return new Date(now - ms);
}

interface RawSeedConfig {
  category: string;
  subcategory: string;
  ward: string;
  localities: string[];
  count: number;
  photoCount: number;
  severityDist: { low: number; medium: number; high: number; critical: number };
  trendProfile: "surging" | "stable" | "declining";
  templates: {
    hindi: string[];
    hinglish: string[];
    english: string[];
  };
  affectedGroups: string[];
  keywords: string[];
}

const SEED_CONFIGS: RawSeedConfig[] = [
  // ==========================================
  // 1. INTENTIONAL DEMO STORY: Ward 17 - Road Infrastructure
  // Exactly 137 reports, 5 localities, 18 photos, surging trend
  // ==========================================
  {
    category: "Road Infrastructure",
    subcategory: "Potholes / Road Damage",
    ward: "Ward 17",
    localities: [
      "Ward 17 - Gandhi Nagar Main Road",
      "Ward 17 - Patel Chowk Crossroad",
      "Ward 17 - Station Road near Metro Pillar 42",
      "Ward 17 - Subhash Marg Bazaar",
      "Ward 17 - Govt Girls Inter College Road",
    ],
    count: 137,
    photoCount: 18,
    severityDist: { low: 2, medium: 15, high: 95, critical: 25 },
    trendProfile: "surging", // ~102 in last 14 days, ~35 in 15-28 days
    affectedGroups: ["students", "daily commuters", "auto drivers", "local shopkeepers", "residents"],
    keywords: ["road damage", "potholes", "ward 17", "gandhi nagar", "accidents", "waterlogging"],
    templates: {
      hinglish: [
        "Ward 17 Gandhi Nagar road par itne bade potholes hain ki kal do bike slip ho gayi. Baarish mein paani bhar jata hai aur kuch dikhta nahi.",
        "Patel Chowk se Station road tak pura rasta tuta hua hai. Bachchon ki school bus roz fas jati hai. Urgent repair chahiye.",
        "Station Road Metro pillar 42 ke paas road sink ho rahi hai. Heavy traffic jam rehta hai.",
        "Subhash Marg Bazaar wali sadak pe gaddhe hi gaddhe hain, customer gir rahe hain aur business pe asar pad raha hai.",
        "Girls college ke samne sadak bilkul kharab hai, paani jamne se paidal chalna bhi mushkil hai.",
      ],
      hindi: [
        "वार्ड 17 गांधी नगर मुख्य मार्ग पर गहरे गड्ढे हो गए हैं, आए दिन दुर्घटनाएं हो रही हैं। प्रशासन तुरंत ध्यान दे।",
        "पटेल चौक पर सड़क का डामर पूरी तरह उखड़ चुका है। बारिश में जलभराव से गड्ढे जानलेवा साबित हो रहे हैं।",
        "स्टेशन रोड पर सड़क धंसने से रोजाना घंटों जाम लग रहा है। स्कूल के बच्चों और एंबुलेंस को भारी परेशानी हो रही है।",
        "सुभाष मार्ग बाजार की मुख्य सड़क पिछले छह महीने से टूटी पड़ी है, दुकानदार और राहगीर सब परेशान हैं।",
      ],
      english: [
        "The main road in Ward 17 near Gandhi Nagar has disintegrated with dangerous craters causing multiple two-wheeler accidents daily.",
        "Severe road damage and water stagnation on Patel Chowk junction hindering emergency ambulances and daily commute.",
        "Station Road near Metro Pillar 42 has massive potholes. School buses are getting stranded every morning.",
      ],
    },
  },

  // ==========================================
  // 2. Ward 4 - Waste Management (High Volume, Stable Trend)
  // ~115 reports
  // ==========================================
  {
    category: "Waste Management",
    subcategory: "Unattended Garbage Dumps",
    ward: "Ward 4",
    localities: [
      "Ward 4 - Sabzi Mandi Corner",
      "Ward 4 - Block C Community Center",
      "Ward 4 - Railway Line Enclave",
      "Ward 4 - Sector Market Gate 2",
    ],
    count: 115,
    photoCount: 12,
    severityDist: { low: 10, medium: 35, high: 60, critical: 10 },
    trendProfile: "stable",
    affectedGroups: ["residents", "vegetable vendors", "pedestrians"],
    keywords: ["garbage", "kachra", "bad smell", "stray animals", "waste dump"],
    templates: {
      hinglish: [
        "Ward 4 sabzi mandi ke paas kachre ka dher pichle ek hafte se nahi uthaya gaya. Bahut badboo aa rahi hai.",
        "Block C park ke bahar log kooda daal rahe hain, stray dogs ka terror badh gaya hai.",
      ],
      hindi: [
        "वार्ड 4 सब्जी मंडी के पास कचरे का अंबार लगा हुआ है, सफाई कर्मचारी कई दिनों से नहीं आए हैं।",
        "ब्लॉक सी में सार्वजनिक स्थान पर कचरा फेंकने से बीमारियां फैलने की आशंका बढ़ गई है।",
      ],
      english: [
        "Huge open garbage dump near Ward 4 market is not being cleared by municipal trucks, causing foul odor and health risks.",
      ],
    },
  },

  // ==========================================
  // 3. Ward 14 - Water Supply (Medium-High, Declining)
  // ~85 reports
  // ==========================================
  {
    category: "Water Supply",
    subcategory: "Contaminated Drinking Water",
    ward: "Ward 14",
    localities: [
      "Ward 14 - Purana Bazaar",
      "Ward 14 - Gali Number 3",
      "Ward 14 - Shivaji Nagar",
    ],
    count: 85,
    photoCount: 6,
    severityDist: { low: 5, medium: 25, high: 45, critical: 10 },
    trendProfile: "declining",
    affectedGroups: ["families", "children", "senior citizens"],
    keywords: ["water supply", "peene ka paani", "dirty water", "chlorine", "pipeline"],
    templates: {
      hinglish: [
        "Ward 14 mein subah se nalke mein ganda aur badboodar paani aa raha hai, peene layak bilkul nahi hai.",
        "Shivaji Nagar gali no 3 mein paani ki supply me sewer ka paani mix ho raha hai.",
      ],
      hindi: [
        "वार्ड 14 में पिछले दो दिनों से नलों में मटमैला पानी आ रहा है, बच्चे बीमार पड़ रहे हैं।",
      ],
      english: [
        "Contaminated tap water supply in Ward 14 residential lanes. Suspected sewage line leakage into drinking water mains.",
      ],
    },
  },

  // ==========================================
  // 4. Ward 8 - Drainage (High, Surging)
  // ~95 reports
  // ==========================================
  {
    category: "Drainage",
    subcategory: "Overflowing Open Drains",
    ward: "Ward 8",
    localities: [
      "Ward 8 - Indira Colony Main Nullah",
      "Ward 8 - Harijan Basti Road",
      "Ward 8 - Primary School Lane",
    ],
    count: 95,
    photoCount: 9,
    severityDist: { low: 5, medium: 20, high: 55, critical: 15 },
    trendProfile: "surging",
    affectedGroups: ["residents", "school children", "shopkeepers"],
    keywords: ["drainage", "nullah", "overflow", "monsoon", "mosquitoes"],
    templates: {
      hinglish: [
        "Indira Colony ka main naala pura choke ho chuka hai, paani sadak pe beh raha hai.",
        "Primary school lane mein ganda paani bhar gaya hai, bachcho ka nikalna mushkil ho gaya hai.",
      ],
      hindi: [
        "वार्ड 8 इंदिरा कॉलोनी में नाले की सफाई न होने से गंदा पानी घरों के आगे भर रहा है।",
      ],
      english: [
        "Open drainage overflow in Ward 8 near residential colony. High risk of dengue and malaria outbreak.",
      ],
    },
  },

  // ==========================================
  // 5. Ward 9 - Healthcare (Doctor/Staff Shortage)
  // ~80 reports
  // ==========================================
  {
    category: "Healthcare",
    subcategory: "Primary Health Center Deficiencies",
    ward: "Ward 9",
    localities: [
      "Ward 9 - PHC Community Dispensary",
      "Ward 9 - Civil Lines South",
    ],
    count: 80,
    photoCount: 3,
    severityDist: { low: 10, medium: 30, high: 35, critical: 5 },
    trendProfile: "stable",
    affectedGroups: ["patients", "pregnant women", "senior citizens"],
    keywords: ["doctor shortage", "dispensary", "medicines", "phc", "health"],
    templates: {
      hinglish: [
        "Ward 9 dispensary mein doctor do hafte se nahi aa rahe hain, dawaiyan bhi khatam hain.",
      ],
      hindi: [
        "वार्ड 9 प्राथमिक स्वास्थ्य केंद्र में डॉक्टर उपलब्ध नहीं रहते और आवश्यक दवाइयों का अभाव है।",
      ],
      english: [
        "Primary health dispensary in Ward 9 facing chronic physician absence and generic medicine shortage.",
      ],
    },
  },

  // ==========================================
  // 6. Ward 6 - Electricity (Voltage & Power Outages)
  // ~75 reports
  // ==========================================
  {
    category: "Electricity",
    subcategory: "Transformer Overload & Fluctuations",
    ward: "Ward 6",
    localities: [
      "Ward 6 - Industrial Feeder Lane",
      "Ward 6 - Shanti Kunj",
      "Ward 6 - New Basti",
    ],
    count: 75,
    photoCount: 5,
    severityDist: { low: 5, medium: 30, high: 35, critical: 5 },
    trendProfile: "stable",
    affectedGroups: ["small businesses", "households", "students"],
    keywords: ["power cut", "voltage fluctuation", "transformer", "electricity"],
    templates: {
      hinglish: [
        "Ward 6 Shanti Kunj mein voltage itna low hai ki fans aur fridge nahi chal rahe, transformer se aawaz aa rahi hai.",
      ],
      hindi: [
        "वार्ड 6 में बार-बार बिजली कटने और अत्यधिक वोल्टेज उतार-चढ़ाव से घरेलू उपकरण खराब हो रहे हैं।",
      ],
      english: [
        "Persistent high-voltage surges and frequent tripping of local transformer in Ward 6.",
      ],
    },
  },

  // ==========================================
  // 7. Ward 5 - Street Lighting (Low Severity, Dispersed)
  // ~70 reports
  // ==========================================
  {
    category: "Street Lighting",
    subcategory: "Non-functional Street Lights",
    ward: "Ward 5",
    localities: [
      "Ward 5 - Lane 1",
      "Ward 5 - Lane 4",
      "Ward 5 - Lane 7",
      "Ward 5 - Lane 9",
      "Ward 5 - Outer Ring Road",
      "Ward 5 - Temple Road",
      "Ward 5 - Park Avenue",
    ],
    count: 70,
    photoCount: 4,
    severityDist: { low: 45, medium: 22, high: 3, critical: 0 },
    trendProfile: "declining",
    affectedGroups: ["night commuters", "women pedestrians", "residents"],
    keywords: ["street light", "andhera", "darkness", "pole", "bulb fused"],
    templates: {
      hinglish: [
        "Ward 5 temple road par street lights pichle 15 din se band padi hain, raat me andhera rehta hai.",
      ],
      hindi: [
        "वार्ड 5 की गलियों में स्ट्रीट लाइट खराब होने से शाम के समय सुरक्षा को लेकर डर बना रहता है।",
      ],
      english: [
        "Multiple street lamp posts are non-functional across Ward 5 lanes, creating safety concerns at night.",
      ],
    },
  },

  // ==========================================
  // 8. Ward 11 - Education (School Infrastructure)
  // ~55 reports
  // ==========================================
  {
    category: "Education",
    subcategory: "Government School Infrastructure",
    ward: "Ward 11",
    localities: [
      "Ward 11 - Govt Primary School Compound",
      "Ward 11 - Adarsh Nagar",
    ],
    count: 55,
    photoCount: 8,
    severityDist: { low: 10, medium: 25, high: 18, critical: 2 },
    trendProfile: "stable",
    affectedGroups: ["school students", "teachers", "parents"],
    keywords: ["school", "desks", "toilets", "drinking water", "students"],
    templates: {
      hinglish: [
        "Ward 11 primary school me toilets ki halat bahut kharab hai aur paani ki suvidha nahi hai.",
      ],
      hindi: [
        "वार्ड 11 सरकारी प्राथमिक विद्यालय में टूटे बेंच और साफ-सफाई के अभाव से बच्चे परेशान हैं।",
      ],
      english: [
        "Government primary school in Ward 11 lacks functional sanitation facilities and drinking water coolers.",
      ],
    },
  },

  // ==========================================
  // 9. Ward 15 - Public Transport (Bus Stops & Routes)
  // ~65 reports
  // ==========================================
  {
    category: "Public Transport",
    subcategory: "Bus Shelter & Route Irregularity",
    ward: "Ward 15",
    localities: [
      "Ward 15 - Main Bus Stop Shelter",
      "Ward 15 - Bypass Junction",
    ],
    count: 65,
    photoCount: 3,
    severityDist: { low: 30, medium: 28, high: 7, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["daily wage workers", "office commuters", "college students"],
    keywords: ["bus stop", "public transport", "irregular bus", "commute"],
    templates: {
      hinglish: [
        "Ward 15 bus stand ka shed toota hua hai, dhoop aur baarish me khade rehne me pareshani hoti hai.",
      ],
      hindi: [
        "वार्ड 15 बाईपास पर बसों का नियमित ठहराव नहीं हो रहा, यात्रियों को घंटों इंतजार करना पड़ता है।",
      ],
      english: [
        "Damaged bus shelter in Ward 15 and erratic feeder bus frequency affecting daily office commute.",
      ],
    },
  },

  // ==========================================
  // 10. Ward 12 - Sanitation (Public Toilets)
  // ~60 reports
  // ==========================================
  {
    category: "Sanitation",
    subcategory: "Public Toilet Hygiene & Maintenance",
    ward: "Ward 12",
    localities: [
      "Ward 12 - Near Bus Stand Public Toilet",
      "Ward 12 - Weekly Haat Ground",
    ],
    count: 60,
    photoCount: 4,
    severityDist: { low: 10, medium: 35, high: 15, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["market visitors", "shopkeepers", "drivers"],
    keywords: ["toilet", "shauchalay", "hygiene", "sanitation", "cleanliness"],
    templates: {
      hinglish: [
        "Ward 12 haat ground ke paas public toilet me paani nahi hai aur bilkul safai nahi hoti.",
      ],
      hindi: [
        "वार्ड 12 सामुदायिक शौचालय में ताला लटका रहता है और पानी की टंकी टूटी हुई है।",
      ],
      english: [
        "Public toilet near Ward 12 market is in unhygienic condition with no running water supply.",
      ],
    },
  },

  // ==========================================
  // 11. Ward 3 - Water Supply (Pipeline Leakage)
  // ~45 reports
  // ==========================================
  {
    category: "Water Supply",
    subcategory: "Pipeline Leakage & Wastage",
    ward: "Ward 3",
    localities: [
      "Ward 3 - Ring Road Crossing",
      "Ward 3 - Vikas Enclave",
    ],
    count: 45,
    photoCount: 6,
    severityDist: { low: 15, medium: 22, high: 8, critical: 0 },
    trendProfile: "declining",
    affectedGroups: ["residents", "passersby"],
    keywords: ["pipe leak", "water waste", "jal vibhag", "pipeline"],
    templates: {
      hinglish: [
        "Ward 3 Vikas enclave ke samne main underground pipe phat gaya hai, lakho liter paani sadak pe beh raha hai.",
      ],
      hindi: [
        "वार्ड 3 में मुख्य पाइपलाइन से लगातार पानी बहने के कारण सड़क क्षतिग्रस्त हो रही है।",
      ],
      english: [
        "Underground pipeline burst in Ward 3 causing thousands of liters of clean drinking water to flood the road.",
      ],
    },
  },

  // ==========================================
  // 12. Ward 21 - Street Lighting (Broken Poles)
  // ~40 reports
  // ==========================================
  {
    category: "Street Lighting",
    subcategory: "Damaged Electric Poles",
    ward: "Ward 21",
    localities: ["Ward 21 - Old City Gate", "Ward 21 - Kasai Gali"],
    count: 40,
    photoCount: 3,
    severityDist: { low: 5, medium: 25, high: 10, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["residents", "pedestrians"],
    keywords: ["pole tilted", "broken pole", "electric wire", "safety"],
    templates: {
      hinglish: ["Ward 21 old gate ke paas bijli ka khamba jhuk gaya hai, taar latak rahe hain."],
      hindi: ["वार्ड 21 में पुराना बिजली का खंभा झुक गया है, जो किसी भी वक्त गिर सकता है।"],
      english: ["Tilted street lighting pole with hanging open wires posing hazard in Ward 21."],
    },
  },

  // ==========================================
  // 13. Ward 19 - Electricity (Unscheduled Power Cuts)
  // ~50 reports
  // ==========================================
  {
    category: "Electricity",
    subcategory: "Unscheduled Power Outages",
    ward: "Ward 19",
    localities: ["Ward 19 - New Subhash Nagar", "Ward 19 - Tagore Park"],
    count: 50,
    photoCount: 1,
    severityDist: { low: 12, medium: 28, high: 10, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["households", "work-from-home professionals"],
    keywords: ["light cut", "power failure", "bijli", "inverter"],
    templates: {
      hinglish: ["Ward 19 me bina kisi notice ke din me 4-5 baar 2 ghante ke liye light chali jati hai."],
      hindi: ["वार्ड 19 में अघोषित बिजली कटौती से छात्र और गृहणियां बेहद परेशान हैं।"],
      english: ["Frequent unannounced power outages in Ward 19 during daytime peak hours."],
    },
  },

  // ==========================================
  // 14. Ward 22 - Waste Management (Door-to-door Collection)
  // ~45 reports
  // ==========================================
  {
    category: "Waste Management",
    subcategory: "Irregular Door-to-Door Collection",
    ward: "Ward 22",
    localities: ["Ward 22 - Extension Colony", "Ward 22 - Green View"],
    count: 45,
    photoCount: 2,
    severityDist: { low: 25, medium: 18, high: 2, critical: 0 },
    trendProfile: "declining",
    affectedGroups: ["residents", "apartment complexes"],
    keywords: ["kachra gaadi", "garbage van", "collection", "swachhata"],
    templates: {
      hinglish: ["Ward 22 me kachre wali gaadi hafte me sirf do din aati hai, ghar me kooda ikattha ho jata hai."],
      hindi: ["वार्ड 22 ग्रीन व्यू कॉलोनी में कचरा संग्रहण वाहन नियमित रूप से नहीं आ रहा है।"],
      english: ["Door-to-door waste collection vehicle is highly irregular in Ward 22."],
    },
  },

  // ==========================================
  // 15. Ward 2 - Healthcare (Medicine Stockout)
  // ~35 reports
  // ==========================================
  {
    category: "Healthcare",
    subcategory: "Dispensary Medicine Shortage",
    ward: "Ward 2",
    localities: ["Ward 2 - Urban Health Post", "Ward 2 - Sharda Nagar"],
    count: 35,
    photoCount: 2,
    severityDist: { low: 5, medium: 20, high: 10, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["elderly", "chronic patients"],
    keywords: ["BP medicine", "sugar medicine", "dispensary", "shortage"],
    templates: {
      hinglish: ["Ward 2 health post pe diabetes aur BP ki standard dawa pichle ek mahine se nahi mil rahi."],
      hindi: ["वार्ड 2 स्वास्थ्य केंद्र में आवश्यक जीवनरक्षक दवाइयों का टोटा बना हुआ है।"],
      english: ["Essential chronic disease medicines out of stock at Ward 2 dispensary."],
    },
  },

  // ==========================================
  // 16. Ward 16 - Drainage (Monsoon Blockage)
  // ~40 reports
  // ==========================================
  {
    category: "Drainage",
    subcategory: "Blocked Stormwater Drains",
    ward: "Ward 16",
    localities: ["Ward 16 - Underpass Link Road", "Ward 16 - Transport Nagar"],
    count: 40,
    photoCount: 4,
    severityDist: { low: 5, medium: 15, high: 18, critical: 2 },
    trendProfile: "surging",
    affectedGroups: ["drivers", "commuters"],
    keywords: ["underpass", "waterlogging", "stormwater", "drainage"],
    templates: {
      hinglish: ["Ward 16 underpass me halki baarish me bhi 3 foot paani bhar jata hai kyuki naali band hai."],
      hindi: ["वार्ड 16 अंडरपास में ड्रेनेज जाम होने के कारण गाड़ियां डूबने का खतरा बना रहता है।"],
      english: ["Blocked stormwater drainage causing submerged underpass on Ward 16 link road."],
    },
  },

  // ==========================================
  // 17. Ward 7 - Road Infrastructure (Minor Patchwork)
  // ~45 reports
  // ==========================================
  {
    category: "Road Infrastructure",
    subcategory: "Minor Surface Erosion",
    ward: "Ward 7",
    localities: ["Ward 7 - Anand Vihar Sector A", "Ward 7 - Sector B Colony"],
    count: 45,
    photoCount: 3,
    severityDist: { low: 25, medium: 18, high: 2, critical: 0 },
    trendProfile: "declining",
    affectedGroups: ["residents", "cyclists"],
    keywords: ["gravel", "patchwork", "road surface"],
    templates: {
      hinglish: ["Ward 7 me sadak ki gitiyan nikal aayi hain, repair ka kaam aadha adhura chhod diya."],
      hindi: ["वार्ड 7 आनंद विहार में सड़क की ऊपरी परत उखड़ गई है, जिससे धूल उड़ती है।"],
      english: ["Loose gravel and uneven patch work on Ward 7 interior colony roads."],
    },
  },

  // ==========================================
  // 18. Ward 10 - Sanitation (Garbage Burning)
  // ~35 reports
  // ==========================================
  {
    category: "Sanitation",
    subcategory: "Illegal Waste Burning",
    ward: "Ward 10",
    localities: ["Ward 10 - Open Ground near Ring Road", "Ward 10 - Sector 10 Border"],
    count: 35,
    photoCount: 3,
    severityDist: { low: 5, medium: 15, high: 15, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["asthma patients", "residents", "morning walkers"],
    keywords: ["kachra jalana", "smoke", "pollution", "air quality"],
    templates: {
      hinglish: ["Ward 10 ground me roz raat ko kachre me aag laga dete hain, pura dhuan colony me ghus jata hai."],
      hindi: ["वार्ड 10 खाली मैदान में कचरा जलाने से वायु प्रदूषण बढ़ रहा है और सांस लेना दूभर है।"],
      english: ["Illegal open burning of plastic and municipal solid waste in Ward 10 vacant plots."],
    },
  },
];

// Scattered background noise complaints across remaining wards (approx 60 reports)
const NOISE_WARDS = [
  "Ward 1",
  "Ward 13",
  "Ward 18",
  "Ward 20",
  "Ward 23",
  "Ward 24",
  "Ward 25",
];

function buildComplaintsForConfig(cfg: RawSeedConfig): Partial<IComplaint>[] {
  const list: Partial<IComplaint>[] = [];
  const severities: ("low" | "medium" | "high" | "critical")[] = [];

  for (let i = 0; i < cfg.severityDist.low; i++) severities.push("low");
  for (let i = 0; i < cfg.severityDist.medium; i++) severities.push("medium");
  for (let i = 0; i < cfg.severityDist.high; i++) severities.push("high");
  for (let i = 0; i < cfg.severityDist.critical; i++) severities.push("critical");

  // Adjust severities length to match target count
  while (severities.length < cfg.count) {
    severities.push("medium");
  }

  // Shuffle severities
  severities.sort(() => Math.random() - 0.5);

  for (let i = 0; i < cfg.count; i++) {
    const locality = cfg.localities[i % cfg.localities.length];
    const severity = severities[i];

    // Language selection: 45% Hinglish, 35% Hindi, 20% English
    const langRoll = Math.random();
    let lang = "hinglish";
    let templateList = cfg.templates.hinglish;
    if (langRoll > 0.8) {
      lang = "english";
      templateList = cfg.templates.english;
    } else if (langRoll > 0.45) {
      lang = "hindi";
      templateList = cfg.templates.hindi;
    }

    const rawTemplate = randomChoice(templateList);
    const rawText = `${rawTemplate} (${locality})`;

    // Image URL for photo evidence
    const hasPhoto = i < cfg.photoCount;
    const imageUrl = hasPhoto ? randomChoice(SAMPLE_PHOTOS) : undefined;

    // Timestamp calculation according to trend profile
    // Target window: 28 days
    let daysAgo: number;
    if (cfg.trendProfile === "surging") {
      // 75% in recent 14 days, 25% in 15-28 days ago
      daysAgo = Math.random() < 0.75 ? randomInt(1, 14) : randomInt(15, 28);
    } else if (cfg.trendProfile === "declining") {
      // 25% in recent 14 days, 75% in 15-28 days ago
      daysAgo = Math.random() < 0.25 ? randomInt(1, 14) : randomInt(15, 28);
    } else {
      // Stable: evenly distributed
      daysAgo = randomInt(1, 28);
    }

    const createdAt = dateDaysAgo(daysAgo);

    list.push({
      rawText,
      language: lang,
      normalizedText: `${cfg.category} issue regarding ${cfg.subcategory.toLowerCase()} reported at ${locality}.`,
      category: cfg.category,
      subcategory: cfg.subcategory,
      summary: `${cfg.subcategory} issue reported in ${locality}. Severity is assessed as ${severity}.`,
      severity,
      affectedGroups: cfg.affectedGroups,
      keywords: cfg.keywords,
      location: locality,
      imageUrl,
      status: "new",
      createdAt,
    });
  }

  return list;
}

function buildBackgroundNoiseComplaints(count: number = 60): Partial<IComplaint>[] {
  const noiseList: Partial<IComplaint>[] = [];
  const categories = [
    { cat: "Road Infrastructure", sub: "Potholes / Road Damage" },
    { cat: "Water Supply", sub: "Low Water Pressure" },
    { cat: "Street Lighting", sub: "Fused Street Light" },
    { cat: "Waste Management", sub: "Scattered Debris" },
    { cat: "Drainage", sub: "Clogged Gutter" },
  ];

  for (let i = 0; i < count; i++) {
    const ward = randomChoice(NOISE_WARDS);
    const locality = `${ward} - Sector ${randomInt(1, 8)}`;
    const catPair = randomChoice(categories);
    const severity = randomChoice<"low" | "medium" | "high">(["low", "medium", "high"]);
    const daysAgo = randomInt(1, 28);

    noiseList.push({
      rawText: `Minor grievance regarding ${catPair.sub.toLowerCase()} in ${locality}.`,
      language: "english",
      normalizedText: `${catPair.cat} grievance concerning ${catPair.sub} in ${locality}.`,
      category: catPair.cat,
      subcategory: catPair.sub,
      summary: `Citizen complaint for ${catPair.sub} in ${locality}.`,
      severity,
      affectedGroups: ["residents"],
      keywords: [catPair.sub.toLowerCase(), ward.toLowerCase()],
      location: locality,
      status: "new",
      createdAt: dateDaysAgo(daysAgo),
    });
  }

  return noiseList;
}

export async function seedDemoData() {
  console.log("=================================================");
  console.log("🌱 LokSanket Realistic Demo Dataset Seed Script");
  console.log("=================================================");
  console.log("Connecting to MongoDB Atlas...");

  await mongoose.connect(MONGODB_URI!, { dbName: "loksanket" });
  console.log("Connected successfully to database.");

  // Clear existing complaints and clusters to ensure clean baseline
  console.log("Purging old demonstration records...");
  await Complaint.deleteMany({});
  await IssueCluster.deleteMany({});
  console.log("Old records cleared.");

  // Assemble dataset
  const allComplaints: Partial<IComplaint>[] = [];

  for (const cfg of SEED_CONFIGS) {
    const items = buildComplaintsForConfig(cfg);
    allComplaints.push(...items);
  }

  // Add background noise complaints
  const noiseItems = buildBackgroundNoiseComplaints(75);
  allComplaints.push(...noiseItems);

  console.log(`Generated ${allComplaints.length} synthetic demonstration complaints.`);
  console.log("Inserting into MongoDB 'complaints' collection in batches...");

  const insertedComplaints = await Complaint.insertMany(allComplaints);
  console.log(`✓ Inserted ${insertedComplaints.length} complaint documents.`);

  // Verify Ward 17 Road Infrastructure count
  const ward17RoadComplaints = insertedComplaints.filter(
    (c) => c.category === "Road Infrastructure" && c.location?.includes("Ward 17")
  );
  const ward17Photos = ward17RoadComplaints.filter((c) => c.imageUrl);
  const ward17Localities = new Set(ward17RoadComplaints.map((c) => c.location));

  console.log("\n-------------------------------------------------");
  console.log("🎯 Intentional Demo Signal Verification (Ward 17):");
  console.log(`- Category: Road Infrastructure`);
  console.log(`- Total Ward 17 Road Reports: ${ward17RoadComplaints.length}`);
  console.log(`- Affected Localities: ${ward17Localities.size} distinct spots`);
  console.log(`- Photo Evidences: ${ward17Photos.length} submissions`);
  console.log("-------------------------------------------------");

  // Run initial clustering & deterministic priority calculation
  console.log("\nRunning initial clustering and deterministic priority engine...");
  // Fetch lean complaints with types
  const storedComplaints = await Complaint.find();
  const calculatedClusters = processComplaintsPipeline(storedComplaints);

  console.log(`Generated ${calculatedClusters.length} issue clusters.`);

  // Persist issue clusters to MongoDB
  for (const clusterData of calculatedClusters) {
    const newCluster = await IssueCluster.create({
      title: clusterData.title,
      category: clusterData.category,
      subcategory: clusterData.subcategory,
      wardIds: clusterData.wardIds,
      complaintIds: clusterData.complaintIds,
      reportCount: clusterData.reportCount,
      severityScore: clusterData.severityScore,
      trendScore: clusterData.trendScore,
      geographicScore: clusterData.geographicScore,
      evidenceScore: clusterData.evidenceScore,
      priorityScore: clusterData.priorityScore,
      priorityLevel: clusterData.priorityLevel,
      evidence: clusterData.evidence,
      officialDecision: "pending_review",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update complaint documents with clusterId
    await Complaint.updateMany(
      { _id: { $in: clusterData.complaintIds } },
      { $set: { clusterId: newCluster._id, status: "clustered" } }
    );
  }

  console.log(`✓ Stored ${calculatedClusters.length} IssueCluster records in MongoDB.`);
  console.log(`✓ Updated complaints with assigned clusterId.`);

  // Top 5 Ranked Issue Clusters
  console.log("\n🏆 TOP 5 RANKED ISSUE CLUSTERS:");
  calculatedClusters.slice(0, 5).forEach((c, idx) => {
    console.log(
      `#${idx + 1} [${c.priorityLevel.toUpperCase()}] Priority: ${c.priorityScore.toFixed(1)}/100 | ${c.title}`
    );
    console.log(
      `   Reports: ${c.reportCount} | Locs: ${c.evidence.affectedLocalities} | Photos: ${c.evidence.photoEvidenceCount} | Trend: ${c.evidence.trendPercent}%`
    );
    console.log(
      `   Scores -> Demand: ${c.evidence.demandVolumeScore} | Severity: ${c.severityScore} | Trend: ${c.trendScore} | Geo: ${c.geographicScore} | Evidence: ${c.evidenceScore}`
    );
  });

  await mongoose.disconnect();
  console.log("\n✅ Database disconnected. Seeding completed successfully!");
}

// Execute if run directly
if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seeding failed with error:", err);
      process.exit(1);
    });
}
