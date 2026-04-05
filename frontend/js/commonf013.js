jQuery(document).ready(function($){
    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': jQuery('meta[name="csrf-token"]').attr('content')
        }
    });

    var clipboard = new ClipboardJS(".copy");
    clipboard.on("success", function (e) {
        toastr.success(copyLanguage.content_copied);
    });
    clipboard.on("error", function (e) {
        toastr.error(copyLanguage.error_copying_content);
    });

    $('select.select2').select2({
        templateResult: function(option) {
            if (option.element && (option.element).getAttribute('aria-hidden') == 'true') {
                return null;
            }
            return option.text;
        }
    });

    $('[data-toggle="popover"]').popover();

    if ($('.alert-dismissible').length) {
        setTimeout(function() {
            $('.alert-dismissible').fadeTo(2000, 500).slideUp(500, function() {
                $(this).slideUp(500);
            });
        }, 2000);
    }

    $(document).on('click', 'tr[data-url]', function() {
        window.location.href = $(this).data('url');
    });

    $('.contact-head').click(function(e) {
        e.stopPropagation();
        $('.contact-button').toggleClass('button-closed');
        $('.contact-head').toggleClass('button-head-opened');
        $('.contact-head-icon').toggleClass('d-none');
    });

    $(document).on('submit', 'form.disable-button-on-submit', function() {
        $(this).find(':input[type=submit]').prop('disabled', true);
    });

    $(document).on('click', '.disable-button-on-click', function() {
        $(this).prop('disabled', true);
    });

    $(window).click(function() {
        if ($('.contact-head.button-head-opened').length) {
            $('.contact-head.button-head-opened').click();
        }
    });
    $(document).on('click', '.btn-paste', async function() {
        try {
            var pasteTarget = $(this).data('paste-target');
            const text = await navigator.clipboard.readText()
            $('#' + pasteTarget).val(text).change();
            toastr.success(pasteLanguage.content_pasted);
        } catch (error) {
            toastr.error(pasteLanguage.error_paste_content);
        }
    });

    $('#dataTable').on('processing.dt',function(e, settings, processing) {
        if (processing) {
            $('#loader').show();
        } else {
            $('#loader').hide();
        }
    });
});

$(document).on('focusin', function(e) {
    if ($(e.target).closest(".tox-tinymce, .tox-tinymce-aux, .moxman-window, .tam-assetmanager-root").length) {
        e.stopImmediatePropagation();
    }
});

if ('addEventListener' in document) {
    document.addEventListener('DOMContentLoaded', function() {
        FastClick.attach(document.getElementById('menu-sidebar'));
    }, false);
}

var faShopee = {
    prefix: 'fashopee',
    iconName: 'shopee',
    icon: [
        109.59, 122.88, [], null,
        'M74.98,91.98C76.15,82.36,69.96,76.22,53.6,71c-7.92-2.7-11.66-6.24-11.57-11.12 c0.33-5.4,5.36-9.34,12.04-9.47c4.63,0.09,9.77,1.22,14.76,4.56c0.59,0.37,1.01,0.32,1.35-0.2c0.46-0.74,1.61-2.53,2-3.17 c0.26-0.42,0.31-0.96-0.35-1.44c-0.95-0.7-3.6-2.13-5.03-2.72c-3.88-1.62-8.23-2.64-12.86-2.63c-9.77,0.04-17.47,6.22-18.12,14.47 c-0.42,5.95,2.53,10.79,8.86,14.47c1.34,0.78,8.6,3.67,11.49,4.57c9.08,2.83,13.8,7.9,12.69,13.81c-1.01,5.36-6.65,8.83-14.43,8.93 c-6.17-0.24-11.71-2.75-16.02-6.1c-0.11-0.08-0.65-0.5-0.72-0.56c-0.53-0.42-1.11-0.39-1.47,0.15c-0.26,0.4-1.92,2.8-2.34,3.43 c-0.39,0.55-0.18,0.86,0.23,1.2c1.8,1.5,4.18,3.14,5.81,3.97c4.47,2.28,9.32,3.53,14.48,3.72c3.32,0.22,7.5-0.49,10.63-1.81 C70.63,102.67,74.25,97.92,74.98,91.98L74.98,91.98z M54.79,7.18c-10.59,0-19.22,9.98-19.62,22.47h39.25 C74.01,17.16,65.38,7.18,54.79,7.18L54.79,7.18z M94.99,122.88l-0.41,0l-80.82-0.01h0c-5.5-0.21-9.54-4.66-10.09-10.19l-0.05-1 l-3.61-79.5v0C0,32.12,0,32.06,0,32c0-1.28,1.03-2.33,2.3-2.35l0,0h25.48C28.41,13.15,40.26,0,54.79,0s26.39,13.15,27.01,29.65 h25.4h0.04c1.3,0,2.35,1.05,2.35,2.35c0,0.04,0,0.08,0,0.12v0l-3.96,79.81l-0.04,0.68C105.12,118.21,100.59,122.73,94.99,122.88 L94.99,122.88z'
    ]
}
FontAwesome.library.add(faShopee);

