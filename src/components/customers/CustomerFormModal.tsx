import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  Building2,
  Users,
  Calendar,
  CreditCard,
  MapPin,
  Compass,
  ExternalLink,
  Check,
  Sparkles,
  Info,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Customer, CustomerType, StandardAddressData } from '../../types/erp';
import { useErp } from '../../context/ErpContext';
import { validateCustomerCode } from '../../domain/validators/erpRules';
import { BaseModal } from '../common/BaseModal';
import { AddressForm, validateStandardAddress } from '../common/AddressForm';
import { IndonesiaRegionService } from '../../services/indonesiaRegionService';
import { calculateTimeDuration } from '../../utils/dateUtils';
import {
  calculateDistanceToHq,
  isValidCoordinates,
  generateGoogleMapsUrl,
  getHqCoordinates,
  DEFAULT_HQ_COORDINATES
} from '../../utils/geoUtils';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (savedCustomer: Customer) => void;
  initialCustomer?: Customer | null;
  initialData?: Customer | null;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCustomer,
  initialData
}) => {
  const {
    createCustomer,
    updateCustomer,
    setCustomers,
    generateCustomerCode,
    customers,
    addToast,
    companyProfile
  } = useErp();

  const activeCustomer = initialCustomer || initialData || null;
  const isEditing = Boolean(activeCustomer);

  // Dynamic Headquarters Origin Anchor from Company Profile
  const hqAnchor = useMemo(() => {
    return getHqCoordinates(companyProfile);
  }, [companyProfile]);

  // 1. Classification & Code
  const [customerType, setCustomerType] = useState<CustomerType>('general');
  const [customerCode, setCustomerCode] = useState<string>('');

  // 2. Identity
  const [picName, setPicName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // 3. Event & Booking Specifications (Conditional)
  const [eventTitle, setEventTitle] = useState('');
  const [targetEventDate, setTargetEventDate] = useState('');
  const [eventSession, setEventSession] = useState<'morning' | 'afternoon' | 'evening' | 'full_day'>('evening');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [interestedBusinessLineId, setInterestedBusinessLineId] = useState('ALL');
  const [estimatedGuestCount, setEstimatedGuestCount] = useState<number>(300);
  const [venueName, setVenueName] = useState('');
  const [eventNotes, setEventNotes] = useState('');

  // Auto Duration Calculation
  const calculatedDuration = useMemo(() => {
    return calculateTimeDuration(startTime, endTime);
  }, [startTime, endTime]);

  // 4. Standard Administrative Address (Indonesian 4-Tier)
  const [addressData, setAddressData] = useState<StandardAddressData>({
    country: 'Indonesia',
    provinceId: '',
    provinceName: '',
    regencyId: '',
    regencyName: '',
    districtId: '',
    districtName: '',
    villageId: '',
    villageName: '',
    postalCode: '',
    address: '',
    rt: '',
    rw: ''
  });

  // 5. Geolocation & Distance from HQ
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // 6. Commercial & Payment Terms (Universal Single Source of Truth)
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<'dp_termin' | 'cash' | 'transfer' | 'top'>('dp_termin');
  const [defaultDownPaymentPercent, setDefaultDownPaymentPercent] = useState<number>(20);
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState<string>('net_30');
  const [npwp, setNpwp] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // UI & Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Synchronize state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (activeCustomer) {
        setCustomerType(activeCustomer.customerType || 'general');
        setCustomerCode(activeCustomer.customerCode);
        setPicName(activeCustomer.name || '');
        setCompanyName(activeCustomer.companyName || '');
        setPhone(activeCustomer.phone || '');
        setEmail(activeCustomer.email || '');

        setEventTitle(activeCustomer.eventTitle || '');
        setTargetEventDate(activeCustomer.targetEventDate || '');
        setEventSession(activeCustomer.eventSession || 'evening');
        setStartTime(activeCustomer.startTime || '09:00');
        setEndTime(activeCustomer.endTime || '10:00');
        setInterestedBusinessLineId(activeCustomer.interestedBusinessLineId || 'ALL');
        setEstimatedGuestCount(activeCustomer.estimatedGuestCount || 300);
        setVenueName(activeCustomer.venueName || '');
        setEventNotes(activeCustomer.eventNotes || '');

        setAddressData({
          country: activeCustomer.country || 'Indonesia',
          provinceId: activeCustomer.provinceId || '',
          provinceName: activeCustomer.province || '',
          regencyId: activeCustomer.regencyId || '',
          regencyName: activeCustomer.regency || activeCustomer.city || '',
          districtId: activeCustomer.districtId || '',
          districtName: activeCustomer.district || '',
          villageId: activeCustomer.villageId || '',
          villageName: activeCustomer.village || '',
          postalCode: activeCustomer.postalCode || '',
          address: activeCustomer.address || '',
          rt: activeCustomer.rt || '',
          rw: activeCustomer.rw || ''
        });

        setLatitude(activeCustomer.latitude !== undefined ? String(activeCustomer.latitude) : '');
        setLongitude(activeCustomer.longitude !== undefined ? String(activeCustomer.longitude) : '');
        setCreditLimit(activeCustomer.creditLimit || 0);
        setPaymentTerms(activeCustomer.paymentTerms || 'net_30');
        setDefaultPaymentMethod(activeCustomer.defaultPaymentMethod || (activeCustomer.customerType === 'booking' ? 'dp_termin' : activeCustomer.customerType === 'corporate' ? 'top' : 'cash'));
        setDefaultDownPaymentPercent(activeCustomer.defaultDownPaymentPercent || 20);
        setPaymentTermsDays(activeCustomer.paymentTermsDays !== undefined ? activeCustomer.paymentTermsDays : (activeCustomer.customerType === 'corporate' ? 30 : 0));
        setNpwp(activeCustomer.npwp || '');
        setStatus(activeCustomer.status || 'active');
      } else {
        // Reset to initial new customer defaults
        setCustomerType('general');
        setCustomerCode(generateCustomerCode());
        setPicName('');
        setCompanyName('');
        setPhone('');
        setEmail('');

        setEventTitle('');
        setTargetEventDate('');
        setEventSession('evening');
        setStartTime('09:00');
        setEndTime('10:00');
        setInterestedBusinessLineId('ALL');
        setEstimatedGuestCount(300);
        setVenueName('');
        setEventNotes('');

        setAddressData({
          country: 'Indonesia',
          provinceId: '',
          provinceName: '',
          regencyId: '',
          regencyName: '',
          districtId: '',
          districtName: '',
          villageId: '',
          villageName: '',
          postalCode: '',
          address: '',
          rt: '',
          rw: ''
        });

        setLatitude('');
        setLongitude('');
        setCreditLimit(0);
        setPaymentTerms('net_30');
        setDefaultPaymentMethod('dp_termin');
        setDefaultDownPaymentPercent(20);
        setPaymentTermsDays(30);
        setNpwp('');
        setStatus('active');
      }

      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, initialCustomer, initialData, generateCustomerCode]);

  // Real-time calculation of distance from Headquarters
  const hqDistanceCalculation = useMemo(() => {
    const latNum = parseFloat(latitude);
    const lonNum = parseFloat(longitude);

    if (isValidCoordinates(latNum, lonNum)) {
      return calculateDistanceToHq(latNum, lonNum, hqAnchor);
    }
    return null;
  }, [latitude, longitude, hqAnchor]);

  // Geolocation detection handler
  const handleDetectCurrentGps = () => {
    if (!navigator.geolocation) {
      addToast('GPS Unavailable', 'Geolocation is not supported by your browser.', 'warning');
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lon = Number(position.coords.longitude.toFixed(6));
        setLatitude(String(lat));
        setLongitude(String(lon));
        setIsDetectingGps(false);
        addToast('GPS Detected', `Coordinates captured: ${lat}, ${lon}`, 'success');
      },
      (error) => {
        setIsDetectingGps(false);
        addToast('GPS Error', `Failed to acquire location: ${error.message}`, 'warning');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Re-shuffle customer code
  const handleReshuffleCode = () => {
    if (isEditing) return;
    const newCode = generateCustomerCode();
    setCustomerCode(newCode);
    if (errors.customerCode) {
      setErrors((prev) => ({ ...prev, customerCode: '' }));
    }
  };

  // Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Customer Code check
    if (!isEditing) {
      const codeCheck = validateCustomerCode(customerCode);
      if (!codeCheck.isValid) {
        newErrors.customerCode = codeCheck.error || 'Invalid Customer Code format.';
      } else if (customers.some((c) => c.customerCode === customerCode)) {
        newErrors.customerCode = 'Customer Code is already assigned. Please reshuffle.';
      }
    }

    // PIC Name
    if (!picName.trim()) {
      newErrors.picName = 'Full Name / Contact PIC is required.';
    }

    // Company / Organization
    if (customerType === 'corporate' && !companyName.trim()) {
      newErrors.companyName = 'Company / Legal Entity name is required for corporate accounts.';
    }

    // Event & Booking Title
    if (customerType === 'booking' && !eventTitle.trim()) {
      newErrors.eventTitle = 'Event / Couple Title is required for booking accounts.';
    }

    // Phone / WhatsApp validation
    if (!phone.trim()) {
      newErrors.phone = 'Phone / WhatsApp number is required.';
    } else {
      const digits = phone.replace(/[^0-9]/g, '');
      if (digits.length < 8) {
        newErrors.phone = 'Phone number must contain at least 8 digits.';
      }
    }

    // Email validation (optional but must be valid if entered)
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = 'Please enter a valid email address.';
      }
    }

    // Indonesian 4-Tier Address Validation (Optional/Progressive for quick onboarding)
    const addressErrors = validateStandardAddress(addressData, {
      countryRequired: false,
      provinceRequired: false,
      regencyRequired: false,
      districtRequired: false,
      villageRequired: false,
      addressRequired: false
    });
    Object.assign(newErrors, addressErrors);

    // Coordinate validation if entered
    if (latitude.trim() || longitude.trim()) {
      const latNum = parseFloat(latitude);
      const lonNum = parseFloat(longitude);
      if (!isValidCoordinates(latNum, lonNum)) {
        newErrors.coordinates = 'Coordinates must be valid numbers (Latitude -90 to 90, Longitude -180 to 180).';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    if (!validateForm()) {
      addToast('Validation Incomplete', 'Please fill in all mandatory fields marked with an asterisk (*).', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const cityName = addressData.regencyName || addressData.provinceName || 'Jakarta';
      const latNum = latitude.trim() ? parseFloat(latitude) : undefined;
      const lonNum = longitude.trim() ? parseFloat(longitude) : undefined;
      const calculatedDistance = hqDistanceCalculation?.estimatedRoadDistanceKm;

      const customerPayload = {
        customerType,
        name: picName.trim(),
        companyName: companyName.trim() || (customerType === 'booking' ? eventTitle.trim() : 'Private Individual'),
        email: email.trim() || `${customerCode.toLowerCase()}@client.zyvora.id`,
        phone: phone.trim(),
        city: cityName,
        creditLimit: Number(creditLimit) || 0,
        paymentTerms,
        defaultPaymentMethod,
        defaultDownPaymentPercent: defaultPaymentMethod === 'dp_termin' ? Number(defaultDownPaymentPercent) || 20 : undefined,
        paymentTermsDays: defaultPaymentMethod === 'top' ? Number(paymentTermsDays) || 30 : 0,
        npwp: npwp.trim() || undefined,
        status,

        // Indonesian 4-Tier Administrative Address
        country: addressData.country || 'Indonesia',
        provinceId: addressData.provinceId,
        province: addressData.provinceName,
        regencyId: addressData.regencyId,
        regency: addressData.regencyName,
        districtId: addressData.districtId,
        district: addressData.districtName,
        villageId: addressData.villageId,
        village: addressData.villageName,
        postalCode: addressData.postalCode?.trim() || undefined,
        address: addressData.address?.trim() || '',
        rt: addressData.rt?.trim() || undefined,
        rw: addressData.rw?.trim() || undefined,

        // Geolocation & Distance from HQ
        latitude: latNum,
        longitude: lonNum,
        distanceFromHqKm: calculatedDistance,

        // Event & Booking Specifications
        eventTitle: customerType === 'booking' ? eventTitle.trim() : undefined,
        targetEventDate: customerType === 'booking' && targetEventDate ? targetEventDate : undefined,
        eventSession: customerType === 'booking' ? eventSession : undefined,
        startTime: customerType === 'booking' ? startTime : undefined,
        endTime: customerType === 'booking' ? endTime : undefined,
        durationHours: customerType === 'booking' ? calculatedDuration.durationHours : undefined,
        durationText: customerType === 'booking' ? calculatedDuration.durationText : undefined,
        interestedBusinessLineId: customerType === 'booking' ? interestedBusinessLineId : undefined,
        estimatedGuestCount: customerType === 'booking' ? Number(estimatedGuestCount) || 300 : undefined,
        venueName: customerType === 'booking' && venueName.trim() ? venueName.trim() : undefined,
        eventNotes: customerType === 'booking' && eventNotes.trim() ? eventNotes.trim() : undefined
      };

      if (isEditing && activeCustomer) {
        // Update existing customer
        const updated = await updateCustomer(activeCustomer.id, customerPayload);

        addToast('Customer Updated', `Customer record '${updated.name}' updated successfully.`, 'success');
        if (onSuccess) onSuccess(updated);
      } else {
        // Register new customer
        const created = await createCustomer({
          preferredCode: customerCode,
          ...customerPayload
        });

        addToast(
          'Customer Registered',
          `New customer '${created.name}' [${created.customerCode}] registered successfully.`,
          'success'
        );
        if (onSuccess) onSuccess(created);
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving customer record.';
      addToast('Registration Failed', msg, 'error');
      setErrors((prev) => ({ ...prev, submit: msg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Customer Details' : 'Register New Customer'}
      description="Master Data · Indonesian 4-Tier Administrative Address & Geolocation Tracking"
      icon={<Users className="w-4 h-4 text-[#086288]" />}
      size="lg"
      maxWidth="max-w-[880px]"
      closeOnBackdropClick={false}
      closeOnEscape={!isSubmitting}
      bodyClassName="p-4 sm:p-6"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-[11px] text-[#475569]">
            <span className="text-[#DC2626] font-bold">*</span> Mandatory fields
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-[#0F172A] bg-white border border-[#DCE5EC] hover:bg-[#EEF4F8] rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 text-xs font-semibold text-white bg-[#086288] hover:bg-[#064B6A] active:bg-[#043F59] rounded-md transition-colors cursor-pointer shadow-2xs min-w-[170px] flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Record...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Save Changes' : 'Register Customer'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <form
        id="customer-master-form"
        onSubmit={handleSubmit}
        className="space-y-6 text-xs"
      >
        {/* TOP VALIDATION ERRORS BANNER */}
        {Object.keys(errors).length > 0 && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-[#DC2626] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold block">Mohon periksa kolom yang belum lengkap:</span>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-red-600">
                {Object.entries(errors).map(([field, msg]) => (
                  <li key={field}>{msg}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {/* TOP CLASSIFICATION SELECTOR PILLS */}
        <div className="p-3 bg-[#EFF7FA] border border-[#B7DDEA] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-[#086288] uppercase tracking-wider block">
              Customer Classification
            </span>
            <span className="text-[11px] text-[#475569]">
              Select account model to adapt commercial and operational fields
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-[#B7DDEA] shadow-2xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setCustomerType('general')}
              className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all cursor-pointer flex-1 sm:flex-initial text-center ${
                customerType === 'general'
                  ? 'bg-[#086288] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              General (B2C)
            </button>
            <button
              type="button"
              onClick={() => setCustomerType('corporate')}
              className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all cursor-pointer flex-1 sm:flex-initial text-center ${
                customerType === 'corporate'
                  ? 'bg-[#086288] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              Corporate (B2B)
            </button>
            <button
              type="button"
              onClick={() => setCustomerType('booking')}
              className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-all cursor-pointer flex-1 sm:flex-initial text-center flex items-center justify-center gap-1 ${
                customerType === 'booking'
                  ? 'bg-[#086288] text-white shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Event Booking</span>
            </button>
          </div>
        </div>

        {/* SECTION 1: CUSTOMER CODE & PRIMARY IDENTITY */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#DCE5EC]">
            <Users className="w-4 h-4 text-[#086288]" />
            <h3 className="font-bold text-[#0F172A] text-xs uppercase tracking-wider">
              1. Customer Identity & Code
            </h3>
          </div>

          {/* Customer Code Banner */}
          <div className="p-3 bg-[#F8FAFC] border border-[#DCE5EC] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                System Canonical Code
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-base font-bold text-[#086288] tracking-widest bg-white px-2.5 py-0.5 rounded border border-[#B7DDEA]">
                  {customerCode || '-----'}
                </span>
                <span className="text-[11px] text-[#475569]">
                  {isEditing ? 'Immutable Identifier' : 'Auto-generated 5-character Alphanumeric'}
                </span>
              </div>
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={handleReshuffleCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#086288] bg-white hover:bg-[#EFF7FA] border border-[#B7DDEA] rounded-md transition-colors cursor-pointer self-start sm:self-auto"
                title="Generate another unique code"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reshuffle Code</span>
              </button>
            )}
          </div>
          {errors.customerCode && (
            <p className="text-[11px] text-[#DC2626] font-medium">{errors.customerCode}</p>
          )}

          {/* Name & Company Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Full Name / Contact PIC <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="text"
                value={picName}
                onChange={(e) => {
                  setPicName(e.target.value);
                  if (errors.picName) setErrors((prev) => ({ ...prev, picName: '' }));
                }}
                placeholder="e.g. Aditya Pratama"
                className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-[#0F172A] focus:outline-none focus:ring-1 transition-colors ${
                  errors.picName
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                    : 'border-[#DCE5EC] focus:border-[#086288] focus:ring-[#086288]'
                }`}
              />
              {errors.picName && (
                <p className="text-[10px] text-[#DC2626] mt-1 font-medium">{errors.picName}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                {customerType === 'corporate' ? (
                  <>
                    Company / Legal Entity <span className="text-[#DC2626]">*</span>
                  </>
                ) : customerType === 'booking' ? (
                  'Organization / Event Group'
                ) : (
                  'Company / Business (Optional)'
                )}
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (errors.companyName) setErrors((prev) => ({ ...prev, companyName: '' }));
                }}
                placeholder={
                  customerType === 'corporate'
                    ? 'e.g. PT Mandiri Graha Sejahtera'
                    : customerType === 'booking'
                    ? 'e.g. Aditya & Sarah Wedding'
                    : 'e.g. Private Individual / Freelance'
                }
                className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-[#0F172A] focus:outline-none focus:ring-1 transition-colors ${
                  errors.companyName
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                    : 'border-[#DCE5EC] focus:border-[#086288] focus:ring-[#086288]'
                }`}
              />
              {errors.companyName && (
                <p className="text-[10px] text-[#DC2626] mt-1 font-medium">{errors.companyName}</p>
              )}
            </div>
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Phone / WhatsApp Number <span className="text-[#DC2626]">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                }}
                placeholder="e.g. +62 812 8899 7711"
                className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-[#0F172A] focus:outline-none focus:ring-1 transition-colors ${
                  errors.phone
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                    : 'border-[#DCE5EC] focus:border-[#086288] focus:ring-[#086288]'
                }`}
              />
              {errors.phone && (
                <p className="text-[10px] text-[#DC2626] mt-1 font-medium">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="e.g. aditya.pratama@client.id"
                className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-[#0F172A] focus:outline-none focus:ring-1 transition-colors ${
                  errors.email
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                    : 'border-[#DCE5EC] focus:border-[#086288] focus:ring-[#086288]'
                }`}
              />
              {errors.email && (
                <p className="text-[10px] text-[#DC2626] mt-1 font-medium">{errors.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: CONDITIONAL EVENT & SERVICE BOOKING SPECIFICATIONS */}
        {customerType === 'booking' && (
          <div className="p-4 bg-[#F8FAFC] border-2 border-[#B7DDEA] rounded-xl space-y-3.5">
            <div className="flex items-center gap-2 pb-1.5 border-b border-[#DCE5EC]">
              <Calendar className="w-4 h-4 text-[#086288]" />
              <h3 className="font-bold text-[#086288] text-xs uppercase tracking-wider">
                2. Event & Service Booking Specifications
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                  Event / Couple Title <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => {
                    setEventTitle(e.target.value);
                    if (errors.eventTitle) setErrors((prev) => ({ ...prev, eventTitle: '' }));
                  }}
                  placeholder="e.g. Aditya & Sarah Wedding Reception"
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs text-[#0F172A] focus:outline-none focus:ring-1 transition-colors ${
                    errors.eventTitle
                      ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]'
                      : 'border-[#DCE5EC] focus:border-[#086288] focus:ring-[#086288]'
                  }`}
                />
                {errors.eventTitle && (
                  <p className="text-[10px] text-[#DC2626] mt-1 font-medium">{errors.eventTitle}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                  Target Event Date
                </label>
                <input
                  type="date"
                  value={targetEventDate}
                  onChange={(e) => setTargetEventDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>
            </div>

            {/* WAKTU & DURASI ACARA */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-white p-3 rounded-lg border border-[#DCE5EC]">
              <div>
                <label className="block text-[11px] font-bold text-[#0F172A] mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#086288]" />
                  <span>Jam Mulai</span> <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFDFE] border border-[#DCE5EC] rounded-lg text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0F172A] mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#086288]" />
                  <span>Jam Selesai</span> <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFDFE] border border-[#DCE5EC] rounded-lg text-xs font-mono font-bold text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                  Estimasi Durasi (Otomatis)
                </label>
                <div className="h-[34px] px-3 bg-[#EFF7FA] border border-[#B7DDEA] rounded-lg flex items-center justify-between text-xs font-bold text-[#086288]">
                  <span className="flex items-center gap-1.5 truncate">
                    <span>⏱️</span>
                    <span>{calculatedDuration.durationText}</span>
                  </span>
                  {calculatedDuration.durationHours > 0 && (
                    <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-[#086288] border border-[#B7DDEA]/60 font-mono">
                      {calculatedDuration.durationHours}h
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                  Event Session
                </label>
                <select
                  value={eventSession}
                  onChange={(e) => setEventSession(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                >
                  <option value="morning">Morning / Akad / Ceremony</option>
                  <option value="afternoon">Afternoon Session</option>
                  <option value="evening">Evening / Reception</option>
                  <option value="full_day">Full Day Package</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                  Primary Business Line
                </label>
                <select
                  value={interestedBusinessLineId}
                  onChange={(e) => setInterestedBusinessLineId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                >
                  <option value="ALL">All Business Lines (Bundling)</option>
                  <option value="HIZAKI">Hizaki Wedding Planner</option>
                  <option value="KIMIKO">Ki Mi Ko Pager Ayu</option>
                  <option value="AURUM">Aurum Deco</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                  Estimated Guest Count (Pax)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={estimatedGuestCount}
                  onChange={(e) => setEstimatedGuestCount(parseInt(e.target.value, 10) || 0)}
                  placeholder="300"
                  className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Venue / Location Name
              </label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Grand Ballroom Hotel Mulia Senayan, Jakarta"
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Concept & Special Client Notes
              </label>
              <textarea
                rows={2}
                value={eventNotes}
                onChange={(e) => setEventNotes(e.target.value)}
                placeholder="e.g. Modern romantic floral decoration, pastel palette, 8 ushers in matching kebaya."
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
            </div>
          </div>
        )}

        {/* SECTION 3: STANDARD ADMINISTRATIVE INDONESIAN ADDRESS (API 4-TIER) */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#DCE5EC]">
            <MapPin className="w-4 h-4 text-[#086288]" />
            <h3 className="font-bold text-[#0F172A] text-xs uppercase tracking-wider">
              {customerType === 'booking' ? '3. Venue & Event Administrative Address' : '2. Administrative Address'}
            </h3>
          </div>

          <AddressForm
            value={addressData}
            onChange={(updated) => {
              setAddressData(updated);
              // Clear address errors
              setErrors((prev) => {
                const next = { ...prev };
                delete next.province;
                delete next.regency;
                delete next.district;
                delete next.village;
                delete next.address;
                return next;
              });

              // Auto-fill coordinates if available and inputs are empty
              if (
                updated.latitude !== undefined &&
                updated.longitude !== undefined &&
                (!latitude || !longitude)
              ) {
                setLatitude(String(updated.latitude));
                setLongitude(String(updated.longitude));
              }
            }}
            errors={errors}
            onClearError={(key) => setErrors((prev) => ({ ...prev, [key]: '' }))}
            config={{
              countryRequired: false,
              provinceRequired: false,
              regencyRequired: false,
              districtRequired: false,
              villageRequired: false,
              addressRequired: false
            }}
          />
        </div>

        {/* SECTION 4: GEOLOCATION & DISTANCE FROM HEADQUARTERS */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#DCE5EC]">
            <Compass className="w-4 h-4 text-[#086288]" />
            <h3 className="font-bold text-[#0F172A] text-xs uppercase tracking-wider">
              {customerType === 'booking' ? '4. Geolocation & Fleet Travel Distance' : '3. Geolocation & Headquarters Distance'}
            </h3>
          </div>

          <div className="p-4 bg-[#F8FAFC] border border-[#DCE5EC] rounded-xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <span className="text-[11px] font-bold text-[#0F172A] block">
                  Precise GPS Pin Coordinates
                </span>
                <span className="text-[10px] text-[#64748B]">
                  Used to estimate travel logistics, fleet fuel, and routing from Headquarters
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const coords =
                      (addressData.latitude !== undefined && addressData.longitude !== undefined)
                        ? { latitude: addressData.latitude, longitude: addressData.longitude }
                        : IndonesiaRegionService.lookupCoordinates(
                            addressData.villageName,
                            addressData.districtName,
                            addressData.regencyName
                          );
                    if (coords) {
                      setLatitude(String(coords.latitude));
                      setLongitude(String(coords.longitude));
                      addToast(
                        'Coordinates Located',
                        `Located at ${addressData.villageName || addressData.districtName || addressData.regencyName || 'Address'}: ${coords.latitude}, ${coords.longitude}`,
                        'success'
                      );
                    } else {
                      addToast('Lookup Notice', 'Please select at least District or Village in address first.', 'warning');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#475569] bg-white hover:bg-[#F1F5F9] border border-[#DCE5EC] rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Auto-fill coordinates from selected administrative address"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#086288]" />
                  <span>Locate from Address</span>
                </button>

                <button
                  type="button"
                  onClick={handleDetectCurrentGps}
                  disabled={isDetectingGps}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#086288] bg-white hover:bg-[#EFF7FA] border border-[#B7DDEA] rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                >
                  {isDetectingGps ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : (
                    <>
                      <Compass className="w-3.5 h-3.5" />
                      <span>Detect Current GPS</span>
                    </>
                  )}
                </button>

                {isValidCoordinates(parseFloat(latitude), parseFloat(longitude)) && (
                  <a
                    href={generateGoogleMapsUrl(parseFloat(latitude), parseFloat(longitude))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#475569] bg-white hover:bg-[#F1F5F9] border border-[#DCE5EC] rounded-lg transition-colors shadow-2xs"
                    title="View Pin on Google Maps"
                  >
                    <ExternalLink className="w-3 h-3 text-[#086288]" />
                    <span>View Maps</span>
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">
                  Latitude (Decimal Degree)
                </label>
                <input
                  type="text"
                  value={latitude}
                  onChange={(e) => {
                    setLatitude(e.target.value);
                    if (errors.coordinates) setErrors((prev) => ({ ...prev, coordinates: '' }));
                  }}
                  placeholder="-6.938800"
                  className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#475569] mb-1">
                  Longitude (Decimal Degree)
                </label>
                <input
                  type="text"
                  value={longitude}
                  onChange={(e) => {
                    setLongitude(e.target.value);
                    if (errors.coordinates) setErrors((prev) => ({ ...prev, coordinates: '' }));
                  }}
                  placeholder="107.636400"
                  className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
                />
              </div>
            </div>
            {errors.coordinates && (
              <p className="text-[10px] text-[#DC2626] font-medium">{errors.coordinates}</p>
            )}

            {/* LIVE DISTANCE CALCULATION BADGE */}
            <div className="pt-2 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#64748B]">Origin Anchor:</span>
                <span className="font-semibold text-[#0F172A]">{hqAnchor.label}</span>
                <span className="text-[10px] font-mono text-[#086288] bg-[#EFF7FA] px-1.5 py-0.5 rounded border border-[#B7DDEA]">
                  [{hqAnchor.latitude.toFixed(4)}, {hqAnchor.longitude.toFixed(4)}]
                </span>
              </div>

              {hqDistanceCalculation ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#EFF7FA] text-[#086288] border border-[#B7DDEA]">
                    📍 ±{hqDistanceCalculation.estimatedRoadDistanceKm.toLocaleString('id-ID')} km (Road Est.)
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    Direct: {hqDistanceCalculation.straightDistanceKm.toLocaleString('id-ID')} km
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-[#94A3B8] italic flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Enter valid coordinates to calculate distance automatically</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: COMMERCIAL & PAYMENT TERMS (UNIVERSAL SINGLE SOURCE OF TRUTH) */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#DCE5EC]">
            <CreditCard className="w-4 h-4 text-[#086288]" />
            <h3 className="font-bold text-[#0F172A] text-xs uppercase tracking-wider">
              5. Commercial & Default Payment Terms
            </h3>
            <span className="text-[10px] text-[#086288] bg-[#EFF7FA] px-2 py-0.5 rounded border border-[#B7DDEA] font-semibold">
              Master Acuan Order
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Default Payment System <span className="text-[#DC2626]">*</span>
              </label>
              <select
                value={defaultPaymentMethod}
                onChange={(e) => setDefaultPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
              >
                <option value="dp_termin">Down Payment (DP) + Milestones / Termin</option>
                <option value="cash">Full Cash / Tunai</option>
                <option value="transfer">Bank Transfer / Transfer Bank</option>
                <option value="top">Term of Payment (TOP) / Commercial Credit</option>
              </select>
            </div>

            {defaultPaymentMethod === 'dp_termin' && (
              <div>
                <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                  Default Down Payment (DP %)
                </label>
                <select
                  value={defaultDownPaymentPercent}
                  onChange={(e) => setDefaultDownPaymentPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                >
                  <option value={20}>20% (Standard Wedding & Event DP)</option>
                  <option value={30}>30% (Custom Decoration DP)</option>
                  <option value={50}>50% (Two-Stage Booking DP)</option>
                </select>
              </div>
            )}

            {defaultPaymentMethod === 'top' && (
              <div>
                <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                  Credit Terms (Days)
                </label>
                <select
                  value={paymentTermsDays}
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    setPaymentTermsDays(days);
                    setPaymentTerms(`net_${days}`);
                  }}
                  className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs text-[#0F172A] focus:outline-none focus:border-[#086288]"
                >
                  <option value={14}>Net 14 Days</option>
                  <option value={30}>Net 30 Days (Standard Corporate)</option>
                  <option value={60}>Net 60 Days</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Credit Limit / Budget Ceiling (IDR)
              </label>
              <input
                type="number"
                min="0"
                step="5000000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                placeholder="0 (Unlimited / Cash)"
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0F172A] mb-1">
                Tax Identification Number (NPWP)
              </label>
              <input
                type="text"
                value={npwp}
                onChange={(e) => setNpwp(e.target.value)}
                placeholder="01.234.567.8-901.000 (Optional)"
                className="w-full px-3 py-2 bg-white border border-[#DCE5EC] rounded-lg text-xs font-mono text-[#0F172A] focus:outline-none focus:border-[#086288]"
              />
            </div>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
