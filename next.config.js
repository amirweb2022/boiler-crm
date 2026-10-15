/** @type {import('next').NextConfig} */
const securityHeaders = [
  // جلوگیری از embed شدن سایت در iframe سایت‌های دیگر (Clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // جلوگیری از حدس نوع فایل توسط مرورگر (MIME sniffing)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // کنترل ارسال Referrer به دامنه‌های دیگر
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // اجبار HTTPS برای ۲ سال + زیردامنه‌ها (فقط در production معنا دارد)
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // غیرفعال کردن API های حساس مرورگر که این اپ به آن‌ها نیازی ندارد
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Content-Security-Policy پایه — فقط منابع همین دامنه مجازند
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/reports/download": ["./data/گزارش تست مهر ماه1404.xlsx"],
    },
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/api/certificates/certificates/:file",
        headers: securityHeaders.map((header) => {
          if (header.key === "X-Frame-Options") return { ...header, value: "SAMEORIGIN" };
          if (header.key === "Content-Security-Policy") return { ...header, value: header.value.replace("frame-ancestors 'none'", "frame-ancestors 'self'") };
          if (header.key === "Referrer-Policy") return { ...header, value: "no-referrer" };
          return header;
        }),
      },
    ];
  },
};

module.exports = nextConfig;
