<?php

namespace App\Http\Controllers\Backend\Admin;

use App\Http\Controllers\Controller;
use App\Services\FileManagerService;
use Illuminate\Http\Request;

class FileManagerController extends Controller
{
    // constructor
    public function __construct()
    {
        $this->middleware(['permission:file_manager'])->only(['index']);
    }

    // file manager index
    public function index(Request $request)
    {
        return view('backend.admin.file-manager.index');
    }

    // upload files
    public function upload(Request $request)
    {
        $request->validate([
            'media_file' => [
                'required',
                'file',
                'max:'.config('media.max_upload_kilobytes', 20 * 1024),
            ],
            'usage' => ['nullable', 'string', 'in:generic,product,banner'],
        ]);

        $response = FileManagerService::upload($request);

        if ($response['status'] != 200) {
            return response()->json([
                'success' => false,
                'message' => $response['message'],
            ], $response['status']);
        }

        return $response['result'];
    }

    public function csrfToken()
    {
        return response()->json(['token' => csrf_token()]);
    }

    // get uploaded files
    public function getUploadedFiles(Request $request)
    {
        $response = FileManagerService::getUploadedFiles($request);

        return $response['result'];
    }

    // delete files
    public function destroy(Request $request, $id)
    {
        $response = FileManagerService::destroy($request, $id);

        return $response['result'];
    }

    // for input preview box
    public function getPreviewFiles(Request $request)
    {
        $request->validate(['ids' => ['required', 'string']]);
        $ids = collect(explode(',', $request->ids))->map(fn ($id) => (int) trim($id))->filter()->unique();
        $files = FileManagerService::queryForCurrentUser()->whereKey($ids)->get();

        if ($files->count() !== $ids->count()) {
            abort(403);
        }

        $filesById = $files->keyBy('id');

        return $ids->map(fn ($id) => $filesById->get($id))->values();
    }

    public function prepareVariants(Request $request)
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'usage' => ['required', 'string', 'in:generic,product,banner'],
        ]);

        FileManagerService::prepareUsage($validated['ids'], $validated['usage']);

        return response()->json(['success' => true]);
    }

    // download file
    public function attachmentDownload($id)
    {
        $mediaFile = FileManagerService::queryForCurrentUser()->findOrFail($id);
        $path = $mediaFile->original_path ?: $mediaFile->media_file;
        $downloadName = $mediaFile->media_name.'.'.($mediaFile->original_extension ?: $mediaFile->media_extension);

        return \Storage::disk($mediaFile->storageDisk())->download($path, $downloadName);
    }

    // remove background
    public function backgroundRemove(Request $request, $id)
    {
        $response = FileManagerService::backgroundRemove($request, $id);

        return $response['result'];
    }

    // alt Text
    public function altText(Request $request, $id)
    {
        $response = FileManagerService::altText($request, $id);

        return $response['result'];
    }
}
