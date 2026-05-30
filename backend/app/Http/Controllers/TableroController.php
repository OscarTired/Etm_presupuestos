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
                $itemBoardPrice = $qty * $catalogItem['precio_unit'];
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
                'descuento' => $catalogItem['descuento'],
                'precio_unit' => $catalogItem['precio_unit'],
                'total_qty' => $totalQuantity,
                'total_price' => $totalQuantity * $catalogItem['precio_unit'],
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
            'board_totals' => array_values($boardTotals),
            'grand_totals' => $grandTotals
        ]);
    }
}
