<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\AuthorizesBackofficeRoles;
use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminContactRequestController extends Controller
{
    use AuthorizesBackofficeRoles;

    public function index(Request $request): JsonResponse
    {
        $this->requireAnyRole($request, ['admin', 'accountant']);

        $requests = ContactRequest::query()
            ->orderByRaw("CASE status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END")
            ->orderByDesc('id')
            ->get()
            ->map(fn (ContactRequest $contactRequest) => $this->serializeRequest($contactRequest));

        return response()->json([
            'contact_requests' => $requests,
        ]);
    }

    public function update(Request $request, ContactRequest $contactRequest): JsonResponse
    {
        $this->requireAnyRole($request, ['admin', 'accountant']);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:new,in_progress,closed'],
        ]);

        $contactRequest->update($validated);

        return response()->json([
            'message' => 'Статус обращения обновлён.',
            'contact_request' => $this->serializeRequest($contactRequest->fresh()),
        ]);
    }

    private function serializeRequest(ContactRequest $contactRequest): array
    {
        return [
            'id' => $contactRequest->id,
            'type' => $contactRequest->type,
            'name' => $contactRequest->name,
            'email' => $contactRequest->email,
            'phone' => $contactRequest->phone,
            'message' => $contactRequest->message,
            'status' => $contactRequest->status,
            'created_at' => optional($contactRequest->created_at)?->toIso8601String(),
        ];
    }
}
