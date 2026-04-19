import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermsAndConditionsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export function TermsAndConditions({ open, onOpenChange, onAccept, showAcceptButton = false }: TermsAndConditionsProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Terms and Conditions</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
            <p className="text-foreground font-semibold">Last updated: March 2026</p>
            <p>These Terms and Conditions ("Terms") govern your use of the CossInfo platform ("the Service") operated by CossInfo Pty Ltd, registered in Victoria, Australia. By accessing or using the Service, you agree to be bound by these Terms.</p>

            <h3 className="text-foreground font-semibold text-base">1. Acceptance of Terms</h3>
            <p>By registering for and using the Service, you acknowledge that you have read, understood, and agree to these Terms. If you do not agree, you must immediately cease using the Service. These Terms constitute a legally binding agreement between you ("the User") and CossInfo Pty Ltd.</p>

            <h3 className="text-foreground font-semibold text-base">2. Account Registration & Security</h3>
            <p>You must provide accurate, complete, and current information during registration, including your store name, owner/manager name, valid Australian contact number, email address, and business address. You are solely responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying CossInfo immediately of any unauthorized use of your account</li>
              <li>Ensuring that your Store ID is kept secure and not shared with unauthorized parties</li>
            </ul>
            <p>CossInfo reserves the right to suspend or terminate accounts that contain false or misleading information.</p>

            <h3 className="text-foreground font-semibold text-base">3. Use of Service</h3>
            <p>The Service is provided for legitimate business purposes related to store inventory management, stock ordering, customer engagement, and QR-based ordering. You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use the Service for any unlawful, fraudulent, or unauthorized purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service, other accounts, or systems</li>
              <li>Interfere with, disrupt, or overburden the Service or its infrastructure</li>
              <li>Upload malicious content, viruses, or harmful code</li>
              <li>Share your account credentials with unauthorized parties</li>
              <li>Use the Service to transmit spam, unsolicited messages, or harmful content</li>
              <li>Reverse-engineer, decompile, or disassemble any part of the Service</li>
            </ul>

            <h3 className="text-foreground font-semibold text-base">4. Subscription Plans & Payments</h3>
            <p>The Service offers multiple subscription tiers (Starter, Popular, Enterprise). By selecting a paid plan, you agree to pay the applicable fees as displayed at the time of purchase. Key payment terms:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Payments are processed via PayPal and are subject to PayPal's terms of service</li>
              <li>Subscription fees are billed on a recurring monthly basis</li>
              <li>CossInfo reserves the right to modify pricing with at least 30 days prior written notice</li>
              <li>Failure to pay may result in suspension or downgrade of your subscription</li>
              <li>All prices are in Australian Dollars (AUD) unless otherwise stated</li>
            </ul>

            <h3 className="text-foreground font-semibold text-base">5. Refund & Cancellation Policy</h3>
            <p>You may cancel your subscription at any time. The following refund terms apply:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Cancellation:</strong> You may cancel your subscription at any time. Access to paid features will continue until the end of your current billing period</li>
              <li><strong>Refunds:</strong> Refunds may be issued at CossInfo's discretion within 14 days of a charge, provided the Service has not been substantially used during that period</li>
              <li><strong>Downgrades:</strong> When downgrading to a lower plan, the change takes effect at the start of the next billing cycle</li>
              <li><strong>No refunds</strong> will be issued for partial months, unused features, or account suspensions due to Terms violations</li>
            </ul>
            <p>To request a cancellation or refund, contact CossInfo support through the in-app feedback form.</p>

            <h3 className="text-foreground font-semibold text-base">6. Data Collection, Privacy & Retention</h3>
            <p>CossInfo collects and processes the following data to provide and improve the Service:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data:</strong> Store name, owner name, email, contact number, address</li>
              <li><strong>Business data:</strong> Product inventory, stock entries, order history, customer orders</li>
              <li><strong>Customer data:</strong> Names, emails, phone numbers, and order details of your store's customers</li>
              <li><strong>Usage data:</strong> Login activity, feature usage, and session information</li>
            </ul>
            <p><strong>Data Retention:</strong> Your data is retained for the duration of your active subscription and for a period of 90 days following account deletion, after which it is permanently erased. Order data retention may be configured in your account settings (default: 1 month).</p>
            <p><strong>Data Deletion:</strong> You may request full deletion of your account and all associated data by contacting CossInfo support. Deletion requests are processed within 30 business days. Certain data may be retained if required by Australian law.</p>
            <p>Your data will not be sold, leased, or shared with third parties for marketing purposes. Data is stored securely using industry-standard encryption and access controls.</p>

            <h3 className="text-foreground font-semibold text-base">7. SMS, Notifications & Communication Consent</h3>
            <p>By using the Service, you consent to the following communications:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>SMS notifications:</strong> Order status updates, collection numbers, and approval/rejection notices may be sent to customers via SMS on your behalf</li>
              <li><strong>Push notifications:</strong> Real-time alerts for new customer orders, order updates, and system notifications</li>
              <li><strong>Email communications:</strong> Account-related emails including registration confirmation, password resets, and service announcements</li>
            </ul>
            <p>You are responsible for obtaining appropriate consent from your customers before their contact details are used for SMS or notification purposes. Standard carrier messaging rates may apply for SMS recipients. You may manage notification preferences in your account settings.</p>

            <h3 className="text-foreground font-semibold text-base">8. Third-Party Services & Integrations</h3>
            <p>The Service integrates with and relies upon the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>PayPal:</strong> For processing subscription payments and customer transactions. Use of PayPal is subject to <a href="https://www.paypal.com/au/legalhub/useragreement-full" target="_blank" rel="noopener noreferrer" className="text-primary underline">PayPal's User Agreement</a></li>
              <li><strong>Cloud infrastructure:</strong> For data hosting, authentication, and storage services</li>
              <li><strong>Analytics services:</strong> For platform performance monitoring and improvement</li>
            </ul>
            <p>CossInfo is not responsible for the availability, security, or practices of third-party services. Your use of integrated services is subject to their respective terms and policies.</p>

            <h3 className="text-foreground font-semibold text-base">9. Intellectual Property</h3>
            <p>All content, features, functionality, design, trademarks, and branding of the Service are owned by CossInfo Pty Ltd and are protected by Australian and international copyright, trademark, and other intellectual property laws. You may not reproduce, distribute, or create derivative works without prior written consent.</p>
            <p>You retain ownership of the data you input into the Service. By using the Service, you grant CossInfo a limited license to process your data solely for the purpose of providing the Service.</p>

            <h3 className="text-foreground font-semibold text-base">10. Service Availability & Modifications</h3>
            <p>CossInfo strives to maintain continuous availability but does not guarantee uninterrupted or error-free access. We reserve the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Perform scheduled and emergency maintenance that may temporarily affect availability</li>
              <li>Modify, update, or discontinue features with reasonable notice</li>
              <li>Impose usage limits as necessary to maintain service quality</li>
            </ul>

            <h3 className="text-foreground font-semibold text-base">11. Limitation of Liability</h3>
            <p>To the maximum extent permitted by Australian Consumer Law:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Service is provided "as is" and "as available" without warranties of any kind, express or implied</li>
              <li>CossInfo's total liability for any claim arising from these Terms shall not exceed the total fees paid by you in the 12 months preceding the claim</li>
              <li>CossInfo shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities</li>
              <li>CossInfo is not liable for any losses resulting from third-party service outages, unauthorized account access due to your negligence, or force majeure events</li>
            </ul>
            <p>Nothing in these Terms excludes or limits liability that cannot be excluded under Australian Consumer Law, including guarantees relating to the quality and fitness of services.</p>

            <h3 className="text-foreground font-semibold text-base">12. Disclaimer of Liability for User Conduct</h3>
            <p>CossInfo Pty Ltd and its developers, officers, employees, and affiliates shall not be held responsible or liable for any unethical, illegal, or unauthorized use of the Service by any user. Users bear full and sole responsibility for how they use the platform, the data they input, and any consequences arising from misuse, including but not limited to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Using the Service to facilitate fraudulent, deceptive, or unlawful activities</li>
              <li>Uploading, distributing, or storing content that violates any applicable law or regulation</li>
              <li>Any harm, loss, or damage caused to third parties as a result of the user's actions on the platform</li>
            </ul>
            <p>By using the Service, you acknowledge and agree that CossInfo provides the platform as a tool and is not responsible for verifying or monitoring the legality or ethics of your use.</p>

            <h3 className="text-foreground font-semibold text-base">13. Government Action & Takedown Disclaimer</h3>
            <p>In the event that any government authority, regulatory body, or law enforcement agency takes action against the Service, requests a takedown, or imposes restrictions:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>CossInfo Pty Ltd (the software/development company) shall not be held liable or responsible for any resulting loss, disruption, or damages to users</li>
              <li>The store owner/user assumes full responsibility for ensuring their use of the platform complies with all applicable local, state, federal, and international laws and regulations</li>
              <li>CossInfo reserves the right to comply with any lawful government request, including suspending or terminating services, without prior notice to affected users</li>
            </ul>
            <p>Users acknowledge that CossInfo operates as a technology service provider and does not endorse, verify, or assume responsibility for the regulatory compliance of any individual store or business using the platform.</p>

            <h3 className="text-foreground font-semibold text-base">14. Indemnification</h3>
            <p>You agree to indemnify, defend, and hold harmless CossInfo Pty Ltd, its directors, officers, employees, and agents from and against any claims, liabilities, damages, losses, or expenses arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.</p>

            <h3 className="text-foreground font-semibold text-base">15. Termination</h3>
            <p>CossInfo reserves the right to suspend or terminate your account if you:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Violate any provision of these Terms</li>
              <li>Engage in fraudulent, abusive, or illegal activity</li>
              <li>Fail to pay subscription fees when due</li>
              <li>Remain inactive for an extended period (12 months or more)</li>
            </ul>
            <p>Upon termination, your right to use the Service ceases immediately. Data will be retained for 90 days post-termination before permanent deletion, unless otherwise required by law.</p>

            <h3 className="text-foreground font-semibold text-base">16. Governing Law & Dispute Resolution</h3>
            <p>These Terms are governed by and construed in accordance with the laws of the State of Victoria, Australia. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts of Victoria, Australia.</p>
            <p>Before initiating legal proceedings, both parties agree to attempt to resolve disputes through good-faith negotiation for a minimum period of 30 days.</p>

            <h3 className="text-foreground font-semibold text-base">17. Changes to Terms</h3>
            <p>CossInfo may update these Terms from time to time. Material changes will be communicated via email or in-app notification at least 14 days prior to taking effect. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms. If you do not agree to the updated Terms, you must stop using the Service.</p>

            <h3 className="text-foreground font-semibold text-base">18. Contact</h3>
            <p>For questions, concerns, or requests regarding these Terms, please contact us:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Through the in-app feedback form</li>
              <li>Company: CossInfo Pty Ltd</li>
              <li>Jurisdiction: Victoria, Australia</li>
            </ul>
          </div>
        </ScrollArea>
        <DialogFooter>
          {showAcceptButton ? (
            <Button onClick={onAccept} className="w-full">I Accept the Terms and Conditions</Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
