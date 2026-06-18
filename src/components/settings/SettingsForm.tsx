"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${on ? "bg-blue-600" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${on ? "translate-x-4" : ""}`} />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 gap-4">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function SettingsForm() {
  const [companyName, setCompanyName] = useState("PriceIntel Retail");
  const [currency, setCurrency] = useState("INR");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [scanFrequency, setScanFrequency] = useState("6h");
  const [retryAttempts, setRetryAttempts] = useState(3);
  const [timeout, setTimeoutVal] = useState(30);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(false);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [priceDropOnly, setPriceDropOnly] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">General</h3>
        <SettingRow label="Company name" desc="Your retail store name">
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-52" />
        </SettingRow>
        <SettingRow label="Currency" desc="Display currency for prices">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-40">
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </Select>
        </SettingRow>
        <SettingRow label="Timezone" desc="Used for scan scheduling">
          <Select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-44">
            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
            <option value="UTC">UTC</option>
          </Select>
        </SettingRow>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Scanning</h3>
        <SettingRow label="Scan frequency" desc="How often to scan competitor prices">
          <Select value={scanFrequency} onChange={(e) => setScanFrequency(e.target.value)} className="w-40">
            <option value="6h">Every 6 hours</option>
            <option value="12h">Every 12 hours</option>
            <option value="24h">Daily</option>
          </Select>
        </SettingRow>
        <SettingRow label="Retry attempts" desc="Retry on scan failure">
          <Input type="number" value={retryAttempts} onChange={(e) => setRetryAttempts(Number(e.target.value))} className="w-20" />
        </SettingRow>
        <SettingRow label="Request timeout" desc="Seconds before timeout">
          <Input type="number" value={timeout} onChange={(e) => setTimeoutVal(Number(e.target.value))} className="w-20" />
        </SettingRow>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Notifications</h3>
        <SettingRow label="Email alerts" desc="Send scan results to your email">
          <Toggle on={emailAlerts} onClick={() => setEmailAlerts(!emailAlerts)} />
        </SettingRow>
        <SettingRow label="WhatsApp alerts" desc="Get WhatsApp notifications">
          <Toggle on={whatsappAlerts} onClick={() => setWhatsappAlerts(!whatsappAlerts)} />
        </SettingRow>
        <SettingRow label="Push notifications" desc="Browser push alerts">
          <Toggle on={pushAlerts} onClick={() => setPushAlerts(!pushAlerts)} />
        </SettingRow>
        <SettingRow label="Price drop only" desc="Notify only on significant price drops">
          <Toggle on={priceDropOnly} onClick={() => setPriceDropOnly(!priceDropOnly)} />
        </SettingRow>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={handleSave}>
          {saved ? "Saved ✓" : "Save changes"}
        </Button>
        <Button variant="outline">Reset to defaults</Button>
      </div>
    </div>
  );
}
