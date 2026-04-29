import { useState, useEffect } from 'react';
import { Filter, Calendar, X, ZoomIn, ExternalLink, CheckSquare, XSquare } from 'lucide-react';
import apiService from '../services/apiService';
import { CardContainer, PageHeader } from './ui/DesignSystem';
import { LoadingSpinner } from './ui/Loading';
import { cn } from './ui/utils';
import { format } from 'date-fns';

const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURGBP', 'EURJPY', 'GBPJPY'
];

const TIMEFRAME_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  WEEKLY: 'Weekly',
  DAILY: 'Daily',
  H4: 'H4'
};

const TIMEFRAME_COLORS: Record<string, string> = {
  MONTHLY: 'border-amber-400 bg-amber-50',
  WEEKLY: 'border-blue-400 bg-blue-50',
  DAILY: 'border-green-400 bg-green-50',
  H4: 'border-purple-400 bg-purple-50'
};

const REACTION_COLORS: Record<string, string> = {
  RESPECT: 'bg-green-100 text-green-700 border-green-200',
  PARTIAL: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
  NA: 'bg-slate-100 text-slate-500 border-slate-200'
};

const TIMEFRAME_ORDER = ['MONTHLY', 'WEEKLY', 'DAILY', 'H4'] as const;

interface CRTEventData {
  _id: string;
  pair: string;
  timeframe: string;
  date: string;
  time: string;
  isCRT: boolean;
  reached50: string;
  reaction: string;
  image: string;
  notes: string;
  monthKey: string;
  createdAt: string;
}

