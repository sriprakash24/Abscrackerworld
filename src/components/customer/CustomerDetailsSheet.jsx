import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import {
  customerSchemaNew,
  customerSchemaReturning,
  customerDefaultValues,
  mobileRegex,
} from "../../schemas/customerSchema";
import { useCustomerGateStore } from "../../store/useCustomerGateStore";
import { useCustomerStore } from "../../store/useCustomerStore";
import { db } from "../../firebase/config";
import { saveUserProfile, getUserProfile } from "../../services/usersFirestore";
import customerGateArt from "../../assets/customer/customer-gate-bg.png";

// Native pixel size of customerGateArt — used only to size the wrapper's
// aspect-ratio so the % based overlay positions below always land inside
// the blank cream card painted into the artwork, at any screen width.
const ART_W = 1144;
const ART_H = 1375;

// How long to wait after the visitor stops typing the mobile number before
// checking Firestore for an existing users/{mobile} profile.
const LOOKUP_DEBOUNCE_MS = 350;

/**
 * Centered "who's shopping?" gate — fired once, on the very first Add to
 * Cart tap (see useCustomerGateStore). No password, no OTP — just enough
 * to attach a name + mobile number to this visitor's cart/order activity.
 * Closing it cancels the pending add; submitting saves locally + to
 * Firestore, then lets the original Add to Cart action continue.
 *
 * Mobile-first "login": once a valid 10-digit mobile number is typed, we
 * check Firestore for an existing users/{mobile} profile. If one exists,
 * the Name field drops out entirely — we already know who they are, so
 * Continue signs them straight back in with the name on file (checkout's
 * own address prefill then takes it from there for repeat orders). If the
 * mobile number is new, Name stays mandatory, same as before.
 *
 * The whole card IS the festive family photo-frame artwork (ABS Crackers
 * World branded), with the Name / Mobile / Continue mini-form dropped
 * directly into the blank cream space the artwork was designed with —
 * no separate dark modal chrome layered on top of it.
 */
