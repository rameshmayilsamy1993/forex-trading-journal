import { useState, useEffect, useMemo, useRef } from 'react';
import { Filter, Calendar, X, ZoomIn, Search, ChevronLeft, ChevronRight, Edit, Eye, Save, Upload, Clock } from 'lucide-react';
import apiService from '../services/apiService';
import { CardContainer, PageHeader } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { cn } from './ui/utils';
import { format, formatDistanceToNow } from 'date-fns';
import ImageViewer from './ImageViewer';
import * as Dialog from '@radix-ui/react-dialog';

const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY'
];

const TIMEFRAMES = ['3MONTH', 'MONTHLY', 'WEEKLY', 'DAILY', 'H4', 'H1'];
const KEY_LEVEL_TYPES = ['PMH', 'PML', 'PWH', 'PWL', 'PDH', 'PDL', 'EQH', 'EQL', 'FVG', 'IFVG', 'Order Block', 'Breaker', 'Custom'];
const CRT_DIRECTIONS = ['Strong Bull CRT', 'Bull CRT', 'No CRT', 'Bear CRT', 'Strong Bear CRT'];
const CRT_STATUSES = ['Waiting', 'Active', 'Continuing', 'Entry Ready', 'Completed', 'Invalidated'];
const CRT_RANGE_RESPECTED = ['Yes', 'No', 'Not Yet Tested'];

const TIMEFRAME_LABELS: Record<string, string> = {
  '3MONTH': '3 Month', MONTHLY: 'Monthly', WEEKLY: 'Weekly', DAILY: 'Daily', H4: '4 Hour', H1: '1 Hour'
};

const TIMEFRAME_COLORS: Record<string, string> = {
  '3MONTH': 'border-rose-400 bg-rose-50',
  MONTHLY: 'border-amber-400 bg-amber-50',
  WEEKLY: 'border-blue-400 bg-blue-50',
  DAILY: 'border-green-400 bg-green-50',
  H4: 'border-purple-400 bg-purple-50',
  H1: 'border-cyan-400 bg-cyan-50'
};

const DIRECTION_COLORS: Record<string, string> = {
  'Strong Bull CRT': 'bg-emerald-900 text-white',
  'Bull CRT': 'bg-green-600 text-white',
  'No CRT': 'bg-slate-400 text-white',
  'Bear CRT': 'bg-red-600 text-white',
  'Strong Bear CRT': 'bg-red-900 text-white'
};

const STATUS_COLORS: Record<string, string> = {
  'Waiting': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Active': 'bg-blue-100 text-blue-700 border-blue-200',
  'Continuing': 'bg-teal-100 text-teal-700 border-teal-200',
  'Entry Ready': 'bg-purple-100 text-purple-700 border-purple-200',
  'Completed': 'bg-green-100 text-green-700 border-green-200',
  'Invalidated': 'bg-red-100 text-red-700 border-red-200'
};

interface CRTEventData {
  id: string;
  pair: string;
  timeframe: string;
  date: string;
  time: string;
  keyLevelExists: boolean;
  keyLevelType: string;
  customKeyLevel: string;
  crtPlaying: boolean;
  crtDirection: string;
  crtStatus: string;
  crtRangeRespected: string;
  imagePath: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  statusHistory?: { status: string; date: string }[];
}

