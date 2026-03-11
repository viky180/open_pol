'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from './AuthContext';
import { useLocation } from './LocationContext';
import { INDIA_STATES_AND_UTS } from '@/lib/indiaLocations';
import { OnboardingStepIndicator } from './OnboardingStepIndicator';

type Step = 'gps' | 'state' | 'area_type' | 'urban' | 'rural';
const OPEN_LOCATION_MODAL_EVENT = 'open-location-modal';
const LOCATION_UPDATED_EVENT = 'location-updated';

interface GpsResult {
    label: string;
    state: string | null;
    district: string | null;
    city: string | null;
    village: string | null;
    lat: number;
    lng: number;
}

const FIELD_CLASS =
    'w-full rounded-xl border border-border-primary bg-bg-secondary px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all';

const SELECT_CLASS =
    'w-full rounded-xl border border-border-primary bg-bg-secondary px-4 py-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none';

export function LocationModal() {
    const pathname = usePathname();
    const { user } = useAuth();
    const { locationComplete, locationLoading, setLocationComplete, setUserLocation, userLocation } = useLocation();

    const [visible, setVisible] = useState(false);
    const [forceOpen, setForceOpen] = useState(false);
    const [step, setStep] = useState<Step>('gps');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // GPS state
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsResult, setGpsResult] = useState<GpsResult | null>(null);
    const [gpsError, setGpsError] = useState<string | null>(null);
    const [gpsAutofilled, setGpsAutofilled] = useState(false);

    // Form fields
    const [state, setState] = useState('');
    const [areaType, setAreaType] = useState<'urban' | 'rural' | ''>('');
    // Urban
    const [city, setCity] = useState('');
    const [corporation, setCorporation] = useState('');
    const [ward, setWard] = useState('');
    const [locality, setLocality] = useState('');
    // Rural
    const [district, setDistrict] = useState('');
    const [block, setBlock] = useState('');
    const [panchayat, setPanchayat] = useState('');
    const [village, setVillage] = useState('');

    const pickAddressValue = useCallback((addr: Record<string, unknown>, keys: string[]) => {
        for (const key of keys) {
            const value = addr[key];
            if (typeof value === 'string' && value.trim().length > 0) {
                return value.trim();
            }
        }
        return '';
    }, []);

    const inferAreaTypeFromAddress = useCallback((addr: Record<string, unknown>): 'urban' | 'rural' | null => {
        const hasUrbanSignal = Boolean(
            pickAddressValue(addr, ['city', 'town', 'municipality', 'city_district', 'ward']) ||
            pickAddressValue(addr, ['neighbourhood', 'suburb', 'residential'])
        );
        const hasRuralSignal = Boolean(
            pickAddressValue(addr, ['village', 'hamlet', 'village_panchayat', 'panchayat'])
        );

        if (hasUrbanSignal && !hasRuralSignal) return 'urban';
        if (hasRuralSignal && !hasUrbanSignal) return 'rural';
        if (hasUrbanSignal) return 'urban';
        if (hasRuralSignal) return 'rural';
        return null;
    }, [pickAddressValue]);

    const openForEdit = useCallback(() => {
        if (!user) return;
        try {
            sessionStorage.removeItem('location_skipped');
        } catch {
            // Ignore storage issues
        }

        setGpsLoading(false);
        setGpsError(null);
        setSaveError(null);
        setGpsAutofilled(false);
        setGpsResult(null);
        setState(userLocation?.state || '');
        setAreaType((userLocation?.area_type as 'urban' | 'rural' | '') || '');
        setCity(userLocation?.city || '');
        setCorporation(userLocation?.corporation || '');
        setWard(userLocation?.ward || '');
        setLocality(userLocation?.locality || '');
        setDistrict(userLocation?.district || '');
        setBlock(userLocation?.block || '');
        setPanchayat(userLocation?.panchayat || '');
        setVillage(userLocation?.village || '');
        if (userLocation?.lat != null && userLocation?.lng != null) {
            setGpsResult({
                label: userLocation.gps_label || 'Your location',
                state: userLocation.state || null,
                district: userLocation.district || null,
                city: userLocation.city || null,
                village: userLocation.village || null,
                lat: userLocation.lat,
                lng: userLocation.lng,
            });
        }
        setStep('gps');
        setVisible(true);
        setForceOpen(true);
    }, [user, userLocation]);

    // Show modal when user is logged in but location is incomplete
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onOpenLocationModal = () => openForEdit();
        window.addEventListener(OPEN_LOCATION_MODAL_EVENT, onOpenLocationModal);
        return () => window.removeEventListener(OPEN_LOCATION_MODAL_EVENT, onOpenLocationModal);
    }, [openForEdit]);

    useEffect(() => {
        if (locationLoading) return;
        if (forceOpen) {
            setVisible(true);
            return;
        }
        if (pathname?.startsWith('/welcome')) {
            setVisible(false);
            return;
        }
        if (!user) { setVisible(false); return; }
        if (locationComplete) { setVisible(false); return; }

        // Check if user explicitly skipped this session
        const skipped = sessionStorage.getItem('location_skipped');
        if (skipped === 'true') { setVisible(false); return; }

        setVisible(true);
    }, [forceOpen, user, locationComplete, locationLoading, pathname]);

    // Auto-attempt GPS on mount
    const attemptGps = useCallback(() => {
        if (!navigator.geolocation) {
            setGpsError('GPS not available on this device.');
            return;
        }
        setGpsLoading(true);
        setGpsError(null);

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
                        { headers: { 'Accept-Language': 'en' } }
                    );
                    const data = await res.json();
                    const addr = (data.address || {}) as Record<string, unknown>;
                    const parts = [
                        pickAddressValue(addr, ['neighbourhood', 'suburb', 'village', 'hamlet', 'locality', 'residential']),
                        pickAddressValue(addr, ['city_district', 'district', 'town', 'city', 'municipality', 'county']),
                    ].filter(Boolean);
                    const label = parts.join(', ') || data.display_name?.split(',')[0] || 'Your location';
                    const gpsDistrict = pickAddressValue(addr, ['district', 'state_district', 'city_district', 'county']);
                    const gpsCity = pickAddressValue(addr, ['city', 'town', 'city_district', 'municipality']);
                    const gpsVillagePrimary = pickAddressValue(addr, ['village', 'hamlet', 'isolated_dwelling', 'locality']);
                    const gpsVillageFallback = gpsCity ? '' : pickAddressValue(addr, ['suburb']);
                    const gpsVillage = gpsVillagePrimary || gpsVillageFallback;
                    const gpsCorporation = pickAddressValue(addr, ['municipality', 'city_district']);
                    const gpsWard = pickAddressValue(addr, ['ward']);
                    const gpsLocality = pickAddressValue(addr, ['neighbourhood', 'suburb', 'residential', 'quarter', 'locality']);
                    const gpsBlock = pickAddressValue(addr, ['subdistrict', 'taluk', 'tehsil', 'block']);
                    const gpsPanchayat = pickAddressValue(addr, ['village_panchayat', 'panchayat']);
                    const inferredAreaType = inferAreaTypeFromAddress(addr);

                    // Map Nominatim state to our list
                    const nominatimState = pickAddressValue(addr, ['state']);
                    const matchedState = INDIA_STATES_AND_UTS.find(
                        (s) => s.toLowerCase() === nominatimState.toLowerCase()
                    ) || nominatimState;

                    setGpsResult({
                        label,
                        state: matchedState || null,
                        district: gpsDistrict || null,
                        city: gpsCity || null,
                        village: gpsVillage || null,
                        lat: latitude,
                        lng: longitude,
                    });
                    if (matchedState) setState(matchedState);
                    setDistrict((prev) => prev || gpsDistrict);
                    setCity((prev) => prev || gpsCity);
                    setVillage((prev) => prev || gpsVillage);
                    setCorporation((prev) => prev || gpsCorporation);
                    setWard((prev) => prev || gpsWard);
                    setLocality((prev) => prev || gpsLocality);
                    setBlock((prev) => prev || gpsBlock);
                    setPanchayat((prev) => prev || gpsPanchayat);
                    setAreaType((prev) => prev || inferredAreaType || '');
                    setGpsAutofilled(true);
                } catch {
                    setGpsError('Could not identify location from GPS. Please set manually.');
                } finally {
                    setGpsLoading(false);
                }
            },
            () => {
                setGpsError('GPS access denied. Please set your location manually.');
                setGpsLoading(false);
            },
            { timeout: 10000 }
        );
    }, [pickAddressValue, inferAreaTypeFromAddress]);

    useEffect(() => {
        if (visible && step === 'gps') {
            attemptGps();
        }
    }, [visible, step, attemptGps]);

    useEffect(() => {
        if (!visible) return;
        if (step !== 'gps') return;
        if (!gpsAutofilled) return;
        if (gpsLoading) return;

        if (state) {
            if (areaType === 'urban' || areaType === 'rural') {
                setStep(areaType);
            } else {
                setStep('area_type');
            }
            setGpsAutofilled(false);
        }
    }, [visible, step, gpsAutofilled, gpsLoading, state, areaType]);

    const handleSkip = () => {
        sessionStorage.setItem('location_skipped', 'true');
        setForceOpen(false);
        setVisible(false);
    };

    const handleSave = async () => {
        setSaving(true);
        setSaveError(null);

        const payload: Record<string, unknown> = {
            country: 'India',
            state,
            area_type: areaType || undefined,
            lat: gpsResult?.lat ?? undefined,
            lng: gpsResult?.lng ?? undefined,
            gps_label: gpsResult?.label ?? undefined,
        };

        if (gpsResult?.district) {
            payload.district = district || gpsResult.district;
        }
        if (gpsResult?.village) {
            payload.village = village || gpsResult.village;
        }

        if (areaType === 'urban') {
            payload.city = city || null;
            payload.corporation = corporation || null;
            payload.ward = ward || null;
            payload.locality = locality || null;
            payload.block = null;
            payload.panchayat = null;
            payload.village = null;
        } else if (areaType === 'rural') {
            payload.district = district || gpsResult?.district || null;
            payload.block = block || null;
            payload.panchayat = panchayat || null;
            payload.village = village || gpsResult?.village || null;
            payload.city = null;
            payload.corporation = null;
            payload.ward = null;
            payload.locality = null;
        }

        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                setSaveError(data.error || 'Failed to save. Please try again.');
                return;
            }
            // Update context
            setUserLocation({
                country: 'India',
                state: state || null,
                area_type: areaType || null,
                city: areaType === 'urban' ? (city || null) : null,
                corporation: areaType === 'urban' ? (corporation || null) : null,
                ward: areaType === 'urban' ? (ward || null) : null,
                locality: areaType === 'urban' ? (locality || null) : null,
                district: district || null,
                block: areaType === 'rural' ? (block || null) : null,
                panchayat: areaType === 'rural' ? (panchayat || null) : null,
                village: areaType === 'rural' ? (village || null) : null,
                lat: gpsResult?.lat ?? null,
                lng: gpsResult?.lng ?? null,
                gps_label: gpsResult?.label ?? null,
            });
            setLocationComplete(true);
            setForceOpen(false);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event(LOCATION_UPDATED_EVENT));
            }
        } catch {
            setSaveError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!visible) return null;

    const progressSteps: Step[] = ['gps', 'state', 'area_type', areaType === 'urban' ? 'urban' : 'rural'];
    const currentIdx = progressSteps.indexOf(step);
    const locationStepLabels: Record<Step, string> = {
        gps: 'Detect',
        state: 'State',
        area_type: 'Area type',
        urban: 'Urban details',
        rural: 'Rural details',
    };
    const locationProgressSteps = progressSteps.map((progressStep, index) => ({
        id: progressStep,
        label: locationStepLabels[progressStep],
        status: index === currentIdx
            ? 'current' as const
            : index < currentIdx
                ? 'completed' as const
                : 'upcoming' as const,
    }));

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="loc-modal-title"
                className="fixed inset-0 z-[61] flex items-end sm:items-center justify-center p-0 sm:p-4"
            >
                <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
                    {/* Handle bar (mobile) */}
                    <div className="flex justify-center pt-3 pb-1 sm:hidden">
                        <div className="w-10 h-1 rounded-full bg-border-primary" />
                    </div>

                    {/* Header */}
                    <div className="px-6 pt-4 pb-3 border-b border-border-primary">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-0.5">
                                    📍 Set Your Location
                                </p>
                                <h2 id="loc-modal-title" className="text-lg font-bold text-text-primary" style={{ fontFamily: 'var(--font-display)' }}>
                                    Where are you located?
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="text-xs text-text-muted hover:text-text-secondary transition-colors ml-4 shrink-0"
                                aria-label="Skip for now"
                            >
                                Skip
                            </button>
                        </div>

                        <OnboardingStepIndicator
                            className="mt-3"
                            title="Location setup"
                            metaLabel={`Step ${currentIdx + 1} of ${locationProgressSteps.length}`}
                            steps={locationProgressSteps}
                        />
                    </div>

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                        {/* ── STEP: GPS ── */}
                        {step === 'gps' && (
                            <div className="space-y-4">
                                <p className="text-sm text-text-secondary">
                                    We use your location to show you relevant local groups and issues.
                                </p>

                                {/* GPS banner */}
                                {gpsLoading && (
                                    <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                                        <span className="text-lg animate-pulse">📡</span>
                                        <p className="text-sm text-primary font-medium">Detecting your location…</p>
                                    </div>
                                )}

                                {gpsResult && !gpsLoading && (
                                    <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                                        <span className="text-lg mt-0.5">✅</span>
                                        <div>
                                            <p className="text-sm font-semibold text-green-800">Detected location</p>
                                            <p className="text-sm text-green-700 mt-0.5">{gpsResult.label}</p>
                                            {gpsResult.state && (
                                                <p className="text-xs text-green-600 mt-1">State: {gpsResult.state}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {gpsError && !gpsLoading && (
                                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                                        <span className="text-lg mt-0.5">⚠️</span>
                                        <p className="text-sm text-amber-800">{gpsError}</p>
                                    </div>
                                )}

                                {!gpsLoading && !gpsResult && !gpsError && (
                                    <button
                                        type="button"
                                        onClick={attemptGps}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-border-primary bg-bg-secondary px-4 py-3 text-sm font-medium text-text-primary transition-all hover:bg-bg-hover"
                                    >
                                        <span>📡</span> Detect my location
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ── STEP: STATE ── */}
                        {step === 'state' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                                        Country
                                    </label>
                                    <div className="flex items-center gap-2 rounded-xl border border-border-primary bg-bg-tertiary px-4 py-3">
                                        <span className="text-base">🇮🇳</span>
                                        <span className="text-sm font-medium text-text-primary">India</span>
                                        <span className="ml-auto text-xs text-text-muted">Default</span>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="loc-state" className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                                        State / Union Territory <span className="text-danger">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="loc-state"
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            className={SELECT_CLASS}
                                        >
                                            <option value="">Select state…</option>
                                            {INDIA_STATES_AND_UTS.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                                            ▾
                                        </div>
                                    </div>
                                    {gpsResult?.state && state !== gpsResult.state && (
                                        <button
                                            type="button"
                                            onClick={() => setState(gpsResult.state!)}
                                            className="mt-1.5 text-xs text-primary hover:underline"
                                        >
                                            Use GPS suggestion: {gpsResult.state}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── STEP: AREA TYPE ── */}
                        {step === 'area_type' && (
                            <div className="space-y-3">
                                <p className="text-sm text-text-secondary">
                                    Are you in an urban or rural area? This helps us show the right administrative levels.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setAreaType('urban')}
                                    className={`w-full flex items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all ${areaType === 'urban'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border-primary bg-bg-secondary hover:border-primary/40'
                                        }`}
                                >
                                    <span className="text-2xl">🏙️</span>
                                    <div>
                                        <p className="font-semibold text-text-primary text-sm">Urban</p>
                                        <p className="text-xs text-text-muted mt-0.5">City, Town, Municipal Corporation</p>
                                    </div>
                                    {areaType === 'urban' && (
                                        <span className="ml-auto text-primary text-lg">✓</span>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAreaType('rural')}
                                    className={`w-full flex items-center gap-4 rounded-xl border-2 px-5 py-4 text-left transition-all ${areaType === 'rural'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border-primary bg-bg-secondary hover:border-primary/40'
                                        }`}
                                >
                                    <span className="text-2xl">🌾</span>
                                    <div>
                                        <p className="font-semibold text-text-primary text-sm">Rural</p>
                                        <p className="text-xs text-text-muted mt-0.5">Village, Gram Panchayat, Block</p>
                                    </div>
                                    {areaType === 'rural' && (
                                        <span className="ml-auto text-primary text-lg">✓</span>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* ── STEP: URBAN ── */}
                        {step === 'urban' && (
                            <div className="space-y-4">
                                <p className="text-sm text-text-secondary">
                                    Fill in as many levels as you know. These help match you to the right local groups.
                                </p>

                                {[
                                    { id: 'loc-city', label: 'City / Town', placeholder: 'e.g. Bengaluru', value: city, onChange: setCity, required: true },
                                    { id: 'loc-corp', label: 'Corporation / Municipal Body', placeholder: 'e.g. BBMP', value: corporation, onChange: setCorporation },
                                    { id: 'loc-ward', label: 'Ward', placeholder: 'e.g. Whitefield Ward', value: ward, onChange: setWard },
                                    { id: 'loc-locality', label: 'Locality / Area', placeholder: 'e.g. Kadugodi (optional)', value: locality, onChange: setLocality },
                                ].map(({ id, label, placeholder, value, onChange, required }) => (
                                    <div key={id}>
                                        <label htmlFor={id} className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                                            {label} {required && <span className="text-danger">*</span>}
                                        </label>
                                        <input
                                            id={id}
                                            type="text"
                                            placeholder={placeholder}
                                            value={value}
                                            onChange={(e) => onChange(e.target.value)}
                                            className={FIELD_CLASS}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── STEP: RURAL ── */}
                        {step === 'rural' && (
                            <div className="space-y-4">
                                <p className="text-sm text-text-secondary">
                                    Fill in as many levels as you know. These help match you to the right local groups.
                                </p>

                                {[
                                    { id: 'loc-district', label: 'District', placeholder: 'e.g. Bengaluru Rural', value: district, onChange: setDistrict, required: true },
                                    { id: 'loc-block', label: 'Block / Taluk', placeholder: 'e.g. Hoskote', value: block, onChange: setBlock },
                                    { id: 'loc-panchayat', label: 'Gram Panchayat', placeholder: 'e.g. Jadigenahalli GP', value: panchayat, onChange: setPanchayat },
                                    { id: 'loc-village', label: 'Village', placeholder: 'e.g. Jadigenahalli (optional)', value: village, onChange: setVillage },
                                ].map(({ id, label, placeholder, value, onChange, required }) => (
                                    <div key={id}>
                                        <label htmlFor={id} className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                                            {label} {required && <span className="text-danger">*</span>}
                                        </label>
                                        <input
                                            id={id}
                                            type="text"
                                            placeholder={placeholder}
                                            value={value}
                                            onChange={(e) => onChange(e.target.value)}
                                            className={FIELD_CLASS}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Save error */}
                        {saveError && (
                            <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger text-sm">
                                {saveError}
                            </div>
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="px-6 py-4 border-t border-border-primary bg-white flex items-center justify-between gap-3">
                        {/* Back */}
                        {step !== 'gps' ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (step === 'state') setStep('gps');
                                    else if (step === 'area_type') setStep('state');
                                    else if (step === 'urban' || step === 'rural') setStep('area_type');
                                }}
                                className="px-4 py-2.5 rounded-xl border border-border-primary text-sm font-medium text-text-secondary hover:bg-bg-hover transition-colors"
                            >
                                ← Back
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="px-4 py-2.5 rounded-xl border border-border-primary text-sm font-medium text-text-muted hover:bg-bg-hover transition-colors"
                            >
                                Skip for now
                            </button>
                        )}

                        {/* Next / Save */}
                        {step === 'gps' && (
                            <button
                                type="button"
                                onClick={() => setStep('state')}
                                disabled={gpsLoading}
                                className="flex-1 sm:flex-none sm:min-w-[140px] rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 disabled:opacity-50"
                            >
                                {gpsLoading ? 'Detecting…' : 'Continue →'}
                            </button>
                        )}

                        {step === 'state' && (
                            <button
                                type="button"
                                onClick={() => setStep('area_type')}
                                disabled={!state}
                                className="flex-1 sm:flex-none sm:min-w-[140px] rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue →
                            </button>
                        )}

                        {step === 'area_type' && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (areaType === 'urban') setStep('urban');
                                    else if (areaType === 'rural') setStep('rural');
                                }}
                                disabled={!areaType}
                                className="flex-1 sm:flex-none sm:min-w-[140px] rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continue →
                            </button>
                        )}

                        {(step === 'urban' || step === 'rural') && (
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={
                                    saving ||
                                    (step === 'urban' && !city) ||
                                    (step === 'rural' && !district)
                                }
                                className="flex-1 sm:flex-none sm:min-w-[140px] rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Saving…' : '✓ Save Location'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
