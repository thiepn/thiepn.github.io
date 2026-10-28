import React, { useState } from 'react';
import {
  Asset,
  AssetType,
  AssetStatus,
  AssetOwnership,
  VehicleDetails,
} from '../assetTypes';
import { createAsset, updateAsset, findDuplicateSerialCandidates } from '../assetService';
import { getPlaces } from '../../travel/travelService';
import {
  X,
  Shield,
  Tag,
  DollarSign,
  MapPin,
  FileText,
  AlertTriangle,
  Car,
  Wrench,
  Check,
} from 'lucide-react';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetToEdit?: Asset;
  initialPlaceId?: string;
  onSaved?: (asset: Asset) => void;
}

const ASSET_TYPES: Array<{ value: AssetType; label: string }> = [
  { value: 'device', label: 'Device / Gadget' },
  { value: 'computer', label: 'Computer / Laptop' },
  { value: 'phone', label: 'Phone / Smartphone' },
  { value: 'tablet', label: 'Tablet / iPad' },
  { value: 'appliance', label: 'Home Appliance' },
  { value: 'tool', label: 'Tool / Workshop' },
  { value: 'instrument', label: 'Musical Instrument' },
  { value: 'vehicle', label: 'Vehicle / Car / Moto' },
  { value: 'bicycle', label: 'Bicycle / Scooter' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'equipment', label: 'Gym / Sports Gear' },
  { value: 'document', label: 'Valuable Document' },
  { value: 'other', label: 'Other Asset' },
];

const ASSET_STATUSES: Array<{ value: AssetStatus; label: string }> = [
  { value: 'active', label: 'Active (In Use)' },
  { value: 'stored', label: 'Stored (In Storage)' },
  { value: 'loaned', label: 'Loaned Out' },
  { value: 'repair', label: 'In Repair' },
  { value: 'sold', label: 'Sold' },
  { value: 'disposed', label: 'Disposed / Recycled' },
  { value: 'lost', label: 'Lost' },
  { value: 'archived', label: 'Archived' },
];

