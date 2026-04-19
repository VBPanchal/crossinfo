import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import logo from '@/assets/cossinfo-logo-new.png';
import { useState } from 'react';
import { Store, UserPlus, MessageSquare, ScanBarcode, BarChart3, FileText, Shield, ArrowRight, Package, Database, Bell, QrCode, Truck, Check, ChevronDown, HelpCircle, Users, ShoppingCart, Globe, Lock, Smartphone, Settings2, Crown } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const features = [
  { icon: ScanBarcode, title: 'Barcode Scanning', desc: 'Instant product identification via camera — no hardware needed' },
  { icon: Package, title: 'Stock Stacking', desc: 'Smart carton-to-packet conversion with weekly need calculations' },
  { icon: Database, title: 'Product Library', desc: 'Global product database with barcode lookup & auto-fill' },
  { icon: BarChart3, title: 'Real-Time Inventory', desc: 'Track front & back stock levels live across locations' },
  { icon: FileText, title: 'Automated PDF Reports', desc: 'Weekly reports grouped by manufacturer, generated automatically' },
  { icon: Shield, title: 'Multi-Store Management', desc: 'Central admin panel for all your retail locations' },
  { icon: MessageSquare, title: 'Community Chat', desc: 'Multi-channel group chat with anonymous mode & live updates' },
  { icon: Bell, title: 'Live Announcements', desc: 'Real-time updates, news & community announcements' },
  { icon: QrCode, title: 'QR-Based Ordering', desc: 'Customers scan a QR code to place orders — no app required' },
  { icon: Truck, title: 'Pickup & Delivery*', desc: 'Manage order types with time slots and collection numbers' },
];

