import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use | Open Politics",
  description: "Terms that govern access to Open Politics and participation on the platform.",
};

export default function TermsPage() {
  return (
    <section className="editorial-page editorial-page--narrow py-10 sm:py-14">
      <div className="card">
        <p className="text-[11px] uppercase tracking-[0.22em] text-text-muted" style={{ fontFamily: "var(--font-mono)" }}>
          Legal
        </p>
        <h1 className="mt-3 text-3xl text-text-primary sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          Terms of Use
        </h1>
        <p className="mt-4 text-sm text-text-secondary">
          These terms govern access to Open Politics and set the baseline rules for participating on the platform.
        </p>

        <div className="mt-8 space-y-8 text-sm leading-7 text-text-secondary">
          <section>
            <h2 className="text-lg text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
              Responsible use
            </h2>
            <p className="mt-2">
              You agree to use the platform lawfully and not to harass others, impersonate people, abuse platform
              features, or interfere with the normal operation of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
              User content and actions
            </h2>
            <p className="mt-2">
              You remain responsible for the accuracy and legality of the information, posts, campaigns, and group
              activity you create or support through the platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
              Platform changes
            </h2>
            <p className="mt-2">
              We may update, suspend, or improve features as the product evolves. Continued use after changes means you
              accept the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
              Accounts and access
            </h2>
            <p className="mt-2">
              We may restrict or remove access to accounts that violate these terms, create security risks, or abuse
              civic participation features.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
              Contact
            </h2>
            <p className="mt-2">
              Questions about these terms can be sent to{" "}
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
