import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
          <img src="/1.svg" alt="Duplia" style={{ height: "52px", width: "auto" }} />
        </Link>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto py-8">
      <div className="container mx-auto max-w-5xl px-4 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Duplia. All rights reserved.</p>
        <div className="mt-4 md:mt-0 space-x-6">
          <a href="#" className="hover:text-foreground transition-colors">
            Privacy & Cookie Policy
          </a>
          <a href="#" className="hover:text-foreground transition-colors">
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("duplia-cookie-consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("duplia-cookie-consent", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-[400px] bg-foreground text-background p-4 rounded-xl shadow-2xl z-[100] flex flex-col gap-4 animate-in slide-in-from-bottom-5">
      <p className="text-sm">
        We use cookies to improve your experience and deliver personalized content.
        By continuing to use our site, you agree to our Cookie Policy.
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={acceptCookies} className="text-foreground">
          Accept
        </Button>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <Footer />
      <CookieBanner />
    </div>
  );
}
