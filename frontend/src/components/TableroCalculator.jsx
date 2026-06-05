import { useState, useEffect, useMemo } from 'react'

export default function TableroCalculator() {
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Step: 1: Tableros, 2: Equipamiento, 3: Resultados
  const [step, setStep] = useState(1)
  
  // Tableros activos (inicialmente T01)
  const [activeBoards, setActiveBoards] = useState([
    { id: 'T01', name: 'Tablero General' }
  ])
  
  // Map of quantities: { [itemId]: { [boardId]: qty } }
  const [quantities, setQuantities] = useState({})
  
  // Margen Bruto
  const [mbPercentage, setMbPercentage] = useState(20.0)

  // Descuento global parametrizable (reemplaza el 20% fijo del catálogo)
  const [descuento, setDescuento] = useState(20.0)

  // Análisis de imagen con IA
  const [aiOpen, setAiOpen] = useState(false)
  const [aiFile, setAiFile] = useState(null)
  const [aiPreview, setAiPreview] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [aiMatches, setAiMatches] = useState(null)
  const [aiTargetBoard, setAiTargetBoard] = useState('T01')
  const [aiDragActive, setAiDragActive] = useState(false)

  // Notificaciones (toasts)
  const [toasts, setToasts] = useState([])
  
  // Búsqueda y filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL') // 'ALL', 'ITM', 'ID'
  const [tipoFilter, setTipoFilter] = useState('ALL') // 'ALL', 'DIN', 'SI', 'CM'
  const [polesFilter, setPolesFilter] = useState('ALL') // 'ALL', 1, 2, 3, 4
  const [amperageFilter, setAmperageFilter] = useState('ALL') // 'ALL', etc.
  const [featuresFilter, setFeaturesFilter] = useState('ALL')
  
  // Resultados del Backend
  const [results, setResults] = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState(null)

  // Cargar el catálogo al montar
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true)
        setError(null)
        const baseUrl = import.meta.env.VITE_API_URL 
          ? import.meta.env.VITE_API_URL.replace('/calculate', '') 
          : 'http://localhost:8000/api'
        
        const response = await fetch(`${baseUrl}/tableros/catalog`)
        if (!response.ok) {
          throw new Error('No se pudo cargar el catálogo de equipos.')
        }
        const data = await response.json()
        setCatalog(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCatalog()
  }, [])

  // Mantener válido el tablero destino del análisis IA
  useEffect(() => {
    if (!activeBoards.some(b => b.id === aiTargetBoard) && activeBoards.length > 0) {
      setAiTargetBoard(activeBoards[0].id)
    }
  }, [activeBoards, aiTargetBoard])

  // Agregar un tablero nuevo (máximo 10: T01 - T10)
  const handleAddBoard = () => {
    if (activeBoards.length >= 10) return
    const nextIdx = activeBoards.length + 1
    const newId = `T${String(nextIdx).padStart(2, '0')}`
    setActiveBoards(prev => [
      ...prev,
      { id: newId, name: `Tablero Auxiliar ${nextIdx}` }
    ])
  }

  // Eliminar el último tablero
  const handleRemoveBoard = (idToRemove) => {
    if (activeBoards.length <= 1) return
    setActiveBoards(prev => prev.filter(b => b.id !== idToRemove))
    
    // Limpiar cantidades para ese tablero
    setQuantities(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(itemId => {
        if (updated[itemId]) {
          const itemQty = { ...updated[itemId] }
          delete itemQty[idToRemove]
          updated[itemId] = itemQty
        }
      })
      return updated
    })
  }

  // Cambiar nombre del tablero
  const handleBoardNameChange = (id, newName) => {
    setActiveBoards(prev => prev.map(b => b.id === id ? { ...b, name: newName } : b))
  }

  // Cambiar cantidad de un equipo para un tablero específico
  const handleQtyChange = (itemId, boardId, val) => {
    const qty = Math.max(0, parseInt(val) || 0)
    setQuantities(prev => {
      const itemMap = prev[itemId] ? { ...prev[itemId] } : {}
      itemMap[boardId] = qty
      return {
        ...prev,
        [itemId]: itemMap
      }
    })
  }

  // Incrementar/Decrementar cantidad
  const adjustQty = (itemId, boardId, delta) => {
    const currentQty = (quantities[itemId] && quantities[itemId][boardId]) || 0
    const newQty = Math.max(0, currentQty + delta)
    handleQtyChange(itemId, boardId, newQty)
  }

  // Copiar configuración de un tablero a otro
  const handleDuplicateBoardConfig = (sourceBoardId, targetBoardId) => {
    setQuantities(prev => {
      const updated = { ...prev }
      Object.keys(updated).forEach(itemId => {
        const itemQty = updated[itemId] ? { ...updated[itemId] } : {}
        itemQty[targetBoardId] = itemQty[sourceBoardId] || 0
        updated[itemId] = itemQty
      })
      return updated
    })
  }

  // Limpiar todas las cantidades
  const handleClearQuantities = () => {
    setQuantities({})
  }

  // Enviar cantidades al backend para calcular presupuesto
  const handleCalculateBudget = async () => {
    setCalculating(true)
    setCalcError(null)
    
    // Formatear items con cantidades para el backend
    const payloadItems = Object.entries(quantities)
      .map(([itemId, boardQtyMap]) => {
        // Filtrar solo los tableros activos y cantidades mayores a 0
        const activeQtyMap = {}
        let hasQty = false
        activeBoards.forEach(b => {
          const qty = boardQtyMap[b.id] || 0
          if (qty > 0) {
            activeQtyMap[b.id] = qty
            hasQty = true
          }
        })
        return {
          id: parseInt(itemId),
          quantities: activeQtyMap,
          _hasQty: hasQty
        }
      })
      .filter(item => item._hasQty)
      .map(({ id, quantities }) => ({ id, quantities }))

    if (payloadItems.length === 0) {
      setCalcError('No ha seleccionado ningún equipamiento para presupuestar.')
      setCalculating(false)
      return
    }

    try {
      const baseUrl = import.meta.env.VITE_API_URL 
        ? import.meta.env.VITE_API_URL.replace('/calculate', '') 
        : 'http://localhost:8000/api'
      
      const response = await fetch(`${baseUrl}/tableros/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          active_boards: activeBoards,
          items: payloadItems,
          mb_percentage: Number(mbPercentage),
          descuento_percentage: Number(descuento)
        })
      })

      if (!response.ok) {
        throw new Error('Error al procesar el presupuesto de tableros.')
      }

      const data = await response.json()
      setResults(data)
      setStep(3) // Avanzar al reporte
    } catch (err) {
      setCalcError(err.message)
    } finally {
      setCalculating(false)
    }
  }

  // Precio unitario efectivo con el descuento global aplicado
  const effectiveUnitPrice = (item) => item.precio_lista * (1 - Number(descuento) / 100)

  // ===== Notificaciones (toasts) =====
  const pushToast = (message, type = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }
  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  // ===== Análisis de imagen con IA =====
  const handleAiFileChange = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAiError('El archivo debe ser una imagen (JPG, PNG o WEBP).')
      pushToast('Formato no válido: sube una imagen.', 'error')
      return
    }
    setAiError(null)
    setAiMatches(null)
    setAiFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setAiPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  // Drag & drop sobre la zona de carga
  const handleAiDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!aiDragActive) setAiDragActive(true)
  }
  const handleAiDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setAiDragActive(false)
  }
  const handleAiDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setAiDragActive(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) handleAiFileChange(file)
  }

  const handleAnalyzeImage = async () => {
    if (!aiFile) {
      setAiError('Seleccione una imagen primero.')
      return
    }
    setAiLoading(true)
    setAiError(null)
    setAiMatches(null)
    try {
      const baseUrl = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace('/calculate', '')
        : 'http://localhost:8000/api'

      const formData = new FormData()
      formData.append('image', aiFile)

      const response = await fetch(`${baseUrl}/tableros/analyze-image`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || data.detail || 'No se pudo analizar la imagen.')
      }
      const matches = data.matches || []
      setAiMatches(matches)
      const withMatch = matches.filter(m => m.match).length
      if (matches.length === 0) {
        pushToast('No se detectaron componentes eléctricos en la imagen.', 'info')
      } else {
        pushToast(`${matches.length} componente(s) detectado(s), ${withMatch} con equivalencia en catálogo.`, 'success')
      }
    } catch (err) {
      setAiError(err.message)
      pushToast(err.message, 'error')
    } finally {
      setAiLoading(false)
    }
  }

  // Cantidad actual de un match en el tablero destino del análisis
  const matchQtyInTarget = (matchEntry) => {
    if (!matchEntry?.match) return 0
    const itemId = matchEntry.match.id
    return (quantities[itemId] && quantities[itemId][aiTargetBoard]) || 0
  }

  // Agregar la coincidencia de un componente detectado al tablero seleccionado
  const handleApplyMatch = (matchEntry) => {
    if (!matchEntry || !matchEntry.match) return
    const itemId = matchEntry.match.id
    const qty = matchEntry.component?.cantidad || 1
    const current = (quantities[itemId] && quantities[itemId][aiTargetBoard]) || 0
    handleQtyChange(itemId, aiTargetBoard, current + qty)
    pushToast(`+${qty} · ${matchEntry.match.desc_corta} → ${aiTargetBoard}`, 'success')
  }

  // Quitar del tablero la cantidad detectada de un match
  const handleRemoveMatch = (matchEntry) => {
    if (!matchEntry || !matchEntry.match) return
    const itemId = matchEntry.match.id
    handleQtyChange(itemId, aiTargetBoard, 0)
    pushToast(`Quitado · ${matchEntry.match.desc_corta} de ${aiTargetBoard}`, 'info')
  }

  // Agregar todas las coincidencias válidas de una vez
  const handleApplyAllMatches = () => {
    if (!aiMatches) return
    let added = 0
    setQuantities(prev => {
      const updated = { ...prev }
      aiMatches.forEach(m => {
        if (!m.match) return
        const itemId = m.match.id
        const qty = m.component?.cantidad || 1
        const itemMap = updated[itemId] ? { ...updated[itemId] } : {}
        itemMap[aiTargetBoard] = (itemMap[aiTargetBoard] || 0) + qty
        updated[itemId] = itemMap
        added++
      })
      return updated
    })
    if (added > 0) pushToast(`${added} componente(s) agregado(s) a ${aiTargetBoard}.`, 'success')
  }

  // Quitar del tablero todas las coincidencias detectadas
  const handleRemoveAllMatches = () => {
    if (!aiMatches) return
    let removed = 0
    setQuantities(prev => {
      const updated = { ...prev }
      aiMatches.forEach(m => {
        if (!m.match) return
        const itemId = m.match.id
        if (updated[itemId] && updated[itemId][aiTargetBoard]) {
          const itemMap = { ...updated[itemId] }
          itemMap[aiTargetBoard] = 0
          updated[itemId] = itemMap
          removed++
        }
      })
      return updated
    })
    if (removed > 0) pushToast(`Componentes retirados de ${aiTargetBoard}.`, 'info')
  }

  const resetAi = () => {
    setAiFile(null)
    setAiPreview(null)
    setAiMatches(null)
    setAiError(null)
    setAiDragActive(false)
  }

  // Extraer valores únicos para los filtros de catálogo cargado
  const uniqueAmperages = useMemo(() => {
    const list = catalog
      .map(item => item.amperaje)
      .filter((v, i, self) => v !== null && v !== undefined && self.indexOf(v) === i)
    return list.sort((a, b) => a - b)
  }, [catalog])

  const uniquePoles = useMemo(() => {
    const list = catalog
      .map(item => item.polos)
      .filter((v, i, self) => v !== null && v !== undefined && self.indexOf(v) === i)
    return list.sort((a, b) => a - b)
  }, [catalog])

  const uniqueFeatures = useMemo(() => {
    const list = catalog
      .map(item => item.features)
      .filter((v, i, self) => v && self.indexOf(v) === i)
    return list.sort((a, b) => String(a).localeCompare(String(b)))
  }, [catalog])

  // Filtrado de catálogo en el cliente
  const filteredCatalog = useMemo(() => {
    return catalog.filter(item => {
      // Búsqueda de texto
      const query = searchQuery.toLowerCase().trim()
      const matchesSearch = query === '' || 
        item.codigo.toLowerCase().includes(query) ||
        item.desc_corta.toLowerCase().includes(query) ||
        item.desc_larga.toLowerCase().includes(query) ||
        item.modelo.toLowerCase().includes(query) ||
        (item.features || '').toLowerCase().includes(query)

      // Categoria
      const matchesCategory = categoryFilter === 'ALL' || item.categoria === categoryFilter

      // Tipo
      const matchesTipo = tipoFilter === 'ALL' || item.tipo === tipoFilter

      // Polos
      const matchesPoles = polesFilter === 'ALL' || item.polos === parseInt(polesFilter)

      // Amperaje
      const matchesAmperage = amperageFilter === 'ALL' || item.amperaje === Number(amperageFilter)

      // Features
      const matchesFeatures = featuresFilter === 'ALL' || item.features === featuresFilter

      return matchesSearch && matchesCategory && matchesTipo && matchesPoles && matchesAmperage && matchesFeatures
    })
  }, [catalog, searchQuery, categoryFilter, tipoFilter, polesFilter, amperageFilter, featuresFilter])

  // Contador de componentes seleccionados
  const selectedCount = useMemo(() => {
    let count = 0
    Object.values(quantities).forEach(boardMap => {
      Object.keys(boardMap).forEach(bId => {
        if (activeBoards.some(b => b.id === bId) && boardMap[bId] > 0) {
          count++
        }
      })
    })
    return count
  }, [quantities, activeBoards])

  if (loading) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center p-8 border border-gray-300 dark:border-gray-800 border-dashed">
        <div className="animate-spin w-8 h-8 border-2 border-[#286caf] dark:border-[#faba33] border-t-transparent mb-4"></div>
        <span className="font-mono text-xs text-gray-500 uppercase tracking-widest">Cargando Catálogo de Equipos ABB...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full min-h-[400px] flex flex-col items-center justify-center p-8 border border-red-300 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10 text-red-700 dark:text-red-400">
        <svg className="w-8 h-8 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        <span className="font-bold uppercase tracking-wider text-sm">Error de Catálogo</span>
        <p className="font-mono text-xs mt-1 text-center">{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* HEADER DE PASOS */}
      <div className="border border-gray-300 dark:border-gray-800 bg-white dark:bg-[#111] p-3 flex flex-wrap gap-4 items-center justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
        <div className="flex items-center space-x-1 sm:space-x-4">
          <button
            onClick={() => setStep(1)}
            className={`px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-wider border transition-colors ${
              step === 1
                ? 'bg-[#286caf] dark:bg-[#faba33] border-[#286caf] dark:border-[#faba33] text-white dark:text-black'
                : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            1. Tableros ({activeBoards.length})
          </button>
          <span className="text-gray-400 font-mono text-xs">→</span>
          <button
            onClick={() => setStep(2)}
            className={`px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-wider border transition-colors ${
              step === 2
                ? 'bg-[#286caf] dark:bg-[#faba33] border-[#286caf] dark:border-[#faba33] text-white dark:text-black'
                : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            2. Equipamiento ({selectedCount})
          </button>
          <span className="text-gray-400 font-mono text-xs">→</span>
          <button
            onClick={() => { if (results) setStep(3) }}
            disabled={!results}
            className={`px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-wider border transition-colors ${
              step === 3
                ? 'bg-[#286caf] dark:bg-[#faba33] border-[#286caf] dark:border-[#faba33] text-white dark:text-black'
                : 'bg-transparent border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-gray-50 dark:hover:enabled:bg-gray-800'
            }`}
          >
            3. Reporte Final
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {step === 2 && (
            <button
              onClick={handleClearQuantities}
              className="px-2.5 py-1 bg-transparent border border-red-300 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 font-sans text-xs font-semibold uppercase tracking-wider transition-colors"
            >
              Limpiar Todo
            </button>
          )}
          <div className="font-mono text-[10px] md:text-xs text-gray-500">
            CATÁLOGO: ABB ({catalog.length} ITEMS)
          </div>
        </div>
      </div>

      {calcError && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-mono uppercase">
          [ERROR]: {calcError}
        </div>
      )}

      {/* PASO 1: CONFIGURAR TABLEROS */}
      {step === 1 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-200">
          <div className="xl:col-span-8 bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
            <div className="bg-gray-100 dark:bg-[#1a1a1a] px-4 py-3 border-b border-gray-300 dark:border-gray-800 flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                Configuración de Tableros (Cotización en Paralelo)
              </h2>
              <button
                onClick={handleAddBoard}
                disabled={activeBoards.length >= 10}
                className="px-3 py-1 bg-[#286caf] dark:bg-[#faba33] hover:bg-[#1f568e] dark:hover:bg-[#e0a72d] disabled:opacity-40 text-white dark:text-black font-sans text-xs font-bold uppercase tracking-wider transition-colors"
              >
                + Añadir Tablero
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-xs text-gray-500 font-sans leading-relaxed">
                El sistema permite cotizar y comparar en paralelo hasta 10 tableros eléctricos independientes. Puede personalizar el nombre de cada uno (ej. Tablero de Bombas, Fuerza 1, Alumbrado) para facilitar la entrada rápida de equipos en el siguiente paso.
              </p>

              <div className="border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
                {activeBoards.map((board, idx) => (
                  <div key={board.id} className="p-3 sm:p-4 bg-gray-50/50 dark:bg-[#0d0d0d] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs font-bold bg-[#286caf]/10 dark:bg-[#faba33]/20 text-[#286caf] dark:text-[#faba33] px-2 py-1">
                        {board.id}
                      </span>
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          value={board.name}
                          onChange={(e) => handleBoardNameChange(board.id, e.target.value)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-700 font-sans text-sm font-semibold text-gray-800 dark:text-gray-200 focus:border-[#286caf] dark:focus:border-[#faba33] transition-colors"
                          placeholder="Nombre del tablero..."
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-end sm:self-auto">
                      {idx > 0 && (
                        <select
                          onChange={(e) => handleDuplicateBoardConfig(e.target.value, board.id)}
                          defaultValue=""
                          className="px-2 py-1 bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-700 font-sans text-xs text-gray-600 dark:text-gray-400 focus:border-[#286caf] dark:focus:border-[#faba33]"
                        >
                          <option value="" disabled>Copiar de...</option>
                          {activeBoards.filter(b => b.id !== board.id).map(b => (
                            <option key={b.id} value={b.id}>Copiar {b.id}</option>
                          ))}
                        </select>
                      )}
                      
                      {activeBoards.length > 1 && (
                        <button
                          onClick={() => handleRemoveBoard(board.id)}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-colors"
                          title="Eliminar tablero"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                className="bg-[#286caf] dark:bg-[#faba33] hover:bg-[#1f568e] dark:hover:bg-[#e0a72d] text-white dark:text-black font-sans text-xs font-bold uppercase tracking-wider py-3 px-6 transition-colors"
                >
                  Siguiente: Agregar Equipamiento →
                </button>
              </div>
            </div>
          </div>

          <div className="xl:col-span-4 bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-800 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
            <h3 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 pb-2 mb-3">Parámetros Financieros</h3>
            <div className="space-y-4">
              {/* DESCUENTO GLOBAL */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase">Descuento Global (sobre Precio Lista)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="99.9"
                    value={descuento}
                    onChange={(e) => setDescuento(Math.max(0, Math.min(99.9, parseFloat(e.target.value) || 0)))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 font-mono text-sm focus:border-[#286caf] dark:focus:border-[#faba33]"
                  />
                  <span className="absolute right-3 top-2 font-mono text-sm text-gray-400">%</span>
                </div>
                <p className="text-[10px] text-gray-500 font-sans mt-1.5 leading-relaxed">
                  Se aplica a todos los equipos del catálogo:
                  <br />
                  <code className="font-mono bg-gray-100 dark:bg-black/40 px-1 text-[9px]">Precio Unit. = Precio Lista × (1 − %Desc)</code>
                </p>
              </div>

              {/* MARGEN BRUTO */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase">Margen Bruto (%MB) Global</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="99.9"
                    value={mbPercentage}
                    onChange={(e) => setMbPercentage(Math.max(0, Math.min(99.9, parseFloat(e.target.value) || 0)))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 font-mono text-sm focus:border-[#286caf] dark:focus:border-[#faba33]"
                  />
                  <span className="absolute right-3 top-2 font-mono text-sm text-gray-400">%</span>
                </div>
                <p className="text-[10px] text-gray-500 font-sans mt-1.5 leading-relaxed">
                  El margen se calcula utilizando la fórmula financiera industrial:
                  <br />
                  <code className="font-mono bg-gray-100 dark:bg-black/40 px-1 text-[9px]">Margen = Costo / (1 - %MB) - Costo</code>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PASO 2: AGREGAR EQUIPAMIENTO */}
      {step === 2 && (
        <div className="space-y-6 animate-in fade-in duration-200">

        {/* ===== SECCIÓN: ANÁLISIS POR IMAGEN (IA) ===== */}
        <div className="bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
          <button
            onClick={() => setAiOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#286caf]/10 to-transparent dark:from-[#faba33]/15 border-b border-gray-300 dark:border-gray-800 text-left"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[#286caf] dark:text-[#faba33]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" /></svg>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">Detección Automática con IA</h2>
                <p className="text-[10px] text-gray-500 font-sans">Sube una foto, plano o diagrama unifilar y la IA detectará los componentes y los emparejará con el catálogo ABB.</p>
              </div>
            </div>
            <span className="text-[#286caf] dark:text-[#faba33] font-mono text-lg">{aiOpen ? '−' : '+'}</span>
          </button>

          {aiOpen && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Zona de carga */}
                <div className="space-y-3">
                  <label
                    onDragOver={handleAiDragOver}
                    onDragEnter={handleAiDragOver}
                    onDragLeave={handleAiDragLeave}
                    onDrop={handleAiDrop}
                    className={`block border-2 border-dashed transition-colors duration-150 cursor-pointer p-4 text-center ${
                      aiDragActive
                        ? 'border-[#286caf] dark:border-[#faba33] bg-[#286caf]/10 dark:bg-[#faba33]/15'
                        : 'border-gray-300 dark:border-gray-700 hover:border-[#286caf] dark:hover:border-[#faba33] bg-gray-50/50 dark:bg-[#0a0a0a]'
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleAiFileChange(e.target.files?.[0])}
                    />
                    {aiPreview ? (
                      <div className="space-y-2 pointer-events-none">
                        <img src={aiPreview} alt="Vista previa" className="max-h-48 mx-auto object-contain border border-gray-200 dark:border-gray-800" />
                        <p className="text-[10px] text-gray-400 font-mono truncate">{aiFile?.name}</p>
                      </div>
                    ) : (
                      <div className="py-6 pointer-events-none">
                        <svg className={`w-8 h-8 mx-auto mb-2 transition-colors ${aiDragActive ? 'text-[#286caf] dark:text-[#faba33]' : 'text-gray-400'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                        <p className="text-sm font-sans text-gray-700 dark:text-gray-300 font-semibold">
                          {aiDragActive ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para subir'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono mt-1">JPG, PNG, WEBP — máx. 10MB</p>
                      </div>
                    )}
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAnalyzeImage}
                      disabled={aiLoading || !aiFile}
                      className="flex-1 px-4 py-2 bg-[#286caf] dark:bg-[#faba33] hover:bg-[#1f568e] dark:hover:bg-[#e0a72d] disabled:opacity-40 text-white dark:text-black font-sans text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                    >
                      {aiLoading && <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full"></span>}
                      {aiLoading ? 'Analizando...' : 'Analizar Imagen'}
                    </button>
                    {aiFile && (
                      <button
                        onClick={resetAi}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  {aiError && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-[11px] font-mono">
                      {aiError}
                    </div>
                  )}
                </div>

                {/* Configuración / instrucciones */}
                <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400 font-sans">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Agregar componentes detectados a:</label>
                    <select
                      value={aiTargetBoard}
                      onChange={(e) => setAiTargetBoard(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 text-sm font-mono focus:border-[#286caf] dark:focus:border-[#faba33]"
                    >
                      {activeBoards.map(b => (
                        <option key={b.id} value={b.id}>{b.id} — {b.name}</option>
                      ))}
                    </select>
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                    <li>La IA detecta interruptores termomagnéticos (ITM) y diferenciales (ID).</li>
                    <li>Cada componente se empareja <strong>exclusivamente</strong> con el catálogo ABB.</li>
                    <li>Si la capacidad exacta (kA) no existe, se elige la siguiente que concuerda.</li>
                    <li>Revisa las coincidencias y agrégalas al tablero seleccionado.</li>
                  </ul>
                </div>
              </div>

              {/* Resultados de coincidencias */}
              {aiMatches && (() => {
                const matchable = aiMatches.filter(m => m.match)
                const addedCount = matchable.filter(m => matchQtyInTarget(m) > 0).length
                const allAdded = matchable.length > 0 && addedCount === matchable.length
                return (
                <div className="border border-gray-200 dark:border-gray-800">
                  <div className="flex flex-wrap gap-3 justify-between items-center px-3 py-2.5 bg-gray-50 dark:bg-[#0f0f0f] border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                        {aiMatches.length} Detectado(s)
                      </span>
                      {matchable.length > 0 && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 font-bold ${addedCount > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                          {addedCount}/{matchable.length} en {aiTargetBoard}
                        </span>
                      )}
                    </div>
                    {matchable.length > 0 && (
                      <div className="flex items-center gap-2">
                        {addedCount > 0 && (
                          <button
                            onClick={handleRemoveAllMatches}
                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            Quitar todos
                          </button>
                        )}
                        <button
                          onClick={handleApplyAllMatches}
                          disabled={allAdded}
                          className="px-3 py-1.5 bg-[#286caf] dark:bg-[#faba33] text-white dark:text-black text-[11px] font-bold uppercase tracking-wider hover:bg-[#1f568e] dark:hover:bg-[#e0a72d] disabled:opacity-40 transition-colors"
                        >
                          {allAdded ? 'Todos agregados' : `Agregar todos a ${aiTargetBoard}`}
                        </button>
                      </div>
                    )}
                  </div>

                  {aiMatches.length === 0 ? (
                    <p className="p-4 text-center font-mono text-xs text-gray-500 uppercase tracking-widest">No se detectaron componentes eléctricos en la imagen.</p>
                  ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                      {aiMatches.map((m, i) => {
                        const inTarget = matchQtyInTarget(m)
                        const isAdded = inTarget > 0
                        return (
                        <div key={i} className={`p-3 flex flex-col md:flex-row md:items-center gap-3 transition-colors ${isAdded ? 'bg-green-50/60 dark:bg-green-900/10' : ''}`}>
                          {/* Detectado */}
                          <div className="md:w-1/4">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Detectado por IA</span>
                            <span className="font-mono text-sm text-gray-800 dark:text-gray-200 font-bold">{m.component?.texto_detectado || '—'}</span>
                            <span className="text-[10px] text-gray-500 block font-mono">
                              {m.component?.categoria} · {m.component?.polos}P · {m.component?.amperaje}A
                              {m.component?.capacidad_ka ? ` · ${m.component.capacidad_ka}kA` : ''}
                              {m.component?.sensibilidad_ma ? ` · ${m.component.sensibilidad_ma}mA` : ''}
                              {` · x${m.component?.cantidad || 1}`}
                            </span>
                          </div>

                          {/* Flecha */}
                          <div className="text-[#286caf] dark:text-[#faba33] font-mono hidden md:block">→</div>

                          {/* Coincidencia */}
                          <div className="flex-1">
                            {m.match ? (
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-sm font-bold text-[#286caf] dark:text-[#faba33]">{m.match.codigo}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider ${m.exact ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                                    {m.exact ? 'Exacto' : 'Equivalente'}
                                  </span>
                                </div>
                                <span className="font-sans text-xs text-gray-800 dark:text-gray-200 font-medium block">{m.match.desc_corta} — {m.match.features}</span>
                                <span className="text-[10px] text-gray-500 block font-mono">{m.match.desc_larga} · {m.match.marca}</span>
                                {m.note && <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-sans mt-0.5">{m.note}</span>}
                              </div>
                            ) : (
                              <div>
                                <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Sin coincidencia</span>
                                <span className="text-[10px] text-gray-500 block font-sans">{m.note || 'No se encontró un equipo equivalente en el catálogo.'}</span>
                              </div>
                            )}
                          </div>

                          {/* Acción / Control de cantidad */}
                          <div className="md:w-auto md:min-w-[190px] flex flex-col items-stretch md:items-end gap-1.5">
                            {m.match ? (
                              isAdded ? (
                                <>
                                  <div className="flex items-center justify-between md:justify-end gap-2">
                                    <span className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider flex items-center gap-1">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                      En {aiTargetBoard}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => handleQtyChange(m.match.id, aiTargetBoard, inTarget - 1)}
                                        className="w-6 h-6 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center justify-center font-bold"
                                      >
                                        -
                                      </button>
                                      <span className="w-9 text-center font-mono font-bold text-sm text-gray-900 dark:text-gray-100">{inTarget}</span>
                                      <button
                                        onClick={() => handleQtyChange(m.match.id, aiTargetBoard, inTarget + 1)}
                                        className="w-6 h-6 bg-[#286caf] dark:bg-[#faba33] hover:bg-[#1f568e] dark:hover:bg-[#e0a72d] text-white dark:text-black flex items-center justify-center font-bold"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveMatch(m)}
                                    className="text-[10px] font-mono text-gray-500 hover:text-red-600 dark:hover:text-red-400 uppercase tracking-wider self-end"
                                  >
                                    Quitar del tablero
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleApplyMatch(m)}
                                  className="w-full md:w-auto px-3 py-1.5 bg-[#286caf] dark:bg-[#faba33] text-white dark:text-black text-[11px] font-bold uppercase tracking-wider hover:bg-[#1f568e] dark:hover:bg-[#e0a72d] transition-colors flex items-center justify-center gap-1"
                                >
                                  + Agregar {m.component?.cantidad > 1 ? `×${m.component.cantidad}` : ''} a {aiTargetBoard}
                                </button>
                              )
                            ) : (
                              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider text-right">No agregable</span>
                            )}
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}
                </div>
                )
              })()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          
          {/* COLUMNA FILTROS (3/12 xl) */}
          <div className="xl:col-span-3 space-y-4">
            <div className="bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-800 p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 pb-2 mb-3">Buscador ABB</h3>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Código, descripción..."
                className="w-full px-3 py-2 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 font-sans text-sm focus:border-[#286caf] dark:focus:border-[#faba33]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-1.5 text-[10px] font-mono text-[#286caf] dark:text-[#faba33] uppercase tracking-widest hover:underline block"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>

            <div className="bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-800 p-4 space-y-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 pb-2">Filtros Avanzados</h3>
              
              {/* CATEGORÍA */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Categoría</label>
                <div className="grid grid-cols-3 gap-1">
                  {['ALL', 'ITM', 'ID'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`py-1 text-center font-mono text-xs border ${
                        categoryFilter === cat
                          ? 'bg-[#286caf] dark:bg-[#faba33] border-[#286caf] dark:border-[#faba33] text-white dark:text-black font-bold'
                          : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {cat === 'ALL' ? 'Todos' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* TIPO DE MONTAJE */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Montaje (Tipo)</label>
                <div className="grid grid-cols-4 gap-1">
                  {['ALL', 'DIN', 'CM', 'SI'].map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setTipoFilter(tipo)}
                      className={`py-1 text-center font-mono text-xs border ${
                        tipoFilter === tipo
                          ? 'bg-[#286caf] dark:bg-[#faba33] border-[#286caf] dark:border-[#faba33] text-white dark:text-black font-bold'
                          : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {tipo === 'ALL' ? 'Todos' : tipo}
                    </button>
                  ))}
                </div>
              </div>

              {/* POLOS */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Polos</label>
                <select
                  value={polesFilter}
                  onChange={(e) => setPolesFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 text-xs font-mono focus:border-[#286caf] dark:focus:border-[#faba33]"
                >
                  <option value="ALL">Cualquiera</option>
                  {uniquePoles.map(poles => (
                    <option key={poles} value={poles}>{poles} Polos</option>
                  ))}
                </select>
              </div>

              {/* AMPERAJE */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Corriente (Amperaje)</label>
                <select
                  value={amperageFilter}
                  onChange={(e) => setAmperageFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 text-xs font-mono focus:border-[#286caf] dark:focus:border-[#faba33]"
                >
                  <option value="ALL">Cualquiera</option>
                  {uniqueAmperages.map(amp => (
                    <option key={amp} value={amp}>{amp} A</option>
                  ))}
                </select>
              </div>

              {/* FEATURES */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Features</label>
                <select
                  value={featuresFilter}
                  onChange={(e) => setFeaturesFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50 dark:bg-[#0a0a0a] border border-gray-300 dark:border-gray-700 text-xs font-mono focus:border-[#286caf] dark:focus:border-[#faba33]"
                >
                  <option value="ALL">Cualquiera</option>
                  {uniqueFeatures.map(feature => (
                    <option key={feature} value={feature}>{feature}</option>
                  ))}
                </select>
              </div>

              {/* BOTÓN RESTABLECER */}
              <button
                onClick={() => {
                  setCategoryFilter('ALL')
                  setTipoFilter('ALL')
                  setPolesFilter('ALL')
                  setAmperageFilter('ALL')
                  setFeaturesFilter('ALL')
                  setSearchQuery('')
                }}
                className="w-full py-1.5 text-center font-sans text-[10px] font-bold text-[#286caf] dark:text-[#faba33] border border-[#286caf]/30 dark:border-[#faba33]/40 uppercase tracking-widest hover:bg-[#286caf]/10 dark:hover:bg-[#faba33]/15"
              >
                Restablecer Filtros
              </button>
            </div>
          </div>

          {/* COLUMNA GRID EQUIPAMIENTO (9/12 xl) */}
          <div className="xl:col-span-9 space-y-4">
            <div className="bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
              <div className="bg-gray-100 dark:bg-[#1a1a1a] px-4 py-3 border-b border-gray-300 dark:border-gray-800 flex flex-wrap gap-4 justify-between items-center">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  Selección de Equipos ({filteredCatalog.length} Coincidencias)
                </h2>
                <button
                  onClick={handleCalculateBudget}
                  disabled={calculating || selectedCount === 0}
                  className="px-5 py-1.5 bg-[#286caf] dark:bg-[#faba33] hover:bg-[#1f568e] dark:hover:bg-[#e0a72d] disabled:opacity-40 text-white dark:text-black font-sans text-xs font-bold uppercase tracking-widest transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                >
                  {calculating ? 'Procesando...' : 'Siguiente: Ver Reporte →'}
                </button>
              </div>

              {filteredCatalog.length === 0 ? (
                <div className="p-8 text-center border-t border-gray-200 dark:border-gray-800">
                  <p className="font-mono text-xs text-gray-500 uppercase tracking-widest">No se encontraron productos coincidentes con los filtros.</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[600px] border-t border-gray-200 dark:border-gray-800">
                  <table className="industrial-table w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                    <thead className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-[#0f0f0f] sticky top-0 z-10 border-b border-gray-300 dark:border-gray-800">
                      <tr>
                        <th className="px-4 py-2 border-r border-gray-200 dark:border-gray-800/50">Código ABB</th>
                        <th className="px-4 py-2 border-r border-gray-200 dark:border-gray-800/50">Descripción Corta</th>
                        <th className="px-4 py-2 border-r border-gray-200 dark:border-gray-800/50 text-center">Detalle</th>
                        <th className="px-4 py-2 text-right border-r border-gray-200 dark:border-gray-800/50">Precio Lista</th>
                        {activeBoards.map(board => (
                          <th key={board.id} className="px-4 py-2 text-center border-r border-gray-200 dark:border-gray-800 last:border-r-0 bg-[#286caf]/10 dark:bg-[#faba33]/20">
                            {board.id} <span className="text-[9px] opacity-60 font-sans block truncate max-w-[80px]">{board.name}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs text-gray-700 dark:text-gray-300 divide-y divide-gray-200 dark:divide-gray-800/60">
                      {filteredCatalog.map(item => {
                        const hasAnyQtyOnRow = activeBoards.some(b => (quantities[item.id] && quantities[item.id][b.id]) > 0)
                        
                        return (
                          <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${hasAnyQtyOnRow ? 'bg-[#286caf]/10 dark:bg-[#faba33]/10' : ''}`}>
                            <td className="px-4 py-2 border-r border-gray-100 dark:border-gray-800/30 font-bold text-[#286caf] dark:text-[#faba33]">{item.codigo}</td>
                            <td className="px-4 py-2 border-r border-gray-100 dark:border-gray-800/30 font-sans text-gray-900 dark:text-gray-100 font-medium">
                              {item.desc_corta}
                              <span className="text-[10px] text-gray-400 block font-mono">{item.desc_larga}</span>
                            </td>
                            <td className="px-3 py-2 border-r border-gray-100 dark:border-gray-800/30 text-center">
                              <span className="inline-block text-[9px] bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-400 px-1.5 py-0.5 border border-gray-200 dark:border-gray-800">
                                {item.categoria} / {item.tipo} / {item.polos}P / {item.amperaje}A / {item.features || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right border-r border-gray-100 dark:border-gray-800/30 font-semibold">
                              S/.{item.precio_lista.toFixed(2)}
                              <span className="text-[9px] text-green-600 dark:text-green-500 block">Unit: S/.{effectiveUnitPrice(item).toFixed(2)} (-{Number(descuento)}%)</span>
                            </td>
                            
                            {activeBoards.map(board => {
                              const qty = (quantities[item.id] && quantities[item.id][board.id]) || 0
                              
                              return (
                                <td key={board.id} className="px-3 py-2 text-center border-r border-gray-100 dark:border-gray-800/30 last:border-r-0 bg-[#286caf]/5 dark:bg-[#faba33]/10">
                                  <div className="flex items-center justify-center space-x-1.5 mx-auto max-w-[120px]">
                                    <button
                                      onClick={() => adjustQty(item.id, board.id, -1)}
                                      className="w-5 h-5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center justify-center font-bold"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="0"
                                      value={qty || ''}
                                      onChange={(e) => handleQtyChange(item.id, board.id, e.target.value)}
                                      className="w-10 text-center px-1 py-0.5 bg-white dark:bg-black border border-gray-300 dark:border-gray-700 font-mono font-bold text-xs"
                                      placeholder="0"
                                    />
                                    <button
                                      onClick={() => adjustQty(item.id, board.id, 1)}
                                      className="w-5 h-5 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center justify-center font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* PASO 3: REPORTE FINAL */}
      {step === 3 && results && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center space-x-3 pb-2 border-b-2 border-[#286caf] dark:border-[#faba33]">
            <div className="px-2 py-1 bg-[#286caf] dark:bg-[#faba33] text-white dark:text-black text-[10px] font-bold font-mono tracking-widest uppercase">Reporte Generado</div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
              Análisis Presupuestario de Tableros Eléctricos
            </h2>
          </div>

          {/* TABLA DE PRODUCTOS SELECCIONADOS */}
          <div className="bg-white dark:bg-[#111] border border-gray-300 dark:border-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.05)]">
            <div className="bg-gray-800 text-white dark:bg-[#1a1a1a] px-4 py-3 border-b border-gray-900 dark:border-gray-800 flex justify-between items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider">Detalle del Equipamiento Solicitado</h3>
              <span className="text-[10px] font-mono opacity-60">PRECISIÓN MATEMÁTICA EN DFP</span>
            </div>

            <div className="overflow-x-auto">
              <table className="industrial-table w-full text-left text-sm whitespace-nowrap min-w-[800px]">
                <thead className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-[#0f0f0f]">
                  <tr>
                    <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-800/50">Código</th>
                    <th className="px-4 py-3 border-r border-gray-200 dark:border-gray-800/50">Material / Componente</th>
                    <th className="px-4 py-3 text-center border-r border-gray-200 dark:border-gray-800/50">UM</th>
                    <th className="px-4 py-3 text-right border-r border-gray-200 dark:border-gray-800/50">Precio Lista</th>
                    <th className="px-4 py-3 text-right border-r border-gray-200 dark:border-gray-800/50">Descuento</th>
                    <th className="px-4 py-3 text-right border-r border-gray-200 dark:border-gray-800/50">Precio Unit.</th>
                    <th className="px-4 py-3 text-center border-r border-gray-200 dark:border-gray-800/50 bg-[#286caf]/10 dark:bg-[#faba33]/20">Cant. Tot.</th>
                    <th className="px-4 py-3 text-right border-r border-gray-200 dark:border-gray-800/50 font-bold bg-[#286caf]/10 dark:bg-[#faba33]/20">Costo Tot.</th>
                    
                    {/* Columnas específicas para cada tablero activo */}
                    {activeBoards.map(board => (
                      <th key={board.id} className="px-4 py-3 text-right font-bold text-[#286caf] dark:text-[#faba33] border-r last:border-r-0 border-gray-200 dark:border-gray-800">
                        {board.id} <span className="text-[9px] text-gray-500 font-sans block truncate max-w-[80px]">{board.name}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-xs text-gray-700 dark:text-gray-300 divide-y divide-gray-200 dark:divide-gray-800/60">
                  {results.items.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-2 border-r border-gray-100 dark:border-gray-800/30 font-bold text-[#286caf] dark:text-[#faba33]">{row.codigo}</td>
                      <td className="px-4 py-2 border-r border-gray-100 dark:border-gray-800/30 font-sans font-medium text-gray-900 dark:text-gray-100">
                        {row.desc_corta}
                        <span className="text-[10px] text-gray-400 block font-mono">{row.desc_larga}</span>
                      </td>
                      <td className="px-4 py-2 border-r border-gray-100 dark:border-gray-800/30 text-center">{row.um}</td>
                      <td className="px-4 py-2 text-right border-r border-gray-100 dark:border-gray-800/30">S/.{row.precio_lista.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right border-r border-gray-100 dark:border-gray-800/30 text-green-600 dark:text-green-500 font-bold">{(row.descuento * 100).toFixed(0)}%</td>
                      <td className="px-4 py-2 text-right border-r border-gray-100 dark:border-gray-800/30 font-semibold">S/.{row.precio_unit.toFixed(2)}</td>
                      <td className="px-4 py-2 border-r border-gray-100 dark:border-gray-800/30 text-center font-bold bg-[#286caf]/10 dark:bg-[#faba33]/15">{row.total_qty}</td>
                      <td className="px-4 py-2 border-r border-gray-100 dark:border-gray-800/30 text-right font-bold text-gray-900 dark:text-gray-100 bg-[#286caf]/10 dark:bg-[#faba33]/15">S/.{row.total_price.toFixed(2)}</td>
                      
                      {/* Desglose por tablero */}
                      {activeBoards.map(board => {
                        const boardDetails = row.boards[board.id]
                        const qty = boardDetails ? boardDetails.qty : 0
                        const price = boardDetails ? boardDetails.total_price : 0.0

                        return (
                          <td key={board.id} className="px-4 py-2 text-right border-r last:border-r-0 border-gray-100 dark:border-gray-800/30 font-bold">
                            {qty > 0 ? (
                              <div>
                                S/.{price.toFixed(2)}
                                <span className="text-[9px] text-gray-400 font-sans block">Cant: {qty}</span>
                              </div>
                            ) : (
                              <span className="text-gray-300 dark:text-gray-800">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TABLA DE RESUMEN DE TOTALES Y MARGENES */}
            <div className="bg-gray-100 dark:bg-[#151515] p-4 md:p-6 border-t border-gray-300 dark:border-gray-800 flex justify-end">
              <div className="w-full xl:w-[800px] overflow-x-auto">
                <table className="w-full text-right font-mono text-xs md:text-sm min-w-[500px]">
                  <thead className="text-[10px] uppercase font-bold text-gray-500 border-b border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-black/10">
                    <tr>
                      <th className="py-2 px-3 text-left">Concepto Financiero</th>
                      <th className="py-2 px-3 text-[#286caf] dark:text-[#faba33]">Total Consolidado S/.</th>
                      {results.board_totals.map(bTotals => (
                        <th key={bTotals.id} className="py-2 px-3">
                          {bTotals.id} <span className="text-[8px] font-sans text-gray-400 block truncate max-w-[80px]">{bTotals.name}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-gray-800 dark:text-gray-200 divide-y divide-gray-200 dark:divide-gray-800/80">
                    {/* Costo Equipamiento */}
                    <tr>
                      <td className="py-2 md:py-3 px-3 font-bold font-sans text-left text-[10px] md:text-xs uppercase tracking-wider">Costo Equipamiento ABB</td>
                      <td className="py-2 md:py-3 px-3 font-bold text-[#286caf] dark:text-[#faba33]">S/.{results.grand_totals.costo_total.toFixed(2)}</td>
                      {results.board_totals.map(bTotals => (
                        <td key={bTotals.id} className="py-2 md:py-3 px-3">S/.{bTotals.costo_total.toFixed(2)}</td>
                      ))}
                    </tr>

                    {/* Margen Bruto */}
                    <tr>
                      <td className="py-2 md:py-3 px-3 font-sans text-left text-[10px] md:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Margen Bruto ({results.mb_percentage}%)</td>
                      <td className="py-2 md:py-3 px-3 text-gray-600 dark:text-gray-400">S/.{results.grand_totals.mb.toFixed(2)}</td>
                      {results.board_totals.map(bTotals => (
                        <td key={bTotals.id} className="py-2 md:py-3 px-3 text-gray-500 dark:text-gray-400">S/.{bTotals.mb.toFixed(2)}</td>
                      ))}
                    </tr>

                    {/* Subtotal */}
                    <tr className="bg-white/50 dark:bg-black/10 font-bold">
                      <td className="py-2 md:py-3 px-3 font-sans text-left text-[10px] md:text-xs uppercase tracking-wider">Subtotal (Precio Venta)</td>
                      <td className="py-2 md:py-3 px-3">S/.{results.grand_totals.subtotal.toFixed(2)}</td>
                      {results.board_totals.map(bTotals => (
                        <td key={bTotals.id} className="py-2 md:py-3 px-3">S/.{bTotals.subtotal.toFixed(2)}</td>
                      ))}
                    </tr>

                    {/* IGV */}
                    <tr>
                      <td className="py-2 md:py-3 px-3 font-sans text-left text-[10px] md:text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">IGV (18%)</td>
                      <td className="py-2 md:py-3 px-3 text-gray-600 dark:text-gray-400">S/.{results.grand_totals.igv.toFixed(2)}</td>
                      {results.board_totals.map(bTotals => (
                        <td key={bTotals.id} className="py-2 md:py-3 px-3 text-gray-500 dark:text-gray-400">S/.{bTotals.igv.toFixed(2)}</td>
                      ))}
                    </tr>

                    {/* Total Final */}
                    <tr className="bg-[#286caf] dark:bg-[#faba33] text-white dark:text-black font-bold">
                      <td className="py-3 md:py-4 px-3 font-sans text-left text-[10px] md:text-sm uppercase tracking-widest">Total Final con IGV</td>
                      <td className="py-3 md:py-4 px-3 text-sm md:text-lg">S/.{results.grand_totals.total.toFixed(2)}</td>
                      {results.board_totals.map(bTotals => (
                        <td key={bTotals.id} className="py-3 md:py-4 px-3 text-xs md:text-sm">S/.{bTotals.total.toFixed(2)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ACCIONES DE FIN DE COTIZACIÓN */}
          <div className="flex flex-wrap gap-4 justify-between items-center bg-white dark:bg-[#111] p-4 border border-gray-300 dark:border-gray-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ← Volver y Editar Equipos
            </button>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-transparent border border-[#286caf] dark:border-[#faba33] text-[#286caf] dark:text-[#faba33] hover:bg-[#286caf]/10 dark:hover:bg-[#faba33]/15 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Imprimir Reporte
              </button>
              <button
                onClick={() => {
                  if (confirm('¿Desea iniciar una nueva cotización? Se borrarán los datos actuales.')) {
                    setQuantities({})
                    setResults(null)
                    setStep(1)
                  }
                }}
                className="px-5 py-2 bg-[#286caf] dark:bg-[#faba33] hover:bg-[#1f568e] dark:hover:bg-[#e0a72d] text-white dark:text-black text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Nueva Cotización
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NOTIFICACIONES (TOASTS) ===== */}
      {toasts.length > 0 && (
        <div className="fixed top-16 left-3 right-3 sm:left-auto sm:right-4 sm:w-96 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 border shadow-[3px_3px_0px_0px_rgba(0,0,0,0.12)] dark:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] toast-enter w-full ${
                t.type === 'success'
                  ? 'bg-white dark:bg-[#0f1a12] border-green-300 dark:border-green-800'
                  : t.type === 'error'
                  ? 'bg-white dark:bg-[#1a0f0f] border-red-300 dark:border-red-800'
                  : 'bg-white dark:bg-[#0f1419] border-gray-300 dark:border-gray-700'
              }`}
            >
              <span className={`mt-0.5 shrink-0 ${
                t.type === 'success' ? 'text-green-600 dark:text-green-400'
                : t.type === 'error' ? 'text-red-600 dark:text-red-400'
                : 'text-[#286caf] dark:text-[#faba33]'
              }`}>
                {t.type === 'success' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : t.type === 'error' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                )}
              </span>
              <p className="flex-1 text-xs font-sans text-gray-800 dark:text-gray-100 leading-snug font-medium break-words">{t.message}</p>
              <button
                onClick={() => dismissToast(t.id)}
                className="shrink-0 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mt-0.5"
                aria-label="Cerrar notificación"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
