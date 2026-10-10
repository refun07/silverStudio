@props([
    'specification' => null,
])

<form action="{{ $specification ? route('admin.specifications.update', $specification->id) : route('admin.specifications.store') }}"
    method="POST">
    @csrf

    @if ($specification)
        @method('PUT')
    @endif

    <div class="space-y-3">
        <x-backend.inputs.text label="Name" name="name" placeholder="Type specification name"
            value="{{ $specification?->name }}" />

        <div class="flex justify-end">
            <x-backend.inputs.button buttonText="Save Specification" type="submit" />
        </div>
    </div>
</form>
