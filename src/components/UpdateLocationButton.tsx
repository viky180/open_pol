'use client';

const OPEN_LOCATION_MODAL_EVENT = 'open-location-modal';

export function UpdateLocationButton() {
    const handleClick = () => {
        if (typeof window === 'undefined') return;
        window.dispatchEvent(new Event(OPEN_LOCATION_MODAL_EVENT));
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="text-xs text-primary hover:text-primary/80 font-medium"
        >
            Update location
        </button>
    );
}
