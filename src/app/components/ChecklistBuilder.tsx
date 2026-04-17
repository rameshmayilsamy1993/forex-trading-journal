import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ChecklistItem } from '../types/trading';
import { cn } from './ui/utils';
import { Button } from './ui/button';

interface ChecklistBuilderProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  className?: string;
}

export default function ChecklistBuilder({ items, onChange, className }: ChecklistBuilderProps) {
  const addItem = () => {
    const newItem: ChecklistItem = {
      label: '',
      required: false,
      order: items.length + 1
    };
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<ChecklistItem>) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;
    
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    newItems.forEach((item, i) => {
      item.order = i + 1;
    });
    
    onChange(newItems);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold text-slate-700">
          Checklist Items
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addItem}
          className="flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
          <p className="text-slate-500">No checklist items yet</p>
          <p className="text-sm text-slate-400">Click "Add Item" to create your first checklist item</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
          >
            <div className="flex-1">
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(index, { label: e.target.value })}
                placeholder="Enter checklist item label..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.required}
                  onChange={(e) => updateItem(index, { required: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600">Required</span>
              </label>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                  className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === items.length - 1}
                  className="p-1.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ↓
                </button>
              </div>

              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <p className="text-xs text-slate-500">
          {items.filter(i => i.required).length} required, {items.filter(i => !i.required).length} optional
        </p>
      )}
    </div>
  );
}
