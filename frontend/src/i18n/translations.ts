export type Language = 'en' | 'sw' | 'hi';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  protocolVerified: string;
  tabs: {
    farmer: string;
    insurer: string;
    validation: string;
  };
  farmer: {
    title: string;
    subtitle: string;
    personaBadge: string;
    step1: string;
    step2: string;
    photo1Label: string;
    photo2Label: string;
    photo3Label: string;
    photoHint: string;
    plotId: string;
    crop: string;
    county: string;
    season: string;
    submit: string;
    submitting: string;
    quickPresets: string;
    presetWanjiru: string;
    presetDuplicate: string;
    presetBlurry: string;
    statusSubmitted: string;
    statusEvaluating: string;
    claimRef: string;
    cameraCapture: string;
  };
  insurer: {
    title: string;
    subtitle: string;
    subTabs: {
      triage: string;
      indexDoctor: string;
    };
    triageTitle: string;
    filterAll: string;
    filterGaps: string;
    filterPayouts: string;
    filterHolds: string;
    filterOverpayment: string;
    inspectButton: string;
    outcome: string;
    severity: string;
    confidence: string;
    date: string;
    actions: {
      approve: string;
      reject: string;
      escalate: string;
    };
    inspector: {
      title: string;
      photosTitle: string;
      forensicsTitle: string;
      concordanceTitle: string;
      policyTitle: string;
      auditTitle: string;
      signsLeafRolling: string;
      signsSenescence: string;
      signsStunting: string;
      signsSoilCracking: string;
      twoPassAgreed: string;
      twoPassDisagreed: string;
      signal1: string;
      signal2: string;
      signal3: string;
      adjusterBrief: string;
      humanSignOff: string;
      adjusterId: string;
      notesPlaceholder: string;
      saveDecision: string;
    };
    indexDoctor: {
      title: string;
      subtitle: string;
      sliderLabel: string;
      totalPlots: string;
      payoutFrequency: string;
      gapRate: string;
      overpaymentRate: string;
      totalPayout: string;
      recommendation: string;
      countyBreakdown: string;
      viewSql: string;
    };
  };
  validation: {
    title: string;
    subtitle: string;
    ablationTitle: string;
    riskCoverageTitle: string;
    integrityTitle: string;
    frozenProtocolTitle: string;
    economicsTitle: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    appTitle: "FieldProof",
    appSubtitle: "Closing the Basis-Risk Gap in Agricultural Index Insurance",
    protocolVerified: "Trigger Protocol Frozen & Timestamped",
    tabs: {
      farmer: "Farmer Field Capture",
      insurer: "Insurer Triage & Index Doctor",
      validation: "Empirical Validation & Ablation"
    },
    farmer: {
      title: "Mobile Field Evidence Capture",
      subtitle: "Submit georeferenced smartphone crop photos when the area index fails to pay.",
      personaBadge: "Demo Persona: Wanjiru · Makueni County, Kenya · Plot P-0142",
      step1: "1. Upload 3 Plot Photos",
      step2: "2. Confirm Plot & Crop Details",
      photo1Label: "Photo 1: Plot Overview (Landscape)",
      photo2Label: "Photo 2: Crop Canopy & Leaves",
      photo3Label: "Photo 3: Soil Moisture & Roots",
      photoHint: "Take clear photos in natural daylight. Near-duplicate or screen photos will be held.",
      plotId: "Plot ID",
      crop: "Crop Type",
      county: "County / District",
      season: "Season",
      submit: "Submit Claim Evidence",
      submitting: "Verifying Integrity & Evaluating...",
      quickPresets: "Quick Load Demo Cases:",
      presetWanjiru: "Wanjiru's Case (Flowering Drought Gap)",
      presetDuplicate: "Planted Duplicate Attack",
      presetBlurry: "Non-Field Photo",
      statusSubmitted: "Claim Submitted Successfully",
      statusEvaluating: "Multimodal forensics running across 2 passes...",
      claimRef: "Claim Reference Number",
      cameraCapture: "Use Camera"
    },
    insurer: {
      title: "Insurer Claims & Recalibration Suite",
      subtitle: "Deterministic three-signal concordance, policy clause citations, and Index Doctor.",
      subTabs: {
        triage: "Claims Triage Queue & Inspector",
        indexDoctor: "Index Doctor Recalibration Workbench"
      },
      triageTitle: "Active Claims Triage Queue",
      filterAll: "All Claims",
      filterGaps: "Basis-Risk Gaps",
      filterPayouts: "Confirmed Payouts",
      filterHolds: "Integrity Holds",
      filterOverpayment: "Overpayment Reviews",
      inspectButton: "Inspect Claim & Decide",
      outcome: "Outcome Class",
      severity: "Severity Band",
      confidence: "Confidence",
      date: "Submission Date",
      actions: {
        approve: "Approve Payout",
        reject: "Reject Claim",
        escalate: "Escalate to Agronomist"
      },
      inspector: {
        title: "Claim Deep-Inspection & Decision",
        photosTitle: "Photo Bundle & Cryptographic Forensics",
        forensicsTitle: "Gemini Calibrated Grading (Two-Pass)",
        concordanceTitle: "Three-Signal Deterministic Concordance",
        policyTitle: "Ground Policy Brief & Verified Clause Citations",
        auditTitle: "BigQuery Immutable Audit Trail",
        signsLeafRolling: "Leaf Rolling Severity",
        signsSenescence: "Canopy Senescence",
        signsStunting: "Stand Stunting",
        signsSoilCracking: "Visible Soil Cracking",
        twoPassAgreed: "Two passes agreed on severity band. Safe for automated triage.",
        twoPassDisagreed: "Passes disagreed. Mandatory abstention routed to human adjuster.",
        signal1: "Signal 1: Rainfall Index",
        signal2: "Signal 2: Ground Photo Severity",
        signal3: "Signal 3: Satellite NDVI & Phenology",
        adjusterBrief: "Cited Policy Brief",
        humanSignOff: "Mandatory Human Adjuster Sign-Off",
        adjusterId: "Adjuster ID",
        notesPlaceholder: "Enter audit reasoning / adjuster notes...",
        saveDecision: "Confirm Decision & Write Audit Log"
      },
      indexDoctor: {
        title: "Index Doctor: Recalibration Workbench",
        subtitle: "Simulate trigger changes across 600 historical plots in BigQuery to close basis-risk gaps.",
        sliderLabel: "Rainfall Trigger Percentile Threshold",
        totalPlots: "Total Insured Plots",
        payoutFrequency: "Payout Frequency",
        gapRate: "Basis-Risk Gap Rate",
        overpaymentRate: "Overpayment Rate",
        totalPayout: "Illustrative Total Payout",
        recommendation: "Actuarial Recalibration Recommendation",
        countyBreakdown: "County-by-County Gap & Payout Breakdown",
        viewSql: "View Parameterized BigQuery SQL"
      }
    },
    validation: {
      title: "Technical Rigor & Empirical Validation",
      subtitle: "Four-arm ablation study, agreement gating risk-coverage curve, and protocol freeze audit.",
      ablationTitle: "Four-Arm Ablation Study (300 Stratified Test Bundles)",
      riskCoverageTitle: "Agreement Gate: Risk-Coverage Operating Curve",
      integrityTitle: "Integrity Forensics: Planted Bad Bundle Scorecard",
      frozenProtocolTitle: "Frozen Trigger Protocol & Git Verification",
      economicsTitle: "Insurer Unit Economics & ROI Model"
    }
  },
  sw: {
    appTitle: "FieldProof",
    appSubtitle: "Kuziba Pengo la Hatari ya Msingi katika Bima ya Kilimo",
    protocolVerified: "Kanuni Imefungwa na Kuthibitishwa",
    tabs: {
      farmer: "Uwasilishaji wa Mkulima",
      insurer: "Ukaguzi wa Bima & Daktari wa Kielezo",
      validation: "Uthibitisho wa Kiufundi"
    },
    farmer: {
      title: "Ushahidi wa Picha za Shamba",
      subtitle: "Wasilisha picha 3 za mazao wakati kielezo cha mvua kinaposhindwa kulipa.",
      personaBadge: "Mkulima: Wanjiru · Kaunti ya Makueni, Kenya · Shamba P-0142",
      step1: "1. Pakia Picha 3 za Shamba",
      step2: "2. Thibitisha Maelezo ya Shamba",
      photo1Label: "Picha 1: Muonekano wa Shamba Nzima",
      photo2Label: "Picha 2: Majani na Mazao Karibu",
      photo3Label: "Picha 3: Udongo na Mizizi",
      photoHint: "Piga picha safi mchana. Picha zilizorudiwa au za skrini zitazuiliwa.",
      plotId: "Nambari ya Shamba",
      crop: "Aina ya Zao",
      county: "Kaunti",
      season: "Msimu",
      submit: "Wasilisha Madai",
      submitting: "Inakagua na kutathmini...",
      quickPresets: "Mifano ya Haraka:",
      presetWanjiru: "Kesi ya Wanjiru (Ukame wa Maua)",
      presetDuplicate: "Picha Iliyorudiwa",
      presetBlurry: "Picha Isiyo ya Shamba",
      statusSubmitted: "Dai Limewasilishwa Kikamilifu",
      statusEvaluating: "Uchambuzi unaendelea...",
      claimRef: "Nambari ya Kumbukumbu ya Dai",
      cameraCapture: "Tumia Kamera"
    },
    insurer: {
      title: "Dashibodi ya Mkaguzi wa Bima",
      subtitle: "Ulinganifu wa ishara tatu, vifungu vya bima, na Daktari wa Kielezo.",
      subTabs: {
        triage: "Orodha ya Madai & Ukaguzi",
        indexDoctor: "Daktari wa Kielezo (Index Doctor)"
      },
      triageTitle: "Madai Yanayosubiri Ukaguzi",
      filterAll: "Madai Yote",
      filterGaps: "Mapengo ya Msingi",
      filterPayouts: "Malipo Yaliyothibitishwa",
      filterHolds: "Yaliyozuiliwa",
      filterOverpayment: "Ukaguzi wa Malipo Ziada",
      inspectButton: "Kagua Dai & Amua",
      outcome: "Aina ya Matokeo",
      severity: "Kiwango cha Uharibifu",
      confidence: "Uaminifu",
      date: "Tarehe ya Kuwasilishwa",
      actions: {
        approve: "Idhinisha Malipo",
        reject: "Kataa Dai",
        escalate: "Peleka kwa Mtaalamu"
      },
      inspector: {
        title: "Ukaguzi wa Kina na Uamuzi",
        photosTitle: "Ushahidi wa Picha & Ukaguzi wa Udanganyifu",
        forensicsTitle: "Kiwango cha Uharibifu (Gemini)",
        concordanceTitle: "Ulinganifu wa Ishara Tatu",
        policyTitle: "Vifungu vya Sera ya Bima",
        auditTitle: "Kumbukumbu ya Ukaguzi wa BigQuery",
        signsLeafRolling: "Kujikunja kwa Majani",
        signsSenescence: "Kukauka kwa Majani",
        signsStunting: "Kudumaa kwa Mimea",
        signsSoilCracking: "Kupasuka kwa Udongo",
        twoPassAgreed: "Ukaguzi mara mbili ulikubaliana.",
        twoPassDisagreed: "Ukaguzi haukukubaliana. Uamuzi unapelekwa kwa binadamu.",
        signal1: "Ishara 1: Kielezo cha Mvua",
        signal2: "Ishara 2: Uharibifu wa Picha",
        signal3: "Ishara 3: Data ya Satelaiti NDVI",
        adjusterBrief: "Muhtasari wa Sera",
        humanSignOff: "Uamuzi wa Lazima wa Binadamu",
        adjusterId: "Kitambulisho cha Mkaguzi",
        notesPlaceholder: "Andika sababu za uamuzi hapa...",
        saveDecision: "Thibitisha na Hifadhi"
      },
      indexDoctor: {
        title: "Daktari wa Kielezo (Index Doctor)",
        subtitle: "Jaribu viwango vipya vya mvua kwenye mashamba 600 ya kihistoria.",
        sliderLabel: "Kiwango cha Asilimia ya Kielezo cha Mvua",
        totalPlots: "Jumla ya Mashamba",
        payoutFrequency: "Mara ya Malipo",
        gapRate: "Kiwango cha Mapengo",
        overpaymentRate: "Kiwango cha Malipo Ziada",
        totalPayout: "Jumla ya Malipo ya Mfano",
        recommendation: "Pendekezo la Kitaalamu",
        countyBreakdown: "Takwimu kwa Kaunti",
        viewSql: "Tazama SQL ya BigQuery"
      }
    },
    validation: {
      title: "Uthibitisho wa Kiufundi na Takwimu",
      subtitle: "Ulinganisho wa mifumo minne, usahihi wa maamuzi, na uokoaji wa gharama.",
      ablationTitle: "Utafiti wa Mifumo Minne (Picha 300)",
      riskCoverageTitle: "Mviringo wa Usahihi wa Maamuzi",
      integrityTitle: "Matokeo ya Majaribio ya Udanganyifu",
      frozenProtocolTitle: "Uthibitisho wa Kanuni ya Git",
      economicsTitle: "Gharama na Faida za Bima"
    }
  },
  hi: {
    appTitle: "FieldProof",
    appSubtitle: "कृषि सूचकांक बीमा में आधार-जोखिम (Basis-Risk) अंतर का समाधान",
    protocolVerified: "ट्रिगर प्रोटोकॉल जमे हुए और समय-चिह्नित (Frozen & Timestamped)",
    tabs: {
      farmer: "किसान खेत सत्यापन",
      insurer: "बीमाकर्ता और इंडेक्स डॉक्टर",
      validation: "तकनीकी सत्यापन और शोध"
    },
    farmer: {
      title: "मोबाइल खेत प्रमाण अपलोड",
      subtitle: "जब क्षेत्र वर्षा सूचकांक दावा न चुकाए, तो खेत की 3 तस्वीरें जमा करें।",
      personaBadge: "किसान: वांजिरू · माकुएनी काउंटी, केन्या · प्लॉट P-0142",
      step1: "1. खेत की 3 तस्वीरें अपलोड करें",
      step2: "2. प्लॉट और फसल विवरण",
      photo1Label: "तस्वीर 1: पूरे खेत का दृश्य (Landscape)",
      photo2Label: "तस्वीर 2: फसल और पत्तियां (Close-up)",
      photo3Label: "तस्वीर 3: मिट्टी और जड़ें",
      photoHint: "प्राकृतिक दिन के उजाले में स्पष्ट तस्वीरें लें। नकल या स्क्रीन फोटो रोक दी जाएंगी।",
      plotId: "प्लॉट आईडी",
      crop: "फसल का प्रकार",
      county: "काउंटी / जिला",
      season: "मौसम",
      submit: "दावा प्रमाण जमा करें",
      submitting: "सत्यापन और मूल्यांकन प्रगति पर है...",
      quickPresets: "डेमो केस लोड करें:",
      presetWanjiru: "वांजिरू का केस (फूल आने पर सूखा)",
      presetDuplicate: "डुप्लिकेट फोटो हमला",
      presetBlurry: "गैर-खेत फोटो",
      statusSubmitted: "दावा सफलतापूर्वक जमा किया गया",
      statusEvaluating: "मल्टीमॉडल फोरेंसिक विश्लेषण चालू है...",
      claimRef: "दावा संदर्भ संख्या",
      cameraCapture: "कैमरा उपयोग करें"
    },
    insurer: {
      title: "बीमाकर्ता दावा प्रबंधन और इंडेक्स डॉक्टर",
      subtitle: "तीन-संकेत मिलान, नीति धारा उद्धरण और इंडेक्स डॉक्टर सिमुलेशन।",
      subTabs: {
        triage: "दावा कतार और विस्तृत जांच",
        indexDoctor: "इंडेक्स डॉक्टर पुन: अंशांकन"
      },
      triageTitle: "समीक्षाधीन दावों की कतार",
      filterAll: "सभी दावे",
      filterGaps: "आधार-जोखिम अंतर (Gaps)",
      filterPayouts: "पुष्ट भुगतान",
      filterHolds: "रोके गए दावे",
      filterOverpayment: "अतिरिक्त भुगतान समीक्षा",
      inspectButton: "जांचें और निर्णय लें",
      outcome: "परिणाम श्रेणी",
      severity: "नुकसान की गंभीरता",
      confidence: "विश्वसनीयता",
      date: "दावा तिथि",
      actions: {
        approve: "भुगतान स्वीकृत करें",
        reject: "दावा अस्वीकार करें",
        escalate: "विशेषज्ञ को अग्रेषित करें"
      },
      inspector: {
        title: "दावा विस्तृत निरीक्षण और निर्णय",
        photosTitle: "फोटो बंडल और क्रिप्टोग्राफिक फोरेंसिक",
        forensicsTitle: "जेमिनी अंशांकित ग्रेडिंग (दो पास)",
        concordanceTitle: "तीन-संकेत निर्णयात्मक मिलान",
        policyTitle: "नीति धारा उद्धरण और ब्रीफ",
        auditTitle: "BigQuery अपरिवर्तनीय ऑडिट ट्रेल",
        signsLeafRolling: "पत्तियों का मुड़ना",
        signsSenescence: "पत्तियों का पीला पड़ना/सूखना",
        signsStunting: "पौधों का बौनापन",
        signsSoilCracking: "मिट्टी में दरारें",
        twoPassAgreed: "दोनों पास सहमत हैं। स्वचालित प्रक्रिया सुरक्षित।",
        twoPassDisagreed: "दोनों पास असहमत हैं। मानव समीक्षक को अग्रेषित।",
        signal1: "संकेत 1: वर्षा सूचकांक",
        signal2: "संकेत 2: फोटो नुकसान गंभीरता",
        signal3: "संकेत 3: उपग्रह NDVI और मौसम",
        adjusterBrief: "नीति संक्षेप (Brief)",
        humanSignOff: "अनिवार्य मानव हस्ताक्षर व निर्णय",
        adjusterId: "समायोजक आईडी",
        notesPlaceholder: "निर्णय का कारण और विवरण दर्ज करें...",
        saveDecision: "निर्णय सहेजें और ऑडिट लॉग लिखें"
      },
      indexDoctor: {
        title: "इंडेक्स डॉक्टर: पुन: अंशांकन वर्कबेंच",
        subtitle: "BigQuery में 600 ऐतिहासिक भूखंडों पर ट्रिगर सीमा का सिमुलेशन करें।",
        sliderLabel: "वर्षा ट्रिगर प्रतिशतक सीमा",
        totalPlots: "कुल बीमित भूखंड",
        payoutFrequency: "भुगतान आवृत्ति",
        gapRate: "अंतर दर (Gap Rate)",
        overpaymentRate: "अतिरिक्त भुगतान दर",
        totalPayout: "अनुमानित कुल भुगतान",
        recommendation: "एक्चुरियल पुन: अंशांकन सिफारिश",
        countyBreakdown: "काउंटी-वार विवरण",
        viewSql: "BigQuery SQL क्वेरी देखें"
      }
    },
    validation: {
      title: "तकनीकी दृढ़ता और अनुभवजन्य सत्यापन",
      subtitle: "चार-आर्म एब्लेशन अध्ययन, जोखिम-कवरेज वक्र और प्रोटोकॉल फ्रीज ऑडिट।",
      ablationTitle: "चार-आर्म एब्लेशन अध्ययन (300 परीक्षण बंडल)",
      riskCoverageTitle: "सहमति गेट: जोखिम-कवरेज परिचालन वक्र",
      integrityTitle: "फोरेंसिक: लगाए गए धोखाधड़ी बंडल परिणाम",
      frozenProtocolTitle: "जमे हुए ट्रिगर प्रोटोकॉल और Git सत्यापन",
      economicsTitle: "बीमाकर्ता इकाई अर्थशास्त्र और बचत मॉडल"
    }
  }
};
