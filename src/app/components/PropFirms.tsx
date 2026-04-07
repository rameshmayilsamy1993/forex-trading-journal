import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check, Building2 } from 'lucide-react';
import { PropFirm } from '../types/trading';
import apiService from '../services/apiService';
import { Input } from './ui/input';
import { PageHeader, CardContainer, StatCard } from './ui/DesignSystem';

export default function PropFirms() {
  const [firms, setFirms] = useState<PropFirm[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#3B82F6' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const firmsData = await apiService.getPropFirms();
        setFirms(firmsData);
      } catch (error) {
        console.error('Failed to load prop firms:', error);
      }
    };
    
    loadData();
  }, []);

  const handleAdd = async () => {
    if (!formData.name.trim()) return;

    const newFirm: Omit<PropFirm, 'id' | 'createdAt'> = {
      name: formData.name,
      color: formData.color,
    };

    try {
      const savedFirm = await apiService.createPropFirm(newFirm);
      setFirms([...firms, savedFirm]);
      setFormData({ name: '', color: '#3B82F6' });
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to create prop firm:', error);
    }
  };

  const handleEdit = async (id: string) => {
    if (!formData.name.trim()) return;

    const updatedFirm: Partial<PropFirm> = {
      name: formData.name,
      color: formData.color,
    };

    try {
      const savedFirm = await apiService.updatePropFirm(id, updatedFirm);
      setFirms(firms.map(firm => firm.id === id ? savedFirm : firm));
      setEditingId(null);
      setFormData({ name: '', color: '#3B82F6' });
    } catch (error) {
      console.error('Failed to update prop firm:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this prop firm? This will also affect associated accounts.')) {
      try {
        await apiService.deletePropFirm(id);
        setFirms(firms.filter(firm => firm.id !== id));
      } catch (error) {
        console.error('Failed to delete prop firm:', error);
      }
    }
  };

  const startEdit = (firm: PropFirm) => {
    setEditingId(firm.id);
    setFormData({ name: firm.name, color: firm.color });
    setIsAdding(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', color: '#3B82F6' });
  };

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Prop Firms"
        subtitle="Manage your prop trading firms"
        icon={Building2}
        color="blue"
        action={{
          label: 'Add Prop Firm',
          icon: Plus,
          onClick: () => setIsAdding(true)
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Firms"
          value={firms.length}
          icon={Building2}
          color="blue"
        />
      </div>

      <CardContainer className="!p-0">
        <div className="p-6">
          {/* Add Form */}
          {isAdding && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl border border-blue-100">
              <div className="flex gap-3 flex-wrap">
                <Input
                  type="text"
                  placeholder="Prop firm name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="flex-1 min-w-[200px]"
                  autoFocus
                />
                <div className="flex gap-2 items-center">
                  {colors.map(color => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleAdd}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Firms List */}
          <div className="space-y-2">
            {firms.length === 0 && !isAdding && (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No prop firms added yet</p>
                <p className="text-sm">Click "Add Prop Firm" to get started</p>
              </div>
            )}

            {firms.map(firm => (
              <div
                key={firm.id}
                className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200"
              >
                {editingId === firm.id ? (
                  <>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="flex-1"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      {colors.map(color => (
                        <button
                          key={color}
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            formData.color === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => handleEdit(firm.id)}
                      className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: firm.color }}
                    />
                    <span className="flex-1 font-medium text-gray-900">{firm.name}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(firm.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => startEdit(firm)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(firm.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContainer>
    </div>
  );
}
