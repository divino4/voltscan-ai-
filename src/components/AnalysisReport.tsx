import { useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { motion } from 'motion/react';
import { Printer, Download, Save, Share2, FileText, CheckCircle2, Loader2, History } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface AnalysisReportProps {
  report: string;
  onPrint: () => void;
  onSave: () => void;
}

export function AnalysisReport({ report, onPrint, onSave }: AnalysisReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);

    const element = reportRef.current;
    
    // Temporarily add pdf-safe class to the element
    element.classList.add('pdf-safe');

    const opt = {
      margin: 10,
      filename: `Relatorio_Tecnico_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff',
        // This helps bypass some modern CSS parsing issues
        logging: false,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    } as const;

    try {
      await html2pdf().from(element).set(opt).save();
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      alert('Erro ao gerar PDF. Tente usar o botão Imprimir e salvar como PDF.');
    } finally {
      element.classList.remove('pdf-safe');
      setIsExporting(false);
    }
  };

  const handleGenerateAndSave = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    try {
      // 1. Save to Cloud (Firestore)
      await onSave();
      
      // 2. Generate PDF
      await handleExportPDF();
    } catch (err) {
      console.error('Error in combined action:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <FileText className="text-technical-accent" size={24} />
          <h2 className="font-serif italic text-2xl">Relatório de Análise Técnica</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleGenerateAndSave}
            disabled={isExporting}
            className="btn-primary !bg-technical-accent !text-white !border-technical-accent flex items-center gap-2 px-4 py-2 disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span className="text-xs uppercase tracking-wider font-bold">Gerar e Salvar PDF</span>
          </button>
          
          <div className="h-8 w-px bg-technical-line/10 mx-2" />

          <button onClick={onSave} className="p-2 hover:bg-technical-ink/5 transition-colors" title="Apenas Salvar no Histórico">
            <History size={18} />
          </button>
          <button onClick={onPrint} className="p-2 hover:bg-technical-ink/5 transition-colors" title="Imprimir">
            <Printer size={18} />
          </button>
          <button 
            disabled={isExporting}
            onClick={handleExportPDF} 
            className="p-2 hover:bg-technical-ink/5 transition-colors disabled:opacity-50" 
            title="Apenas Baixar PDF"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          </button>
        </div>
      </div>

      <div ref={reportRef} className="card-technical bg-white shadow-sm border-l-4 border-l-technical-accent relative">
        <div className="absolute top-4 right-4 flex items-center gap-2 text-green-600 no-print">
          <CheckCircle2 size={16} />
          <span className="font-mono text-[10px] uppercase tracking-widest font-bold">Verificado por AI</span>
        </div>
        
        <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:italic prose-headings:text-technical-ink prose-p:text-technical-ink/80 prose-code:bg-technical-accent/10 prose-code:px-1 prose-code:rounded">
          <Markdown>{report}</Markdown>
        </div>
      </div>

      <div className="no-print p-4 bg-technical-ink text-technical-bg font-mono text-[10px] uppercase tracking-[0.2em] flex justify-between">
        <span>VoltScan AI Technical Analysis System</span>
        <span>ID: {Math.random().toString(36).substr(2, 9)}</span>
      </div>
    </motion.div>
  );
}
