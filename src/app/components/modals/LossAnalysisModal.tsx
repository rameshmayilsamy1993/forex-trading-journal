import LossReasonModal from '../LossReasonModal';

interface LossAnalysisModalProps {
  isOpen: boolean;
  tradeId: string | null;
  tradeData: {
    pair: string; type: string; entryPrice: number; exitPrice: number;
    profit: number; entryDate: string; exitDate: string;
  } | null;
  existingAnalysis: any | null;
  mode: 'add' | 'view';
  onClose: () => void;
  onSaved?: () => void;
}

export default function LossAnalysisModal({ isOpen, tradeId, tradeData, existingAnalysis, mode, onClose, onSaved }: LossAnalysisModalProps) {
  if (!isOpen || !tradeId) return null;
  return (
    <LossReasonModal
      tradeId={tradeId}
      tradeData={tradeData || undefined}
      existingAnalysis={existingAnalysis}
      mode={mode}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
