import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, Store, UserPlus, ScanBarcode, Package, FileText, QrCode, MessageSquare,
  Shield, Settings, ArrowLeft, BookOpen, HelpCircle, Truck, Bell, Lock, Smartphone,
  Download, CreditCard, Users, BarChart3
} from 'lucide-react';

const GUIDES = [
  {
    id: 'getting-started',
    icon: BookOpen,
    title: 'Getting Started',
    sections: [
      {
        title: 'System Requirements',
        content: 'CossInfo works on any modern browser (Chrome, Edge, Safari, Firefox) with an internet connection. Camera access is optional for barcode scanning. The platform is fully responsive and works on desktop, tablet, and mobile devices.'
      },
      {
        title: 'Key URLs',
        content: 'Use your deployment URL as the homepage | Store Login: /login | Registration: /register | Install as App: /install. CossInfo can be installed as a Progressive Web App (PWA) for quick access from your home screen.'
      },
    ]
  },
  {
    id: 'registration',
    icon: UserPlus,
    title: 'Store Registration',
    sections: [
      {
        title: 'How to Register',
        content: '1. Visit /register and choose a plan (Starter, Popular, or Enterprise).\n2. Fill in store details — Store Name, Owner Name, Email, Contact Number, and Address.\n3. Set a secure password (minimum 8 characters).\n4. Accept the Terms & Conditions.\n5. Submit the form. A 6-digit OTP will be sent to your email.\n6. Enter the OTP to verify your email.\n7. Your Store ID is generated — save it for reference.'
      },
      {
        title: 'Important Notes',
        content: 'Each email and contact number can only be used for one store. A unique Store ID (e.g., STORE-0001) is auto-generated. Enterprise plan users will be contacted for a custom setup.'
      },
    ]
  },
  {
    id: 'login',
    icon: Lock,
    title: 'Store Login',
    sections: [
      {
        title: 'Password Login',
        content: 'Enter your registered email and password, then click Login to access your Employee Dashboard.'
      },
      {
        title: 'Email OTP Login',
        content: 'Switch to "Email OTP" mode → Enter your email → Click "Send OTP" → A 6-digit code is sent to your email → Enter the code and click "Verify & Login". OTP codes expire after 5 minutes.'
      },
      {
        title: 'Forgot Password',
        content: 'Click "Forgot Password?" on the login page → Enter your email → Receive a reset link → Follow the link to set a new password.'
      },
    ]
  },
  {
    id: 'inventory',
    icon: Package,
    title: 'Employee Dashboard',
    sections: [
      {
        title: 'Stock Stacking',
        content: 'Select a week date → Toggle between Front Stock (shop floor) and Back Stock (storage) → Select a product and enter quantities → Values auto-save. Use your camera to scan barcodes for instant product lookup.'
      },
      {
        title: 'Stock Summary Table',
        content: 'View all entries for the selected week. Columns include: Brand Name, Avg Sales, Front Stock, Back Stock, Next Week Need, and Order Quantity. Edit or delete entries using action buttons.'
      },
      {
        title: 'Order Generation',
        content: 'Review calculated order quantities in the "Suggested Order" column → Click "Confirm Order" to generate a PDF report grouped by manufacturer for easy distribution.'
      },
      {
        title: 'Notifications',
        content: 'Click the bell icon to view real-time notifications including new customer orders, status updates, and system alerts. Sound alerts play for new notifications.'
      },
    ]
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'Settings & Management',
    sections: [
      {
        title: 'Store Details',
        content: 'Update store name, contact, email, address, and profile picture. Configure webhook URLs for third-party integrations.'
      },
      {
        title: 'Product Management',
        content: 'Add, edit, or delete products. Assign barcodes (carton/packet). Set unit types, average sales, and order quantities. Import from the Global Product Library.'
      },
      {
        title: 'QR Ordering Setup',
        content: 'View your unique QR code (requires QR Service plan). Toggle store name visibility. Set delivery mode (Pickup, Delivery*, Both). Manage time slots for scheduling.'
      },
      {
        title: 'Customer Management',
        content: 'View, add, edit, or delete customers. Search and filter by name, email, or contact number.'
      },
      {
        title: 'Order Management',
        content: 'View and manage QR orders. Update status: Pending → Preparing → Ready → Collected. Assign collection numbers and add admin notes.'
      },
    ]
  },
  {
    id: 'qr-ordering',
    icon: QrCode,
    title: 'QR-Based Ordering',
    sections: [
      {
        title: 'Customer Flow',
        content: '1. Customer scans the QR code at your store.\n2. Enters Name, Email, and Contact Number.\n3. OTP sent to email for verification.\n4. Writes order details and selects Pickup or Delivery*.\n5. Selects a preferred time slot.\n6. Submits order and sees real-time status tracking.'
      },
      {
        title: 'Order Status Tracking',
        content: 'Status flow: Pending → Preparing → Ready → Collected. Collection numbers are assigned when ready. Sound alerts notify customers of changes.'
      },
      {
        title: 'Managing Orders (Store Owner)',
        content: 'New orders appear as notifications with sound. Manage from Settings → Orders tab. Update statuses and assign collection numbers.'
      },
    ]
  },
  {
    id: 'community',
    icon: MessageSquare,
    title: 'Community Chat',
    sections: [
      {
        title: 'Features',
        content: 'Join topic-based channels. Send and receive messages in real-time. Anonymous mode shows store name instead of personal identity. Available on Popular and Enterprise plans.'
      },
      {
        title: 'How to Use',
        content: 'Access from the chat icon in the Employee Dashboard sidebar. Select a channel to view and send messages. All store owners in the channel can see messages.'
      },
    ]
  },
  {
    id: 'admin',
    icon: Shield,
    title: 'Admin Panel',
    sections: [
      {
        title: 'Access',
        content: 'Navigate to /backend/login and sign in with admin credentials. Admin role must be assigned by a developer.'
      },
      {
        title: 'Store Management',
        content: 'View all stores. Edit details, change plans, toggle services. Block/unblock or delete stores. Reset passwords. Filter by name, status, or plan.'
      },
      {
        title: 'Global Product Library',
        content: 'Manage the master product database. Add/edit/delete products with barcodes. CSV import/export, batch operations. Assign products to store portfolios.'
      },
      {
        title: 'Service Control',
        content: 'Enable/disable QR Ordering and Community Chat per store with expiry dates. Set plan durations (1, 3, 6, or 12 months). Configure chat modes.'
      },
    ]
  },
];

