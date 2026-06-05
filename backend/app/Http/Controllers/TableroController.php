<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TableroController extends Controller
{
    /**
     * Get the compiled catalog of electrical equipment.
     */
    public function catalog()
    {
        $path = storage_path('app/tablero_catalog.json');

        if (!file_exists($path)) {
            return response()->json([
                'error' => 'El catálogo de equipos no está disponible. Por favor compile el archivo Excel.'
            ], 404);
        }

        $catalogJson = file_get_contents($path);
        $catalog = json_decode($catalogJson, true);

        return response()->json($catalog);
    }

    /**
     * Calculate budget for electrical boards.
     */
    public function calculate(Request $request)
    {
        $validated = $request->validate([
            'active_boards' => 'required|array|min:1',
            'active_boards.*.id' => 'required|string',
            'active_boards.*.name' => 'required|string',
            'items' => 'required|array',
            'items.*.id' => 'required|integer',
            'items.*.quantities' => 'required|array',
            'mb_percentage' => 'numeric|min:0|max:99.9',
            'descuento_percentage' => 'nullable|numeric|min:0|max:99.9',
        ]);

        $path = storage_path('app/tablero_catalog.json');
        if (!file_exists($path)) {
            return response()->json(['error' => 'Catálogo no encontrado.'], 500);
        }

        $catalog = json_decode(file_get_contents($path), true);
        $catalogMap = [];
        foreach ($catalog as $item) {
            $catalogMap[$item['id']] = $item;
        }

        $activeBoards = $validated['active_boards'];
        $itemsData = $validated['items'];
        $porcentaje_mb = ($request->input('mb_percentage', 20.0)) / 100;

        // Descuento global parametrizable: si se envía, reemplaza el descuento fijo del catálogo.
        $descuentoInput = $request->input('descuento_percentage', null);
        $descuentoGlobal = ($descuentoInput === null || $descuentoInput === '')
            ? null
            : floatval($descuentoInput) / 100;

        // Initialize totals per board
        $boardTotals = [];
        foreach ($activeBoards as $board) {
            $boardTotals[$board['id']] = [
                'id' => $board['id'],
                'name' => $board['name'],
                'costo_total' => 0.0,
                'mb' => 0.0,
                'subtotal' => 0.0,
                'igv' => 0.0,
                'total' => 0.0,
            ];
        }

        $calculatedItems = [];
        
        foreach ($itemsData as $itemInput) {
            $itemId = $itemInput['id'];
            if (!isset($catalogMap[$itemId])) {
                continue;
            }

            $catalogItem = $catalogMap[$itemId];
            $quantities = $itemInput['quantities'];

            // Aplicar descuento global si fue enviado; de lo contrario usar el del catálogo.
            $descuentoItem = $descuentoGlobal !== null ? $descuentoGlobal : $catalogItem['descuento'];
            $precioUnit = round($catalogItem['precio_lista'] * (1 - $descuentoItem), 2);

            // Calculate total quantity for this item across all boards
            $totalQuantity = 0;
            $boardDetails = [];

            foreach ($activeBoards as $board) {
                $boardId = $board['id'];
                $qty = isset($quantities[$boardId]) ? intval($quantities[$boardId]) : 0;
                
                if ($qty < 0) {
                    $qty = 0;
                }

                $totalQuantity += $qty;

                // Price for this specific board
                $itemBoardPrice = $qty * $precioUnit;
                $boardDetails[$boardId] = [
                    'qty' => $qty,
                    'total_price' => $itemBoardPrice
                ];

                // Accumulate raw cost in board total
                $boardTotals[$boardId]['costo_total'] += $itemBoardPrice;
            }

            // Skip if the total quantity is 0
            if ($totalQuantity === 0) {
                continue;
            }

            $calculatedItems[] = [
                'id' => $catalogItem['id'],
                'codigo' => $catalogItem['codigo'],
                'desc_corta' => $catalogItem['desc_corta'],
                'desc_larga' => $catalogItem['desc_larga'],
                'um' => $catalogItem['um'],
                'marca' => $catalogItem['marca'],
                'features' => $catalogItem['features'],
                'categoria' => $catalogItem['categoria'],
                'tipo' => $catalogItem['tipo'],
                'polos' => $catalogItem['polos'],
                'amperaje' => $catalogItem['amperaje'],
                'modelo' => $catalogItem['modelo'],
                'precio_lista' => $catalogItem['precio_lista'],
                'descuento' => $descuentoItem,
                'precio_unit' => $precioUnit,
                'total_qty' => $totalQuantity,
                'total_price' => $totalQuantity * $precioUnit,
                'boards' => $boardDetails
            ];
        }

        // Compute MB, Subtotal, IGV and Grand Totals
        $grandTotals = [
            'costo_total' => 0.0,
            'mb' => 0.0,
            'subtotal' => 0.0,
            'igv' => 0.0,
            'total' => 0.0
        ];

        foreach ($boardTotals as $boardId => &$totals) {
            $costo_total = $totals['costo_total'];
            
            // Margin Bruto calculation: MB = Costo / (1 - %MB) - Costo
            if ($porcentaje_mb < 1.0) {
                $mb = ($costo_total / (1 - $porcentaje_mb)) - $costo_total;
            } else {
                $mb = 0.0;
            }
            
            $subtotal = $costo_total + $mb;
            $igv = $subtotal * 0.18;
            $total = $subtotal + $igv;

            $totals['mb'] = $mb;
            $totals['subtotal'] = $subtotal;
            $totals['igv'] = $igv;
            $totals['total'] = $total;

            // Grand totals accumulation
            $grandTotals['costo_total'] += $costo_total;
            $grandTotals['mb'] += $mb;
            $grandTotals['subtotal'] += $subtotal;
            $grandTotals['igv'] += $igv;
            $grandTotals['total'] += $total;
        }

        return response()->json([
            'active_boards' => $activeBoards,
            'items' => $calculatedItems,
            'mb_percentage' => $request->input('mb_percentage', 20.0),
            'descuento_percentage' => $descuentoGlobal !== null ? round($descuentoGlobal * 100, 1) : null,
            'board_totals' => array_values($boardTotals),
            'grand_totals' => $grandTotals
        ]);
    }

    /**
     * Analiza una imagen de un tablero/diagrama eléctrico con Gemini, detecta
     * los componentes y los compara EXCLUSIVAMENTE contra el catálogo ABB.
     */
    public function analyzeImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:10240', // hasta 10MB
        ]);

        $apiKey = config('services.gemini.key');
        if (empty($apiKey)) {
            return response()->json([
                'error' => 'La API Key de Gemini no está configurada. Defina GEMINI_API_KEY en el archivo .env del backend.'
            ], 500);
        }

        $catalogPath = storage_path('app/tablero_catalog.json');
        if (!file_exists($catalogPath)) {
            return response()->json(['error' => 'Catálogo no encontrado.'], 500);
        }
        $catalog = json_decode(file_get_contents($catalogPath), true);

        $file = $request->file('image');
        $mime = $file->getMimeType();
        $base64 = base64_encode(file_get_contents($file->getRealPath()));

        $model = config('services.gemini.model', 'gemini-2.5-flash');

        $prompt = <<<PROMPT
