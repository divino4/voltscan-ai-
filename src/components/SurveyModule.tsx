import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  Plus, 
  Trash2, 
  Printer, 
  FileText, 
  ArrowRight,
  Maximize,
  Box,
  Zap,
  DollarSign
} from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface Room {
  id: string;
  name: string;
  width: number;
  length: number;
  height: number;
  type: 'living' | 'kitchen' | 'bathroom' | 'bedroom' | 'other';
}

interface ClientInfo {
  name: string;
  phone: string;
  address: string;
  installationType: 'monophase' | 'biphase' | 'triphase';
  category: 'residential' | 'industrial';
}

export function SurveyModule() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [client, setClient] = useState<ClientInfo>({
    name: '',
    phone: '',
    address: '',
    installationType: 'monophase',
    category: 'residential'
  });
  const [laborPrice, setLaborPrice] = useState<number>(50);
  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const calculateNBR = (room: Room) => {
    const area = room.width * room.length;
    const perimeter = 2 * (room.width + room.length);
    
    // Iluminação: Mínimo 1 ponto para os primeiros 6m², + 1 para cada 4m² inteiros adicionais
    let lightingPoints = 0;
    if (area > 0) {
      lightingPoints = 1 + Math.floor((area - 6) / 4);
      if (lightingPoints < 1) lightingPoints = 1;
    }

    // Tomadas (TUG): 
    // Cozinhas/Serviço: 1 a cada 3,5m de perímetro
    // Quartos/Salas: 1 a cada 5m de perímetro
    let tugPoints = 0;
    if (perimeter > 0) {
      const divisor = (room.type === 'kitchen' || room.type === 'bathroom') ? 3.5 : 5;
      tugPoints = Math.ceil(perimeter / divisor);
      if (room.type === 'bathroom' && tugPoints < 1) tugPoints = 1;
    }

    return { area, perimeter, lightingPoints, tugPoints };
  };

  const calculateMaterials = () => {
    let totalCabo15 = 0;
    let totalCabo25 = 0;
    let totalCabo40 = 0;
    let totalCabo60 = 0;
    let totalConduite20 = 0; // 3/4"
    let totalConduite25 = 0; // 1"
    let boxes4x2 = 0;
    let boxes4x4 = 0;
    let totalBreakers = 0;

    rooms.forEach(room => {
      const perimeter = 2 * (room.width + room.length);
      const area = room.width * room.length;
      const { lightingPoints, tugPoints } = calculateNBR(room);
      
      totalCabo15 += (perimeter * 1.5) + (room.height * lightingPoints);
      totalCabo25 += (perimeter * 2.2) + (room.height * tugPoints);
      
      totalConduite20 += (perimeter * 0.4) + (lightingPoints * 2);
      totalConduite25 += (area * 0.3) + (tugPoints * 1.5);

      boxes4x2 += tugPoints + lightingPoints;
      boxes4x4 += Math.ceil(lightingPoints / 2); // Pontos de teto
      totalBreakers += 1; // 1 disjuntor por ambiente (simplificado)

      if (room.type === 'bathroom' || room.type === 'kitchen') {
        totalCabo40 += 15; 
        totalBreakers += 1; // Circuito extra
      }
    });

    // Entrada de serviço
    if (client.installationType === 'triphase') totalCabo60 = 30;
    else if (client.installationType === 'biphase') totalCabo60 = 20;
    else totalCabo60 = 10;

    return [
      { name: 'Cabo Flexível 1,5mm² (Vermelho/Azul/Preto)', qty: Math.ceil(totalCabo15), unit: 'm', price: 2.5 },
      { name: 'Cabo Flexível 2,5mm² (Verde/Azul/Preto)', qty: Math.ceil(totalCabo25), unit: 'm', price: 3.8 },
      { name: 'Cabo Flexível 4,0mm² (TUE)', qty: Math.ceil(totalCabo40), unit: 'm', price: 5.5 },
      { name: 'Cabo Flexível 6,0mm² (Entrada)', qty: Math.ceil(totalCabo60), unit: 'm', price: 8.2 },
      { name: 'Eletroduto Corrugado 3/4" (Amarelo)', qty: Math.ceil(totalConduite20), unit: 'm', price: 1.8 },
      { name: 'Eletroduto Corrugado 1" (Laranja)', qty: Math.ceil(totalConduite25), unit: 'm', price: 2.5 },
      { name: 'Caixa de Passagem 4x2', qty: boxes4x2, unit: 'un', price: 1.2 },
      { name: 'Caixa de Passagem 4x4 (Teto)', qty: boxes4x4, unit: 'un', price: 2.5 },
      { name: 'Disjuntor Termomagnético DIN', qty: totalBreakers + 1, unit: 'un', price: 15.0 },
      { name: 'IDR Tetrapolar 40A 30mA', qty: client.installationType === 'triphase' ? 1 : 0, unit: 'un', price: 180.0 },
      { name: 'DPS 275V 20kA', qty: client.installationType === 'triphase' ? 3 : (client.installationType === 'biphase' ? 2 : 1), unit: 'un', price: 45.0 }
    ];
  };

  const materialList = calculateMaterials();
  const totalMaterialCost = materialList.reduce((acc, item) => acc + (item.qty * item.price), 0);

  const addRoom = () => {
    const newRoom: Room = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Novo Ambiente',
      width: 0,
      length: 0,
      height: 2.8,
      type: 'living'
    };
    setRooms([...rooms, newRoom]);
  };

  const updateRoom = (id: string, field: keyof Room, value: any) => {
    setRooms(rooms.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRoom = (id: string) => {
    setRooms(rooms.filter(r => r.id !== id));
  };

  const totalPoints = rooms.reduce((acc, room) => {
    const { lightingPoints, tugPoints } = calculateNBR(room);
    return acc + lightingPoints + tugPoints;
  }, 0);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    const element = reportRef.current;
    element.classList.add('pdf-safe');

    const opt = {
      margin: 10,
      filename: `Levantamento_Eletrico_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    } as const;

    try {
      await html2pdf().from(element).set(opt).save();
    } catch (err) {
      console.error('PDF Error:', err);
    } finally {
      element.classList.remove('pdf-safe');
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-technical-line/20 pb-6">
        <div className="space-y-1">
          <div className="label-tech inline-block px-2 py-1 border border-technical-line/20">Módulo: Engenharia de Campo</div>
          <h1 className="font-serif italic text-4xl leading-tight">Levantamento de <span className="text-technical-accent">Carga e Materiais</span></h1>
          <p className="text-technical-ink/60 text-sm font-mono uppercase tracking-tight">Dimensionamento conforme NBR 5410</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button onClick={addRoom} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Adicionar Ambiente
          </button>
          <button 
            disabled={rooms.length === 0 || isExporting}
            onClick={handleExportPDF}
            className="btn-primary !bg-technical-accent !text-white !border-technical-accent flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? <span className="animate-spin">...</span> : <Printer size={16} />}
            Gerar e Imprimir Laudo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence>
            {rooms.map((room) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="card-technical bg-white/50 border-l-4 border-l-technical-ink relative group"
              >
                <button 
                  onClick={() => removeRoom(room.id)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="col-span-1 md:col-span-2">
                    <label className="label-tech">Nome do Ambiente</label>
                    <input 
                      type="text" 
                      value={room.name}
                      onChange={(e) => updateRoom(room.id, 'name', e.target.value)}
                      className="w-full bg-transparent border-b border-technical-line/20 p-2 font-serif italic text-lg outline-none focus:border-technical-accent"
                    />
                  </div>
                  <div>
                    <label className="label-tech">Tipo</label>
                    <select 
                      value={room.type}
                      onChange={(e) => updateRoom(room.id, 'type', e.target.value)}
                      className="w-full bg-transparent border-b border-technical-line/20 p-2 font-mono text-xs uppercase outline-none"
                    >
                      <option value="living">Sala/Quarto</option>
                      <option value="kitchen">Cozinha/Área</option>
                      <option value="bathroom">Banheiro</option>
                      <option value="other">Outros</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="label-tech">L (m)</label>
                      <input 
                        type="number" 
                        value={room.length}
                        onChange={(e) => updateRoom(room.id, 'length', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent border-b border-technical-line/20 p-2 font-mono text-xs outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="label-tech">W (m)</label>
                      <input 
                        type="number" 
                        value={room.width}
                        onChange={(e) => updateRoom(room.id, 'width', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent border-b border-technical-line/20 p-2 font-mono text-xs outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-technical-line/5">
                  {Object.entries(calculateNBR(room)).map(([key, val]) => (
                    <div key={key}>
                      <p className="label-tech italic !opacity-40">{key}</p>
                      <p className="font-mono text-sm font-bold">{val.toFixed(key.includes('Points') ? 0 : 2)}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {rooms.length === 0 && (
            <div className="py-20 border border-dashed border-technical-line/20 text-center space-y-4">
              <Calculator className="mx-auto text-technical-line/20" size={48} />
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-40">Nenhum ambiente cadastrado para o levantamento</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card-technical bg-white/40 border border-technical-line/10 space-y-4">
            <h3 className="font-serif italic text-lg border-b border-technical-line/5 pb-2">Cadastro de Cliente</h3>
            <div className="space-y-3">
              <div>
                <label className="label-tech">Nome do Cliente</label>
                <input 
                  type="text" 
                  value={client.name}
                  onChange={(e) => setClient({...client, name: e.target.value})}
                  className="w-full bg-transparent border-b border-technical-line/20 p-1 font-mono text-xs uppercase outline-none focus:border-technical-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-tech">Contato</label>
                  <input 
                    type="text" 
                    value={client.phone}
                    onChange={(e) => setClient({...client, phone: e.target.value})}
                    className="w-full bg-transparent border-b border-technical-line/20 p-1 font-mono text-xs outline-none focus:border-technical-accent"
                  />
                </div>
                <div>
                  <label className="label-tech">Categoria</label>
                  <select 
                    value={client.category}
                    onChange={(e) => setClient({...client, category: e.target.value as any})}
                    className="w-full bg-transparent border-b border-technical-line/20 p-1 font-mono text-xs uppercase outline-none"
                  >
                    <option value="residential">Residencial</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-tech">Tipo de Instalação</label>
                <select 
                  value={client.installationType}
                  onChange={(e) => setClient({...client, installationType: e.target.value as any})}
                  className="w-full bg-transparent border-b border-technical-line/20 p-1 font-mono text-xs uppercase outline-none"
                >
                  <option value="monophase">Monofásico (127V/220V)</option>
                  <option value="biphase">Bifásico (F+F+N)</option>
                  <option value="triphase">Trifásico (F+F+F+N)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card-technical bg-technical-ink text-technical-bg space-y-6">
            <h3 className="font-serif italic text-xl border-b border-technical-bg/20 pb-4">Budget Quantitativo</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="label-tech !text-technical-bg/40 uppercase">Lista Quantitativa (Estimativa)</p>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {materialList.filter(m => m.qty > 0).map((item, idx) => (
                    <div key={idx} className="flex justify-between font-mono text-[9px] uppercase border-b border-white/5 py-1">
                      <span className="opacity-60">{item.name}</span>
                      <span className="text-technical-accent font-bold">{item.qty}{item.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-tech !text-technical-bg/60">Preço Mão de Obra (por Ponto)</label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">R$</span>
                  <input 
                    type="number" 
                    value={laborPrice}
                    onChange={(e) => setLaborPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-transparent border-b border-technical-bg/20 p-2 font-mono text-lg outline-none focus:border-technical-accent text-white"
                  />
                </div>
              </div>

              <div>
                <label className="label-tech !text-technical-bg/60">Materiais Adicionais (Manual)</label>
                <textarea 
                  placeholder="Ex: 50m Conduíte 3/4, 2 Rolo Cabo 2,5mm..."
                  className="w-full h-32 bg-technical-bg/5 border border-technical-bg/20 p-4 font-mono text-[10px] uppercase outline-none focus:border-technical-accent text-white"
                />
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="opacity-60">Mão de Obra ({totalPoints} pts):</span>
                <span className="font-bold">R$ {(totalPoints * laborPrice).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="opacity-60">Materiais Estimados:</span>
                <span className="font-bold">R$ {totalMaterialCost.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between font-mono text-lg font-bold border-t border-technical-bg/20 pt-2 text-technical-accent">
                <span>Total Projeto:</span>
                <span>R$ {( (totalPoints * laborPrice) + totalMaterialCost ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="card-technical border-l-4 border-l-technical-accent bg-white/30 text-[10px] uppercase font-mono space-y-2 leading-relaxed">
            <div className="flex items-center gap-2 text-technical-accent mb-2">
              <Zap size={14} />
              <span className="font-bold">Diretriz NBR 5410</span>
            </div>
            <p>• Iluminação: Mín. 1 ponto p/ 6m².</p>
            <p>• TUG (Salas): Mín. 1 ponto p/ 5m perímetro.</p>
            <p>• TUG (Cozinhas): Mín. 1 ponto p/ 3,5m perímetro.</p>
            <p>• Fiação: Dimensionamento sugerido no laudo técnico final.</p>
          </div>
        </div>
      </div>

      {/* Hidden Report for Printing */}
      <div className="hidden">
        <div ref={reportRef} className="p-12 space-y-12 text-technical-ink bg-white font-sans">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-technical-ink pb-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-serif italic font-bold">Levantamento Técnico Elétrico</h1>
              <p className="font-mono text-xs uppercase tracking-widest opacity-60">Emissão: {new Date().toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-bold uppercase">VoltScan AI Engineering</p>
              <p className="text-[10px] uppercase tracking-tighter opacity-60">Software de Dimensionamento NBR 5410</p>
            </div>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-2 gap-8 border-b border-technical-line/10 pb-8">
            <div className="space-y-2">
              <h3 className="font-mono text-[10px] uppercase font-bold opacity-40">Dados do Cliente</h3>
              <p className="font-serif italic text-lg">{client.name || 'Não Informado'}</p>
              <p className="font-mono text-[10px]">{client.phone} • {client.address}</p>
            </div>
            <div className="space-y-2 text-right">
              <h3 className="font-mono text-[10px] uppercase font-bold opacity-40">Configuração de Entrada</h3>
              <p className="font-mono text-xs font-bold uppercase text-technical-accent">{client.category} • {client.installationType}</p>
              <p className="text-[10px] opacity-60">Padrão de Cores NBR 5410 Ativo</p>
            </div>
          </div>

          {/* Environments Table */}
          <div className="space-y-4">
            <h2 className="font-serif italic text-2xl border-b border-technical-line/10 pb-2">Ambientes Selecionados</h2>
            <table className="w-full text-left font-mono text-[11px] uppercase border-collapse">
              <thead>
                <tr className="bg-technical-line/5">
                  <th className="p-2 border border-technical-line/10">Ambiente</th>
                  <th className="p-2 border border-technical-line/10">Dimensões</th>
                  <th className="p-2 border border-technical-line/10">Área/Per.</th>
                  <th className="p-2 border border-technical-line/10">Luz Mín.</th>
                  <th className="p-2 border border-technical-line/10">TUG Mín.</th>
                  <th className="p-2 border border-technical-line/10">Fiação/Bitola</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map(room => {
                  const data = calculateNBR(room);
                  return (
                    <tr key={room.id}>
                      <td className="p-2 border border-technical-line/10 font-bold">{room.name}</td>
                      <td className="p-2 border border-technical-line/10">{room.width}x{room.length}x{room.height}m</td>
                      <td className="p-2 border border-technical-line/10">{data.area.toFixed(2)}m² / {data.perimeter.toFixed(2)}m</td>
                      <td className="p-2 border border-technical-line/10">{data.lightingPoints} pto</td>
                      <td className="p-2 border border-technical-line/10">{data.tugPoints} pto</td>
                      <td className="p-2 border border-technical-line/10 opacity-60">1.5mm² / 2.5mm²</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <h2 className="font-serif italic text-2xl border-b border-technical-line/10 pb-2">Orçamento Quantitativo (NBR 5410)</h2>
            <table className="w-full text-left font-mono text-[10px] uppercase border-collapse">
              <thead>
                <tr className="bg-technical-line/5">
                  <th className="p-2 border border-technical-line/10">Item/Componente</th>
                  <th className="p-2 border border-technical-line/10">Quantidade</th>
                  <th className="p-2 border border-technical-line/10">Un.</th>
                  <th className="p-2 border border-technical-line/10">Vlr. Unit Est.</th>
                  <th className="p-2 border border-technical-line/10">Total Est.</th>
                </tr>
              </thead>
              <tbody>
                {materialList.filter(m => m.qty > 0).map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2 border border-technical-line/10">{item.name}</td>
                    <td className="p-2 border border-technical-line/10 font-bold">{item.qty}</td>
                    <td className="p-2 border border-technical-line/10">{item.unit}</td>
                    <td className="p-2 border border-technical-line/10">R$ {item.price.toFixed(2)}</td>
                    <td className="p-2 border border-technical-line/10 font-bold text-right">R$ {(item.qty * item.price).toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="bg-technical-line/5">
                  <td colSpan={4} className="p-2 border border-technical-line/10 font-bold text-right italic">Total Estimado de Materiais</td>
                  <td className="p-2 border border-technical-line/10 font-bold text-right text-technical-accent">R$ {totalMaterialCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Budget & Notes */}
          <div className="grid grid-cols-2 gap-12 pt-8">
            <div className="card-technical border border-technical-line/10 p-6 space-y-4 shadow-none">
              <h3 className="font-serif italic text-xl">Estimativa Final de Custos</h3>
              <div className="space-y-2 font-mono text-[10px]">
                <div className="flex justify-between border-b border-technical-line/5 py-1">
                  <span>Mão de Obra ({totalPoints} pontos):</span>
                  <span className="font-bold">R$ {(totalPoints * laborPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-b border-technical-line/5 py-1">
                  <span>Insumos e Materiais:</span>
                  <span className="font-bold">R$ {totalMaterialCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-t-2 border-technical-ink pt-2 text-sm font-bold text-technical-accent">
                  <span>Total Geral do Projeto:</span>
                  <span>R$ {((totalPoints * laborPrice) + totalMaterialCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="card-technical border border-technical-line/10 p-6 space-y-4 shadow-none italic font-serif text-sm">
              <h3 className="font-serif italic text-xl not-italic">Notas do Analista</h3>
              <div className="border-b border-dotted border-technical-line/40 h-6"></div>
              <div className="border-b border-dotted border-technical-line/40 h-6"></div>
              <div className="border-b border-dotted border-technical-line/40 h-6"></div>
              <div className="border-b border-dotted border-technical-line/40 h-6"></div>
            </div>
          </div>

          {/* Footer Signatures */}
          <div className="pt-20 flex justify-between gap-12">
             <div className="flex-1 border-t border-technical-line/40 text-center pt-2">
                <p className="font-mono text-[10px] uppercase opacity-40">Assinatura do Profissional</p>
             </div>
             <div className="flex-1 border-t border-technical-line/40 text-center pt-2">
                <p className="font-mono text-[10px] uppercase opacity-40">Assinatura do Cliente</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
