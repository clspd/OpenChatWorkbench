import lightGallery from 'lightgallery';
import lgZoom from 'lightgallery/plugins/zoom';
import 'lightgallery/css/lightgallery.css';
import 'lightgallery/css/lg-zoom.css';

export function previewImage(url: string, dispose?: () => void) {
    const host = document.createElement('div');
    host.style.display = 'none';
    document.body.appendChild(host);

    const gallery = lightGallery(host, {
        dynamic: true,
        dynamicEl: [{ src: url, subHtml: '' }],
        plugins: [lgZoom],
        download: false,
        counter: false,
        closable: true,
        backgroundColor: 'rgba(0,0,0,0.5)',
    });

    const cleanup = () => {
        gallery.destroy();
        host.remove();
        dispose?.();
    };

    host.addEventListener(
        'lgAfterClose',
        () => cleanup(),
        { once: true }
    );

    gallery.openGallery(0);
}