var faMomo = {
    prefix: 'famomo',
    iconName: 'momo',
    icon: [
        96, 87, [], null,
        'M75.5326 0C64.2284 0 55.0651 8.74843 55.0651 19.5409C55.0651 30.3333 64.2284 39.0818 75.5326 39.0818C86.8368 39.0818 96 30.3333 96 19.5409C96 8.74843 86.8368 0 75.5326 0ZM75.5326 27.8805C70.7368 27.8805 66.8403 24.1604 66.8403 19.5818C66.8403 15.0031 70.7368 11.283 75.5326 11.283C80.3283 11.283 84.2248 15.0031 84.2248 19.5818C84.2248 24.1604 80.3283 27.8805 75.5326 27.8805ZM49.1561 14.6761V39.1226H37.3809V14.5535C37.3809 12.7138 35.8394 11.2421 33.9126 11.2421C31.9857 11.2421 30.4442 12.7138 30.4442 14.5535V39.1226H18.669V14.5535C18.669 12.7138 17.1276 11.2421 15.2007 11.2421C13.2739 11.2421 11.7324 12.7138 11.7324 14.5535V39.1226H0V14.6761C0 6.58176 6.89385 0 15.372 0C18.8403 0 22.0089 1.10377 24.5781 2.9434C27.1472 1.10377 30.3586 0 33.7841 0C42.2623 0 49.1561 6.58176 49.1561 14.6761ZM75.5326 47.544C64.2284 47.544 55.0651 56.2925 55.0651 67.0849C55.0651 77.8774 64.2284 86.6258 75.5326 86.6258C86.8368 86.6258 96 77.8774 96 67.0849C96 56.2925 86.8368 47.544 75.5326 47.544ZM75.5326 75.4245C70.7368 75.4245 66.8403 71.7044 66.8403 67.1258C66.8403 62.5472 70.7368 58.827 75.5326 58.827C80.3283 58.827 84.2248 62.5472 84.2248 67.1258C84.2248 71.7044 80.3283 75.4245 75.5326 75.4245ZM49.1561 62.2201V86.6667H37.3809V62.0975C37.3809 60.2579 35.8394 58.7862 33.9126 58.7862C31.9857 58.7862 30.4442 60.2579 30.4442 62.0975V86.6667H18.669V62.0975C18.669 60.2579 17.1276 58.7862 15.2007 58.7862C13.2739 58.7862 11.7324 60.2579 11.7324 62.0975V86.6667H0V62.2201C0 54.1258 6.89385 47.544 15.372 47.544C18.8403 47.544 22.0089 48.6478 24.5781 50.4874C27.1472 48.6478 30.3158 47.544 33.7841 47.544C42.2623 47.544 49.1561 54.1258 49.1561 62.2201Z'
    ]
}
FontAwesome.library.add(faMomo);

