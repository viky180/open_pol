"use client";

export function HowItsDifferent() {
    const features = [
        { label: 'Create a group', whatsapp: true, telegram: true, reddit: true, op: true },
        { label: 'Join a bigger movement', whatsapp: false, telegram: false, reddit: false, op: true },
        { label: 'Go independent any time', whatsapp: false, telegram: false, reddit: false, op: true },
        { label: 'Switch teams whenever you want', whatsapp: false, telegram: false, reddit: false, op: true },
        { label: "Keep your group's identity", whatsapp: false, telegram: false, reddit: false, op: true },
        { label: 'Support the bigger cause without losing yourselves', whatsapp: false, telegram: false, reddit: false, op: true },
        { label: 'Choose who speaks for you', whatsapp: false, telegram: false, reddit: false, op: true },
        { label: 'Push your priorities to the bigger group', whatsapp: false, telegram: false, reddit: false, op: true },
        { label: "See your group's impact", whatsapp: false, telegram: false, reddit: false, op: true },
    ];

    return (
        <section className="py-16 border-t border-border-primary">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="text-center mb-10">
                    <p className="brand-kicker">Why This Is Different</p>
                    <h2
                        className="mt-4 text-2xl sm:text-3xl font-bold text-text-primary"
                        style={{ fontFamily: 'var(--font-display)' }}
                    >
                        Static groups vs groups that actually work together
                    </h2>
                    <p className="text-text-secondary mt-2 max-w-2xl mx-auto">
                        Most platforms keep groups stuck in place. Open Politics lets every group
                        create, coordinate, push for what they need, and walk away when not served.
                    </p>
                </div>

                <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-center text-text-secondary">1. Create</div>
                    <div className="rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-center text-text-secondary">2. Coordinate</div>
                    <div className="rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-center text-text-secondary">3. Negotiate</div>
                    <div className="rounded-lg border border-border-primary bg-bg-secondary px-3 py-2 text-center text-text-secondary">4. Walk Away or Stay</div>
                </div>

                <div className="brand-panel overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border-primary">
                                <th className="text-left py-3 px-4 text-text-muted font-medium">Feature</th>
                                <th className="py-3 px-3 text-center text-text-muted font-medium">WhatsApp</th>
                                <th className="py-3 px-3 text-center text-text-muted font-medium">Telegram</th>
                                <th className="py-3 px-3 text-center text-text-muted font-medium">Reddit</th>
                                <th className="py-3 px-3 text-center font-semibold text-primary">Open Politics</th>
                            </tr>
                        </thead>
                        <tbody>
                            {features.map((f) => (
                                <tr key={f.label} className="border-b border-border-primary/50 last:border-0">
                                    <td className="py-3 px-4 text-text-primary font-medium">{f.label}</td>
                                    <td className="py-3 px-3 text-center">{f.whatsapp ? 'Yes' : <span className="text-text-muted">No</span>}</td>
                                    <td className="py-3 px-3 text-center">{f.telegram ? 'Yes' : <span className="text-text-muted">No</span>}</td>
                                    <td className="py-3 px-3 text-center">{f.reddit ? 'Yes' : <span className="text-text-muted">No</span>}</td>
                                    <td className="py-3 px-3 text-center text-primary font-semibold">Yes</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
