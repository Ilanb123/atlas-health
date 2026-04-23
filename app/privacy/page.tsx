import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Atlas Health",
  description: "How Atlas Health collects, uses, and protects your health data.",
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        maxWidth: "760px",
        margin: "0 auto",
        padding: "48px 24px 96px",
        color: "#1a1a1a",
        lineHeight: "1.7",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          marginBottom: "8px",
          letterSpacing: "-0.02em",
        }}
      >
        Privacy Policy
      </h1>
      <p style={{ color: "#666", marginBottom: "48px", fontSize: "0.95rem" }}>
        Atlas Health &mdash; Last updated: April 22, 2026
      </p>

      <Section title="Overview">
        <p>
          Atlas Health (&ldquo;Atlas,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is an
          alpha-stage AI health service designed for finance professionals. This
          Privacy Policy explains how we collect, use, share, and protect
          information about you when you use our service. By using Atlas Health,
          you agree to the practices described in this policy.
        </p>
        <p>
          We are in active development. Features, integrations, and data
          practices may change as the product evolves. We will notify you of
          material changes.
        </p>
      </Section>

      <Section title="Information We Collect">
        <p>We collect two categories of information:</p>
        <Subsection title="Information you provide directly">
          <ul>
            <li>Name and email address when you register or join our waitlist</li>
            <li>Profile information (age, weight, fitness goals) you choose to share</li>
            <li>Communications you send us (support requests, feedback)</li>
          </ul>
        </Subsection>
        <Subsection title="Health and biometric data from connected devices">
          <p>
            With your explicit authorization, we access health data from the
            following sources:
          </p>
          <ul>
            <li>
              <strong>WHOOP</strong> — heart rate variability (HRV), sleep
              performance, recovery score, strain, respiratory rate, and workout
              data
            </li>
            <li>
              <strong>Oura Ring</strong> — sleep stages, readiness score,
              temperature deviation, activity, and SpO₂
            </li>
            <li>
              <strong>Apple Health</strong> — steps, active energy, resting
              heart rate, blood oxygen, mindful minutes, and other HealthKit
              metrics you permit
            </li>
          </ul>
          <p>
            Collectively this includes: sleep data, recovery metrics, workout
            logs, biomarkers, and activity history. We only access data you
            explicitly grant permission for through each platform&rsquo;s OAuth
            or authorization flow.
          </p>
        </Subsection>
        <Subsection title="Usage data">
          <ul>
            <li>Pages and features you interact with</li>
            <li>Device type, browser, and operating system</li>
            <li>IP address and approximate location (country/region level)</li>
            <li>Timestamps of actions within the app</li>
          </ul>
        </Subsection>
      </Section>

      <Section title="How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul>
          <li>
            Deliver personalized AI health insights, summaries, and coaching
            recommendations
          </li>
          <li>Sync and display your health data from connected devices</li>
          <li>Identify trends and anomalies across your sleep, recovery, and activity</li>
          <li>Send you health summaries, alerts, and product updates via email</li>
          <li>Improve and debug the Atlas Health service</li>
          <li>Respond to your support requests and communications</li>
          <li>Comply with legal obligations</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your health data to third parties. We
          do not use your health data for advertising targeting.
        </p>
      </Section>

      <Section title="Third-Party Services">
        <p>
          Atlas Health integrates with and relies on the following third-party
          services, each governed by their own privacy policies:
        </p>
        <ul>
          <li>
            <strong>WHOOP</strong> — data accessed via WHOOP Developer API under
            WHOOP&rsquo;s Terms of Service and Privacy Policy
          </li>
          <li>
            <strong>Oura</strong> — data accessed via Oura Cloud API under
            Oura&rsquo;s Privacy Policy
          </li>
          <li>
            <strong>Apple HealthKit</strong> — data accessed with your
            permission via Apple&rsquo;s HealthKit framework; Apple&rsquo;s
            guidelines prohibit us from using HealthKit data for advertising or
            selling it to data brokers
          </li>
          <li>
            <strong>Anthropic / Claude AI</strong> — we use Claude to generate
            health summaries and insights; health data sent to this API is
            subject to Anthropic&rsquo;s usage policies and is not used to train
            their models under standard API terms
          </li>
          <li>
            <strong>Vercel</strong> — cloud hosting and infrastructure provider
          </li>
        </ul>
        <p>
          We share only the minimum data necessary with each service to provide
          the requested functionality.
        </p>
      </Section>

      <Section title="Data Storage and Security">
        <p>
          Your data is stored on servers located in the United States. We
          implement the following security practices:
        </p>
        <ul>
          <li>Encryption in transit (TLS 1.2+) for all data transfers</li>
          <li>Encryption at rest for stored health data</li>
          <li>OAuth 2.0 token-based authentication for all device integrations</li>
          <li>Access controls limiting who on our team can view raw health data</li>
          <li>Regular review of security practices as the product matures</li>
        </ul>
        <p>
          As an alpha-stage product, our security infrastructure is actively
          being developed. We will harden these systems before any broad public
          release. No system is perfectly secure; if you believe your data has
          been compromised, contact us immediately at{" "}
          <a href="mailto:bibliowiczilan@gmail.com">bibliowiczilan@gmail.com</a>.
        </p>
      </Section>

      <Section title="Data Retention">
        <p>
          We retain your account information and health data for as long as your
          account is active or as needed to provide the service. If you request
          account deletion, we will delete your personal data within 30 days,
          except where retention is required by law or for legitimate business
          purposes (such as fraud prevention).
        </p>
        <p>
          Aggregated, de-identified analytics data may be retained indefinitely
          as it cannot reasonably be linked to an individual.
        </p>
      </Section>

      <Section title="Your Rights and Choices">
        <p>You have the following rights regarding your data:</p>
        <ul>
          <li>
            <strong>Access</strong> — request a copy of the personal data we
            hold about you
          </li>
          <li>
            <strong>Correction</strong> — request correction of inaccurate data
          </li>
          <li>
            <strong>Deletion</strong> — request deletion of your account and
            associated data
          </li>
          <li>
            <strong>Revoke integrations</strong> — disconnect WHOOP, Oura, or
            Apple Health at any time; we will stop syncing data from that source
            immediately
          </li>
          <li>
            <strong>Data portability</strong> — request an export of your data
            in a machine-readable format
          </li>
          <li>
            <strong>Opt out of communications</strong> — unsubscribe from
            non-essential emails at any time
          </li>
        </ul>
        <p>
          To exercise any of these rights, email{" "}
          <a href="mailto:bibliowiczilan@gmail.com">bibliowiczilan@gmail.com</a>.
          We will respond within 30 days.
        </p>
      </Section>

      <Section title="Children&rsquo;s Privacy">
        <p>
          Atlas Health is not directed to children under the age of 13, and we
          do not knowingly collect personal information from children under 13.
          If you believe we have inadvertently collected data from a child under
          13, please contact us immediately and we will delete that information.
        </p>
      </Section>

      <Section title="Not Medical Advice">
        <p
          style={{
            background: "#fef9ec",
            border: "1px solid #f0d060",
            borderRadius: "8px",
            padding: "16px 20px",
          }}
        >
          <strong>Important:</strong> Atlas Health is not a medical service.
          The information, insights, summaries, and recommendations generated by
          Atlas Health are for informational and wellness purposes only. Nothing
          in our service constitutes medical advice, diagnosis, or treatment.
          Always seek the advice of a qualified healthcare professional with any
          questions you may have regarding a medical condition. Never disregard
          professional medical advice or delay seeking it because of something
          you read in Atlas Health.
        </p>
      </Section>

      <Section title="Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. When we make
          material changes, we will notify you by email (at the address
          associated with your account) and/or by posting a prominent notice in
          the app at least 14 days before the changes take effect.
        </p>
        <p>
          Your continued use of Atlas Health after any changes constitutes
          acceptance of the updated policy. If you do not agree to a change,
          you may delete your account before the effective date.
        </p>
      </Section>

      <Section title="Contact Us">
        <p>
          If you have questions, concerns, or requests related to this Privacy
          Policy or your data, please contact:
        </p>
        <p>
          <strong>Atlas Health</strong>
          <br />
          Email:{" "}
          <a href="mailto:bibliowiczilan@gmail.com" style={{ color: "#0066cc" }}>
            bibliowiczilan@gmail.com
          </a>
        </p>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "40px" }}>
      <h2
        style={{
          fontSize: "1.2rem",
          fontWeight: 600,
          marginBottom: "12px",
          paddingBottom: "8px",
          borderBottom: "1px solid #e5e5e5",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: "0.975rem",
          color: "#333",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Subsection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3
        style={{
          fontSize: "0.95rem",
          fontWeight: 600,
          marginBottom: "6px",
          color: "#111",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