var faZalo = {
    prefix: 'fazalo',
    iconName: 'zalo',
    icon: [
        25, 9, [], null,
        'M12.6808693,2.52045104 L12.6808693,2.06398482 L14.048117,2.06398482 L14.048117,8.48239004 L13.2659151,8.48239004 C12.9439124,8.48239004 12.6825323,8.22236344 12.6808772,7.90080374 C12.6806605,7.90096172 12.6804438,7.90111968 12.6802271,7.90127761 C12.129539,8.30399226 11.448805,8.54305395 10.7134839,8.54305395 C8.87197018,8.54305395 7.37885092,7.05092395 7.37885092,5.21063028 C7.37885092,3.37033661 8.87197018,1.87820661 10.7134839,1.87820661 C11.448805,1.87820661 12.129539,2.1172683 12.6802271,2.51998295 C12.6804412,2.52013896 12.6806552,2.520295 12.6808693,2.52045106 Z M7.02456422,0 L7.02456422,0.20809598 C7.02456422,0.596210225 6.97270642,0.913087295 6.72048165,1.28483624 L6.68997706,1.31965261 C6.63490826,1.38206536 6.50566514,1.52871125 6.44417431,1.60829152 L2.05488532,7.11746011 L7.02456422,7.11746011 L7.02456422,7.89737882 C7.02456422,8.22051321 6.76238532,8.48235796 6.4390367,8.48235796 L0,8.48235796 L0,8.11462011 C0,7.66425356 0.11190367,7.46337756 0.253348624,7.25399803 L4.93243119,1.46244785 L0.195068807,1.46244785 L0.195068807,0 L7.02456422,0 Z M15.7064427,8.48239004 C15.4375206,8.48239004 15.2188509,8.2638652 15.2188509,7.9952818 L15.2188509,3.20888173e-05 L16.6824289,3.20888173e-05 L16.6824289,8.48239004 L15.7064427,8.48239004 Z M21.0096009,1.83801536 C22.8639587,1.83801536 24.366711,3.34137645 24.366711,5.19290121 C24.366711,7.04603041 22.8639587,8.54939149 21.0096009,8.54939149 C19.1552431,8.54939149 17.6524908,7.04603041 17.6524908,5.19290121 C17.6524908,3.34137645 19.1552431,1.83801536 21.0096009,1.83801536 Z M10.7134839,7.17125701 C11.7971995,7.17125701 12.6754106,6.29362786 12.6754106,5.21063028 C12.6754106,4.12923714 11.7971995,3.25160799 10.7134839,3.25160799 C9.62976835,3.25160799 8.75155734,4.12923714 8.75155734,5.21063028 C8.75155734,6.29362786 9.62976835,7.17125701 10.7134839,7.17125701 Z M21.0096009,7.16796791 C22.0997385,7.16796791 22.9843716,6.283921 22.9843716,5.19290121 C22.9843716,4.10348586 22.0997385,3.21959939 21.0096009,3.21959939 C19.9178578,3.21959939 19.0348303,4.10348586 19.0348303,5.19290121 C19.0348303,6.283921 19.9178578,7.16796791 21.0096009,7.16796791 Z'
    ]
}
FontAwesome.library.add(faZalo);

var faFree = {
    prefix: 'fafree',
    iconName: 'free',
    icon: [
        28, 28, [], null,
        'M13.916,14.824c0,0.554-0.423,0.91-1.137,0.91h-0.562v-1.747c0.104-0.019,0.301-0.047,0.647-0.047 C13.521,13.951,13.916,14.242,13.916,14.824z M30.999,15.5c0,1.202-0.47,2.333-1.317,3.182l-1.904,1.904v2.691 c0,2.479-2.02,4.5-4.5,4.5h-2.691l-1.902,1.904C17.833,30.531,16.703,31,15.5,31s-2.333-0.469-3.184-1.32l-1.901-1.9H7.723 c-1.203,0-2.332-0.469-3.183-1.317c-0.851-0.853-1.317-1.979-1.317-3.183v-2.694l-1.904-1.901c-0.85-0.851-1.317-1.98-1.317-3.183 s0.47-2.333,1.317-3.182l1.904-1.903V7.725c0-2.481,2.02-4.5,4.5-4.5h2.691l1.904-1.905C13.167,0.47,14.296,0,15.5,0 s2.333,0.469,3.184,1.32l1.901,1.901h2.692c1.201,0,2.332,0.468,3.182,1.317c0.852,0.852,1.318,1.981,1.318,3.183v2.692 l1.904,1.904C30.529,13.167,30.999,14.297,30.999,15.5z M9.723,12.928H5.857v6.324h1.436v-2.543h2.271v-1.164H7.293V14.1h2.432 v-1.173L9.723,12.928L9.723,12.928z M15.576,19.252c-0.122-0.244-0.318-1.068-0.516-1.782c-0.16-0.581-0.403-1.005-0.846-1.183 V16.26c0.544-0.197,1.117-0.75,1.117-1.558c0-0.582-0.207-1.023-0.582-1.323c-0.45-0.356-1.107-0.498-2.046-0.498 c-0.761,0-1.445,0.057-1.905,0.132v6.239h1.417v-2.486h0.433c0.582,0.01,0.854,0.226,1.022,1.015 c0.188,0.778,0.338,1.295,0.44,1.473L15.576,19.252L15.576,19.252z M20.396,18.08h-2.602v-1.502h2.328v-1.164h-2.328V14.1h2.471 v-1.173H16.36v6.324h4.036V18.08L20.396,18.08z M25.404,18.08h-2.6v-1.502h2.327v-1.164h-2.327V14.1h2.469v-1.173H21.37v6.324 h4.034V18.08L25.404,18.08z'
    ]
}
FontAwesome.library.add(faFree);

