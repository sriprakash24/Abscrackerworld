import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import {
  customerSchema,
  customerDefaultValues,
} from "../../schemas/customerSchema";
import { useCustomerGateStore } from "../../store/useCustomerGateStore";
import { useCustomerStore } from "../../store/useCustomerStore";
import { db } from "../../firebase/config";
import { saveUserProfile } from "../../services/usersFirestore";
import FormField from "../checkout/FormField";
import elephantStageBg from "../../assets/backgrounds/popup-diwali-stage-bg.png";
import absLogo from "../../assets/abs-logo.png";

/**
 * Centered "who's shopping?" gate — fired once, on the very first Add to
 * Cart tap (see useCustomerGateStore). No password, no OTP — just enough
 * to attach a name + mobile number to this visitor's cart/order activity.
 * Closing it cancels the pending add; submitting saves locally + to
 * Firestore, then lets the original Add to Cart action continue.
 *
 * Visual treatment mirrors the festive Diwali storefront: the same
 * elephant/fireworks hero photo used in the header sits behind the card
 * as a dimmed backdrop, with bilingual (English + Tamil) copy throughout.
 */
export default function CustomerDetailsSheet() {
  const isOpen = useCustomerGateStore((s) => s.isOpen);
  const cancel = useCustomerGateStore((s) => s.cancel);
  const resolve = useCustomerGateStore((s) => s.resolve);
  const setCustomer = useCustomerStore((s) => s.setCustomer);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: customerDefaultValues,
  });

  const handleClose = () => {
    if (submitting) return;
    reset(customerDefaultValues);
    cancel();
  };

  const onSubmit = async (values) => {
    const customer = { name: values.name.trim(), mobile: values.mobile.trim() };
    setSubmitting(true);
    try {
      await saveUserProfile(db, customer);
    } catch {
      // Non-blocking — the local flow still continues even if the write fails.
      toast("Saved locally — will sync once you're back online");
    } finally {
      setSubmitting(false);
    }
    setCustomer(customer);
    reset(customerDefaultValues);
    resolve(customer);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop: a simple dim scrim — the artwork itself now lives directly on
              the card below, since "contain"-fitting it full-screen made it shrink
              to near-invisibility on tall phone aspect ratios. */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 90% at 50% 40%, rgba(20,4,5,0.7) 0%, rgba(10,2,3,0.88) 60%, rgba(6,1,1,0.95) 100%)",
            }}
          />

          {/* Card — the twin-elephant Diwali stage art sits directly behind the form,
              cropped to cover (never shrinks away like the old full-screen version),
              with a translucent crimson wash on top so the text stays readable while
              the lights, mandala and elephants underneath still show through. */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="relative z-10 w-full max-w-[380px] rounded-[24px] border border-[rgba(255,193,84,0.38)] px-6 pb-7 pt-7"
            style={{
              boxShadow:
                "0 0 0 1px rgba(255,193,84,0.08) inset, 0 1px 0 rgba(255,210,150,0.15) inset, 0 24px 60px -16px rgba(0,0,0,0.85), 0 0 46px rgba(216,28,43,0.22)",
            }}
          >
            {/* Clipped background layer: the artwork + crimson wash, kept separate from
                the card so corner-radius clipping doesn't also cut off the diya accent
                that sits below the card's bottom edge. */}
            <div
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[24px]"
              style={{
                backgroundImage: `linear-gradient(165deg, rgba(48,10,13,0.86) 0%, rgba(26,5,7,0.9) 55%, rgba(14,2,3,0.95) 100%), url(${elephantStageBg})`,
                backgroundSize: "cover, cover",
                backgroundPosition: "center, center",
                backgroundRepeat: "no-repeat, no-repeat",
              }}
            />

            {/* corner flourishes */}
            <span className="pointer-events-none absolute left-3 top-3 z-10 h-4 w-4 rounded-tl-lg border-l border-t border-gold/40" />
            <span className="pointer-events-none absolute right-3 top-3 z-10 h-4 w-4 rounded-tr-lg border-r border-t border-gold/40" />
            <span className="pointer-events-none absolute bottom-3 left-3 z-10 h-4 w-4 rounded-bl-lg border-b border-l border-gold/40" />
            <span className="pointer-events-none absolute bottom-3 right-3 z-10 h-4 w-4 rounded-br-lg border-b border-r border-gold/40" />

            <button
              onClick={handleClose}
              aria-label="Close"
              className="orb-3d absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-white/70"
            >
              <X size={14} />
            </button>

            <img
              src={absLogo}
              alt="ABS Crackers World"
              className="relative z-10 mx-auto h-14 w-auto object-contain"
            />

            <div className="relative z-10 mt-4 text-center">
              <h2 className="text-[17px] font-extrabold text-embossed text-[#f6efe4]">
                Just one quick step
              </h2>
              <p className="mx-auto mt-1.5 max-w-[280px] text-[11px] font-medium leading-snug text-muted">
                Tell us who's shopping so we can keep your cart and order
                updates ready for you.
              </p>

              <div className="mx-auto my-4 flex w-full items-center gap-2 opacity-60">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/50" />
                <span className="h-1 w-1 rounded-full bg-gold" />
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/50" />
              </div>

              <p className="text-[15px] font-bold text-gold">
                ஒரே ஒரு சிறிய படி!
              </p>
              <p className="mx-auto mt-1 max-w-[280px] text-[10.5px] font-medium leading-snug text-muted">
                உங்கள் கார்ட் மற்றும் ஆர்டர் அப்டேட்களை உடனுக்குடன் பெற, யார்
                ஷாப்பிங் செய்கிறீர்கள் என்று பதிவு செய்யுங்கள்.
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="relative z-10 mt-5 flex flex-col gap-3.5"
            >
              <FormField
                label="Your Name / உங்கள் பெயர்"
                required
                registration={register("name")}
                error={errors.name}
                placeholder="e.g. Arun Kumar"
                autoComplete="name"
              />

              <label className="block">
                <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#cfc7bd]">
                  Mobile Number / மொபைல் எண்
                  <span className="text-orange">*</span>
                </span>
                <div
                  className={`flex items-center overflow-hidden rounded-xl border bg-[#0c0906] transition-all duration-200 ${
                    errors.mobile
                      ? "border-[#e35226] shadow-[0_0_0_3px_rgba(227,82,38,0.15)]"
                      : "border-white/10 focus-within:border-orange/70 focus-within:shadow-[0_0_0_3px_rgba(255,122,0,0.14)]"
                  }`}
                >
                  <span className="flex items-center gap-1 border-r border-white/10 px-3 py-2.5 text-[12.5px] font-bold text-[#f2ece2]">
                    <span aria-hidden>🇮🇳</span>+91
                  </span>
                  <input
                    {...register("mobile")}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    maxLength={10}
                    autoComplete="tel"
                    className="w-full bg-transparent px-3.5 py-2.5 text-[12.5px] font-semibold text-[#f2ece2] outline-none placeholder:text-muted placeholder:font-normal"
                  />
                </div>
                <AnimatePresence>
                  {errors.mobile && (
                    <motion.p
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: "auto", marginTop: 5 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="text-[10.5px] font-semibold text-[#e35226]"
                    >
                      {errors.mobile.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </label>

              <p className="flex items-start gap-1.5 text-[10px] font-semibold leading-snug text-muted">
                <ShieldCheck
                  size={13}
                  className="mt-[1px] shrink-0 text-gold"
                />
                No password, no OTP — we'll only use this to reach you about
                your order.
                <br />
                <span className="text-[9.5px] font-medium text-gold/80">
                  கடவுச்சொல் இல்லை, OTP இல்லை — ஆர்டர் தொடர்பாக மட்டுமே
                  பயன்படுத்துவோம்.
                </span>
              </p>

              <button
                type="submit"
                disabled={submitting}
                className={`btn-3d mt-1 flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-extrabold text-black transition-opacity ${
                  submitting ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    Continue
                  </>
                )}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-center text-[9.5px] font-semibold leading-snug text-gold/90">
                <Lock size={10} className="shrink-0" />
                உங்கள் தகவல்கள் பாதுகாப்பாக இருக்கும். உங்கள் அனுமதியின்றி
                அழைப்புகள் வராது.
              </p>
            </form>

            {/* diya accent, straddling the bottom edge of the card */}
            <div className="pointer-events-none absolute -bottom-4 left-1/2 z-10 -translate-x-1/2">
              <svg
                width="34"
                height="30"
                viewBox="0 0 34 30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <ellipse
                  cx="17"
                  cy="23"
                  rx="15"
                  ry="6"
                  fill="#3a1608"
                  stroke="#ffc154"
                  strokeWidth="1.2"
                />
                <ellipse
                  cx="17"
                  cy="21"
                  rx="10"
                  ry="3"
                  fill="#ffb347"
                  opacity="0.35"
                />
                <path
                  d="M17 6c2.2 3 2.6 5.4 1.2 7.4-1 1.4-1 2.8.4 3.8-2.6.4-4.6-1.2-4.4-3.6.1-1.7 1.4-2.6 1.2-4.4-.1-1.1-.6-2.2 1.6-3.2Z"
                  fill="#ffcb66"
                  className="animate-flame-flicker"
                  style={{ transformOrigin: "17px 15px" }}
                />
              </svg>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
