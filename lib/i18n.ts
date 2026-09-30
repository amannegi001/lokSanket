export type Language = "en" | "hi";

export interface Translations {
  nav: {
    metaTitle: string;
    demoBadge: string;
    brandSubtitle: string;
    home: string;
    howItWorks: string;
    insights: string;
    about: string;
    reportCta: string;
    reportShort: string;
    languageLabel: string;
    officialReviewBtn: string;
  };
  hero: {
    eyebrow: string;
    headlinePart1: string;
    headlinePart2: string;
    description: string;
    reportBtn: string;
    insightsBtn: string;
    statReports: string;
    statClusters: string;
    statLocalities: string;
    demoData: string;
  };
  pipeline: {
    eyebrow: string;
    heading: string;
    description: string;
    stepLabel: string;
    steps: Array<{
      num: string;
      title: string;
      desc: string;
    }>;
  };
  showcase: {
    badge: string;
    heading: string;
    description: string;
    bullet1: string;
    bullet2: string;
    bullet3: string;
    dashboardLink: string;
    highPriority: string;
    category: string;
    locality: string;
    issueTitle: string;
    issueSubtitle: string;
    priorityScoreLabel: string;
    metricReports: string;
    metricLocalities: string;
    metricPhoto: string;
    metricTrend: string;
    whyFlaggedHeading: string;
    whyFlaggedBody: string;
    decisionNotice: string;
    viewDossierLink: string;
  };
  evidence: {
    eyebrow: string;
    heading: string;
    description: string;
    principleHeading: string;
    principleBody: string;
    inspectLink: string;
    formulaHeader: string;
    totalWeight: string;
    auditReady: string;
    resultLabel: string;
    weights: Array<{
      label: string;
      weight: number;
      desc: string;
      detail: string;
    }>;
  };
  categories: {
    eyebrow: string;
    heading: string;
    description: string;
    items: Array<{
      name: string;
      desc: string;
    }>;
  };
  cta: {
    heading: string;
    description: string;
    reportBtn: string;
    insightsBtn: string;
  };
  footer: {
    brandDescription: string;
    ux4gCredit: string;
    platformHeading: string;
    home: string;
    howItWorks: string;
    dashboard: string;
    report: string;
    noticeHeading: string;
    noticeBody: string;
    copyright: string;
    decisionSupportMode: string;
    groundTruthRequired: string;
  };
  report: {
    breadcrumbHome: string;
    breadcrumbCurrent: string;
    title: string;
    subtitle: string;
    quickExamplesLabel: string;
    issueLabel: string;
    issueRequired: string;
    issuePlaceholder: string;
    issueHint: string;
    localityLabel: string;
    localityPlaceholder: string;
    languageLabel: string;
    autoDetect: string;
    photoLabel: string;
    photoPlaceholder: string;
    photoHint: string;
    photoUploadBtn: string;
    photoAddMoreBtn: string;
    photoFormatHint: string;
    photoChangeBtn: string;
    photoRemoveBtn: string;
    submitBtn: string;
    submittingBtn: string;
    submitHint: string;
    successTitle: string;
    successSubtitle: string;
    refIdLabel: string;
    categoryLabel: string;
    subcategoryLabel: string;
    severityLabel: string;
    affectedGroupsLabel: string;
    viewInsightsBtn: string;
    reportAnotherBtn: string;
  };
  dashboard: {
    workspaceSubtitlePublic: string;
    workspaceSubtitleOfficial: string;
    demoBadge: string;
    publicReadOnly: string;
    titlePublic: string;
    titleOfficial: string;
    subtitlePublic: string;
    subtitleOfficial: string;
    officialReviewBtn: string;
    reportIssueBtn: string;
    briefsBtn: string;
    recalculateBtn: string;
    exitOfficialBtn: string;

    kpiTotalReports: string;
    kpiAcrossCategories: (count: number) => string;
    kpiHighPriority: string;
    kpiHighPrioritySub: string;
    kpiMediumPriority: string;
    kpiMediumPrioritySub: string;
    kpiAffectedLocalities: string;
    kpiAffectedLocalitiesSub: string;

    tableHeading: string;
    tableSubPublic: string;
    tableSubOfficial: string;
    filterAllPriorities: string;
    filterHighOnly: string;
    filterMediumOnly: string;
    filterLowOnly: string;
    filterAllCategories: string;

    colIssueCluster: string;
    colCategory: string;
    colWardsLocalities: string;
    colReports: string;
    colTrend: string;
    colEvidence: string;
    colPriorityScore: string;
    colOfficialDecision: string;
    colAction: string;

    noIssuesMatch: string;
    evidencePhotos: (count: number) => string;
    evidenceTextOnly: string;
    levelHigh: string;
    levelMedium: string;
    levelLow: string;
    viewEvidence: string;
    reviewAndAction: string;

    decisionAccepted: string;
    decisionAdjusted: string;
    decisionRejected: string;
    decisionPending: string;

    showingCount: (displayed: number, total: number) => string;
    showTop5Only: string;
    viewAllIssues: (total: number) => string;

    publicFootnoteNotice: string;
    publicFootnoteLink: string;

    chartTrendHeading: string;
    chartTrendSub: string;
    chartCategoryHeading: string;
    chartCategorySub: string;
    chartReportsSeries: string;

    provenanceHeading: string;
    provenanceBody: string;
    constituencyLabel: string;
    datasetLabel: string;
    publicOrientation: string;
    officialOrientation: string;

    loadingSummary: string;
    loadingSub: string;
    loadError: string;
    retryBtn: string;

    recentReportsHeading: string;
    recentReportsSub: string;
    recentReportsColCategory: string;
    recentReportsColSubcategory: string;
    recentReportsColWard: string;
    recentReportsColTime: string;
    recentReportsColSeverity: string;
    recentReportsColStatus: string;
    statusAwaitingClustering: string;
    statusClustered: string;
    timeJustNow: string;
    timeMinutesAgo: (m: number) => string;
    timeHoursAgo: (h: number) => string;
    timeDaysAgo: (d: number) => string;
    pipelineNotice: string;
    noRecentReports: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    nav: {
      metaTitle: "लोकसंकेत · LokSanket | Decision Support Platform for Constituency Development",
      demoBadge: "Realistic Demonstration Data",
      brandSubtitle: "Civic Development Intelligence",
      home: "Home",
      howItWorks: "How it works",
      insights: "Development Insights",
      about: "About",
      reportCta: "Report an Issue",
      reportShort: "Report",
      languageLabel: "Language:",
      officialReviewBtn: "Official Review (Demo)",
    },
    hero: {
      eyebrow: "AI-powered civic development intelligence",
      headlinePart1: "Turning citizen voices into",
      headlinePart2: "clearer development priorities.",
      description:
        "Citizen feedback, local evidence and emerging patterns — brought together to help communities understand what needs attention.",
      reportBtn: "Report an Issue",
      insightsBtn: "Explore Development Insights",
      statReports: "citizen reports",
      statClusters: "issue clusters",
      statLocalities: "localities",
      demoData: "Realistic Demonstration Data",
    },
    pipeline: {
      eyebrow: "The Intelligence Pipeline",
      heading: "From a citizen's experience to a development insight.",
      description: "LokSanket connects individual reports into patterns that can be examined with evidence.",
      stepLabel: "Step",
      steps: [
        {
          num: "01",
          title: "Citizen voices",
          desc: "People describe what they are experiencing in everyday language.",
        },
        {
          num: "02",
          title: "AI understanding",
          desc: "Gemini identifies the problem, category, location, and severity.",
        },
        {
          num: "03",
          title: "Patterns",
          desc: "Related reports are grouped by locality into recurring issues.",
        },
        {
          num: "04",
          title: "Evidence",
          desc: "Volume, severity, trends and location are examined objectively.",
        },
        {
          num: "05",
          title: "Priority",
          desc: "A deterministic score summarizes the evidence transparently.",
        },
        {
          num: "06",
          title: "Human review",
          desc: "Public officials review the evidence before deciding upon action.",
        },
      ],
    },
    showcase: {
      badge: "Live Decision-Support Example",
      heading: "From individual reports to a development insight.",
      description:
        "See how multiple citizen reports become an evidence-backed priority. LokSanket synthesizes 137 separate complaints from Ward 17 into an auditable intelligence dossier that public representatives can act upon.",
      bullet1: "Cross-verified across 5 residential localities to rule out single-location bias.",
      bullet2: "Ground truth verified by 18 resident-uploaded photographs of road breaches.",
      bullet3: "Transparent 80.1 priority score calculated deterministically without LLM hallucination.",
      dashboardLink: "Explore full development intelligence in dashboard",
      highPriority: "High Priority",
      category: "Road Infrastructure",
      locality: "Ward 17",
      issueTitle: "Potholes / Severe Road Surface Damage",
      issueSubtitle: "LokSanket identified this as a high-priority issue based on the available evidence.",
      priorityScoreLabel: "Priority Score",
      metricReports: "Reports",
      metricLocalities: "Localities",
      metricPhoto: "Photo Evidence",
      metricTrend: "Recent Trend",
      whyFlaggedHeading: "Why was this flagged?",
      whyFlaggedBody:
        "137 reports across 5 localities, increasing recent activity (+159%), high-severity reports (120 high/critical reports), and available photo evidence contributed to the priority assessment.",
      decisionNotice: "Decision support notice: Final operational decisions belong to public officials.",
      viewDossierLink: "View Dossier in Dashboard",
    },
    evidence: {
      eyebrow: "Deterministic Decision Engine",
      heading: "Every priority has an evidence trail.",
      description:
        "LokSanket strictly avoids unexplainable or generative black-box scores. Every priority ranking is calculated using a published, deterministic formula grounded in observable civic data.",
      principleHeading: "Core Product Principle",
      principleBody:
        "Statistics are calculated deterministically. Gemini helps interpret and explain the evidence rather than inventing the numbers.",
      inspectLink: "Inspect live constituency priority calculations",
      formulaHeader: "Priority Scoring Formula Breakdown",
      totalWeight: "Total Weight: 100%",
      auditReady: "Audit-ready: All parameters traceable to raw citizen records.",
      resultLabel: "Result:",
      weights: [
        {
          label: "Demand Volume",
          weight: 30,
          desc: "Total citizen reports filed for this cluster",
          detail: "137 verified reports",
        },
        {
          label: "Severity Impact",
          weight: 25,
          desc: "Danger to public safety and daily life disruption",
          detail: "120 high/critical reports",
        },
        {
          label: "Recent Trend",
          weight: 20,
          desc: "14-day velocity vs. previous baseline",
          detail: "+159% surge",
        },
        {
          label: "Geographic Concentration",
          weight: 15,
          desc: "Density across Ward 17 neighborhood clusters",
          detail: "5 localities affected",
        },
        {
          label: "Evidence Strength",
          weight: 10,
          desc: "Photo submissions and precise location data",
          detail: "18 photo uploads",
        },
      ],
    },
    categories: {
      eyebrow: "Constituency Coverage",
      heading: "What can citizens tell LokSanket about?",
      description:
        "Citizen concerns are categorized into ten core civic domains to assist relevant municipal and departmental authorities.",
      items: [
        { name: "Roads", desc: "Potholes, damaged roads & unsafe access" },
        { name: "Water", desc: "Supply cuts, pipeline leakage & access" },
        { name: "Drainage", desc: "Overflowing nullahs & monsoon flooding" },
        { name: "Sanitation", desc: "Public toilets, hygiene & open waste" },
        { name: "Street Lighting", desc: "Non-functional lights & dark spots" },
        { name: "Healthcare", desc: "Dispensary staff, medicine & clinics" },
        { name: "Education", desc: "School buildings, desks & amenities" },
        { name: "Electricity", desc: "Transformers, voltage swings & outages" },
        { name: "Transport", desc: "Bus stops, service routes & frequency" },
        { name: "Waste", desc: "Garbage collection & open dump points" },
      ],
    },
    cta: {
      heading: "Make your local experience visible.",
      description:
        "Share what is happening in your area or explore the development patterns already identified by LokSanket.",
      reportBtn: "Report an Issue",
      insightsBtn: "Explore Development Insights",
    },
    footer: {
      brandDescription:
        "AI-powered constituency development intelligence platform. Transforming citizen voices and ground reports into transparent, evidence-backed priorities for human decision-makers.",
      ux4gCredit: "Inspired by UX4G 3.0 citizen-centric public service design standards.",
      platformHeading: "Platform",
      home: "Home",
      howItWorks: "How LokSanket Works",
      dashboard: "Development Insights Dashboard",
      report: "Report a Local Issue",
      noticeHeading: "Decision Support Notice",
      noticeBody:
        "LokSanket is a decision-support system, not an autonomous government decision-maker. All priority rankings and AI-assisted summaries are grounded in traceable evidence and subject to official human review.",
      copyright: "LokSanket Civic Intelligence Initiative. Synthetic demonstration release.",
      decisionSupportMode: "Decision Support Mode",
      groundTruthRequired: "Ground Truth Verification Required",
    },
    report: {
      breadcrumbHome: "Home",
      breadcrumbCurrent: "Report a local issue",
      title: "Report a local issue",
      subtitle: "Tell us what is happening in your area. You can write in Hindi, English, or Hinglish.",
      quickExamplesLabel: "Quick examples for testing:",
      issueLabel: "What is the issue?",
      issueRequired: "*",
      issuePlaceholder:
        "Describe what is happening in your own words (e.g. broken road, water disruption, drainage overflow)...",
      issueHint: "Please be specific about what happened and how long it has been a problem.",
      localityLabel: "Locality / Area",
      localityPlaceholder: "e.g. Ward 17 - Gandhi Nagar Main Road",
      languageLabel: "Language",
      autoDetect: "Auto-detect",
      photoLabel: "Photo / Evidence (Optional)",
      photoPlaceholder: "https://example.com/photo.jpg",
      photoHint: "Photographs help verify ground reality and strengthen the evidence trail.",
      photoUploadBtn: "Upload photos",
      photoAddMoreBtn: "+ Add more photos",
      photoFormatHint: "Up to 5 photos · JPG, PNG or WEBP · Max 5 MB each",
      photoChangeBtn: "Change",
      photoRemoveBtn: "Remove",
      submitBtn: "Submit Report",
      submittingBtn: "Submitting report...",
      submitHint: "Submissions are compiled into evidence-backed development priorities.",
      successTitle: "Thank you. Your report has been received.",
      successSubtitle:
        "LokSanket will analyze this report alongside other citizen inputs to identify recurring local issues and development patterns.",
      refIdLabel: "Reference ID:",
      categoryLabel: "Identified Category:",
      subcategoryLabel: "Subcategory:",
      severityLabel: "Severity Assessment:",
      affectedGroupsLabel: "Impacted Demographics:",
      viewInsightsBtn: "View in Development Insights",
      reportAnotherBtn: "Report Another Issue",
    },
    dashboard: {
      workspaceSubtitlePublic: "Constituency Decision Support",
      workspaceSubtitleOfficial: "Official Governance Workspace",
      demoBadge: "Realistic Demonstration Data",
      publicReadOnly: "Public Read-Only",
      titlePublic: "Development Intelligence Dashboard",
      titleOfficial: "Official Priority & Review Dashboard",
      subtitlePublic: "Aggregated civic demand volume, severity mapping, recent trends and ground evidence.",
      subtitleOfficial: "Operational workspace for reviewing AI priorities, recording official human decisions, and synthesizing evidence briefs.",
      officialReviewBtn: "Official Review (Demo)",
      reportIssueBtn: "+ Report Issue",
      briefsBtn: "Development Brief",
      recalculateBtn: "Recalculate Priorities",
      exitOfficialBtn: "Exit Official Mode",

      kpiTotalReports: "Total Reports",
      kpiAcrossCategories: (count: number) => `Across ${count} civic categories`,
      kpiHighPriority: "High-Priority Issues",
      kpiHighPrioritySub: "Score ≥ 70.0 based on 5 deterministic factors",
      kpiMediumPriority: "Medium Priority",
      kpiMediumPrioritySub: "Score between 40.0 and 69.9",
      kpiAffectedLocalities: "Affected Localities",
      kpiAffectedLocalitiesSub: "Distinct geographic zones reporting issues",

      tableHeading: "Prioritized Constituency Issues",
      tableSubPublic: "Ranked transparently by demand volume, severity, trend velocity, geographic spread, and photo evidence.",
      tableSubOfficial: "Review deterministic AI recommendations and record official governance decisions.",
      filterAllPriorities: "All Priorities",
      filterHighOnly: "High Priority Only",
      filterMediumOnly: "Medium Priority Only",
      filterLowOnly: "Low Priority Only",
      filterAllCategories: "All Categories",

      colIssueCluster: "Issue Cluster",
      colCategory: "Category",
      colWardsLocalities: "Wards / Localities",
      colReports: "Reports",
      colTrend: "Trend",
      colEvidence: "Evidence",
      colPriorityScore: "Priority Score",
      colOfficialDecision: "Official Decision",
      colAction: "Action",

      noIssuesMatch: "No issues match the selected filter.",
      evidencePhotos: (count: number) => `${count} photos`,
      evidenceTextOnly: "Text reports",
      levelHigh: "High",
      levelMedium: "Medium",
      levelLow: "Low",
      viewEvidence: "View Evidence",
      reviewAndAction: "Review & Action",

      decisionAccepted: "ACCEPTED",
      decisionAdjusted: "ADJUSTED",
      decisionRejected: "REJECTED",
      decisionPending: "PENDING",

      showingCount: (displayed: number, total: number) => `Showing ${displayed} of ${total} issues`,
      showTop5Only: "Show Top 5 Only ↑",
      viewAllIssues: (total: number) => `View all ${total} issues →`,

      publicFootnoteNotice: "Official review decisions and priority adjustments are managed through the Official Review workflow.",
      publicFootnoteLink: "Official Review (Demo) →",

      chartTrendHeading: "Grievance Ingestion Trend (Last 28 Days)",
      chartTrendSub: "Daily complaint filings identifying active surges",
      chartCategoryHeading: "Category Distribution",
      chartCategorySub: "Breakdown across civic service domains",
      chartReportsSeries: "Reports",

      provenanceHeading: "Data Provenance & Mathematical Engine",
      provenanceBody: "LokSanket operates on a five-factor deterministic scoring model combining Demand Volume (30%), Severity (25%), Trend Velocity (15%), Geographic Spread (15%), and Verified Evidence (15%). Priority scores are computed strictly through algorithmic weights rather than generative estimates.",
      constituencyLabel: "Constituency:",
      datasetLabel: "Dataset:",
      publicOrientation: "Public insights view · Decision-support orientation",
      officialOrientation: "Official workspace with review authority",

      loadingSummary: "Loading Constituency Intelligence Summary...",
      loadingSub: "Grounded directly in MongoDB Atlas data.",
      loadError: "Unable to load dashboard data",
      retryBtn: "Retry",

      recentReportsHeading: "Recent Citizen Reports",
      recentReportsSub: "Live intake of citizen feedback parsed by Gemini, showing real-time ingestion status before and after clustering.",
      recentReportsColCategory: "Category",
      recentReportsColSubcategory: "Subcategory",
      recentReportsColWard: "Ward / Zone",
      recentReportsColTime: "Received",
      recentReportsColSeverity: "Severity",
      recentReportsColStatus: "Pipeline Status",
      statusAwaitingClustering: "Awaiting Clustering",
      statusClustered: "Clustered",
      timeJustNow: "Just now",
      timeMinutesAgo: (m: number) => `${m}m ago`,
      timeHoursAgo: (h: number) => `${h}h ago`,
      timeDaysAgo: (d: number) => `${d}d ago`,
      pipelineNotice: "Citizen submission → Gemini understanding → Awaiting periodic clustering or clustered into priority intelligence.",
      noRecentReports: "No recent citizen reports recorded yet.",
    },
  },
  hi: {
    nav: {
      metaTitle: "लोकसंकेत · LokSanket | निर्वाचन क्षेत्र विकास हेतु निर्णय-सहायता मंच",
      demoBadge: "यथार्थवादी प्रदर्शन डेटा",
      brandSubtitle: "नागरिक विकास इंटेलिजेंस",
      home: "होम",
      howItWorks: "कार्यप्रणाली",
      insights: "विकास अंतर्दृष्टि",
      about: "परिचय",
      reportCta: "समस्या दर्ज करें",
      reportShort: "रिपोर्ट करें",
      languageLabel: "भाषा:",
      officialReviewBtn: "आधिकारिक समीक्षा (डेमो)",
    },
    hero: {
      eyebrow: "एआई-संचालित नागरिक विकास इंटेलिजेंस",
      headlinePart1: "नागरिकों की आवाज़ को विकास की",
      headlinePart2: "स्पष्ट प्राथमिकताओं में बदलना।",
      description:
        "नागरिक प्रतिक्रिया, स्थानीय साक्ष्य और उभरते रुझान — एक साथ मिलकर यह समझने में मदद करते हैं कि किन क्षेत्रों पर तुरंत ध्यान देने की आवश्यकता है।",
      reportBtn: "समस्या दर्ज करें",
      insightsBtn: "विकास अंतर्दृष्टि देखें",
      statReports: "नागरिक शिकायतें",
      statClusters: "समस्या समूह",
      statLocalities: "क्षेत्र",
      demoData: "यथार्थवादी प्रदर्शन डेटा",
    },
    pipeline: {
      eyebrow: "इंटेलिजेंस कार्यप्रणाली",
      heading: "नागरिक के अनुभव से लेकर विकास अंतर्दृष्टि तक।",
      description: "LokSanket व्यक्तिगत शिकायतों को साक्ष्य-आधारित पैटर्न से जोड़ता है।",
      stepLabel: "चरण",
      steps: [
        {
          num: "01",
          title: "नागरिक आवाज़",
          desc: "नागरिक अपनी रोजमर्रा की भाषा में समस्याओं का विवरण देते हैं।",
        },
        {
          num: "02",
          title: "एआई समझ",
          desc: "Gemini समस्या, श्रेणी, स्थान और गंभीरता की पहचान करता है।",
        },
        {
          num: "03",
          title: "पैटर्न समूहन",
          desc: "संबंधित शिकायतों को क्षेत्र के आधार पर समूहीकृत किया जाता है।",
        },
        {
          num: "04",
          title: "साक्ष्य विश्लेषण",
          desc: "मात्रा, गंभीरता, रुझान और स्थान की वस्तुनिष्ठ जांच होती है।",
        },
        {
          num: "05",
          title: "प्राथमिकता स्कोर",
          desc: "एक पारदर्शी फॉर्मूला साक्ष्यों का मूल्यांकन करता है।",
        },
        {
          num: "06",
          title: "मानव समीक्षा",
          desc: "जनप्रतिनिधि और अधिकारी निर्णय लेने से पहले साक्ष्यों की समीक्षा करते हैं।",
        },
      ],
    },
    showcase: {
      badge: "लाइव निर्णय-सहायता उदाहरण",
      heading: "व्यक्तिगत रिपोर्टों से विकास अंतर्दृष्टि तक।",
      description:
        "देखें कि कैसे कई नागरिक शिकायतें साक्ष्य-समर्थित प्राथमिकता बन जाती हैं। LokSanket Ward 17 की 137 अलग-अलग शिकायतों को एक सत्यापन योग्य डोजियर में संकलित करता है जिस पर जनप्रतिनिधि विश्वास के साथ कार्रवाई कर सकते हैं।",
      bullet1: "एकल-स्थान पूर्वाग्रह को दूर करने के लिए 5 आवासीय क्षेत्रों में सत्यापित।",
      bullet2: "सड़क क्षति की 18 निवासियों द्वारा अपलोड की गई तस्वीरों से जमीनी हकीकत सत्यापित।",
      bullet3: "बिना किसी त्रुटि के पारदर्शी 80.1 प्राथमिकता स्कोर की गणना।",
      dashboardLink: "डैशबोर्ड में संपूर्ण विकास इंटेलिजेंस देखें",
      highPriority: "उच्च प्राथमिकता",
      category: "सड़क अवसंरचना",
      locality: "Ward 17",
      issueTitle: "गड्ढे / गंभीर सड़क सतह क्षति",
      issueSubtitle: "LokSanket ने उपलब्ध साक्ष्यों के आधार पर इसे उच्च-प्राथमिकता वाला मुद्दा माना है।",
      priorityScoreLabel: "प्राथमिकता स्कोर",
      metricReports: "रिपोर्टें",
      metricLocalities: "क्षेत्र",
      metricPhoto: "फोटो साक्ष्य",
      metricTrend: "हालिया रुझान",
      whyFlaggedHeading: "इसे प्राथमिकता क्यों दी गई?",
      whyFlaggedBody:
        "5 क्षेत्रों में 137 रिपोर्टें, हाल की बढ़ती गतिविधियां (+159%), उच्च-गंभीरता वाली शिकायतें (120 उच्च/गंभीर रिपोर्टें) और उपलब्ध फोटो साक्ष्यों ने इस प्राथमिकता मूल्यांकन में योगदान दिया।",
      decisionNotice: "निर्णय सहायता सूचना: अंतिम परिचालन निर्णय जनप्रतिनिधियों और अधिकारियों के अधिकार क्षेत्र में हैं।",
      viewDossierLink: "डैशबोर्ड में डोजियर देखें",
    },
    evidence: {
      eyebrow: "पारदर्शी निर्णय प्रणाली",
      heading: "प्रत्येक प्राथमिकता का एक स्पष्ट साक्ष्य पथ होता है।",
      description:
        "LokSanket अस्पष्ट या ब्लैक-बॉक्स एआई स्कोर से बचता है। प्रत्येक प्राथमिकता रैंकिंग वस्तुनिष्ठ नागरिक डेटा पर आधारित एक प्रकाशित, गणितीय फॉर्मूले द्वारा तय होती है।",
      principleHeading: "मूल उत्पाद सिद्धांत",
      principleBody:
        "सांख्यिकी की गणना गणितीय रूप से की जाती है। Gemini संख्याओं का आविष्कार करने के बजाय साक्ष्यों की व्याख्या करने में सहायता करता है।",
      inspectLink: "लाइव निर्वाचन क्षेत्र प्राथमिकता गणना की जांच करें",
      formulaHeader: "प्राथमिकता स्कोरिंग फॉर्मूला विवरण",
      totalWeight: "कुल भार: 100%",
      auditReady: "ऑडिट योग्य: सभी पैरामीटर मूल नागरिक रिकॉर्ड से सत्यापित किए जा सकते हैं।",
      resultLabel: "परिणाम:",
      weights: [
        {
          label: "मांग की मात्रा",
          weight: 30,
          desc: "इस समूह के लिए दर्ज कुल नागरिक रिपोर्टें",
          detail: "137 सत्यापित रिपोर्टें",
        },
        {
          label: "गंभीरता का प्रभाव",
          weight: 25,
          desc: "जन सुरक्षा और दैनिक जीवन में व्यवधान का स्तर",
          detail: "120 उच्च/गंभीर रिपोर्टें",
        },
        {
          label: "हालिया रुझान",
          weight: 20,
          desc: "पिछले आधार की तुलना में 14 दिनों की गतिविधि दर",
          detail: "+159% वृद्धि",
        },
        {
          label: "भौगोलिक एकाग्रता",
          weight: 15,
          desc: "Ward 17 के मोहल्लों में समस्या का फैलाव",
          detail: "5 प्रभावित क्षेत्र",
        },
        {
          label: "साक्ष्य की प्रामाणिकता",
          weight: 10,
          desc: "फोटो अपलोड और सटीक स्थान का डेटा",
          detail: "18 फोटो अपलोड",
        },
      ],
    },
    categories: {
      eyebrow: "निर्वाचन क्षेत्र कवरेज",
      heading: "नागरिक LokSanket पर किन समस्याओं की जानकारी दे सकते हैं?",
      description:
        "नागरिकों की शिकायतों को दस मुख्य नागरिक श्रेणियों में वर्गीकृत किया गया है ताकि संबंधित नगर निगम और विभागीय अधिकारियों को त्वरित सहायता मिल सके।",
      items: [
        { name: "सड़कें", desc: "गड्ढे, टूटी सड़कें और असुरक्षित आवागमन" },
        { name: "जल आपूर्ति", desc: "सप्लाई में रुकावट, पाइपलाइन लीकेज और दूषित पानी" },
        { name: "जल निकासी", desc: "उफनते नाले, बंद गटर और जलभराव" },
        { name: "स्वच्छता", desc: "सार्वजनिक शौचालय, सफाई और खुला कचरा" },
        { name: "स्ट्रीट लाइट", desc: "खराब लाइटें, टूटे खंभे और अंधेरे स्थान" },
        { name: "स्वास्थ्य सेवा", desc: "डिस्पेंसरी स्टाफ की कमी, दवाइयां और स्वास्थ्य केंद्र" },
        { name: "शिक्षा", desc: "स्कूल भवनों की मरम्मत, डेस्क और छात्र सुविधाएं" },
        { name: "बिजली आपूर्ति", desc: "ट्रांसफार्मर फॉल्ट, वोल्टेज में उतार-चढ़ाव और कटौती" },
        { name: "सार्वजनिक परिवहन", desc: "बस स्टॉप, रूट की समस्याएं और अनियमितता" },
        { name: "कचरा प्रबंधन", desc: "अनसुलझे कचरे के ढेर और अनियमित कचरा वाहन" },
      ],
    },
    cta: {
      heading: "अपने स्थानीय अनुभव को दृश्यमान बनाएं।",
      description:
        "अपने क्षेत्र की स्थिति साझा करें या LokSanket द्वारा पहचाने गए विकास पैटर्न को देखें।",
      reportBtn: "समस्या दर्ज करें",
      insightsBtn: "विकास अंतर्दृष्टि देखें",
    },
    footer: {
      brandDescription:
        "एआई-संचालित नागरिक विकास इंटेलिजेंस प्लेटफॉर्म। नागरिक आवाजों और जमीनी रिपोर्टों को निर्णयकर्ताओं के लिए पारदर्शी प्राथमिकताओं में परिवर्तित करना।",
      ux4gCredit: "UX4G 3.0 नागरिक-केंद्रित सार्वजनिक सेवा डिज़ाइन मानकों से प्रेरित।",
      platformHeading: "प्लेटफॉर्म",
      home: "होम",
      howItWorks: "LokSanket की कार्यप्रणाली",
      dashboard: "विकास अंतर्दृष्टि डैशबोर्ड",
      report: "स्थानीय समस्या दर्ज करें",
      noticeHeading: "निर्णय सहायता सूचना",
      noticeBody:
        "LokSanket एक निर्णय-सहायता प्रणाली है, न कि कोई स्वायत्त सरकारी निर्णयकर्ता। सभी प्राथमिकताएं सत्यापन योग्य साक्ष्यों पर आधारित हैं और आधिकारिक मानव समीक्षा के अधीन हैं।",
      copyright: "LokSanket नागरिक इंटेलिजेंस पहल। यथार्थवादी प्रदर्शन संस्करण।",
      decisionSupportMode: "निर्णय सहायता मोड",
      groundTruthRequired: "जमीनी सत्यापन आवश्यक",
    },
    report: {
      breadcrumbHome: "होम",
      breadcrumbCurrent: "स्थानीय समस्या दर्ज करें",
      title: "स्थानीय समस्या दर्ज करें",
      subtitle: "हमें बताएं कि आपके क्षेत्र में क्या हो रहा है। आप हिंदी, अंग्रेजी या हिंग्लिश में लिख सकते हैं।",
      quickExamplesLabel: "परीक्षण के लिए त्वरित उदाहरण:",
      issueLabel: "समस्या क्या है?",
      issueRequired: "*",
      issuePlaceholder:
        "अपनी भाषा में बताएं कि क्या समस्या हो रही है (जैसे टूटी सड़क, पानी की समस्या, नाले का उफान)...",
      issueHint: "कृपया स्पष्ट बताएं कि क्या हुआ और यह समस्या कितने समय से है।",
      localityLabel: "क्षेत्र / इलाका",
      localityPlaceholder: "उदा. वार्ड 17 - गांधी नगर मुख्य मार्ग",
      languageLabel: "भाषा",
      autoDetect: "स्वचालित पहचान (Auto-detect)",
      photoLabel: "फोटो / साक्ष्य (वैकल्पिक)",
      photoPlaceholder: "https://example.com/photo.jpg",
      photoHint: "तस्वीरें जमीनी हकीकत को सत्यापित करने और साक्ष्य श्रृंखला को मजबूत करने में मदद करती हैं।",
      photoUploadBtn: "तस्वीरें अपलोड करें",
      photoAddMoreBtn: "+ और तस्वीरें जोड़ें",
      photoFormatHint: "अधिकतम 5 तस्वीरें · JPG, PNG या WEBP · अधिकतम 5 MB प्रत्येक",
      photoChangeBtn: "बदलें",
      photoRemoveBtn: "हटाएं",
      submitBtn: "रिपोर्ट सबमिट करें",
      submittingBtn: "रिपोर्ट सबमिट हो रही है...",
      submitHint: "शिकायतें साक्ष्य-समर्थित विकास प्राथमिकताओं में संकलित की जाती हैं।",
      successTitle: "धन्यवाद। आपकी रिपोर्ट प्राप्त हो गई है।",
      successSubtitle:
        "LokSanket आवर्ती स्थानीय समस्याओं और विकास प्राथमिकताओं की पहचान करने के लिए अन्य नागरिक इनपुट के साथ इसका विश्लेषण करेगा।",
      refIdLabel: "संदर्भ संख्या:",
      categoryLabel: "पहचानी गई श्रेणी:",
      subcategoryLabel: "उप-श्रेणी:",
      severityLabel: "गंभीरता स्तर:",
      affectedGroupsLabel: "प्रभावित जनसमूह:",
      viewInsightsBtn: "विकास अंतर्दृष्टि में देखें",
      reportAnotherBtn: "एक और समस्या दर्ज करें",
    },
    dashboard: {
      workspaceSubtitlePublic: "निर्वाचन क्षेत्र निर्णय-सहायता",
      workspaceSubtitleOfficial: "आधिकारिक शासन कार्यक्षेत्र",
      demoBadge: "यथार्थवादी प्रदर्शन डेटा",
      publicReadOnly: "सार्वजनिक केवल-दृश्य",
      titlePublic: "विकास इंटेलिजेंस डैशबोर्ड",
      titleOfficial: "आधिकारिक प्राथमिकता एवं समीक्षा डैशबोर्ड",
      subtitlePublic: "संकलित नागरिक मांग, गंभीरता मानचित्रण, हालिया रुझान और जमीनी साक्ष्य।",
      subtitleOfficial: "एआई प्राथमिकताओं की समीक्षा, आधिकारिक मानवीय निर्णयों को दर्ज करने और साक्ष्य संक्षेप तैयार करने हेतु परिचालन कार्यक्षेत्र।",
      officialReviewBtn: "आधिकारिक समीक्षा (डेमो)",
      reportIssueBtn: "+ समस्या दर्ज करें",
      briefsBtn: "विकास संक्षेप",
      recalculateBtn: "प्राथमिकताएं पुनर्गणना करें",
      exitOfficialBtn: "आधिकारिक मोड से बाहर निकलें",

      kpiTotalReports: "कुल रिपोर्टें",
      kpiAcrossCategories: (count: number) => `${count} नागरिक श्रेणियों में`,
      kpiHighPriority: "उच्च प्राथमिकता वाली समस्याएं",
      kpiHighPrioritySub: "5 वस्तुनिष्ठ कारकों के आधार पर स्कोर ≥ 70.0",
      kpiMediumPriority: "मध्यम प्राथमिकता",
      kpiMediumPrioritySub: "40.0 और 69.9 के बीच स्कोर",
      kpiAffectedLocalities: "प्रभावित क्षेत्र",
      kpiAffectedLocalitiesSub: "समस्याएं दर्ज करने वाले विभिन्न भौगोलिक क्षेत्र",

      tableHeading: "प्राथमिकता-प्राप्त निर्वाचन क्षेत्र समस्याएं",
      tableSubPublic: "मांग की मात्रा, गंभीरता, रुझान गति, भौगोलिक फैलाव और फोटो साक्ष्यों के आधार पर पारदर्शी रैंकिंग।",
      tableSubOfficial: "वस्तुनिष्ठ एआई अनुशंसाओं की समीक्षा करें और आधिकारिक शासन निर्णय दर्ज करें।",
      filterAllPriorities: "सभी प्राथमिकताएं",
      filterHighOnly: "केवल उच्च प्राथमिकता",
      filterMediumOnly: "केवल मध्यम प्राथमिकता",
      filterLowOnly: "केवल निम्न प्राथमिकता",
      filterAllCategories: "सभी श्रेणियां",

      colIssueCluster: "समस्या समूह",
      colCategory: "श्रेणी",
      colWardsLocalities: "वार्ड / क्षेत्र",
      colReports: "रिपोर्टें",
      colTrend: "रुझान",
      colEvidence: "साक्ष्य",
      colPriorityScore: "प्राथमिकता स्कोर",
      colOfficialDecision: "आधिकारिक निर्णय",
      colAction: "कार्रवाई",

      noIssuesMatch: "चयनित फ़िल्टर से मेल खाने वाली कोई समस्या नहीं है।",
      evidencePhotos: (count: number) => `${count} तस्वीरें`,
      evidenceTextOnly: "टेक्स्ट रिपोर्टें",
      levelHigh: "उच्च",
      levelMedium: "मध्यम",
      levelLow: "निम्न",
      viewEvidence: "साक्ष्य देखें",
      reviewAndAction: "समीक्षा और कार्रवाई",

      decisionAccepted: "स्वीकृत",
      decisionAdjusted: "समायोजित",
      decisionRejected: "अस्वीकृत",
      decisionPending: "लंबित",

      showingCount: (displayed: number, total: number) => `${total} में से ${displayed} समस्याएं प्रदर्शित`,
      showTop5Only: "केवल शीर्ष 5 दिखाएं ↑",
      viewAllIssues: (total: number) => `सभी ${total} समस्याएं देखें →`,

      publicFootnoteNotice: "आधिकारिक समीक्षा निर्णय और प्राथमिकता समायोजन आधिकारिक समीक्षा कार्यप्रवाह के माध्यम से प्रबंधित किए जाते हैं।",
      publicFootnoteLink: "आधिकारिक समीक्षा (डेमो) →",

      chartTrendHeading: "शिकायत प्राप्ति रुझान (पिछले 28 दिन)",
      chartTrendSub: "सक्रिय वृद्धि की पहचान करने वाली दैनिक शिकायतें",
      chartCategoryHeading: "श्रेणी वितरण",
      chartCategorySub: "नागरिक सेवा क्षेत्रों में वितरण",
      chartReportsSeries: "रिपोर्टें",

      provenanceHeading: "डेटा स्रोत और गणितीय इंजन",
      provenanceBody: "LokSanket एक पांच-कारकीय वस्तुनिष्ठ स्कोरिंग मॉडल पर कार्य करता है, जिसमें मांग की मात्रा (30%), गंभीरता (25%), रुझान गति (15%), भौगोलिक फैलाव (15%) और सत्यापित साक्ष्य (15%) शामिल हैं। प्राथमिकता स्कोर बिना किसी कृत्रिम अनुमान के पूरी तरह से एल्गोरिदम भार के माध्यम से तय किए जाते हैं।",
      constituencyLabel: "निर्वाचन क्षेत्र:",
      datasetLabel: "डेटासेट:",
      publicOrientation: "सार्वजनिक अंतर्दृष्टि दृश्य · निर्णय-सहायता उन्मुखीकरण",
      officialOrientation: "समीक्षा अधिकार सहित आधिकारिक कार्यक्षेत्र",

      loadingSummary: "निर्वाचन क्षेत्र इंटेलिजेंस सारांश लोड हो रहा है...",
      loadingSub: "सीधे MongoDB Atlas डेटा पर आधारित।",
      loadError: "डैशबोर्ड डेटा लोड करने में असमर्थ",
      retryBtn: "पुनः प्रयास करें",

      recentReportsHeading: "हालिया नागरिक रिपोर्टें",
      recentReportsSub: "Gemini द्वारा विश्लेषित नवीनतम नागरिक शिकायतें, जो क्लस्टरिंग से पहले और बाद की स्थिति दर्शाती हैं।",
      recentReportsColCategory: "श्रेणी",
      recentReportsColSubcategory: "उप-श्रेणी",
      recentReportsColWard: "वार्ड / क्षेत्र",
      recentReportsColTime: "प्राप्त समय",
      recentReportsColSeverity: "गंभीरता",
      recentReportsColStatus: "पाइपलाइन स्थिति",
      statusAwaitingClustering: "क्लस्टरिंग की प्रतीक्षा",
      statusClustered: "क्लस्टर में शामिल",
      timeJustNow: "अभी-अभी",
      timeMinutesAgo: (m: number) => `${m} मिनट पहले`,
      timeHoursAgo: (h: number) => `${h} घंटे पहले`,
      timeDaysAgo: (d: number) => `${d} दिन पहले`,
      pipelineNotice: "नागरिक शिकायत → Gemini विश्लेषण → आवधिक क्लस्टरिंग की प्रतीक्षा अथवा प्राथमिकता समूह में शामिल।",
      noRecentReports: "अभी तक कोई हालिया नागरिक रिपोर्ट दर्ज नहीं हुई है।",
    },
  },
};

