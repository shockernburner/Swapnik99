import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MessageSquare, Calendar, Briefcase, Shield, Sparkles } from "lucide-react";
import logoImage from "@assets/swapnik_1768561630231.jpeg";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Swapnik99" className="h-10 w-10 rounded-md object-cover" />
            <span className="font-semibold text-xl text-foreground">Swapnik99</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">Features</a>
            <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-about">About</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild data-testid="button-login">
              <a href="/api/login">Log In</a>
            </Button>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
                <Shield className="h-4 w-4" />
                Private Alumni Network
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight font-serif">
                Reconnect with
                <span className="text-primary block">BUET '99</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg">
                A private community platform exclusively for BUET Batch '99 graduates. 
                Stay connected, share memories, and collaborate with your batchmates.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild data-testid="button-get-started">
                  <a href="/api/login">Get Started</a>
                </Button>
                <Button size="lg" variant="outline" asChild data-testid="button-learn-more">
                  <a href="#features">Learn More</a>
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4 text-accent" />
                  <span>Exclusive Community</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-accent" />
                  <span>Admin Verified</span>
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-3xl" />
              <div className="relative bg-card border rounded-3xl p-8 shadow-xl">
                <img 
                  src={logoImage} 
                  alt="Swapnik99 Logo" 
                  className="w-full aspect-square object-cover rounded-2xl ring-1 ring-black/5 hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-serif">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A comprehensive platform designed to keep our batch connected and engaged.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover-elevate transition-all duration-300">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">News Feed</h3>
                <p className="text-muted-foreground text-sm">
                  Share updates, photos, and stay connected with what's happening in everyone's lives.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate transition-all duration-300">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Real-time Chat</h3>
                <p className="text-muted-foreground text-sm">
                  Private and group messaging to keep conversations flowing with your friends.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate transition-all duration-300">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Discussions</h3>
                <p className="text-muted-foreground text-sm">
                  Engage in threaded discussions with AI-powered summaries for quick catch-ups.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate transition-all duration-300">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Events</h3>
                <p className="text-muted-foreground text-sm">
                  Plan and RSVP to reunions, meetups, and special occasions together.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate transition-all duration-300">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Business Connect</h3>
                <p className="text-muted-foreground text-sm">
                  Network professionally, share opportunities, and support each other's ventures.
                </p>
              </CardContent>
            </Card>
            <Card className="hover-elevate transition-all duration-300">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Transparency</h3>
                <p className="text-muted-foreground text-sm">
                  Access financial reports and accounting documents for complete transparency.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="about" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6 font-serif">
            About Swapnik99
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Swapnik99 is a private social network built exclusively for BUET Batch 1999 graduates. 
            Our platform is designed to keep our community connected, engaged, and thriving together 
            across continents and time zones.
          </p>
          <Button size="lg" asChild data-testid="button-join-community">
            <a href="/api/login">Join Our Community</a>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 px-4">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt="Swapnik99" className="h-8 w-8 rounded-md object-cover" />
            <span className="font-semibold text-foreground">Swapnik99</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Swapnik99. A private platform for BUET '99 Alumni.
          </p>
        </div>
      </footer>
    </div>
  );
}
