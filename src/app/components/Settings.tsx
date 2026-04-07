import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check, Settings as SettingsIcon, DollarSign } from 'lucide-react';
import { MasterData } from '../types/trading';
import apiService from '../services/apiService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { PageHeader, CardContainer, SectionCard } from './ui/DesignSystem';

const MASTER_TYPES = [
  { value: 'strategy', label: 'Strategy' },
  { value: 'keyLevel', label: 'Key Level' },
  { value: 'session', label: 'Session' },
];

export default function Settings() {
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [pairs, setPairs] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<'masters' | 'pairs'>('masters');
  const [newMasterName, setNewMasterName] = useState('');
  const [newMasterType, setNewMasterType] = useState<'strategy' | 'keyLevel' | 'session'>('strategy');
  const [newPair, setNewPair] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mastersData, pairsData] = await Promise.all([
        apiService.getMasters(),
        apiService.settings.getPairs()
      ]);
      setMasters(mastersData);
      setPairs(pairsData || []);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleAddMaster = async () => {
    if (!newMasterName.trim()) return;
    
    setIsLoading(true);
    try {
      const created = await apiService.createMaster({
        name: newMasterName.trim(),
        type: newMasterType
      });
      setMasters([...masters, created]);
      setNewMasterName('');
    } catch (error) {
      console.error('Failed to add master:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMaster = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await apiService.deleteMaster(id);
      setMasters(masters.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete master:', error);
    }
  };

  const handleAddPair = async () => {
    if (!newPair.trim()) return;
    
    const upperPair = newPair.trim().toUpperCase();
    if (pairs.includes(upperPair)) {
      alert('This pair already exists');
      return;
    }
    
    setIsLoading(true);
    try {
      const updatedPairs = [...pairs, upperPair];
      await apiService.settings.updatePairs(updatedPairs);
      setPairs(updatedPairs);
      setNewPair('');
    } catch (error) {
      console.error('Failed to add pair:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePair = async (pairToDelete: string) => {
    if (!confirm(`Are you sure you want to delete "${pairToDelete}"?`)) return;
    
    setIsLoading(true);
    try {
      const updatedPairs = pairs.filter(p => p !== pairToDelete);
      await apiService.settings.updatePairs(updatedPairs);
      setPairs(updatedPairs);
    } catch (error) {
      console.error('Failed to delete pair:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePair = async (oldPair: string, newPairValue: string) => {
    if (!newPairValue.trim()) return;
    
    const upperPair = newPairValue.trim().toUpperCase();
    if (pairs.includes(upperPair) && upperPair !== oldPair) {
      alert('This pair already exists');
      return;
    }
    
    setIsLoading(true);
    try {
      const updatedPairs = pairs.map(p => p === oldPair ? upperPair : p);
      await apiService.settings.updatePairs(updatedPairs);
      setPairs(updatedPairs);
      setEditingId(null);
      setEditingValue('');
    } catch (error) {
      console.error('Failed to update pair:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedMasters = {
    strategy: masters.filter(m => m.type === 'strategy'),
    keyLevel: masters.filter(m => m.type === 'keyLevel'),
    session: masters.filter(m => m.type === 'session'),
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage trading masters and pairs"
        icon={SettingsIcon}
        color="pink"
      />

      <CardContainer className="!p-0">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveSection('masters')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeSection === 'masters'
                ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Master Data
          </button>
          <button
            onClick={() => setActiveSection('pairs')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeSection === 'pairs'
                ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Trading Pairs
          </button>
        </div>

        <div className="p-6">
          {activeSection === 'masters' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-pink-50/50 to-purple-50/50 rounded-xl p-4 border border-pink-100/50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Add New Master</h3>
                <div className="flex gap-3">
                  <Select value={newMasterType} onValueChange={(v) => setNewMasterType(v as any)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MASTER_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Enter name..."
                    value={newMasterName}
                    onChange={(e) => setNewMasterName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMaster()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAddMaster} 
                    disabled={!newMasterName.trim() || isLoading}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {MASTER_TYPES.map(type => (
                  <SectionCard
                    key={type.value}
                    title={type.label}
                    subtitle={`${groupedMasters[type.value as keyof typeof groupedMasters].length} items`}
                    color="purple"
                  >
                    <div className="max-h-[300px] overflow-y-auto">
                      {groupedMasters[type.value as keyof typeof groupedMasters].length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No {type.label.toLowerCase()}s yet</p>
                      ) : (
                        <div className="space-y-1">
                          {groupedMasters[type.value as keyof typeof groupedMasters].map(master => (
                            <div
                              key={master.id}
                              className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 group"
                            >
                              <span className="text-sm text-gray-700">{master.name}</span>
                              <button
                                onClick={() => handleDeleteMaster(master.id)}
                                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'pairs' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-5 h-5 text-pink-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Manage Trading Pairs</h3>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Add or remove trading pairs. These pairs will be available in the dropdown for trades and missed trades.
                </p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Enter pair (e.g., EURUSD)..."
                    value={newPair}
                    onChange={(e) => setNewPair(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPair()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAddPair} 
                    disabled={!newPair.trim() || isLoading}
                    className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Pair
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {pairs.length === 0 ? (
                  <div className="col-span-4 text-center py-8 text-gray-400">
                    No pairs configured yet. Add your first pair above.
                  </div>
                ) : (
                  pairs.map((pair, index) => (
                    <div
                      key={pair}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow group"
                    >
                      {editingId === pair ? (
                        <div className="space-y-2">
                          <Input
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdatePair(pair, editingValue);
                              if (e.key === 'Escape') {
                                setEditingId(null);
                                setEditingValue('');
                              }
                            }}
                            className="text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdatePair(pair, editingValue)}
                              className="flex-1 p-1 bg-green-100 text-green-600 rounded text-xs hover:bg-green-200"
                            >
                              <Check className="w-3 h-3 mx-auto" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditingValue('');
                              }}
                              className="flex-1 p-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                            >
                              <X className="w-3 h-3 mx-auto" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">{pair}</span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingId(pair);
                                setEditingValue(pair);
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePair(pair)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </CardContainer>
    </div>
  );
}
