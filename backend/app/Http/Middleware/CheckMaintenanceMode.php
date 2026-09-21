<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class CheckMaintenanceMode
{
    public function handle(Request $request, Closure $next)
    {
        if (Schema::hasTable('system_settings')) {
            $maintenance = SystemSetting::getByKey('maintenance_mode', false);

            if ($maintenance) {
                $user = $request->user();
                $isSuperAdmin = $user && (method_exists($user, 'isSuperAdmin') ? $user->isSuperAdmin() : $user->role === 'super_admin');
                $isExemptRoute = $request->is('api/super-admin*') || $request->is('api/login') || $request->is('api/register');

                if (!$isSuperAdmin && !$isExemptRoute) {
                    return response()->json([
                        'status'        => 'maintenance',
                        'message'       => 'The platform is currently under scheduled maintenance. Please try again shortly.',
                        'support_email' => SystemSetting::getByKey('support_email', 'support@clean.et'),
                    ], 503);
                }
            }
        }

        return $next($request);
    }
}
