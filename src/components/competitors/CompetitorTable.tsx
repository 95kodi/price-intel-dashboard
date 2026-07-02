"use client";
import { useEffect, useState } from "react";
import { Edit2, Trash2, Eye, Plus, Globe, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { getCompetitors, saveCompetitor, type ApiCompetitor } from "@/services/competitorService";

type StatusFilter = "all" | "active" | "inactive";

type ModalMode = "add" | "edit" | "view" | "disable";

const emptyForm: ApiCompetitor = {
  PlatformID: 0,
  PlatformCode: "",
  PlatformName: "",
  BaseURL: "",
  CollectorType: "",
  IsEnabled: true,
};

const COLLECTOR_TYPES = ["AMAZON", "FLIPKART", "POORVIKA", "SANGEETHA", "CROMA", "VIJAY_SALES", "RELIANCE_DIGITAL", "OTHER"];

export function CompetitorTable() {
  const [competitors, setCompetitors] = useState<ApiCompetitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [selected, setSelected] = useState<ApiCompetitor | null>(null);
  const [form, setForm] = useState<ApiCompetitor>(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchCompetitors = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const data = await getCompetitors();
      setCompetitors(data);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const searched = competitors.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.PlatformName.toLowerCase().includes(q) ||
      c.PlatformCode.toLowerCase().includes(q) ||
      c.BaseURL.toLowerCase().includes(q)
    );
  });

  const filtered = searched.filter((c) => {
    if (statusFilter === "active") return c.IsEnabled;
    if (statusFilter === "inactive") return !c.IsEnabled;
    return true;
  });

  function openAdd() {
    setSelected(null);
    setForm(emptyForm);
    setModalMode("add");
  }

  function openEdit(comp: ApiCompetitor) {
    setSelected(comp);
    setForm({ ...comp });
    setModalMode("edit");
  }

  function openView(comp: ApiCompetitor) {
    setSelected(comp);
    setModalMode("view");
  }

  function openDisable(comp: ApiCompetitor) {
    setSelected(comp);
    setModalMode("disable");
  }

  function closeModal() {
    setModalMode(null);
    setSelected(null);
  }

  function setFormField<K extends keyof ApiCompetitor>(field: K, value: ApiCompetitor[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.PlatformCode.trim() || !form.PlatformName.trim() || !form.BaseURL.trim() || !form.CollectorType.trim()) {
      toast("Please fill in all required fields", "error");
      return;
    }
    setSaving(true);
    try {
      await saveCompetitor(form);
      toast(modalMode === "add" ? "Competitor added successfully" : "Competitor updated successfully");
      closeModal();
      fetchCompetitors();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to save competitor", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    if (!selected) return;
    setSaving(true);
    try {
      await saveCompetitor({ ...selected, IsEnabled: false });
      toast("Competitor disabled successfully");
      closeModal();
      fetchCompetitors();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to disable competitor", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-200 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900 flex-1">Tracked Competitors</h3>
        <span className="text-xs text-gray-400">{filtered.length} competitors</span>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus size={14} />
          Add Competitor
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-200">
        <div className="relative w-56">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search competitors..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="w-28"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 size={18} className="animate-spin" />
          <span>Loading competitors...</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <span>Failed to load competitors</span>
          <Button variant="outline" size="sm" onClick={fetchCompetitors}>Retry</Button>
        </div>
      ) : !filtered.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
          <Globe size={40} className="text-gray-300" />
          <span className="text-sm">No competitors found</span>
          {(search || statusFilter !== "all") && <span className="text-xs">Try adjusting your search or filters.</span>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 sticky top-0">
                {["Competitor Name", "Website URL", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wide text-gray-500 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((comp) => (
                <tr key={comp.PlatformID} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-gray-400 flex-shrink-0" />
                      <span>{comp.PlatformName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <a href={comp.BaseURL} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                      {comp.BaseURL.replace("https://", "").replace("http://", "")}
                    </a>
                  </td>
                  <td className="px-3 py-2.5">
                    {comp.IsEnabled ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(comp)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" aria-label={`Edit ${comp.PlatformName}`}>
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => openView(comp)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" aria-label={`View ${comp.PlatformName}`}>
                        <Eye size={14} />
                      </button>
                      <button onClick={() => openDisable(comp)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500" aria-label={`Disable ${comp.PlatformName}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalMode === "add" || modalMode === "edit"}
        onClose={closeModal}
        title={modalMode === "add" ? "Add Competitor" : "Edit Competitor"}
        className="max-w-[500px]"
      >
        <p className="text-sm text-gray-500 mb-5 -mt-3">
          {modalMode === "add" ? "Add a new competitor website to track." : "Update competitor details."}
        </p>
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Platform Code"
              placeholder="e.g. AMAZON"
              value={form.PlatformCode}
              onChange={(e) => setFormField("PlatformCode", e.target.value)}
              required
            />
            <Input
              label="Platform Name"
              placeholder="e.g. Amazon"
              value={form.PlatformName}
              onChange={(e) => setFormField("PlatformName", e.target.value)}
              required
            />
          </div>
          <Input
            label="Website URL"
            placeholder="https://www.amazon.in"
            value={form.BaseURL}
            onChange={(e) => setFormField("BaseURL", e.target.value)}
            required
          />
          <Select
            label="Collector Type"
            value={form.CollectorType}
            onChange={(e) => setFormField("CollectorType", e.target.value)}
          >
            <option value="">Select collector type</option>
            {COLLECTOR_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <label className="flex items-center gap-3 cursor-pointer">
            <button
              type="button"
              role="switch"
              aria-checked={form.IsEnabled}
              onClick={() => setFormField("IsEnabled", !form.IsEnabled)}
              className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${form.IsEnabled ? "bg-blue-600" : "bg-gray-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${form.IsEnabled ? "translate-x-5" : ""}`} />
            </button>
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving}>
              {modalMode === "add" ? "Add Competitor" : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal open={modalMode === "view"} onClose={closeModal} title="Competitor Details" className="max-w-[500px]">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500">Platform ID</p>
                <p className="text-sm text-gray-900 mt-0.5">{selected.PlatformID}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Platform Code</p>
                <p className="text-sm text-gray-900 mt-0.5 font-mono">{selected.PlatformCode}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Platform Name</p>
                <p className="text-sm text-gray-900 mt-0.5">{selected.PlatformName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Collector Type</p>
                <p className="text-sm text-gray-900 mt-0.5 font-mono">{selected.CollectorType}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Website URL</p>
              <a href={selected.BaseURL} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-0.5 block">
                {selected.BaseURL}
              </a>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Status</p>
              <div className="mt-1">
                {selected.IsEnabled ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="destructive">Inactive</Badge>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={closeModal}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Disable Confirmation Modal */}
      <Modal open={modalMode === "disable"} onClose={closeModal} title="Disable Competitor" className="max-w-md">
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <p className="text-sm text-gray-600 mb-6">
            Are you sure you want to disable <strong>{selected?.PlatformName}</strong>?
          </p>
          <div className="flex gap-2 w-full justify-center">
            <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button type="button" variant="danger" loading={saving} onClick={handleDisable}>Disable</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
