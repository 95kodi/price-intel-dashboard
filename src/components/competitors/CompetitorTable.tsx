"use client";
import { useState } from "react";
import { Edit2, Trash2, ToggleLeft, ToggleRight, Plus, Globe } from "lucide-react";
import { useCompetitors, useToggleCompetitor, useDeleteCompetitor, useCreateCompetitor, useUpdateCompetitor } from "@/hooks/useQueries";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { formatDate } from "@/lib/utils";
import type { Competitor } from "@/types";

export function CompetitorTable() {
  const { data: competitors, isLoading, isError, refetch } = useCompetitors();
  const toggleMutation = useToggleCompetitor();
  const deleteMutation = useDeleteCompetitor();
  const createMutation = useCreateCompetitor();
  const updateMutation = useUpdateCompetitor();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Competitor | null>(null);
  const [form, setForm] = useState({ name: "", website: "", enabled: true });
  const [deleteTarget, setDeleteTarget] = useState<Competitor | null>(null);

  function openAddModal() {
    setEditing(null);
    setForm({ name: "", website: "", enabled: true });
    setModalOpen(true);
  }

  function openEditModal(comp: Competitor) {
    setEditing(comp);
    setForm({ name: comp.name, website: comp.website, enabled: comp.enabled });
    setModalOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
    setModalOpen(false);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3.5 border-b border-gray-200 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-900 flex-1">Tracked Competitors</h3>
        <span className="text-xs text-gray-400">{competitors?.length ?? 0} competitors</span>
        <Button variant="primary" size="sm" onClick={openAddModal}>
          <Plus size={14} />
          Add Competitor
        </Button>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !competitors?.length ? (
        <EmptyState
          icon={Globe}
          title="No competitors yet"
          description="Add a competitor website to start tracking their prices."
          action={{ label: "Add Competitor", onClick: openAddModal }}
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              {["Competitor Name", "Website URL", "Status", "Last Scan", "Products", "Actions"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-[11px] uppercase tracking-wide text-gray-500 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {competitors.map((comp) => (
              <tr key={comp.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2.5 font-medium text-gray-900 flex items-center gap-2">
                  <Globe size={14} className="text-gray-400" />
                  {comp.name}
                </td>
                <td className="px-3 py-2.5">
                  <a href={comp.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                    {comp.website.replace("https://", "")}
                  </a>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${comp.enabled ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {comp.enabled ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{formatDate(comp.lastScan)}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600">{comp.productCount} products</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(comp)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" aria-label={`Edit ${comp.name}`}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => toggleMutation.mutate(comp.id)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500" aria-label={`${comp.enabled ? "Disable" : "Enable"} ${comp.name}`}>
                      {comp.enabled ? <ToggleRight size={14} className="text-blue-600" /> : <ToggleLeft size={14} />}
                    </button>
                    <button onClick={() => setDeleteTarget(comp)} className="p-1.5 rounded-md hover:bg-red-50 text-red-500" aria-label={`Delete ${comp.name}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit competitor" : "Add competitor"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Competitor name" placeholder="e.g. Vijay Sales" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Website URL" placeholder="https://www.vijaysales.com" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} required />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="rounded" />
            Active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Save changes" : "Add competitor"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete competitor">
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will stop price tracking for this competitor.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => {
              if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