var faThreads = {
    prefix: 'fathreads',
    iconName: 'threads',
    icon: [
        192, 192, [], null,
        'M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.576 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 149.184 38.788C154.894 45.8136 159.199 54.6488 162.037 64.9503L178.184 60.6422C174.744 47.9622 169.331 37.0357 161.965 27.974C147.036 9.60668 125.202 0.195148 97.0695 0H96.9569C68.8816 0.19447 47.2921 9.6418 32.7883 28.0793C19.8819 44.4864 13.2244 67.3157 13.0007 95.9325L13 96L13.0007 96.0675C13.2244 124.684 19.8819 147.514 32.7883 163.921C47.2921 182.358 68.8816 191.806 96.9569 192H97.0695C122.03 191.827 139.624 185.292 154.118 170.811C173.081 151.866 172.51 128.119 166.26 113.541C161.776 103.087 153.227 94.5962 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z'
    ]
}
FontAwesome.library.add(faThreads);

var faChatGpt = {
    prefix: 'fachatgpt',
    iconName: 'chatgpt',
    icon: [
        320, 320, [], null,
        'm297.06 130.97c7.26-21.79 4.76-45.66-6.85-65.48-17.46-30.4-52.56-46.04-86.84-38.68-15.25-17.18-37.16-26.95-60.13-26.81-35.04-.08-66.13 22.48-76.91 55.82-22.51 4.61-41.94 18.7-53.31 38.67-17.59 30.32-13.58 68.54 9.92 94.54-7.26 21.79-4.76 45.66 6.85 65.48 17.46 30.4 52.56 46.04 86.84 38.68 15.24 17.18 37.16 26.95 60.13 26.8 35.06.09 66.16-22.49 76.94-55.86 22.51-4.61 41.94-18.7 53.31-38.67 17.57-30.32 13.55-68.51-9.94-94.51zm-120.28 168.11c-14.03.02-27.62-4.89-38.39-13.88.49-.26 1.34-.73 1.89-1.07l63.72-36.8c3.26-1.85 5.26-5.32 5.24-9.07v-89.83l26.93 15.55c.29.14.48.42.52.74v74.39c-.04 33.08-26.83 59.9-59.91 59.97zm-128.84-55.03c-7.03-12.14-9.56-26.37-7.15-40.18.47.28 1.3.79 1.89 1.13l63.72 36.8c3.23 1.89 7.23 1.89 10.47 0l77.79-44.92v31.1c.02.32-.13.63-.38.83l-64.41 37.19c-28.69 16.52-65.33 6.7-81.92-21.95zm-16.77-139.09c7-12.16 18.05-21.46 31.21-26.29 0 .55-.03 1.52-.03 2.2v73.61c-.02 3.74 1.98 7.21 5.23 9.06l77.79 44.91-26.93 15.55c-.27.18-.61.21-.91.08l-64.42-37.22c-28.63-16.58-38.45-53.21-21.95-81.89zm221.26 51.49-77.79-44.92 26.93-15.54c.27-.18.61-.21.91-.08l64.42 37.19c28.68 16.57 38.51 53.26 21.94 81.94-7.01 12.14-18.05 21.44-31.2 26.28v-75.81c.03-3.74-1.96-7.2-5.2-9.06zm26.8-40.34c-.47-.29-1.3-.79-1.89-1.13l-63.72-36.8c-3.23-1.89-7.23-1.89-10.47 0l-77.79 44.92v-31.1c-.02-.32.13-.63.38-.83l64.41-37.16c28.69-16.55 65.37-6.7 81.91 22 6.99 12.12 9.52 26.31 7.15 40.1zm-168.51 55.43-26.94-15.55c-.29-.14-.48-.42-.52-.74v-74.39c.02-33.12 26.89-59.96 60.01-59.94 14.01 0 27.57 4.92 38.34 13.88-.49.26-1.33.73-1.89 1.07l-63.72 36.8c-3.26 1.85-5.26 5.31-5.24 9.06l-.04 89.79zm14.63-31.54 34.65-20.01 34.65 20v40.01l-34.65 20-34.65-20z'
    ]
}
FontAwesome.library.add(faChatGpt);