/**
 * Civic category translation mapping for LokSanket.
 * Preserves underlying database values while rendering localized labels.
 */
export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  "Road Infrastructure": "सड़क अवसंरचना",
  "Drainage": "जल निकासी",
  "Waste Management": "अपशिष्ट प्रबंधन",
  "Electricity": "विद्युत",
  "Electricity & Power": "विद्युत एवं ऊर्जा",
  "Healthcare": "स्वास्थ्य सेवा",
  "Water Supply & Sanitation": "जल आपूर्ति एवं स्वच्छता",
  "Water Supply": "जल आपूर्ति",
  "Sanitation": "स्वच्छता",
  "Education": "शिक्षा",
  "Public Transport": "सार्वजनिक परिवहन",
  "Transport": "परिवहन",
  "Street Lighting": "स्ट्रीट लाइटिंग",
  "General Administration": "सामान्य प्रशासन",
  "Public Administration": "लोक प्रशासन",
  "Public Infrastructure": "सार्वजनिक अवसंरचना",
};

/**
 * Returns the localized civic category name for display.
 */
export function formatCategoryName(category?: string, lang: Language = "en"): string {
  if (!category) return "";
  if (lang === "hi") {
    return CATEGORY_TRANSLATIONS[category] || category;
  }
  return category;
}

