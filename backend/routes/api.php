<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CalculatorController;
use App\Http\Controllers\TableroController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/calculate', [CalculatorController::class, 'calculate']);

Route::get('/tableros/catalog', [TableroController::class, 'catalog']);
Route::post('/tableros/calculate', [TableroController::class, 'calculate']);
Route::post('/tableros/analyze-image', [TableroController::class, 'analyzeImage']);

