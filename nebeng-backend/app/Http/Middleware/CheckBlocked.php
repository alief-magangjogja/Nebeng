<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckBlocked
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
   public function handle($request, Closure $next)
    {
        if ($request->user() && $request->user()->status === 'blocked') {
            return response()->json([
                'message' => 'Akun anda diblokir'
            ], 403);
        }

        return $next($request);
    }
}