/**
 * Formats Ward / Sector / Area identifiers for display.
 */
export function formatWardDisplay(ward?: string, lang: Language = "en"): string {
  if (!ward) return "";
  if (lang === "hi") {
    return ward
      .replace(/\bWard\s*(\d+)\b/gi, "वार्ड $1")
      .replace(/\bSector\s*(\d+)\b/gi, "सेक्टर $1")
      .replace(/\bCentral\b/gi, "केंद्रीय");
  }
  return ward
    .replace(/\bवार्ड\s*(\d+)\b/gi, "Ward $1")
    .replace(/\bसेक्टर\s*(\d+)\b/gi, "Sector $1");
}

/**
 * System-generated cluster title prefix mapping for seeded demonstration issues.
 */
export const CLUSTER_PREFIX_TRANSLATIONS: Record<string, string> = {
  "Road Damage & Potholes": "सड़क क्षति एवं गड्ढे",
  "Potholes / Road Damage": "सड़क क्षति एवं गड्ढे",
  "Potholes & Road Damage": "सड़क क्षति एवं गड्ढे",
  "Overflowing Open Drains": "उफनते खुले नाले",
  "Unattended Garbage Dumps": "लावारिस कचरे के ढेर",
  "Transformer Overload & Fluctuations": "ट्रांसफार्मर ओवरलोड एवं वोल्टेज उतार-चढ़ाव",
  "Blocked Stormwater Drains": "अवरुद्ध बरसाती नाले",
  "Primary Health Center Deficiencies": "प्राथमिक स्वास्थ्य केंद्र कमियां",
  "Dispensary Medicine Shortage": "डिस्पेंसरी में दवाओं की कमी",
  "Contaminated Drinking Water": "दूषित पेयजल",
  "Drainage Overflow": "नाली का उफान",
  "Government School Infrastructure": "सरकारी स्कूल अवसंरचना",
  "Broken Drainage Lid": "टूटा नाली का ढक्कन",
  "Classroom Shortage & Desks": "कक्षा व डेस्क की कमी",
  "Sewage Overflow": "सीवेज उफान",
  "Drainage Choke": "नाली जाम",
  "Illegal Waste Burning": "अवैध कचरा जलाना",
  "Bus Shelter & Route Irregularity": "बस शेल्टर एवं रूट अनियमितता",
  "Public Toilet Hygiene & Maintenance": "सार्वजनिक शौचालय स्वच्छता एवं रखरखाव",
  "Unscheduled Power Outages": "अघोषित बिजली कटौती",
  "Damaged Electric Poles": "क्षतिग्रस्त बिजली के खंभे",
  "Broken Pavement": "टूटा फुटपाथ",
  "Garbage Dump": "कचरे का ढेर",
  "Feeder Bus Shortage": "फीडर बस की कमी",
  "School Gate Lock Issue": "स्कूल गेट लॉक समस्या",
  "Pipeline Leakage & Wastage": "पाइपलाइन लीकेज एवं बर्बादी",
  "Streetlight Non-functional": "खराब स्ट्रीट लाइटें",
  "Street Light Non-Functional": "खराब स्ट्रीट लाइटें",
  "Non-functional Street Lights": "खराब स्ट्रीट लाइटें",
  "Fused Street Light": "फ्यूज स्ट्रीट लाइट",
  "Bus Stop Bench Missing": "बस स्टॉप बेंच गायब",
  "Scattered Debris": "बिखरा हुआ मलबा",
  "Low Water Pressure": "कम पानी का दबाव",
  "Test Issue": "परीक्षण समस्या",
  "Clogged Gutter": "जाम गटर",
  "System Test": "सिस्टम परीक्षण",
  "General Infrastructure": "सामान्य अवसंरचना",
  "Pavement Cracks": "फुटपाथ की दरारें",
  "Irregular Door-to-Door Collection": "अनियमित घर-घर कचरा उठाव",
  "Minor Surface Erosion": "सड़क की हल्की सतह का कटाव",
  "Dispensary Timings Inquiry": "डिस्पेंसरी समय पूछताछ",
  "Billing Meter Fluctuations": "बिलिंग मीटर उतार-चढ़ाव",
  "Power Fluctuations": "विद्युत उतार-चढ़ाव",
};

