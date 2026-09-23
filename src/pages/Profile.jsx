import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Lock, UserRound } from 'lucide-react';

import { useCustomerStore } from '../store/useCustomerStore';
import { useCustomerGateStore } from '../store/useCustomerGateStore';
import { profileSchema, profileDefaultValues } from '../schemas/profileSchema';
import { db } from '../firebase/config';
import { getUserProfile, saveUserAddress } from '../services/usersFirestore';
import { getLatestOrderAddress } from '../services/ordersFirestore';

import ProfileHeader from '../components/profile/ProfileHeader';
import SaveProfileButton from '../components/profile/SaveProfileButton';
import FormField from '../components/checkout/FormField';
import AddressForm from '../components/checkout/AddressForm';
import FestiveBackdrop from '../components/ui/FestiveBackdrop';

export default function Profile() {
  const navigate = useNavigate();
  const customer = useCustomerStore((s) => s.customer);
  const setCustomer = useCustomerStore((s) => s.setCustomer);
  const requestDetails = useCustomerGateStore((s) => s.requestDetails);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaultValues,
    mode: 'onTouched',
  });

  // Load whatever address we already have for this customer: their saved
  // profile first (users/{mobile}.address), falling back to the address on
  // their most recent order if they've never edited a profile before —
  // that's the "existing address" the person is expecting to see and edit.
  useEffect(() => {
    if (!customer?.mobile) {
      setLoadingProfile(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingProfile(true);

    (async () => {
      try {
        const profile = await getUserProfile(db, customer.mobile);
        const address = profile?.address ?? (await getLatestOrderAddress(db, customer.mobile));
        if (cancelled) return;
        reset({
          fullName: profile?.name || customer.name || '',
          houseNumber: address?.houseNumber || '',
          street: address?.street || '',
          area: address?.area || '',
          city: address?.city || '',
          district: address?.district || '',
          state: address?.state || '',
          pincode: address?.pincode || '',
        });
      } catch (err) {
        console.error('Failed to load profile', err);
        if (!cancelled) toast.error("Couldn't load your saved address.");
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [customer?.mobile, customer?.name, reset]);

  const sectionFocusHandlers = useCallback(
    (section) => ({
      onFocusCapture: () => setActiveSection(section),
      onBlurCapture: (e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setActiveSection((current) => (current === section ? null : current));
        }
      },
    }),
    []
  );

  const onValid = useCallback(
    async (values) => {
      if (!customer?.mobile || isSaving) return;
      setIsSaving(true);
      try {
        const address = {
          houseNumber: values.houseNumber.trim(),
          street: values.street.trim(),
          area: values.area.trim(),
          city: values.city.trim(),
          district: values.district.trim(),
          state: values.state.trim(),
          pincode: values.pincode.trim(),
        };
        await saveUserAddress(db, customer.mobile, { name: values.fullName, address });
        setCustomer({ name: values.fullName.trim(), mobile: customer.mobile });
        toast.success('Profile updated');
      } catch (err) {
        console.error('Failed to save profile', err);
        toast.error("Couldn't save your changes. Please check your connection and try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [customer, isSaving, setCustomer]
  );

  const onInvalid = useCallback(() => {
    toast.error('Please fix the highlighted fields before saving.');
  }, []);

  // No identity captured yet — same "who's asking" gate the Orders page
  // uses, since the profile/address lives under users/{mobile}.
  if (!customer?.mobile) {
    return (
      <div className="relative min-h-screen w-full pb-4">
        <FestiveBackdrop />
        <ProfileHeader onBack={() => navigate(-1)} />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex flex-col items-center justify-center px-6 py-16 text-center"
        >
          <div className="orb-3d flex h-20 w-20 items-center justify-center !rounded-full text-orange">
            <UserRound size={30} className="art-float" />
          </div>
          <h3 className="mt-4 text-[14px] font-extrabold text-[#f2ece2]">Tell us who's asking</h3>
          <p className="mt-1 max-w-[240px] text-[12px] leading-snug text-muted">
            Share your name &amp; mobile number so we can pull up your saved address.
          </p>
          <button
            onClick={() => requestDetails()}
            className="btn-3d mt-4 rounded-lg px-5 py-2 text-[11px] font-bold text-white"
          >
            Continue
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full pb-4">
      <FestiveBackdrop />
      <ProfileHeader onBack={() => navigate(-1)} />

      {loadingProfile ? (
        <div className="mt-3 flex flex-col gap-3 px-4">
          <div className="surface-3d h-32 animate-pulse rounded-2xl" />
          <div className="surface-3d h-64 animate-pulse rounded-2xl" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
          <div className="mt-3 flex flex-col gap-3 px-4">
            <div {...sectionFocusHandlers('name')}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`surface-3d rounded-2xl px-4 py-4 ${
                  activeSection === 'name' ? 'surface-3d-open animate-glow-pulse' : ''
                }`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="orb-3d flex h-7 w-7 shrink-0 items-center justify-center !rounded-full text-orange">
                    <UserRound size={13} />
                  </span>
                  <h3 className="text-[12.5px] font-extrabold tracking-wide text-[#f2ece2]">Your Details</h3>
                </div>

                <div className="flex flex-col gap-3">
                  <FormField
                    label="Full Name"
                    required
                    placeholder="e.g. Arun Kumar"
                    registration={register('fullName')}
                    error={errors.fullName}
                  />

                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-[#cfc7bd]">
                      Mobile Number
                    </span>
                    <div className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-[#0c0906]/60 px-3.5 py-2.5 text-[12.5px] font-semibold text-muted">
                      <span>+91 {customer.mobile}</span>
                      <Lock size={12} />
                    </div>
                    <span className="mt-1.5 block text-[10px] font-semibold text-muted">
                      Can't be changed here — message us on WhatsApp if it's wrong.
                    </span>
                  </label>
                </div>
              </motion.div>
            </div>

            <div {...sectionFocusHandlers('address')}>
              <AddressForm register={register} errors={errors} isActive={activeSection === 'address'} />
            </div>
          </div>

          <SaveProfileButton loading={isSaving} />
        </form>
      )}
    </div>
  );
}
