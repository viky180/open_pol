import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Open Politics",
  description: "How Open Politics collects, uses, and protects account, profile, and participation data.",
};

export default function PrivacyPage() {
  return (
    <section className="editorial-page editorial-page--narrow py-10 sm:py-14">
      <div className="card">
        <p className="text-[11px] uppercase tracking-[0.22em] text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
          Legal
        </p>
        <h1 className="mt-3 text-3xl text-text-primary sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-text-secondary">
          Open Politics is designed to help people organize around local public issues. This page explains what data we
          collect, why we collect it, and how people can control their information.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-text-secondary">
          <section>
            <h2 className="text-lg text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
              What we collect
            </h2>
            <p className="mt-2">
              We may collect account details such as your email address, profile name, language preference, pincode,
              membership activity, and the groups, alliances, or actions you choose to participate in.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
              How we use it
            </h2>
            <p className="mt-2">
              We use this information to run the platform, show relevant local groups, support representation features,
              secure accounts, and improve product quality and reliability.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
              Sharing and visibility
            </h2>
            <p className="mt-2">
              Some participation data may be visible inside the product where transparency is part of the feature. We
              do not sell personal information for advertising purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
              Your controls
            </h2>
            <p className="mt-2">
              You can update profile details, leave groups, and contact us to ask about account or data handling
              questions. For privacy-related requests, email admin@openpolitics.in.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
              Contact
            </h2>
            <p className="mt-2">
              For questions about this policy or data handling, contact{" "}
              <a href="mailto:admin@openpolitics.in" className="text-text-primary underline decoration-border-secondary underline-offset-4">
                admin@openpolitics.in
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