export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  assetToEdit,
  initialPlaceId,
  onSaved,
}) => {
  const isEditing = !!assetToEdit;

  const [name, setName] = useState(assetToEdit?.name || '');
  const [type, setType] = useState<AssetType>(assetToEdit?.type || 'device');
  const [status, setStatus] = useState<AssetStatus>(assetToEdit?.status || 'active');
  const [ownership, setOwnership] = useState<AssetOwnership>(assetToEdit?.ownership || 'owned');

  const [manufacturer, setManufacturer] = useState(assetToEdit?.manufacturer || '');
  const [model, setModel] = useState(assetToEdit?.model || '');
  const [serialNumber, setSerialNumber] = useState(assetToEdit?.serialNumber || '');
  const [partNumber, setPartNumber] = useState(assetToEdit?.partNumber || '');

  const [acquiredAt, setAcquiredAt] = useState(assetToEdit?.acquiredAt || new Date().toISOString().slice(0, 10));
  const [priceAmount, setPriceAmount] = useState(assetToEdit?.purchasePrice?.amount ? String(assetToEdit.purchasePrice.amount) : '');
  const [priceCurrency, setPriceCurrency] = useState(assetToEdit?.purchasePrice?.currency || '$');
  const [seller, setSeller] = useState(assetToEdit?.seller || '');

  const [placeId, setPlaceId] = useState(assetToEdit?.placeId || initialPlaceId || '');
  const [tagsStr, setTagsStr] = useState((assetToEdit?.tags || []).join(', '));
  const [notes, setNotes] = useState(assetToEdit?.notes || '');
  const [manualUrl, setManualUrl] = useState(assetToEdit?.manualUrl || '');

  // Vehicle specific
  const [vin, setVin] = useState(assetToEdit?.vehicleDetails?.vin || '');
  const [registrationPlate, setRegistrationPlate] = useState(assetToEdit?.vehicleDetails?.registrationPlate || '');
  const [year, setYear] = useState(assetToEdit?.vehicleDetails?.year ? String(assetToEdit.vehicleDetails.year) : '');
  const [currentOdometer, setCurrentOdometer] = useState(
    assetToEdit?.vehicleDetails?.currentOdometer !== undefined ? String(assetToEdit.vehicleDetails.currentOdometer) : ''
  );
  const [odometerUnit, setOdometerUnit] = useState<'km' | 'mi'>(assetToEdit?.vehicleDetails?.odometerUnit || 'km');
  const [fuelType, setFuelType] = useState(assetToEdit?.vehicleDetails?.fuelType || 'petrol');

  const [activeTab, setActiveTab] = useState<'general' | 'identifiers' | 'purchase' | 'location' | 'vehicle' | 'notes'>('general');

  const places = getPlaces();
  const duplicateCandidates = findDuplicateSerialCandidates(serialNumber, assetToEdit?.id);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const purchasePrice = priceAmount.trim() && !isNaN(Number(priceAmount))
      ? { amount: Number(priceAmount), currency: priceCurrency }
      : undefined;

    const vehicleDetails: VehicleDetails | undefined = ['vehicle', 'bicycle'].includes(type)
      ? {
          make: manufacturer.trim() || undefined,
          model: model.trim() || undefined,
          year: year ? Number(year) : undefined,
          vin: vin.trim() || undefined,
          registrationPlate: registrationPlate.trim() || undefined,
          currentOdometer: currentOdometer ? Number(currentOdometer) : undefined,
          odometerUnit,
          fuelType: type === 'vehicle' ? (fuelType as any) : 'human_powered',
        }
      : undefined;

    const payload: Partial<Asset> & { name: string; type: AssetType } = {
      name: name.trim(),
      type,
      status,
      ownership,
      manufacturer: manufacturer.trim() || undefined,
      model: model.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      partNumber: partNumber.trim() || undefined,
      acquiredAt: acquiredAt.trim() || undefined,
      purchasePrice,
      seller: seller.trim() || undefined,
      placeId: placeId || undefined,
      manualUrl: manualUrl.trim() || undefined,
      vehicleDetails,
      tags,
      notes: notes.trim() || undefined,
    };

    let saved: Asset | undefined;
    if (isEditing && assetToEdit) {
      saved = updateAsset(assetToEdit.id, payload);
    } else {
      saved = createAsset(payload);
    }

    if (saved && onSaved) {
      onSaved(saved);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-700 text-neutral-100 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold tracking-tight">
              {isEditing ? `Edit Asset: ${assetToEdit.name}` : 'Add New Physical Asset'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 p-1.5 rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-800 px-6 bg-neutral-950/40 overflow-x-auto text-sm">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            General Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('identifiers')}
            className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'identifiers'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Model & Serials
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('purchase')}
            className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'purchase'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Acquisition
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'location'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Room / Place
          </button>
          {['vehicle', 'bicycle'].includes(type) && (
            <button
              type="button"
              onClick={() => setActiveTab('vehicle')}
              className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'vehicle'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              Vehicle Specs
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-3 px-3 border-b-2 font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Notes & Docs
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Asset Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., MacBook Pro 16, Dyson Vacuum, Cordless Drill"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Asset Category / Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AssetType)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-indigo-500"
                  >
                    {ASSET_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Current Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AssetStatus)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-indigo-500"
                  >
                    {ASSET_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Ownership Nature
                  </label>
                  <select
                    value={ownership}
                    onChange={(e) => setOwnership(e.target.value as AssetOwnership)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="owned">Owned Personally</option>
                    <option value="borrowed">Borrowed / On Loan</option>
                    <option value="leased">Leased</option>
                    <option value="rented">Rented</option>
                    <option value="shared">Shared / Community</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Tags (comma-separated)
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="electronics, home-office, portable"
                      value={tagsStr}
                      onChange={(e) => setTagsStr(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-9 pr-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: IDENTIFIERS & SERIALS */}
          {activeTab === 'identifiers' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-lg text-xs text-indigo-300">
                <Shield className="w-4 h-4 inline mr-1 text-indigo-400" />
                Serial numbers and hardware identifiers are sensitive. They are encrypted and kept local-only by default.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Manufacturer / Brand
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apple, Sony, DeWalt, Shimano"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Model Name or Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A2485, DCD791, WH-1000XM4"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. C02G45XPQ6L4"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 font-mono focus:outline-none focus:border-indigo-500"
                />
                {duplicateCandidates.length > 0 && (
                  <div className="mt-2 p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-lg flex items-start gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Duplicate serial warning:</strong> This serial number matches existing asset(s):{' '}
                      {duplicateCandidates.map((c) => c.name).join(', ')}.
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Part / SKU / Order Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. MK183LL/A"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* TAB: PURCHASE & ACQUISITION */}
          {activeTab === 'purchase' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Acquisition / Purchase Date
                  </label>
                  <input
                    type="date"
                    value={acquiredAt}
                    onChange={(e) => setAcquiredAt(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Seller / Vendor / Store
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Apple Store, Amazon, Best Buy, eBay"
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={priceAmount}
                    onChange={(e) => setPriceAmount(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={priceCurrency}
                    onChange={(e) => setPriceCurrency(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-indigo-500 text-center font-semibold"
                  />
                </div>
              </div>

              <div className="text-xs text-neutral-400 bg-neutral-800/40 p-3 rounded-lg border border-neutral-700/50">
                💡 You can link receipts and P53 Finance transactions to this asset directly in the Asset Details view after saving.
              </div>
            </div>
          )}

          {/* TAB: LOCATION */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Storage Room / Place Location
                </label>
                <select
                  value={placeId}
                  onChange={(e) => setPlaceId(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">(No specific location / unassigned)</option>
                  {places.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>

              {placeId && (
                <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700 text-xs text-neutral-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Linked to place: <strong>{places.find((p) => p.id === placeId)?.name}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* TAB: VEHICLE SPECS */}
          {activeTab === 'vehicle' && ['vehicle', 'bicycle'].includes(type) && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Year of Manufacture
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2022"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {type === 'vehicle' && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                      Fuel / Powertrain
                    </label>
                    <select
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="petrol">Petrol (Gasoline)</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric (EV)</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="plugin_hybrid">Plug-in Hybrid (PHEV)</option>
                      <option value="lpg">LPG / Gas</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    {type === 'bicycle' ? 'Frame Serial / Number' : 'Vehicle Identification Number (VIN)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1HGCR2F83HA000000"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Registration / License Plate
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABC-1234"
                    value={registrationPlate}
                    onChange={(e) => setRegistrationPlate(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Current Odometer / Distance
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 45000"
                    value={currentOdometer}
                    onChange={(e) => setCurrentOdometer(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Distance Unit
                  </label>
                  <select
                    value={odometerUnit}
                    onChange={(e) => setOdometerUnit(e.target.value as 'km' | 'mi')}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="km">Kilometers (km)</option>
                    <option value="mi">Miles (mi)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB: NOTES & DOCS */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  User Manual Web Link / URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/manual.pdf"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  General Notes, Setup, or Configuration
                </label>
                <textarea
                  rows={4}
                  placeholder="Additional notes about configuration, maintenance tips, or physical condition..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3.5 py-2.5 text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isEditing ? 'Save Changes' : 'Create Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