export default function CRTHistory() {
  const [pairs, setPairs] = useState<string[]>(PAIRS);
  const [selectedPair, setSelectedPair] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [events, setEvents] = useState<CRTEventData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CRTEventData | null>(null);

  useEffect(() => {
    loadPairs();
  }, []);

  useEffect(() => {
    if (selectedPair) {
      loadEvents();
    }
  }, [selectedPair, selectedMonth]);

  const loadPairs = async () => {
    try {
      const pairsData = await apiService.settings.getPairs();
      if (pairsData && pairsData.length > 0) {
        setPairs(pairsData);
        setSelectedPair(pairsData[0]);
      }
    } catch (error) {
      console.error('Failed to load pairs:', error);
    }
  };

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.crtEvents.getAll({
        pair: selectedPair,
        month: selectedMonth
      });
      setEvents(data);
    } catch (error) {
      console.error('Failed to load CRT events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupedEvents = TIMEFRAME_ORDER.reduce((acc, tf) => {
    acc[tf] = events.filter(e => e.timeframe === tf);
    return acc;
  }, {} as Record<string, CRTEventData[]>);

  const handleDelete = async (id: string) => {
    // Try both _id and id
    const eventId = id || selectedEvent?._id || (selectedEvent as any)?.id;
    console.log('Delete info:', { id, _id: selectedEvent?._id, idField: (selectedEvent as any)?.id, fullSelected: selectedEvent });
    alert('Delete ID: ' + eventId);
    
    if (!eventId) {
      alert('Invalid event - no ID found');
      return;
    }
    
    if (!confirm('Delete this CRT event?')) return;
    
    if (!confirm('Delete this CRT event?')) return;
    
    try {
      await apiService.crtEvents.delete(eventId);
      setEvents(prev => prev.filter(e => (e._id || (e as any).id) !== eventId));
      setSelectedEvent(null);
    } catch (error: any) {
      console.error('Delete failed:', error);
      alert('Failed to delete: ' + (error?.message || 'Unknown error'));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="CRT History"
        subtitle="View all CRT (Candle Range Theory) events"
      />

      <CardContainer>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <label className="text-sm font-medium text-slate-700">Pair:</label>
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg"
            >
              {pairs.map(pair => (
                <option key={pair} value={pair}>{pair}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <label className="text-sm font-medium text-slate-700">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg"
            />
          </div>

          <button
            onClick={loadEvents}
            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            <ZoomIn className="w-4 h-4" />
            Filter
          </button>
        </div>
      </CardContainer>

      {isLoading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Events List */}
          <div className="space-y-4">
            {TIMEFRAME_ORDER.map(tf => (
              <CardContainer key={tf}>
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn('px-3 py-1 rounded-full text-sm font-medium', TIMEFRAME_COLORS[tf])}>
                    {TIMEFRAME_LABELS[tf]}
                  </span>
                  <span className="text-sm text-slate-500">
                    ({groupedEvents[tf].length} {groupedEvents[tf].length === 1 ? 'entry' : 'entries'})
                  </span>
                </div>

                {groupedEvents[tf].length === 0 ? (
                  <p className="text-slate-400 text-sm">No entries</p>
                ) : (
                  <div className="space-y-2">
                    {groupedEvents[tf].map((event, idx) => (
                      <div
                        key={event._id || `${tf}-${idx}`}
                        onClick={() => setSelectedEvent(event)}
                        className={cn(
                          'p-3 border rounded-lg cursor-pointer transition-colors',
                          'border-slate-200 hover:border-slate-300',
                          event.isCRT && 'bg-green-50',
                          selectedEvent?._id === event._id && 'ring-2 ring-blue-500'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {event.date?.split('T')[0]}
                            </span>
                            {event.time && (
                              <span className="text-xs text-slate-500">
                                {event.time}
                              </span>
                            )}
                            {event.isCRT && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                CRT
                              </span>
                            )}
                            {event.isCRT && event.reached50 && event.reached50 !== 'NA' && (
                              <span className={cn(
                                'px-2 py-0.5 text-xs rounded-full flex items-center gap-1',
                                event.reached50 === 'YES' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-red-100 text-red-700'
                              )}>
                                {event.reached50 === 'YES' ? (
                                  <CheckSquare className="w-3 h-3" />
                                ) : (
                                  <XSquare className="w-3 h-3" />
                                )}
                                50%
                              </span>
                            )}
                            {event.isCRT && event.reaction && event.reaction !== 'NA' && (
                              <span className={cn(
                                'px-2 py-0.5 text-xs rounded-full font-medium',
                                REACTION_COLORS[event.reaction]
                              )}>
                                {event.reaction}
                              </span>
                            )}
                          </div>
                          {event.image && (
                            <img 
                              src={event.image} 
                              alt="CRT" 
                              className="w-10 h-10 object-cover rounded border border-slate-200"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(event);
                              }}
                            />
                          )}
                        </div>
                        {event.notes && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {event.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContainer>
            ))}
          </div>

          {/* Details Panel */}
          <div>
            {selectedEvent ? (
              <CardContainer>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'px-3 py-1 rounded-full text-sm font-medium', 
                      TIMEFRAME_COLORS[selectedEvent.timeframe]
                    )}>
                      {TIMEFRAME_LABELS[selectedEvent.timeframe]}
                    </span>
                    {selectedEvent.isCRT && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        CRT Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(selectedEvent._id)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-500">Date</label>
                    <p className="text-sm font-medium">
                      {selectedEvent.date?.split('T')[0]}
                      {selectedEvent.time && ` at ${selectedEvent.time}`}
                    </p>
                  </div>

                  {selectedEvent.isCRT && (
                    <div className="flex flex-wrap gap-3">
                      <div>
                        <label className="text-xs text-slate-500">50% Reached</label>
                        <div className={cn(
                          'mt-1 px-2 py-1 rounded text-sm font-medium flex items-center gap-1',
                          selectedEvent.reached50 === 'YES' 
                            ? 'bg-blue-100 text-blue-700' 
                            : selectedEvent.reached50 === 'NO'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-500'
                        )}>
                          {selectedEvent.reached50 === 'YES' ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : selectedEvent.reached50 === 'NO' ? (
                            <XSquare className="w-4 h-4" />
                          ) : null}
                          {selectedEvent.reached50 === 'YES' ? 'Yes' : selectedEvent.reached50 === 'NO' ? 'No' : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Reaction</label>
                        <div className={cn(
                          'mt-1 px-2 py-1 rounded text-sm font-medium',
                          REACTION_COLORS[selectedEvent.reaction] || 'bg-slate-100 text-slate-500 border-slate-200'
                        )}>
                          {selectedEvent.reaction === 'NA' ? 'N/A' : selectedEvent.reaction}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedEvent.image && (
                    <div>
                      <label className="text-xs text-slate-500">Image</label>
                      <div className="mt-1">
                        <img 
                          src={selectedEvent.image} 
                          alt="CRT" 
                          className="max-w-full rounded-lg border border-slate-200"
                        />
                      </div>
                    </div>
                  )}

                  {selectedEvent.notes && (
                    <div>
                      <label className="text-xs text-slate-500">Notes</label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">
                        {selectedEvent.notes}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-slate-400">
                    Created: {format(new Date(selectedEvent.createdAt), 'MMM dd, yyyy HH:mm')}
                  </div>
                </div>
              </CardContainer>
            ) : (
              <div className="flex items-center justify-center h-64 border border-dashed border-slate-200 rounded-lg">
                <p className="text-slate-400">Select an event to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}