import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, List, Brain, Clock } from 'lucide-react';
import { MasterData, MasterType } from '../types/trading';
import apiService from '../services/apiService';
import { Input } from './ui/input';
import { PageHeader, CardContainer, StatCard } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';

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
      setMasters(data || []);
    } catch (error) {
      console.error('Failed to load masters:', error);
      setMasters([]);
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

  const masterCounts = {
    strategy: masters.filter(m => m.type === 'strategy').length,
    session: masters.filter(m => m.type === 'session').length,
    keyLevel: masters.filter(m => m.type === 'keyLevel').length,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Masters Management"
        subtitle="Manage trading strategies, sessions, and key levels"
        icon={Settings}
        color="purple"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Strategies" value={masterCounts.strategy} icon={Brain} color="purple" />
        <StatCard label="Sessions" value={masterCounts.session} icon={Clock} color="blue" />
        <StatCard label="Key Levels" value={masterCounts.keyLevel} icon={List} color="green" />
      </div>

      <CardContainer className="!p-0">
        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveType(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeType === tab.id
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Add Field */}
          <form onSubmit={handleAdd} className="flex gap-3 mb-6">
            <Input
              type="text"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder={`Add new ${activeType}...`}
              className="flex-1"
            />
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </form>

          {/* List */}
          <div className="space-y-2">
            {isLoading ? (
              <LoadingSpinner message="Loading masters..." />
            ) : filteredMasters.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No {activeType}s found. Add your first one above.</p>
            ) : (
              filteredMasters.map(master => (
                <div
                  key={master.id}
                  className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl group hover:border-purple-200 hover:bg-purple-50/30 transition-all duration-200"
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
      </CardContainer>
    </div>
  );
}