export default function CustomerDetailsSheet() {
  const isOpen = useCustomerGateStore((s) => s.isOpen);
  const cancel = useCustomerGateStore((s) => s.cancel);
  const resolve = useCustomerGateStore((s) => s.resolve);
  const setCustomer = useCustomerStore((s) => s.setCustomer);
  const [submitting, setSubmitting] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [checkingMobile, setCheckingMobile] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: useCallback((values, context, options) => {
      // Read the live ref (not the closed-over state) so this resolver
      // always validates against whichever schema currently applies,
      // even though useForm only captures the resolver function once.
      const schema = matchedProfileRef.current ? customerSchemaReturning : customerSchemaNew;
      return zodResolver(schema)(values, context, options);
    }, []),
    defaultValues: customerDefaultValues,
  });

  // Mirrors matchedProfile into a ref so the resolver above (memoized once
  // with useCallback) always reads the current value instead of a stale one.
  const matchedProfileRef = useRef(null);
  useEffect(() => {
    matchedProfileRef.current = matchedProfile;
  }, [matchedProfile]);

  const mobileValue = watch("mobile");

  // Debounced Firestore lookup — as soon as the typed mobile number is a
  // valid 10-digit India number, check users/{mobile} for an existing
  // profile so we can skip asking for the name again.
  useEffect(() => {
    const mobile = (mobileValue || "").trim();
    if (!mobileRegex.test(mobile)) {
      setMatchedProfile(null);
      setCheckingMobile(false);
      return undefined;
    }

    let cancelled = false;
    setCheckingMobile(true);

    const timer = setTimeout(async () => {
      try {
        const profile = await getUserProfile(db, mobile);
        if (cancelled) return;
        if (profile?.name) {
          setMatchedProfile(profile);
          setValue("name", profile.name, { shouldValidate: false });
        } else {
          setMatchedProfile(null);
        }
      } catch (err) {
        console.error("Failed to look up existing customer", err);
        if (!cancelled) setMatchedProfile(null);
      } finally {
        if (!cancelled) setCheckingMobile(false);
      }
    }, LOOKUP_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mobileValue, setValue]);

  const handleClose = () => {
    if (submitting) return;
    reset(customerDefaultValues);
    setMatchedProfile(null);
    cancel();
  };

  const onSubmit = async (values) => {
    const mobile = values.mobile.trim();
    // Returning customer: use the name already on file rather than
    // whatever (empty) name field state happens to be. New customer: use
    // what they just typed.
    const name = (matchedProfile?.name || values.name || "").trim();
    const customer = { name, mobile };

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
    setMatchedProfile(null);
    reset(customerDefaultValues);
    resolve(customer);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4 py-6">
          {/* Backdrop */}
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
                "radial-gradient(120% 90% at 50% 40%, rgba(20,4,5,0.72) 0%, rgba(10,2,3,0.88) 60%, rgba(6,1,1,0.95) 100%)",
            }}
          />

          {/* Card — the artwork itself, full bleed, at its native aspect ratio
              so the % positioned form overlay below always lands exactly in
              the blank cream space the art was designed with. */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="relative z-10 w-full"
            style={{
              maxWidth: "min(90vw, 390px)",
              aspectRatio: `${ART_W} / ${ART_H}`,
              boxShadow: "0 24px 70px -18px rgba(0,0,0,0.85), 0 0 46px rgba(216,28,43,0.2)",
            }}
          >
            <img
              src={customerGateArt}
              alt=""
              className="absolute inset-0 h-full w-full rounded-[18px] object-cover"
              draggable={false}
            />

            <button
              onClick={handleClose}
              aria-label="Close"
              className="absolute flex items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/65"
              style={{ top: "1.6%", right: "1.6%", width: "7.5%", aspectRatio: "1 / 1" }}
            >
              <X size={14} />
            </button>

            {/* Form overlay — positioned by % so it always sits inside the
                blank cream card painted into the artwork. */}
            <div
              className="absolute flex flex-col justify-center gap-[3%] px-[3%]"
              style={{ left: "18%", right: "18%", top: "32%", bottom: "21%" }}
            >
              <div className="text-center">
                <p className="text-[13px] font-extrabold leading-tight text-[#3a2410]">
                  Quick Details
                </p>
                <p className="text-[9.5px] font-bold leading-tight text-[#8a5a2b]">
                  உங்கள் விவரங்களை பதிவு செய்யுங்கள்
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[6%]">
                {matchedProfile ? (
                  // Returning customer — mobile matched an existing profile,
                  // so we skip asking for the name entirely.
                  <div className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[#c99a5b]/50 bg-white/80 px-2.5 py-[7px] text-center">
                    <Check size={12} className="shrink-0 text-[#2f7a3a]" />
                    <span className="text-[11px] font-extrabold text-[#3a2410]">
                      Welcome back, {matchedProfile.name}!
                    </span>
                  </div>
                ) : (
                  <label className="block">
                    <span className="mb-[3px] block text-[9.5px] font-bold tracking-wide text-[#6b4423]">
                      Name / பெயர்
                    </span>
                    <input
                      {...register("name")}
                      placeholder="Your name"
                      autoComplete="name"
                      className={`w-full rounded-[10px] border bg-white/85 px-2.5 py-[7px] text-[12px] font-bold text-[#3a2410] outline-none placeholder:font-medium placeholder:text-[#a9895f] ${
                        errors.name
                          ? "border-[#c23b1f] shadow-[0_0_0_2px_rgba(194,59,31,0.15)]"
                          : "border-[#c99a5b]/60 focus:border-[#c23b1f]/70"
                      }`}
                    />
                    {errors.name && (
                      <span className="mt-[2px] block text-[8.5px] font-bold text-[#c23b1f]">
                        {errors.name.message}
                      </span>
                    )}
                  </label>
                )}

                <label className="block">
                  <span className="mb-[3px] block text-[9.5px] font-bold tracking-wide text-[#6b4423]">
                    Mobile / மொபைல்
                  </span>
                  <div
                    className={`flex items-center overflow-hidden rounded-[10px] border bg-white/85 ${
                      errors.mobile
                        ? "border-[#c23b1f] shadow-[0_0_0_2px_rgba(194,59,31,0.15)]"
                        : "border-[#c99a5b]/60 focus-within:border-[#c23b1f]/70"
                    }`}
                  >
                    <span className="border-r border-[#c99a5b]/40 px-2 py-[7px] text-[11px] font-extrabold text-[#3a2410]">
                      +91
                    </span>
                    <input
                      {...register("mobile")}
                      placeholder="10-digit number"
                      inputMode="numeric"
                      maxLength={10}
                      autoComplete="tel"
                      className="w-full bg-transparent px-2 py-[7px] text-[12px] font-bold text-[#3a2410] outline-none placeholder:font-medium placeholder:text-[#a9895f]"
                    />
                    {checkingMobile && (
                      <Loader2 size={12} className="mr-2 shrink-0 animate-spin text-[#8a5a2b]" />
                    )}
                  </div>
                  {errors.mobile && (
                    <span className="mt-[2px] block text-[8.5px] font-bold text-[#c23b1f]">
                      {errors.mobile.message}
                    </span>
                  )}
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`mt-[1%] flex items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-b from-[#f2872e] to-[#c23b1f] py-[8px] text-[12px] font-extrabold text-white shadow-[0_8px_16px_-8px_rgba(194,59,31,0.6)] transition-transform active:scale-[0.97] ${
                    submitting ? "cursor-not-allowed opacity-70" : ""
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </form>

              <p className="flex items-center justify-center gap-1 text-center text-[8px] font-bold leading-tight text-[#8a5a2b]">
                <ShieldCheck size={9} className="shrink-0" />
                No password, no OTP — just for order updates.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