/**
 * Returns the localized issue cluster title for UI display without mutating database records.
 */
export function formatClusterTitleDisplay(title?: string, lang: Language = "en"): string {
  if (!title) return "";
  if (lang === "hi") {
    const parts = title.split(/\s+[—–-]\s+/);
    if (parts.length === 2) {
      const prefix = parts[0].trim();
      const suffix = parts[1].trim();
      const hindiPrefix = CLUSTER_PREFIX_TRANSLATIONS[prefix] || prefix;
      const hindiSuffix = formatWardDisplay(suffix, "hi");
      return `${hindiPrefix} — ${hindiSuffix}`;
    }
    return CLUSTER_PREFIX_TRANSLATIONS[title] || title;
  }
  return title;
}

/**
 * Returns localized subcategory name if known, else original string.
 */
export function formatSubcategoryName(sub?: string, lang: Language = "en"): string {
  if (!sub) return "";
  if (lang === "hi") {
    if (CLUSTER_PREFIX_TRANSLATIONS[sub]) {
      return CLUSTER_PREFIX_TRANSLATIONS[sub];
    }
    const lowerSub = sub.toLowerCase().trim();
    for (const [key, val] of Object.entries(CLUSTER_PREFIX_TRANSLATIONS)) {
      if (key.toLowerCase().trim() === lowerSub) {
        return val;
      }
    }
    return sub;
  }
  return sub;
}

/**
 * Formats relative timestamp cleanly for public citizen transparency.
 */
export function formatRelativeTime(
  dateInput: string | Date,
  lang: Language = "en"
): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (lang === "hi") {
    if (diffMinutes < 1) return "अभी-अभी";
    if (diffMinutes < 60) return `${diffMinutes} मिनट पहले`;
    if (diffHours < 24) return `${diffHours} घंटे पहले`;
    return `${diffDays} दिन पहले`;
  } else {
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }
}


