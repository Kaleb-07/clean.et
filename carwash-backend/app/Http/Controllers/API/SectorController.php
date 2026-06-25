<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Sector;
use App\Services\PricingService;
use Illuminate\Http\Request;

class SectorController extends Controller
{
    protected $pricingService;

    public function __construct(PricingService $pricingService)
    {
        $this->pricingService = $pricingService;
    }

    // GET /api/sectors/{id}/schema
    public function schema($id)
    {
        $sector = Sector::findOrFail($id);
        return response()->json([
            'sector_id' => $sector->id,
            'name' => $sector->name,
            'slug' => $sector->slug,
            'requirement_schema' => $sector->requirement_schema,
        ]);
    }

    // POST /api/sectors/{id}/price
    public function price(Request $request, $id)
    {
        $sector = Sector::with('category')->findOrFail($id);
        
        // Accepts either a nested requirement_data object or the root request payload
        $data = $request->input('requirement_data') ?? $request->all();
        if (!is_array($data)) {
            $data = [];
        }

        $price = $this->pricingService->calculate($sector, $data);

        return response()->json([
            'price' => $price,
            'currency' => 'ETB',
        ]);
    }
}
