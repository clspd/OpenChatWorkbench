import { GetWellknownTarballDownloadUrl, resolveDepVersion } from "@/utils/npmutil";
import { LoadVendor } from "../loader";
import addCSS from "add-css-constructed";

const KaTeX_package = 'katex';
const KaTeX_version = resolveDepVersion('katex', '0.16.43');
const KaTeX_files = {
    main: 'dist/katex.mjs',
    css: 'dist/katex.min.css',
};

const cdnList = [
    'https://unpkg.com/{p}@{v}/',
    'https://cdn.jsdelivr.net/npm/{p}@{v}/',
];

const tarballList = [
    GetWellknownTarballDownloadUrl(KaTeX_package, KaTeX_version),
    GetWellknownTarballDownloadUrl(KaTeX_package, KaTeX_version, 'https://registry.npmmirror.com/'),
];

export let KaTeX_CSS: string;

export async function load_katex(): Promise<typeof import('katex')> { 
    const module = await LoadVendor(
        KaTeX_package,
        KaTeX_version,
        tarballList,
        cdnList,
        false,
        KaTeX_files.main,
        {
            path: KaTeX_files.css,
            get result() { return KaTeX_CSS },
            set result(value) { KaTeX_CSS = value },
        }
    );
    addCSS(KaTeX_CSS);
    return module;
}

