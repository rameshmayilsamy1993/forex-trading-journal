import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check, AlertCircle, FileText, Settings } from 'lucide-react';
import apiService from '../services/apiService';
import { MasterData, ChecklistItem } from '../types/trading';
import ChecklistBuilder from './ChecklistBuilder';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from './ui/utils';

export default function MasterStrategyPage() {
  const [strategies, setStrategies] = useState<MasterData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    checklist: [] as ChecklistItem[]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.getMasters('strategy');
      setStrategies(data);
    } catch (err) {
      console.error('Failed to load strategies:', err);
      setError('Failed to load strategies');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setIsEditing(true);
    setEditingId(null);
    setFormData({ name: '', checklist: [] });
    setError(null);
  };

  const handleEdit = (strategy: MasterData) => {
    setIsEditing(true);
    setEditingId(strategy.id);
    setFormData({
      name: strategy.name,
      checklist: strategy.checklist || []
    });
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({ name: '', checklist: [] });
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Strategy name is required');
      return;
    }

    if (formData.checklist.length === 0) {
      setError('At least one checklist item is required');
      return;
    }

    const invalidItems = formData.checklist.filter(item => !item.label.trim());
    if (invalidItems.length > 0) {
      setError('All checklist items must have a label');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        type: 'strategy',
        checklist: formData.checklist.map((item, index) => ({
          label: item.label.trim(),
          required: item.required,
          order: index + 1
        }))
      };

      if (editingId) {
        await apiService.updateMaster(editingId, payload);
      } else {
        await apiService.createMaster(payload);
      }

      await loadStrategies();
      handleCancel();
    } catch (err) {
      console.error('Failed to save strategy:', err);
      setError('Failed to save strategy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this strategy?')) return;

    try {
      await apiService.deleteMaster(id);
      await loadStrategies();
    } catch (err) {
      console.error('Failed to delete strategy:', err);
      setError('Failed to delete strategy');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading strategies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-7 h-7" />
            Strategy Checklists
          </h1>
          <p className="text-slate-500 mt-1">Create and manage strategy pre-trade checklists</p>
        </div>
        {!isEditing && (
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Strategy
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isEditing ? (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200/50 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <h2 className="text-xl font-bold flex items-center gap-2">
              {editingId ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? 'Edit Strategy' : 'Create New Strategy'}
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Strategy Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., ICT 4HR + 15MIN Entry"
                className="text-lg"
              />
            </div>

            <ChecklistBuilder
              items={formData.checklist}
              onChange={(items) => setFormData({ ...formData, checklist: items })}
            />

            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : editingId ? 'Update Strategy' : 'Create Strategy'}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {strategies.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <FileText className="w-16 h-16 text-slate-300 mx-auto" />
              <h3 className="mt-4 text-lg font-medium text-slate-700">No Strategies Yet</h3>
              <p className="mt-2 text-slate-500">Create your first strategy checklist to get started</p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Create Strategy
              </Button>
            </div>
          ) : (
            strategies.map((strategy) => (
              <div
                key={strategy.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200/50 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{strategy.name}</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(strategy.checklist || []).map((item, index) => (
                        <span
                          key={index}
                          className={cn(
                            "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm",
                            item.required
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {item.label}
                          {item.required && (
                            <span className="text-xs font-semibold">*</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      {(strategy.checklist || []).length} items •{' '}
                      {(strategy.checklist || []).filter(i => i.required).length} required
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(strategy)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(strategy.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