const FAQ = [
  { q: "I can't scan barcodes. What should I do?", a: "Ensure your browser has camera permission enabled. Use a well-lit area and hold the barcode steady. Chrome works best for barcode scanning." },
  { q: "I forgot my password. How do I reset it?", a: "Click 'Forgot Password?' on the login page. Enter your email to receive a reset link. Follow the link to set a new password." },
  { q: "My OTP expired. Can I get a new one?", a: "Yes. Click 'Resend OTP' on the verification page. OTP codes are valid for 5 minutes. Wait at least 60 seconds between requests." },
  { q: "How do I enable QR Ordering for my store?", a: "QR Ordering requires a Popular or Enterprise plan. Contact your platform administrator to enable the service." },
  { q: "Can I use CossInfo on my phone?", a: "Yes! CossInfo is fully responsive. You can also install it as a PWA from the /install page for a native app experience." },
  { q: "How do I add products to my store?", a: "Go to Settings → Products tab. You can add manually, scan barcodes, or import from the Global Product Library." },
  { q: "What does 'Delivery*' mean?", a: "Delivery availability depends on store settings and service area. The store owner configures whether delivery is offered." },
  { q: "How do I contact support?", a: "Use the feedback form on the homepage or email the platform administrator directly. Enterprise plan users have priority support." },
  { q: "What are the available pricing plans?", a: "Starter ($29.99/mo) — basic stock management with 500 SKUs. Popular ($49.99/mo) — includes QR ordering and community chat. Business ($79.99/mo) — 2,000 SKUs and multi-channel chat. Enterprise (Custom) — everything plus custom branding and multi-store admin." },
  { q: "Can I export my stock data?", a: "Yes. The Employee Dashboard lets you generate PDF reports grouped by manufacturer. You can also export product lists as CSV from Settings." },
];

export default function HelpCenter() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('guides');

  const filteredGuides = search.trim()
    ? GUIDES.filter(g =>
        g.title.toLowerCase().includes(search.toLowerCase()) ||
        g.sections.some(s =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.content.toLowerCase().includes(search.toLowerCase())
        )
      )
    : GUIDES;

  const filteredFaq = search.trim()
    ? FAQ.filter(f =>
        f.q.toLowerCase().includes(search.toLowerCase()) ||
        f.a.toLowerCase().includes(search.toLowerCase())
      )
    : FAQ;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader
        rightContent={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/login')}>
              <Store className="h-4 w-4" />
              Store Login
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => navigate('/register')}>
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Register</span>
            </Button>
          </div>
        }
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="gradient-primary py-12 lg:py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <HelpCircle className="h-8 w-8 text-primary-foreground" />
              <h1 className="text-2xl lg:text-3xl font-bold text-primary-foreground">Help Center</h1>
            </div>
            <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto">
              Find guides, tutorials, and answers to common questions
            </p>
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guides and FAQ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Download PDF button */}
          <div className="flex justify-end mb-4">
            <Button variant="outline" size="sm" className="gap-2" asChild>
              <a href="/CossInfo_User_Manual.pdf" download>
                <Download className="h-4 w-4" />
                Download PDF Manual
              </a>
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start mb-6">
              <TabsTrigger value="guides" className="gap-1.5">
                <BookOpen className="h-4 w-4" />
                Guides
              </TabsTrigger>
              <TabsTrigger value="faq" className="gap-1.5">
                <HelpCircle className="h-4 w-4" />
                FAQ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="guides">
              <div className="space-y-4">
                {filteredGuides.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No guides match your search.</p>
                )}
                {filteredGuides.map(guide => (
                  <Card key={guide.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <guide.icon className="h-4 w-4 text-primary" />
                        </div>
                        {guide.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible>
                        {guide.sections.map((section, i) => (
                          <AccordionItem key={i} value={`${guide.id}-${i}`}>
                            <AccordionTrigger className="text-sm font-medium">
                              {section.title}
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                                {section.content}
                              </p>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="faq">
              <Card>
                <CardContent className="pt-6">
                  {filteredFaq.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No FAQ items match your search.</p>
                  )}
                  <Accordion type="single" collapsible>
                    {filteredFaq.map((faq, i) => (
                      <AccordionItem key={i} value={`faq-${i}`}>
                        <AccordionTrigger className="text-sm font-medium text-left">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>CossInfo — Smart Stock Management Platform</p>
          <p className="mt-1">
            <a href="/" className="text-primary hover:underline">Home</a>
            {' · '}
            <a href="/login" className="text-primary hover:underline">Login</a>
            {' · '}
            <a href="/register" className="text-primary hover:underline">Register</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
