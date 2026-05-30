import { useState } from 'react'

export default function GabineteCalculator() {
  const [formData, setFormData] = useState({
    H: '',
    W: '',
    D: '',
    chapas: '',
    bisagras: ''
  })
  
  const [costData, setCostData] = useState({
    costo_plancha_cuerpo: 140.00,
    costo_plancha_mandil: 140.00,
    costo_pintado_cuerpo: 25.00,
    costo_pintado_mandil: 25.00,
    mb_percentage: 20.0
  })
  
  const [showModal, setShowModal] = useState(false)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCostChange = (e) => {
    const { name, value } = e.target
    setCostData(prev => ({ ...prev, [name]: value }))
  }

  const handleInitialSubmit = (e) => {
    e.preventDefault()
    setShowModal(true)
  }

  const handleFinalSubmit = async () => {
    setLoading(true)
    setError(null)
    setResults(null)
    setShowModal(false)

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/calculate'
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          H: Number(formData.H),
          W: Number(formData.W),
          D: Number(formData.D),
          chapas: Number(formData.chapas),
          bisagras: Number(formData.bisagras),
          costo_plancha_cuerpo: Number(costData.costo_plancha_cuerpo),
          costo_plancha_mandil: Number(costData.costo_plancha_mandil),
          costo_pintado_cuerpo: Number(costData.costo_pintado_cuerpo),
          costo_pintado_mandil: Number(costData.costo_pintado_mandil),
          mb_percentage: Number(costData.mb_percentage)
        })
      })

      if (!response.ok) {
        throw new Error('Error de cálculo. Verifique los parámetros.')
      }

      const data = await response.json()
      setResults(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const ResultCard = ({ title, data, unit = '' }) => {
    if (!data) return null;
    
    return (
      <div className="bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-800 flex flex-col h-full">
        <div className="bg-gray-100 dark:bg-[#1a1a1a] px-4 py-2 border-b border-gray-300 dark:border-gray-800">
          <h3 className="text-sm font-semibold tracking-wide text-gray-800 dark:text-gray-200 uppercase">{title}</h3>
        </div>
        <div className="p-4 flex-1">
          <ul className="space-y-2">
            {Object.entries(data).map(([key, value]) => (
              <li key={key} className="flex justify-between items-end border-b border-gray-100 dark:border-gray-800/50 pb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{key}</span>
                <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                  {typeof value === 'number' ? `${value.toFixed(2)} ${unit}`.trim() : `${value} ${unit}`.trim()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-0">
      {/* PANEL IZQUIERDO: FORMULARIO */}
      <div className="lg:col-span-3 lg:col-start-1">
        <div className="bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-800 sticky top-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
          <div className="bg-gray-100 dark:bg-[#1a1a1a] px-4 py-3 border-b border-gray-300 dark:border-gray-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
              1. Parámetros de Entrada
            </h2>
          </div>
          
          <form onSubmit={handleInitialSubmit} className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase">Alto (H) mm</label>
                <input
                  type="number"
                  name="H"
                  required
                  min="0"
                  value={formData.H}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 focus:border-[#286caf] dark:focus:border-[#faba33] font-mono text-sm transition-colors"
                  placeholder="1000"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase">Ancho (W)</label>
                <input
                  type="number"
                  name="W"
                  required
                  min="0"
                  value={formData.W}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 focus:border-[#286caf] dark:focus:border-[#faba33] font-mono text-sm transition-colors"
                  placeholder="600"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase">Fondo (D)</label>
                <input
                  type="number"
                  name="D"
                  required
                  min="0"
                  value={formData.D}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 focus:border-[#286caf] dark:focus:border-[#faba33] font-mono text-sm transition-colors"
                  placeholder="400"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase">Chapas</label>
                <input
                  type="number"
                  name="chapas"
                  required
                  min="0"
                  value={formData.chapas}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 focus:border-[#286caf] dark:focus:border-[#faba33] font-mono text-sm transition-colors"
                  placeholder="1"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase">Bisagras</label>
                <input
                  type="number"
                  name="bisagras"
                  required
                  min="0"
                  value={formData.bisagras}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 focus:border-[#286caf] dark:focus:border-[#faba33] font-mono text-sm transition-colors"
                  placeholder="2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-[#286caf] dark:bg-[#faba33] hover:bg-[#1f568e] dark:hover:bg-[#e0a72d] text-white dark:text-black text-sm font-bold py-3 px-4 transition-colors flex justify-center items-center uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? 'Calculando...' : 'Siguiente: Costos →'}
            </button>

            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-mono">
                ERROR: {error}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* PANEL DERECHO: DASHBOARD DE RESULTADOS */}
      <div className="lg:col-span-9">
        {!results && !loading && (
          <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 md:p-12 bg-white/80 dark:bg-[#111]/80 backdrop-blur-sm border border-gray-300 dark:border-gray-800 border-dashed">
            <div className="w-12 h-12 border-2 border-gray-300 dark:border-gray-700 flex items-center justify-center mb-4">
              <span className="font-mono text-xl text-gray-400">+</span>
            </div>
            <h3 className="text-sm md:text-base font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 text-center">Sistema de Gabinetes en Espera</h3>
            <p className="text-xs text-gray-500 font-mono mt-2 text-center">Ingrese parámetros y continúe para ajustar costos</p>
          </div>
        )}

        {results && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center space-x-3 pb-2 border-b-2 border-[#286caf] dark:border-[#faba33]">
              <div className="px-2 py-1 bg-[#286caf] dark:bg-[#faba33] text-white dark:text-black text-[10px] font-bold font-mono tracking-widest hidden sm:block">OK</div>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                Reporte de Geometría y Materiales
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <ResultCard title="A. Área Planchas" data={results.A} unit="m²" />
              <ResultCard title="B. Perímetros Corte" data={results.B} unit="m" />
              <ResultCard title="C. Pliegues Doblez" data={results.C} unit="" />
              <ResultCard title="D. Perímetro Soldadura" data={results.D} unit="m" />
              <ResultCard title="E. Área Pintado (2 caras)" data={results.E} unit="m²" />
              <ResultCard title="G. Área Embalaje" data={results.G} unit="m²" />
              
              {/* F. Ensamblaje */}
              <div className="bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-800 flex flex-col md:col-span-2 xl:col-span-3">
                <div className="bg-gray-100 dark:bg-[#1a1a1a] px-4 py-2 border-b border-gray-300 dark:border-gray-800">
                  <h3 className="text-sm font-semibold tracking-wide text-gray-800 dark:text-gray-200 uppercase">F. Parámetros de Ensamblaje</h3>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(results.F).map(([part, items]) => (
                    <div key={part} className="border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-[#0a0a0a]">
                      <h4 className="text-xs font-bold text-[#286caf] dark:text-[#faba33] uppercase mb-2 border-b border-gray-200 dark:border-gray-800 pb-1">{part}</h4>
                      <div className="flex justify-between items-center text-sm font-mono">
                        <span className="text-gray-500">Chapas:</span>
                        <span className="text-gray-900 dark:text-gray-100">{items.chapas}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-mono mt-1">
                        <span className="text-gray-500">Bisagras:</span>
                        <span className="text-gray-900 dark:text-gray-100">{items.bisagras}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* H. Tabla de Costos y Totales */}
            {results.H && (
              <div className="mt-8 bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
                <div className="bg-gray-800 text-white dark:bg-[#1a1a1a] px-4 py-3 border-b border-gray-900 dark:border-gray-800 flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider truncate mr-2">H. Análisis de Costos</h3>
                  <span className="text-[10px] font-mono opacity-60 hidden sm:inline">PRECISIÓN: DOUBLE(64)</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="industrial-table w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                    <thead className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-[#0f0f0f]">
                      <tr>
                        <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-800">Id</th>
                        <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-800">Material</th>
                        <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-800">Denom.</th>
                        <th className="px-4 py-3 text-right">Costo Glb</th>
                        <th className="px-4 py-3 text-right">Med. Glb</th>
                        <th className="px-4 py-3 text-right">Costo/UM</th>
                        <th className="px-4 py-3 text-right bg-[#286caf]/10 dark:bg-[#faba33]/20">P. Calc</th>
                        <th className="px-4 py-3 text-right">Costo 100%</th>
                        <th className="px-4 py-3 text-center border-l border-gray-200 dark:border-gray-800">DFP</th>
                        <th className="px-4 py-3 text-right">Factor P.</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-200 border-r border-gray-200 dark:border-gray-800">Costo Prod.</th>
                        <th className="px-4 py-3 text-right font-bold text-[#286caf] dark:text-[#faba33]">CUERPO</th>
                        <th className="px-4 py-3 text-right font-bold text-[#286caf] dark:text-[#faba33]">MANDIL</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs text-gray-700 dark:text-gray-300">
                      {results.H.tabla.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="px-4 py-2 border-r border-gray-100 dark:border-gray-800/50">{row.id}</td>
                          <td className="px-4 py-2 border-r border-gray-100 dark:border-gray-800/50 font-sans font-medium text-gray-900 dark:text-gray-100">{row.material}</td>
                          <td className="px-4 py-2 border-r border-gray-100 dark:border-gray-800/50">{row.denominacion}</td>
                          <td className="px-4 py-2 text-right">S/.{row.costo_glb.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right">{row.medida_glb}</td>
                          <td className="px-4 py-2 text-right">S/.{row.costo_um.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right bg-[#286caf]/10 dark:bg-[#faba33]/15 font-semibold text-[#286caf] dark:text-[#faba33]">
                            {typeof row.p_calculado === 'number' ? row.p_calculado.toFixed(2) : row.p_calculado}
                          </td>
                          <td className="px-4 py-2 text-right">S/.{row.costo_100.toFixed(2)}</td>
                          <td className="px-4 py-2 text-center border-l border-gray-100 dark:border-gray-800/50 font-sans text-[10px]">{row.dfp}</td>
                          <td className="px-4 py-2 text-right">{row.factor_p.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-bold text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-800/50">S/.{row.costo_prod.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-bold text-[#286caf] dark:text-[#faba33]">
                            {row.cuerpo > 0 ? `S/.${row.cuerpo.toFixed(2)}` : '0'}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-[#286caf] dark:text-[#faba33]">
                            {row.mandil > 0 ? `S/.${row.mandil.toFixed(2)}` : '0'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-gray-100 dark:bg-[#151515] p-4 md:p-6 border-t border-gray-300 dark:border-gray-800 flex justify-end">
                  <div className="w-full md:w-[500px] lg:w-[600px] overflow-x-auto">
                    <table className="w-full text-right font-mono text-xs md:text-sm min-w-[300px]">
                      <thead className="text-[10px] uppercase font-bold text-gray-500 border-b border-gray-300 dark:border-gray-700">
                        <tr>
                          <th className="py-2 px-2 md:px-4 text-left">Concepto Financiero</th>
                          <th className="py-2 px-2 md:px-4 text-[#286caf] dark:text-[#faba33]">Total S/.</th>
                          <th className="py-2 px-2 md:px-4">Cuerpo S/.</th>
                          <th className="py-2 px-2 md:px-4">Mandil S/.</th>
                        </tr>
                      </thead>
                      <tbody className="text-gray-800 dark:text-gray-200">
                        <tr className="border-b border-gray-200 dark:border-gray-800/50">
                          <td className="py-2 md:py-3 px-2 md:px-4 font-bold font-sans text-left text-[10px] md:text-xs uppercase tracking-wider">Costo Total</td>
                          <td className="py-2 md:py-3 px-2 md:px-4 font-bold">S/.{results.H.totales.costo_total.total.toFixed(2)}</td>
                          <td className="py-2 md:py-3 px-2 md:px-4">S/.{results.H.totales.costo_total.cuerpo.toFixed(2)}</td>
                          <td className="py-2 md:py-3 px-2 md:px-4">S/.{results.H.totales.costo_total.mandil.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-gray-200 dark:border-gray-800/50">
                          <td className="py-2 md:py-3 px-2 md:px-4 font-sans text-left text-[10px] md:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">MB ({costData.mb_percentage}%)</td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400">S/.{results.H.totales.mb.total.toFixed(2)}</td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400">S/.{results.H.totales.mb.cuerpo.toFixed(2)}</td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400">S/.{results.H.totales.mb.mandil.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-black/20">
                          <td className="py-2 md:py-3 px-2 md:px-4 font-bold font-sans text-left text-[10px] md:text-xs uppercase tracking-wider">Subtotal</td>
                          <td className="py-2 md:py-3 px-2 md:px-4 font-bold">S/.{results.H.totales.subtotal.total.toFixed(2)}</td>
                          <td className="py-2 md:py-3 px-2 md:px-4 font-semibold">S/.{results.H.totales.subtotal.cuerpo.toFixed(2)}</td>
                          <td className="py-2 md:py-3 px-2 md:px-4 font-semibold">S/.{results.H.totales.subtotal.mandil.toFixed(2)}</td>
                        </tr>
                        <tr className="border-b border-gray-300 dark:border-gray-700">
                          <td className="py-2 md:py-3 px-2 md:px-4 font-sans text-left text-[10px] md:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">IGV (18%)</td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400">S/.{results.H.totales.igv.total.toFixed(2)}</td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400">S/.{results.H.totales.igv.cuerpo.toFixed(2)}</td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-gray-600 dark:text-gray-400">S/.{results.H.totales.igv.mandil.toFixed(2)}</td>
                        </tr>
                        <tr className="bg-[#286caf] dark:bg-[#faba33] text-white dark:text-black">
                          <td className="py-3 md:py-4 px-2 md:px-4 font-bold font-sans text-left text-[10px] md:text-sm uppercase tracking-widest">Total Final</td>
                          <td className="py-3 md:py-4 px-2 md:px-4 font-bold text-sm md:text-lg">S/.{results.H.totales.total.total.toFixed(2)}</td>
                          <td className="py-3 md:py-4 px-2 md:px-4 font-bold text-xs md:text-sm">S/.{results.H.totales.total.cuerpo.toFixed(2)}</td>
                          <td className="py-3 md:py-4 px-2 md:px-4 font-bold text-xs md:text-sm">S/.{results.H.totales.total.mandil.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE COSTOS */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111] w-full max-w-xl border border-gray-300 dark:border-gray-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-gray-100 dark:bg-[#1a1a1a] px-6 py-4 border-b border-gray-300 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-base font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                2. Confirmación de Costos
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Grupo Plancha */}
                  <div className="space-y-4 border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-[#0a0a0a]">
                    <h4 className="text-xs font-bold text-[#286caf] dark:text-[#faba33] uppercase border-b border-gray-200 dark:border-gray-800 pb-2">Plancha LAF (S/.)</h4>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">CUERPO</label>
                      <input
                        type="number" step="0.01" name="costo_plancha_cuerpo" value={costData.costo_plancha_cuerpo} onChange={handleCostChange}
                        className="w-full px-3 py-2 bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-700 font-mono text-sm focus:border-[#286caf] dark:focus:border-[#faba33]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">MANDIL</label>
                      <input
                        type="number" step="0.01" name="costo_plancha_mandil" value={costData.costo_plancha_mandil} onChange={handleCostChange}
                        className="w-full px-3 py-2 bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-700 font-mono text-sm focus:border-[#286caf] dark:focus:border-[#faba33]"
                      />
                    </div>
                  </div>

                  {/* Grupo Pintado */}
                  <div className="space-y-4 border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-[#0a0a0a]">
                    <h4 className="text-xs font-bold text-[#286caf] dark:text-[#faba33] uppercase border-b border-gray-200 dark:border-gray-800 pb-2">Pintado 1 Capa (S/.)</h4>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">CUERPO</label>
                      <input
                        type="number" step="0.01" name="costo_pintado_cuerpo" value={costData.costo_pintado_cuerpo} onChange={handleCostChange}
                        className="w-full px-3 py-2 bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-700 font-mono text-sm focus:border-[#286caf] dark:focus:border-[#faba33]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">MANDIL</label>
                      <input
                        type="number" step="0.01" name="costo_pintado_mandil" value={costData.costo_pintado_mandil} onChange={handleCostChange}
                        className="w-full px-3 py-2 bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-700 font-mono text-sm focus:border-[#286caf] dark:focus:border-[#faba33]"
                      />
                    </div>
                  </div>
                </div>

                {/* Grupo Financiero */}
                <div className="border border-gray-200 dark:border-gray-800 p-4 bg-gray-50 dark:bg-[#0a0a0a]">
                  <h4 className="text-xs font-bold text-[#286caf] dark:text-[#faba33] uppercase border-b border-gray-200 dark:border-gray-800 pb-2">Variables Financieras</h4>
                  <div className="mt-4 w-full md:w-1/2">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Margen Bruto (MB) %</label>
                    <input
                      type="number" step="0.1" name="mb_percentage" value={costData.mb_percentage} onChange={handleCostChange}
                      className="w-full px-3 py-2 bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-700 font-mono text-sm focus:border-[#286caf] dark:focus:border-[#faba33]"
                    />
                  </div>
                </div>

              </div>

              <div className="mt-8 flex justify-end space-x-3">
                <button 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Volver
                </button>
                <button 
                  onClick={handleFinalSubmit}
                  className="px-6 py-2 bg-[#286caf] dark:bg-[#faba33] hover:bg-[#1f568e] dark:hover:bg-[#e0a72d] text-white dark:text-black text-sm font-bold uppercase tracking-wider transition-colors"
                >
                  Generar Reporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
