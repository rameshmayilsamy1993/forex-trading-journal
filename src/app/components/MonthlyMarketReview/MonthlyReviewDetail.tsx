import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Plus, Calendar, Image, FileText, Clock, TrendingUp, TrendingDown, Minus, PieChart, BarChart3, Target, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import apiService from '../../services/apiService';
import TimelineEntry from './TimelineEntry';
import ImageGallery from './ImageGallery';
import AddEntryDialog from './AddEntryDialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const biasVariant: Record<string, 'success' | 'destructive' | 'secondary' | 'default'> = {
  Bullish: 'success',
  Bearish: 'destructive',
  Neutral: 'secondary',
};

const statCards = [
  { label: 'Created', key: 'createdAt', icon: Calendar, gradient: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
  { label: 'Updated', key: 'updatedAt', icon: Clock, gradient: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-500/20' },
  { label: 'Entries', key: 'entries', icon: FileText, gradient: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
  { label: 'Images', key: 'images', icon: Image, gradient: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20' },
  { label: 'Notes', key: 'notes', icon: PieChart, gradient: 'from-pink-500 to-pink-600', shadow: 'shadow-pink-500/20' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 24 },
  },
};

const statItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 260, damping: 24, delay: i * 0.06 },
  }),
};

const BiasIcon = ({ bias }: { bias: string }) => {
  if (bias === 'Bullish') return <TrendingUp className="size-5" />;
  if (bias === 'Bearish') return <TrendingDown className="size-5" />;
  return <Minus className="size-5" />;
};

