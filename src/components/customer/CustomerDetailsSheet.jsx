import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import {
  customerSchema,
  customerDefaultValues,
} from "../../schemas/customerSchema";
import { useCustomerGateStore } from "../../store/useCustomerGateStore";
import { useCustomerStore } from "../../store/useCustomerStore";
import { db } from "../../firebase/config";
import { saveUserProfile } from "../../services/usersFirestore";
import customerGateArt from "../../assets/customer/customer-gate-bg.png";

// Native pixel size of customerGateArt — used only to size the wrapper's
// aspect-ratio so the % based overlay positions below always land inside
// the blank cream card painted into the artwork, at any screen width.
const ART_W = 1144;
const ART_H = 1375;

/**
 * Centered "who's shopping?" gate — fired once, on the very first Add to
 * Cart tap (see useCustomerGateStore). No password, no OTP — just enough
 * to attach a name + mobile number to this visitor's cart/order activity.
 * Closing it cancels the pending add; submitting saves locally + to
 * Firestore, then lets the original Add to Cart action continue.
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
