import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, MessageSquare, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Contact() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent!", {
      description: "Thank you for reaching out. We'll get back to you within 24 hours.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-24 pb-12">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-foreground mb-3">Get in Touch</h1>
            <p className="text-lg text-muted-foreground">
              Have a question, feedback, or partnership inquiry? We'd love to hear from you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-card border border-border/50 rounded-xl p-5 text-center">
              <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Email</h3>
              <p className="text-sm text-muted-foreground">support@iporadar.ai</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-5 text-center">
              <Clock className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Response Time</h3>
              <p className="text-sm text-muted-foreground">Within 24 hours</p>
            </div>
            <div className="bg-card border border-border/50 rounded-xl p-5 text-center">
              <Building2 className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">Enterprise</h3>
              <p className="text-sm text-muted-foreground">enterprise@iporadar.ai</p>
            </div>
          </div>

          {/* Contact form */}
          <div className="bg-card border border-border/50 rounded-xl p-8">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Send Us a Message
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Subject</label>
                <select className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="general">General Inquiry</option>
                  <option value="support">Technical Support</option>
                  <option value="enterprise">Enterprise Sales</option>
                  <option value="partnership">Partnership</option>
                  <option value="feedback">Product Feedback</option>
                  <option value="bug">Bug Report</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Message</label>
                <textarea
                  rows={5}
                  placeholder="Tell us how we can help..."
                  className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