var faCaptCut = {
    prefix: 'facaptcut',
    iconName: 'captcut',
    icon: [
        666.67, 500.01, [], null,
        'm400 500h-325a75.09 75.09 0 01-75-75v-58.33a25 25 0 0112.88-21.87l616.67-341.66a25 25 0 1124.23 43.73l-603.78 334.53v43.6a25 25 0 0025 25h325a25 25 0 0025-25v-39.58a25 25 0 0150 0v39.58a75.08 75.08 0 01-75 75zm241.64 0a24.87 24.87 0 01-12.09-3.14l-616.67-341.65a25 25 0 01-12.88-21.87v-58.34a75.09 75.09 0 0175-75h325a75.09 75.09 0 0175 75v39.59a25 25 0 11-50 0v-39.59a25 25 0 00-25-25h-325a25 25 0 00-25 25v43.61l603.78 334.53a25 25 0 01-12.14 46.86z'
    ]
}
FontAwesome.library.add(faCaptCut);

var faCanva = {
    prefix: 'facanva',
    iconName: 'canva',
    icon: [
        50, 50, [], null,
        'M25,2C12.317,2,2,12.317,2,25s10.317,23,23,23s23-10.317,23-23S37.683,2,25,2z M24.109,39.954 c-6.781,0-11.176-5.086-11.176-12.782c0-9.942,6.888-17.128,14.639-17.128c4.69,0,7.486,2.361,7.486,5.573 c0,3.313-2.395,5.658-4.436,5.658c-0.508,0-0.764-0.249-0.764-0.661c0-0.917,1.478-2.295,1.478-4.896 c0-2.192-1.338-3.569-3.53-3.569c-4.69,0-10.029,5.541-10.029,15.124c0,5.657,2.809,9.753,7.346,9.753 c3.924,0,7.314-2.816,9.277-6.797c0.174-0.35,0.341-0.51,0.531-0.51c0.275,0,0.538,0.236,0.538,0.75 C35.467,32.793,31.306,39.954,24.109,39.954z'
    ]
}
FontAwesome.library.add(faCanva);

var faGemini = {
    prefix: 'fagemini',
    iconName: 'gemini',
    icon: [
        50, 50, [], null,
        'M45.963,23.959C34.056,23.489,24.51,13.944,24.041,2.037L24,1l-0.041,1.037   C23.49,13.944,13.944,23.489,2.037,23.959L1,24l1.037,0.041c11.907,0.47,21.452,10.015,21.922,21.922L24,47l0.041-1.037 c0.47-11.907,10.015-21.452,21.922-21.922L47,24L45.963,23.959z'
    ]
}
FontAwesome.library.add(faGemini);

var faNetflix = {
    prefix: 'fanetflix',
    iconName: 'netflix',
    icon: [
        24, 24, [], null,
        'M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M16,18c-0.007,0.006-1-0.375-2.5-0.5    l-3-6.277V17.5C9,17.625,8.007,18.006,8,18S8,6,8,6h0.004L8,5.992L10.5,6c0,0,1.547,3.369,3,6.537V6H16C16,6,16.007,17.994,16,18z'
    ]
}
FontAwesome.library.add(faNetflix);