Eres un ingeniero eléctrico experto en tableros eléctricos y protecciones ABB.
Analiza la imagen (puede ser un diagrama unifilar, una foto de un tablero físico, una lista de materiales o un plano).
Detecta TODOS los componentes de protección eléctrica visibles: interruptores termomagnéticos (ITM / breakers / MCB / MCCB) e interruptores diferenciales (ID / RCD / diferenciales).

Para CADA componente devuelve un objeto con estos campos:
- "categoria": "ITM" para interruptores termomagnéticos/breakers, "ID" para interruptores diferenciales.
- "polos": número entero de polos (1, 2, 3 o 4). Si ves "3x" significa 3 polos.
- "amperaje": corriente nominal en amperios (entero). Ej: en "3x30A" el amperaje es 30.
- "capacidad_ka": capacidad de ruptura en kA si es visible (entero), si no, null. Ej: "16kA" -> 16.
- "sensibilidad_ma": para diferenciales, sensibilidad en mA (ej 30), si no aplica null.
- "cantidad": cantidad de unidades de ese componente (entero, mínimo 1).
- "texto_detectado": el texto literal o descripción de lo que detectaste.

Responde ÚNICAMENTE con un JSON válido con esta forma exacta:
{ "componentes": [ { "categoria": "ITM", "polos": 3, "amperaje": 30, "capacidad_ka": 16, "sensibilidad_ma": null, "cantidad": 1, "texto_detectado": "3x30A 16kA" } ] }
Si no detectas ningún componente eléctrico, responde { "componentes": [] }.
PROMPT;

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(120)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post(
                    "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}",
                    [
                        'contents' => [[
                            'parts' => [
                                ['text' => $prompt],
                                ['inline_data' => ['mime_type' => $mime, 'data' => $base64]],
                            ],
                        ]],
                        'generationConfig' => [
                            'temperature' => 0.1,
                            'responseMimeType' => 'application/json',
                        ],
                    ]
                );
        } catch (\Throwable $e) {
            return response()->json(['error' => 'No se pudo contactar con el servicio de IA: ' . $e->getMessage()], 502);
        }

        if (!$response->successful()) {
            return response()->json([
                'error' => 'El servicio de IA respondió con un error.',
                'detail' => $response->json('error.message') ?? $response->body(),
            ], 502);
        }

        $text = data_get($response->json(), 'candidates.0.content.parts.0.text', '');
        $detected = $this->parseDetectedComponents($text);

        // Comparar cada componente detectado contra el catálogo.
        $matches = [];
        foreach ($detected as $comp) {
            $matches[] = $this->matchComponentToCatalog($comp, $catalog);
        }

        return response()->json([
            'detected' => $detected,
            'matches' => $matches,
        ]);
    }

    /**
     * Extrae el JSON de componentes de la respuesta de texto de Gemini.
     */
    private function parseDetectedComponents(string $text): array
    {
        $text = trim($text);
        // Remover fences de markdown si los hubiera.
        $text = preg_replace('/^```(?:json)?\s*/i', '', $text);
        $text = preg_replace('/\s*```$/', '', $text);

        $data = json_decode($text, true);
        if (!is_array($data)) {
            // Intento de rescate: buscar el primer bloque {...}
            if (preg_match('/\{.*\}/s', $text, $m)) {
                $data = json_decode($m[0], true);
            }
        }

        $componentes = is_array($data) && isset($data['componentes']) ? $data['componentes'] : [];
        $clean = [];
        foreach ($componentes as $c) {
            $clean[] = [
                'categoria' => isset($c['categoria']) ? strtoupper(trim($c['categoria'])) : null,
                'polos' => isset($c['polos']) && $c['polos'] !== null ? intval($c['polos']) : null,
                'amperaje' => isset($c['amperaje']) && $c['amperaje'] !== null ? intval($c['amperaje']) : null,
                'capacidad_ka' => isset($c['capacidad_ka']) && $c['capacidad_ka'] !== null ? intval($c['capacidad_ka']) : null,
                'sensibilidad_ma' => isset($c['sensibilidad_ma']) && $c['sensibilidad_ma'] !== null ? intval($c['sensibilidad_ma']) : null,
                'cantidad' => isset($c['cantidad']) && intval($c['cantidad']) > 0 ? intval($c['cantidad']) : 1,
                'texto_detectado' => isset($c['texto_detectado']) ? (string) $c['texto_detectado'] : '',
            ];
        }
        return $clean;
    }

    /**
     * Extrae la capacidad de ruptura en kA desde el campo "features" del catálogo.
     * Ej: "25kA@240VAC" -> 25, "6kA@230VAC" -> 6.
     */
    private function extractKaFromFeatures(?string $features): ?int
    {
        if (!$features) {
            return null;
        }
        if (preg_match('/(\d+(?:\.\d+)?)\s*kA/i', $features, $m)) {
            return (int) round(floatval($m[1]));
        }
        return null;
    }

    /**
     * Extrae la sensibilidad en mA desde el campo "features". Ej: "30mA" -> 30.
     */
    private function extractMaFromFeatures(?string $features): ?int
    {
        if (!$features) {
            return null;
        }
        if (preg_match('/(\d+)\s*mA/i', $features, $m)) {
            return (int) $m[1];
        }
        return null;
    }

    /**
     * Compara un componente detectado contra el catálogo y devuelve la mejor
     * coincidencia. Regla: igualar categoría, polos y amperaje exactos; entre
     * los candidatos, elegir el de capacidad (kA) más cercana hacia arriba a la
     * requerida (la "siguiente que concuerde"). Si no hay capacidad requerida o
     * no hay candidato >= , se elige el de menor capacidad/precio disponible.
     */
    private function matchComponentToCatalog(array $comp, array $catalog): array
    {
        $result = [
            'component' => $comp,
            'match' => null,
            'exact' => false,
            'note' => null,
        ];

        $categoria = $comp['categoria'];
        $polos = $comp['polos'];
        $amperaje = $comp['amperaje'];
        $reqKa = $comp['capacidad_ka'];
        $reqMa = $comp['sensibilidad_ma'];

        // Candidatos por categoría + polos + amperaje exactos.
        $candidates = array_values(array_filter($catalog, function ($item) use ($categoria, $polos, $amperaje) {
            $okCat = $categoria ? ($item['categoria'] === $categoria) : true;
            $okPolos = $polos !== null ? (intval($item['polos']) === $polos) : true;
            $okAmp = $amperaje !== null ? (intval($item['amperaje']) === $amperaje) : true;
            return $okCat && $okPolos && $okAmp;
        }));

        // Si no hay coincidencia exacta de amperaje, buscar el amperaje superior más cercano.
        if (empty($candidates) && $amperaje !== null) {
            $byCatPole = array_values(array_filter($catalog, function ($item) use ($categoria, $polos) {
                $okCat = $categoria ? ($item['categoria'] === $categoria) : true;
                $okPolos = $polos !== null ? (intval($item['polos']) === $polos) : true;
                return $okCat && $okPolos;
            }));
            // Amperajes >= requerido, el menor de ellos.
            $upper = array_values(array_filter($byCatPole, fn($i) => intval($i['amperaje']) >= $amperaje));
            if (!empty($upper)) {
                usort($upper, fn($a, $b) => intval($a['amperaje']) <=> intval($b['amperaje']));
                $minAmp = intval($upper[0]['amperaje']);
                $candidates = array_values(array_filter($upper, fn($i) => intval($i['amperaje']) === $minAmp));
                $result['note'] = "No existe {$amperaje}A; se usó el amperaje superior {$minAmp}A.";
            }
        }

        if (empty($candidates)) {
            $result['note'] = 'Sin coincidencia en el catálogo.';
            return $result;
        }

        // Para diferenciales, priorizar la sensibilidad (mA) solicitada si existe.
        if ($categoria === 'ID' && $reqMa !== null) {
            $byMa = array_values(array_filter($candidates, fn($i) => $this->extractMaFromFeatures($i['features']) === $reqMa));
            if (!empty($byMa)) {
                $candidates = $byMa;
            }
        }

        // Elegir por capacidad de ruptura (kA): la siguiente que concuerde (>= requerida).
        if ($reqKa !== null) {
            // Candidatos cuya kA >= requerida.
            $upperKa = array_values(array_filter($candidates, function ($i) use ($reqKa) {
                $ka = $this->extractKaFromFeatures($i['features']);
                return $ka !== null && $ka >= $reqKa;
            }));
            if (!empty($upperKa)) {
                usort($upperKa, function ($a, $b) {
                    return $this->extractKaFromFeatures($a['features']) <=> $this->extractKaFromFeatures($b['features']);
                });
                $best = $upperKa[0];
                $bestKa = $this->extractKaFromFeatures($best['features']);
                $result['match'] = $best;
                $result['exact'] = ($bestKa === $reqKa);
                if (!$result['exact']) {
                    $result['note'] = trim(($result['note'] ? $result['note'] . ' ' : '') . "Capacidad {$reqKa}kA no disponible; se usó {$bestKa}kA (la siguiente que concuerda).");
                }
                return $result;
            }
            // Si ninguna alcanza la requerida, tomar la de mayor kA disponible.
            usort($candidates, function ($a, $b) {
                return ($this->extractKaFromFeatures($b['features']) ?? 0) <=> ($this->extractKaFromFeatures($a['features']) ?? 0);
            });
            $best = $candidates[0];
            $bestKa = $this->extractKaFromFeatures($best['features']);
            $result['match'] = $best;
            $result['exact'] = false;
            $result['note'] = trim(($result['note'] ? $result['note'] . ' ' : '') . "Capacidad {$reqKa}kA supera el catálogo; se usó la máxima disponible ({$bestKa}kA).");
            return $result;
        }

        // Sin kA requerida: elegir la menor capacidad disponible (más económica/básica).
        usort($candidates, function ($a, $b) {
            $ka = ($this->extractKaFromFeatures($a['features']) ?? 9999) <=> ($this->extractKaFromFeatures($b['features']) ?? 9999);
            if ($ka !== 0) return $ka;
            return floatval($a['precio_lista']) <=> floatval($b['precio_lista']);
        });
        $result['match'] = $candidates[0];
        $result['exact'] = true;
        return $result;
    }
}
