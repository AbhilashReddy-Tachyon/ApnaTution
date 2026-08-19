// Thin wrapper around MSG91's v5 OTP API (https://control.msg91.com/api/v5/otp).
// MSG91 generates and tracks the OTP itself against a template created in their
// dashboard — this module just calls send/verify and reports success/failure.

const hasMsg91Config = () => !!(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID);

// MSG91 expects the number with country code, no leading zero/plus (e.g. 91XXXXXXXXXX)
const normalizeMobile = (phone) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `91${digits}`;
    return digits;
};

const sendOtp = async (phone) => {
    const mobile = normalizeMobile(phone);
    const params = new URLSearchParams({
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile
    });

    const response = await fetch(`https://control.msg91.com/api/v5/otp?${params.toString()}`, {
        method: "POST",
        headers: {
            authkey: process.env.MSG91_AUTH_KEY,
            "Content-Type": "application/json"
        }
    });
    const data = await response.json();
    if (data.type !== "success") {
        throw new Error(data.message || "Failed to send OTP via MSG91");
    }
};

const verifyOtp = async (phone, otp) => {
    const mobile = normalizeMobile(phone);
    const params = new URLSearchParams({ otp, mobile });

    const response = await fetch(`https://control.msg91.com/api/v5/otp/verify?${params.toString()}`, {
        method: "POST",
        headers: { authkey: process.env.MSG91_AUTH_KEY }
    });
    const data = await response.json();
    return data.type === "success";
};

module.exports = { hasMsg91Config, normalizeMobile, sendOtp, verifyOtp };
