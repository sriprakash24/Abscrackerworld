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
import customerGateArt from "../../assets/customer/customer-gate-bg.jpg";

// Native pixel size of customerGateArt — used only to size the wrapper's
// aspect-ratio so the % based overlay positions below always land inside
// the blank cream card painted into the artwork, at any screen width.
const ART_W = 1211;
const ART_H = 1299;

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
 * The whole card IS the festive family artwork (Dheeran Enterprises
 * branded), with the Name / Mobile / Continue mini-form dropped directly
 * into the blank cream board painted into the artwork — no separate modal
 * chrome layered on top of it.
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-3 py-6">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            className="absolute inset-0 bg-brown/55 backdrop-blur-[3px]"
          />

          {/* Card — the artwork itself, full bleed, at its native aspect ratio
              so the % positioned form overlay below always lands exactly in
              the blank cream board the art was designed with. */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            aria-label="Quick details"
            className="relative z-10 w-full"
            style={{
              maxWidth: "min(96vw, 440px)",
              aspectRatio: `${ART_W} / ${ART_H}`,
              boxShadow: "0 24px 70px -18px rgba(113,50,31,0.45)",
            }}
          >
            <img
              src={customerGateArt}
              alt=""
              className="absolute inset-0 h-full w-full rounded-[18px] object-cover"
              draggable={false}
            />

            {/* Form overlay — positioned by % so it always sits inside the
                blank cream board painted into the artwork. */}
            <div
              className="absolute flex flex-col justify-center gap-[1.6%]"
              style={{ left: "23%", right: "23%", top: "36.5%", bottom: "22.5%" }}
            >
              <p className="text-center text-[13px] font-extrabold leading-none text-[#5a2a14]">
                Quick Details
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[3.5%]">
                {matchedProfile ? (
                  // Returning customer — mobile matched an existing profile,
                  // so we skip asking for the name entirely.
                  <div className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[#e8b98a] bg-white/85 px-2.5 py-[5px] text-center">
                    <Check size={12} className="shrink-0 text-[#2f7a3a]" />
                    <span className="text-[11.5px] font-extrabold text-[#5a2a14]">
                      Welcome back, {matchedProfile.name}!
                    </span>
                  </div>
                ) : (
                  <label className="block">
                    <span className="mb-[2px] block text-[9.5px] font-bold tracking-wide text-[#71321f]">
                      Name / பெயர்
                    </span>
                    <input
                      {...register("name")}
                      placeholder="Your name"
                      autoComplete="name"
                      className={`w-full rounded-[10px] border bg-white/90 px-2.5 py-[5px] text-[12.5px] font-bold text-[#5a2a14] outline-none placeholder:font-medium placeholder:text-[#b58a6a] ${
                        errors.name
                          ? "border-[#f04452] shadow-[0_0_0_2px_rgba(240,68,82,0.15)]"
                          : "border-[#efc59b] focus:border-[#ff8a65]"
                      }`}
                    />
                    {errors.name && (
                      <span className="mt-[2px] block text-[9px] font-bold text-[#f04452]">
                        {errors.name.message}
                      </span>
                    )}
                  </label>
                )}

                <label className="block">
                  <span className="mb-[2px] block text-[9.5px] font-bold tracking-wide text-[#71321f]">
                    Mobile / மொபைல்
                  </span>
                  <div
                    className={`flex items-center overflow-hidden rounded-[10px] border bg-white/90 ${
                      errors.mobile
                        ? "border-[#f04452] shadow-[0_0_0_2px_rgba(240,68,82,0.15)]"
                        : "border-[#efc59b] focus-within:border-[#ff8a65]"
                    }`}
                  >
                    <span className="border-r border-[#efc59b] px-2 py-[5px] text-[11.5px] font-extrabold text-[#5a2a14]">
                      +91
                    </span>
                    <input
                      {...register("mobile")}
                      placeholder="10-digit number"
                      inputMode="numeric"
                      maxLength={10}
                      autoComplete="tel"
                      className="w-full bg-transparent px-2 py-[5px] text-[12.5px] font-bold text-[#5a2a14] outline-none placeholder:font-medium placeholder:text-[#b58a6a]"
                    />
                    {checkingMobile && (
                      <Loader2 size={12} className="mr-2 shrink-0 animate-spin text-[#c0481f]" />
                    )}
                  </div>
                  {errors.mobile && (
                    <span className="mt-[2px] block text-[9px] font-bold text-[#f04452]">
                      {errors.mobile.message}
                    </span>
                  )}
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`mt-[1%] flex items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-b from-[#ff8a65] to-[#f04452] py-[6px] text-[12.5px] font-extrabold text-white shadow-[0_8px_16px_-8px_rgba(240,68,82,0.7)] transition-transform active:scale-[0.97] ${
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

              <p className="flex items-center justify-center gap-1 text-center text-[8.5px] font-bold leading-tight text-[#8a5a2b]">
                <ShieldCheck size={9} className="shrink-0" />
                No password, no OTP needed
              </p>
            </div>
          </motion.div>

          {/* Close — outside the art so it never collides with the artwork */}
          <button
            onClick={handleClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brown shadow transition-colors hover:bg-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </AnimatePresence>
  );
}
