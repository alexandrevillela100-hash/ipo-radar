import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { FileText, Shield } from "lucide-react";

const termsContent = [
  { title: "1. Acceptance of Terms", content: "By accessing and using IPO Radar AI (the \"Service\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service." },
  { title: "2. Description of Service", content: "IPO Radar AI provides automated analysis of SEC filings, AI-generated reports, and IPO tracking tools. The Service aggregates publicly available data from the SEC's EDGAR system and applies artificial intelligence to generate analytical reports." },
  { title: "3. Not Investment Advice", content: "The information provided by IPO Radar AI is for informational and educational purposes only. It does not constitute investment advice, financial advice, trading advice, or any other sort of advice. You should not treat any of the Service's content as such. IPO Radar AI does not recommend that any security should be bought, sold, or held by you. Always conduct your own due diligence and consult with a licensed financial advisor before making investment decisions." },
  { title: "4. Data Accuracy", content: "While we strive to ensure the accuracy of the data presented, IPO Radar AI makes no warranties regarding the completeness, reliability, or accuracy of information. AI-generated reports may contain errors or inaccuracies. Data sourced from SEC EDGAR is provided as-is from the government system." },
  { title: "5. User Accounts", content: "You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. IPO Radar AI is not liable for any loss arising from unauthorized use of your account." },
  { title: "6. Subscription and Billing", content: "Paid subscriptions are billed on a monthly or annual basis. You may cancel at any time, and your access will continue until the end of the current billing period. Refunds are provided in accordance with our refund policy." },
  { title: "7. Intellectual Property", content: "All content, features, and functionality of the Service are owned by IPO Radar AI and are protected by copyright, trademark, and other intellectual property laws. AI-generated reports are provided for your personal or internal business use only." },
  { title: "8. Limitation of Liability", content: "In no event shall IPO Radar AI be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service, including but not limited to investment losses based on information provided by the Service." },
  { title: "9. Modifications", content: "We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the modified Terms." },
  { title: "10. Contact", content: "For questions about these Terms, contact us at legal@iporadar.ai." },
];

const privacyContent = [
  { title: "1. Information We Collect", content: "We collect information you provide directly (name, email, organization) and information collected automatically (usage data, device information, IP address). We do not collect financial account information or trading data." },
  { title: "2. How We Use Information", content: "We use your information to provide and improve the Service, send notifications and alerts you've subscribed to, generate usage analytics to improve our product, and communicate with you about your account or the Service." },
  { title: "3. Data from SEC EDGAR", content: "All SEC filing data is sourced from the publicly available EDGAR system. We do not claim ownership of SEC data. Our AI analysis and reports are derivative works based on this public data." },
  { title: "4. Data Sharing", content: "We do not sell your personal information. We may share data with service providers who assist in operating the Service (hosting, analytics, email delivery), and as required by law or to protect our rights." },
  { title: "5. Data Security", content: "We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure authentication, and regular security audits." },
  { title: "6. Cookies", content: "We use cookies and similar technologies for authentication, preferences, and analytics. You can control cookie settings through your browser, though some features may not function properly without cookies." },
  { title: "7. Data Retention", content: "We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting support@iporadar.ai." },
  { title: "8. Your Rights", content: "Depending on your jurisdiction, you may have rights to access, correct, delete, or export your personal data. To exercise these rights, contact privacy@iporadar.ai." },
  { title: "9. Changes to Privacy Policy", content: "We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the Service." },
  { title: "10. Contact", content: "For privacy-related inquiries, contact us at privacy@iporadar.ai." },
];

export default function Legal() {
  const [isTerms] = useRoute("/terms");
  const isPrivacy = !isTerms;

  const content = isTerms ? termsContent : privacyContent;
  const title = isTerms ? "Terms of Service" : "Privacy Policy";
  const lastUpdated = "April 1, 2026";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-3xl">
          {/* Tab navigation */}
          <div className="flex gap-4 mb-8">
            <Link
              href="/terms"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                isTerms ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-4 h-4" />
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
                isPrivacy ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Shield className="w-4 h-4" />
              Privacy Policy
            </Link>
          </div>

          {/* Content */}
          <div className="bg-card border border-border/50 rounded-xl p-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
            <p className="text-sm text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

            <div className="space-y-6">
              {content.map((section, i) => (
                <div key={i}>
                  <h2 className="text-base font-semibold text-foreground mb-2">{section.title}</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