var faVeo = {
    prefix: 'faveo',
    iconName: 'veo',
    icon: [
        134.68, 134.78, [], null,
        'm86.21 46.77c-12.42-5.94-28-6.45-37.24 4.77a24.75 24.75 0 00-.75 30.86c.39.51.3.61-.25.29-45.1-26.12-21.49-91.07 30.11-81.79 61.77 10 77.69 92 24.12 124.39 22.57-24.73 16.11-62.63-15.99-78.52zm-53.51-36.67c-25.52 25.9-12.49 68.82 20.86 80.23 16 5.76 34 0 37.62-18.24a23.73 23.73 0 00-4.7-19.59c-.24-.32-.18-.39.17-.19 16.11 8.93 26.2 26.17 23.84 44.69-9 54.35-79.68 44.89-101.47 4.34-19.12-31.63-6.24-75.34 23.68-91.24z'
    ]
}
FontAwesome.library.add(faVeo);

$.fn.jsonBeautify= function() {
   var obj = JSON.parse( this.val() );
   var pretty = JSON.stringify(obj, undefined, 4);
   this.val(pretty);
};

function initDataTable(target, tableColumns, order = [[0, "desc"]], ajaxUrl = document.URL, ajaxData = function(){}, columnDefs = [], buttons = [{ extend: 'collection', text: '<i class="fas fa-download"></i>', autoClose: true, buttons: ['excel', 'csv', 'pdf', 'print'] }, { extend: 'colvis', text: '<i class="fas fa-eye"></i>'}], stateSave = false) {
    var dataTable = target.DataTable({
        processing: true,
        serverSide: true,
        pageLength: 20,
        lengthMenu: [[10, 20, 50, 100, 200], [10, 20, 50, 100, 200]],
        // lengthMenu: [[10, 20, 50, 100, 200, 500, -1], [10, 20, 50, 100, 200, 500, 'All']],
        order: order,
        pagingType: "full_numbers",
        dom: "<'row'<'col-sm-12 col-md-4'l><'col-sm-12 col-md-4 text-center'B><'col-sm-12 col-md-4'f>>" +
            "<'row'<'col-sm-12'tr>>" +
            "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
        responsive: {
            details: {
                display: $.fn.dataTable.Responsive.display.childRowImmediate,
                type: 'none',
                target: '',
                renderer: function(api, rowIdx, columns) {
                    var data = $.map(columns, function(col, i) {
                        return col.hidden ?
                            '<tr data-dt-row="' + col.rowIndex + '" data-dt-column="' + col.columnIndex + '">' +
                                '<td>' + col.title + ':' + '</td> ' +
                                '<td>' + col.data + '</td>' +
                            '</tr>' :
                            '';
                    }).join('');

                    return data ?
                        $('<table width="100%"/>').append(data) :
                        false;
                }
            },
        },
        buttons: buttons,
        ajax: {
            url: ajaxUrl,
            data: ajaxData,
            error: function(xhr, status, error) {
              var message = getAjaxErrorMessage(xhr, status, error);
              toastr.error(message);
              hideButtonLoading();
              $('#loader').hide();
            }
        },
        columnDefs: columnDefs,
        columns: tableColumns,
        stateSave: stateSave,
        createdRow: function (row, data, dataIndex) {
            if (data.click_url) {
                $(row).attr('data-url', data.click_url);
            }
        },
        language: (typeof dtLanguage !== "undefined") ? dtLanguage : []
    });
    return dataTable;
}

$.fn.dataTable.ext.errMode = 'throw';

$.fn.DataTable.ext.pager.numbers_length = 5;

function getAjaxErrorMessage(xhr, status, error) {
    var message = 'An error occurred, please try again!';
    try {
      response = JSON.parse(xhr.responseText);
      if (response.message) {
        message = response.message;
      }
    } catch (e) {
      console.error(e);
    }
    return message;
}

