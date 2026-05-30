<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class CalculatorController extends Controller
{
    public function calculate(Request $request)
    {
        // Validación de los parámetros
        $validated = $request->validate([
            'H' => 'required|numeric|min:0',
            'W' => 'required|numeric|min:0',
            'D' => 'required|numeric|min:0',
            'chapas' => 'required|integer|min:0',
            'bisagras' => 'required|integer|min:0',
            'costo_plancha_cuerpo' => 'numeric|min:0',
            'costo_plancha_mandil' => 'numeric|min:0',
            'costo_pintado_cuerpo' => 'numeric|min:0',
            'costo_pintado_mandil' => 'numeric|min:0',
            'mb_percentage' => 'numeric|min:0|max:100',
        ]);

        // Convertir milímetros a metros
        $h_m = $validated['H'] / 1000;
        $w_m = $validated['W'] / 1000;
        $d_m = $validated['D'] / 1000;
        $chapas = $validated['chapas'];
        $bisagras = $validated['bisagras'];

        // Variables de costos dinámicos
        $costo_plancha_cuerpo = $request->input('costo_plancha_cuerpo', 140.00);
        $costo_plancha_mandil = $request->input('costo_plancha_mandil', 140.00);
        $costo_pintado_cuerpo = $request->input('costo_pintado_cuerpo', 25.00);
        $costo_pintado_mandil = $request->input('costo_pintado_mandil', 25.00);
        $porcentaje_mb = $request->input('mb_percentage', 20.0) / 100;

        // A. Cálculo del área para el material (Planchas) - Resultados en m2
        $area_material = [
            'HW (H*W)' => $h_m * $w_m,
            'HD (H*D)' => $h_m * $d_m,
            'WD (W*D)' => $w_m * $d_m,
            'Cabeceras (BS)' => 2 * $w_m * $d_m,
            'Cuerpo (C)' => ($h_m * $w_m) + (2 * $h_m * $d_m),
            'Puerta (P1)' => $h_m * $w_m,
            'Placa (P2)' => $h_m * $w_m,
            'Gabinete (G)' => (3 * $h_m * $w_m) + 2 * (($h_m * $d_m) + ($w_m * $d_m)),
            'Mandil (M)' => $h_m * $w_m,
        ];

        // B. Cálculo de los perímetros para el corte - Resultados en m
        $perimetro_corte = [
            'Cabeceras (BS)' => 4 * $w_m + 4 * $d_m,
            'Cuerpo (C)' => 2 * $h_m + 2 * $w_m + 4 * $d_m,
            'Puerta (P1)' => 2 * $h_m + 2 * $w_m,
            'Placa (P2)' => 2 * $h_m + 2 * $w_m,
            'Gabinete (G)' => 6 * $h_m + 10 * $w_m + 8 * $d_m,
            'Mandil (M1)' => 2 * $h_m + 2 * $w_m,
            'Columna (M2)' => 4 * $h_m,
            'T. Mandil (M)' => 6 * $h_m + 2 * $w_m,
        ];

        // C. Cálculo de pliegues de doblez (Cantidades enteras fijas)
        $pliegues_doblez = [
            'BS' => 6,
            'C' => 8,
            'P1' => 4,
            'P2' => 4,
            'G' => 22,
            'M1' => 4,
            'M2' => 6,
            'M' => 10,
        ];

        // D. Perímetros para soldadura (m)
        $perimetro_soldadura = [
            'Cuerpo (C)' => 2 * $w_m + 4 * $d_m,
        ];

        // E. Área para el pintado (Ambas caras) - Resultados en m2
        $area_pintado = [
            'Cabeceras (BS)' => 4 * $w_m * $d_m,
            'Cuerpo (C)' => (2 * $h_m * $w_m) + (4 * $h_m * $d_m),
            'Puerta (P1)' => 2 * $h_m * $w_m,
            'Placa (P2)' => 2 * $h_m * $w_m,
            'Gabinete (G)' => (6 * $h_m * $w_m) + 4 * (($h_m * $d_m) + ($w_m * $d_m)),
            'Mandil (M)' => 2 * $h_m * $w_m,
        ];

        // F. Parámetros para el Ensamblaje
        $parametros_ensamblaje = [
            'Cuerpo' => [
                'chapas' => $chapas,
                'bisagras' => $bisagras,
            ],
            'Mandil' => [
                'chapas' => $chapas,
                'bisagras' => $bisagras,
            ],
        ];

        // G. Área para el embalaje (m2)
        $area_embalaje = [
            'Cuerpo (C)' => 2 * (($h_m * $w_m) + ($h_m * $d_m) + ($w_m * $d_m)),
            'Pallet (PL)' => $w_m * $d_m,
        ];

        // H. Tabla de Costos y Totales
        $base_costos = [
            ['id' => '1.1', 'material' => 'Plancha LAF', 'denominacion' => 'CUERPO', 'costo_glb' => (float)$costo_plancha_cuerpo, 'medida_glb' => 2.88, 'dfp' => 'Km', 'factor_p' => 1.10, 'p_calc' => $area_material['Gabinete (G)'], 'sum_in_total' => true],
            ['id' => '1.2', 'material' => 'Plancha LAF', 'denominacion' => 'MANDIL', 'costo_glb' => (float)$costo_plancha_mandil, 'medida_glb' => 2.88, 'dfp' => 'Km', 'factor_p' => 1.10, 'p_calc' => $area_material['Mandil (M)'], 'sum_in_total' => true],
            ['id' => '1.3', 'material' => 'Serv. Corte', 'denominacion' => 'CUERPO', 'costo_glb' => 10.00, 'medida_glb' => 22.5, 'dfp' => 'Kc', 'factor_p' => 5.00, 'p_calc' => $perimetro_corte['Gabinete (G)'], 'sum_in_total' => true],
            ['id' => '1.4', 'material' => 'Serv. Corte', 'denominacion' => 'MANDIL', 'costo_glb' => 10.00, 'medida_glb' => 22.5, 'dfp' => 'Kc', 'factor_p' => 5.00, 'p_calc' => $perimetro_corte['T. Mandil (M)'], 'sum_in_total' => true],
            ['id' => '1.5', 'material' => 'Serv. Doblez', 'denominacion' => 'CUERPO', 'costo_glb' => 1.00, 'medida_glb' => 1, 'dfp' => 'Kd', 'factor_p' => 3.00, 'p_calc' => $pliegues_doblez['G'], 'sum_in_total' => true],
            ['id' => '1.6', 'material' => 'Serv. Doblez', 'denominacion' => 'MANDIL', 'costo_glb' => 1.00, 'medida_glb' => 1, 'dfp' => 'Kd', 'factor_p' => 3.00, 'p_calc' => $pliegues_doblez['M'], 'sum_in_total' => true],
            ['id' => '1.7', 'material' => 'Soldadura y Esmerilado', 'denominacion' => 'CUERPO', 'costo_glb' => 5.00, 'medida_glb' => 1, 'dfp' => 'Ks', 'factor_p' => 2.00, 'p_calc' => $perimetro_soldadura['Cuerpo (C)'], 'sum_in_total' => true],
            ['id' => '1.8', 'material' => 'Soldadura y Esmerilado', 'denominacion' => 'MANDIL', 'costo_glb' => 5.00, 'medida_glb' => 1, 'dfp' => 'Ks', 'factor_p' => 2.00, 'p_calc' => 0, 'sum_in_total' => false],
            ['id' => '1.9', 'material' => 'Pintado 1 Capa', 'denominacion' => 'CUERPO', 'costo_glb' => (float)$costo_pintado_cuerpo, 'medida_glb' => 1, 'dfp' => 'Kp', 'factor_p' => 1.40, 'p_calc' => $area_pintado['Gabinete (G)'], 'sum_in_total' => true],
            ['id' => '1.10', 'material' => 'Pintado 1 Capa', 'denominacion' => 'MANDIL', 'costo_glb' => (float)$costo_pintado_mandil, 'medida_glb' => 1, 'dfp' => 'Kp', 'factor_p' => 1.40, 'p_calc' => $area_pintado['Mandil (M)'], 'sum_in_total' => true],
            ['id' => '1.11', 'material' => 'Chapas', 'denominacion' => 'CUERPO', 'costo_glb' => 5.00, 'medida_glb' => 1, 'dfp' => 'Kch', 'factor_p' => 3.00, 'p_calc' => $chapas, 'sum_in_total' => true],
            ['id' => '1.12', 'material' => 'Chapas', 'denominacion' => 'MANDIL', 'costo_glb' => 5.00, 'medida_glb' => 1, 'dfp' => 'Kch', 'factor_p' => 3.00, 'p_calc' => $chapas, 'sum_in_total' => true],
            ['id' => '1.13', 'material' => 'Bisagras', 'denominacion' => 'CUERPO', 'costo_glb' => 5.00, 'medida_glb' => 1, 'dfp' => 'Kbs', 'factor_p' => 1.95, 'p_calc' => $bisagras, 'sum_in_total' => true],
            ['id' => '1.14', 'material' => 'Bisagras', 'denominacion' => 'MANDIL', 'costo_glb' => 5.00, 'medida_glb' => 1, 'dfp' => 'Kbs', 'factor_p' => 1.95, 'p_calc' => $bisagras, 'sum_in_total' => false],
            ['id' => '1.15', 'material' => 'Frisado', 'denominacion' => 'CUERPO', 'costo_glb' => 16.00, 'medida_glb' => 1, 'dfp' => 'Kf', 'factor_p' => 1.10, 'p_calc' => $perimetro_corte['Puerta (P1)'], 'sum_in_total' => false],
            ['id' => '1.16', 'material' => 'Frisado', 'denominacion' => 'MANDIL', 'costo_glb' => 16.00, 'medida_glb' => 1, 'dfp' => 'Kf', 'factor_p' => 1.10, 'p_calc' => 0, 'sum_in_total' => false],
            ['id' => '1.17', 'material' => 'Embalaje', 'denominacion' => 'CUERPO', 'costo_glb' => 1.00, 'medida_glb' => 1, 'dfp' => 'Kem', 'factor_p' => 4.00, 'p_calc' => $area_embalaje['Cuerpo (C)'], 'sum_in_total' => false],
            ['id' => '1.18', 'material' => 'Embalaje', 'denominacion' => 'MANDIL', 'costo_glb' => 1.00, 'medida_glb' => 1, 'dfp' => 'Kem', 'factor_p' => 4.00, 'p_calc' => $area_embalaje['Pallet (PL)'], 'sum_in_total' => false],
        ];

        $tabla_costos = [];
        $total_cuerpo = 0;
        $total_mandil = 0;

        foreach ($base_costos as $item) {
            $costo_um = $item['costo_glb'] / $item['medida_glb'];
            $costo_100 = $costo_um * $item['p_calc'];
            $costo_prod = $costo_100 * $item['factor_p'];

            $cuerpo_val = $item['denominacion'] === 'CUERPO' ? $costo_prod : 0;
            $mandil_val = $item['denominacion'] === 'MANDIL' ? $costo_prod : 0;

            if ($item['sum_in_total']) {
                $total_cuerpo += $cuerpo_val;
                $total_mandil += $mandil_val;
            }

            $tabla_costos[] = [
                'id' => $item['id'],
                'material' => $item['material'],
                'denominacion' => $item['denominacion'],
                'costo_glb' => $item['costo_glb'],
                'medida_glb' => $item['medida_glb'],
                'costo_um' => $costo_um,
                'p_calculado' => $item['p_calc'],
                'costo_100' => $costo_100,
                'dfp' => $item['dfp'],
                'factor_p' => $item['factor_p'],
                'costo_prod' => $costo_prod,
                'cuerpo' => $cuerpo_val,
                'mandil' => $mandil_val
            ];
        }

        $costo_total = $total_cuerpo + $total_mandil;
        
        // MB = Costo Total / (1 - %MB) - Costo Total
        $mb_total = ($costo_total / (1 - $porcentaje_mb)) - $costo_total;
        $mb_cuerpo = ($total_cuerpo / (1 - $porcentaje_mb)) - $total_cuerpo;
        $mb_mandil = ($total_mandil / (1 - $porcentaje_mb)) - $total_mandil;

        $subtotal_total = $costo_total + $mb_total;
        $subtotal_cuerpo = $total_cuerpo + $mb_cuerpo;
        $subtotal_mandil = $total_mandil + $mb_mandil;

        $igv_total = $subtotal_total * 0.18;
        $igv_cuerpo = $subtotal_cuerpo * 0.18;
        $igv_mandil = $subtotal_mandil * 0.18;

        $total_final = $subtotal_total + $igv_total;
        $total_final_cuerpo = $subtotal_cuerpo + $igv_cuerpo;
        $total_final_mandil = $subtotal_mandil + $igv_mandil;

        $resumen_totales = [
            'costo_total' => ['total' => $costo_total, 'cuerpo' => $total_cuerpo, 'mandil' => $total_mandil],
            'mb' => ['total' => $mb_total, 'cuerpo' => $mb_cuerpo, 'mandil' => $mb_mandil],
            'subtotal' => ['total' => $subtotal_total, 'cuerpo' => $subtotal_cuerpo, 'mandil' => $subtotal_mandil],
            'igv' => ['total' => $igv_total, 'cuerpo' => $igv_cuerpo, 'mandil' => $igv_mandil],
            'total' => ['total' => $total_final, 'cuerpo' => $total_final_cuerpo, 'mandil' => $total_final_mandil],
        ];

        // Construir la respuesta final agrupada
        return response()->json([
            'A' => $area_material,
            'B' => $perimetro_corte,
            'C' => $pliegues_doblez,
            'D' => $perimetro_soldadura,
            'E' => $area_pintado,
            'F' => $parametros_ensamblaje,
            'G' => $area_embalaje,
            'H' => [
                'tabla' => $tabla_costos,
                'totales' => $resumen_totales
            ]
        ]);
    }
}
