// IPO Radar AI — Sample IPO Data
// Design: Dark Terminal Luxe — monospaced financial data, teal accents, institutional tone

export interface IPOCompany {
  id: string;
  name: string;
  ticker: string;
  sector: string;
  sectorColor: string;
  description: string;
  image: string;
  filingStatus: "Filed" | "Amended" | "Priced" | "Withdrawn";
  dealSize: string;
  proposedRange: string;
  filingDate: string;
  exchange: string;
  leadUnderwriters: string[];
  headquarters: string;
  revenue: string;
  netIncome: string;
  grossMargin: string;
  cashOnHand: string;
  totalDebt: string;
  employees: string;
  founded: string;
  ceo: string;
  businessModel: string;
  useOfProceeds: string;
  riskFactors: string[];
  competitiveLandscape: string;
  recentDevelopments: string[];
  filingHistory: { date: string; type: string; description: string }[];
}

export const ipoCompanies: IPOCompany[] = [
  {
    id: "quantumleap",
    name: "QuantumLeap Computing",
    ticker: "QLAP",
    sector: "Quantum Computing",
    sectorColor: "#8B5CF6",
    description: "Develops fault-tolerant quantum processors for enterprise cryptography and drug discovery workloads. Their proprietary topological qubit architecture achieves 99.7% gate fidelity.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/quantum_computing_8fd76da9.jpg",
    filingStatus: "Filed",
    dealSize: "$840M",
    proposedRange: "$28–$32",
    filingDate: "Mar 15, 2026",
    exchange: "NASDAQ",
    leadUnderwriters: ["Goldman Sachs", "Morgan Stanley"],
    headquarters: "Boulder, CO",
    revenue: "$127M (FY2025)",
    netIncome: "-$89M (FY2025)",
    grossMargin: "62%",
    cashOnHand: "$340M",
    totalDebt: "$45M",
    employees: "1,200",
    founded: "2019",
    ceo: "Dr. Sarah Chen",
    businessModel: "QuantumLeap Computing designs and manufactures fault-tolerant quantum processors based on a proprietary topological qubit architecture. The company generates revenue through three channels: quantum computing-as-a-service (QCaaS) subscriptions for enterprise clients, licensing of quantum algorithms to pharmaceutical and financial services firms, and direct hardware sales to government research laboratories. Their topological approach achieves 99.7% gate fidelity, significantly exceeding the industry average of 99.2%, enabling practical quantum advantage for specific computational workloads including molecular simulation and cryptographic analysis.",
    useOfProceeds: "Approximately 40% for expansion of the Boulder fabrication facility, 25% for R&D investment in next-generation qubit architectures, 20% for sales and marketing expansion into European and Asian markets, and 15% for general corporate purposes and working capital.",
    riskFactors: [
      "Pre-revenue quantum computing market with uncertain commercial timelines",
      "Significant ongoing capital requirements for fabrication facility expansion",
      "Dependence on a limited number of government contracts for near-term revenue",
      "Competition from well-funded incumbents including IBM, Google, and IonQ",
      "Regulatory uncertainty around quantum computing export controls"
    ],
    competitiveLandscape: "The quantum computing market is dominated by large technology companies (IBM, Google, Amazon) and publicly traded pure-plays (IonQ, Rigetti). QuantumLeap differentiates through its topological qubit approach, which offers inherently lower error rates. The total addressable market for quantum computing is estimated at $65B by 2030.",
    recentDevelopments: [
      "Secured $180M Series D funding led by Andreessen Horowitz (Jan 2026)",
      "Signed 5-year contract with U.S. Department of Energy worth $95M (Feb 2026)",
      "Achieved 1,000-qubit milestone on experimental processor (Mar 2026)"
    ],
    filingHistory: [
      { date: "Mar 15, 2026", type: "S-1", description: "Initial filing with SEC" },
    ]
  },
  {
    id: "meridian-bio",
    name: "Meridian Biosciences",
    ticker: "MRDN",
    sector: "Biotechnology",
    sectorColor: "#10B981",
    description: "Clinical-stage biotech developing mRNA-based therapies for autoimmune diseases. Lead candidate MRD-401 is in Phase 2b trials for rheumatoid arthritis with breakthrough therapy designation.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/biotech_ed6b4244.jpg",
    filingStatus: "Amended",
    dealSize: "$520M",
    proposedRange: "$18–$21",
    filingDate: "Feb 28, 2026",
    exchange: "NASDAQ",
    leadUnderwriters: ["J.P. Morgan", "Jefferies"],
    headquarters: "Cambridge, MA",
    revenue: "$42M (FY2025)",
    netIncome: "-$156M (FY2025)",
    grossMargin: "78%",
    cashOnHand: "$210M",
    totalDebt: "$30M",
    employees: "680",
    founded: "2020",
    ceo: "Dr. James Whitfield",
    businessModel: "Meridian Biosciences is a clinical-stage biotechnology company focused on developing mRNA-based therapeutics for autoimmune and inflammatory diseases. The company's proprietary lipid nanoparticle delivery platform enables targeted delivery of modified mRNA to immune cells, reprogramming them to reduce autoimmune responses. Revenue is currently derived from research collaboration agreements with two major pharmaceutical partners. The lead candidate, MRD-401, has received FDA Breakthrough Therapy designation for rheumatoid arthritis.",
    useOfProceeds: "Approximately 50% to fund Phase 3 clinical trials for MRD-401, 20% for advancement of pipeline candidates MRD-502 and MRD-603 into clinical development, 15% for manufacturing scale-up, and 15% for general corporate purposes.",
    riskFactors: [
      "Clinical-stage company with limited revenue and history of significant losses",
      "MRD-401 Phase 2b results may not be replicated in Phase 3 trials",
      "mRNA therapeutic platform is relatively unproven for autoimmune indications",
      "Dependence on third-party contract manufacturers for drug supply",
      "Intense competition from established immunology franchises (AbbVie, Amgen)"
    ],
    competitiveLandscape: "The autoimmune therapeutics market exceeds $80B annually and is dominated by TNF inhibitors and JAK inhibitors. Meridian's mRNA approach represents a potential paradigm shift, offering disease modification rather than symptom management. Key competitors include Moderna (mRNA platform), AbbVie (Humira/Rinvoq), and Bristol-Myers Squibb.",
    recentDevelopments: [
      "MRD-401 Phase 2b data showed 58% ACR50 response rate (Jan 2026)",
      "FDA granted Breakthrough Therapy designation for MRD-401 (Feb 2026)",
      "Filed S-1/A amendment with updated financial data (Mar 2026)"
    ],
    filingHistory: [
      { date: "Feb 28, 2026", type: "S-1", description: "Initial filing with SEC" },
      { date: "Mar 22, 2026", type: "S-1/A", description: "Amendment with updated Phase 2b data and financials" },
    ]
  },
  {
    id: "paystream",
    name: "PayStream Financial",
    ticker: "PSTM",
    sector: "Fintech",
    sectorColor: "#3B82F6",
    description: "B2B cross-border payment infrastructure serving mid-market companies. Processes $18B in annual payment volume across 140 countries with real-time FX settlement.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/fintech_d7356136.jpg",
    filingStatus: "Filed",
    dealSize: "$1.2B",
    proposedRange: "$34–$38",
    filingDate: "Mar 8, 2026",
    exchange: "NYSE",
    leadUnderwriters: ["Morgan Stanley", "Goldman Sachs", "Barclays"],
    headquarters: "New York, NY",
    revenue: "$485M (FY2025)",
    netIncome: "$32M (FY2025)",
    grossMargin: "54%",
    cashOnHand: "$290M",
    totalDebt: "$120M",
    employees: "2,400",
    founded: "2017",
    ceo: "Michael Torres",
    businessModel: "PayStream Financial operates a B2B cross-border payment infrastructure platform that enables mid-market companies to send and receive payments across 140 countries. The platform combines real-time foreign exchange settlement, compliance automation, and treasury management tools. Revenue is generated through transaction fees (0.3–0.8% of payment volume), FX spread, and SaaS subscription fees for premium treasury features. The company processes approximately $18B in annual payment volume with a net revenue retention rate of 135%.",
    useOfProceeds: "Approximately 35% for international expansion (APAC and Latin America), 25% for technology infrastructure and product development, 20% for strategic acquisitions, and 20% for general corporate purposes and debt repayment.",
    riskFactors: [
      "Intense competition from established payment networks and emerging fintech players",
      "Regulatory complexity across 140 operating jurisdictions",
      "Foreign exchange rate volatility affecting revenue predictability",
      "Concentration risk with top 20 clients representing 35% of revenue",
      "Cybersecurity threats inherent to financial infrastructure"
    ],
    competitiveLandscape: "The B2B cross-border payments market is estimated at $150B in annual revenue opportunity. Key competitors include Wise (consumer/SMB focus), Payoneer, and traditional correspondent banking networks. PayStream differentiates through its mid-market focus, real-time settlement capabilities, and integrated treasury management suite.",
    recentDevelopments: [
      "Crossed $18B in annualized payment volume (Q4 2025)",
      "Launched real-time settlement in 12 new Asian markets (Jan 2026)",
      "Achieved first full year of GAAP profitability (FY2025)"
    ],
    filingHistory: [
      { date: "Mar 8, 2026", type: "S-1", description: "Initial filing with SEC" },
    ]
  },
  {
    id: "solarvolt",
    name: "SolarVolt Energy",
    ticker: "SVLT",
    sector: "Clean Energy",
    sectorColor: "#F59E0B",
    description: "Vertically integrated solar-plus-storage developer for commercial and industrial customers. Operates 2.8 GW of installed capacity across 14 states with proprietary battery management software.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/clean_energy_f50a3017.jpg",
    filingStatus: "Filed",
    dealSize: "$680M",
    proposedRange: "$22–$26",
    filingDate: "Mar 20, 2026",
    exchange: "NYSE",
    leadUnderwriters: ["Citi", "BofA Securities"],
    headquarters: "Austin, TX",
    revenue: "$892M (FY2025)",
    netIncome: "$67M (FY2025)",
    grossMargin: "28%",
    cashOnHand: "$180M",
    totalDebt: "$450M",
    employees: "3,100",
    founded: "2018",
    ceo: "Elena Rodriguez",
    businessModel: "SolarVolt Energy is a vertically integrated solar-plus-storage developer serving commercial and industrial (C&I) customers. The company designs, finances, installs, and operates distributed solar generation and battery storage systems under long-term power purchase agreements (PPAs) typically spanning 15–25 years. Revenue is generated through PPA energy payments, engineering and construction services, and software licensing for its proprietary battery management platform. The company currently operates 2.8 GW of installed capacity across 14 states.",
    useOfProceeds: "Approximately 45% for project development pipeline funding, 25% for debt reduction, 15% for expansion into utility-scale storage, and 15% for R&D and general corporate purposes.",
    riskFactors: [
      "Capital-intensive business model requiring continuous project financing",
      "Dependence on federal and state renewable energy tax incentives",
      "Supply chain concentration in solar panel and battery cell procurement",
      "Interest rate sensitivity affecting project economics and customer demand",
      "Weather and natural disaster risks affecting installed asset performance"
    ],
    competitiveLandscape: "The C&I solar market is fragmented with key competitors including Sunrun (residential/C&I), Sunnova, and large developers like NextEra Energy Partners. SolarVolt differentiates through its integrated storage offering and proprietary battery management software, which optimizes energy arbitrage and demand charge reduction for customers.",
    recentDevelopments: [
      "Secured $500M project finance facility with BlackRock (Feb 2026)",
      "Surpassed 2.8 GW of installed capacity milestone (Mar 2026)",
      "Won 400 MW C&I solar portfolio contract with major retail chain (Mar 2026)"
    ],
    filingHistory: [
      { date: "Mar 20, 2026", type: "S-1", description: "Initial filing with SEC" },
    ]
  },
  {
    id: "cognisys",
    name: "CogniSys AI",
    ticker: "CGAI",
    sector: "Artificial Intelligence",
    sectorColor: "#06B6D4",
    description: "Enterprise AI platform specializing in document intelligence and workflow automation for regulated industries. Processes 2M+ documents daily for Fortune 500 financial services and healthcare clients.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/ai_platform_a372bcbc.jpg",
    filingStatus: "Amended",
    dealSize: "$950M",
    proposedRange: "$40–$45",
    filingDate: "Feb 10, 2026",
    exchange: "NASDAQ",
    leadUnderwriters: ["Goldman Sachs", "J.P. Morgan", "Deutsche Bank"],
    headquarters: "San Francisco, CA",
    revenue: "$310M (FY2025)",
    netIncome: "-$28M (FY2025)",
    grossMargin: "72%",
    cashOnHand: "$420M",
    totalDebt: "$85M",
    employees: "1,800",
    founded: "2018",
    ceo: "David Park",
    businessModel: "CogniSys AI provides an enterprise AI platform that automates document-intensive workflows in regulated industries. The platform combines proprietary large language models fine-tuned for financial and healthcare documents with deterministic extraction pipelines, enabling clients to process contracts, regulatory filings, medical records, and compliance documents with 99.4% accuracy. Revenue is generated through annual SaaS subscriptions (85% of revenue) and professional services for custom model training and integration. The platform processes over 2 million documents daily across 45 Fortune 500 clients.",
    useOfProceeds: "Approximately 35% for R&D investment in next-generation AI models, 30% for sales and marketing expansion (particularly in Europe and Japan), 20% for strategic acquisitions of domain-specific AI companies, and 15% for general corporate purposes.",
    riskFactors: [
      "Rapidly evolving AI competitive landscape with well-funded competitors",
      "Regulatory uncertainty around AI use in healthcare and financial services",
      "Customer concentration with top 10 clients representing 42% of ARR",
      "Dependence on third-party cloud infrastructure (AWS, Azure)",
      "Potential liability from AI-generated outputs in regulated contexts"
    ],
    competitiveLandscape: "The enterprise AI market for document intelligence is estimated at $25B by 2027. Key competitors include Palantir (government/enterprise), C3.ai, and specialized players like Hyperscience and Instabase. CogniSys differentiates through its focus on regulated industries, achieving compliance certifications (SOC 2 Type II, HIPAA, FedRAMP) that create significant switching costs.",
    recentDevelopments: [
      "Achieved $310M ARR, representing 85% YoY growth (Q4 2025)",
      "Signed enterprise agreement with top 3 U.S. health insurer (Jan 2026)",
      "Filed S-1/A with updated pricing range reflecting strong demand (Mar 2026)"
    ],
    filingHistory: [
      { date: "Feb 10, 2026", type: "S-1", description: "Initial filing with SEC" },
      { date: "Mar 18, 2026", type: "S-1/A", description: "Amendment with updated pricing range and Q4 financials" },
    ]
  },
  {
    id: "nuvocart",
    name: "NuvoCart Commerce",
    ticker: "NUVO",
    sector: "E-Commerce",
    sectorColor: "#EC4899",
    description: "Social commerce platform enabling creators and small brands to sell directly through short-form video. Facilitates $3.2B in GMV across 180K active merchants with integrated fulfillment.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663280665947/XKw6FAyQwbdSSsaMMhPauF/ecommerce_48c320f5.jpg",
    filingStatus: "Filed",
    dealSize: "$750M",
    proposedRange: "$24–$28",
    filingDate: "Mar 25, 2026",
    exchange: "NYSE",
    leadUnderwriters: ["J.P. Morgan", "BofA Securities", "UBS"],
    headquarters: "Los Angeles, CA",
    revenue: "$620M (FY2025)",
    netIncome: "-$45M (FY2025)",
    grossMargin: "45%",
    cashOnHand: "$350M",
    totalDebt: "$90M",
    employees: "2,800",
    founded: "2019",
    ceo: "Lisa Chang",
    businessModel: "NuvoCart Commerce operates a social commerce platform that enables creators and small brands to sell products directly through short-form video content. The platform integrates video creation tools, storefront management, payment processing, and third-party logistics into a unified experience. Revenue is generated through transaction fees (3.5% of GMV), advertising services for brand partners, and premium subscription tiers for advanced analytics and fulfillment services. The platform facilitates $3.2B in annual gross merchandise value across 180,000 active merchants.",
    useOfProceeds: "Approximately 30% for technology and product development, 25% for expansion of fulfillment network, 25% for sales and marketing, and 20% for general corporate purposes and potential acquisitions.",
    riskFactors: [
      "Dependence on social media platform algorithms and policies",
      "Intense competition from established e-commerce and social commerce players",
      "Merchant churn risk in a low-switching-cost environment",
      "Fulfillment network expansion requires significant capital investment",
      "Regulatory risks around influencer marketing and consumer protection"
    ],
    competitiveLandscape: "The social commerce market is projected to reach $80B in the U.S. by 2028. Key competitors include Shopify (merchant tools), TikTok Shop (social commerce), and Amazon Live. NuvoCart differentiates through its creator-first approach, integrated fulfillment network, and proprietary video commerce technology that achieves 3x higher conversion rates than traditional e-commerce.",
    recentDevelopments: [
      "Surpassed $3.2B in annualized GMV (Q4 2025)",
      "Launched NuvoFulfill integrated logistics network in 8 U.S. cities (Feb 2026)",
      "Partnered with 3 major consumer brands for exclusive live shopping events (Mar 2026)"
    ],
    filingHistory: [
      { date: "Mar 25, 2026", type: "S-1", description: "Initial filing with SEC" },
    ]
  }
];

export const marketStats = {
  newFilingsThisWeek: 12,
  amendmentsDetected: 8,
  likelyNearTermLaunches: 5,
  materialChanges: 3,
};
