<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    // GET /api/categories
    public function index()
    {
        $categories = Category::with('sectors')->get();
        return response()->json($categories);
    }

    // GET /api/categories/{id}/sectors
    public function sectors($id)
    {
        $category = Category::findOrFail($id);
        $sectors = $category->sectors;
        return response()->json($sectors);
    }
}
