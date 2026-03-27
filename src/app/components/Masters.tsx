import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, List, Brain, Clock } from 'lucide-react';
import { MasterData, MasterType } from '../types/trading';
import apiService from '../services/apiService';
import { Input } from './ui/input';

export default function Masters() {
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [activeType, setActiveType] = useState<MasterType>('strategy');
  const [newValue, setNewValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getMasters();
      setMasters(data);
    } catch (error) {
      console.error('Failed to load masters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) return;

    try {
      const result = await apiService.createMaster({
        name: newValue.trim(),
        type: activeType
      });
      setMasters([...masters, result]);
      setNewValue('');
    } catch (error) {
      console.error('Failed to add master:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await apiService.deleteMaster(id);
      setMasters(masters.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete master:', error);
    }
  };

  const filteredMasters = masters.filter(m => m.type === activeType);

  const tabs = [
    { id: 'strategy' as MasterType, label: 'Strategies', icon: Brain },
    { id: 'session' as MasterType, label: 'Sessions', icon: Clock },
    { id: 'keyLevel' as MasterType, label: 'Key Levels', icon: List },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Masters Management</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveType(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                  activeType === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Add Field */}
        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <Input
            type="text"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            placeholder={`Add new ${activeType}...`}
          />
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>

        {/* List */}
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-center py-4 text-gray-500">Loading...</p>
          ) : filteredMasters.length === 0 ? (
            <p className="text-center py-4 text-gray-500">No items found.</p>
          ) : (
            filteredMasters.map(master => (
              <div
                key={master.id}
                className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg group hover:border-gray-300 transition-colors"
              >
                <span className="font-medium text-gray-900">{master.name}</span>
                <button
                  onClick={() => handleDelete(master.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
