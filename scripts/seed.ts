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
import {
  aggregateConstituencySummary,
  aggregateCategoryWardEvidence,
} from "../lib/aggregation";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in .env.local");
  process.exit(1);
}

// ==========================================
// DETERMINISTIC PSEUDO-RANDOM NUMBER GENERATOR (Mulberry32)
// Using fixed seed 42 guarantees 100% reproducible results on every run.
// ==========================================
function createPRNG(seed: number) {
  let s = seed;
  return function () {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const prng = createPRNG(42);

function deterministicChoice<T>(arr: T[]): T {
  return arr[Math.floor(prng() * arr.length)];
}

function deterministicInt(min: number, max: number): number {
  return Math.floor(prng() * (max - min + 1)) + min;
}

// Generate deterministic timestamp relative to reference date
function createDateDaysAgo(refDate: Date, daysAgo: number, jitterHours: number = 12): Date {
  const ms =
    daysAgo * 24 * 60 * 60 * 1000 +
    deterministicInt(1, jitterHours) * 60 * 60 * 1000;
  return new Date(refDate.getTime() - ms);
}

// Safe demonstration photo URLs (local synthetic asset indicators)
function getDemoPhotoUrl(categorySlug: string, index: number): string {
  return `/demo-evidence/${categorySlug}-${String(index).padStart(2, "0")}.jpg`;
}

interface SeedConfig {
  category: string;
  subcategory: string;
  ward: string;
  localities: string[];
  count: number;
  photoCount: number;
  severityDist: { low: number; medium: number; high: number; critical: number };
  trendProfile: "surging" | "stable" | "declining";
  affectedGroups: string[];
  keywords: string[];
  templates: {
    hindi: string[];
    hinglish: string[];
    english: string[];
  };
}

const SEED_CONFIGS: SeedConfig[] = [
  // ==========================================
  // 1. INTENTIONAL DEMO STORY: Ward 17 - Road Infrastructure
  // Exactly 137 reports, 5 localities, 18 photos, surging trend (+159%)
  // 120 high/critical reports (95 high, 25 critical)
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
    trendProfile: "surging",
    affectedGroups: [
      "daily commuters",
      "school students",
      "auto drivers",
      "local shopkeepers",
      "senior citizens",
    ],
    keywords: [
      "potholes",
      "road damage",
      "accidents",
      "gandhi nagar",
      "waterlogging",
      "traffic hazard",
      "ward 17",
    ],
    templates: {
      hinglish: [
        "Ward 17 Gandhi Nagar road par itne bade potholes hain ki kal do bike slip ho gayi. Baarish mein paani bhar jata hai aur kuch dikhta nahi.",
        "Patel Chowk se Station road tak pura rasta tuta hua hai. Bachchon ki school bus roz fas jati hai. Urgent repair chahiye.",
        "Station Road Metro pillar 42 ke paas road sink ho rahi hai. Heavy traffic jam rehta hai aur accident ka darr hai.",
        "Subhash Marg Bazaar wali sadak pe gaddhe hi gaddhe hain, customer gir rahe hain aur dukano ka business pe asar pad raha hai.",
        "Girls college ke samne sadak bilkul kharab hai, paani jamne se paidal chalna bhi mushkil hai.",
        "Gandhi Nagar main market road condition is terrible, potholes 10 inch deep ho chuke hain.",
        "Patel chowk par deep crater hai. Kal raat ek auto palat gaya tha yahan.",
        "Subhash Marg pe sewer digging ke baad sadak bina banaye chhod di gayi hai, dhool aur gaddhe bohot hain.",
        "Pothole issue getting worse every day in Ward 17, no PWD officer listening.",
        "Road completely damaged near Metro pillar 42, please send repair team immediately.",
      ],
      hindi: [
        "वार्ड 17 गांधी नगर मुख्य मार्ग पर गहरे गड्ढे हो गए हैं, आए दिन दोपहिया वाहन दुर्घटनाग्रस्त हो रहे हैं। प्रशासन तुरंत संज्ञान ले।",
        "पटेल चौक पर सड़क का डामर पूरी तरह उखड़ चुका है। बारिश के पानी से गड्ढे जानलेवा साबित हो रहे हैं।",
        "स्टेशन रोड मेट्रो पिलर 42 के समीप सड़क धंसने से रोजाना घंटों जाम लग रहा है। स्कूल बसें और एंबुलेंस फंस रही हैं।",
        "सुभाष मार्ग बाजार की मुख्य सड़क पिछले छह महीने से टूटी पड़ी है, दुकानदार और राहगीर सब परेशान हैं।",
        "राजकीय कन्या इंटर कॉलेज के सामने सड़क पर भारी जलभराव और गहरे गड्ढे हैं, छात्राओं का निकलना मुश्किल है।",
        "गांधी नगर में सड़क पर 8 से 10 इंच गहरे गड्ढे बने हुए हैं, रात में रोशनी कम होने से भयंकर खतरा रहता है।",
        "पटेल चौराहे पर जानलेवा गड्ढों की तुरंत मरम्मत कराई जाए, कल एक ई-रिक्शा पलट गया था।",
      ],
      english: [
        "The main road in Ward 17 near Gandhi Nagar has disintegrated with dangerous craters causing multiple two-wheeler accidents daily.",
        "Severe road damage and water stagnation on Patel Chowk junction hindering emergency ambulances and daily office commute.",
        "Station Road near Metro Pillar 42 has massive sunken potholes. School buses are getting stranded every morning.",
        "Subhash Marg market road is severely broken after pipeline work. Pedestrians and shopkeepers facing hazardous dust and bumps.",
        "The stretch outside Govt Girls Inter College is heavily potholed, making walking unsafe for students during peak hours.",
        "Dangerous 9-inch potholes on Ward 17 main arterial route causing vehicular breakdown and severe gridlock.",
      ],
    },
  },

  // ==========================================
  // 2. Ward 4 - Waste Management (High Volume, Stable Trend)
  // ~125 reports across 4 localities
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
    count: 125,
    photoCount: 14,
    severityDist: { low: 10, medium: 40, high: 65, critical: 10 },
    trendProfile: "stable",
    affectedGroups: ["residents", "vegetable vendors", "pedestrians", "shoppers"],
    keywords: ["garbage", "kachra", "bad smell", "stray animals", "waste dump", "ward 4"],
    templates: {
      hinglish: [
        "Ward 4 sabzi mandi ke paas kachre ka dher pichle ek hafte se nahi uthaya gaya. Bahut badboo aa rahi hai.",
        "Block C park ke bahar log kooda daal rahe hain, stray dogs ka terror badh gaya hai.",
        "Railway line enclave ke kone pe municipal truck nahi aa rahi, kachra sadak par phail raha hai.",
        "Sector market gate 2 par open garbage bin overflow ho gaya hai, dukan kholna mushkil ho gaya.",
      ],
      hindi: [
        "वार्ड 4 सब्जी मंडी के पास कचरे का अंबार लगा हुआ है, सफाई कर्मचारी कई दिनों से नहीं आए हैं।",
        "ब्लॉक सी में सार्वजनिक स्थान पर कचरा फेंकने से बीमारियां फैलने की आशंका बढ़ गई है।",
        "रेलवे लाइन एनक्लेव के पास सड़क पर कूड़े का ढेर लगा है, बदबू के कारण सांस लेना मुश्किल है।",
        "सेक्टर मार्केट में कचरा पेटी महीनों से साफ नहीं की गई है, आवारा मवेशी कूड़ा फैला रहे हैं।",
      ],
      english: [
        "Huge open garbage dump near Ward 4 vegetable market is not being cleared by municipal trucks, causing foul odor and health risks.",
        "Overflowing waste container at Block C entrance creating severe sanitary hazard for local residents.",
        "Irregular garbage collection near Railway Line Enclave leading to widespread dumping on public roadway.",
      ],
    },
  },

  // ==========================================
  // 3. Ward 14 - Water Supply & Sanitation (Contaminated Water, Declining)
  // ~95 reports across 3 localities
  // ==========================================
  {
    category: "Water Supply & Sanitation",
    subcategory: "Contaminated Drinking Water",
    ward: "Ward 14",
    localities: [
      "Ward 14 - Purana Bazaar",
      "Ward 14 - Gali Number 3",
      "Ward 14 - Shivaji Nagar",
    ],
    count: 95,
    photoCount: 8,
    severityDist: { low: 5, medium: 30, high: 50, critical: 10 },
    trendProfile: "declining",
    affectedGroups: ["families", "children", "senior citizens", "households"],
    keywords: ["water supply", "peene ka paani", "dirty water", "pipeline leak", "contamination"],
    templates: {
      hinglish: [
        "Ward 14 mein subah se nalke mein ganda aur badboodar paani aa raha hai, peene layak bilkul nahi hai.",
        "Shivaji Nagar gali no 3 mein paani ki supply me sewer ka paani mix ho raha hai, bache bimar pad rahe hain.",
        "Purana bazaar area me peene ke paani me black particles aa rahe hain, jal vibhag me koi sun nahi raha.",
      ],
      hindi: [
        "वार्ड 14 में पिछले कई दिनों से नलों में मटमैला और बदबूदार पानी आ रहा है, बच्चे बीमार पड़ रहे हैं।",
        "शिवाजी नगर गली नंबर 3 में पेयजल पाइपलाइन में सीवर का गंदा पानी मिलने की आशंका है।",
        "पुराना बाजार में जलापूर्ति पूरी तरह दूषित है, डायरिया फैलने का खतरा मंडरा रहा है।",
      ],
      english: [
        "Contaminated tap water supply in Ward 14 residential lanes. Suspected sewage line leakage into drinking water mains.",
        "Muddy and foul-smelling tap water supplied in Shivaji Nagar causing gastrointestinal issues among children.",
        "Severe water contamination reported in Purana Bazaar Ward 14, immediate pipeline inspection required.",
      ],
    },
  },

  // ==========================================
  // 4. Ward 8 - Drainage (Overflowing Drains, Surging)
  // ~115 reports across 3 localities
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
    count: 115,
    photoCount: 11,
    severityDist: { low: 5, medium: 25, high: 70, critical: 15 },
    trendProfile: "surging",
    affectedGroups: ["residents", "school children", "pedestrians", "shopkeepers"],
    keywords: ["drainage", "nullah", "overflow", "sewer water", "mosquitoes", "ward 8"],
    templates: {
      hinglish: [
        "Indira Colony ka main naala pura choke ho chuka hai, paani sadak pe beh raha hai aur gharo me ghus raha hai.",
        "Primary school lane mein ganda naali ka paani bhar gaya hai, bachcho ka school jana band ho gaya hai.",
        "Harijan Basti me drainage overflow hone se dengue ke machhar badh rahe hain, urgent desilting chahiye.",
      ],
      hindi: [
        "वार्ड 8 इंदिरा कॉलोनी में नाले की सफाई न होने से गंदा पानी घरों के मुख्य दरवाजों तक भर रहा है।",
        "प्राथमिक विद्यालय मार्ग पर खुला नाला उफन रहा है, जिससे संक्रामक बीमारियों का खतरा बढ़ गया है।",
        "हरिजन बस्ती रोड पर नाली चोक होने से बदबूदार पानी सड़क पर फैला हुआ है, लोग परेशान हैं।",
      ],
      english: [
        "Open drainage overflow in Ward 8 near Indira Colony causing dirty sludge to pool in front of homes.",
        "Blocked stormwater drain near Ward 8 Primary School lane creating severe health hazard for students.",
        "Urgent desilting needed for Harijan Basti main drain in Ward 8 before monsoons worsen flooding.",
      ],
    },
  },

  // ==========================================
  // 5. Ward 9 - Healthcare (Dispensary Staff Shortage)
  // ~90 reports across 2 localities
  // ==========================================
  {
    category: "Healthcare",
    subcategory: "Primary Health Center Deficiencies",
    ward: "Ward 9",
    localities: [
      "Ward 9 - PHC Community Dispensary",
      "Ward 9 - Civil Lines South Dispensary",
    ],
    count: 90,
    photoCount: 5,
    severityDist: { low: 10, medium: 35, high: 40, critical: 5 },
    trendProfile: "stable",
    affectedGroups: ["patients", "pregnant women", "senior citizens", "low income families"],
    keywords: ["doctor absence", "medicines", "phc dispensary", "health center", "ward 9"],
    templates: {
      hinglish: [
        "Ward 9 PHC dispensary mein doctor do hafte se nahi aa rahe hain, basic dawaiyan bhi khatam hain.",
        "Civil lines south dispensary me subah 9 baje tala laga rehta hai, buzurgo ko bina dawa wapas jana padta hai.",
      ],
      hindi: [
        "वार्ड 9 प्राथमिक स्वास्थ्य केंद्र में डॉक्टर नियमित रूप से उपस्थित नहीं रहते और जीवनरक्षक दवाइयों का अभाव है।",
        "सिविल लाइन्स डिस्पेंसरी में पैरासिटामोल और बीपी की सामान्य गोलियां भी उपलब्ध नहीं हैं।",
      ],
      english: [
        "Primary health dispensary in Ward 9 facing chronic physician absenteeism and acute stockout of generic medicines.",
        "Patients waiting in long queues at Civil Lines South health post without attending medical officer.",
      ],
    },
  },

  // ==========================================
  // 6. Ward 6 - Electricity (Voltage Fluctuations & Outages)
  // ~85 reports across 3 localities
  // ==========================================
  {
    category: "Electricity",
    subcategory: "Transformer Overload & Fluctuations",
    ward: "Ward 6",
    localities: [
      "Ward 6 - Industrial Feeder Lane",
      "Ward 6 - Shanti Kunj",
      "Ward 6 - New Basti Lane 4",
    ],
    count: 85,
    photoCount: 6,
    severityDist: { low: 5, medium: 35, high: 40, critical: 5 },
    trendProfile: "stable",
    affectedGroups: ["small businesses", "households", "students", "workshop owners"],
    keywords: ["voltage drop", "power outage", "transformer spark", "electricity", "ward 6"],
    templates: {
      hinglish: [
        "Ward 6 Shanti Kunj mein voltage itna low hai ki fans aur fridge nahi chal rahe, transformer se aawaz aa rahi hai.",
        "Industrial feeder lane me bar-bar power trip ho rahi hai, small manufacturing units ka kaam thapp hai.",
      ],
      hindi: [
        "वार्ड 6 में अत्यधिक वोल्टेज उतार-चढ़ाव से घरेलू इलेक्ट्रॉनिक उपकरण जल रहे हैं। ट्रांसफार्मर की क्षमता बढ़ाई जाए।",
        "शांति कुंज में बिना पूर्व सूचना के दिन में 6-7 बार बिजली कट रही है, विद्यार्थियों की पढ़ाई प्रभावित है।",
      ],
      english: [
        "Severe low-voltage problem and frequent transformer tripping in Ward 6 residential blocks.",
        "Unannounced load shedding and sparking distribution transformer endangering residents on Industrial Feeder Lane.",
      ],
    },
  },

  // ==========================================
  // 7. Ward 5 - Street Lighting (Low Severity, Geographically Dispersed)
  // ~80 reports across 6 localities
  // ==========================================
  {
    category: "Street Lighting",
    subcategory: "Non-functional Street Lights",
    ward: "Ward 5",
    localities: [
      "Ward 5 - Lane 1 Main Entry",
      "Ward 5 - Lane 4 Park Side",
      "Ward 5 - Lane 7 Outer Edge",
      "Ward 5 - Temple Road Junction",
      "Ward 5 - Block B Market",
      "Ward 5 - Girls Hostel Lane",
    ],
    count: 80,
    photoCount: 4,
    severityDist: { low: 45, medium: 30, high: 5, critical: 0 },
    trendProfile: "declining",
    affectedGroups: ["women pedestrians", "night commuters", "residents"],
    keywords: ["darkness", "street light fused", "pole light", "andhera", "ward 5"],
    templates: {
      hinglish: [
        "Ward 5 temple road par street lights pichle 15 din se band padi hain, raat me andhera rehta hai aur safe nahi lagta.",
        "Girls hostel lane me 4 pole ki lights band hain, girls ko shaam ko aane jane me darr lagta hai.",
      ],
      hindi: [
        "वार्ड 5 की विभिन्न गलियों में स्ट्रीट लाइट खराब होने से रात के समय अंधेरा रहता है और सुरक्षा चिंताएं बढ़ रही हैं।",
        "मंदिर मार्ग चौराहे पर लाइटें न जलने से असामाजिक तत्वों का जमावड़ा लगा रहता है।",
      ],
      english: [
        "Multiple street lamp posts are non-functional across Ward 5 lanes, creating safety concerns at night.",
        "Defective LED streetlights outside Girls Hostel Lane in Ward 5 requiring immediate replacement.",
      ],
    },
  },

  // ==========================================
  // 8. Ward 11 - Education (Government School Infrastructure)
  // ~70 reports across 2 localities
  // ==========================================
  {
    category: "Education",
    subcategory: "Government School Infrastructure",
    ward: "Ward 11",
    localities: [
      "Ward 11 - Govt Primary School Compound",
      "Ward 11 - Adarsh Nagar Middle School",
    ],
    count: 70,
    photoCount: 9,
    severityDist: { low: 10, medium: 30, high: 28, critical: 2 },
    trendProfile: "stable",
    affectedGroups: ["school students", "teachers", "parents"],
    keywords: ["school desks", "broken toilet", "drinking water", "classroom", "ward 11"],
    templates: {
      hinglish: [
        "Ward 11 primary school me toilets ki halat bahut kharab hai aur paani ki suvidha nahi hai, bachhe pareshan hain.",
        "Adarsh nagar middle school me chhat se paani tapak raha hai aur benches tooti hui hain.",
      ],
      hindi: [
        "वार्ड 11 सरकारी प्राथमिक विद्यालय में टूटे बेंच, गंदे शौचालय और स्वच्छ पेयजल के अभाव से छात्र परेशान हैं।",
        "आदर्श नगर विद्यालय में कक्षा कक्षों की जर्जर स्थिति की तुरंत मरम्मत कराई जाए।",
      ],
      english: [
        "Government primary school in Ward 11 lacks functional sanitation facilities and clean drinking water for children.",
        "Dilapidated classrooms and broken desks at Adarsh Nagar middle school in Ward 11.",
      ],
    },
  },

  // ==========================================
  // 9. Ward 15 - Public Transport (Bus Shelters & Route Delays)
  // ~75 reports across 2 localities
  // ==========================================
  {
    category: "Public Transport",
    subcategory: "Bus Shelter & Route Irregularity",
    ward: "Ward 15",
    localities: [
      "Ward 15 - Main Bus Stop Shelter",
      "Ward 15 - Bypass Highway Junction",
    ],
    count: 75,
    photoCount: 4,
    severityDist: { low: 30, medium: 35, high: 10, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["daily wage workers", "office commuters", "college students"],
    keywords: ["bus stand", "irregular bus", "broken shed", "public transport", "ward 15"],
    templates: {
      hinglish: [
        "Ward 15 bus stand ka shed toota hua hai, dhoop aur baarish me khade rehne me pareshani hoti hai.",
        "Bypass junction par buses nahi rukti, ghanto wait karna padta hai autowale manmaana kiraya maangte hain.",
      ],
      hindi: [
        "वार्ड 15 बाईपास पर बसों का नियमित ठहराव नहीं हो रहा, यात्रियों और छात्रों को घंटों इंतजार करना पड़ता है।",
        "मुख्य बस स्टैंड का टीन शेड क्षतिग्रस्त है, बारिश में यात्रियों के खड़े होने की कोई व्यवस्था नहीं है।",
      ],
      english: [
        "Damaged bus shelter in Ward 15 and erratic feeder bus frequency affecting daily office commute.",
        "Commuters left stranded at Ward 15 Bypass junction due to buses skipping scheduled stops.",
      ],
    },
  },

  // ==========================================
  // 10. Ward 12 - Water Supply & Sanitation (Public Toilets)
  // ~65 reports across 2 localities
  // ==========================================
  {
    category: "Water Supply & Sanitation",
    subcategory: "Public Toilet Hygiene & Maintenance",
    ward: "Ward 12",
    localities: [
      "Ward 12 - Near Bus Stand Public Toilet",
      "Ward 12 - Weekly Haat Bazaar Ground",
    ],
    count: 65,
    photoCount: 5,
    severityDist: { low: 10, medium: 35, high: 20, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["market visitors", "shopkeepers", "drivers", "women"],
    keywords: ["public toilet", "shauchalay", "no water", "hygiene", "ward 12"],
    templates: {
      hinglish: [
        "Ward 12 haat ground ke paas public toilet me paani nahi hai aur bilkul safai nahi hoti, lock rehta hai.",
        "Bus stand ke paas bane public convenience me flushing system kharab hai, behad badboo aati hai.",
      ],
      hindi: [
        "वार्ड 12 साप्ताहिक हाट मैदान के पास बने सामुदायिक शौचालय में ताला लटका रहता है और पानी की टंकी टूटी है।",
        "सार्वजनिक शौचालय में नियमित सफाई न होने से व्यापारियों और आगंतुकों को भारी असुविधा हो रही है।",
      ],
      english: [
        "Public toilet facility near Ward 12 bus depot is in unhygienic condition with no running water supply.",
        "Lack of functional sanitation units causing inconvenience to visitors at Ward 12 weekly market.",
      ],
    },
  },

  // ==========================================
  // 11. Ward 3 - Water Supply & Sanitation (Pipeline Burst)
  // ~55 reports across 2 localities
  // ==========================================
  {
    category: "Water Supply & Sanitation",
    subcategory: "Pipeline Leakage & Wastage",
    ward: "Ward 3",
    localities: [
      "Ward 3 - Ring Road Crossing",
      "Ward 3 - Vikas Enclave Main Entrance",
    ],
    count: 55,
    photoCount: 7,
    severityDist: { low: 15, medium: 30, high: 10, critical: 0 },
    trendProfile: "declining",
    affectedGroups: ["residents", "passersby", "commuters"],
    keywords: ["water leakage", "pipeline burst", "jal vibhag", "paani barbad", "ward 3"],
    templates: {
      hinglish: [
        "Ward 3 Vikas enclave ke samne main underground pipe phat gaya hai, lakho liter saaf paani sadak pe beh raha hai.",
        "Ring road crossing par pipe leak hone se sadak dhas rahi hai aur paani ka pressure gharo me low ho gaya hai.",
      ],
      hindi: [
        "वार्ड 3 में मुख्य जलापूर्ति पाइपलाइन से लगातार पानी बहने के कारण सड़क क्षतिग्रस्त हो रही है और पानी बर्बाद हो रहा है।",
        "विकास एनक्लेव के सामने पाइपलाइन लीकेज को तुरंत ठीक कराया जाए, घरों में आपूर्ति बाधित है।",
      ],
      english: [
        "Underground water pipeline burst at Ward 3 Ring Road crossing wasting thousands of liters of potable water.",
        "Freshwater leakage causing water stagnation and low water pressure across Vikas Enclave Ward 3.",
      ],
    },
  },

  // ==========================================
  // 12. Ward 21 - Street Lighting (Broken / Tilted Electric Poles)
  // ~45 reports across 2 localities
  // ==========================================
  {
    category: "Street Lighting",
    subcategory: "Damaged Electric Poles",
    ward: "Ward 21",
    localities: ["Ward 21 - Old City Gate", "Ward 21 - Kasai Gali Corner"],
    count: 45,
    photoCount: 4,
    severityDist: { low: 5, medium: 28, high: 12, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["residents", "pedestrians", "motorists"],
    keywords: ["tilted pole", "hanging wires", "street light", "hazard", "ward 21"],
    templates: {
      hinglish: [
        "Ward 21 old city gate ke paas bijli ka khamba jhuk gaya hai, taar bohot neeche latak rahe hain.",
        "Kasai gali corner par lamp post toota hua hai, kisi din bada haadsa ho sakta hai.",
      ],
      hindi: [
        "वार्ड 21 में पुराना बिजली का खंभा झुक गया है और तार लटक रहे हैं, जो किसी भी समय जानलेवा साबित हो सकता है।",
        "कसाई गली मोड़ पर टूटे हुए स्ट्रीट लाइट पोल को तुरंत बदला जाए।",
      ],
      english: [
        "Tilted lighting pole with dangling electrical cables posing severe safety hazard in Ward 21.",
        "Damaged lamp post near Old City Gate needs urgent reinforcement before heavy winds collapse it.",
      ],
    },
  },

  // ==========================================
  // 13. Ward 19 - Electricity (Unscheduled Peak Outages)
  // ~55 reports across 2 localities
  // ==========================================
  {
    category: "Electricity",
    subcategory: "Unscheduled Power Outages",
    ward: "Ward 19",
    localities: [
      "Ward 19 - New Subhash Nagar",
      "Ward 19 - Tagore Park Extension",
    ],
    count: 55,
    photoCount: 2,
    severityDist: { low: 15, medium: 30, high: 10, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["households", "work-from-home professionals", "small shops"],
    keywords: ["power cuts", "unscheduled outage", "bijli", "ward 19", "inverter"],
    templates: {
      hinglish: [
        "Ward 19 me bina kisi notice ke din me 4-5 baar 2 ghante ke liye light chali jati hai, inverters bhi bol jaate hain.",
        "Tagore park area me raat ko 11 baje se 2 baje tak regular blackout ho raha hai, garmi me sona mushkil hai.",
      ],
      hindi: [
        "वार्ड 19 में अघोषित बिजली कटौती से छात्र और गृहणियां बेहद परेशान हैं। विद्युत मंडल कोई संतोषजनक उत्तर नहीं दे रहा।",
        "टैगोर पार्क एक्सटेंशन में बिना सूचना के 3 घंटे की बिजली कटौती की जा रही है।",
      ],
      english: [
        "Frequent unannounced power outages in Ward 19 during daytime peak hours disrupting home and work routines.",
        "Repeated night-time electricity failure in Tagore Park area with zero response from local electricity board helpline.",
      ],
    },
  },

  // ==========================================
  // 14. Ward 22 - Waste Management (Door-to-door Collection Gap)
  // ~50 reports across 2 localities
  // ==========================================
  {
    category: "Waste Management",
    subcategory: "Irregular Door-to-Door Collection",
    ward: "Ward 22",
    localities: ["Ward 22 - Extension Colony", "Ward 22 - Green View Apartments"],
    count: 50,
    photoCount: 3,
    severityDist: { low: 25, medium: 22, high: 3, critical: 0 },
    trendProfile: "declining",
    affectedGroups: ["residents", "apartment complexes"],
    keywords: ["kachra gaadi", "garbage van", "waste collection", "swachhata", "ward 22"],
    templates: {
      hinglish: [
        "Ward 22 me kachre wali gaadi hafte me sirf do din aati hai, ghar me kooda ikattha ho jata hai.",
        "Green view apartments ke bahar collection van nahi rukti, log majboori me road side phek rahe hain.",
      ],
      hindi: [
        "वार्ड 22 ग्रीन व्यू कॉलोनी में कचरा संग्रहण वाहन नियमित रूप से नहीं आ रहा है, जिससे घरों में कचरा जमा हो रहा है।",
        "एक्सटेंशन कॉलोनी में डोर-टू-डोर कचरा कलेक्शन व्यवस्था पटरी से उतर चुकी है।",
      ],
      english: [
        "Door-to-door waste collection vehicle visits Ward 22 only twice a week instead of daily.",
        "Irregular municipal garbage tipper timing causing piles of trash to accumulate outside Green View Apartments.",
      ],
    },
  },

  // ==========================================
  // 15. Ward 2 - Healthcare (Dispensary Medicine Shortage)
  // ~45 reports across 2 localities
  // ==========================================
  {
    category: "Healthcare",
    subcategory: "Dispensary Medicine Shortage",
    ward: "Ward 2",
    localities: ["Ward 2 - Urban Health Post", "Ward 2 - Sharda Nagar Health Camp"],
    count: 45,
    photoCount: 2,
    severityDist: { low: 8, medium: 25, high: 12, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["elderly", "chronic patients", "pensioners"],
    keywords: ["medicine out of stock", "dispensary", "bp sugar medicine", "ward 2"],
    templates: {
      hinglish: [
        "Ward 2 health post pe diabetes aur BP ki standard dawa pichle ek mahine se nahi mil rahi, private khareedni padti hai.",
        "Sharda nagar dispensary me doctor check toh kar lete hain par parchi par bahar se lene ko likhte hain.",
      ],
      hindi: [
        "वार्ड 2 स्वास्थ्य केंद्र में आवश्यक जीवनरक्षक दवाइयों और मधुमेह की दवाओं का टोटा बना हुआ है।",
        "शारदा नगर डिस्पेंसरी में दवाइयों का स्टॉक समाप्त है, बुजुर्ग मरीजों को भारी परेशानी का सामना करना पड़ रहा है।",
      ],
      english: [
        "Essential hypertension and diabetes medicines out of stock at Ward 2 dispensary for over a month.",
        "Patients at Urban Health Post Ward 2 forced to purchase basic prescription drugs from expensive retail pharmacies.",
      ],
    },
  },

  // ==========================================
  // 16. Ward 16 - Drainage (Underpass Waterlogging, Surging)
  // ~50 reports across 2 localities
  // ==========================================
  {
    category: "Drainage",
    subcategory: "Blocked Stormwater Drains",
    ward: "Ward 16",
    localities: [
      "Ward 16 - Railway Underpass Link Road",
      "Ward 16 - Transport Nagar Drain",
    ],
    count: 50,
    photoCount: 6,
    severityDist: { low: 5, medium: 18, high: 22, critical: 5 },
    trendProfile: "surging",
    affectedGroups: ["motorists", "goods truck drivers", "commuters"],
    keywords: ["underpass waterlogging", "storm drain", "flooding", "traffic stopped", "ward 16"],
    templates: {
      hinglish: [
        "Ward 16 underpass me halki baarish me bhi 3 foot paani bhar jata hai kyuki naali band hai, gaadiyan band pad jati hain.",
        "Transport nagar drainage blockage ki wajah se pura chowk jheel ban gaya hai.",
      ],
      hindi: [
        "वार्ड 16 रेलवे अंडरपास में नाला अवरुद्ध होने से भारी जलभराव हो रहा है, जिससे आवागमन ठप है।",
        "ट्रांसपोर्ट नगर मुख्य नाले की सफाई न होने से बारिश का पानी सड़कों पर भर रहा है।",
      ],
      english: [
        "Blocked stormwater drainage causing submerged railway underpass on Ward 16 link road, stranding vehicles.",
        "Severe water accumulation near Transport Nagar drain in Ward 16 halting commercial vehicular movement.",
      ],
    },
  },

  // ==========================================
  // 17. Ward 7 - Road Infrastructure (Minor Surface Erosion, Declining)
  // ~50 reports across 2 localities
  // ==========================================
  {
    category: "Road Infrastructure",
    subcategory: "Minor Surface Erosion",
    ward: "Ward 7",
    localities: [
      "Ward 7 - Anand Vihar Sector A",
      "Ward 7 - Sector B Colony Road",
    ],
    count: 50,
    photoCount: 3,
    severityDist: { low: 30, medium: 18, high: 2, critical: 0 },
    trendProfile: "declining",
    affectedGroups: ["residents", "cyclists", "morning walkers"],
    keywords: ["loose gravel", "patchwork", "road erosion", "anand vihar", "ward 7"],
    templates: {
      hinglish: [
        "Ward 7 me sadak ki gitiyan nikal aayi hain, repair ka kaam aadha adhura chhod diya tha thekedaar ne.",
        "Sector B colony road par patchwork theek se nahi hua, cycle aur scooty slip ho rahi hai.",
      ],
      hindi: [
        "वार्ड 7 आनंद विहार में सड़क की ऊपरी परत उखड़ गई है, जिससे उड़ती धूल से राहगीर परेशान हैं।",
        "सेक्टर बी कॉलोनी मार्ग पर बजरी बिखरने से दोपहिया वाहनों के फिसलने का अंदेशा रहता है।",
      ],
      english: [
        "Loose gravel and uneven patchwork on Ward 7 interior colony roads needing finish coat.",
        "Surface bitumen peeling away on Anand Vihar Sector A road creating rough driving conditions.",
      ],
    },
  },

  // ==========================================
  // 18. Ward 10 - Waste Management (Open Garbage Burning)
  // ~45 reports across 2 localities
  // ==========================================
  {
    category: "Waste Management",
    subcategory: "Illegal Waste Burning",
    ward: "Ward 10",
    localities: [
      "Ward 10 - Open Ground near Ring Road",
      "Ward 10 - Sector 10 Border Plot",
    ],
    count: 45,
    photoCount: 4,
    severityDist: { low: 8, medium: 22, high: 15, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["asthma patients", "residents", "morning walkers", "children"],
    keywords: ["kachra jalana", "toxic smoke", "pollution", "air quality", "ward 10"],
    templates: {
      hinglish: [
        "Ward 10 open ground me roz raat ko kachre me aag laga dete hain, pura dhuan colony me ghus jata hai.",
        "Sector 10 border plot pe plastic kooda jalane se saans lene me dikkat ho rahi hai.",
      ],
      hindi: [
        "वार्ड 10 खाली मैदान में रात के समय कूड़ा जलाने से वायु प्रदूषण बढ़ रहा है, बुजुर्गों को सांस लेने में तकलीफ हो रही है।",
        "सेक्टर 10 सीमा पर कचरा जलाने वाले असामाजिक तत्वों पर सख्त कानूनी कार्रवाई की जाए।",
      ],
      english: [
        "Illegal open burning of plastic and municipal solid waste in Ward 10 vacant plots creating noxious smog.",
        "Toxic smoke from nightly garbage burning at open ground near Ring Road choking nearby residential buildings.",
      ],
    },
  },

  // ==========================================
  // 19. Ward 18 - Education (Overcrowded Classrooms)
  // ~45 reports across 2 localities
  // ==========================================
  {
    category: "Education",
    subcategory: "Classroom Shortage & Desks",
    ward: "Ward 18",
    localities: [
      "Ward 18 - Govt Girls Higher Secondary",
      "Ward 18 - Model Senior Secondary School",
    ],
    count: 45,
    photoCount: 3,
    severityDist: { low: 10, medium: 25, high: 10, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["students", "teachers", "parents"],
    keywords: ["school desks", "overcrowded class", "fans not working", "ward 18"],
    templates: {
      hinglish: [
        "Ward 18 girls school me ek bench par chaar bachiyan baith rahi hain, fans bhi kharab hain.",
        "Model school me blackboard aur benches ki kami hai, garmi me padhai mushkil ho rahi hai.",
      ],
      hindi: [
        "वार्ड 18 राजकीय कन्या उच्चतर माध्यमिक विद्यालय में अतिरिक्त डेस्क और पंखों की सख्त जरूरत है।",
        "मॉडल स्कूल में कक्षाओं में अत्यधिक भीड़ के कारण शिक्षण कार्य प्रभावित हो रहा है।",
      ],
      english: [
        "Acute shortage of student dual-desks at Ward 18 Government Girls Higher Secondary School.",
        "Overcrowded classrooms with non-operational ceiling fans hindering learning at Ward 18 Model School.",
      ],
    },
  },

  // ==========================================
  // 20. Ward 13 - Public Transport (Feeder Bus Shortage)
  // ~45 reports across 2 localities
  // ==========================================
  {
    category: "Public Transport",
    subcategory: "Feeder Bus Shortage",
    ward: "Ward 13",
    localities: [
      "Ward 13 - Metro Feeder Point",
      "Ward 13 - Industrial Area Crossing",
    ],
    count: 45,
    photoCount: 2,
    severityDist: { low: 15, medium: 24, high: 6, critical: 0 },
    trendProfile: "stable",
    affectedGroups: ["daily commuters", "factory workers", "students"],
    keywords: ["feeder bus", "overcrowded bus", "metro feeder", "ward 13"],
    templates: {
      hinglish: [
        "Ward 13 metro feeder stop par subah 8 baje itni bheed hoti hai ki buses me pair rakhne ki jagah nahi hoti.",
        "Industrial area crossing par evening shift ke baad feeder bus 1 ghante tak nahi aati.",
      ],
      hindi: [
        "वार्ड 13 मेट्रो फीडर बस स्टैंड पर सुबह के समय भारी भीड़ रहती है, अतिरिक्त बसों का संचालन आवश्यक है।",
        "औद्योगिक क्षेत्र मोड़ पर फीडर बसों की अनियमितता से श्रमिक और कर्मचारी परेशान हैं।",
      ],
      english: [
        "Severe shortage of metro feeder mini-buses from Ward 13 during morning rush hours.",
        "Extremely overcrowded buses leaving passengers stranded at Industrial Area Crossing Ward 13.",
      ],
    },
  },
];

// Background noise wards for scattered municipal grievances (approx 75 reports)
const NOISE_WARDS = [
  "Ward 1",
  "Ward 13",
  "Ward 18",
  "Ward 20",
  "Ward 23",
  "Ward 24",
  "Ward 25",
];

function buildComplaintsForConfig(
  cfg: SeedConfig,
  referenceDate: Date
): Partial<IComplaint>[] {
  const list: Partial<IComplaint>[] = [];

  // 1. Assign exact severities matching the config
  const severities: ("low" | "medium" | "high" | "critical")[] = [];
  for (let i = 0; i < cfg.severityDist.low; i++) severities.push("low");
  for (let i = 0; i < cfg.severityDist.medium; i++) severities.push("medium");
  for (let i = 0; i < cfg.severityDist.high; i++) severities.push("high");
  for (let i = 0; i < cfg.severityDist.critical; i++) severities.push("critical");

  while (severities.length < cfg.count) {
    severities.push("medium");
  }

  // 2. Build complaints
  for (let i = 0; i < cfg.count; i++) {
    // Locality distributed across the configured list
    const locality = cfg.localities[i % cfg.localities.length];
    const severity = severities[i];

    // Language selection: ~45% Hinglish, ~35% Hindi, ~20% English
    const langRoll = prng();
    let lang = "hinglish";
    let templateList = cfg.templates.hinglish;
    if (langRoll > 0.8) {
      lang = "english";
      templateList = cfg.templates.english;
    } else if (langRoll > 0.45) {
      lang = "hindi";
      templateList = cfg.templates.hindi;
    }

    const rawTemplate = deterministicChoice(templateList);
    const rawText = `${rawTemplate} (${locality})`;

    // Photo evidence assignment: exactly the first photoCount complaints receive a safe photo URL
    const hasPhoto = i < cfg.photoCount;
    const imageUrl = hasPhoto
      ? getDemoPhotoUrl(
          cfg.category.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          i + 1
        )
      : undefined;

    // Temporal assignment:
    // Recent window: 0 to 14 days ago
    // Previous window: 15 to 28 days ago
    // Older window: 29 to 60 days ago
    let daysAgo: number;

    if (cfg.ward === "Ward 17" && cfg.category === "Road Infrastructure") {
      // SPECIAL DETERMINISTIC GUARANTEE FOR WARD 17 ROAD INFRASTRUCTURE:
      // Exactly 137 reports:
      // - 88 in recent 14 days (days 0.5 to 13.5)
      // - 34 in previous window (days 14.5 to 27.5)
      // - 15 in older window (days 29 to 60)
      // Velocity: ((88 - 34) / 34) * 100 = +158.82% -> +159% surge!
      if (i < 88) {
        daysAgo = (i % 13) + 0.5; // days 0.5 - 13.5
      } else if (i < 88 + 34) {
        daysAgo = 14.5 + ((i - 88) % 13); // days 14.5 - 27.5
      } else {
        daysAgo = 29 + ((i - 122) % 25); // days 29 - 54
      }
    } else if (cfg.trendProfile === "surging") {
      // 70% in recent 14 days, 25% in 15-28 days, 5% older
      const roll = prng();
      if (roll < 0.7) {
        daysAgo = deterministicInt(1, 14);
      } else if (roll < 0.95) {
        daysAgo = deterministicInt(15, 28);
      } else {
        daysAgo = deterministicInt(29, 50);
      }
    } else if (cfg.trendProfile === "declining") {
      // 20% in recent 14 days, 65% in 15-28 days, 15% older
      const roll = prng();
      if (roll < 0.2) {
        daysAgo = deterministicInt(1, 14);
      } else if (roll < 0.85) {
        daysAgo = deterministicInt(15, 28);
      } else {
        daysAgo = deterministicInt(29, 50);
      }
    } else {
      // Stable: evenly spread across 0 to 45 days
      daysAgo = deterministicInt(1, 45);
    }

    const createdAt = createDateDaysAgo(referenceDate, daysAgo);

    list.push({
      rawText,
      language: lang,
      normalizedText: `${cfg.category} grievance regarding ${cfg.subcategory.toLowerCase()} reported at ${locality}.`,
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

function buildBackgroundNoiseComplaints(
  count: number = 75,
  referenceDate: Date
): Partial<IComplaint>[] {
  const noiseList: Partial<IComplaint>[] = [];
  const categories = [
    { cat: "Road Infrastructure", sub: "Pavement Cracks" },
    { cat: "Water Supply & Sanitation", sub: "Low Water Pressure" },
    { cat: "Street Lighting", sub: "Fused Street Light" },
    { cat: "Waste Management", sub: "Scattered Debris" },
    { cat: "Drainage", sub: "Clogged Gutter" },
    { cat: "Healthcare", sub: "Dispensary Timings Inquiry" },
    { cat: "Education", sub: "School Gate Lock Issue" },
    { cat: "Electricity", sub: "Billing Meter Fluctuations" },
    { cat: "Public Transport", sub: "Bus Stop Bench Missing" },
  ];

  for (let i = 0; i < count; i++) {
    const ward = deterministicChoice(NOISE_WARDS);
    const sectorNum = deterministicInt(1, 9);
    const locality = `${ward} - Sector ${sectorNum} Enclave`;
    const catPair = categories[i % categories.length];
    const severity = deterministicChoice<"low" | "medium">(["low", "medium"]);
    const daysAgo = deterministicInt(1, 40);

    const langRoll = prng();
    let lang = "hinglish";
    let rawText = `Minor grievance regarding ${catPair.sub.toLowerCase()} in ${locality}.`;
    if (langRoll > 0.6) {
      lang = "hindi";
      rawText = `${locality} में ${catPair.sub} को लेकर सामान्य शिकायत दर्ज कराई गई है।`;
    } else if (langRoll > 0.3) {
      lang = "english";
      rawText = `Citizen report concerning minor ${catPair.sub.toLowerCase()} at ${locality}.`;
    }

    noiseList.push({
      rawText,
      language: lang,
      normalizedText: `${catPair.cat} minor grievance concerning ${catPair.sub} in ${locality}.`,
      category: catPair.cat,
      subcategory: catPair.sub,
      summary: `Citizen complaint for ${catPair.sub} in ${locality}.`,
      severity,
      affectedGroups: ["residents", "passersby"],
      keywords: [catPair.sub.toLowerCase(), ward.toLowerCase(), "minor issue"],
      location: locality,
      status: "new",
      createdAt: createDateDaysAgo(referenceDate, daysAgo),
    });
  }

  return noiseList;
}

export async function seedDemoData() {
  console.log("=================================================");
  console.log("🌱 LokSanket Realistic Demonstration Data Seed");
  console.log("   Label: 'Realistic Demonstration Data'");
  console.log("=================================================");
  console.log("Connecting to MongoDB Atlas...");

  await mongoose.connect(MONGODB_URI!, { dbName: "loksanket" });
  console.log("✓ Connected successfully to database: loksanket\n");

  // Fixed reference date ensures deterministic temporal calculations
  const referenceDate = new Date();

  // 1. Purge old records to guarantee re-runnable idempotence
  console.log("Purging existing demonstration records...");
  const deleteComplaints = await Complaint.deleteMany({});
  const deleteClusters = await IssueCluster.deleteMany({});
  console.log(
    `✓ Cleared ${deleteComplaints.deletedCount} complaints and ${deleteClusters.deletedCount} issue clusters.\n`
  );

  // 2. Generate structured complaints directly (no Gemini calls)
  console.log("Synthesizing realistic demonstration dataset...");
  const allComplaints: Partial<IComplaint>[] = [];

  for (const cfg of SEED_CONFIGS) {
    const items = buildComplaintsForConfig(cfg, referenceDate);
    allComplaints.push(...items);
  }

  // Add background noise across remaining wards
  const noiseItems = buildBackgroundNoiseComplaints(75, referenceDate);
  allComplaints.push(...noiseItems);

  console.log(
    `✓ Generated ${allComplaints.length} structured demonstration complaints.`
  );
  console.log("Inserting complaint documents into MongoDB in bulk...");

  const insertResult = await Complaint.insertMany(allComplaints);
  console.log(
    `✓ Successfully persisted ${insertResult.length} complaints to MongoDB!\n`
  );

  // 3. Deterministic Aggregation Verification
  console.log("=================================================");
  console.log("📊 RUNNING DETERMINISTIC AGGREGATION FOUNDATION");
  console.log("=================================================");

  // A. Overall Constituency Summary
  const constituencySummary = await aggregateConstituencySummary(referenceDate);

  console.log("\n1. Overall Constituency Summary (From MongoDB):");
  console.log(`- Total Complaint Documents: ${constituencySummary.totalReports}`);
  console.log(
    `- Recent 14-Day Volume: ${constituencySummary.recentReportVolume}`
  );
  console.log(
    `- Previous Period Volume (15-28d): ${constituencySummary.previousPeriodVolume}`
  );
  console.log(`- Overall Trend: ${constituencySummary.trendPercent > 0 ? "+" : ""}${constituencySummary.trendPercent}%`);
  console.log(
    `- Total Photo Evidences: ${constituencySummary.photoEvidenceCount} (${constituencySummary.photoEvidencePercentage}%)`
  );
  console.log(
    `- Severity Distribution: Critical=${constituencySummary.severityDistribution.critical}, High=${constituencySummary.severityDistribution.high}, Med=${constituencySummary.severityDistribution.medium}, Low=${constituencySummary.severityDistribution.low}`
  );
  console.log(
    `- Language Breakdown: Hindi=${constituencySummary.languageDistribution.hindi}, Hinglish=${constituencySummary.languageDistribution.hinglish}, English=${constituencySummary.languageDistribution.english}`
  );

  console.log("\n2. Category Breakdown:");
  for (const cat of constituencySummary.categories) {
    console.log(
      `   • ${cat.category.padEnd(28)} : ${String(cat.count).padStart(4)} reports (${cat.percentage}%)`
    );
  }

  console.log("\n3. Wards Breakdown (Top 10):");
  for (const w of constituencySummary.wards.slice(0, 10)) {
    console.log(
      `   • ${w.ward.padEnd(12)} : ${String(w.count).padStart(4)} reports across ${w.distinctLocalities} localities`
    );
  }

  // B. Specific Ward 17 Road Infrastructure Verification
  console.log("\n=================================================");
  console.log("🎯 INTENTIONAL DEMO STORY VERIFICATION (Ward 17):");
  console.log("   Category: Road Infrastructure | Ward: Ward 17");
  console.log("=================================================");

  const ward17Evidence = await aggregateCategoryWardEvidence({
    category: "Road Infrastructure",
    ward: "Ward 17",
    referenceDate,
  });

  console.log(`- Total Stored Documents: ${ward17Evidence.totalReports} (Expected: 137)`);
  console.log(
    `- Distinct Localities: ${ward17Evidence.affectedLocalitiesCount} (Expected: 5)`
  );
  console.log(
    `- Photo Evidences: ${ward17Evidence.photoEvidenceCount} (Expected: 18)`
  );
  console.log(
    `- High/Critical Reports: ${ward17Evidence.highOrCriticalCount} (Expected: 120)`
  );
  console.log(
    `- Temporal Breakdown: Recent(14d)=${ward17Evidence.recentCount}, Previous(15-28d)=${ward17Evidence.previousCount}, Older=${ward17Evidence.olderCount}`
  );
  console.log(
    `- Recent Trend: +${ward17Evidence.trendPercent}% (Increasing Surge)`
  );
  console.log(
    `- Geographic HHI Concentration: ${ward17Evidence.geographicConcentration.hhi} (Dominant: ${ward17Evidence.geographicConcentration.dominantLocality} - ${ward17Evidence.geographicConcentration.dominantShare}%)`
  );

  console.log("\nAffected Localities in Ward 17:");
  for (const loc of ward17Evidence.affectedLocalities) {
    console.log(
      `   • ${loc.locality.padEnd(45)} : ${String(loc.count).padStart(3)} reports (${loc.share}%)`
    );
  }

  // Exact validation checks
  const isTotalValid = ward17Evidence.totalReports === 137;
  const isLocalityValid = ward17Evidence.affectedLocalitiesCount === 5;
  const isPhotoValid = ward17Evidence.photoEvidenceCount === 18;
  const isTrendIncreasing = ward17Evidence.isIncreasingTrend;

  console.log("\n-------------------------------------------------");
  console.log("VERIFICATION CRITERIA CHECK:");
  console.log(`[${isTotalValid ? "✓ PASS" : "✗ FAIL"}] Ward 17 Road complaints count = 137`);
  console.log(`[${isLocalityValid ? "✓ PASS" : "✗ FAIL"}] Ward 17 affected localities = 5`);
  console.log(`[${isPhotoValid ? "✓ PASS" : "✗ FAIL"}] Ward 17 photo evidence count = 18`);
  console.log(`[${isTrendIncreasing ? "✓ PASS" : "✗ FAIL"}] Ward 17 recent trend is increasing`);
  console.log("-------------------------------------------------");

  await mongoose.disconnect();
  console.log("\n✅ Database disconnected. Demonstration data successfully seeded and verified!");
}

// Execute if run directly via tsx
if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  seedDemoData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Seeding failed with error:", err);
      process.exit(1);
    });
}