export default function MonthlyReviewDetail() {
  const [review, setReview] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);

  const reviewId = (window as any).__monthlyReviewId;

  const loadReview = async () => {
    const data = await apiService.monthlyReviews.getById(reviewId);
    setReview(data);
  };

  const loadEntries = async () => {
    const data = await apiService.monthlyReviews.getEntries(reviewId);
    setEntries(data);
  };

  const loadData = async () => {
    if (!reviewId) return;
    setIsLoading(true);
    try {
      await Promise.all([loadReview(), loadEntries()]);
    } catch (error) {
      console.error('Failed to load review:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reviewId]);

  const handleBack = () => {
    (window as any).__monthlyReviewId = null;
    window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: 'monthly-review' }));
  };

  const handleDeleteEntry = async (entry: any) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await apiService.monthlyReviews.deleteEntry(reviewId, entry.id);
      await loadEntries();
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  };

  const handleEditEntry = (entry: any) => {
    setEditEntry(entry);
    setAddEntryOpen(true);
  };

  const handleAddEntry = () => {
    setEditEntry(null);
    setAddEntryOpen(true);
  };

  const allImages = useMemo(() => {
    return entries.flatMap(entry => entry.images || []);
  }, [entries]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [entries]);

  const imageCount = review?.imageCount ?? allImages.length;
  const noteCount = sortedEntries.filter(e => e.comment).length;

  if (!reviewId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No review selected
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-[220px] w-full rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const statValues = {
    createdAt: format(new Date(review.createdAt), 'MMM dd, yyyy'),
    updatedAt: format(new Date(review.updatedAt), 'MMM dd, yyyy'),
    entries: entries.length,
    images: imageCount,
    notes: noteCount,
  };

  return (
    <div className="relative min-h-screen pb-32">
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 size-[500px] bg-gradient-to-br from-purple-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-32 size-[400px] bg-gradient-to-br from-blue-100/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-[350px] bg-gradient-to-br from-pink-100/30 to-transparent rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="px-6 pt-6 pb-4 max-w-6xl mx-auto"
      >
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-body-sm text-[#64748B] hover:text-[#0F172A] transition-colors group"
        >
          <div className="size-7 rounded-lg bg-white border border-[#E5EAF2] flex items-center justify-center group-hover:border-[#7C3AED] group-hover:bg-purple-50 transition-all duration-200">
            <ArrowLeft className="size-3.5" />
          </div>
          Back to Reviews
        </button>
      </motion.div>

      <div className="px-6 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="relative h-[220px] rounded-3xl bg-gradient-to-br from-[#7C3AED] via-[#6D28D9] to-[#4F46E5] overflow-hidden mb-8"
        >
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 size-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/4 size-48 bg-white/5 rounded-full translate-y-1/3" />
            <div className="absolute top-1/2 right-1/3 size-32 bg-white/5 rounded-full" />
            <svg className="absolute bottom-6 right-8 opacity-20" width="180" height="60" viewBox="0 0 180 60" fill="none">
              <path d="M0 30 L20 40 L40 15 L60 35 L80 10 L100 30 L120 25 L140 45 L160 20 L180 35" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M0 30 L20 40 L40 15 L60 35 L80 10 L100 30 L120 25 L140 45 L160 20 L180 35" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.2" />
              <circle cx="80" cy="10" r="4" fill="white" opacity="0.8" />
              <circle cx="40" cy="15" r="3" fill="white" opacity="0.5" />
              <circle cx="160" cy="20" r="3" fill="white" opacity="0.5" />
            </svg>
          </div>

          <div className="relative h-full flex flex-col justify-center px-8 md:px-12">
            <div className="flex items-center gap-4 mb-3">
              <h1 className="text-[2rem] md:text-[2.5rem] font-bold text-white tracking-tight">
                {review.pair}
              </h1>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm">
                <Calendar className="size-3.5 text-purple-200" />
                <span className="text-sm font-medium text-white/90">
                  {MONTH_NAMES[review.month - 1]} {review.year}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {review.bias && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium">
                  <BiasIcon bias={review.bias} />
                  {review.bias}
                </div>
              )}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 text-white/80 text-sm">
                <BarChart3 className="size-3.5" />
                Monthly Market Review
              </div>
            </div>
            <div className="sm:hidden flex items-center gap-2 mt-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-sm">
                <Calendar className="size-3 text-purple-200" />
                <span className="text-xs font-medium text-white/90">
                  {MONTH_NAMES[review.month - 1]} {review.year}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-6 max-w-6xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-10"
        >
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            const value = statValues[stat.key as keyof typeof statValues];
            return (
              <motion.div
                key={stat.key}
                custom={i}
                variants={statItemVariants}
                whileHover={{ y: -3, transition: { type: 'spring', stiffness: 300, damping: 20 } }}
                className="bg-white rounded-2xl border border-[#E5EAF2] p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className={`size-9 rounded-xl bg-gradient-to-br ${stat.gradient} ${stat.shadow} flex items-center justify-center mb-3`}>
                  <Icon className="size-4 text-white" />
                </div>
                <p className="text-caption text-[#94A3B8] mb-0.5">{stat.label}</p>
                <p className="text-body font-bold text-[#0F172A]">
                  {typeof value === 'number' ? value : value}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div className="px-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          {review.summary && (
            <motion.section
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              <h2 className="text-section-title font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <Target className="size-5 text-[#7C3AED]" />
                Monthly Summary
              </h2>
              <div className="relative bg-white rounded-2xl border border-[#E2E8F0] shadow-lg shadow-purple-500/5 p-6">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-50/50 via-transparent to-blue-50/50 pointer-events-none" />
                <div
                  className="relative prose prose-sm max-w-none text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: review.summary }}
                />
              </div>
            </motion.section>
          )}

          <motion.section
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-section-title font-bold text-[#0F172A] flex items-center gap-2">
                <Layers className="size-5 text-[#7C3AED]" />
                Timeline
              </h2>
              <Button
                onClick={handleAddEntry}
                className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 rounded-xl h-9 px-4 gap-1.5"
              >
                <Plus className="size-4" />
                Add Entry
              </Button>
            </div>

            {sortedEntries.length > 0 ? (
              <div>
                {sortedEntries.map(entry => (
                  <TimelineEntry
                    key={entry.id}
                    entry={entry}
                    onEdit={handleEditEntry}
                    onDelete={handleDeleteEntry}
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-[#E5EAF2] bg-white/40"
              >
                <div className="size-16 rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center mb-5">
                  <Clock className="size-8 text-[#7C3AED]/40" />
                </div>
                <p className="text-body font-medium text-[#64748B]">No timeline entries yet</p>
                <p className="text-caption text-[#94A3B8] mt-1 mb-6">Document your monthly market observations</p>
                <Button
                  onClick={handleAddEntry}
                  className="bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] text-white shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 rounded-xl"
                >
                  <Plus className="size-4" />
                  Create First Entry
                </Button>
              </motion.div>
            )}
          </motion.section>

          {allImages.length > 0 && (
            <motion.section
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              <h2 className="text-section-title font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <Image className="size-5 text-[#7C3AED]" />
                Image Gallery
              </h2>
              <ImageGallery images={allImages} />
            </motion.section>
          )}

          {sortedEntries.length > 0 && (
            <motion.section
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              <h2 className="text-section-title font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                <FileText className="size-5 text-[#7C3AED]" />
                Trading Notes
              </h2>
              <div className="space-y-4">
                {sortedEntries.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.05, type: 'spring', stiffness: 260, damping: 24 }}
                    className="relative bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b from-[#7C3AED] to-[#4F46E5]" />
                    <div className="pl-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-heading font-semibold text-[#0F172A]">
                          {entry.entryTitle}
                        </h3>
                        <span className="text-caption text-[#94A3B8] shrink-0 ml-4">
                          {format(new Date(entry.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                      {entry.comment && (
                        <div
                          className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: entry.comment }}
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-28 space-y-6">
            {review.bias && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm"
              >
                <h3 className="text-body-sm font-semibold text-[#64748B] uppercase tracking-wider mb-4">
                  Market Bias
                </h3>
                <div className="flex items-center gap-3">
                  <div className={`size-12 rounded-xl flex items-center justify-center ${
                    review.bias === 'Bullish' ? 'bg-emerald-100 text-emerald-600' :
                    review.bias === 'Bearish' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <BiasIcon bias={review.bias} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-[#0F172A]">{review.bias}</p>
                    <p className="text-caption text-[#94A3B8]">
                      {review.bias === 'Bullish' ? 'Positive outlook' :
                       review.bias === 'Bearish' ? 'Negative outlook' :
                       'Neutral stance'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm"
            >
              <h3 className="text-body-sm font-semibold text-[#64748B] uppercase tracking-wider mb-4">
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                  <span className="text-body-sm text-[#64748B]">Total Entries</span>
                  <span className="text-body font-bold text-[#0F172A]">{entries.length}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                  <span className="text-body-sm text-[#64748B]">Total Images</span>
                  <span className="text-body font-bold text-[#0F172A]">{imageCount}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                  <span className="text-body-sm text-[#64748B]">Entries with Notes</span>
                  <span className="text-body font-bold text-[#0F172A]">{noteCount}</span>
                </div>
                {sortedEntries.length > 0 && (
                  <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                    <span className="text-body-sm text-[#64748B]">Latest Entry</span>
                    <span className="text-body-sm font-medium text-[#0F172A]">
                      {format(new Date(sortedEntries[0].createdAt), 'MMM dd')}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {allImages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border border-[#E5EAF2] p-5 shadow-sm"
              >
                <h3 className="text-body-sm font-semibold text-[#64748B] uppercase tracking-wider mb-4">
                  Recent Images
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {allImages.slice(0, 6).map((img, i) => (
                    <div
                      key={img.url || `recent-img-${i}`}
                      className="aspect-square rounded-xl overflow-hidden bg-[#F8FAFC] border border-[#E5EAF2]"
                    >
                      <img
                        src={img.url}
                        alt={img.caption || ''}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
                {allImages.length > 6 && (
                  <p className="text-caption text-[#94A3B8] mt-3 text-center">
                    +{allImages.length - 6} more images
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.5 }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleAddEntry}
        className="fixed bottom-6 right-6 size-14 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4F46E5] text-white shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 flex items-center justify-center z-40"
      >
        <Plus className="size-6" />
      </motion.button>

      <AddEntryDialog
        open={addEntryOpen}
        onOpenChange={setAddEntryOpen}
        onSaved={loadData}
        reviewId={reviewId}
        editEntry={editEntry}
      />
    </div>
  );
}
