declare global {
    function importModule(url: string): Promise<any>;
    function importModuleEx(url: string, options: any): Promise<any>;
}
export { }