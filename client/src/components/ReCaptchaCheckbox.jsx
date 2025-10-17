import { useEffect, useRef } from "react";

export default function ReCaptchaCheckbox({ onChange }) {
  const slotRef = useRef(null);

  useEffect(() => {
    let poll = setInterval(() => {
      if (window.grecaptcha && slotRef.current) {
        clearInterval(poll);
        window.grecaptcha.render(slotRef.current, {
          sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
          theme: "light",
          callback: (token) => onChange(token || ""),
          "expired-callback": () => onChange(""),
        });
      }
    }, 120);

    return () => clearInterval(poll);
  }, [onChange]);

  return <div ref={slotRef} />;
}