interface CRTDataResponse {
  events: CRTEventData[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

interface SummaryData {
  activeCount: number;
  entryReadyCount: number;
  completedCount: number;
  invalidatedCount: number;
  mostRecentCRT: { pair: string; timeframe: string; crtDirection: string; crtStatus: string } | null;
}

export default function CRTHistory() {
  const [pairs, setPairs] = useState<string[]>(PAIRS);
  const [selectedPair, setSelectedPair] = useState<string>('');
  const [events, setEvents] = useState<CRTEventData[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState({ timeframe: '', direction: '', status: '', dateFrom: '', dateTo: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; label: string }[]>([]);

  const [editingEvent, setEditingEvent] = useState<CRTEventData | null>(null);
  const [viewingEvent, setViewingEvent] = useState<CRTEventData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { loadPairs(); }, []);

  useEffect(() => {
    if (selectedPair) { loadEvents(); loadSummary(); }
  }, [selectedPair, page]);

  const loadPairs = async () => {
    try {
      const pairsData = await apiService.settings.getPairs();
      if (pairsData && pairsData.length > 0) { setPairs(pairsData); setSelectedPair(pairsData[0]); }
    } catch (error) { console.error('Failed to load pairs:', error); }
  };

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const res: CRTDataResponse = await apiService.crtEvents.getAll({
        pair: selectedPair, timeframe: filters.timeframe || undefined,
        direction: filters.direction || undefined, status: filters.status || undefined,
        dateFrom: filters.dateFrom || undefined, dateTo: filters.dateTo || undefined,
        search: filters.search || undefined, page, limit: 20,
      });
      setEvents(res.events || []);
      setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) { console.error('Failed to load CRT events:', error); }
    finally { setIsLoading(false); }
  };

  const loadSummary = async () => {
    try { const data: SummaryData = await apiService.crtEvents.getSummary({ pair: selectedPair }); setSummary(data); }
    catch (error) { console.error('Failed to load summary:', error); }
  };

  const handleFilter = () => { setPage(1); };
  const clearFilters = () => { setFilters({ timeframe: '', direction: '', status: '', dateFrom: '', dateTo: '', search: '' }); setPage(1); };

  const latestPerTimeframe = useMemo(() => {
    const map = new Map<string, CRTEventData>();
    events.forEach(e => {
      const existing = map.get(e.timeframe);
      if (!existing || new Date(e.updatedAt || e.createdAt) > new Date(existing.updatedAt || existing.createdAt)) {
        map.set(e.timeframe, e);
      }
    });
    return map;
  }, [events]);

  const getKeyLevelDisplay = (e: CRTEventData) => {
    if (!e.keyLevelExists) return 'None';
    if (e.keyLevelType === 'Custom' && e.customKeyLevel) return e.customKeyLevel;
    return e.keyLevelType || 'Key Level';
  };

  const handleEditSave = async (id: string, data: Partial<CRTEventData>) => {
    if (!id) { console.error('handleEditSave called without id'); alert('No CRT record selected for update.'); return; }
    if (!data.crtDirection || !data.crtStatus) { alert('CRT Direction and Status are required'); return; }
    setIsSaving(true);
    try {
      await apiService.crtEvents.update(id, data);
      setEditingEvent(null);
      loadEvents();
      loadSummary();
    } catch (error: any) { alert(error.message || 'Failed to update'); }
    finally { setIsSaving(false); }
  };

  const getTimeAgo = (dateStr: string) => {
    try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); }
    catch { return ''; }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader title="CRT History" subtitle="CRT Command Center - Monitor and review CRT opportunities" />

