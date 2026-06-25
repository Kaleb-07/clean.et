<?php

namespace App\Services;

use App\Models\Sector;

class PricingService
{
    /**
     * Car Wash price table (ETB) per Technical Reference §8.
     * [vehicle_class][service_tier] => price
     */
    private const CAR_WASH_PRICES = [
        'small_car'           => ['basic' => 400,  'premium' => 550],
        'suv_pickup'          => ['basic' => 600,  'premium' => 750],
        'minibus_van'         => ['basic' => 850,  'premium' => 1100],
        'light_medium_truck'  => ['basic' => 1200, 'premium' => 1400],
        'big_truck_cargo'     => ['basic' => 1850, 'premium' => 2200],
        'large_bus'           => ['basic' => 2500, 'premium' => 3000],
    ];

    /**
     * Car Wash surcharges per sector (ETB) per Technical Reference §19.
     */
    private const SECTOR_SURCHARGES = [
        'home-to-home'    => 600, // midpoint of 400–800
        'pickup-drop-off' => 375, // midpoint of 250–500
    ];

    /**
     * Interior cleaning rate per sqm (ETB) per frequency.
     * Bands from Technical Reference §15.
     */
    private const INTERIOR_RATE_PER_SQM = [
        'One-time' => 15,
        'Daily'    => 8,
        'Weekly'   => 10,
        'Monthly'  => 12,
    ];

    /**
     * Exterior cleaning base price per access tier (ETB).
     * Based on equipment & crew cost, not area alone. (§10)
     */
    private const EXTERIOR_BASE_PRICE = [
        'low_rise'  => 2000,
        'mid_rise'  => 5000,
        'high_rise' => 10000,
    ];

    /**
     * Exterior per-sqm rate on top of base price.
     */
    private const EXTERIOR_RATE_PER_SQM = 5;

    /**
     * Calculate the price for a booking given the sector and the
     * user-supplied requirement_data.
     *
     * Returns ETB amount as a float.
     */
    public function calculate(Sector $sector, array $data): float
    {
        $categorySlug = $sector->category?->slug ?? '';
        $sectorSlug   = $sector->slug;

        return match ($categorySlug) {
            'car-washing'       => $this->calcCarWash($sectorSlug, $data),
            'building-cleaning' => $this->calcBuildingCleaning($sectorSlug, $data),
            default             => 0.0,
        };
    }

    // ─── Car Washing ────────────────────────────────────────────────────────────

    private function calcCarWash(string $sectorSlug, array $data): float
    {
        $vehicleClass = $data['vehicle_class'] ?? 'small_car';
        $tier         = $data['service_tier']  ?? 'basic';

        $base      = self::CAR_WASH_PRICES[$vehicleClass][$tier] ?? 400;
        $surcharge = self::SECTOR_SURCHARGES[$sectorSlug]        ?? 0;

        return (float) ($base + $surcharge);
    }

    // ─── Building Cleaning ───────────────────────────────────────────────────────

    private function calcBuildingCleaning(string $sectorSlug, array $data): float
    {
        return match ($sectorSlug) {
            'interior-cleaning' => $this->calcInterior($data),
            'exterior-cleaning' => $this->calcExterior($data),
            default             => 0.0,
        };
    }

    private function calcInterior(array $data): float
    {
        $area      = max(1, (float) ($data['total_area'] ?? 0));
        $frequency = $data['frequency'] ?? 'One-time';
        $ratePerSqm = self::INTERIOR_RATE_PER_SQM[$frequency] ?? 15;

        return round($area * $ratePerSqm, 2);
    }

    private function calcExterior(array $data): float
    {
        $floors      = (int) ($data['floor_count'] ?? 1);
        $facadeArea  = max(1, (float) ($data['facade_area'] ?? 0));

        $tier = match (true) {
            $floors <= 3 => 'low_rise',
            $floors <= 6 => 'mid_rise',
            default      => 'high_rise',
        };

        $base  = self::EXTERIOR_BASE_PRICE[$tier];
        $area  = $facadeArea * self::EXTERIOR_RATE_PER_SQM;

        return round($base + $area, 2);
    }
}
