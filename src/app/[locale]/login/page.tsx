"use client";

import React, { useState } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  loginAction,
  verifyOtpAction,
  enrollOtpAction,
  requestPasswordResetAction,
  resetPasswordWithCodeAction,
  changePasswordAction,
  firstLoginChangePasswordAction,
} from "@/server/actions/auth";
import Image from "next/image";

type LoginStep =
  | "CREDENTIALS"
  | "OTP"
  | "OTP_ENROLL"
  | "BACKUP_CODES_DISPLAY"
  | "FORGOT_PASSWORD_REQUEST"
  | "FORGOT_PASSWORD_VERIFY"
  | "MUST_CHANGE_PASSWORD";

export default function LoginPage() {
  const locale = useLocale();
  const router = useRouter();

  // Primary credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);

  // Flow State
  const [step, setStep] = useState<LoginStep>("CREDENTIALS");
  const [tempToken, setTempToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // OTP State
  const [otpCode, setOtpCode] = useState("");
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [enrollData, setEnrollData] = useState<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  } | null>(null);
  const [enrollVerifyCode, setEnrollVerifyCode] = useState("");

  // Password Reset State
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Must Change Password State
  const [forceNewPassword, setForceNewPassword] = useState("");
  const [forceConfirmPassword, setForceConfirmPassword] = useState("");

  const isAr = locale === "ar";

  // 1. Handle Primary Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await loginAction({
        email,
        password,
        trustDevice: rememberDevice,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "حدث خطأ أثناء تسجيل الدخول." : "Login failed."));
        return;
      }

      if (res.data.status === "AUTHENTICATED") {
        router.push("/");
        router.refresh();
      } else if (res.data.status === "REQUIRES_OTP") {
        setTempToken(res.data.tempToken!);
        setStep("OTP");
      } else if (res.data.status === "REQUIRES_OTP_ENROLLMENT") {
        setTempToken(res.data.tempToken!);
        setEnrollData({
          secret: res.data.secret!,
          qrCodeUrl: res.data.qrCode!,
          backupCodes: [],
        });
        setStep("OTP_ENROLL");
      } else if (res.data.status === "MUST_CHANGE_PASSWORD") {
        setTempToken(res.data.tempToken!);
        setStep("MUST_CHANGE_PASSWORD");
      }
    } catch {
      setError(isAr ? "فشل الاتصال بالخادم." : "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle OTP Verification Submit
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await verifyOtpAction({
        tempToken,
        code: otpCode,
        isBackupCode,
        trustDevice: rememberDevice,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "رمز التحقق غير صحيح." : "Invalid verification code."));
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError(isAr ? "فشل التحقق." : "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle OTP Enrollment Submit
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await enrollOtpAction({
        tempToken,
        code: enrollVerifyCode,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "رمز التحقق غير صحيح." : "Invalid verification code."));
        return;
      }

      setEnrollData((prev) => ({
        secret: prev?.secret || "",
        qrCodeUrl: prev?.qrCodeUrl || "",
        backupCodes: res.data.backupCodes,
      }));
      setStep("BACKUP_CODES_DISPLAY");
    } catch {
      setError(isAr ? "فشل تفعيل التحقق الثنائي." : "Failed to activate 2FA.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Forgot Password Request (triggers email code / dev terminal print)
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await requestPasswordResetAction({ email: resetEmail });
      if (!res.success) {
        setError(res.error?.message || (isAr ? "حدث خطأ." : "Error occurred."));
        return;
      }

      setSuccessMessage(
        isAr
          ? "إذا كان البريد مسجلاً، تم إرسال رمز التحقق (مطبوع في الطرفية أثناء التطوير المحلي)."
          : "If the email is registered, a 6-digit code was sent (printed to local terminal in dev)."
      );
      setStep("FORGOT_PASSWORD_VERIFY");
    } catch {
      setError(isAr ? "فشل الطلب." : "Request failed.");
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Forgot Password Reset with Code
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(isAr ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError(isAr ? "يجب ألا تقل كلمة المرور عن 8 أحرف." : "Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await resetPasswordWithCodeAction({
        email: resetEmail,
        code: resetCode,
        newPassword,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل تغيير كلمة المرور." : "Failed to reset password."));
        return;
      }

      setSuccessMessage(
        isAr
          ? "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن بكلمة المرور الجديدة."
          : "Password changed successfully. You can now log in with your new password."
      );
      setEmail(resetEmail);
      setPassword("");
      setStep("CREDENTIALS");
    } catch {
      setError(isAr ? "فشل تغيير كلمة المرور." : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  };

  // 6. Handle Force Must Change Password
  const handleForcePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (forceNewPassword !== forceConfirmPassword) {
      setError(isAr ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.");
      return;
    }

    if (forceNewPassword.length < 8) {
      setError(isAr ? "يجب ألا تقل كلمة المرور عن 8 أحرف." : "Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await firstLoginChangePasswordAction({
        tempToken,
        newPassword: forceNewPassword,
      });

      if (!res.success) {
        setError(res.error?.message || (isAr ? "فشل تغيير كلمة المرور." : "Failed to update password."));
        return;
      }

      if (res.data.status === "REQUIRES_OTP_ENROLLMENT") {
        setEnrollData({
          secret: res.data.secret!,
          qrCodeUrl: res.data.qrCode!,
          backupCodes: [],
        });
        setStep("OTP_ENROLL");
      } else {
        setStep("OTP");
      }
    } catch {
      setError(isAr ? "فشل تغيير كلمة المرور." : "Password change failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
        {/* Header Banner */}
        <div className="p-6 bg-linear-to-b from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0E6251] text-white flex items-center justify-center font-bold text-xl mx-auto shadow-md mb-3">
            م
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {isAr ? "نظام مسار للعيادات" : "Masaar Clinic System"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAr
              ? "العلاج الطبيعي والتغذية العلاجية"
              : "Physiotherapy & Clinical Nutrition"}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {/* Notification Alerts */}
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <span className="font-bold">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
              <span className="font-bold">✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* STEP 1: Main Login Form */}
          {step === "CREDENTIALS" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "البريد الإلكتروني" : "Email Address"}
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  dir="ltr"
                  placeholder="user@masaar.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isAr ? "كلمة المرور" : "Password"}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setStep("FORGOT_PASSWORD_REQUEST");
                      setError(null);
                    }}
                    className="text-[11px] text-[#0E6251] dark:text-[#48C9B0] hover:underline"
                  >
                    {isAr ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              {/* Trusted Device 30 Days Checkbox (R-15.2-4) */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberDevice"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0E6251] focus:ring-[#0E6251] border-slate-300 dark:border-slate-700"
                />
                <label
                  htmlFor="rememberDevice"
                  className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer"
                >
                  {isAr
                    ? "الوثوق بهذا الجهاز لمدة 30 يوماً (تخطي التحقق الثنائي)"
                    : "Trust this device for 30 days (skip 2FA)"}
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 rounded-md bg-[#0E6251] text-white font-semibold text-sm hover:bg-[#117A65] focus:outline-none focus:ring-2 focus:ring-[#0E6251] transition-colors disabled:opacity-50"
              >
                {loading
                  ? isAr
                    ? "جارٍ التحقق..."
                    : "Verifying..."
                  : isAr
                  ? "تسجيل الدخول"
                  : "Sign In"}
              </button>
            </form>
          )}

          {/* STEP 2: TOTP Verification Form (R-15.2-1, R-15.2-2) */}
          {step === "OTP" && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAr ? "التحقق بخطوتين (2FA)" : "Two-Factor Authentication"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isBackupCode
                    ? isAr
                      ? "أدخل أحد رموز النسخ الاحتياطي (مكوّن من 8 خانات)"
                      : "Enter one of your 8-character backup codes"
                    : isAr
                    ? "أدخل الرمز المكون من 6 أرقام من تطبيق Authenticator"
                    : "Enter the 6-digit code from your Authenticator app"}
                </p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  dir="ltr"
                  maxLength={isBackupCode ? 10 : 6}
                  placeholder={isBackupCode ? "ABC1-2345" : "000000"}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.trim())}
                  className="w-full px-3 py-2.5 text-center text-lg tracking-widest font-mono rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsBackupCode(!isBackupCode);
                    setOtpCode("");
                    setError(null);
                  }}
                  className="text-[#0E6251] dark:text-[#48C9B0] hover:underline"
                >
                  {isBackupCode
                    ? isAr
                      ? "الرجوع لتطبيق Authenticator"
                      : "Switch back to Authenticator"
                    : isAr
                    ? "استخدام رمز نسخ احتياطي؟"
                    : "Use a backup code?"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep("CREDENTIALS");
                    setError(null);
                  }}
                  className="text-slate-500 hover:underline"
                >
                  {isAr ? "إلغاء والعودة" : "Back to Login"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-md bg-[#0E6251] text-white font-semibold text-sm hover:bg-[#117A65] focus:outline-none focus:ring-2 focus:ring-[#0E6251] transition-colors disabled:opacity-50"
              >
                {loading
                  ? isAr
                    ? "جارٍ التحقق..."
                    : "Verifying..."
                  : isAr
                  ? "تأكيد ومتابعة"
                  : "Verify & Continue"}
              </button>
            </form>
          )}

          {/* STEP 3: OTP Enrollment (QR Code Setup) (R-15.2-3) */}
          {step === "OTP_ENROLL" && enrollData && (
            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAr ? "إعداد التحقق الثنائي" : "Setup Two-Factor Authentication"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isAr
                    ? "امسح رمز الاستجابة السريعة (QR) باستخدام Google Authenticator أو 1Password"
                    : "Scan the QR code with Google Authenticator, 1Password, or compatible app"}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={enrollData.qrCodeUrl}
                  alt="2FA QR Code"
                  className="w-44 h-44 object-contain"
                />
                <div className="mt-2 text-center">
                  <span className="text-[10px] text-slate-400 block mb-0.5">
                    {isAr ? "أو أدخل المفتاح يدوياً:" : "Or enter key manually:"}
                  </span>
                  <code className="text-xs font-mono font-bold select-all bg-slate-100 px-2 py-0.5 rounded text-slate-800">
                    {enrollData.secret}
                  </code>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "أدخل الرمز المكون من 6 أرقام لتأكيد الربط" : "Enter the 6-digit code to confirm"}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  dir="ltr"
                  maxLength={6}
                  placeholder="000000"
                  value={enrollVerifyCode}
                  onChange={(e) => setEnrollVerifyCode(e.target.value.trim())}
                  className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-md bg-[#0E6251] text-white font-semibold text-sm hover:bg-[#117A65] focus:outline-none focus:ring-2 focus:ring-[#0E6251] transition-colors disabled:opacity-50"
              >
                {loading
                  ? isAr
                    ? "جارٍ الحفظ..."
                    : "Saving..."
                  : isAr
                  ? "تفعيل التحقق الثنائي"
                  : "Activate 2FA"}
              </button>
            </form>
          )}

          {/* STEP 4: Backup Codes Display (R-15.2-2) */}
          {step === "BACKUP_CODES_DISPLAY" && enrollData && (
            <div className="space-y-4">
              <div className="text-center mb-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm mx-auto mb-2">
                  ✓
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAr ? "رموز النسخ الاحتياطي (10 رموز)" : "Backup Codes (10 single-use)"}
                </h2>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {isAr
                    ? "احفظ هذه الرموز في مكان آمن. يُستخدم كل رمز مرة واحدة فقط في حال فقدان جهازك."
                    : "Save these codes securely. Each code can be used once if you lose access to your authenticator."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-center">
                {enrollData.backupCodes.map((c, i) => (
                  <span key={i} className="py-1 px-1.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 select-all font-semibold">
                    {c}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  router.push("/");
                  router.refresh();
                }}
                className="w-full py-2.5 px-4 rounded-md bg-[#0E6251] text-white font-semibold text-sm hover:bg-[#117A65] transition-colors"
              >
                {isAr ? "تم حفظ الرموز، متابعة إلى لوحة التحكم" : "I have saved the codes, continue to App"}
              </button>
            </div>
          )}

          {/* STEP 5: Forgot Password Request (R-15.3-1, R-15.3-2) */}
          {step === "FORGOT_PASSWORD_REQUEST" && (
            <form onSubmit={handleForgotRequest} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAr ? "استعادة كلمة المرور" : "Reset Password"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isAr
                    ? "أدخل بريدك الإلكتروني لإرسال رمز إعادة التعيين (مطبوع في الطرفية أثناء التطوير)."
                    : "Enter your registered email to receive a 6-digit reset code."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "البريد الإلكتروني" : "Email Address"}
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  dir="ltr"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setStep("CREDENTIALS");
                    setError(null);
                  }}
                  className="text-xs text-slate-500 hover:underline"
                >
                  {isAr ? "الرجوع لتسجيل الدخول" : "Back to Sign In"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-md bg-[#0E6251] text-white font-semibold text-sm hover:bg-[#117A65] transition-colors disabled:opacity-50"
              >
                {loading
                  ? isAr
                    ? "جارٍ الإرسال..."
                    : "Sending..."
                  : isAr
                  ? "إرسال رمز التحقق"
                  : "Send Reset Code"}
              </button>
            </form>
          )}

          {/* STEP 6: Forgot Password Verify & New Password (R-15.3-1) */}
          {step === "FORGOT_PASSWORD_VERIFY" && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAr ? "تعيين كلمة المرور الجديدة" : "Set New Password"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isAr
                    ? "أدخل الرمز المكون من 6 أرقام مع كلمة المرور الجديدة"
                    : "Enter the 6-digit code and choose a new password"}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "رمز التحقق (6 أرقام)" : "Reset Code (6 digits)"}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  dir="ltr"
                  maxLength={6}
                  placeholder="000000"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.trim())}
                  className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "كلمة المرور الجديدة (8 أحرف فأكثر)" : "New Password (min 8 chars)"}
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setStep("CREDENTIALS");
                    setError(null);
                  }}
                  className="text-xs text-slate-500 hover:underline"
                >
                  {isAr ? "إلغاء والعودة" : "Cancel"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-md bg-[#0E6251] text-white font-semibold text-sm hover:bg-[#117A65] transition-colors disabled:opacity-50"
              >
                {loading
                  ? isAr
                    ? "جارٍ الحفظ..."
                    : "Saving..."
                  : isAr
                  ? "تأكيد تغيير كلمة المرور"
                  : "Confirm Password Reset"}
              </button>
            </form>
          )}

          {/* STEP 7: Must Change Password (R-3-4) */}
          {step === "MUST_CHANGE_PASSWORD" && (
            <form onSubmit={handleForcePasswordSubmit} className="space-y-4">
              <div className="text-center mb-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {isAr ? "تغيير كلمة المرور المؤقتة" : "Change Temporary Password"}
                </h2>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {isAr
                    ? "هذا أول تسجيل دخول لك أو تم إعادة تعيين حسابك. يجب اختيار كلمة مرور جديدة لمتابعة العمل."
                    : "First login or reset detected. You must set a permanent password to continue."}
                </p>
              </div>


              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "كلمة المرور الجديدة (8 أحرف فأكثر)" : "New Password (min 8 chars)"}
                </label>
                <input
                  type="password"
                  required
                  value={forceNewPassword}
                  onChange={(e) => setForceNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {isAr ? "تأكيد كلمة المرور الجديدة" : "Confirm New Password"}
                </label>
                <input
                  type="password"
                  required
                  value={forceConfirmPassword}
                  onChange={(e) => setForceConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E6251]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-md bg-[#0E6251] text-white font-semibold text-sm hover:bg-[#117A65] transition-colors disabled:opacity-50"
              >
                {loading
                  ? isAr
                    ? "جارٍ الحفظ..."
                    : "Saving..."
                  : isAr
                  ? "حفظ كلمة المرور والدخول"
                  : "Save Password & Enter"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