      {/* Summary Section */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryWidget label="Active CRT" value={summary.activeCount} color="text-blue-600" />
          <SummaryWidget label="Entry Ready" value={summary.entryReadyCount} color="text-purple-600" />
          <SummaryWidget label="Completed" value={summary.completedCount} color="text-green-600" />
          <SummaryWidget label="Invalidated" value={summary.invalidatedCount} color="text-red-600" />
          <CardContainer>
            <div className="text-center">
              <div className="text-xs text-slate-500">Most Recent CRT</div>
              {summary.mostRecentCRT ? (
                <div className="mt-1">
                  <div className="text-sm font-semibold">{summary.mostRecentCRT.pair}</div>
                  <div className="text-xs text-slate-400">{TIMEFRAME_LABELS[summary.mostRecentCRT.timeframe] || summary.mostRecentCRT.timeframe}</div>
                </div>
              ) : (
                <div className="text-sm text-slate-400 mt-1">None</div>
              )}
            </div>
          </CardContainer>
        </div>
      )}

      {/* CRT Command Center Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">CRT COMMAND CENTER</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {TIMEFRAMES.map(tf => {
            const entry = latestPerTimeframe.get(tf);
            return (
              <div key={tf} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <div className={cn('px-3 py-1.5 rounded-full text-xs font-semibold inline-block mb-3 shadow-sm', TIMEFRAME_COLORS[tf])}>
                  {TIMEFRAME_LABELS[tf]}
                </div>
                {entry ? (
                  <div className="space-y-2">
                    <div className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold text-center shadow-sm', DIRECTION_COLORS[entry.crtDirection] || 'bg-slate-100 text-slate-600')}>
                      {entry.crtDirection}
                    </div>
                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5">
                      <span className="font-semibold text-slate-700">Key Level:</span> {getKeyLevelDisplay(entry)}
                    </div>
                    <div className={cn('px-2.5 py-1.5 rounded-lg text-xs font-bold text-center border shadow-sm', STATUS_COLORS[entry.crtStatus] || 'bg-slate-100 text-slate-500')}>
                      {entry.crtStatus}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 rounded-lg px-2 py-1.5">
                      <Clock className="w-3 h-3" />
                      {getTimeAgo(entry.updatedAt || entry.createdAt)}
                    </div>
                    {entry.imagePath && (
                      <img src={entry.imagePath} alt="CRT" className="w-full h-16 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setViewingImage([{ url: entry.imagePath, label: `${TIMEFRAME_LABELS[tf]} CRT` }])} />
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-xl">No data</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <CardContainer>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filters</span>
            {(filters.timeframe || filters.direction || filters.status || filters.dateFrom || filters.dateTo || filters.search) && (
              <button onClick={clearFilters} className="text-xs text-red-600 hover:text-red-800 ml-2">Clear all</button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Pair:</label>
            <select value={selectedPair} onChange={e => { setSelectedPair(e.target.value); }} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
              {pairs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={() => setShowFilters(!showFilters)} className="text-sm text-blue-600 hover:text-blue-800">{showFilters ? 'Hide' : 'More'} Filters</button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Timeframe</label>
              <select value={filters.timeframe} onChange={e => setFilters(p => ({ ...p, timeframe: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="">All</option>
                {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{TIMEFRAME_LABELS[tf]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">CRT Direction</label>
              <select value={filters.direction} onChange={e => setFilters(p => ({ ...p, direction: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="">All</option>
                {CRT_DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Status</label>
              <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm">
                <option value="">All</option>
                {CRT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Date From</label>
              <input type="date" value={filters.dateFrom} onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Date To</label>
              <input type="date" value={filters.dateTo} onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Search</label>
              <div className="relative">
                <input type="text" value={filters.search} placeholder="Notes, key level..." onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} className="modern-input w-full px-2 py-1.5 pr-8 text-sm" />
                <Search className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={handleFilter} className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5"><Filter className="w-4 h-4" /> Apply</button>
          <button onClick={loadEvents} className="flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 rounded-xl border border-slate-200 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"><Calendar className="w-4 h-4" /> Refresh</button>
        </div>
      </CardContainer>

      {/* Table */}
      {isLoading ? <LoadingSpinner /> : (
        <CardContainer>
          {events.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No CRT events found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Timeframe</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">CRT Direction</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Key Level</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Range Respected</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Screenshot</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Created</th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((event, idx) => (
                      <tr key={event.id || idx} className="group hover:bg-slate-50/70 transition-all duration-150">
                        <td className="py-3 px-3">
                          <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm', TIMEFRAME_COLORS[event.timeframe])}>{TIMEFRAME_LABELS[event.timeframe] || event.timeframe}</span>
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-700">
                          {event.date?.split('T')[0]}{event.time && <span className="text-xs text-slate-400 ml-1 font-mono">{event.time}</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold inline-block shadow-sm', DIRECTION_COLORS[event.crtDirection] || 'bg-slate-100 text-slate-600')}>{event.crtDirection}</span>
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-700 max-w-[120px] truncate font-medium" title={getKeyLevelDisplay(event)}>{getKeyLevelDisplay(event)}</td>
                        <td className="py-3 px-3">
                          <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold inline-block border shadow-sm', STATUS_COLORS[event.crtStatus] || 'bg-slate-100 text-slate-500')}>{event.crtStatus}</span>
                        </td>
                        <td className="py-3 px-3 text-sm font-medium text-slate-700">{event.crtRangeRespected}</td>
                        <td className="py-3 px-3">
                          {event.imagePath ? (
                            <img src={event.imagePath} alt="CRT" className="w-10 h-10 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-80 hover:shadow-md transition-all duration-200"
                              onClick={() => setViewingImage([{ url: event.imagePath, label: `${TIMEFRAME_LABELS[event.timeframe]} CRT` }])} />
                          ) : <span className="text-xs text-slate-300">--</span>}
                        </td>
                        <td className="py-3 px-3 text-sm text-slate-500 max-w-[150px] truncate group-hover:text-slate-700 transition-colors" title={event.notes}>{event.notes || <span className="text-slate-300">--</span>}</td>
                        <td className="py-3 px-3 text-xs text-slate-400">{format(new Date(event.createdAt), 'MMM dd, yyyy')}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setEditingEvent(event)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-150 hover:scale-105" title="Edit"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => setViewingEvent(event)} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-150 hover:scale-105" title="View"><Eye className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <div className="text-sm text-slate-500">Page {pagination.page} of {pagination.pages} ({pagination.total} total)</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 transition-all duration-200"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages} className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 transition-all duration-200"><ChevronRight className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContainer>
      )}

      {/* Edit Modal */}
      <Dialog.Root open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
            <Dialog.Title className="sr-only">Edit CRT Event</Dialog.Title>
            <Dialog.Description className="sr-only">Edit CRT event details including key level, direction, status, and screenshot</Dialog.Description>
            {editingEvent && (
              <EditCRTModal
                event={editingEvent}
                onSave={handleEditSave}
                onClose={() => setEditingEvent(null)}
                isSaving={isSaving}
                onViewImage={setViewingImage}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* View Modal */}
      <Dialog.Root open={!!viewingEvent} onOpenChange={(open) => !open && setViewingEvent(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
            <Dialog.Title className="sr-only">View CRT Event</Dialog.Title>
            <Dialog.Description className="sr-only">View CRT event details including key level, direction, status, and history</Dialog.Description>
            {viewingEvent && (
              <ViewCRTModal
                event={viewingEvent}
                onClose={() => setViewingEvent(null)}
                onViewImage={setViewingImage}
              />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {viewingImage.length > 0 && (
        <ImageViewer images={viewingImage} initialIndex={0} onClose={() => setViewingImage([])} />
      )}
    </div>
  );
}

function SummaryWidget({ label, value, color }: { label: string; value: number; color: string }) {
  const iconColor = color === 'text-blue-600' ? 'bg-blue-50 text-blue-600' : color === 'text-purple-600' ? 'bg-purple-50 text-purple-600' : color === 'text-green-600' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600';
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={cn('p-2 rounded-xl', iconColor)}>
          <div className={cn('w-4 h-4 rounded-full', color.replace('text-', 'bg-').replace('-600', '-500'))} />
        </div>
      </div>
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
    </div>
  );
}

// ---- Edit Modal ----
function EditCRTModal({ event, onSave, onClose, isSaving, onViewImage }: {
  event: CRTEventData;
  onSave: (id: string, data: Partial<CRTEventData>) => void;
  onClose: () => void;
  isSaving: boolean;
  onViewImage: (images: { url: string; label: string }[]) => void;
}) {
  const [keyLevelExists, setKeyLevelExists] = useState(event.keyLevelExists);
  const [keyLevelType, setKeyLevelType] = useState(event.keyLevelType);
  const [customKeyLevel, setCustomKeyLevel] = useState(event.customKeyLevel);
  const [crtPlaying, setCrtPlaying] = useState(event.crtPlaying);
  const [crtDirection, setCrtDirection] = useState(event.crtDirection);
  const [crtStatus, setCrtStatus] = useState(event.crtStatus);
  const [crtRangeRespected, setCrtRangeRespected] = useState(event.crtRangeRespected);
  const [imagePath, setImagePath] = useState(event.imagePath);
  const [notes, setNotes] = useState(event.notes);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const result: any = await apiService.upload.single(file);
      setImagePath(result.url || result.secure_url);
    } catch (error) { alert('Upload failed'); }
    finally { setUploading(false); }
  };

  const handleSubmit = () => {
    if (!crtDirection) { alert('CRT Direction is required'); return; }
    if (!crtStatus) { alert('CRT Status is required'); return; }
    onSave(event.id, {
      keyLevelExists, keyLevelType, customKeyLevel,
      crtPlaying, crtDirection, crtStatus, crtRangeRespected,
      imagePath, notes
    });
  };

  const tf = event.timeframe;
  return (
    <div>
      <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-white">
        <div className="flex items-center gap-2">
          <span className={cn('px-3 py-1 rounded-full text-sm font-semibold shadow-sm', TIMEFRAME_COLORS[tf])}>{TIMEFRAME_LABELS[tf] || tf}</span>
          <span className="text-sm font-bold text-slate-800">{event.pair}</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input type="date" value={event.date?.split('T')[0]} disabled className="modern-input w-full px-3 py-2 text-sm bg-slate-50 text-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time</label>
            <input type="time" value={event.time} disabled className="modern-input w-full px-3 py-2 text-sm bg-slate-50 text-slate-500" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Does Key Level Exist?</label>
          <div className="flex gap-2">
            <button onClick={() => { setKeyLevelExists(true); }} className={cn('px-4 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors', keyLevelExists ? 'bg-blue-100 border-blue-300 text-blue-700' : 'border-slate-200 hover:border-slate-300')}>Yes</button>
            <button onClick={() => { setKeyLevelExists(false); setKeyLevelType(''); setCustomKeyLevel(''); }} className={cn('px-4 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors', !keyLevelExists ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 hover:border-slate-300')}>No</button>
          </div>
        </div>

        {keyLevelExists && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Key Level Type</label>
            <select value={keyLevelType} onChange={e => setKeyLevelType(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm">
              <option value="">Select type...</option>
              {KEY_LEVEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {keyLevelType === 'Custom' && (
              <input type="text" value={customKeyLevel} placeholder="Enter custom key level..." onChange={e => setCustomKeyLevel(e.target.value)} className="w-full mt-2 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Is CRT Playing?</label>
          <div className="flex gap-2">
            <button onClick={() => setCrtPlaying(true)} className={cn('px-4 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors', crtPlaying ? 'bg-green-100 border-green-300 text-green-700' : 'border-slate-200 hover:border-slate-300')}>Yes</button>
            <button onClick={() => setCrtPlaying(false)} className={cn('px-4 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors', !crtPlaying ? 'bg-slate-100 border-slate-300 text-slate-700' : 'border-slate-200 hover:border-slate-300')}>No</button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">CRT Direction</label>
          <div className="flex flex-wrap gap-1.5">
            {CRT_DIRECTIONS.map(dir => (
              <button key={dir} onClick={() => setCrtDirection(dir)}
                className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors',
                  crtDirection === dir ? (DIRECTION_COLORS[dir] || 'bg-slate-800 text-white') : 'border-slate-200 hover:border-slate-300')}>
                {dir}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">CRT Status</label>
          <div className="flex flex-wrap gap-1.5">
            {CRT_STATUSES.map(st => (
              <button key={st} onClick={() => setCrtStatus(st)}
                className={cn('px-3 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors',
                  crtStatus === st ? (STATUS_COLORS[st] || 'bg-blue-100 text-blue-700 border-blue-200') : 'border-slate-200 hover:border-slate-300')}>
                {st}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">CRT Range Respected</label>
          <div className="flex gap-2">
            {CRT_RANGE_RESPECTED.map(r => (
              <button key={r} onClick={() => setCrtRangeRespected(r)}
                className={cn('px-4 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors',
                  crtRangeRespected === r ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'border-slate-200 hover:border-slate-300')}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Screenshot</label>
          <div className="flex items-start gap-3">
            <div onClick={() => fileRef.current?.click()} className={cn('border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors text-center hover:border-blue-400 hover:bg-blue-50/50', imagePath ? 'border-green-300 bg-green-50/30' : 'border-slate-300')}
              onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f); }}>
              <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
              {uploading ? (
                <div className="flex items-center gap-2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" /><span className="text-xs text-slate-500">Uploading...</span></div>
              ) : (
                <div className="flex items-center gap-2"><Upload className="w-4 h-4 text-blue-600" /><span className="text-xs text-slate-600">Upload</span></div>
              )}
            </div>
            {imagePath && (
              <div className="relative group shrink-0">
                <img src={imagePath} alt="CRT" className="w-20 h-20 object-cover rounded-lg border border-slate-200 cursor-pointer"
                  onClick={() => onViewImage([{ url: imagePath, label: `${TIMEFRAME_LABELS[tf]} CRT` }])} />
                <button onClick={() => setImagePath('')} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600"><X className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Strategy comments, observations..." rows={3} className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none" />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50/50 rounded-b-2xl">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition-all duration-200">Cancel</button>
        <button onClick={handleSubmit} disabled={isSaving} className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-sm font-semibold hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-500/25 disabled:opacity-50 transition-all duration-200 hover:-translate-y-0.5">
          <Save className="w-4 h-4" />{isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ---- View Modal ----
function ViewCRTModal({ event, onClose, onViewImage }: {
  event: CRTEventData;
  onClose: () => void;
  onViewImage: (images: { url: string; label: string }[]) => void;
}) {
  const tf = event.timeframe;
  return (
    <div>
      <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center gap-2">
          <span className={cn('px-3 py-1 rounded-full text-sm font-semibold shadow-sm', TIMEFRAME_COLORS[tf])}>{TIMEFRAME_LABELS[tf] || tf}</span>
          <span className="text-sm font-bold text-slate-800">{event.pair}</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-xl transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date" value={event.date?.split('T')[0]} />
          <Field label="Time" value={event.time || '--'} />
        </div>

        <Field label="CRT Direction" value={event.crtDirection} badge={DIRECTION_COLORS[event.crtDirection]} />
        <Field label="CRT Status" value={event.crtStatus} badge={STATUS_COLORS[event.crtStatus]} />
        <Field label="Key Level Exists" value={event.keyLevelExists ? 'Yes' : 'No'} />
        {event.keyLevelExists && <Field label="Key Level Type" value={event.keyLevelType === 'Custom' ? event.customKeyLevel : event.keyLevelType} />}
        <Field label="CRT Playing" value={event.crtPlaying ? 'Yes' : 'No'} />
        <Field label="CRT Range Respected" value={event.crtRangeRespected} />

        {event.imagePath && (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Screenshot</label>
            <img src={event.imagePath} alt="CRT" className="w-full max-h-48 object-cover rounded-lg border border-slate-200 cursor-pointer"
              onClick={() => onViewImage([{ url: event.imagePath, label: `${TIMEFRAME_LABELS[tf]} CRT` }])} />
          </div>
        )}

        {event.notes && <Field label="Notes" value={event.notes} />}

        {/* Status History */}
        {event.statusHistory && event.statusHistory.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <label className="block text-xs font-medium text-slate-500 mb-2">Status History</label>
            <div className="space-y-1.5">
              {event.statusHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-100">
                  <span className={cn('px-2.5 py-0.5 rounded-lg text-xs font-bold border shadow-sm', STATUS_COLORS[h.status] || 'bg-slate-100 text-slate-500')}>{h.status}</span>
                  <span className="text-slate-400 font-mono">{format(new Date(h.date), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Created: {format(new Date(event.createdAt), 'MMM dd, yyyy HH:mm')}</span>
            <span>Updated: {format(new Date(event.updatedAt), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
      <label className="block text-xs font-medium text-slate-500 mb-0.5">{label}</label>
      {badge ? (
        <span className={cn('px-2.5 py-1 rounded-lg text-xs font-bold inline-block shadow-sm', badge)}>{value}</span>
      ) : (
        <p className="text-sm font-semibold text-slate-800">{value || '--'}</p>
      )}
    </div>
  );
}
