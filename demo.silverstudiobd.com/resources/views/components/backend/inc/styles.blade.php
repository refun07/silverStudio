<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">

<link rel="stylesheet" href="https://unpkg.com/accordion-js@3.3.4/dist/accordion.min.css">
<link rel="stylesheet" href="{{ asset('css/swiper.min.css') }}" />
<link rel="stylesheet" href="{{ asset('css/select2.min.css') }}" />
<link rel="stylesheet" href="{{ asset('css/daterangepicker.min.css') }}" />
<link rel="stylesheet" href="{{ asset('css/nouislider.min.css') }}" />
<link rel="stylesheet" href="{{ asset('css/uppy.min.css') }}" />
<link rel="stylesheet" href="{{ asset('css/jodit.min.css') }}" />
<style>
    .simple-jodit .jodit-status-bar,
    .simple-jodit .jodit-status-bar-resize {
        display: none;
    }
    .simple-jodit .jodit-wysiwyg {
        min-height: 88px;
        font-size: 13px;
        line-height: 1.5;
    }
    .simple-jodit .jodit-wysiwyg ul,
    .simple-jodit .jodit-wysiwyg ol {
        margin: 0.25rem 0;
        padding-left: 1.25rem;
        list-style-position: inside;
    }
    .simple-jodit .jodit-wysiwyg ul {
        list-style-type: disc;
    }
    .simple-jodit .jodit-wysiwyg ol {
        list-style-type: decimal;
    }
</style>
<link rel="stylesheet" href="{{ asset('css/footable.standalone.min.css') }}" />
<!-- font awesome 5 pro -->
<link rel="stylesheet" href="{{ asset('css/fontawesome.min.css') }}" />
<link rel="stylesheet" href="{{ asset('css/toastr.min.css') }}" />

@vite('resources/backend/css/app.css')