export default function Index() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | '6months' | 'yearly'>('monthly');

  const getPrice = (monthlyPrice: number) => {
    if (billingCycle === '6months') {
      const discounted = +(monthlyPrice * 6 * 0.95).toFixed(2);
      return { price: discounted, perMonth: +(discounted / 6).toFixed(2), period: '/6 months', savings: 5 };
    }
    if (billingCycle === 'yearly') {
      const discounted = +(monthlyPrice * 12 * 0.90).toFixed(2);
      return { price: discounted, perMonth: +(discounted / 12).toFixed(2), period: '/year', savings: 10 };
    }
    return { price: monthlyPrice, perMonth: monthlyPrice, period: '/month', savings: 0 };
  };

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
        <section className="gradient-primary relative overflow-hidden">

          <div className="container mx-auto px-4 py-20 lg:py-32 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
              <motion.h1
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-5 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                Smart Stock Management for Modern Retail
              </motion.h1>
              <motion.p
                className="text-lg lg:text-xl text-primary-foreground/80 mb-3 max-w-xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
              >
                Scan barcodes, track inventory in real-time, generate PDF reports — all from your browser. No hardware needed.
              </motion.p>
              <motion.p
                className="text-base lg:text-lg text-primary-foreground/70 mb-10 max-w-2xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                QR-Based Customer Ordering • Order Management Dashboard • Pickup & Delivery* • Collection Number System
              </motion.p>
              <motion.div
                className="flex flex-col sm:flex-row gap-3 justify-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
              >
                <Button
                  size="lg"
                  className="h-14 px-8 text-base font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90 gap-2"
                  onClick={() => navigate('/register')}
                >
                  <UserPlus className="h-5 w-5" />
                  Register Your Store
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  className="h-14 px-8 text-base font-semibold bg-white/20 text-white border-2 border-white hover:bg-white hover:text-primary gap-2"
                  onClick={() => navigate('/login')}
                >
                  <Store className="h-5 w-5" />
                  Store Login
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground text-center mb-4">
              Everything You Need to Manage Inventory
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
              From barcode scanning to customer orders — all the tools your store needs in one place.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 max-w-6xl mx-auto">
              {features.map((f, i) => (
                  <motion.div
                    key={f.title}
                    className="glass-card p-5 text-center"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                  >
                    <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center mx-auto mb-3">
                      <f.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1.5 text-sm">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </motion.div>
              ))}
            </div>

            {/* Enterprise Feature Highlight */}
            <motion.div
              className="mt-16 max-w-5xl mx-auto"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/10 p-8 lg:p-12">
                <div className="flex flex-col lg:flex-row gap-8 items-center">
                  <div className="flex-1">
                    <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary mb-3 bg-primary/10 px-3 py-1 rounded-full">
                      Enterprise Feature
                    </span>
                    <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-3">
                      Make Your Store Live for Customers
                    </h3>
                    <p className="text-muted-foreground mb-4 leading-relaxed">
                      A fully customized platform tailored to your business needs. Get dedicated master admin controls to 
                      manage multiple store owners, configure permissions, and oversee your entire retail network from one place.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { icon: Settings2, text: 'Fully customized to your business workflow' },
                        { icon: Crown, text: 'Master admin control over multiple stores' },
                        { icon: Users, text: 'Manage store owners, roles & permissions' },
                        { icon: Globe, text: 'Your own branded e-commerce storefront' },
                        { icon: Shield, text: 'Centralized reporting & analytics' },
                        { icon: Bell, text: 'Priority support & dedicated onboarding' },
                      ].map((item) => (
                        <div key={item.text} className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <item.icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-sm text-foreground">{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-4 shrink-0">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">Customized</div>
                      <div className="text-sm text-muted-foreground">Tailored pricing</div>
                    </div>
                    <Button size="lg" className="gap-2 h-12 px-8 font-semibold" onClick={() => navigate('/register?plan=enterprise')} >
                      Contact Us
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">Includes all features + custom build</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 lg:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground text-center mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
              Choose the plan that fits your store.
            </p>

            {/* Billing cycle toggle */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 bg-muted rounded-xl p-1.5">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'monthly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('6months')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === '6months' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  6 Months
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billingCycle === 'yearly' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Yearly
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-stretch">
              {/* Starter */}
              <motion.div
                className="rounded-2xl border border-border bg-card p-8 flex flex-col"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0, duration: 0.4 }}
              >
                <div className="mb-6">
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Starter</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">${getPrice(29.99).price % 1 === 0 ? getPrice(29.99).price : getPrice(29.99).price.toFixed(2)}</span>
                    <span className="text-muted-foreground text-sm">{getPrice(29.99).period}</span>
                  </div>
                   {billingCycle !== 'monthly' && (
                     <p className="text-xs text-primary font-medium mt-1">
                       ${getPrice(29.99).perMonth}/mo — Save {getPrice(29.99).savings}%
                     </p>
                   )}
                   <p className="text-sm text-muted-foreground mt-2">Perfect to get started — 14-day free trial</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'Stock stacking & tracking',
                    'Product library access',
                    'Real-time inventory updates',
                    'Automated weekly PDF reports',
                    'Barcode scanning',
                    'Up to 500 SKUs',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full h-12 font-semibold" onClick={() => navigate('/register?plan=starter')}>
                  Start 14-Day Free Trial
                </Button>
              </motion.div>

              {/* $49.99/mo Popular */}
              <motion.div
                className="rounded-2xl border-2 border-primary bg-card p-8 flex flex-col relative shadow-lg"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                  POPULAR
                </div>
                <div className="mb-6">
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-2">Popular</span>
                   <div className="flex items-baseline gap-1">
                     <span className="text-4xl font-bold text-foreground">${getPrice(49.99).price % 1 === 0 ? getPrice(49.99).price : getPrice(49.99).price.toFixed(2)}</span>
                     <span className="text-muted-foreground text-sm">{getPrice(49.99).period}</span>
                   </div>
                   {billingCycle !== 'monthly' && (
                     <p className="text-xs text-primary font-medium mt-1">
                       ${getPrice(49.99).perMonth}/mo — Save {getPrice(49.99).savings}%
                     </p>
                   )}
                  <p className="text-sm text-muted-foreground mt-2">Essential features — 14-day free trial</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'All Starter features included',
                    'Up to 500 SKUs',
                    'Community group chat',
                    'Live updates & announcements',
                    'QR-based customer ordering',
                    '5 QR menu items',
                    'Order management dashboard',
                    'Pickup & delivery* options',
                    'Collection number system',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full h-12 font-semibold" onClick={() => navigate('/register?plan=popular')}>
                  Start 14-Day Free Trial
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">*Delivery availability depends on store settings</p>
              </motion.div>

              {/* $79.99/mo Business */}
              <motion.div
                className="rounded-2xl border border-border bg-card p-8 flex flex-col relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <div className="mb-6">
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Business</span>
                   <div className="flex items-baseline gap-1">
                     <span className="text-4xl font-bold text-foreground">${getPrice(79.99).price % 1 === 0 ? getPrice(79.99).price : getPrice(79.99).price.toFixed(2)}</span>
                     <span className="text-muted-foreground text-sm">{getPrice(79.99).period}</span>
                   </div>
                   {billingCycle !== 'monthly' && (
                     <p className="text-xs text-primary font-medium mt-1">
                       ${getPrice(79.99).perMonth}/mo — Save {getPrice(79.99).savings}%
                     </p>
                   )}
                  <p className="text-sm text-muted-foreground mt-2">Grow your business — 14-day free trial</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'All Popular features included',
                    'Up to 2,000 SKUs',
                    '20 QR menu items',
                    'Anonymous discussion mode',
                    'Multi-channel conversations',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full h-12 font-semibold" onClick={() => navigate('/register?plan=business')}>
                  Start 14-Day Free Trial
                </Button>
              </motion.div>

              {/* Enterprise */}
              <motion.div
                className="rounded-2xl border border-border bg-card p-8 flex flex-col"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div className="mb-6">
                  <span className="inline-block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Enterprise</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-foreground">Custom</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Fully customized for your business</p>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    'All Business features included',
                    'Unlimited SKUs',
                    'Master admin controls for multi-store',
                    'Manage store owners, roles & permissions',
                    'Fully customized to your workflow',
                    'Branded e-commerce storefront',
                    'Priority support & dedicated onboarding',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full h-12 font-semibold" onClick={() => navigate('/register?plan=enterprise')}>
                  Contact Us
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-secondary">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">Ready to Streamline Your Inventory?</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join stores already using CossInfo to track stock effortlessly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" className="gap-2 h-12" onClick={() => navigate('/register')}>
                <UserPlus className="h-5 w-5" />
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" className="gap-2 h-12" onClick={() => navigate('/login')}>
                <Store className="h-5 w-5" />
                Login
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 lg:py-24 bg-background">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-12">
              <HelpCircle className="h-8 w-8 text-primary mx-auto mb-3" />
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">Everything you need to know about CossInfo.</p>
            </div>
            <Accordion type="single" collapsible className="space-y-3">
               {[
                 { q: 'What is the Starter plan?', a: 'The Starter plan is $29.99/month and includes stock tracking, barcode scanning, product library access, real-time inventory, automated PDF reports, and up to 500 SKUs. All new stores get a 14-day free trial. Save 5% on 6-month and 10% on yearly advance payments.' },
                 { q: 'What is included in the Popular plan?', a: 'For $49.99/month, you get everything in the Starter plan plus community group chat, QR-based customer ordering with 5 menu items, order management dashboard, pickup & delivery* options, and the collection number system. Save 5% on 6-month and 10% on yearly advance payments.' },
                 { q: 'Is there a free trial?', a: 'Yes! All new stores get a 14-day free trial on all plans. After the trial, you\'ll need to subscribe to continue using the features.' },
                 { q: 'What does the Business plan offer?', a: 'For $79.99/month, you get everything in Popular plus 2,000 SKUs, 20 QR menu items, anonymous discussion mode, and multi-channel conversations. Save 5% on 6-month and 10% on yearly advance payments.' },
                 { q: 'What does the Enterprise plan offer?', a: 'The Enterprise plan is fully customized to your business. It includes unlimited SKUs, master admin controls to manage multiple store owners, configure permissions, and oversee your entire retail network — plus a branded e-commerce storefront and priority support.' },
                 { q: 'Can I upgrade or downgrade my plan?', a: 'Absolutely! You can upgrade or downgrade your plan at any time. Contact our support team and we\'ll adjust your subscription accordingly.' },
                 { q: 'How does email verification work?', a: 'We use a 6-digit OTP code sent to your registered email address for secure verification during registration and login. The code expires after 5 minutes with a maximum of 3 attempts.' },
                 { q: 'What does Delivery* mean?', a: 'Delivery availability depends on individual store settings and service area. Not all stores offer delivery — each store configures whether they support pickup only, delivery only, or both.' },
                 { q: 'Do I need any special hardware?', a: 'No special hardware needed! CossInfo works entirely in your web browser. Use your phone camera or laptop webcam for barcode scanning — no dedicated scanners required.' },
                 { q: 'Is my store data secure?', a: 'Yes. Each store\'s data is fully isolated with row-level security. Only authenticated store owners can access their own data, and all connections are encrypted.' },
               ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-5">
                  <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-border bg-card">
          <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="CossInfo" className="h-12" />
              <span className="text-sm text-muted-foreground">© {new Date().getFullYear()} CossInfo. All rights reserved.</span>
            </div>
            <a
              href="https://www.cossinfo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline font-medium"
            >
              www.cossinfo.com
            </a>
          </div>
        </footer>
      </main>
    </div>
  );
}
