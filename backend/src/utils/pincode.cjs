// Resolves an Indian pincode to its post office / area, district and state
// using the free public India Post API. Results are cached in-memory since
// pincode-to-area mappings essentially never change.

const POSTAL_API = "https://api.postalpincode.in/pincode/";
const cache = new Map();

async function resolvePincode(pincode) {
    if (cache.has(pincode)) return cache.get(pincode);

    try {
        const response = await fetch(`${POSTAL_API}${pincode}`);
        if (!response.ok) throw new Error(`Postal API responded ${response.status}`);

        const data = await response.json();
        const record = Array.isArray(data) ? data[0] : null;
        const offices = record?.Status === "Success" ? record.PostOffice : null;

        if (!offices || offices.length === 0) {
            cache.set(pincode, null);
            return null;
        }

        const resolved = {
            pincode,
            area: offices[0].Name,
            areas: [...new Set(offices.map(o => o.Name).filter(Boolean))],
            district: offices[0].District,
            state: offices[0].State,
        };

        cache.set(pincode, resolved);
        return resolved;
    } catch (err) {
        console.error("Pincode Resolve Error:", err.message);
        return null;
    }
}

const PINCODE_RE = /^\d{6}$/;
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Builds a Mongo $or clause matching: exact pincode, same first-3-digit
// postal prefix (same sorting district — a good proxy for "same part of the
// city"), or a text match on the resolved area/district name.
function buildProximityOr(pincode, resolved) {
    const prefix = pincode.slice(0, 3);
    const orConditions = [
        { pincode },
        { pincode: new RegExp(`^${prefix}`) },
    ];
    const areaTerms = resolved ? [resolved.district, ...resolved.areas].filter(Boolean) : [];
    areaTerms.forEach(term => {
        orConditions.push({ location: new RegExp(escapeRegex(term), "i") });
    });
    return orConditions;
}

// Ranks an exact pincode match first, then same-prefix matches, then
// anything only matched via the resolved area/district name.
function rankByProximity(items, pincode) {
    const prefix = pincode.slice(0, 3);
    const rank = (item) => {
        if (item.pincode === pincode) return 0;
        if (item.pincode && item.pincode.startsWith(prefix)) return 1;
        return 2;
    };
    return [...items].sort((a, b) => rank(a) - rank(b));
}

module.exports = { resolvePincode, PINCODE_RE, buildProximityOr, rankByProximity };