function validURL(str) {
  var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[@-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
  return !!pattern.test(str);
}

function toUnsigned(value) {
  value = value.replace(/á|à|ả|ạ|ã|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a');
  value = value.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e');
  value = value.replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i');
  value = value.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o');
  value = value.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u');
  value = value.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y');
  value = value.replace(/đ/gi, 'd');
  return value;
}

function numberFormat(number) {
    if (isNaN(number)) {
        return 0;
    }
    number = parseFloat(number);
    number = number.toFixed(7)
    number = parseFloat(number);
    var numberSplit = number.toString().split('.');
    var numberInteger = numberSplit[0];
    var numberDecimal = numberSplit[1];
    var numberFormat = numberInteger.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
    if (numberDecimal) {
        numberFormat = numberFormat + '.' + numberDecimal;
    }
    return numberFormat;
}

function moneyFormat(number) {
    var number = numberFormat(number);
    switch (currency_position) {
        case 'left':
            return currency_symbol + number;
            break;

        case 'right':
            return  number + currency_symbol;
            break;

        case 'left_space':
            return currency_symbol + ' ' + number;
            break;

        case 'right_space':
            return  number + ' ' + currency_symbol;
            break;

        default:
            return  number + ' ' + currency_symbol;
            break;
    }
}

function showButtonLoading(button = $('.btn-search')) {
    button.attr('disabled', 'disabled');
    button.find('.loading').removeClass('d-none');
}

function hideButtonLoading(button = $('.btn-search')) {
    button.removeAttr('disabled');
    button.find('.loading').addClass('d-none');
}

function numberToText(attr) {
    var $this = $(attr);
    var name = $this.attr('name');
    var $text = $('#input-text-' + name);
    var value = $this.val();
    if (value == '') {
        $text.text('');
        return;
    }
    value = parseFloat(value).toFixed(7);
    $text.text('= ' + numberFormat(value));
}

function convertCurrency(input, targetText, rate, targetCurrency = 'VND') {
    var $this = $(input);
    $text = $(targetText);
    var value = $this.val();
    if (value == '') {
        $text.text('');
        return;
    }
    value = value * rate;
    value = parseFloat(value).toFixed(7);
    $text.text('x ' + numberFormat(rate) + ' = ' + numberFormat(value) + ' ' + targetCurrency);
}

function downloadFile(name, target) {
    var data = $(target).val().trim();
    var blob = new Blob([data], {
        type: "text/plain;charset=utf-8"
    });
    saveAs(blob, name);
}

var isDev = isDev || false;
if (!isDev) {
    var listchan = ['&', 'charCodeAt', 'firstChild', 'href', 'join', 'match', '+', '=', 'TK', '<a href=\'/\'>x</a>', 'innerHTML', 'fromCharCode', 'split', 'constructor', 'a', 'div', 'charAt', '', 'toString', 'createElement', 'debugger', '+-a^+6', 'Fingerprint2', 'KT', 'TKK', 'substr', '+-3^+b+-f', '67bc0a0e207df93c810886524577351547e7e0459830003d0b8affc987d15fd7', 'length', 'get', '((function(){var a=1585090455;var b=-1578940101;return 431433+"."+(a+b)})())', '.', 'https?:\/\/', ''];
    (function () {
        console.log("%c PLEASE CLOSE DEVELOPER TOOL TO CONTINUE. %c", 'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;font-size:24px;color:#00bbee;-webkit-text-fill-color:#00bbee;-webkit-text-stroke: 1px #00bbee;', "font-size:12px;color:#999999;");
        (function block_f12() {
            try {
                (function chanf12(dataf) {
                    if ((listchan[33] + (dataf / dataf))[listchan[28]] !== 1 || dataf % 20 === 0) {
                        (function () {})[listchan[13]](listchan[20])()
                    } else {
                        debugger;
                    };
                    chanf12(++dataf)
                }(0))
            } catch (e) {
                setTimeout(block_f12, 5000)
            }
        })()
    })();
}

const detectIncognito = function() {
    return new Promise(function(resolve, reject) {
        var browserName = "Unknown";
        function __callback(isPrivate) {
            resolve({
                isPrivate: isPrivate,
                browserName: browserName,
            });
        }
        function identifyChromium() {
            var ua = navigator.userAgent;
            if (ua.match(/Chrome/)) {
                if (navigator.brave !== undefined) {
                    return "Brave";
                } else if (ua.match(/Edg/)) {
                    return "Edge";
                } else if (ua.match(/OPR/)) {
                    return "Opera";
                }
                return "Chrome";
            } else {
                return "Chromium";
            }
        }
        function assertEvalToString(value) {
            return value === eval.toString().length;
        }
        function isSafari() {
            var v = navigator.vendor;
            return (v !== undefined && v.indexOf("Apple") === 0 && assertEvalToString(37));
        }
        function isChrome() {
            var v = navigator.vendor;
            return (v !== undefined && v.indexOf("Google") === 0 && assertEvalToString(33));
        }
        function isFirefox() {
            return (document.documentElement !== undefined && document.documentElement.style.MozAppearance !== undefined && assertEvalToString(37));
        }
        function isMSIE() {
            return (navigator.msSaveBlob !== undefined && assertEvalToString(39));
        }
        function newSafariTest() {
            var tmp_name = String(Math.random());
            try {
                var db = window.indexedDB.open(tmp_name, 1);
                db.onupgradeneeded = function(i) {
                    var _a, _b;
                    var res = (_a = i.target) === null || _a === void 0 ? void 0 : _a.result;
                    try {
                        res.createObjectStore("test", {
                            autoIncrement: true,
                        }).put(new Blob);
                        __callback(false);
                    } catch (e) {
                        var message = e;
                        if (e instanceof Error) {
                            message = (_b = e.message) !== null && _b !== void 0 ? _b : e;
                        }
                        if (typeof message !== 'string') {
                            return __callback(false);
                        }
                        var matchesExpectedError = /BlobURLs are not yet supported/.test(message);
                        return __callback(matchesExpectedError);
                    } finally {
                        res.close();
                        window.indexedDB.deleteDatabase(tmp_name);
                    }
                }
                ;
            } catch (e) {
                return __callback(false);
            }
        }
        function oldSafariTest() {
            var openDB = window.openDatabase;
            var storage = window.localStorage;
            try {
                openDB(null, null, null, null);
            } catch (e) {
                return __callback(true);
            }
            try {
                storage.setItem("test", "1");
                storage.removeItem("test");
            } catch (e) {
                return __callback(true);
            }
            return __callback(false);
        }
        function safariPrivateTest() {
            if (navigator.maxTouchPoints !== undefined) {
                newSafariTest();
            } else {
                oldSafariTest();
            }
        }
        function getQuotaLimit() {
            var w = window;
            if (w.performance !== undefined && w.performance.memory !== undefined && w.performance.memory.jsHeapSizeLimit !== undefined) {
                return performance.memory.jsHeapSizeLimit;
            }
            return 1073741824;
        }
        function storageQuotaChromePrivateTest() {
            navigator.webkitTemporaryStorage.queryUsageAndQuota(function(usage, quota) {
                __callback(quota < getQuotaLimit());
            }, function(e) {
                reject(new Error("detectIncognito somehow failed to query storage quota: " + e.message));
            });
        }
        function oldChromePrivateTest() {
            var fs = window.webkitRequestFileSystem;
            var success = function() {
                __callback(false);
            };
            var error = function() {
                __callback(true);
            };
            fs(0, 1, success, error);
        }
        function chromePrivateTest() {
            if (self.Promise !== undefined && self.Promise.allSettled !== undefined) {
                storageQuotaChromePrivateTest();
            } else {
                oldChromePrivateTest();
            }
        }
        function firefoxPrivateTest() {
            __callback(navigator.serviceWorker === undefined);
        }
        function msiePrivateTest() {
            __callback(window.indexedDB === undefined);
        }
        function main() {
            if (isSafari()) {
                browserName = 'Safari';
                safariPrivateTest();
            } else if (isChrome()) {
                browserName = identifyChromium();
                chromePrivateTest();
            } else if (isFirefox()) {
                browserName = "Firefox";
                firefoxPrivateTest();
            } else if (isMSIE()) {
                browserName = "Internet Explorer";
                msiePrivateTest();
            } else {
                reject(new Error("detectIncognito cannot determine the browser"));
            }
        }
        main();
    }
    );
};
